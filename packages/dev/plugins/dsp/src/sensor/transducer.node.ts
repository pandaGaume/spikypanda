import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * `Helios.Sensor:transducer` — generic sensor wrapper that turns a clean
 * "ground-truth" scalar into a realistic measurement stream: bandwidth-
 * limited, noisy, quantized, and slowly drifting. Compose with a domain
 * unit (Hz, deg-C, bar, ...) in the property panel to ship a specific
 * sensor preset without duplicating the math.
 *
 * Pipeline (applied each fire, in this exact order):
 *
 *     true ──► LPF (1-pole IIR) ──► + Gaussian noise ──► quantize ──► + drift = measured
 *
 * Each stage is independently disable-able by leaving the corresponding
 * editable at its neutral value (cutoff = +inf bypasses the LPF in the
 * sense that alpha collapses to 1; noiseStdev = 0 skips noise; step = 0
 * skips quantization; driftPerSec = 0 freezes the drift accumulator).
 *
 * Editables (used when no wire overrides them; currently all are pure
 * editables since the physics-side parameters rarely live-modulate):
 *
 *   cutoffHz          1-pole LPF corner frequency in Hz       (default 50)
 *   noiseStdev        std-dev of additive Gaussian noise       (default 0.01)
 *   quantizationStep  ADC step; 0 disables quantization        (default 0)
 *   driftPerSec       linear drift in units / second           (default 0)
 *
 * Inputs:
 *   value   required, the "true" physical value at this tick.
 *   t       optional, current sim time in seconds. Used to compute the
 *           per-fire `dt` for both the LPF time-constant and the drift
 *           accumulator. If absent, falls back to a constant 0.01 s
 *           assumption (typical 100 Hz inner loop). Wire Clock.t for a
 *           physically meaningful response.
 *
 * Outputs:
 *   measured   float; the realistic noisy/lagged/quantized/drifted output.
 *
 * Internals:
 *   - LPF: discrete 1-pole IIR with `alpha = dt / (tau + dt)` where
 *     `tau = 1 / (2π·cutoffHz)`. State = previous filter output.
 *   - Noise: Box-Muller transform on `Math.random()`. NOTE for V2: a
 *     seeded RNG fed by `Helios.Sim:rng-seed` would make the measurement
 *     stream reproducible across runs; currently nondeterministic.
 *   - Quantization: `round(value / step) * step` if step > 0.
 *   - Drift: cumulative `Σ driftPerSec · dt_i` added at the end.
 *
 * Viewables:
 *   lastMeasured     most recent published measurement.
 *   effectiveDt      the dt used at the last fire (debug for time wiring).
 *   currentDrift     the cumulative drift offset right now.
 */
