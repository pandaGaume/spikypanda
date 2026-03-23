# Spatial Attention Transformer - Research Review Package

**Author**: Guillaume Pelletier (Engineer)
**Date**: March 2026
**Status**: Seeking expert review - results need academic validation
**Repository**: https://github.com/pandaGaume/spikypanda

---

## Purpose of This Document

I am a software engineer, not a researcher. During the development of SpikyPanda (a graph-based neural network framework in TypeScript), I implemented a variant of the Vision Transformer where attention is restricted to spatially proximate tokens. The results suggest that this local attention produces better reconstruction quality than global attention at larger grid sizes, while being faster.

I need a researcher to:
1. **Verify** if the experimental methodology is sound
2. **Identify** flaws in the approach, the measurements, or the conclusions
3. **Assess** whether the results are novel or already known
4. **Advise** on what additional experiments would be needed for publication

I am not claiming a breakthrough. I am presenting observations that I cannot fully evaluate myself.

---

## 1. What We Built

### The Framework

SpikyPanda is a neural network runtime in TypeScript where every neuron is a graph node and every synapse is a graph edge. It runs in the browser (single-threaded JavaScript, no GPU). We implemented:

- MLP with backpropagation (validated on XOR, parity)
- CNN with shared kernels (validated on MNIST - 93%)
- RNN with LSTM/GRU (validated on motor vibration - 100%)
- Vision Transformer with multi-head self-attention (validated on MNIST - 74%)
- Convolutional autoencoder (validated on synthetic LiDAR grids)

All code is open source and runnable in a browser.

### The Problem

We use convolutional autoencoders to compress synthetic LiDAR occupancy grids (multi-channel 2D grids representing sensor data for autonomous navigation). The grid has 6 channels:

| Channel | Content | Characteristic |
|---|---|---|
| C0 Density | Point count per cell | Dense, smooth |
| C1 Z max | Maximum height | **Sparse** - small obstacle rectangles on flat background |
| C2 Z min | Minimum height | Dense, near-zero |
| C3 Std(z) | Height variance | Dense, textured |
| C4 Reflectivity | Surface material | Dense |
| C5 Velocity | Dynamic flag | **Very sparse** - few pixels with signal |

The CNN autoencoder achieves low overall MSE but fails to reconstruct the sparse channels (Z max, Velocity) because the global bottleneck (1536 pixels compressed to 64 dimensions) sacrifices rare features.

### The Solution Tested

We implemented three architectures for comparison:

**1. CNN Autoencoder** (baseline)
- Conv -> Pool -> Flatten -> Dense(64) -> Upsample -> Conv
- Global bottleneck: all pixels through one 64-dim vector

**2. ViT MAE** (Masked Autoencoder style)
- Image split into patches, each embedded into 64 dims
- Multi-head self-attention between ALL tokens (global)
- Each token independently reconstructs its own patch
- Full backpropagation through all layers

**3. SAT** (Spatial Attention Transformer - our variant)
- Same as ViT MAE, except:
- Each token only attends to spatially neighboring tokens (Chebyshev distance R)
- Neighbor map is pre-computed from patch grid positions
- Class token still attends to all tokens (global aggregator)
- R=1 means 3x3 neighborhood (~9 neighbors instead of all N tokens)

The SAT is identical to the ViT MAE in every way except the attention mask. Same weights, same training, same decoder. The only difference is WHICH tokens each token can attend to.

---

## 2. What We Observed

### Experiment 1: Statistical validation at 16x16 (10 runs)

**Setup**: 16x16x6 grid, patch 4x4, 17 tokens, embed=64, 4 heads, 2 blocks, 20 epochs, lr=0.001, 100 train + 20 test samples, 10 independent runs.

| Architecture | MSE (mean +/- std) | Z max MSE | Velocity MSE |
|---|---|---|---|
| CNN Small | 0.0061 +/- 0.0008 | 0.0115 | 0.0063 |
| ViT MAE (global) | 0.0055 +/- 0.0004 | 0.0103 | 0.0054 |
| SAT Local R=1 | 0.0052 +/- 0.0004 | 0.0101 | 0.0048 |
| SAT Hierarchical R=1,3 | 0.0057 +/- 0.0005 | 0.0108 | 0.0060 |
| SAT Progressive R=1,inf | 0.0056 +/- 0.0002 | 0.0105 | 0.0058 |

**Observation**: SAT Local (R=1) has the best MSE on ALL channels. More attention (Hierarchical, Progressive) gives WORSE results than local-only.

### Experiment 2: Profiling at 16x16

**Setup**: Instrumented profiler measuring wall-clock time and FLOPS per computation phase.

