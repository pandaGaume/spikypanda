# From Vision Transformers to World Models - A Graph-Based Approach

## Context

This document explores how Vision Transformer (ViT) and Vision-Language-Action (VLA) concepts map onto SpikyPanda's graph-based neural network architecture, and outlines the intent to implement attention mechanisms natively in the graph as a stepping stone toward unified world models.

Reference article: [Vision Transformers - Vizuara Newsletter](https://www.vizuaranewsletter.com/p/vision-transformers)

## Vision Transformers - Key Concepts

Vision Transformers (Dosovitskiy et al., 2020) adapt the Transformer architecture from NLP to image classification. The core idea is to treat an image not as a pixel grid but as a sequence of patches, each processed as a token through self-attention.

The architecture consists of:
- **Patch embedding**: the image is divided into fixed-size patches (e.g. 16x16), each flattened and linearly projected into an embedding vector
- **Positional embedding**: learnable vectors added to each patch token to preserve spatial information
- **Self-attention**: every patch can attend to every other patch from the first layer - unlike CNNs where the receptive field grows gradually through stacked convolutions
- **Class token**: a special learnable token prepended to the sequence that aggregates information from all patches through attention, serving as the image representation for classification

The fundamental shift from CNN to ViT is: **locality to globality**. A CNN builds understanding through local neighborhoods (3x3 kernels) with gradually expanding receptive fields. A ViT relates any two image regions directly from layer one.

## Why This Matters for SpikyPanda

### The CNN Limitation We Already Observed

In our LiDAR autoencoder experiments, we documented a known limitation: the convolutional architecture fails to reconstruct sparse, high-frequency features (Z max obstacles, velocity flags). A 3x3 convolution followed by pooling "smears" small features (2-4 pixel obstacles) into averaged representations. The decoder cannot recover precise spatial positions from the compressed latent.

This is a direct consequence of the CNN's local receptive field. The network treats all spatial regions equally, spending most of its capacity on the dominant channels (density, z_min, std_z, reflectivity) while ignoring the rare but critical signals.

An attention mechanism would solve this: it allows the network to focus on the few relevant pixels regardless of their spatial position.

### Natural Mapping to Graph-Based Architecture

The ViT concepts map remarkably well onto SpikyPanda's graph:

| ViT Concept | Tensor Implementation | Graph Implementation |
|---|---|---|
| Patch token | Flattened vector in a matrix | A group of spatially co-located neurons |
| Self-attention | Matrix multiplication Q x K x V | Dynamic synapse weights between any two neurons |
| Positional embedding | Learned vector added to token | Neuron already has position (ICartesian) - intrinsic |
| Class token | Extra row in the token matrix | A meta-neuron (astrocyte) that connects to all others |
| Attention head | Parallel Q/K/V projections | Distinct synapse groups with independent weight sets |
| Multi-head attention | Concatenated parallel heads | Multiple synapse groups per neuron pair |

The key insight: **in a tensor framework, self-attention is an O(n^2) matrix multiplication. In a graph, it is simply synapses** - each neuron can connect to any other, with weights modulated by an attention score. The graph does not need a special "attention layer" - attention is an emergent property of the connectivity pattern.

### The Astrocyte Connection

Our earlier exploration of astrocyte-based inference (spatial meta-neurons that observe and modulate local neuron groups) is conceptually equivalent to the ViT's class token. Both serve as aggregation mechanisms:

- **Class token**: attends to all patch tokens, learns a global representation
- **Astrocyte**: observes neurons within a spatial radius, modulates local activity

The difference is that the class token is global (one per image) while astrocytes are local (one per spatial region). This suggests a hierarchical attention model: local astrocytes for regional attention, connected to a global aggregator - similar to hierarchical ViT variants (Swin Transformer, PVT).

### Sparse Attention - The Graph Advantage

The main drawback of ViT is the quadratic complexity O(n^2) of self-attention: every token attends to every other token. For a 64x64 grid with 16x16 patches, that is 16 tokens - manageable. But at pixel level (4096 tokens), it becomes expensive.

In a graph, attention can be **sparse by construction**:
- Neurons only attend to spatially nearby neurons (local attention window)
- Or to neurons with high activation (activity-based gating)
- Or to neurons in specific learned patterns (structured sparsity)

This is not a workaround - it is biologically motivated. The brain does not compute full attention over all neurons. Attention is selective, driven by salience and spatial proximity. The graph topology naturally encodes this.

## Implementation Intent

### Phase 1 - Attention Neuron Type

Introduce a new neuron type `AttentionNeuron` that computes attention scores over its incoming synapses:

```
For each incoming synapse i:
  q = W_q * neuron_state
  k = W_k * input_i
  v = W_v * input_i
  score_i = softmax(q . k / sqrt(d))
  output = sum(score_i * v)
```

This neuron type stores Q/K/V weight matrices internally, similar to how LSTM neurons store gate weights.

### Phase 2 - Patch-Based Builder

Create a builder that:
1. Takes an input grid (e.g. 64x64x6)
2. Divides it into patches (e.g. 8x8)
3. Creates an embedding neuron group per patch
4. Connects all patch groups via attention synapses
5. Adds a class token neuron connected to all patches

### Phase 3 - Sparse Attention via Spatial Proximity

Leverage the graph's spatial information (ICartesian) to limit attention:
- Each neuron only attends to neurons within a configurable radius
- The radius can vary per layer (local in early layers, global in later layers)
- This creates a Swin-Transformer-like windowed attention, but emergent from the graph topology

### Phase 4 - Validation

Test on the same benchmarks:
- MNIST digit classification (compare accuracy/speed vs CNN)
- LiDAR grid encoding (test if attention solves the sparse feature problem)
- Motor vibration (test if attention over timesteps improves RNN classification)

## Relationship to World Models

Attention is a critical component for world models. A world model must:
- **Perceive selectively** - not all sensor data is equally important
- **Remember selectively** - attention over memory (LSTM + attention = the basis of modern sequence models)
- **Predict selectively** - focus computation on regions of change

The graph-based attention mechanism in SpikyPanda would unify these three aspects in a single architecture: spatial attention for perception, temporal attention for memory, and predictive attention for action planning - all within the same mutable graph that can evolve through neuroevolution.

## From ViT to VLA - The Path to Embodied Intelligence

### What is a VLA?

Vision-Language-Action (VLA) models extend the ViT architecture to robotic control. While a ViT answers "what is in this image?", a VLA answers "what should I do given what I see and what I'm told?".

The architecture chains three components:

```
Image (robot camera) --> ViT encoder --> visual tokens --+
                                                         +--> LLM --> Action head --> motor commands
Instruction ("grab the red cup") --> tokenizer ----------+
```

- **Vision** (ViT): encodes camera input into visual tokens
- **Language** (LLM): fuses visual tokens with natural language instructions to reason about the task
- **Action** (policy head): outputs motor commands (joint angles, end-effector trajectories)

Examples include RT-2 (Google DeepMind), OpenVLA, and Pi0 (Physical Intelligence).

### ViT vs VLA Comparison

| Aspect | ViT | VLA |
|---|---|---|
| Purpose | Classify an image | Control a robot |
| Input | Image only | Image + language instruction |
| Output | Class label | Motor commands (position, velocity, torque) |
| Architecture | Transformer encoder | ViT + LLM + action head |
| Training | Supervised (ImageNet) | Imitation learning + simulation |
| Inference | Single forward pass | Continuous closed-loop control |

### The Current VLA Approach - And Its Limitations

Today's VLA models are built by assembling independently pre-trained components: a frozen ViT backbone (trained on ImageNet), a frozen LLM (trained on text), connected through learned adapter layers, with an action head fine-tuned on robot demonstrations.

This works - but it is fundamentally a pipeline of disconnected models stitched together:
- The ViT was never trained to see things relevant to manipulation
- The LLM was never trained to reason about physics
- The action head has no access to the internal representations of either
- Fine-tuning adapters is a narrow bridge between models that "think" differently

The result is brittle: change the camera angle, the lighting, or the object shape slightly, and the system can fail in ways that none of the individual components would predict.

### The Graph-Based Alternative

In SpikyPanda, the vision is fundamentally different. Instead of chaining pre-trained models, the goal is to build a **single unified graph** where perception, reasoning, and action are interconnected regions - not separate pipelines.

```
Traditional VLA:
  [ViT] --> adapter --> [LLM] --> adapter --> [Action Head]
  (3 separate models, frozen weights, narrow bridges)

Graph-based approach:
  [Perception region] <--> [Memory/Reasoning region] <--> [Action region]
  (single graph, shared representations, bidirectional connections)
```

In the graph:
- **Perception neurons** (CNN/ViT-like) process sensor input and feed into reasoning neurons
- **Reasoning neurons** (attention/RNN-like) maintain internal state, combine multimodal inputs
- **Action neurons** (MLP-like) produce motor outputs
- All regions share the same graph, the same synapse types, the same update rules
- Connections are bidirectional - action can influence perception (active sensing), reasoning can modulate attention (top-down attention)
- The entire graph can be mutated through neuroevolution - adding neurons, pruning synapses, rewiring connections

This is not just an architectural preference. It enables capabilities that pipeline VLAs cannot achieve:

1. **Structural evolution** - the network topology itself evolves, not just the weights. A creature that needs better vision grows more perception neurons. One that needs faster reactions grows shorter paths from sensor to motor.

2. **Multimodal fusion at any depth** - sensor data (LiDAR, IMU, camera) can interact at any layer, not just at predefined fusion points.

3. **Bidirectional influence** - action plans can modulate perception (look where you're about to move), perception can directly trigger reflexes (bypass reasoning for urgent threats).

4. **No pre-training dependency** - the graph learns from scratch through interaction with the world, not from curated datasets. This aligns with AMI's conviction that "real intelligence starts in the world."

### The Bestioles Proof of Concept

The bestioles ecosystem simulation is already exploring this direction at a small scale:
- Creatures have a single neural graph connecting sensors to motors
- No separation between "vision model" and "policy model"
- The graph evolves through natural selection - mutation + survival
- Creatures that perceive better, remember better, and act faster survive
- No backpropagation, no gradient, no pre-training - just evolution

The current limitation is scale: bestioles use small MLPs. Adding attention mechanisms, memory (RNN), and spatial perception (CNN) into the same graph is the next step - and the reason we are building these architectures in SpikyPanda one by one.

## The Roadmap

```
Current state:
  [MLP] [CNN] [RNN/LSTM] [Autoencoder] [SNN] - implemented separately

Next:
  [Attention mechanism] - unify perception with global context

Then:
  [Hybrid graph] - combine CNN + Attention + RNN in a single graph

Goal:
  [World model] - perception + memory + prediction + action
                  in one mutable, evolvable neural graph
```

## References

- Dosovitskiy et al., "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale", 2020
- Vaswani et al., "Attention Is All You Need", 2017
- Liu et al., "Swin Transformer: Hierarchical Vision Transformer using Shifted Windows", 2021
- Singh, M., "Vision Transformers", Vizuara Newsletter, 2025
- Brohan et al., "RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control", 2023
- Kim et al., "OpenVLA: An Open-Source Vision-Language-Action Model", 2024
- Physical Intelligence, "Pi0: A General-Purpose Robot Foundation Model", 2024
