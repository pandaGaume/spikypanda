# Structural Plasticity: The Core Differentiator of SpikyPanda

## The problem: generalization without adaptation

A neural network trained on dataset A performs well on dataset A. Deploy it in
environment B and it degrades. The standard solutions are:

- **Fine-tuning** - retrain on new data (requires data + compute + downtime)
- **Domain adaptation** - learn domain-invariant features (complex, limited results)
- **Foundation models** - pretrain on everything (expensive, not guaranteed)

All these approaches share a fundamental limitation: the **network topology is fixed**.
Same neurons, same connections, same architecture. Only the weights change.

## How biological brains solve this

The brain does not fine-tune. It exhibits **structural plasticity**:

| Mechanism | What it does | Timescale |
|---|---|---|
| **Synaptic plasticity** | Strengthen/weaken existing connections | Milliseconds to hours |
| **Synaptogenesis** | Create new synapses | Hours to days |
| **Synaptic pruning** | Remove unused connections | Days to weeks |
| **Neurogenesis** | Create new neurons (hippocampus) | Days to months |
| **Hebbian learning** | "Neurons that fire together wire together" | Milliseconds |
| **Astrocyte modulation** | Local regulation of synaptic transmission | Seconds to minutes |

When you move to a new environment, your brain does not restart training. It
**adapts its structure** - creating new connections for new patterns, pruning
connections for irrelevant ones, adjusting local connectivity based on activity.

## Why tensor frameworks cannot do this

In PyTorch/TensorFlow, a neural network is a sequence of matrix multiplications:

```
y = W3 * relu(W2 * relu(W1 * x + b1) + b2) + b3
```

The matrices W1, W2, W3 have fixed dimensions. You cannot:
- Add a row to W2 (new neuron) without rebuilding the entire model
- Remove a column from W1 (prune a connection) without reshaping all downstream matrices
- Insert a new connection between layer 1 and layer 3 (skip connection) at runtime
- Change the graph topology during inference

These operations require a full model rebuild, reinitialization, and retraining.

## What SpikyPanda enables

In SpikyPanda, a neural network is an explicit graph of nodes (neurons) and
links (synapses):

```typescript
// Add a neuron at runtime
const newNeuron = new StereoCnnNeuron("left", CnnLayerType.Conv, row, col, ch);
graph.addNode(newNeuron);

// Add a cross-synapse to a new disparity
const newSynapse = new StereoCnnSynapse(leftNeuron, rightNeuron, kernel, idx, 0, true, d);
graph.addLink(newSynapse);

// Prune a weak synapse
if (Math.abs(synapse.weight) < threshold) {
    graph.removeLink(synapse);
}
```

These are O(1) operations. No rebuild. No reshaping. No retraining.

| Operation | PyTorch | SpikyPanda |
|---|---|---|
| Change a weight | O(1) | O(1) |
| Add a neuron | Rebuild model | O(1) - `graph.addNode()` |
| Remove a synapse | Rebuild model | O(1) - `graph.removeLink()` |
| Add a skip connection | Rebuild model | O(1) - `new Synapse(a, b)` |
| Add cross-synapse at new disparity | Impossible | O(1) |
| Change topology during inference | Impossible | Native |

## Concrete application: stereo depth on Mars

Consider the rover scenario:

### Phase 1 - Training in simulation (BabylonJS)
- Train stereo CNN with cross-synapses on varied simulated terrain
- Learn disparity patterns for rocks, slopes, flat ground
- Cross-synapses learn disparity preferences at d=0..16

### Phase 2 - Deployment on real terrain
- New textures (real Mars surface vs simulated)
- Different lighting (real sun vs simulated)
- Unexpected obstacles (shapes never seen in simulation)
- New depth ranges (farther/closer than simulated)

### Phase 3 - Structural adaptation (plasticity)

Without plasticity (standard approach):
- Performance degrades on new textures
- No disparity estimation beyond trained range
- Must send data to Earth, retrain, upload (4-24 min latency)

With plasticity (SpikyPanda approach):

1. **Synaptic pruning** - cross-synapses with near-zero weights after deployment
   are removed, reducing inference time. If d=7 and d=8 are never useful on real
   terrain, the rover prunes them.

2. **Synaptogenesis** - if the rover encounters objects at disparities beyond the
   trained range (d > 16), new cross-synapses are created at d=17, 18... with
   small random weights. Online learning adjusts them.

3. **Local reinforcement** - if a specific region of the visual field consistently
   produces bad depth estimates, the density of cross-synapses in that region
   increases (more disparity candidates tested).

4. **Hebbian adaptation** - cross-synapses that consistently activate together
   (correlated L/R features at correct disparity) are strengthened. Others decay.
   No backpropagation needed - purely local rule.

## The broader vision: a structurally adaptive world model

Plasticity is not specific to stereo. It applies to every module in the
perception-to-action pipeline:

```
Stereo cameras --> Stereo CNN (cross-synapse plasticity)
                        |
                   Depth --> BEV grid
                        |
                   SAT Encoder (attention radius plasticity)
                        |
                   Latent --> LSTM (gate plasticity)
                        |
                   Navigation MLP (connection plasticity)
```

Each module can adapt its structure to the environment:

- **SAT encoder** - attention radius grows in open areas (more global context needed),
  shrinks in cluttered areas (local features sufficient)
- **LSTM** - new memory cells created for novel temporal patterns, unused cells pruned
- **Navigation MLP** - new connections added for behaviors not seen in training

This is the **world model** that AMI is pursuing: a system that genuinely understands
its environment because it adapts to it structurally, not just parametrically.

## Relationship to existing approaches

| Approach | Adapts weights | Adapts structure | Runtime |
|---|---|---|---|
| Fine-tuning | Yes | No | Offline |
| NEAT/HyperNEAT | Yes | Yes | Evolutionary (offline) |
| Neural Architecture Search | No | Yes | Offline (search) |
| Continual learning | Yes | No | Online |
| **SpikyPanda plasticity** | **Yes** | **Yes** | **Online** |

The closest existing work is NEAT (neuroevolution), but NEAT adapts structure through
evolutionary selection (offline, population-based). SpikyPanda enables structural
adaptation during inference (online, individual-based).

## What needs to be demonstrated

The vision is clear. The experimental validation requires:

1. **Pruning benchmark** - train stereo CNN, deploy on new data, prune weak synapses,
   measure speedup vs accuracy trade-off
2. **Synaptogenesis benchmark** - train on limited disparity range, deploy on extended
   range, add cross-synapses, measure recovery of depth estimation
3. **Hebbian adaptation** - implement STDP-like rule on cross-synapses, deploy without
   backpropagation, measure online adaptation quality
4. **Comparison with fine-tuning** - same scenario, compare structural adaptation vs
   weight-only adaptation on convergence speed and final accuracy

These experiments are the path to a genuine contribution. The architectures (CNN, ViT,
SAT, Stereo) are reproductions. The plasticity is the innovation.
