// ═══════════════════════════════════════════════════════════════════════════
// ONNX model parser
//
// Ported from CyanMycelium::OnnxGraphBuilder (C++ implementation).
// Parses an ONNX protobuf binary into structured TypeScript objects
// (OnnxNodeInfo, OnnxTensorInfo, OnnxValueInfo) that can then be used
// to build a SpikyPanda ComputeGraph.
//
// Zero dependencies beyond the local pb/ reader and onnx-types.
// ═══════════════════════════════════════════════════════════════════════════

import { PBReader } from "./pb/reader";
import { MemoryStream } from "./pb/stream";
import { WireType } from "./pb/reader";
import {
    OnnxDataType,
    OnnxLinkType,
    OnnxNodeInfo,
    OnnxTensorInfo,
    OnnxValueInfo,
    KEY_MAX_LENGTH,
    TENSOR_MAX_DIMENSION,
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
    DIM_SYMBOL,
    // TensorProto fields
    TENSOR_DIMS,
    TENSOR_DATA_TYPE,
    TENSOR_FLOAT_DATA,
    TENSOR_NAME,
    TENSOR_RAW_DATA,
} from "./onnx-types";

// ─── Error codes ─────────────────────────────────────────────────────────

export const ONNX_SUCCESS = 0;
export const ONNX_UNSUPPORTED_NODE = 100;
export const ONNX_UNSUPPORTED_ATTRIBUTE = 101;
export const ONNX_UNSUPPORTED_TENSOR_DATA_TYPE = 110;
export const ONNX_UNSUPPORTED_TENSOR_DIM = 111;
export const ONNX_INVALID_INITIALIZER_SHAPE = 113;
export const ONNX_READ_ERROR = 200;
export const ONNX_SYSTEM_ERROR = 300;

// ─── Parse result ────────────────────────────────────────────────────────

/**
 * The result of parsing an ONNX model.
 */
export interface OnnxParseResult {
    irVersion: number;
    graphName: string;
    nodes: OnnxNodeInfo[];
    initializers: OnnxTensorInfo[];
    inputs: OnnxValueInfo[];
    outputs: OnnxValueInfo[];
    valueInfos: OnnxValueInfo[];
}

// ─── OnnxParser ──────────────────────────────────────────────────────────

/**
 * Parses an ONNX protobuf binary into a structured result.
 *
 * Ported from CyanMycelium::OnnxGraphBuilder.
 *
 * Usage:
 * ```typescript
 * const bytes = await fetch("model.onnx").then(r => r.arrayBuffer());
 * const result = OnnxParser.parse(new Uint8Array(bytes));
 * console.log(result.nodes.map(n => n.opType));
 * ```
 */
export class OnnxParser {
    private _error: number = ONNX_SUCCESS;
    private _errorInfo: string = "";

    public get error(): number {
        return this._error;
    }

    public get errorInfo(): string {
        return this._errorInfo;
    }

    /**
     * Parse an ONNX model from raw bytes.
     * @param data  The raw .onnx file content.
     * @returns     The parsed result, or null on error.
     */
    public static parse(data: Uint8Array): OnnxParseResult | null {
        const parser = new OnnxParser();
        return parser.parseModel(data);
    }

