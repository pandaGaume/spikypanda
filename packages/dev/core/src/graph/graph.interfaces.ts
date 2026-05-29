import { ICartesian, isCartesian } from "../geometry/geometry.interfaces";
import { IDisposable, Nullable } from "../types";

export type { IDisposable };

export const CloneMetadataKey = Symbol.for("spikypanda.cloneable");

/// <summary>
/// Marks a property as cloneable for automatic deep copying
/// </summary>
export function cloneable(target: object, propertyKey: string | symbol): void {
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
export function IsCloneable<T>(obj: unknown): obj is ICloneable<T> {
    if (typeof obj !== "object" || obj === null) {
        return false;
    }
    const candidate = obj as Partial<ICloneable<T>>;
    return typeof candidate.clone === "function";
}

export interface ITaggable {
    withTag(tag: string): ITaggable;
    tag?: string;
}

export interface IIDentifiable {
    id?: any;
}

export interface IHasBag<T = unknown> {
    /**
     * Runtime-only container for execution context.
     * Can be safely overwritten between runs.
     */
    bag?: T;
}

/**
 * Toggleable runtime state. When enabled is false, the consumer (e.g.
 * the sim scheduler) treats the bearer as inert: skipped during
 * execution, ignored for dependency calculations. The bearer remains in
 * place so topology and identity are preserved.
 */
export interface IEnabled {
    enabled: boolean;
    /**
     * Opt-out flag for nodes whose `enabled` field is structurally
     * present (inherited from a base class) but semantically meaningless
     * to expose as a user-facing toggle. When `false`, editors omit the
     * enable checkbox / control row entry for this node. Absent or true
     * = the enable toggle is shown as usual. Lifecycle source nodes
     * (StartNode, StopNode) set this to false.
     */
    readonly supportsEnabling?: boolean;
}

/**
 * Type guard for IEnabled.
 */
export function isEnabled(obj: unknown): obj is IEnabled {
    if (typeof obj !== "object" || obj === null) {
        return false;
    }
    const candidate = obj as Partial<IEnabled>;
    return typeof candidate.enabled === "boolean";
}

/**
 * Returns true when the target wants the enable toggle exposed. The
 * default is true (absent or undefined `supportsEnabling` means yes);
 * explicit `false` is the opt-out for always-on nodes.
 */
export function supportsEnabling(target: object): boolean {
    return (target as Partial<IEnabled>).supportsEnabling !== false;
}

/**
 * Lifecycle states for an IRunnable model object. Transitions move
 * idle/stopped → starting → started → stopping → stopped, with failed
 * reachable from any starting/stopping transition on error.
 */
export type RunStatus = "idle" | "starting" | "started" | "stopping" | "stopped" | "failed";

/**
 * UI hint for IRunnable presentation. Editors map "play" to a green
 * start triangle and "record" to a pulsing red circle, with matching
 * tooltip vocabulary ("Start"/"Stop" vs "Record"/"Stop recording").
 * Absent or unrecognised values default to "play".
 */
export type RunnableAffordance = "play" | "record";

export const RunnableAffordanceMetadataKey = Symbol.for("spikypanda.runnableAffordance");

/**
 * Class decorator that tags an IRunnable implementation with a UI
 * affordance hint. The value is constant per class (every instance of
 * a recorder is a recorder), so the declaration lives at class scope:
 *
 *     @runnableAffordance("record")
 *     class DatasetCapture implements IRunnable { ... }
 *
 * Editors read the tag via getRunnableAffordance(); models without a
 * decorator (and without an inline affordance field) default to "play".
 */
export function runnableAffordance(value: RunnableAffordance): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(RunnableAffordanceMetadataKey, value, target);
    };
}

/**
 * Resolve the UI affordance of a runnable target. Instance fields take
 * precedence over class-level decorator metadata so ad-hoc data objects
 * can still override without subclassing. Unknown values fall back to
 * "play".
 */
export function getRunnableAffordance(target: object): RunnableAffordance {
    const inline = (target as Partial<IRunnable>).affordance;
    if (inline === "play" || inline === "record") {
        return inline;
    }
    const ctor = (target as { constructor?: new (...args: unknown[]) => unknown }).constructor;
    if (ctor) {
        const meta = Reflect.getMetadata(RunnableAffordanceMetadataKey, ctor);
        if (meta === "play" || meta === "record") {
            return meta;
        }
    }
    return "play";
}

/**
 * Lifecycle contract for a model object whose activity can be started
 * and stopped. start/stop may be sync or async; observers watch status
 * transitions through the bearer's onPropertyChanged (property name
 * "status").
 *
 * Distinct from the per-tick driver previously called IRunnable, which
 * was renamed to ITickable.
 */
export interface IRunnable {
    readonly status: RunStatus;
    /**
     * Optional inline override for the editor presentation hint.
     * Preferred declaration site is the @runnableAffordance class
     * decorator; this field is kept on the interface only for ad-hoc
     * data objects that have no class to decorate.
     */
    readonly affordance?: RunnableAffordance;
    start(): void | Promise<void>;
    stop(): void | Promise<void>;
}

/**
 * Type guard for IRunnable.
 */
export function isRunnable(obj: unknown): obj is IRunnable {
    if (typeof obj !== "object" || obj === null) {
        return false;
    }
    const candidate = obj as Partial<IRunnable>;
    return typeof candidate.status === "string" && typeof candidate.start === "function" && typeof candidate.stop === "function";
}

export interface IGraphItem<B = unknown> extends IDisposable, ICloneable, ITaggable, IIDentifiable, IHasBag<B> {}

export interface INode<B = unknown> extends IGraphItem<B> {
    position?: ICartesian;
    onsc<L extends IOlink>(): Array<L>;
    opsc<L extends IOlink>(): Array<L>;
}

// we define the INodeSet and ILinkSet interfaces to be able to use them to group nodes and links
// this is particularly useful when we want to perform operations on a group such Layers in Neural Networks
// or attach specific properties to a group of nodes or links.
export interface INodeSet<N extends INode> extends Array<N> {}

export interface IOlink<B = unknown> extends IGraphItem<B> {
    oini: Nullable<INode>;
    ofin: Nullable<INode>;
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
    if (typeof obj !== "object" || obj === null) {
        return false;
    }
    const candidate = obj as Partial<INode>;
    return (candidate.position === undefined || isCartesian(candidate.position)) && typeof candidate.onsc === "function" && typeof candidate.opsc === "function";
}

/**
 * Type guard for IOlink
 */
export function isOlink<L extends IOlink>(obj: unknown): obj is L {
    if (typeof obj !== "object" || obj === null) {
        return false;
    }
    const candidate = obj as Partial<IOlink>;
    return isNode(candidate.oini) && isNode(candidate.ofin);
}

/**
 * Type guard for IGraph
 */
export function isGraph<N extends INode, L extends IOlink>(obj: unknown): obj is IGraph<N, L> {
    if (!isNode<N>(obj)) {
        return false;
    }
    const candidate = obj as N & Partial<IGraph<N, L>>;
    return (
        Array.isArray(candidate.nodes) &&
        Array.isArray(candidate.links) &&
        Array.isArray(candidate.inputs) &&
        Array.isArray(candidate.outputs) &&
        candidate.nodes.every(isNode) &&
        candidate.links.every(isOlink) &&
        candidate.inputs.every(isNode) &&
        candidate.outputs.every(isNode)
    );
}
