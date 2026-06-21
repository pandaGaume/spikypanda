// ═══════════════════════════════════════════════════════════════════════════
// MotorwatchDevice : the sensor-side facade of the open-set regime
// monitor. Owns a headless dynamic RuntimeGraph:
//
//   SampleSource ─> SteadyStateGate ─> RegimeQuarantine ─> ChannelMux ─>
//   ScalarBuffer ─> Transpose(add_batch_dim) ─>
//   OnnxAdapterKernel(encoder) ─> OnlineClusterNode ─> alarm sink
//
// plus a SECOND OnnxModelGraph (the diagnostic bank) outside the graph,
// hot-swapped at runtime by the central station through the validated
// push channel.
//
// Design notes:
//   - The mux sits between the gate and the buffer so the buffer runs
//     in tensor mode ([1] rows -> [frameSize, 1] frames), giving the
//     rank-2 layout TransposeNode needs to emit the (1, C=1, T) batch
//     the ONNX encoder expects.
//   - Frames must never straddle a regime change: after every fed
//     sample the facade polls the gate's transitionCount and resets the
//     buffer on any steady<->transient edge, dropping the partial frame
//     (the driverv2 "close the window per event" semantic).
//   - HYSTERESIS-LEAK QUARANTINE: the gate's contract intentionally
//     forwards up to breakHold - 1 post-transition samples while its
//     hysteresis confirms the break (see steadystate.node.ts). Resetting
//     the buffer AFTER the edge is detected is too late when a frame
//     boundary lands on one of those leaked samples: the mixed frame is
//     emitted, encoded and clustered in the SAME session.run, minting a
//     phantom regime. The RegimeQuarantineNode between the gate and the
//     mux therefore delays each gated sample until breakHold - 1 newer
//     gated samples exist behind it; on a transition the facade flushes
//     the quarantine (discarding exactly the leaked tail) BEFORE
//     resetting the buffer, restoring the invariant above with the gate
//     untouched. Pure-regime samples are never lost: the leaked tokens
//     are what pushes the last real samples of a segment out of the
//     quarantine.
//   - COLD-START SEMANTIC: the very first profile (k == 1) is the
//     baseline regime, not an anomaly; its creation does NOT raise a
//     device alarm. Every later open-set discovery (k >= 2) raises
//     NEW_REGIME exactly once. So 3 regimes <=> k == 3 and 2 alarms.
//     REGIME_DRIFT alarms (anchor staircase, see the ML cluster node)
//     are NEVER suppressed: slow wear of the baseline is precisely the
//     signal they exist for and it can start while k is still 1.
//   - Labels are referenced locally: applyLabel() stores (centroid,
//     label) pairs so labelFor()/regime_current resolve on-device with
//     no round-trip to the central.
// ═══════════════════════════════════════════════════════════════════════════

import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, IPortDescriptor, ISession, ITensor, RuntimeGraph } from "spikypanda-core";
import { ChannelMuxNode, ScalarBufferNode, SteadyStateGateNode, TransposeNode } from "spikypanda-plugin-dsp";
import { OnlineClusterNode, cosDist, l2norm } from "spikypanda-plugin-ml";
import type { IClusterAlarm } from "spikypanda-plugin-ml";
import { OnnxModelGraph } from "spikypanda-plugin-onnx";
import type { OnnxModelLoadReport } from "spikypanda-plugin-onnx";
import { MCP_ERROR, McpToolError } from "../protocol/mcp";
import type { IAlarmNotification, IDeviceResetResult } from "../protocol/mcp";
import { OnnxAdapterKernel } from "./onnx.adapter.kernel";

// ─── Internal plumbing nodes ─────────────────────────────────────────────────

/**
 * Queue-backed scalar source: feedSample() pushes, the scheduler seeds
 * it once per run tick and fire() drains the queue onto its outgoing
 * channel. Mirrors the TokenSource fixture the dsp suites use, with an
 * external push API instead of a preloaded token list.
 */
class SampleSourceNode extends RuntimeNode {
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "out", optional: false, type: "float", capacity: 8 }];

    private readonly _pending: number[] = [];

    public push(value: number): void {
        this._pending.push(value);
    }

    public override isReady(_session: ISession): boolean {
        return this.enabled && this._pending.length > 0;
    }

    public override reset(_session: ISession): void {
        this._pending.length = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        while (this._pending.length > 0) {
            const value = this._pending.shift();
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== "out" || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, value);
            }
        }
    }
}

