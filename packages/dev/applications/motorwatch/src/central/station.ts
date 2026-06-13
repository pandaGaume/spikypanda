// ═══════════════════════════════════════════════════════════════════════════
// CentralStation : the labeling authority of the regime-monitoring loop.
//
// Connected to a device server, the station closes the discovery loop:
//
//   1. device raises NEW_REGIME (open-set discovery, centroid in the
//      alarm detail);
//   2. if the catalog already knows the centroid, the label is pushed
//      straight back (no diagnostic round: reconnections and sibling
//      devices converge for free);
//   3. otherwise the station pushes the registered diagnostic ONNX
//      model AT RUNTIME (diagnostic_load_model, validated hot-swap);
//      the device runs the differential diagnosis on the alarming
//      window and answers with a diagnostic_result notification;
//   4. the station derives the label: topCause when the score margin
//      clears `labelMargin`, else "regime_<k>_unlabeled";
//   5. the label is applied BOTH centrally (catalog.applyLabel) and on
//      the device (catalog_apply_label), so labelFor() resolves locally
//      from then on.
//
// All of this is synchronous in-process plumbing: the notification
// handlers re-enter callTool, which is explicitly supported by the
// InProcessDeviceServer contract.
// ═══════════════════════════════════════════════════════════════════════════

import { sha256Hex } from "spikypanda-plugin-onnx";
import { isMcpError } from "../protocol/mcp";
import type { IAlarmNotification, IDeviceServer, IDiagnosticLoadModelResult, IDiagnosticResultNotification, IDiagnosticRunResult, McpNotification } from "../protocol/mcp";
import { RegimeCatalog } from "./regime.catalog";

export interface IDiagnosticBank {
    bytes: Uint8Array;
    sha256?: string;
    causes: string[];
    name?: string;
}

export interface IHandledAlarm {
    alarm: IAlarmNotification["params"];
    diagnostic?: IDiagnosticResultNotification["params"];
    label?: string;
    /** True when the label came from the catalog without a diagnostic. */
    fromCatalog?: boolean;
    error?: string;
}

export interface ICentralStationOptions {
    /** Minimum top-vs-runner-up score margin to trust the diagnosis. */
    labelMargin?: number;
    /** Catalog match threshold (calibrated link cut). */
    matchThr?: number;
    /** Alarm-history ring capacity (oldest evicted first). Default 256. */
    historyMax?: number;
}

export const DEFAULT_DIAGNOSTIC_KEY = "default";

export class CentralStation {
    public readonly site: string;
    public readonly catalog: RegimeCatalog;

    /** Below this margin the diagnosis is ambiguous: the regime gets a
     *  placeholder label until an operator (or a better model) decides. */
    public labelMargin: number;

    private readonly _banks = new Map<string, IDiagnosticBank>();
    private readonly _history: IHandledAlarm[] = [];
    private _pending: IHandledAlarm | null = null;
    private _historyMax: number;
    /** Last sha256 SUCCESSFULLY pushed to each connected device (the
     *  byte-push dedup key; repeated alarms re-RUN, they never re-SEND). */
    private readonly _lastPushedSha = new Map<IDeviceServer, string>();
    private _pushedCount = 0;

    public constructor(site: string, options: ICentralStationOptions = {}) {
        this.site = site;
        this.catalog = new RegimeCatalog(site, { matchThr: options.matchThr });
        this.labelMargin = options.labelMargin ?? 0.25;
        this._historyMax = Math.max(1, Math.floor(options.historyMax ?? 256));
    }

    /** Chronological record of the handled NEW_REGIME alarms, capped as
     *  a ring of `historyMax` entries (oldest evicted first). */
    public get history(): ReadonlyArray<IHandledAlarm> {
        return this._history;
    }

    /** Alarm-history ring capacity; shrinking it evicts immediately. */
    public get historyMax(): number {
        return this._historyMax;
    }
    public set historyMax(v: number) {
        this._historyMax = Math.max(1, Math.floor(v));
        this._trimHistory();
    }

    /** Number of diagnostic byte pushes actually sent (observability:
     *  a healthy loop pushes once per device per bank version). */
    public get pushedCount(): number {
        return this._pushedCount;
    }

    /**
     * Register a diagnostic model bank under a cause-set key. The
     * "default" bank is the one pushed on NEW_REGIME alarms. The sha256
     * is the dedup key of the push channel, so it is computed at
     * registration when the caller did not provide one.
     */
    public registerDiagnostic(key: string, bank: IDiagnosticBank): void {
        this._banks.set(key, { ...bank, causes: [...bank.causes], sha256: bank.sha256 ?? sha256Hex(bank.bytes) });
    }

