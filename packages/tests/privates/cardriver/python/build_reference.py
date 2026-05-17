"""
Phase 5.3 — Build the cardriver model from scratch in Python and validate.

Uses onnx.helper.make_node / make_graph / make_model to reconstruct the
same architecture independently of any SpikyPanda code, loads the
weights produced by the TS test (weights.json), and writes the result
to _artifacts/cardriver_py.onnx.

Then runs inference via onnxruntime and compares against the TS
ground truth. If both onnxruntime runs (cardriver_ts.onnx and
cardriver_py.onnx) agree on the same input window, our TS export is
not only valid ONNX but also semantically equivalent to a hand-built
reference.

The script is invoked manually:
    python build_reference.py

Exits 0 on success.
"""
import json
import sys
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
from onnx import TensorProto, helper, numpy_helper


ARTIFACTS = Path(__file__).parent / "_artifacts"
TOLERANCE = 1e-2


def tensor_from_named(name: str, payload: dict) -> onnx.TensorProto:
    arr = np.asarray(payload["data"], dtype=np.float32).reshape(payload["shape"])
    return numpy_helper.from_array(arr, name=name)


def build_cardriver_reference(weights: dict, eps: float, window_shape: list[int]) -> onnx.ModelProto:
    """
    Build a cardriver ONNX model by hand. Mirrors the architecture
    emitted by the TS framework:
        input [T, 3]
          ReduceL2(axes=[-1], keepdims=1) -> [T, 1]
          Concat(axis=-1)                  -> [T, 4]
          ReduceMean(axes=[0], keepdims=1) -> [1, 4]
          Sub, Mul, ReduceMean, Sqrt, Add(eps), Div
                                             -> [T, 4]
          Transpose(perm=[1, 0])             -> [4, T]
          Reshape([1, 4, 1, T])              -> [1, 4, 1, T]
          Conv 1x3 (4 -> 8) + Relu           -> [1, 8, 1, T-2]
          Conv 1x3 (8 -> 16) + Relu          -> [1, 16, 1, T-4]
          GlobalAveragePool                  -> [1, 16, 1, 1]
          Flatten(axis=1)                    -> [1, 16]
          Gemm(W=[16,16], transB=1)          -> [1, 16]
          Squeeze(axes=[0])                  -> [16]
    """
    T, C_in = window_shape
    assert C_in == 3, f"reference build expects raw 3-axis input, got {C_in}"

    # Inputs / outputs (graph-level value infos)
    input_vi = helper.make_tensor_value_info("accel_window", TensorProto.FLOAT, [T, C_in])
    output_vi = helper.make_tensor_value_info("embedding", TensorProto.FLOAT, [16])

    # Initializers: CNN weights from the TS dump + helpers (reshape
    # target, squeeze axes, eps scalar).
    inits = []
    inits.append(tensor_from_named("conv0_W", weights["weights"]["conv0_W"]))
    inits.append(tensor_from_named("conv0_B", weights["weights"]["conv0_B"]))
    inits.append(tensor_from_named("conv1_W", weights["weights"]["conv1_W"]))
    inits.append(tensor_from_named("conv1_B", weights["weights"]["conv1_B"]))
    inits.append(tensor_from_named("dense0_W", weights["weights"]["dense0_W"]))
    inits.append(tensor_from_named("dense0_B", weights["weights"]["dense0_B"]))
    inits.append(numpy_helper.from_array(np.array([eps], dtype=np.float32), name="eps_init"))
    inits.append(numpy_helper.from_array(np.array([1, 4, 1, T], dtype=np.int64), name="nchw_shape"))
    inits.append(numpy_helper.from_array(np.array([0], dtype=np.int64), name="squeeze_axes"))

    nodes = []

    # NormKernel: ReduceL2 + Concat
    nodes.append(helper.make_node("ReduceL2", ["accel_window"], ["magnitude"],
                                   axes=[-1], keepdims=1))
    nodes.append(helper.make_node("Concat", ["accel_window", "magnitude"], ["normed"],
                                   axis=-1))

    # NormalizeKernel: per-channel zero-mean / unit-std over the time
    # axis.
    nodes.append(helper.make_node("ReduceMean", ["normed"], ["mean"],
                                   axes=[0], keepdims=1))
    nodes.append(helper.make_node("Sub", ["normed", "mean"], ["centered"]))
    nodes.append(helper.make_node("Mul", ["centered", "centered"], ["squared"]))
    nodes.append(helper.make_node("ReduceMean", ["squared"], ["variance"],
                                   axes=[0], keepdims=1))
    nodes.append(helper.make_node("Sqrt", ["variance"], ["std"]))
    nodes.append(helper.make_node("Add", ["std", "eps_init"], ["std_eps"]))
    nodes.append(helper.make_node("Div", ["centered", "std_eps"], ["normalized"]))

    # CnnAdapterKernel: Transpose + Reshape to NCHW
    nodes.append(helper.make_node("Transpose", ["normalized"], ["CT"], perm=[1, 0]))
    nodes.append(helper.make_node("Reshape", ["CT", "nchw_shape"], ["nchw"]))

    # CNN
    nodes.append(helper.make_node("Conv", ["nchw", "conv0_W", "conv0_B"], ["conv0_out"],
                                   kernel_shape=[1, 3], strides=[1, 1], pads=[0, 0, 0, 0]))
    nodes.append(helper.make_node("Relu", ["conv0_out"], ["relu0_out"]))
    nodes.append(helper.make_node("Conv", ["relu0_out", "conv1_W", "conv1_B"], ["conv1_out"],
                                   kernel_shape=[1, 3], strides=[1, 1], pads=[0, 0, 0, 0]))
    nodes.append(helper.make_node("Relu", ["conv1_out"], ["relu1_out"]))
    nodes.append(helper.make_node("GlobalAveragePool", ["relu1_out"], ["pooled"]))
    nodes.append(helper.make_node("Flatten", ["pooled"], ["flat"], axis=1))
    nodes.append(helper.make_node(
        "Gemm", ["flat", "dense0_W", "dense0_B"], ["dense_out"],
        alpha=1.0, beta=1.0, transA=0, transB=1,
    ))

    # Strip the leading batch dim to produce a flat 16-D embedding.
    nodes.append(helper.make_node("Squeeze", ["dense_out", "squeeze_axes"], ["embedding"]))

    graph = helper.make_graph(nodes, "cardriver_py", [input_vi], [output_vi], initializer=inits)
    model = helper.make_model(graph, producer_name="cardriver_reference",
                              opset_imports=[helper.make_opsetid("", 13)])
    onnx.checker.check_model(model)
    return model


