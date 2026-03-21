# LiDAR Autoencoder — Sample Documentation

## Overview

The LiDAR Autoencoder sample demonstrates how SpikyPanda's CNN infrastructure can be used to compress spatial sensor data into a compact latent representation suitable for downstream tasks like autonomous navigation.

The sample is a self-contained HTML page (`packages/host/www/lidar.html`) that generates synthetic LiDAR data, trains a convolutional autoencoder, evaluates reconstruction quality, and exports the trained encoder weights.

---

## Motivation

In autonomous navigation, a LiDAR sensor produces dense 3D point clouds. These are typically projected onto a 2D occupancy grid with multiple channels encoding spatial properties (height, density, reflectivity, etc.). The raw grid is too large to feed directly into a navigation controller.

An **autoencoder** learns to compress this grid into a small latent vector (e.g., 64 dimensions) that retains the essential spatial information. Only the **encoder** is kept for inference — the decoder is discarded after training. The latent vector is then fused with other sensor inputs (IMU, wheel odometry, GPS) for path planning.

```
LiDAR Grid (64x64x6) --> Encoder --> Latent (64d) --+
                                                     +--> Navigation MLP --> Commands
IMU, Wheel, GPS     --------------------------------+
```

---

## Input Format

Each sample is a 2D grid with **6 channels** in CHW (Channel-Height-Width) order, values normalized to [0, 1]:

| Channel | Name | Description |
|---------|------|-------------|
| C0 | Point density | Number of LiDAR returns per cell (0 = empty, 1 = dense) |
| C1 | Z max | Maximum height in the cell |
| C2 | Z min | Minimum height in the cell |
| C3 | Std(z) | Height variance — high for vegetation, low for walls |
| C4 | Reflectivity | Surface reflectivity — high for asphalt, low for grass |
| C5 | Velocity | Dynamic flag — 0 for static objects, >0 for moving objects |

**C3 (height variance)** is particularly useful: it distinguishes vegetation (traversable, high variance) from solid walls (non-traversable, low variance) that may have the same maximum height.

---

## Architecture

### Autoencoder Structure

The autoencoder is symmetric: the decoder mirrors the encoder.

```
Encoder:   Input --> Conv(Same) --> Pool --> Flatten --> Dense(latent)
Decoder:   Dense(flat) --> Reshape --> Upsample --> Conv(Same, sigmoid) --> Output
```

The `Same` padding on convolutions ensures spatial dimensions are preserved (only pooling reduces size). The decoder uses:
- `Dense` to expand the latent back to the flattened spatial size
- `Reshape` to restore the 3D layout (inverse of Flatten)
- `Upsample` with nearest-neighbor interpolation (inverse of Pool)
- `Conv` with sigmoid activation to produce [0, 1] output values

### Presets

| Preset | Input Size | Encoder Layers | Approx. Neurons |
|--------|-----------|----------------|-----------------|
| **Tiny** | 16x16 | Conv(8, 3x3) --> Pool(2x2) | ~8K |
| **Small** | 32x32 | Conv(8, 3x3) --> Pool --> Conv(16, 3x3) --> Pool | ~20K |
| **Standard** | 64x64 | Conv(8, 5x5) --> Pool --> Conv(16, 3x3) --> Pool --> Conv(32, 3x3) --> Pool | ~40K+ |

The **Tiny** preset is recommended for browser training. Standard is intended for server-side or offline training.

### Example: Tiny Preset (16x16x6, latent=64)

```
input(16x16x6) --> conv(16x16x8) --> pool(8x8x8) --> flatten(512)
  --> dense(64) [LATENT]
  --> dense(512) --> reshape(8x8x8) --> upsample(16x16x8) --> conv(16x16x6)
```

Total: ~8K neurons, ~80K synapses.

---

## Synthetic Data Generator

The sample includes a procedural LiDAR grid generator that produces 5 scene types:

| Scene | Description | Key Features |
|-------|-------------|--------------|
| **Straight road** | Central road band with vegetation on sides | High density center, high C3 on sides |
| **Curved road** | Sinusoidal road path | Same as straight but with spatial curvature |
| **Intersection** | Cross-shaped road | Two perpendicular road bands |
| **Obstacles** | Road with random rectangular obstacles | High C1 (tall), some with C5 > 0 (moving) |
| **Empty field** | Open area with sparse returns | Low density, uniform low height |

Gaussian noise is added to all channels for realism. Each scene is deterministic given its type but randomized in details (obstacle positions, curve amplitude, etc.).

---

## Training

### Loss Function

The autoencoder uses **MSE (Mean Squared Error)** loss:

```
MSE = (1/N) * sum( (input[i] - output[i])^2 )
```

The target output is the input itself — the network learns to reconstruct its own input through a bottleneck.

### Optimizer

**Adam** optimizer with configurable learning rate (default: 0.003). Adam adapts per-parameter learning rates using first and second moment estimates, which is well-suited for the mixed conv/dense architecture.

### Training Loop

```
for each epoch:
    for each sample in dataset:
        output = autoencoder.forward(sample.pixels)
        loss = MSE(sample.pixels, output)
        backpropagate(loss)
        update weights (Adam)
```

