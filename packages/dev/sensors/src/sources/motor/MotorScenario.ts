import { IDataSource } from "../../interfaces/DataSource";
import { IScenario } from "../../interfaces/Recorder";
import { CompositeSource } from "../CompositeSource";
import { IMotorCurrentConfig, MotorCurrentSource } from "./MotorCurrentSource";
import {
    MOTOR_FAULT_PRESENTATION,
    MotorFaultConfig,
    MotorFaultSource,
    MotorFaultType,
    contiguousBrokenBars,
    evenlyDistributedBrokenBars,
    motorFaultLabel,
} from "./MotorFaultSource";

// Description of one labeled motor scenario, ready to be turned into an
// IScenario object. Authors describe the motor + zero-or-more faults; the
// helpers below handle the composition, labeling, and metadata bookkeeping.
export interface IMotorScenarioOptions {
    motor: IMotorCurrentConfig;
    faults?: ReadonlyArray<MotorFaultConfig>;
    label: string;
    weight?: number;
    extraMeta?: Record<string, unknown>;
}

// Build the IDataSource for a motor (healthy) plus zero or more faults.
// Each fault inherits the motor's mechanical rotation rate as its operating
// point, so callers cannot accidentally desynchronize a fault from the
// motor it sits on.
export function buildMotorSource(motor: IMotorCurrentConfig, faults: ReadonlyArray<MotorFaultConfig> = []): IDataSource {
    const healthy = new MotorCurrentSource(motor);
    if (faults.length === 0) return healthy;
    const faultSources = faults.map(f => new MotorFaultSource(f, healthy));
    return new CompositeSource([healthy, ...faultSources]);
}

// Wrap the options into an IScenario suitable for LabeledRecorder. The
// scenario.factory rebuilds the source on every call, so each scenario
// activation gets a fresh IDataSource (clean transient, fresh internal state).
export function buildMotorScenario(opts: IMotorScenarioOptions): IScenario {
    return {
        label: opts.label,
        weight: opts.weight,
        factory: () => buildMotorSource(opts.motor, opts.faults ?? []),
        meta: {
            ...(opts.extraMeta ?? {}),
            // Snapshot the motor and fault descriptions so labeled readings
            // carry enough metadata for stratified analysis without re-keying
            // back to the scenario list. typeId is the canonical wire value
            // (matches the C++ enum); type is the human-readable label.
            mechanicalFreqHz: opts.motor.motorSpeedRps,
            faults: (opts.faults ?? []).map(f => ({
                typeId: f.type,
                type: motorFaultLabel(f.type),
                displayName: f.displayName,
                severity: f.severity,
                ...(f.type === MotorFaultType.BROKEN_BAR
                    ? { totalBars: f.totalBars, brokenIndices: Array.from(f.brokenIndices) }
                    : {}),
                ...(f.type === MotorFaultType.BEARING_DEFECT
                    ? { bpfoFactor: f.bpfoFactor, bpfiFactor: f.bpfiFactor }
                    : {}),
            })),
        },
    };
}

// Default motor parameters mirroring EngineSignalGenerator::Config in the
// C++ reference. Override fields when you need a different operating point.
// Ke = 0.75 * V_supply / motorSpeedRps ensures the back-EMF is 75 % of V at rated
// speed. This keeps D_min = 25 %, meaning the motor is PWM-controllable across
// the full 25–100 % duty range. Formula: D_min = 1 - Ke * omega / V_supply.
export const DEFAULT_MOTOR: IMotorCurrentConfig = {
    supplyVoltage: 24.0,
    resistance: 1.2,
    inductance: 0.01,
    backEmfConstant: 0.36,  // 0.75 * 24 / 50 = 0.36 V/rps  →  back-EMF = 18 V at 50 rps
    motorSpeedRps: 50.0,
    commutatorBars: 12,
    brushCount: 2,
    nominalCurrent: 5.0,    // (24 - 18) / 1.2 = 5 A at D=1, 50 rps
    loadFactor: 1.0,
    rippleFactor: 0.05,
    // Physical params for gravity-induced shaft sag on a horizontal-axis motor.
    // A_grav ≈ I_eq * delta / g0 = 5 * (0.15*9.81/300000) / 0.0005
    // ≈ 0.049 A (≈ 1 % of 5 A nominal) for these values.
    rotorMass: 0.15,                  // kg
    airGap: 0.0005,                   // m  (0.5 mm)
    bearingRadialStiffness: 300_000,  // N/m (300 N/mm)
};

// Internal: build a MotorFaultConfig with displayName / description filled
// in from the per-type registry. Local to keep defaultMotorScenarios short.
function preset<T extends MotorFaultType>(
    type: T,
    rest: Omit<Extract<MotorFaultConfig, { type: T }>, "type" | "displayName" | "description">,
): MotorFaultConfig {
    const { displayName, description } = MOTOR_FAULT_PRESENTATION[type];
    return { type, displayName, description, ...rest } as MotorFaultConfig;
}

// Curated set of presets ready for LabeledRecorder. Mirrors the default
// scenarios used by the C++ LabeledEngineTrainingGenerator, with broken-bar
// variants split by bar count and severity so randomization explores the
// space cleanly. Pass a custom motor config to retarget all scenarios at a
// different operating point in one call.
export function defaultMotorScenarios(motor: IMotorCurrentConfig = DEFAULT_MOTOR): IScenario[] {
    return [
        buildMotorScenario({ motor, label: "healthy" }),
        buildMotorScenario({
            motor,
            label: "misalignment_mild",
            faults: [preset(MotorFaultType.MISALIGNMENT, { severity: 0.4 })],
        }),
        buildMotorScenario({
            motor,
            label: "misalignment_severe",
            faults: [preset(MotorFaultType.MISALIGNMENT, { severity: 0.85 })],
        }),
        buildMotorScenario({
            motor,
            label: "bearing_defect_mild",
            faults: [preset(MotorFaultType.BEARING_DEFECT, { severity: 0.4 })],
        }),
        buildMotorScenario({
            motor,
            label: "bearing_defect_severe",
            faults: [preset(MotorFaultType.BEARING_DEFECT, { severity: 0.85 })],
        }),
        buildMotorScenario({
            motor,
            label: "broken_bar_1bar_mild",
            faults: [preset(MotorFaultType.BROKEN_BAR, {
                severity: 0.4,
                totalBars: motor.commutatorBars,
                brokenIndices: contiguousBrokenBars(motor.commutatorBars, 1),
            })],
        }),
        buildMotorScenario({
            motor,
            label: "broken_bar_3bars_contiguous",
            faults: [preset(MotorFaultType.BROKEN_BAR, {
                severity: 0.7,
                totalBars: motor.commutatorBars,
                brokenIndices: contiguousBrokenBars(motor.commutatorBars, 3),
            })],
        }),
        buildMotorScenario({
            motor,
            label: "broken_bar_3bars_distributed",
            faults: [preset(MotorFaultType.BROKEN_BAR, {
                severity: 0.7,
                totalBars: motor.commutatorBars,
                brokenIndices: evenlyDistributedBrokenBars(motor.commutatorBars, 3),
            })],
        }),
        buildMotorScenario({
            motor,
            label: "eccentricity_mild",
            faults: [preset(MotorFaultType.ECCENTRICITY, { severity: 0.5 })],
        }),
        buildMotorScenario({
            motor,
            label: "brush_fault",
            faults: [preset(MotorFaultType.BRUSH_FAULT, { severity: 0.6 })],
        }),
    ];
}
