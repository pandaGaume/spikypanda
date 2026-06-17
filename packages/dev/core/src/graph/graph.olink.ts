import { Nullable } from "../types";
import { GraphItem } from "./graph.graphItem";
import { INode, IOlink } from "./graph.interfaces";

export class GraphOLink<B = unknown> extends GraphItem<B> implements IOlink<B> {
    private _oini: Nullable<INode> = null;
    public _ofin: Nullable<INode> = null;

    public constructor(oini?: INode, ofin?: INode) {
        super();
        this.oini = oini ?? null;
        this.ofin = ofin ?? null;
    }

    public get oini(): Nullable<INode> {
        return this._oini;
    }

    public set oini(n: Nullable<INode>) {
        if (this._oini !== n) {
            this._oini?.remove(this);
            this._oini = n;
            this._oini?.add(this);
        }
    }

    public get ofin(): Nullable<INode> {
        return this._ofin;
    }

    public set ofin(n: Nullable<INode>) {
        if (this._ofin !== n) {
            this._ofin?.remove(this);
            this._ofin = n;
            this._ofin?.add(this);
        }
    }

    public dispose(): void {
        this._oini?.remove(this);
        this._ofin?.remove(this);
        super.dispose();
    }
}
