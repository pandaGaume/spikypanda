# Bottlenecks and Opportunities - Graph-Based NN at Scale

## Context

This document identifies the current performance and architectural bottlenecks of SpikyPanda when scaling beyond simple classification tasks (MNIST) toward real-world perception problems (object detection, scene understanding). These bottlenecks define the research frontier - overcoming them with graph-native mechanisms (spatial attention, SNN event-driven computation) would constitute an original scientific contribution.

## Current State

SpikyPanda successfully reproduces state-of-the-art architectures:

| Architecture | Task | Result | Environment |
|---|---|---|---|
| CNN (Conv 8,5x5) | MNIST classification | 93% accuracy | Browser, JS, CPU |
| ViT (Tiny, 2 blocks) | MNIST classification | 74% accuracy | Browser, JS, CPU |
| LSTM | Motor vibration detection | 100% accuracy | Browser, JS, CPU |
| Conv Autoencoder | LiDAR grid compression | MSE 0.0024 | Browser, JS, CPU |

These results validate the framework on small-scale problems. The question is: what prevents scaling to larger, more complex tasks?

## Bottleneck 1 - Self-Attention Quadratic Complexity

**Problem**: Self-attention computes pairwise interactions between all tokens. For an image of size HxW with patch size P:

```
numTokens = (H/P) * (W/P)
attention_ops = numTokens^2 * headDim * numHeads
```

| Image Size | Patch Size | Tokens | Attention Pairs | Estimated Time (JS, CPU) |
|---|---|---|---|---|
| 28x28 (MNIST) | 7x7 | 16 | 256 | ~2ms |
| 64x64 (LiDAR) | 8x8 | 64 | 4,096 | ~50ms |
| 128x128 | 16x16 | 64 | 4,096 | ~50ms |
| 224x224 (ImageNet) | 16x16 | 196 | 38,416 | ~500ms+ |
| 640x640 (YOLO input) | 16x16 | 1,600 | 2,560,000 | seconds |

At 224x224 and above, single-threaded JavaScript becomes impractical for real-time inference.

**This is where graph-native attention could help**: instead of computing all N^2 pairs, spatial attention computes only pairs within a local radius. If the radius covers ~16 neighbors instead of all 196 tokens, the cost drops from O(N^2) to O(N*k) where k << N.

## Bottleneck 2 - Pure JavaScript Computation

**Problem**: All matrix operations (QKV projection, attention scores, MLP) run in single-threaded JavaScript. No SIMD, no GPU, no WebAssembly optimization.

Comparison:
- PyTorch CUDA: ~1ms for ViT-Base forward pass on 224x224
- SpikyPanda JS: ~2.3ms for ViT-Tiny forward pass on 28x28 (10x smaller model)

**Mitigation paths** (not primary research goals):
- WebGPU compute shaders for matrix operations
- WebAssembly (WASM) for critical inner loops
- Web Workers for parallelism

**However**: SpikyPanda's value proposition is not raw speed. It is structural flexibility. The question is whether graph-native mechanisms can achieve better results with fewer computations, not whether they can match GPU throughput.

## Bottleneck 3 - Classification vs Detection

**Problem**: The current ViT is a classifier (1 image -> 1 class). Object detection requires:
- Localization: predicting bounding box coordinates (x, y, w, h) for each object
- Multi-object: handling variable numbers of objects per image
- Multi-scale: detecting objects of different sizes

State-of-the-art detection architectures:

| Model | Approach | Parameters | Complexity |
|---|---|---|---|
| YOLO v8 | CNN backbone + multi-scale detection heads | 3-68M | High |
| DETR | ViT encoder + transformer decoder + object queries | 41M | Very high |
| ViTDet | ViT backbone + FPN + detection head | 100M+ | Very high |

These are orders of magnitude larger than what SpikyPanda handles currently.

**However**: the bestioles use case does not require general object detection. It requires spatial awareness - "where is the threat/food in my visual field?" This is a much simpler problem that could be solved with:
- A small CNN/ViT encoder producing a spatial feature map
- Spatial attention neurons that highlight "interesting" regions
- Direct motor output from attended features

