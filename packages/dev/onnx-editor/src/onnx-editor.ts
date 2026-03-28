import { OnnxParser } from "spikypanda-runtime/onnx/onnx-parser.js";
import { OnnxWriter } from "spikypanda-runtime/onnx/onnx-writer.js";
import type { OnnxParseResult, OnnxNodeInfo, OnnxTensorInfo, OnnxValueInfo } from "spikypanda-runtime/onnx/onnx-types.js";
import { OnnxDataType, OnnxLinkType } from "spikypanda-runtime/onnx/onnx-types.js";
import type { NodeEditor, FileHandler } from "spikypanda-nodeeditor";
import { onnxToGraph, OnnxGraphDef } from "./onnx-adapter.js";

interface OnnxNodeData {
    kind: string;
    opType?: string;
    name?: string;
    attributes?: Record<string, number>;
    shape?: number[];
    dims?: number[];
    dataType?: number;
    shapeStr?: string;
}

function isOnnxData(d: unknown): d is OnnxNodeData {
    return d != null && typeof d === "object" && "kind" in d;
}

export class OnnxEditor {
    readonly editor: NodeEditor;

    constructor(editor: NodeEditor) {
        this.editor = editor;
        editor.fileHandlers.register(this.createHandler());
    }

    loadOnnx(data: Uint8Array): OnnxGraphDef {
        const result = OnnxParser.parse(data);
        if (!result) {
            throw new Error("Failed to parse ONNX model");
        }

        const graphDef = onnxToGraph(result);
        this.editor.clear();

        const nodeMap = new Map<string, ReturnType<NodeEditor["addNode"]>>();

        for (const def of graphDef.nodes) {
            const node = this.editor.addNode(def, 0, 0);
            nodeMap.set(def.onnxId, node);
        }

        for (const conn of graphDef.connections) {
            const fromNode = nodeMap.get(conn.fromNodeId);
            const toNode = nodeMap.get(conn.toNodeId);
            if (!fromNode || !toNode) continue;

            const fromPort = fromNode.outputs.find((p) => p.name === conn.fromPort)
                ?? fromNode.outputs[0];
            const toPort = toNode.inputs.find((p) => p.name === conn.toPort)
                ?? toNode.inputs[0];

            if (fromPort && toPort) {
                this.editor.connect(fromPort, toPort);
            }
        }

        this.editor.autoLayout();
        return graphDef;
    }

    exportOnnx(): Uint8Array {
        const ed = this.editor;
        const onnxNodes: OnnxNodeInfo[] = [];
        const inputs: OnnxValueInfo[] = [];
        const outputs: OnnxValueInfo[] = [];
        const initializers: OnnxTensorInfo[] = [];

        for (const n of ed.nodes) {
            const d = n.item.data;
            if (!isOnnxData(d)) continue;

            if (d.kind === "input") {
                inputs.push({
                    name: d.name ?? n.label,
                    type: OnnxLinkType.INPUT,
                    elemType: OnnxDataType.FLOAT,
                    shape: d.shape ?? [],
                });
            } else if (d.kind === "output") {
                outputs.push({
                    name: d.name ?? n.label,
                    type: OnnxLinkType.OUTPUT,
                    elemType: OnnxDataType.FLOAT,
                    shape: d.shape ?? [],
                });
            } else if (d.kind === "initializer") {
                initializers.push({
                    name: d.name ?? n.label,
                    dataType: d.dataType ?? OnnxDataType.FLOAT,
                    dims: d.dims ?? [],
                });
            } else if (d.kind === "operator" && d.opType) {
                const nodeInputs = n.inputs.map((p) => p.name);
                const nodeOutputs = n.outputs.map((p) => p.name);
                const attrs = new Map<string, number>();
                if (d.attributes) {
                    for (const [k, v] of Object.entries(d.attributes)) {
                        attrs.set(k, v);
                    }
                }
                onnxNodes.push({
                    name: d.name ?? "",
                    opType: d.opType,
                    inputs: nodeInputs,
                    outputs: nodeOutputs,
                    attributes: attrs,
                });
            }
        }

        const model: OnnxParseResult = {
            irVersion: 8,
            graphName: "exported-graph",
            nodes: onnxNodes,
            initializers,
            inputs,
            outputs,
            valueInfos: [],
        };

        return OnnxWriter.serialize(model);
    }

    private createHandler(): FileHandler {
        const self = this;
        return {
            extensions: ["onnx"],
            mimeTypes: ["application/octet-stream", "application/x-onnx"],
            displayName: "ONNX Model",
            canSave: true,
            load(data: ArrayBuffer, _editor: NodeEditor) {
                self.loadOnnx(new Uint8Array(data));
            },
            save(_editor: NodeEditor) {
                const bytes = self.exportOnnx();
                return {
                    data: bytes.buffer as ArrayBuffer,
                    extension: "onnx",
                    mimeType: "application/octet-stream",
                };
            },
        };
    }
}
