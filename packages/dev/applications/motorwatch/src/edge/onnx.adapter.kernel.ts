// ═══════════════════════════════════════════════════════════════════════════
// OnnxAdapterKernel : hot-swappable ONNX bank as a RuntimeGraph node.
//
// Why an adapter instead of dropping OnnxModelGraph straight into the
// edge graph (it IS an IRuntimeNode via the fractal RuntimeGraph
// composition): the parent Session caches node states, required-input
// counts and channel capacities at construction. A validated hot-swap
// REPLACES the model graph's nodes/links in place, which the parent
// session would never re-scan; the freshly pushed model would be
// invisible (or worse, half-visible) to the running pipeline. Holding
// the OnnxModelGraph INSIDE a stable Kernel keeps the parent topology
// frozen while the swap happens behind the kernel's execute(), so the
// push-model-at-runtime channel works mid-session. Same pattern as the
// driverv2 OnnxEmbeddingKernel, with the double-bank validated load of
// OnnxModelGraph underneath.
//
// I/O: one tensor in (the device chain delivers (1, C, T) windows from
// TransposeNode with add_batch_dim), one tensor out (the model's first
// declared output, e.g. the [1, E] embedding). While no model is
// loaded, frames are swallowed and counted: no token leaves the node,
// so the downstream clusterer simply never arms.
// ═══════════════════════════════════════════════════════════════════════════

import { Kernel } from "spikypanda-core";
import type { IDeclaresPorts, IPortDescriptor, ITensor } from "spikypanda-core";
import { OnnxModelGraph } from "spikypanda-plugin-onnx";
import type { OnnxModelLoadOptions, OnnxModelLoadReport } from "spikypanda-plugin-onnx";

export class OnnxAdapterKernel extends Kernel implements IDeclaresPorts {
    public readonly nodeType = "motorwatch_onnx_adapter";
    public readonly outputShapes: number[][] = [];

    /** Modest burst capacity: the gate can replay a couple of frames
     *  within one tick around a regime edge. */
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: 0, optional: false, type: "tensor", capacity: 8 }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: 0, optional: false, type: "tensor", capacity: 8 }];

    private readonly _bank = new OnnxModelGraph();
    private _inputName: string | null = null;
    private _outputName: string | null = null;
    private _dropped = 0;

    /** The wrapped double-bank model graph (diagnostics seam). */
    public get bank(): OnnxModelGraph {
        return this._bank;
    }

    public get isLoaded(): boolean {
        return this._bank.isLoaded;
    }

    public get modelName(): string {
        return this._bank.modelName;
    }

    /** Frames swallowed: while no model was loaded, or because the
     *  inference produced no usable output tensor. Surfaced on the
     *  device's status().encoder.dropped for observability. */
    public get dropped(): number {
        return this._dropped;
    }

    /** Observability reset (device_reset scope "all"). */
    public clearDropped(): void {
        this._dropped = 0;
    }

    /**
     * Validated, atomic load (OnnxModelGraph.loadModelValidated
     * passthrough). On rejection the previously loaded model stays
     * fully active and keeps serving execute().
     */
    public load(bytes: Uint8Array | ArrayBuffer, opts: OnnxModelLoadOptions = {}): OnnxModelLoadReport {
        const report = this._bank.loadModelValidated(bytes, opts);
        if (report.ok) {
            this._inputName = report.inputNames[0] ?? null;
            this._outputName = report.outputNames[0] ?? null;
        }
        return report;
    }

    public execute(inputs: ITensor[]): ITensor[] {
        if (inputs.length === 0) return [];
        if (!this._bank.isLoaded || this._inputName === null) {
            this._dropped += inputs.length;
            return [];
        }
        const frame = inputs[0];
        const results = this._bank.infer(new Map<string, ITensor>([[this._inputName, { data: frame.data, shape: [...frame.shape], name: this._inputName }]]));
        const out = (this._outputName !== null ? results.get(this._outputName) : undefined) ?? results.values().next().value;
        if (!out) {
            // The frame produced no embedding: just as lost as the
            // no-model case, count it the same way.
            this._dropped++;
            return [];
        }
        // Defensive copy: downstream consumers (clusterer history, the
        // device's last-embedding buffer) may hold the reference.
        return [{ data: Float32Array.from(out.data as Float32Array), shape: [...out.shape], name: "embedding" }];
    }
}
