import { IDataSource } from "./DataSource";
import { ISensorReading } from "./Sensor";

// One labeled training scenario. The factory rebuilds the underlying
// IDataSource on demand, which lets the recorder reset stateful sources
// (e.g. a motor whose transient depends on absolute t) cleanly between
// windows.
//
//   label    : training class name, used by classifiers
//   factory  : produces a fresh IDataSource instance every time it is called
//   weight   : optional pick weight for randomizeScenario (default 1)
//   meta     : free-form scenario metadata (severity, brokenBars, slip, ...);
//              propagated into every ILabeledReading produced under this
//              scenario, useful for stratified analysis or regression tasks
export interface IScenario {
    label: string;
    factory: () => IDataSource;
    weight?: number;
    meta?: Record<string, unknown>;
}

// An ISensorReading enriched with the active scenario's label and metadata.
// scenarioMeta is a snapshot of IScenario.meta at sampling time, so changes
// to the source scenario do not retroactively rewrite past readings.
export interface ILabeledReading extends ISensorReading {
    label: string;
    scenarioMeta: Record<string, unknown>;
}

// Common surface of any labeled recorder. Implementations may differ on
// scenario selection policy (random, round-robin, scripted) but expose the
// same sampling and label-control API.
export interface IRecorder {
    next(t: number): ILabeledReading;
    randomizeScenario(): void;
    setScenarioByLabel(label: string): void;
    currentLabel(): string;
}
