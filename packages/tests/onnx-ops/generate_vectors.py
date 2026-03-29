"""
Generate ONNX reference test vectors for every operator implemented in SpikyPanda.

Uses onnx + onnxruntime to build single-op models, run them, and save:
  - test-vectors.json: inputs/outputs for node-level and graph-level tests
  - models/<op>.onnx: binary ONNX models for graph-pipeline tests

Requirements:
    pip install onnx onnxruntime numpy
"""

import json
import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper
import onnxruntime as ort
from pathlib import Path

np.random.seed(42)

OPSET = 17
OUT_PATH = Path(__file__).parent / "test-vectors.json"
MODELS_DIR = Path(__file__).parent / "models"


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _arr(shape, low=-2.0, high=2.0):
    return np.random.uniform(low, high, shape).astype(np.float32)

def _positive(shape):
    return np.random.uniform(0.1, 3.0, shape).astype(np.float32)

def _run(graph_def, feeds: dict[str, np.ndarray]) -> tuple[list[np.ndarray], bytes]:
    """Run the model and return (outputs, serialized_model_bytes)."""
    model = helper.make_model(graph_def, opset_imports=[helper.make_opsetid("", OPSET)])
    model = onnx.shape_inference.infer_shapes(model)
    onnx.checker.check_model(model)
    buf = model.SerializeToString()
    sess = ort.InferenceSession(buf, providers=["CPUExecutionProvider"])
    names = [o.name for o in sess.get_outputs()]
    return sess.run(names, feeds), buf

def _to_list(arr: np.ndarray):
    return arr.flatten().tolist()

def _save_model(op_type: str, model_bytes: bytes) -> str:
    MODELS_DIR.mkdir(exist_ok=True)
    fname = f"{op_type.lower()}.onnx"
    (MODELS_DIR / fname).write_bytes(model_bytes)
    return fname

def _make_case(op_type, inputs, outputs, attrs=None, model_bytes=None, feeds=None):
    """
    Build a test-vector dict.

    inputs:  list of (name, ndarray) for node-level tests
    feeds:   list of (name, ndarray) for graph-level tests (ONNX-shaped)
             If None, same as inputs.
    """
    ins = []
    for name, arr in inputs:
        ins.append({"name": name, "shape": list(arr.shape), "data": _to_list(arr)})

    outs = []
    for i, arr in enumerate(outputs):
        outs.append({"name": f"Y{i}", "shape": list(arr.shape), "data": _to_list(arr)})

    case = {"opType": op_type, "inputs": ins, "outputs": outs}
    if attrs:
        case["attributes"] = attrs

    # Graph-level feed data (may differ from node inputs for ops with initializers or shape quirks)
    if feeds is not None:
        case["feeds"] = []
        for name, arr in feeds:
            case["feeds"].append({"name": name, "shape": list(arr.shape), "data": _to_list(arr)})

    if model_bytes:
        case["modelFile"] = _save_model(op_type, model_bytes)

    return case


# ---------------------------------------------------------------------------
# per-op builders
# ---------------------------------------------------------------------------

def _unary(op_type, shape=(2, 4), input_fn=None):
    X = (input_fn or _arr)(shape)
    feeds = {"X": X}
    g = helper.make_graph(
        [helper.make_node(op_type, ["X"], ["Y"])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, list(shape))],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, feeds)
    return _make_case(op_type, [("X", X)], outs,
                      model_bytes=buf, feeds=[("X", X)])

def _binary(op_type, shapeA=(2, 3), shapeB=(2, 3)):
    A, B = _arr(shapeA), _arr(shapeB)
    feeds = {"A": A, "B": B}
    g = helper.make_graph(
        [helper.make_node(op_type, ["A", "B"], ["Y"])],
        "g",
        [
            helper.make_tensor_value_info("A", TensorProto.FLOAT, list(shapeA)),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, list(shapeB)),
        ],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, feeds)
    return _make_case(op_type, [("A", A), ("B", B)], outs,
                      model_bytes=buf, feeds=[("A", A), ("B", B)])


