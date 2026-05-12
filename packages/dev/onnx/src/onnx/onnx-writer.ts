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
    MODEL_GRAPH,
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
    NODE_ATTRIBUTE,
    // AttributeProto fields
    ATT_NAME,
    ATT_FLOAT,
    ATT_INT,
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

        // attributes (field 5, repeated)
        for (const [name, value] of node.attributes) {
            w.writeTag(NODE_ATTRIBUTE, WireType.LEN);
            w.writeSubMessage((sub) => this._writeAttribute(sub, name, value));
        }
    }

    // ── Attribute (AttributeProto) ────────────────────────────────────────

    private _writeAttribute(w: PBWriter, name: string, value: number): void {
        // name (field 1)
        w.writeTag(ATT_NAME, WireType.LEN);
        w.writeString(name);

        if (Number.isInteger(value)) {
            // int (field 3, varint — stored as int64 in ONNX)
            w.writeTag(ATT_INT, WireType.VARINT);
            w.writeInt64(value);
        } else {
            // float (field 2, fixed32)
            w.writeTag(ATT_FLOAT, WireType.FIXED32);
            w.writeFloat(value);
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
