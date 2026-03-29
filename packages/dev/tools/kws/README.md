# Keyword Spotting Demo

Real-time keyword detection running entirely in the browser via the SpikyPanda ONNX pipeline.

## Architecture

```
Microphone -> Web Audio API -> MFCC extraction (JS) -> SpikyPanda ONNX runtime -> Keyword detected
```

No server, no cloud, no WebAssembly. Pure TypeScript inference.

## Models

| Model | Params | Size | Ops | Target |
|---|---|---|---|---|
| `kws_conv_tiny.onnx` | 6,156 | 25 KB | Conv, Relu, MaxPool, GlobalAvgPool, Gemm | MCU / Browser |
| `kws_conv_gru.onnx` | 13,836 | 56 KB | Conv, Relu, MaxPool, GRU, Gemm | Browser |

Both models classify 1-second audio windows into 12 classes:
`yes, no, up, down, left, right, on, off, stop, go, unknown, silence`

## Why we train our own model

There are no ready-to-use pre-trained keyword spotting ONNX models compatible with our pipeline:

- **Honk** (castorini/honk-models) provides ONNX files but in an old Caffe2 format where all weights are graph inputs instead of initializers. Incompatible with standard ONNX graph builders.
- **Sherpa-ONNX** (k2-fsa) has keyword spotting models but uses Zipformer architecture (~3M params), too large for MCU deployment.
- **HuggingFace models** (Wav2Vec2-based) are 100MB+ and require ops we don't need on embedded.

Training our own model takes ~30 minutes and guarantees:
- Exact control over architecture and size (6K-14K params)
- Only ops validated by our 152-test conformance suite
- Same model runs in browser (TypeScript) and on MCU (CyanMycelium C++)

## Quick Start

### 1. Install dependencies

```bash
pip install torch torchaudio onnx onnxscript
```

### 2. Train the model (required for real inference)

```bash
python train_kws.py --epochs 30        # full training (~30min GPU, ~2h CPU)
python train_kws.py --epochs 2 --quick  # quick test with data subset
```

This downloads Google Speech Commands v2 (~2 GB, first run only), trains the model, and exports `kws_model.onnx` with real weights.

### 3. Export architecture only (for pipeline testing)

```bash
python pretrained_kws.py
```

This generates `kws_conv_tiny.onnx` and `kws_conv_gru.onnx` with **random weights** (no training). Useful for validating that the SpikyPanda ONNX pipeline parses, builds, and executes the model correctly — but the inference results will be meaningless.

### 4. Open the demo

Open `packages/host/www/samples/kws/index.html` via a local server (e.g., VS Code Live Server). Click "Start Listening" and say a keyword.

## How It Works

### Audio Features (MFCC)

The demo extracts Mel-Frequency Cepstral Coefficients directly in JavaScript using the Web Audio API:

1. Capture 1-second audio chunks at 16kHz
2. Apply FFT (512-point) with 10ms hop
3. Mel filterbank (40 bands) + log + DCT
4. Feed resulting [1, 40, 101] tensor into the ONNX model

### Inference Pipeline

The SpikyPanda ONNX pipeline runs in the browser:

1. `OnnxParser.parse()` — deserializes the .onnx protobuf binary
2. `OnnxGraphBuilder.build()` — constructs a `ComputeGraph` DAG with typed `DataLink`s
3. `graph.run()` — executes all operators in topological order
4. Read output logits, apply softmax, display result

The runtime is bundled as `spikypanda-runtime.js` (webpack UMD) and loaded alongside `spikypanda-core.js`.

### MCU Deployment Path

The same model (`kws_conv_tiny.onnx`) can be deployed on a microcontroller via CyanMycelium (C++ runtime). The 6K parameters fit in 25 KB of flash. MFCC extraction requires ~4 KB additional code. Total footprint under 30 KB.

## Files

| File | Description |
|---|---|
| `train_kws.py` | Full training on Google Speech Commands v2 — produces a real model |
| `pretrained_kws.py` | Export model architecture to ONNX (random weights, pipeline testing only) |
| `kws_conv_tiny.onnx` | Ultra-small model, random weights (use train_kws.py for real weights) |
| `kws_conv_gru.onnx` | Conv+GRU model, random weights |
| `kws_pretrained_metadata.json` | Model metadata (labels, MFCC config) |

### Browser demo (in `packages/host/www/samples/kws/`)

| File | Description |
|---|---|
| `index.html` | Demo page with hero image, collapsible panels, spectrogram |
| `kws.js` | Audio capture, MFCC extraction, ONNX inference via SpikypandaRuntime |
| `kws.css` | Sample-specific styles |
| `hero.png` | Hero banner image |
