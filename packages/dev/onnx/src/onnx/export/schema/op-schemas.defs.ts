// ═══════════════════════════════════════════════════════════════════════════
// Declarative ONNX op-attribute schemas.
//
// Each class below declares the attribute names + kinds (int / float
// / ints / floats / tensor) for one ONNX op. The decorators register
// the schema in the module-level registry; the export framework then
// looks up `opType` and classifies attribute payloads at write time
// without manual bucketing.
//
// The classes are never instantiated. Their declarations matter only
// for the decorator side-effect — which fires when this module is
// imported. Importing happens via `onnx/export/schema/index.ts`
// (re-exported from `onnx/export/index.ts`).
//
// Scope: ops emitted by CnnGraphOnnxExporter + the cardriver kernel
// serializers, plus a few zero-attr utilities (Add, Sub, ...). When a
// new serializer needs a new op, add a class here.
// ═══════════════════════════════════════════════════════════════════════════

import { attr, onnxOp } from "./op-schema";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* The fields below are never read at runtime; they exist as metadata
   markers consumed by the decorators. */

// ─── Activations & element-wise (no attributes) ──────────────────────────

@onnxOp("Add") class _Add {}
@onnxOp("Sub") class _Sub {}
@onnxOp("Mul") class _Mul {}
@onnxOp("Div") class _Div {}
@onnxOp("Sqrt") class _Sqrt {}
@onnxOp("Pow") class _Pow {}
@onnxOp("Relu") class _Relu {}
@onnxOp("Sigmoid") class _Sigmoid {}
@onnxOp("Tanh") class _Tanh {}
@onnxOp("Identity") class _Identity {}
@onnxOp("Abs") class _Abs {}
@onnxOp("Neg") class _Neg {}
@onnxOp("Exp") class _Exp {}
@onnxOp("Log") class _Log {}
@onnxOp("Atan") class _Atan {}
@onnxOp("MatMul") class _MatMul {}
@onnxOp("GlobalAveragePool") class _GlobalAveragePool {}
@onnxOp("GlobalMaxPool") class _GlobalMaxPool {}
@onnxOp("Shape") class _Shape {}
@onnxOp("Min") class _Min {}
@onnxOp("Max") class _Max {}
@onnxOp("Expand") class _Expand {}
// Reshape takes the target shape as input tensor in opset 5+; no attrs.
@onnxOp("Reshape") class _Reshape {}
// Squeeze / Unsqueeze take axes as input tensor in opset 13+; no attrs.
@onnxOp("Squeeze") class _Squeeze {}
@onnxOp("Unsqueeze") class _Unsqueeze {}

// ─── Single-attr ops ─────────────────────────────────────────────────────

@onnxOp("Concat") class _Concat { @attr.int axis!: number; }
@onnxOp("Flatten") class _Flatten { @attr.int axis!: number; }
@onnxOp("Softmax") class _Softmax { @attr.int axis!: number; }
@onnxOp("Gather") class _Gather { @attr.int axis!: number; }
@onnxOp("LeakyRelu") class _LeakyRelu { @attr.float alpha!: number; }
@onnxOp("Cast") class _Cast { @attr.int to!: number; }
@onnxOp("Transpose") class _Transpose { @attr.ints perm!: number[]; }

// ─── Reduce family ───────────────────────────────────────────────────────

@onnxOp("ReduceMean")
class _ReduceMean {
    @attr.ints axes!: number[];
    @attr.int keepdims!: number;
}

@onnxOp("ReduceSum")
class _ReduceSum {
    @attr.ints axes!: number[];
    @attr.int keepdims!: number;
}

@onnxOp("ReduceL2")
class _ReduceL2 {
    @attr.ints axes!: number[];
    @attr.int keepdims!: number;
}

@onnxOp("ReduceMax")
class _ReduceMax {
    @attr.ints axes!: number[];
    @attr.int keepdims!: number;
}

// ─── Conv / Pool ─────────────────────────────────────────────────────────

@onnxOp("Conv")
class _Conv {
    @attr.ints kernel_shape!: number[];
    @attr.ints strides!: number[];
    @attr.ints pads!: number[];
    @attr.ints dilations!: number[];
    @attr.int group!: number;
}

@onnxOp("MaxPool")
class _MaxPool {
    @attr.ints kernel_shape!: number[];
    @attr.ints strides!: number[];
    @attr.ints pads!: number[];
    @attr.int ceil_mode!: number;
}

@onnxOp("AveragePool")
class _AveragePool {
    @attr.ints kernel_shape!: number[];
    @attr.ints strides!: number[];
    @attr.ints pads!: number[];
    @attr.int count_include_pad!: number;
    @attr.int ceil_mode!: number;
}

// ─── Linear ──────────────────────────────────────────────────────────────

@onnxOp("Gemm")
class _Gemm {
    @attr.float alpha!: number;
    @attr.float beta!: number;
    @attr.int transA!: number;
    @attr.int transB!: number;
}

// ─── Slice / Pad ─────────────────────────────────────────────────────────

@onnxOp("Slice")
class _Slice {
    @attr.ints starts!: number[];
    @attr.ints ends!: number[];
    @attr.ints axes!: number[];
}

@onnxOp("Pad")
class _Pad {
    @attr.int mode!: number;
}

// ─── Constants ───────────────────────────────────────────────────────────

@onnxOp("Constant") class _Constant { @attr.tensor value!: unknown; }
@onnxOp("ConstantOfShape") class _ConstantOfShape { @attr.tensor value!: unknown; }

// ─── Quantized ops (CyanMycelium-compatible) ────────────────────────────

@onnxOp("QuantizeLinear")
class _QuantizeLinear {
    /** Axis used when y_scale / y_zero_point are per-axis (1-D
     *  tensors). 0 when per-tensor (scalars). */
    @attr.int axis!: number;
}

@onnxOp("DequantizeLinear")
class _DequantizeLinear {
    /** Same convention as QuantizeLinear. */
    @attr.int axis!: number;
}

@onnxOp("QLinearConv")
class _QLinearConv {
    @attr.ints kernel_shape!: number[];
    @attr.ints strides!: number[];
    @attr.ints pads!: number[];
    @attr.ints dilations!: number[];
    @attr.int group!: number;
}

@onnxOp("QLinearMatMul")
class _QLinearMatMul {}

// ─── Anti-unused-locals shim ────────────────────────────────────────────
//
// The schema classes above are never instantiated; their declarations
// matter only for the decorator side-effect. TypeScript's
// `noUnusedLocals` rule flags every one of them, so we sink them all
// into an exported array. The array is not used at runtime either —
// the decorators have already populated the schema registry by the
// time this module finishes loading.
export const _registeredOpSchemas: ReadonlyArray<unknown> = [
    _Add, _Sub, _Mul, _Div, _Sqrt, _Pow, _Relu, _Sigmoid, _Tanh, _Identity,
    _Abs, _Neg, _Exp, _Log, _Atan, _MatMul, _GlobalAveragePool, _GlobalMaxPool,
    _Shape, _Min, _Max, _Expand, _Reshape, _Squeeze, _Unsqueeze,
    _Concat, _Flatten, _Softmax, _Gather, _LeakyRelu, _Cast, _Transpose,
    _ReduceMean, _ReduceSum, _ReduceL2, _ReduceMax,
    _Conv, _MaxPool, _AveragePool, _Gemm, _Slice, _Pad,
    _Constant, _ConstantOfShape,
    _QuantizeLinear, _DequantizeLinear, _QLinearConv, _QLinearMatMul,
];
