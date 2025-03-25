import { ActivationFunctions, IMlpGraph, MLPInferenceRuntime, MLPTrainingRuntime, LossFunctions, Optimizers } from "@core";
import { createXorGraph, xorData } from "./xor.graph";

function log(message: string) {
    process.stdout.write(message + "\n");
}

//function logObject(prefix: string, o: any) {
//    process.stdout.write(prefix + JSON.stringify(o, null, 2) + "\n");
//}

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

// Set up graph, runtime, and training
const graph = createXorGraph();
const runtime = new MLPInferenceRuntime(graph);
const optimizer = Optimizers.Adam(); // or .adam()
const trainer = new MLPTrainingRuntime(graph, runtime, LossFunctions.MSE, 1, optimizer);

// Training loop
const epochs = 500000;
const losses: number[] = [];

for (let epoch = 0; epoch < epochs; epoch++) {
    let epochLoss = 0;

    for (const { input, expected } of xorData) {
        const loss = trainer.trainStep(input, [expected]);
        epochLoss += loss;
    }

    const avgLoss = epochLoss / xorData.length;
    losses.push(avgLoss);

    if (epoch % 500 === 0 || epoch === epochs - 1) {
        log(`Epoch ${epoch} — Loss: ${avgLoss.toFixed(6)}`);
    }
}

// logObject("graph:", graph);

runtime.deleteContext();
trainer.deleteContext();

// Final evaluation
runTestSuite("XOR trained", graph, xorData);
