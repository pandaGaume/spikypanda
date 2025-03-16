import { ICartesian } from "../geometry";
import { Nullable, SingleOrArray } from "../types";
import { GraphNodeBuilder } from "./graph.builder.node";
import { Graph } from "./graph.graph";
import { IGraph, INode, IOlink, isNode, isOlink } from "./graph.interfaces";
import { GraphConstructor, IGraphBuilder, ILinkBuilder, INodeBuilder } from "./graph.interfaces.builder";

export class GraphBuilder implements IGraphBuilder {
    private _position?: ICartesian;
    private _inputs: Nullable<Array<IOlink>> = null;
    private _outputs: Nullable<Array<IOlink>> = null;
    private _ctor: GraphConstructor<any, any, any> = Graph; // Default constructor
    private _nodes: INode[] = [];
    private _links: IOlink[] = [];

    /**
     * Set the graph type to construct.
     */
    public withType<N extends INode, L extends IOlink, T extends IGraph<N, L>>(c: GraphConstructor<N, L, T>): IGraphBuilder {
        this._ctor = c;
        return this;
    }

    /**
     * Set the node position.
     */
    public withNodePosition(p: ICartesian): IGraphBuilder {
        this._position = p;
        return this;
    }

    /**
     * Set input links.
     */
    public withNodeInputs(link: SingleOrArray<IOlink> | SingleOrArray<ILinkBuilder>): IGraphBuilder {
        this._inputs = this._inputs ?? [];
        this._inputs.push(...GraphNodeBuilder.ResolveLinksOrNodes(link, isOlink));
        return this;
    }

    /**
     * Set output links.
     */
    public withNodeOutputs(link: SingleOrArray<IOlink> | SingleOrArray<ILinkBuilder>): IGraphBuilder {
        this._outputs = this._outputs ?? [];
        this._outputs.push(...GraphNodeBuilder.ResolveLinksOrNodes(link, isOlink));
        return this;
    }

    /**
     * Add nodes to the graph.
     */
    public withNodes(nodes: SingleOrArray<INode> | SingleOrArray<INodeBuilder>): IGraphBuilder {
        this._nodes.push(...GraphNodeBuilder.ResolveLinksOrNodes(nodes, isNode));
        return this;
    }

    /**
     * Add links to the graph.
     */
    public withLinks(link: SingleOrArray<IOlink> | SingleOrArray<ILinkBuilder>): IGraphBuilder {
        this._links.push(...GraphNodeBuilder.ResolveLinksOrNodes(link, isOlink));
        return this;
    }

    /**
     * Build and return the graph.
     */
    public build<N extends INode, L extends IOlink, T extends IGraph<N, L>>(...args: any[]): T {
        const ctr = (this._ctor as GraphConstructor<N, L, IGraph<N, L>>) ?? Graph;
        return new ctr(
            this._nodes as N[],
            this._links as L[],
            null,
            null,
            this._inputs ? ([...this._inputs] as L[]) : null,
            this._outputs ? ([...this._outputs] as L[]) : null,
            this._position,
            ...args
        ) as T;
    }
}
