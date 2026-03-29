"""
Keyword Spotting — Train a small CNN model on Google Speech Commands v2.

Architecture: Conv1D + BatchNorm + ReLU + MaxPool → GRU → Linear → Softmax
~35K parameters — fits on any MCU with 150KB RAM.

Outputs:
  - kws_model.onnx          : ONNX model for SpikyPanda pipeline
  - kws_model_metadata.json : class labels, MFCC config, model info

Usage:
    pip install torch torchaudio onnx
    python train_kws.py                    # full training (~30min GPU, ~2h CPU)
    python train_kws.py --epochs 2 --quick # quick test run

Requirements:
    - PyTorch >= 2.0
    - torchaudio >= 2.0
    - onnx >= 1.14
"""

import argparse
import json
import time
import os

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchaudio
import soundfile as sf
# Force soundfile backend — torchaudio 2.9+ tries torchcodec which needs FFmpeg
def _sf_load(path, **kwargs):
    data, sr = sf.read(str(path), dtype="float32")
    waveform = torch.from_numpy(data).unsqueeze(0)  # [1, samples]
    if waveform.dim() == 3:
        waveform = waveform.squeeze(-1)
    return waveform, sr
torchaudio.load = _sf_load
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# 12 classes: 10 keywords + unknown + silence
LABELS = ["yes", "no", "up", "down", "left", "right", "on", "off", "stop", "go"]
NUM_CLASSES = len(LABELS) + 2  # + unknown + silence
SAMPLE_RATE = 16000
AUDIO_LENGTH = 16000  # 1 second
N_MFCC = 40
N_FFT = 512
HOP_LENGTH = 160      # 10ms hop → 100 frames per second
N_FRAMES = 101        # ceil(16000 / 160) + 1

OUT_DIR = Path(__file__).parent


# ---------------------------------------------------------------------------
# Model — Small Conv1D + GRU (~35K params)
# ---------------------------------------------------------------------------

