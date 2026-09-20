/**
 * @spiky-panda/factory
 *
 * The factory: headless jobs over SpikyPanda graphs. The CLI (`bin.ts`)
 * is the deliverable; these exports let a test or a host (the `factory`
 * MCP slot) drive the same code in process.
 */
export { main } from "./cli.js";
export { parseSpec, SpecError, gridPoints, axisValues, recordColumn, summaryColumn } from "./spec.js";
export type {
    JobSpec,
    SweepSpec,
    FitSpec,
    NodeSetting,
    GridAxis,
    RecordField,
    SummaryStat,
    FrequencySource,
    RunSettings,
    OutputSettings,
    ColumnRef,
    FitDataset,
    FullScale,
    FitDomain,
    FitOutputSettings,
    MonitorSpec,
    EvaluateSpec,
    EvaluateRun,
    GraphQuantity,
    Injection,
    Scenario,
    ScenarioExpectation,
} from "./spec.js";
export { buildJobRegistry } from "./registry.js";
export { readDocument, instantiateDocument, applySetting, readNumber, DocumentError } from "./document.js";
export type { LoadedDocument, SavedGraph } from "./document.js";
export { buildDocument, buildDocumentJson, DocumentBuildError } from "./document-builder.js";
export type { DocumentNodeSpec, DocumentConnectionSpec, DocumentTileSpec } from "./document-builder.js";
export { runSweep, planSweep, resolveGraphPath } from "./sweep.js";
export type { SweepContext, SweepReport, SweepPlan, PointReport } from "./sweep.js";
export { resolveOutputDir, JobWriter, sha256File } from "./outputs.js";
export { lockIn, detrend, mean, min, max, rms } from "./analysis.js";
export { readRows, columnValues, DatasetError } from "./dataset.js";
export type { DatasetRow } from "./dataset.js";
export {
    fitAffine,
    predictHealth,
    buildHealthModel,
    serializeHealthModel,
    runHealthModel,
    loadHealthModel,
    HEALTH_GRAPH_NAME,
    HEALTH_INPUT,
    HEALTH_OUTPUT,
    HEALTH_INPUT_SHAPE,
    HEALTH_OUTPUT_SHAPE,
} from "./health-model.js";
export type { AffineCoefficients, HealthPrediction } from "./health-model.js";
export { runFit, planFit, resolveDatasetPath, FitError, PARITY_TOLERANCE } from "./fit.js";
export type { FitContext, FitReport, FitPlan, FitQuality, FitRow, ParityReport } from "./fit.js";
export { runEvaluate, planEvaluate, EvaluateError } from "./evaluate.js";
export type { EvaluateContext, EvaluateReport, EvaluatePlan, ScenarioResult, ConfusionCounts, CycleRecord } from "./evaluate.js";
