import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Field-oriented control (FOC) for the PMSM machine. Faithful port of the
 * legacy `sensors` FocController, the validation oracle. Three nested PI
 * loops:
 *
 *   speed PI : tracks omega -> speed_target, outputs i_q_ref (bounded +/- iMax)
 *   id PI    : tracks i_d -> id_ref (default 0, SPM), outputs v_d_ref
 *   iq PI    : tracks i_q -> i_q_ref, outputs v_q_ref
 *
 * Each PI is explicit-Euler with back-calculation anti-windup (gain
 * ki/kp). The (v_d, v_q) reference vector is saturated jointly in the
 * alpha-beta plane at radius v_bus / sqrt(3), then projected to the
 * stator frame by inverse Park at the electrical angle theta_e = P *
 * theta_m.
 *
 * Outputs both the stator voltage references (V_alpha / V_beta, what the
 * legacy FOC produces, for a downstream SVPWM + inverter) and the line-
 * neutral phase voltages (V_a / V_b / V_c, inverse Clarke of the alpha-
 * beta refs: an IDEAL voltage drive that can feed the PMSM machine node
 * directly while SVPWM and the inverter are not yet wired). The command
 * input `speed_target` is the controllable setpoint, driven for example
 * by a Viz.Control:knob.
 *
 * Decomposition C: this node is the controller only. The machine, the
 * (future) SVPWM modulator and inverter, and the load/fault sources are
 * separate nodes. Feedback (i_d, i_q, omega, theta_m) is wired back from
 * the machine; the dynamic scheduler resolves the loop with a one-tick
 * delay (the standard discrete-control sampling lag).
 *
 * Defaults: FOC tuning for the Maxon ECX PRIME 16 L.
 */