    public getDiagnostic(key: string = DEFAULT_DIAGNOSTIC_KEY): IDiagnosticBank | undefined {
        return this._banks.get(key);
    }

    /** Subscribe to a device server; returns the disconnect handle. */
    public connect(server: IDeviceServer): () => void {
        return server.subscribe((notification) => this._onNotification(server, notification));
    }

    // ── Notification routing ──────────────────────────────────────────

    private _onNotification(server: IDeviceServer, notification: McpNotification): void {
        if (notification.method === "alarm") {
            this._onAlarm(server, notification.params);
        } else if (notification.method === "diagnostic_result") {
            this._onDiagnosticResult(server, notification.params);
        }
        // catalog_updated / status are device-side echoes: recorded
        // nowhere, the catalog is the source of truth on this side.
    }

    private _onAlarm(server: IDeviceServer, alarm: IAlarmNotification["params"]): void {
        if (alarm.code !== "NEW_REGIME") return;
        const handled: IHandledAlarm = { alarm };
        this._history.push(handled);
        this._trimHistory();

        // Fast path: a sibling site (or an earlier session) already
        // labeled this regime; reference it on the device directly.
        const known = alarm.detail.centroid.length > 0 ? this.catalog.lookup(alarm.detail.centroid) : null;
        if (known) {
            handled.label = known.label;
            handled.fromCatalog = true;
            this.catalog.applyLabel(alarm.detail.centroid, known.label, known.entry.diagnosis, this.site);
            server.callTool("catalog_apply_label", { label: known.label, centroid: alarm.detail.centroid, diagnosis: known.entry.diagnosis });
            return;
        }

        const bank = this._banks.get(DEFAULT_DIAGNOSTIC_KEY);
        if (!bank) {
            handled.error = "no diagnostic bank registered";
            return;
        }

        // Runtime model push, deduplicated per device: when this bank's
        // sha256 already matched the LAST SUCCESSFUL push to this
        // server, the bytes are NOT re-sent (repeated alarms must not
        // become a re-push storm); the device re-runs the diagnosis on
        // its loaded bank through diagnostic_run instead. Either way
        // the device emits diagnostic_result, which re-enters
        // _onNotification synchronously BEFORE callTool returns; the
        // _pending slot links the two legs.
        const bankSha = bank.sha256 !== undefined ? bank.sha256.toLowerCase() : undefined;
        const alreadyPushed = bankSha !== undefined && this._lastPushedSha.get(server) === bankSha;

        this._pending = handled;
        let result: unknown;
        if (alreadyPushed) {
            result = server.callTool("diagnostic_run", { causes: bank.causes });
        } else {
            this._pushedCount++;
            result = server.callTool("diagnostic_load_model", {
                model_bytes: bank.bytes,
                sha256: bank.sha256,
                causes: bank.causes,
                name: bank.name,
            });
        }
        this._pending = null;
        if (isMcpError(result)) {
            handled.error = result.message;
            return;
        }
        if (alreadyPushed) {
            const report = result as IDiagnosticRunResult;
            if (!report.ok) {
                handled.error = report.error ?? "diagnostic run failed";
            } else if (!report.ran) {
                handled.error = report.error ?? "device had no buffered window to diagnose";
            }
            return;
        }
        const report = result as IDiagnosticLoadModelResult;
        if (!report.ok) {
            handled.error = report.error ?? "diagnostic model rejected";
            return;
        }
        this._lastPushedSha.set(server, report.sha256.toLowerCase());
        if (!report.ran) {
            handled.error = report.error ?? "device had no buffered window to diagnose";
        }
    }

    /** Enforce the history ring bound (oldest entries evicted first). */
    private _trimHistory(): void {
        while (this._history.length > this._historyMax) {
            this._history.shift();
        }
    }

    private _onDiagnosticResult(server: IDeviceServer, result: IDiagnosticResultNotification["params"]): void {
        const handled = this._pending ?? this._history[this._history.length - 1];
        if (!handled) return;
        handled.diagnostic = result;

        const label = result.margin >= this.labelMargin ? result.top_cause : `regime_${result.k}_unlabeled`;
        handled.label = label;

        const centroid = result.centroid.length > 0 ? result.centroid : handled.alarm.detail.centroid;
        if (centroid.length === 0) {
            handled.error = "no centroid available to label";
            return;
        }

        // Apply BOTH sides: centrally (federation source of truth) and
        // on the device (local reference, labelFor resolves offline).
        this.catalog.applyLabel(centroid, label, result.top_cause, this.site);
        const applied = server.callTool("catalog_apply_label", { label, centroid, diagnosis: result.top_cause });
        if (isMcpError(applied)) {
            handled.error = applied.message;
        }
    }
}
