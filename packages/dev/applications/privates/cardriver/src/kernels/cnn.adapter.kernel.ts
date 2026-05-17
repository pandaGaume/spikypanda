// ═══════════════════════════════════════════════════════════════════════════
// CnnAdapterKernel : wraps a CnnInferenceRuntime as an ITensor-in / ITensor-
// out compute node.
//
// Re-lays out a (T, C) channel-last window into the channel-major flat
// vector the CnnInferenceRuntime expects ([all ch0 samples, all ch1
// samples, ...]), runs inference, wraps the result as a 1-D ITensor.
//
// The CNN is itself an ONNX-exportable subgraph (conv/pool/dense); this
// Kernel is just the layout adapter between the runtime tensor world and
// the CNN's flat-vector API.
// ═══════════════════════════════════════════════════════════════════════════

import { CnnInferenceRuntime, ITensor, Kernel } from "spikypanda-core";

export class CnnAdapterKernel extends Kernel {
    public readonly nodeType = "cardriver_cnn_adapter";
    public readonly outputShapes: number[][];

    private readonly _runtime: CnnInferenceRuntime;
    private readonly _windowSize: number;
    private readonly _channels: number;
    private readonly _outputSize: number;

    public constructor(opts: {
        runtime: CnnInferenceRuntime;
        windowSize: number;
        channels: number;
        outputSize: number;
    }) {
        super();
        this._runtime = opts.runtime;
        this._windowSize = opts.windowSize;
        this._channels = opts.channels;
        this._outputSize = opts.outputSize;
        this.outputShapes = [[opts.outputSize]];
    }

    public get runtime(): CnnInferenceRuntime {
        return this._runtime;
    }

    public get windowSize(): number {
        return this._windowSize;
    }

    public get channels(): number {
        return this._channels;
    }

    public get outputSize(): number {
        return this._outputSize;
    }

    public execute(inputs: ITensor[]): ITensor[] {
        if (inputs.length === 0) {
            throw new Error("CnnAdapterKernel: missing input tensor");
        }
        const t = inputs[0];
        if (t.shape.length !== 2) {
            throw new Error(
                `CnnAdapterKernel: expected rank-2 input, got shape [${t.shape.join(", ")}]`
            );
        }
        const T = t.shape[0];
        const C = t.shape[1];
        if (T !== this._windowSize || C !== this._channels) {
            throw new Error(
                `CnnAdapterKernel: shape mismatch, expected [${this._windowSize}, ${this._channels}], got [${T}, ${C}]`
            );
        }

        // Re-layout (T, C) channel-last into channel-major flat. The
        // CNN was built with withInputLayer(width=T, height=1,
        // channels=C); its inference runtime expects all ch0 values
        // then all ch1 etc. (channel × height × width order).
        const flat = new Array<number>(T * C);
        for (let c = 0; c < C; c++) {
            for (let i = 0; i < T; i++) {
                flat[c * T + i] = t.data[i * C + c];
            }
        }

        const result = this._runtime.run(flat);
        if (result.length !== this._outputSize) {
            throw new Error(
                `CnnAdapterKernel: runtime returned ${result.length} values, expected ${this._outputSize}`
            );
        }
        return [{
            data: Float32Array.from(result),
            shape: [this._outputSize],
            name: "embedding",
        }];
    }
}