/**
 * Hysteresis-leak quarantine (regime-edge frame purity, see header).
 * Sits between the gate's value_gated output and the mux: a gated
 * sample is released downstream only once `depth()` newer gated
 * samples exist behind it, where depth() tracks the gate's live
 * breakHold - 1. The last depth() samples of any steady segment are
 * thus exactly the tokens the gate may have leaked past a regime
 * change; flush() discards them when the facade detects the edge.
 */
class RegimeQuarantineNode extends RuntimeNode {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "in", optional: false, type: "float", capacity: 8 }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "out", optional: false, type: "float", capacity: 8 }];

    private readonly _held: number[] = [];
    private readonly _depth: () => number;

    public constructor(depth: () => number) {
        super();
        this._depth = depth;
    }

    /** Discard the held tail: on a regime edge these are precisely the
     *  post-transition samples the gate leaked while confirming the
     *  break (plus, on an enter edge, the settle-completing sample the
     *  pre-quarantine design dropped through the buffer reset). */
    public flush(): void {
        this._held.length = 0;
    }

    public override reset(_session: ISession): void {
        this._held.length = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Ingest every queued gated sample (single wired input).
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const v = session.consume(idx);
                if (typeof v === "number") this._held.push(v);
            }
        }

        // Release everything older than the quarantine window.
        const depth = Math.max(0, this._depth());
        while (this._held.length > depth) {
            const value = this._held.shift();
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== "out" || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, value);
            }
        }
    }
}

/**
 * Single-input sink: drains every queued token and hands it to the
 * facade callback. One instance per tapped channel keeps the default
 * required-inputs gating trivially correct (one wired slot each).
 */
class TapSinkNode extends RuntimeNode {
    private readonly _onToken: (value: unknown) => void;

    public constructor(onToken: (value: unknown) => void) {
        super();
        this._onToken = onToken;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                this._onToken(session.consume(idx));
            }
        }
    }
}

// ─── Public types ────────────────────────────────────────────────────────────

export type DeviceResetScope = "profiles" | "all";

export interface IMotorwatchGateOptions {
    epsilon?: number;
    settle?: number;
    breakHold?: number;
    emaAlpha?: number;
}

export interface IMotorwatchClusterOptions {
    assignThr?: number;
    updateThr?: number;
    alpha?: number;
    historyMax?: number;
}

export interface IMotorwatchDeviceOptions {
    /** Samples per encoder window (T of the (1, 1, T) input). Default 64. */
    frameSize?: number;
    /** Slide between windows. Default = frameSize (non-overlapping). */
    hopLength?: number;
    gate?: IMotorwatchGateOptions;
    cluster?: IMotorwatchClusterOptions;
    /** Cosine-distance match threshold of the local label map (the
     *  calibrated link threshold). Default 0.06. */
    labelMatchThr?: number;
    deviceId?: string;
}

/** Device alarm payload, identical to the wire notification params. */
export type IDeviceAlarm = IAlarmNotification["params"];

export interface IDiagnosticOutcome {
    topCause: string;
    score: number;
    runnerUp: string;
    margin: number;
    scores: Record<string, number>;
}

export interface ICaptureProfile {
    epsilon: number;
    settle: number;
    breakHold: number;
    emaAlpha: number;
}

export interface IDeviceStatus {
    deviceId: string;
    state: "cold" | "steady" | "transient";
    k: number;
    lastLabel: number;
    lastDistance: number;
    samplesSeen: number;
    windowsSeen: number;
    alarmsRaised: number;
    labelsKnown: number;
    encoder: { loaded: boolean; name: string; dropped: number };
    diagnostic: { loaded: boolean; name: string; causes: string[] };
    capture: ICaptureProfile;
}

export interface IDiagnosticLoadDeviceOptions {
    sha256?: string;
    causes?: string[];
    name?: string;
}

interface ILocalLabelEntry {
    centroid: Float64Array;
    label: string;
}

// ─── Device facade ───────────────────────────────────────────────────────────

export class MotorwatchDevice {
    public readonly deviceId: string;

    private readonly _frameSize: number;
    private readonly _labelMatchThr: number;

