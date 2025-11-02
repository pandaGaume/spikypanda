# 🧠 SpikyPanda Neural Network Runtime — Architecture & Progress Report

## 📌 Overview

**SpikyPanda** is a TypeScript-based neural network runtime designed to support **graph-based inference and training** of various neural architectures, with the end goal of transitioning toward **Spiking Neural Networks (SNNs)**.

This report summarizes the architectural design, implementation decisions, and the progression of tests and components toward a flexible, extensible runtime.

---

## 🎯 Objectives

- Build a shared foundation for all NN types (perceptrons, SNNs, etc.)
- Enable pluggable activation, learning, and optimization strategies
- Treat all components as graphs (nodes = neurons, links = synapses)
- Ensure runtime and training state is stored contextually (bag model)
- Validate correctness with simple logic gates before generalization

---

## 🏗️ Architecture

### 🧱 Graph Model

- `INode`, `IOlink`, and `IGraph<N, L>` provide the base for representing networks.
- `INeuron` and `ISynapse` extend these with neural-specific properties (e.g., weights, bias).
- A shared runtime-agnostic `bag?: unknown` field is included in both neurons and synapses to store **runtime-only execution state** without polluting model definitions.

### 🔁 State Management

- Instead of attaching mutable fields like `activation` or `error` directly to neurons, runtime state is stored in their `.bag`, allowing:
  - Clean reusability between training and inference
  - Easy serialization/deserialization of model structure
  - Support for multiple simultaneous execution contexts

### 🔄 Execution Engines

- `MLPRuntime`: Implements feedforward inference for MLP-style graphs
- Activation functions are pluggable, with support for sigmoid, ReLU, tanh, etc.
- A `BackpropContext` and `InferenceContext` are defined per neuron
- Optimizers (SGD, Adam, etc.) are extensible through interface-based design

---

## ✅ Implemented Test Coverage

### 🔹 Logic Gate Tests (24 tests total)

| Gate   | Configured | Output Verified |
|--------|------------|-----------------|
| AND    | ✅ Yes      | ✅ MAE < 0.1     |
| OR     | ✅ Yes      | ✅              |
| NAND   | ✅ Yes      | ✅              |
| NOR    | ✅ Yes      | ✅              |
| XOR    | ✅ 2-layer  | ✅              |
| XNOR   | ✅ Inverted | ✅              |

These test cases verify that the perceptron engine produces correct logic inference and that graph + runtime interaction behaves as expected.

---

## 🔬 Design Choices

### Why Graph-Based Design?

- Flexibility: Same graph interface for MLPs, CNNs, RNNs, and SNNs
- Interoperability: Can map directly to ONNX or custom JSON models
- Traceability: Easy to visualize or debug paths and flows

### Why Bags for Runtime Context?

- Keeps model serialization clean
- Enables parallel runtime sessions
- Supports multiple roles (inference, backpropagation, STDP, etc.)

### Why TypeScript?

- Interoperability with web & WebGPU/WebGL visualization
- First-class support for both structural typing and strong contracts
- Easy to integrate with D3.js, Babylon.js or WebNN APIs

---
## 🚧 Finalized Goals

| Goal                             | Description                                                |
|----------------------------------|------------------------------------------------------------|
| ✅ Training Runtime (MLPTraining)   | Implement full backprop with optimizer and loss tracking   |

## 🚧 Upcoming Goals

| Goal                             | Description                                                |
|----------------------------------|------------------------------------------------------------|
| JSON Exporter (Python ↔ TS)      | Import/export models between scikit-learn / TF / TS graph |
| Visualization                    | Render graph and runtime state dynamically                |
| Spiking Engine                   | Activate SNN version of the runtime                       |
| STDP Learning                    | Introduce time-based plasticity models                    |
| Dataset Integration              | Connect to CSV, JSON or streaming data                    |

---

## 📦 Source Layout

```
packages/
  dev/
    core/
      src/
        MLPRuntime.ts
        Graph interfaces
        Optimizers
        Activation functions
  tests/
    neuralnetwork/
      ann/
        mlp/
          xor.inference.test.ts
          gate.inference.test.ts
```

---

## 📁 Tests Output Sample

```
XOR(0, 0) → 0.0000 | expected: 0
XOR(0, 1) → 1.0000 | expected: 1
...
MAE = 0.0000 | MSE = 0.0000
PASS gate.inference.test.ts
```

---

## 🧩 Conclusion

The current MLP runtime and test coverage prove that the SpikyPanda framework can support modular neural inference and training with high accuracy. The architectural choices make it suitable for progressing toward biologically inspired neural systems like SNNs, while preserving compatibility with classic models.