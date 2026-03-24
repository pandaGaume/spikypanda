import { ICnnGraph, ICnnNeuron, ICnnSynapse, IKernel, ICnnLayerDescriptor } from "../../neuralnetwork/cnn/cnn.interfaces";

/// <summary>
/// Branch identifier for stereo neurons.
/// </summary>
export type StereoBranch = "left" | "right" | "merge";

/// <summary>
/// Merge strategy for combining left and right branches.
/// </summary>
export enum MergeStrategy {
    /// <summary>Concatenate L and R feature vectors</summary>
    Concat = "concat",
    /// <summary>Absolute difference |L - R|</summary>
    Diff = "diff",
}

/// <summary>
/// Configuration for building a stereo CNN.
/// </summary>
export interface IStereoConfig {
    width: number;
    height: number;
    channels: number;
    maxDisparity: number;
    filters: number[];
    kernelSizes: number[];
    crossLayers: number[];
    mergeStrategy: MergeStrategy;
    outputWidth: number;
    outputHeight: number;
}

/// <summary>
/// A neuron in a stereo CNN graph. Extends CNN neuron with branch info.
/// </summary>
export interface IStereoCnnNeuron extends ICnnNeuron {
    branch: StereoBranch;
}

/// <summary>
/// A synapse in a stereo CNN graph. Extends CNN synapse with cross-branch info.
/// </summary>
export interface IStereoCnnSynapse extends ICnnSynapse {
    cross: boolean;
    disparity: number;
}

/// <summary>
/// A complete stereo CNN graph with two branches and cross-connections.
/// </summary>
export interface IStereoCnnGraph extends ICnnGraph {
    config: IStereoConfig;
    leftInputs: IStereoCnnNeuron[];
    rightInputs: IStereoCnnNeuron[];
    leftLayerDescriptors: ICnnLayerDescriptor[];
    rightLayerDescriptors: ICnnLayerDescriptor[];
    mergeLayerDescriptor: ICnnLayerDescriptor;
    sharedKernels: IKernel[];
    crossKernels: IKernel[];
}

export function isStereoCnnNeuron(obj: unknown): obj is IStereoCnnNeuron {
    return typeof obj === "object" && obj !== null && "branch" in obj && "layerType" in obj;
}