    private readonly _graph: RuntimeGraph<RuntimeNode, Channel>;
    private readonly _session: Session;
    private readonly _source: SampleSourceNode;
    private readonly _gate: SteadyStateGateNode;
    private readonly _quarantine: RegimeQuarantineNode;
    private readonly _buffer: ScalarBufferNode;
    private readonly _encoder: OnnxAdapterKernel;
    private readonly _cluster: OnlineClusterNode;

    /** Diagnostic bank: SEPARATE from the encoder, target of the
     *  central station's validated runtime push. */
    private readonly _diag = new OnnxModelGraph();
    private _diagCauses: string[] = [];
    private _diagInputName: string | null = null;
    private _diagOutputName: string | null = null;

    private readonly _alarmHandlers: Array<(alarm: IDeviceAlarm) => void> = [];
    private readonly _labels: ILocalLabelEntry[] = [];

    /** Last gated window, kept buffered for the differential diagnosis. */
    private _lastWindow: ITensor | null = null;
    /** l2-normalized embedding of the last gated window. */
    private _lastEmbedding: Float64Array | null = null;

    private _lastTransitionCount = 0;
    private _samplesSeen = 0;
    private _windowsSeen = 0;
    private _alarmsRaised = 0;

    public constructor(options: IMotorwatchDeviceOptions = {}) {
        this.deviceId = options.deviceId ?? "motorwatch-device";
        this._frameSize = Math.max(2, Math.floor(options.frameSize ?? 64));
        this._labelMatchThr = options.labelMatchThr ?? 0.06;

        this._source = new SampleSourceNode();
        this._gate = new SteadyStateGateNode();
        // Depth tracks the LIVE breakHold (setCaptureProfile can retune
        // it mid-run): the leak the gate may emit is breakHold - 1.
        this._quarantine = new RegimeQuarantineNode(() => this._gate.breakHold - 1);
        const mux = new ChannelMuxNode();
        this._buffer = new ScalarBufferNode();
        const transpose = new TransposeNode();
        this._encoder = new OnnxAdapterKernel();
        this._cluster = new OnlineClusterNode();
        const windowSink = new TapSinkNode((v) => this._onWindow(v));
        const embeddingSink = new TapSinkNode((v) => this._onEmbedding(v));
        const alarmSink = new TapSinkNode((v) => this._onClusterAlarm(v));

        // Editables BEFORE the session is built (reset() reads them).
        if (options.gate?.epsilon !== undefined) this._gate.epsilon = options.gate.epsilon;
        if (options.gate?.settle !== undefined) this._gate.settle = options.gate.settle;
        if (options.gate?.breakHold !== undefined) this._gate.breakHold = options.gate.breakHold;
        if (options.gate?.emaAlpha !== undefined) this._gate.emaAlpha = options.gate.emaAlpha;
        this._buffer.frameSize = this._frameSize;
        this._buffer.hopLength = Math.max(1, Math.floor(options.hopLength ?? this._frameSize));
        transpose.add_batch_dim = true;
        if (options.cluster?.assignThr !== undefined) this._cluster.assign_thr = options.cluster.assignThr;
        if (options.cluster?.updateThr !== undefined) this._cluster.update_thr = options.cluster.updateThr;
        if (options.cluster?.alpha !== undefined) this._cluster.alpha = options.cluster.alpha;
        if (options.cluster?.historyMax !== undefined) this._cluster.history_max = options.cluster.historyMax;

        this._graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(this._source, this._gate, this._quarantine, mux, this._buffer, transpose, this._encoder, this._cluster, windowSink, embeddingSink, alarmSink)
            .withChannel(this._source, this._gate, "out", "value")
            .withChannel(this._gate, this._quarantine, "value_gated", "in")
            .withChannel(this._quarantine, mux, "out", "in_0")
            .withChannel(mux, this._buffer, "frame", "value")
            .withChannel(this._buffer, transpose, "frame", "tensor")
            .withChannel(transpose, this._encoder, "transposed", 0)
            .withChannel(transpose, windowSink, "transposed", "window")
            .withChannel(this._encoder, this._cluster, 0, "embedding")
            .withChannel(this._encoder, embeddingSink, 0, "embedding_tap")
            .withChannel(this._cluster, alarmSink, "alarm", "alarm")
            .build();
        this._session = new Session(this._graph);
        this._lastTransitionCount = this._gate.transitionCount;
    }

