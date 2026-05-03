import { Current } from "spikypanda-core";
import { TWO_PI, clamp01 } from "../../util/math";
import { IDataSource, IDataSourceMeta } from "../../interfaces/DataSource";
import { IFault } from "../../interfaces/Fault";
import { MotorCurrentSource } from "./MotorCurrentSource";

// Numeric enum so the discriminator compiles to integer comparisons in
// switch statements and so it can be ported 1:1 to a C++ enum class on the
// MCU side. Explicit values fix the wire / serialization contract.
export enum MotorFaultType {
    MISALIGNMENT = 0,
    BEARING_DEFECT = 1,
    BROKEN_BAR = 2,
    ECCENTRICITY = 3,
    BRUSH_FAULT = 4,
}

// Snake-case identifier suitable for CSV labels, log lines, and routing.
// Use this only at API boundaries; inner code paths must compare the
// numeric enum value directly.
export function motorFaultLabel(type: MotorFaultType): string {
    switch (type) {
        case MotorFaultType.MISALIGNMENT: return "misalignment";
        case MotorFaultType.BEARING_DEFECT: return "bearing_defect";
        case MotorFaultType.BROKEN_BAR: return "broken_bar";
        case MotorFaultType.ECCENTRICITY: return "eccentricity";
        case MotorFaultType.BRUSH_FAULT: return "brush_fault";
    }
}

// Per-type human-readable defaults. Lets users instantiate a fault config
// without retyping the same displayName / description every time, while
// still allowing per-instance override when the UI needs it.
export interface IMotorFaultPresentation {
    displayName: string;
    description: string;
}

export const MOTOR_FAULT_PRESENTATION: Readonly<Record<MotorFaultType, IMotorFaultPresentation>> = Object.freeze({
    [MotorFaultType.MISALIGNMENT]: {
        displayName: "Misalignment",
        description: "Shaft misalignment producing a torque oscillation at 1x and 2x mechanical rotation that perturbs the current.",
    },
    [MotorFaultType.BEARING_DEFECT]: {
        displayName: "Bearing defect",
        description: "Inner / outer race defect producing high-frequency mechanical pulses synchronized with the BPFI / BPFO frequencies.",
    },
    [MotorFaultType.BROKEN_BAR]: {
        displayName: "Broken rotor bar",
        description: "Rotor angular asymmetry caused by missing bars; the spatial Fourier of the broken-bar pattern shapes the harmonic spectrum.",
    },
    [MotorFaultType.ECCENTRICITY]: {
        displayName: "Air-gap eccentricity",
        description: "Off-center rotor producing a 1x mechanical modulation of the magnetic gap.",
    },
    [MotorFaultType.BRUSH_FAULT]: {
        displayName: "Brush fault",
        description: "Arcing or wear on one specific brush (selected by index). The contact force varies at the mechanical rotation rate, amplitude-modulating the commutation current. Sidebands appear at fComm ± k·fMech; the sideband phase encodes which brush is faulty.",
    },
});

// All fault configs hold ONLY fault-specific physics. Operating-point
// quantities (rotor angle, mechanical speed, commutator bars) come from the
// motor the fault is attached to, never from the fault itself: a fault is a
// localized perturbation of a motor, it does not redefine the motor.

// Shaft misalignment: produces a torque oscillation at 1× and 2× rotation
// that perturbs the current. No fault-specific physics beyond severity.
export interface IMotorMisalignmentConfig extends IFault {
    type: MotorFaultType.MISALIGNMENT;
}

// Bearing defect: fault-specific geometry parameters BPFO / BPFI describe
// the bearing itself, not the motor. Real bearings have these factors
// derived from ball count, contact angle, etc.; defaults are placeholders.
export interface IMotorBearingDefectConfig extends IFault {
    type: MotorFaultType.BEARING_DEFECT;
    bpfoFactor?: number;         // ball-pass freq outer race / f_mech (default 4.5)
    bpfiFactor?: number;         // ball-pass freq inner race / f_mech (default 5.5)
}

