import {
    Channel,
    compileConstrainedLifSubgraph,
    ConstrainedLifSurrogateSubgraph,
    LifNeuronNode,
    RuntimeGraph,
    RuntimeGraphBuilder,
    RuntimeNode,
    Session,
    SpikeSynapse,
} from "spikypanda-core";
import type {
    IChannel,
    IConstrainedLifSurrogateConfig,
    IDeclaresPorts,
    ILifSurrogateState,
    INodeState,
    IPortDescriptor,
    IRuntimeNode,
    ISession,
    ISpike,
    ISurrogateSpike,
} from "spikypanda-core";

class SpikeSourceNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "spike", optional: true, type: "spike", kind: "stream", capacity: 1024 }];
    public readonly schedule = new Map<number, number[]>();

    public override fire(session: ISession, t: number): void {
        for (const amplitude of this.schedule.get(session.tickIndex) ?? []) {
            this.publishAll(session, "spike", { timestamp: t, amplitude, source: this } satisfies ISpike);
        }
    }
}

interface SinkState extends INodeState {
    spikes: ISpike[];
}

class SpikeSinkNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "spike", optional: false, type: "spike", kind: "stream", capacity: 1024 }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    public createNodeState(): SinkState {
        return { linksReady: 0, spikes: [] };
    }

    public override fire(session: ISession): void {
        const state = session.nodeStateOf(this) as SinkState;
        for (const channel of this.inputChannels("spike")) {
            const index = this.channelIndex(session, channel);
            if (index < 0) continue;
            while (session.linkStates[index].ready) {
                const value = session.consume(index);
                if (value && typeof value === "object") state.spikes.push(value as ISpike);
            }
        }
    }

    public spikesOf(session: ISession): ReadonlyArray<ISpike> {
        return (session.nodeStateOf(this) as SinkState).spikes;
    }
}

interface SurrogateFixture {
    source: SpikeSourceNode;
    sink: SpikeSinkNode;
    surrogate: ConstrainedLifSurrogateSubgraph;
    input: SpikeSynapse;
    output: SpikeSynapse;
    graph: RuntimeGraph<IRuntimeNode, IChannel>;
}

function makeSurrogateNetwork(config: Partial<IConstrainedLifSurrogateConfig> = {}, inputWeight: number = 1): SurrogateFixture {
    const source = new SpikeSourceNode();
    const sink = new SpikeSinkNode();
    source.id = "source";
    sink.id = "sink";
    const surrogate = new ConstrainedLifSurrogateSubgraph("teacher-lif", config);
    const input = new SpikeSynapse(source, surrogate.inputNode, "spike", "spike", inputWeight);
    const output = new SpikeSynapse(surrogate.outputNode, sink, "spike", "spike");
    const graph = new RuntimeGraphBuilder<IRuntimeNode, IChannel>()
        .withMode("dynamic")
        .withNodes(source, ...surrogate.nodes, sink)
        .withLinks(input, ...surrogate.links, output)
        .build();
    return { source, sink, surrogate, input, output, graph };
}

