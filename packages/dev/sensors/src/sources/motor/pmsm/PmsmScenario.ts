import { IDataSource } from "../../../interfaces/DataSource";
import { ISensorConfig } from "../../../interfaces/Sensor";
import { IMultiChannelChannel, IMultiChannelScenario, IMultiChannelSource } from "../../../interfaces/MultiChannelRecorder";
import { FocController, IFocControllerConfig } from "./control/FocController";
import { BearingPreloadModel } from "./env/BearingPreloadModel";
import { GravityField } from "./env/GravityField";
import { GravityVector } from "./env/GravityVector";
import { HousingMechanics, IHousingMechanicsConfig } from "./env/HousingMechanics";
import { IPmsmEnvNode } from "./env/IPmsmEnvNode";
import { MotorTransform } from "./env/MotorTransform";
import { MountingComplianceModel } from "./env/MountingComplianceModel";
import { RotorSagModel } from "./env/RotorSagModel";
import { EccentricityFault } from "./faults/EccentricityFault";
import { ImbalanceFault } from "./faults/ImbalanceFault";
import { IPmsmFaultNode } from "./faults/PmsmFaultContracts";
import { ISvpwmConfig, SvpwmModulator } from "./modulator/SvpwmModulator";
import { IThreePhaseInverterConfig, ThreePhaseInverter } from "./inverter/ThreePhaseInverter";
import { IPmsmMachineConfig } from "./machine/PmsmMachineConfig";
import { PmsmMachine } from "./machine/PmsmMachine";
import { PmsmSimulation } from "./PmsmSimulation";
import { DcBusVoltageSource } from "./sensors/DcBusVoltageSource";
import { DqCurrentSource } from "./sensors/DqCurrentSource";
import { ElectromagneticTorqueSource } from "./sensors/ElectromagneticTorqueSource";
import { PhaseCurrentSource } from "./sensors/PhaseCurrentSource";
import { VibrationAxisSource } from "./sensors/VibrationAxisSource";
import {
    focPresetForEcxPrime,
    housingPresetForEcxPrime,
    inverterPresetForEcxPrime,
    MAXON_ECX_PRIME_6M_16L,
    MAXON_ECX_PRIME_ENV_DEFAULTS,
    svpwmPresetForEcxPrime,
} from "./presets/MaxonEcxPrime";

// Per-channel sample rates and noise profiles, aligned with the proposal
// section 4.2 sensor table.
const DEFAULT_PHASE_CURRENT: ISensorConfig = { sampleRateHz: 20_000, noiseStd: 0.025, gain: 1, bias: 0 };
const DEFAULT_DQ_CURRENT: ISensorConfig = { sampleRateHz: 20_000, noiseStd: 0.025, gain: 1, bias: 0 };
const DEFAULT_TORQUE: ISensorConfig = { sampleRateHz: 20_000, noiseStd: 0, gain: 1, bias: 0 };
const DEFAULT_VIBRATION: ISensorConfig = { sampleRateHz: 4_000, noiseStd: 0.011, gain: 1, bias: 0 };
const DEFAULT_BUS_VOLTAGE: ISensorConfig = { sampleRateHz: 10_000, noiseStd: 0, gain: 1, bias: 0 };

// Builder options for one PMSM scenario.
//
//   gravityField    : world-frame gravity. Default GravityField.earth().
//                     Pass GravityField.microgravity() for orbit, or a
//                     custom vector for parabolic / centrifuge cases.
//   motorTransform  : motor orientation in the world. Default
//                     MotorTransform.horizontal() : the proposal Model A
//                     baseline (shaft horizontal, gravity perpendicular
//                     to axis).
//   envBuilder      : called with the live PmsmSimulation host AND the
//                     GravityVector node to build env perturbations.
//                     Default : full Phase 1 env pipeline (RotorSag +
//                     BearingPreload + MountingCompliance) with ECX
//                     PRIME defaults. Pass () => [] to disable env
//                     entirely (clean baseline for unit testing).
export interface IPmsmScenarioOptions {
    label: string;
    machine?: IPmsmMachineConfig;
    foc?: IFocControllerConfig;
    svpwm?: ISvpwmConfig;
    inverter?: IThreePhaseInverterConfig;
    housing?: IHousingMechanicsConfig;
    gravityField?: GravityField;
    motorTransform?: MotorTransform;
    envBuilder?: (sim: PmsmSimulation, gravityVector: GravityVector) => ReadonlyArray<IPmsmEnvNode>;
    speedTargetRps?: number;
    loadTorque?: number;
    faultsBuilder?: (sim: PmsmSimulation) => ReadonlyArray<IPmsmFaultNode>;
    overrideSensorConfig?: Partial<Record<string, ISensorConfig>>;
    weight?: number;
    extraMeta?: Record<string, unknown>;
}

