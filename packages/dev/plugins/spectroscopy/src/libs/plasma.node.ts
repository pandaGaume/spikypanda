/**
 * `Spectro.Libs:plasma`, the emission stage of the LIBS chain.
 *
 * Reads a material specification on `material_in`, and publishes a LINE
 * LIST on `emission_out`: one amplitude and one Doppler width per
 * atomic transition. It does not sample anything onto a wavelength grid,
 * because the window, the resolution and the pixel count belong to the
 * instrument, not to the plasma.
 *
 * It reads the material's MOLE fractions, not its mass fractions. A line
 * is emitted by atoms: for iron oxide, 69.94 % of the mass is iron but
 * only 40 % of the atoms are, and using the mass vector would weight
 * every line of every heavy element too strongly. The material node
 * publishes both vectors precisely so this node can pick the right one.
 *
 * Physical honesty, enforced in code rather than promised in a comment:
 * the default emission model is `relative`, and the `physical` model
 * refuses to run while the line catalogue is unverified or lacks
 * transition probabilities, upper-level weights and upper-level
 * energies. The refusal travels in the payload as `blocker`, and the
 * published line list is then empty: no downstream node ever receives a
 * number that pretends to be physical.
 *
 * Temperature and electron density do have an effect in `relative`
 * mode, on the line WIDTHS: Doppler broadening from the temperature and
 * the element's atomic mass, and a collisional width proportional to the
 * electron density. The intensities, in that mode, are composition times
 * catalogue strength, and nothing else.
 *
 * What is NOT modelled here, each one listed in the track's model
 * document: ionisation balance (Saha), level populations (Boltzmann),
 * self-absorption, plasma inhomogeneity, time evolution, molecular
 * bands, and the fractionation between the solid's composition and the
 * plasma's.
 */

import { cloneable, editable, IChannel, IDeclaresPorts, inSlotOf, IOlink, IPortDescriptor, ISession, RuntimeNode, viewable } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import { BUILTIN_LINE_CATALOGUE } from "../lines/lines.catalog.js";
import type { IAtomicLine } from "../lines/lines.catalog.js";
import { NIST_IONISATION_ENERGIES_EV, NIST_LINE_CATALOGUE, NIST_PROVENANCE, NIST_SPECIES } from "../lines/nist.catalogue.js";
import { computeLineEmissions, DEFAULT_PLASMA_PARAMETERS } from "./engine.js";
import type { EmissionModel, IPlasmaEmission, IPlasmaParameters } from "./engine.js";
import type { IPhysicalModelData } from "./physical.js";

/** Which line catalogue the node reads. */
export type CatalogueChoice = "nist" | "builtin";

/**
 * The NIST data set, assembled once: every species with its lines, its
 * complete level list and the ionisation energies that close the Saha
 * balance.
 */
export const NIST_PHYSICAL_DATA: IPhysicalModelData = Object.freeze({
    species: NIST_SPECIES.map((s) => Object.freeze({ element: s.element, ionisation: s.ionisation, asdName: s.asdName, lines: s.lines, levels: s.levels })),
    ionisationEnergiesEv: NIST_IONISATION_ENERGIES_EV,
});

/** Input slot: a material specification. */
export const PLASMA_IN_MATERIAL = "material_in";
/** Output slot: the line list this plasma emits. */
export const PLASMA_OUT_EMISSION = "emission_out";

/**
 * The part of a material specification this node needs. Duck-typed on
 * purpose: `@spiky-panda/plugin-spectroscopy` must not depend on
 * `@spiky-panda/plugin-chemistry`, exactly as the physics atmosphere
 * declares its own `ICompositionView` instead of importing the chemistry
 * plugin.
 */
export interface IMaterialSpecView {
    readonly specVersion: number;
    /** Atom fraction per element symbol. What this node consumes. */
    readonly moleFractions: Readonly<Record<string, number>>;
    /** Mass fraction per element symbol. Carried for the record. */
    readonly massFractions: Readonly<Record<string, number>>;
    readonly displayName?: string;
    readonly provenance?: string;
    readonly resolutionError?: string | null;
}

