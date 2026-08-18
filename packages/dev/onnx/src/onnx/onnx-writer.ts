// ═══════════════════════════════════════════════════════════════════════════
// ONNX model writer
//
// Symmetric counterpart to onnx-parser.ts.
// Serializes an OnnxParseResult back into a valid ONNX protobuf binary,
// reusing the same field constants and data structures.
//
// Zero dependencies beyond the local pb/ writer and onnx-types.
// ═══════════════════════════════════════════════════════════════════════════

import { PBWriter } from "./pb/writer";
import { WireType } from "./pb/reader";
import {
    OnnxDataType,
    OnnxNodeInfo,
    OnnxTensorInfo,
    OnnxValueInfo,
    // ModelProto fields
    MODEL_IR_VERSION,
    MODEL_PRODUCER_NAME,
    MODEL_OPSET_IMPORT,
    MODEL_GRAPH,
    // OperatorSetIdProto fields
    OPSET_DOMAIN,
    OPSET_VERSION,
    // GraphProto fields
    GRAPH_NODE,
    GRAPH_NAME,
    GRAPH_INITIALIZER,
    GRAPH_INPUT,
    GRAPH_OUTPUT,
    GRAPH_VALUE_INFO,
    // NodeProto fields
    NODE_INPUT,
    NODE_OUTPUT,
    NODE_NAME,
    NODE_OP_TYPE,
    NODE_DOMAIN,
    NODE_ATTRIBUTE,
    // AttributeProto fields
    ATT_NAME,
    ATT_FLOAT,
    ATT_INT,
    ATT_FLOATS,
    ATT_INTS,
    ATT_TYPE,
    OnnxAttributeType,
    // ValueInfoProto fields
    VINFO_NAME,
    VINFO_TYPE,
    // TypeProto fields
    TYPE_TENSOR,
    // TensorTypeProto fields
    TENSOR_TYPE_ELEM_TYPE,
    TENSOR_TYPE_SHAPE,
    // Shape fields
    SHAPE_DIM,
    DIM_VALUE,
    // TensorProto fields
    TENSOR_DIMS,
    TENSOR_DATA_TYPE,
    TENSOR_FLOAT_DATA,
    TENSOR_NAME,
    TENSOR_RAW_DATA,
} from "./onnx-types";
import { OnnxParseResult } from "./onnx-parser";

// ─── OnnxWriter ──────────────────────────────────────────────────────────

/**
 * Serializes an OnnxParseResult into ONNX protobuf binary.
 *
 * Usage:
 * ```typescript
 * const result = OnnxParser.parse(originalBytes);
 * // … modify result …
 * const bytes = OnnxWriter.serialize(result);
 * ```
 */
export class OnnxWriter {
    /**
     * Serialize an OnnxParseResult to raw ONNX protobuf bytes.
     */
    public static serialize(model: OnnxParseResult): Uint8Array {
        const writer = new OnnxWriter();
        return writer._writeModel(model);
    }

    // ── Model (ModelProto) ────────────────────────────────────────────────

    private _writeModel(model: OnnxParseResult): Uint8Array {
        const w = new PBWriter();

        // ir_version (field 1, varint)
        if (model.irVersion > 0) {
            w.writeTag(MODEL_IR_VERSION, WireType.VARINT);
            w.writeInt32(model.irVersion);
        }

        // producer_name (field 2, length-delimited)
        w.writeTag(MODEL_PRODUCER_NAME, WireType.LEN);
        w.writeString("spikypanda");

        // opset_import (field 8, repeated). ONNX checker requires at
        // least one entry when ir_version >= 3. We declare the default
        // domain at opset 13, which covers all ops emitted by
        // CnnGraphOnnxExporter and the cardriver serializers.
        //
        // Every custom domain used by a node needs its own entry, or the
        // file is invalid and readers reject it. That rejection is the
        // point: an op whose domain is undeclared must fail loudly rather
        // than fall back to the default domain and run the wrong kernel.
        const domains = ["", ...this._customDomains(model)];
        for (const d of domains) {
            w.writeTag(MODEL_OPSET_IMPORT, WireType.LEN);
            w.writeSubMessage((sub) => {
                sub.writeTag(OPSET_DOMAIN, WireType.LEN);
                sub.writeString(d);
                sub.writeTag(OPSET_VERSION, WireType.VARINT);
                sub.writeInt64(d.length > 0 ? 1 : 13);
            });
        }

        // graph (field 7, length-delimited)
        w.writeTag(MODEL_GRAPH, WireType.LEN);
        w.writeSubMessage((sub) => this._writeGraph(sub, model));

        return w.finish().slice(); // detach from internal buffer
    }

    // ── Graph (GraphProto) ────────────────────────────────────────────────

