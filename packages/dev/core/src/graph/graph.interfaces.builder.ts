import { ICartesian } from "../geometry/geometry.interfaces";
import { Nullable, SingleOrArray } from "../types";
import { IGraph, INode, IOlink } from "./graph.interfaces";

export type LinkConstructor<T extends IOlink> = new (from: INode, to: INode, ...args: any[]) => T;

export interface ILinkBuilder {
    withType<T extends IOlink>(c: LinkConstructor<T>): ILinkBuilder;
    withFrom(node: INode): ILinkBuilder;
    withTo(node: INode): ILinkBuilder;
    build(...args: any[]): IOlink;
}

export type NodeConstructor<T extends INode> = new (onsc: Nullable<IOlink[]>, opsc: Nullable<IOlink[]>, position?: ICartesian, ...args: any[]) => T;

export interface INodeBuilder {
    withType<T extends INode>(c: NodeConstructor<T>): INodeBuilder;
    withPosition(p: ICartesian): INodeBuilder;
    withInputs(link: SingleOrArray<IOlink> | SingleOrArray<ILinkBuilder>): INodeBuilder;
    withOutputs(link: SingleOrArray<IOlink> | SingleOrArray<ILinkBuilder>): INodeBuilder;
    build(...args: any[]): INode;
}

export type GraphConstructor<N extends INode, L extends IOlink, T extends IGraph<N, L>> = new (
    nodes: N[],
    links: L[],
    inputs: Nullable<N[]>,
    outputs: Nullable<N[]>,
    onsc: Nullable<L[]>,
    opsc: Nullable<L[]>,
    position?: ICartesian,
    ...args: any[]
) => T;

export interface IGraphBuilder {
    withNodePosition(p: ICartesian): IGraphBuilder;
    withNodeInputs(link: SingleOrArray<IOlink> | SingleOrArray<ILinkBuilder>): IGraphBuilder;
    withNodeOutputs(link: SingleOrArray<IOlink> | SingleOrArray<ILinkBuilder>): IGraphBuilder;

    withType<N extends INode, L extends IOlink, T extends IGraph<N, L>>(c: GraphConstructor<N, L, T>): IGraphBuilder;
    withNodes(node: SingleOrArray<INode> | SingleOrArray<INodeBuilder>): IGraphBuilder;
    withLinks(link: SingleOrArray<IOlink> | SingleOrArray<ILinkBuilder>): IGraphBuilder;
    build<N extends INode, L extends IOlink>(...args: any[]): IGraph<N, L>;
}
