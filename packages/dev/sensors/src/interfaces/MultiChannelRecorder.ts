import { IDataSource } from "./DataSource";
import { ILabeledReading } from "./Recorder";
import { ISensorConfig } from "./Sensor";
import { ISimNode } from "./SimNode";

// One channel produced by a multi-channel host (PmsmSimulation). The source
// is a sibling probe that reads the host state at time t. The sensorConfig
// is the measurement profile (sample rate, gain, bias, noise) appropriate
// for the physical sensor wrapping that probe (e.g. ADXL355 for vibration,
// Hall current sensor for phase currents, ADC for V_bus).
export interface IMultiChannelChannel {
    readonly source: IDataSource;
    readonly sensorConfig: ISensorConfig;
}

// A multi-channel data source. All channels share the same stateful host
// (typically PmsmSimulation), so they observe the same physical state at
// the same instant t. The channels map is keyed by stable channel keys
// (e.g. "i_a", "accel_x", "v_bus") which travel into the dataset and
// downstream feature pipeline.
//
// host is exposed for debug / tracing only. Most callers should treat the
// channels map as the contract.
export interface IMultiChannelSource {
    readonly host: ISimNode;
    readonly channels: ReadonlyMap<string, IMultiChannelChannel>;
}

// A labeled scenario producing a multi-channel source. Mirrors the legacy
// IScenario contract but yields N synchronized channels instead of one.
//
// factory() must construct a fresh host on every call. Probes inside the
// returned IMultiChannelSource capture that host by closure, so each
// scenario activation gets a fresh state machine.
export interface IMultiChannelScenario {
    readonly label: string;
    readonly factory: () => IMultiChannelSource;
    readonly weight?: number;
    readonly meta?: Record<string, unknown>;
}

// A labeled reading from one channel of an IMultiChannelScenario, tagged
// with the scenario label, scenario metadata, and the channel key.
export interface IMultiChannelLabeledReading extends ILabeledReading {
    readonly channelKey: string;
}

// Common surface of any multi-channel labeled recorder. A recorder owns
// the active scenario and a per-channel sensor / clock; next() returns
// one labeled reading from each channel sampled at its own cadence.
export interface IMultiChannelRecorder {
    next(t: number): Map<string, IMultiChannelLabeledReading>;
    randomizeScenario(): void;
    setScenarioByLabel(label: string): void;
    currentLabel(): string;
}
