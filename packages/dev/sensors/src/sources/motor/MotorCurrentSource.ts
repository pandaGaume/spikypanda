import { Current } from "spikypanda-core";
import { TWO_PI } from "../../util/math";
import { IDataSource, IDataSourceMeta } from "../../interfaces/DataSource";

// One harmonic injected as an angular contribution: amplitude · sin(order · θ + phase).
//   order     : harmonic number relative to the mechanical fundamental
//   amplitude : peak amplitude in amperes
//   phase     : phase offset in radians (default 0)
export interface IMotorElectricalHarmonic {
    order: number;
    amplitude: number;
    phase?: number;
}

// Configuration of a healthy DC brushed motor with a PWM chopper drive at
// the input. The model is a coupled electromechanical state-space system
// integrated forward in time; nothing about frequencies is hardcoded, all
// spectral content emerges from the rotation θ(t) and the PWM switching.
//
// Electrical:        L·di/dt + R·i = V_pwm(t) - Ke_rad·ω
// Mechanical:        J·dω/dt + B·ω = Kt·i - τ_load
// Angular position:  dθ/dt = ω
// PWM voltage:       V_pwm(t) = V_supply if (t·f_PWM) mod 1 < D, else 0
//
// Conventions:
//   - Ke (backEmfConstant) is given in V per *rps* (revolutions per second).
//     The internal Ke_rad in V·s/rad is Ke / (2π). In SI, Kt (N·m/A) equals
//     Ke (V·s/rad) numerically; we default Kt to that unless overridden.
//   - motorSpeedRps is the *target / nominal* operating speed at full duty;
//     the default static load torque is calibrated such that this is the
//     steady-state speed at D=1. Raising / lowering D moves the equilibrium.
export interface IMotorCurrentConfig {
    supplyVoltage: number;        // V_supply (volts, DC bus)
    resistance: number;           // R (ohms, armature)
    inductance: number;           // L (henries, armature)
    backEmfConstant: number;      // Ke (V per rps)
    motorSpeedRps: number;        // nominal mechanical speed (rev / s) at D = 1
    commutatorBars: number;       // brush-commutator bar count, drives ripple
    brushCount?: number;          // number of brushes; 0 = brushless (default 2)
    nominalCurrent: number;       // I_nom (A), reference / metadata only

    // Driver
    pwmFrequencyHz?: number;      // PWM chopper frequency (default 10000)
    pwmDutyCycle?: number;        // duty cycle in [0, 1] (default 1.0)

    // Mechanical
    rotorInertia?: number;        // J (kg·m^2), default 5e-5
    viscousFriction?: number;     // B (N·m·s/rad), default auto-calibrated
    staticLoadTorque?: number;    // τ_load (N·m), default auto-calibrated
    torqueConstant?: number;      // Kt (N·m/A), default Ke / (2π)

    // Layering / decoration
    loadFactor?: number;          // legacy: multiplies the static load torque
    rippleFactor?: number;        // amplitude of brush-commutation ripple
    harmonics?: ReadonlyArray<IMotorElectricalHarmonic>;

    // Environment: gravity-induced shaft sag on a horizontal-axis motor.
    //
    // The rotor weight deflects the shaft by delta = rotorMass * g / bearingRadialStiffness
    // into the bearing clearance. As the rotor turns, the varying air-gap
    // modulates the reluctance at 1x fMech, modulating the back-EMF and
    // injecting a sinusoidal component into the armature current:
    //
    //   A_grav = (Ke_rad * omega * rotorMass * g) / (R * bearingRadialStiffness * airGap)
    //
    // This is NOT a fault: it is always present in a real horizontal-axis Earth
    // measurement and part of the healthy baseline. It disappears on a
    // vertical-axis motor or in microgravity.
    //
    // Preferred: supply all three physical parameters so the amplitude is
    // derived transparently from first principles. As a fallback (calibrated
    // measurement, or quick experimentation), gravitationalEccentricity can
    // be set directly; it is ignored when all three physical params are present.
    rotorMass?: number;                // kg, rotor + shaft assembly
    airGap?: number;                   // m, nominal magnetic air-gap length
    bearingRadialStiffness?: number;   // N/m, radial stiffness of the bearing pair
    gravitationalEccentricity?: number; // A peak, explicit override (see above)
}