    /**
     * Parse an ONNX model.
     */
    public parseModel(data: Uint8Array): OnnxParseResult | null {
        const reader = new PBReader(new MemoryStream(data));
        const result: OnnxParseResult = {
            irVersion: 0,
            graphName: "",
            nodes: [],
            initializers: [],
            inputs: [],
            outputs: [],
            valueInfos: [],
        };

        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case MODEL_IR_VERSION: {
                    const v = reader.readInt32();
                    if (v === null) {
                        this._setError(ONNX_READ_ERROR, "Failed to read IR version");
                        return null;
                    }
                    result.irVersion = v;
                    break;
                }
                case MODEL_GRAPH: {
                    const sub = reader.getSubMessageReader();
                    if (!sub) {
                        this._setError(ONNX_READ_ERROR, "Failed to read graph");
                        return null;
                    }
                    if (!this._readGraph(sub, result)) return null;
                    break;
                }
                default: {
                    if (!reader.skip()) {
                        this._setError(ONNX_READ_ERROR, "Failed to skip field");
                        return null;
                    }
                }
            }
        }

        return result;
    }

    // ── Graph ─────────────────────────────────────────────────────────────

    private _readGraph(reader: PBReader, result: OnnxParseResult): boolean {
        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case GRAPH_NODE: {
                    const sub = reader.getSubMessageReader();
                    if (!sub) return this._fail("Failed to read node");
                    const node = this._readNode(sub);
                    if (!node) return false;
                    result.nodes.push(node);
                    break;
                }
                case GRAPH_NAME: {
                    const name = reader.readString(KEY_MAX_LENGTH);
                    if (name === null) return this._fail("Failed to read graph name");
                    result.graphName = name;
                    break;
                }
                case GRAPH_INITIALIZER: {
                    const sub = reader.getSubMessageReader();
                    if (!sub) return this._fail("Failed to read initializer");
                    const init = this._readInitializer(sub);
                    if (!init) return false;
                    result.initializers.push(init);
                    break;
                }
                case GRAPH_INPUT: {
                    const sub = reader.getSubMessageReader();
                    if (!sub) return this._fail("Failed to read input");
                    const vi = this._readValueInfo(sub, OnnxLinkType.INPUT);
                    if (!vi) return false;
                    result.inputs.push(vi);
                    break;
                }
                case GRAPH_OUTPUT: {
                    const sub = reader.getSubMessageReader();
                    if (!sub) return this._fail("Failed to read output");
                    const vi = this._readValueInfo(sub, OnnxLinkType.OUTPUT);
                    if (!vi) return false;
                    result.outputs.push(vi);
                    break;
                }
                case GRAPH_VALUE_INFO: {
                    const sub = reader.getSubMessageReader();
                    if (!sub) return this._fail("Failed to read value_info");
                    const vi = this._readValueInfo(sub, OnnxLinkType.UNKNOWN);
                    if (!vi) return false;
                    result.valueInfos.push(vi);
                    break;
                }
                default: {
                    if (!reader.skip()) return this._fail("Failed to skip graph field");
                }
            }
        }
        return true;
    }

    // ── Node ──────────────────────────────────────────────────────────────

    private _readNode(reader: PBReader): OnnxNodeInfo | null {
        const node: OnnxNodeInfo = {
            name: "",
            opType: "",
            inputs: [],
            outputs: [],
            attributes: new Map(),
        };

        // Two-pass read: first find op_type, then parse everything
        reader.save();
        while (reader.readTag()) {
            if (reader.fieldNumber === NODE_OP_TYPE) {
                const t = reader.readString(KEY_MAX_LENGTH);
                if (t === null) {
                    this._setError(ONNX_READ_ERROR, "Failed to read op_type");
                    return null;
                }
                node.opType = t;
                break;
            }
            reader.skip();
        }
        reader.restore();

        // Second pass: read all fields
        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case NODE_INPUT: {
                    const s = reader.readString(KEY_MAX_LENGTH);
                    if (s === null) return null;
                    if (s.length > 0) node.inputs.push(s);
                    break;
                }
                case NODE_OUTPUT: {
                    const s = reader.readString(KEY_MAX_LENGTH);
                    if (s === null) return null;
                    if (s.length > 0) node.outputs.push(s);
                    break;
                }
                case NODE_NAME: {
                    const s = reader.readString(KEY_MAX_LENGTH);
                    if (s === null) return null;
                    node.name = s;
                    break;
                }
                case NODE_OP_TYPE: {
                    // Already read in first pass, just skip
                    reader.skip();
                    break;
                }
                case NODE_ATTRIBUTE: {
                    // Inline parse (avoid sub-reader for performance)
                    const len = reader.readLength(false);
                    if (len === null) return null;
                    const end = reader.position + len;

                    let attName = "";
                    let attFloat = 0;
                    let attInt = 0;
                    let hasFloat = false;

                    while (reader.position < end) {
                        if (!reader.readTag()) return null;
                        const attField = reader.fieldNumber as number;
                        switch (attField) {
                            case ATT_NAME: {
                                const s = reader.readString(KEY_MAX_LENGTH);
                                if (s === null) return null;
                                attName = s;
                                break;
                            }
                            case ATT_FLOAT: {
                                const f = reader.readFloat();
                                if (f === null) return null;
                                attFloat = f;
                                hasFloat = true;
                                break;
                            }
                            case ATT_INT: {
                                const i = reader.readInt64();
                                if (i === null) return null;
                                attInt = i;
                                break;
                            }
                            default:
                                reader.skip();
                                break;
                        }
                    }

                    if (attName) {
                        node.attributes.set(attName, hasFloat ? attFloat : attInt);
                    }
                    break;
                }
                default: {
                    reader.skip();
                    break;
                }
            }
        }

        return node;
    }

    // ── ValueInfo ─────────────────────────────────────────────────────────

    private _readValueInfo(reader: PBReader, type: OnnxLinkType): OnnxValueInfo | null {
        const info: OnnxValueInfo = {
            name: "",
            type,
            elemType: OnnxDataType.UNDEFINED,
            shape: [],
        };

        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case VINFO_NAME: {
                    const s = reader.readString(KEY_MAX_LENGTH);
                    if (s === null) return null;
                    info.name = s;
                    break;
                }
                case VINFO_TYPE: {
                    // Inline parse TypeProto
                    const len = reader.readLength(false);
                    if (len === null) return null;
                    const end = reader.position + len;

                    while (reader.position < end) {
                        if (!reader.readTag()) return null;
                        if ((reader.fieldNumber as number) === TYPE_TENSOR) {
                            const sub = reader.getSubMessageReader();
                            if (!sub) return null;
                            if (!this._readTensorType(sub, info)) return null;
                        } else {
                            reader.skip();
                        }
                    }
                    break;
                }
                default:
                    reader.skip();
                    break;
            }
        }

        return info;
    }

    private _readTensorType(reader: PBReader, info: OnnxValueInfo): boolean {
        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case TENSOR_TYPE_ELEM_TYPE: {
                    const v = reader.readInt32();
                    if (v === null) return false;
                    info.elemType = v as OnnxDataType;
                    break;
                }
                case TENSOR_TYPE_SHAPE: {
                    const sub = reader.getSubMessageReader();
                    if (!sub) return false;
                    if (!this._readTensorShape(sub, info)) return false;
                    break;
                }
                default:
                    reader.skip();
                    break;
            }
        }
        return true;
    }

    private _readTensorShape(reader: PBReader, info: OnnxValueInfo): boolean {
        while (reader.readTag()) {
            if (reader.fieldNumber === SHAPE_DIM) {
                // Inline parse DimensionProto
                const len = reader.readLength(false);
                if (len === null) return false;
                const end = reader.position + len;

                while (reader.position < end) {
                    if (!reader.readTag()) return false;
                    const dimField = reader.fieldNumber as number;
                    switch (dimField) {
                        case DIM_VALUE: {
                            const v = reader.readInt64();
                            if (v === null) return false;
                            info.shape.push(v);
                            break;
                        }
                        case DIM_SYMBOL: {
                            // Symbolic dimension (e.g., "batch_size"), store as 0
                            reader.skip();
                            info.shape.push(0);
                            break;
                        }
                        default:
                            reader.skip();
                            break;
                    }
                }
            } else {
                reader.skip();
            }
        }
        return true;
    }

    // ── Initializer (TensorProto) ─────────────────────────────────────────

    private _readInitializer(reader: PBReader): OnnxTensorInfo | null {
        const tensor: OnnxTensorInfo = {
            name: "",
            dataType: OnnxDataType.UNDEFINED,
            dims: [],
        };

        let totalElements = 0;

        while (reader.readTag()) {
            switch (reader.fieldNumber) {
                case TENSOR_DIMS: {
                    if (reader.wireType === WireType.LEN) {
                        // Packed dims
                        const tmpDims = new Int32Array(TENSOR_MAX_DIMENSION);
                        const count = reader.readPackedInt32(tmpDims, TENSOR_MAX_DIMENSION);
                        if (count === null) return null;
                        tensor.dims = Array.from(tmpDims.subarray(0, count));
                    } else {
                        // Individual varint dim
                        const v = reader.readInt32();
                        if (v === null) return null;
                        tensor.dims.push(v);
                    }
                    // Recompute total elements
                    totalElements = tensor.dims.length > 0
                        ? tensor.dims.reduce((a, b) => a * b, 1)
                        : 0;
                    break;
                }
                case TENSOR_DATA_TYPE: {
                    const v = reader.readInt32();
                    if (v === null) return null;
                    tensor.dataType = v as OnnxDataType;
                    break;
                }
                case TENSOR_NAME: {
                    const s = reader.readString(KEY_MAX_LENGTH);
                    if (s === null) return null;
                    tensor.name = s;
                    break;
                }
                case TENSOR_FLOAT_DATA: {
                    if (totalElements === 0) {
                        reader.skip();
                        break;
                    }
                    if (!tensor.floatData) {
                        tensor.floatData = new Float32Array(totalElements);
                    }
                    if (reader.wireType === WireType.LEN) {
                        // Packed floats
                        reader.readPackedFloat32(tensor.floatData, totalElements);
                    } else {
                        // Individual float (rare)
                        const f = reader.readFloat();
                        if (f === null) return null;
                        // Find next empty slot
                        for (let i = 0; i < totalElements; i++) {
                            if (tensor.floatData[i] === 0) {
                                tensor.floatData[i] = f;
                                break;
                            }
                        }
                    }
                    break;
                }
                case TENSOR_RAW_DATA: {
                    const bytes = reader.readBytes();
                    if (bytes === null) return null;
                    tensor.rawData = bytes;
                    // If float type, also create the float view
                    if (tensor.dataType === OnnxDataType.FLOAT && totalElements > 0) {
                        const aligned = new Float32Array(bytes.buffer, bytes.byteOffset, totalElements);
                        tensor.floatData = new Float32Array(aligned); // copy to ensure alignment
                    }
                    break;
                }
                default: {
                    reader.skip();
                    break;
                }
            }
        }

        return tensor;
    }

    // ── Error helpers ─────────────────────────────────────────────────────

    private _setError(code: number, info: string): void {
        this._error = code;
        this._errorInfo = info;
    }

    private _fail(msg: string): boolean {
        this._setError(ONNX_READ_ERROR, msg);
        return false;
    }
}
