// ═══════════════════════════════════════════════════════════════════════════
// ONNX data types and protobuf field constants
//
// Mirrors the ONNX 1.18.0 protobuf schema (onnx.proto3) as TypeScript
// types and numeric constants. No code generation required.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Tensor data types (from onnx.proto3 TensorProto.DataType) ───────────

export enum OnnxDataType {
    UNDEFINED = 0,
    FLOAT = 1,
    UINT8 = 2,
    INT8 = 3,
    UINT16 = 4,
    INT16 = 5,
    INT32 = 6,
    INT64 = 7,
    STRING = 8,
    BOOL = 9,
    FLOAT16 = 10,
    DOUBLE = 11,
    UINT32 = 12,
    UINT64 = 13,
    COMPLEX64 = 14,
    COMPLEX128 = 15,
    BFLOAT16 = 16,
}

/** Byte size per element for supported data types. */
export function onnxDataTypeSize(type: OnnxDataType): number {
    switch (type) {
        case OnnxDataType.FLOAT:
        case OnnxDataType.INT32:
        case OnnxDataType.UINT32:
            return 4;
        case OnnxDataType.DOUBLE:
        case OnnxDataType.INT64:
        case OnnxDataType.UINT64:
            return 8;
        case OnnxDataType.FLOAT16:
        case OnnxDataType.BFLOAT16:
        case OnnxDataType.INT16:
        case OnnxDataType.UINT16:
            return 2;
        case OnnxDataType.INT8:
        case OnnxDataType.UINT8:
        case OnnxDataType.BOOL:
            return 1;
        default:
            return 0;
    }
}

// ─── Link type (mirrors CyanMycelium::LinkType) ─────────────────────────

export enum OnnxLinkType {
    UNKNOWN = 0,
    INPUT = 1,
    OUTPUT = 2,
    INITIALIZER = 3,
}

// ─── Protobuf field numbers ──────────────────────────────────────────────
// These match the ONNX .proto field indices exactly.

// ModelProto
export const MODEL_IR_VERSION = 1;
export const MODEL_GRAPH = 7;

// GraphProto
export const GRAPH_NODE = 1;
export const GRAPH_NAME = 2;
export const GRAPH_INITIALIZER = 5;
export const GRAPH_DOC_STRING = 10;
export const GRAPH_INPUT = 11;
export const GRAPH_OUTPUT = 12;
export const GRAPH_VALUE_INFO = 13;

// NodeProto
export const NODE_INPUT = 1;
export const NODE_OUTPUT = 2;
export const NODE_NAME = 3;
export const NODE_OP_TYPE = 4;
export const NODE_ATTRIBUTE = 5;

// AttributeProto (partial, most commonly used fields)
export const ATT_NAME = 1;
export const ATT_FLOAT = 2;
export const ATT_INT = 3;

// ValueInfoProto
export const VINFO_NAME = 1;
export const VINFO_TYPE = 2;

// TypeProto
export const TYPE_TENSOR = 1;

// TensorTypeProto
export const TENSOR_TYPE_ELEM_TYPE = 1;
export const TENSOR_TYPE_SHAPE = 2;

// TensorShapeProto.Dimension
export const SHAPE_DIM = 1;
export const DIM_VALUE = 1;
export const DIM_SYMBOL = 2;

// TensorProto (initializer)
export const TENSOR_DIMS = 1;
export const TENSOR_DATA_TYPE = 2;
export const TENSOR_FLOAT_DATA = 4;
export const TENSOR_INT32_DATA = 5;
export const TENSOR_STRING_DATA = 6;
export const TENSOR_INT64_DATA = 7;
export const TENSOR_NAME = 8;
export const TENSOR_RAW_DATA = 9;
export const TENSOR_DOUBLE_DATA = 10;
export const TENSOR_UINT64_DATA = 11;

// ─── Max constants ───────────────────────────────────────────────────────

export const KEY_MAX_LENGTH = 128;
export const TENSOR_MAX_DIMENSION = 8;

// ─── Parsed structures ──────────────────────────────────────────────────

/**
 * A parsed tensor initializer (weights, biases, etc.).
 */
export interface OnnxTensorInfo {
    name: string;
    dataType: OnnxDataType;
    dims: number[];
    floatData?: Float32Array;
    rawData?: Uint8Array;
}

/**
 * A parsed ONNX operator node.
 */
export interface OnnxNodeInfo {
    name: string;
    opType: string;
    inputs: string[];
    outputs: string[];
    attributes: Map<string, number>; // float or int attributes
}

/**
 * A parsed value info (graph input/output with shape metadata).
 */
export interface OnnxValueInfo {
    name: string;
    type: OnnxLinkType;
    elemType: OnnxDataType;
    shape: number[];
}
