import { IPmsmMachineConfig } from "../machine/PmsmMachineConfig";
import { IFocControllerConfig } from "../control/FocController";
import { ISvpwmConfig } from "../modulator/SvpwmModulator";
import { IThreePhaseInverterConfig } from "../inverter/ThreePhaseInverter";
import { IHousingMechanicsConfig, defaultHousingMechanicsConfig } from "../env/HousingMechanics";

// Calibrated preset for the Maxon ECX PRIME 16 L (16 mm diameter, Long variant).
// Note: the export name retains the legacy "6M_16L" identifier; the physical
// motor is the ECX PRIME 16 L (no ECX PRIME 6 M exists in the Maxon lineup).
//
// Electrical parameters from the official 24 V winding datasheet:
//   terminal resistance (phase-to-phase) : 1.01 ohm   -> R_phase = 0.505 ohm
//   terminal inductance (phase-to-phase) : 0.033 mH   -> L_phase = 16.5 uH
//   torque constant Kt                   : 12.9 mNm/A
//   back-EMF constant Ke                 : 12.9 mV.s/rad  (Ke = Kt in SI)
//   no-load speed constant Kn            : 740 RPM/V  -> w0 @ 24 V = 17 760 RPM = 296 RPS
//   pole pairs                           : 2  (4-pole rotor)
//   nominal current (continuous)         : 2 A
//   rotor inertia                        : 2.28 g.cm2 = 2.28e-7 kg.m2
//   motor weight                         : 66 g
//
// Derived quantities:
//   lambda_m = Kt / (1.5 * p) = 0.0129 / 3 = 4.30 mWb
//   tau_e    = L_phase / R_phase = 16.5 uH / 0.505 ohm = 32.7 us
//   tau_m    = J * R_terminal / Kt^2 = 2.28e-7 * 1.01 / 0.0129^2 = 1.38 ms
//
// Simulation test condition: 50 RPS = 3 000 RPM (19 % of no-load speed).
// The motor operates well within its capability at this operating point.
//
// Parameters awaiting Phase 3 bench calibration:
//   viscousFriction  : estimated from no-load current proxy (target ~7e-7 N.m.s/rad)
//   rotorMass        : 8 % of motor mass mid-estimate (range 5.3-9.9 g for 8-15 %)
//   airGap           : 0.5 mm nominal; measure on bench for ironless 16 mm variant
//   bearingStiffness : 100 kN/m; order-of-magnitude for a 16 mm precision bearing stack
export const MAXON_ECX_PRIME_6M_16L: IPmsmMachineConfig = Object.freeze({
    // Per-phase values: R_terminal / 2, L_terminal / 2 (Y-connected 3-phase, no mutual).
    resistance:       0.505,   // ohm  (1.01 ohm phase-to-phase / 2)
    inductanceD:      1.65e-5, // H    (0.033 mH phase-to-phase / 2)
    inductanceQ:      1.65e-5, // H    (ironless SPM: L_d = L_q)
    rotorFluxLinkage: 4.3e-3,  // Wb   (Kt / (1.5 * p) = 0.0129 / 3)
    polePairs:        2,        //      (4-pole rotor, confirmed on datasheet)
    rotorInertia:     2.28e-7, // kg.m2 (2.28 g.cm2 from datasheet)
    viscousFriction:  1e-6,    // N.m.s/rad (estimated; Phase 3 bench calibration)
    nominalSpeedRps:  296,     // RPS  no-load at 24 V (Kn * V / 60 = 740 * 24 / 60)
    nominalCurrentA:  2,       // A    continuous rated
});