interface IInternalState {
    i: number;       // armature current (A)
    omega: number;   // angular speed (rad/s)
    theta: number;   // angular position (rad)
    t: number;       // last evaluated time (s)
    started: boolean;
}

// State-space model of a healthy DC brushed motor with a PWM chopper.
//
// signal(t) integrates the coupled electromechanical equations from the
// last evaluated time to t, sub-stepping at a rate fast enough to resolve
// the PWM switching. The integrator is implicit Euler on each of the two
// linear ODEs, which is unconditionally stable for the L/R and J/B time
// constants and survives discontinuities in V_pwm cleanly.
//
// Frequencies in the time-domain spectrum are NOT named anywhere: they
// emerge naturally from the integrated θ(t) (mechanical / commutation
// content), from the PWM switching (driver content), and from the slow
// envelope of the mechanical dynamics (transient / step responses).
//
// Statefulness implications:
//   - signal(t) must be called with monotonically non-decreasing t, since
//     we integrate forward in time.
//   - Calling signal with a t earlier than the last one resets the state
//     to fresh start-up at t=0.
//   - Each new MotorCurrentSource instance starts at the mechanical equilibrium
//     for the configured duty cycle (not necessarily motorSpeedRps when D < 1).
export class MotorCurrentSource implements IDataSource {
    public readonly cfg: Required<Omit<IMotorCurrentConfig, "harmonics">> & { harmonics: ReadonlyArray<IMotorElectricalHarmonic> };
    private readonly _meta: IDataSourceMeta;
    private readonly _keRad: number;
    private readonly _kt: number;
    private readonly _state: IInternalState;
    // Substep size: fine enough to resolve the PWM switching at high
    // ratio. We aim for 10 substeps per PWM cycle, capped to a hard floor
    // so the cost stays bounded when fPWM is unrealistically high.
    private readonly _maxSubstep: number;

    public constructor(cfg: IMotorCurrentConfig) {
        const pwmFrequencyHz = cfg.pwmFrequencyHz ?? 10000;
        const pwmDutyCycle = clampDuty(cfg.pwmDutyCycle ?? 1.0);

        // Default mechanical params, with the static load torque calibrated
        // so that the configured motorSpeedRps is the equilibrium speed at
        // full duty (D=1). This preserves the legacy "I set the speed and
        // see the signal at that speed" behavior; lower D drops the speed.
        const keRad = cfg.backEmfConstant / TWO_PI;
        const kt = cfg.torqueConstant ?? keRad;
        const J = cfg.rotorInertia ?? 5e-5;
        const B = cfg.viscousFriction ?? 0;
        const omegaTarget = TWO_PI * cfg.motorSpeedRps;
        const VAtTarget = cfg.supplyVoltage; // assume D=1 calibration
        const Iaeq = (VAtTarget - keRad * omegaTarget) / cfg.resistance;
        // τ_load = Kt·I_eq - B·ω_eq
        const calibratedLoad = Math.max(0, kt * Iaeq - B * omegaTarget);
        const staticLoadTorque = (cfg.staticLoadTorque ?? calibratedLoad) * (cfg.loadFactor ?? 1.0);

        this.cfg = {
            supplyVoltage: cfg.supplyVoltage,
            resistance: cfg.resistance,
            inductance: cfg.inductance,
            backEmfConstant: cfg.backEmfConstant,
            motorSpeedRps: cfg.motorSpeedRps,
            commutatorBars: cfg.commutatorBars,
            brushCount: cfg.brushCount ?? 2,
            nominalCurrent: cfg.nominalCurrent,
            pwmFrequencyHz,
            pwmDutyCycle,
            rotorInertia: J,
            viscousFriction: B,
            staticLoadTorque,
            torqueConstant: kt,
            loadFactor: cfg.loadFactor ?? 1.0,
            rippleFactor: cfg.rippleFactor ?? 0.05,
            harmonics: cfg.harmonics ?? [],
            rotorMass: cfg.rotorMass ?? 0,
            airGap: cfg.airGap ?? 0,
            bearingRadialStiffness: cfg.bearingRadialStiffness ?? 0,
            // Derive gravity amplitude from physical params when all three are
            // supplied; fall back to explicit override; default to 0 (ideal).
            gravitationalEccentricity: computeGravEcc(cfg),
        };

        this._keRad = keRad;
        this._kt = kt;
        // Initialize at the true mechanical equilibrium for the configured duty
        // cycle, NOT at motorSpeedRps (which is the D=1 equilibrium).
        //
        // Torque balance:  Kt·I = τ_load + B·ω
        // Voltage balance: V·D  = R·I   + Ke_rad·ω
        //
        // Solving jointly:
        //   ω_eq = max(0, (V·D - R·τ_load/Kt) / (Ke_rad + R·B/Kt))
        //   I_eq = max(0, (V·D - Ke_rad·ω_eq) / R)
        //
        // When V·D < R·τ_load/Kt the load exceeds what the motor can sustain
        // and the motor stalls (ω=0). This is physically correct: a heavy load
        // requires a minimum duty cycle to spin at all.
        const { i: iInit, omega: omegaInit } = equilState(
            cfg.supplyVoltage, pwmDutyCycle, cfg.resistance, keRad, kt, staticLoadTorque, B);
        this._state = { i: iInit, omega: omegaInit, theta: 0, t: 0, started: true };
        // 10 substeps per PWM cycle, capped to 5 µs minimum step to bound cost.
        this._maxSubstep = Math.max(1.0 / (10 * pwmFrequencyHz), 5e-6);

        const fMech = cfg.motorSpeedRps;
        const fComm = cfg.commutatorBars * fMech;
        // f_PWM only contributes a spectral peak when the driver is
        // actively chopping (D strictly inside (0, 1)). At D=1 the chopper
        // is transparent and produces no PWM ripple in the current.
        const peaks = [fMech, fComm, 2 * fComm, 3 * fComm];
        if (pwmDutyCycle > 0 && pwmDutyCycle < 1) peaks.push(pwmFrequencyHz);
        this._meta = {
            kind: "motor.current",
            unit: Current.Units.amp,
            label: "DC motor stator current",
            fundamentalHz: fMech,
            expectedSpectralPeaks: peaks,
            sampleRateHint: Math.max(20 * fComm, 5000, 4 * pwmFrequencyHz),
        };
    }

