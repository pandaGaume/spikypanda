import type { IDeclaresPorts, INodeState, IPortDescriptor, ISession } from "../../execution/execution.interfaces";
import { RuntimeNode } from "../../execution/execution.node";
import { cloneable } from "../../graph/graph.interfaces";
import type { ISpike } from "./spike.interfaces";
import type { IOscillatorySnnInput } from "./oscillatory-snn.model";
import { WAVE_OBSERVATION_INPUT_SLOT, type IWaveObservation } from "./wave-spike.sensor";

export const TEMPORAL_DELTA_SENSOR_TYPE_ID = "SNN:temporal-delta-sensor";
export const TEMPORAL_DELTA_VECTOR_SLOT = "temporal-vector";

export interface ITemporalDeltaChannelConfig {
    id: string;
    channel: number;
    threshold: number;
    spikeAmplitude?: number;
}

export interface ITemporalDeltaSensorConfig {
    channels: ReadonlyArray<ITemporalDeltaChannelConfig>;
    /** Limits bursts caused by a discontinuity or a badly scaled input. */
    maxEventsPerSample?: number;
}

export interface ITemporalDeltaEmission {
    slot: string;
    timestamp: number;
    amplitude: number;
    channel: number;
    polarity: "positive" | "negative";
    eventCount: number;
}

export interface ITemporalDeltaEncoderState {
    references: number[];
    initialized: boolean[];
    sampleCount: number;
    spikeCount: number;
}

export interface ITemporalDeltaSensorState extends INodeState {
    encoder: ITemporalDeltaEncoderState;
}

/**
 * Send-on-delta temporal encoder. It has no frequency, Fourier bin or
 * band-pass parameter. The network receives only signed changes in the raw
 * temporal signal and must form useful oscillatory modes itself.
 */
export class TemporalDeltaSpikeEncoder {
    public readonly outputPorts: ReadonlyArray<IPortDescriptor>;
    private readonly _maxEventsPerSample: number;

    public constructor(public readonly config: ITemporalDeltaSensorConfig) {
        validateConfig(config);
        this._maxEventsPerSample = Math.max(1, Math.floor(config.maxEventsPerSample ?? 16));
        this.outputPorts = config.channels.flatMap((channel) => [temporalDeltaPort(channel, "positive"), temporalDeltaPort(channel, "negative")]);
    }

    public createState(): ITemporalDeltaEncoderState {
        return {
            references: new Array(this.config.channels.length).fill(0),
            initialized: new Array(this.config.channels.length).fill(false),
            sampleCount: 0,
            spikeCount: 0,
        };
    }

    public vectorOf(emissions: ReadonlyArray<ITemporalDeltaEmission>): number[] {
        const vector = new Array(this.outputPorts.length).fill(0) as number[];
        for (const emission of emissions) {
            const index = this.outputPorts.findIndex((port) => port.slot === emission.slot);
            if (index >= 0) vector[index] += emission.amplitude;
        }
        return vector;
    }

    public encode(observation: IWaveObservation, state: ITemporalDeltaEncoderState): ITemporalDeltaEmission[] {
        if (!Number.isFinite(observation.timestamp)) throw new Error("Temporal delta observation timestamp must be finite.");
        const emissions: ITemporalDeltaEmission[] = [];
        for (let index = 0; index < this.config.channels.length; index++) {
            const channel = this.config.channels[index];
            const value = observation.values[channel.channel];
            if (!Number.isFinite(value)) continue;
            if (!state.initialized[index]) {
                state.references[index] = value;
                state.initialized[index] = true;
                continue;
            }
            const delta = value - state.references[index];
            const eventCount = Math.min(this._maxEventsPerSample, Math.floor(Math.abs(delta) / channel.threshold));
            if (eventCount === 0) continue;
            const polarity = delta > 0 ? "positive" : "negative";
            state.references[index] += (polarity === "positive" ? 1 : -1) * eventCount * channel.threshold;
            state.spikeCount += eventCount;
            emissions.push({
                slot: temporalDeltaSlot(channel.id, polarity),
                timestamp: observation.timestamp,
                amplitude: eventCount * finiteOr(channel.spikeAmplitude, 1),
                channel: channel.channel,
                polarity,
                eventCount,
            });
        }
        state.sampleCount++;
        return emissions;
    }
}

export class TemporalDeltaSpikeSensorNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: WAVE_OBSERVATION_INPUT_SLOT, optional: false, type: "wave-observation", kind: "stream", capacity: 1024 }];
    public encoder: TemporalDeltaSpikeEncoder;

    @cloneable public sensorConfig: ITemporalDeltaSensorConfig;

    public constructor(config: ITemporalDeltaSensorConfig = defaultTemporalDeltaSensorConfig()) {
        super();
        this.sensorConfig = cloneConfig(config);
        this.encoder = new TemporalDeltaSpikeEncoder(this.sensorConfig);
        this.type = "snn.temporal-delta-sensor";
    }

    public get outputPorts(): ReadonlyArray<IPortDescriptor> {
        return [...this.encoder.outputPorts, { slot: TEMPORAL_DELTA_VECTOR_SLOT, optional: true, type: "temporal-vector", kind: "stream", capacity: 1024 }];
    }

    public override deserialize(blob: unknown): void {
        super.deserialize(blob);
        this.encoder = new TemporalDeltaSpikeEncoder(this.sensorConfig);
    }

    public createNodeState(): ITemporalDeltaSensorState {
        return { linksReady: 0, encoder: this.encoder.createState() };
    }

    public override reset(session: ISession): void {
        const state = this.stateOf(session);
        if (state) state.encoder = this.encoder.createState();
    }

    public override fire(session: ISession): void {
        const state = this.stateOf(session);
        if (!state) return;
        let observation: IWaveObservation | null = null;
        for (const channel of this.inputChannels(WAVE_OBSERVATION_INPUT_SLOT)) {
            if (!channel.enabled) continue;
            const index = this.channelIndex(session, channel);
            if (index < 0) continue;
            while (session.linkStates[index].ready) {
                const value = session.consume(index);
                if (isObservation(value)) observation = value;
            }
        }
        if (!observation) return;
        const emissions = this.encoder.encode(observation, state.encoder);
        for (const emission of emissions) {
            const spike: ISpike = { timestamp: emission.timestamp, amplitude: emission.amplitude, source: this };
            this.publishAll(session, emission.slot, spike);
        }
        const vector: IOscillatorySnnInput = {
            timestamp: observation.timestamp,
            values: this.encoder.vectorOf(emissions),
        };
        this.publishAll(session, TEMPORAL_DELTA_VECTOR_SLOT, vector);
    }

    public stateOf(session: ISession): ITemporalDeltaSensorState | undefined {
        return session.nodeStateOf(this) as ITemporalDeltaSensorState | undefined;
    }
}

export function temporalDeltaSlot(id: string, polarity: "positive" | "negative"): string {
    return `delta:${id}:${polarity}`;
}

export function defaultTemporalDeltaSensorConfig(channelCount: number = 1, threshold: number = 0.05): ITemporalDeltaSensorConfig {
    return {
        channels: new Array(Math.max(1, Math.floor(channelCount))).fill(null).map((_, channel) => ({
            id: `channel-${channel}`,
            channel,
            threshold: positiveOr(threshold, 0.05),
        })),
        maxEventsPerSample: 16,
    };
}

function temporalDeltaPort(channel: ITemporalDeltaChannelConfig, polarity: "positive" | "negative"): IPortDescriptor {
    return {
        slot: temporalDeltaSlot(channel.id, polarity),
        optional: true,
        type: "spike",
        kind: "stream",
        capacity: 1024,
    };
}

function validateConfig(config: ITemporalDeltaSensorConfig): void {
    if (config.channels.length === 0) throw new Error("Temporal delta sensor requires at least one channel.");
    const ids = new Set<string>();
    for (const channel of config.channels) {
        if (!channel.id || ids.has(channel.id)) throw new Error("Temporal delta channel ids must be non-empty and unique.");
        ids.add(channel.id);
        if (!Number.isInteger(channel.channel) || channel.channel < 0) throw new Error("Temporal delta channel index must be a non-negative integer.");
        if (!Number.isFinite(channel.threshold) || channel.threshold <= 0) throw new Error("Temporal delta threshold must be positive.");
        if (!Number.isFinite(finiteOr(channel.spikeAmplitude, 1))) throw new Error("Temporal delta spike amplitude must be finite.");
    }
}

function cloneConfig(config: ITemporalDeltaSensorConfig): ITemporalDeltaSensorConfig {
    return { ...config, channels: config.channels.map((channel) => ({ ...channel })) };
}

function isObservation(value: unknown): value is IWaveObservation {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<IWaveObservation>;
    return typeof candidate.timestamp === "number" && Array.isArray(candidate.values);
}

function finiteOr(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function positiveOr(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}
