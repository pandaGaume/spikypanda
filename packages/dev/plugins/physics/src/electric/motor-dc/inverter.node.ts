import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IntegrableRuntimeNode, IOlink, IPortDescriptor, ISession } from "spikypanda-core";
import type { ICartesian, Nullable, IHasSampleRateRequirement } from "spikypanda-core";

/**
 * DC H-Bridge PWM Inverter — the power-stage modulator that sits
 * between a control-law node (Current PI / Speed PI) and a DC motor.
 *
 * Models a real 4-MOSFET H-bridge driven by a triangle-carrier PWM
 * comparator. Produces the INSTANTANEOUS switched voltage at the
 * motor terminals — NOT the average. This is essential for realistic
 * MCSA: the output `V` contains the carrier at `f_pwm` plus its
 * harmonics, plus the intermodulation sidebands with whatever fault
 * frequencies the motor produces through Ke·ω back-EMF coupling.
 *
 * Two switching strategies (editable):
 *
 *   "bipolar": V = +Vdc or -Vdc selon le comparateur. Toujours en
 *     switching. Ripple courant maximal. 2-quadrant simple.
 *
 *   "unipolar": V = 0/+Vdc quand V_cmd > 0, V = 0/-Vdc quand V_cmd < 0.
 *     dV/dt moitié, ripple réduit, plus utilisé en VFD industriel.
 *
 * Dead time (editable, default 1 µs): pendant la transition
 * MOSFET-haut↔MOSFET-bas, les deux switches sont OFF pour éviter le
 * shoot-through. La tension de sortie pendant le dead time est 0
 * (free-wheeling diodes carry the current in real HW; we approximate
 * by 0V at the terminal). Source des "dead-time harmonics" qu'on voit
 * en MCSA réel.
 *
 * Sim rate requirement: pour bien résoudre le carrier à f_pwm, le
 * scheduler doit fire à au moins 20× f_pwm. Ex: f_pwm = 10 kHz →
 * simRate ≥ 200 kHz. Le solver RK4 attaché au moteur en aval
 * shrinkera sa step adaptive de lui-même autour des transitions.
 */
export class DcInverterNode extends IntegrableRuntimeNode implements IDeclaresPorts, IHasSampleRateRequirement {
    /** PWM sample-rate requirement: 20 × f_PWM, per the docstring rule.
     *  Clamped to [60, 1e7] for sanity. */
    protected override computeRequiredHz(): number {
        const hz = 20 * this._fPwm;
        if (!Number.isFinite(hz) || hz <= 0) return 200_000;
        return Math.max(60, Math.min(1e7, hz));
    }

    // ── Editable parameters ───────────────────────────────────────────
    @cloneable private _Vdc: number = 12;
    @cloneable private _fPwm: number = 10000;
    @cloneable private _strategy: "bipolar" | "unipolar" = "bipolar";
    @cloneable private _deadTime: number = 1e-6;