    public meta(): IDataSourceMeta {
        return this._meta;
    }

    public get omega(): number {
        return this._state.omega;
    }

    // Integrated rotor mechanical angle at time t. Drives the angular
    // dependence of every fault source; under non-constant ω this differs
    // from the naive ω·t calculation.
    public theta(t: number): number {
        this._integrateUntil(t);
        return this._state.theta;
    }

    public steadyStateDc(): number {
        // Equilibrium current at the motor's nominal operating point with
        // D=1 (used by tests and by callers that need a quick reference).
        const omegaTarget = TWO_PI * this.cfg.motorSpeedRps;
        return Math.max(0, (this.cfg.supplyVoltage - this._keRad * omegaTarget) / this.cfg.resistance);
    }

    // Evaluate i(t). Stateful: integrates the coupled electromechanical
    // ODE system forward to t, then adds the angular brush-commutation
    // ripple and any user-supplied harmonics on the current rotor angle.
    public signal(t: number): number {
        this._integrateUntil(t);
        const theta = this._state.theta;
        let i = this._state.i;

        // Gravity-induced shaft sag: permanent 1x fMech component present in
        // any real Earth measurement, absent in microgravity or vertical-axis.
        i += this.cfg.gravitationalEccentricity * Math.sin(theta);

        // User-supplied electrical harmonics on the rotor angle.
        for (const h of this.cfg.harmonics) {
            i += h.amplitude * Math.sin(h.order * theta + (h.phase ?? 0));
        }

        // Brush-commutator ripple, scaled by the current operating-point.
        i += this.cfg.rippleFactor * this._state.i * this._commutationRipple(theta);

        return i;
    }