describe("Constrained LIF surrogate subgraph", () => {
    test("never emits below threshold and keeps the surrogate derivative out of the forward state", () => {
        const below = makeSurrogateNetwork({ threshold: 1, surrogateSlope: 1.25, mode: "training" });
        below.source.schedule.set(1, [0.5]);
        const belowSession = new Session(below.graph);
        belowSession.run(0);

        expect(below.sink.spikesOf(belowSession)).toEqual([]);
        const belowFeedback = below.graph.links.indexOf(below.surrogate.stateFeedbackLink);
        expect(belowSession.peek(belowFeedback)).toMatchObject({ membranePotential: 0.5, spikeCount: 0 });

        const above = makeSurrogateNetwork({ threshold: 1, surrogateSlope: 1.25, mode: "training" });
        above.source.schedule.set(1, [1.1]);
        const aboveSession = new Session(above.graph);
        aboveSession.run(0);

        const spikes = above.sink.spikesOf(aboveSession) as ReadonlyArray<ISurrogateSpike>;
        expect(spikes).toHaveLength(1);
        expect(spikes[0].probability).toBe(1);
        expect(spikes[0].amplitude).toBe(1);
        expect(spikes[0].surrogateDerivative).toBeCloseTo(1.25 * (1 - 1.25 * 0.1), 12);
        expect(spikes[0].hardSpike).toBe(true);
        const aboveFeedback = above.graph.links.indexOf(above.surrogate.stateFeedbackLink);
        expect(aboveSession.peek(aboveFeedback)).toMatchObject({ membranePotential: 0, spikeCount: 1 });
    });

    test("hard mode produces the same spike trace before and after compilation", () => {
        const fixture = makeSurrogateNetwork(
            {
                threshold: 0.8,
                membraneTimeConstant: 0.02,
                resetPotential: 0,
                spikeAmplitude: 1.25,
                mode: "hard",
            },
            0.6
        );
        fixture.source.schedule.set(1, [1]);
        fixture.source.schedule.set(2, [1]);

        const teacherSession = new Session(fixture.graph);
        teacherSession.run(0);
        teacherSession.run(0.02);
        const teacherTrace = fixture.sink.spikesOf(teacherSession).map(({ timestamp, amplitude }) => ({ timestamp, amplitude }));

        const compiled = compileConstrainedLifSubgraph(fixture.graph, fixture.surrogate);
        const inferenceSession = new Session(compiled.graph);
        inferenceSession.run(0);
        inferenceSession.run(0.02);
        const compiledTrace = fixture.sink.spikesOf(inferenceSession).map(({ timestamp, amplitude }) => ({ timestamp, amplitude }));

        expect(compiledTrace).toEqual(teacherTrace);
        expect(compiledTrace).toEqual([{ timestamp: 0.02, amplitude: 1.25 }]);
        expect(compiled.neuron.stateOf(inferenceSession)).toMatchObject({
            membranePotential: 0,
            lastSpikeTime: 0.02,
            spikeCount: 1,
        });
    });

    test("removes all training stages and reconnects the external synapses to one LIF", () => {
        const fixture = makeSurrogateNetwork({
            restingPotential: 0.1,
            initialPotential: 0.2,
            threshold: 0.9,
            resetPotential: -0.1,
            membraneTimeConstant: 0.03,
            spikeAmplitude: 1.5,
            surrogateSlope: 8,
            mode: "training",
        });

        const result = compileConstrainedLifSubgraph(fixture.graph, fixture.surrogate);

        expect(result.removedNodes).toBe(3);
        expect(result.removedLinks).toBe(3);
        expect(result.graph.nodes).toHaveLength(3);
        expect(result.graph.links).toHaveLength(2);
        expect(result.graph.nodes).toEqual([fixture.source, result.neuron, fixture.sink]);
        expect(result.graph.links).toEqual([fixture.input, fixture.output]);
        expect(fixture.input.ofin).toBe(result.neuron);
        expect(fixture.output.oini).toBe(result.neuron);
        expect(result.neuron).toBeInstanceOf(LifNeuronNode);
        expect(result.neuron.id).toBe("teacher-lif");
        expect(result.neuron).toMatchObject({
            restingPotential: 0.1,
            initialPotential: 0.2,
            threshold: 0.9,
            resetPotential: -0.1,
            membraneTimeConstant: 0.03,
            refractoryPeriod: 0,
            spikeAmplitude: 1.5,
        });
        expect(result.graph.hiddens).toEqual([result.neuron]);
    });

    test("keeps the constrained parameters serializable and synchronized", () => {
        const surrogate = new ConstrainedLifSurrogateSubgraph("serializable", { mode: "training" });
        surrogate.configure({ initialPotential: 0.25, threshold: 0.75, surrogateSlope: 6, mode: "hard" });

        expect(surrogate.config).toMatchObject({
            initialPotential: 0.25,
            threshold: 0.75,
            surrogateSlope: 6,
            mode: "hard",
        });
        expect(surrogate.integrate.serialize()).toMatchObject({
            groupId: "serializable",
            initialPotential: 0.25,
        });
        expect(surrogate.thresholdStage.serialize()).toMatchObject({
            groupId: "serializable",
            threshold: 0.75,
            surrogateSlope: 6,
            mode: "hard",
        });
        expect(surrogate.reset.serialize()).toMatchObject({ groupId: "serializable", mode: "hard" });
        expect((surrogate.stateFeedbackLink as Channel<ILifSurrogateState>).initialValue?.membranePotential).toBe(0.25);
    });
});