class KWSModel(nn.Module):
    """
    Tiny keyword spotting model — pure Conv1D, no recurrent layers.

    Input:  MFCC features [batch, n_mfcc, n_frames] = [B, 40, 101]
    Output: logits [batch, num_classes] = [B, 12]

    Architecture:
        Conv1D(40→24, k=3) → BN → ReLU → MaxPool(2)     : [B, 24, 50]
        Conv1D(24→24, k=3) → BN → ReLU → MaxPool(2)     : [B, 24, 24]
        Conv1D(24→16, k=3) → BN → ReLU → GlobalAvgPool  : [B, 16]
        Linear(16→12)                                      : [B, 12]

    Ops used (all validated in SpikyPanda — 152/152 tests):
        Conv, BatchNormalization, Relu, MaxPool, GlobalAveragePool, Gemm

    ~6K params, 25 KB ONNX — runs on MCU (CyanMycelium) and browser.
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
        # x: [B, n_mfcc, n_frames]
        x = self.pool1(F.relu(self.bn1(self.conv1(x))))
        x = self.pool2(F.relu(self.bn2(self.conv2(x))))
        x = F.relu(self.bn3(self.conv3(x)))
        x = self.gap(x).squeeze(-1)  # [B, 16]
        x = self.fc(x)               # [B, 12]
        return x


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

def label_to_index(word):
    if word in LABELS:
        return LABELS.index(word)
    if word == "_silence_":
        return len(LABELS) + 1  # silence class
    return len(LABELS)  # unknown class


def pad_or_trim(waveform, length=AUDIO_LENGTH):
    if waveform.shape[-1] >= length:
        return waveform[..., :length]
    return F.pad(waveform, (0, length - waveform.shape[-1]))


def build_dataloaders(data_dir, batch_size=128, quick=False):
    mfcc_transform = torchaudio.transforms.MFCC(
        sample_rate=SAMPLE_RATE,
        n_mfcc=N_MFCC,
        melkwargs={"n_fft": N_FFT, "hop_length": HOP_LENGTH, "n_mels": 40},
    )

    def collate(batch):
        waveforms, labels = [], []
        for waveform, sr, label, *_ in batch:
            if sr != SAMPLE_RATE:
                waveform = torchaudio.transforms.Resample(sr, SAMPLE_RATE)(waveform)
            waveform = pad_or_trim(waveform)
            mfcc = mfcc_transform(waveform).squeeze(0)  # [n_mfcc, n_frames]
            waveforms.append(mfcc)
            labels.append(label_to_index(label))
        return torch.stack(waveforms), torch.tensor(labels)

    train_ds = torchaudio.datasets.SPEECHCOMMANDS(data_dir, download=True, subset="training")
    val_ds = torchaudio.datasets.SPEECHCOMMANDS(data_dir, download=True, subset="validation")

    if quick:
        train_ds = torch.utils.data.Subset(train_ds, range(min(2000, len(train_ds))))
        val_ds = torch.utils.data.Subset(val_ds, range(min(500, len(val_ds))))

    train_loader = torch.utils.data.DataLoader(
        train_ds, batch_size=batch_size, shuffle=True, collate_fn=collate,
        num_workers=0, pin_memory=True
    )
    val_loader = torch.utils.data.DataLoader(
        val_ds, batch_size=batch_size, shuffle=False, collate_fn=collate,
        num_workers=0, pin_memory=True
    )
    return train_loader, val_loader


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_epoch(model, loader, optimizer, device):
    model.train()
    total_loss, correct, total = 0, 0, 0
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        logits = model(x)
        loss = F.cross_entropy(logits, y)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * y.size(0)
        correct += (logits.argmax(1) == y).sum().item()
        total += y.size(0)
    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, device):
    model.eval()
    correct, total = 0, 0
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        logits = model(x)
        correct += (logits.argmax(1) == y).sum().item()
        total += y.size(0)
    return correct / total


# ---------------------------------------------------------------------------
# ONNX Export
# ---------------------------------------------------------------------------

def export_onnx(model, out_path, device):
    model.eval()
    dummy = torch.randn(1, N_MFCC, N_FRAMES, device=device)
    torch.onnx.export(
        model, dummy, str(out_path),
        input_names=["mfcc"],
        output_names=["logits"],
        dynamic_axes=None,  # fixed shape for MCU
        opset_version=17,
    )
    print(f"Exported ONNX model to {out_path}")

    # Verify
    import onnx
    m = onnx.load(str(out_path))
    onnx.checker.check_model(m)
    print(f"ONNX model verified OK")

    # Print ops used
    ops = sorted(set(n.op_type for n in m.graph.node))
    print(f"Ops used: {', '.join(ops)}")

    # Model size
    size_kb = os.path.getsize(out_path) / 1024
    print(f"Model size: {size_kb:.1f} KB")

    return ops


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Train keyword spotting model")
    parser.add_argument("--epochs", type=int, default=30, help="Training epochs")
    parser.add_argument("--lr", type=float, default=0.01, help="Learning rate")
    parser.add_argument("--batch-size", type=int, default=128, help="Batch size")
    parser.add_argument("--quick", action="store_true", help="Quick test with subset")
    parser.add_argument("--data-dir", type=str, default=str(OUT_DIR / "data"),
                        help="Dataset download directory")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # Data
    print("Loading dataset (will download on first run ~2GB)...")
    train_loader, val_loader = build_dataloaders(args.data_dir, args.batch_size, args.quick)
    print(f"Train batches: {len(train_loader)}, Val batches: {len(val_loader)}")

    # Model
    model = KWSModel().to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"Model parameters: {n_params:,}")

    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    # Train
    best_acc = 0
    t0 = time.time()
    for epoch in range(1, args.epochs + 1):
        loss, train_acc = train_epoch(model, train_loader, optimizer, device)
        val_acc = evaluate(model, val_loader, device)
        scheduler.step()
        lr = optimizer.param_groups[0]["lr"]
        print(f"Epoch {epoch:3d}/{args.epochs}  loss={loss:.4f}  train={train_acc:.3f}  val={val_acc:.3f}  lr={lr:.6f}")

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), OUT_DIR / "kws_model_best.pt")

    elapsed = time.time() - t0
    print(f"\nTraining done in {elapsed:.0f}s. Best val accuracy: {best_acc:.3f}")

    # Load best and export
    model.load_state_dict(torch.load(OUT_DIR / "kws_model_best.pt", weights_only=True))
    model.to(device)

    onnx_path = OUT_DIR / "kws_model.onnx"
    ops = export_onnx(model, onnx_path, device)

    # Save metadata
    all_labels = LABELS + ["_unknown_", "_silence_"]
    metadata = {
        "labels": all_labels,
        "num_classes": NUM_CLASSES,
        "sample_rate": SAMPLE_RATE,
        "n_mfcc": N_MFCC,
        "n_fft": N_FFT,
        "hop_length": HOP_LENGTH,
        "n_frames": N_FRAMES,
        "input_shape": [1, N_MFCC, N_FRAMES],
        "model_params": n_params,
        "best_val_accuracy": best_acc,
        "ops_used": ops,
        "training_epochs": args.epochs,
    }
    meta_path = OUT_DIR / "kws_model_metadata.json"
    meta_path.write_text(json.dumps(metadata, indent=2))
    print(f"Metadata saved to {meta_path}")

    print(f"\n{'='*60}")
    print(f"  Keyword Spotting Model Ready")
    print(f"  Classes: {', '.join(all_labels)}")
    print(f"  Params:  {n_params:,}")
    print(f"  Val acc: {best_acc:.1%}")
    print(f"  ONNX:    {onnx_path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
