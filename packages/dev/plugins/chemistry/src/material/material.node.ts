/**
 * `Chemistry.Material:material`: condensed-matter composition, the
 * entry point of the LIBS chain.
 *
 * Thesis of the node: what a user knows about a sample is a list of
 * constituents with their proportions ("60 % SiO2, 20 % Fe2O3 by mass"),
 * and what a physical emission model needs is a vector over ELEMENTS.
 * The conversion between the two is stoichiometry, it is not optional,
 * and it depends on an explicit basis. This node holds the user's
 * statement and publishes the resolved elemental vector, so that no
 * downstream node ever has to guess whether "20 % iron oxide" meant 20 %
 * of iron (it means 13.99 %).
 *
 * Difference with `Chemistry.Composition:composition`, which it does NOT
 * replace: that node describes a GAS MIXTURE in mole fractions, with a
 * reference pressure, and feeds the atmosphere stack through a dashed
 * config-link. This one describes a SOLID (or any condensed sample), its
 * default basis is mass, its constituents are compounds rather than
 * catalogued gas species, and it publishes on a normal data cable.
 *
 * Why a data cable and not a config-link: the editor's config-link
 * binding table is hardcoded in two framework files
 * (`core/src/document/document.instantiate.ts` and
 * `nodeeditor/src/graph-session-builder.ts`), and `PortType` is a closed
 * union. A new relation type would mean touching the framework for what
 * is, at this milestone, a value handed from one node to the next. The
 * spec is published on `material_out` as an immutable, versioned object;
 * a config-link variant can be added later if the editor UX calls for a
 * dashed cable.
 *
 * V1 limitation, inherited from the same editor gap that
 * `CompositionNode` documents: the property panel has no dynamic list
 * editor, so the component list is edited as one text field,
 * `components`, in the form `SiO2:0.6, Fe2O3:0.2, CaCO3:0.15, MgO:0.05`.
 * The programmatic API (`setComponents`, `upsertComponent`,
 * `removeComponent`) is the path for code and tests.
 *
 * A malformed formula does NOT throw from the setter: a half-typed
 * formula in a property panel would make the editor unusable. The text
 * is stored, resolution fails softly, `resolution_error` reports why,
 * and the published spec carries empty vectors so no downstream node
 * computes on a guess.
 */

import { cloneable, editable, IChannel, IDeclaresPorts, inSlotOf, IOlink, IPortDescriptor, ISession, RuntimeNode, viewable } from "spikypanda-core";
import { ChemicalFormulaError, resolveElementalComposition } from "spikypanda-core";
import type { FractionBasis, ICartesian, IMaterialComponent, Nullable } from "spikypanda-core";

/** Output slot: the resolved material specification. */
export const MATERIAL_OUT = "material_out";

/** Separator between a formula and its fraction in the text field. */
const COMPONENT_FRACTION_SEPARATORS = /[:=]/;

/**
 * What this node publishes. Immutable and versioned: `specVersion`
 * increments on every edit, which is how a downstream node knows it
 * must recompute without diffing vectors.
 */
export interface IMaterialSpec {
    readonly specVersion: number;
    readonly displayName: string;
    readonly basis: FractionBasis;
    /** The user's statement, as typed. */
    readonly components: ReadonlyArray<IMaterialComponent>;
    /** Mass fraction per element symbol, summing to 1. */
    readonly massFractions: Readonly<Record<string, number>>;
    /** Atom fraction per element symbol, summing to 1. */
    readonly moleFractions: Readonly<Record<string, number>>;
    /** Element symbols present, ordered by atomic number. */
    readonly elements: ReadonlyArray<string>;
    /** Sum of the declared fractions BEFORE normalisation. */
    readonly inputFractionSum: number;
    /** Where the numbers come from. Free text, carried into every
     *  downstream simulation record so a spectrum can be traced back to
     *  the claim behind its composition. */
    readonly provenance: string;
    /** Null when the composition resolved, the reason otherwise. */
    readonly resolutionError: string | null;
}

/** Structural guard: what a consumer should check before trusting a
 *  payload read off a cable. Duck-typed on purpose, so a consuming
 *  plugin never has to import this one. */
