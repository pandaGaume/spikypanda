import { ICartesian } from "../geometry";
import { Nullable } from "../types";
import { IGraph, INode, IOlink } from "./graph.interfaces";
import { GraphNode } from "./graph.node";

export class Graph<N extends INode, L extends IOlink> extends GraphNode implements IGraph<N, L> {
    public nodes: N[];
    public links: L[];
    public inputs: N[];
    public outputs: N[];
    public hiddens: N[];

    public constructor(
        nodes: N[] = [],
        links: L[] = [],
        inputs: Nullable<N[]> = null,
        outputs: Nullable<N[]> = null,
        onsc: Nullable<L[]> = null,
        opsc: Nullable<L[]> = null,
        position?: ICartesian
    ) {
        super(onsc, opsc, position); // Pass `position` to `GraphNode`
        this.nodes = nodes;
        this.links = links;
        this.inputs = inputs ?? this.nodes.filter((n) => !n.opsc || n.opsc.length === 0);
        this.outputs = outputs ?? this.nodes.filter((n) => !n.onsc || n.onsc.length === 0);
        this.hiddens = this.nodes.filter((n) => !this.inputs.includes(n) && !this.outputs.includes(n));
    }

    public clone(): any {
        var copy = super.clone();
        copy.nodes = this.nodes.map((n) => n.clone());
        copy.links = this.links.map((n) => n.clone());
        copy.inputs = this.nodes.filter((n) => !n.opsc || n.opsc.length === 0);
        copy.outputs = this.nodes.filter((n) => !n.onsc || n.onsc.length === 0);
        copy.hiddens = this.nodes.filter((n) => !this.inputs.includes(n) && !this.outputs.includes(n));
    }
}
