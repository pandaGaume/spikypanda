# Hybrid Neuroevolution: Darwinian Evolution + Lamarckian Adaptation

## Context

The document [plasticity-vision.md](plasticity-vision.md) describes **online** structural
plasticity, i.e. the adaptation of the network during inference (pruning, synaptogenesis,
Hebbian). This document describes the **evolutionary** process: how to evolve the network
architecture from one generation to the next.

The two mechanisms are complementary:

| Mechanism | Biological analogy | Timescale | What changes |
|---|---|---|---|
| Backpropagation | Learning (lifetime) | Intra-generation | Weights (parameters) |
| Structural plasticity | Brain plasticity | Intra-generation | Local topology |
| Neuroevolution | Natural selection | Inter-generation | Architecture (genome) |

## The fundamental problem

A SAT with 2000 neurons, attention radius R=1 and 2 heads achieves an MSE of 0.0052
on LiDAR compression. But how do we know whether:

- R=2 would be better?
- 4 heads instead of 2?
- 3 transformer blocks instead of 2?
- A residual connection between block 1 and the decoder?
- 1500 neurons would suffice (faster, same performance)?

These questions are about **architecture**, not weights. Backprop cannot answer
them: it optimizes weights at a fixed architecture. We need a process that explores
the space of architectures.

## Approach 1: Pure Darwin (classic NEAT)

NeuroEvolution of Augmenting Topologies (NEAT) by Kenneth Stanley (2002) proceeds as follows:

```
Population of N genomes (e.g. N=50)

For each generation:
  1. Each genome -> build the network -> train -> evaluate (fitness)
  2. Selection: keep the best genomes
  3. Crossover: combine portions of two parent genomes
  4. Random mutation:
     - Add a neuron (probability ~3%)
     - Add a synapse (probability ~5%)
     - Remove a synapse (probability ~2%)
     - Modify a hyperparameter (probability ~10%)
  5. Speciation: group similar genomes to protect innovation
  6. New generation
```

Mutations are **blind**, identical to biology. Selection sorts things out
after the fact.

**Advantage**: broad exploration, no human bias.
**Disadvantage**: very slow, each individual must be trained to evaluate its fitness.

## Approach 2: Gradient-guided Lamarck

Unlike nature, we have access to the inside of the network after training.
We can make **informed** decisions about the topology:

### Synapse removal (structural pruning)

After training, inspect the weights:

```typescript
for (const synapse of graph.links()) {
  if (Math.abs(synapse.weight) < pruningThreshold) {
    // This weight converged to ~0
    // The network learned that this connection is useless
    genome.markForRemoval(synapse.geneId);
  }
}
```

**Signal**: |w| < threshold means the connection contributes nothing.

### Synapse addition (structural growing)

Identify unconnected neuron pairs that would benefit from a connection:

```typescript
// Approach 1: virtual gradient
// Simulate a temporary connection, measure the gradient
for (const [a, b] of candidatePairs) {
  const virtualSynapse = new Synapse(a, b, smallRandomWeight);
  graph.addLink(virtualSynapse);
  const gradient = computeGradient(virtualSynapse);
  graph.removeLink(virtualSynapse);

  if (Math.abs(gradient) > growthThreshold) {
    // High gradient = this connection would be useful
    genome.markForAddition(a.geneId, b.geneId);
  }
}

// Approach 2: activity correlation (Hebbian)
// If two unconnected neurons activate in a correlated manner,
// a connection could capture this relationship
for (const [a, b] of candidatePairs) {
  const correlation = computeActivityCorrelation(a, b, dataset);
  if (correlation > hebbianThreshold) {
    genome.markForAddition(a.geneId, b.geneId);
  }
}
```

### Dead neuron detection

```typescript
for (const neuron of graph.nodes()) {
  const avgActivation = computeAverageActivation(neuron, dataset);
  if (avgActivation < deadThreshold) {
    // This neuron never contributes -> removing it frees capacity
    genome.markNeuronForRemoval(neuron.geneId);
  }
}
```

**Advantage**: targeted modifications, fast convergence.
**Disadvantage**: exploitation bias, gets trapped in local optima.

