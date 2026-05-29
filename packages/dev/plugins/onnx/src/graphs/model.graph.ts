import { editor } from "spikypanda-core";
import { OnnxGraph, OnnxParser, OnnxGraphBuilder, createSpikyPandaRegistry } from "spikypanda-onnx";

/**
 * OnnxModelGraph: an OnnxGraph that loads its contents from a .onnx file.
 * Since OnnxGraph already implements IRuntimeNode (fractal composition
 * from RuntimeGraph), there is no wrapper node: this graph IS the node
 * in the parent graph. The drag-and-drop editor (registered under the
 * "onnx-model" kind) parses the .onnx bytes and replaces this graph's
 * nodes/links in place, then notifies the property panel so it can
 * re-render the new port topology.
 */
@editor("onnx-model")
export class OnnxModelGraph extends OnnxGraph {
    private _modelName = "";
    private _loadError: string | null = null;

    public constructor() {
        super([], []);
    }

    public get modelName(): string {
        return this._modelName;
    }
    public get loadError(): string | null {
        return this._loadError;
    }
    public get isLoaded(): boolean {
        return this.nodes.length > 0;
    }

    public loadModel(bytes: ArrayBuffer, name = "model.onnx"): void {
        const prev = this._modelName;
        this._loadError = null;

        const result = OnnxParser.parse(new Uint8Array(bytes));
        if (!result) {
            this._loadError = "Failed to parse ONNX model";
            this.notifyPropertyChanged("modelName", prev, "");
            return;
        }

        const built = new OnnxGraphBuilder(createSpikyPandaRegistry()).build(result);

        // Replace topology in place. RuntimeGraph's inputPorts/outputPorts
        // getters derive from inputs[]/outputs[] so they update automatically.
        this.nodes = built.graph.nodes;
        this.links = built.graph.links;
        this.inputs = built.graph.inputs;
        this.outputs = built.graph.outputs;
        this.hiddens = built.graph.hiddens;

        this._modelName = name;
        this.notifyPropertyChanged("modelName", prev, name);
    }
}
