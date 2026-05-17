"""
Phase 5.2 — Validate the TS-exported cardriver ONNX model.

Steps:
  1. Load _artifacts/cardriver_ts.onnx and run `onnx.checker.check_model`
     (structural validation against the ONNX spec).
  2. Print the readable graph (op list with attributes) so a human can
     eyeball the topology.
  3. Run inference via onnxruntime on _artifacts/sample_window.json and
     compare the embedding against _artifacts/ground_truth.json
     (produced by the TS native pipeline).

The script is invoked manually:
    cd packages/tests/privates/cardriver/python
    pip install -r requirements.txt
    python validate_export.py

Exits 0 on success, non-zero on validation or numerical failure.
"""
import json
import sys
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort


ARTIFACTS = Path(__file__).parent / "_artifacts"
TOLERANCE = 1e-2  # FP32 cascade tolerance (Conv x2 + Pool + Gemm)


def load_named_tensor(path: Path) -> np.ndarray:
    spec = json.loads(path.read_text())
    return np.asarray(spec["data"], dtype=np.float32).reshape(spec["shape"])


def main() -> int:
    onnx_path = ARTIFACTS / "cardriver_ts.onnx"
    win_path = ARTIFACTS / "sample_window.json"
    truth_path = ARTIFACTS / "ground_truth.json"

    for p in (onnx_path, win_path, truth_path):
        if not p.exists():
            print(f"missing artifact: {p}", file=sys.stderr)
            print("run the Jest test `cardriver.export.test.ts` first to produce them.", file=sys.stderr)
            return 1

    # ── 1. Structural check ─────────────────────────────────────────────
    print(f"[1/3] Loading {onnx_path.name} ({onnx_path.stat().st_size} bytes)")
    model = onnx.load(str(onnx_path))
    try:
        onnx.checker.check_model(model)
    except Exception as e:
        print(f"  FAIL onnx.checker rejected the model: {e}", file=sys.stderr)
        return 2
    print(f"  ok structurally valid: {len(model.graph.node)} nodes, "
          f"{len(model.graph.initializer)} initializers, "
          f"{len(model.graph.input)} input(s), {len(model.graph.output)} output(s)")

    # ── 2. Human-readable topology ──────────────────────────────────────
    print("\n[2/3] Topology (`onnx.helper.printable_graph`):")
    print(onnx.helper.printable_graph(model.graph))

    # ── 3. Numerical roundtrip vs TS ground truth ──────────────────────
    print(f"[3/3] Inference via onnxruntime and compare vs TS ground truth")
    window = load_named_tensor(win_path)
    truth = load_named_tensor(truth_path).flatten()

    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    in_name = sess.get_inputs()[0].name
    out_name = sess.get_outputs()[0].name
    print(f"  input  : {in_name}  shape={list(window.shape)}  dtype={window.dtype}")
    print(f"  output : {out_name}")

    result = sess.run([out_name], {in_name: window})[0]
    embedding = np.asarray(result).flatten()

    if embedding.shape != truth.shape:
        print(f"  FAIL shape mismatch: onnxruntime={embedding.shape}, TS truth={truth.shape}", file=sys.stderr)
        return 3

    diff = np.abs(embedding - truth)
    max_diff = float(diff.max())
    mean_diff = float(diff.mean())
    print(f"  max abs diff : {max_diff:.6e}")
    print(f"  mean abs diff: {mean_diff:.6e}")
    print(f"  tolerance    : {TOLERANCE:.0e}")

    print(f"\n  TS  ground truth (first 8): {truth[:8].tolist()}")
    print(f"  ORT result       (first 8): {embedding[:8].tolist()}")

    if max_diff < TOLERANCE:
        print(f"\nok TS export -> onnxruntime matches TS native inference")
        return 0
    else:
        print(f"\nFAIL numerical mismatch (max_diff {max_diff:.3e} >= tolerance {TOLERANCE:.0e})", file=sys.stderr)
        return 4


if __name__ == "__main__":
    sys.exit(main())
