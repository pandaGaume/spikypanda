import { Nullable } from "../types";
import { GraphItem } from "./graph.graphItem";
import { INode, IOlink } from "./graph.interfaces";

export class GraphOLink extends GraphItem implements IOlink {
    private _oini: Nullable<INode>;
    public _ofin: Nullable<INode>;

    public constructor(oini?: INode, ofin?: INode) {
        super();
        this._oini = oini ?? null;
        if (this._oini) {
            this._oini.onsc().push(this);
        }
        this._ofin = ofin ?? null;
        if (this._ofin) {
            this._ofin.opsc().push(this);
        }
    }

    public get oini(): Nullable<INode> {
        return this._oini;
    }

    public set oini(n: Nullable<INode>) {
        if (this._oini != n) {
            if (this._oini) {
                const a = this._oini.onsc();
                a.splice(a.indexOf(this));
            }
            this._oini = n;
            if (this._oini) {
                this._oini.onsc().push(this);
            }
        }
    }

    public get ofin(): Nullable<INode> {
        return this._ofin;
    }

    public set ofin(n: Nullable<INode>) {
        if (this._ofin !== n) {
            if (this._ofin) {
                const a = this._ofin.opsc();
                a.splice(a.indexOf(this));
            }
            this._ofin = n;
            if (this._ofin) {
                this._ofin.opsc().push(this);
            }
        }
    }

    public dispose(): void {
        if (this._oini) {
            const tmp = this._oini.onsc();
            tmp.splice(tmp.indexOf(this));
        }
        if (this._ofin) {
            const tmp = this._ofin.opsc();
            tmp.splice(tmp.indexOf(this));
        }
        super.dispose();
    }
}
