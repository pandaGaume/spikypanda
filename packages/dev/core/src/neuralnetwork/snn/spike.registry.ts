import type { ILinkRegistry, INodeRegistry } from "../../graph/graph.registry";
import { LIF_NEURON_TYPE_ID, LifNeuronNode } from "./lif-neuron.node";
import { SPIKE_SYNAPSE_TYPE_ID, SpikeSynapse } from "./spike.synapse";

/** Register the Session-native SNN node and link types. Idempotent by type id. */
export function registerSessionSnnTypes(nodes: INodeRegistry, links: ILinkRegistry): void {
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