export function isMaterialSpec(v: unknown): v is IMaterialSpec {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<IMaterialSpec>;
    return typeof s.specVersion === "number" && (s.basis === "mass" || s.basis === "mole") && Array.isArray(s.components) && !!s.massFractions && typeof s.massFractions === "object";
}

/**
 * Parse the one-line component syntax into components.
 *
 * `"SiO2:0.6, Fe2O3:0.2"` gives two components. Whitespace is ignored,
 * `=` works as well as `:`, a trailing comma is tolerated, and a percent
 * sign is accepted and divided by 100 so that `SiO2:60%` means the same
 * thing as `SiO2:0.6`. Anything else is reported, not guessed.
 */
export function parseComponentList(text: string): { components: IMaterialComponent[]; error: string | null } {
    const components: IMaterialComponent[] = [];
    const entries = text
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    for (const entry of entries) {
        const parts = entry.split(COMPONENT_FRACTION_SEPARATORS);
        if (parts.length !== 2) {
            return { components: [], error: `"${entry}" is not "formula:fraction"` };
        }
        const formula = parts[0].trim();
        let valueText = parts[1].trim();
        let scale = 1;
        if (valueText.endsWith("%")) {
            valueText = valueText.slice(0, -1).trim();
            scale = 0.01;
        }
        // `Number("")` is 0, not NaN, so an empty value would silently
        // become a zeroed component. A half-typed entry is an error.
        if (valueText.length === 0 || formula.length === 0) {
            return { components: [], error: `"${entry}" is missing its ${formula.length === 0 ? "formula" : "number"}` };
        }
        const fraction = Number(valueText);
        if (!Number.isFinite(fraction)) {
            return { components: [], error: `"${parts[1].trim()}" is not a number (in "${entry}")` };
        }
        components.push({ formula, fraction: fraction * scale });
    }
    return { components, error: null };
}

/** Render components back to the one-line syntax. */
export function formatComponentList(components: ReadonlyArray<IMaterialComponent>): string {
    return components.map((c) => `${c.formula}:${c.fraction}`).join(", ");
}

