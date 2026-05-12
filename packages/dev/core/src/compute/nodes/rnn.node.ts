// ═══════════════════════════════════════════════════════════════════════════
// RnnNode : generic wrapper for RNN inference (single timestep)
// ═══════════════════════════════════════════════════════════════════════════

import { ITensor } from "../compute.interfaces";
import { ComputeNodeBase } from "../compute.node.base";

/**
 * RNN inference node : runs a single timestep through an RNN evaluator.
 * Wraps any step(input: number[]): number[] function.
 *
 * This is a generic wrapper: pass in the step function from
 * any @spiky-panda/core RNN runtime (RnnInferenceRuntime, etc.).
 *
 * The RNN maintains hidden state across calls internally,
 * so each execute() advances one timestep.
 */
export class RnnNode extends ComputeNodeBase {
    public readonly nodeType: string;
    public readonly outputShapes: number[][];

    private readonly _step: (input: number[]) => number[];
    private readonly _outputName: string;

    constructor(
        nodeType: string,
        outputSize: number,
        step: (input: number[]) => number[],
        outputName: string = "output"
    ) {
        super();
        this.id = nodeType;
        this.nodeType = nodeType;
        this._step = step;
        this._outputName = outputName;
        this.outputShapes = [[outputSize]];
    }

    public execute(inputs: ITensor[]): ITensor[] {
        // Concatenate all input tensors into a single flat array
        let totalLen = 0;
        for (const t of inputs) totalLen += t.data.length;

        const flat = new Float32Array(totalLen);
        let offset = 0;
        for (const t of inputs) {
            flat.set(t.data, offset);
            offset += t.data.length;
        }

        const result = this._step(Array.from(flat));
        return [{ data: new Float32Array(result), shape: [result.length], name: this._outputName }];
    }
}