    private _writeGraph(w: PBWriter, model: OnnxParseResult): void {
        // nodes (field 1, repeated)
        for (const node of model.nodes) {
            w.writeTag(GRAPH_NODE, WireType.LEN);
            w.writeSubMessage((sub) => this._writeNode(sub, node));
        }

        // name (field 2)
        if (model.graphName) {
            w.writeTag(GRAPH_NAME, WireType.LEN);
            w.writeString(model.graphName);
        }

        // initializers (field 5, repeated)
        for (const init of model.initializers) {
            w.writeTag(GRAPH_INITIALIZER, WireType.LEN);
            w.writeSubMessage((sub) => this._writeInitializer(sub, init));
        }

        // inputs (field 11, repeated)
        for (const input of model.inputs) {
            w.writeTag(GRAPH_INPUT, WireType.LEN);
            w.writeSubMessage((sub) => this._writeValueInfo(sub, input));
        }

        // outputs (field 12, repeated)
        for (const output of model.outputs) {
            w.writeTag(GRAPH_OUTPUT, WireType.LEN);
            w.writeSubMessage((sub) => this._writeValueInfo(sub, output));
        }

        // value_info (field 13, repeated)
        for (const vi of model.valueInfos) {
            w.writeTag(GRAPH_VALUE_INFO, WireType.LEN);
            w.writeSubMessage((sub) => this._writeValueInfo(sub, vi));
        }
    }

    // ── Node (NodeProto) ──────────────────────────────────────────────────

    /** Distinct custom domains named by the graph's nodes, sorted. */
    private _customDomains(model: OnnxParseResult): string[] {
        const seen = new Set<string>();
        for (const node of model.nodes) {
            if (node.domain && node.domain.length > 0 && node.domain !== "ai.onnx") {
                seen.add(node.domain);
            }
        }
        return [...seen].sort();
    }

    private _writeNode(w: PBWriter, node: OnnxNodeInfo): void {
        // inputs (field 1, repeated string)
        for (const input of node.inputs) {
            w.writeTag(NODE_INPUT, WireType.LEN);
            w.writeString(input);
        }

        // outputs (field 2, repeated string)
        for (const output of node.outputs) {
            w.writeTag(NODE_OUTPUT, WireType.LEN);
            w.writeString(output);
        }

        // name (field 3)
        if (node.name) {
            w.writeTag(NODE_NAME, WireType.LEN);
            w.writeString(node.name);
        }

        // op_type (field 4)
        if (node.opType) {
            w.writeTag(NODE_OP_TYPE, WireType.LEN);
            w.writeString(node.opType);
        }

        // domain (field 7). Omitted for the default ONNX domain, which is
        // what an absent field means. Written whenever the node names a
        // custom OperatorSet, so the file says which one defines op_type
        // instead of leaving a reader to guess.
        if (node.domain && node.domain.length > 0) {
            w.writeTag(NODE_DOMAIN, WireType.LEN);
            w.writeString(node.domain);
        }

        // attributes (field 5, repeated). List-valued attributes take
        // priority: when a key appears in both `listAttributes` and
        // `attributes`, only the list form is emitted (the scalar
        // entry is the legacy fallback for list[0]).
        const emittedAsList = new Set<string>();
        if (node.listAttributes) {
            for (const [name, values] of node.listAttributes) {
                if (values.length === 0) continue;
                const isFloat = node.floatListAttributeNames?.has(name) ?? false;
                w.writeTag(NODE_ATTRIBUTE, WireType.LEN);
                w.writeSubMessage((sub) => this._writeListAttribute(sub, name, values, isFloat));
                emittedAsList.add(name);
            }
        }
        for (const [name, value] of node.attributes) {
            if (emittedAsList.has(name)) continue;
            const forceFloat = node.floatAttributeNames?.has(name) ?? false;
            w.writeTag(NODE_ATTRIBUTE, WireType.LEN);
            w.writeSubMessage((sub) => this._writeAttribute(sub, name, value, forceFloat));
        }
    }

    // ── Attribute (AttributeProto) ────────────────────────────────────────

    /**
     * Emit a scalar attribute. `forceFloat` makes the writer emit
     * AttributeProto.FLOAT even when the value is integer-valued
     * (e.g. Gemm `alpha = 1.0` must remain FLOAT for ONNX
     * conformance). Without the hint, integer values default to INT.
     */
    private _writeAttribute(w: PBWriter, name: string, value: number, forceFloat: boolean = false): void {
        // name (field 1)
        w.writeTag(ATT_NAME, WireType.LEN);
        w.writeString(name);

        const asInt = !forceFloat && Number.isInteger(value);
        if (asInt) {
            w.writeTag(ATT_TYPE, WireType.VARINT);
            w.writeInt32(OnnxAttributeType.INT);
            w.writeTag(ATT_INT, WireType.VARINT);
            w.writeInt64(value);
        } else {
            w.writeTag(ATT_TYPE, WireType.VARINT);
            w.writeInt32(OnnxAttributeType.FLOAT);
            w.writeTag(ATT_FLOAT, WireType.FIXED32);
            w.writeFloat(value);
        }
    }