// Default env builder : full Phase 1 pipeline using ECX PRIME defaults.
// The proposal's Model A operating point assumes a complete gravity
// coupling, so this is what one wants by default.
export function defaultEcxPrimeEnvBuilder(): (sim: PmsmSimulation, gv: GravityVector) => ReadonlyArray<IPmsmEnvNode> {
    return (_sim, gv) => [
        new RotorSagModel(
            {
                rotorMass: MAXON_ECX_PRIME_ENV_DEFAULTS.rotorMass,
                bearingRadialStiffness: MAXON_ECX_PRIME_ENV_DEFAULTS.bearingRadialStiffness,
                airGap: MAXON_ECX_PRIME_ENV_DEFAULTS.airGap,
                umpRadialStiffness: MAXON_ECX_PRIME_ENV_DEFAULTS.umpRadialStiffness,
            },
            gv
        ),
        new BearingPreloadModel(
            {
                rotorMass: MAXON_ECX_PRIME_ENV_DEFAULTS.rotorMass,
                nominalAxialPreload: MAXON_ECX_PRIME_ENV_DEFAULTS.nominalAxialPreload,
                nominalRadialPreload: MAXON_ECX_PRIME_ENV_DEFAULTS.nominalRadialPreload,
            },
            gv
        ),
        new MountingComplianceModel(
            {
                motorMass: MAXON_ECX_PRIME_ENV_DEFAULTS.motorMass,
            },
            gv
        ),
    ];
}

// Build a fresh PmsmSimulation + sibling probes from the options. Each
// call constructs a brand-new host (clean transient).
export function buildPmsmSource(opts: IPmsmScenarioOptions): IMultiChannelSource {
    const machineCfg = opts.machine ?? MAXON_ECX_PRIME_6M_16L;
    const inverterCfg = opts.inverter ?? inverterPresetForEcxPrime();
    const focCfg = opts.foc ?? focPresetForEcxPrime(inverterCfg.vBus);
    const svpwmCfg = opts.svpwm ?? svpwmPresetForEcxPrime();
    const housingCfg = opts.housing ?? housingPresetForEcxPrime();

    const machine = new PmsmMachine({ ...machineCfg, loadTorque: opts.loadTorque ?? 0 });
    const foc = new FocController(focCfg);
    const speedRps = opts.speedTargetRps ?? machineCfg.nominalSpeedRps;
    foc.setSpeedTarget(2 * Math.PI * speedRps);
    const modulator = new SvpwmModulator(svpwmCfg);
    const inverter = new ThreePhaseInverter(inverterCfg);
    const housing = new HousingMechanics(housingCfg);

    const gravityField = opts.gravityField ?? GravityField.earth();
    const motorTransform = opts.motorTransform ?? MotorTransform.horizontal();
    const gravityVector = new GravityVector(gravityField, motorTransform);

    const sim = new PmsmSimulation({
        machine,
        foc,
        modulator,
        inverter,
        housing,
        gravityField,
        motorTransform,
        gravityVector,
        env: [],
        faults: [],
    });

    const envBuilder = opts.envBuilder ?? defaultEcxPrimeEnvBuilder();
    const env = envBuilder(sim, gravityVector);
    const faults = opts.faultsBuilder?.(sim) ?? [];
    // Swap the empty arrays for the real ones now that the host is built.
    (sim as unknown as { env: ReadonlyArray<IPmsmEnvNode> }).env = env;
    (sim as unknown as { faults: ReadonlyArray<IPmsmFaultNode> }).faults = faults;

    const overrides = opts.overrideSensorConfig ?? {};
    const channel = (key: string, source: IDataSource, defaultCfg: ISensorConfig): [string, IMultiChannelChannel] => [key, { source, sensorConfig: overrides[key] ?? defaultCfg }];

    const channels = new Map<string, IMultiChannelChannel>([
        channel("i_a", new PhaseCurrentSource(sim, 0), DEFAULT_PHASE_CURRENT),
        channel("i_b", new PhaseCurrentSource(sim, 1), DEFAULT_PHASE_CURRENT),
        channel("i_c", new PhaseCurrentSource(sim, 2), DEFAULT_PHASE_CURRENT),
        channel("i_d", new DqCurrentSource(sim, "d"), DEFAULT_DQ_CURRENT),
        channel("i_q", new DqCurrentSource(sim, "q"), DEFAULT_DQ_CURRENT),
        channel("torque_em", new ElectromagneticTorqueSource(sim), DEFAULT_TORQUE),
        channel("accel_x", new VibrationAxisSource(sim, 0), DEFAULT_VIBRATION),
        channel("accel_y", new VibrationAxisSource(sim, 1), DEFAULT_VIBRATION),
        channel("accel_z", new VibrationAxisSource(sim, 2), DEFAULT_VIBRATION),
        channel("v_bus", new DcBusVoltageSource(sim), DEFAULT_BUS_VOLTAGE),
    ]);

    return { host: sim, channels };
}

