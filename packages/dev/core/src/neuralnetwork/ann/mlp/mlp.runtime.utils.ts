import { IMlpNeuron, IMlpSynapse, IInferenceNeuronContext, isMlpNeuron } from "./mlp.interfaces";
import { IBackpropNeuronContext, IBackpropSynapseContext } from "./training";

export class MLPRuntimeUtils {
    public static resetInferenceContext(neuron: IMlpNeuron): void {
        if (!neuron.bag) {
            const numInputs = neuron.opsc<IMlpSynapse>()?.length ?? 0;
            neuron.bag = { sum: 0, activation: 0, remainingInputs: numInputs, totalInputs: numInputs };
        } else {
            const bag = neuron.bag as IInferenceNeuronContext;
            bag.sum = 0;
            bag.activation = 0;
            bag.remainingInputs = bag.totalInputs;
        }
    }

    public static resetBackpropContext(item: IMlpNeuron | IMlpSynapse): void {
        if (isMlpNeuron(item)) {
            if (!item.bag) {
                item.bag = { error: 0, gradient: 0 };
            } else {
                const bag = item.bag as IBackpropNeuronContext;
                bag.error = 0;
                bag.gradient = 0;
            }
            return;
        }
        if (!item.bag) {
            item.bag = {
                gradient: 0,
                velocity: 0,
                m: 0,
                v: 0,
                prelookedWeight: 0,
                weightDelta: 0,
            };
        } else {
            const bag = item.bag as IBackpropSynapseContext;
            bag.gradient = 0;
            bag.velocity = 0;
            bag.m = 0;
            bag.v = 0;
            bag.prelookedWeight = 0;
            bag.weightDelta = 0;
        }
    }
}
