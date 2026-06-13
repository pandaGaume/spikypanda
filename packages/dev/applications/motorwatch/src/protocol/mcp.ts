// ═══════════════════════════════════════════════════════════════════════════
// Motorwatch device contract: the INDUSTRIAL variant of the driverv2 MCP
// API (docs/api_mcp.md), transport-agnostic and wired in-process.
//
// The device IS the server; the central station is the client. Tools are
// request/response (JSON-RPC `tools/call` shaped), telemetry and alarms
// are notifications (no id, never answered). Messages stay small and
// flat (the api_mcp.md 512-byte spirit): the only array payload is the
// regime centroid, a handful of floats.
//
// Mirrored design rules from api_mcp.md:
//   - destructive tools require `confirm: true` (CONFIRM_REQUIRED 1002),
//   - no method ever associates a regime with an identity; embeddings
//     only travel as l2-normalized centroids (the clustering space),
//   - the application error-code table is the driverv2 one (1001..1005)
//     plus the standard JSON-RPC codes for malformed calls.
// ═══════════════════════════════════════════════════════════════════════════

import type { MotorwatchDevice, IDeviceStatus, DeviceResetScope } from "../edge/device";

// ─── Error codes ─────────────────────────────────────────────────────────────

/** Application + JSON-RPC error codes, mirroring api_mcp.md section 6. */
export const MCP_ERROR = {
    /** Operation in progress (recalibration, recluster). */
    BUSY: 1001,
    /** Destructive tool called without `confirm: true`. */
    CONFIRM_REQUIRED: 1002,
    /** Tool not callable in the current device state. */
    INVALID_STATE: 1003,
    /** Persistent storage write failed. */
    PERSIST_FAILED: 1004,
    /** Data only available in diagnostics mode. */
    DIAGNOSTICS_OFF: 1005,
    /** JSON-RPC: method not found. */
    METHOD_NOT_FOUND: -32601,
    /** JSON-RPC: invalid params. */
    INVALID_PARAMS: -32602,
    /** JSON-RPC: internal error. */
    INTERNAL_ERROR: -32603,
} as const;

/** Wire-shaped error: `{code, message}` plus optional flat data. */
export interface IMcpError {
    code: number;
    message: string;
    data?: Record<string, unknown>;
}

/** Structural guard for tool results: distinguishes errors from payloads. */
export function isMcpError(value: unknown): value is IMcpError {
    if (!value || typeof value !== "object") return false;
    const e = value as Partial<IMcpError>;
    return typeof e.code === "number" && typeof e.message === "string";
}

/**
 * Throwable carrier for the application error codes. The device facade
 * throws it; `InProcessDeviceServer.callTool` catches and flattens it
 * into the `{code, message, data}` wire shape.
 */
export class McpToolError extends Error {
    public readonly code: number;
    public readonly data?: Record<string, unknown>;

    public constructor(code: number, message: string, data?: Record<string, unknown>) {
        super(message);
        this.name = "McpToolError";
        this.code = code;
        this.data = data;
    }
}

// ─── Tool params / results ───────────────────────────────────────────────────

/**
 * `diagnostic_load_model`: validated hot-swap of the diagnostic bank
 * (double-bank load: a rejected push leaves the previous model fully
 * active). When the load succeeds AND the device has a buffered gated
 * window, the differential diagnosis runs immediately and the device
 * emits a `diagnostic_result` notification.
 *
 * Model contract: input = the l2-normalized embedding (shape [1, E]),
 * output = one score per entry of `causes`, same order.
 */
export interface IDiagnosticLoadModelParams {
    model_bytes: Uint8Array;
    /** Expected SHA-256 of the bytes; mismatch rejects before parsing. */
    sha256?: string;
    /** Cause names, one per model output score. */
    causes: string[];
    /** Display name stored on the bank (defaults to "diagnostic.onnx"). */
    name?: string;
}

export interface IDiagnosticLoadModelResult {
    ok: boolean;
    sha256: string;
    /** Rejection reason when ok is false; when ok is true and ran is
     *  false, the reason the post-load diagnosis could not complete
     *  (the bank IS swapped in that case: a run failure never
     *  masquerades as a rejected push). */
    error?: string;
    /** True when the diagnosis ran on the buffered window. */
    ran: boolean;
}

/**
 * `diagnostic_run`: on-demand differential diagnosis on the buffered
 * window with the CURRENTLY loaded bank, no byte transfer. The central
 * station calls it instead of re-pushing a bank whose sha256 already
 * matched its last successful push to the device (re-push storm
 * dedup). Emits the same `diagnostic_result` notification as the
 * push-triggers-run leg of `diagnostic_load_model`.
 */
