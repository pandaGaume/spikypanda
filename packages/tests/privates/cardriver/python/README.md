# Cardriver Python cross-validation

Phase 5 of the cardriver ONNX export validation. The TS tests produce
ONNX bytes + ground-truth artifacts; these Python scripts validate the
result against `onnxruntime` and an independently hand-built reference
model.

## Layout

```
python/
├── README.md                # this file
├── requirements.txt         # onnx, onnxruntime, numpy
├── validate_export.py       # 5.2 - load TS .onnx, check_model, infer, compare
├── build_reference.py       # 5.3 - rebuild same model from scratch in Python
└── _artifacts/              # gitignored
    ├── cardriver_ts.onnx    # produced by Jest (Phase 5.1)
    ├── cardriver_py.onnx    # produced by build_reference.py (5.3)
    ├── sample_window.json   # input window snapshot (Jest)
    ├── ground_truth.json    # TS native embedding (Jest)
    └── weights.json         # CNN weights dump (Jest)
```

## Workflow

```bash
# 1. Install Python deps (one-shot)
pip install -r requirements.txt

# 2. Produce TS-side artifacts (cardriver_ts.onnx + the 3 JSON files)
cd ../../..   # back to repo root
npx jest packages/tests/privates/cardriver/cardriver.export.test.ts

# 3. Validate the TS export structurally and numerically
cd packages/tests/privates/cardriver/python
python validate_export.py

# 4. Build the Python reference model and cross-check
python build_reference.py

# 5. Re-run the Jest test — the 4th case now consumes cardriver_py.onnx
cd ../../../..
npx jest packages/tests/privates/cardriver/cardriver.export.test.ts
```

## What each script proves

### `validate_export.py`

1. `onnx.checker.check_model(cardriver_ts.onnx)` succeeds → the bytes
   are a structurally valid ONNX model (opset_import declared, every
   attribute typed, no dangling tensor refs, ...).
2. `onnx.helper.printable_graph` is dumped for human inspection.
3. `onnxruntime.InferenceSession(cardriver_ts.onnx).run(window)`
   produces an embedding that matches the TS native pipeline's
   ground truth to ~1e-10.

This confirms our TS export is **valid ONNX** and **numerically
correct** as judged by the reference runtime.

### `build_reference.py`

1. Rebuilds the cardriver model from scratch using `onnx.helper`
   primitives — no SpikyPanda code involved. Uses the TS-dumped
   weights and the same architecture as `CnnGraphOnnxExporter` +
   the cardriver kernel serializers emit.
2. Saves to `cardriver_py.onnx`.
3. Runs both ONNX files (`cardriver_ts.onnx` and `cardriver_py.onnx`)
   through `onnxruntime` and asserts they produce **the same
   embedding** on the same input window.

This confirms the TS export is **semantically equivalent** to a
Python-hand-built reference — two independent paths converge to the
same bit-pattern.

### Jest test (Phase 5.4)

`cardriver.export.test.ts` has a 4th test that:
1. Looks for `cardriver_py.onnx` (skips if absent).
2. Reads the bytes, parses via `OnnxParser`, rebuilds a `ComputeGraph`
   via `OnnxGraphBuilder`, runs inference on the same window.
3. Asserts the result matches the TS native ground truth.

This closes the loop: the **Python-built** ONNX model can be
**re-imported** into our TS runtime and still produces the correct
embedding. End-to-end semantic round-trip across two implementations.

## Tolerances

| Path                                                | Max diff |
|-----------------------------------------------------|----------|
| TS native → TS .onnx → onnxruntime                  | ~2e-10   |
| TS native → Python .onnx → onnxruntime              | ~2e-10   |
| TS native → TS .onnx → TS OnnxGraphBuilder runtime  | ~5e-3    |
| TS native → Python .onnx → TS OnnxGraphBuilder      | ~5e-3    |
| onnxruntime: cardriver_ts vs cardriver_py           | 0.0      |

The ~5e-3 in TS-runtime paths reflects FP32 implementation drift
between our Conv/Gemm and onnxruntime's optimized kernels — expected
for a cascaded Conv-Conv-Pool-Gemm pipeline without normalization.
