import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import type { IPortDescriptor } from "spikypanda-core";
import {
    createFftNode,
    createIfftNode,
    createMagnitudeNode,
    createPhaseNode,
    createDctNode,
    createWindowNode,
    createFrameNode,
    createMelFilterbankNode,
    createLogScaleNode,
    createMfccNode,
    createDtwNode,
    createBiquadFilterNode,
    createKalman1DNode,
    createRmsNode,
    createZeroCrossingRateNode,
    createMovingAverageNode,
    createDetrendNode,
} from "./nodes/factories";

/**
 * @spikypanda/plugin-dsp
 *
 * Wraps every SpikyPanda DSP op as a free-standing editor node so users
 * can build time-series pipelines (input prep then transform/filter then
 * feature extraction then output analysis) without needing a parent
 * .onnx model. Categories group the palette:
 *
 *   dsp-transform   FFT, IFFT, Magnitude, Phase, DCT
 *   dsp-window      Window (Hann/Hamming/Blackman/Bartlett/Rectangular/Tukey)
 *   dsp-frame       Frame (signal slicing with hop/pad mode)
 *   dsp-feature     MelFilterbank, LogScale, MFCC, DTW
 *   dsp-filter      BiquadFilter (LP/HP/BP/Notch), Kalman1D
 *   dsp-stats       RMS, ZeroCrossingRate, MovingAverage, Detrend
 *
 * Every node carries the "onnx" standard badge: each op is implemented
 * as an ONNX kernel and exportable through the existing export pipeline.
 *
 * Slot naming convention: the v2 editor renders the `slot` field of every
 * port as the visible label (see node-editor-v2.js: `name: String(p.slot)`).
 * Each registration therefore uses descriptive string slots so users see
 * "signal" / "spectrum" / "filtered" / etc. rather than positional "0".
 */

function tensorIn(slot: string): IPortDescriptor {
    return { slot, optional: false, type: "tensor" };
}
function tensorOut(slot: string): IPortDescriptor {
    return { slot, optional: false, type: "tensor" };
}

const plugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        // ── Transforms ──────────────────────────────────────────────
        ctx.nodes.register("spk.dsp:fft", () => createFftNode() as never, {
            label: "FFT", category: "dsp-transform",
            inputPorts:  [tensorIn("signal")],
            outputPorts: [tensorOut("spectrum")],
            // FFT carries both ONNX (custom SpFFT kernel) and Unreal (the
            // upstream UE5 plugin ships an equivalent Audio FFT node).
            standards: [
                { id: "onnx", version: "1.18" },
                { id: "ue5",  version: "5.4"  },
            ],
        });
        ctx.nodes.register("spk.dsp:ifft", () => createIfftNode() as never, {
            label: "IFFT", category: "dsp-transform",
            inputPorts:  [tensorIn("spectrum")],
            outputPorts: [tensorOut("signal")],
            standards: [
                { id: "onnx", version: "1.18" },
                { id: "ue5",  version: "5.4"  },
            ],
        });
        ctx.nodes.register("spk.dsp:magnitude", () => createMagnitudeNode() as never, {
            label: "Magnitude", category: "dsp-transform",
            inputPorts:  [tensorIn("complex")],
            outputPorts: [tensorOut("magnitude")],
            standards: ["onnx"],
        });
        ctx.nodes.register("spk.dsp:phase", () => createPhaseNode() as never, {
            label: "Phase", category: "dsp-transform",
            inputPorts:  [tensorIn("complex")],
            outputPorts: [tensorOut("phase")],
            standards: ["onnx"],
        });
        ctx.nodes.register("spk.dsp:dct", () => createDctNode() as never, {
            label: "DCT", category: "dsp-transform",
            inputPorts:  [tensorIn("x")],
            outputPorts: [tensorOut("dct")],
            standards: ["onnx"],
        });

        // ── Windowing / framing ─────────────────────────────────────
        ctx.nodes.register("spk.dsp:window", () => createWindowNode() as never, {
            label: "Window", category: "dsp-window",
            inputPorts:  [tensorIn("signal")],
            outputPorts: [tensorOut("windowed")],
            standards: [
                { id: "onnx", version: "1.18" },
                { id: "ue5",  version: "5.4"  },
            ],
        });
        ctx.nodes.register("spk.dsp:frame", () => createFrameNode() as never, {
            label: "Frame", category: "dsp-frame",
            inputPorts:  [tensorIn("signal")],
            outputPorts: [tensorOut("frames")],
            standards: ["onnx"],
        });

        // ── Audio feature pipeline ──────────────────────────────────
        ctx.nodes.register("spk.dsp:mel", () => createMelFilterbankNode() as never, {
            label: "Mel Filterbank", category: "dsp-feature",
            inputPorts:  [tensorIn("spectrum")],
            outputPorts: [tensorOut("mel")],
            standards: ["onnx"],
        });
        ctx.nodes.register("spk.dsp:logscale", () => createLogScaleNode() as never, {
            label: "Log Scale", category: "dsp-feature",
            inputPorts:  [tensorIn("x")],
            outputPorts: [tensorOut("log_x")],
            standards: ["onnx"],
        });
        ctx.nodes.register("spk.dsp:mfcc", () => createMfccNode() as never, {
            label: "MFCC", category: "dsp-feature",
            inputPorts:  [tensorIn("audio")],
            outputPorts: [tensorOut("mfcc")],
            standards: ["onnx"],
        });
        ctx.nodes.register("spk.dsp:dtw", () => createDtwNode() as never, {
            label: "DTW", category: "dsp-feature",
            inputPorts:  [tensorIn("live"), tensorIn("template")],
            outputPorts: [tensorOut("distance")],
            standards: ["onnx"],
        });

        // ── Filters ─────────────────────────────────────────────────
        ctx.nodes.register("spk.dsp:biquad", () => createBiquadFilterNode() as never, {
            label: "Biquad Filter", category: "dsp-filter",
            inputPorts:  [tensorIn("signal")],
            outputPorts: [tensorOut("filtered")],
            // UE5 MetaSounds ships a Biquad Filter MetaSound node.
            standards: [
                { id: "onnx", version: "1.18" },
                { id: "ue5",  version: "5.4"  },
            ],
        });
        ctx.nodes.register("spk.dsp:kalman1d", () => createKalman1DNode() as never, {
            label: "Kalman 1D", category: "dsp-filter",
            inputPorts:  [tensorIn("signal")],
            outputPorts: [tensorOut("estimate")],
            standards: ["onnx"],
        });

        // ── Signal statistics / output analysis ─────────────────────
        ctx.nodes.register("spk.dsp:rms", () => createRmsNode() as never, {
            label: "RMS", category: "dsp-stats",
            inputPorts:  [tensorIn("signal")],
            outputPorts: [tensorOut("rms")],
            // UE5 audio engine exposes loudness/RMS via Audio Analyzer.
            standards: [
                { id: "onnx", version: "1.18" },
                { id: "ue5",  version: "5.4"  },
            ],
        });
        ctx.nodes.register("spk.dsp:zcr", () => createZeroCrossingRateNode() as never, {
            label: "Zero Crossing Rate", category: "dsp-stats",
            inputPorts:  [tensorIn("signal")],
            outputPorts: [tensorOut("zcr")],
            standards: ["onnx"],
        });
        ctx.nodes.register("spk.dsp:movavg", () => createMovingAverageNode() as never, {
            label: "Moving Average", category: "dsp-stats",
            inputPorts:  [tensorIn("signal")],
            outputPorts: [tensorOut("smoothed")],
            standards: ["onnx"],
        });
        ctx.nodes.register("spk.dsp:detrend", () => createDetrendNode() as never, {
            label: "Detrend", category: "dsp-stats",
            inputPorts:  [tensorIn("signal")],
            outputPorts: [tensorOut("detrended")],
            standards: ["onnx"],
        });
    },
};

export default plugin;
export {
    createFftNode,
    createIfftNode,
    createMagnitudeNode,
    createPhaseNode,
    createDctNode,
    createWindowNode,
    createFrameNode,
    createMelFilterbankNode,
    createLogScaleNode,
    createMfccNode,
    createDtwNode,
    createBiquadFilterNode,
    createKalman1DNode,
    createRmsNode,
    createZeroCrossingRateNode,
    createMovingAverageNode,
    createDetrendNode,
};
