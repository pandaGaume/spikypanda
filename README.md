# SpikyPanda

A graph-based neural network runtime in TypeScript.

Every neuron is a node. Every synapse is a link. The graph is traversable, inspectable, and mutable at runtime.

## Why a graph?

Traditional frameworks (PyTorch, TensorFlow) represent neural networks as tensor operations - fast but opaque. SpikyPanda takes a different approach: the network is an explicit graph of neurons and synapses. This trades raw throughput for structural transparency.

This matters because:
- The graph can be **mutated at runtime** - add or remove neurons and synapses during execution
- It supports **heterogeneous neuron types** in the same network - MLP, CNN, RNN, SNN neurons can coexist
- It enables **3D visualization** of the network topology
- It is designed for **neuroevolution** - structural mutations driven by natural selection, not gradient descent

## Architectures

| Architecture | Description | Status |
|---|---|---|
| **MLP** | Multi-Layer Perceptron with backprop, Adam/SGD/Momentum/NAG | Implemented + validated |
| **CNN** | Convolutional Neural Networks - conv, pool, flatten, dense, shared kernels | Implemented + validated |
| **RNN** | Recurrent Networks - LSTM (4 gates) and GRU (2 gates) with BPTT | Implemented + validated |
| **Autoencoder** | Convolutional autoencoder with upsample/reshape layers | Implemented + validated |
| **ViT** | Vision Transformer - patch embedding, multi-head self-attention, LayerNorm | Implemented + validated |
| **SNN** | Spiking Neural Networks - LIF neurons, STDP learning | Implemented |

## Validated on real data

- **MNIST digit classification** - 93% accuracy with CNN, 74% with ViT (500 training samples)
- **Motor vibration fault detection** - 100% accuracy with LSTM on real pEMP dataset
- **LiDAR occupancy grid compression** - MSE 0.0024 with convolutional autoencoder

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

Self-contained HTML demos are available in `packages/host/www/samples/`:

- **MNIST** - CNN and ViT digit classification with visual prediction grid
- **LiDAR** - Autoencoder on synthetic 64x64x6 LiDAR grids with per-channel reconstruction
- **Motor Vibration** - LSTM/GRU fault detection on real accelerometer data
- **Brain 3D** - BabylonJS visualization of a neural network (XOR)

## The bigger picture

SpikyPanda is the foundation for a larger project. The graph-based architecture is designed to support world models where perception (CNN/ViT), memory (RNN/LSTM), and decision-making (MLP) are not separate pipelines but interconnected regions of a single neural graph - one that can evolve structurally through neuroevolution.

This is already being explored in the [bestioles](https://github.com/pandaGaume/spikypanda) project - an ecosystem simulation where creatures navigate, survive, and evolve their neural architectures through natural selection. No backpropagation, no gradient - just mutation and survival.

### Roadmap

- [x] MLP with backpropagation and optimizer support
- [x] CNN with shared kernels and training
- [x] RNN with LSTM and GRU cells
- [x] Convolutional autoencoder
- [x] Vision Transformer with multi-head attention
- [x] SNN with LIF neurons and STDP
- [ ] Graph-native attention mechanisms (spatial, sparse)
- [ ] Hybrid graphs combining CNN + Attention + RNN
- [ ] Motor current harmonic analysis (MCSA)
- [ ] Sensor noise model for simulation
- [ ] Unified world model - perception + memory + action in one evolvable graph

## Documentation

See [docs/README.md](docs/README.md) for detailed documentation, research papers, and benchmark results.

## License

MIT