/** Structural guard for the payload read off `material_in`. */
export function isMaterialSpecView(v: unknown): v is IMaterialSpecView {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<IMaterialSpecView>;
    return typeof s.specVersion === "number" && !!s.moleFractions && typeof s.moleFractions === "object" && !!s.massFractions && typeof s.massFractions === "object";
}

export class LibsPlasmaNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: PLASMA_IN_MATERIAL, optional: true, type: "any" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: PLASMA_OUT_EMISSION, optional: false, type: "any" }];

    @cloneable private _temperatureK: number = DEFAULT_PLASMA_PARAMETERS.temperatureK;
    @cloneable private _electronDensityCm3: number = DEFAULT_PLASMA_PARAMETERS.electronDensityCm3;
    @cloneable private _referenceElectronDensityCm3: number = DEFAULT_PLASMA_PARAMETERS.referenceElectronDensityCm3;
    @cloneable private _collisionalWidthNm: number = DEFAULT_PLASMA_PARAMETERS.collisionalWidthNm;
    @cloneable private _intensityScale: number = DEFAULT_PLASMA_PARAMETERS.intensityScale;
    @cloneable private _continuumLevel: number = DEFAULT_PLASMA_PARAMETERS.continuumLevel;
    /** Physical by default: the shipped NIST catalogue supports it. */
    @cloneable private _emissionModel: EmissionModel = "physical";
    @cloneable private _catalogueChoice: CatalogueChoice = "nist";

    /** Line catalogue in use. Not cloneable: it is reference data, and a
     *  saved document stores WHICH catalogue through `line_catalogue`
     *  plus the simulation identifier, never a copy of the lines. */
    private _catalogue: ReadonlyArray<IAtomicLine> = NIST_LINE_CATALOGUE;
    /** Null when the current catalogue cannot support the physical
     *  model, which is the case for the built-in one. */
    private _physicalData: IPhysicalModelData | null = NIST_PHYSICAL_DATA;

    private _material: IMaterialSpecView | null = null;
    private _emission: IPlasmaEmission | null = null;
    /** Bumped by any edit; combined with the material's `specVersion`
     *  to decide whether the emission must be recomputed. */
    private _revision: number = 0;
    private _emissionKey: string = "";

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ────────────────────────────────────────────────────

    @editable("number", { unit: { quantity: "Temperature", unit: "k" } })
    public get temperature(): number {
        return this._temperatureK;
    }
    public set temperature(v: number) {
        const next = v > 0 ? v : this._temperatureK;
        this.setField("temperature", this._temperatureK, next, (n) => {
            this._temperatureK = n;
            this._invalidate();
        });
    }

    /** Electron density [cm^-3]. No `Quantity` class covers a number
     *  density yet, so the unit lives in the name and in the doc. */
    @editable("number")
    public get electron_density_cm3(): number {
        return this._electronDensityCm3;
    }
    public set electron_density_cm3(v: number) {
        const next = v >= 0 ? v : this._electronDensityCm3;
        this.setField("electron_density_cm3", this._electronDensityCm3, next, (n) => {
            this._electronDensityCm3 = n;
            this._invalidate();
        });
    }

    /** Density at which `collisional_width` is stated [cm^-3]. */
    @editable("number")
    public get reference_electron_density_cm3(): number {
        return this._referenceElectronDensityCm3;
    }
    public set reference_electron_density_cm3(v: number) {
        const next = v > 0 ? v : this._referenceElectronDensityCm3;
        this.setField("reference_electron_density_cm3", this._referenceElectronDensityCm3, next, (n) => {
            this._referenceElectronDensityCm3 = n;
            this._invalidate();
        });
    }

    @editable("number", { unit: { quantity: "Length", unit: "nm" } })
    public get collisional_width(): number {
        return this._collisionalWidthNm;
    }
    public set collisional_width(v: number) {
        const next = v >= 0 ? v : this._collisionalWidthNm;
        this.setField("collisional_width", this._collisionalWidthNm, next, (n) => {
            this._collisionalWidthNm = n;
            this._invalidate();
        });
    }

    @editable("number")
    public get intensity_scale(): number {
        return this._intensityScale;
    }
    public set intensity_scale(v: number) {
        const next = v >= 0 ? v : this._intensityScale;
        this.setField("intensity_scale", this._intensityScale, next, (n) => {
            this._intensityScale = n;
            this._invalidate();
        });
    }

    @editable("number")
    public get continuum_level(): number {
        return this._continuumLevel;
    }
    public set continuum_level(v: number) {
        const next = v >= 0 ? v : this._continuumLevel;
        this.setField("continuum_level", this._continuumLevel, next, (n) => {
            this._continuumLevel = n;
            this._invalidate();
        });
    }

    /** `"relative"` or `"physical"`. Any other value is ignored. */
    @editable("string")
    public get emission_model(): EmissionModel {
        return this._emissionModel;
    }
    public set emission_model(v: EmissionModel) {
        const next = v === "relative" || v === "physical" ? v : this._emissionModel;
        this.setField("emission_model", this._emissionModel, next, (n) => {
            this._emissionModel = n;
            this._invalidate();
        });
    }

    /**
     * `"nist"` or `"builtin"`. Two catalogues, two different claims:
     *
     *   nist     9 394 verified transitions over Ca, Fe and Si, each
     *            as the neutral atom, the ion and the doubly ionised
     *            atom, with level lists and ionisation energies, so the
     *            physical model runs. Three elements only: anything
     *            else in the composition is reported as a missing
     *            element.
     *   builtin  48 strong lines written from memory over 20 elements,
     *            every one flagged unverified. Wider coverage, and the
     *            physical model refuses to run on it.
     *
     * They are never mixed: a spectrum built from verified and
     * unverified numbers at once could not be interpreted.
     */
    @editable("string")
    public get line_catalogue(): CatalogueChoice {
        return this._catalogueChoice;
    }
    public set line_catalogue(v: CatalogueChoice) {
        const next = v === "nist" || v === "builtin" ? v : this._catalogueChoice;
        this.setField("line_catalogue", this._catalogueChoice, next, (n) => {
            this._catalogueChoice = n;
            if (n === "nist") {
                this._catalogue = NIST_LINE_CATALOGUE;
                this._physicalData = NIST_PHYSICAL_DATA;
            } else {
                this._catalogue = BUILTIN_LINE_CATALOGUE;
                this._physicalData = null;
            }
            this._invalidate();
        });
    }

    // ── Viewables ────────────────────────────────────────────────────

    @viewable("number") public get line_count(): number {
        return this.emission.lines.length;
    }

    @viewable("number") public get catalogue_size(): number {
        return this._catalogue.length;
    }

    @viewable("string") public get material_name(): string {
        return this._material?.displayName ?? "(nothing wired)";
    }

    /** Elements of the composition the catalogue cannot emit. */
    @viewable("string") public get missing_elements(): string {
        return this.emission.missingElements.join(" ");
    }

    /** Empty when the requested model ran, the refusal otherwise. */
    @viewable("string") public get model_blocker(): string {
        return this.emission.blocker ?? "";
    }

    /** Unit of the published intensities. The two models do not claim
     *  the same thing, so the unit is not the same either. */
    @viewable("string") public get intensity_unit(): string {
        return this.emission.intensityUnit;
    }

    /** Where the catalogue comes from, in one line. */
    @viewable("string") public get catalogue_provenance(): string {
        return this._catalogueChoice === "nist" ? `${NIST_PROVENANCE.database} ${NIST_PROVENANCE.version}, ${NIST_PROVENANCE.downloadedOn}` : "written from memory, unverified";
    }

    /** How each element's atoms are shared between its ionisation
     *  stages under the Saha balance, in physical mode, written
     *  neutral/singly/doubly. Empty in relative mode, which solves no
     *  balance. */
    @viewable("string") public get stage_fractions(): string {
        return this.emission.elementReports.map((r) => `${r.element}:${r.stageFractions.map((f) => (f * 100).toFixed(1)).join("/")}%`).join(" ");
    }

    /** How deep the balance was solved per element: 3 is up to the
     *  doubly ionised atom, less means the deeper stages' atoms were
     *  attributed to the stages below and every ratio of this element
     *  carries that error. */
    @viewable("string") public get stages_solved(): string {
        return this.emission.elementReports.map((r) => `${r.element}:${r.stagesSolved}`).join(" ");
    }

    /**
     * Largest share of a partition function that comes from the highest
     * tenth of its published level list. A large value means the level
     * list stops too early for this temperature and the partition
     * function is underestimated: it is the truncation sensitivity the
     * model document asks to measure, surfaced where it is read.
     */
    @viewable("number") public get partition_top_decile_share(): number {
        return this.emission.elementReports.reduce((m, r) => Math.max(m, r.partitionTopDecileShare), 0);
    }

    /** Collisional FWHM actually applied [nm], at the current density. */
    @viewable("number") public get collisional_width_applied(): number {
        const ref = this._referenceElectronDensityCm3;
        return ref > 0 ? this._collisionalWidthNm * (this._electronDensityCm3 / ref) : 0;
    }

    // ── API ──────────────────────────────────────────────────────────

    /** The plasma state, as the engine wants it. */
    public get parameters(): IPlasmaParameters {
        return {
            temperatureK: this._temperatureK,
            electronDensityCm3: this._electronDensityCm3,
            referenceElectronDensityCm3: this._referenceElectronDensityCm3,
            collisionalWidthNm: this._collisionalWidthNm,
            intensityScale: this._intensityScale,
            continuumLevel: this._continuumLevel,
            emissionModel: this._emissionModel,
        };
    }

    public get catalogue(): ReadonlyArray<IAtomicLine> {
        return this._catalogue;
    }

    /**
     * Swap the catalogue, for a test or for a future line-bank node.
     * `physicalData` must accompany a catalogue that claims to support
     * the physical model; passing none makes the physical model refuse,
     * which is the correct outcome for a catalogue without level lists.
     */
    public setCatalogue(lines: ReadonlyArray<IAtomicLine>, physicalData: IPhysicalModelData | null = null): void {
        this._catalogue = lines;
        this._physicalData = physicalData;
        this._invalidate();
    }

    /** The data set behind the physical model, or null. */
    public get physicalData(): IPhysicalModelData | null {
        return this._physicalData;
    }

    /** Set the material directly, for headless use and tests. */
    public setMaterial(material: IMaterialSpecView | null): void {
        this._material = material;
        this._invalidate();
    }

    public get material(): IMaterialSpecView | null {
        return this._material;
    }

    /**
     * The emission, recomputed only when the state or the material
     * changed. With nothing wired, it is an empty line list, not an
     * error: a plasma without a sample emits nothing.
     */
    public get emission(): IPlasmaEmission {
        const key = `${this._revision}:${this._material?.specVersion ?? -1}`;
        if (this._emission && this._emissionKey === key) return this._emission;
        const atomFractions = this._material?.moleFractions ?? {};
        this._emission = computeLineEmissions(atomFractions, this._catalogue, this.parameters, this._material?.provenance ?? "", this._physicalData ?? undefined);
        this._emissionKey = key;
        return this._emission;
    }

    // ── Runtime ──────────────────────────────────────────────────────

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            if (String(inSlotOf(link)) !== PLASMA_IN_MATERIAL) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (!isMaterialSpecView(v)) continue;
            // Only invalidate on a real change: the material republishes
            // the same frozen object every tick.
            if (this._material !== v) this.setMaterial(v);
        }

        const emission = this.emission;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== PLASMA_OUT_EMISSION || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, emission);
        }
    }

    private _invalidate(): void {
        this._revision++;
        this._emission = null;
    }
}

/** Factory, as every registered node family in this repo provides. */
export function createLibsPlasmaNode(): LibsPlasmaNode {
    return new LibsPlasmaNode();
}
