import {
    LIF_NEURON_TYPE_ID,
    LifNeuronNode,
    LinkRegistry,
    NodeRegistry,
    RuntimeGraphBuilder,
    RuntimeNode,
    Session,
    SPIKE_SYNAPSE_TYPE_ID,
    SpikeSynapse,
    registerSessionSnnTypes,
} from "spikypanda-core";
import type { IDeclaresPorts, INodeState, IPortDescriptor, ISession, ISpike } from "spikypanda-core";

class SpikeSourceNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "spike", type: "spike", optional: true, kind: "stream", capacity: 1024 }];
    public readonly schedule = new Map<number, number[]>();

    public override fire(session: ISession, t: number): void {
        for (const amplitude of this.schedule.get(session.tickIndex) ?? []) {
            const spike: ISpike = { timestamp: t, amplitude, source: this };
            this.publishAll(session, "spike", spike);
        }
    }
}

interface SinkState extends INodeState {
    spikes: ISpike[];
}

class SpikeSinkNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "spike", type: "spike", optional: true, gating: false, kind: "stream", capacity: 1024 }];
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

function makeNetwork(
    inputWeight = 1,
    inputDelay = 0
): {
    source: SpikeSourceNode;
    neuron: LifNeuronNode;
    sink: SpikeSinkNode;
    session: Session;
} {
    const source = new SpikeSourceNode();
    const neuron = new LifNeuronNode();
    const sink = new SpikeSinkNode();
    const input = new SpikeSynapse(source, neuron, "spike", "spike", inputWeight, inputDelay);
    const output = new SpikeSynapse(neuron, sink);
    const graph = new RuntimeGraphBuilder().withMode("dynamic").withNodes(source, neuron, sink).withLinks(input, output).build();
    return { source, neuron, sink, session: new Session(graph) };
}

describe("Session-native LIF", () => {
    test("integrates weighted spikes, leaks analytically and fires at threshold", () => {
        const { source, neuron, sink, session } = makeNetwork(0.6);
        neuron.threshold = 0.8;
        neuron.membraneTimeConstant = 0.02;
        source.schedule.set(1, [1]);
        source.schedule.set(2, [1]);

        session.run(0);
        expect(neuron.stateOf(session)?.membranePotential).toBeCloseTo(0.6, 12);
        expect(sink.spikesOf(session)).toHaveLength(0);

        session.run(0.02);
        expect(sink.spikesOf(session)).toHaveLength(1);
        expect(sink.spikesOf(session)[0]).toMatchObject({ timestamp: 0.02, amplitude: 1 });
        expect(neuron.stateOf(session)).toMatchObject({ membranePotential: 0, lastSpikeTime: 0.02, spikeCount: 1 });
    });

    test("applies an integer synaptic delay through Session.deferred", () => {
        const { source, neuron, sink, session } = makeNetwork(1, 2);
        neuron.threshold = 0.5;
        source.schedule.set(1, [1]);

        session.run(0);
        expect(sink.spikesOf(session)).toHaveLength(0);
        expect(session.deferred).toHaveLength(1);

        session.run(1);
        expect(sink.spikesOf(session)).toHaveLength(0);

        session.run(2);
        expect(sink.spikesOf(session)).toHaveLength(1);
        expect(sink.spikesOf(session)[0].timestamp).toBe(2);
    });

    test("holds reset potential during the refractory period", () => {
        const { source, neuron, sink, session } = makeNetwork();
        neuron.threshold = 0.5;
        neuron.refractoryPeriod = 0.1;
        source.schedule.set(1, [1]);
        source.schedule.set(2, [1]);
        source.schedule.set(3, [1]);

        session.run(0);
        session.run(0.05);
        expect(sink.spikesOf(session)).toHaveLength(1);
        expect(neuron.stateOf(session)?.membranePotential).toBe(0);

        session.run(0.11);
        expect(sink.spikesOf(session)).toHaveLength(2);
        expect(neuron.stateOf(session)?.spikeCount).toBe(2);
    });

    test("keeps membrane state isolated between sessions", () => {
        const { source, neuron, session: first } = makeNetwork();
        neuron.threshold = 10;
        source.schedule.set(1, [0.4]);
        const second = new Session(first.graph);

        first.run(0);
        expect(neuron.stateOf(first)?.membranePotential).toBeCloseTo(0.4, 12);
        expect(neuron.stateOf(second)?.membranePotential).toBe(0);

        second.run(0);
        expect(neuron.stateOf(second)?.membranePotential).toBeCloseTo(0.4, 12);
        expect(neuron.stateOf(first)?.membranePotential).toBeCloseTo(0.4, 12);
    });

    test("produces the same trace for two sessions with the same graph", () => {
        const { source, neuron, sink, session: first } = makeNetwork(0.75, 1);
        neuron.threshold = 0.7;
        source.schedule.set(1, [1]);
        source.schedule.set(2, [1]);
        const second = new Session(first.graph);

        for (const t of [0, 0.01, 0.02]) first.run(t);
        const firstTrace = sink.spikesOf(first).map((spike) => ({ timestamp: spike.timestamp, amplitude: spike.amplitude }));
        for (const t of [0, 0.01, 0.02]) second.run(t);
        const secondTrace = sink.spikesOf(second).map((spike) => ({ timestamp: spike.timestamp, amplitude: spike.amplitude }));

        expect(secondTrace).toEqual(firstTrace);
    });
});

describe("Session SNN registries", () => {
    test("round-trips readable synapse properties and resolves spike ports", () => {
        const nodes = new NodeRegistry();
        const links = new LinkRegistry();
        registerSessionSnnTypes(nodes, links);

        const original = new SpikeSynapse();
        original.weight = -0.35;
        original.delay = 4;
        original.plasticity = true;
        const data = original.serialize();
        const restored = links.create(SPIKE_SYNAPSE_TYPE_ID, data) as SpikeSynapse;

        expect(data).toMatchObject({ weight: -0.35, delay: 4, plasticity: true });
        expect(restored).toBeInstanceOf(SpikeSynapse);
        expect(restored.weight).toBe(-0.35);
        expect(restored.delay).toBe(4);
        expect(restored.plasticity).toBe(true);
        expect(links.resolve("spike", "spike")).toBe(SPIKE_SYNAPSE_TYPE_ID);
        expect(nodes.create(LIF_NEURON_TYPE_ID)).toBeInstanceOf(LifNeuronNode);
    });
});
