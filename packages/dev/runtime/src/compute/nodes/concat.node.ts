// ═══════════════════════════════════════════════════════════════════════════
// ConcatNode : merges multiple input tensors into one flat vector
// ═══════════════════════════════════════════════════════════════════════════

import { ITensor } from "../compute.interfaces";
import { ComputeNodeBase } from "../compute.node.base";

/**
 * Concatenation node : merges multiple input tensors into one flat vector.
 */
export class ConcatNode extends ComputeNodeBase {
    public readonly nodeType = "concat";
    public readonly outputShapes: number[][];

    private readonly _totalSize: number;
    private readonly _outputName: string;

    constructor(inputSizes: number[], outputName: string = "concat") {
        super();
        this.id = outputName;
        this._totalSize = inputSizes.reduce((a, b) => a + b, 0);
        this._outputName = outputName;
        this.outputShapes = [[this._totalSize]];
    }

    public execute(inputs: ITensor[]): ITensor[] {
        const flat = new Float32Array(this._totalSize);
        let offset = 0;
        for (const t of inputs) {
            flat.set(t.data, offset);
            offset += t.data.length;
        }
        return [{ data: flat, shape: [this._totalSize], name: this._outputName }];
    }
}
