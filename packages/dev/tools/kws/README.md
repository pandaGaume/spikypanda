# Keyword Spotting Demo

Real-time keyword detection running entirely in the browser via the SpikyPanda ONNX pipeline.

## Architecture

```
Microphone -> Web Audio API -> MFCC extraction (JS) -> SpikyPanda ONNX runtime -> Keyword detected
```

No server, no cloud, no WebAssembly. Pure TypeScript inference on a 25 KB model.

## Models

| Model | Params | Size | Ops | Target |
|---|---|---|---|---|
| `kws_conv_tiny.onnx` | 6,156 | 25 KB | Conv, Relu, MaxPool, GlobalAvgPool, Gemm | MCU / Browser |
| `kws_conv_gru.onnx` | 13,836 | 56 KB | Conv, Relu, MaxPool, GRU, Gemm | Browser |

Both models classify 1-second audio windows into 12 classes:
`yes, no, up, down, left, right, on, off, stop, go, unknown, silence`

## Quick Start

### 1. Generate the ONNX models

```bash
pip install torch torchaudio onnx onnxscript
python pretrained_kws.py
```

### 2. Train for real accuracy (optional)

```bash
python train_kws.py --epochs 30        # full training (~30min GPU)
python train_kws.py --epochs 2 --quick  # quick test
```

### 3. Open the demo

Open `demo.html` in a browser. Click "Start Listening" and say a keyword.

## How It Works

### Audio Features (MFCC)

The demo extracts Mel-Frequency Cepstral Coefficients directly in JavaScript using the Web Audio API:

1. Capture 1-second audio chunks at 16kHz
2. Apply FFT (512-point) with 10ms hop
3. Mel filterbank (40 bands) + log + DCT
4. Feed resulting [1, 40, 101] tensor into the ONNX model

### Inference Pipeline

The SpikyPanda ONNX pipeline runs in ~2ms per inference:

1. `OnnxParser.parse()` — deserializes the .onnx protobuf
2. `OnnxGraphBuilder.build()` — constructs a `ComputeGraph` DAG
3. `graph.run()` — executes all operators in topological order
4. Read output logits, apply softmax, display result

### MCU Deployment Path

The same model (`kws_conv_tiny.onnx`) can be deployed on a microcontroller via CyanMycelium (C++ runtime). The 6K parameters fit in 25 KB of flash. MFCC extraction requires ~4 KB additional code. Total footprint under 30 KB.

## Files

| File | Description |
|---|---|
| `demo.html` | Browser demo — microphone input, real-time inference |
| `pretrained_kws.py` | Export models to ONNX (random weights, pipeline testing) |
| `train_kws.py` | Full training on Google Speech Commands v2 |
| `kws_conv_tiny.onnx` | Ultra-small model (generated) |
| `kws_conv_gru.onnx` | Small Conv+GRU model (generated) |
| `kws_pretrained_metadata.json` | Model metadata (labels, MFCC config) |