export class TransducerNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "value", optional: false, type: "float" },
        { slot: "t", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "measured", optional: false, type: "float" }];

    // ── Editables ──────────────────────────────────────────────────────
    @cloneable private _cutoffHz: number = 50;
    @cloneable private _noiseStdev: number = 0.01;
    @cloneable private _quantizationStep: number = 0;
    @cloneable private _driftPerSec: number = 0;

    // Fallback dt when no `t` wire is present. 100 Hz is the typical inner
    // sim loop; it's a deliberate constant rather than a magic number
    // pulled from the editor so the node behaves predictably in isolation
    // (unit tests without a Clock, headless graph evaluations, etc.).
    private static readonly _FALLBACK_DT_S = 0.01;

    // ── Runtime state (reset on session.reset()) ──────────────────────
    private _lpfState: number = 0;
    private _lpfPrimed: boolean = false; // first fire latches the input
    private _lastT: number | null = null;
    private _currentDrift: number = 0;
    private _effectiveDt: number = TransducerNode._FALLBACK_DT_S;
    private _lastMeasured: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number", { unit: "Hz" })
    public get cutoffHz(): number {
        return this._cutoffHz;
    }
    public set cutoffHz(v: number) {
        // Clamp to a strictly positive value: cutoff = 0 would make tau
        // infinite and alpha = 0, freezing the filter on its initial
        // state forever (a confusing UX). 1e-6 is effectively "off" for
        // any realistic sample rate, while still keeping the math sane.
        const next = Math.max(1e-6, v);
        this.setField("cutoffHz", this._cutoffHz, next, (n) => {
            this._cutoffHz = n;
        });
    }

    @editable("number")
    public get noiseStdev(): number {
        return this._noiseStdev;
    }
    public set noiseStdev(v: number) {
        const next = Math.max(0, v);
        this.setField("noiseStdev", this._noiseStdev, next, (n) => {
            this._noiseStdev = n;
        });
    }

    @editable("number")
    public get quantizationStep(): number {
        return this._quantizationStep;
    }
    public set quantizationStep(v: number) {
        const next = Math.max(0, v);
        this.setField("quantizationStep", this._quantizationStep, next, (n) => {
            this._quantizationStep = n;
        });
    }

    @editable("number", { unit: "units/s" })
    public get driftPerSec(): number {
        return this._driftPerSec;
    }
    public set driftPerSec(v: number) {
        this.setField("driftPerSec", this._driftPerSec, v, (n) => {
            this._driftPerSec = n;
        });
    }

    /** Most recent published measurement — quick sanity check in panel. */
    @viewable("number") public get lastMeasured(): number {
        return this._lastMeasured;
    }

    /** The dt used at the last fire (either `t - lastT` or the fallback).
     *  Useful for diagnosing whether the `t` wire is connected. */
    @viewable("number") public get effectiveDt(): number {
        return this._effectiveDt;
    }

    /** Cumulative drift offset added to the measurement so far. */
    @viewable("number") public get currentDrift(): number {
        return this._currentDrift;
    }

    public override reset(_session: ISession): void {
        this._lpfState = 0;
        this._lpfPrimed = false;
        this._lastT = null;
        this._currentDrift = 0;
        this._effectiveDt = TransducerNode._FALLBACK_DT_S;
        this._lastMeasured = 0;
    }

    public override fire(session: ISession, _tick: number): void {
        // Defaults to "no input this tick" — we only proceed if `value`
        // actually arrived. The transducer is value-driven, not clock-
        // driven; a missing value means there's nothing to measure.
        let valueIn: number | null = null;
        let tIn: number | null = null;

        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (typeof v !== "number") continue;
            switch (slot) {
                case "value":
                    valueIn = v;
                    break;
                case "t":
                    tIn = v;
                    break;
            }
        }

        if (valueIn === null) return;

        // ── 1. Effective dt ────────────────────────────────────────────
        // If `t` is wired we use a true wall-clock-ish delta. Otherwise
        // we assume the user is happy with the 100 Hz default — keeps
        // the node usable in clockless test graphs.
        let dt = TransducerNode._FALLBACK_DT_S;
        if (tIn !== null) {
            if (this._lastT !== null) {
                const candidate = tIn - this._lastT;
                // Guard against zero/negative dt (re-fired same tick, or
                // a non-monotonic clock from a step-back). Falling back
                // to the constant keeps the IIR alpha well-defined.
                if (candidate > 0) dt = candidate;
            }
            this._lastT = tIn;
        }
        this._effectiveDt = dt;

        // ── 2. 1-pole IIR LPF ──────────────────────────────────────────
        // alpha = dt / (tau + dt), with tau = 1 / (2π·fc).
        // On the very first fire we have no previous output to filter
        // against, so we latch the input directly to avoid a startup
        // transient that would slowly bias the measurement upward.
        let filtered: number;
        if (!this._lpfPrimed) {
            filtered = valueIn;
            this._lpfPrimed = true;
        } else {
            const tau = 1 / (2 * Math.PI * this._cutoffHz);
            const alpha = dt / (tau + dt);
            filtered = this._lpfState + alpha * (valueIn - this._lpfState);
        }
        this._lpfState = filtered;

        // ── 3. Additive Gaussian noise (Box-Muller) ───────────────────
        // Skip the trig entirely when stdev = 0 (the common "ideal
        // sensor" case) — keeps the hot path branchless for that preset.
        let noisy = filtered;
        if (this._noiseStdev > 0) {
            // Two uniforms → one standard-normal sample. We discard the
            // second normal produced by Box-Muller (would need to cache
            // across fires to recover it; not worth the state for now).
            const u1 = Math.max(Math.random(), Number.EPSILON);
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            noisy = filtered + this._noiseStdev * z;
        }

        // ── 4. Quantization (ADC step) ─────────────────────────────────
        let quantized = noisy;
        if (this._quantizationStep > 0) {
            quantized = Math.round(noisy / this._quantizationStep) * this._quantizationStep;
        }

        // ── 5. Cumulative drift ───────────────────────────────────────
        // Integrate driftPerSec * dt across all fires since reset(). Kept
        // separate from the noise so the user can drive a deterministic
        // drift without polluting the noise channel.
        this._currentDrift += this._driftPerSec * dt;
        const measured = quantized + this._currentDrift;

        this._lastMeasured = measured;

        // Publish on every outgoing `measured` channel.
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "measured" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, measured);
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createTransducerNode(): TransducerNode {
    return new TransducerNode();
}
