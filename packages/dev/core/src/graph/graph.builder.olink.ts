import { IOlink, INode } from "./graph.interfaces";
import { ILinkBuilder, LinkConstructor } from "./graph.interfaces.builder";
import { GraphOLink } from "./graph.olink";

export class LinkBuilder implements ILinkBuilder {
    private _ctor: LinkConstructor<IOlink> = GraphOLink; // Default constructor
    private _from?: INode;
    private _to?: INode;

    public withType<T extends IOlink>(c: LinkConstructor<T>): ILinkBuilder {
        this._ctor = c;
        return this;
    }
    public withFrom(node: INode): ILinkBuilder {
        this._from = node;
        return this;
    }
    public withTo(node: INode): ILinkBuilder {
        this._to = node;
        return this;
    }

    public build(...args: any[]): IOlink {
        if (!this._from || !this._to) {
            throw new Error("From and To MUST be defined before building a link.");
        }
        const ctr = this._ctor ?? GraphOLink;
        return new ctr(this._from, this._to, ...args);
    }
    public reset(): ILinkBuilder {
        this._ctor = GraphOLink; // Reset to default constructor
        this._from = undefined;
        this._to = undefined;
        return this;
    }
}
