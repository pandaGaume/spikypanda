import {
    compileConstrainedLifNetwork,
    ConstrainedLifNetworkBpttTrainer,
    ConstrainedLifSurrogateSubgraph,
    LossFunctions,
    Optimizers,
    RuntimeGraphBuilder,
    RuntimeNode,
    Session,
    SpikeSynapse,
} from "spikypanda-core";
import type { IChannel, IDeclaresPorts, ILifSurrogateNetworkTrainingSequence, INodeState, IPortDescriptor, IRuntimeGraph, IRuntimeNode, ISession, ISpike } from "spikypanda-core";

class NetworkSpikeSource extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "spike", optional: true, type: "spike", kind: "stream", capacity: 16 }];
    public amplitude: number = 0;

    public override fire(session: ISession, timestamp: number): void {
        if (this.amplitude === 0) return;
        this.publishAll(session, "spike", { timestamp, amplitude: this.amplitude, source: this } satisfies ISpike);
    }
}

interface NetworkCollectorState extends INodeState {
    spikes: ISpike[];
}

class NetworkSpikeCollector extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "spike", optional: false, type: "spike", kind: "stream", capacity: 16 }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    public createNodeState(): NetworkCollectorState {
        return { linksReady: 0, spikes: [] };
    }

    public override fire(session: ISession): void {
        const state = session.nodeStateOf(this) as NetworkCollectorState;
        for (const channel of this.inputChannels("spike")) {
            const index = this.channelIndex(session, channel);
            while (index >= 0 && session.linkStates[index].ready) {
                const value = session.consume(index);
                if (value && typeof value === "object") state.spikes.push(value as ISpike);
            }
        }
    }

    public trace(session: ISession): Array<{ timestamp: number; amplitude: number }> {
        return (session.nodeStateOf(this) as NetworkCollectorState).spikes.map(({ timestamp, amplitude }) => ({ timestamp, amplitude }));
    }
}

function xorDataset(): ILifSurrogateNetworkTrainingSequence[] {
    return [
        { inputs: [[0, 0]], targets: [[0]] },
        { inputs: [[1, 0]], targets: [[1]] },
        { inputs: [[0, 1]], targets: [[1]] },
        { inputs: [[1, 1]], targets: [[0]] },
    ];
}