This is closer to biological vision (saliency detection) than to YOLO-style detection.

## Bottleneck 4 - Data Efficiency

**Problem**: ViTs require large datasets to compensate for lack of inductive bias. Our experiments confirm this: CNN reaches 93% on 500 MNIST samples while ViT reaches only 74%.

**This is where SNN and neuroevolution could help**:
- SNN neurons learn through STDP (local, temporal) rather than backpropagation (global, batch). STDP can learn from individual examples in real-time.
- Neuroevolution doesn't need a dataset at all - it learns through interaction with the environment. Each creature's neural graph evolves based on survival, not on labeled data.

## The Opportunity Space

The bottlenecks above define three research directions where SpikyPanda could make original contributions:

### 1. Spatial Attention via Graph Topology

**Hypothesis**: Attention computed based on spatial neuron proximity (ICartesian) can achieve comparable accuracy to full self-attention with O(N*k) instead of O(N^2) complexity.

**Approach**:
- Neurons have 3D positions in the graph
- Attention is computed only between neurons within a configurable spatial radius
- The radius can vary per layer (local early, global late) - similar to Swin Transformer windows but emergent from topology
- The class token / astrocyte concept: meta-neurons that aggregate regional information

**Validation**: Compare against standard ViT on MNIST and LiDAR. If accuracy is comparable with fewer attention computations, this is a publishable result.

### 2. SNN Event-Driven Perception

**Hypothesis**: Spiking neural networks with STDP can achieve competitive accuracy on temporal/spatial tasks with dramatically fewer computations (sparse activation = only active neurons compute).

**Approach**:
- LIF neurons only fire when membrane potential exceeds threshold
- In a quiet image region, neurons don't spike -> no computation
- STDP learns correlations in real-time without backpropagation
- Natural fit for temporal data (motor vibration, video frames)

**Validation**: Compare SNN inference speed and accuracy against CNN/ViT on the same tasks. If the SNN skips 50%+ of computations while maintaining accuracy, this addresses Bottleneck 1 and 2 simultaneously.

### 3. Neuroevolution of Hybrid Architectures

**Hypothesis**: A neural graph that evolves its own topology (adding/removing neurons, changing connection patterns) can discover task-specific architectures that outperform hand-designed CNNs/ViTs on constrained problems.

**Approach**:
- Start with a minimal graph (few neurons, random connections)
- Mutations: add neuron, remove neuron, add synapse, modify weight, change activation
- Selection: survival in the bestioles simulation
- The evolved graph may contain CNN-like local patterns AND attention-like long-range connections AND RNN-like recurrence - a hybrid that no human would design

**Validation**: Compare evolved architectures against hand-designed ones on the same task. If evolution discovers something competitive, this demonstrates the value of structural mutability.

## Conclusion

SpikyPanda's current bottlenecks (quadratic attention, JS performance, classification-only, data hunger) are well-known limitations of the architectures it reproduces. The framework's value is not in reproducing these architectures faster - it is in enabling fundamentally different approaches to neural computation that tensor frameworks cannot support:

1. **Spatial attention** - attention as a property of graph topology, not matrix multiplication
2. **Event-driven computation** - SNN sparsity as a natural solution to the quadratic bottleneck
3. **Structural evolution** - let the architecture emerge from the problem, not from human design

If any of these approaches matches or exceeds the performance of standard architectures on the same tasks, it constitutes an original contribution to the field.

## References

- Dosovitskiy et al., "An Image is Worth 16x16 Words", 2020
- Liu et al., "Swin Transformer: Hierarchical Vision Transformer using Shifted Windows", 2021
- Carion et al., "End-to-End Object Detection with Transformers (DETR)", 2020
- Maass, "Networks of Spiking Neurons: The Third Generation of Neural Network Models", 1997
- Stanley & Miikkulainen, "Evolving Neural Networks through Augmenting Topologies (NEAT)", 2002
