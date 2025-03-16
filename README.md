# 🐼⚡ SpikyPanda - Spiking Neural Network in TypeScript

## 🚀 Introduction
**SpikyPanda** is an experimental **Spiking Neural Network (SNN)** implementation in **TypeScript**, leveraging **WebGPU/WebGL** for real-time neural computation. Inspired by biological neural systems, it aims to process time-series data such as IMU sensor readings and detect patterns through STDP-based learning.

## 🎯 Features
- 🧠 **SNN Engine**: Implements a spiking neuron model (LIF) with synaptic plasticity (STDP).
- ⚡ **WebGPU Acceleration**: Runs spikes and synapses in parallel for high performance.
- 📡 **Real-time Processing**: Designed for streaming data like accelerometer inputs.
- 🎨 **Interactive Visualization**: Displays neuron activity using WebGL.

## 📦 Installation
Ensure you have **Node.js** installed. Then, clone the repository and install dependencies:

```sh
# Clone the repository
git clone https://github.com/YOUR_GITHUB_USERNAME/SpikyPanda.git
cd SpikyPanda

# Install dependencies
npm install
```

## 🏃‍♂️ Running SpikyPanda
```sh
npm run dev
```
This will start the simulation and visualize neuron activity in a **WebGL canvas**.

## 📜 Example Usage
### 1️⃣ **Streaming IMU Data**
```typescript
import { SnnWithSlidingWindowSTDP } from "./snn";

const labels = ["Rest", "Walk", "Run", "Jump"];
const snn = new SnnWithSlidingWindowSTDP(5, labels);

const imuData = [
  [0.2, 0.1, -0.1],
  [0.3, 0.5, -0.2],
  [0.4, 0.7, -0.3],
  [0.1, 0.2, -0.1],
  [-0.1, -0.5, 2.1]
];

imuData.forEach((dataPoint) => {
  const activity = snn.step(dataPoint);
  console.log(`Detected Activity: ${activity}`);
});
```

## 🛠 Development
To modify and extend **SpikyPanda**, start the local dev server:
```sh
npm run dev
```
To build the project:
```sh
npm run build
```

## 📌 Roadmap
- [ ] Implement STDP reinforcement
- [ ] Support multi-layer SNNs
- [ ] Integrate real IMU sensor streaming
- [ ] WebGPU optimization

## 📜 License
MIT License © 2024 SpikyPanda Team

---
🐼 Made with spikes by [YOUR NAME]

# spikypanda
