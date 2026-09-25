/**
 * `Physics.Scene:atmosphere-gate` — the producer that couples two
 * atmospheres (F10d).
 *
 * Refactor 2026-06-09 (#3 dynamic per-species ports): the gate no
 * longer wires its 4 × 5-species data channels (A_mole_fraction_<sp>,
 * B_mole_fraction_<sp>, A_delta_<sp>, B_delta_<sp>) nor the 4 scalar
 * pressure / temperature signals. Instead, it config-links DIRECTLY
 * to two Atmosphere nodes through `atmosphere_A_in` / `atmosphere_B_in`
 * (dashed cable, type "atmosphere") and reads / writes them at
 * runtime via the new AtmosphereLayer.getMassKg / getMoleFraction /
 * applyMassDelta / pressurePa methods. The species schema becomes
 * composition-driven (every species declared on either atmosphere's
 * bound Composition flows through the gate); there is no V1 hardcode
 * left in the gate.
 *
 * Modes:
 *   `closed`       no flux. Pure algebraic.
 *   `exchange`     a ventilation loop: the flow goes A → B with A's air
 *                  and B → A with B's air (no net air moves, each species
 *                  goes from the richer side to the poorer). The flow is
 *                  the `flow` signal when wired (a fan's), else
 *                  `forcedFlow`. Added 2026-09-25 with the `flow` input.
 *   `open_passive` linearised orifice: flux ∝ leakCoeff × area × |ΔP|.
 *                  The `bidirectional` flag turns it into a check-valve
 *                  when off (only A → B flux on positive ΔP).
 *   `hvac_forced`  fixed volumetric flow A → B; throughput is a
 *                  viewable accumulator updated on each fire() (no
 *                  solver-owned state vector anymore — the gate is no
 *                  longer IIntegrable, as the wired atmospheres own
 *                  the integrated state and the gate is a producer).
 *
 * Mass conservation is native: per species, the gate adds +flux × dt
 * to one atmosphere and -flux × dt to the other in the SAME fire()
 * call, so Σ mass invariants hold across both side reads.
 *
 * Numerical accuracy: the gate applies its deltas as a forward-Euler
 * step on each macro-tick (multiplied by `session.dt`) RATHER than
 * publishing rate-of-change channels for the solver to integrate.
 * That's intentional for V1: the gate is composition-driven so the
 * per-species channel paths are gone, and Euler with a 100 Hz tick
 * is plenty accurate for slow ECLSS dynamics. The IIntegrable variant
 * (with solver-side integration of gate deltas) is a V2 follow-up.
 */

import {
    Area,
    cloneable,
    editable,
    GAS_CONSTANT_R,
    IDeclaresPorts,
    IHasSampleRateRequirement,
    IntegrableRuntimeNode,
    IOlink,
    IPortDescriptor,
    ISession,
    inSlotOf,
    viewable,
    VolumetricFlow,
} from "spikypanda-core";
import type { IChannel, ICartesian, Nullable } from "spikypanda-core";

export type AtmosphereGateMode = "closed" | "open_passive" | "hvac_forced" | "exchange";

/** Config-link slot constants on the gate. */
export const GATE_IN_ATMOSPHERE_A = "atmosphere_A_in";
export const GATE_IN_ATMOSPHERE_B = "atmosphere_B_in";
/** Input: the volumetric flow [m³/s] of the `hvac_forced` and `exchange`
 *  modes when a signal is wired (a fan's delivered flow); the
 *  `forcedFlow` editable otherwise. */
export const GATE_IN_FLOW = "flow";
/** Output: signed volumetric flow in m³/s (positive when A → B). For
 *  visualisation / plotting; the gate publishes this each fire(). */
export const GATE_OUT_FLOW_RATE = "flow_rate";

/** Minimal structural shape the gate needs from a bound Atmosphere.
 *  Both AtmosphereLayer and AtmosphereNode satisfy this; tests may
 *  pass a stub of the same shape. Species lookup is by string ID; an
 *  atmosphere that does not carry a given species silently reports 0
 *  / no-ops on apply. */
