import { ActivationFunctions, IMlpGraph, IMlpNeuron, IMlpSynapse, MlpGraph, MlpNeuron, Synapse, WeightInit } from "spikypanda-core";

export const xorData = [
    { input: [0, 0], expected: 0 },
    { input: [0, 1], expected: 1 },
    { input: [1, 0], expected: 1 },
    { input: [1, 1], expected: 0 },
];

export const parityData = [
    { input: [0, 0, 0], expected: 0 },
    { input: [0, 0, 1], expected: 1 },
    { input: [0, 1, 0], expected: 1 },
    { input: [0, 1, 1], expected: 0 },
    { input: [1, 0, 0], expected: 1 },
    { input: [1, 0, 1], expected: 0 },
    { input: [1, 1, 0], expected: 0 },
    { input: [1, 1, 1], expected: 1 },
];

export function createXorGraph(useFix: boolean = false): IMlpGraph {
    const i1: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.linear);
    const i2: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.linear);
    const h1: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.tanh);
    const h2: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.tanh);
    const o1: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.sigmoid);

    const synapses: IMlpSynapse[] = [
        new Synapse(i1, h1, useFix ? -0.482 : WeightInit.He(2)),
        new Synapse(i2, h1, useFix ? 0.3752 : WeightInit.He(2)),
        new Synapse(i1, h2, useFix ? -0.2858 : WeightInit.He(2)),
        new Synapse(i2, h2, useFix ? 0.4292 : WeightInit.He(2)),
        new Synapse(h1, o1, useFix ? -0.5494 : WeightInit.He(2)),
        new Synapse(h2, o1, useFix ? -0.3568 : WeightInit.He(2)),
    ];

    const neurons = [i1, i2, h1, h2, o1];

    return new MlpGraph(neurons, synapses);
}

export function createTrainedXorGraph(): IMlpGraph {
    const input1: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.linear);
    const input2: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.linear);
    const hidden1: IMlpNeuron = new MlpNeuron(-10, ActivationFunctions.tanh);
    const hidden2: IMlpNeuron = new MlpNeuron(30, ActivationFunctions.tanh);
    const output: IMlpNeuron = new MlpNeuron(-30, ActivationFunctions.sigmoid);

    const synapses: IMlpSynapse[] = [
        new Synapse(input1, hidden1, 20),
        new Synapse(input1, hidden2, -20),
        new Synapse(input2, hidden1, 20),
        new Synapse(input2, hidden2, -20),
        new Synapse(hidden1, output, 20),
        new Synapse(hidden2, output, 20),
    ];

    const neurons = [input1, input2, hidden1, hidden2, output];

    return new MlpGraph(neurons, synapses);
}

export function createParityGraph(): IMlpGraph {
    // 3 input neurons
    const i1: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.linear);
    const i2: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.linear);
    const i3: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.linear);

    // 4 hidden neurons
    const h: IMlpNeuron[] = Array.from({ length: 4 }, () => new MlpNeuron(0, ActivationFunctions.tanh)) as IMlpNeuron[];

    // 1 output neuron
    const o1: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.sigmoid);

    // Synapses
    const synapses: IMlpSynapse[] = [];

    // Inputs → Hidden
    const inputs = [i1, i2, i3];
    for (const i of inputs) {
        for (const hNeuron of h) {
            synapses.push(new Synapse(i, hNeuron, WeightInit.He(3)));
        }
    }

    // Hidden → Output
    for (const hNeuron of h) {
        synapses.push(new Synapse(hNeuron, o1, WeightInit.He(h.length)));
    }

    const neurons = [...inputs, ...h, o1];

    return new MlpGraph(neurons, synapses);
}
