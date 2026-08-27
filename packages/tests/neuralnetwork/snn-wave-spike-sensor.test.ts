import {
    Channel,
    LinkRegistry,
    NodeRegistry,
    RuntimeGraphBuilder,
    RuntimeNode,
    Session,
    WAVE_OBSERVATION_INPUT_SLOT,
    WAVE_SPIKE_SENSOR_TYPE_ID,
    WaveSpikeEncoder,
    WaveSpikeSensorNode,
    registerSessionSnnTypes,
    waveSpikeSlot,
} from "spikypanda-core";
import type { IDeclaresPorts, INodeState, IPortDescriptor, ISession, IWaveObservation, IWaveSpike } from "spikypanda-core";

class ObservationSource extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: WAVE_OBSERVATION_INPUT_SLOT, type: "wave-observation", optional: true, kind: "stream", capacity: 1024 }];
    public observation: IWaveObservation = { timestamp: 0, values: [0] };

    public override fire(session: ISession): void {
        this.publishAll(session, WAVE_OBSERVATION_INPUT_SLOT, this.observation);
    }
}

interface CollectorState extends INodeState {
    spikes: IWaveSpike[];
}

class SpikeCollector extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "spike", type: "spike", optional: true, kind: "stream", capacity: 1024 }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    public createNodeState(): CollectorState {
        return { linksReady: 0, spikes: [] };
    }

    public override fire(session: ISession): void {
        const state = session.nodeStateOf(this) as CollectorState;
        for (const channel of this.inputChannels("spike")) {
            const index = this.channelIndex(session, channel);
            while (index >= 0 && session.linkStates[index].ready) {
                state.spikes.push(session.consume(index) as IWaveSpike);
            }
        }
    }

    public spikesOf(session: ISession): ReadonlyArray<IWaveSpike> {
        return (session.nodeStateOf(this) as CollectorState).spikes;
    }
}

describe("wave spike sensor", () => {
    test("keeps simultaneous oscillations as separate spike rhythms", () => {
        const sampleRateHz = 1000;
        const encoder = new WaveSpikeEncoder({
            sampleRateHz,
            bands: [
                { id: "slow", channel: 0, centerFrequencyHz: 10, bandwidthHz: 2, threshold: 0.01, polarity: "rising" },
                { id: "fast", channel: 0, centerFrequencyHz: 25, bandwidthHz: 3, threshold: 0.01, polarity: "rising" },
            ],
        });
        const state = encoder.createState();
        const byBand = new Map<string, number[]>();

        for (let sample = 0; sample < sampleRateHz * 3; sample++) {
            const timestamp = sample / sampleRateHz;
            const value = Math.sin(2 * Math.PI * 10 * timestamp) + 0.6 * Math.sin(2 * Math.PI * 25 * timestamp);
            for (const emission of encoder.encode({ timestamp, values: [value] }, state)) {
                const times = byBand.get(emission.bandId) ?? [];
                times.push(emission.timestamp);
                byBand.set(emission.bandId, times);
            }
        }

        const slow = byBand.get("slow") ?? [];
        const fast = byBand.get("fast") ?? [];
        expect(slow.length).toBeGreaterThan(20);
        expect(fast.length).toBeGreaterThan(55);
        expect(medianFrequency(slow.slice(-12))).toBeCloseTo(10, 0);
        expect(medianFrequency(fast.slice(-24))).toBeCloseTo(25, 0);
        expect(encoder.outputPorts[0]).toMatchObject({ centerFrequencyHz: 10, bandwidthHz: 2, polarity: "rising" });
    });

    test("uses Session-owned state and can omit diagnostic payloads", () => {
        const source = new ObservationSource();
        const sensor = new WaveSpikeSensorNode({
            sampleRateHz: 100,
            bands: [{ id: "ten-hz", channel: 0, centerFrequencyHz: 10, bandwidthHz: 4, threshold: 0.01, polarity: "rising" }],
            diagnostics: false,
        });
        const sink = new SpikeCollector();
        const observationLink = new Channel(source, sensor, WAVE_OBSERVATION_INPUT_SLOT, false, undefined, true, WAVE_OBSERVATION_INPUT_SLOT);
        const spikeLink = new Channel(sensor, sink, waveSpikeSlot("ten-hz", "rising"), false, undefined, true, "spike");
        const graph = new RuntimeGraphBuilder().withNodes(source, sensor, sink).withLinks(observationLink, spikeLink).build();
        const first = new Session(graph);
        const second = new Session(graph);

        for (let sample = 0; sample < 100; sample++) {
            const timestamp = sample / 100;
            source.observation = { timestamp, values: [Math.sin(2 * Math.PI * 10 * timestamp)] };
            first.run(timestamp);
        }

        expect(sink.spikesOf(first).length).toBeGreaterThan(5);
        expect(sink.spikesOf(first)[0].wave).toBeUndefined();
        expect(sink.spikesOf(second)).toHaveLength(0);
        expect(sensor.stateOf(first)?.encoder.spikeCount).toBe(sink.spikesOf(first).length);
        expect(sensor.stateOf(second)?.encoder.spikeCount).toBe(0);
    });

    test("round-trips the complete band configuration through the registry", () => {
        const original = new WaveSpikeSensorNode({
            sampleRateHz: 60,
            bands: [
                {
                    id: "envelope-3hz",
                    channel: 2,
                    centerFrequencyHz: 3,
                    bandwidthHz: 1.5,
                    threshold: 0.07,
                    polarity: "both",
                    amplitudeMode: "normalized-peak",
                },
            ],
            diagnostics: true,
        });
        const nodes = new NodeRegistry();
        const links = new LinkRegistry();
        registerSessionSnnTypes(nodes, links);
        const restored = nodes.create(WAVE_SPIKE_SENSOR_TYPE_ID, original.serialize()) as WaveSpikeSensorNode;

        expect(restored).toBeInstanceOf(WaveSpikeSensorNode);
        expect(restored.config).toEqual(original.config);
        expect(restored.outputPorts.map((port) => port.slot)).toEqual([waveSpikeSlot("envelope-3hz", "rising"), waveSpikeSlot("envelope-3hz", "falling"), "frame-end"]);
    });
});

function medianFrequency(timestamps: ReadonlyArray<number>): number {
    const frequencies: number[] = [];
    for (let index = 1; index < timestamps.length; index++) frequencies.push(1 / (timestamps[index] - timestamps[index - 1]));
    frequencies.sort((left, right) => left - right);
    return frequencies[Math.floor(frequencies.length / 2)];
}
