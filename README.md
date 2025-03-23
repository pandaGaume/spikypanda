# 🐼⚡ SpikyPanda

## 🚀 Introduction

**SpikyPanda** is an experimental **Neural Network framework** in **TypeScript**, starting from classical networks and converging toward biologically inspired **Spiking Neural Networks (SNNs)**.

We use a **graph-based architecture** to model neurons and synapses across various network types (MLP, SNN, etc.), enabling consistent runtime and training logic that can be compared across models.

The ultimate goal is to **implement a common runtime and training engine** that can evolve into a spiking model and allow side-by-side comparison with more traditional neural networks.

## 🎯 Features

- 🧠 **Graph-based Neural Engine**: A unified structure to run and train classical and spiking models.
- 🧩 **Modular Runtime**: Includes inference and training pipelines for MLP and will evolve to support STDP and SNNs.
- 🔁 **Backpropagation Engine**: Standard MLP training with optimizers like SGD, Momentum, Adam.
- ⚡ **WebGPU Acceleration**: Designed for high performance on parallel hardware.
- 📡 **Real-time Processing**: Targets streaming time-series inputs (e.g., IMU, motion capture).
- 🎨 **Interactive Visualization**: WebGL-based visual feedback on neuron activity using Babylon JS.
- 🔗 **Intel Neuromorphic Extension Path**: Designed to integrate with Loihi and similar hardware later.

## 🧪 Current Work in Progress

- ✅ Inference + training for MLPs using backpropagation
- 🧠 Runtime context (`bag`) system for neurons and synapses
- 📐 Activation and loss functions are fully modular
- 🔧 Optimizer engine with pluggable strategies (SGD, Momentum, NAG, Adam)
- 🧬 SNN support is next — including spike dynamics and STDP learning

## 📦 Installation

Make sure you have **Node.js** installed. Then, clone the repository and install dependencies:

```sh
# Clone the repository
git clone https://github.com/YOUR_GITHUB_USERNAME/SpikyPanda.git
cd SpikyPanda

# Install dependencies
npm install
```

## 🧭 Roadmap

- [x] Graph-based runtime for MLP
- [x] Training engine with optimizer support
- [ ] Add recurrent connections
- [ ] Implement spiking neuron (LIF)
- [ ] STDP-based learning for SNNs
- [ ] Comparative benchmarks: MLP vs SNN