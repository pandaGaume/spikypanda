import { Kernel, ITensor } from "spikypanda-core";
import type { IDeclaresPorts, IPortDescriptor } from "spikypanda-core";
import { OnnxDataType } from "./onnx-types";
import type { OnnxNodeInfo, OnnxTensorInfo } from "./onnx-types";

/**
 * Factory function that creates a Kernel from an ONNX node definition.
 */
export type OnnxOpFactory = (nodeInfo: OnnxNodeInfo, initializers: Map<string, OnnxTensorInfo>) => Kernel;

export interface OnnxOpEntry {
    factory: OnnxOpFactory;
    priority: number;
    backend: string;
}

/**
 * Default priority levels.
 */
export const PRIORITY_GENERIC = 0;
export const PRIORITY_NATIVE = 100;

/**
 * Registry mapping ONNX opType strings to their compute implementations.
 * Supports priority-based registration: higher priority wins.
 * Multiple backends can register for the same op — highest priority is used.
 */
export class OnnxOpRegistry {
    private readonly entries = new Map<string, OnnxOpEntry[]>();

    /**
     * Register an op implementation.
     * @param opType   ONNX operator type (e.g. "Conv", "LSTM")
     * @param factory  Factory function
     * @param priority Higher priority wins (default: PRIORITY_GENERIC = 0)
     * @param backend  Label for the implementation source (e.g. "generic", "spikypanda")
     */
    register(opType: string, factory: OnnxOpFactory, priority = PRIORITY_GENERIC, backend = "generic"): void {
        let list = this.entries.get(opType);
        if (!list) {
            list = [];
            this.entries.set(opType, list);
        }
        list.push({ factory, priority, backend });
        list.sort((a, b) => b.priority - a.priority);
    }

    has(opType: string): boolean {
        return this.entries.has(opType);
    }

    /**
     * Qualified lookup key for a node: `domain.opType`, or plain `opType`
     * in the default ONNX domain.
     *
     * This is what lets both spellings of a custom op resolve to the same
     * entry. A node declared the standard way (domain "ai.cyanmycelium",
     * opType "ConvWIO") and one whose domain is baked into its opType
     * string ("ai.cyanmycelium.ConvWIO", no domain field) produce the
     * same key, so a single registration serves both.
     *
     * It also closes a trap: without it, a node in a custom domain whose
     * opType collides with a standard op would silently resolve to the
     * standard implementation.
     */
    static qualify(opType: string, domain?: string): string {
        return domain && domain.length > 0 && domain !== "ai.onnx" ? `${domain}.${opType}` : opType;
    }

    /**
     * Create a node using the highest-priority factory.
     */
    create(nodeInfo: OnnxNodeInfo, initializers: Map<string, OnnxTensorInfo>): Kernel {
        const key = OnnxOpRegistry.qualify(nodeInfo.opType, nodeInfo.domain);
        const list = this.entries.get(key);
        if (!list || list.length === 0) {
            throw new Error(`No ONNX op implementation for: ${key}`);
        }
        return list[0].factory(nodeInfo, initializers);
    }

    /**
     * Get info about the active (highest-priority) implementation for an op.
     */
    getActiveBackend(opType: string): string | undefined {
        const list = this.entries.get(opType);
        return list && list.length > 0 ? list[0].backend : undefined;
    }

    /**
     * Get all registered backends for an op, sorted by priority (highest first).
     */
    getBackends(opType: string): { backend: string; priority: number }[] {
        const list = this.entries.get(opType);
        return list ? list.map((e) => ({ backend: e.backend, priority: e.priority })) : [];
    }

    getRegistered(): string[] {
        return [...this.entries.keys()].sort();
    }

    /**
     * Summary: for each op, which backend is active.
     */
    summary(): { opType: string; backend: string; priority: number; alternatives: number }[] {
        const result: { opType: string; backend: string; priority: number; alternatives: number }[] = [];
        for (const [opType, list] of this.entries) {
            result.push({
                opType,
                backend: list[0].backend,
                priority: list[0].priority,
                alternatives: list.length - 1,
            });
        }
        return result.sort((a, b) => a.opType.localeCompare(b.opType));
    }
}

