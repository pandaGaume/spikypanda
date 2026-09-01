import { hasSampleRateRequirement } from "spikypanda-core";
import type { Channel, IDisposable, ISession, Session } from "spikypanda-core";
import type { GraphViewer } from "./components/graph-viewer";
import { buildSessionFromViewer, disposeChannels } from "./graph-session-builder";

/**
 * Local copy of `SimGraphNode._aggregateRequiredHzFromSession` to keep
 * the runner from pulling the full SimGraphNode (and its scene-state-view
 * dependency chain) into the nodeeditor bundle. Same semantics: walk the
 * session's leaves, take `max(requiredHz)` over IHasSampleRateRequirement
 * implementers, return 0 when no one opts in. The caller floors at
 * MIN_EFFECTIVE_HZ.
 */
function aggregateRequiredHz(session: ISession): number {
    const nodes = session.graph?.nodes;
    if (!nodes || nodes.length === 0) return 0;
    let max = 0;
    for (const node of nodes) {
        if (hasSampleRateRequirement(node) && node.requiredHz > max) {
            max = node.requiredHz;
        }
    }
    return max;
}

/** MIN_EFFECTIVE_HZ value mirrored from core/sim/scene-state-view.interface.
 *  Kept as a plain number here to avoid pulling the Frequency Quantity +
 *  the scene-state-view chain into the nodeeditor bundle. */
const MIN_EFFECTIVE_HZ_VALUE = 60;

export type RunnerState = "idle" | "playing" | "paused";

/**
 * Tick-scheduling modulationStrategy.
 *
 *   "free"            One sim tick per rAF, dt = wall-clock elapsed × speed.
 *                     Easy and synchronous with the display refresh, but
 *                     dt JITTERS (rAF is ±4 ms even on a stable display)
 *                     and DROPS (tab in background may go from 60 fps to
 *                     1 fps). Unusable for deterministic simulation, fine
 *                     for casual visualisation.
 *
 *   "fixed-realtime"  N sim ticks per rAF, all of dt = 1/simRate (× speed).
 *                     N is chosen so the SIM time tracks the WALL time on
 *                     average — a wall-time accumulator absorbs the rAF
 *                     jitter without distorting any individual dt. Each
 *                     fire() sees a perfectly constant dt, so MCSA / PID /
 *                     motor integration are deterministic and reproducible.
 *                     N is capped at `maxTicksPerFrame` to keep the rAF
 *                     callback bounded when the tab returns to foreground
 *                     after being throttled.
 */
export type RunnerMode = "free" | "fixed-realtime";

