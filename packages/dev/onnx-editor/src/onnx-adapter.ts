import type { OnnxParseResult } from "spikypanda-runtime/onnx/onnx-parser.js";

export interface OnnxNodeDef {
    onnxId: string;
    label: string;
    inputs: { name: string; type: string }[];
    outputs: { name: string; type: string }[];
    color?: string;
    data?: unknown;
}

export interface OnnxGraphDef {
    nodes: OnnxNodeDef[];
    connections: { fromNodeId: string; fromPort: string; toNodeId: string; toPort: string }[];
}

const OP_COLORS: Record<string, string> = {
    // Activations
    Relu: "#2a6",
    Sigmoid: "#2a6",
    Tanh: "#2a6",
    Softmax: "#2a6",
    LeakyRelu: "#2a6",
    // Convolution
    Conv: "#46a",
    ConvTranspose: "#46a",
    // Pooling
    MaxPool: "#468",
    AveragePool: "#468",
    GlobalAveragePool: "#468",
    // Normalization
    BatchNormalization: "#648",
    LayerNormalization: "#648",
    InstanceNormalization: "#648",
    // Math
    MatMul: "#a46",
    Gemm: "#a46",
    Add: "#446",
    Sub: "#446",
    Mul: "#446",
    Div: "#446",
    // Reshape
    Reshape: "#553",
    Flatten: "#553",
    Squeeze: "#553",
    Unsqueeze: "#553",
    Transpose: "#553",
    Concat: "#553",
    // Reduction
    ReduceMean: "#535",
    ReduceSum: "#535",
};

function opColor(opType: string): string {
    return OP_COLORS[opType] ?? "#335";
}

/**
 * Convert an OnnxParseResult into NodeDef[] + connections for the node editor.
 */
export function onnxToGraph(result: OnnxParseResult): OnnxGraphDef {
    const nodes: OnnxNodeDef[] = [];
    const connections: OnnxGraphDef["connections"] = [];

    // Track which tensor name is produced by which node + port
    const tensorProducer = new Map<string, { nodeId: string; portName: string }>();

    // Graph inputs → Input nodes
    for (const inp of result.inputs) {
        // Skip inputs that are initializers (weights)
        const isInit = result.initializers.some((init) => init.name === inp.name);
        if (isInit) continue;

        const id = `input_${inp.name}`;
        const shapeStr = inp.shape.length > 0 ? inp.shape.join("x") : "scalar";
        nodes.push({
            onnxId: id,
            label: inp.name,
            inputs: [],
            outputs: [{ name: "out", type: "tensor" }],
            color: "#286",
            data: { kind: "input", name: inp.name, shape: inp.shape, shapeStr },
        });
        tensorProducer.set(inp.name, { nodeId: id, portName: "out" });
    }

    // Initializers → Const nodes
    for (const init of result.initializers) {
        const id = `init_${init.name}`;
        const shapeStr = init.dims.length > 0 ? init.dims.join("x") : "scalar";
        nodes.push({
            onnxId: id,
            label: init.name.length > 20 ? init.name.slice(0, 18) + ".." : init.name,
            inputs: [],
            outputs: [{ name: "out", type: "tensor" }],
            color: "#555",
            data: { kind: "initializer", name: init.name, dims: init.dims, shapeStr, dataType: init.dataType },
        });
        tensorProducer.set(init.name, { nodeId: id, portName: "out" });
    }

    // ONNX operator nodes
    for (let i = 0; i < result.nodes.length; i++) {
        const n = result.nodes[i];
        const id = n.name || `op_${i}_${n.opType}`;

        const inputPorts = n.inputs.map((name, idx) => ({
            name: name || `in${idx}`,
            type: "tensor",
        }));

        const outputPorts = n.outputs.map((name, idx) => ({
            name: name || `out${idx}`,
            type: "tensor",
        }));

        const attrs: Record<string, number> = {};
        for (const [k, v] of n.attributes) {
            attrs[k] = v;
        }

        nodes.push({
            onnxId: id,
            label: n.opType + (n.name ? ` (${n.name})` : ""),
            inputs: inputPorts,
            outputs: outputPorts,
            color: opColor(n.opType),
            data: { kind: "operator", opType: n.opType, name: n.name, attributes: attrs },
        });

        // Register outputs
        for (let j = 0; j < n.outputs.length; j++) {
            const tensorName = n.outputs[j];
            if (tensorName) {
                tensorProducer.set(tensorName, { nodeId: id, portName: n.outputs[j] || `out${j}` });
            }
        }
    }

    // Graph outputs → Output nodes
    for (const out of result.outputs) {
        const id = `output_${out.name}`;
        nodes.push({
            onnxId: id,
            label: out.name,
            inputs: [{ name: "in", type: "tensor" }],
            outputs: [],
            color: "#a33",
            data: { kind: "output", name: out.name, shape: out.shape },
        });
    }

    // Wire connections
    // For operator nodes: connect each input tensor to the node that produced it
    for (let i = 0; i < result.nodes.length; i++) {
        const n = result.nodes[i];
        const nodeId = n.name || `op_${i}_${n.opType}`;

        for (let j = 0; j < n.inputs.length; j++) {
            const tensorName = n.inputs[j];
            if (!tensorName) continue;
            const producer = tensorProducer.get(tensorName);
            if (producer) {
                connections.push({
                    fromNodeId: producer.nodeId,
                    fromPort: producer.portName,
                    toNodeId: nodeId,
                    toPort: tensorName || `in${j}`,
                });
            }
        }
    }

    // Wire graph outputs
    for (const out of result.outputs) {
        const producer = tensorProducer.get(out.name);
        if (producer) {
            connections.push({
                fromNodeId: producer.nodeId,
                fromPort: producer.portName,
                toNodeId: `output_${out.name}`,
                toPort: "in",
            });
        }
    }

    return { nodes, connections };
}