    /**
     * Emit a list-valued attribute. `forceFloat` overrides the
     * Number.isInteger heuristic to force FLOATS encoding. One
     * protobuf record per element (unpacked), matching OnnxParser's
     * read path.
     */
    private _writeListAttribute(w: PBWriter, name: string, values: number[], forceFloat: boolean = false): void {
        // name (field 1)
        w.writeTag(ATT_NAME, WireType.LEN);
        w.writeString(name);

        const allInt = !forceFloat && values.every((v) => Number.isInteger(v));
        w.writeTag(ATT_TYPE, WireType.VARINT);
        w.writeInt32(allInt ? OnnxAttributeType.INTS : OnnxAttributeType.FLOATS);

        if (allInt) {
            for (const v of values) {
                w.writeTag(ATT_INTS, WireType.VARINT);
                w.writeInt64(v);
            }
        } else {
            for (const v of values) {
                w.writeTag(ATT_FLOATS, WireType.FIXED32);
                w.writeFloat(v);
            }
        }
    }

    // ── ValueInfo (ValueInfoProto) ────────────────────────────────────────

    private _writeValueInfo(w: PBWriter, info: OnnxValueInfo): void {
        // name (field 1)
        if (info.name) {
            w.writeTag(VINFO_NAME, WireType.LEN);
            w.writeString(info.name);
        }

        // type (field 2) → TypeProto → tensor_type (field 1) → TensorTypeProto
        if (info.elemType !== OnnxDataType.UNDEFINED || info.shape.length > 0) {
            w.writeTag(VINFO_TYPE, WireType.LEN);
            w.writeSubMessage((typeW) => {
                typeW.writeTag(TYPE_TENSOR, WireType.LEN);
                typeW.writeSubMessage((ttW) => this._writeTensorType(ttW, info));
            });
        }
    }

    // ── TensorTypeProto ───────────────────────────────────────────────────

    private _writeTensorType(w: PBWriter, info: OnnxValueInfo): void {
        // elem_type (field 1, varint)
        if (info.elemType !== OnnxDataType.UNDEFINED) {
            w.writeTag(TENSOR_TYPE_ELEM_TYPE, WireType.VARINT);
            w.writeInt32(info.elemType);
        }

        // shape (field 2) → TensorShapeProto
        if (info.shape.length > 0) {
            w.writeTag(TENSOR_TYPE_SHAPE, WireType.LEN);
            w.writeSubMessage((shapeW) => this._writeTensorShape(shapeW, info.shape));
        }
    }

    // ── TensorShapeProto ──────────────────────────────────────────────────

    private _writeTensorShape(w: PBWriter, shape: number[]): void {
        for (const dim of shape) {
            // dim (field 1) → DimensionProto
            w.writeTag(SHAPE_DIM, WireType.LEN);
            w.writeSubMessage((dimW) => {
                // dim_value (field 1, varint int64)
                dimW.writeTag(DIM_VALUE, WireType.VARINT);
                dimW.writeInt64(dim);
            });
        }
    }

    // ── Initializer (TensorProto) ─────────────────────────────────────────

    private _writeInitializer(w: PBWriter, tensor: OnnxTensorInfo): void {
        // dims (field 1, packed varint)
        if (tensor.dims.length > 0) {
            w.writeTag(TENSOR_DIMS, WireType.LEN);
            const dims32 = new Int32Array(tensor.dims);
            w.writePackedInt32(dims32, dims32.length);
        }

        // data_type (field 2, varint)
        w.writeTag(TENSOR_DATA_TYPE, WireType.VARINT);
        w.writeInt32(tensor.dataType);

        // float_data (field 4, packed float32) or raw_data (field 9, bytes)
        if (tensor.floatData && tensor.floatData.length > 0) {
            w.writeTag(TENSOR_FLOAT_DATA, WireType.LEN);
            w.writePackedFloat32(tensor.floatData, tensor.floatData.length);
        } else if (tensor.rawData && tensor.rawData.length > 0) {
            w.writeTag(TENSOR_RAW_DATA, WireType.LEN);
            w.writeBytes(tensor.rawData);
        }

        // name (field 8)
        if (tensor.name) {
            w.writeTag(TENSOR_NAME, WireType.LEN);
            w.writeString(tensor.name);
        }
    }
}
