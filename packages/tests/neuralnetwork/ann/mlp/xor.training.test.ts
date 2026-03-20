/////////////////////////////////////////////////////////////////////////////////////////////////////
/// XOR training test using CrossEntropy loss + Adam optimizer for robust convergence.
/// Uses a 2-4-1 architecture (4 hidden neurons) to avoid symmetric weight traps.
/////////////////////////////////////////////////////////////////////////////////////////////////////

import {
    ActivationFunctions,
    IMlpGraph,
    IMlpNeuron,
    MlpGraph,
    MlpNeuron,
    Synapse,
    IMlpSynapse,
    WeightInit,
    MLPInferenceRuntime,
    MLPTrainingRuntime,
    LossFunctions,
    Optimizers,
} from "spikypanda-core";
import { xorData } from "./xor.graph";

function log(message: string) {
    process.stdout.write(message + "\n");
}

function createRobustXorGraph(): IMlpGraph {
    const i1: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.linear);
    const i2: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.linear);

    const h1: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.tanh);
    const h2: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.tanh);
    const h3: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.tanh);
    const h4: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.tanh);

    const o1: IMlpNeuron = new MlpNeuron(0, ActivationFunctions.sigmoid);

    const inputs = [i1, i2];
    const hiddens = [h1, h2, h3, h4];

    const synapses: IMlpSynapse[] = [];
    for (const inp of inputs) {
        for (const h of hiddens) {
            synapses.push(new Synapse(inp, h, WeightInit.He(2)));
        }
    }
    for (const h of hiddens) {
        synapses.push(new Synapse(h, o1, WeightInit.He(4)));
    }

    return new MlpGraph([...inputs, ...hiddens, o1], synapses);
}

describe("XOR trained", () => {
    it("should learn XOR with MLP 2-4-1 using CrossEntropy + Adam", () => {
        const graph = createRobustXorGraph();
        const runtime = new MLPInferenceRuntime(graph);
        const optimizer = Optimizers.Adam();
        const trainer = new MLPTrainingRuntime(graph, runtime, LossFunctions.CrossEntropy, 0.01, optimizer);

        const epochs = 5000;

        for (let epoch = 0; epoch < epochs; epoch++) {
            let epochLoss = 0;
            for (const { input, expected } of xorData) {
                const loss = trainer.trainStep(input, [expected]);
                epochLoss += loss;
            }

            const avgLoss = epochLoss / xorData.length;
            if (epoch % 1000 === 0 || epoch === epochs - 1) {
                log(`Epoch ${epoch} — Loss: ${avgLoss.toFixed(6)}`);
            }
        }

        runtime.deleteContext();
        trainer.deleteContext();

        for (const { input, expected } of xorData) {
            const [output] = runtime.run(input);
            log(`XOR(${input.join(", ")}) = ${output.toFixed(4)} (expected ${expected})`);
            expect(Math.abs(output - expected)).toBeLessThan(0.1);
        }
    });
});