export interface IDiagnosticRunParams {
    /** Cause-name override; defaults to the causes registered with the
     *  loaded bank. */
    causes?: string[];
}

export interface IDiagnosticRunResult {
    ok: boolean;
    /** True when the diagnosis ran on the buffered window. */
    ran: boolean;
    /** Reason when ran is false (no window, no bank, score mismatch). */
    error?: string;
}

/** `regime_current`: point-in-time interrogation (no params). */
export interface IRegimeCurrentResult {
    /** Resolved catalog label, null while the regime is unlabeled. */
    label: string | null;
    /** Session-local cluster index (NEVER a stable identifier). */
    cluster: number;
    k: number;
    distance: number;
    state: IDeviceStatus["state"];
}

/** `catalog_apply_label`: central pushes a label for a regime centroid. */
export interface ICatalogApplyLabelParams {
    label: string;
    /** l2-normalized embedding, the clustering space. */
    centroid: number[];
    diagnosis?: string;
}

export interface ICatalogApplyLabelResult {
    applied: boolean;
    /** Number of locally referenced labels after the apply. */
    labels: number;
}

/** `device_reset`: erasure, the privacy-by-design first-rank operation. */
export interface IDeviceResetParams {
    scope: DeviceResetScope;
    confirm: boolean;
}

export interface IDeviceResetResult {
    erased: string[];
    state: "cold_start";
}

/**
 * `capture_set_profile`: retune the steady-state gate (the coverage vs
 * window-purity trade-off). A preset can be refined by explicit fields;
 * omitted fields are unchanged.
 */
export interface ICaptureSetProfileParams {
    preset?: "nominal" | "balanced" | "max_coverage";
    epsilon?: number;
    settle?: number;
    break_hold?: number;
    ema_alpha?: number;
}

export interface ICaptureSetProfileResult {
    epsilon: number;
    settle: number;
    break_hold: number;
    ema_alpha: number;
}

export type McpToolName = "diagnostic_load_model" | "diagnostic_run" | "regime_current" | "catalog_apply_label" | "device_reset" | "capture_set_profile";

// ─── Notifications (device -> client, never answered) ───────────────────────

export interface IAlarmNotification {
    method: "alarm";
    params: {
        /** NEW_REGIME: open-set discovery (sharp change minted a
         *  profile). REGIME_DRIFT: anchor staircase (slow derangement
         *  of an EXISTING profile, never cold-start suppressed). */
        code: "NEW_REGIME" | "REGIME_DRIFT";
        severity: "warn";
        detail: {
            k: number;
            label: number;
            /** NEW_REGIME: assign distance to the nearest profile.
             *  REGIME_DRIFT: centroid-to-anchor distance (step size). */
            distance: number;
            /** Anchor staircase step number; REGIME_DRIFT only. */
            driftSteps?: number;
            /** l2-normalized embedding of the alarming window. */
            centroid: number[];
        };
    };
}

export interface IDiagnosticResultNotification {
    method: "diagnostic_result";
    params: {
        top_cause: string;
        score: number;
        runner_up: string;
        margin: number;
        scores: Record<string, number>;
        k: number;
        label: number;
        /** Centroid the diagnosis ran on (same space as the alarm's). */
        centroid: number[];
    };
}

export interface ICatalogUpdatedNotification {
    method: "catalog_updated";
    params: {
        label: string;
        labels: number;
    };
}

export interface IStatusNotification {
    method: "status";
    params: IDeviceStatus;
}

export type McpNotification = IAlarmNotification | IDiagnosticResultNotification | ICatalogUpdatedNotification | IStatusNotification;

export type McpNotificationHandler = (notification: McpNotification) => void;

/**
 * Minimal server surface the central station programs against. The
 * in-process implementation below satisfies it; a future serial / MQTT
 * transport would expose the same two methods.
 */
export interface IDeviceServer {
    callTool(name: string, params?: Record<string, unknown>): unknown;
    subscribe(handler: McpNotificationHandler): () => void;
}

// ─── Capture presets ─────────────────────────────────────────────────────────

/**
 * Gate presets, mirroring the api_mcp.md capture trade-off: `nominal`
 * trusts a plateau slowly (purest windows), `balanced` is the default,
 * `max_coverage` opens early and tolerates more ripple.
 */
const CAPTURE_PRESETS: Record<string, { epsilon: number; settle: number; breakHold: number; emaAlpha: number }> = {
    nominal: { epsilon: 0.03, settle: 40, breakHold: 3, emaAlpha: 0.05 },
    balanced: { epsilon: 0.05, settle: 20, breakHold: 3, emaAlpha: 0.05 },
    max_coverage: { epsilon: 0.1, settle: 10, breakHold: 2, emaAlpha: 0.1 },
};

