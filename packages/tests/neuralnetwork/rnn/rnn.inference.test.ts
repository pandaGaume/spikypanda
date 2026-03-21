/////////////////////////////////////////////////////////////////////////////////////////////////////
/// RNN Inference tests - verify forward pass for LSTM and GRU.
/////////////////////////////////////////////////////////////////////////////////////////////////////

import {
    RnnBuilder,
    RnnCellType,
    RnnInferenceRuntime,
} from "spikypanda-core";

function log(message: string) {
    process.stdout.write(message + "\n");
}

describe("RNN Inference", () => {

    describe("LSTM", () => {
        it("should produce output for a single timestep", () => {
            const graph = new RnnBuilder()
                .withInputSize(2)
                .withHiddenSize(4)
                .withOutputSize(1)
                .withCellType(RnnCellType.LSTM)
                .build();

            const runtime = new RnnInferenceRuntime(graph);
            runtime.resetState();

            const output = runtime.step([0.5, 0.3]);

            expect(output.length).toBe(1);
            expect(typeof output[0]).toBe("number");
            expect(output[0]).not.toBeNaN();
            expect(output[0]).toBeGreaterThanOrEqual(0);  // sigmoid output
            expect(output[0]).toBeLessThanOrEqual(1);

            log("LSTM step output: " + output[0].toFixed(4));
        });

        it("should produce different outputs for different inputs", () => {
            const graph = new RnnBuilder()
                .withInputSize(2)
                .withHiddenSize(4)
                .withOutputSize(1)
                .withCellType(RnnCellType.LSTM)
                .build();

            const runtime = new RnnInferenceRuntime(graph);
            runtime.resetState();

            const out1 = runtime.step([0.0, 0.0]);
            runtime.resetState();
            const out2 = runtime.step([1.0, 1.0]);

            // Different inputs should produce different outputs (with very high probability)
            expect(out1[0]).not.toBeCloseTo(out2[0], 3);
            log("LSTM [0,0]=" + out1[0].toFixed(4) + " [1,1]=" + out2[0].toFixed(4));
        });

        it("should maintain hidden state across timesteps", () => {
            const graph = new RnnBuilder()
                .withInputSize(1)
                .withHiddenSize(4)
                .withOutputSize(1)
                .withCellType(RnnCellType.LSTM)
                .build();

            const runtime = new RnnInferenceRuntime(graph);
            runtime.resetState();

            // Same input twice should produce different outputs
            // because hidden state changes after the first step
            const out1 = runtime.step([1.0]);
            const out2 = runtime.step([1.0]);

            expect(out1[0]).not.toBeCloseTo(out2[0], 3);
            log("LSTM state persistence: t0=" + out1[0].toFixed(4) + " t1=" + out2[0].toFixed(4));
        });

        it("should process full sequence with run()", () => {
            const graph = new RnnBuilder()
                .withInputSize(2)
                .withHiddenSize(4)
                .withOutputSize(1)
                .withCellType(RnnCellType.LSTM)
                .build();

            const runtime = new RnnInferenceRuntime(graph);
            runtime.resetState();

            const sequence = [[0.5, 0.3], [0.8, 0.1], [0.2, 0.9]];
            const outputs = runtime.run(sequence);

            expect(outputs.length).toBe(3);
            for (const out of outputs) {
                expect(out.length).toBe(1);
                expect(out[0]).not.toBeNaN();
            }

            log("LSTM sequence: " + outputs.map(o => o[0].toFixed(4)).join(", "));
        });

        it("should produce same results after resetState()", () => {
            const graph = new RnnBuilder()
                .withInputSize(1)
                .withHiddenSize(4)
                .withOutputSize(1)
                .withCellType(RnnCellType.LSTM)
                .build();

            const runtime = new RnnInferenceRuntime(graph);

            runtime.resetState();
            const out1 = runtime.step([0.5]);

            runtime.resetState();
            const out2 = runtime.step([0.5]);

            expect(out1[0]).toBeCloseTo(out2[0], 10);
            log("LSTM reset reproducibility: " + out1[0].toFixed(6) + " == " + out2[0].toFixed(6));
        });
    });

    describe("GRU", () => {
        it("should produce output for a single timestep", () => {
            const graph = new RnnBuilder()
                .withInputSize(2)
                .withHiddenSize(4)
                .withOutputSize(1)
                .withCellType(RnnCellType.GRU)
                .build();

            const runtime = new RnnInferenceRuntime(graph);
            runtime.resetState();

            const output = runtime.step([0.5, 0.3]);

            expect(output.length).toBe(1);
            expect(output[0]).not.toBeNaN();
            expect(output[0]).toBeGreaterThanOrEqual(0);
            expect(output[0]).toBeLessThanOrEqual(1);

            log("GRU step output: " + output[0].toFixed(4));
        });

        it("should maintain hidden state across timesteps", () => {
            const graph = new RnnBuilder()
                .withInputSize(1)
                .withHiddenSize(4)
                .withOutputSize(1)
                .withCellType(RnnCellType.GRU)
                .build();

            const runtime = new RnnInferenceRuntime(graph);
            runtime.resetState();

            const out1 = runtime.step([1.0]);
            const out2 = runtime.step([1.0]);

            expect(out1[0]).not.toBeCloseTo(out2[0], 3);
            log("GRU state persistence: t0=" + out1[0].toFixed(4) + " t1=" + out2[0].toFixed(4));
        });

        it("should process full sequence", () => {
            const graph = new RnnBuilder()
                .withInputSize(2)
                .withHiddenSize(4)
                .withOutputSize(1)
                .withCellType(RnnCellType.GRU)
                .build();

            const runtime = new RnnInferenceRuntime(graph);
            runtime.resetState();

            const outputs = runtime.run([[0.1, 0.9], [0.9, 0.1], [0.5, 0.5]]);

            expect(outputs.length).toBe(3);
            for (const out of outputs) {
                expect(out[0]).not.toBeNaN();
            }

            log("GRU sequence: " + outputs.map(o => o[0].toFixed(4)).join(", "));
        });
    });
});