# ---- activations -----------------------------------------------------------

def gen_relu():      return _unary("Relu")
def gen_sigmoid():   return _unary("Sigmoid")
def gen_tanh():      return _unary("Tanh")
def gen_exp():       return _unary("Exp", (2, 3))
def gen_log():       return _unary("Log", (2, 3), _positive)
def gen_sqrt():      return _unary("Sqrt", (2, 3), _positive)
def gen_abs():       return _unary("Abs")
def gen_neg():       return _unary("Neg")

def gen_leaky_relu():
    X = _arr((2, 4))
    g = helper.make_graph(
        [helper.make_node("LeakyRelu", ["X"], ["Y"], alpha=0.01)],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [2, 4])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("LeakyRelu", [("X", X)], outs, {"alpha": 0.01},
                      model_bytes=buf, feeds=[("X", X)])

def gen_clip():
    X = _arr((2, 4))
    mn = np.array(-1.0, dtype=np.float32)
    mx = np.array(1.0, dtype=np.float32)
    g = helper.make_graph(
        [helper.make_node("Clip", ["X", "min", "max"], ["Y"])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [2, 4])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
        initializer=[
            numpy_helper.from_array(mn, "min"),
            numpy_helper.from_array(mx, "max"),
        ],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Clip", [("X", X), ("min", mn.reshape(1)), ("max", mx.reshape(1))], outs,
                      model_bytes=buf, feeds=[("X", X)])

def gen_softmax():
    X = _arr((2, 4))
    g = helper.make_graph(
        [helper.make_node("Softmax", ["X"], ["Y"], axis=1)],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [2, 4])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Softmax", [("X", X)], outs, {"axis": 1},
                      model_bytes=buf, feeds=[("X", X)])

# ---- math ------------------------------------------------------------------

def gen_add(): return _binary("Add")
def gen_sub(): return _binary("Sub")
def gen_mul(): return _binary("Mul")
def gen_atan(): return _unary("Atan", (2, 3))

def gen_div():
    A = _arr((2, 3))
    B = _positive((2, 3))
    g = helper.make_graph(
        [helper.make_node("Div", ["A", "B"], ["Y"])],
        "g",
        [
            helper.make_tensor_value_info("A", TensorProto.FLOAT, [2, 3]),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, [2, 3]),
        ],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"A": A, "B": B})
    return _make_case("Div", [("A", A), ("B", B)], outs,
                      model_bytes=buf, feeds=[("A", A), ("B", B)])

def gen_pow():
    A = _positive((2, 3))
    B = _arr((2, 3), low=0.5, high=2.0)
    g = helper.make_graph(
        [helper.make_node("Pow", ["A", "B"], ["Y"])],
        "g",
        [
            helper.make_tensor_value_info("A", TensorProto.FLOAT, [2, 3]),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, [2, 3]),
        ],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"A": A, "B": B})
    return _make_case("Pow", [("A", A), ("B", B)], outs,
                      model_bytes=buf, feeds=[("A", A), ("B", B)])

def gen_gemm():
    A = _arr((2, 3))
    B = _arr((3, 4))
    C = _arr((4,))
    g = helper.make_graph(
        [helper.make_node("Gemm", ["A", "B", "C"], ["Y"], alpha=1.0, beta=1.0, transA=0, transB=0)],
        "g",
        [
            helper.make_tensor_value_info("A", TensorProto.FLOAT, [2, 3]),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, [3, 4]),
            helper.make_tensor_value_info("C", TensorProto.FLOAT, [4]),
        ],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"A": A, "B": B, "C": C})
    return _make_case("Gemm", [("A", A), ("B", B), ("C", C)], outs,
                      {"alpha": 1.0, "beta": 1.0, "transA": 0, "transB": 0},
                      model_bytes=buf, feeds=[("A", A), ("B", B), ("C", C)])

