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
import { getOnnxOpSchema } from "./schema/op-schema";

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

    public addInt8Initializer(name: string, dims: ReadonlyArray<number>, data: Int8Array): void {
        // Reinterpret the int8 bytes as unsigned via a copy: the
        // underlying byte values are identical (two's-complement),
        // we just want a Uint8Array view we own.
        const bytes = new Uint8Array(data.byteLength);
        bytes.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        this.initializers.push({
            name,
            dataType: OnnxDataType.INT8,
            dims: [...dims],
            rawData: bytes,
        });
    }

    public addInt32Initializer(name: string, dims: ReadonlyArray<number>, data: Int32Array | ReadonlyArray<number>): void {
        const intData = data instanceof Int32Array ? data : Int32Array.from(data);
        const buf = new ArrayBuffer(intData.byteLength);
        new Int32Array(buf).set(intData);
        this.initializers.push({
            name,
            dataType: OnnxDataType.INT32,
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

        // 1. Unified `attrs` map: classify each key via the op's
        //    @onnxOp schema. Missing schema → error (force the caller
        //    to declare it or fall back to the legacy buckets).
        if (spec.attrs && Object.keys(spec.attrs).length > 0) {
            const schema = getOnnxOpSchema(spec.opType);
            if (!schema) {
                throw new Error(
                    `OnnxExportContext.makeNode: op "${spec.opType}" has no registered schema. ` +
                        `Declare it with @onnxOp("${spec.opType}") in onnx/export/schema/op-schemas.defs.ts ` +
                        `(plus @attr.<kind> on each property), or use the legacy intAttrs / floatAttrs / ` +
                        `intsAttrs / floatsAttrs buckets at this call site.`
                );
            }
            for (const [k, v] of Object.entries(spec.attrs)) {
                const def = schema.attrs.find((a) => a.name === k);
                if (!def) {
                    throw new Error(
                        `Op "${spec.opType}": attribute "${k}" not declared in its schema. ` + `Known: [${schema.attrs.map((a) => `${a.name}: ${a.kind}`).join(", ")}].`
                    );
                }
                this._applySchemaAttr(node, def.name, def.kind, v);
            }
        }

        // 2. Legacy typed buckets (override the schema-classified
        //    entry when both reference the same key).
        if (spec.intAttrs) {
            for (const [k, v] of Object.entries(spec.intAttrs)) {
                node.attributes.set(k, v);
                node.floatAttributeNames?.delete(k);
            }
        }
        if (spec.floatAttrs) {
            for (const [k, v] of Object.entries(spec.floatAttrs)) {
                node.attributes.set(k, v);
                node.floatAttributeNames = node.floatAttributeNames ?? new Set();
                node.floatAttributeNames.add(k);
            }
        }
        if (spec.intsAttrs) {
            node.listAttributes = node.listAttributes ?? new Map();
            for (const [k, v] of Object.entries(spec.intsAttrs)) {
                node.listAttributes.set(k, [...v]);
                node.floatListAttributeNames?.delete(k);
                if (v.length > 0 && !node.attributes.has(k)) {
                    node.attributes.set(k, v[0]);
                }
            }
        }
        if (spec.floatsAttrs) {
            node.listAttributes = node.listAttributes ?? new Map();
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

        this.nodes.push(node);
    }

    /**
     * Apply a single schema-classified attribute to a node. The kind
     * comes from the @attr.<kind> decorator on the op's schema class.
     */
    private _applySchemaAttr(node: OnnxNodeInfo, name: string, kind: string, value: number | ReadonlyArray<number>): void {
        switch (kind) {
            case "int": {
                if (typeof value !== "number") {
                    throw new Error(`attr "${name}" expects int (number), got ${typeof value}`);
                }
                node.attributes.set(name, value);
                break;
            }
            case "float": {
                if (typeof value !== "number") {
                    throw new Error(`attr "${name}" expects float (number), got ${typeof value}`);
                }
                node.attributes.set(name, value);
                node.floatAttributeNames = node.floatAttributeNames ?? new Set();
                node.floatAttributeNames.add(name);
                break;
            }
            case "ints": {
                if (!Array.isArray(value)) {
                    throw new Error(`attr "${name}" expects ints (number[]), got ${typeof value}`);
                }
                node.listAttributes = node.listAttributes ?? new Map();
                node.listAttributes.set(name, [...value]);
                if (value.length > 0 && !node.attributes.has(name)) {
                    node.attributes.set(name, value[0]);
                }
                break;
            }
            case "floats": {
                if (!Array.isArray(value)) {
                    throw new Error(`attr "${name}" expects floats (number[]), got ${typeof value}`);
                }
                node.listAttributes = node.listAttributes ?? new Map();
                node.listAttributes.set(name, [...value]);
                node.floatListAttributeNames = node.floatListAttributeNames ?? new Set();
                node.floatListAttributeNames.add(name);
                if (value.length > 0 && !node.attributes.has(name)) {
                    node.attributes.set(name, value[0]);
                    node.floatAttributeNames = node.floatAttributeNames ?? new Set();
                    node.floatAttributeNames.add(name);
                }
                break;
            }
            case "tensor":
                throw new Error(`attr "${name}": tensor-valued attributes via the unified \`attrs\` API are not implemented yet.`);
            default:
                throw new Error(`attr "${name}": unknown kind "${kind}"`);
        }
    }
}