export class MaterialNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: MATERIAL_OUT, optional: false, type: "any" }];

    @cloneable private _presetId: string = "custom";
    @cloneable private _displayName: string = "Material";
    @cloneable private _basis: FractionBasis = "mass";
    @cloneable private _componentsText: string = "";
    @cloneable private _provenance: string = "user input";

    /** Bumped on every edit; published as `specVersion`. */
    private _revision: number = 0;
    /** Memoised spec, invalidated by `_revision`. */
    private _spec: IMaterialSpec | null = null;
    private _specRevision: number = -1;
    private _resolutionError: string | null = null;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ────────────────────────────────────────────────────

    @editable("string")
    public get preset_id(): string {
        return this._presetId;
    }
    public set preset_id(v: string) {
        this.setField("preset_id", this._presetId, v, (n) => {
            this._presetId = n;
            this._invalidate();
        });
    }
    public get presetId(): string {
        return this._presetId;
    }
    public set presetId(v: string) {
        this.preset_id = v;
    }

    @editable("string")
    public get display_name(): string {
        return this._displayName;
    }
    public set display_name(v: string) {
        this.setField("display_name", this._displayName, v, (n) => {
            this._displayName = n;
            this._invalidate();
        });
    }
    public get displayName(): string {
        return this._displayName;
    }
    public set displayName(v: string) {
        this.display_name = v;
    }

    /**
     * `"mass"` or `"mole"`. Anything else is ignored rather than
     * applied: a basis is a statement about the user's numbers, and
     * silently switching it would change the material.
     */
    @editable("string")
    public get basis(): FractionBasis {
        return this._basis;
    }
    public set basis(v: FractionBasis) {
        const next = v === "mass" || v === "mole" ? v : this._basis;
        this.setField("basis", this._basis, next, (n) => {
            this._basis = n;
            this._invalidate();
        });
    }

    /** One-line component list: `SiO2:0.6, Fe2O3:0.2, MgO:0.05`. */
    @editable("string")
    public get components(): string {
        return this._componentsText;
    }
    public set components(v: string) {
        this.setField("components", this._componentsText, v, (n) => {
            this._componentsText = n;
            this._invalidate();
        });
    }

    @editable("string")
    public get provenance(): string {
        return this._provenance;
    }
    public set provenance(v: string) {
        this.setField("provenance", this._provenance, v, (n) => {
            this._provenance = n;
            this._invalidate();
        });
    }

    // ── Viewables ────────────────────────────────────────────────────

    @viewable("number") public get component_count(): number {
        return this.spec.components.length;
    }

    @viewable("number") public get element_count(): number {
        return this.spec.elements.length;
    }

    /** Sum of the declared fractions. A value away from 1 means the
     *  published vectors were rescaled; the user should see it. */
    @viewable("number") public get input_fraction_sum(): number {
        return this.spec.inputFractionSum;
    }

    /** Empty when the composition resolved, the reason otherwise. */
    @viewable("string") public get resolution_error(): string {
        return this.spec.resolutionError ?? "";
    }

    /** The resolved elements and their mass fractions, as one line, for
     *  a glance at the panel without opening a debugger. */
    @viewable("string") public get resolved_mass_fractions(): string {
        const s = this.spec;
        return s.elements.map((e) => `${e}:${(s.massFractions[e] * 100).toFixed(2)}%`).join(" ");
    }

    // ── Component manipulation ───────────────────────────────────────

    /** Replace the whole component list. */
    public setComponents(components: ReadonlyArray<IMaterialComponent>): void {
        this.components = formatComponentList(components);
    }

    /** Append a component, or replace its fraction if the formula is
     *  already declared. */
    public upsertComponent(component: IMaterialComponent): void {
        const current = this.componentList().slice();
        const idx = current.findIndex((c) => c.formula === component.formula);
        if (idx >= 0) current[idx] = { ...component };
        else current.push({ ...component });
        this.setComponents(current);
    }

    /** Remove a component by formula. No-op when absent. */
    public removeComponent(formula: string): void {
        const current = this.componentList();
        const next = current.filter((c) => c.formula !== formula);
        if (next.length !== current.length) this.setComponents(next);
    }

    /** The component list as declared, parsed from the text field. */
    public componentList(): ReadonlyArray<IMaterialComponent> {
        return this.spec.components;
    }

    // ── The spec ─────────────────────────────────────────────────────

    /**
     * The published specification. Recomputed only when something
     * changed, so a downstream node may read it every tick.
     */
    public get spec(): IMaterialSpec {
        if (this._spec && this._specRevision === this._revision) return this._spec;

        const parsed = parseComponentList(this._componentsText);
        let massFractions: Record<string, number> = {};
        let moleFractions: Record<string, number> = {};
        let elements: string[] = [];
        let inputFractionSum = 0;
        let error = parsed.error;

        if (!error) {
            try {
                const resolved = resolveElementalComposition(parsed.components, this._basis);
                massFractions = { ...resolved.massFractions };
                moleFractions = { ...resolved.moleFractions };
                elements = [...resolved.elements];
                inputFractionSum = resolved.inputFractionSum;
            } catch (e) {
                error = e instanceof ChemicalFormulaError ? e.message : String(e);
            }
        }

        this._resolutionError = error;
        this._spec = Object.freeze({
            specVersion: this._revision,
            displayName: this._displayName,
            basis: this._basis,
            components: Object.freeze(error ? [] : parsed.components),
            massFractions: Object.freeze(massFractions),
            moleFractions: Object.freeze(moleFractions),
            elements: Object.freeze(elements),
            inputFractionSum,
            provenance: this._provenance,
            resolutionError: error,
        });
        this._specRevision = this._revision;
        return this._spec;
    }

    /** Last resolution error, or null. Same value as the viewable, typed. */
    public get resolutionError(): string | null {
        void this.spec;
        return this._resolutionError;
    }

    // ── Runtime ──────────────────────────────────────────────────────

    public override fire(session: ISession, _t: number): void {
        const spec = this.spec;
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== MATERIAL_OUT || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, spec);
        }
        // Nothing to consume: a material is a source. The loop below
        // exists only to keep the fan-in bookkeeping honest if someone
        // later wires a descriptor into this node.
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            void inSlotOf(link);
            void session.consume(idx);
        }
    }

    private _invalidate(): void {
        this._revision++;
        this._spec = null;
    }
}

/** Factory, as every registered node family in this repo provides. */
export function createMaterialNode(): MaterialNode {
    return new MaterialNode();
}
