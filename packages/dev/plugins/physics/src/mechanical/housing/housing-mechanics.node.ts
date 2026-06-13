import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable, IHasSampleRateRequirement } from "spikypanda-core";

/**
 * Housing mechanics: three independent 2nd-order LTI structural modes
 * (one per body axis x, y, z), the bracket that turns motor/fault forces
 * into the acceleration an accelerometer reads. Ported from the legacy
 * `sensors` HousingMechanics with identical numerics.
 *
 * Per axis:
 *
 *     m * x'' + c * x' + k * x = F_ext(t)
 *
 * parametrized by mass m, natural frequency fn (Hz) and damping ratio
 * zeta, from which:
 *
 *     k = m * (2*pi*fn)^2          c = 2 * zeta * sqrt(m * k)
 *
 * Integration is implicit Euler on the joint (pos, vel), substepped so
 * the fastest mode resolves to ~20 substeps per period (numerically
 * stable at any session rate):
 *
 *     v_new = (m*v + h*F - h*k*x) / (m + h*c + h^2*k)
 *     x_new = x + h * v_new
 *     a_new = (F - c*v_new - k*x_new) / m       (the acceleration probed)
 *
 * The force on each axis is read from the `force_x/y/z` inputs and held
 * constant across the substeps of one fire (matching the legacy
 * per-advance force accumulator). Outputs `accel_x/y/z` are the bracket
 * acceleration, the vibration channel of the gravity-signature study.
 *
 * Defaults: 100 g mass, 500 Hz, 2 % damping per axis, a small-motor
 * aluminum bracket. Wire `force_*` from a fault (imbalance), an
 * environment model (mounting compliance under gravity), or any force
 * source; leave unwired for a quiet bracket.
 */
export class HousingMechanicsNode extends RuntimeNode implements IDeclaresPorts, IHasSampleRateRequirement {
    // Per-axis modal parameters (x, y, z).
    @cloneable private _massX: number = 0.1;
    @cloneable private _massY: number = 0.1;
    @cloneable private _massZ: number = 0.1;
    @cloneable private _fnX: number = 500; // natural frequency [Hz]
    @cloneable private _fnY: number = 500;
    @cloneable private _fnZ: number = 500;
    @cloneable private _zetaX: number = 0.02; // damping ratio
    @cloneable private _zetaY: number = 0.02;
    @cloneable private _zetaZ: number = 0.02;

    // Integration state per axis: [pos, vel, accel].
    @cloneable private _posX: number = 0;
    @cloneable private _posY: number = 0;
    @cloneable private _posZ: number = 0;
    @cloneable private _velX: number = 0;
    @cloneable private _velY: number = 0;
    @cloneable private _velZ: number = 0;
    @cloneable private _accelX: number = 0;
    @cloneable private _accelY: number = 0;
    @cloneable private _accelZ: number = 0;

    private _lastT: number = -1;

