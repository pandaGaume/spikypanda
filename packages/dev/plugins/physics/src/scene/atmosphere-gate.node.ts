/**
 * Physics.Scene:atmosphere-gate — the producer that couples two
 * atmospheres (F10d of sim-framework-api-v2 / P7).
 *
 * Lives BETWEEN two AtmosphereStateNode instances. Reads each
 * atmosphere's pressure / temperature / per-species mole fractions
 * via standard runtime cables, computes a per-species mass flow
 * (kg/s) according to the selected mode, and publishes the result
 * with opposite signs on the two sides:
 *
 *   - `A_delta_<species>`: negative when material flows out of A
 *   - `B_delta_<species>`: positive when material flows into B
 *
 * The downstream `AtmosphereStateNode`'s variadic `delta_<species>_<k>`
 * inputs receive these deltas; their rhs's `inputs.sumPrefix(...)`
 * folds every wired gate into the species mass-balance for free.
 *
 * Mass conservation is native: A_delta_i + B_delta_i = 0 by
 * construction (the gate computes one flux and publishes both signs
 * from it), so no explicit conservation hook is needed in V1.
 *
 * Modes (Q-S10):
 *
 *   `closed`        flux = 0 everywhere. Pure algebraic; `stateSize === 0`.
 *                   Cas d'usage: contamination safety, sealed door,
 *                   contingency isolation.
 *
 *   `open_passive`  flux_i = leakCoeff × area × |ΔP| × x_upwind_i × M_i / (RT_upwind)
 *                   Linearised orifice (V1 — sqrt-form deferred). The
 *                   `bidirectional` flag turns the gate into a
 *                   check-valve (no flux when ΔP changes sign).
 *                   `stateSize === 0`.
 *
 *   `hvac_forced`   flux_i = forcedFlow × P_A × x_A_i × M_i / (R × T_A)
 *                   Fixed volumetric flow A → B. Optionally
 *                   `stateSize === 1` when `trackThroughput` is on —
 *                   the integrated state is the cumulative volume
 *                   moved by the fan (m³), surfaced for aging models.
 *
 * V1 species schema is the canonical V1_SPECIES_ORDER from
 * `core/sim/chemical.species` (N2 / O2 / CO2 / H2O / Ar). The gate
 * does not impose its own schema — it consumes whatever the
 * AtmosphereStateNode publishes and falls back to mole_fraction = 0
 * for any species not wired.
 */

import {
    Area,
    CHEMICAL_SPECIES_V1,
    cloneable,
    editable,
    GAS_CONSTANT_R,
    IDeclaresPorts,
    IIntegrable,
    IIntegrationInputs,
    IOlink,
    IPortDescriptor,
    ISession,
    RuntimeNode,
    V1_SPECIES_ORDER,
    viewable,
    VolumetricFlow,
    inSlotOf,
} from "spikypanda-core";
import type { ChemicalSpeciesId, IChannel, ICartesian, Nullable } from "spikypanda-core";

export type AtmosphereGateMode = "closed" | "open_passive" | "hvac_forced";

/** Slot / prefix constants — exported so the editor's reconciler and
 *  any sibling test code can refer to them without re-deriving the
 *  string convention. */
export const GATE_IN_A_PRESSURE = "A_pressure";
export const GATE_IN_A_TEMPERATURE = "A_temperature";
export const GATE_IN_B_PRESSURE = "B_pressure";
export const GATE_IN_B_TEMPERATURE = "B_temperature";
export const GATE_IN_A_MOLE_FRACTION_PREFIX = "A_mole_fraction_";
export const GATE_IN_B_MOLE_FRACTION_PREFIX = "B_mole_fraction_";
export const GATE_OUT_A_DELTA_PREFIX = "A_delta_";
export const GATE_OUT_B_DELTA_PREFIX = "B_delta_";

export class AtmosphereGateNode extends RuntimeNode implements IDeclaresPorts, IIntegrable {
    public readonly activeSpecies: ReadonlyArray<ChemicalSpeciesId> = V1_SPECIES_ORDER;

    // ── Editables ─────────────────────────────────────────────────────

