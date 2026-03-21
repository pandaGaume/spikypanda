import type { ICartesian } from "../geometry";
import { Nullable } from "../types";
import { GraphItem } from "./graph.graphItem";
import { cloneable, INode, IOlink } from "./graph.interfaces";

export class GraphNode extends GraphItem implements INode {
    protected _onsc: IOlink[];
    protected _opsc: IOlink[];

    @cloneable public position?: ICartesian; 

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super();
        this._onsc = onsc ?? [];
        this._opsc = opsc ?? [];
        this.position = position;
    }

    public onsc<L extends IOlink>(): Array<L> {
        return this._onsc as Array<L>;
    }

    public opsc<L extends IOlink>(): Array<L> {
        return this._opsc as Array<L>;
    }
}
