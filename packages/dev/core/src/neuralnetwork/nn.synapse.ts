import { cloneable, GraphOLink, INode } from "../graph";
import { ISynapse } from "./nn.interfaces";

export class Synapse extends GraphOLink implements ISynapse {
    @cloneable public weight: number = 0;
    bag?: unknown;
    public constructor(oini: INode, ofin: INode, weight: number = 0) {
        super(oini, ofin);
        this.weight = weight;
    }
}
