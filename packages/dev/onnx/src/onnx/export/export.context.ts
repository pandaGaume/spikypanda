// ═══════════════════════════════════════════════════════════════════════════
// Default implementation of OnnxExportContext.
//
// Acts as an incremental builder for OnnxParseResult. The exporter
// creates one instance per export call, hands it to each kernel
// serializer, then snapshots .nodes and .initializers to populate
// the OnnxParseResult passed to OnnxWriter.serialize.
// ═══════════════════════════════════════════════════════════════════════════

import { OnnxDataType } from "../onnx-types";
import type { OnnxNodeInfo, OnnxTensorInfo } from "../onnx-types";
import type { OnnxExportContext, OnnxNodeSpec } from "./export.types";

export class DefaultOnnxExportContext implements OnnxExportContext {
    public readonly nodes: OnnxNodeInfo[] = [];
    public readonly initializers: OnnxTensorInfo[] = [];

    private _counter = 0;
    private _scopeHint = "k";

    /**
     * Scope subsequent name allocations under this hint (typically a
     * kernel id or index). The exporter calls this around each
     * kernel's serializer invocation so allocated names are
     * disambiguated across the graph.
     */
    public setNamingScope(scopeHint: string): void {
        this._scopeHint = scopeHint;
    }

    public allocateTensorName(hint: string = "t"): string {
        return `${this._scopeHint}_${hint}_${this._counter++}`;
    }

    public addNode(node: OnnxNodeInfo): void {
        this.nodes.push(node);
    }

    public addInitializer(init: OnnxTensorInfo): void {
        this.initializers.push(init);
    }

    public addFloatInitializer(name: string, dims: ReadonlyArray<number>, data: Float32Array | ReadonlyArray<number>): void {
        const floatData = data instanceof Float32Array ? data : Float32Array.from(data);
        // Copy into a detached buffer so the caller can reuse its
        // source array without aliasing.
        const buf = new ArrayBuffer(floatData.byteLength);
        new Float32Array(buf).set(floatData);
        this.initializers.push({
            name,
            dataType: OnnxDataType.FLOAT,
            dims: [...dims],
            rawData: new Uint8Array(buf),
        });
    }

    public addInt64Initializer(name: string, dims: ReadonlyArray<number>, data: ReadonlyArray<number>): void {
        const buf = new ArrayBuffer(data.length * 8);
        const view = new DataView(buf);
        for (let i = 0; i < data.length; i++) {
            // Little-endian int64. ONNX raw_data is always LE.
            view.setBigInt64(i * 8, BigInt(data[i]), true);
        }
        this.initializers.push({
            name,
            dataType: OnnxDataType.INT64,
            dims: [...dims],
            rawData: new Uint8Array(buf),
        });
    }

    public makeNode(spec: OnnxNodeSpec): void {
        const node: OnnxNodeInfo = {
            name: spec.name ?? "",
            opType: spec.opType,
            inputs: [...spec.inputs],
            outputs: [...spec.outputs],
            attributes: new Map(),
        };

        if (spec.intAttrs) {
            for (const [k, v] of Object.entries(spec.intAttrs)) {
                node.attributes.set(k, v);
            }
        }
        if (spec.floatAttrs) {
            for (const [k, v] of Object.entries(spec.floatAttrs)) {
                node.attributes.set(k, v);
                node.floatAttributeNames = node.floatAttributeNames ?? new Set();
                node.floatAttributeNames.add(k);
            }
        }

        const hasLists = (spec.intsAttrs && Object.keys(spec.intsAttrs).length > 0)
            || (spec.floatsAttrs && Object.keys(spec.floatsAttrs).length > 0);
        if (hasLists) {
            node.listAttributes = new Map();
            if (spec.intsAttrs) {
                for (const [k, v] of Object.entries(spec.intsAttrs)) {
                    node.listAttributes.set(k, [...v]);
                    if (v.length > 0 && !node.attributes.has(k)) {
                        node.attributes.set(k, v[0]);
                    }
                }
            }
            if (spec.floatsAttrs) {
                for (const [k, v] of Object.entries(spec.floatsAttrs)) {
                    node.listAttributes.set(k, [...v]);
                    node.floatListAttributeNames = node.floatListAttributeNames ?? new Set();
                    node.floatListAttributeNames.add(k);
                    if (v.length > 0 && !node.attributes.has(k)) {
                        node.attributes.set(k, v[0]);
                        node.floatAttributeNames = node.floatAttributeNames ?? new Set();
                        node.floatAttributeNames.add(k);
                    }
                }
            }
        }

        this.nodes.push(node);
    }
}