// ─── In-process server ───────────────────────────────────────────────────────

/**
 * Transport-agnostic device server wrapping a MotorwatchDevice. Tool
 * dispatch is synchronous; notifications fan out to every subscriber
 * in subscription order. There is no persistent notification queue
 * (api_mcp.md section 8): a client that reconnects re-reads the state
 * via `regime_current` / `status()`.
 */
export class InProcessDeviceServer implements IDeviceServer {
    private readonly _device: MotorwatchDevice;
    private readonly _subscribers: McpNotificationHandler[] = [];

    public constructor(device: MotorwatchDevice) {
        this._device = device;
        // The device's alarm callback is the single push source; the
        // server reshapes it into the wire notification.
        device.onAlarm((alarm) => {
            this._notify({ method: "alarm", params: alarm });
        });
    }

    public get device(): MotorwatchDevice {
        return this._device;
    }

    public subscribe(handler: McpNotificationHandler): () => void {
        this._subscribers.push(handler);
        return () => {
            const i = this._subscribers.indexOf(handler);
            if (i >= 0) this._subscribers.splice(i, 1);
        };
    }

    /**
     * Dispatch a tool call. Returns the tool result on success or a
     * flat `{code, message, data?}` error object: the transport never
     * has to deal with exceptions.
     */
    public callTool(name: string, params: Record<string, unknown> = {}): unknown {
        try {
            switch (name as McpToolName) {
                case "diagnostic_load_model":
                    return this._diagnosticLoadModel(params);
                case "diagnostic_run":
                    return this._diagnosticRun(params);
                case "regime_current":
                    return this._regimeCurrent();
                case "catalog_apply_label":
                    return this._catalogApplyLabel(params);
                case "device_reset":
                    return this._deviceReset(params);
                case "capture_set_profile":
                    return this._captureSetProfile(params);
                default:
                    return { code: MCP_ERROR.METHOD_NOT_FOUND, message: `unknown tool "${name}"` } satisfies IMcpError;
            }
        } catch (e) {
            if (e instanceof McpToolError) {
                return { code: e.code, message: e.message, data: e.data } satisfies IMcpError;
            }
            return { code: MCP_ERROR.INTERNAL_ERROR, message: e instanceof Error ? e.message : String(e) } satisfies IMcpError;
        }
    }

    // ── Tool implementations ──────────────────────────────────────────

    private _diagnosticLoadModel(params: Record<string, unknown>): IDiagnosticLoadModelResult {
        const p = params as Partial<IDiagnosticLoadModelParams>;
        if (!(p.model_bytes instanceof Uint8Array) || p.model_bytes.length === 0) {
            throw new McpToolError(MCP_ERROR.INVALID_PARAMS, "model_bytes must be a non-empty Uint8Array", { tool: "diagnostic_load_model" });
        }
        if (!Array.isArray(p.causes) || p.causes.length === 0 || !p.causes.every((c) => typeof c === "string" && c.length > 0)) {
            throw new McpToolError(MCP_ERROR.INVALID_PARAMS, "causes must be a non-empty string array", { tool: "diagnostic_load_model" });
        }

        const report = this._device.loadDiagnosticModel(p.model_bytes, {
            sha256: p.sha256,
            causes: p.causes,
            name: p.name,
        });
        if (!report.ok) {
            // A rejected push is a NORMAL outcome of the validated
            // channel, not a protocol error: the previous bank stays
            // active and the caller reads the reason from the report.
            return { ok: false, sha256: report.sha256, error: report.error, ran: false };
        }

        // Push-triggers-run design (the simplest interplay): the freshly
        // loaded model immediately diagnoses the buffered alarming
        // window and the verdict travels as a notification. The run is
        // fenced: the bank swap already happened, so a diagnosis
        // failure (e.g. a dynamic declared dim hiding a score-count
        // mismatch from the static gate) is reported as ok:true /
        // ran:false instead of masquerading as a rejected LOAD.
        const run = this._runDiagnosticAndNotify(p.causes);
        return { ok: true, sha256: report.sha256, ran: run.ran, error: run.error };
    }