// FOC tuning for the calibrated ECX PRIME 16 L parameters.
//   current loop bandwidth :  1 kHz  (< PWM/10 = 2 kHz; well below f_e = R/(2piL) = 4.87 kHz)
//   speed loop bandwidth   :  100 Hz (1/10 of current loop)
//   v_max per axis         :  V_bus / 2 (loose; joint saturation does the work)
//
// Resulting gains with calibrated parameters (auto-computed from machine config):
//   Kp_I = omega_bw_I * L_phase = 6283 * 16.5e-6 = 0.104
//   Ki_I = omega_bw_I * R_phase = 6283 * 0.505   = 3173
//   Kp_W = omega_bw_W * J / Kt  = 628  * 2.28e-7 / 0.0129 = 0.0111
//   Ki_W = omega_bw_W * B / Kt  = 628  * 1e-6    / 0.0129 = 4.87e-5
//
// iMax = 5 A gives startup transient headroom without exceeding bench protection.
export function focPresetForEcxPrime(vBus: number = 24, omegaTargetRps: number = 50): IFocControllerConfig {
    const m = MAXON_ECX_PRIME_6M_16L;
    const omegaBwI = 2 * Math.PI * 1000;
    const omegaBwW = 2 * Math.PI * 100;
    const kt = 1.5 * m.polePairs * m.rotorFluxLinkage;
    return {
        currentKp: omegaBwI * m.inductanceD,
        currentKi: omegaBwI * m.resistance,
        speedKp: (omegaBwW * m.rotorInertia) / kt,
        speedKi: (omegaBwW * m.viscousFriction) / kt,
        iMax: 5,
        vMaxPerAxis: vBus / 2,
        vBusForSat: vBus,
        idRef: 0,
    };
}

// SVPWM and inverter presets.
export function svpwmPresetForEcxPrime(): ISvpwmConfig {
    return { pwmFrequencyHz: 20_000 };
}

export function inverterPresetForEcxPrime(vBus: number = 24): IThreePhaseInverterConfig {
    return { vBus };
}

// Housing mechanics : default 100 g / 500 Hz / 2 % zeta per axis.
// Bench-grade fixture, will be refitted Phase 3.
export function housingPresetForEcxPrime(): IHousingMechanicsConfig {
    return defaultHousingMechanicsConfig();
}

// Environment-coupling physical defaults for the ECX PRIME 16 L (24 V).
// rotorMass and motorMass are from the datasheet or derived from it.
// bearingRadialStiffness, airGap, and umpRadialStiffness are order-of-magnitude
// estimates; Phase 3 bench calibration will refit them.
// Each parameter feeds one of the gravity-coupled env nodes
// (RotorSag, BearingPreload, MountingCompliance) via GravityVector.
export const MAXON_ECX_PRIME_ENV_DEFAULTS = Object.freeze({
    // Rotor-side (RotorSagModel, BearingPreloadModel).
    // rotorMass: 8-15 % of 66 g motor mass = 5.3-9.9 g; midpoint 7.6 g.
    rotorMass:              0.0076,  // kg  (midpoint estimate; Phase 3 bench measurement)
    bearingRadialStiffness: 1e5,     // N/m (100 kN/m; order-of-magnitude, 16 mm precision stack)
    airGap:                 5e-4,    // m   (0.5 mm nominal; ironless 16 mm BLDC typical)
    // Electromagnetic radial stiffness for the rotating UMP (N/m).
    // Estimated from nominal torque at 2 A, rotor radius ~5 mm, air gap 0.5 mm:
    //   T_nom ~ Kt * I_nom = 0.0129 * 2 = 25.8 mNm
    //   k_UMP ~ T_nom / (r * g) = 25.8e-3 / (5e-3 * 5e-4) = 10 320 N/m
    // Drives the 1x fMech peak in accel_y / accel_z.
    umpRadialStiffness:     1e4,     // N/m (Phase 3 bench calibration)
    // Bearing assembly (BearingPreloadModel).
    nominalAxialPreload:    5,       // N
    nominalRadialPreload:   5,       // N
    // Whole-motor mass on the bracket (MountingComplianceModel).
    motorMass:              0.066,   // kg  (66 g from datasheet)
});