| Phase | ViT Time% | SAT Time% | Comment |
|---|---|---|---|
| patch_embedding | 7% | 8% | Identical |
| attention_qkv | 23% | 31% | Identical (same QKV projection) |
| **attention_scores** | **7%** | **0-3%** | **Only phase that differs** |
| attention_proj | 19% | 22% | Identical |
| mlp | 28% | 31% | Identical |
| patch_decoder | 9% | 6% | Identical |

**Observation**: At 16x16 (17 tokens), attention_scores is only 5-7% of total time. The SAT cannot be meaningfully faster because the bottleneck is elsewhere (QKV projection and MLP dominate).

### Experiment 3: Multi-scale benchmark

**Setup**: Same architectures at 16x16, 32x32, and 64x64.

| Grid | Tokens | Training Speedup | MSE ViT | MSE SAT | SAT vs ViT |
|---|---|---|---|---|---|
| 16x16 | 17 | 1.09x | 0.0087 | 0.0093 | Comparable |
| 32x32 | 65 | 1.37x | 0.0123 | 0.0128 | Comparable |
| 64x64 | 65 | **1.58x** | **0.0346** | **0.0190** | **SAT 1.8x better** |

**Observation at 32x32**: attention_scores becomes 28% of ViT time (was 7% at 16x16) but only 5% of SAT time. The quadratic scaling becomes visible.

**Observation at 64x64**: SAT is both faster (1.58x) AND produces better MSE (0.019 vs 0.035). The ViT's global attention appears to hurt reconstruction quality at this scale.

---

## 3. Our Interpretation (needs validation)

### Why local attention might be better for reconstruction

