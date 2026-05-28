// ═══════════════════════════════════════════════════════════════════════════
// OnnxGraphExporter : main entry point for ComputeGraph → ONNX bytes.
//
// Walks the kernel graph in topological order, assigns ONNX tensor
// names to data links + boundary inputs/outputs, looks up each
// kernel's serializer in the registry, accumulates nodes and
// initializers, then serializes via OnnxWriter.
// ═══════════════════════════════════════════════════════════════════════════

import type { IComputeGraph, IDataLink, IKernel } from "spikypanda-core";
import { OnnxDataType, OnnxLinkType } from "../onnx-types";
import type { OnnxParseResult } from "../onnx-parser";
import type { OnnxValueInfo } from "../onnx-types";
import { OnnxWriter } from "../onnx-writer";
import { DefaultOnnxExportContext } from "./export.context";
import { OnnxExportRegistry, onnxExportRegistry } from "./export.registry";
import type { OnnxKernelNaming } from "./export.types";

// ─── Options ─────────────────────────────────────────────────────────────

export interface OnnxExportOptions {
    /** Registry to look up serializers. Defaults to module-level. */
    registry?: OnnxExportRegistry;

    /** Graph name embedded in the ONNX model. */
    graphName?: string;

    /** ONNX IR version. Defaults to 8. */
    irVersion?: number;

    /**
     * Per-input-kernel virtual input names. An "input kernel" is a
     * kernel with no incoming data link inside the export graph; the
     * tensors it consumes come from outside (the graph's public
     * inputs). One name per virtual input slot; defaults to
     * `input_<idx>`.
     */
    inputNames?: Map<IKernel, string[]>;

    /** Optional shapes for the graph inputs (matches inputNames). */
    inputShapes?: Map<IKernel, number[][]>;

    /**
     * Per-output-kernel virtual output names. An "output kernel" is
     * a kernel with no outgoing data link; its outputs become graph
     * outputs. One name per output slot; defaults to
     * `output_<idx>`.
     */
    outputNames?: Map<IKernel, string[]>;

    /** Optional shapes for the graph outputs (matches outputNames). */
    outputShapes?: Map<IKernel, number[][]>;
}

// ─── Per-kernel internal scratchpad ──────────────────────────────────────

interface KernelMeta {
    idx: number; // position in graph.nodes
    id: string; // kernel.id or auto-generated
    outputCount: number; // number of distinct output tensors
    outputNames: string[]; // ONNX tensor name per output slot
    isInput: boolean; // empty opsc
    isOutput: boolean; // empty onsc
}

// ─── Exporter ─────────────────────────────────────────────────────────────

export class OnnxGraphExporter {
    /**
     * Export a compute graph to ONNX protobuf bytes.
     *
     * The graph's nodes must all have a serializer registered for
     * their `nodeType`; the exporter throws otherwise. Side-effects:
     * none — pure function of (graph, options, registry).
     */
    public static export(graph: IComputeGraph, options: OnnxExportOptions = {}): Uint8Array {
        const registry = options.registry ?? onnxExportRegistry;
        const ctx = new DefaultOnnxExportContext();

        // 1. Topological sort.
        const ordered = OnnxGraphExporter._topoSort(graph);

        // 2. Per-kernel metadata + output-tensor naming.
        const kernelMeta = OnnxGraphExporter._buildKernelMeta(ordered, options);

        // 3. Per-link naming (source kernel's output slot → tensor name).
        const linkNames = OnnxGraphExporter._buildLinkNames(graph, kernelMeta);

        // 4. Boundary inputs / outputs (OnnxValueInfo). Computed
        //    alongside the per-kernel naming used for serializers.
        const graphInputs: OnnxValueInfo[] = [];
        const graphOutputs: OnnxValueInfo[] = [];

        // 5. Walk in topo order; invoke serializer per kernel.
        for (const kernel of ordered) {
            const meta = kernelMeta.get(kernel)!;
            const serializer = registry.require(kernel.nodeType);
            const naming = OnnxGraphExporter._namingFor(kernel, meta, linkNames, options, graphInputs);
            ctx.setNamingScope(meta.id);
            serializer(kernel, naming, ctx);

            if (meta.isOutput) {
                OnnxGraphExporter._collectGraphOutputs(kernel, meta, options, graphOutputs);
            }
        }

        // 6. Assemble OnnxParseResult and serialize.
        const result: OnnxParseResult = {
            irVersion: options.irVersion ?? 8,
            graphName: options.graphName ?? "exported-graph",
            nodes: ctx.nodes,
            initializers: ctx.initializers,
            inputs: graphInputs,
            outputs: graphOutputs,
            valueInfos: [],
        };
        return OnnxWriter.serialize(result);
    }

    // ── 1. Topological sort (Kahn) ────────────────────────────────────

