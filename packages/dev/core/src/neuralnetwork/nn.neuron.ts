import { ICartesian } from "../geometry";
import { GraphNode, IOlink } from "../graph";
import { Nullable } from "../types";
import { INeuron } from "./nn.interfaces";

export class Neuron extends GraphNode implements INeuron {
    bag?: unknown;

    constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian){
        super(onsc,opsc,position);
    }

    reset(): void {
        this.bag = undefined;
    }
}