export interface IAtmosphereGateHandle {
    readonly activeSpecies: ReadonlyArray<string>;
    readonly temperatureK: number;
    readonly pressurePa: number;
    readonly volume: number;
    getMassKg(speciesId: string): number;
    getMoleFraction(speciesId: string): number;
    applyMassDelta(speciesId: string, deltaKg: number): void;
}

export class AtmosphereGateNode extends IntegrableRuntimeNode implements IDeclaresPorts, IHasSampleRateRequirement {
    // ── Editables ─────────────────────────────────────────────────────

    /** P8 sample-rate: aligns with AtmosphereLayer at 100 Hz so an
     *  inner Sim.Graph holding both runs at a coherent K = inner/parent
     *  ratio. Parameter-independent (the gate's transient is dominated
     *  by ΔP / area / leak, all editables; we don't try to derive Hz
     *  from them in V1). */
    protected override computeRequiredHz(): number {
        return 100;
    }

    @cloneable private _mode: AtmosphereGateMode = "open_passive";
    /** Throat area [m²], used in open_passive. */
    @cloneable private _areaM2: number = 1.0;
    /** Linearised leak coefficient (dimensionless). Tuned per scenario;
     *  represents the orifice / leak path efficiency vs ideal area. */
    @cloneable private _leakCoeff: number = 1e-5;
    /** Forced volumetric flow A → B [m³/s], used in hvac_forced. */
    @cloneable private _forcedFlowM3ps: number = 0;
    /** Check-valve flag: when off (false), open_passive only flows
     *  A → B (positive ΔP); reverse ΔP gives zero flux. */
    @cloneable private _bidirectional: boolean = true;
    /** Accumulate cumulative volumetric throughput in hvac_forced
     *  mode. Surfaced as a @viewable for fan-aging dashboards; reset
     *  to 0 on session reset(). */
    @cloneable private _trackThroughput: boolean = false;

    // ── Runtime state (rebuilt each fire) ────────────────────────────

    /** Most recent signed volumetric flow [m³/s], positive A → B. */
    private _lastVolFlow: number = 0;
    /** Cumulative volume moved by the fan [m³]. Updated only when
     *  trackThroughput is true AND mode is hvac_forced. */
    private _throughputM3: number = 0;

    // ── Bound atmosphere references (set by session-builder) ────────

    private _atmosphereA: IAtmosphereGateHandle | null = null;
    private _atmosphereB: IAtmosphereGateHandle | null = null;

