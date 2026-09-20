/**
 * Headless `.spikypanda` document generation, the counterpart of `readDocument`.
 *
 * Builds a version-3 document (layout + model + dashboards) from a node and
 * connection SPEC, through the real registry: every node is created by
 * `registry.create`, its parameters go through the editable setters, its
 * state is captured by `serialize()`, and the ports (with the connection
 * port indices the editor needs) are read off `registry.meta`. Nothing is
 * hand-rolled: the spec is type ids, parameters and wire endpoints,
 * everything else comes from the registered nodes. This is the headless
 * equivalent of building the graph in the editor and saving.
 *
 * A malformed spec (unknown type id, unknown port, a parameter the node
 * refuses) throws with the path, so the generator fails rather than
 * silently writing a broken graph. The demo repository uses this to build
 * its twin documents from reviewable parameter files.
 */
import type { NodeRegistry } from "spikypanda-core";

export interface DocumentNodeSpec {
    id: string;
    typeId: string;
    x: number;
    y: number;
    /** Values applied through the node's editable setters, in order. */
    params?: Record<string, unknown>;
    /** Display label; falls back to the registry meta label, then the id. */
    label?: string;
}
export interface DocumentConnectionSpec {
    from: [string, string]; // [nodeId, outputSlot]
    to: [string, string]; // [nodeId, inputSlot]
}
export interface DocumentTileSpec {
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

export class DocumentBuildError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DocumentBuildError";
    }
}

/** Build the document as an object; `buildDocumentJson` serialises it. */
export function buildDocument(
    registry: NodeRegistry,
    nodes: ReadonlyArray<DocumentNodeSpec>,
    conns: ReadonlyArray<DocumentConnectionSpec>,
    tiles: ReadonlyArray<DocumentTileSpec> = []
): Record<string, unknown> {
    const reg = registry as unknown as { create(t: string): unknown; meta(t: string): NodeMeta | undefined };
    const metaById = new Map<string, NodeMeta>();
    const seen = new Set<string>();

    const built = nodes.map((n) => {
        if (seen.has(n.id)) throw new DocumentBuildError(`document: node id "${n.id}" is used twice`);
        seen.add(n.id);
        const meta = reg.meta(n.typeId);
        if (!meta) throw new DocumentBuildError(`document: unknown typeId "${n.typeId}" for node "${n.id}"`);
        metaById.set(n.id, meta);
        const inst = reg.create(n.typeId) as Record<string, unknown> & { serialize?: () => Record<string, unknown> };
        if (!inst) throw new DocumentBuildError(`document: the registry created nothing for "${n.typeId}" (node "${n.id}")`);
        for (const [k, v] of Object.entries(n.params ?? {})) {
            if (!(k in inst)) throw new DocumentBuildError(`document: node "${n.id}" (${n.typeId}) has no parameter "${k}"`);
            try {
                inst[k] = v;
            } catch (e) {
                throw new DocumentBuildError(`document: node "${n.id}".${k} refused ${JSON.stringify(v)}: ${(e as Error).message}`);
            }
        }
        const port = (p: MetaPort, direction: "input" | "output") => ({ name: p.slot, type: p.type ?? "any", direction });
        return {
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

    // A slot resolves to its index in the data array first, then in the
    // control array; a control endpoint is flagged so the editor indexes
    // the right array.
    const resolvePort = (
        id: string,
        slot: string,
        dataSide: "inputPorts" | "outputPorts",
        ctrlSide: "controlInputPorts" | "controlOutputPorts"
    ): { index: number; control: boolean } => {
        const meta = metaById.get(id);
        if (!meta) throw new DocumentBuildError(`document: connection names an unknown node "${id}"`);
        const dataIdx = (meta[dataSide] ?? []).findIndex((p) => p.slot === slot);
        if (dataIdx >= 0) return { index: dataIdx, control: false };
        const ctrlIdx = (meta[ctrlSide] ?? []).findIndex((p) => p.slot === slot);
        if (ctrlIdx >= 0) return { index: ctrlIdx, control: true };
        throw new DocumentBuildError(`document: node "${id}" has no ${dataSide === "inputPorts" ? "input" : "output"} port "${slot}"`);
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

    return {
        version: 3,
        layout: { nodes: built.map((n) => n.layout), connections: layoutConns },
        model: { nodes: built.map((n) => n.model), connections: modelConns },
        dashboards: [{ id: "main", name: "Main", tiles: tiles.map((t) => ({ nodeId: t.nodeId, renderableType: t.renderableType, x: t.x, y: t.y, w: t.w, h: t.h })) }],
    };
}

/** The document as the JSON text a `.spikypanda` file holds. */
export function buildDocumentJson(
    registry: NodeRegistry,
    nodes: ReadonlyArray<DocumentNodeSpec>,
    conns: ReadonlyArray<DocumentConnectionSpec>,
    tiles: ReadonlyArray<DocumentTileSpec> = []
): string {
    return JSON.stringify(buildDocument(registry, nodes, conns, tiles), null, 2);
}