    private _integrateUntil(t: number): void {
        const s = this._state;
        if (t < s.t) {
            // Going backwards in time resets to the equilibrium for the
            // current duty cycle (same formula as constructor init).
            const { i, omega } = equilState(
                this.cfg.supplyVoltage, this.cfg.pwmDutyCycle,
                this.cfg.resistance, this._keRad, this._kt,
                this.cfg.staticLoadTorque, this.cfg.viscousFriction);
            s.i = i; s.omega = omega; s.theta = 0; s.t = 0;
        }
        const cfg = this.cfg;
        const Lstep = cfg.inductance;
        const Rstep = cfg.resistance;
        const J = cfg.rotorInertia;
        const B = cfg.viscousFriction;
        const tauLoad = cfg.staticLoadTorque;
        const Vsupply = cfg.supplyVoltage;
        const fPWM = cfg.pwmFrequencyHz;
        const D = cfg.pwmDutyCycle;
        const Kt = this._kt;
        const KeRad = this._keRad;

        while (s.t < t) {
            const dt = Math.min(this._maxSubstep, t - s.t);
            const tNext = s.t + dt;

            // PWM voltage at the end of the substep (use end-time so the
            // implicit Euler update is consistent).
            const cyclePos = (tNext * fPWM) % 1;
            const Vpwm = cyclePos < D ? Vsupply : 0;

            // Implicit Euler on the electrical equation:
            //   L·(i_new - i)/dt + R·i_new = Vpwm - KeRad·ω
            // (using ω_old here; mechanical dynamics are slow vs PWM)
            const iNew = (Lstep * s.i / dt + Vpwm - KeRad * s.omega) / (Lstep / dt + Rstep);
            // Implicit Euler on the mechanical equation:
            //   J·(ω_new - ω)/dt + B·ω_new = Kt·i_new - τ_load
            const omegaNew = Math.max(0, (J * s.omega / dt + Kt * iNew - tauLoad) / (J / dt + B));
            // Trapezoidal angle update so θ is consistent with ω evolution.
            const thetaNew = s.theta + 0.5 * (s.omega + omegaNew) * dt;

            s.i = Math.max(0, iNew);
            s.omega = omegaNew;
            s.theta = thetaNew;
            s.t = tNext;
        }
    }

    private _commutationRipple(theta: number): number {
        const phi = this.cfg.commutatorBars * theta;
        return Math.sin(phi)
            + 0.35 * Math.sin(2.0 * phi + Math.PI / 6.0)
            + 0.18 * Math.sin(3.0 * phi + Math.PI / 3.0);
    }
}

// Compute the mechanical equilibrium (i, omega) for a given duty cycle.
// Solves the coupled torque+voltage equations:
//   Kt·I  = τ_load + B·ω    (torque balance)
//   V·D   = R·I + Ke·ω      (voltage balance, average)
// → ω_eq = max(0, (V·D - R·τ/Kt) / (Ke + R·B/Kt))
// → I_eq = max(0, (V·D - Ke·ω_eq) / R)
// When V·D < R·τ/Kt the load stalls the motor (ω=0, I = V·D/R).
function equilState(V: number, D: number, R: number, Ke: number, Kt: number,
                    tauLoad: number, B: number): { i: number; omega: number } {
    const denom = Ke + (R * B) / Kt;
    const omega = denom > 0 ? Math.max(0, (V * D - R * tauLoad / Kt) / denom) : 0;
    const i = Math.max(0, (V * D - Ke * omega) / R);
    return { i, omega };
}

// Derive the peak gravity-induced current amplitude from physical motor params.
// Formula: A_grav = I_eq * delta / g0
//   where delta = rotorMass * g / bearingRadialStiffness  (static shaft sag)
//         I_eq  = (V - Ke_rad * omega) / R                (nominal armature current)
//
// Derivation: shaft sag shifts the rotor off-center by delta. As the rotor
// turns, the varying air-gap modulates the back-EMF at 1x fMech. For small
// eccentricity (delta << g0) the resulting current oscillation is
// approximately I_eq * (delta / g0).
//
// Returns the explicit gravitationalEccentricity override when the three
// physical params are not all provided, and 0 if nothing is set.
function computeGravEcc(cfg: IMotorCurrentConfig): number {
    if (cfg.rotorMass !== undefined && cfg.rotorMass > 0
        && cfg.airGap !== undefined && cfg.airGap > 0
        && cfg.bearingRadialStiffness !== undefined && cfg.bearingRadialStiffness > 0) {
        const keRad = cfg.backEmfConstant / TWO_PI;
        const omega = TWO_PI * cfg.motorSpeedRps;
        const Ieq = Math.max(0, (cfg.supplyVoltage - keRad * omega) / cfg.resistance);
        const delta = (cfg.rotorMass * 9.81) / cfg.bearingRadialStiffness;
        return Ieq * delta / cfg.airGap;
    }
    return cfg.gravitationalEccentricity ?? 0;
}

function clampDuty(d: number): number {
    if (!isFinite(d)) return 1.0;
    if (d < 0) return 0;
    if (d > 1) return 1;
    return d;
}
