import { ICartesian } from "../geometry";
import { Nullable, SingleOrArray } from "../types";
import { GraphNodeBuilder } from "./graph.builder.node";
import { Graph } from "./graph.graph";
import { IGraph, INode, IOlink, isNode, isOlink } from "./graph.interfaces";
import { GraphConstructor, IGraphBuilder, ILinkBuilder, INodeBuilder } from "./graph.interfaces.builder";

export class GraphBuilder<N extends INode, L extends IOlink> implements IGraphBuilder<N, L> {
    private _position?: ICartesian;
    private _inputs: Nullable<Array<L>> = null;
    private _outputs: Nullable<Array<L>> = null;
    private _ctor: GraphConstructor<any, any, any> = Graph; // Default constructor
    private _nodes: N[] = [];
    private _links: L[] = [];

    /**
     * Set the graph type to construct.
     */
    public withType<T extends IGraph<N, L>>(c: GraphConstructor<N, L, T>): IGraphBuilder<N, L> {
        this._ctor = c;
        return this;
    }

    /**
     * Set the node position. The graph is assumed to being a node through inheritance.
     */
    public withNodePosition(p: ICartesian): IGraphBuilder<N, L> {
        this._position = p;
        return this;
    }

    /**
     * Set input links.The graph is assumed to being a node through inheritance.
     */
    public withNodeInputs(link: SingleOrArray<L> | SingleOrArray<ILinkBuilder>): IGraphBuilder<N, L> {
        this._inputs = this._inputs ?? [];
        this._inputs.push(...GraphNodeBuilder.ResolveLinksOrNodes(link, isOlink<L>));
        return this;
    }

    /**
     * Set output links.The graph is assumed to being a node through inheritance.
     */
    public withNodeOutputs(link: SingleOrArray<L> | SingleOrArray<ILinkBuilder>): IGraphBuilder<N, L> {
        this._outputs = this._outputs ?? [];
        this._outputs.push(...GraphNodeBuilder.ResolveLinksOrNodes(link, isOlink<L>));
        return this;
    }

    /**
     * Add nodes to the graph.
     */
    public withNodes(nodes: SingleOrArray<N> | SingleOrArray<INodeBuilder>): IGraphBuilder<N, L> {
        this._nodes.push(...GraphNodeBuilder.ResolveLinksOrNodes(nodes, isNode<N>));
        return this;
    }

    /**
     * Add links to the graph.
     */
    public withLinks(link: SingleOrArray<L> | SingleOrArray<ILinkBuilder>): IGraphBuilder<N, L> {
        this._links.push(...GraphNodeBuilder.ResolveLinksOrNodes(link, isOlink<L>));
        return this;
    }

    /**
     * Build and return the graph.
     */
    public build<T extends IGraph<N, L>>(...args: any[]): Nullable<T> {
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
