import type { IKernelExecutionContext, INodeState, ISession, ITensor } from "spikypanda-core";
import { readTensor } from "spikypanda-core";
import { OnnxOpNode, OnnxOpRegistry } from "../registry";
import type { OnnxNodeInfo } from "../onnx-types";

/** A capability attached to native session state, never captured by topology nodes. */
export interface IComputeBackend {
    readonly id: string;
    /** Explicit upload; retain the returned tensor for resident weights and repeated execution. */
    upload(tensor: ITensor): ITensor | Promise<ITensor>;
    execute(operator: string, inputs: readonly ITensor[], info?: OnnxNodeInfo): Promise<ITensor[]>;
    dispose(): Promise<void>;
}
export interface IDeviceKernelState extends INodeState {
    computeBackend?: IComputeBackend;
}

export class DeviceOpNode extends OnnxOpNode {
    public readonly outputShapes: number[][] = [];
    public constructor(
        info: OnnxNodeInfo,
        public readonly backendId: string
    ) {
        super(info);
        this.descriptor = { ...info, attributes: new Map(info.attributes), listAttributes: new Map([...(info.listAttributes ?? [])].map(([key, value]) => [key, [...value]])) };
    }
    private readonly descriptor: OnnxNodeInfo;
    public createNodeState(): IDeviceKernelState {
        return { linksReady: 0 };
    }
    public execute(): ITensor[] {
        throw new Error("Device kernels require the native async runtime");
    }
    public async executeAsync(inputs: ITensor[], context?: IKernelExecutionContext): Promise<ITensor[]> {
        const backend = (context?.nodeState as IDeviceKernelState | undefined)?.computeBackend;
        if (!backend || backend.id !== this.backendId) throw new Error(`Backend ${this.backendId} is not attached to this session`);
        return backend.execute(this.descriptor.opType, inputs, this.descriptor);
    }
}

export class DeviceMatMulNode extends DeviceOpNode {}

/** Explicit transfer boundary. It can be connected with a native DataLink. */
export class TensorDownloadNode extends OnnxOpNode {
    public readonly outputShapes: number[][] = [];
    public execute(): ITensor[] {
        throw new Error("Download requires the native async runtime");
    }
    public async executeAsync(inputs: ITensor[]): Promise<ITensor[]> {
        if (inputs.length !== 1) throw new Error("Download requires one tensor");
        return [await readTensor(inputs[0])];
    }
}

export function registerDeviceMatMul(registry: OnnxOpRegistry, backendId: string, priority = 100): void {
    registry.register("MatMul", (info) => new DeviceMatMulNode(info, backendId), priority, backendId);
}

/** Attach the capability to this session's native node states. The caller owns its lifecycle. */
export function attachComputeBackend(session: ISession, backend: IComputeBackend): () => void {
    const states: IDeviceKernelState[] = [];
    for (const node of session.graph.nodes) {
        if (!(node instanceof DeviceOpNode) || node.backendId !== backend.id) continue;
        const state = session.nodeStateOf(node) as IDeviceKernelState | undefined;
        if (!state) throw new Error("Device kernel has no native session state");
        if (state.computeBackend && state.computeBackend !== backend) throw new Error("A backend is already attached; detach it first");
        states.push(state);
    }
    for (const state of states) state.computeBackend = backend;
    return () => {
        for (const state of states) if (state.computeBackend === backend) state.computeBackend = undefined;
    };
}

/** Local registry only. Unsupported operators retain their existing CPU implementation. */
export function registerDeviceOperators(registry: OnnxOpRegistry, backendId: string, operators: readonly string[], priority = 100): void {
    for (const operator of operators) registry.register(operator, (info) => new DeviceOpNode(info, backendId), priority, backendId);
}