    // Sample-rate requirement (boilerplate mirror of the other physics nodes).
    @cloneable private _requiredHzValue: number = 0;
    @cloneable private _requiredHzUserDefined: boolean = false;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "force_x", optional: true, type: "float" },
        { slot: "force_y", optional: true, type: "float" },
        { slot: "force_z", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "accel_x", optional: false, type: "float" },
        { slot: "accel_y", optional: false, type: "float" },
        { slot: "accel_z", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number", { unit: "kg" }) public get massX(): number {
        return this._massX;
    }
    public set massX(v: number) {
        this.setField("massX", this._massX, v, (n) => {
            this._massX = n;
        });
        this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "kg" }) public get massY(): number {
        return this._massY;
    }
    public set massY(v: number) {
        this.setField("massY", this._massY, v, (n) => {
            this._massY = n;
        });
    }
    @editable("number", { unit: "kg" }) public get massZ(): number {
        return this._massZ;
    }
    public set massZ(v: number) {
        this.setField("massZ", this._massZ, v, (n) => {
            this._massZ = n;
        });
    }
    @editable("number", { unit: "Hz" }) public get fnX(): number {
        return this._fnX;
    }
    public set fnX(v: number) {
        this.setField("fnX", this._fnX, v, (n) => {
            this._fnX = n;
        });
        this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "Hz" }) public get fnY(): number {
        return this._fnY;
    }
    public set fnY(v: number) {
        this.setField("fnY", this._fnY, v, (n) => {
            this._fnY = n;
        });
        this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "Hz" }) public get fnZ(): number {
        return this._fnZ;
    }
    public set fnZ(v: number) {
        this.setField("fnZ", this._fnZ, v, (n) => {
            this._fnZ = n;
        });
        this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get zetaX(): number {
        return this._zetaX;
    }
    public set zetaX(v: number) {
        this.setField("zetaX", this._zetaX, v, (n) => {
            this._zetaX = n;
        });
    }
    @editable("number") public get zetaY(): number {
        return this._zetaY;
    }
    public set zetaY(v: number) {
        this.setField("zetaY", this._zetaY, v, (n) => {
            this._zetaY = n;
        });
    }
    @editable("number") public get zetaZ(): number {
        return this._zetaZ;
    }
    public set zetaZ(v: number) {
        this.setField("zetaZ", this._zetaZ, v, (n) => {
            this._zetaZ = n;
        });
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get accel_x(): number {
        return this._accelX;
    }
    @viewable("number") public get accel_y(): number {
        return this._accelY;
    }
    @viewable("number") public get accel_z(): number {
        return this._accelZ;
    }

    // ── Sample-rate requirement ────────────────────────────────────────
    // The structural modes must be resolved at the node output: the
    // proposal samples vibration at ~8x the bracket mode (4 kHz for a
    // 500 Hz mode). The internal substepping keeps the integration
    // accurate at any rate; this only governs the editor's derived
    // simRate so the published accel is not aliased.
    public get requiredHz(): number {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) {
            return this._requiredHzValue;
        }
        return this.computeRequiredHz();
    }

    public computeRequiredHz(): number {
        const fnMax = Math.max(this._fnX, this._fnY, this._fnZ, 1);
        return 8 * fnMax;
    }

    @editable("number", { unit: "Hz" }) public get required_hz(): number {
        return this.requiredHz;
    }
    public set required_hz(v: number) {
        if (!Number.isFinite(v) || v <= 0) {
            if (this._requiredHzUserDefined || this._requiredHzValue !== 0) {
                const prev = this.requiredHz;
                this._requiredHzUserDefined = false;
                this._requiredHzValue = 0;
                this.notifyPropertyChanged("required_hz", prev, this.requiredHz);
            }
            return;
        }
        const prev = this.requiredHz;
        if (this._requiredHzValue !== v || !this._requiredHzUserDefined) {
            this._requiredHzValue = v;
            this._requiredHzUserDefined = true;
            this.notifyPropertyChanged("required_hz", prev, v);
        }
    }

    private _notifyRequiredHzMayHaveChanged(): void {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) return;
        this.notifyPropertyChanged("required_hz", null, this.requiredHz);
    }

    // ── Runtime ────────────────────────────────────────────────────────
    public override reset(_session: ISession): void {
        this._posX = this._posY = this._posZ = 0;
        this._velX = this._velY = this._velZ = 0;
        this.setField("accel_x", this._accelX, 0, (n) => {
            this._accelX = n;
        });
        this.setField("accel_y", this._accelY, 0, (n) => {
            this._accelY = n;
        });
        this.setField("accel_z", this._accelZ, 0, (n) => {
            this._accelZ = n;
        });
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let fx = 0,
            fy = 0,
            fz = 0,
            dtIn = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "force_x") fx = value;
            else if (slot === "force_y") fy = value;
            else if (slot === "force_z") fz = value;
            else if (slot === "dt") dtIn = value;
        }

        // First fire establishes the clock without integrating (mirrors
        // the legacy advance(t) first-call contract).
        if (this._lastT < 0 && dtIn < 0) {
            this._lastT = t;
            this._publish(session, links);
            return;
        }
        const dt = dtIn >= 0 ? dtIn : Math.max(0, t - this._lastT);
        this._lastT = t;

        const ax = this._stepAxis(this._massX, this._fnX, this._zetaX, this._posX, this._velX, fx, dt);
        this._posX = ax.pos;
        this._velX = ax.vel;
        const ay = this._stepAxis(this._massY, this._fnY, this._zetaY, this._posY, this._velY, fy, dt);
        this._posY = ay.pos;
        this._velY = ay.vel;
        const az = this._stepAxis(this._massZ, this._fnZ, this._zetaZ, this._posZ, this._velZ, fz, dt);
        this._posZ = az.pos;
        this._velZ = az.vel;

        this.setField("accel_x", this._accelX, ax.accel, (n) => {
            this._accelX = n;
        });
        this.setField("accel_y", this._accelY, ay.accel, (n) => {
            this._accelY = n;
        });
        this.setField("accel_z", this._accelZ, az.accel, (n) => {
            this._accelZ = n;
        });
        this._publish(session, links);
    }

    // Implicit Euler on one axis, substepped to ~20 substeps of the
    // fastest mode period. Force F is held constant across substeps.
    // Numerically identical to the legacy HousingMechanics.
    private _stepAxis(m: number, fnHz: number, zeta: number, pos0: number, vel0: number, F: number, dt: number): { pos: number; vel: number; accel: number } {
        const omegaN = 2 * Math.PI * fnHz;
        const k = m * omegaN * omegaN;
        const c = 2 * zeta * Math.sqrt(m * k);
        const maxSubstep = Math.max(5e-6, 1 / (20 * Math.max(omegaN, 1e-9)));
        let pos = pos0,
            vel = vel0,
            accel = (F - c * vel0 - k * pos0) / m;
        let elapsed = 0;
        while (elapsed < dt) {
            const h = Math.min(maxSubstep, dt - elapsed);
            const denom = m + h * c + h * h * k;
            const vNew = (m * vel + h * F - h * k * pos) / denom;
            const xNew = pos + h * vNew;
            vel = vNew;
            pos = xNew;
            accel = (F - c * vNew - k * xNew) / m;
            elapsed += h;
        }
        return { pos, vel, accel };
    }

    private _publish(session: ISession, links: ReadonlyArray<IChannel>): void {
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "accel_x") session.publish(idx, this._accelX);
            else if (link.slot === "accel_y") session.publish(idx, this._accelY);
            else if (link.slot === "accel_z") session.publish(idx, this._accelZ);
        }
    }
}

export function createHousingMechanicsNode(): HousingMechanicsNode {
    return new HousingMechanicsNode();
}
