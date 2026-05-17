// ═══════════════════════════════════════════════════════════════════════════
// NormalizeKernel : per-channel zero-mean / unit-std on a (T, C) window.
//
// Computes mean and std over the time axis independently for each channel,
// then rescales: y[t, c] = (x[t, c] - mean[c]) / (std[c] + eps).
//
// Removes the DC bias of each accel axis and equalises their dynamic
// ranges before the CNN sees them. Pure tensor op, ONNX-exportable
// (ReduceMean + Sub + ReduceMean(square) + Sqrt + Div).
// ═══════════════════════════════════════════════════════════════════════════

import { ITensor, Kernel } from "spikypanda-core";

export class NormalizeKernel extends Kernel {
    public readonly nodeType = "cardriver_normalize";
    public readonly outputShapes: number[][];

    private readonly _eps: number;

    public constructor(windowSize: number, channels: number, eps: number = 1e-6) {
        super();
        this.outputShapes = [[windowSize, channels]];
        this._eps = eps;
    }

    /** Numerical-stability epsilon added to std before division. */
    public get eps(): number {
        return this._eps;
    }

    public execute(inputs: ITensor[]): ITensor[] {
        if (inputs.length === 0) {
            throw new Error("NormalizeKernel: missing input tensor");
        }
        const t = inputs[0];
        if (t.shape.length !== 2) {
            throw new Error(`NormalizeKernel: expected rank-2 input, got shape [${t.shape.join(", ")}]`);
        }
        const T = t.shape[0];
        const C = t.shape[1];
        const data = t.data;
        if (data.length !== T * C) {
            throw new Error(`NormalizeKernel: data length ${data.length} does not match shape [${T}, ${C}]`);
        }

        const mean = new Float64Array(C);
        for (let i = 0; i < T; i++) {
            const off = i * C;
            for (let c = 0; c < C; c++) {
                mean[c] += data[off + c];
            }
        }
        for (let c = 0; c < C; c++) {
            mean[c] /= T;
        }

        const variance = new Float64Array(C);
        for (let i = 0; i < T; i++) {
            const off = i * C;
            for (let c = 0; c < C; c++) {
                const d = data[off + c] - mean[c];
                variance[c] += d * d;
            }
        }
        const invStd = new Float64Array(C);
        for (let c = 0; c < C; c++) {
            invStd[c] = 1 / (Math.sqrt(variance[c] / T) + this._eps);
        }

        const out = new Float32Array(T * C);
        for (let i = 0; i < T; i++) {
            const off = i * C;
            for (let c = 0; c < C; c++) {
                out[off + c] = (data[off + c] - mean[c]) * invStd[c];
            }
        }

        return [{ data: out, shape: [T, C], name: "window_normalized" }];
    }
}