    // ── Ports ────────────────────────────────────────────────────────

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: GATE_IN_ATMOSPHERE_A, optional: true, type: "atmosphere" },
        { slot: GATE_IN_ATMOSPHERE_B, optional: true, type: "atmosphere" },
        { slot: GATE_IN_FLOW, optional: true, type: "float", kind: "signal" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: GATE_OUT_FLOW_RATE, optional: true, type: "float" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editable accessors ──────────────────────────────────────────

    @editable("string")
    public get mode(): AtmosphereGateMode {
        return this._mode;
    }
    public set mode(v: AtmosphereGateMode) {
        const next: AtmosphereGateMode = v === "closed" || v === "open_passive" || v === "hvac_forced" || v === "exchange" ? v : "open_passive";
        this.setField("mode", this._mode, next, (n) => {
            this._mode = n;
        });
    }

    @editable("number", { unit: { quantity: "Area", unit: "m2" } })
    public get area(): number {
        return this._areaM2;
    }
    public set area(v: number) {
        const next = v > 0 ? v : 1e-9;
        this.setField("area", this._areaM2, next, (n) => {
            this._areaM2 = n;
        });
    }
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
        const next = v >= 0 ? v : this._leakCoeff;
        this.setField("leakCoeff", this._leakCoeff, next, (n) => {
            this._leakCoeff = n;
        });
    }

    @editable("number", { unit: { quantity: "VolumetricFlow", unit: "m3ps" } })
    public get forcedFlow(): number {
        return this._forcedFlowM3ps;
    }
    public set forcedFlow(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("forcedFlow", this._forcedFlowM3ps, next, (n) => {
            this._forcedFlowM3ps = n;
        });
    }
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
    @viewable("boolean") public get isAtmosphereAWired(): boolean {
        return this._atmosphereA !== null;
    }
    @viewable("boolean") public get isAtmosphereBWired(): boolean {
        return this._atmosphereB !== null;
    }

    // ── Binding API (called by graph-session-builder) ───────────────

    /** Called when the user wires an atmosphere onto atmosphere_A_in.
     *  Passing null clears the binding (matches what happens when the
     *  user removes the wire on the canvas). */
    public bindAtmosphereA(_itemId: string, atmosphere: IAtmosphereGateHandle | null): void {
        this._atmosphereA = atmosphere;
    }

    public bindAtmosphereB(_itemId: string, atmosphere: IAtmosphereGateHandle | null): void {
        this._atmosphereB = atmosphere;
    }

    /** Session-builder calls this at the start of every sync pass to
     *  wipe stale bindings before re-applying current wirings. */
    public clearBindings(): void {
        this._atmosphereA = null;
        this._atmosphereB = null;
    }

    // ── Lifecycle ────────────────────────────────────────────────────

    public override reset(_session: ISession): void {
        this._throughputM3 = 0;
        this._lastVolFlow = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const A = this._atmosphereA;
        const B = this._atmosphereB;
        if (!A || !B) {
            // No coupled atmospheres → no flux this tick.
            this._lastVolFlow = 0;
            this._publishFlowRate(session, 0);
            return;
        }

        // ── 1. Compute the signed volumetric flow ────────────────
        let volFlow = 0; // ≥ 0; the sign is decided by `upwindIsA`
        let upwindIsA = true;

        if (this._mode === "closed") {
            this._lastVolFlow = 0;
            this._publishFlowRate(session, 0);
            return;
        }
        // The forced and exchange modes take their flow from the `flow`
        // signal when one is wired (a fan's delivered flow, so a fouled
        // filter or a slower fan shows here), from the editable otherwise.
        const drivenFlow = Math.max(0, this._readFlowInput(session) ?? this._forcedFlowM3ps);
        if (this._mode === "open_passive") {
            const dP = A.pressurePa - B.pressurePa;
            if (!this._bidirectional && dP <= 0) {
                this._lastVolFlow = 0;
                this._publishFlowRate(session, 0);
                return;
            }
            volFlow = this._leakCoeff * this._areaM2 * Math.abs(dP);
            upwindIsA = dP >= 0;
        } else if (this._mode === "hvac_forced" || this._mode === "exchange") {
            volFlow = drivenFlow;
            upwindIsA = true; // by convention hvac is always A → B
        }

        const signedVolFlow = upwindIsA ? volFlow : -volFlow;
        this._lastVolFlow = signedVolFlow;
        this._publishFlowRate(session, signedVolFlow);

        if (volFlow <= 0) return;

        // ── 2. dt: forward-Euler step length ──────────────────────
        const dt = session.dt;
        if (!Number.isFinite(dt) || dt <= 0) return;

        // ── 3. Per-species mass transfer ──────────────────────────
        // A loop (`exchange`) carries `volFlow` each way: the air of A
        // into B with A's composition, the air of B into A with B's. No
        // net air moves; each species goes from the richer side to the
        // poorer in proportion to the difference of its densities. The
        // other modes carry the flow one way, from the upwind side.
        // Both directions of a loop are computed from the state at the start of the tick, then applied: computing
        // the return from a side the outward parcel has already changed carries back more than the balance says.
        if (this._mode === "exchange") {
            const outward = this._parcel(A, B, volFlow, dt);
            const back = this._parcel(B, A, volFlow, dt);
            AtmosphereGateNode._apply(A, B, outward);
            AtmosphereGateNode._apply(B, A, back);
        } else if (upwindIsA) {
            AtmosphereGateNode._apply(A, B, this._parcel(A, B, volFlow, dt));
        } else {
            AtmosphereGateNode._apply(B, A, this._parcel(B, A, volFlow, dt));
        }

        // ── 4. Throughput accumulator (forced and exchange) ───────
        if ((this._mode === "hvac_forced" || this._mode === "exchange") && this._trackThroughput) {
            this._throughputM3 += volFlow * dt;
        }
    }

    /**
     * The parcel `volFlow` m³/s of the upwind side's air carries into the
     * downwind side over `dt` seconds, species by species, in kg:
     * V̇ × ρ_total_upwind × y_i, with ρ_total = P × M_avg / RT and
     * y_i = x_i × M_i / M_avg, so M_avg cancels and
     * flux_i = V̇ × P × x_i × M_i / RT. The species are the union of both
     * sides' (a species present on one side only still crosses; the other
     * side no-ops on a species it does not carry). Nothing is applied
     * here: the caller applies the parcel once every direction is known.
     */
    private _parcel(upwind: IAtmosphereGateHandle, downwind: IAtmosphereGateHandle, volFlow: number, dt: number): Array<[string, number]> {
        const parcel: Array<[string, number]> = [];
        const speciesUnion = AtmosphereGateNode._unionSpecies(upwind.activeSpecies, downwind.activeSpecies);
        const RT = GAS_CONSTANT_R * Math.max(1e-9, upwind.temperatureK);
        const inverseRT = 1 / RT;
        const upwindP = upwind.pressurePa;
        const upwindVol = upwind.volume;
        if (upwindVol <= 0) return parcel;
        for (const sp of speciesUnion) {
            const x = upwind.getMoleFraction(sp);
            if (x <= 0) continue;
            // The per-species molar mass, inferred from the upwind side's own
            // state (mass over moles) rather than from a catalogue: identical
            // to the catalogue's for an ideal gas.
            const upwindMass = upwind.getMassKg(sp);
            if (upwindMass <= 0) continue;
            const moles = x * (upwindP * upwindVol) * inverseRT;
            if (moles <= 0) continue;
            const M = upwindMass / moles;
            if (!Number.isFinite(M) || M <= 0) continue;
            parcel.push([sp, volFlow * upwindP * x * M * inverseRT * dt]);
        }
        return parcel;
    }

    /** Conservation is native: the same mass leaves one side and enters the other in the same call. */
    private static _apply(from: IAtmosphereGateHandle, to: IAtmosphereGateHandle, parcel: ReadonlyArray<[string, number]>): void {
        for (const [sp, deltaKg] of parcel) {
            from.applyMassDelta(sp, -deltaKg);
            to.applyMassDelta(sp, +deltaKg);
        }
    }

    /** The `flow` signal, when a channel is wired into it and carries a finite number; null otherwise. */
    private _readFlowInput(session: ISession): number | null {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled || inSlotOf(link) !== GATE_IN_FLOW) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            const value = session.readSignal(idx);
            if (typeof value === "number" && Number.isFinite(value)) return value;
        }
        return null;
    }

    // ── Internals ────────────────────────────────────────────────────

    private _publishFlowRate(session: ISession, signedFlow: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== GATE_OUT_FLOW_RATE || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, signedFlow);
        }
    }

    /** Union of two species lists preserving the order of the first.
     *  Returns species present on either side, deduplicated. */
    private static _unionSpecies(a: ReadonlyArray<string>, b: ReadonlyArray<string>): string[] {
        const out: string[] = [];
        const seen = new Set<string>();
        for (const sp of a) {
            if (!seen.has(sp)) {
                seen.add(sp);
                out.push(sp);
            }
        }
        for (const sp of b) {
            if (!seen.has(sp)) {
                seen.add(sp);
                out.push(sp);
            }
        }
        return out;
    }
}

/** Factory invoked by the Physics.Scene sub-plugin registration. */
export function createAtmosphereGateNode(): AtmosphereGateNode {
    return new AtmosphereGateNode();
}
