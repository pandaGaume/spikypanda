import { ICartesian, isCartesian } from "../geometry/geometry.interfaces";

export const CloneMetadataKey = Symbol("cloneable");

/// <summary>
/// Marks a property as cloneable for automatic deep copying
/// </summary>
export function cloneable(target: Object, propertyKey: string | symbol): void {
    const proto = target.constructor.prototype;
    const existingProps: string[] = Reflect.getMetadata(CloneMetadataKey, proto) || [];
    Reflect.defineMetadata(CloneMetadataKey, [...existingProps, propertyKey], proto);
}

/// <summary>
/// Interface for cloneable objects
/// </summary>
export interface ICloneable<T = any> {
    clone(): T;
}

/// <summary>
/// Type guard to check if an object implements ICloneable
/// </summary>
export function IsCloneable<T = any>(obj: unknown): obj is ICloneable<T> {
    return typeof obj === "object" && obj !== null && typeof (obj as any).clone === "function";
}

export interface IDisposable {
    dispose(): void;
}

export interface IGraphItem extends IDisposable, ICloneable {}

export interface INode extends IGraphItem {
    position?: ICartesian;
    onsc<L extends IOlink>(): Array<L>;
    opsc<L extends IOlink>(): Array<L>;
}

// we define the INodeSet and ILinkSet interfaces to be able to use them to group nodes and links
// this is particularly useful when we want to perform operations on a group such Layers in Neural Networks
// or attach specific properties to a group of nodes or links.
export interface INodeSet<N extends INode> extends Array<N> {}

export interface IOlink extends IGraphItem {
    oini: INode;
    ofin: INode;
}

export interface ILinkSet<L extends IOlink> extends Array<L> {}

export interface IGraph<N extends INode, L extends IOlink> extends INode {
    nodes: INodeSet<N>;
    links: ILinkSet<L>;
    inputs: INodeSet<N>;
    outputs: INodeSet<N>;
    hiddens: INodeSet<N>;
}

/**
 * Type guard for INode
 */
export function isNode<N extends INode>(obj: unknown): obj is N {
    return (
        typeof obj === "object" &&
        obj !== null &&
        ("position" in obj ? obj.position === undefined || isCartesian(obj.position) : true) && // Ensure position is undefined or ICartesian3
        "onsc" in obj &&
        "opsc" in obj
    );
}
/**
 * Type guard for IOlink
 */
export function isOlink<L extends IOlink>(obj: unknown): obj is L {
    return typeof obj === "object" && obj !== null && "oini" in obj && "ofin" in obj && isNode((obj as IOlink).oini) && isNode((obj as IOlink).ofin);
}

/**
 * Type guard for IGraph
 */
export function isGraph<N extends INode, L extends IOlink>(obj: unknown): obj is IGraph<N, L> {
    return (
        isNode(obj) &&
        "nodes" in obj &&
        "links" in obj &&
        "inputs" in obj &&
        "outputs" in obj &&
        Array.isArray((obj as IGraph<N, L>).nodes) &&
        Array.isArray((obj as IGraph<N, L>).links) &&
        Array.isArray((obj as IGraph<N, L>).inputs) &&
        Array.isArray((obj as IGraph<N, L>).outputs) &&
        (obj as IGraph<N, L>).nodes.every(isNode) &&
        (obj as IGraph<N, L>).links.every(isOlink) &&
        (obj as IGraph<N, L>).inputs.every(isNode) &&
        (obj as IGraph<N, L>).outputs.every(isNode)
    );
}