// Broken rotor bars. Modeled as an angular asymmetry: each broken bar at
// position i contributes nothing to the rotor field while intact bars
// contribute uniformly. The induced current sees the asymmetric pattern
// rotating at ω, and its spectrum picks up energy at angular harmonics k
// of f_mech with amplitudes given by the spatial Fourier of the broken-bar
// pattern. So 3 contiguous bars [0, 1, 2] excite low orders strongly,
// 3 evenly spread bars [0, 4, 8] excite only orders that match the
// pattern's spatial period.
//
//   totalBars      : number of rotor bars in the model
//   brokenIndices  : 0-based positions of the broken bars
export interface IMotorBrokenBarConfig extends IFault {
    type: MotorFaultType.BROKEN_BAR;
    totalBars: number;
    brokenIndices: ReadonlyArray<number>;
}

// Air-gap eccentricity: rotor center offset produces a 1× mechanical
// amplitude modulation. No additional config beyond severity for v1.
export interface IMotorEccentricityConfig extends IFault {
    type: MotorFaultType.ECCENTRICITY;
}

// Brush fault: arcing or brush wear on one specific brush. The commutation
// rate and brush count are inherited from the motor. The fault specifies
// WHICH brush is defective (0-based, evenly spaced at 2π·k/brushCount).
// Different brush indices produce the same sideband frequencies but
// different sideband phases, which is measurable in the spectrum.
export interface IMotorBrushFaultConfig extends IFault {
    type: MotorFaultType.BRUSH_FAULT;
    faultyBrushIndex?: number;   // 0-based index of the defective brush (default 0)
}

export type MotorFaultConfig =
    | IMotorMisalignmentConfig
    | IMotorBearingDefectConfig
    | IMotorBrokenBarConfig
    | IMotorEccentricityConfig
    | IMotorBrushFaultConfig;

// Input shape for makeMotorFault: the caller provides the bare physics, the
// helper fills in displayName / description from the per-type registry.
export type MotorFaultParams<T extends MotorFaultType> =
    Omit<Extract<MotorFaultConfig, { type: T }>, keyof IFault | "type">
    & {
        type: T;
        severity: number;
        displayName?: string;
        description?: string;
    };

// Build a MotorFaultConfig from physical parameters, auto-populating the
// human-readable displayName / description from the registry.
export function makeMotorFault<T extends MotorFaultType>(params: MotorFaultParams<T>): MotorFaultConfig {
    const presentation = MOTOR_FAULT_PRESENTATION[params.type];
    return {
        ...params,
        displayName: params.displayName ?? presentation.displayName,
        description: params.description ?? presentation.description,
    } as MotorFaultConfig;
}

// Helper: bars [startIdx, startIdx+1, ..., startIdx+count-1] mod totalBars.
// Default for "a contiguous group of bars failed at the same place".
export function contiguousBrokenBars(totalBars: number, count: number, startIdx: number = 0): number[] {
    const out: number[] = [];
    const t = Math.max(1, totalBars);
    const n = Math.max(0, Math.min(count, t));
    for (let i = 0; i < n; i++) out.push(((startIdx + i) % t + t) % t);
    return out;
}

// Helper: bars spread as evenly as possible around the rotor. Useful to
// model age-related multi-bar fatigue where failures are not co-located.
export function evenlyDistributedBrokenBars(totalBars: number, count: number): number[] {
    const out: number[] = [];
    const t = Math.max(1, totalBars);
    const n = Math.max(0, Math.min(count, t));
    if (n === 0) return out;
    const step = t / n;
    for (let i = 0; i < n; i++) out.push(Math.round(i * step) % t);
    return out;
}

// Maximum spatial harmonic order considered for the broken-bar physics.
// Beyond totalBars / 2 the angular pattern is aliased; capping at 8 keeps
// the inner loop small without losing meaningful amplitudes.
const BROKEN_BAR_MAX_ORDER = 8;

