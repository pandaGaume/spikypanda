import { ActivationFunctions, IMlpGraph, IMlpNeuron, IMlpSynapse } from "@core/index";

export const xorData = [
    { input: [0, 0], expected: 0 },
    { input: [0, 1], expected: 1 },
    { input: [1, 0], expected: 1 },
    { input: [1, 1], expected: 0 },
];

//function glorot(fanIn: number, fanOut: number): number {
//    return (Math.random() * 2 - 1) * Math.sqrt(6 / (fanIn + fanOut));
//}

export function createXorGraph(): IMlpGraph {
    const i1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.linear };
    const i2: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.linear };
    const h1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.tanh };
    const h2: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.tanh };
    const o1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.sigmoid };

    const synapses: IMlpSynapse[] = [
        { oini: i1, ofin: h1, weight: 1 },
        { oini: i2, ofin: h1, weight: 1 },
        { oini: i1, ofin: h2, weight: 1 },
        { oini: i2, ofin: h2, weight: 1 },
        { oini: h1, ofin: o1, weight: 1 },
        { oini: h2, ofin: o1, weight: 1 },
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
