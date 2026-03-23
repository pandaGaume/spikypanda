# Vision Transformer vs CNN Benchmark on MNIST
## SpikyPanda Graph-Based Neural Network Framework

---

## 1. Objective

The purpose of this experiment is to validate that the SpikyPanda framework can faithfully reproduce the Vision Transformer (ViT) architecture, and to compare its behavior against convolutional neural networks (CNNs) on a small dataset (MNIST). The goal is to confirm known behaviors from the literature regarding the data-efficiency trade-off between CNNs and ViTs.

## 2. Experimental Setup

### 2.1 Dataset

- **Dataset**: MNIST handwritten digits (28x28x1 grayscale, 10 classes)
- **Training set**: 500 samples
- **Test set**: 200 samples
- The small dataset size was deliberately chosen to highlight the data-efficiency difference between CNNs and ViTs, as documented in the literature.

### 2.2 Architectures Tested

| ID | Type | Architecture | Parameters (approx.) |
|---|---|---|---|
| CNN-Fast | CNN | Conv(4 filters, 3x3) -> Pool(2x2) -> Dense(10) | ~7K |
| CNN-Balanced | CNN | Conv(8 filters, 5x5) -> Pool(2x2) -> Dense(10) | ~15K |
| ViT-Tiny | ViT | Patch 7x7, embed=64, 4 heads, 2 blocks, MLP ratio=2 | ~50K |

### 2.3 Training Conditions

| Parameter | CNN | ViT |
|---|---|---|
| Optimizer | Adam | SGD (direct gradient descent) |
| Loss function | Cross-entropy | Cross-entropy |
| Learning rate | 0.005 | 0.001 |
| Epochs | 5 | 3 and 10 |

**Runtime environment**: Chrome browser, JavaScript, single-threaded CPU execution.

## 3. Results

### 3.1 Classification Accuracy

```
Accuracy on MNIST Test Set (200 samples)

CNN-Fast (5 ep)      |████████████████████████████████████░░░░| 89.5%
CNN-Balanced (5 ep)  |█████████████████████████████████████░░░| 93.0%
ViT-Tiny (3 ep)      |██████████████████████░░░░░░░░░░░░░░░░░░| 56.0%
ViT-Tiny (10 ep)     |█████████████████████████████░░░░░░░░░░░| 74.0%
```

### 3.2 Inference Time

| Architecture | Inference Time (200 samples) | Per Sample |
|---|---|---|
| CNN-Fast | ~33 ms | ~0.17 ms |
| CNN-Balanced | ~109 ms | ~0.55 ms |
| ViT-Tiny (3 ep) | ~458 ms | ~2.3 ms |
| ViT-Tiny (10 ep) | ~473 ms | ~2.4 ms |

### 3.3 Training Convergence

CNN architectures converge within 3--5 epochs to >89% accuracy on the test set. The ViT-Tiny model shows progressive improvement: 56% at 3 epochs, 74% at 10 epochs. The learning curve suggests further improvement is achievable with additional epochs and does not exhibit signs of saturation at 10 epochs.

## 4. Analysis

### 4.1 Accuracy Gap -- Expected Behavior

The 19-point gap between CNN-Balanced (93%) and ViT-Tiny (74%) on 500 training samples is consistent with the literature. Dosovitskiy et al. (2020) demonstrated that Vision Transformers underperform CNNs on small datasets due to a lack of inductive bias:

- **CNNs** possess built-in locality (convolutional kernels) and translation equivariance. These architectural priors encode the assumption that nearby pixels are spatially related, providing a strong prior for image understanding without requiring large amounts of data.
- **ViTs** treat the image as a flat sequence of patches with no spatial prior. All spatial relationships must be learned from the training data through the self-attention mechanism.
- With only 500 training samples, there is insufficient data for the ViT to learn the spatial structure that the CNN obtains for free from its architecture.

This result quantitatively confirms the expected behavior: CNNs dominate ViTs in the low-data regime.

### 4.2 Inference Speed

ViT inference is approximately 4x slower than CNN-Balanced (2.3 ms vs. 0.55 ms per sample). This difference is attributable to several factors:

- Self-attention has O(n^2) complexity over 17 tokens (16 patches + 1 class token), requiring pairwise attention score computation.
- Each attention head requires three dense projections (Q, K, V) followed by matrix multiplications, all executed in pure JavaScript.
- CNN architectures benefit from simpler sequential operations (convolution, pooling) that map efficiently to linear algebra primitives.

### 4.3 Training Convergence

The ViT shows continued improvement from epoch 3 to epoch 10 (56% to 74%), which suggests:

- The model is not overfitting despite having ~50K parameters trained on only 500 samples.
- LayerNorm and the attention mechanism provide implicit regularization that prevents memorization.
- Additional epochs and/or a larger training set would likely yield further accuracy gains.

## 5. Conclusions

