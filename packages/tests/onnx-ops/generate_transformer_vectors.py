"""Generate small Transformer conformance fixtures with ONNX Runtime, no model download."""
from pathlib import Path
import json
import numpy as np
import onnx
from onnx import helper as h, numpy_helper as nh, TensorProto as T
import onnxruntime as ort

ROOT = Path(__file__).parent
rng = np.random.default_rng(20261010)
cases = []


def tensor(value):
    return {"shape": list(value.shape), "data": value.reshape(-1).astype(float).tolist()}


def record(name, nodes, feeds, outputs, initializers=(), dynamic=False):
    inputs = [h.make_tensor_value_info(k, T.INT64 if v.dtype == np.int64 else T.BOOL if v.dtype == np.bool_ else T.FLOAT,
              ["batch", "sequence"] if dynamic and v.ndim == 2 else list(v.shape)) for k, v in feeds.items()]
    infos = [h.make_empty_tensor_value_info(k) for k in outputs]
    graph = h.make_graph(nodes, name, inputs, infos, list(initializers))
    model = h.make_model(graph, opset_imports=[h.make_opsetid("", 17)], ir_version=8)
    session = ort.InferenceSession(model.SerializeToString(), providers=["CPUExecutionProvider"])
    results = session.run(outputs, feeds)
    for info, result in zip(model.graph.output, results):
        info.CopyFrom(h.make_tensor_value_info(info.name, T.INT64 if result.dtype == np.int64 else T.BOOL if result.dtype == np.bool_ else T.FLOAT, list(result.shape)))
    onnx.checker.check_model(model)
    path = ROOT / "models" / f"transformer-{name}.onnx"
    path.write_bytes(model.SerializeToString())
    cases.append({"name": name, "modelFile": path.name,
                  "inputs": {k: tensor(v) for k, v in feeds.items()},
                  "outputs": {k: tensor(v) for k, v in zip(outputs, results)}})


def op(name, op_type, inputs, **attrs):
    record(name, [h.make_node(op_type, list(inputs), ["result"], **attrs)], inputs, ["result"])


f = lambda shape: rng.normal(size=shape).astype(np.float32)
op("matmul-attention", "MatMul", {"a": f((2, 3, 4, 5)), "b": f((1, 3, 5, 6))})
op("matmul-projection", "MatMul", {"a": f((2, 4, 5)), "b": f((5, 7))})
op("matmul-vector-batch", "MatMul", {"a": f((5,)), "b": f((2, 5, 3))})
op("matmul-dot", "MatMul", {"a": f((5,)), "b": f((5,))})
op("gather-embedding", "Gather", {"a": f((8, 6)), "i": np.array([[0, 2, 7], [3, -1, 1]], np.int64)})
op("gather-axis", "Gather", {"a": f((2, 3, 4)), "i": np.array([[2, 0], [1, -1]], np.int64)}, axis=-2)
op("gather-scalar", "Gather", {"a": f((2, 3, 4)), "i": np.array(1, np.int64)}, axis=1)
op("transpose-heads", "Transpose", {"a": f((2, 4, 3, 5))}, perm=[0, 2, 1, 3])
op("softmax-axis", "Softmax", {"a": f((2, 3, 4, 5))}, axis=1)
op("softmax-last", "Softmax", {"a": (f((2, 3, 4, 5)) + 1000)}, axis=-1)
op("reduce-mean", "ReduceMean", {"a": f((2, 3, 4))}, axes=[0, 2], keepdims=0)
op("reduce-sum", "ReduceSum", {"a": f((2, 3, 4)), "axes": np.array([-1], np.int64)}, keepdims=1)
op("divide-broadcast", "Div", {"a": f((2, 1, 3)), "b": (f((1, 4, 1)) + 3)})
op("power-broadcast", "Pow", {"a": np.abs(f((2, 1, 3))), "b": np.array([[[2], [3]]], np.float32)})
op("concat-shapes", "Concat", {"a": f((2,)), "b": f((3,))}, axis=0)
op("concat-4d", "Concat", {"a": f((2, 3, 1, 4)), "b": f((2, 3, 2, 4))}, axis=2)
op("unsqueeze-negative", "Unsqueeze", {"a": f((2, 3)), "axes": np.array([0, -1], np.int64)})
op("squeeze-scalar", "Squeeze", {"a": np.array([[[2]]], np.float32)})
op("erf-gelu", "Erf", {"a": np.linspace(-4, 4, 25, dtype=np.float32)})
op("equal-padding", "Equal", {"a": np.array([[1, 2, 3], [4, 1, 1]], np.int64), "b": np.array(1, np.int64)})
op("not-padding", "Not", {"a": np.array([[True, False], [False, True]], np.bool_)})
op("where-mask", "Where", {"a": np.array([[[True, False, True, False]], [[False, True, True, False]]]), "x": f((1, 3, 1)), "y": np.array(-10000, np.float32)})
op("range-positions", "Range", {"start": np.array(1, np.int64), "end": np.array(8, np.int64), "delta": np.array(2, np.int64)})
op("cumsum-positions", "CumSum", {"a": f((2, 3, 4)), "axis": np.array(-2, np.int64)}, exclusive=1, reverse=1)
op("slice-multiaxis", "Slice", {"a": f((2, 3, 4)), "starts": np.array([0, 3], np.int64), "ends": np.array([2, -5], np.int64), "axes": np.array([0, -1], np.int64), "steps": np.array([1, -2], np.int64)})
record("slice-optional-axis", [h.make_node("Slice", ["a", "starts", "ends", "", "steps"], ["result"])],
       {"a": f((6, 3)), "starts": np.array([0], np.int64), "ends": np.array([6], np.int64), "steps": np.array([2], np.int64)}, ["result"])