## Approach 3: Darwin + Lamarck Hybrid (recommended)

Combine both for exploitation AND exploration:

```
+-----------------------------------------------------+
|                  EVOLUTIONARY CYCLE                  |
|                                                     |
|  +---------------------------------------------+    |
|  | Phase 1: CONSTRUCTION                       |    |
|  |   Genome -> Build the graph network          |    |
|  +-------------+-------------------------------+    |
|                v                                    |
|  +---------------------------------------------+    |
|  | Phase 2: TRAINING                            |    |
|  |   Backpropagation on the dataset             |    |
|  |   (optimizes weights, not topology)          |    |
|  +-------------+-------------------------------+    |
|                v                                    |
|  +---------------------------------------------+    |
|  | Phase 3: ANALYSIS (Lamarck)                  |    |
|  |   - Identify weak synapses -> remove         |    |
|  |   - Identify dead neurons -> remove          |    |
|  |   - Test virtual gradients -> add            |    |
|  |   - Encode modifications into the genome     |    |
|  +-------------+-------------------------------+    |
|                v                                    |
|  +---------------------------------------------+    |
|  | Phase 4: MUTATION (Darwin)                   |    |
|  |   - Additional random mutations              |    |
|  |   - Explore unexpected topologies            |    |
|  |   - Protects against local optima            |    |
|  +-------------+-------------------------------+    |
|                v                                    |
|  +---------------------------------------------+    |
|  | Phase 5: EVALUATION                          |    |
|  |   Fitness = f(MSE, speed, network size)      |    |
|  +-------------+-------------------------------+    |
|                v                                    |
|  +---------------------------------------------+    |
|  | Phase 6: SELECTION                           |    |
|  |   - Keep the top K genomes                   |    |
|  |   - Crossover of the best                    |    |
|  |   - Weights die, structure survives          |    |
|  +-------------+-------------------------------+    |
|                |                                    |
|                +---------- Next generation ------>   |
+-----------------------------------------------------+
```

### Why this combination is powerful

| Aspect | Darwin only | Lamarck only | Hybrid |
|---|---|---|---|
| Exploration | Strong (random) | Weak (local) | Strong |
| Exploitation | Weak (blind) | Strong (guided) | Strong |
| Convergence speed | Slow | Fast | Fast |
| Local optima risk | Low | High | Low |
| Computational cost | High (N individuals) | Low (1 individual) | Medium |

## The SpikyPanda Genome

### What does the genome contain?

The genome encodes the **construction recipe** for the network, not the network itself:

```typescript
interface Genome {
  // Structural genes
  layers: LayerGene[];          // type, size of each layer
  connections: ConnectionGene[]; // source, target, enabled/disabled

  // Hyperparameter genes (for SAT)
  attentionRadius: number;       // neighborhood radius R
  numHeads: number;              // number of attention heads
  numBlocks: number;             // number of transformer blocks
  embeddingDim: number;          // embedding dimension
  mlpExpansion: number;          // MLP expansion factor

  // Plasticity genes (meta-parameters)
  pruningThreshold: number;      // removal threshold
  growthRate: number;            // connection addition rate
  hebbianLearningRate: number;   // Hebbian adaptation speed

  // History (for NEAT crossover)
  innovationNumbers: Map<string, number>;  // gene tracking
}
```

### What is inherited vs what dies

| Element | Inherited? | Why |
|---|---|---|
| Topology (which neurons, which connections) | Yes | That is the genome |
| Hyperparameters (R, heads, blocks) | Yes | That is the genome |
| Plasticity thresholds | Yes | Meta-learning |
| Synaptic weights | No | Learned by backprop (life experience) |
| Activations | No | Transient state |

### Innovation numbers (NEAT mechanism)

To cross two genomes, we need to know which genes correspond between parents.
NEAT uses a global innovation counter:

```
Parent A: [conn1, conn2, conn5, conn8]
Parent B: [conn1, conn3, conn5, conn6, conn7]

Matching genes: conn1, conn5 -> inherited randomly from one parent
Excess/disjoint genes: conn2, conn3, conn6, conn7, conn8 -> inherited from the fitter parent
```

