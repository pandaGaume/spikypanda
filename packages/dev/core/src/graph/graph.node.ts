import type { ICartesian } from "../geometry";
import { Nullable } from "../types";
import { GraphItem } from "./graph.graphItem";
import { cloneable, INode, IOlink } from "./graph.interfaces";

export class GraphNode<B = unknown> extends GraphItem<B> implements INode<B> {
    protected _onsc: IOlink[];
    protected _opsc: IOlink[];

    @cloneable public position?: ICartesian;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super();
        this._onsc = onsc ?? [];
        this._opsc = opsc ?? [];
        this.position = position;
        for (const link of this._onsc) {
            this.nscAdded(link);
        }
        for (const link of this._opsc) {
            this.pscAdded(link);
        }
    }

    public onsc<L extends IOlink>(): Array<L> {
        return this._onsc as Array<L>;
    }

    public opsc<L extends IOlink>(): Array<L> {
        return this._opsc as Array<L>;
    }

    public add<L extends IOlink>(...links: Array<L>): void {
        if (links.length === 0) {
            return;
        }
        for (const link of links) {
            if (link.oini === this) {
                const a = this._onsc;
                const i = a.indexOf(link);
                if (i >= 0) {
                    continue;
                }
                this._onsc.push(link);
                this.nscAdded(link);
            } else if (link.ofin === this) {
                const a = this._opsc;
                const i = a.indexOf(link);
                if (i >= 0) {
                    continue;
                }
                this._opsc.push(link);
                this.pscAdded(link);
            }
        }
    }

    public remove<L extends IOlink>(...links: Array<L>): void {
        if (links.length === 0) {
            return;
        }
        for (const link of links) {
            if (link.oini === this) {
                const a = this._onsc;
                const i = a.indexOf(link);
                if (i >= 0) {
                    a.splice(i, 1);
                    this.nscRemoved(link);
                }
            } else if (link.ofin === this) {
                const a = this._opsc;
                const i = a.indexOf(link);
                if (i >= 0) {
                    a.splice(i, 1);
                    this.pscRemoved(link);
                }
            }
        }
    }

    protected nscAdded<L extends IOlink>(..._links: Array<L>): void {}
    protected nscRemoved<L extends IOlink>(..._links: Array<L>): void {}
    protected pscAdded<L extends IOlink>(..._links: Array<L>): void {}
    protected pscRemoved<L extends IOlink>(..._links: Array<L>): void {}
}
