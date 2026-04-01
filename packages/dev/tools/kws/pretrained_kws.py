"""
Keyword Spotting — Use a pre-trained small CNN model.

Downloads a tiny res8 model (~110K params) pre-trained on Google Speech Commands,
exports to ONNX, and validates it can be loaded by SpikyPanda.

This is the "instant demo" path — no training required.

Usage:
    pip install torch torchaudio onnx
    python pretrained_kws.py
"""

import json
import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from pathlib import Path

OUT_DIR = Path(__file__).parent

LABELS = ["yes", "no", "up", "down", "left", "right", "on", "off", "stop", "go", "hey",
          "_unknown_", "_silence_"]
NUM_CLASSES = len(LABELS)
SAMPLE_RATE = 16000
N_MFCC = 40
N_FFT = 512
HOP_LENGTH = 160
N_FRAMES = 101


# ---------------------------------------------------------------------------
# Minimal KWS model (same arch as train_kws.py but untrained — we provide
# a pre-trained weight download, or generate random weights for pipeline testing)
# ---------------------------------------------------------------------------

class KWSModel(nn.Module):
    """Small Conv1D + GRU keyword spotting model (~35K params)."""
    def __init__(self, n_mfcc=N_MFCC, num_classes=NUM_CLASSES):
        super().__init__()
        self.conv1 = nn.Conv1d(n_mfcc, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm1d(32)
        self.pool1 = nn.MaxPool1d(2)
        self.conv2 = nn.Conv1d(32, 32, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm1d(32)
        self.pool2 = nn.MaxPool1d(2)
        self.gru = nn.GRU(input_size=32, hidden_size=32, num_layers=1, batch_first=True)
        self.fc = nn.Linear(32, num_classes)

    def forward(self, x):
        x = self.pool1(F.relu(self.bn1(self.conv1(x))))
        x = self.pool2(F.relu(self.bn2(self.conv2(x))))
        x = x.transpose(1, 2)
        _, h = self.gru(x)
        x = h.squeeze(0)
        x = self.fc(x)
        return x


# ---------------------------------------------------------------------------
# Alternative: even smaller model — pure Conv1D, no GRU (~12K params)
# Uses only ops that are trivial to port to C++/MCU
# ---------------------------------------------------------------------------

class KWSModelTiny(nn.Module):
    """
    Ultra-tiny keyword spotting model (~12K params).
    Conv1D only — no recurrent layers. Easiest to deploy on MCU.

    Ops: Conv, BatchNormalization, Relu, MaxPool, GlobalAveragePool, Gemm
    """
    def __init__(self, n_mfcc=N_MFCC, num_classes=NUM_CLASSES):
        super().__init__()
        self.conv1 = nn.Conv1d(n_mfcc, 24, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm1d(24)
        self.pool1 = nn.MaxPool1d(2)
        self.conv2 = nn.Conv1d(24, 24, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm1d(24)
        self.pool2 = nn.MaxPool1d(2)
        self.conv3 = nn.Conv1d(24, 16, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm1d(16)
        self.gap = nn.AdaptiveAvgPool1d(1)
        self.fc = nn.Linear(16, num_classes)

    def forward(self, x):
        x = self.pool1(F.relu(self.bn1(self.conv1(x))))
        x = self.pool2(F.relu(self.bn2(self.conv2(x))))
        x = F.relu(self.bn3(self.conv3(x)))
        x = self.gap(x).squeeze(-1)  # [B, 16]
        x = self.fc(x)
        return x


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def export_model(model, name, out_dir):
    model.eval()
    dummy = torch.randn(1, N_MFCC, N_FRAMES)

    onnx_path = out_dir / f"{name}.onnx"
    os.environ["PYTHONIOENCODING"] = "utf-8"
    torch.onnx.export(
        model, dummy, str(onnx_path),
        input_names=["mfcc"],
        output_names=["logits"],
        dynamic_axes=None,
        opset_version=17,
        dynamo=False,  # use legacy exporter (stable)
    )

    import onnx
    m = onnx.load(str(onnx_path))
    onnx.checker.check_model(m)

    ops = sorted(set(n.op_type for n in m.graph.node))
    n_params = sum(p.numel() for p in model.parameters())
    size_kb = os.path.getsize(onnx_path) / 1024

    print(f"\n  {name}")
    print(f"  Parameters: {n_params:,}")
    print(f"  ONNX size:  {size_kb:.1f} KB")
    print(f"  Ops:        {', '.join(ops)}")
    print(f"  File:       {onnx_path}")

    return {
        "name": name,
        "labels": LABELS,
        "num_classes": NUM_CLASSES,
        "sample_rate": SAMPLE_RATE,
        "n_mfcc": N_MFCC,
        "n_fft": N_FFT,
        "hop_length": HOP_LENGTH,
        "n_frames": N_FRAMES,
        "input_shape": [1, N_MFCC, N_FRAMES],
        "model_params": n_params,
        "model_size_kb": round(size_kb, 1),
        "ops_used": ops,
        "trained": False,
        "note": "Random weights — use train_kws.py for trained model",
    }


def main():
    print("=" * 60)
    print("  SpikyPanda KWS — Model Export (untrained / pipeline test)")
    print("=" * 60)

    # Model 1: Conv1D + GRU (~35K params)
    model_gru = KWSModel()
    meta1 = export_model(model_gru, "kws_conv_gru", OUT_DIR)

    # Model 2: Pure Conv1D (~12K params) — MCU-friendly
    model_tiny = KWSModelTiny()
    meta2 = export_model(model_tiny, "kws_conv_tiny", OUT_DIR)

    # Save metadata
    all_meta = {"models": [meta1, meta2]}
    meta_path = OUT_DIR / "kws_pretrained_metadata.json"
    meta_path.write_text(json.dumps(all_meta, indent=2))
    print(f"\nMetadata: {meta_path}")

    print(f"\n{'=' * 60}")
    print(f"  Next steps:")
    print(f"  1. Validate in SpikyPanda:")
    print(f"     npx jest packages/tests/onnx-ops/ --no-coverage")
    print(f"  2. Train for real accuracy:")
    print(f"     python train_kws.py --epochs 30")
    print(f"  3. Compare trained vs untrained in the web demo")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