    // ── Internal state ────────────────────────────────────────────────
    @cloneable private _carrierPhase: number = 0; // [0, 1)
    @cloneable private _V: number = 0; // instantaneous output AFTER dead-time gate
    @cloneable private _duty: number = 0; // clamped V_cmd / Vdc, for diagnostic
    @cloneable private _switchCount: number = 0; // cumulative since reset
    // Last value the COMPARATOR decided (before dead-time gating). We
    // detect commutation by watching this field, NOT _V — otherwise
    // the dead-time gate (which zeroes _V) re-triggers as a "switch"
    // every tick during the dead-time interval, blowing up the switch
    // count and locking V at 0.
    private _lastTarget: number = 0;
    private _lastSwitchT: number = -Infinity;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "V_cmd", optional: true, type: "float", kind: "signal" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "V", optional: false, type: "float", kind: "signal" },
        { slot: "duty", optional: false, type: "float", kind: "signal" },
        { slot: "switching", optional: false, type: "boolean", kind: "signal" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ─────────────────────────────────────────────────────
    @editable("number", { unit: "V" })
    public get Vdc(): number {
        return this._Vdc;
    }
    public set Vdc(v: number) {
        const next = v > 0 ? v : 1;
        this.setField("Vdc", this._Vdc, next, (n) => {
            this._Vdc = n;
        });
    }

    @editable("number", { unit: "Hz" })
    public get fPwm(): number {
        return this._fPwm;
    }
    public set fPwm(v: number) {
        const next = v > 0 ? v : 1;
        if (this.setField("fPwm", this._fPwm, next, (n) => {
            this._fPwm = n;
        })) this.notifyComputedRequiredHzMayHaveChanged();
    }

    @editable("string")
    public get strategy(): "bipolar" | "unipolar" {
        return this._strategy;
    }
    public set strategy(v: "bipolar" | "unipolar") {
        const next: "bipolar" | "unipolar" = v === "unipolar" ? "unipolar" : "bipolar";
        this.setField("strategy", this._strategy, next, (n: "bipolar" | "unipolar") => {
            this._strategy = n;
        });
    }

    @editable("number", { unit: "s" })
    public get deadTime(): number {
        return this._deadTime;
    }
    public set deadTime(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("deadTime", this._deadTime, next, (n) => {
            this._deadTime = n;
        });
    }

    // ── Viewables (diagnostics) ───────────────────────────────────────
    @viewable("number") public get V(): number {
        return this._V;
    }
    @viewable("number") public get duty(): number {
        return this._duty;
    }
    @viewable("number") public get carrierPhase(): number {
        return this._carrierPhase;
    }
    @viewable("number") public get switchCount(): number {
        return this._switchCount;
    }

    public override reset(_session: ISession): void {
        this.setField("carrierPhase", this._carrierPhase, 0, (n) => {
            this._carrierPhase = n;
        });
        this.setField("V", this._V, 0, (n) => {
            this._V = n;
        });
        this.setField("duty", this._duty, 0, (n) => {
            this._duty = n;
        });
        this.setField("switchCount", this._switchCount, 0, (n) => {
            this._switchCount = n;
        });
        this._lastSwitchT = -Infinity;
        this._lastTarget = 0;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Read V_cmd via signal API. Unwired or never-published → 0.
        let vCmd = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            const value = session.readSignal(idx);
            if (typeof value === "number") {
                vCmd = value;
                break;
            }
        }

        // Advance the triangle carrier by dt * f_pwm, wrap mod 1.
        // session.dt is the elapsed sim time since the previous run;
        // before the first run it's Infinity (clamp to 0 so the
        // carrier doesn't jump a huge amount on tick 1).
        const dt = Number.isFinite(session.dt) ? Math.max(0, session.dt) : 0;
        let newPhase = this._carrierPhase + dt * this._fPwm;
        // Modulo 1, robust even for very long dt (defensive).
        newPhase = newPhase - Math.floor(newPhase);

        // Triangle in [-1, +1]: rises 0→0.5 (−1→+1), falls 0.5→1 (+1→−1).
        // |phase - 0.5| ranges [0, 0.5]. Map ×2 → [0, 1], ×−2+1 → [+1, −1].
        const carrier = 1 - 4 * Math.abs(newPhase - 0.5);
        const ref = Math.max(-1, Math.min(1, vCmd / this._Vdc));

        // Determine the requested switch state via the chosen modulation
        // strategy. Compare reference signal against the carrier.
        // `target` is what the comparator wants BEFORE dead-time gating.
        let target = 0;
        if (this._strategy === "bipolar") {
            // Classic 2-state: V = +Vdc when ref > carrier, else -Vdc.
            // Always switching, even at zero V_cmd (ref=0 vs carrier
            // straddling 0 → 50% duty alternating).
            target = ref > carrier ? this._Vdc : -this._Vdc;
        } else {
            // Unipolar: V = +Vdc / 0 (forward), -Vdc / 0 (reverse).
            // Less ripple. Comparator uses |ref| against |carrier|;
            // sign chosen from sign(V_cmd).
            const absCarrier = Math.abs(carrier);
            if (vCmd >= 0) {
                target = ref > absCarrier ? this._Vdc : 0;
            } else {
                target = -ref > absCarrier ? -this._Vdc : 0;
            }
        }

        // Detect a comparator commutation (target changed since last
        // tick). When that happens, snapshot the time for the dead-time
        // interval. Tracking on `target` (pre-gate) keeps the dead-time
        // self-contained: the gate zeros V during the interval, but the
        // gate never falsely re-triggers itself.
        if (target !== this._lastTarget) {
            this._lastSwitchT = t;
            this._lastTarget = target;
        }

        // Dead-time gate: during the interval after a comparator switch,
        // both upper-and-lower MOSFETs are off → terminal voltage is 0.
        // Models the MOSFET cross-conduction-prevention interval.
        // Source of the "dead-time distortion" harmonics seen in real
        // drives (5th, 7th, 11th harmonics around the fundamental).
        let newV = target;
        if (t - this._lastSwitchT < this._deadTime) {
            newV = 0;
        }

        // switchCount counts changes of the ACTUAL V (after gating), so
        // it matches what an external observer (current sensor) sees.
        let switching = false;
        if (newV !== this._V) {
            switching = true;
            this._switchCount++;
        }

        // Commit state + publish outputs (all signals).
        this.setField("carrierPhase", this._carrierPhase, newPhase, (n) => {
            this._carrierPhase = n;
        });
        this.setField("V", this._V, newV, (n) => {
            this._V = n;
        });
        this.setField("duty", this._duty, ref, (n) => {
            this._duty = n;
        });

        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("V", newV);
        broadcast("duty", ref);
        broadcast("switching", switching);
    }
}

export function createDcInverterNode(): DcInverterNode {
    return new DcInverterNode();
}
