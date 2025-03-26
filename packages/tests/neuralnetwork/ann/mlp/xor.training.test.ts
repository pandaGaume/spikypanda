/////////////////////////////////////////////////////////////////////////////////////////////////////
/// XOR test that mimics the PyTorch `xor_mlp_example`.
/// Note: training success is not 100% guaranteed because the initial weights are generated randomly.
/// For small networks like XOR, weight initialization is critical.
/// If the weights are too small, the network may converge prematurely to constant 0.5 outputs,
/// as it gets stuck on a flat region (plateau) of the loss surface.
/////////////////////////////////////////////////////////////////////////////////////////////////////

import { ActivationFunctions, IMlpGraph, MLPInferenceRuntime, MLPTrainingRuntime, LossFunctions, Optimizers } from "@core";
import { createXorGraph, xorData } from "./xor.graph";

function log(message: string) {
    process.stdout.write(message + "\n");
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

let runtime: MLPInferenceRuntime;
let trainer: MLPTrainingRuntime;
let graph: IMlpGraph;

// Set up graph, runtime, and training
graph = createXorGraph();
runtime = new MLPInferenceRuntime(graph);
const optimizer = Optimizers.SGD(); // or .adam()
trainer = new MLPTrainingRuntime(graph, runtime, LossFunctions.MSE, 0.5, optimizer);

// Training loop
const epochs = 10000;

for (let epoch = 0; epoch < epochs; epoch++) {
    let epochLoss = 0;

    for (const { input, expected } of xorData) {
        const loss = trainer.trainStep(input, [expected]);
        epochLoss += loss;
    }

    const avgLoss = epochLoss / xorData.length;

    if (epoch % 500 === 0 || epoch === epochs - 1) {
        log(`Epoch ${epoch} — Loss: ${avgLoss.toFixed(6)}`);
    }
}

runtime.deleteContext();
trainer.deleteContext();

// Final evaluation
runTestSuite("XOR trained", graph, xorData);
