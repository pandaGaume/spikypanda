import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Field-oriented control (FOC) for the PMSM machine. Faithful port of the
 * legacy `sensors` FocController, the validation oracle. Three nested PI
 * loops:
 *
 *   speed PI : tracks angularVelocity -> speedTarget, outputs i_q_ref (bounded +/- maxCurrent)
 *   id PI    : tracks directAxisCurrent -> id_ref (default 0, SPM), outputs v_d_ref
 *   iq PI    : tracks quadratureAxisCurrent -> i_q_ref, outputs v_q_ref
 *
 * Each PI is explicit-Euler with back-calculation anti-windup (gain
 * ki/kp). The (directAxisVoltage, quadratureAxisVoltage) reference vector is saturated jointly in the
 * alpha-beta plane at radius dcBusVoltage / sqrt(3), then projected to the
 * stator frame by inverse Park at the electrical angle electricalAngle = polePairs *
 * rotorAngle.
 *
 * Outputs both the stator voltage references (voltageAlpha / voltageBeta, what the
 * legacy FOC produces, for a downstream SVPWM + inverter) and the line-
 * neutral phase voltages (phaseVoltageA / phaseVoltageB / phaseVoltageC, inverse Clarke of the alpha-
 * beta refs: an IDEAL voltage drive that can feed the PMSM machine node
 * directly while SVPWM and the inverter are not yet wired). The command
 * input `speedTarget` is the controllable setpoint, driven for example
 * by a Viz.Control:knob.
 *
 * Decomposition C: this node is the controller only. The machine, the
 * (future) SVPWM modulator and inverter, and the load/fault sources are
 * separate nodes. Feedback (directAxisCurrent, quadratureAxisCurrent, angularVelocity, rotorAngle) is wired back from
 * the machine; the dynamic scheduler resolves the loop with a one-tick
 * delay (the standard discrete-control sampling lag).
 *
 * Defaults: FOC tuning for the Maxon ECX PRIME 16 armatureInductance.
 */
