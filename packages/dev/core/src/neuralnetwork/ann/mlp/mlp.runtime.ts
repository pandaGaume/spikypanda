import { ActivationFunctions } from "./mlp.activation";
import { IMlpGraph, IMlpNeuron, IMlpSynapse, IInferenceNeuronContext, IActivationFunction } from "./mlp.interfaces";
import { MLPRuntimeUtils } from "./mlp.runtime.utils";

export class MLPRuntime {
    public constructor(public readonly graph: IMlpGraph, public mainActivation: IActivationFunction = ActivationFunctions.relu) {}

    /**
     * Runs inference on the MLP graph given an array of input values.
     * The number of input values must match the number of input neurons.
     */
    run(inputValues: number[]): number[] {
        if (inputValues.length !== this.graph.inputs.length) {
            throw new Error(`Input count mismatch: expected ${this.graph.inputs.length}, got ${inputValues.length}`);
        }

        const ready: IMlpNeuron[] = [];

        // Initialize context for all neurons
        for (const neuron of this.graph.nodes) {
            MLPRuntimeUtils.resetInferenceContext(neuron);
        }

        // Load input values and mark as ready
        for (let i = 0; i < inputValues.length; i++) {
            const neuron = this.graph.inputs[i];
            const ctx = neuron.bag as IInferenceNeuronContext;

            ctx.sum = inputValues[i];
            ctx.activation = inputValues[i];
            ctx.remainingInputs = 0;
            ready.push(neuron);
        }

        // Process forward pass
        while (ready.length > 0) {
            const source = ready.shift()!;
            const sourceCtx = source.bag as IInferenceNeuronContext;

            const outputs = source.onsc<IMlpSynapse>() ?? [];
            for (const syn of outputs) {
                const target = syn.ofin as IMlpNeuron;
                const targetCtx = target.bag as IInferenceNeuronContext;

                targetCtx.sum += sourceCtx.activation * syn.weight;
                targetCtx.remainingInputs--;

                if (targetCtx.remainingInputs === 0) {
                    targetCtx.sum += target.bias;
                    const afn = target.activationFn ?? this.mainActivation;
                    targetCtx.activation = afn.fn(targetCtx.sum);
                    ready.push(target);
                }
            }
        }

        // Return output activations
        return this.graph.outputs.map((n) => (n.bag as IInferenceNeuronContext).activation);
    }
}
