import { ComputeNodeBase } from "../compute/compute.node.base";
import type { ITensor } from "../compute/compute.interfaces";
import type { OnnxNodeInfo, OnnxTensorInfo } from "./onnx-types";

/**
 * Factory function that creates a ComputeNodeBase from an ONNX node definition.
 */
export type OnnxOpFactory = (
    nodeInfo: OnnxNodeInfo,
    initializers: Map<string, OnnxTensorInfo>,
) => ComputeNodeBase;

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
     * Create a node using the highest-priority factory.
     */
    create(nodeInfo: OnnxNodeInfo, initializers: Map<string, OnnxTensorInfo>): ComputeNodeBase {
        const list = this.entries.get(nodeInfo.opType);
        if (!list || list.length === 0) {
            throw new Error(`No ONNX op implementation for: ${nodeInfo.opType}`);
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
 * Base class for ONNX op nodes. Provides attribute access helpers.
 */
export abstract class OnnxOpNode extends ComputeNodeBase {
    readonly opType: string;
    protected readonly attributes: Map<string, number>;

    constructor(nodeInfo: OnnxNodeInfo) {
        super();
        this.opType = nodeInfo.opType;
        this.attributes = nodeInfo.attributes;
    }

    get nodeType(): string {
        return `onnx_${this.opType.toLowerCase()}`;
    }

    protected attr(name: string, defaultVal: number): number {
        return this.attributes.get(name) ?? defaultVal;
    }

    protected attrInt(name: string, defaultVal: number): number {
        return Math.round(this.attributes.get(name) ?? defaultVal);
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
        return new Float32Array(init.rawData.buffer, init.rawData.byteOffset, init.rawData.byteLength / 4);
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