// Empirical scale factor mapping unit spatial Fourier amplitudes to current
// sideband amplitudes. Calibrated so that a single-bar fault at moderate
// severity is visible at typical operating points; will be re-tuned when
// comparing against measured data.
const BROKEN_BAR_AMP_SCALE = 4.0;

// One additive fault contribution. Each fault is a θ-dependent perturbation
// of the motor current. The angular variable θ(t) comes from the motor the
// fault is attached to, so frequencies in the FFT emerge from the rotor
// rotation rate, never from a hardcoded fault parameter.
//
// expectedSpectralPeaks in the meta is purely informational: it lists the
// peaks the fault is *known* to produce given the motor's current speed,
// for tests and UI overlays.
export class MotorFaultSource implements IDataSource {
    public readonly cfg: MotorFaultConfig;
    public readonly motor: MotorCurrentSource;
    private readonly _meta: IDataSourceMeta;
    private readonly _fMech: number;     // motorSpeedRps for spectral hint

    // For broken bars: precomputed spatial Fourier amplitudes a_k and phases
    // phi_k of the broken-bar pattern. The inner sample loop just evaluates
    // sum_k a_k · cos(k · θ - phi_k), no per-sample bar iteration.
    private readonly _brokenBarA: number[] = [];
    private readonly _brokenBarPhi: number[] = [];

    public constructor(cfg: MotorFaultConfig, motor: MotorCurrentSource) {
        this.cfg = cfg;
        this.motor = motor;
        this._fMech = motor.cfg.motorSpeedRps;

        if (cfg.type === MotorFaultType.BROKEN_BAR) {
            this.precomputeBrokenBarSpatialFourier(cfg);
        }

        const labelStr = motorFaultLabel(cfg.type);
        this._meta = {
            kind: `motor.fault.${labelStr}`,
            unit: Current.Units.amp,
            label: cfg.displayName,
            fundamentalHz: this._fMech,
            expectedSpectralPeaks: this.predictPeaks(cfg, this._fMech),
        };
    }

    public meta(): IDataSourceMeta {
        return this._meta;
    }

    // Each fault sample reads the rotor angle from its host motor. Under
    // varying ω (PWM duty changes, mechanical load transients) θ(t) is
    // properly integrated by the motor and the fault tracks it natively;
    // the fault does not assume constant rotation anywhere.
    public signal(t: number): number {
        const theta = this.motor.theta(t);
        return this.contributionAtTheta(theta);
    }

    // Closed-form contribution at rotor angle θ.
    private contributionAtTheta(theta: number): number {
        const cfg = this.cfg;
        const s = clamp01(cfg.severity);

        switch (cfg.type) {
            case MotorFaultType.MISALIGNMENT: {
                // Periodic torque load at 1× and 2× rotation perturbs the
                // current at the same angular orders.
                return s * (
                    0.30 * Math.sin(theta) +
                    0.20 * Math.sin(2.0 * theta)
                );
            }
            case MotorFaultType.BEARING_DEFECT: {
                // Race defects produce mechanical pulses at characteristic
                // multiples of the mechanical rotation. We approximate them
                // as smooth tones at the BPFO / BPFI orders.
                const ko = cfg.bpfoFactor ?? 4.5;
                const ki = cfg.bpfiFactor ?? 5.5;
                return s * (
                    0.20 * Math.sin(ko * theta) +
                    0.20 * Math.sin(ki * theta)
                );
            }
            case MotorFaultType.BROKEN_BAR: {
                // The angular asymmetry of the broken-bar pattern was
                // factored out into Fourier amplitudes during construction.
                // Inner loop: sum a_k · cos(k · θ - phi_k).
                let acc = 0;
                for (let k = 1; k <= this._brokenBarA.length; k++) {
                    const a = this._brokenBarA[k - 1];
                    if (a === 0) continue;
                    acc += a * Math.cos(k * theta - this._brokenBarPhi[k - 1]);
                }
                return s * BROKEN_BAR_AMP_SCALE * acc;
            }
            case MotorFaultType.ECCENTRICITY: {
                // Off-center rotor: the gap reluctance modulates at 1×
                // mechanical, multiplying the mean current at that order.
                return s * 0.5 * Math.sin(theta);
            }
            case MotorFaultType.BRUSH_FAULT: {
                // Brush wear / arcing on brush k (0-based). Brush k sits at
                // angular position φ_k = 2π·k / brushCount. The non-uniform
                // contact force varies at the mechanical rotation rate relative
                // to that brush's position, amplitude-modulating the commutation
                // current with phase offset φ_k.
                //
                // cos(k·(θ - φ))·sin(N·θ) → sidebands at (bars±k)·fMech with
                // phase that encodes WHICH brush is faulty. Same frequencies,
                // different sideband phases for different brush indices.
                //
                // Asymmetry strength scales as sin(π/brushCount): a 4-brush
                // motor sees 71% of the 2-brush sideband amplitude because
                // the other three brushes partially compensate.
                const bars = this.motor.cfg.commutatorBars;
                const N = this.motor.cfg.brushCount ?? 2;
                const faultyIdx = cfg.faultyBrushIndex ?? 0;
                const brushAngle = (TWO_PI * faultyIdx) / Math.max(1, N);
                const asymmetryScale = Math.sin(Math.PI / Math.max(1, N));
                return s * asymmetryScale * (
                    0.40 * Math.cos(theta - brushAngle) * Math.sin(bars * theta) +
                    0.15 * Math.cos(2.0 * (theta - brushAngle)) * Math.sin(bars * theta)
                );
            }
        }
    }

