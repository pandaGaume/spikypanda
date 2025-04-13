import { cloneable, GraphOLink } from "../graph";
import { ISynapse } from "./nn.interfaces";

export class Synapse extends GraphOLink implements ISynapse {
    @cloneable public weight: number = 0;
    bag?: unknown;
}