    @cloneable private _mode: AtmosphereGateMode = "open_passive";
    /** Throat area [m²], used in open_passive. */
    @cloneable private _areaM2: number = 1.0;
    /** Linearised leak coefficient (dimensionless). Tuned per scenario;
     *  a millimetre-scale leak through a closed door panel is ~1e-3,
     *  a wide-open door ~1, a hairline crack ~1e-6. */
    @cloneable private _leakCoeff: number = 1e-3;
    /** Forced volumetric flow rate [m³/s], used in hvac_forced. */
    @cloneable private _forcedFlowM3ps: number = 0;
    /** Bidirectional flag for open_passive. When false, the gate
     *  behaves as a check-valve: only flows A → B (no back-flow when
     *  P_B > P_A). Used to model one-way HEPA filters, mufflers,
     *  pressure-relief valves. */
    @cloneable private _bidirectional: boolean = true;
    /** Track fan cumulative throughput as a 1-state IIntegrable.
     *  Only meaningful in hvac_forced; ignored in the other modes.
     *  Default off — flip on for aging / maintenance models. */
    @cloneable private _trackThroughput: boolean = false;
    /** Cumulative throughput in m³ (state when trackThroughput &&
     *  hvac_forced). */
    @cloneable private _throughputM3: number = 0;

    // ── Per-tick scratch (rebuilt at every fire()) ────────────────────

    /** Per-species mass flow [kg/s], signed positive when material
     *  flows A → B. Used by `_publishDeltas` for the opposite-sign
     *  pair publish. */
    private _lastFluxKgPerSec: number[] = [];
    /** Signed volumetric flow [m³/s], positive A → B. Surfaced as a
     *  viewable for the property panel / diagnostic plotting. */
    private _lastVolFlow: number = 0;
    private _A_pressurePa: number = 0;
    private _A_temperatureK: number = 293.15;
    private _B_pressurePa: number = 0;
    private _B_temperatureK: number = 293.15;
    private readonly _A_moleFractions: Map<ChemicalSpeciesId, number> = new Map();
    private readonly _B_moleFractions: Map<ChemicalSpeciesId, number> = new Map();

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = this._buildInputPorts();
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = this._buildOutputPorts();

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editable accessors ──────────────────────────────────────────

    @editable("string")
    public get mode(): AtmosphereGateMode {
        return this._mode;
    }
    public set mode(v: AtmosphereGateMode) {
        const next: AtmosphereGateMode = v === "closed" || v === "open_passive" || v === "hvac_forced" ? v : "open_passive";
        this.setField("mode", this._mode, next, (n) => {
            this._mode = n;
        });
    }

    @editable("number", { unit: "m²" })
    public get area(): number {
        return this._areaM2;
    }
    public set area(v: number) {
        const next = v > 0 ? v : 1e-9;
        this.setField("area", this._areaM2, next, (n) => {
            this._areaM2 = n;
        });
    }
    /** Quantity-aware accessor: setter accepts any Area unit, getter
     *  returns a fresh `Area` wrapping the canonical-m² storage. */
    public get areaQ(): Area {
        return new Area(this._areaM2, Area.Units.m2);
    }
    public set areaQ(q: Area) {
        this.area = q.getValue(Area.Units.m2);
    }

    @editable("number")
    public get leakCoeff(): number {
        return this._leakCoeff;
    }
    public set leakCoeff(v: number) {
        const next = v > 0 ? v : 1e-12;
        this.setField("leakCoeff", this._leakCoeff, next, (n) => {
            this._leakCoeff = n;
        });
    }

    @editable("number", { unit: "m³/s" })
    public get forcedFlow(): number {
        return this._forcedFlowM3ps;
    }
    public set forcedFlow(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("forcedFlow", this._forcedFlowM3ps, next, (n) => {
            this._forcedFlowM3ps = n;
        });
    }
    /** Quantity-aware accessor: setter accepts any VolumetricFlow unit
     *  (L/min, cfm, ...), getter wraps the canonical-m³/s storage. */
    public get forcedFlowQ(): VolumetricFlow {
        return new VolumetricFlow(this._forcedFlowM3ps, VolumetricFlow.Units.m3ps);
    }
    public set forcedFlowQ(q: VolumetricFlow) {
        this.forcedFlow = q.getValue(VolumetricFlow.Units.m3ps);
    }

    @editable("boolean")
    public get bidirectional(): boolean {
        return this._bidirectional;
    }
    public set bidirectional(v: boolean) {
        this.setField("bidirectional", this._bidirectional, v, (n) => {
            this._bidirectional = n;
        });
    }

