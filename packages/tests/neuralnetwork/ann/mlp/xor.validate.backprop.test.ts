import { ActivationFunctions, IMlpGraph, IMlpNeuron, IMlpSynapse, MLPInferenceRuntime, MLPTrainingRuntime, LossFunctions, Optimizers } from "@core";

describe("Classic Backpropagation Example (Matt Mazur)", () => {
    // Create neurons with known biases
    const i1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.sigmoid };
    const i2: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.sigmoid };

    const h1: IMlpNeuron = <any>{ bias: 0.35, activationFn: ActivationFunctions.sigmoid };
    const h2: IMlpNeuron = <any>{ bias: 0.35, activationFn: ActivationFunctions.sigmoid };

    const o1: IMlpNeuron = <any>{ bias: 0.6, activationFn: ActivationFunctions.sigmoid };
    const o2: IMlpNeuron = <any>{ bias: 0.6, activationFn: ActivationFunctions.sigmoid };

    // Synapses with known weights
    const synapses: IMlpSynapse[] = [
        { oini: i1, ofin: h1, weight: 0.15 },
        { oini: i2, ofin: h1, weight: 0.2 },
        { oini: i1, ofin: h2, weight: 0.25 },
        { oini: i2, ofin: h2, weight: 0.3 },
        { oini: h1, ofin: o1, weight: 0.4 },
        { oini: h2, ofin: o1, weight: 0.45 },
        { oini: h1, ofin: o2, weight: 0.5 },
        { oini: h2, ofin: o2, weight: 0.55 },
    ];

    // Setup neuron connections
    const neurons = [i1, i2, h1, h2, o1, o2];
    neurons.forEach((n) => {
        n.onsc = () => <any>synapses.filter((s) => s.oini === n);
        n.opsc = () => <any>synapses.filter((s) => s.ofin === n);
    });

    // Define graph
    const graph: IMlpGraph = {
        nodes: neurons,
        links: synapses,
        inputs: [i1, i2],
        outputs: [o1, o2],
        hiddens: [h1, h2],
        onsc: () => null,
        opsc: () => null,
    };

    // Create runtime and trainer
    const runtime = new MLPInferenceRuntime(graph, ActivationFunctions.sigmoid);
    const trainer = new MLPTrainingRuntime(graph, runtime, LossFunctions.MSE, 0.5, Optimizers.SGD());

    test("Validate forward and backward passes", () => {
        const input = [0.05, 0.1];
        const expectedOutput = [0.01, 0.99];

        // Forward pass
        const output = runtime.run(input);
        expect(output[0]).toBeCloseTo(0.75136507, 6);
        expect(output[1]).toBeCloseTo(0.772928465, 6);

        // Compute initial loss
        const initialLoss = LossFunctions.MSE.loss(output[0], expectedOutput[0]) + LossFunctions.MSE.loss(output[1], expectedOutput[1]);
        expect(initialLoss).toBeCloseTo(0.298371109, 6);

        // One training step (backpropagation)
        const loss = trainer.trainStep(input, expectedOutput);
        expect(loss).toBeCloseTo(initialLoss, 6);

        // Validate updated weights (example values)
        expect(synapses[4].weight).toBeCloseTo(0.35891648, 6); // updated w5
        expect(synapses[5].weight).toBeCloseTo(0.408666186, 6); // updated w6
        expect(synapses[6].weight).toBeCloseTo(0.51130127, 6); // updated w7
        expect(synapses[7].weight).toBeCloseTo(0.561370121, 6); // updated w8
    });
});
