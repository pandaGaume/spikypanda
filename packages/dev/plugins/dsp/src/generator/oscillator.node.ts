import {
    cloneable, editable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode, inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Single-frequency oscillator: emits `amplitude · sin(2π·f·t + φ)` (or
 * the cosine variant) on every tick. Replaces the boilerplate chain
 *
 *     Slider ──► Multiply(×2π) ──► Multiply(×Clock.t) ──► Sin
 *
 * with a single node where the user thinks in Hz directly. The `f, A, φ`
 * triple is exposed both as editables AND as optional inputs — if a wire
 * is connected, the wire wins for that tick; otherwise the editable
 * value applies. This lets you drive `frequency` from a Slider for live
 * frequency sweeps (waterfall draws a diagonal trace) without rewiring
 * the multiply chain.
 *
 * Composing a multi-frequency signal is the canonical use:
 *
 *     Clock.t ──┬─► Oscillator(f=50,  A=1.0) ──┐
 *               ├─► Oscillator(f=120, A=0.5) ──┼─► Add ──► Add ──► Buffer ──► FFT
 *               └─► Oscillator(f=200, A=0.3) ──┘
 *
 * Each oscillator produces an independent partial; the spectrum tile
 * shows three peaks. Add the same wired frequencies but flip one
 * `waveform` to `cos` to demonstrate phase.
 *
 * Inputs:
 *   t           required, the simulation time in seconds (wire to Clock.t)
 *   frequency   optional, Hz. Overrides the editable when wired.
 *   amplitude   optional. Overrides the editable when wired.
 *   phase       optional, radians. Overrides the editable when wired.
 *
 * Output:
 *   value       scalar; the current sample of the wave.
 *
 * Notes:
 *   - This is a pure runtime node (not an ONNX kernel) — it predates the
 *     formal DSP signal-source op family. If/when an `SpOscillator`
 *     ONNX op lands, this becomes its factory-backed wrapper.
 *   - The angular-frequency conversion (2π·f) is internal — the user
 *     thinks Hz, the node thinks ω. This is what makes it a clean
 *     primitive vs. the previous Sin+2Multiply chain.
 */

type Waveform = "sin" | "cos";

export class OscillatorNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "t",         optional: false, type: "float" },
        { slot: "frequency", optional: true,  type: "float" },
        { slot: "amplitude", optional: true,  type: "float" },
        { slot: "phase",     optional: true,  type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "value", optional: false, type: "float" },
    ];

    // ── Editables (used when the matching input is NOT wired) ──────────
    @cloneable private _frequency: number   = 50;     // Hz
    @cloneable private _amplitude: number   = 1;
    @cloneable private _phase:     number   = 0;      // radians
    @cloneable private _waveform:  Waveform = "sin";

    // Internal: last computed sample, surfaced as a viewable for quick
    // sanity-check in the property panel while playing.
    private _lastValue: number = 0;

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number", { unit: "Hz" })
    public get frequency(): number { return this._frequency; }
    public set frequency(v: number) {
        this.setField("frequency", this._frequency, v, (n) => { this._frequency = n; });
    }

    @editable("number")
    public get amplitude(): number { return this._amplitude; }
    public set amplitude(v: number) {
        this.setField("amplitude", this._amplitude, v, (n) => { this._amplitude = n; });
    }

    @editable("number", { unit: "rad" })
    public get phase(): number { return this._phase; }
    public set phase(v: number) {
        this.setField("phase", this._phase, v, (n) => { this._phase = n; });
    }

    @editable("string", { unit: "sin | cos" })
    public get waveform(): Waveform { return this._waveform; }
    public set waveform(v: Waveform) {
        const next: Waveform = v === "cos" ? "cos" : "sin";
        this.setField("waveform", this._waveform, next, (n) => { this._waveform = n; });
    }

    /** Last emitted sample. Useful in the property panel for a quick
     *  "is this oscillator alive" check while playing. */
    @viewable("number") public get lastValue(): number { return this._lastValue; }

    /** Angular frequency for the current `frequency` editable, in rad/s.
     *  Mostly a sanity-check viewable: should read 314.16 for f=50,
     *  matching the literal you'd put in the legacy Multiply chain. */
    @viewable("number") public get omega(): number {
        return 2 * Math.PI * this._frequency;
    }

    public override reset(_session: ISession): void {
        this._lastValue = 0;
    }

    public override fire(session: ISession, _t: number): void {
        // Default values: editable settings. Each wired input overrides
        // its slot for this tick — gives the user the choice of static
        // (editable) or dynamic (wired from a slider, modulator, ...).
        let t: number | null = null;
        let frequency = this._frequency;
        let amplitude = this._amplitude;
        let phase     = this._phase;

        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (typeof v !== "number") continue;
            switch (slot) {
                case "t":         t         = v; break;
                case "frequency": frequency = v; break;
                case "amplitude": amplitude = v; break;
                case "phase":     phase     = v; break;
            }
        }

        // No `t` this tick: nothing to compute. We don't fall back to
        // `_t` (the scheduler-supplied tick number) because the contract
        // is "user wires Clock.t in seconds" — substituting a different
        // time semantics would silently produce a wrong frequency.
        if (t === null) return;

        // The whole point of the node: think in Hz, compute in ω.
        const arg = 2 * Math.PI * frequency * t + phase;
        const sample = amplitude * (this._waveform === "cos" ? Math.cos(arg) : Math.sin(arg));
        this._lastValue = sample;

        // Publish on every outgoing channel bound to the `value` port.
        // Plain loop (not `publishToFirstOutput`) because we already
        // know the slot we own and want the fan-out semantics by hand.
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "value" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, sample);
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createOscillatorNode(): OscillatorNode {
    return new OscillatorNode();
}