    // ── Ingestion ─────────────────────────────────────────────────────

    /** Feed one current sample at (monotonically increasing) time t. */
    public feedSample(value: number, t: number): void {
        this._source.push(value);
        this._session.run(t);
        this._samplesSeen++;

        // Regime-edge hygiene: drop any partial frame the instant the
        // gate flips, so no window ever mixes two regimes (the exact
        // failure mode that spawns spurious in-between profiles). The
        // quarantine is flushed FIRST: it holds exactly the breakHold-1
        // samples the gate may have leaked past the edge, which must
        // never reach the buffer (header invariant).
        const transitions = this._gate.transitionCount;
        if (transitions !== this._lastTransitionCount) {
            this._lastTransitionCount = transitions;
            this._quarantine.flush();
            this._buffer.reset(this._session);
        }
    }

    /** Batch convenience: samples at t0, t0 + dt, t0 + 2 dt, ... */
    public feedSamples(values: ArrayLike<number>, t0 = 0, dt = 1): void {
        for (let i = 0; i < values.length; i++) {
            this.feedSample(values[i], t0 + i * dt);
        }
    }

    // ── Models ────────────────────────────────────────────────────────

    /**
     * Validated encoder load. The declared first input must be the
     * (1, 1, frameSize) window layout the edge chain produces (dynamic
     * dims in the model act as wildcards), with a single output (the
     * embedding).
     */
    public loadEncoder(bytes: Uint8Array | ArrayBuffer, opts: { sha256?: string; name?: string } = {}): OnnxModelLoadReport {
        return this._encoder.load(bytes, {
            name: opts.name ?? "encoder.onnx",
            sha256: opts.sha256,
            expectInputShape: [1, 1, this._frameSize],
            expectOutputCount: 1,
        });
    }

    /**
     * Validated diagnostic-bank load (loadModelValidated passthrough,
     * returning its report). On ANY rejection the previously loaded
     * diagnostic model, its causes and its name stay fully active:
     * besides the single-output check, the declared output shape must
     * be [*, causes.length] (wildcard batch), so a score-dimension
     * mismatch is rejected in the staging step, BEFORE the bank swap
     * (the atomic-push promise of the runtime channel).
     */
    public loadDiagnosticModel(bytes: Uint8Array | ArrayBuffer, opts: IDiagnosticLoadDeviceOptions = {}): OnnxModelLoadReport {
        const causes = opts.causes ?? this._diagCauses;
        const report = this._diag.loadModelValidated(bytes, {
            name: opts.name ?? "diagnostic.onnx",
            sha256: opts.sha256,
            expectOutputCount: 1,
            expectOutputShape: causes.length > 0 ? [0, causes.length] : undefined,
        });
        if (report.ok) {
            this._diagInputName = report.inputNames[0] ?? null;
            this._diagOutputName = report.outputNames[0] ?? null;
            if (opts.causes) this._diagCauses = [...opts.causes];
        }
        return report;
    }

    /**
     * Differential diagnosis on the LAST gated window: feeds the
     * buffered l2-normalized embedding (the clustering space, derived
     * from that window) to the diagnostic bank and ranks the per-cause
     * scores. Throws INVALID_STATE when no model or no window is
     * available yet.
     */
    public runDiagnostic(causes?: string[]): IDiagnosticOutcome {
        const causeNames = causes ?? this._diagCauses;
        if (!this._diag.isLoaded || this._diagInputName === null) {
            throw new McpToolError(MCP_ERROR.INVALID_STATE, "no diagnostic model loaded");
        }
        if (causeNames.length === 0) {
            throw new McpToolError(MCP_ERROR.INVALID_STATE, "no causes registered for the diagnostic model");
        }
        const embedding = this._lastEmbedding;
        if (!embedding) {
            throw new McpToolError(MCP_ERROR.INVALID_STATE, "no gated window has produced an embedding yet");
        }

        const input: ITensor = { data: Float32Array.from(embedding), shape: [1, embedding.length], name: this._diagInputName };
        const results = this._diag.infer(new Map<string, ITensor>([[this._diagInputName, input]]));
        const out = (this._diagOutputName !== null ? results.get(this._diagOutputName) : undefined) ?? results.values().next().value;
        if (!out || out.data.length !== causeNames.length) {
            throw new McpToolError(MCP_ERROR.INVALID_STATE, `diagnostic model returned ${out ? out.data.length : 0} scores for ${causeNames.length} causes`);
        }

        const ranked = causeNames.map((cause, i) => ({ cause, score: out.data[i] })).sort((a, viscousFriction) => viscousFriction.score - a.score);
        const scores: Record<string, number> = {};
        for (const r of ranked) scores[r.cause] = r.score;
        return {
            topCause: ranked[0].cause,
            score: ranked[0].score,
            runnerUp: ranked.length > 1 ? ranked[1].cause : ranked[0].cause,
            margin: ranked.length > 1 ? ranked[0].score - ranked[1].score : ranked[0].score,
            scores,
        };
    }

