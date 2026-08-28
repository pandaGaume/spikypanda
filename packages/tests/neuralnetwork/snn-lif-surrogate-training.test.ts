import {
    compileConstrainedLifSubgraph,
    ConstrainedLifBpttTrainer,
    ConstrainedLifSurrogateSubgraph,
    LossFunctions,
    Optimizers,
    RuntimeGraphBuilder,
    RuntimeNode,
    Session,
    SpikeSynapse,
} from "spikypanda-core";
import type { IChannel, IDeclaresPorts, ILifSurrogateTrainingSequence, INodeState, IPortDescriptor, IRuntimeGraph, IRuntimeNode, ISession, ISpike } from "spikypanda-core";

class TemporalSpikeSource extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "spike", optional: true, type: "spike", kind: "stream", capacity: 16 }];
    public readonly schedule = new Map<number, number>();

    public override fire(session: ISession, timestamp: number): void {
        const amplitude = this.schedule.get(session.tickIndex);
        if (amplitude === undefined || amplitude === 0) return;
        this.publishAll(session, "spike", { timestamp, amplitude, source: this } satisfies ISpike);
    }
}

interface SpikeCollectorState extends INodeState {
    spikes: ISpike[];
}

class SpikeCollector extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "spike", optional: false, type: "spike", kind: "stream", capacity: 16 }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    public createNodeState(): SpikeCollectorState {
        return { linksReady: 0, spikes: [] };
    }

    public override fire(session: ISession): void {
        const state = session.nodeStateOf(this) as SpikeCollectorState;
        for (const channel of this.inputChannels("spike")) {
            const index = this.channelIndex(session, channel);
            while (index >= 0 && session.linkStates[index].ready) {
                const value = session.consume(index);
                if (value && typeof value === "object") state.spikes.push(value as ISpike);
            }
        }
    }

    public trace(session: ISession): Array<{ timestamp: number; amplitude: number }> {
        return (session.nodeStateOf(this) as SpikeCollectorState).spikes.map(({ timestamp, amplitude }) => ({ timestamp, amplitude }));
    }
}

function temporalOrderDataset(): ILifSurrogateTrainingSequence[] {
    return [
        {
            inputs: [
                [1, 0],
                [0, 1],
            ],
            targets: [0, 1],
        },
        {
            inputs: [
                [0, 1],
                [1, 0],
            ],
            targets: [0, 0],
        },
        {
            inputs: [
                [1, 0],
                [0, 0],
            ],
            targets: [0, 0],
        },
        {
            inputs: [
                [0, 0],
                [0, 1],
            ],
            targets: [0, 0],
        },
    ];
}

