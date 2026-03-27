// ═══════════════════════════════════════════════════════════════════════════
// ExternalInputNode : named injection point for runtime data
// ═══════════════════════════════════════════════════════════════════════════

import { ITensor } from "../compute.interfaces";
import { ComputeNodeBase } from "../compute.node.base";

/**
 * External input node : receives tensors from the graph's run() call.
 * Acts as a named injection point for sensor data, pose, goal, etc.
 */
export class ExternalInputNode extends ComputeNodeBase {
    public readonly nodeType = "external_input";
    public readonly outputShapes: number[][];

    private _shape: number[];
    private _name: string;

    constructor(name: string, shape: number[]) {
        super();
        this.id = name;
        this._name = name;
        this._shape = shape;
        this.outputShapes = [shape];
    }

    public execute(inputs: ITensor[]): ITensor[] {
        // External inputs are injected by the graph engine via run()
        if (inputs.length > 0) {
            return [{ ...inputs[0], name: this._name }];
        }
        // Return zeros if no input provided
        const size = this._shape.reduce((a, b) => a * b, 1);
        return [{ data: new Float32Array(size), shape: this._shape, name: this._name }];
    }
}