    private _diagnosticRun(params: Record<string, unknown>): IDiagnosticRunResult {
        const p = params as Partial<IDiagnosticRunParams>;
        if (p.causes !== undefined && (!Array.isArray(p.causes) || p.causes.length === 0 || !p.causes.every((c) => typeof c === "string" && c.length > 0))) {
            throw new McpToolError(MCP_ERROR.INVALID_PARAMS, "causes must be a non-empty string array when provided", { tool: "diagnostic_run" });
        }
        const run = this._runDiagnosticAndNotify(p.causes);
        return { ok: true, ran: run.ran, error: run.error };
    }

    /**
     * Shared post-load / on-demand diagnosis leg: runs the bank on the
     * buffered window (when one exists) and emits diagnostic_result.
     * Never throws; failures come back as { ran: false, error }.
     */
    private _runDiagnosticAndNotify(causes?: string[]): { ran: boolean; error?: string } {
        if (!this._device.hasEmbedding) {
            return { ran: false };
        }
        try {
            const outcome = this._device.runDiagnostic(causes);
            const status = this._device.status();
            this._notify({
                method: "diagnostic_result",
                params: {
                    top_cause: outcome.topCause,
                    score: outcome.score,
                    runner_up: outcome.runnerUp,
                    margin: outcome.margin,
                    scores: outcome.scores,
                    k: status.k,
                    label: status.lastLabel,
                    centroid: this._device.lastEmbedding ?? [],
                },
            });
            return { ran: true };
        } catch (e) {
            return { ran: false, error: e instanceof Error ? e.message : String(e) };
        }
    }

    private _regimeCurrent(): IRegimeCurrentResult {
        const status = this._device.status();
        const embedding = this._device.lastEmbedding;
        const resolved = embedding ? this._device.labelFor(embedding) : null;
        return {
            label: resolved ? resolved.label : null,
            cluster: status.lastLabel,
            k: status.k,
            distance: status.lastDistance,
            state: status.state,
        };
    }

    private _catalogApplyLabel(params: Record<string, unknown>): ICatalogApplyLabelResult {
        const p = params as Partial<ICatalogApplyLabelParams>;
        if (typeof p.label !== "string" || p.label.length === 0) {
            throw new McpToolError(MCP_ERROR.INVALID_PARAMS, "label must be a non-empty string", { tool: "catalog_apply_label" });
        }
        if (!Array.isArray(p.centroid) || p.centroid.length === 0 || !p.centroid.every((v) => typeof v === "number" && Number.isFinite(v))) {
            throw new McpToolError(MCP_ERROR.INVALID_PARAMS, "centroid must be a non-empty finite number array", { tool: "catalog_apply_label" });
        }
        this._device.applyLabel(p.label, p.centroid);
        const labels = this._device.labelCount;
        this._notify({ method: "catalog_updated", params: { label: p.label, labels } });
        return { applied: true, labels };
    }

    private _deviceReset(params: Record<string, unknown>): IDeviceResetResult {
        const scope = params.scope;
        if (scope !== "profiles" && scope !== "all") {
            throw new McpToolError(MCP_ERROR.INVALID_PARAMS, 'scope must be "profiles" or "all"', { tool: "device_reset" });
        }
        // The device enforces the confirm gate (CONFIRM_REQUIRED).
        const result = this._device.reset(scope, params.confirm === true);
        this._notify({ method: "status", params: this._device.status() });
        return result;
    }

    private _captureSetProfile(params: Record<string, unknown>): ICaptureSetProfileResult {
        const p = params as Partial<ICaptureSetProfileParams>;
        let base: { epsilon?: number; settle?: number; breakHold?: number; emaAlpha?: number } = {};
        if (p.preset !== undefined) {
            const preset = CAPTURE_PRESETS[p.preset];
            if (!preset) {
                throw new McpToolError(MCP_ERROR.INVALID_PARAMS, `unknown preset "${String(p.preset)}"`, { tool: "capture_set_profile" });
            }
            base = { ...preset };
        }
        if (p.epsilon !== undefined) base.epsilon = p.epsilon;
        if (p.settle !== undefined) base.settle = p.settle;
        if (p.break_hold !== undefined) base.breakHold = p.break_hold;
        if (p.ema_alpha !== undefined) base.emaAlpha = p.ema_alpha;

        const effective = this._device.setCaptureProfile(base);
        this._notify({ method: "status", params: this._device.status() });
        return {
            epsilon: effective.epsilon,
            settle: effective.settle,
            break_hold: effective.breakHold,
            ema_alpha: effective.emaAlpha,
        };
    }

    // ── Fan-out ───────────────────────────────────────────────────────

    private _notify(notification: McpNotification): void {
        // Snapshot so a handler that unsubscribes mid-fan-out cannot
        // skip a sibling.
        for (const handler of [...this._subscribers]) {
            handler(notification);
        }
    }
}
