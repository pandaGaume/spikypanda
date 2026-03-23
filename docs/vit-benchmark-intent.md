# Vision Transformer Benchmark - Intent Document

## Objective

Implement a standard Vision Transformer (ViT) within SpikyPanda's graph-based framework, then benchmark it against our existing CNN implementation on the same datasets. This serves two purposes:

1. **Validate the framework** - prove that SpikyPanda can faithfully reproduce state-of-the-art architectures beyond CNNs and RNNs
2. **Establish a baseline** - create a reference point for comparing our future graph-native attention architecture against the standard ViT

## Benchmark Design

### Architectures Under Test

| ID | Architecture | Description |
|---|---|---|
| **CNN-Tiny** | Conv(4,3x3) -> Pool -> Dense(10) | Current SpikyPanda CNN, minimal |
| **CNN-Balanced** | Conv(8,5x5) -> Pool -> Dense(10) | Current SpikyPanda CNN, moderate |
| **ViT-Tiny** | Patch(7x7), 4 heads, 2 blocks, embed=64 | Standard ViT, minimal config |
| **ViT-Small** | Patch(7x7), 4 heads, 4 blocks, embed=128 | Standard ViT, moderate config |
| **Graph-Attention** (future) | Spatial attention, sparse connectivity | Our proposed architecture |

### Dataset

**MNIST (28x28x1)** - chosen because:
- Small enough for graph-based inference in the browser
- Well-understood baseline results in the literature
- Already implemented in SpikyPanda with data loader and sample page
- 28x28 with 7x7 patches = 16 tokens, keeping attention O(n^2) = 256 pairs manageable

### Metrics

For each architecture, we measure:

| Metric | Description |
|---|---|
| **Accuracy** | Classification accuracy on test set (%) |
| **Final Loss** | Loss value at end of training |
| **Training Time** | Total time to train N epochs (ms) |
| **Inference Time** | Time to classify the full test set (ms) |
| **Inference per Sample** | Average time per single sample (ms) |
| **Graph Size** | Number of neurons and synapses in the graph |
| **Parameter Count** | Number of trainable weights |
| **Memory Footprint** | Approximate JS heap usage (bytes) |

### Test Protocol

For fair comparison, all architectures will be tested under identical conditions:

1. **Data**: same MNIST subset (500 train, 200 test)
2. **Optimizer**: Adam (beta1=0.9, beta2=0.999)
3. **Learning rate**: tuned per architecture (report the value used)
4. **Epochs**: 10 (report convergence curve)
5. **Environment**: Chrome browser, same machine
6. **Runs**: 3 runs per configuration, report mean and std

### Expected Results

Based on literature and our existing results:

| Architecture | Expected Accuracy | Expected Inference/Sample |
|---|---|---|
| CNN-Tiny | ~89-92% | ~1-2ms |
| CNN-Balanced | ~93-96% | ~3-5ms |
| ViT-Tiny | ~85-90% | ~5-10ms (attention overhead) |
| ViT-Small | ~90-95% | ~10-20ms |
| Graph-Attention | TBD | TBD |

Note: ViT is known to underperform CNN on small datasets (MNIST 500 samples) due to lack of inductive bias. This is expected and is itself an interesting result - it demonstrates the data efficiency advantage of CNNs on small datasets.

## Implementation Phases

### Phase 1 - Standard ViT (state of the art reproduction)

New components required in core:
- **Softmax activation** - required for attention scores
- **LayerNorm** - normalization before attention and MLP blocks
- **AttentionNeuron** - computes Q/K/V projections and attention scores
- **AttentionSynapse** - stores Q/K/V weight matrices
- **VitBuilder** - constructs the full ViT architecture (patch embed, positional embed, transformer blocks, class token, classification head)
- **VitInferenceRuntime** - forward pass with attention computation
- **VitTrainingRuntime** - backpropagation through attention layers

### Phase 2 - Benchmark Execution

- Add ViT preset to MNIST sample page (or create dedicated ViT sample)
- Run full benchmark matrix
- Collect all metrics in structured format
- Generate comparison tables and charts

### Phase 3 - Graph-Native Attention (our contribution)

This is the future work where we diverge from state of the art:
- Spatial attention based on neuron position (ICartesian)
- Sparse attention via proximity radius
- Astrocyte-like aggregation neurons
- Benchmark against standard ViT to quantify trade-offs

## Scientific Value

### What this proves (Phase 1-2)
- SpikyPanda can faithfully reproduce ViT in a graph-based framework
- Quantified overhead of graph traversal vs tensor operations
- Data efficiency comparison: CNN vs ViT on small datasets

### What we aim to show (Phase 3)
- Graph-native attention can achieve comparable accuracy with fewer computations (sparse attention)
- Spatial topology as an implicit attention bias (no need for learned positional embeddings)
- The graph structure enables attention patterns impossible in tensor frameworks (heterogeneous, mutable, evolvable)

### Positioning
This benchmark is NOT about beating PyTorch/TensorFlow on speed. It is about demonstrating that a graph-based architecture can support transformer-class attention mechanisms while maintaining the structural benefits (mutability, heterogeneity, inspectability) that tensor frameworks cannot offer.

## References

- Dosovitskiy et al., "An Image is Worth 16x16 Words", 2020
- Vaswani et al., "Attention Is All You Need", 2017
- Liu et al., "Swin Transformer", 2021
- LeCun et al., AMI Labs - World Models approach
