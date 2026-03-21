/////////////////////////////////////////////////////////////////////////////////////////////////////
/// RNN Training tests - verify BPTT for LSTM and GRU on simple sequence tasks.
/////////////////////////////////////////////////////////////////////////////////////////////////////

import {
    RnnBuilder,
    RnnCellType,
    RnnInferenceRuntime,
    RnnTrainingRuntime,
    LossFunctions,
    Optimizers,
    ActivationFunctions,
} from "spikypanda-core";

function log(message: string) {
    process.stdout.write(message + "\n");
}

describe("RNN Training (BPTT)", () => {

    describe("LSTM", () => {
        it("should reduce loss during training on a delay task", () => {
            // Task: output the previous input (1-step delay)
            // Input sequence: [a, b, c, d]
            // Expected output: [0, a, b, c] (first output is 0 since no previous input)
            const graph = new RnnBuilder()
                .withInputSize(1)
                .withHiddenSize(8)
                .withOutputSize(1)
                .withCellType(RnnCellType.LSTM)
                .withOutputActivation(ActivationFunctions.sigmoid)
                .build();

            const runtime = new RnnInferenceRuntime(graph);
            const trainer = new RnnTrainingRuntime(
                graph, runtime, LossFunctions.MSE, 0.005, Optimizers.Adam()
            );

            // Training data: several sequences
            const sequences = [
                { input: [[0.2], [0.8], [0.4], [0.6]], target: [[0.0], [0.2], [0.8], [0.4]] },
                { input: [[0.9], [0.1], [0.5], [0.3]], target: [[0.0], [0.9], [0.1], [0.5]] },
                { input: [[0.3], [0.7], [0.2], [0.9]], target: [[0.0], [0.3], [0.7], [0.2]] },
            ];

            let firstLoss = 0;
            let lastLoss = 0;
            const epochs = 50;

            for (let epoch = 0; epoch < epochs; epoch++) {
                let epochLoss = 0;
                for (const seq of sequences) {
                    const loss = trainer.trainStep(seq.input, seq.target);
                    epochLoss += loss;
                }
                epochLoss /= sequences.length;

                if (epoch === 0) firstLoss = epochLoss;
                if (epoch === epochs - 1) lastLoss = epochLoss;

                if (epoch % 10 === 0 || epoch === epochs - 1) {
                    log(`LSTM epoch ${epoch}: loss=${epochLoss.toFixed(6)}`);
                }
            }

            // Loss should decrease
            expect(lastLoss).toBeLessThan(firstLoss);
            log(`LSTM delay task: loss ${firstLoss.toFixed(6)} -> ${lastLoss.toFixed(6)}`);

            // Clean up
            trainer.deleteContext();
            runtime.deleteContext();
        }, 30000);

        it("should learn to distinguish sequences", () => {
            // Task: output 1 if sequence contains more 1s than 0s, else 0
            // Simplified: output at last timestep only
            const graph = new RnnBuilder()
                .withInputSize(1)
                .withHiddenSize(8)
                .withOutputSize(1)
                .withCellType(RnnCellType.LSTM)
                .withOutputActivation(ActivationFunctions.sigmoid)
                .build();

            const runtime = new RnnInferenceRuntime(graph);
            const trainer = new RnnTrainingRuntime(
                graph, runtime, LossFunctions.MSE, 0.005, Optimizers.Adam()
            );

            // Sequences: mostly 1s -> output 1, mostly 0s -> output 0
            // We only care about the last output
            const data = [
                { input: [[1], [1], [1], [0]], target: [[0.5], [0.5], [0.5], [1.0]] },
                { input: [[0], [0], [0], [1]], target: [[0.5], [0.5], [0.5], [0.0]] },
                { input: [[1], [0], [1], [1]], target: [[0.5], [0.5], [0.5], [1.0]] },
                { input: [[0], [1], [0], [0]], target: [[0.5], [0.5], [0.5], [0.0]] },
            ];

            let firstLoss = 0;
            let lastLoss = 0;
            const epochs = 100;

            for (let epoch = 0; epoch < epochs; epoch++) {
                let epochLoss = 0;
                for (const seq of data) {
                    epochLoss += trainer.trainStep(seq.input, seq.target);
                }
                epochLoss /= data.length;

                if (epoch === 0) firstLoss = epochLoss;
                if (epoch === epochs - 1) lastLoss = epochLoss;
            }

            expect(lastLoss).toBeLessThan(firstLoss);
            log(`LSTM classify: loss ${firstLoss.toFixed(6)} -> ${lastLoss.toFixed(6)}`);

            trainer.deleteContext();
            runtime.deleteContext();
        }, 30000);
    });

    describe("GRU", () => {
        it("should reduce loss during training on a delay task", () => {
            const graph = new RnnBuilder()
                .withInputSize(1)
                .withHiddenSize(8)
                .withOutputSize(1)
                .withCellType(RnnCellType.GRU)
                .withOutputActivation(ActivationFunctions.sigmoid)
                .build();

            const runtime = new RnnInferenceRuntime(graph);
            const trainer = new RnnTrainingRuntime(
                graph, runtime, LossFunctions.MSE, 0.005, Optimizers.Adam()
            );

            const sequences = [
                { input: [[0.2], [0.8], [0.4], [0.6]], target: [[0.0], [0.2], [0.8], [0.4]] },
                { input: [[0.9], [0.1], [0.5], [0.3]], target: [[0.0], [0.9], [0.1], [0.5]] },
                { input: [[0.3], [0.7], [0.2], [0.9]], target: [[0.0], [0.3], [0.7], [0.2]] },
            ];

            let firstLoss = 0;
            let lastLoss = 0;
            const epochs = 50;

            for (let epoch = 0; epoch < epochs; epoch++) {
                let epochLoss = 0;
                for (const seq of sequences) {
                    epochLoss += trainer.trainStep(seq.input, seq.target);
                }
                epochLoss /= sequences.length;

                if (epoch === 0) firstLoss = epochLoss;
                if (epoch === epochs - 1) lastLoss = epochLoss;

                if (epoch % 10 === 0 || epoch === epochs - 1) {
                    log(`GRU epoch ${epoch}: loss=${epochLoss.toFixed(6)}`);
                }
            }

            expect(lastLoss).toBeLessThan(firstLoss);
            log(`GRU delay task: loss ${firstLoss.toFixed(6)} -> ${lastLoss.toFixed(6)}`);

            trainer.deleteContext();
            runtime.deleteContext();
        }, 30000);
    });
});