Each token must reconstruct its own patch (96-384 pixels depending on patch size). The information needed is:
1. The token's own embedding (what's in this patch)
2. Context from immediate neighbors (what's around this patch)
3. Information from distant patches (what's happening elsewhere)

We hypothesize that (3) is not useful for reconstruction and actively harmful because it dilutes the token's representation with irrelevant information. A patch containing a road on the left side of the grid gains nothing from knowing about an obstacle on the right side - but global attention forces it to mix these signals.

For classification (one label per image), global attention IS useful because the class depends on the whole image. For per-patch reconstruction, only local context matters.

### Why results improve at larger scale

At 64x64 with 65 tokens, global attention computes 65x65=4225 attention pairs per head. Each token's representation is a weighted average of 65 other tokens. The "useful" neighbors (R=1) are only ~9 tokens. So 56 out of 65 attention weights are noise that the network must learn to suppress. At larger scales, the signal-to-noise ratio in the attention pattern gets worse.

### What we are NOT sure about

1. **Is the backpropagation correct?** We implemented backprop through attention from scratch. Errors in the gradient computation could bias results.
2. **Is the comparison fair?** Both architectures use the same optimizer (SGD), same learning rate, same epochs. But maybe ViT needs a different learning rate at larger scales.
3. **Is synthetic data representative?** Our LiDAR grids are generated procedurally. Real sensor data might behave differently.
4. **Is this already known?** Swin Transformer uses windowed attention (similar concept) but for classification, not reconstruction. We don't know if per-patch reconstruction + local attention has been studied.
5. **Are the MSE differences statistically significant?** At 16x16 we have 10 runs; at 32x32 and 64x64 we have single runs.

---

## 4. How to Reproduce

### Prerequisites

- Node.js (v18+)
- Git

### Setup

```bash
git clone https://github.com/pandaGaume/spikypanda.git
cd spikypanda
npm install
```

### Run the statistical benchmark (16x16, 10 runs, ~5 minutes)

```bash
node packages/dev/tools/benchmarks/sat-benchmark.cjs
```

Output: JSON results + summary table with mean +/- std for 5 architectures.

### Run the scale benchmark (16x16 + 32x32 + 64x64, ~10 minutes)

```bash
node packages/dev/tools/benchmarks/sat-scale-benchmark.cjs
```

Output: per-phase profiling + comparison table at each scale.

### Interactive demos (browser)

```bash
# Start a local server
npx live-server packages/host/www

# Open in browser:
# http://localhost:8080/samples/lidar/   (LiDAR autoencoder - CNN/ViT/SAT)
# http://localhost:8080/samples/mnist/   (MNIST classification - CNN/ViT)
```

In the LiDAR sample:
1. Click "Generate Data"
2. Select preset (CNN Small, ViT MAE, SAT Local, SAT Hierarchical, SAT Progressive)
3. Select resolution (16x16, 32x32, 64x64)
4. Click "Train", then "Test"
5. The log shows per-phase profiler output when using ViT/SAT presets

### Code structure

```
packages/dev/core/src/neuralnetwork/
    vit/                          # Standard Vision Transformer
        vit.interfaces.ts         # Types, configs, presets
        vit.builder.ts            # Builds ViT graph with weight matrices
        vit.inference.ts          # Forward pass (instrumented with Profiler)
        vit.training.ts           # Backpropagation
        vit.math.ts               # Softmax, GELU, LayerNorm (forward + backward)

    sat/                          # Spatial Attention Transformer
        sat.interfaces.ts         # Extends ViT with neighborMap and radius
        sat.builder.ts            # Builds SAT graph with pre-computed neighbors
        sat.inference.ts          # Forward pass with sparse attention (instrumented)
        sat.training.ts           # Backpropagation through sparse attention

    nn.profiler.ts                # Generic profiler (time + FLOPS per phase)

packages/dev/tools/benchmarks/
    sat-benchmark.cjs             # Statistical benchmark (10 runs x 5 architectures)
    sat-scale-benchmark.cjs       # Multi-scale benchmark with profiling
```

### Key code difference (SAT vs ViT)

The ONLY difference between SAT and ViT is in the attention loop. In `vit.inference.ts`:

```typescript
// ViT: attend to ALL tokens
for (let tq = 0; tq < numTokens; tq++) {
    for (let tk = 0; tk < numTokens; tk++) {        // O(N^2)
        dot += Q[tq][d] * K[tk][d];
    }
}
```

In `sat.inference.ts`:

```typescript
// SAT: attend only to neighbors
for (let tq = 0; tq < numTokens; tq++) {
    const tokenNeighbors = neighbors[tq];            // pre-computed
    for (let ni = 0; ni < tokenNeighbors.length; ni++) {  // O(k)
        const tk = tokenNeighbors[ni];
        dot += Q[tq][d] * K[tk][d];
    }
}
```

Everything else (QKV projection, MLP, LayerNorm, patch decoder, backpropagation) is identical.

---

## 5. Questions for the Reviewer

1. **Is the experimental methodology sound?** Are there confounding variables we're not controlling for?

2. **Is the observation that local attention outperforms global attention for per-patch reconstruction novel?** Swin Transformer uses windowed attention for classification - has anyone tested it for MAE-style reconstruction on occupancy grids?

3. **Is the MSE improvement at 64x64 (0.019 vs 0.035) meaningful or an artifact?** Could it be caused by different convergence rates rather than architectural advantage? Should we train both to convergence (many more epochs) before comparing?

4. **Is our backpropagation implementation correct?** We implemented gradient computation through multi-head attention, LayerNorm, GELU, and residual connections from scratch. What is the best way to verify correctness?

5. **What additional experiments would strengthen the results?**
   - More runs at 32x32 and 64x64?
   - Real LiDAR data (nuScenes, KITTI)?
   - Ablation on radius R (sweep from 0 to N)?
   - Different learning rates per architecture?
   - Training to full convergence instead of fixed epochs?
   - Comparison against Swin Transformer implementation?

6. **Is this publishable?** If so, at what venue and what additional work is needed?

---

## 6. Related Work We Are Aware Of

- **ViT** (Dosovitskiy et al., 2020) - Vision Transformer for classification
- **MAE** (He et al., 2022) - Masked Autoencoder for self-supervised learning
- **Swin Transformer** (Liu et al., 2021) - Windowed attention for classification
- **MAELi** (Krispel et al., WACV 2024) - MAE for LiDAR point clouds
- **Voxel-MAE** (Hess et al., WACV 2023) - MAE pre-training on LiDAR voxels
- **Longformer** (Beltagy et al., 2020) - Local + global attention for long documents
- **ViTAE-SL** (2024) - ViT encoder + CNN decoder for field reconstruction

We have not found work specifically studying local vs global attention for per-patch reconstruction of multi-channel occupancy grids.

---

## 7. Summary of Files

| File | Description |
|---|---|
| `docs/sat-lidar-results.md` | Full results document with profiling and analysis |
| `docs/mae-lidar-results.md` | MAE vs CNN autoencoder comparison |
| `docs/vit-benchmark-results.md` | CNN vs ViT on MNIST classification |
| `docs/bottlenecks-and-opportunities.md` | Performance analysis and research directions |
| `docs/vision-transformers-spikypanda.md` | ViT/VLA architecture mapping to graph framework |
| `packages/dev/tools/benchmarks/sat-benchmark.cjs` | Statistical benchmark script |
| `packages/dev/tools/benchmarks/sat-scale-benchmark.cjs` | Multi-scale benchmark script |
