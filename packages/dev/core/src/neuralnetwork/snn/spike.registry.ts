import type { ILinkRegistry, INodeRegistry } from "../../graph/graph.registry";
import { LIF_NEURON_TYPE_ID, LifNeuronNode } from "./lif-neuron.node";
import { OSCILLATORY_SNN_TYPE_ID, OscillatorySnnNode, type IOscillatorySnnConfig } from "./oscillatory-snn.model";
import { SPIKE_SYNAPSE_TYPE_ID, SpikeSynapse } from "./spike.synapse";
import { TEMPORAL_DELTA_SENSOR_TYPE_ID, TEMPORAL_DELTA_VECTOR_SLOT, TemporalDeltaSpikeSensorNode, type ITemporalDeltaSensorConfig } from "./temporal-delta.sensor";
import { WAVE_OBSERVATION_INPUT_SLOT, WAVE_SPIKE_SENSOR_TYPE_ID, WaveSpikeSensorNode } from "./wave-spike.sensor";

/** Register the Session-native SNN node and link types. Idempotent by type id. */
export function registerSessionSnnTypes(nodes: INodeRegistry, links: ILinkRegistry): void {
    if (!nodes.meta(WAVE_SPIKE_SENSOR_TYPE_ID)) {
        nodes.register(
            WAVE_SPIKE_SENSOR_TYPE_ID,
            (config) => {
                const node = new WaveSpikeSensorNode();
                if (config) node.deserialize(config);
                return node;
            },
            {
                label: "Wave Spike Sensor",
                category: "Neural.SNN",
                inputPorts: [{ slot: WAVE_OBSERVATION_INPUT_SLOT, type: "wave-observation", optional: true, kind: "stream", capacity: 1024 }],
                outputPorts: [{ slot: TEMPORAL_DELTA_VECTOR_SLOT, type: "temporal-vector", optional: true, kind: "stream", capacity: 1024 }],
            }
        );
    }
    if (!nodes.meta(LIF_NEURON_TYPE_ID)) {
        nodes.register(
            LIF_NEURON_TYPE_ID,
            (config) => {
                const node = new LifNeuronNode();
                if (config) node.deserialize(config);
                return node;
            },
            {
                label: "LIF Neuron",
                category: "Neural.SNN",
                inputPorts: [{ slot: "spike", type: "spike", optional: true, gating: false, kind: "stream", capacity: 1024 }],
                outputPorts: [{ slot: "spike", type: "spike", optional: true, kind: "stream", capacity: 1024 }],
            }
        );
    }
    if (!nodes.meta(TEMPORAL_DELTA_SENSOR_TYPE_ID)) {
        nodes.register(
            TEMPORAL_DELTA_SENSOR_TYPE_ID,
            (config) => {
                const sensorConfig = (config as { sensorConfig?: ITemporalDeltaSensorConfig } | undefined)?.sensorConfig;
                const node = new TemporalDeltaSpikeSensorNode(sensorConfig);
                if (config) node.deserialize(config);
                return node;
            },
            {
                label: "Temporal Delta Sensor",
                category: "Neural.SNN.Experimental",
                inputPorts: [{ slot: WAVE_OBSERVATION_INPUT_SLOT, type: "wave-observation", optional: false, kind: "stream", capacity: 1024 }],
                outputPorts: [],
            }
        );
    }
    if (!nodes.meta(OSCILLATORY_SNN_TYPE_ID)) {
        nodes.register(
            OSCILLATORY_SNN_TYPE_ID,
            (config) => {
                const modelConfig = (config as { modelConfig?: IOscillatorySnnConfig } | undefined)?.modelConfig;
                const node = new OscillatorySnnNode(modelConfig);
                if (config) node.deserialize(config);
                node.configure(node.modelConfig);
                return node;
            },
            {
                label: "Oscillatory SNN",
                category: "Neural.SNN.Experimental",
                inputPorts: [{ slot: "temporal-input", type: "temporal-vector", optional: false, kind: "stream", capacity: 1024 }],
                outputPorts: [{ slot: "oscillatory-step", type: "oscillatory-snn-step", optional: true, kind: "stream", capacity: 1024 }],
            }
        );
    }
    if (!links.meta(SPIKE_SYNAPSE_TYPE_ID)) {
        links.register(
            SPIKE_SYNAPSE_TYPE_ID,
            (config) => {
                const link = new SpikeSynapse();
                if (config) link.deserialize(config);
                return link;
            },
            {
                label: "Spike Synapse",
                category: "Neural.SNN",
                sourcePortTypes: ["spike"],
                targetPortTypes: ["spike"],
                priority: 100,
            }
        );
    }
}
