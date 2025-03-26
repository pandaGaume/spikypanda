import {
    ActivationFunctions,
    IMlpGraph,
    IMlpNeuron,
    IMlpSynapse,
    MLPInferenceRuntime,
    MLPTrainingRuntime,
    LossFunctions,
    Optimizers,
    CSVParser,
    IInferenceNeuronContext,
} from "@core";
import * as fs from "fs";
import path from "path";

//function log(message: string) {
//    process.stdout.write(message + "\n");
//}

describe("Classic Backpropagation Example (Matt Mazur)", () => {
    // Create neurons with initial biases
    const i1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.sigmoid };
    const i2: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.sigmoid };

    const h1: IMlpNeuron = <any>{ bias: 0.35, activationFn: ActivationFunctions.sigmoid };
    const h2: IMlpNeuron = <any>{ bias: 0.35, activationFn: ActivationFunctions.sigmoid };

    const o1: IMlpNeuron = <any>{ bias: 0.6, activationFn: ActivationFunctions.sigmoid };
    const o2: IMlpNeuron = <any>{ bias: 0.6, activationFn: ActivationFunctions.sigmoid };

    // Synapses with initial weights
    // because we use Pytorch terminology, model.input.weight.data[i][j] where i = index of the neuron in the next layer (e.g., hidden layer)
    // and j = index of the neuron in the current layer (e.g., input layer)
    // w_in_0_0: from i1 to h1
    // w_in_0_1: from i2 to h1
    // w_in_1_0: from i1 to h2
    // w_in_1_1: from i2 to h2
    const synapses: IMlpSynapse[] = [
        { oini: i1, ofin: h1, weight: 0.15 }, // w_in_0_0
        { oini: i2, ofin: h1, weight: 0.2 }, // w_in_0_1
        { oini: i1, ofin: h2, weight: 0.25 }, // w_in_1_0
        { oini: i2, ofin: h2, weight: 0.3 }, // w_in_1_1
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

    // Load CSV data
    //   0   |   1  |     2    |   3      |    4     |     5    |    6    |    7    |  8  |  9  |    10     |    11     |     12    |    13     |    14   |    15   | 16  |  17
    // epoch | loss | w_in_0_0 | w_in_0_1 | w_in_1_0 | w_in_1_1 |  b_in_0 |  b_in_1 | h_0 | h_1 | w_out_0_0 | w_out_0_1 | w_out_1_0 | w_out_1_1 | b_out_0 | b_out_1 | y_0 | y_1
    const parser = new CSVParser(",");
    const i = 1000;
    const dataFilePath = path.resolve(__dirname, `./data/training_step_${i}.csv`);
    const parsedData: string[][] = parser.parse(fs.readFileSync(dataFilePath, "utf-8"));
    const N = parsedData.length - 1; // ensure N is valid (must be equal to i).
    const accuracy = 4; // adjust to support a lot of iterations.

    test("Validate forward and backward passes across multiple epochs", () => {
        const input = [0.05, 0.1];
        const expectedOutput = [0.01, 0.99];

        for (let epoch = 1; epoch <= N; epoch++) {
            //log(`Iteration ${epoch}`);

            const epochData = parsedData[epoch];

            // Forward pass
            const output = runtime.run(input);
            expect(output[0]).toBeCloseTo(parseFloat(epochData[16]), accuracy);
            expect(output[1]).toBeCloseTo(parseFloat(epochData[17]), accuracy);

            // Training step
            const loss = trainer.trainStep(input, expectedOutput);
            expect(loss).toBeCloseTo(parseFloat(epochData[1]), accuracy);

            // Validate weights and biases after the training step
            expect(synapses[0].weight).toBeCloseTo(parseFloat(epochData[2]), accuracy);
            expect(synapses[1].weight).toBeCloseTo(parseFloat(epochData[3]), accuracy);
            expect(synapses[2].weight).toBeCloseTo(parseFloat(epochData[4]), accuracy);
            expect(synapses[3].weight).toBeCloseTo(parseFloat(epochData[5]), accuracy);
            expect(synapses[4].weight).toBeCloseTo(parseFloat(epochData[10]), accuracy);
            expect(synapses[5].weight).toBeCloseTo(parseFloat(epochData[11]), accuracy);
            expect(synapses[6].weight).toBeCloseTo(parseFloat(epochData[12]), accuracy);
            expect(synapses[7].weight).toBeCloseTo(parseFloat(epochData[13]), accuracy);

            expect(h1.bias).toBeCloseTo(parseFloat(epochData[6]), accuracy);
            expect(h2.bias).toBeCloseTo(parseFloat(epochData[7]), accuracy);
            expect(o1.bias).toBeCloseTo(parseFloat(epochData[14]), accuracy);
            expect(o2.bias).toBeCloseTo(parseFloat(epochData[15]), accuracy);

            if (h1.bag) {
                expect((<IInferenceNeuronContext>h1.bag).activation).toBeCloseTo(parseFloat(epochData[8]), accuracy);
                expect((<IInferenceNeuronContext>h2.bag).activation).toBeCloseTo(parseFloat(epochData[9]), accuracy);
            }
        }
    });
});
