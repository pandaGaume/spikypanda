import { ICartesian } from "../geometry";
import { Nullable } from "../types";
import { GraphItem } from "./graph.graphItem";
import { INode, IOlink } from "./graph.interfaces";

export class GraphNode extends GraphItem implements INode {
    protected _onsc: Nullable<IOlink[]>;
    protected _opsc: Nullable<IOlink[]>;

    public position?: ICartesian;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super();
        this._onsc = onsc;
        this._opsc = opsc;
        this.position = position;
    }

    public onsc<L extends IOlink>(): Nullable<Array<L>> {
        return this._onsc as Nullable<Array<L>>;
    }

    public opsc<L extends IOlink>(): Nullable<Array<L>> {
        return this._opsc as Nullable<Array<L>>;
    }
}
