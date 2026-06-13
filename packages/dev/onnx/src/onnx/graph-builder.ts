import { ComputeGraph, Kernel, DataLink, IKernel, ITensor } from "spikypanda-core";
import type { OnnxParseResult } from "./onnx-parser";
import type { OnnxValueInfo } from "./onnx-types";
import type { OnnxTensorInfo } from "./onnx-types";
import { OnnxOpRegistry, getInitializerData, makeTensor } from "./registry";

/**
 * Source node that provides a constant tensor (from an ONNX initializer).
 */
class InitializerNode extends Kernel {
    readonly nodeType = "onnx_initializer";
    readonly outputShapes: number[][];
    private readonly tensor: ITensor;

    constructor(init: OnnxTensorInfo) {
        super();
        const data = getInitializerData(init);
        this.tensor = makeTensor(data, [...init.dims], init.name);
        this.outputShapes = [init.dims];
    }

    execute(): ITensor[] {
        return [this.tensor];
    }
}

/**
 * Source node for external graph inputs.
 */
class InputNode extends Kernel {
    readonly nodeType = "onnx_input";
    readonly outputShapes: number[][];
    readonly inputName: string;

    constructor(name: string, shape: number[]) {
        super();
        this.id = name;
        this.inputName = name;
        // Replace dynamic dims (0) with 1 for inference
        this.outputShapes = [shape.map((d) => (d <= 0 ? 1 : d))];
    }

    execute(inputs: ITensor[]): ITensor[] {
        if (inputs.length > 0 && inputs[0]) return [inputs[0]];
        const sz = this.outputShapes[0].reduce((a, b) => a * b, 1);
        return [makeTensor(new Float32Array(sz), [...this.outputShapes[0]], this.inputName)];
    }
}

/**
 * Builds a runnable ComputeGraph from an OnnxParseResult + op registry.
 */
export class OnnxGraphBuilder {
    private readonly registry: OnnxOpRegistry;

    constructor(registry: OnnxOpRegistry) {
        this.registry = registry;
    }

    build(model: OnnxParseResult): {
        graph: ComputeGraph;
        inputNames: string[];
        outputNames: string[];
        inputNodes: Map<string, IKernel>;
        outputNodes: Map<string, IKernel>;
    } {
        const nodes: IKernel[] = [];
        const links: DataLink[] = [];

        // Map tensor name -> the node that produces it + output index
        const tensorProducer = new Map<string, { node: IKernel; outputIndex: number }>();

        // Map tensor name -> list of consumers (node + input index)
        const tensorConsumers: { tensorName: string; node: IKernel; inputIndex: number }[] = [];

        // Build initializer map
        const initMap = new Map<string, OnnxTensorInfo>();
        for (const init of model.initializers) {
            initMap.set(init.name, init);
        }

        // Create initializer nodes
        for (const init of model.initializers) {
            const node = new InitializerNode(init);
            nodes.push(node);
            tensorProducer.set(init.name, { node, outputIndex: 0 });
        }

        // Create input nodes (skip initializers that share input names)
        const inputNames: string[] = [];
        const inputNodes = new Map<string, IKernel>();
        for (const inp of model.inputs) {
            if (initMap.has(inp.name)) continue;
            const node = new InputNode(inp.name, inp.shape);
            nodes.push(node);
            tensorProducer.set(inp.name, { node, outputIndex: 0 });
            inputNames.push(inp.name);
            inputNodes.set(inp.name, node);
        }

        // Create operator nodes
        for (const nodeInfo of model.nodes) {
            if (!this.registry.has(nodeInfo.opType)) {
                console.warn(`Skipping unsupported ONNX op: ${nodeInfo.opType}`);
                continue;
            }

            const node = this.registry.create(nodeInfo, initMap);
            // Use the first output tensor name as the kernel's id so
            // ComputeGraph.infer()'s named-output collector can map
            // back to the original ONNX tensor name. Falls back to the
            // node's own name when no outputs are declared (rare).
            const idFromOutput = nodeInfo.outputs[0] || nodeInfo.name;
            if (idFromOutput) {
                node.id = idFromOutput;
            }
            nodes.push(node);

            // Register consumer for each input tensor
            for (let i = 0; i < nodeInfo.inputs.length; i++) {
                const tensorName = nodeInfo.inputs[i];
                if (tensorName) {
                    tensorConsumers.push({ tensorName, node, inputIndex: i });
                }
            }

            // Register producer for each output tensor
            for (let i = 0; i < nodeInfo.outputs.length; i++) {
                const tensorName = nodeInfo.outputs[i];
                if (tensorName) {
                    tensorProducer.set(tensorName, { node, outputIndex: i });
                }
            }
        }

        // Wire links
        for (const consumer of tensorConsumers) {
            const producer = tensorProducer.get(consumer.tensorName);
            if (!producer) {
                console.warn(`No producer for tensor: ${consumer.tensorName}`);
                continue;
            }
            const link = new DataLink(producer.node as IKernel, consumer.node as IKernel, consumer.inputIndex);
            links.push(link);
        }

        // Identify output tensor names
        const outputNames = model.outputs.map((o: OnnxValueInfo) => o.name);

        // Boundary metadata for fractal embedding: the kernel backing
        // each declared graph output, keyed by ONNX tensor name.
        // Consumers (OnnxModelGraph) wire dangling port channels from
        // these without re-deriving producers from node ids.
        const outputNodes = new Map<string, IKernel>();
        for (const name of outputNames) {
            const producer = tensorProducer.get(name);
            if (producer) {
                outputNodes.set(name, producer.node);
            }
        }

        const graph = new ComputeGraph(nodes, links);
        return { graph, inputNames, outputNames, inputNodes, outputNodes };
    }
}