This allows crossing different topologies in a coherent way.

## Fitness function

Fitness should not be solely based on performance (MSE). A 10,000-neuron network
with MSE 0.0050 is not better than a 500-neuron network with MSE 0.0053 if it is
20x slower.

```typescript
function fitness(individual: Individual): number {
  const accuracy = 1 - individual.mse;           // performance
  const speed = 1 / individual.inferenceTimeMs;   // speed
  const efficiency = 1 / individual.neuronCount;   // compactness

  // Configurable weighting
  return (
    weights.accuracy * accuracy +
    weights.speed * speed +
    weights.efficiency * efficiency
  );
}
```

Selection pressure on **size** is crucial: without it, networks only grow
(bloat). This is the equivalent of metabolic cost in biology: a larger brain
consumes more energy, so it must be worth it.

## Speciation: protecting innovation

A new gene (neuron addition, new connection) often degrades fitness initially
because the weight is random and the network must readjust. Without protection,
this innovation would be eliminated before it could prove its value.

NEAT solves this through **speciation**:

```
Population
+-- Species A: [genomes with 2 blocks, R=1]     -> internal competition
+-- Species B: [genomes with 3 blocks, R=1]     -> internal competition
+-- Species C: [genomes with 2 blocks, R=2]     -> internal competition
```

Each species has a guaranteed survival quota. An innovative genome only competes
with structurally similar genomes, giving it time to optimize.

The distance between genomes is computed on topology:

```typescript
function genomeDistance(a: Genome, b: Genome): number {
  const excess = countExcessGenes(a, b);
  const disjoint = countDisjointGenes(a, b);
  const weightDiff = averageWeightDifference(matchingGenes(a, b));

  return (c1 * excess + c2 * disjoint) / Math.max(a.size, b.size) + c3 * weightDiff;
}
```

## Step-by-step implementation in SpikyPanda

### Step 1: Minimal genome (MVP)

Encode the current SAT configuration as a genome:

```typescript
const genome = {
  attentionRadius: 1,
  numHeads: 2,
  numBlocks: 2,
  embeddingDim: 64,
  patchSize: 4,
  latentDim: 64,
};
```

Mutation: modify one hyperparameter at a time.
Population: 10-20 individuals.
Fitness: MSE + inference time.

### Step 2: Structural mutations

Add topology mutations:

- Add/remove connections (skip connections between blocks)
- Add/remove neurons in MLP layers
- Modify the number of heads per block (not global)

### Step 3: Lamarckian analysis

After training each individual:

- Pruning of weak synapses -> encode in the genome
- Virtual gradients to identify missing connections
- Dead neuron detection

### Step 4: Speciation and crossover

Innovation numbers + genomic distance + structural crossover.

### Step 5: Meta-evolution

The plasticity thresholds themselves (pruning threshold, growth rate) become
evolvable genes. The system learns **how** to learn to adapt its structure.

## Connection with online plasticity

Inter-generation evolution and intra-generation plasticity reinforce each other:

```
Evolution selects:
  -> architectures that adapt well (efficient plasticity)
  -> optimal plasticity thresholds (meta-parameters)
  -> initial topologies that allow the best online adaptation

Plasticity enables:
  -> better evaluation of a genome's potential (not just initial performance)
  -> reduced need for backprop training (local adaptation)
  -> compensation for slightly deleterious mutations (robustness)
```

This is the Baldwin effect: an individual's learning capacity indirectly
influences the evolution of the species. Architectures that learn better
survive more, so the capacity to learn itself evolves.

## References

- Stanley, K. & Miikkulainen, R., "Evolving Neural Networks through Augmenting Topologies" (NEAT), 2002
- Stanley, K. et al., "A Hypercube-Based Encoding for Evolving Large-Scale Neural Networks" (HyperNEAT), 2009
- Baldwin, J.M., "A New Factor in Evolution", The American Naturalist, 1896
- Hinton, G. & Nowlan, S., "How Learning Can Guide Evolution", Complex Systems, 1987
- Gaier, A. & Ha, D., "Weight Agnostic Neural Networks", NeurIPS, 2019