def gen_concat():
    A = _arr((2, 3))
    B = _arr((2, 4))
    g = helper.make_graph(
        [helper.make_node("Concat", ["A", "B"], ["Y"], axis=1)],
        "g",
        [
            helper.make_tensor_value_info("A", TensorProto.FLOAT, [2, 3]),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, [2, 4]),
        ],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"A": A, "B": B})
    return _make_case("Concat", [("A", A), ("B", B)], outs, {"axis": 1},
                      model_bytes=buf, feeds=[("A", A), ("B", B)])

def gen_slice():
    X = _arr((4, 5))
    starts = np.array([1], dtype=np.int64)
    ends = np.array([4], dtype=np.int64)
    axes = np.array([1], dtype=np.int64)
    g = helper.make_graph(
        [helper.make_node("Slice", ["X", "starts", "ends", "axes"], ["Y"])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [4, 5])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
        initializer=[
            numpy_helper.from_array(starts, "starts"),
            numpy_helper.from_array(ends, "ends"),
            numpy_helper.from_array(axes, "axes"),
        ],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Slice",
                      [("X", X), ("starts", starts.astype(np.float32)),
                       ("ends", ends.astype(np.float32)), ("axes", axes.astype(np.float32))],
                      outs, model_bytes=buf, feeds=[("X", X)])

# ---- matrix ----------------------------------------------------------------

def gen_matmul():
    A = _arr((2, 3))
    B = _arr((3, 4))
    g = helper.make_graph(
        [helper.make_node("MatMul", ["A", "B"], ["Y"])],
        "g",
        [
            helper.make_tensor_value_info("A", TensorProto.FLOAT, [2, 3]),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, [3, 4]),
        ],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"A": A, "B": B})
    return _make_case("MatMul", [("A", A), ("B", B)], outs,
                      model_bytes=buf, feeds=[("A", A), ("B", B)])

def gen_transpose():
    X = _arr((2, 3))
    g = helper.make_graph(
        [helper.make_node("Transpose", ["X"], ["Y"], perm=[1, 0])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [2, 3])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Transpose", [("X", X)], outs, {"perm": [1, 0]},
                      model_bytes=buf, feeds=[("X", X)])

def gen_reshape():
    X = _arr((2, 6))
    shape = np.array([3, 4], dtype=np.int64)
    g = helper.make_graph(
        [helper.make_node("Reshape", ["X", "shape"], ["Y"])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [2, 6])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
        initializer=[numpy_helper.from_array(shape, "shape")],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Reshape", [("X", X), ("shape", shape.astype(np.float32))], outs,
                      model_bytes=buf, feeds=[("X", X)])

def gen_flatten():
    X = _arr((2, 3, 4))
    g = helper.make_graph(
        [helper.make_node("Flatten", ["X"], ["Y"], axis=1)],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [2, 3, 4])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Flatten", [("X", X)], outs, {"axis": 1},
                      model_bytes=buf, feeds=[("X", X)])

def gen_squeeze():
    X = _arr((1, 3, 1, 4))
    axes = np.array([0, 2], dtype=np.int64)
    g = helper.make_graph(
        [helper.make_node("Squeeze", ["X", "axes"], ["Y"])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [1, 3, 1, 4])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
        initializer=[numpy_helper.from_array(axes, "axes")],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Squeeze", [("X", X), ("axes", axes.astype(np.float32))], outs,
                      model_bytes=buf, feeds=[("X", X)])

def gen_unsqueeze():
    X = _arr((3, 4))
    axes = np.array([0, 3], dtype=np.int64)
    g = helper.make_graph(
        [helper.make_node("Unsqueeze", ["X", "axes"], ["Y"])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [3, 4])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
        initializer=[numpy_helper.from_array(axes, "axes")],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Unsqueeze", [("X", X), ("axes", axes.astype(np.float32))], outs,
                      model_bytes=buf, feeds=[("X", X)])

