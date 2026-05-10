// SpikyPanda graph data layer.
//
// Pure data, no DOM. Wraps the node editor's v2 save format and gives
// graph consumers (detail pages, the future graph-runner) a stable
// op-and-edge view of the pipeline. The on-disk format is JSON, written
// out with the .spikypanda extension; v1 is intentionally simple so
// downstream code can treat node.data as { op, domain, opset, nodeId,
// config } without further parsing.
//
// Phase 1 only USES this module from the editor. Phase 2 will use it
// from source/dataset detail pages to read their bound configuration.

const SCHEMA_VERSION = 1;

export class SpikypandaGraph {
    constructor(json) {
        // The raw editor v2 save object. We keep it around for round-tripping
        // (re-saving won't drop fields we don't yet understand).
        this.raw = json;
        this._nodesById = new Map();
        const modelNodes = (json.model && json.model.nodes) || [];

        // The editor v2 format splits data across two sections:
        //   layout.nodes  → visual position + actual port lists (name, type)
        //   model.nodes   → op id, label, config (no ports)
        //
        // getNode() returns port lists so the executor can collect exec inputs
        // (start / stop / pause / resume) by name. Build a layout lookup and
        // merge port arrays onto each model node before storing it.
        const layoutNodes = (json.layout && json.layout.nodes) || [];
        const layoutById = new Map();
        for (const ln of layoutNodes) layoutById.set(ln.id, ln);

        for (const n of modelNodes) {
            const ln = layoutById.get(n.id);
            n.inputs  = ln ? (ln.inputs  || []) : [];
            n.outputs = ln ? (ln.outputs || []) : [];
            this._nodesById.set(n.id, n);
        }
        const modelConns = (json.model && json.model.connections) || [];
        // Edges normalized to a friendlier shape than the editor's flat repr.
        this.edges = modelConns.map((c) => ({
            from: { nodeId: c.from.node, port: c.from.port },
            to:   { nodeId: c.to.node,   port: c.to.port },
        }));
    }

    static parse(jsonString) {
        return new SpikypandaGraph(JSON.parse(jsonString));
    }

    static fromUrl(url) {
        return fetch(url).then((r) => r.text()).then(SpikypandaGraph.parse);
    }

    // Returns { id, label, op, domain, opset, config, inputs, outputs } or null.
    // `inputs` / `outputs` are the ACTUAL port lists serialized by the editor
    // (including dynamically-added exec pins from buildNodeDef), not just the
    // op-descriptor defaults. Prefer these over findOp(n.op).outputs when you
    // need the real port list.
    getNode(nodeId) {
        const n = this._nodesById.get(nodeId);
        if (!n) return null;
        const d = n.data || {};
        return {
            id: n.id,
            label: n.label,
            op: d["@type"] || d.op || null,
            domain: d.domain || null,
            opset: d.opset || null,
            config: d.config || {},
            // Design-time enabled state for IToggableNode (faults, env).
            // Defaults to true so graphs saved before this field was added
            // keep all nodes enabled.
            enabled: d.enabled !== false,
            // Actual port lists from the saved graph (direction is "input"/"output").
            inputs:  (n.inputs  || []).map((p) => ({ name: p.name, type: p.type })),
            outputs: (n.outputs || []).map((p) => ({ name: p.name, type: p.type })),
        };
    }

    listNodes() {
        return Array.from(this._nodesById.keys()).map((id) => this.getNode(id));
    }

    // All inbound edges to a node. Pass `port` to filter by input port name.
    getInbound(nodeId, port) {
        return this.edges.filter((e) =>
            e.to.nodeId === nodeId && (port === undefined || e.to.port === port),
        );
    }

    getOutbound(nodeId, port) {
        return this.edges.filter((e) =>
            e.from.nodeId === nodeId && (port === undefined || e.from.port === port),
        );
    }

    // Canonical stream id for a node's output port. Producers must register
    // their stream under this id; consumers must subscribe to this id.
    streamId(nodeId, port) {
        return port ? `node.${nodeId}.${port}` : `node.${nodeId}`;
    }

    // Convenience: for a sink's input port, return the upstream stream id
    // (i.e. follow the inbound edge and convert to a producer stream id).
    upstreamStreamId(nodeId, port) {
        const inb = this.getInbound(nodeId, port);
        if (!inb.length) return null;
        const e = inb[0];
        return this.streamId(e.from.nodeId, e.from.port);
    }

    serialize() {
        return JSON.stringify(this.raw, null, 2);
    }
}

// BroadcastChannel("spikypanda.graph") wrapper. Editors publish snapshots
// when something changes; detail pages subscribe to refresh. Late joiners
// can request a snapshot. Lightweight pub-sub, same-origin only.
const CHANNEL_NAME = "spikypanda.graph";

export class GraphChannel {
    constructor() {
        this.bc = new BroadcastChannel(CHANNEL_NAME);
        this.handlers = { snapshot: new Set(), request: new Set() };
        this.bc.onmessage = (e) => {
            const msg = e.data;
            if (!msg || !msg.type) return;
            const set = this.handlers[msg.type];
            if (set) for (const fn of set) fn(msg);
        };
    }

    onSnapshot(cb) {
        this.handlers.snapshot.add(cb);
        return () => this.handlers.snapshot.delete(cb);
    }

    onRequest(cb) {
        this.handlers.request.add(cb);
        return () => this.handlers.request.delete(cb);
    }

    publishSnapshot(graphJsonString) {
        this.bc.postMessage({
            type: "snapshot",
            schemaVersion: SCHEMA_VERSION,
            graph: graphJsonString,
        });
    }

    requestSnapshot() {
        this.bc.postMessage({ type: "request" });
    }

    close() {
        this.bc.close();
    }
}
