// ═══════════════════════════════════════════════════════════════════════════
// CnnNode : generic wrapper for CNN inference
// ═══════════════════════════════════════════════════════════════════════════

import { ITensor } from "../compute.interfaces";
import { ComputeNodeBase } from "../compute.node.base";

/**
 * CNN inference node : runs a CNN evaluator and outputs the result.
 * Wraps any run(input: number[]): number[] function.
 *
 * This is a generic wrapper: pass in the run function from
 * any @spiky-panda/core CNN runtime (CnnInferenceRuntime, etc.).
 */
export class CnnNode extends ComputeNodeBase {
    public readonly nodeType: string;
    public readonly outputShapes: number[][];

    private readonly _evaluate: (input: number[]) => number[];
    private readonly _outputName: string;

    constructor(
        nodeType: string,
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
