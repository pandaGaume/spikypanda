"""
Quantize kws_conv_tiny.onnx in two flavors and dump them next to the
memory-viz sample so they can be loaded for comparison:

  - kws_conv_tiny_q8_dynamic.onnx : weights only (Conv/MatMul int8).
  - kws_conv_tiny_q8_static.onnx  : full QLinear (weights + activations
                                    int8) using a synthetic calibration
                                    set of random MFCC-shaped tensors.

Run from the repo root:
    python packages/host/www/samples/memory-viz/scripts/quantize_kws.py
"""

from pathlib import Path
import sys
import numpy as np
from onnxruntime.quantization import (
    QuantType,
    QuantFormat,
    quantize_dynamic,
    quantize_static,
    CalibrationDataReader,
    CalibrationMethod,
)
from onnxruntime.quantization.shape_inference import quant_pre_process

REPO = Path(__file__).resolve().parents[6]
SRC = REPO / "packages/host/www/samples/kws/models/kws_conv_tiny.onnx"
OUT_DIR = REPO / "packages/host/www/samples/memory-viz/models"
OUT_DIR.mkdir(parents=True, exist_ok=True)

if not SRC.exists():
    print(f"missing input: {SRC}", file=sys.stderr)
    sys.exit(1)

# Shape-inferred copy: onnxruntime's static quantization needs every
# value_info populated. Dynamic quantization can skip this but we run
# it anyway so both flows start from the same preprocessed model.
prepped = OUT_DIR / "_kws_prepped.onnx"
print(f"preprocess -> {prepped.name}")
quant_pre_process(str(SRC), str(prepped), skip_symbolic_shape=True)

# ─── dynamic ────────────────────────────────────────────────────────────────
out_dyn = OUT_DIR / "kws_conv_tiny_q8_dynamic.onnx"
print(f"dynamic   -> {out_dyn.name}")
quantize_dynamic(
    model_input=str(prepped),
    model_output=str(out_dyn),
    weight_type=QuantType.QInt8,
)
print(f"  size: {out_dyn.stat().st_size} bytes")

# ─── static (with random calibration) ───────────────────────────────────────
class RandomMfccReader(CalibrationDataReader):
    """Feeds N random tensors with the KWS input shape [1, 40, 101]."""
    def __init__(self, n: int = 32):
        rng = np.random.default_rng(0xC0FFEE)
        self.samples = [
            {"mfcc": rng.standard_normal((1, 40, 101)).astype(np.float32)}
            for _ in range(n)
        ]
        self.it = iter(self.samples)
    def get_next(self):
        return next(self.it, None)
    def rewind(self):
        self.it = iter(self.samples)

out_stat = OUT_DIR / "kws_conv_tiny_q8_static.onnx"
print(f"static    -> {out_stat.name}")
quantize_static(
    model_input=str(prepped),
    model_output=str(out_stat),
    calibration_data_reader=RandomMfccReader(32),
    quant_format=QuantFormat.QOperator,  # QLinearConv/QLinearMatMul directly
    per_channel=False,
    weight_type=QuantType.QInt8,
    activation_type=QuantType.QInt8,
    calibrate_method=CalibrationMethod.MinMax,
)
print(f"  size: {out_stat.stat().st_size} bytes")

prepped.unlink(missing_ok=True)
print("done.")
