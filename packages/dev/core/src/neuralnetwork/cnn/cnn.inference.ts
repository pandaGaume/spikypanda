import { ActivationFunctions } from "../ann/mlp/mlp.activation";
import { CnnLayerType, IActivationFunction, ICnnGraph, ICnnInferenceContext, ICnnNeuron, ICnnSynapse, PoolingType } from "./cnn.interfaces";
import { CnnRuntimeUtils } from "./cnn.runtime.utils";

/// <summary>
/// Forward-pass inference runtime for CNN graphs.
/// Input values are expected as a flat array in channel-last, row-major order:
///   [r0c0ch0, r0c0ch1, ..., r0c1ch0, ...] when input layer is stored channel-first internally.
/// The builder stores neurons in channel-major order (channel × height × width),
/// so input values should match: all channel-0 pixels, then channel-1, etc.
/// </summary>
export class CnnInferenceRuntime {
    public constructor(
        public readonly graph: ICnnGraph,
        public mainActivation: IActivationFunction = ActivationFunctions.relu
    ) {}

    public run(inputValues: number[]): number[] {
        if (inputValues.length !== this.graph.inputs.length) {
            throw new Error(`Input count mismatch: expected ${this.graph.inputs.length}, got ${inputValues.length}`);
        }

        const ready: ICnnNeuron[] = [];

        // Initialize context for all neurons
        for (const neuron of this.graph.nodes) {
            CnnRuntimeUtils.resetInferenceContext(neuron);
        }

        // Load input values and mark as ready
        for (let i = 0; i < inputValues.length; i++) {
            const neuron = this.graph.inputs[i];
            const ctx = neuron.bag as ICnnInferenceContext;
            ctx.sum = inputValues[i];
            ctx.activation = inputValues[i];
            ctx.remainingInputs = 0;
            ready.push(neuron);
        }

        // Process forward pass using ready-queue
        while (ready.length > 0) {
            const source = ready.shift()!;
            const sourceCtx = source.bag as ICnnInferenceContext;

            const outputs = source.onsc<ICnnSynapse>() ?? [];
            for (const syn of outputs) {
                const target = syn.ofin as ICnnNeuron;
                const targetCtx = target.bag as ICnnInferenceContext;

                // Accumulate input based on target layer type
                switch (target.layerType) {
                    case CnnLayerType.Conv:
                    case CnnLayerType.Dense:
                        // Weighted sum (same as MLP)
                        targetCtx.sum += sourceCtx.activation * syn.weight;
                        break;

                    case CnnLayerType.Pool:
                        // For pooling, accumulate raw activations in sum
                        // We handle max/avg when the neuron fires
                        if (target.poolType === PoolingType.Max) {
                            if (targetCtx.remainingInputs === targetCtx.totalInputs) {
                                // First input — initialize to -Infinity
                                targetCtx.sum = sourceCtx.activation;
                            } else {
                                targetCtx.sum = Math.max(targetCtx.sum, sourceCtx.activation);
                            }
                        } else {
                            // Average pooling: accumulate sum, divide when firing
                            targetCtx.sum += sourceCtx.activation;
                        }
                        break;

                    case CnnLayerType.Flatten:
                    case CnnLayerType.Input:
                    case CnnLayerType.Upsample:
                    case CnnLayerType.Reshape:
                        // Pass-through
                        targetCtx.sum = sourceCtx.activation;
                        break;
                }

                // initialized with the number of input.
                targetCtx.remainingInputs--;

                if (targetCtx.remainingInputs === 0) {
                    // Compute activation based on layer type
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
                                // Max pooling — sum already holds the max
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
            CnnRuntimeUtils.resetInferenceContext(neuron);
        }
    }

    public deleteContext(): void {
        for (const neuron of this.graph.nodes) {
            neuron.bag = undefined;
        }
    }
}
