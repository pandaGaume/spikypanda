import { cloneable, INode } from "../graph/graph.interfaces";
import { GraphOLink } from "../graph/graph.olink";
import { IChannel } from "./execution.interfaces";

/**
 * Concrete IChannel. Extends GraphOLink so source/target endpoints
 * stay managed by the existing graph layer; adds slot (input-port name
 * on the destination), delayed (the channel is pre-seeded with
 * initialValue at session reset, breaking feedback cycles), and the
 * inherited IEnabled.enabled toggle.
 */
export class Channel<T = unknown> extends GraphOLink implements IChannel<T> {
    @cloneable public slot: string | number;
    @cloneable public toSlot?: string | number;
    @cloneable public delayed: boolean;
    @cloneable public initialValue?: T;
    @cloneable public enabled: boolean;

    public constructor(
        oini?: INode,
        ofin?: INode,
        slot: string | number = 0,
        delayed: boolean = false,
        initialValue?: T,
        enabled: boolean = true,
        toSlot?: string | number,
    ) {
        super(oini, ofin);
        this.slot = slot;
        this.toSlot = toSlot;
        this.delayed = delayed;
        this.initialValue = initialValue;
        this.enabled = enabled;
    }
}
