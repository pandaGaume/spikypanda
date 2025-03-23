import { IMlpNeuron, IMlpSynapse, IInferenceNeuronContext } from "./mlp.interfaces";

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
}
