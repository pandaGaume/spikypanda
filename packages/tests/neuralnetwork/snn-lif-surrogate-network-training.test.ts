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
    test("optimizes cross-entropy on the exact hard runtime decoder score", () => {
        const source = new NetworkSpikeSource();
        const correct = new ConstrainedLifSurrogateSubgraph("decoder-correct", {
            threshold: 1,
            resetPotential: 0,
            membraneTimeConstant: 0.02,
            surrogateSlope: 1.25,
        });
        const wrong = new ConstrainedLifSurrogateSubgraph("decoder-wrong", {
            threshold: 1,
            resetPotential: 0,
            membraneTimeConstant: 0.02,
            surrogateSlope: 1.25,
        });
        const correctInput = new SpikeSynapse(source, correct.inputNode, "spike", "spike", 0.8);
        const wrongInput = new SpikeSynapse(source, wrong.inputNode, "spike", "spike", 1.1);
        const trainer = new ConstrainedLifNetworkBpttTrainer(
            {
                neurons: [correct, wrong],
                inputs: [
                    { inputIndex: 0, synapse: correctInput },
                    { inputIndex: 0, synapse: wrongInput },
                ],
                connections: [],
                outputs: [correct, wrong],
            },
            { timeStep: 0.02, lossFunction: LossFunctions.MSE, optimizer: Optimizers.SGD() }
        );
        const sequence: ILifSurrogateNetworkTrainingSequence = {
            inputs: [[1]],
            targets: [[0, 0]],
            runtimeDecoderObjective: {
                targetOutput: 0,
                spikeCountScale: 2,
                membranePotentialScale: 1,
                temperature: 1,
                classificationLossWeight: 1,
                temporalLossWeight: 0,
            },
        };

        const result = trainer.gradients(sequence);
        expect(result.steps[0].outputs).toEqual([0, 1]);
        expect(result.runtimeDecoderScores).toEqual([0.8, 2]);
        expect(result.runtimeDecoderProbabilities![0] + result.runtimeDecoderProbabilities![1]).toBeCloseTo(1, 12);
        expect(result.loss).toBeCloseTo(-Math.log(result.runtimeDecoderProbabilities![0]), 12);
        expect(result.temporalLoss).toBe(0.25);
        expect(result.runtimeDecoderLoss).toBeCloseTo(result.loss, 12);
        expect(result.gradients.get(correctInput)!).toBeLessThan(0);
        expect(result.gradients.get(wrongInput)!).toBeGreaterThan(0);
        expect(result.steps.flatMap((step) => step.outputs).every((value) => value === 0 || value === 1)).toBe(true);
    });

    test("rejects an invalid runtime decoder target", () => {
        const source = new NetworkSpikeSource();
        const output = new ConstrainedLifSurrogateSubgraph("decoder-output", { threshold: 1, surrogateSlope: 1.25 });
        const input = new SpikeSynapse(source, output.inputNode, "spike", "spike", 0.8);
        const trainer = new ConstrainedLifNetworkBpttTrainer(
            {
                neurons: [output],
                inputs: [{ inputIndex: 0, synapse: input }],
                connections: [],
                outputs: [output],
            },
            { timeStep: 0.02 }
        );

        expect(() =>
            trainer.forward({
                inputs: [[1]],
                targets: [[1]],
                runtimeDecoderObjective: { targetOutput: 1 },
            })
        ).toThrow("outside the supervised output range");
    });

    test("routes a surrogate gradient through a teacher-to-teacher synapse while keeping binary forward spikes", () => {
        const source = new NetworkSpikeSource();
        const hidden = new ConstrainedLifSurrogateSubgraph("gradient-hidden", {
            threshold: 0.7,
            resetPotential: -0.1,
            membraneTimeConstant: 0.03,
            surrogateSlope: 1.25,
        });
        const output = new ConstrainedLifSurrogateSubgraph("gradient-output", {
            threshold: 0.8,
            membraneTimeConstant: 0.025,
            surrogateSlope: 1.25,
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

        const result = trainer.gradients(sequence);
        expect(result.steps.flatMap((step) => step.neurons.map((neuron) => neuron.probability)).every((value) => value === 0 || value === 1)).toBe(true);
        for (const synapse of trainer.synapses) {
            expect(Number.isFinite(result.gradients.get(synapse))).toBe(true);
        }
        expect(Math.abs(result.gradients.get(connection)!)).toBeGreaterThan(0);
    });

    test("routes gradients through a delayed recurrent synapse and preserves it during compilation", () => {
        const source = new NetworkSpikeSource();
        const collector = new NetworkSpikeCollector();
        source.id = "recurrent-source";
        collector.id = "recurrent-result";
        const hidden = new ConstrainedLifSurrogateSubgraph("recurrent-hidden", {
            threshold: 0.6,
            resetPotential: 0,
            membraneTimeConstant: 0.04,
            surrogateSlope: 1.25,
        });
        const output = new ConstrainedLifSurrogateSubgraph("recurrent-output", {
            threshold: 0.6,
            resetPotential: 0,
            membraneTimeConstant: 0.04,
            surrogateSlope: 1.25,
        });
        const input = new SpikeSynapse(source, hidden.inputNode, "spike", "spike", 1);
        const recurrent = new SpikeSynapse(hidden.outputNode, hidden.inputNode, "spike", "spike", 0.65, 1);
        const readout = new SpikeSynapse(hidden.outputNode, output.inputNode, "spike", "spike", 0.9);
        const observation = new SpikeSynapse(output.outputNode, collector);
        const graph = new RuntimeGraphBuilder<IRuntimeNode, IChannel>()
            .withMode("dynamic")
            .withNodes(source, ...hidden.nodes, ...output.nodes, collector)
            .withLinks(input, ...hidden.links, ...output.links, recurrent, readout, observation)
            .build();
        const trainer = new ConstrainedLifNetworkBpttTrainer(
            {
                neurons: [hidden, output],
                inputs: [{ inputIndex: 0, synapse: input }],
                connections: [recurrent, readout],
                outputs: [output],
            },
            { timeStep: 0.01, lossFunction: LossFunctions.MSE }
        );
        const sequence: ILifSurrogateNetworkTrainingSequence = {
            inputs: [[0.75], [0], [0]],
            targets: [[0.2], [0.8], [0.1]],
            timestamps: [0, 0.01, 0.02],
        };

        const analytical = trainer.gradients(sequence).gradients;
        for (const synapse of trainer.synapses) {
            expect(Number.isFinite(analytical.get(synapse))).toBe(true);
        }
        expect(Math.abs(analytical.get(recurrent)!)).toBeGreaterThan(0);

        const mixed = trainer.forwardMixed(sequence, ["hard", "training"]);
        expect(mixed).toEqual(trainer.forward(sequence, "hard"));
        expect(trainer.forwardMixed(sequence, ["hard", "hard"])).toEqual(trainer.forward(sequence, "hard"));
        expect(() => trainer.forwardMixed(sequence, ["hard"])).toThrow("replay modes");

        hidden.configure({ mode: "hard" });
        output.configure({ mode: "hard" });
        const teacherTrace = runNetworkSequence(sequence, source, collector, graph);
        const compilation = compileConstrainedLifNetwork(graph, [hidden, output]);
        const compiledTrace = runNetworkSequence(sequence, source, collector, graph);

        expect(teacherTrace).toEqual([
            { timestamp: 0, amplitude: 1 },
            { timestamp: 0.01, amplitude: 1 },
            { timestamp: 0.02, amplitude: 1 },
        ]);
        expect(compiledTrace).toEqual(teacherTrace);
        const compiledRecurrent = graph.links.find((link) => link.oini === compilation.neurons[0] && link.ofin === compilation.neurons[0]);
        expect(compiledRecurrent).toBe(recurrent);
        expect((compiledRecurrent as SpikeSynapse).delay).toBe(1);
    });

    test("represents XOR through two hard-forward teachers and compiles all teachers to native LIF neurons", () => {
        const sourceA = new NetworkSpikeSource();
        const sourceB = new NetworkSpikeSource();
        const collector = new NetworkSpikeCollector();
        sourceA.id = "xor-a";
        sourceB.id = "xor-b";
        collector.id = "xor-result";

        const hiddenOr = new ConstrainedLifSurrogateSubgraph("xor-or", {
            threshold: 1,
            membraneTimeConstant: 0.02,
            surrogateSlope: 1.25,
        });
        const hiddenAnd = new ConstrainedLifSurrogateSubgraph("xor-and", {
            threshold: 1,
            membraneTimeConstant: 0.02,
            surrogateSlope: 1.25,
        });
        const output = new ConstrainedLifSurrogateSubgraph("xor-output", {
            threshold: 1,
            membraneTimeConstant: 0.02,
            surrogateSlope: 1.25,
        });
        const aToOr = new SpikeSynapse(sourceA, hiddenOr.inputNode, "spike", "spike", 1.1);
        const bToOr = new SpikeSynapse(sourceB, hiddenOr.inputNode, "spike", "spike", 1.1);
        const aToAnd = new SpikeSynapse(sourceA, hiddenAnd.inputNode, "spike", "spike", 0.6);
        const bToAnd = new SpikeSynapse(sourceB, hiddenAnd.inputNode, "spike", "spike", 0.6);
        const orToOutput = new SpikeSynapse(hiddenOr.outputNode, output.inputNode, "spike", "spike", 1.1);
        const andToOutput = new SpikeSynapse(hiddenAnd.outputNode, output.inputNode, "spike", "spike", -1.2);
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
        expect(dataset.map((sample) => trainer.forward(sample, "hard").steps[0].outputs)).toEqual([[0], [1], [1], [0]]);

        const analyticalForward = dataset.map((sample) => trainer.forward(sample).steps[0].outputs[0]);
        const runtimeForward = dataset.map((sample) => runNetworkSample(sample, sourceA, sourceB, collector, graph)[0]?.amplitude ?? 0);
        for (let sample = 0; sample < dataset.length; sample++) {
            expect(runtimeForward[sample]).toBe(analyticalForward[sample]);
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

function runNetworkSequence(
    sample: ILifSurrogateNetworkTrainingSequence,
    source: NetworkSpikeSource,
    collector: NetworkSpikeCollector,
    graph: IRuntimeGraph
): Array<{ timestamp: number; amplitude: number }> {
    const session = new Session(graph);
    for (let timestep = 0; timestep < sample.inputs.length; timestep++) {
        source.amplitude = sample.inputs[timestep][0];
        session.run(sample.timestamps?.[timestep] ?? timestep);
    }
    return collector.trace(session);
}