The UI yields to the browser event loop every 5 samples to keep the interface responsive.

---

## Metrics

### MSE (Mean Squared Error)

Average squared difference between original and reconstructed values across all pixels and channels. Lower is better.

- **< 0.01**: Excellent reconstruction
- **0.01 - 0.05**: Acceptable, some detail loss
- **> 0.05**: Poor reconstruction, model needs more capacity or training

### RMSE (Root Mean Squared Error)

Square root of MSE. Since values are in [0, 1], RMSE directly represents the average per-pixel error on a 0-1 scale:

```
RMSE = sqrt(MSE)
```

For example, RMSE = 0.094 means each pixel value is off by ~9.4% on average.

### Inference Time

Total time to run the full autoencoder (encoder + decoder) on all test samples. In production, only the encoder is used, so real inference time is approximately half.

### Loss Curve

Shows average MSE per epoch. A healthy curve:
- Drops steeply in early epochs
- Gradually flattens as the model converges
- Should not oscillate (reduce learning rate if it does)
- Should not plateau too high (increase model capacity or epochs)

---

## Weight Sharing and Export

### Kernel Sharing

The encoder and autoencoder graphs share the same `IKernel` objects for convolutional layers. After training the autoencoder, the encoder's conv weights are already updated (same object references). Dense layer weights require an explicit sync:

```typescript
AutoencoderBuilder.syncWeights(result);
```

### Export Format

The "Export Encoder" button downloads a JSON file containing:

```json
{
    "layerDescriptors": [ { "type": "...", "width": ..., "height": ..., "channels": ... } ],
    "kernels": [ { "height": ..., "width": ..., "inputChannels": ..., "weights": [...], "bias": ... } ],
    "denseWeights": [ [ { "bias": ..., "weights": [...] } ] ]
}
```

This can be loaded into any SpikyPanda runtime (browser, Node.js, or embedded in the bestioles simulation) to run encoder-only inference.

---

## API Reference

### AutoencoderBuilder

```typescript
import { AutoencoderBuilder } from "@spiky-panda/core";

const result = new AutoencoderBuilder({
    inputWidth: 16,
    inputHeight: 16,
    inputChannels: 6,
    latentDim: 64,
})
    .addConvLayer({ filters: 8, kernelSize: 3, padding: PaddingType.Same })
    .addPoolLayer({ type: PoolingType.Max, size: 2 })
    .build();

// result.autoencoder — full graph for training
// result.encoder    — encoder-only graph for inference
```

### Presets

```typescript
import { buildAutoencoderFromPreset } from "@spiky-panda/core";

const result = buildAutoencoderFromPreset("tiny", {
    width: 16, height: 16, channels: 6, latentDim: 64,
});
```

### Training

```typescript
const runtime = new CnnInferenceRuntime(result.autoencoder);
const trainer = new CnnTrainingRuntime(
    result.autoencoder, runtime,
    LossFunctions.MSE, 0.003, Optimizers.Adam()
);

// Train: expected output = input (reconstruction)
const loss = trainer.trainStep(sample.pixels, sample.pixels);

// After training, sync weights to encoder
AutoencoderBuilder.syncWeights(result);

// Inference with encoder only
const encRuntime = new CnnInferenceRuntime(result.encoder);
const latent = encRuntime.run(inputPixels); // returns latent vector
```

### New Layer Types

Two new layer types were added to support the autoencoder decoder:

| Layer | Purpose | Builder Method |
|-------|---------|---------------|
| **Upsample** | Nearest-neighbor upscaling (inverse of Pool) | `addUpsampleLayer({ factor: 2 })` |
| **Reshape** | Flat-to-spatial remapping (inverse of Flatten) | `addReshapeLayer({ width, height, channels })` |

Both are pass-through layers with no learnable parameters.

---

## File Structure

```
packages/
  dev/core/src/neuralnetwork/cnn/
    cnn.autoencoder.builder.ts   -- AutoencoderBuilder class
    cnn.autoencoder.presets.ts   -- Preset configurations (tiny, small, standard)
    cnn.builder.ts               -- Extended with addUpsampleLayer, addReshapeLayer
    cnn.interfaces.ts            -- Extended with Upsample, Reshape layer types
    cnn.inference.ts             -- Updated for new layer types
    training/cnn.training.ts     -- Updated for new layer backprop

  host/www/
    lidar.html                   -- Self-contained demo page
    bundle/spikypanda-core.js    -- UMD bundle with all exports
```

---

## Limitations

- **Graph-based overhead**: Every neuron and synapse is a JavaScript object. A 64x64x6 input creates 24,576 input neurons alone. This is intentional (supports non-standard architectures like SNN) but significantly slower than tensor-based frameworks.
- **No GPU acceleration**: All computation is CPU-based, sequential.
- **Synthetic data only**: The generator produces simplified LiDAR-like patterns. Real LiDAR data would need to be projected from point clouds using a separate preprocessing step.
- **No transposed convolution**: The decoder uses Upsample + Conv instead of transposed convolution. This avoids checkerboard artifacts but may limit reconstruction quality.
