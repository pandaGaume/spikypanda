# 🐼⚡ SpikyPanda

## 🚀 Introduction

**SpikyPanda** is an experimental **Spiking Neural Network (SNN)** implementation in **TypeScript**, leveraging **WebGPU/WebGL** for real-time neural computation. Inspired by biological neural systems, it aims to process time-series data such as IMU sensor readings and detect patterns through STDP-based learning.

## 🎯 Features

-   🧠 **SNN Engine**: Implements a spiking neuron model (LIF) with synaptic plasticity (STDP).
-   ⚡ **WebGPU Acceleration**: Runs spikes and synapses in parallel for high performance.
-   📡 **Real-time Processing**: Designed for streaming data like accelerometer inputs.
-   🎨 **Interactive Visualization**: Displays neuron activity using WebGL.
-   🏗 **Intel Hardware Compatibility**: Supports WebGPU and oneAPI for optimized execution on Intel platforms.
-   🔗 **Loihi Research Potential**: Can be adapted for neuromorphic hardware, such as Intel's Loihi.

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

### 1️⃣ **Streaming IMU Data with Sliding Window**

```typescript
import { StreamingSNN } from "./streamingSnn";

const mySnnGraph = ...; // Define the SNN graph structure
const streamingProcessor = new StreamingSNN(mySnnGraph);

// Simulate a live stream (calling every 100ms)
setInterval(() => {
    const imuReading: [number, number, number] = [
        Math.random() * 2 - 1, // Random X (-1 to 1)
        Math.random() * 2 - 1, // Random Y (-1 to 1)
        Math.random() * 2 - 1, // Random Z (-1 to 1)
    ];

    streamingProcessor.processLiveData(imuReading);

    const activity = streamingProcessor.detectActivity();
    console.log("Detected Activity:", activity);
}, 100);
```

## 📌 Roadmap

-   🏗 **Intel oneAPI Integration**: Explore compatibility with **oneDNN** for optimized neural network execution on Intel architectures.
-   🤖 **Neuromorphic Computing Support**: Investigate potential for deploying SpikyPanda on **Intel Loihi** for research applications.
-   📊 **Real-time Visualization**: Implement a WebGL-based UI to observe spiking behavior dynamically.
-   🚀 **Optimized Memory Usage**: Improve spike event storage and processing efficiency for large datasets.

## 📜 License

MIT License © 2024 SpikyPanda Team

---

🐼 Made with spikes by Guillaume Pelletier