    // ── Alarms ────────────────────────────────────────────────────────

    /** Subscribe to NEW_REGIME / REGIME_DRIFT alarms; returns the
     *  unsubscribe handle. */
    public onAlarm(handler: (alarm: IDeviceAlarm) => void): () => void {
        this._alarmHandlers.push(handler);
        return () => {
            const i = this._alarmHandlers.indexOf(handler);
            if (i >= 0) this._alarmHandlers.splice(i, 1);
        };
    }

    // ── Local label references ────────────────────────────────────────

    /**
     * Reference a label locally: the next lookups (labelFor,
     * regime_current) resolve on-device. A centroid within the match
     * threshold of an existing reference RELABELS it (the central can
     * refine a diagnosis); anything farther creates a new reference.
     */
    public applyLabel(label: string, centroid: ArrayLike<number>): void {
        const normalized = l2norm(Float64Array.from(centroid as number[]));
        for (const entry of this._labels) {
            if (cosDist(normalized, entry.centroid) <= this._labelMatchThr) {
                entry.label = label;
                return;
            }
        }
        this._labels.push({ centroid: normalized, label });
    }

    /** Resolve an embedding against the local label references. */
    public labelFor(embedding: ArrayLike<number>): { label: string; distance: number } | null {
        if (this._labels.length === 0) return null;
        const normalized = l2norm(Float64Array.from(embedding as number[]));
        let best: ILocalLabelEntry | null = null;
        let bestD = Infinity;
        for (const entry of this._labels) {
            const d = cosDist(normalized, entry.centroid);
            if (d < bestD) {
                bestD = d;
                best = entry;
            }
        }
        return best !== null && bestD <= this._labelMatchThr ? { label: best.label, distance: bestD } : null;
    }

    public get labelCount(): number {
        return this._labels.length;
    }

    // ── Reset / status ────────────────────────────────────────────────

    /**
     * device_reset semantics (api_mcp.md 3.1): destructive, so the
     * confirm flag is mandatory (CONFIRM_REQUIRED otherwise).
     *   - "profiles": erases everything LEARNED FROM THE SIGNAL: the
     *     clusters (centroids + history) AND the buffered last window /
     *     embedding (signal data too, same privacy intent). Local label
     *     references survive (they hold no signal data, they are the
     *     catalog cache).
     *   - "all": full cold start, everything except the loaded models.
     */
    public reset(scope: DeviceResetScope, confirm: boolean): IDeviceResetResult {
        if (confirm !== true) {
            throw new McpToolError(MCP_ERROR.CONFIRM_REQUIRED, "confirm required", { tool: "device_reset", scope });
        }
        if (scope === "profiles") {
            this._cluster.reset(this._session);
            this._lastWindow = null;
            this._lastEmbedding = null;
            return { erased: ["profiles", "windows"], state: "cold_start" };
        }
        if (scope === "all") {
            this._session.reset();
            this._encoder.clearDropped();
            this._labels.length = 0;
            this._lastWindow = null;
            this._lastEmbedding = null;
            this._lastTransitionCount = this._gate.transitionCount;
            this._samplesSeen = 0;
            this._windowsSeen = 0;
            this._alarmsRaised = 0;
            return { erased: ["profiles", "labels", "windows", "capture-state"], state: "cold_start" };
        }
        throw new McpToolError(MCP_ERROR.INVALID_PARAMS, `unknown reset scope "${String(scope)}"`, { tool: "device_reset" });
    }

