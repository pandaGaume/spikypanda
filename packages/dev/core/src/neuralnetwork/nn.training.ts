import { ISynapse } from "./nn.interfaces";

/// <summary>
/// Represents the runtime training context for a synapse during backpropagation.
/// </summary>
export interface IBackpropSynapseContext {
    /// <summary>Gradient of the loss with respect to the synaptic weight</summary>
    gradient: number;

    /// <summary>Velocity term used in momentum-based optimizers (e.g., SGD with momentum, NAG)</summary>
    velocity?: number;

    /// <summary>First moment estimate (mean of gradients), used by the Adam optimizer</summary>
    m?: number;

    /// <summary>Second moment estimate (uncentered variance of gradients), used by the Adam optimizer</summary>
    v?: number;

    /// <summary>Anticipated weight used during the forward pass (for NAG optimizers)</summary>
    prelookedWeight?: number;

    /// <summary>Suggested weight update (usually learningRate × gradient), may be applied after batch or optimization step</summary>
    weightDelta?: number;
}

/// <summary>
/// Defines a loss function and its derivative for training.
/// </summary>
export interface ILossFunction {
    loss(output: number, expected: number): number;
    dLoss(output: number, expected: number): number;
}

/// <summary>
/// Defines a strategy for applying weight updates during training.
/// The target must have a `weight` property and a `bag` for optimizer state.
/// </summary>
export interface IOptimizer {
    /// <summary>Applies the weight update based on gradient and internal context</summary>
    apply(target: ISynapse, learningRate: number, gradient: number, context: ITrainingContext): void;
}

/// <summary>
/// Tracks training progress across iterations, epochs, and batches.
/// </summary>
export interface ITrainingContext {
    iteration: number;
    epoch?: number;
    batchIndex?: number;
    batchSize?: number;
    loss?: number;
}