/**
 * Base class for ONNX op nodes. Provides attribute access helpers and a
 * default IDeclaresPorts implementation derived from the parsed nodeInfo
 * (one port per declared input/output tensor name, positional slot
 * indices). Subclasses that need per-op port refinement (optional B in
 * Conv, etc.) override _buildInputPorts/_buildOutputPorts.
 */
export abstract class OnnxOpNode extends Kernel implements IDeclaresPorts {
    readonly opType: string;
    protected readonly attributes: Map<string, number>;
    protected readonly tensorAttributes: Map<string, OnnxTensorInfo>;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor>;
    public readonly outputPorts: ReadonlyArray<IPortDescriptor>;

    constructor(nodeInfo: OnnxNodeInfo) {
        super();
        this.opType = nodeInfo.opType;
        this.attributes = nodeInfo.attributes;
        this.tensorAttributes = nodeInfo.tensorAttributes ?? new Map();
        this.inputPorts = this._buildInputPorts(nodeInfo);
        this.outputPorts = this._buildOutputPorts(nodeInfo);
    }

    get nodeType(): string {
        return `onnx_${this.opType.toLowerCase()}`;
    }

    /**
     * Build the input port descriptors. Default: one mandatory tensor
     * port per declared input tensor, positional slot. Subclasses
     * override to mark specific inputs optional (e.g. Conv.B) or to
     * refine the type label.
     */
    protected _buildInputPorts(nodeInfo: OnnxNodeInfo): ReadonlyArray<IPortDescriptor> {
        return nodeInfo.inputs.map((_, i) => ({
            slot: i,
            optional: false,
            type: "tensor",
        }));
    }

    protected _buildOutputPorts(nodeInfo: OnnxNodeInfo): ReadonlyArray<IPortDescriptor> {
        return nodeInfo.outputs.map((_, i) => ({
            slot: i,
            optional: false,
            type: "tensor",
        }));
    }

    protected attr(name: string, defaultVal: number): number {
        return this.attributes.get(name) ?? defaultVal;
    }

    protected attrInt(name: string, defaultVal: number): number {
        return Math.round(this.attributes.get(name) ?? defaultVal);
    }

    protected attrTensor(name: string): OnnxTensorInfo | undefined {
        return this.tensorAttributes.get(name);
    }
}

/**
 * Helper: get initializer as Float32Array, handling rawData conversion.
 */
export function getInitializerData(init: OnnxTensorInfo): Float32Array {
    if (init.floatData && init.floatData.length > 0) {
        return init.floatData;
    }
    if (init.rawData && init.rawData.length > 0) {
        const raw = init.rawData;
        const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
        switch (init.dataType) {
            case OnnxDataType.INT64: {
                const count = raw.byteLength / 8;
                const out = new Float32Array(count);
                for (let i = 0; i < count; i++) {
                    // Read as int64 (low 32 bits sufficient for typical attribute values).
                    out[i] = Number(view.getBigInt64(i * 8, true));
                }
                return out;
            }
            case OnnxDataType.INT32: {
                const count = raw.byteLength / 4;
                const out = new Float32Array(count);
                for (let i = 0; i < count; i++) out[i] = view.getInt32(i * 4, true);
                return out;
            }
            case OnnxDataType.INT8: {
                const out = new Float32Array(raw.byteLength);
                // Reinterpret unsigned bytes as signed int8.
                const signed = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
                for (let i = 0; i < signed.length; i++) out[i] = signed[i];
                return out;
            }
            case OnnxDataType.UINT8: {
                const out = new Float32Array(raw.byteLength);
                for (let i = 0; i < raw.byteLength; i++) out[i] = raw[i];
                return out;
            }
            case OnnxDataType.FLOAT:
            default:
                return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
        }
    }
    return new Float32Array(0);
}

/**
 * Helper: compute total element count from shape.
 */
export function shapeSize(shape: number[]): number {
    let s = 1;
    for (const d of shape) s *= d;
    return s;
}

/**
 * Helper: create an ITensor.
 */
export function makeTensor(data: Float32Array, shape: number[], name?: string): ITensor {
    return { data, shape, name };
}
