// ═══════════════════════════════════════════════════════════════════════════
// @spiky-panda/applications-motorwatch
//
// Open-set regime monitoring for motor-current analysis (the DriverV2
// behavioral-clustering recipe ported to the industrial domain):
//
//   edge      MotorwatchDevice: steady-state gated current windows ->
//             ONNX encoder -> online open-set clustering -> NEW_REGIME
//             alarms; validated runtime diagnostic-model bank.
//   protocol  Transport-agnostic JSON-RPC-shaped device contract
//             (tools, notifications, error codes) + the in-process
//             server implementation.
//   central   CentralStation (diagnostic push + labeling authority),
//             RegimeCatalog (labeled centroids), mergeCatalogs
//             (federated label propagation between sites).
// ═══════════════════════════════════════════════════════════════════════════

export { RegimeCatalog } from "./central/regime.catalog";
export type { IRegimeCatalogEntry, IRegimeCatalogEntryJson, IRegimeCatalogJson, IRegimeCatalogOptions, IRegimeLookupResult } from "./central/regime.catalog";

export { mergeCatalogs } from "./central/federation";
export type { IMergeCatalogsOptions } from "./central/federation";

export { CentralStation, DEFAULT_DIAGNOSTIC_KEY } from "./central/station";
export type { ICentralStationOptions, IDiagnosticBank, IHandledAlarm } from "./central/station";

export { MotorwatchDevice } from "./edge/device";
export type {
    DeviceResetScope,
    ICaptureProfile,
    IDeviceAlarm,
    IDeviceStatus,
    IDiagnosticLoadDeviceOptions,
    IDiagnosticOutcome,
    IMotorwatchClusterOptions,
    IMotorwatchDeviceOptions,
    IMotorwatchGateOptions,
} from "./edge/device";

export { OnnxAdapterKernel } from "./edge/onnx.adapter.kernel";

export { InProcessDeviceServer, MCP_ERROR, McpToolError, isMcpError } from "./protocol/mcp";
export type {
    IAlarmNotification,
    ICatalogApplyLabelParams,
    ICatalogApplyLabelResult,
    ICatalogUpdatedNotification,
    ICaptureSetProfileParams,
    ICaptureSetProfileResult,
    IDeviceResetParams,
    IDeviceResetResult,
    IDeviceServer,
    IDiagnosticLoadModelParams,
    IDiagnosticLoadModelResult,
    IDiagnosticResultNotification,
    IDiagnosticRunParams,
    IDiagnosticRunResult,
    IMcpError,
    IRegimeCurrentResult,
    IStatusNotification,
    McpNotification,
    McpNotificationHandler,
    McpToolName,
} from "./protocol/mcp";
