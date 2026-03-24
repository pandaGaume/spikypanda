import { ActivationFunctions } from "../../neuralnetwork/ann/mlp/mlp.activation";
import {
    CnnLayerType,
    IActivationFunction,
    ICnnInferenceContext,
    ICnnNeuron,
    ICnnSynapse,
    PoolingType,
} from "../../neuralnetwork/cnn/cnn.interfaces";
import { IStereoCnnGraph, IStereoCnnSynapse } from "./stereo.interfaces";
import { StereoCnnNeuron } from "./stereo.neuron";

/// <summary>
/// Forward-pass inference runtime for stereo CNN graphs.
/// Takes separate left and right input pixel arrays and produces a disparity map.
///
/// Cross-synapses are stored on StereoCnnNeuron.crossInputs (not in the graph links),
/// so they don't affect remainingInputs or the ready-queue. Their contribution is added
/// when the neuron fires, via crossSum().
/// </summary>
export class StereoInferenceRuntime {
    public constructor(
        public readonly graph: IStereoCnnGraph,
        public mainActivation: IActivationFunction = ActivationFunctions.relu
    ) {}

    public run(leftPixels: number[], rightPixels: number[]): number[] {
        const leftInputs = this.graph.leftInputs;
        const rightInputs = this.graph.rightInputs;

        if (leftPixels.length !== leftInputs.length) {
            throw new Error(`Left input count mismatch: expected ${leftInputs.length}, got ${leftPixels.length}`);
        }
        if (rightPixels.length !== rightInputs.length) {
            throw new Error(`Right input count mismatch: expected ${rightInputs.length}, got ${rightPixels.length}`);
        }

        const ready: ICnnNeuron[] = [];

        // Initialize context — use intraSynapseCount to exclude cross-synapses
        // from remainingInputs, preventing bidirectional deadlocks.
        for (const neuron of this.graph.nodes) {
            const stereoNeuron = neuron as StereoCnnNeuron;
            const numInputs = stereoNeuron.getIntraInputCount();
            if (!neuron.bag) {
                neuron.bag = { sum: 0, activation: 0, remainingInputs: numInputs, totalInputs: numInputs };
            } else {
                const bag = neuron.bag as ICnnInferenceContext;
                bag.sum = 0;
                bag.activation = 0;
                bag.remainingInputs = numInputs;
                bag.totalInputs = numInputs;
            }
        }

        // Load left input values
        for (let i = 0; i < leftPixels.length; i++) {
            const neuron = leftInputs[i] as ICnnNeuron;
            const ctx = neuron.bag as ICnnInferenceContext;
            ctx.sum = leftPixels[i];
            ctx.activation = leftPixels[i];
            ctx.remainingInputs = 0;
            ready.push(neuron);
        }

        // Load right input values
        for (let i = 0; i < rightPixels.length; i++) {
            const neuron = rightInputs[i] as ICnnNeuron;
            const ctx = neuron.bag as ICnnInferenceContext;
            ctx.sum = rightPixels[i];
            ctx.activation = rightPixels[i];
            ctx.remainingInputs = 0;
            ready.push(neuron);
        }

        // Forward pass using ready-queue
        while (ready.length > 0) {
            const source = ready.shift()!;
            const sourceCtx = source.bag as ICnnInferenceContext;

            const outputs = source.onsc<ICnnSynapse>() ?? [];
            for (const syn of outputs) {
                const stereoSyn = syn as IStereoCnnSynapse;

                // Cross-synapses contribute to sum but don't decrement remainingInputs
                if (stereoSyn.cross) {
                    const target = syn.ofin as ICnnNeuron;
                    const targetCtx = target.bag as ICnnInferenceContext;
                    targetCtx.sum += sourceCtx.activation * syn.weight;
                    continue;
                }

                const target = syn.ofin as ICnnNeuron;
                const targetCtx = target.bag as ICnnInferenceContext;

                switch (target.layerType) {
                    case CnnLayerType.Conv:
                    case CnnLayerType.Dense:
                        targetCtx.sum += sourceCtx.activation * syn.weight;
                        break;

                    case CnnLayerType.Pool:
                        if (target.poolType === PoolingType.Max) {
                            if (targetCtx.remainingInputs === targetCtx.totalInputs) {
                                targetCtx.sum = sourceCtx.activation;
                            } else {
                                targetCtx.sum = Math.max(targetCtx.sum, sourceCtx.activation);
                            }
                        } else {
                            targetCtx.sum += sourceCtx.activation;
                        }
                        break;

                    case CnnLayerType.Flatten:
                    case CnnLayerType.Input:
                    case CnnLayerType.Upsample:
                    case CnnLayerType.Reshape:
                        targetCtx.sum += sourceCtx.activation * syn.weight;
                        break;
                }

                targetCtx.remainingInputs--;

                if (targetCtx.remainingInputs === 0) {
                    switch (target.layerType) {
                        case CnnLayerType.Conv:
                        case CnnLayerType.Dense: {
                            targetCtx.sum += target.bias;
                            const afn = target.activationFn ?? this.mainActivation;
                            targetCtx.activation = afn.fn(targetCtx.sum);
                            break;
                        }
                        case CnnLayerType.Pool: {
                            if (target.poolType === PoolingType.Avg) {
                                targetCtx.activation = targetCtx.sum / targetCtx.totalInputs;
                            } else {
                                targetCtx.activation = targetCtx.sum;
                            }
                            break;
                        }
                        case CnnLayerType.Flatten:
                        case CnnLayerType.Input:
                        case CnnLayerType.Upsample:
                        case CnnLayerType.Reshape: {
                            targetCtx.activation = targetCtx.sum;
                            break;
                        }
                    }
                    ready.push(target);
                }
            }
        }

        return this.graph.outputs.map((n) => (n.bag as ICnnInferenceContext).activation);
    }

    public clearContext(): void {
        for (const neuron of this.graph.nodes) {
            const stereoNeuron = neuron as StereoCnnNeuron;
            const numInputs = stereoNeuron.getIntraInputCount();
            const bag = neuron.bag as ICnnInferenceContext | undefined;
            if (bag) {
                bag.sum = 0;
                bag.activation = 0;
                bag.remainingInputs = numInputs;
                bag.totalInputs = numInputs;
            }
        }
    }

    public deleteContext(): void {
        for (const neuron of this.graph.nodes) {
            neuron.bag = undefined;
        }
    }
}
