// ═══════════════════════════════════════════════════════════════════════════
// NormKernel : (ax, ay, az) -> (ax, ay, az, |a|)
//
// Appends the Euclidean norm of the 3-axis acceleration as a 4th channel.
// The magnitude channel is invariant to device orientation, which the
// downstream CNN can exploit alongside the per-axis signals.
//
// Pure tensor op, ONNX-exportable (Concat + ReduceL2).
// ═══════════════════════════════════════════════════════════════════════════

import { ITensor, Kernel } from "spikypanda-core";

export class NormKernel extends Kernel {
    public readonly nodeType = "cardriver_norm";
    public readonly outputShapes: number[][] = [[4]];

    public execute(inputs: ITensor[]): ITensor[] {
        if (inputs.length === 0) {
            throw new Error("NormKernel: missing input tensor");
        }
        const src = inputs[0].data;
        if (src.length !== 3) {
            throw new Error(`NormKernel: expected length-3 input, got ${src.length}`);
        }
        const ax = src[0];
        const ay = src[1];
        const az = src[2];
        const mag = Math.sqrt(ax * ax + ay * ay + az * az);
        const out = new Float32Array(4);
        out[0] = ax;
        out[1] = ay;
        out[2] = az;
        out[3] = mag;
        return [{ data: out, shape: [4], name: "accel_norm" }];
    }
}
