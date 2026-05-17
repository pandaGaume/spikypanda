"""
Cross-validate the TS fake-quant QLinear ops against onnxruntime.

Reads:
  <tmpdir>/qcnn.onnx           the exported quantized graph
  <tmpdir>/input.json          {"name": "x", "shape": [...], "data": [...]}
  <tmpdir>/ts_fake_quant.json  TS fake-quant inference output for the same input
  <tmpdir>/fp32_native.json    FP32 native CNN output (for context only)

Writes:
  <tmpdir>/ort_output.json     onnxruntime's output on the same graph + input
  <tmpdir>/verdict.json        {"max_abs_diff_ts_vs_ort": ..., "max_abs_diff_fp32_vs_ort": ...}

Usage:
  python verify-with-ort.py <tmpdir>

Exits with status 0 if ORT vs TS fake-quant agree within 1e-4, non-zero otherwise.
"""
import json
import os
import sys

import numpy as np
import onnxruntime as ort


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: verify-with-ort.py <tmpdir>", file=sys.stderr)
        return 2

    tmpdir = sys.argv[1]
    onnx_path = os.path.join(tmpdir, "qcnn.onnx")
    input_path = os.path.join(tmpdir, "input.json")
    ts_path = os.path.join(tmpdir, "ts_fake_quant.json")
    fp32_path = os.path.join(tmpdir, "fp32_native.json")

    with open(input_path, "r", encoding="utf-8") as f:
        input_spec = json.load(f)
    with open(ts_path, "r", encoding="utf-8") as f:
        ts_output = np.asarray(json.load(f), dtype=np.float32)
    with open(fp32_path, "r", encoding="utf-8") as f:
        fp32_output = np.asarray(json.load(f), dtype=np.float32)

    x = np.asarray(input_spec["data"], dtype=np.float32).reshape(input_spec["shape"])

    sess_opts = ort.SessionOptions()
    sess_opts.log_severity_level = 3  # warnings only
    sess = ort.InferenceSession(onnx_path, sess_options=sess_opts, providers=["CPUExecutionProvider"])

    input_name = sess.get_inputs()[0].name
    output_name = sess.get_outputs()[0].name
    ort_outs = sess.run([output_name], {input_name: x})
    ort_output = np.asarray(ort_outs[0], dtype=np.float32).reshape(-1)

    ts_flat = ts_output.reshape(-1)
    fp32_flat = fp32_output.reshape(-1)

    if ts_flat.shape != ort_output.shape:
        print(
            f"shape mismatch: TS {ts_flat.shape} vs ORT {ort_output.shape}",
            file=sys.stderr,
        )
        return 3

    diff_ts = np.abs(ts_flat - ort_output)
    diff_fp32 = np.abs(fp32_flat - ort_output)

    verdict = {
        "ts_fake_quant": ts_flat.tolist(),
        "ort_output": ort_output.tolist(),
        "fp32_native": fp32_flat.tolist(),
        "max_abs_diff_ts_vs_ort": float(diff_ts.max()),
        "mean_abs_diff_ts_vs_ort": float(diff_ts.mean()),
        "max_abs_diff_fp32_vs_ort": float(diff_fp32.max()),
        "mean_abs_diff_fp32_vs_ort": float(diff_fp32.mean()),
    }

    with open(os.path.join(tmpdir, "verdict.json"), "w", encoding="utf-8") as f:
        json.dump(verdict, f, indent=2)
    with open(os.path.join(tmpdir, "ort_output.json"), "w", encoding="utf-8") as f:
        json.dump(ort_output.tolist(), f)

    # Pretty report to stdout for the Jest console.
    print("--- ORT vs TS fake-quant ---")
    print(f"  ORT          : {ort_output.tolist()}")
    print(f"  TS fake-quant: {ts_flat.tolist()}")
    print(f"  FP32 native  : {fp32_flat.tolist()}")
    print(f"  max |TS - ORT| = {verdict['max_abs_diff_ts_vs_ort']:.6e}")
    print(f"  max |FP32 - ORT| = {verdict['max_abs_diff_fp32_vs_ort']:.6e}")

    # We consider TS fake-quant correct if it matches ORT within 1e-4.
    # ORT's int8 kernels are the reference implementation of the ONNX
    # QLinear ops; if our TS impl differs by more than rounding noise,
    # there's a real semantic gap.
    threshold = 1e-4
    if verdict["max_abs_diff_ts_vs_ort"] > threshold:
        print(
            f"FAIL: max |TS - ORT| {verdict['max_abs_diff_ts_vs_ort']:.6e} > {threshold:.0e}",
            file=sys.stderr,
        )
        return 1
    print(f"PASS: TS fake-quant matches ORT within {threshold:.0e}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
