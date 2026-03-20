import { LossFunctions, MLPInferenceRuntime, MLPTrainingRuntime, Optimizers } from "spikypanda-core";
import { createParityGraph } from "./xor.graph";

function log(message: string) {
    process.stdout.write(message + "\n");
}

const parityData = [
    { input: [0, 0, 0], expected: 0 },
    { input: [0, 0, 1], expected: 1 },
    { input: [0, 1, 0], expected: 1 },
    { input: [0, 1, 1], expected: 0 },
    { input: [1, 0, 0], expected: 1 },
    { input: [1, 0, 1], expected: 0 },
    { input: [1, 1, 0], expected: 0 },
    { input: [1, 1, 1], expected: 1 },
];

describe("3-bit parity trained", () => {
    it("should learn parity with MLP 3-4-1", () => {
        const graph = createParityGraph();
        const runtime = new MLPInferenceRuntime(graph);
        const optimizer = Optimizers.Adam();
        const trainer = new MLPTrainingRuntime(graph, runtime, LossFunctions.CrossEntropy, 0.01, optimizer);

        const EPOCHS = 15000;
        for (let epoch = 0; epoch < EPOCHS; epoch++) {
            for (const { input, expected } of parityData) {
                trainer.trainStep(input, [expected]);
            }
        }

        for (const { input, expected } of parityData) {
            const [output] = runtime.run(input);
            const delta = Math.abs(output - expected);
            log(`input: [${input}], expected: ${expected}, got: ${output.toFixed(4)}`);
            expect(delta).toBeLessThan(0.1);
        }
    });
});