export class PmsmFocNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _speedKp: number = 0.0111;
    @cloneable private _speedKi: number = 4.87e-5;
    @cloneable private _currentKp: number = 0.104;
    @cloneable private _currentKi: number = 3173;
    @cloneable private _iMax: number = 5;
    @cloneable private _vMaxPerAxis: number = 12;
    @cloneable private _vBus: number = 24;
    @cloneable private _idRef: number = 0;
    @cloneable private _P: number = 2;
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
        { slot: "i_d", optional: true, type: "float" },
        { slot: "i_q", optional: true, type: "float" },
        { slot: "omega", optional: true, type: "float" },
        { slot: "theta_m", optional: true, type: "float" },
        { slot: "speed_target", optional: true, type: "float" },
        { slot: "iq_ref", optional: true, type: "float" },
        { slot: "v_bus", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "V_alpha", optional: false, type: "float" },
        { slot: "V_beta", optional: false, type: "float" },
        { slot: "V_a", optional: false, type: "float" },
        { slot: "V_b", optional: false, type: "float" },
        { slot: "V_c", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number") public get speedKp(): number {
        return this._speedKp;
    }
    public set speedKp(v: number) {
        this.setField("speedKp", this._speedKp, v, (n) => (this._speedKp = n));
    }
    @editable("number") public get speedKi(): number {
        return this._speedKi;
    }
    public set speedKi(v: number) {
        this.setField("speedKi", this._speedKi, v, (n) => (this._speedKi = n));
    }
    @editable("number") public get currentKp(): number {
        return this._currentKp;
    }
    public set currentKp(v: number) {
        this.setField("currentKp", this._currentKp, v, (n) => (this._currentKp = n));
    }
    @editable("number") public get currentKi(): number {
        return this._currentKi;
    }
    public set currentKi(v: number) {
        this.setField("currentKi", this._currentKi, v, (n) => (this._currentKi = n));
    }
    @editable("number", { unit: "A" }) public get iMax(): number {
        return this._iMax;
    }
    public set iMax(v: number) {
        this.setField("iMax", this._iMax, v, (n) => (this._iMax = n));
    }
    @editable("number", { unit: "V" }) public get vMaxPerAxis(): number {
        return this._vMaxPerAxis;
    }
    public set vMaxPerAxis(v: number) {
        this.setField("vMaxPerAxis", this._vMaxPerAxis, v, (n) => (this._vMaxPerAxis = n));
    }
    @editable("number", { unit: "V" }) public get vBus(): number {
        return this._vBus;
    }
    public set vBus(v: number) {
        this.setField("vBus", this._vBus, v, (n) => (this._vBus = n));
    }
    @editable("number", { unit: "A" }) public get idRef(): number {
        return this._idRef;
    }
    public set idRef(v: number) {
        this.setField("idRef", this._idRef, v, (n) => (this._idRef = n));
    }
    @editable("number") public get P(): number {
        return this._P;
    }
    public set P(v: number) {
        this.setField("P", this._P, v, (n) => (this._P = n));
    }
    @editable("boolean") public get torqueMode(): boolean {
        return this._torqueMode;
    }
    public set torqueMode(v: boolean) {
        this.setField("torqueMode", this._torqueMode, v, (n) => (this._torqueMode = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get iq_ref(): number {
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
    @viewable("number") public get V_alpha(): number {
        return this._vAlpha;
    }
    @viewable("number") public get V_beta(): number {
        return this._vBeta;
    }
    @viewable("number") public get V_a(): number {
        return this._va;
    }
    @viewable("number") public get V_b(): number {
        return this._vb;
    }
    @viewable("number") public get V_c(): number {
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
            omega = 0,
            thetaM = 0,
            speedTarget = 0,
            iqCmd = 0,
            vBus = this._vBus,
            dtIn = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "i_d") iD = value;
            else if (slot === "i_q") iQ = value;
            else if (slot === "omega") omega = value;
            else if (slot === "theta_m") thetaM = value;
            else if (slot === "speed_target") speedTarget = value;
            else if (slot === "iq_ref") iqCmd = value;
            else if (slot === "v_bus") vBus = value;
            else if (slot === "dt") dtIn = value;
        }
        const dt = this._started ? (dtIn >= 0 ? dtIn : Math.max(0, t - this._lastT)) : 0;
        this._lastT = t;
        this._started = true;

        // Torque mode bypasses the speed PI: the q-loop setpoint is the
        // commanded i_q_ref (a torque command, since T_e ~ i_q), bounded
        // +/- iMax. The diagram's "Desired Torque" path. The speed
        // integrator is held at zero so no windup builds while bypassed.
        // Speed mode: the speed PI tracks omega -> speed_target and emits
        // i_q_ref (bounded +/- iMax).
        if (this._torqueMode) {
            this._intSpeed = 0;
            this._iqRef = iqCmd < -this._iMax ? -this._iMax : iqCmd > this._iMax ? this._iMax : iqCmd;
        } else {
            const speedAw = this._speedKp > 0 && this._speedKi > 0 ? this._speedKi / this._speedKp : 0;
            const sp = this._pi(this._intSpeed, this._speedKp, this._speedKi, speedAw, -this._iMax, this._iMax, speedTarget, omega, dt);
            this._intSpeed = sp.integral;
            this._iqRef = sp.out;
        }

        // Current PIs.
        const curAw = this._currentKp > 0 && this._currentKi > 0 ? this._currentKi / this._currentKp : 0;
        const idLoop = this._pi(this._intId, this._currentKp, this._currentKi, curAw, -this._vMaxPerAxis, this._vMaxPerAxis, this._idRef, iD, dt);
        this._intId = idLoop.integral;
        let vd = idLoop.out;
        const iqLoop = this._pi(this._intIq, this._currentKp, this._currentKi, curAw, -this._vMaxPerAxis, this._vMaxPerAxis, this._iqRef, iQ, dt);
        this._intIq = iqLoop.integral;
        let vq = iqLoop.out;

        // Joint voltage saturation in the alpha-beta plane.
        const vMagSq = vd * vd + vq * vq;
        const vMax = vBus / Math.sqrt(3);
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

        // Inverse Park (dq -> alpha-beta) at theta_e, then inverse Clarke
        // (alpha-beta -> abc) for the ideal-drive phase voltages.
        const thetaE = this._P * thetaM;
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
                case "V_alpha":
                    session.publish(idx, this._vAlpha);
                    break;
                case "V_beta":
                    session.publish(idx, this._vBeta);
                    break;
                case "V_a":
                    session.publish(idx, this._va);
                    break;
                case "V_b":
                    session.publish(idx, this._vb);
                    break;
                case "V_c":
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
