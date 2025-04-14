import { ActivationFunctions, IMlpGraph, IMlpNeuron, MLPInferenceRuntime, Synapse, MlpGraph, MlpNeuron, ISynapse } from "spikypanda-core";
import { createTrainedXorGraph } from "./xor.graph";

function buildPerceptron(weights: number[], bias: number, activation = ActivationFunctions.sigmoid): IMlpGraph {
    const [w1, w2] = weights;
    const i1: IMlpNeuron = new MlpNeuron(0, activation).withTag("input1") as IMlpNeuron;
    const i2: IMlpNeuron = new MlpNeuron(0, activation).withTag("input2") as IMlpNeuron;
    const o: IMlpNeuron = new MlpNeuron(bias, activation).withTag("output") as IMlpNeuron;

    const s1 = new Synapse(i1, o, w1).withTag("synapse1") as ISynapse;
    const s2 = new Synapse(i2, o, w2).withTag("synapse2") as ISynapse;

    return new MlpGraph([i1, i2, o], [s1, s2]);
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