    /** Retune the steady-state gate; returns the effective profile. */
    public setCaptureProfile(profile: IMotorwatchGateOptions): ICaptureProfile {
        if (profile.epsilon !== undefined) this._gate.epsilon = profile.epsilon;
        if (profile.settle !== undefined) this._gate.settle = profile.settle;
        if (profile.breakHold !== undefined) this._gate.breakHold = profile.breakHold;
        if (profile.emaAlpha !== undefined) this._gate.emaAlpha = profile.emaAlpha;
        return this.captureProfile();
    }

    public captureProfile(): ICaptureProfile {
        return {
            epsilon: this._gate.epsilon,
            settle: this._gate.settle,
            breakHold: this._gate.breakHold,
            emaAlpha: this._gate.emaAlpha,
        };
    }

    public status(): IDeviceStatus {
        return {
            deviceId: this.deviceId,
            state: this._windowsSeen === 0 && this._cluster.k === 0 ? "cold" : this._gate.isSteady ? "steady" : "transient",
            k: this._cluster.k,
            lastLabel: this._cluster.last_label,
            lastDistance: this._cluster.last_distance,
            samplesSeen: this._samplesSeen,
            windowsSeen: this._windowsSeen,
            alarmsRaised: this._alarmsRaised,
            labelsKnown: this._labels.length,
            encoder: { loaded: this._encoder.isLoaded, name: this._encoder.modelName, dropped: this._encoder.dropped },
            diagnostic: { loaded: this._diag.isLoaded, name: this._diag.modelName, causes: [...this._diagCauses] },
            capture: this.captureProfile(),
        };
    }

    /** l2-normalized embedding of the last gated window (plain array
     *  copy, wire-ready), or null before the first window. */
    public get lastEmbedding(): number[] | null {
        return this._lastEmbedding ? Array.from(this._lastEmbedding) : null;
    }

    public get hasEmbedding(): boolean {
        return this._lastEmbedding !== null;
    }

    /** Last gated (1, 1, T) window, buffered for diagnostics. */
    public get lastWindow(): ITensor | null {
        return this._lastWindow;
    }

    // ── Sink callbacks ────────────────────────────────────────────────

    private _onWindow(value: unknown): void {
        const t = value as ITensor;
        if (!t || !(t.data instanceof Float32Array)) return;
        this._lastWindow = t;
        this._windowsSeen++;
    }

    private _onEmbedding(value: unknown): void {
        const t = value as ITensor;
        if (!t || !(t.data instanceof Float32Array)) return;
        this._lastEmbedding = l2norm(Float64Array.from(t.data));
    }

    private _onClusterAlarm(value: unknown): void {
        const raw = value as IClusterAlarm;
        if (!raw || !raw.payload) return;
        if (raw.topic === "REGIME_DRIFT") {
            // Drift alarms are NEVER suppressed (no cold-start gate): a
            // slow derangement of the baseline regime is exactly the
            // boiling-frog signal the cluster anchor exists for, and it
            // legitimately starts while k is still 1.
            this._alarmsRaised++;
            const drift: IDeviceAlarm = {
                code: "REGIME_DRIFT",
                severity: "warn",
                detail: {
                    k: raw.payload.k,
                    label: raw.payload.label,
                    // Centroid-to-anchor distance (staircase step size),
                    // not the assign distance.
                    distance: raw.payload.distance,
                    driftSteps: raw.payload.driftSteps ?? 0,
                    centroid: this.lastEmbedding ?? [],
                },
            };
            for (const handler of [...this._alarmHandlers]) {
                handler(drift);
            }
            return;
        }
        if (raw.topic !== "NEW_REGIME") return;
        // Cold-start suppression (documented semantic, NEW_REGIME only):
        // the first profile is the baseline, not a discovery worth
        // waking the central for.
        if (raw.payload.k <= 1) return;
        this._alarmsRaised++;
        const alarm: IDeviceAlarm = {
            code: "NEW_REGIME",
            severity: "warn",
            detail: {
                k: raw.payload.k,
                label: raw.payload.label,
                distance: raw.payload.distance,
                // The embedding tap fires before the clusterer in the
                // same tick (FIFO scheduler), so this is the alarming
                // window's centroid.
                centroid: this.lastEmbedding ?? [],
            },
        };
        for (const handler of [...this._alarmHandlers]) {
            handler(alarm);
        }
    }
}
