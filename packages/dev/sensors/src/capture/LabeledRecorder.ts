import { IDataSource } from "../interfaces/DataSource";
import { ILabeledReading, IRecorder, IScenario } from "../interfaces/Recorder";
import { ISensor, ISensorConfig, SensorFactory } from "../interfaces/Sensor";
import { makeSensorFactory } from "../sensors/Sensor";
import { Rng } from "../util/rng";

// Configuration for a LabeledRecorder.
//
//   sensorInfo : either an ISensorConfig (template, a fresh Sensor will be
//                built per scenario) or an existing ISensor whose config is
//                reused. Passing an ISensor is the typical pattern when the
//                UI already exposes a configured sensor object.
//   rngSeed    : seed for the scenario-picker RNG (separate from the noise
//                RNG inside each Sensor); fixes the random scenario sequence
//                across runs.
export interface ILabeledRecorderConfig {
    sensorInfo: ISensorConfig | ISensor;
    rngSeed?: number;
}

// LabeledRecorder drives a stream of labeled measurements suitable for
// supervised training. It owns:
//   - a list of scenarios (each scenario is a label + an IDataSource factory)
//   - a sensor factory derived from sensorInfo, used to wrap whichever
//     scenario is currently active
//   - an RNG for weighted random scenario selection
//
// On every call to next(t), the recorder samples the active sensor and tags
// the reading with the current scenario's label and metadata.
export class LabeledRecorder implements IRecorder {
    public readonly scenarios: ReadonlyArray<IScenario>;
    public readonly sensorConfig: ISensorConfig;

    private readonly _sensorFactory: SensorFactory;
    private _activeScenario: IScenario;
    private _activeSource: IDataSource;
    private _sensor: ISensor;
    private readonly _rng: Rng;

    public constructor(scenarios: ReadonlyArray<IScenario>, cfg: ILabeledRecorderConfig) {
        if (scenarios.length === 0) {
            throw new Error("LabeledRecorder requires at least one scenario");
        }
        this.scenarios = scenarios;
        this._sensorFactory = makeSensorFactory(cfg.sensorInfo);
        // Resolve sensorInfo to a concrete ISensorConfig once, for inspection.
        this.sensorConfig = isSensorLike(cfg.sensorInfo) ? cfg.sensorInfo.config : cfg.sensorInfo;
        this._rng = new Rng(cfg.rngSeed);

        // Activate the first scenario so the recorder is usable immediately.
        this._activeScenario = scenarios[0];
        this._activeSource = this._activeScenario.factory();
        this._sensor = this._sensorFactory(this._activeSource);
    }

    // Sample the current sensor at time t and label the result with the
    // active scenario. Time is the caller's responsibility, which lets the
    // recorder be driven by a simulation clock or by a real-time stream.
    public next(t: number): ILabeledReading {
        const reading = this._sensor.next(t);
        return {
            t: reading.t,
            value: reading.value,
            label: this._activeScenario.label,
            scenarioMeta: this._activeScenario.meta ?? {},
        };
    }

    // Pick a new scenario at random, weighted by IScenario.weight (default 1
    // when unset). Useful between training windows to balance class exposure.
    public randomizeScenario(): void {
        const weights = this.scenarios.map(s => s.weight ?? 1);
        const picked = this._rng.pickWeighted(this.scenarios, weights);
        this.activate(picked);
    }

    public setScenarioByLabel(label: string): void {
        const found = this.scenarios.find(s => s.label === label);
        if (!found) {
            throw new Error(`LabeledRecorder: unknown scenario "${label}"`);
        }
        this.activate(found);
    }

    public currentLabel(): string {
        return this._activeScenario.label;
    }

    public currentSource(): IDataSource {
        return this._activeSource;
    }

    public currentSensor(): ISensor {
        return this._sensor;
    }

    // Sample a contiguous window of N = floor(durationS * sampleRateHz)
    // labeled readings starting at t0. The active scenario is held constant
    // for the whole window; switch scenarios between windows.
    public recordWindow(durationS: number, t0: number = 0): ILabeledReading[] {
        const dt = 1.0 / this._sensor.config.sampleRateHz;
        const n = Math.floor(durationS * this._sensor.config.sampleRateHz);
        const out: ILabeledReading[] = new Array(n);
        for (let i = 0; i < n; i++) {
            out[i] = this.next(t0 + i * dt);
        }
        return out;
    }

    // Rebuild the active source from its factory and wrap it in a fresh
    // sensor instance. The factory rebuilds the source so IDataSources may
    // hold internal state (e.g. ring buffers) without leaking it across
    // scenario switches.
    private activate(scenario: IScenario): void {
        this._activeScenario = scenario;
        this._activeSource = scenario.factory();
        this._sensor = this._sensorFactory(this._activeSource);
    }
}

function isSensorLike(spec: ISensorConfig | ISensor): spec is ISensor {
    return typeof (spec as ISensor).next === "function";
}
