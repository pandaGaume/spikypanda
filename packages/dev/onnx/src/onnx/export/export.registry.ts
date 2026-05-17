// ═══════════════════════════════════════════════════════════════════════════
// ONNX export registry : maps kernel.nodeType (string) to its serializer.
//
// Each package that owns kernels exporting to ONNX exposes a
// `registerXxxOnnxSerializers(registry?)` function which adds entries
// here. Mirrors the import-side `OnnxOpRegistry` pattern (factory
// per op type) but for the export direction.
// ═══════════════════════════════════════════════════════════════════════════

import type { IKernel } from "spikypanda-core";
import type { KernelOnnxSerializer } from "./export.types";

export class OnnxExportRegistry {
    private readonly _serializers = new Map<string, KernelOnnxSerializer>();

    /**
     * Register a serializer for a kernel nodeType. The generic
     * parameter keeps the serializer typed; the registry stores it
     * as the unrefined function shape (the exporter casts back when
     * invoking).
     */
    public register<K extends IKernel>(nodeType: string, serializer: KernelOnnxSerializer<K>): this {
        this._serializers.set(nodeType, serializer as KernelOnnxSerializer);
        return this;
    }

    public has(nodeType: string): boolean {
        return this._serializers.has(nodeType);
    }

    public get(nodeType: string): KernelOnnxSerializer | undefined {
        return this._serializers.get(nodeType);
    }

    /**
     * Look up a serializer or throw with a helpful message when none
     * is registered for the requested nodeType.
     */
    public require(nodeType: string): KernelOnnxSerializer {
        const s = this._serializers.get(nodeType);
        if (!s) {
            throw new Error(`OnnxExportRegistry: no serializer registered for nodeType "${nodeType}". Registered: [${this.getRegistered().join(", ")}]`);
        }
        return s;
    }

    /** Sorted list of registered nodeType strings (for diagnostics). */
    public getRegistered(): string[] {
        return [...this._serializers.keys()].sort();
    }
}

/**
 * Module-level default registry. Applications can register on this
 * one, or pass their own instance to `OnnxGraphExporter.export` via
 * `options.registry`.
 */
export const onnxExportRegistry = new OnnxExportRegistry();
