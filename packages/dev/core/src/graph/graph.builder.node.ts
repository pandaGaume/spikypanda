import { ICartesian } from "../geometry";
import { Nullable, SingleOrArray } from "../types";
import { INode, IOlink, isOlink } from "./graph.interfaces";
import { ILinkBuilder, INodeBuilder, NodeConstructor } from "./graph.interfaces.builder";
import { GraphNode } from "./graph.node";

export class GraphNodeBuilder implements INodeBuilder {
    /**
     * Helper function to normalize SingleOrArray inputs and convert builders if necessary.
     */
    public static ResolveLinksOrNodes<T, B>(items: SingleOrArray<T | B>, isType: (item: T | B) => item is T): T[] {
        return (Array.isArray(items) ? items : [items]).map((item) => (isType(item) ? item : (item as any).build()));
    }

    private _ctor: NodeConstructor<INode> = GraphNode; // Default constructor
    private _position?: ICartesian;
    private _inputs: Nullable<Array<IOlink>> = null;
    private _outputs: Nullable<Array<IOlink>> = null;

    public withType<T extends INode>(ctor: NodeConstructor<T>): INodeBuilder {
        this._ctor = ctor;
        return this;
    }

    public withPosition(p: ICartesian): INodeBuilder {
        this._position = p;
        return this;
    }

    public withInputs(link: SingleOrArray<IOlink> | SingleOrArray<ILinkBuilder>): INodeBuilder {
        this._inputs = this._inputs ?? [];
        this._inputs.push(...GraphNodeBuilder.ResolveLinksOrNodes(link, isOlink<IOlink>));
        return this;
    }

    public withOutputs(link: SingleOrArray<IOlink> | SingleOrArray<ILinkBuilder>): INodeBuilder {
        this._outputs = this._outputs ?? [];
        this._outputs.push(...GraphNodeBuilder.ResolveLinksOrNodes(link, isOlink<IOlink>));
        return this;
    }

    public build(...args: any[]): INode {
        const ctr = this._ctor ?? GraphNode;
        return new ctr(this._inputs, this._outputs, this._position, ...args);
    }

    public reset(): INodeBuilder {
        this._ctor = GraphNode; // Reset to default constructor
        this._position = undefined;
        this._inputs = null;
        this._outputs = null;
        return this;
    }
}