def gen_gather():
    X = _arr((4, 3))
    indices = np.array([0, 2, 3], dtype=np.int64)
    g = helper.make_graph(
        [helper.make_node("Gather", ["X", "indices"], ["Y"], axis=0)],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [4, 3])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
        initializer=[numpy_helper.from_array(indices, "indices")],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Gather", [("X", X), ("indices", indices.astype(np.float32))], outs,
                      {"axis": 0}, model_bytes=buf, feeds=[("X", X)])

# ---- conv ------------------------------------------------------------------

def gen_conv_1d():
    X = _arr((1, 2, 8))
    W = _arr((3, 2, 3))
    B = _arr((3,))
    g = helper.make_graph(
        [helper.make_node("Conv", ["X", "W", "B"], ["Y"],
                          kernel_shape=[3], strides=[1], pads=[0, 0])],
        "g",
        [
            helper.make_tensor_value_info("X", TensorProto.FLOAT, [1, 2, 8]),
            helper.make_tensor_value_info("W", TensorProto.FLOAT, [3, 2, 3]),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, [3]),
        ],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X, "W": W, "B": B})
    return _make_case("Conv", [("X", X), ("W", W), ("B", B)], outs,
                      {"kernel_shape": 3, "strides": 1, "pads": 0},
                      model_bytes=buf, feeds=[("X", X), ("W", W), ("B", B)])

def gen_maxpool():
    X = _arr((1, 2, 8))
    g = helper.make_graph(
        [helper.make_node("MaxPool", ["X"], ["Y"], kernel_shape=[2], strides=[2])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [1, 2, 8])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("MaxPool", [("X", X)], outs,
                      {"kernel_shape": 2, "strides": 2, "pads": 0},
                      model_bytes=buf, feeds=[("X", X)])

def gen_averagepool():
    X = _arr((1, 2, 8))
    g = helper.make_graph(
        [helper.make_node("AveragePool", ["X"], ["Y"], kernel_shape=[2], strides=[2])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [1, 2, 8])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("AveragePool", [("X", X)], outs,
                      {"kernel_shape": 2, "strides": 2, "pads": 0},
                      model_bytes=buf, feeds=[("X", X)])

def gen_globalaveragepool():
    X = _arr((1, 3, 6))
    g = helper.make_graph(
        [helper.make_node("GlobalAveragePool", ["X"], ["Y"])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [1, 3, 6])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("GlobalAveragePool", [("X", X)], outs,
                      model_bytes=buf, feeds=[("X", X)])

# ---- normalization ---------------------------------------------------------

def gen_batchnorm():
    X = _arr((1, 3, 4))
    scale = _positive((3,))
    bias = _arr((3,))
    mean = _arr((3,), -0.5, 0.5)
    var = _positive((3,))
    all_feeds = {"X": X, "scale": scale, "B": bias, "mean": mean, "var": var}
    g = helper.make_graph(
        [helper.make_node("BatchNormalization", ["X", "scale", "B", "mean", "var"], ["Y"],
                          epsilon=1e-5)],
        "g",
        [
            helper.make_tensor_value_info("X", TensorProto.FLOAT, [1, 3, 4]),
            helper.make_tensor_value_info("scale", TensorProto.FLOAT, [3]),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, [3]),
            helper.make_tensor_value_info("mean", TensorProto.FLOAT, [3]),
            helper.make_tensor_value_info("var", TensorProto.FLOAT, [3]),
        ],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, all_feeds)
    feed_list = [("X", X), ("scale", scale), ("B", bias), ("mean", mean), ("var", var)]
    return _make_case("BatchNormalization", feed_list, outs, {"epsilon": 1e-5},
                      model_bytes=buf, feeds=feed_list)

def gen_layernorm():
    X = _arr((2, 4))
    scale = _positive((4,))
    bias = _arr((4,))
    g = helper.make_graph(
        [helper.make_node("LayerNormalization", ["X", "scale", "B"], ["Y"],
                          axis=-1, epsilon=1e-5)],
        "g",
        [
            helper.make_tensor_value_info("X", TensorProto.FLOAT, [2, 4]),
            helper.make_tensor_value_info("scale", TensorProto.FLOAT, [4]),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, [4]),
        ],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X, "scale": scale, "B": bias})
    feed_list = [("X", X), ("scale", scale), ("B", bias)]
    return _make_case("LayerNormalization", feed_list, outs, {"axis": -1, "epsilon": 1e-5},
                      model_bytes=buf, feeds=feed_list)

