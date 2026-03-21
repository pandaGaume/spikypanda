/////////////////////////////////////////////////////////////////////////////////////////////////////
/// RNN Builder tests - verify correct graph structure for LSTM and GRU networks.
/////////////////////////////////////////////////////////////////////////////////////////////////////

import {
    RnnBuilder,
    RnnCellType,
    LstmNeuron,
    GruNeuron,
    RnnSynapse,
    Synapse,
} from "spikypanda-core";

function log(message: string) {
    process.stdout.write(message + "\n");
}

describe("RNN Builder", () => {

    it("should build an LSTM network with correct structure", () => {
        const graph = new RnnBuilder()
            .withInputSize(2)
            .withHiddenSize(4)
            .withOutputSize(1)
            .withCellType(RnnCellType.LSTM)
            .build();

        // 2 inputs + 4 hidden + 1 output = 7 neurons
        expect(graph.nodes.length).toBe(7);
        expect(graph.inputs.length).toBe(2);
        expect(graph.hiddens.length).toBe(4);
        expect(graph.outputs.length).toBe(1);

        // Hidden neurons should be LstmNeuron
        for (const h of graph.hiddens) {
            expect(h).toBeInstanceOf(LstmNeuron);
            expect((h as LstmNeuron).cellType).toBe(RnnCellType.LSTM);
        }

        // Count synapses:
        // input->hidden: 2*4 = 8 (RnnSynapse with 4 weights each)
        // hidden->hidden: 4*4 = 16 (RnnSynapse with 4 weights each)
        // hidden->output: 4*1 = 4 (Synapse with 1 weight each)
        // Total = 28
        expect(graph.links.length).toBe(28);

        const rnnSynapses = graph.links.filter(s => s instanceof RnnSynapse);
        const regularSynapses = graph.links.filter(s => s instanceof Synapse && !(s instanceof RnnSynapse));

        expect(rnnSynapses.length).toBe(24);  // 8 + 16
        expect(regularSynapses.length).toBe(4);

        // RNN synapses should have 4 weights (LSTM gates)
        for (const syn of rnnSynapses) {
            expect((syn as RnnSynapse).weights.length).toBe(4);
        }

        log("LSTM(2->4->1): " + graph.nodes.length + " nodes, " + graph.links.length + " links");
    });

    it("should build a GRU network with correct structure", () => {
        const graph = new RnnBuilder()
            .withInputSize(3)
            .withHiddenSize(8)
            .withOutputSize(2)
            .withCellType(RnnCellType.GRU)
            .build();

        // 3 inputs + 8 hidden + 2 output = 13 neurons
        expect(graph.nodes.length).toBe(13);
        expect(graph.inputs.length).toBe(3);
        expect(graph.hiddens.length).toBe(8);
        expect(graph.outputs.length).toBe(2);

        // Hidden neurons should be GruNeuron
        for (const h of graph.hiddens) {
            expect(h).toBeInstanceOf(GruNeuron);
            expect((h as GruNeuron).cellType).toBe(RnnCellType.GRU);
        }

        // Count synapses:
        // input->hidden: 3*8 = 24 (RnnSynapse with 3 weights each)
        // hidden->hidden: 8*8 = 64 (RnnSynapse with 3 weights each)
        // hidden->output: 8*2 = 16 (Synapse with 1 weight each)
        // Total = 104
        expect(graph.links.length).toBe(104);

        const rnnSynapses = graph.links.filter(s => s instanceof RnnSynapse);
        expect(rnnSynapses.length).toBe(88);  // 24 + 64

        // GRU synapses should have 3 weights
        for (const syn of rnnSynapses) {
            expect((syn as RnnSynapse).weights.length).toBe(3);
        }

        log("GRU(3->8->2): " + graph.nodes.length + " nodes, " + graph.links.length + " links");
    });

    it("should initialize weights to non-zero values (Glorot)", () => {
        const graph = new RnnBuilder()
            .withInputSize(2)
            .withHiddenSize(4)
            .withOutputSize(1)
            .withCellType(RnnCellType.LSTM)
            .build();

        // Check that weights are initialized (not all zero)
        let nonZeroCount = 0;
        for (const syn of graph.links) {
            if (syn instanceof RnnSynapse) {
                for (const w of syn.weights) {
                    if (Math.abs(w) > 1e-10) nonZeroCount++;
                }
            } else {
                if (Math.abs(syn.weight) > 1e-10) nonZeroCount++;
            }
        }
        expect(nonZeroCount).toBeGreaterThan(0);
        log("Non-zero weights: " + nonZeroCount);
    });

    it("should throw on invalid config", () => {
        expect(() => new RnnBuilder().withInputSize(0).withHiddenSize(4).withOutputSize(1).build())
            .toThrow("Input size must be > 0");
        expect(() => new RnnBuilder().withInputSize(2).withHiddenSize(0).withOutputSize(1).build())
            .toThrow("Hidden size must be > 0");
        expect(() => new RnnBuilder().withInputSize(2).withHiddenSize(4).withOutputSize(0).build())
            .toThrow("Output size must be > 0");
    });
});