    private static _topoSort(graph: IComputeGraph): IKernel[] {
        const nodes = graph.nodes as ReadonlyArray<IKernel>;
        const remaining = new Map<IKernel, number>();
        for (const n of nodes) {
            remaining.set(n, n.opsc<IDataLink>().length);
        }
        const queue: IKernel[] = [];
        for (const [n, c] of remaining) {
            if (c === 0) queue.push(n);
        }
        const order: IKernel[] = [];
        while (queue.length > 0) {
            const n = queue.shift()!;
            order.push(n);
            for (const link of n.onsc<IDataLink>()) {
                const dst = link.ofin as IKernel | null;
                if (!dst) continue;
                const c = (remaining.get(dst) ?? 0) - 1;
                remaining.set(dst, c);
                if (c === 0) queue.push(dst);
            }
        }
        if (order.length !== nodes.length) {
            throw new Error(`OnnxGraphExporter: cycle detected in compute graph (visited ${order.length}/${nodes.length} kernels)`);
        }
        return order;
    }

    // ── 2. Kernel metadata + output-tensor naming ─────────────────────

    private static _buildKernelMeta(ordered: IKernel[], options: OnnxExportOptions): Map<IKernel, KernelMeta> {
        const meta = new Map<IKernel, KernelMeta>();
        ordered.forEach((k, idx) => {
            const id = OnnxGraphExporter._kernelIdentifier(k, idx);
            const outputCount = Math.max(1, k.outputShapes?.length ?? 1);
            const isInput = k.opsc<IDataLink>().length === 0;
            const isOutput = k.onsc<IDataLink>().length === 0;
            const supplied = options.outputNames?.get(k);
            const outputNames: string[] = [];
            for (let i = 0; i < outputCount; i++) {
                if (isOutput) {
                    outputNames.push(supplied?.[i] ?? `output_${idx}${outputCount > 1 ? `_${i}` : ""}`);
                } else {
                    outputNames.push(`${id}_out_${i}`);
                }
            }
            meta.set(k, { idx, id, outputCount, outputNames, isInput, isOutput });
        });
        return meta;
    }

    private static _kernelIdentifier(k: IKernel, idx: number): string {
        const raw = (k as { id?: unknown }).id;
        if (typeof raw === "string" && raw.length > 0) {
            return raw.replace(/[^A-Za-z0-9_]/g, "_");
        }
        return `k${idx}`;
    }

    // ── 3. Link naming ────────────────────────────────────────────────

    private static _buildLinkNames(graph: IComputeGraph, kernelMeta: Map<IKernel, KernelMeta>): Map<IDataLink, string> {
        const linkNames = new Map<IDataLink, string>();
        for (const link of graph.links as ReadonlyArray<IDataLink>) {
            const src = link.oini as IKernel | null;
            if (!src) continue;
            const info = kernelMeta.get(src);
            if (!info) continue;
            // Determine which output slot of the source feeds this link.
            // With outputCount === 1, all outgoing links share output 0
            // (broadcast semantics matching Kernel._publishOutputs).
            // Otherwise the i-th outgoing link gets output i.
            const slotIdx = src.onsc<IDataLink>().indexOf(link);
            const outSlot = info.outputCount === 1 ? 0 : Math.min(slotIdx, info.outputCount - 1);
            linkNames.set(link, info.outputNames[outSlot]);
        }
        return linkNames;
    }

    // ── 4. Per-kernel naming for serializer call ──────────────────────

    private static _namingFor(kernel: IKernel, meta: KernelMeta, linkNames: Map<IDataLink, string>, options: OnnxExportOptions, graphInputs: OnnxValueInfo[]): OnnxKernelNaming {
        // Input names from incoming links (slot-sorted when numeric).
        const incoming = kernel.opsc<IDataLink>();
        const sorted = [...incoming].sort((a, b) => {
            const sa = typeof a.slot === "number" ? a.slot : Number.MAX_SAFE_INTEGER;
            const sb = typeof b.slot === "number" ? b.slot : Number.MAX_SAFE_INTEGER;
            return sa - sb;
        });
        const inputNames: string[] = sorted.map((l) => linkNames.get(l)).filter((n): n is string => n !== undefined);

        // Boundary inputs: virtual names for input kernels.
        if (meta.isInput) {
            const supplied = options.inputNames?.get(kernel);
            const virtualCount = supplied?.length ?? 1;
            const suppliedShapes = options.inputShapes?.get(kernel);
            for (let i = 0; i < virtualCount; i++) {
                const name = supplied?.[i] ?? `input_${meta.idx}${virtualCount > 1 ? `_${i}` : ""}`;
                inputNames.push(name);
                graphInputs.push({
                    name,
                    type: OnnxLinkType.INPUT,
                    elemType: OnnxDataType.FLOAT,
                    shape: suppliedShapes?.[i] ?? [],
                });
            }
        }

        return {
            inputNames,
            outputNames: meta.outputNames,
        };
    }

    // ── 5. Boundary outputs ───────────────────────────────────────────

    private static _collectGraphOutputs(kernel: IKernel, meta: KernelMeta, options: OnnxExportOptions, graphOutputs: OnnxValueInfo[]): void {
        const suppliedShapes = options.outputShapes?.get(kernel);
        for (let i = 0; i < meta.outputNames.length; i++) {
            graphOutputs.push({
                name: meta.outputNames[i],
                type: OnnxLinkType.OUTPUT,
                elemType: OnnxDataType.FLOAT,
                shape: suppliedShapes?.[i] ?? [],
            });
        }
    }
}
