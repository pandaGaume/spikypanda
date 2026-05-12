/**
 * DotVision custom ONNX operators.
 *
 * Registered under the "com.dotvision" domain convention (encoded in
 * the op_type name since the protobuf writer does not yet support the
 * domain field on NodeProto).
 *
 * Operators:
 *
 *   com.dotvision.EnvelopeCenter
 *     Per-window centering of a pre-computed envelope signal.
 *     Subtracts the per-channel window mean, multiplies by a gain
 *     factor, shifts to 0.5, and clamps to [0, 1].
 *
 *     This op is OPTIONAL in the ONNX graph. Two valid deployment
 *     modes coexist:
 *
 *     (A) Firmware streams raw envelope (uncentered) into the ONNX
 *         model. The model contains EnvelopeCenter before the LSTM.
 *         The op handles the centering.
 *
 *     (B) Firmware does the centering itself and feeds the LSTM
 *         directly. The EnvelopeCenter node is absent or skipped.
 *         Both paths produce identical results.
 *
 *     The RMS extraction and decimation always run in firmware (they
 *     are streaming operations tied to the ADC interrupt loop, not
 *     suitable for a single-shot ONNX op).
 *
 *     Attributes:
 *       gain (float): amplification factor (default 6.0)
 *       since_version (int): operator version (1)
 *
 *     Input:  envelope [T, C] (uncentered envelope, e.g., [64, 3])
 *     Output: centered [T, C] (centered, clamped to [0, 1])
 */

import type { ITensor } from "spikypanda-core";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, OnnxOpRegistry } from "../registry";

const DOMAIN = "com.dotvision";
const PRIORITY = 100;

// ---------------------------------------------------------------------------
// EnvelopeCenter operator
// ---------------------------------------------------------------------------

class EnvelopeCenterNode extends OnnxOpNode {
    private readonly gain: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.gain = this.attr("gain", 6.0);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const inp = inputs[0]; // [T, C]
        const T = inp.shape[0];
        const C = inp.shape.length > 1 ? inp.shape[1] : 1;
        const data = inp.data;
        const out = new Float32Array(T * C);

        for (let ch = 0; ch < C; ch++) {
            // Per-channel window mean
            let mean = 0;
            for (let t = 0; t < T; t++) {
                mean += data[t * C + ch];
            }
            mean /= T;

            // Center, amplify, shift to 0.5, clamp to [0, 1]
            for (let t = 0; t < T; t++) {
                let v = (data[t * C + ch] - mean) * this.gain + 0.5;
                if (v < 0) v = 0;
                if (v > 1) v = 1;
                out[t * C + ch] = v;
            }
        }

        return [makeTensor(out, [T, C])];
    }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerDotVisionOps(registry: OnnxOpRegistry): void {
    registry.register("com.dotvision.EnvelopeCenter", (info) => new EnvelopeCenterNode(info), PRIORITY, DOMAIN);
}
