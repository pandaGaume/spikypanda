import { ISpikeNeuron, ISnnGraph, ISpike, ISpikeSynapse } from "./spike.interfaces";
import { STDP, STDPFunction } from "./spike.stdp";

export class SNNRuntime {
    /**
     * Prepares input spikes from an ISnnGraph by binding input data to the graph’s input nodes.
     */
    public static prepareInputs(graph: ISnnGraph, inputData: number[]): Array<{ neuron: ISpikeNeuron; amplitude: number }> {
        if (graph.inputs.length !== inputData.length) {
            throw new Error(`Input data size (${inputData.length}) does not match the number of graph inputs (${graph.inputs.length})`);
        }

        return graph.inputs.map((neuron, index) => ({
            neuron,
            amplitude: inputData[index],
        }));
    }

    private _stdpRule: STDPFunction;

    public constructor(stdpRule?: STDPFunction) {
        this._stdpRule = stdpRule ?? STDP.exponential;
    }

    /**
     * Injects spikes into the input neurons and propagates them through the network until no more spikes occur.
     */
    public pulse(inputSpikes: Array<{ neuron: ISpikeNeuron; amplitude: number }>) {
        let activeSpikes: ISpike[] = [];

        // 🔹 Step 1: Inject initial spikes
        for (const { neuron, amplitude } of inputSpikes) {
            neuron.membranePotential += amplitude;

            if (neuron.membranePotential >= neuron.threshold) {
                activeSpikes.push(this._fireNeuron(neuron));
            }
        }

        // 🔹 Step 2: Process spikes continuously until no more spikes are generated
        while (activeSpikes.length > 0) {
            let nextSpikes: ISpike[] = [];
            const spikeTimestamp = Date.now();

            for (const spike of activeSpikes) {
                const neuron = spike.source;

                // 🔹 Step 3: Propagate to connected neurons via 'onsc' links
                const synapses = neuron.onsc<ISpikeSynapse>(); // Ensure 'onsc' is an array
                if (synapses) {
                    for (const synapse of synapses) {
                        const postNeuron = synapse.ofin as ISpikeNeuron;

                        // Apply synaptic weight
                        postNeuron.membranePotential += spike.amplitude * synapse.weight;

                        // If neuron reaches threshold, it fires
                        if (postNeuron.membranePotential >= postNeuron.threshold) {
                            const newSpike = this._fireNeuron(postNeuron);
                            nextSpikes.push(newSpike);

                            // Apply STDP only to the active synapse
                            this._applySTDP(synapse, spikeTimestamp);
                        }
                    }
                }
            }

            // Continue propagation if new spikes were created
            activeSpikes = nextSpikes;
        }
    }

    /**
     * Fires a neuron and resets its membrane potential.
     */
    private _fireNeuron(neuron: ISpikeNeuron): ISpike {
        const spike: ISpike = {
            timestamp: Date.now(),
            amplitude: neuron.membranePotential,
            source: neuron,
        };

        neuron.spikes.push(spike);
        neuron.membranePotential = 0; // Reset after firing
        neuron.lastSpikeTime = spike.timestamp;

        return spike;
    }

    /**
     * Applies STDP Learning **only** to the active synapse instead of all synapses.
     */
    private _applySTDP(synapse: ISpikeSynapse, spikeTimestamp: number) {
        const preNeuron = synapse.oini as ISpikeNeuron;
        const postNeuron = synapse.ofin as ISpikeNeuron;

        if (preNeuron.lastSpikeTime !== null && postNeuron.lastSpikeTime !== null) {
            const deltaT = spikeTimestamp - preNeuron.lastSpikeTime;
            synapse.weight = this._stdpRule(deltaT, synapse.weight);
            synapse.weight = Math.max(0.01, Math.min(1, synapse.weight)); // Keep within range
        }
    }
}
