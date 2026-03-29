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

/**
 * Registry mapping ONNX opType strings to their compute implementations.
 */
export class OnnxOpRegistry {
    private readonly factories = new Map<string, OnnxOpFactory>();

    register(opType: string, factory: OnnxOpFactory): void {
        this.factories.set(opType, factory);
    }

    has(opType: string): boolean {
        return this.factories.has(opType);
    }

    create(nodeInfo: OnnxNodeInfo, initializers: Map<string, OnnxTensorInfo>): ComputeNodeBase {
        const factory = this.factories.get(nodeInfo.opType);
        if (!factory) {
            throw new Error(`No ONNX op implementation for: ${nodeInfo.opType}`);
        }
        return factory(nodeInfo, initializers);
    }

    getRegistered(): string[] {
        return [...this.factories.keys()].sort();
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
