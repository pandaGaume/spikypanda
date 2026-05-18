import type { IRuntimeNode, IPortDescriptor } from "../execution/execution.interfaces";

export interface INodeMeta {
    readonly type: string;
    readonly label: string;
    readonly category?: string;
    readonly inputPorts: ReadonlyArray<IPortDescriptor>;
    readonly outputPorts: ReadonlyArray<IPortDescriptor>;
    /** Optional control-plane ports the node exposes (default: _enable
     *  in / _enabled out via RuntimeNode; RunnableNode adds _start /
     *  _stop / _started / _stopped). The palette and editor read these
     *  to render control ports in a distinct row. */
    readonly controlInputPorts?:  ReadonlyArray<IPortDescriptor>;
    readonly controlOutputPorts?: ReadonlyArray<IPortDescriptor>;
    /** Interop standards this node complies with (e.g. "onnx", "tflite").
     *  The editor renders one badge per standard on the node and palette
     *  entry, and validators use them to decide whether a whole graph
     *  can be exported to a given format (it can if every node carries
     *  the target's badge). Empty/absent = no interop guarantee. */
    readonly standards?: ReadonlyArray<string>;
}

export type NodeFactory = (config?: Record<string, unknown>) => IRuntimeNode;

export interface INodeRegistry {
    register(type: string, factory: NodeFactory, meta: Omit<INodeMeta, "type">): void;
    unregister(type: string): boolean;
    create(type: string, config?: Record<string, unknown>): IRuntimeNode | undefined;
    meta(type: string): INodeMeta | undefined;
    types(): ReadonlyArray<string>;
}

export class NodeRegistry implements INodeRegistry {
    private readonly _factories = new Map<string, NodeFactory>();
    private readonly _meta = new Map<string, INodeMeta>();

    public register(type: string, factory: NodeFactory, meta: Omit<INodeMeta, "type">): void {
        this._factories.set(type, factory);
        this._meta.set(type, { ...meta, type });
    }

    public unregister(type: string): boolean {
        this._meta.delete(type);
        return this._factories.delete(type);
    }

    public create(type: string, config?: Record<string, unknown>): IRuntimeNode | undefined {
        return this._factories.get(type)?.(config);
    }

    public meta(type: string): INodeMeta | undefined {
        return this._meta.get(type);
    }

    public types(): ReadonlyArray<string> {
        return Array.from(this._factories.keys());
    }
}
