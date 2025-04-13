import { GraphNode } from "../graph";
import { INeuron } from "./nn.interfaces";

export class Neuron extends GraphNode implements INeuron {
    bag?: unknown;

    reset(): void {
        this.bag = undefined;
    }
}
