import { INode } from "../../../graph";
import { Synapse } from "../../nn.synapse";
import { IMlpSynapse } from "./mlp.interfaces";

export class MlpSynapse extends Synapse implements IMlpSynapse {
    public constructor(oini: INode, ofin: INode) {
        super(oini, ofin);
    }
}
