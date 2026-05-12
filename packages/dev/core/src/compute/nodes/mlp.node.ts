// ═══════════════════════════════════════════════════════════════════════════
// MLPNode : generic wrapper for MLP inference
// ═══════════════════════════════════════════════════════════════════════════

import { ITensor } from "../compute.interfaces";
import { ComputeNodeBase } from "../compute.node.base";

/**
 * MLP inference node : runs an MLP evaluator and outputs the result.
 * Wraps any evaluate(input: number[]): number[] function.
 *
 * This is a generic wrapper: pass in the evaluate function from
 * any @spiky-panda/core MLP runtime (MLPInferenceRuntime, etc.).
 */
export class MLPNode extends ComputeNodeBase {
    public readonly nodeType: string;
    public readonly outputShapes: number[][];

    private readonly _evaluate: (input: number[]) => number[];
    private readonly _outputName: string;

    constructor(
        nodeType: string,
        _inputSize: number,
        outputSize: number,
        evaluate: (input: number[]) => number[],
        outputName: string = "output"
    ) {
        super();
        this.id = nodeType;
        this.nodeType = nodeType;
        this._evaluate = evaluate;
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

        const result = this._evaluate(Array.from(flat));
        return [{ data: new Float32Array(result), shape: [result.length], name: this._outputName }];
    }
}
