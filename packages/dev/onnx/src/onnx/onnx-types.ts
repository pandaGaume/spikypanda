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
export const MODEL_PRODUCER_NAME = 2;
export const MODEL_OPSET_IMPORT = 8;
export const MODEL_GRAPH = 7;

// OperatorSetIdProto (inside ModelProto.opset_import)
export const OPSET_DOMAIN = 1;
export const OPSET_VERSION = 2;

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
/** NodeProto.domain. The OperatorSet that defines op_type; "" is ai.onnx. */
export const NODE_DOMAIN = 7;

// AttributeProto (partial, most commonly used fields)
export const ATT_NAME = 1;
export const ATT_FLOAT = 2;
export const ATT_INT = 3;
export const ATT_TENSOR = 5;
export const ATT_FLOATS = 7;
export const ATT_INTS = 8;
export const ATT_TYPE = 20;

/**
 * AttributeProto.AttributeType (enum values from onnx.proto3).
 * Required by `onnx.checker.check_model`; without an explicit `type`
 * field the validator rejects the attribute even when the payload
 * field (ATT_INT, ATT_FLOATS, ...) is set.
 */
export enum OnnxAttributeType {
    UNDEFINED = 0,
    FLOAT = 1,
    INT = 2,
    STRING = 3,
    TENSOR = 4,
    GRAPH = 5,
    FLOATS = 6,
    INTS = 7,
    STRINGS = 8,
    TENSORS = 9,
    GRAPHS = 10,
}

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
    /**
     * NodeProto.domain: the OperatorSet that defines opType. Empty (or
     * absent) means the default ONNX domain, ai.onnx.
     *
     * Custom operators belong in their own domain, which is what the
     * standard provides the field for. The registry keys on the
     * QUALIFIED name, `domain.opType`, so an op declared in a domain and
     * one whose domain is baked into its opType string land on the same
     * entry. That is deliberate: it lets a file written the old way and a
     * file written the standard way resolve identically.
     */
    domain?: string;
    inputs: string[];
    outputs: string[];
    /**
     * Scalar int/float attributes. For lists see `listAttributes`;
     * this map keeps the first value of a list for backward-compat
     * with legacy consumers that read e.g. `kernel_shape` as a single
     * int.
     */
    attributes: Map<string, number>;
    /**
     * Names of attributes that should be serialized as FLOAT (not INT)
     * on the protobuf wire, even when their numeric value happens to
     * be integer-valued (e.g. Gemm `alpha = 1.0`). Populated by the
     * export framework via `OnnxExportContext.makeNode({ floatAttrs })`.
     * The parser doesn't populate this set; readers that need to
     * distinguish FLOAT vs INT after a parse must walk the raw bytes.
     */
    floatAttributeNames?: Set<string>;
    /**
     * Same idea for list attributes whose values are floats (e.g. a
     * hypothetical `scales: [1.5, 1.5]`). Independent from
     * `floatAttributeNames` which is only for scalars.
     */
    floatListAttributeNames?: Set<string>;
    /**
     * Repeated int / float attributes (e.g. Conv `kernel_shape: [3, 3]`,
     * `pads: [1, 1, 1, 1]`, ReduceMean `axes: [-1]`). Only populated
     * when the protobuf record carries more than one value; single-
     * value records are exposed only through `attributes`.
     */
    listAttributes?: Map<string, number[]>;
    /** Tensor-valued attributes. */
    tensorAttributes?: Map<string, OnnxTensorInfo>;
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
