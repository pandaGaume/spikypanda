# SpikyPanda Documentation

## Overview

SpikyPanda is a graph-based neural network runtime written in TypeScript. Every neuron is a node, every synapse is a link - a fully traversable, inspectable, and mutable structure. The library reproduces state-of-the-art neural network architectures (MLP, CNN, RNN, ViT, Autoencoder, SNN) within this graph paradigm, with the long-term goal of building unified world models through neuroevolution.

Available on npm: `@spiky-panda/core`

Source: [github.com/pandaGaume/spikypanda](https://github.com/pandaGaume/spikypanda)

---

## Architectures

### MLP - Multi-Layer Perceptron
- Fully connected feedforward networks
- Backpropagation with Adam, SGD, Momentum, NAG optimizers
- Validated on XOR, parity, and classification tasks

### CNN - Convolutional Neural Network
- Conv, Pool (Max/Avg), Flatten, Dense layers
- Shared kernel weights via the graph synapse model
- Validated on MNIST digit classification (93% with Conv(8,5x5))

### RNN - Recurrent Neural Networks
- LSTM (4 gates) and GRU (2 gates) cell types
- Each cell stores internal state (cellState, hiddenState) directly on the neuron
- BPTT (Backpropagation Through Time) training
- Validated on motor vibration fault detection (100% accuracy on pEMP dataset)

### Autoencoder - Convolutional Autoencoder
- Encoder-decoder architecture with Upsample and Reshape layers
- Weighted channel loss for multi-channel sensor data
- Validated on synthetic LiDAR grids (64x64x6 channels, MSE 0.0024)
- [Detailed documentation](lidar-autoencoder.md)

### ViT - Vision Transformer
- Full transformer architecture: patch embedding, positional embedding, multi-head self-attention, LayerNorm, MLP blocks, class token, residual connections
- Weight matrices stored as graph metadata (not individual synapses) for computational feasibility
- Softmax, GELU, and LayerNorm implemented within the module
- Validated on MNIST: 74% accuracy (10 epochs, 500 samples) - consistent with known ViT behavior on small datasets
- [Architecture intent and roadmap](vision-transformers-spikypanda.md)
- [Benchmark results](vit-benchmark-results.md)

### SNN - Spiking Neural Networks
- LIF (Leaky Integrate-and-Fire) neurons with membrane potential dynamics
- STDP (Spike-Timing-Dependent Plasticity) learning rule
- Bridge between rate-coded (ANN) and event-driven (SNN) paradigms

---

## Research Documents

| Document | Description |
|----------|-------------|
| [LiDAR Autoencoder](lidar-autoencoder.md) | Convolutional autoencoder for LiDAR grid compression - architecture, 6-channel design, known limitations |
| [Vision Transformers and Graph-Based Attention](vision-transformers-spikypanda.md) | ViT/VLA concepts mapped to graph architecture, attention as emergent graph property, roadmap toward world models |
| [ViT Benchmark Results](vit-benchmark-results.md) | CNN vs ViT comparison on MNIST - experimental setup, results, analysis, scientific conclusions |
| [MAE LiDAR Results](mae-lidar-results.md) | Per-patch ViT autoencoder vs CNN for sparse feature reconstruction on LiDAR grids - Z max and Velocity preservation |
| [Bottlenecks and Opportunities](bottlenecks-and-opportunities.md) | Performance limits at scale, and three research directions where graph-native mechanisms could surpass standard architectures |

---

## Interactive Samples

All samples are available as self-contained HTML pages in `packages/host/www/samples/`:

| Sample | Path | Description |
|--------|------|-------------|
| MNIST CNN + ViT | `samples/mnist/` | Digit classification with CNN and ViT presets, visual prediction grid |
| LiDAR Autoencoder | `samples/lidar/` | Synthetic LiDAR grid compression, per-channel reconstruction visualization |
| Motor Vibration | `samples/motor/` | LSTM/GRU fault detection on real pEMP vibration data |
| Brain 3D | `samples/brain3d/` | BabylonJS 3D visualization of XOR neural network |

---

## Toward World Models

SpikyPanda is the foundation for a larger vision: building world models where perception, memory, and action are interconnected regions of a single neural graph that can evolve structurally through neuroevolution.

The roadmap:
1. **Current**: MLP, CNN, RNN, ViT, Autoencoder, SNN implemented separately
2. **Next**: Graph-native attention mechanisms leveraging spatial neuron positions
3. **Then**: Hybrid graphs combining CNN + Attention + RNN in a single mutable structure
4. **Goal**: Unified world model - perception + memory + prediction + action in one evolvable neural graph

See [Vision Transformers and Graph-Based Attention](vision-transformers-spikypanda.md) for the detailed roadmap.
