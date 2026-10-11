import { ComputeGraph, Kernel, DataLink, IKernel, ITensor } from "spikypanda-core";
import type { OnnxParseResult } from "./onnx-parser";
import type { OnnxValueInfo } from "./onnx-types";
import type { OnnxTensorInfo } from "./onnx-types";
import { OnnxOpRegistry, getInitializerData, makeTensor } from "./registry";

export interface IOnnxBuildOptions {
    /** Return the exact byte range for this initializer; transport and path policy belong to the host. */
    readonly resolveExternalData?: (initializer: OnnxTensorInfo) => Uint8Array;
}

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
        if (data.length !== init.dims.reduce((a, b) => a * b, 1)) throw new Error(`ONNX initializer size differs: ${init.name}`);
        this.tensor = makeTensor(data, [...init.dims], init.name);
        this.tensor.cacheable = true;
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

    build(
        model: OnnxParseResult,
        options: IOnnxBuildOptions = {},
    ): {
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
            if (init.externalData?.size && !init.rawData && !init.floatData) {
                if (!options.resolveExternalData) throw new Error(`External ONNX data requires a host resolver: ${init.name}`);
                initMap.set(init.name, { ...init, rawData: options.resolveExternalData(init) });
            } else initMap.set(init.name, init);
        }

        // Create initializer nodes
        for (const init of model.initializers) {
            const resolved = initMap.get(init.name)!;
            const node = new InitializerNode(resolved);
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
            const opKey = OnnxOpRegistry.qualify(nodeInfo.opType, nodeInfo.domain);
            if (!this.registry.has(opKey)) {
                throw new Error(`Unsupported ONNX op: ${opKey} (${nodeInfo.name || nodeInfo.outputs[0]})`);
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
                throw new Error(`No producer for tensor: ${consumer.tensorName}`);
            }
            const link = new DataLink(producer.node as IKernel, consumer.node as IKernel, consumer.inputIndex, producer.outputIndex);
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
            } else {
                throw new Error(`No producer for ONNX output: ${name}`);
            }
        }

        const graph = new ComputeGraph(nodes, links);
        return { graph, inputNames, outputNames, inputNodes, outputNodes };
    }
}
