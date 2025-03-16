import { IGraph, INode, IOlink, isGraph, isNode, isOlink } from "../graph";
import { Nullable } from "../types";

/**
 * Represents a discrete spike event traveling through the network
 */
export interface ISpike {
    timestamp: number; // Time of the spike
    amplitude: number; // Strength of the spike
    source: INode; // Neuron that emitted the spike
}

/**
 * Represents a neuron in the Spiking Neural Network
 */
export interface INeuron extends INode {
    membranePotential: number; // Current charge of the neuron
    threshold: number; // Activation threshold
    lastSpikeTime: Nullable<number>; // Last time the neuron spiked
    spikes: Array<ISpike>; // Spikes emitted by the neuron
}

/**
 * Represents a synapse (connection between two neurons)
 */
export interface ISynapse extends IOlink {
    weight: number; // Strength of the connection
    delay: number; // Time delay for spike transmission
    plasticity?: Nullable<boolean>; // Whether STDP is applied
}

/**
 * Represents the entire Spiking Neural Network as a directed graph
 */
export interface ISnnGraph extends IGraph<INeuron, ISynapse> {}

/**
 * Type guard for INeuron
 */
export function isNeuron(obj: unknown): obj is INeuron {
    return isNode(obj) && "membranePotential" in obj && "threshold" in obj && "lastSpikeTime" in obj && "spikes" in obj && Array.isArray((obj as INeuron).spikes);
}

/**
 * Type guard for ISynapse
 */
export function isSynapse(obj: unknown): obj is ISynapse {
    return isOlink(obj) && "weight" in obj && "delay" in obj && (obj as ISynapse).weight !== undefined && (obj as ISynapse).delay !== undefined;
}

/**
 * Type guard for ISnnGraph
 */
export function isSnnGraph(obj: unknown): obj is ISnnGraph {
    return (
        isGraph(obj) &&
        Array.isArray((obj as IGraph<INeuron, ISynapse>).nodes) &&
        Array.isArray((obj as IGraph<INeuron, ISynapse>).links) &&
        (obj as IGraph<INeuron, ISynapse>).nodes.every(isNeuron) &&
        (obj as IGraph<INeuron, ISynapse>).links.every(isSynapse)
    );
}
