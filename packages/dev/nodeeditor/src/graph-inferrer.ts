import type { IDisposable } from "spikypanda-core";
import type { GraphViewer } from "./components/graph-viewer";
import { buildSessionFromViewer, disposeChannels } from "./graph-session-builder";

/**
 * One-shot graph evaluator. The UE5-Blueprint analogue of the
 * Construction Script: build a runtime session over the current
 * editor state, fire a single wave through the scheduler, expose
 * the result via the model nodes' own properties, then tear down.
 *
 * No loop, no clock, no rAF, no resumable state — every call to
 * `runOnce()` builds a fresh session and disposes it before returning.
 * Node instances are persistent, so any state they hold (a counter, a
 * cached buffer) survives across `runOnce` calls; that mutation is the
 * caller's responsibility, not the inferrer's.
 *
 * Use this for graphs whose purpose is a pure computation: derive a
 * matrix from position+rotation, evaluate an ONNX model, compute a
 * layout. Use `GraphRunner` instead for continuous simulation where
 * time advances and Source nodes emit at every tick.
 *
 * The implementation arms StartNodes / StopNodes around the single
 * `run(t)` call so any Source / Runnable wired to `_started` /
 * `_stopped` triggers also fires once.
 */
export class GraphInferrer implements IDisposable {
    public onError: ((error: Error) => void) | null = null;
    public onDone: ((t: number) => void) | null = null;

    private readonly _viewer: GraphViewer;
    private _disposed = false;

    public constructor(viewer: GraphViewer) {
        this._viewer = viewer;
    }

    /** Fire a single wave through the graph at time `t`. */
    public runOnce(t: number = 0): void {
        if (this._disposed) return;
        let session;
        let channels;
        try {
            ({ session, channels } = buildSessionFromViewer(this._viewer));
        } catch (e) {
            this._emitError(e);
            return;
        }
        try {
            // Arm Start → run → arm Stop → run. The two run() calls
            // flank start/stop so any node listening to _started /
            // _stopped triggers gets exactly one firing of each.
            session.start();
            session.run(t);
            session.stop();
            session.run(t);
        } catch (e) {
            this._emitError(e);
        } finally {
            disposeChannels(channels);
        }
        if (this.onDone) this.onDone(t);
    }

    public dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this.onError = null;
        this.onDone = null;
    }

    private _emitError(e: unknown): void {
        const err = e instanceof Error ? e : new Error(String(e));
        if (this.onError) this.onError(err);
        else console.error("[GraphInferrer]", err);
    }
}
