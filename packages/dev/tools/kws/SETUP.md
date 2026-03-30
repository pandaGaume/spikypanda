# KWS Demo — Setup Guide

Step-by-step instructions to reproduce the keyword spotting demo from scratch.

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- **NVIDIA GPU** (optional but recommended — training takes ~20min GPU vs ~2h CPU)

## 1. Install Python dependencies

```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128  # GPU (NVIDIA)
# or
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu     # CPU only

pip install onnx onnxscript soundfile
```

> **Windows note:** torchaudio 2.9+ requires `torchcodec` which needs FFmpeg. The training script bypasses this by using `soundfile` directly. If you get a `torchcodec` error, uninstall it: `pip uninstall torchcodec -y`

Verify CUDA (if using GPU):
```bash
python -c "import torch; print('CUDA:', torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

## 2. Train the model

```bash
cd packages/dev/tools/kws

# Full training — 30 epochs on Google Speech Commands v2 (~85K samples)
# First run downloads the dataset (~2 GB)
python train_kws.py --epochs 30

# Quick test (subset, lower accuracy)
python train_kws.py --epochs 10 --quick
```

Expected output (full training, GPU):
```
Device: cuda
Loading dataset (will download on first run ~2GB)...
Train batches: 663, Val batches: 78
Model parameters: 6,156
Epoch   1/30  loss=0.7182  train=0.782  val=0.879  lr=0.009973
Epoch   2/30  loss=0.3267  train=0.899  val=0.900  lr=0.009891
...
Epoch  30/30  loss=0.1100  train=0.966  val=0.950  lr=0.000000

Training done in 600s. Best val accuracy: 0.952
Exported ONNX model to kws_model.onnx
Model size: 25.2 KB
Ops used: Constant, Conv, Gemm, GlobalAveragePool, MaxPool, Relu, Squeeze
```

The script produces:
- `kws_model.onnx` — trained model (25 KB)
- `kws_model_best.pt` — PyTorch weights checkpoint
- `kws_model_metadata.json` — labels, accuracy, MFCC config

Copy the trained model over the placeholder:
```bash
cp kws_model.onnx kws_conv_tiny.onnx
```

## 3. Build the SpikyPanda runtime bundle

```bash
cd packages/dev/runtime
npx webpack --mode development --config webpack.config.js
```

This produces `bundle/spikypanda-runtime.js` (~700 KB). Deploy it:
```bash
cp bundle/spikypanda-runtime.js ../../host/www/bundle/
```

Or from the repo root:
```bash
npm run bundle --workspace=@spiky-panda/runtime
node scripts/deploy-bundles.mjs  # if this script handles runtime
```

## 4. Run the conformance tests

```bash
# From repo root
npm test -- packages/tests/onnx-ops/onnx-ops.test.ts --no-coverage
```

Expected: 156/156 tests passing across 4 suites:
- Generic ONNX ops vs onnxruntime (46 tests)
- SpikyPanda native ops vs onnxruntime (45 tests)
- Raw JS sanity checks (15 tests)
- Graph pipeline: parse .onnx → build graph → run (48 tests)

## 5. Run the KWS pipeline test

```bash
npm test -- packages/tests/onnx-ops/kws-pipeline.test.ts --no-coverage
```

Validates that the KWS ONNX model can be parsed, graph-built, and executed through the full SpikyPanda pipeline.

## 6. Open the demo

Start a local server (VS Code Live Server, or any static server):
```bash
# From repo root, if using a simple server:
npx serve packages/host/www
```

Open: `http://localhost:5500/packages/host/www/samples/kws/index.html`

### Demo features

- **Start Listening** — captures microphone at 16kHz, extracts MFCC, runs ONNX inference
- **Audio waveform** — real-time display of raw audio signal with level indicator
- **Keyword grid** — highlights detected keyword with confidence percentage
- **Backend toggle** — checkbox to switch between generic ops and SpikyPanda native ops live (graph rebuilt lazily, single graph in memory)
- **Log** — shows model loading, graph construction, and detection events

### 12 keywords

`yes, no, up, down, left, right, on, off, stop, go, unknown, silence`

## Architecture

```
                    ┌─────────────────────────────────────────┐
  PyTorch           │  train_kws.py                           │
  (training)        │  Conv1D → BN → ReLU → Pool (×3)        │
                    │  GlobalAvgPool → Linear(16→12)          │
                    │  6,156 params                           │
                    └──────────────┬──────────────────────────┘
                                   │ torch.onnx.export
                                   ▼
                    ┌──────────────────────────────────────────┐
  ONNX              │  kws_conv_tiny.onnx (25 KB)             │
  (interchange)     │  Ops: Conv, Relu, MaxPool, GAP, Gemm    │
                    └──────────────┬───────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
  ┌───────────────────┐ ┌──────────────────┐ ┌──────────────────┐
  │ onnxruntime (ref) │ │ SpikyPanda TS    │ │ CyanMycelium C++ │
  │ Python            │ │ Browser/Node.js  │ │ MCU (ESP32, etc) │
  │ 152 tests         │ │ spikypanda-      │ │ 25 KB flash      │
  │ ground truth      │ │ runtime.js       │ │ (future)         │
  └───────────────────┘ └──────────────────┘ └──────────────────┘
```

## Troubleshooting

### `torchcodec` / FFmpeg error on Windows
```bash
pip uninstall torchcodec -y
```
The training script uses `soundfile` as audio backend instead.

### ONNX export `UnicodeEncodeError` on Windows
The script uses `dynamo=False` to force the legacy TorchScript exporter which doesn't have this issue.

### Model predicts "silence" for everything
The model was trained with `--quick` (small subset). Retrain with full dataset:
```bash
python train_kws.py --epochs 30  # no --quick
```

### Spectrogram not showing
Hard refresh (`Ctrl+Shift+R`) to clear cached JS.
