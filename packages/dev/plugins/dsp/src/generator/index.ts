import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createOscillatorNode, OscillatorNode } from "./oscillator.node.js";

export { OscillatorNode, createOscillatorNode };

/**
 * `DSP.Generator` — signal sources.
 *
 * Pure-runtime scalar generators that emit one sample per tick from a
 * mathematical function of `t`. Sit at the head of any DSP pipeline:
 *
 *     Clock ── Oscillator ── (Add ──)* ── Buffer ── FFT ── Magnitude ── Spectrum/Waterfall
 *
 * V1 ships one node:
 *   oscillator   amplitude · sin/cos(2π·f·t + φ), with f, A, φ either
 *                static (editable) or live-wired from a slider/modulator.
 *
 * Future candidates (parked):
 *   noise        white / pink / brown noise
 *   chirp        linear/exponential frequency sweep
 *   sawtooth     band-limited triangle/saw for audio synthesis tests
 *
 * Generators are NOT ONNX-backed: they're computed each tick from
 * `t` (wired from Clock.t), so they belong in the runtime tier alongside
 * `DSP.Stream:buffer`. If/when an `SpOscillator` op is added to the ONNX
 * kernel set, this becomes its factory-backed wrapper.
 */
export const dspGeneratorSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Generator:oscillator", () => createOscillatorNode() as never, {
            label: "Oscillator",
            category: "DSP.Generator",
            docPath: ctx.assetUrl("docs/dsp/generator/oscillator.md"),
            inputPorts: [
                { slot: "t", optional: false, type: "float" },
                { slot: "frequency", optional: true, type: "float" },
                { slot: "amplitude", optional: true, type: "float" },
                { slot: "phase", optional: true, type: "float" },
            ],
            outputPorts: [{ slot: "value", optional: false, type: "float" }],
        });
    },
};
