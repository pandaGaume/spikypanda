import { RuntimeGraphBuilder, Session, type Channel, type IRuntimeNode } from "spikypanda-core";
import type { GraphViewer } from "./components/graph-viewer";
import type { NodeUI } from "./node-ui";
import type { Port } from "./port";

/**
 * Build a fresh `Session` over the current GraphViewer state.
 *
 * Each NodeUI's `item.data` is consumed as-is as the runtime node — no
 * cloning, so node-local state (counters, cached values, internal
 * arrays) survives across builds. Channels are freshly created and
 * returned so the caller can `.dispose()` them when the session is
 * torn down: without that cleanup, subsequent builds accumulate dead
 * channels in each node's `onsc/opsc` arrays.
 *
 * The destination port's slot name addresses each channel (matches
 * `resolveSlotInputs` keys in the node's `fire()`). Both data and
 * control ports (`_enable`, `_start`, ...) are wired identically; the
 * runtime distinguishes them downstream.
 */
export function buildSessionFromViewer(viewer: GraphViewer): {
    session: Session;
    channels: Channel[];
} {
    const nodes: IRuntimeNode[] = [];
    for (const n of viewer.nodes) {
        const data = n && n.item && (n.item as { data?: unknown }).data;
        if (data && typeof (data as IRuntimeNode).fire === "function") {
            nodes.push(data as IRuntimeNode);
        }
    }

    const builder = new RuntimeGraphBuilder<IRuntimeNode, Channel>().withMode("dynamic").withNodes(...nodes);

    for (const conn of viewer.connections) {
        const fromNode = _findRuntimeNodeByPort(viewer, conn.from, "output");
        const toNode = _findRuntimeNodeByPort(viewer, conn.to, "input");
        if (!fromNode || !toNode) continue;
        const fromSlot = (conn.from as Port).name;
        const toSlot = (conn.to as Port).name;
        builder.withChannel(fromNode, toNode, fromSlot, toSlot);
    }

    const graph = builder.build();
    return {
        session: new Session(graph),
        channels: (graph.links as Channel[]).slice(),
    };
}

/** Releases every channel created by `buildSessionFromViewer`. */
export function disposeChannels(channels: Channel[]): void {
    for (const ch of channels) {
        try {
            ch.dispose();
        } catch (_e) {
            /* swallow */
        }
    }
}

function _findRuntimeNodeByPort(viewer: GraphViewer, port: unknown, direction: "input" | "output"): IRuntimeNode | null {
    const list = viewer.nodes as ReadonlyArray<NodeUI>;
    for (const n of list) {
        const data = n.item && (n.item as { data?: unknown }).data;
        if (!data) continue;
        if (direction === "output" && (n.outputs.includes(port as Port) || n.controlOutputs.includes(port as Port))) {
            return data as IRuntimeNode;
        }
        if (direction === "input" && (n.inputs.includes(port as Port) || n.controlInputs.includes(port as Port))) {
            return data as IRuntimeNode;
        }
    }
    return null;
}
