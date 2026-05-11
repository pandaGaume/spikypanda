import { INode } from "../graph/graph.interfaces";
import { cloneable } from "../graph/graph.interfaces";
import { GraphOLink } from "../graph/graph.olink";
import { ISimLink } from "./sim.interfaces";

/**
 * Concrete ISimLink. Carries slot (destination port id) and delayed
 * (previous-tick read) on top of the oini/ofin endpoints maintained by
 * GraphOLink. Constructor argument order follows the LinkConstructor
 * contract (from, to, ...args).
 */
export class SimLink extends GraphOLink implements ISimLink {
    @cloneable public slot: string | number;
    @cloneable public delayed: boolean;
    @cloneable public enabled: boolean;

    public constructor(
        oini?: INode,
        ofin?: INode,
        slot: string | number = 0,
        delayed: boolean = false,
        enabled: boolean = true
    ) {
        super(oini, ofin);
        this.slot = slot;
        this.delayed = delayed;
        this.enabled = enabled;
    }
}
