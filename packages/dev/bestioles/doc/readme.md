# Bestioles Simulation

## Overview

**Bestioles** is an evolutionary simulation framework where virtual creatures, each controlled by a neural network (`CreatureBrain`), navigate a virtual space. Their movement and behavior are evaluated over time, and natural selection is applied to evolve better-performing individuals.

The system uses concepts from neuroevolution, combining artificial neural networks with mutation, selection, and fitness evaluation.

---

## Core Concepts

### Creatures

Each creature is composed of:

- A **neural brain** (`CreatureBrain`) represented by an MLP (Multi-Layer Perceptron).
- A **trajectory** computed from a sequence of inputs.
- A **fitness score** derived from the total distance traveled.
- A **position** representing its current location.
- An **age counter** and **isolation tracker** affecting survivability.

### CreatureBrain

The `CreatureBrain` encapsulates:

- A custom MLP graph structure using perceptron builders.
- Input layer: 40 neurons.
- Hidden layer: 25 neurons with `tanh` activation.
- Output layer: 3 neurons with `sigmoid` activation (interpreted as direction and movement commands).
- A mutation mechanism for both weights and biases.

---

## Simulation Logic

### Inputs

Each update tick, all creatures receive a predefined sequence of input vectors from the simulation engine. These vectors may represent sensory data or environmental stimuli.

### Evaluation

For each creature:
- The brain computes a **trajectory**: a list of positions over time.
- The **fitness** is calculated as the total distance traveled.
- The **final position** is used for group analysis and isolation detection.

### Mortality

Each creature has:
- A **maximum lifespan** (`maxAge`).
- An **isolation counter** that increases when the creature moves far from the group center.

A creature dies when:
- Its age exceeds `maxAge`.
- A probabilistic death trigger is met due to isolation (`P(death) = min(1, 0.01 * isolationCounter)`).

---

## Selection and Evolution

At every simulation cycle:

1. **Fitness evaluation** is performed for all alive creatures.
2. The population is **sorted by fitness**.
3. The **top 25%** of creatures are selected as potential parents.
4. All dead creatures are **replaced by mutated clones** of the best-fit individuals.

---

## Data Export

The system supports exporting:

- Each creature's full **trajectory** over the last simulation tick.
- **Fitness score** and alive status.
- Optionally: JSON export for logging, analysis, or visualization.

```ts
{
  id: number,
  alive: boolean,
  fitness: number,
  trajectory: { x: number, y: number }[]
}
```

---

## Hypotheses and Assumptions

- **Movement correlates with fitness**: Creatures that travel farther are considered fitter.
- **Group cohesion is beneficial**: Creatures that isolate from the group face increased risk of death.
- **Mutations are small but cumulative**: Mutation only slightly perturbs weights and biases at each generation.
- **No crossover (yet)**: The system currently relies on mutation only; no sexual reproduction or gene mixing.

---

## Goals

- Explore neuroevolution dynamics in a virtual ecosystem.
- Observe how emergent behavior and strategies develop over generations.
- Provide a sandbox for experimenting with neural network mutations, fitness functions, and selection pressure.

---

## Future Extensions

- Add **crossover** between creatures for more diverse evolution.
- Introduce **obstacles or predators** into the environment.
- Visualize creature behavior and social dynamics in 2D or 3D.
- Support multiple objective functions (multi-objective evolution).
- Enable **real-time rendering** and **interactive selection**.
- Replace brain with other **NN** architecture such **SNN**, and observe evolution between species.
