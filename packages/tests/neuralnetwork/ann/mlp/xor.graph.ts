import { ActivationFunctions, IMlpGraph, IMlpNeuron, IMlpSynapse } from "@core/index";

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

export function heUniform(fanIn: number): number {
    const limit = Math.sqrt(6 / fanIn); // same as PyTorch's kaiming_uniform_ for tanh
    return (Math.random() * 2 - 1) * limit;
}

export function createXorGraph(useFix: boolean = false): IMlpGraph {
    const i1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.linear };
    const i2: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.linear };
    const h1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.tanh };
    const h2: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.tanh };
    const o1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.sigmoid };

    const synapses: IMlpSynapse[] = [
        { oini: i1, ofin: h1, weight: useFix ? -0.482 : heUniform(2) },
        { oini: i2, ofin: h1, weight: useFix ? 0.3752 : heUniform(2) },
        { oini: i1, ofin: h2, weight: useFix ? -0.2858 : heUniform(2) },
        { oini: i2, ofin: h2, weight: useFix ? 0.4292 : heUniform(2) },
        { oini: h1, ofin: o1, weight: useFix ? -0.5494 : heUniform(2) }, // fanout is zero, from the point of view of the graph, but for numerical reason the minimum is 1.
        { oini: h2, ofin: o1, weight: useFix ? -0.3568 : heUniform(2) },
    ];

    const neurons = [i1, i2, h1, h2, o1];
    for (const n of neurons) {
        n.onsc = () => <any>synapses.filter((s) => s.oini === n);
        n.opsc = () => <any>synapses.filter((s) => s.ofin === n);
    }

    return {
        nodes: neurons,
        links: synapses,
        inputs: [i1, i2],
        outputs: [o1],
        hiddens: [h1, h2],
        onsc: () => null,
        opsc: () => null,
    };
}

export function createTrainedXorGraph(): IMlpGraph {
    const input1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.linear };
    const input2: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.linear };
    const hidden1: IMlpNeuron = <any>{ bias: -10, activationFn: ActivationFunctions.tanh };
    const hidden2: IMlpNeuron = <any>{ bias: 30, activationFn: ActivationFunctions.tanh };
    const output: IMlpNeuron = <any>{ bias: -30, activationFn: ActivationFunctions.sigmoid };

    const synapses: IMlpSynapse[] = [
        { oini: input1, ofin: hidden1, weight: 20 },
        { oini: input1, ofin: hidden2, weight: -20 },
        { oini: input2, ofin: hidden1, weight: 20 },
        { oini: input2, ofin: hidden2, weight: -20 },
        { oini: hidden1, ofin: output, weight: 20 },
        { oini: hidden2, ofin: output, weight: 20 },
    ];

    const all = [input1, input2, hidden1, hidden2, output];
    all.forEach((n) => {
        n.onsc = () => <any>synapses.filter((s) => s.oini === n);
        n.opsc = () => <any>synapses.filter((s) => s.ofin === n);
    });

    return {
        nodes: all,
        links: synapses,
        inputs: [input1, input2],
        outputs: [output],
        hiddens: [hidden1, hidden2],
        onsc: () => null,
        opsc: () => null,
    };
}

export function createParityGraph(): IMlpGraph {
    // 3 input neurons
    const i1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.linear };
    const i2: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.linear };
    const i3: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.linear };

    // 4 hidden neurons
    const h: IMlpNeuron[] = Array.from({ length: 4 }, () => ({
        bias: 0,
        activationFn: ActivationFunctions.tanh,
    })) as IMlpNeuron[];

    // 1 output neuron
    const o1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.sigmoid };

    // Synapses
    const synapses: IMlpSynapse[] = [];

    // Inputs → Hidden
    const inputs = [i1, i2, i3];
    for (const i of inputs) {
        for (const hNeuron of h) {
            synapses.push({
                oini: i,
                ofin: hNeuron,
                weight: heUniform(3),
            });
        }
    }

    // Hidden → Output
    for (const hNeuron of h) {
        synapses.push({
            oini: hNeuron,
            ofin: o1,
            weight: heUniform(h.length),
        });
    }

    const neurons = [...inputs, ...h, o1];
    for (const n of neurons) {
        n.onsc = () => <any>synapses.filter((s) => s.oini === n);
        n.opsc = () => <any>synapses.filter((s) => s.ofin === n);
    }

    return {
        nodes: neurons,
        links: synapses,
        inputs: inputs,
        outputs: [o1],
        hiddens: h,
        onsc: () => null,
        opsc: () => null,
    };
}
