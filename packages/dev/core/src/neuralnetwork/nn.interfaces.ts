import { INode, IOlink } from "../graph";

export interface IHasBag {
    /**
     * Runtime-only container for execution context.
     * Can be safely overwritten between runs.
     */
    bag?: unknown;
}

/// <summary>
/// Represents a generic neuron (node) in a neural network.
/// This interface is extended by specific neuron types (e.g., spiking, activation-based).
/// </summary>
export interface INeuron extends INode, IHasBag {
    /// <summary>Resets the neuron to its initial state</summary>
    reset(): void;
}

/// <summary>
/// Represents a synapse (link) between two neurons in a network.
/// This interface is extended by specific synapse types (e.g., with weights, delays, STDP).
/// </summary>
export interface ISynapse extends IOlink, IHasBag {
    /// <summary>Synaptic weight</summary>
    weight: number;
}
