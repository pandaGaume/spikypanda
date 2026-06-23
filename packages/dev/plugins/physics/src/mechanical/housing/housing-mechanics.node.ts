import { cloneable, editable, viewable, Cartesian3, IChannel, IDeclaresPorts, IPortDescriptor, ISession, TransformNode, inSlotOf } from "spikypanda-core";
import type { IOlink, ICartesian, Nullable, IHasSampleRateRequirement } from "spikypanda-core";

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
 * The force on each axis is read from the `forceX/y/z` inputs and held
 * constant across the substeps of one fire (matching the legacy
 * per-advance force accumulator). Outputs `accelerationX/y/z` are the bracket
 * acceleration, the vibration channel of the gravity-signature study.
 *
 * Defaults: 100 g mass, 500 Hz, 2 % damping per axis, a small-motor
 * aluminum bracket. Wire `force_*` from a fault (imbalance), an
 * environment model (mounting compliance under gravity), or any force
 * source; leave unwired for a quiet bracket.
 */
export class HousingMechanicsNode extends TransformNode implements IDeclaresPorts, IHasSampleRateRequirement {
    // Per-axis modal parameters (x, y, z).
    @cloneable private _massX: number = 0.1;
    @cloneable private _massY: number = 0.1;
    @cloneable private _massZ: number = 0.1;
    @cloneable private _naturalFrequencyX: number = 500; // natural frequency [Hz]
    @cloneable private _naturalFrequencyY: number = 500;
    @cloneable private _naturalFrequencyZ: number = 500;
    @cloneable private _dampingRatioX: number = 0.02; // damping ratio
    @cloneable private _dampingRatioY: number = 0.02;
    @cloneable private _dampingRatioZ: number = 0.02;

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

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...TransformNode.TRANSFORM_INPUT_PORTS, // local, parentWorld (shared assembly placement)
        { slot: "forceX", optional: true, type: "float" },
        { slot: "forceY", optional: true, type: "float" },
        { slot: "forceZ", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...TransformNode.TRANSFORM_OUTPUT_PORTS, // world
        { slot: "accelerationX", optional: false, type: "float" },
        { slot: "accelerationY", optional: false, type: "float" },
        { slot: "accelerationZ", optional: false, type: "float" },
        // The same bracket acceleration as ONE vec3 (ICartesian3), for an IMU /
        // 3-axis sensor that consumes a single vector instead of three floats.
        { slot: "acceleration", optional: false, type: "vec3" },
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
    @editable("number", { unit: "Hz" }) public get naturalFrequencyX(): number {
        return this._naturalFrequencyX;
    }
    public set naturalFrequencyX(v: number) {
        this.setField("naturalFrequencyX", this._naturalFrequencyX, v, (n) => {
            this._naturalFrequencyX = n;
        });
        this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "Hz" }) public get naturalFrequencyY(): number {
        return this._naturalFrequencyY;
    }
    public set naturalFrequencyY(v: number) {
        this.setField("naturalFrequencyY", this._naturalFrequencyY, v, (n) => {
            this._naturalFrequencyY = n;
        });
        this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "Hz" }) public get naturalFrequencyZ(): number {
        return this._naturalFrequencyZ;
    }
    public set naturalFrequencyZ(v: number) {
        this.setField("naturalFrequencyZ", this._naturalFrequencyZ, v, (n) => {
            this._naturalFrequencyZ = n;
        });
        this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get dampingRatioX(): number {
        return this._dampingRatioX;
    }
    public set dampingRatioX(v: number) {
        this.setField("dampingRatioX", this._dampingRatioX, v, (n) => {
            this._dampingRatioX = n;
        });
    }
    @editable("number") public get dampingRatioY(): number {
        return this._dampingRatioY;
    }
    public set dampingRatioY(v: number) {
        this.setField("dampingRatioY", this._dampingRatioY, v, (n) => {
            this._dampingRatioY = n;
        });
    }
    @editable("number") public get dampingRatioZ(): number {
        return this._dampingRatioZ;
    }
    public set dampingRatioZ(v: number) {
        this.setField("dampingRatioZ", this._dampingRatioZ, v, (n) => {
            this._dampingRatioZ = n;
        });
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get accelerationX(): number {
        return this._accelX;
    }
    @viewable("number") public get accelerationY(): number {
        return this._accelY;
    }
    @viewable("number") public get accelerationZ(): number {
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
        const fnMax = Math.max(this._naturalFrequencyX, this._naturalFrequencyY, this._naturalFrequencyZ, 1);
        return 8 * fnMax;
    }

    @editable("number", { unit: "Hz" }) public get requiredSampleRateHz(): number {
        return this.requiredHz;
    }
    public set requiredSampleRateHz(v: number) {
        if (!Number.isFinite(v) || v <= 0) {
            if (this._requiredHzUserDefined || this._requiredHzValue !== 0) {
                const prev = this.requiredHz;
                this._requiredHzUserDefined = false;
                this._requiredHzValue = 0;
                this.notifyPropertyChanged("requiredSampleRateHz", prev, this.requiredHz);
            }
            return;
        }
        const prev = this.requiredHz;
        if (this._requiredHzValue !== v || !this._requiredHzUserDefined) {
            this._requiredHzValue = v;
            this._requiredHzUserDefined = true;
            this.notifyPropertyChanged("requiredSampleRateHz", prev, v);
        }
    }

    private _notifyRequiredHzMayHaveChanged(): void {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) return;
        this.notifyPropertyChanged("requiredSampleRateHz", null, this.requiredHz);
    }

    // ── Runtime ────────────────────────────────────────────────────────
    public override reset(session: ISession): void {
        super.reset(session); // world -> identity
        this._posX = this._posY = this._posZ = 0;
        this._velX = this._velY = this._velZ = 0;
        this.setField("accelerationX", this._accelX, 0, (n) => {
            this._accelX = n;
        });
        this.setField("accelerationY", this._accelY, 0, (n) => {
            this._accelY = n;
        });
        this.setField("accelerationZ", this._accelZ, 0, (n) => {
            this._accelZ = n;
        });
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        // TransformNode hop: consume local / parentWorld, set + publish world.
        super.fire(session, t);

        const links = session.graph.links as ReadonlyArray<IChannel>;
        let fx = 0,
            fy = 0,
            fz = 0,
            dtIn = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            if (TransformNode.isTransformInputSlot(String(slot))) continue; // consumed by super.fire
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "forceX") fx = value;
            else if (slot === "forceY") fy = value;
            else if (slot === "forceZ") fz = value;
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

        const ax = this._stepAxis(this._massX, this._naturalFrequencyX, this._dampingRatioX, this._posX, this._velX, fx, dt);
        this._posX = ax.pos;
        this._velX = ax.vel;
        const ay = this._stepAxis(this._massY, this._naturalFrequencyY, this._dampingRatioY, this._posY, this._velY, fy, dt);
        this._posY = ay.pos;
        this._velY = ay.vel;
        const az = this._stepAxis(this._massZ, this._naturalFrequencyZ, this._dampingRatioZ, this._posZ, this._velZ, fz, dt);
        this._posZ = az.pos;
        this._velZ = az.vel;

        this.setField("accelerationX", this._accelX, ax.accel, (n) => {
            this._accelX = n;
        });
        this.setField("accelerationY", this._accelY, ay.accel, (n) => {
            this._accelY = n;
        });
        this.setField("accelerationZ", this._accelZ, az.accel, (n) => {
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
            if (link.slot === "accelerationX") session.publish(idx, this._accelX);
            else if (link.slot === "accelerationY") session.publish(idx, this._accelY);
            else if (link.slot === "accelerationZ") session.publish(idx, this._accelZ);
            else if (link.slot === "acceleration") session.publish(idx, new Cartesian3(this._accelX, this._accelY, this._accelZ));
        }
    }
}

export function createHousingMechanicsNode(): HousingMechanicsNode {
    return new HousingMechanicsNode();
}