    // Precompute amplitudes and phases of the broken-bar spatial Fourier
    // series. A_k = |Σ_i exp(j·k·θ_i)| / N_total, phi_k = arg(...).
    private precomputeBrokenBarSpatialFourier(cfg: IMotorBrokenBarConfig): void {
        const total = Math.max(1, cfg.totalBars);
        const broken = cfg.brokenIndices ?? [];
        if (broken.length === 0) return;
        const maxOrder = Math.min(BROKEN_BAR_MAX_ORDER, Math.floor(total / 2));
        for (let k = 1; k <= maxOrder; k++) {
            let re = 0, im = 0;
            for (const i of broken) {
                const theta_i = (TWO_PI * i) / total;
                re += Math.cos(k * theta_i);
                im += Math.sin(k * theta_i);
            }
            const amp = Math.sqrt(re * re + im * im) / total;
            const phi = Math.atan2(im, re);
            this._brokenBarA.push(amp);
            this._brokenBarPhi.push(phi);
        }
    }

    // Closed-form list of spectral peaks the fault is known to excite at
    // the motor's current speed. Used by tests to assert spectral content
    // and by UIs to mark expected peaks on a spectrum plot.
    private predictPeaks(cfg: MotorFaultConfig, fMech: number): number[] {
        switch (cfg.type) {
            case MotorFaultType.MISALIGNMENT:
                return [fMech, 2 * fMech];
            case MotorFaultType.BEARING_DEFECT:
                return [
                    (cfg.bpfoFactor ?? 4.5) * fMech,
                    (cfg.bpfiFactor ?? 5.5) * fMech,
                ];
            case MotorFaultType.BROKEN_BAR: {
                // Peaks live at k · f_mech for orders k where the spatial
                // Fourier amplitude is non-zero.
                const peaks: number[] = [];
                for (let k = 1; k <= this._brokenBarA.length; k++) {
                    if (this._brokenBarA[k - 1] > 1e-9) peaks.push(k * fMech);
                }
                return peaks;
            }
            case MotorFaultType.ECCENTRICITY:
                return [fMech];
            case MotorFaultType.BRUSH_FAULT: {
                const bars = this.motor.cfg.commutatorBars;
                // Sidebands from k=1 and k=2 AM modulation at mechanical rate.
                return [
                    (bars - 2) * fMech,
                    (bars - 1) * fMech,
                    (bars + 1) * fMech,
                    (bars + 2) * fMech,
                ];
            }
        }
    }
}