1. **Framework validation.** SpikyPanda successfully implements the Vision Transformer architecture. The ViT builds, trains, and performs inference correctly within the graph-based framework.

2. **Behavior matches the literature.** The data-efficiency gap (CNN > ViT on small datasets) is a well-documented property of Vision Transformers. The results obtained here (93% CNN vs. 74% ViT on 500 samples) quantitatively confirm this known behavior.

3. **Architecture trade-offs.** CNNs are the superior choice for small datasets and edge inference scenarios (faster execution, higher accuracy). ViTs would require significantly more training data (on the order of thousands to tens of thousands of samples) to match or exceed CNN performance.

4. **Graph-based overhead.** The weight-matrix approach -- storing transformer weights as arrays rather than as individual synapses -- is necessary to avoid combinatorial explosion. The graph contains only input/output neuron placeholders while all computation uses weight matrices. This is a pragmatic compromise between the graph paradigm and computational feasibility.

5. **Scientific positioning.** This experiment reproduces well-established results from the literature. The original contribution lies not in the ViT architecture itself, but in its implementation within a graph-based, mutable neural architecture framework -- a stepping stone toward hybrid attention mechanisms that leverage spatial topology (see `vision-transformers-spikypanda.md`).

## 6. ViT as Autoencoder - Reconstruction Limitations

### Experiment

We tested the ViT as a convolutional autoencoder replacement on the LiDAR grid reconstruction task (16x16x6 channels). The ViT classifier architecture was adapted for reconstruction:
- Output activation changed from softmax to sigmoid (values in [0,1])
- Loss changed from cross-entropy to MSE
- numClasses set to output size (width x height x channels = 1536)
- Full backpropagation through all transformer blocks

### Observation

The ViT autoencoder did not improve reconstruction quality compared to the CNN autoencoder, particularly for the sparse channels (Z max, Velocity) that motivated this experiment. Training speed was comparable to CNN but reconstruction quality remained poor.

### Analysis - Why the ViT classifier architecture fails for reconstruction

The fundamental issue is **architectural**: the standard ViT compresses all spatial information into a **single class token** through self-attention, then maps this token to the output via a linear head.

```
CNN Autoencoder:
  Input (16x16x6) -> Conv -> Pool -> Latent (64d) -> Upsample -> Conv -> Output (16x16x6)
  Spatial information preserved through feature maps at each layer

ViT Classifier as Autoencoder:
  Input (16x16x6) -> Patches (16 tokens) -> Attention -> Class Token (64d) -> Linear -> Output (1536)
  ALL spatial information collapsed into ONE token, then linearly expanded
```

The class token is designed to **summarize** the image for classification (one label), not to **preserve** spatial detail for reconstruction (every pixel). A single 64-dimensional vector cannot faithfully encode the position and value of every pixel in a 16x16x6 grid.

This is fundamentally different from a CNN autoencoder where:
- The encoder preserves spatial structure through feature maps (Conv layers maintain 2D layout)
- The decoder uses upsampling to reconstruct spatial positions progressively
- Skip connections (in U-Net variants) can pass high-frequency details directly

### The correct approach - Per-patch reconstruction (MAE-style)

The Masked Autoencoder (MAE, He et al., 2022) solves this by using **all tokens** for reconstruction, not just the class token. Each patch token reconstructs its own local region:

```
MAE-style ViT Autoencoder:
  Input (16x16x6) -> Patches (16 tokens) -> Encoder (attention) -> 16 token embeddings
                                                                         |
  Each token -> Linear -> Reconstruct own patch (4x4x6 = 96 values)
                                                                         |
  Reassemble patches -> Output (16x16x6)
```

This preserves spatial information because:
- Each token only needs to reconstruct its own local patch (96 values from 64 dims - feasible)
- Self-attention allows each token to borrow context from other patches (global receptive field)
- Sparse features (obstacles in Z max) are localized to specific patches - the responsible token can focus on them

This is the approach implemented in phase 2 of this experiment.

### Scientific value

This negative result is itself informative:
1. It confirms that ViT classification architecture and autoencoder architecture serve fundamentally different purposes
2. It highlights the importance of spatial preservation in reconstruction tasks
3. It motivates the per-patch approach which leverages attention for context while maintaining spatial locality - a property that naturally maps to the graph-based architecture

## References

- Dosovitskiy, A., Beyer, L., Kolesnikov, A., Weissenborn, D., Zhai, X., Unterthiner, T., Dehghani, M., Minderer, M., Heigold, G., Gelly, S., Uszkoreit, J., & Houlsby, N. (2021). An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale. *ICLR 2021*.
- Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention Is All You Need. *Advances in Neural Information Processing Systems (NeurIPS)*.
- He, K., Chen, X., Xie, S., Li, Y., Dollar, P., & Girshick, R. (2022). Masked Autoencoders Are Scalable Vision Learners. *CVPR 2022*.
- SpikyPanda ViT implementation: `packages/dev/core/src/neuralnetwork/vit/`