op("cast-integer", "Cast", {"a": np.array([-2.3, 0.5, 1.9], np.float32)}, to=T.INT64)
op("expand-leading", "Expand", {"a": f((2, 1, 4)), "shape": np.array([3, 1], np.int64)})
record("layernorm-stats", [h.make_node("LayerNormalization", ["x", "s", "b"], ["y", "mean", "inv"], axis=-2)],
       {"x": f((2, 3, 4)), "s": f((3, 4)), "b": f((4,))}, ["y", "mean", "inv"])
record("padding-position-flow", [
    h.make_node("Equal", ["ids", "pad"], ["padding"]),
    h.make_node("Not", ["padding"], ["mask"]),
    h.make_node("Cast", ["mask"], ["integers"], to=T.INT64),
    h.make_node("CumSum", ["integers", "axis"], ["count"]),
    h.make_node("Mul", ["count", "integers"], ["positions"]),
    h.make_node("Add", ["positions", "pad"], ["y"])],
    {"ids": np.array([[5, 6, 1, 1], [3, 7, 2, 1]], np.int64)}, ["y"],
    [nh.from_array(np.array(1, np.int64), "pad"), nh.from_array(np.array(1, np.int64), "axis")])

# One tiny encoder/classifier block. Tokens -> embeddings -> multi-head attention
# -> residual normalization -> GELU FFN -> normalization -> two-class logits.
# This exercises native graph wiring, repeated shape constants, rank-4 tensors,
# a broadcast padding mask, and optional LayerNormalization outputs.
nodes, initializers = [], []


def const(name, value):
    initializers.append(nh.from_array(value, name))
    return name


def node(op_type, names, output, **attrs):
    nodes.append(h.make_node(op_type, names, [output], **attrs))
    return output


const("embedding", f((16, 8)))
node("Gather", ["embedding", "ids"], "embed")
for key in ("q", "k", "v"):
    const(key + "w", f((8, 8)) * 0.2)
    node("MatMul", ["embed", key + "w"], key + "projected")
    const(key + "shape", np.array([0, 0, 2, 4], np.int64))
    node("Reshape", [key + "projected", key + "shape"], key + "split")
    node("Transpose", [key + "split"], key, perm=[0, 2, 1, 3])
node("Transpose", ["k"], "kt", perm=[0, 1, 3, 2])
node("MatMul", ["q", "kt"], "scores")
const("scale", np.array(2, np.float32))
node("Div", ["scores", "scale"], "scaled")
node("Add", ["scaled", "mask"], "masked")
node("Softmax", ["masked"], "attention", axis=-1)
node("MatMul", ["attention", "v"], "attended")
node("Transpose", ["attended"], "mergedheads", perm=[0, 2, 1, 3])
const("mergeshape", np.array([0, 0, 8], np.int64))
node("Reshape", ["mergedheads", "mergeshape"], "merged")
node("Add", ["merged", "embed"], "residual")
const("normscale", np.ones(8, np.float32)); const("normbias", np.zeros(8, np.float32))
node("LayerNormalization", ["residual", "normscale", "normbias"], "norm", axis=-1)
const("ffw", f((8, 12)) * 0.2); const("ffb", f((12,)) * 0.1)
node("MatMul", ["norm", "ffw"], "ffraw"); node("Add", ["ffraw", "ffb"], "ff")
const("sqrt2", np.array(np.sqrt(2), np.float32)); const("one", np.array(1, np.float32)); const("half", np.array(0.5, np.float32))
node("Div", ["ff", "sqrt2"], "erfin"); node("Erf", ["erfin"], "erfout")
node("Add", ["erfout", "one"], "erfplus"); node("Mul", ["ff", "erfplus"], "geluraw")
node("Mul", ["geluraw", "half"], "gelu")
const("outw", f((12, 8)) * 0.2)
node("MatMul", ["gelu", "outw"], "ffout"); node("Add", ["ffout", "norm"], "residual2")
node("LayerNormalization", ["residual2", "normscale", "normbias"], "norm2", axis=-1)
const("clfw", f((8, 2)) * 0.2)
node("MatMul", ["norm2", "clfw"], "logits")
for batch, sequence in [(1, 3), (2, 5)]:
    mask = np.zeros((batch, 1, 1, sequence), np.float32); mask[..., -1] = -10000
    record(f"encoder-b{batch}-s{sequence}", nodes,
           {"ids": rng.integers(0, 16, (batch, sequence), dtype=np.int64), "mask": mask}, ["logits"], initializers, dynamic=True)

(ROOT / "transformer-vectors.json").write_text(json.dumps(cases, indent=2) + "\n", encoding="utf-8")
# External-data parsing and host-resolution fixture, deliberately tiny.
external = h.make_model(h.make_graph([h.make_node("MatMul", ["x", "weight"], ["y"])], "external",
    [h.make_tensor_value_info("x", T.FLOAT, [1, 2])], [h.make_tensor_value_info("y", T.FLOAT, [1, 2])],
    [nh.from_array(np.array([[1, 2], [3, 4]], np.float32), "weight")]), opset_imports=[h.make_opsetid("", 17)], ir_version=8)
external_path = ROOT / "models" / "transformer-external.onnx"
data_path = ROOT / "models" / "transformer-external.data"
if data_path.exists():
    data_path.unlink()
onnx.save_model(external, external_path, save_as_external_data=True, all_tensors_to_one_file=True,
                location=data_path.name, size_threshold=0)
print(f"Generated {len(cases)} fixtures with ONNX Runtime {ort.__version__}")