// Wrap the builder into an IMultiChannelScenario suitable for a future
// MultiChannelLabeledRecorder. The factory rebuilds the source on every
// activation to guarantee a clean transient.
export function buildPmsmScenario(opts: IPmsmScenarioOptions): IMultiChannelScenario {
    const machineCfg = opts.machine ?? MAXON_ECX_PRIME_6M_16L;
    const orientation = opts.motorTransform ?? MotorTransform.horizontal();
    const field = opts.gravityField ?? GravityField.earth();
    return {
        label: opts.label,
        weight: opts.weight,
        factory: () => buildPmsmSource(opts),
        meta: {
            ...(opts.extraMeta ?? {}),
            machine: { polePairs: machineCfg.polePairs, nominalSpeedRps: machineCfg.nominalSpeedRps },
            speedTargetRps: opts.speedTargetRps ?? machineCfg.nominalSpeedRps,
            loadTorque: opts.loadTorque ?? 0,
            orientation: orientation.label,
            gravityField: field.label,
        },
    };
}

// Convenience presets corresponding to the Phase 1 acceptance set.
// All defaults : ECX PRIME + Earth + horizontal + full env pipeline.
export function pmsmHealthyScenario(label: string = "healthy"): IMultiChannelScenario {
    return buildPmsmScenario({ label });
}

export function pmsmImbalanceScenario(severity: number, label: string = `imbalance_${Math.round(severity * 100)}`): IMultiChannelScenario {
    return buildPmsmScenario({
        label,
        faultsBuilder: () => [new ImbalanceFault({ severity })],
        extraMeta: { faultType: "imbalance", severity },
    });
}

export function pmsmEccentricityScenario(severity: number, label: string = `eccentricity_${Math.round(severity * 100)}`): IMultiChannelScenario {
    return buildPmsmScenario({
        label,
        faultsBuilder: () => [new EccentricityFault({ severity })],
        extraMeta: { faultType: "eccentricity", severity },
    });
}

// Orientation / field overrides : same scenario, different gravity context.
// Useful for the decisive ground test (compare horizontal vs vertical) and
// for the flight phase (microgravity).
export function pmsmHealthyOriented(motorTransform: MotorTransform, gravityField: GravityField, label?: string): IMultiChannelScenario {
    const computedLabel = label ?? `healthy__${motorTransform.label}__${gravityField.label}`;
    return buildPmsmScenario({
        label: computedLabel,
        motorTransform,
        gravityField,
    });
}
