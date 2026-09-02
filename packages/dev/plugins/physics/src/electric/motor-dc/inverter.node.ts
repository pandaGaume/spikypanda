import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IntegrableRuntimeNode, IOlink, IPortDescriptor, ISession } from "spikypanda-core";
import type { ICartesian, Nullable, IHasSampleRateRequirement } from "spikypanda-core";

/**
 * DC H-Bridge PWM Inverter — the power-stage modulator that sits
 * between a control-law node (Current PI / Speed PI) and a DC motor.
 *
 * Models a real 4-MOSFET H-bridge driven by a triangle-carrier PWM
 * comparator. Produces the INSTANTANEOUS switched voltage at the
 * motor terminals — NOT the average. This is essential for realistic
 * MCSA: the output `armatureVoltage` contains the carrier at `f_pwm` plus its
 * harmonics, plus the intermodulation sidebands with whatever fault
 * frequencies the motor produces through backEmfConstant·ω back-EMF coupling.
 *
 * Two switching strategies (editable):
 *
 *   "bipolar": armatureVoltage = +dcBusVoltage or -dcBusVoltage selon le comparateur. Toujours en
 *     switching. Ripple courant maximal. 2-quadrant simple.
 *
 *   "unipolar": armatureVoltage = 0/+dcBusVoltage quand voltageCommand > 0, armatureVoltage = 0/-dcBusVoltage quand voltageCommand < 0.
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
        const hz = 20 * this._pwmFrequency;
        if (!Number.isFinite(hz) || hz <= 0) return 200_000;
        return Math.max(60, Math.min(1e7, hz));
    }

    // ── Editable parameters ───────────────────────────────────────────
    @cloneable private _dcBusVoltage: number = 12;
    @cloneable private _pwmFrequency: number = 10000;
    @cloneable private _modulationStrategy: "bipolar" | "unipolar" = "bipolar";
    @cloneable private _deadTime: number = 1e-6;

    // ── Internal state ────────────────────────────────────────────────
    @cloneable private _carrierPhase: number = 0; // [0, 1)
    @cloneable private _armatureVoltage: number = 0; // instantaneous output AFTER dead-time gate
    @cloneable private _duty: number = 0; // clamped voltageCommand / dcBusVoltage, for diagnostic
    @cloneable private _switchCount: number = 0; // cumulative since reset
    // Last value the COMPARATOR decided (before dead-time gating). We
    // detect commutation by watching this field, NOT _armatureVoltage — otherwise
    // the dead-time gate (which zeroes _armatureVoltage) re-triggers as a "switch"
    // every tick during the dead-time interval, blowing up the switch
    // count and locking armatureVoltage at 0.
    private _lastTarget: number = 0;
    private _lastSwitchT: number = -Infinity;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "voltageCommand", optional: true, type: "float", kind: "signal" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "armatureVoltage", optional: false, type: "float", kind: "signal" },
        { slot: "dutyCycle", optional: false, type: "float", kind: "signal" },
        { slot: "switching", optional: false, type: "boolean", kind: "signal" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ─────────────────────────────────────────────────────
    @editable("number", { unit: { quantity: "Voltage", unit: "volt" } })
    public get dcBusVoltage(): number {
        return this._dcBusVoltage;
    }
    public set dcBusVoltage(v: number) {
        const next = v > 0 ? v : 1;
        this.setField("dcBusVoltage", this._dcBusVoltage, next, (n) => {
            this._dcBusVoltage = n;
        });
    }

    @editable("number", { unit: { quantity: "Frequency", unit: "Hz" } })
    public get pwmFrequency(): number {
        return this._pwmFrequency;
    }
    public set pwmFrequency(v: number) {
        const next = v > 0 ? v : 1;
        if (
            this.setField("pwmFrequency", this._pwmFrequency, next, (n) => {
                this._pwmFrequency = n;
            })
        )
            this.notifyComputedRequiredHzMayHaveChanged();
    }

    @editable("string")
    public get modulationStrategy(): "bipolar" | "unipolar" {
        return this._modulationStrategy;
    }
    public set modulationStrategy(v: "bipolar" | "unipolar") {
        const next: "bipolar" | "unipolar" = v === "unipolar" ? "unipolar" : "bipolar";
        this.setField("modulationStrategy", this._modulationStrategy, next, (n: "bipolar" | "unipolar") => {
            this._modulationStrategy = n;
        });
    }

    @editable("number", { unit: { quantity: "Timespan", unit: "s" } })
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
    @viewable("number") public get armatureVoltage(): number {
        return this._armatureVoltage;
    }
    @viewable("number") public get dutyCycle(): number {
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
        this.setField("armatureVoltage", this._armatureVoltage, 0, (n) => {
            this._armatureVoltage = n;
        });
        this.setField("dutyCycle", this._duty, 0, (n) => {
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

        // Read voltageCommand via signal API. Unwired or never-published → 0.
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
        let newPhase = this._carrierPhase + dt * this._pwmFrequency;
        // Modulo 1, robust even for very long dt (defensive).
        newPhase = newPhase - Math.floor(newPhase);

        // Triangle in [-1, +1]: rises 0→0.5 (−1→+1), falls 0.5→1 (+1→−1).
        // |phase - 0.5| ranges [0, 0.5]. Map ×2 → [0, 1], ×−2+1 → [+1, −1].
        const carrier = 1 - 4 * Math.abs(newPhase - 0.5);
        const ref = Math.max(-1, Math.min(1, vCmd / this._dcBusVoltage));

        // Determine the requested switch state via the chosen modulation
        // modulationStrategy. Compare reference signal against the carrier.
        // `target` is what the comparator wants BEFORE dead-time gating.
        let target = 0;
        if (this._modulationStrategy === "bipolar") {
            // Classic 2-state: armatureVoltage = +dcBusVoltage when ref > carrier, else -dcBusVoltage.
            // Always switching, even at zero voltageCommand (ref=0 vs carrier
            // straddling 0 → 50% dutyCycle alternating).
            target = ref > carrier ? this._dcBusVoltage : -this._dcBusVoltage;
        } else {
            // Unipolar: armatureVoltage = +dcBusVoltage / 0 (forward), -dcBusVoltage / 0 (reverse).
            // Less ripple. Comparator uses |ref| against |carrier|;
            // sign chosen from sign(voltageCommand).
            const absCarrier = Math.abs(carrier);
            if (vCmd >= 0) {
                target = ref > absCarrier ? this._dcBusVoltage : 0;
            } else {
                target = -ref > absCarrier ? -this._dcBusVoltage : 0;
            }
        }

        // Detect a comparator commutation (target changed since last
        // tick). When that happens, snapshot the time for the dead-time
        // interval. Tracking on `target` (pre-gate) keeps the dead-time
        // self-contained: the gate zeros armatureVoltage during the interval, but the
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

        // switchCount counts changes of the ACTUAL armatureVoltage (after gating), so
        // it matches what an external observer (current sensor) sees.
        let switching = false;
        if (newV !== this._armatureVoltage) {
            switching = true;
            this._switchCount++;
        }

        // Commit state + publish outputs (all signals).
        this.setField("carrierPhase", this._carrierPhase, newPhase, (n) => {
            this._carrierPhase = n;
        });
        this.setField("armatureVoltage", this._armatureVoltage, newV, (n) => {
            this._armatureVoltage = n;
        });
        this.setField("dutyCycle", this._duty, ref, (n) => {
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
        broadcast("armatureVoltage", newV);
        broadcast("dutyCycle", ref);
        broadcast("switching", switching);
    }
}

export function createDcInverterNode(): DcInverterNode {
    return new DcInverterNode();
}