def main() -> int:
    weights_path = ARTIFACTS / "weights.json"
    window_path = ARTIFACTS / "sample_window.json"
    truth_path = ARTIFACTS / "ground_truth.json"
    ts_path = ARTIFACTS / "cardriver_ts.onnx"
    py_path = ARTIFACTS / "cardriver_py.onnx"

    for p in (weights_path, window_path, truth_path):
        if not p.exists():
            print(f"missing artifact: {p}", file=sys.stderr)
            return 1

    weights = json.loads(weights_path.read_text())
    window_spec = json.loads(window_path.read_text())
    truth = np.asarray(json.loads(truth_path.read_text())["data"], dtype=np.float32)

    eps = float(weights.get("eps", 1e-6))
    window = np.asarray(window_spec["data"], dtype=np.float32).reshape(window_spec["shape"])
    print(f"[1/3] Build cardriver_py.onnx from scratch (eps={eps}, window shape={list(window.shape)})")
    model = build_cardriver_reference(weights, eps, window_spec["shape"])
    onnx.save(model, str(py_path))
    print(f"  ok wrote {py_path} ({py_path.stat().st_size} bytes)")

    # ── 2. Run via onnxruntime and compare to ground truth ──────────
    print("[2/3] Inference via onnxruntime on cardriver_py.onnx")
    sess = ort.InferenceSession(str(py_path), providers=["CPUExecutionProvider"])
    in_name = sess.get_inputs()[0].name
    out = sess.run(None, {in_name: window})[0].flatten()
    diff_truth = float(np.abs(out - truth).max())
    print(f"  max abs diff vs TS ground truth: {diff_truth:.6e}  (tol {TOLERANCE:.0e})")
    if diff_truth >= TOLERANCE:
        print(f"  FAIL numerical mismatch", file=sys.stderr)
        return 2

    # ── 3. Cross-check that cardriver_ts.onnx and cardriver_py.onnx
    #      produce the same embedding (independent of ground truth)
    #      under onnxruntime. ──────────────────────────────────────
    print("[3/3] Cross-check: cardriver_ts.onnx vs cardriver_py.onnx")
    if not ts_path.exists():
        print(f"  ts model {ts_path} not found; skipping cross-check")
    else:
        sess_ts = ort.InferenceSession(str(ts_path), providers=["CPUExecutionProvider"])
        out_ts = sess_ts.run(None, {sess_ts.get_inputs()[0].name: window})[0].flatten()
        diff_pair = float(np.abs(out - out_ts).max())
        print(f"  max abs diff (py vs ts onnxruntime runs): {diff_pair:.6e}")
        if diff_pair >= TOLERANCE:
            print(f"  FAIL py and ts ONNX disagree under onnxruntime", file=sys.stderr)
            return 3

    print("\nok hand-built Python reference matches TS export under onnxruntime")
    return 0


if __name__ == "__main__":
    sys.exit(main())