describe("Constrained multi-LIF network BPTT", () => {
    test("routes an analytical gradient through a teacher-to-teacher synapse", () => {
        const source = new NetworkSpikeSource();
        const hidden = new ConstrainedLifSurrogateSubgraph("gradient-hidden", {
            threshold: 0.7,
            resetPotential: -0.1,
            membraneTimeConstant: 0.03,
            surrogateSlope: 5,
        });
        const output = new ConstrainedLifSurrogateSubgraph("gradient-output", {
            threshold: 0.8,
            membraneTimeConstant: 0.025,
            surrogateSlope: 6,
        });
        const input = new SpikeSynapse(source, hidden.inputNode, "spike", "spike", 0.55);
        const connection = new SpikeSynapse(hidden.outputNode, output.inputNode, "spike", "spike", 0.75);
        const trainer = new ConstrainedLifNetworkBpttTrainer(
            {
                neurons: [hidden, output],
                inputs: [{ inputIndex: 0, synapse: input }],
                connections: [connection],
                outputs: [output],
            },
            { timeStep: 0.02, lossFunction: LossFunctions.MSE }
        );
        const sequence: ILifSurrogateNetworkTrainingSequence = {
            inputs: [[1], [1]],
            targets: [[0], [1]],
            lossWeights: [[0.1], [1]],
        };

        const analytical = trainer.gradients(sequence).gradients;
        const epsilon = 1e-6;
        for (const synapse of trainer.synapses) {
            const original = synapse.weight;
            synapse.weight = original + epsilon;
            const positive = trainer.forward(sequence).loss;
            synapse.weight = original - epsilon;
            const negative = trainer.forward(sequence).loss;
            synapse.weight = original;
            const numerical = (positive - negative) / (2 * epsilon);

            expect(analytical.get(synapse)).toBeCloseTo(numerical, 6);
        }
    });

    test("learns XOR through two hidden teachers and compiles all teachers to native LIF neurons", () => {
        const sourceA = new NetworkSpikeSource();
        const sourceB = new NetworkSpikeSource();
        const collector = new NetworkSpikeCollector();
        sourceA.id = "xor-a";
        sourceB.id = "xor-b";
        collector.id = "xor-result";

        const hiddenOr = new ConstrainedLifSurrogateSubgraph("xor-or", {
            threshold: 1,
            membraneTimeConstant: 0.02,
            surrogateSlope: 8,
        });
        const hiddenAnd = new ConstrainedLifSurrogateSubgraph("xor-and", {
            threshold: 1,
            membraneTimeConstant: 0.02,
            surrogateSlope: 8,
        });
        const output = new ConstrainedLifSurrogateSubgraph("xor-output", {
            threshold: 1,
            membraneTimeConstant: 0.02,
            surrogateSlope: 8,
        });
        const aToOr = new SpikeSynapse(sourceA, hiddenOr.inputNode, "spike", "spike", 0.45);
        const bToOr = new SpikeSynapse(sourceB, hiddenOr.inputNode, "spike", "spike", 0.55);
        const aToAnd = new SpikeSynapse(sourceA, hiddenAnd.inputNode, "spike", "spike", 0.35);
        const bToAnd = new SpikeSynapse(sourceB, hiddenAnd.inputNode, "spike", "spike", 0.4);
        const orToOutput = new SpikeSynapse(hiddenOr.outputNode, output.inputNode, "spike", "spike", 0.5);
        const andToOutput = new SpikeSynapse(hiddenAnd.outputNode, output.inputNode, "spike", "spike", -0.25);
        const observation = new SpikeSynapse(output.outputNode, collector);
        const graph = new RuntimeGraphBuilder<IRuntimeNode, IChannel>()
            .withMode("dynamic")
            .withNodes(sourceA, sourceB, ...hiddenOr.nodes, ...hiddenAnd.nodes, ...output.nodes, collector)
            .withLinks(aToOr, bToOr, aToAnd, bToAnd, ...hiddenOr.links, ...hiddenAnd.links, ...output.links, orToOutput, andToOutput, observation)
            .build();
        const trainer = new ConstrainedLifNetworkBpttTrainer(
            {
                neurons: [hiddenOr, hiddenAnd, output],
                inputs: [
                    { inputIndex: 0, synapse: aToOr },
                    { inputIndex: 1, synapse: bToOr },
                    { inputIndex: 0, synapse: aToAnd },
                    { inputIndex: 1, synapse: bToAnd },
                ],
                connections: [orToOutput, andToOutput],
                outputs: [output],
            },
            {
                learningRate: 0.02,
                timeStep: 0.02,
                gradientClip: 1,
                lossFunction: LossFunctions.MSE,
                optimizer: Optimizers.Adam(),
            }
        );
        const dataset = xorDataset();
        const initialWeights = trainer.weights();

        const fit = trainer.fit(dataset, { epochs: 1500 });
        expect(fit.bestEpoch).toBeGreaterThanOrEqual(0);
        expect(fit.finalLoss).toBeCloseTo(fit.bestLoss, 12);
        expect(fit.finalLoss).toBeLessThan(fit.initialLoss * 0.1);
        expect(trainer.weights()).not.toEqual(initialWeights);
        expect(dataset.map((sample) => trainer.forward(sample, "hard").steps[0].outputs)).toEqual([[0], [1], [1], [0]]);

        const analyticalSoft = dataset.map((sample) => trainer.forward(sample).steps[0].outputs[0]);
        const runtimeSoft = dataset.map((sample) => runNetworkSample(sample, sourceA, sourceB, collector, graph)[0]?.amplitude ?? 0);
        for (let sample = 0; sample < dataset.length; sample++) {
            expect(runtimeSoft[sample]).toBeCloseTo(analyticalSoft[sample], 12);
        }

        hiddenOr.configure({ mode: "hard" });
        hiddenAnd.configure({ mode: "hard" });
        output.configure({ mode: "hard" });
        const teacherTraces = dataset.map((sample) => runNetworkSample(sample, sourceA, sourceB, collector, graph));
        const compilation = compileConstrainedLifNetwork(graph, [hiddenOr, hiddenAnd, output]);
        const compiledTraces = dataset.map((sample) => runNetworkSample(sample, sourceA, sourceB, collector, graph));

        expect(compilation.neurons.map((neuron) => neuron.id)).toEqual(["xor-or", "xor-and", "xor-output"]);
        expect(compilation.removedNodes).toBe(9);
        expect(compilation.removedLinks).toBe(9);
        expect(compiledTraces).toEqual(teacherTraces);
        expect(compiledTraces).toEqual([[], [{ timestamp: 0, amplitude: 1 }], [{ timestamp: 0, amplitude: 1 }], []]);
        expect(graph.nodes).toHaveLength(6);
        expect(graph.links).toHaveLength(7);
    });
});

function runNetworkSample(
    sample: ILifSurrogateNetworkTrainingSequence,
    sourceA: NetworkSpikeSource,
    sourceB: NetworkSpikeSource,
    collector: NetworkSpikeCollector,
    graph: IRuntimeGraph
): Array<{ timestamp: number; amplitude: number }> {
    sourceA.amplitude = sample.inputs[0][0];
    sourceB.amplitude = sample.inputs[0][1];
    const session = new Session(graph);
    session.run(sample.timestamps?.[0] ?? 0);
    return collector.trace(session);
}
