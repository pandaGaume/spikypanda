/**
 * Free-standing factories for every DSP op exposed by this plugin.
 *
 * Each factory builds a minimal OnnxNodeInfo (synthesized inputs/outputs
 * + default scalar attributes) and instantiates the corresponding
 * registered op kernel through the shared registry. The user adjusts
 * attributes via the @editable spinners exposed on each kernel.
 *
 * Mirrors the pattern from packages/dev/plugins/onnx/src/nodes/conv.factory.ts.
 */

import { Kernel } from "spikypanda-core";
import type { OnnxNodeInfo } from "spikypanda-onnx";
import { createRegistry } from "spikypanda-onnx";

// Single shared registry so every factory call reuses the same op
// implementations. Created lazily to avoid build-time side effects.
let _registry: ReturnType<typeof createRegistry> | null = null;
function registry(): ReturnType<typeof createRegistry> {
    if (!_registry) _registry = createRegistry();
    return _registry;
}

function make(opType: string, inputs: string[], outputs: string[], attrs: Record<string, number> = {}): Kernel {
    const info: OnnxNodeInfo = {
        opType,
        name: "",
        inputs,
        outputs,
        attributes: new Map(Object.entries(attrs)),
    };
    return registry().create(info, new Map());
}

// ─── Transforms ─────────────────────────────────────────────────────────
export function createFftNode(): Kernel {
    return make("SpFFT", ["x"], ["y"], { nfft: 512, output_type: 0 });
}
export function createIfftNode(): Kernel {
    return make("SpIFFT", ["x"], ["y"], { nfft: 512 });
}
export function createMagnitudeNode(): Kernel {
    return make("SpMagnitude", ["x"], ["y"]);
}
export function createPhaseNode(): Kernel {
    return make("SpPhase", ["x"], ["y"]);
}
export function createDctNode(): Kernel {
    return make("SpDCT", ["x"], ["y"], { n_output: 40 });
}

// ─── Windowing / framing (input preparation) ────────────────────────────
export function createWindowNode(): Kernel {
    return make("SpWindow", ["x"], ["y"], { window_type: 0, alpha: 0.5 });
}
export function createFrameNode(): Kernel {
    return make("SpFrame", ["x"], ["y"], { frame_size: 512, hop_length: 256, pad_mode: 0 });
}

// ─── Audio feature pipeline ─────────────────────────────────────────────
export function createMelFilterbankNode(): Kernel {
    return make("SpMelFilterbank", ["x"], ["y"], { n_mels: 40, nfft: 512, sample_rate: 16000 });
}
export function createLogScaleNode(): Kernel {
    return make("SpLogScale", ["x"], ["y"], { floor: 1e-10 });
}
export function createMfccNode(): Kernel {
    return make("SpMFCC", ["x"], ["y"], {
        sample_rate: 16000,
        n_mfcc: 40,
        n_fft: 512,
        hop_length: 160,
        n_mels: 40,
        window_type: 0,
    });
}
export function createDtwNode(): Kernel {
    return make("SpDTW", ["live", "template"], ["distance"], { normalize: 1, band: -1 });
}

// ─── Filters ────────────────────────────────────────────────────────────
export function createBiquadFilterNode(): Kernel {
    return make("SpBiquadFilter", ["x"], ["y"], {
        filter_type: 0,
        sample_rate: 16000,
        cutoff_hz:   1000,
        q:           Math.SQRT1_2,
    });
}
export function createKalman1DNode(): Kernel {
    return make("SpKalman1D", ["x"], ["y"], { q: 1e-4, r: 1e-2, x0: 0, p0: 1 });
}

// ─── Signal statistics / output analysis ────────────────────────────────
export function createRmsNode(): Kernel {
    return make("SpRMS", ["x"], ["y"]);
}
export function createZeroCrossingRateNode(): Kernel {
    return make("SpZeroCrossingRate", ["x"], ["y"]);
}
export function createMovingAverageNode(): Kernel {
    return make("SpMovingAverage", ["x"], ["y"], { window_size: 5 });
}
export function createDetrendNode(): Kernel {
    return make("SpDetrend", ["x"], ["y"], { mode: 1 });
}
