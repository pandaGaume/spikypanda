import { RuntimeGraphBuilder, Session, type Channel, type IRuntimeNode } from "spikypanda-core";
import type { GraphViewer } from "./components/graph-viewer";
import type { NodeUI } from "./node-ui";
import type { Port } from "./port";

/**
 * Type IDs of nodes whose outgoing channels must be marked as `delayed`
 * at session build time. Pinned by string id rather than instanceof so
 * this builder doesn't import from plugin packages (no upstream
 * coupling: plugins still depend on core/nodeeditor, never the reverse).
 *
 * Marking these channels delayed has two effects:
 *   1. Topo sort (RunStatic) excludes them, so the cycle through the
 *      feedback loop is recognised and broken at the channel-graph
 *      level — the same way the framework breaks any other cycle.
 *   2. `initialValue` is left undefined so the framework's reset-time
 *      pre-seed loop SKIPS them. Bootstrap is owned end-to-end by the
 *      node's own reset() via the validAtTick mechanism (one source of
 *      truth, no double-seeding).
 */
const DELAYED_OUTPUT_TYPE_IDS: ReadonlySet<string> = new Set(["Control.Feedback:channel"]);

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

    // Map runtime nodes back to their NodeUI typeIds so we can flag
    // delayed-output nodes (FeedbackChannel) at channel-creation time.
    // Built once, queried per connection — O(n) build vs N*M scan.
    const typeIdByNode = new Map<IRuntimeNode, string | undefined>();
    for (const n of viewer.nodes) {
        const data = n && n.item && (n.item as { data?: unknown }).data;
        if (data && typeof (data as IRuntimeNode).fire === "function") {
            typeIdByNode.set(data as IRuntimeNode, n.typeId);
        }
    }

    for (const conn of viewer.connections) {
        const fromNode = _findRuntimeNodeByPort(viewer, conn.from, "output");
        const toNode = _findRuntimeNodeByPort(viewer, conn.to, "input");
        if (!fromNode || !toNode) continue;
        const fromSlot = (conn.from as Port).name;
        const toSlot = (conn.to as Port).name;
        builder.withChannel(fromNode, toNode, fromSlot, toSlot);
    }

    const graph = builder.build();

    // Post-pass: flip `delayed = true` on every channel emitted by a
    // delayed-output node. Doing this AFTER builder.build() keeps the
    // builder API minimal — we don't need to expose a per-conn delayed
    // flag at construction time, the typeId-driven post-pass is enough.
    // initialValue stays undefined so the framework's pre-seed loop in
    // Session.reset() skips these channels (the FB node's own reset()
    // owns the bootstrap via the validAtTick mechanism).
    const links = graph.links as Channel[];
    for (const link of links) {
        const src = link.oini as IRuntimeNode | null;
        if (!src) continue;
        const typeId = typeIdByNode.get(src);
        if (typeId && DELAYED_OUTPUT_TYPE_IDS.has(typeId)) {
            link.delayed = true;
        }
    }

    return {
        session: new Session(graph),
        channels: links.slice(),
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
