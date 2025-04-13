import { cloneable } from "../../../graph";
import { Neuron } from "../../nn.neuron";
import { IActivationFunction, IMlpNeuron } from "./mlp.interfaces";

export class MlpNeuron extends Neuron implements IMlpNeuron {
    @cloneable public bias: number = 0;
    @cloneable activationFn?: IActivationFunction | undefined;
}