export class PmsmFocNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _speedProportionalGain: number = 0.0111;
    @cloneable private _speedIntegralGain: number = 4.87e-5;
    @cloneable private _currentProportionalGain: number = 0.104;
    @cloneable private _currentIntegralGain: number = 3173;
    @cloneable private _maxCurrent: number = 5;
    @cloneable private _maxVoltagePerAxis: number = 12;
    @cloneable private _dcBusVoltage: number = 24;
    @cloneable private _directAxisCurrentReference: number = 0;
    @cloneable private _polePairs: number = 2;
    @cloneable private _torqueMode: boolean = false;

    // PI integrator states.
    @cloneable private _intSpeed: number = 0;
    @cloneable private _intId: number = 0;
    @cloneable private _intIq: number = 0;

    @cloneable private _vAlpha: number = 0;
    @cloneable private _vBeta: number = 0;
    @cloneable private _va: number = 0;
    @cloneable private _vb: number = 0;
    @cloneable private _vc: number = 0;
    @cloneable private _vdRef: number = 0;
    @cloneable private _vqRef: number = 0;
    @cloneable private _iqRef: number = 0;
    @cloneable private _saturated: boolean = false;

    private _lastT: number = 0;
    private _started: boolean = false;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "directAxisCurrent", optional: true, type: "float" },
        { slot: "quadratureAxisCurrent", optional: true, type: "float" },
        { slot: "angularVelocity", optional: true, type: "float" },
        { slot: "rotorAngle", optional: true, type: "float" },
        { slot: "speedTarget", optional: true, type: "float" },
        { slot: "quadratureCurrentReference", optional: true, type: "float" },
        { slot: "dcBusVoltage", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "voltageAlpha", optional: false, type: "float" },
        { slot: "voltageBeta", optional: false, type: "float" },
        { slot: "phaseVoltageA", optional: false, type: "float" },
        { slot: "phaseVoltageB", optional: false, type: "float" },
        { slot: "phaseVoltageC", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number") public get speedProportionalGain(): number {
        return this._speedProportionalGain;
    }
    public set speedProportionalGain(v: number) {
        this.setField("speedProportionalGain", this._speedProportionalGain, v, (n) => (this._speedProportionalGain = n));
    }
    @editable("number") public get speedIntegralGain(): number {
        return this._speedIntegralGain;
    }
    public set speedIntegralGain(v: number) {
        this.setField("speedIntegralGain", this._speedIntegralGain, v, (n) => (this._speedIntegralGain = n));
    }
    @editable("number") public get currentProportionalGain(): number {
        return this._currentProportionalGain;
    }
    public set currentProportionalGain(v: number) {
        this.setField("currentProportionalGain", this._currentProportionalGain, v, (n) => (this._currentProportionalGain = n));
    }
    @editable("number") public get currentIntegralGain(): number {
        return this._currentIntegralGain;
    }
    public set currentIntegralGain(v: number) {
        this.setField("currentIntegralGain", this._currentIntegralGain, v, (n) => (this._currentIntegralGain = n));
    }
    @editable("number", { unit: "A" }) public get maxCurrent(): number {
        return this._maxCurrent;
    }
    public set maxCurrent(v: number) {
        this.setField("maxCurrent", this._maxCurrent, v, (n) => (this._maxCurrent = n));
    }
    @editable("number", { unit: "V" }) public get maxVoltagePerAxis(): number {
        return this._maxVoltagePerAxis;
    }
    public set maxVoltagePerAxis(v: number) {
        this.setField("maxVoltagePerAxis", this._maxVoltagePerAxis, v, (n) => (this._maxVoltagePerAxis = n));
    }
    @editable("number", { unit: "V" }) public get dcBusVoltage(): number {
        return this._dcBusVoltage;
    }
    public set dcBusVoltage(v: number) {
        this.setField("dcBusVoltage", this._dcBusVoltage, v, (n) => (this._dcBusVoltage = n));
    }
    @editable("number", { unit: "A" }) public get directAxisCurrentReference(): number {
        return this._directAxisCurrentReference;
    }
    public set directAxisCurrentReference(v: number) {
        this.setField("directAxisCurrentReference", this._directAxisCurrentReference, v, (n) => (this._directAxisCurrentReference = n));
    }
    @editable("number") public get polePairs(): number {
        return this._polePairs;
    }
    public set polePairs(v: number) {
        this.setField("polePairs", this._polePairs, v, (n) => (this._polePairs = n));
    }
    @editable("boolean") public get torqueMode(): boolean {
        return this._torqueMode;
    }
    public set torqueMode(v: boolean) {
        this.setField("torqueMode", this._torqueMode, v, (n) => (this._torqueMode = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get quadratureCurrentReference(): number {
        return this._iqRef;
    }
    @viewable("number") public get vd_ref(): number {
        return this._vdRef;
    }
    @viewable("number") public get vq_ref(): number {
        return this._vqRef;
    }
    @viewable("boolean") public get saturated_voltage(): boolean {
        return this._saturated;
    }
    @viewable("number") public get voltageAlpha(): number {
        return this._vAlpha;
    }
    @viewable("number") public get voltageBeta(): number {
        return this._vBeta;
    }
    @viewable("number") public get phaseVoltageA(): number {
        return this._va;
    }
    @viewable("number") public get phaseVoltageB(): number {
        return this._vb;
    }
    @viewable("number") public get phaseVoltageC(): number {
        return this._vc;
    }

    public override reset(_session: ISession): void {
        this._intSpeed = this._intId = this._intIq = 0;
        this._vAlpha = this._vBeta = this._va = this._vb = this._vc = 0;
        this._vdRef = this._vqRef = this._iqRef = 0;
        this._saturated = false;
        this._lastT = 0;
        this._started = false;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let iD = 0,
            iQ = 0,
            angularVelocity = 0,
            thetaM = 0,
            speedTarget = 0,
            iqCmd = 0,
            dcBusVoltage = this._dcBusVoltage,
            dtIn = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "directAxisCurrent") iD = value;
            else if (slot === "quadratureAxisCurrent") iQ = value;
            else if (slot === "angularVelocity") angularVelocity = value;
            else if (slot === "rotorAngle") thetaM = value;
            else if (slot === "speedTarget") speedTarget = value;
            else if (slot === "quadratureCurrentReference") iqCmd = value;
            else if (slot === "dcBusVoltage") dcBusVoltage = value;
            else if (slot === "dt") dtIn = value;
        }
        const dt = this._started ? (dtIn >= 0 ? dtIn : Math.max(0, t - this._lastT)) : 0;
        this._lastT = t;
        this._started = true;

        // Torque mode bypasses the speed PI: the q-loop setpoint is the
        // commanded i_q_ref (a torque command, since T_e ~ quadratureAxisCurrent), bounded
        // +/- maxCurrent. The diagram's "Desired Torque" path. The speed
        // integrator is held at zero so no windup builds while bypassed.
        // Speed mode: the speed PI tracks angularVelocity -> speedTarget and emits
        // i_q_ref (bounded +/- maxCurrent).
        if (this._torqueMode) {
            this._intSpeed = 0;
            this._iqRef = iqCmd < -this._maxCurrent ? -this._maxCurrent : iqCmd > this._maxCurrent ? this._maxCurrent : iqCmd;
        } else {
            const speedAw = this._speedProportionalGain > 0 && this._speedIntegralGain > 0 ? this._speedIntegralGain / this._speedProportionalGain : 0;
            const sp = this._pi(
                this._intSpeed,
                this._speedProportionalGain,
                this._speedIntegralGain,
                speedAw,
                -this._maxCurrent,
                this._maxCurrent,
                speedTarget,
                angularVelocity,
                dt
            );
            this._intSpeed = sp.integral;
            this._iqRef = sp.out;
        }

        // Current PIs.
        const curAw = this._currentProportionalGain > 0 && this._currentIntegralGain > 0 ? this._currentIntegralGain / this._currentProportionalGain : 0;
        const idLoop = this._pi(
            this._intId,
            this._currentProportionalGain,
            this._currentIntegralGain,
            curAw,
            -this._maxVoltagePerAxis,
            this._maxVoltagePerAxis,
            this._directAxisCurrentReference,
            iD,
            dt
        );
        this._intId = idLoop.integral;
        let vd = idLoop.out;
        const iqLoop = this._pi(
            this._intIq,
            this._currentProportionalGain,
            this._currentIntegralGain,
            curAw,
            -this._maxVoltagePerAxis,
            this._maxVoltagePerAxis,
            this._iqRef,
            iQ,
            dt
        );
        this._intIq = iqLoop.integral;
        let vq = iqLoop.out;

        // Joint voltage saturation in the alpha-beta plane.
        const vMagSq = vd * vd + vq * vq;
        const vMax = dcBusVoltage / Math.sqrt(3);
        if (vMagSq > vMax * vMax) {
            const scale = vMax / Math.sqrt(vMagSq);
            vd *= scale;
            vq *= scale;
            this._saturated = true;
        } else {
            this._saturated = false;
        }
        this._vdRef = vd;
        this._vqRef = vq;

        // Inverse Park (dq -> alpha-beta) at electricalAngle, then inverse Clarke
        // (alpha-beta -> abc) for the ideal-drive phase voltages.
        const thetaE = this._polePairs * thetaM;
        const cs = Math.cos(thetaE);
        const sn = Math.sin(thetaE);
        const alpha = vd * cs - vq * sn;
        const beta = vd * sn + vq * cs;
        this._vAlpha = alpha;
        this._vBeta = beta;
        const sqrt3Over2 = 0.5 * Math.sqrt(3);
        this._va = alpha;
        this._vb = -0.5 * alpha + sqrt3Over2 * beta;
        this._vc = -0.5 * alpha - sqrt3Over2 * beta;

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "voltageAlpha":
                    session.publish(idx, this._vAlpha);
                    break;
                case "voltageBeta":
                    session.publish(idx, this._vBeta);
                    break;
                case "phaseVoltageA":
                    session.publish(idx, this._va);
                    break;
                case "phaseVoltageB":
                    session.publish(idx, this._vb);
                    break;
                case "phaseVoltageC":
                    session.publish(idx, this._vc);
                    break;
            }
        }
    }

    // Explicit-Euler PI with back-calculation anti-windup. Identical to
    // the legacy PiController.update.
    private _pi(
        integral: number,
        kp: number,
        ki: number,
        aw: number,
        outMin: number,
        outMax: number,
        setpoint: number,
        meas: number,
        dt: number
    ): { out: number; integral: number } {
        const error = setpoint - meas;
        integral += ki * error * dt;
        const unsat = kp * error + integral;
        const out = unsat < outMin ? outMin : unsat > outMax ? outMax : unsat;
        if (aw > 0 && out !== unsat) {
            integral += aw * (out - unsat) * dt;
        }
        return { out, integral };
    }
}

export function createPmsmFocNode(): PmsmFocNode {
    return new PmsmFocNode();
}
