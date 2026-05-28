import { ISimNode } from "../../../../interfaces/SimNode";
import { IPmsmHousingFaultHost } from "../faults/PmsmFaultContracts";

// Per-axis 2nd-order LTI configuration. Defaults yield a lightly damped
// bracket mode around 500 Hz on a 100 g effective mass, representative of
// a small motor mounted on an aluminum bracket.
//
// The user may either provide (mass, stiffness, damping) directly, or
// (mass, omegaN, zeta) which the constructor converts to k = m * omegaN^2,
// c = 2 * zeta * sqrt(m * k).
export interface IHousingAxisConfig {
    mass: number;
    stiffness?: number;
    damping?: number;
    omegaN?: number;
    zeta?: number;
}

export interface IHousingMechanicsConfig {
    x: IHousingAxisConfig;
    y: IHousingAxisConfig;
    z: IHousingAxisConfig;
}

interface IAxisState {
    m: number;
    k: number;
    c: number;
    pos: number;
    vel: number;
    accel: number;
    forceAccum: number;
}

// 3-axis housing mechanics, 2nd-order LTI per axis (no inter-axis
// coupling in Phase 2; Phase 3 may add a coupling matrix gravito-
// modulated for the "vibration mode coupling" mechanism described in the
// proposal section 1.2).
//
// Equations per axis :
//   m * x'' + c * x' + k * x = F_ext(t)
//
// Integration : implicit Euler on (pos, vel) joint.
//   v_new = (m*v + dt*(F - k*x)) / (m + dt*c + dt^2*k)
//   x_new = x + dt * v_new
//   a_new = (F - c*v_new - k*x_new) / m   (acceleration probed by ADXL355)
//
// Forces are accumulated via addForce(axis, F) (called by faults' postStep
// or by the orchestrator when a deterministic excitation is wired up) and
// consumed by advance(t). After advance, the per-axis force accumulator
// resets to 0.
export class HousingMechanics implements ISimNode, IPmsmHousingFaultHost {
    public readonly kind: string = "pmsm.env.housing";
    public readonly cfg: IHousingMechanicsConfig;

    private readonly _axes: [IAxisState, IAxisState, IAxisState];
    private _t: number = 0;
    private _started: boolean = false;
    private readonly _maxSubstep: number;

    public constructor(cfg: IHousingMechanicsConfig) {
        this.cfg = cfg;
        this._axes = [HousingMechanics._buildAxis(cfg.x), HousingMechanics._buildAxis(cfg.y), HousingMechanics._buildAxis(cfg.z)];
        // Substep capped at 1/(20 * highest natural frequency) so the
        // fastest mode resolves to ~20 substeps per period.
        const omegaNs = this._axes.map((a) => Math.sqrt(a.k / a.m));
        const omegaNMax = Math.max(...omegaNs);
        this._maxSubstep = Math.max(5e-6, 1 / (20 * omegaNMax));
    }

    public advance(t: number): void {
        if (!this._started) {
            this._t = t;
            this._started = true;
            return;
        }
        if (t < this._t) {
            // Time reversal : reset.
            for (const a of this._axes) {
                a.pos = 0;
                a.vel = 0;
                a.accel = 0;
                a.forceAccum = 0;
            }
            this._t = t;
            return;
        }
        while (this._t < t) {
            const dt = Math.min(this._maxSubstep, t - this._t);
            for (const a of this._axes) {
                const F = a.forceAccum;
                const denom = a.m + dt * a.c + dt * dt * a.k;
                const vNew = (a.m * a.vel + dt * F - dt * a.k * a.pos) / denom;
                const xNew = a.pos + dt * vNew;
                a.vel = vNew;
                a.pos = xNew;
                a.accel = (F - a.c * vNew - a.k * xNew) / a.m;
            }
            this._t += dt;
        }
        // Consume the per-cycle force accumulators.
        for (const a of this._axes) a.forceAccum = 0;
    }

    public reset(): void {
        for (const a of this._axes) {
            a.pos = 0;
            a.vel = 0;
            a.accel = 0;
            a.forceAccum = 0;
        }
        this._t = 0;
        this._started = false;
    }

    public addForce(axis: 0 | 1 | 2, force: number): void {
        this._axes[axis].forceAccum += force;
    }

    public position(axis: 0 | 1 | 2): number {
        return this._axes[axis].pos;
    }
    public velocity(axis: 0 | 1 | 2): number {
        return this._axes[axis].vel;
    }
    public acceleration(axis: 0 | 1 | 2): number {
        return this._axes[axis].accel;
    }

    private static _buildAxis(cfg: IHousingAxisConfig): IAxisState {
        if (cfg.mass <= 0) throw new Error("HousingMechanics: mass must be > 0");
        let k: number, c: number;
        if (cfg.stiffness !== undefined && cfg.damping !== undefined) {
            k = cfg.stiffness;
            c = cfg.damping;
        } else if (cfg.omegaN !== undefined && cfg.zeta !== undefined) {
            k = cfg.mass * cfg.omegaN * cfg.omegaN;
            c = 2 * cfg.zeta * Math.sqrt(cfg.mass * k);
        } else {
            throw new Error("HousingMechanics: provide (stiffness, damping) or (omegaN, zeta)");
        }
        return { m: cfg.mass, k, c, pos: 0, vel: 0, accel: 0, forceAccum: 0 };
    }
}

// Convenience preset : 100 g mass per axis, 500 Hz natural frequency,
// 2 % damping. Matches a typical small-motor housing on a bench fixture.
// Phase 3 will calibrate against bench measurements.
export function defaultHousingMechanicsConfig(): IHousingMechanicsConfig {
    const oneAxis: IHousingAxisConfig = {
        mass: 0.1,
        omegaN: 2 * Math.PI * 500,
        zeta: 0.02,
    };
    return { x: oneAxis, y: oneAxis, z: oneAxis };
}