def gen_dropout():
    return _unary("Dropout", (2, 4))

# ---- misc ------------------------------------------------------------------

def gen_reducemean():
    X = _arr((3, 4))
    g = helper.make_graph(
        [helper.make_node("ReduceMean", ["X"], ["Y"], axes=[1], keepdims=1)],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [3, 4])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("ReduceMean", [("X", X)], outs, {"axes": 1, "keepdims": 1},
                      model_bytes=buf, feeds=[("X", X)])

def gen_reducesum():
    X = _arr((3, 4))
    axes = np.array([1], dtype=np.int64)
    g = helper.make_graph(
        [helper.make_node("ReduceSum", ["X", "axes"], ["Y"], keepdims=1)],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [3, 4])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
        initializer=[numpy_helper.from_array(axes, "axes")],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("ReduceSum", [("X", X)], outs, {"axes": 1, "keepdims": 1},
                      model_bytes=buf, feeds=[("X", X)])

def gen_identity(): return _unary("Identity", (2, 3))
def gen_cast():
    X = _arr((2, 3))
    g = helper.make_graph(
        [helper.make_node("Cast", ["X"], ["Y"], to=TensorProto.FLOAT)],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [2, 3])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Cast", [("X", X)], outs,
                      model_bytes=buf, feeds=[("X", X)])

def gen_shape():
    X = _arr((2, 3, 4))
    g = helper.make_graph(
        [helper.make_node("Shape", ["X"], ["Y"])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [2, 3, 4])],
        [helper.make_tensor_value_info("Y", TensorProto.INT64, None)],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Shape", [("X", X)], [o.astype(np.float32) for o in outs],
                      model_bytes=buf, feeds=[("X", X)])

def gen_constantofshape():
    shape = np.array([2, 3], dtype=np.int64)
    val = numpy_helper.from_array(np.array([1.5], dtype=np.float32), "value")
    g = helper.make_graph(
        [helper.make_node("ConstantOfShape", ["shape"], ["Y"], value=val)],
        "g",
        [helper.make_tensor_value_info("shape", TensorProto.INT64, [2])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"shape": shape})
    return _make_case("ConstantOfShape",
                      [("shape", shape.astype(np.float32))], outs, {"value": 1.5},
                      model_bytes=buf, feeds=[("shape", shape.astype(np.float32))])

def gen_pad():
    X = _arr((2, 3))
    pads = np.array([1, 1, 1, 1], dtype=np.int64)
    val = np.array([0.0], dtype=np.float32)
    g = helper.make_graph(
        [helper.make_node("Pad", ["X", "pads", "val"], ["Y"])],
        "g",
        [helper.make_tensor_value_info("X", TensorProto.FLOAT, [2, 3])],
        [helper.make_tensor_value_info("Y", TensorProto.FLOAT, None)],
        initializer=[
            numpy_helper.from_array(pads, "pads"),
            numpy_helper.from_array(val, "val"),
        ],
    )
    outs, buf = _run(g, {"X": X})
    return _make_case("Pad",
                      [("X", X), ("pads", pads.astype(np.float32)), ("val", val)], outs,
                      model_bytes=buf, feeds=[("X", X)])

def gen_min(): return _binary("Min")
def gen_max(): return _binary("Max")

# ---- recurrent -------------------------------------------------------------

