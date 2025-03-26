import { ActivationFunctions, IMlpGraph, IMlpNeuron, IMlpSynapse, MLPInferenceRuntime } from "@core";
import { createTrainedXorGraph } from "./xor.graph";

function buildPerceptron(weights: number[], bias: number, activation = ActivationFunctions.sigmoid): IMlpGraph {
    const [w1, w2] = weights;
    const i1: IMlpNeuron = <any>{ bias: 0, activationFn: activation };
    const i2: IMlpNeuron = <any>{ bias: 0, activationFn: activation };
    const o: IMlpNeuron = <any>{ bias, activationFn: activation };

    const synapses: IMlpSynapse[] = [
        { oini: i1, ofin: o, weight: w1 },
        { oini: i2, ofin: o, weight: w2 },
    ];

    const all: IMlpNeuron[] = [i1, i2, o];
    all.forEach((n) => {
        n.onsc = () => <any>synapses.filter((s) => s.oini === n);
        n.opsc = () => <any>synapses.filter((s) => s.ofin === n);
    });

    return {
        nodes: all,
        links: synapses,
        inputs: [i1, i2],
        outputs: [o],
        hiddens: [],
        onsc: () => null,
        opsc: () => null,
    };
}

function runTestSuite(name: string, graph: IMlpGraph, cases: { input: number[]; expected: number }[]) {
    const runtime = new MLPInferenceRuntime(graph, ActivationFunctions.sigmoid);

    describe(name, () => {
        cases.forEach(({ input, expected }) => {
            test(`${name}(${input.join(", ")}) ≈ ${expected}`, () => {
                const [output] = runtime.run(input);
                expect(Math.abs(output - expected)).toBeLessThan(0.1);
            });
        });
    });
}

function runTestSuiteInverted(name: string, graph: IMlpGraph, cases: { input: number[]; expected: number }[]) {
    const runtime = new MLPInferenceRuntime(graph, ActivationFunctions.sigmoid);

    describe(name, () => {
        cases.forEach(({ input, expected }) => {
            test(`${name}(${input.join(", ")}) ≈ ${expected}`, () => {
                const [output] = runtime.run(input);
                const inverted = 1 - output;
                expect(Math.abs(inverted - expected)).toBeLessThan(0.1);
            });
        });
    });
}

// Standard gates
runTestSuite("AND", buildPerceptron([10, 10], -15), [
    { input: [0, 0], expected: 0 },
    { input: [0, 1], expected: 0 },
    { input: [1, 0], expected: 0 },
    { input: [1, 1], expected: 1 },
]);

runTestSuite("OR", buildPerceptron([10, 10], -5), [
    { input: [0, 0], expected: 0 },
    { input: [0, 1], expected: 1 },
    { input: [1, 0], expected: 1 },
    { input: [1, 1], expected: 1 },
]);

runTestSuite("NAND", buildPerceptron([-10, -10], 15), [
    { input: [0, 0], expected: 1 },
    { input: [0, 1], expected: 1 },
    { input: [1, 0], expected: 1 },
    { input: [1, 1], expected: 0 },
]);

runTestSuite("NOR", buildPerceptron([-10, -10], 5), [
    { input: [0, 0], expected: 1 },
    { input: [0, 1], expected: 0 },
    { input: [1, 0], expected: 0 },
    { input: [1, 1], expected: 0 },
]);

runTestSuite("XOR", createTrainedXorGraph(), [
    { input: [0, 0], expected: 0 },
    { input: [0, 1], expected: 1 },
    { input: [1, 0], expected: 1 },
    { input: [1, 1], expected: 0 },
]);

runTestSuiteInverted("XNOR", createTrainedXorGraph(), [
    { input: [0, 0], expected: 1 },
    { input: [0, 1], expected: 0 },
    { input: [1, 0], expected: 0 },
    { input: [1, 1], expected: 1 },
]);
