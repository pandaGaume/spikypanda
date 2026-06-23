/**
 * Declarative v3 `.spikypanda` generator (used by the Phase 6 regime graph).
 *
 * Builds the version-3 document (layout + model + dashboards) from a node +
 * connection SPEC, using the REAL registry: each node is `registry.create`d,
 * its params applied through the editable setters, and its state captured via
 * `serialize()`; ports + the connection PORT INDICES come from `registry.meta`.
 * No JSON values are hand-rolled — the spec is typeIds + params + wire endpoints,
 * everything else is read off the registered nodes. This is the headless
 * equivalent of building the graph in the editor and Saving.
 */
import type { NodeRegistry } from "spikypanda-core";

export interface NodeSpec {
    id: string;
    typeId: string;
    x: number;
    y: number;
    params?: Record<string, unknown>;
    /** Display label baked into the model node. Falls back to the registry
     *  meta label, then the id. Set this for nodes whose registry label is a
     *  headless stub (e.g. Viz tiles) so the editor shows a clean name. */
    label?: string;
}
export interface ConnSpec {
    from: [string, string]; // [nodeId, outputSlot]
    to: [string, string]; // [nodeId, inputSlot]
}
export interface TileSpec {
    nodeId: string;
    renderableType: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

interface MetaPort {
    slot: string;
    type?: string;
}
interface NodeMeta {
    label?: string;
    inputPorts?: ReadonlyArray<MetaPort>;
    outputPorts?: ReadonlyArray<MetaPort>;
    controlInputPorts?: ReadonlyArray<MetaPort>;
    controlOutputPorts?: ReadonlyArray<MetaPort>;
}

/** Build the v3 document JSON string from the spec. Throws (loudly) on an
 *  unknown typeId or an unresolved port, so a malformed spec fails the
 *  generator rather than silently emitting a broken graph. */
export function buildV3Document(registry: NodeRegistry, nodes: ReadonlyArray<NodeSpec>, conns: ReadonlyArray<ConnSpec>, tiles: ReadonlyArray<TileSpec> = []): string {
    const reg = registry as unknown as { create(t: string): unknown; meta(t: string): NodeMeta | undefined };
    const metaById = new Map<string, NodeMeta>();

    const layoutNodes = nodes.map((n) => {
        const meta = reg.meta(n.typeId);
        if (!meta) throw new Error(`v3-gen: unknown typeId "${n.typeId}"`);
        metaById.set(n.id, meta);
        const inst = reg.create(n.typeId) as Record<string, unknown> & { serialize?: () => Record<string, unknown> };
        if (!inst) throw new Error(`v3-gen: registry.create returned nothing for "${n.typeId}"`);
        for (const [k, v] of Object.entries(n.params ?? {})) inst[k] = v;
        const port = (p: MetaPort, direction: "input" | "output") => ({ name: p.slot, type: p.type ?? "any", direction });
        return {
            inst,
            layout: {
                id: n.id,
                x: n.x,
                y: n.y,
                typeId: n.typeId,
                inputs: (meta.inputPorts ?? []).map((p) => port(p, "input")),
                outputs: (meta.outputPorts ?? []).map((p) => port(p, "output")),
            },
            model: { id: n.id, label: n.label ?? meta.label ?? n.id, typeId: n.typeId, data: typeof inst.serialize === "function" ? inst.serialize() : {} },
        };
    });

    // Resolve a slot to its index, looking in the DATA array first then the
    // CONTROL array. A control endpoint carries `control: true` so the layout
    // connection can flag it (the editor + builder index the control arrays).
    const resolvePort = (
        id: string,
        slot: string,
        dataSide: "inputPorts" | "outputPorts",
        ctrlSide: "controlInputPorts" | "controlOutputPorts"
    ): { index: number; control: boolean } => {
        const meta = metaById.get(id);
        const dataIdx = (meta?.[dataSide] ?? []).findIndex((p) => p.slot === slot);
        if (dataIdx >= 0) return { index: dataIdx, control: false };
        const ctrlIdx = (meta?.[ctrlSide] ?? []).findIndex((p) => p.slot === slot);
        if (ctrlIdx >= 0) return { index: ctrlIdx, control: true };
        throw new Error(`v3-gen: ${id} has no ${dataSide}/${ctrlSide} port "${slot}"`);
    };

    const layoutConns = conns.map((c) => {
        const [fromId, fromSlot] = c.from;
        const [toId, toSlot] = c.to;
        const from = resolvePort(fromId, fromSlot, "outputPorts", "controlOutputPorts");
        const to = resolvePort(toId, toSlot, "inputPorts", "controlInputPorts");
        return {
            id: `${fromId}:${fromSlot}->${toId}:${toSlot}`,
            fromNodeId: fromId,
            fromPortIndex: from.index,
            toNodeId: toId,
            toPortIndex: to.index,
            ...(from.control ? { fromControl: true } : {}),
            ...(to.control ? { toControl: true } : {}),
        };
    });
    const modelConns = conns.map((c) => ({
        id: `${c.from[0]}:${c.from[1]}->${c.to[0]}:${c.to[1]}`,
        from: { node: c.from[0], port: c.from[1] },
        to: { node: c.to[0], port: c.to[1] },
    }));

    const doc = {
        version: 3,
        layout: { nodes: layoutNodes.map((n) => n.layout), connections: layoutConns },
        model: { nodes: layoutNodes.map((n) => n.model), connections: modelConns },
        dashboards: [{ id: "main", name: "Main", tiles: tiles.map((t) => ({ nodeId: t.nodeId, renderableType: t.renderableType, x: t.x, y: t.y, w: t.w, h: t.h })) }],
    };
    return JSON.stringify(doc, null, 2);
}