def gen_lstm():
    seq_len, input_size, H = 3, 4, 2
    X = _arr((seq_len, 1, input_size))
    W = _arr((1, 4 * H, input_size))
    R = _arr((1, 4 * H, H))
    B = _arr((1, 8 * H,))

    g = helper.make_graph(
        [helper.make_node("LSTM", ["X", "W", "R", "B"], ["", "Y_h"], hidden_size=H)],
        "g",
        [
            helper.make_tensor_value_info("X", TensorProto.FLOAT, [seq_len, 1, input_size]),
            helper.make_tensor_value_info("W", TensorProto.FLOAT, [1, 4*H, input_size]),
            helper.make_tensor_value_info("R", TensorProto.FLOAT, [1, 4*H, H]),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, [1, 8*H]),
        ],
        [helper.make_tensor_value_info("Y_h", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X, "W": W, "R": R, "B": B})
    X_flat = X.reshape(seq_len, input_size)
    return _make_case("LSTM",
                      [("X", X_flat), ("W", W), ("R", R), ("B", B)], outs,
                      {"hidden_size": H},
                      model_bytes=buf,
                      feeds=[("X", X), ("W", W), ("R", R), ("B", B)])

def gen_gru():
    seq_len, input_size, H = 3, 4, 2
    X = _arr((seq_len, 1, input_size))
    W = _arr((1, 3 * H, input_size))
    R = _arr((1, 3 * H, H))
    B = _arr((1, 6 * H,))

    g = helper.make_graph(
        [helper.make_node("GRU", ["X", "W", "R", "B"], ["", "Y_h"],
                          hidden_size=H, linear_before_reset=1)],
        "g",
        [
            helper.make_tensor_value_info("X", TensorProto.FLOAT, [seq_len, 1, input_size]),
            helper.make_tensor_value_info("W", TensorProto.FLOAT, [1, 3*H, input_size]),
            helper.make_tensor_value_info("R", TensorProto.FLOAT, [1, 3*H, H]),
            helper.make_tensor_value_info("B", TensorProto.FLOAT, [1, 6*H]),
        ],
        [helper.make_tensor_value_info("Y_h", TensorProto.FLOAT, None)],
    )
    outs, buf = _run(g, {"X": X, "W": W, "R": R, "B": B})
    X_flat = X.reshape(seq_len, input_size)
    return _make_case("GRU",
                      [("X", X_flat), ("W", W), ("R", R), ("B", B)], outs,
                      {"hidden_size": H},
                      model_bytes=buf,
                      feeds=[("X", X), ("W", W), ("R", R), ("B", B)])


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

ALL_GENERATORS = [
    gen_relu, gen_sigmoid, gen_tanh, gen_leaky_relu, gen_clip, gen_softmax,
    gen_exp, gen_log, gen_sqrt, gen_abs, gen_neg,
    gen_add, gen_sub, gen_mul, gen_atan, gen_div, gen_pow,
    gen_gemm, gen_concat, gen_slice,
    gen_matmul, gen_transpose, gen_reshape, gen_flatten,
    gen_squeeze, gen_unsqueeze, gen_gather,
    gen_conv_1d, gen_maxpool, gen_averagepool, gen_globalaveragepool,
    gen_batchnorm, gen_layernorm, gen_dropout,
    gen_reducemean, gen_reducesum, gen_identity, gen_cast, gen_shape,
    gen_constantofshape, gen_pad, gen_min, gen_max,
    gen_lstm, gen_gru,
]

def main():
    vectors = []
    failed = []
    for gen in ALL_GENERATORS:
        name = gen.__name__.replace("gen_", "")
        try:
            case = gen()
            vectors.append(case)
            print(f"  OK  {case['opType']}")
        except Exception as e:
            failed.append((name, str(e)))
            print(f" FAIL {name}: {e}")

    OUT_PATH.write_text(json.dumps(vectors, indent=2))
    print(f"\nWrote {len(vectors)} test vectors to {OUT_PATH}")
    print(f"Models saved to {MODELS_DIR}/")
    if failed:
        print(f"\n{len(failed)} failures:")
        for name, err in failed:
            print(f"  - {name}: {err}")
    else:
        print("All operators generated successfully.")

if __name__ == "__main__":
    main()
