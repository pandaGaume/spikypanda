# SpikyPanda

A graph-based neural network framework in TypeScript, with a full design-to-deployment toolchain for embedded targets.

Every neuron is a node. Every synapse is a link. The graph is traversable, inspectable and mutable at runtime. The same graph that you train in the browser can be calibrated, quantized to int8, exported to ONNX, and deployed to a microcontroller through the companion C++ runtime [CyanMycelium](https://github.com/pandaGaume/CyanMycelium).

## What this repository is

SpikyPanda is two things at once:

1. **A graph-based NN framework in TypeScript.** MLP, CNN, RNN (LSTM/GRU), ViT, autoencoders and SNN all share one substrate: an `IGraph<Neuron, Synapse>` that you can walk, mutate, visualize and serialize. Tensor frameworks treat networks as opaque ops; SpikyPanda treats them as explicit topology. This is the foundation for online structural plasticity (synaptogenesis, pruning, Hebbian learning) and for neuroevolution.

2. **A complete design-to-deployment pipeline.** The graphs you build in TypeScript can be exported to ONNX (47+ ops covered), statically quantized to int8 with post-training calibration (per-channel symmetric Conv, per-tensor symmetric Dense, per-tensor asymmetric activations), and loaded by CyanMycelium on ESP32-class hardware. The quantization pipeline is cross-validated bit-for-bit against Python `onnxruntime` so the bytes we ship behave the same on any conformant runtime.

```
TypeScript design  ──► train  ──► calibrate  ──► quantize (int8)  ──► ONNX bytes
                                                                          │
                              cross-validated bit-perfect vs onnxruntime  │
                                                                          ▼
                                                          CyanMycelium (C++/MCU)
```

## Why a graph?

Traditional frameworks (PyTorch, TensorFlow) represent networks as tensor operations: fast, but opaque. SpikyPanda represents them as an explicit graph of neurons and synapses. This trades raw throughput for structural transparency, which matters because:

* The graph can be **mutated at runtime** (add or remove neurons and synapses during execution).
* It supports **heterogeneous neuron types** in the same network (MLP, CNN, RNN, SNN neurons can coexist).
* It enables **3D visualization** and direct interactive editing of topology.
* It is designed for **neuroevolution**, where structural mutation drives learning instead of gradient descent.

The same graph substrate also makes the ONNX export and the quantization pipeline simple: a Conv layer is just a slice of the graph; calibration observes activations directly off the neurons; quantization rewrites weights in place. No special-case tensor-program plumbing is needed.

## Architectures

| Architecture       | Description                                                                       | Status                          |
| ------------------ | --------------------------------------------------------------------------------- | ------------------------------- |
| **MLP**            | Multi-layer perceptron with backprop, Adam / SGD / Momentum / NAG optimizers      | Implemented + validated         |
| **CNN**            | Conv, Pool, Flatten, Dense, Upsample, Reshape with shared kernels                 | Implemented + validated + quantizable to int8 |
| **RNN**            | LSTM (4 gates) and GRU (2 gates) with BPTT, per-neuron persistent state           | Implemented + validated         |
| **Autoencoder**    | Convolutional autoencoder with Upsample / Reshape                                 | Implemented + validated         |
| **ViT**            | Vision Transformer: patch embedding, multi-head self-attention, LayerNorm         | Implemented + validated         |
| **SNN**            | Spiking neural networks: LIF neurons, STDP learning                               | Implemented                     |

## ONNX and quantization

* **ONNX I/O** (`packages/dev/onnx/`): a TS-native parser, writer and graph builder. 47+ operators are registered (Conv, MatMul, Add/Mul/Sub/Div, Relu, Sigmoid, Tanh, GELU, Softmax, LayerNorm, AveragePool/MaxPool, Flatten, Reshape, Transpose, Concat, Slice, Cast, plus all QLinear ops). Trained graphs can be exported and re-imported transparently.
* **Static int8 quantization** (`packages/dev/core/src/quantization/` + `packages/dev/core/src/neuralnetwork/cnn/quantization/`): explicit `MinMaxStrategy` calibration on representative samples, per-layer activation parameters, banker's rounding, OIHW Conv weights, pre-scaled int32 conv bias. The exported ONNX uses `QuantizeLinear` / `DequantizeLinear` / `QLinearConv` / `QLinearMatMul` and is accepted by `onnxruntime` without modification.
* **Fake-quant TS execution**: the TS pipeline can re-import and run a quantized graph in pure FP32 with explicit int8 simulation, so quantization can be validated end-to-end without leaving the browser. The TS QLinear kernels are cross-validated bit-for-bit against Python `onnxruntime` on the same graph.

The full design and validation story is in [docs/architecture/graph-runtime-architecture.md](docs/architecture/graph-runtime-architecture.md) ([FR](docs/architecture/graph-runtime-architecture.fr.md)).

## Validated on real data

* **MNIST digit classification**: 93% accuracy with CNN, 74% with ViT (500 training samples).
* **Motor vibration fault detection**: 100% accuracy with LSTM on the real pEMP dataset.
* **LiDAR occupancy grid compression**: MSE 0.0024 with a convolutional autoencoder on 64x64x6 grids.
* **MOx gas discrimination**: 95.5% accuracy on the DotVision metal-oxide e-nose dataset (Air / Acetone / HCl), beating the published 5-layer LSTM + distillation baseline (89.7%) by 5.8 points with a single-layer GRU of 37 neurons.
* **Quantization pipeline**: bit-perfect agreement (`max |TS - onnxruntime| = 0.0`) on the round-trip from CNN to int8 ONNX to inference. 500+ tests across the framework, including 70+ tests dedicated to the quantization stack.

## Installation

```sh
npm install @spiky-panda/core
```

Or clone and build from source:

```sh
git clone https://github.com/pandaGaume/spikypanda.git
cd spikypanda
npm install
```

## Interactive samples

Self-contained HTML demos live in `packages/host/www/samples/`:

* `mnist/`: CNN and ViT digit classification with a visual prediction grid.
* `lidar/`: autoencoder on synthetic 64x64x6 LiDAR grids with per-channel reconstruction.
* `motor/` and `motor_monitor/`: LSTM / GRU fault detection on real accelerometer data.
* `motor_current/`: motor current signature analysis (MCSA) experiments.
* `mox/`: 5-sensor e-nose array classifying Air / Acetone / HCl with a compact GRU.
* `kws/`: keyword spotting demo.
* `co2-mpc/` and `co2-vitals/`: model-predictive control demos around a CO2 dynamics model.
* `stereo/`: stereo depth estimation experiments.
* `brain3d/`: BabylonJS visualization of a small neural graph (XOR).
* `nodeeditor/` and `graph-runner/`: visual pipeline editor and standalone graph runner (see [docs/architecture/graph-pipelines.md](docs/architecture/graph-pipelines.md)).

## Repository layout

```
packages/
  dev/
    core/        framework primitives: graphs, neurons, synapses, training, quantization
    onnx/        ONNX parser, writer, graph builder, op registry, export pipelines
    onnx-editor/ visual ONNX inspection and editing
    nodeeditor/  visual pipeline editor (sample tree of ops with Scope / DatasetCapture sinks)
    applications/ application logic for the MPC and stereo demos
    sensors/     PMSM motor model, sensor simulation, MCSA scaffolding
    mcp/         Model Context Protocol integrations
    tools/       CLI and tooling helpers
    babylonjs/   3D rendering helpers for graph visualization
    bestioles/   evolutionary ecosystem simulation primitives
  host/
    www/         HTML samples and demo apps
  tests/         500+ tests across primitives, components, integration and cross-validation
docs/            architecture, vision, research papers, benchmarks
```

## The bigger picture

SpikyPanda exists to serve two complementary use cases.

**Embedded deployment today.** Train, calibrate and quantize a model in the browser; export ONNX; load it on an ESP32 with CyanMycelium. The pipeline is validated against `onnxruntime` so the deployment-side numerics are pinned to the spec. This unlocks edge applications (motor fault detection, gas discrimination, keyword spotting) where the inference budget is microwatts, not gigaflops.

**Neuroevolutionary world models tomorrow.** The graph substrate is designed to support world models where perception (CNN / ViT), memory (RNN / LSTM) and decision-making (MLP / MPC) are not separate pipelines but interconnected regions of a single neural graph: one that can evolve structurally through neuroevolution. This is being explored in a companion ecosystem-simulation project where creatures navigate, survive and evolve their own neural architectures without backpropagation.

The two use cases share one substrate. The same graph that trains a 37-neuron GRU for an e-nose can host a 100k-neuron heterogeneous network for a simulation creature; quantization makes one of them shippable, neuroevolution makes the other one viable.

## Roadmap

* [x] MLP with backpropagation and optimizer support
* [x] CNN with shared kernels and training
* [x] RNN with LSTM and GRU cells
* [x] Convolutional autoencoder
* [x] Vision Transformer with multi-head attention
* [x] SNN with LIF neurons and STDP
* [x] ONNX parser, writer, graph builder, 47+ op registry
* [x] Static int8 PTQ pipeline (calibration, weight quantization, QLinear export, fake-quant import)
* [x] Bit-perfect cross-validation against Python `onnxruntime`
* [x] Visual pipeline editor (graph runner, scopes, dataset capture)
* [ ] CyanMycelium deployment end-to-end on physical ESP32 with measured accuracy
* [ ] Motor current harmonic analysis (MCSA) full pipeline
* [ ] Graph-native attention mechanisms (spatial, sparse)
* [ ] Hybrid graphs combining CNN + Attention + RNN in one mutable structure
* [ ] Unified world model: perception + memory + action in one evolvable graph

## Documentation

Start at [docs/INDEX.md](docs/INDEX.md). Key entry points:

* [Graph, Runtime and Validation Architecture](docs/architecture/graph-runtime-architecture.md) ([FR](docs/architecture/graph-runtime-architecture.fr.md)): end-to-end reference for the compute layer, the runtimes, the quantization pipeline and the four-layer validation strategy.
* [Structural Plasticity Vision](docs/architecture/plasticity-vision.md) ([FR](docs/architecture/plasticity-vision.fr.md)): why a graph substrate, what tensor frameworks can't do.
* [Graph Pipelines](docs/architecture/graph-pipelines.md): the visual-programming layer.
* [World Models and Regulation](docs/architecture/world-models-and-regulation.md) ([FR](docs/architecture/world-models-and-regulation.fr.md)): why dynamics alone is not a world model, and where MPC fits.
* Research and benchmarks: LiDAR autoencoder / MAE / SAT, ViT vs CNN on MNIST, motor PMSM, MoX gas discrimination.

## License

MIT