/**
 * Continuous simulation driver. The UE5-Blueprint analogue of the
 * Event Graph: builds a runtime session once at `play()`, then drives
 * it with `Scheduler.RunDynamic` on a requestAnimationFrame loop until
 * `pause()` or `stop()`. Time advances per frame proportionally to
 * `speed`.
 *
 * For deterministic simulation (motor physics, PID control, MCSA),
 * set `mode = "fixed-realtime"` and a high `simRate` (e.g. 10000 Hz).
 * The rAF loop will then run `wall_dt × simRate` ticks of constant
 * `1/simRate` dt per frame, decoupling the simulation cadence from
 * the browser's display jitter.
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

    /**
     * Scheduling modulationStrategy. Derived at `_bootstrapSession()` from the
     * graph's leaves:
     *   - "fixed-realtime" when at least one IHasSampleRateRequirement
     *     leaf opts in (SimGraphNode._aggregateRequiredHzFromSession
     *     returns > 0). simRate is set to that aggregate.
     *   - "free" otherwise.
     *
     * The user does NOT pick this from the toolbar anymore (P8 + the
     * 2026-06-09 auto-derivation pass): rates are declarative on the
     * leaves themselves. Override per-leaf via `requiredSampleRateHz` on the
     * node's property panel.
     */
    public mode: RunnerMode = "free";

    /**
     * Target sim tick rate in Hz when `mode === "fixed-realtime"`.
     * Each rAF runs ≈ `wall_dt × simRate` ticks of `1/simRate` dt.
     * Auto-derived from the graph: `max(leaf.requiredHz)` floored at
     * `MIN_EFFECTIVE_HZ = 60 Hz`. Typical end-to-end values:
     *   60   — pure-data graph with no opt-in leaves (would be free-mode)
     *   100  — atmosphere-only habitat
     *   10000 — atmosphere + DC motor (L=1mH R=1Ω → 10 kHz)
     *   200000 — motor + PWM inverter (pwmFrequency = 10 kHz → 20×)
     * Ignored in "free" mode. Read-only consequence of the graph
     * topology + per-leaf requiredSampleRateHz editables.
     */
    public simRate: number = 1000;

    /**
     * Hard cap on ticks executed in a single rAF callback when in
     * fixed-realtime mode. When the tab returns to foreground after
     * throttling, `wall_dt` can jump to seconds and uncapped catch-up
     * would freeze the browser. Excess accumulator is discarded — the
     * simulation "skips" the missing time rather than burning CPU.
     */
    public maxTicksPerFrame: number = 5000;

    public onTime: ((t: number) => void) | null = null;
    public onStateChanged: ((state: RunnerState) => void) | null = null;
    public onError: ((error: Error) => void) | null = null;
    /**
     * Fired once per bootstrap when the runner has resolved its mode +
     * simRate from the graph. The toolbar uses this to display a read-only
     * readout (e.g. "10 kHz" or "free") instead of letting the user pick.
     */
    public onRateDerived: ((mode: RunnerMode, simRate: number) => void) | null = null;

    private readonly _viewer: GraphViewer;
    private _session: Session | null = null;
    private _channels: Channel[] = [];
    private _rafId: number | null = null;
    private _lastFrameMs: number = 0;
    private _disposed = false;
    /** Wall-time accumulator for fixed-realtime scheduling (seconds). */
    private _accumulator: number = 0;

    public constructor(viewer: GraphViewer) {
        this._viewer = viewer;
    }

    /**
     * The live session, or null while the runner is idle.
     *
     * Read-only on purpose: the runner owns the session's lifecycle, builds it
     * in `_bootstrapSession` and tears it down in `_tearDownSession`. Exposing
     * it lets an out-of-band observer (the MCP controller, a probe, a test)
     * read ports and drive steps against the session the editor is actually
     * showing, instead of calling `buildSessionFromViewer` again and ending up
     * with a second graph that no view reflects.
     */
    public get session(): Session | null {
        return this._session;
    }

    /** The viewer this runner draws its graph from. */
    public get viewer(): GraphViewer {
        return this._viewer;
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
        // Mark the session as live BEFORE the loop kicks off so the very
        // first fire()/repaint() pair sees session.running === true.
        // Pause→play also lands here without a fresh bootstrap, so the
        // assignment runs every transition into "playing".
        if (this._session) this._session.running = true;
        this._setState("playing");
        this._lastFrameMs = performance.now();
        // Reset the fixed-step accumulator on every play to avoid
        // dumping a backlog of unconsumed wall-time into the first
        // frame after a long pause.
        this._accumulator = 0;
        this._loop();
    }

    public pause(): void {
        if (this.state !== "playing") return;
        this._cancelLoop();
        // Clear the play-state flag so any node querying session.running
        // (Markdown cells, recorders, …) sees the pause immediately —
        // before any further repaint() or property-panel interaction.
        if (this._session) this._session.running = false;
        this._setState("paused");
    }

    public stop(): void {
        if (this.state === "idle") return;
        this._cancelLoop();
        if (this._session) {
            // Pre-clear the flag so nodes that get one final fire()
            // through the session.run() below (e.g. StopNode reactions)
            // see running=false and treat that tick as the wind-down,
            // not as continued playback.
            this._session.running = false;
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
        this.onRateDerived = null;
    }

    private _bootstrapSession(): boolean {
        try {
            const built = buildSessionFromViewer(this._viewer);
            this._session = built.session;
            this._channels = built.channels;
            // Auto-derive mode + simRate from the graph's IHasSampleRateRequirement
            // leaves. Replaces the legacy toolbar dropdown (dropped 2026-06-09
            // with P8 follow-up). When no leaf opts in, fall back to free
            // mode and let the rAF cadence drive the simulation. When at
            // least one opts in, switch to fixed-realtime so the dt seen
            // by every fire() is deterministic.
            //
            // We use the local `aggregateRequiredHz` helper rather than
            // SimGraphNode's static method to avoid pulling the whole
            // SimGraphNode + scene-state-view dependency chain into the
            // nodeeditor bundle. The semantics are identical.
            const aggregated = aggregateRequiredHz(this._session);
            if (aggregated > 0) {
                this.mode = "fixed-realtime";
                this.simRate = Math.max(MIN_EFFECTIVE_HZ_VALUE, aggregated);
            } else {
                this.mode = "free";
            }
            // Publish the authoritative sample rate to the session so
            // downstream consumers (FFT spectrum / waterfall tiles, any
            // sampleRate-dependent op) can read a single source of truth
            // instead of being configured per-instance. Free mode = 0
            // (unknown/jittered); fixed-realtime = our simRate.
            this._session.simRate = this.mode === "fixed-realtime" ? this.simRate : 0;
            this._session.start();
            // Surface the picked rate to UI listeners (toolbar readout)
            // so the user sees what was derived rather than guessing.
            if (this.onRateDerived) this.onRateDerived(this.mode, this.simRate);
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
            const wallDt = ((now - this._lastFrameMs) / 1000) * this.speed;
            this._lastFrameMs = now;

            try {
                if (this.mode === "fixed-realtime") {
                    this._runFixedStep(wallDt);
                } else {
                    this._runFree(wallDt);
                }
            } catch (e) {
                // Transition to "paused" rather than silently exiting
                // the rAF loop. Without this, the state stays "playing"
                // and a subsequent `play()` call short-circuits via the
                // early-return guard, leaving the user with a dead
                // runtime they can't recover from without a page reload.
                if (this._session) this._session.running = false;
                this._emitError(e);
                this._setState("paused");
                return;
            }
            if (this.onTime) this.onTime(this.t);
            this._rafId = requestAnimationFrame(tick);
        };
        this._rafId = requestAnimationFrame(tick);
    }

    /**
     * Free-running mode: one tick per rAF, dt = wall-clock elapsed.
     * Carries the historical behaviour. dt is whatever the browser
     * gives us — typically 16.6 ms ± 4 ms on a 60Hz display, but
     * arbitrarily large after a tab unfreeze. NOT deterministic.
     */
    private _runFree(wallDt: number): void {
        // In free mode there's no deterministic sample rate (rAF
        // jitters). Publish 0 so downstream consumers fall back to
        // unit-less display (bin index for FFT viz, etc.).
        if (this._session && this._session.simRate !== 0) {
            this._session.simRate = 0;
        }
        this.t += wallDt;
        this._session!.run(this.t);
    }

    /**
     * Fixed-step mode: run as many ticks as fit in `wallDt` at the
     * configured `simRate`. Each tick advances `this.t` by exactly
     * `simDt = 1/simRate` and calls `session.run(this.t)`. The remainder
     * of wallDt that doesn't fit a full simDt is kept in `_accumulator`
     * and carried into the next rAF, so on average the simulation
     * tracks wall time without ever distorting any single dt.
     *
     * Anti-freeze guard: when wallDt is much larger than a single rAF
     * tick (tab returns from background after seconds of throttling),
     * we cap the burst at `maxTicksPerFrame` and discard the rest of
     * the accumulator. The alternative — catching up faithfully —
     * would lock the browser for tens of seconds at 10 kHz.
     */
    private _runFixedStep(wallDt: number): void {
        const simDt = 1 / Math.max(1, this.simRate);
        // Keep the session's authoritative rate in sync with the
        // runner's: the user may flip simRate mid-play, downstream
        // viz/DSP nodes need to pick up the new value on the next tick.
        if (this._session && this._session.simRate !== this.simRate) {
            this._session.simRate = this.simRate;
        }
        this._accumulator += wallDt;
        let ticks = Math.floor(this._accumulator / simDt);
        if (ticks <= 0) return;
        if (ticks > this.maxTicksPerFrame) {
            ticks = this.maxTicksPerFrame;
            this._accumulator = 0;
        } else {
            this._accumulator -= ticks * simDt;
        }
        for (let i = 0; i < ticks; i++) {
            this.t += simDt;
            this._session!.run(this.t);
        }
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
