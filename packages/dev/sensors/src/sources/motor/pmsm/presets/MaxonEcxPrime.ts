import { IPmsmMachineConfig } from "../machine/PmsmMachineConfig";
import { IFocControllerConfig } from "../control/FocController";
import { ISvpwmConfig } from "../modulator/SvpwmModulator";
import { IThreePhaseInverterConfig } from "../inverter/ThreePhaseInverter";
import { IHousingMechanicsConfig, defaultHousingMechanicsConfig } from "../env/HousingMechanics";

// Preset for the Maxon ECX PRIME 6 M / 16 L PMSM, the proposal's primary
// reference for "small aerospace actuator". Values are illustrative
// Phase 1 placeholders within the right order of magnitude for a small
// 24 V slotted PMSM; final calibration (Phase 3) will refit against the
// official datasheet and bench measurements.
//
// Quick reference :
//   nominal voltage     : 24 V DC bus
//   nominal speed       : 3000 RPM = 50 rps
//   nominal current     : 2 A
//   pole pairs          : 1
//   phase resistance    : 2.0 ohm
//   phase inductance    : 0.3 mH (SPM, L_d = L_q)
//   torque constant Kt  : ~3 mNm / A  (Kt = (3/2) * p * lambda_m)
//                          -> lambda_m ~ 2 mWb
//   rotor inertia       : 1e-6 kg.m^2
//   viscous damping     : 1e-7 N.m.s/rad
export const MAXON_ECX_PRIME_6M_16L: IPmsmMachineConfig = Object.freeze({
    resistance: 2.0,
    inductanceD: 3e-4,
    inductanceQ: 3e-4,
    rotorFluxLinkage: 2e-3,
    polePairs: 1,
    rotorInertia: 1e-6,
    viscousFriction: 1e-7,
    nominalSpeedRps: 50,
    nominalCurrentA: 2,
});

// FOC tuning aligned with the bench machine.
//   current loop bandwidth :  1 kHz (10 x electrical L/R cutoff)
//   speed loop bandwidth   :  100 Hz (1/10 of current loop)
//   v_max per axis         :  V_bus / 2 (loose; joint saturation does the work)
//
// Designed for a 24 V bus, 2 A rated. iMax = 5 A leaves headroom for the
// startup transient without exceeding the bench protection threshold.
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

// Environment-coupling physical defaults for the ECX PRIME 6 M / 16 L.
// Order-of-magnitude values; Phase 3 calibration against bench data
// will refit them. Each parameter feeds one of the gravity-coupled env
// nodes (RotorSag, BearingPreload, MountingCompliance) wired through the
// GravityVector.
export const MAXON_ECX_PRIME_ENV_DEFAULTS = Object.freeze({
    // Rotor-side (used by RotorSagModel and BearingPreloadModel).
    rotorMass: 0.03,                  // kg, rotor + shaft assembly
    bearingRadialStiffness: 1e5,      // N/m, paired bearing stack
    airGap: 5e-4,                     // m, nominal magnetic air-gap (0.5 mm)
    // Bearing assembly (used by BearingPreloadModel).
    nominalAxialPreload: 5,           // N
    nominalRadialPreload: 5,          // N
    // Whole-motor mass on the bracket (used by MountingComplianceModel).
    motorMass: 0.1,                   // kg
});