    @editable("boolean")
    public get trackThroughput(): boolean {
        return this._trackThroughput;
    }
    public set trackThroughput(v: boolean) {
        this.setField("trackThroughput", this._trackThroughput, v, (n) => {
            this._trackThroughput = n;
        });
    }

    // ── Viewables ────────────────────────────────────────────────────

    @viewable("number") public get lastVolumetricFlow(): number {
        return this._lastVolFlow;
    }
    @viewable("number") public get throughput(): number {
        return this._throughputM3;
    }

    // ── Port construction ────────────────────────────────────────────

    private _buildInputPorts(): IPortDescriptor[] {
        const ports: IPortDescriptor[] = [
            { slot: GATE_IN_A_PRESSURE, optional: true, type: "float" },
            { slot: GATE_IN_A_TEMPERATURE, optional: true, type: "float" },
            { slot: GATE_IN_B_PRESSURE, optional: true, type: "float" },
            { slot: GATE_IN_B_TEMPERATURE, optional: true, type: "float" },
        ];
        for (const sp of this.activeSpecies) {
            ports.push({ slot: `${GATE_IN_A_MOLE_FRACTION_PREFIX}${sp}`, optional: true, type: "float" });
            ports.push({ slot: `${GATE_IN_B_MOLE_FRACTION_PREFIX}${sp}`, optional: true, type: "float" });
        }
        return ports;
    }

    private _buildOutputPorts(): IPortDescriptor[] {
        const ports: IPortDescriptor[] = [];
        for (const sp of this.activeSpecies) {
            ports.push({ slot: `${GATE_OUT_A_DELTA_PREFIX}${sp}`, optional: true, type: "float" });
            ports.push({ slot: `${GATE_OUT_B_DELTA_PREFIX}${sp}`, optional: true, type: "float" });
        }
        return ports;
    }

    // ── IIntegrable (conditional on mode + trackThroughput) ──────────

    public get stateSize(): number {
        return this._mode === "hvac_forced" && this._trackThroughput ? 1 : 0;
    }

    public get stateNames(): ReadonlyArray<string> {
        return this.stateSize === 1 ? ["throughput_m3"] : [];
    }

    public gatherState(y: Float64Array, off: number): void {
        if (this.stateSize === 1) y[off] = this._throughputM3;
    }

    public writeState(y: Float64Array, off: number): void {
        if (this.stateSize === 1) {
            const v = y[off];
            this._throughputM3 = Number.isFinite(v) && v >= 0 ? v : 0;
        }
    }

    /**
     * State derivative for the throughput counter: dV/dt = current
     * volumetric flow. Closed-mode and open-passive paths return 0
     * (stateSize === 0; the solver guard skips them anyway, but the
     * branch keeps the code self-consistent for the hvac_forced
     * → trackThroughput=false case).
     */
    public rhs(_t: number, _y: Float64Array, off: number, _inputs: IIntegrationInputs, dydt: Float64Array): void {
        if (this.stateSize === 1) {
            dydt[off] = this._mode === "hvac_forced" ? this._forcedFlowM3ps : 0;
        }
    }

    // ── Lifecycle ────────────────────────────────────────────────────

    public override reset(_session: ISession): void {
        this._throughputM3 = 0;
        this._lastFluxKgPerSec = new Array(this.activeSpecies.length).fill(0);
        this._lastVolFlow = 0;
        this._A_moleFractions.clear();
        this._B_moleFractions.clear();
    }

    public override fire(session: ISession, _t: number): void {
        this._consumeInputs(session);
        this._computeFluxes();
        this._publishDeltas(session);
    }

    // ── Internals ────────────────────────────────────────────────────

