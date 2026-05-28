import { ISimNode } from "../../../../interfaces/SimNode";

// Configuration of a discrete-time PI controller with output saturation
// and back-calculation anti-windup.
//
//   kp           : proportional gain
//   ki           : integral gain (rad/s, applied as ki · dt per step)
//   outMin/Max   : output saturation bounds. The integrator is bounded so
//                  that the unsaturated output stays inside, and a
//                  back-calculation term bleeds the integrator when the
//                  saturated output diverges from the unsaturated one.
//   antiWindup   : back-calculation gain. 0 disables anti-windup. Default
//                  ki/kp (back-calc time constant equal to the integral
//                  time constant Ti = kp/ki, a common rule of thumb) when
//                  both kp and ki are positive, else 0.
export interface IPiControllerConfig {
    kp: number;
    ki: number;
    outMin: number;
    outMax: number;
    antiWindup?: number;
}

// Discrete-time PI with explicit Euler integration on the integral state
// and back-calculation anti-windup. Used by the FOC current loops (id, iq)
// and by the speed loop. Each instance owns its own integrator state, so
// id and iq controllers are independent.
//
// Time discipline: update(setpoint, measurement, t) is the externally
// driven entry point. It computes dt from the previous t and integrates
// the error in real time. advance(t) is provided to satisfy ISimNode but
// is a no-op: the controller has no autonomous dynamics, it only reacts to
// inputs. The orchestrator calls update(...) from the controller composite.
export class PiController implements ISimNode {
    public readonly kind: string = "control.pi";
    public readonly cfg: Required<IPiControllerConfig>;

    private _integral: number = 0;
    private _lastT: number = 0;
    private _started: boolean = false;
    private _lastOutput: number = 0;

    public constructor(cfg: IPiControllerConfig) {
        const aw = cfg.antiWindup ?? (cfg.kp > 0 && cfg.ki > 0 ? cfg.ki / cfg.kp : 0);
        this.cfg = {
            kp: cfg.kp,
            ki: cfg.ki,
            outMin: cfg.outMin,
            outMax: cfg.outMax,
            antiWindup: aw,
        };
    }

    // Compute the controller output for the current setpoint and feedback,
    // integrating the error since the last call. Returns the saturated
    // output. The caller is expected to wire this into the machine.
    public update(setpoint: number, measurement: number, t: number): number {
        const error = setpoint - measurement;
        const dt = this._started ? Math.max(0, t - this._lastT) : 0;

        // Integrate then compute the unsaturated output.
        this._integral += this.cfg.ki * error * dt;
        const unsat = this.cfg.kp * error + this._integral;

        // Saturate.
        const out = unsat < this.cfg.outMin ? this.cfg.outMin : unsat > this.cfg.outMax ? this.cfg.outMax : unsat;

        // Back-calculation anti-windup: when the output saturates, bleed
        // the integrator toward a value that would have produced the
        // saturated output. This avoids the integrator running away while
        // the actuator is pinned at its limit.
        if (this.cfg.antiWindup > 0 && out !== unsat) {
            this._integral += this.cfg.antiWindup * (out - unsat) * dt;
        }

        this._lastT = t;
        this._started = true;
        this._lastOutput = out;
        return out;
    }

    // ISimNode contract: no autonomous evolution, just clock bookkeeping.
    // The state advances inside update(), which is the externally driven
    // path. advance() exists so the controller fits the same orchestration
    // discipline as machines and modulators.
    public advance(t: number): void {
        if (!this._started) {
            this._lastT = t;
            this._started = true;
        } else {
            this._lastT = Math.max(this._lastT, t);
        }
    }

    public reset(): void {
        this._integral = 0;
        this._lastT = 0;
        this._started = false;
        this._lastOutput = 0;
    }

    public get integral(): number {
        return this._integral;
    }

    public get lastOutput(): number {
        return this._lastOutput;
    }
}