describe("Constrained LIF surrogate BPTT", () => {
    test("uses a surrogate derivative to cross the hard threshold without changing the forward value", () => {
        const sourceA = new TemporalSpikeSource();
        const surrogate = new ConstrainedLifSurrogateSubgraph("gradient-lif", {
            threshold: 1,
            resetPotential: 0,
            membraneTimeConstant: 0.03,
            surrogateSlope: 1.25,
            mode: "training",
        });
        const synapses = [new SpikeSynapse(sourceA, surrogate.inputNode, "spike", "spike", 0.8)];
        const trainer = new ConstrainedLifBpttTrainer(surrogate, synapses, {
            learningRate: 0.3,
            lossFunction: LossFunctions.MSE,
            optimizer: Optimizers.SGD(),
        });
        const sequence: ILifSurrogateTrainingSequence = {
            inputs: [[1]],
            targets: [1],
        };

        const before = trainer.gradients(sequence);
        expect(before.steps[0].probability).toBe(0);
        expect(before.steps[0].membranePotential).toBe(0.8);
        expect(before.steps[0].surrogateDerivative).toBeGreaterThan(0);
        expect(before.gradients[0]).toBeLessThan(0);

        trainer.trainStep(sequence);

        expect(synapses[0].weight).toBeGreaterThanOrEqual(1);
        expect(trainer.forward(sequence).steps[0].probability).toBe(1);
    });

    test("matches the Session hard forward trace in training mode", () => {
        const sourceA = new TemporalSpikeSource();
        const sourceB = new TemporalSpikeSource();
        const collector = new SpikeCollector();
        const surrogate = new ConstrainedLifSurrogateSubgraph("session-parity", {
            initialPotential: 0.1,
            threshold: 0.9,
            resetPotential: -0.1,
            membraneTimeConstant: 0.025,
            surrogateSlope: 1.25,
            mode: "training",
        });
        const inputA = new SpikeSynapse(sourceA, surrogate.inputNode, "spike", "spike", 0.35);
        const inputB = new SpikeSynapse(sourceB, surrogate.inputNode, "spike", "spike", 0.75);
        const output = new SpikeSynapse(surrogate.outputNode, collector);
        const graph = new RuntimeGraphBuilder<IRuntimeNode, IChannel>()
            .withMode("dynamic")
            .withNodes(sourceA, sourceB, ...surrogate.nodes, collector)
            .withLinks(inputA, inputB, ...surrogate.links, output)
            .build();
        const sequence: ILifSurrogateTrainingSequence = {
            inputs: [
                [1, 0],
                [0, 1],
            ],
            targets: [0, 1],
            timestamps: [0, 0.02],
        };
        const trainer = new ConstrainedLifBpttTrainer(surrogate, [inputA, inputB]);
        const analytical = trainer.forward(sequence, "training");

        sourceA.schedule.set(1, 1);
        sourceB.schedule.set(2, 1);
        const session = new Session(graph);
        const feedbackIndex = graph.links.indexOf(surrogate.stateFeedbackLink);
        session.run(0);
        const firstRuntimeState = { ...(session.peek(feedbackIndex) as { membranePotential: number }) };
        session.run(0.02);
        const runtimeProbabilities = collector.trace(session).map((spike) => spike.amplitude);
        const runtimeState = session.peek(feedbackIndex) as { membranePotential: number };

        expect(analytical.steps.map((step) => step.probability)).toEqual([0, 1]);
        expect(runtimeProbabilities).toEqual([1]);
        expect(firstRuntimeState.membranePotential).toBeCloseTo(analytical.steps[0].membranePotential, 12);
        expect(runtimeState.membranePotential).toBeCloseTo(analytical.steps[1].membranePotential, 12);
    });

    test("learns an A-then-B temporal detector and preserves it after LIF compilation", () => {
        const sourceA = new TemporalSpikeSource();
        const sourceB = new TemporalSpikeSource();
        const collector = new SpikeCollector();
        sourceA.id = "input-a";
        sourceB.id = "input-b";
        collector.id = "collector";

        const surrogate = new ConstrainedLifSurrogateSubgraph("order-detector", {
            threshold: 1,
            resetPotential: 0,
            membraneTimeConstant: 0.02,
            surrogateSlope: 1.25,
            mode: "training",
        });
        const inputA = new SpikeSynapse(sourceA, surrogate.inputNode, "spike", "spike", 0.2);
        const inputB = new SpikeSynapse(sourceB, surrogate.inputNode, "spike", "spike", 0.2);
        const output = new SpikeSynapse(surrogate.outputNode, collector, "spike", "spike", 1);
        const graph = new RuntimeGraphBuilder<IRuntimeNode, IChannel>()
            .withMode("dynamic")
            .withNodes(sourceA, sourceB, ...surrogate.nodes, collector)
            .withLinks(inputA, inputB, ...surrogate.links, output)
            .build();
        const dataset = temporalOrderDataset();
        const trainer = new ConstrainedLifBpttTrainer(surrogate, [inputA, inputB], {
            learningRate: 0.03,
            timeStep: 0.02,
            gradientClip: 1,
            lossFunction: LossFunctions.MSE,
            optimizer: Optimizers.Adam(),
        });

        const fit = trainer.fit(dataset, { epochs: 300 });

        expect(fit.bestEpoch).toBeGreaterThanOrEqual(0);
        expect(fit.finalLoss).toBeCloseTo(fit.bestLoss, 12);
        expect(fit.finalLoss).toBeLessThan(fit.initialLoss * 0.25);
        const hardPredictions = dataset.map((sequence) => trainer.forward(sequence, "hard").steps.map((step) => step.probability));
        expect(hardPredictions).toEqual([
            [0, 1],
            [0, 0],
            [0, 0],
            [0, 0],
        ]);

        surrogate.configure({ mode: "hard" });
        const teacherTraces = dataset.map((sequence) => runRuntimeSequence(sequence, sourceA, sourceB, collector, graph));
        const compiled = compileConstrainedLifSubgraph(graph, surrogate);
        const compiledTraces = dataset.map((sequence) => runRuntimeSequence(sequence, sourceA, sourceB, collector, compiled.graph));

        expect(compiledTraces).toEqual(teacherTraces);
        expect(compiledTraces).toEqual([[{ timestamp: 0.02, amplitude: 1 }], [], [], []]);
        expect(compiled.graph.nodes).toHaveLength(4);
        expect(compiled.graph.links).toEqual([inputA, inputB, output]);
    });
});

function runRuntimeSequence(
    sequence: ILifSurrogateTrainingSequence,
    sourceA: TemporalSpikeSource,
    sourceB: TemporalSpikeSource,
    collector: SpikeCollector,
    graph: IRuntimeGraph
): Array<{ timestamp: number; amplitude: number }> {
    sourceA.schedule.clear();
    sourceB.schedule.clear();
    for (let t = 0; t < sequence.inputs.length; t++) {
        if (sequence.inputs[t][0] !== 0) sourceA.schedule.set(t + 1, sequence.inputs[t][0]);
        if (sequence.inputs[t][1] !== 0) sourceB.schedule.set(t + 1, sequence.inputs[t][1]);
    }
    const session = new Session(graph);
    for (let t = 0; t < sequence.inputs.length; t++) session.run(sequence.timestamps?.[t] ?? t * 0.02);
    return collector.trace(session);
}