    private _consumeInputs(session: ISession): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        // Unwired species default to 0 mole fraction → no flux for that
        // species this tick. Clearing the map every fire is cheap (≤ 5
        // entries) and avoids stale state when a species' producer
        // stops publishing mid-session.
        this._A_moleFractions.clear();
        this._B_moleFractions.clear();
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === GATE_IN_A_PRESSURE) this._A_pressurePa = value;
            else if (slot === GATE_IN_A_TEMPERATURE) this._A_temperatureK = value > 0 ? value : 293.15;
            else if (slot === GATE_IN_B_PRESSURE) this._B_pressurePa = value;
            else if (slot === GATE_IN_B_TEMPERATURE) this._B_temperatureK = value > 0 ? value : 293.15;
            else if (slot.startsWith(GATE_IN_A_MOLE_FRACTION_PREFIX)) {
                const sp = slot.substring(GATE_IN_A_MOLE_FRACTION_PREFIX.length) as ChemicalSpeciesId;
                this._A_moleFractions.set(sp, value);
            } else if (slot.startsWith(GATE_IN_B_MOLE_FRACTION_PREFIX)) {
                const sp = slot.substring(GATE_IN_B_MOLE_FRACTION_PREFIX.length) as ChemicalSpeciesId;
                this._B_moleFractions.set(sp, value);
            }
        }
    }

    private _computeFluxes(): void {
        const n = this.activeSpecies.length;
        if (this._lastFluxKgPerSec.length !== n) {
            this._lastFluxKgPerSec = new Array(n).fill(0);
        }
        for (let i = 0; i < n; i++) this._lastFluxKgPerSec[i] = 0;
        this._lastVolFlow = 0;

        if (this._mode === "closed") return;

        let volFlow = 0;
        let upwindIsA = true;
        let upwindP = this._A_pressurePa;
        let upwindT = this._A_temperatureK;
        let upwindMoles = this._A_moleFractions;

        if (this._mode === "open_passive") {
            const dP = this._A_pressurePa - this._B_pressurePa;
            // Check-valve: when bidirectional is off, no back-flow.
            if (!this._bidirectional && dP <= 0) return;
            volFlow = this._leakCoeff * this._areaM2 * Math.abs(dP);
            upwindIsA = dP >= 0;
            if (!upwindIsA) {
                upwindP = this._B_pressurePa;
                upwindT = this._B_temperatureK;
                upwindMoles = this._B_moleFractions;
            }
        } else if (this._mode === "hvac_forced") {
            // hvac_forced is always unidirectional A → B by convention.
            // The user sets forcedFlow ≥ 0; the wiring side determines
            // which atmosphere is "upstream of the fan".
            volFlow = this._forcedFlowM3ps;
            upwindIsA = true;
        }

        // Signed volumetric flow positive when material moves A → B,
        // negative when moving B → A (open_passive only).
        this._lastVolFlow = upwindIsA ? volFlow : -volFlow;
        if (volFlow <= 0) return;

        // Per-species mass flow [kg/s]:
        //   m_i / dt = V̇ × P_upwind × x_upwind_i × M_i / (R × T_upwind)
        // Derivation: V̇ × ρ_total_upwind × y_upwind_i where
        //   ρ_total = P × M_avg / RT and y_i = x_i × M_i / M_avg,
        // so M_avg cancels — the per-species ideal-gas form.
        const RT = GAS_CONSTANT_R * upwindT;
        const inverseRT = 1 / Math.max(1e-30, RT);
        for (let i = 0; i < n; i++) {
            const sp = this.activeSpecies[i];
            const x = upwindMoles.get(sp) ?? 0;
            const M = CHEMICAL_SPECIES_V1[sp].molarMass;
            const flux = volFlow * upwindP * M * x * inverseRT;
            // Sign convention: positive when A → B.
            this._lastFluxKgPerSec[i] = upwindIsA ? flux : -flux;
        }
    }

    private _publishDeltas(session: ISession): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(link.slot);
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (slot.startsWith(GATE_OUT_A_DELTA_PREFIX)) {
                const sp = slot.substring(GATE_OUT_A_DELTA_PREFIX.length) as ChemicalSpeciesId;
                const i = this.activeSpecies.indexOf(sp);
                if (i < 0) continue;
                // A side: NEGATIVE of the A → B flux (mass leaving A).
                session.publish(idx, -this._lastFluxKgPerSec[i]);
            } else if (slot.startsWith(GATE_OUT_B_DELTA_PREFIX)) {
                const sp = slot.substring(GATE_OUT_B_DELTA_PREFIX.length) as ChemicalSpeciesId;
                const i = this.activeSpecies.indexOf(sp);
                if (i < 0) continue;
                // B side: POSITIVE of the A → B flux (mass entering B).
                session.publish(idx, this._lastFluxKgPerSec[i]);
            }
        }
    }
}

/** Factory invoked by the Physics.Scene sub-plugin registration. */
export function createAtmosphereGateNode(): AtmosphereGateNode {
    return new AtmosphereGateNode();
}
