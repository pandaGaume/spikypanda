import type { Channel, IDisposable, Session } from "spikypanda-core";
import type { GraphViewer } from "./components/graph-viewer";
import { buildSessionFromViewer, disposeChannels } from "./graph-session-builder";

export type RunnerState = "idle" | "playing" | "paused";

/**
 * Continuous simulation driver. The UE5-Blueprint analogue of the
 * Event Graph: builds a runtime session once at `play()`, then drives
 * it with `Scheduler.RunDynamic` on a requestAnimationFrame loop until
 * `pause()` or `stop()`. Time advances per frame proportionally to
 * `speed`.
 *
 * For graphs whose purpose is a single pure-data computation (no
 * Sources, no time advance), use `GraphInferrer` instead — it is
 * cheaper (no rAF, no resumable state) and matches that intent
 * semantically.
 *
 * Lifecycle:
 *   - `play()`  builds the session on first call (or after stop),
 *                arms StartNodes, starts the rAF loop.
 *   - `pause()` cancels the loop but keeps the session and `t`.
 *                A subsequent `play()` resumes from where it stopped.
 *   - `stop()`  arms StopNodes, runs one final tick, disposes the
 *                session, resets `t` to 0.
 *   - `step(dt)` advances exactly one tick of `dt` seconds. Bootstraps
 *                the session lazily when called from idle (state ends
 *                up `paused`).
 *
 * The runner rebuilds the runtime graph on each `play()` after a
 * `stop()`. Editing the topology while playing has no effect on the
 * live session until the next stop/play cycle.
 */
export class GraphRunner implements IDisposable {
    public state: RunnerState = "idle";
    public speed: number = 1;
    public t: number = 0;

    public onTime: ((t: number) => void) | null = null;
    public onStateChanged: ((state: RunnerState) => void) | null = null;
    public onError: ((error: Error) => void) | null = null;

    private readonly _viewer: GraphViewer;
    private _session: Session | null = null;
    private _channels: Channel[] = [];
    private _rafId: number | null = null;
    private _lastFrameMs: number = 0;
    private _disposed = false;

    public constructor(viewer: GraphViewer) {
        this._viewer = viewer;
    }

    public setSpeed(speed: number): void {
        if (!Number.isFinite(speed) || speed < 0) return;
        this.speed = speed;
    }

    public play(): void {
        if (this._disposed) return;
        if (this.state === "playing") return;

        if (this.state === "idle") {
            if (!this._bootstrapSession()) return;
            this.t = 0;
        }
        this._setState("playing");
        this._lastFrameMs = performance.now();
        this._loop();
    }

    public pause(): void {
        if (this.state !== "playing") return;
        this._cancelLoop();
        this._setState("paused");
    }

    public stop(): void {
        if (this.state === "idle") return;
        this._cancelLoop();
        if (this._session) {
            try {
                this._session.stop();
                this._session.run(this.t);
            } catch (e) {
                this._emitError(e);
            }
        }
        this._tearDownSession();
        this.t = 0;
        if (this.onTime) this.onTime(this.t);
        this._setState("idle");
    }

    public step(dt: number): void {
        if (this._disposed) return;
        if (this.state === "idle") {
            if (!this._bootstrapSession()) return;
            this._setState("paused");
        }
        try {
            this.t += dt;
            this._session!.run(this.t);
        } catch (e) {
            this._emitError(e);
            return;
        }
        if (this.onTime) this.onTime(this.t);
    }

    public dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this._cancelLoop();
        this._tearDownSession();
        this.onTime = null;
        this.onStateChanged = null;
        this.onError = null;
    }

    private _bootstrapSession(): boolean {
        try {
            const built = buildSessionFromViewer(this._viewer);
            this._session = built.session;
            this._channels = built.channels;
            this._session.start();
            return true;
        } catch (e) {
            this._emitError(e);
            this._tearDownSession();
            return false;
        }
    }

    private _loop(): void {
        const tick = (): void => {
            this._rafId = null;
            if (this.state !== "playing" || !this._session) return;
            const now = performance.now();
            const dtMs = now - this._lastFrameMs;
            this._lastFrameMs = now;
            const dt = (dtMs / 1000) * this.speed;
            this.t += dt;
            try {
                this._session.run(this.t);
            } catch (e) {
                this._emitError(e);
                return;
            }
            if (this.onTime) this.onTime(this.t);
            this._rafId = requestAnimationFrame(tick);
        };
        this._rafId = requestAnimationFrame(tick);
    }

    private _cancelLoop(): void {
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    private _tearDownSession(): void {
        disposeChannels(this._channels);
        this._channels = [];
        this._session = null;
    }

    private _setState(next: RunnerState): void {
        if (this.state === next) return;
        this.state = next;
        if (this.onStateChanged) this.onStateChanged(next);
    }

    private _emitError(e: unknown): void {
        const err = e instanceof Error ? e : new Error(String(e));
        if (this.onError) this.onError(err);
        else console.error("[GraphRunner]", err);
    }
}
