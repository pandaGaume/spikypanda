/**
 * Behavior: what the world sees. Schemas only, no execution.
 *
 * The separation matters more here than it looks. The adapter can be swapped
 * (a different host, a headless session, a test double) without a client
 * noticing, and this file can be read as the API contract without chasing
 * implementation.
 *
 * Two conventions run through the surface.
 *
 * **Nodes are addressed by id, never by label.** Labels are for humans, they
 * are not unique, and two nodes of the same type routinely share one. Every
 * tool that takes a node takes `nodeId`, obtained from `graph_describe`.
 *
 * **There is no verb per question.** Gravity, orientation and fault severity
 * are properties of nodes, so they are set through `node_set_property` like
 * anything else. A `sim_toggle_gravity` would put state outside the graph,
 * where neither the view nor another client could see it.
 */
import { McpBehavior, type McpBehaviorOptions, type McpResource, type McpTool } from "@cyanmycelium/mcp-core";
import type { GraphAdapter } from "./graph.adapter.js";
import { URI_GRAPH, URI_GRAPH_STATE, URI_PLUGINS, URI_REGISTRY } from "./resource.uri.js";

/** Reused by every tool that addresses a single node. */
const NODE_ID_PROPERTY = {
    nodeId: { type: "string", description: "Node id from `graph_describe`. Labels are never accepted: they are not unique." },
} as const;

export class GraphBehavior extends McpBehavior {
    public static readonly NAMESPACE = "spk";

    public constructor(adapter: GraphAdapter, options: McpBehaviorOptions = {}) {
        super(adapter, { ...options, namespace: options.namespace ?? GraphBehavior.NAMESPACE });
    }

    protected override _buildResources(): McpResource[] {
        return [
            { uri: URI_PLUGINS, name: "Plugins", mimeType: "application/json" },
            { uri: URI_REGISTRY, name: "Node catalogue", mimeType: "application/json" },
            { uri: URI_GRAPH, name: "Graph", mimeType: "application/json" },
            { uri: URI_GRAPH_STATE, name: "Simulation state", mimeType: "application/json" },
        ];
    }

    protected override _buildTools(): McpTool[] {
        return [...this._catalogueTools(), ...this._graphTools(), ...this._nodeTools(), ...this._simulationTools(), ...this._captureTools()];
    }

    private _catalogueTools(): McpTool[] {
        return [
            {
                name: "plugin_list",
                description: "Summarise the node catalogue by category. The registry records node types, not the plugin that contributed them, so category is a proxy for provenance rather than provenance itself.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "registry_list_nodes",
                description: "List every node type the activated plugins registered, with ports, declared interop standards and resolved documentation. This is the catalogue to consult before wiring anything.",
                inputSchema: {
                    type: "object",
                    properties: { locale: { type: "string", description: "Preferred documentation locale, e.g. \"fr\". Falls back to English." } },
                },
            },
            {
                name: "registry_describe_node",
                description: "Describe one node type: its ports with their declared units and stream/signal kind, and its documentation. Use before `graph_add_node` to check what a node expects.",
                inputSchema: {
                    type: "object",
                    properties: {
                        type: { type: "string", description: "Node type id as listed by `registry_list_nodes`." },
                        locale: { type: "string", description: "Preferred documentation locale." },
                    },
                    required: ["type"],
                },
            },
        ];
    }

    private _graphTools(): McpTool[] {
        return [
            {
                name: "graph_describe",
                description: "The current graph in the editor's own serialized form: nodes with their ids, types and positions, and the connections between them. Start here to obtain node ids.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "graph_load",
                description: "Replace the graph with a serialized one. Discards every armed capture, since the nodes they referenced no longer exist.",
                inputSchema: {
                    type: "object",
                    properties: { graph: { description: "Serialized graph, as the string produced by `graph_save` or as the equivalent object." } },
                    required: ["graph"],
                },
            },
            {
                name: "graph_save",
                description: "Serialize the current graph in the editor's own format, suitable for `graph_load`.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "graph_add_node",
                description: "Instantiate a node from the catalogue by type id. Ports come from the node's own registry declaration, never from the caller: a hand-written shape could describe a graph the runtime cannot honour.",
                inputSchema: {
                    type: "object",
                    properties: {
                        type: { type: "string", description: "Node type id from `registry_list_nodes`." },
                        x: { type: "number", description: "Canvas x position. Layout only." },
                        y: { type: "number", description: "Canvas y position. Layout only." },
                    },
                    required: ["type"],
                },
            },
            {
                name: "graph_connect",
                description: "Connect an output port to an input port. The link type is resolved from the two port types, so it is never given. Refused when the types are incompatible.",
                inputSchema: {
                    type: "object",
                    properties: {
                        from: {
                            type: "object",
                            description: "Source, as { nodeId, port } naming an output port.",
                            properties: { nodeId: { type: "string" }, port: { type: "string" } },
                            required: ["nodeId", "port"],
                        },
                        to: {
                            type: "object",
                            description: "Destination, as { nodeId, port } naming an input port.",
                            properties: { nodeId: { type: "string" }, port: { type: "string" } },
                            required: ["nodeId", "port"],
                        },
                    },
                    required: ["from", "to"],
                },
            },
            {
                name: "sweep_run",
                description: "Run a grid of configurations and return one recorded window per cell. Each cell is configured, settled without recording, then captured, which is the same discipline as a hand-written sweep harness: a window that straddles the transient and the steady state measures neither. Prefer this over a manual loop of configure/run/read, which costs three round trips per cell.",
                inputSchema: {
                    type: "object",
                    properties: {
                        cells: {
                            type: "array",
                            description: "One entry per cell: { label?, nodes: [{ nodeId, properties }] }.",
                            items: {
                                type: "object",
                                properties: {
                                    label: { type: "string", description: "Free-form name echoed back in the results." },
                                    nodes: { type: "array", description: "Same shape as `graph_configure`." },
                                },
                                required: ["nodes"],
                            },
                        },
                        signals: { type: "array", description: "Signals to record in every cell, as { nodeId, property }." },
                        dt: { type: "number", description: "Seconds per tick." },
                        settleSteps: { type: "integer", description: "Ticks to run before recording, so transients decay. Not recorded." },
                        captureSteps: { type: "integer", description: "Ticks to record. For a periodic reading, span a whole number of periods." },
                    },
                    required: ["cells", "signals", "dt", "captureSteps"],
                },
            },
            {
                name: "graph_configure",
                description: "Apply properties across several nodes in one call. Validated entirely before anything is written, so a rejected entry leaves nothing half applied. Use this for a sweep cell rather than a sequence of single writes, which would make intermediate inconsistent states observable.",
                inputSchema: {
                    type: "object",
                    properties: {
                        nodes: {
                            type: "array",
                            description: "One entry per node: { nodeId, properties: { key: value } }.",
                            items: {
                                type: "object",
                                properties: { ...NODE_ID_PROPERTY, properties: { type: "object", description: "Property keys and their new values." } },
                                required: ["nodeId", "properties"],
                            },
                        },
                    },
                    required: ["nodes"],
                },
            },
        ];
    }

    private _nodeTools(): McpTool[] {
        return [
            {
                name: "node_describe",
                description: "One node's display name and its properties, each with type, current value, whether it is editable and, when it is not, the hint explaining why. `propertySource` says whether these were declared by the node or reflected from its public fields; reflected properties are still writable, but their type and editability are inferred rather than chosen.",
                inputSchema: { type: "object", properties: { ...NODE_ID_PROPERTY }, required: ["nodeId"] },
            },
            {
                name: "node_list_ports",
                description: "Input and output port names of one node instance, as the editor renders them.",
                inputSchema: { type: "object", properties: { ...NODE_ID_PROPERTY }, required: ["nodeId"] },
            },
            {
                name: "node_get_property",
                description: "Read one property of one node, with its declared type and editability.",
                inputSchema: {
                    type: "object",
                    properties: { ...NODE_ID_PROPERTY, key: { type: "string", description: "Property key from `node_describe`." } },
                    required: ["nodeId", "key"],
                },
            },
            {
                name: "node_set_property",
                description: "Write one property. Refused with the node's own hint when the property is declared read-only. This is how gravity, orientation and fault severity are set: they are node properties, not dedicated commands.",
                inputSchema: {
                    type: "object",
                    properties: { ...NODE_ID_PROPERTY, key: { type: "string", description: "Property key." }, value: { description: "New value, matching the property's declared type." } },
                    required: ["nodeId", "key"],
                },
            },
            {
                name: "node_set_properties",
                description: "Write several properties of one node as a unit. Every entry is validated before any is applied, so the node is never left partly configured.",
                inputSchema: {
                    type: "object",
                    properties: { ...NODE_ID_PROPERTY, properties: { type: "object", description: "Property keys and their new values." } },
                    required: ["nodeId", "properties"],
                },
            },
        ];
    }

    private _simulationTools(): McpTool[] {
        return [
            {
                name: "sim_status",
                description: "Runner state, whether a live session exists, current simulation time, tick index and rate.",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "sim_run",
                description: "Advance the live session by an explicit number of ticks. Stepping is explicit rather than wall-clock driven so a run is reproducible. Armed captures are sampled at every tick, which is the only moment intermediate values exist. Allow enough steps for transients to settle before reading: a controller loop needs its settling time, and a low-pass filter several of its time constants.",
                inputSchema: {
                    type: "object",
                    properties: {
                        steps: { type: "integer", description: "Number of ticks to advance. Must be positive." },
                        dt: { type: "number", description: "Seconds per tick. Must be positive. Match the graph's own time step; too coarse a dt changes the result rather than merely coarsening it." },
                    },
                    required: ["steps", "dt"],
                },
            },
            {
                name: "sim_reset",
                description: "Stop the runner and return to the initial state. Does not clear armed captures.",
                inputSchema: { type: "object", properties: {} },
            },
        ];
    }

    private _captureTools(): McpTool[] {
        return [
            {
                name: "capture_arm",
                description: "Record one or more node properties on every subsequent `sim_run` tick. A port only holds its value at the current tick, so any windowed reading (lock-in, FFT, RMS) needs this: arm, step, then read back. Arming resets an existing capture rather than appending, which would splice two unrelated spans of time into one apparently continuous series.",
                inputSchema: {
                    type: "object",
                    properties: {
                        captureId: { type: "string", description: "Name for this capture. Defaults to \"default\"." },
                        signals: {
                            type: "array",
                            description: "Signals to record, as { nodeId, property }.",
                            items: { type: "object", properties: { ...NODE_ID_PROPERTY, property: { type: "string", description: "Property key to sample." } }, required: ["nodeId", "property"] },
                        },
                    },
                    required: ["signals"],
                },
            },
            {
                name: "capture_read",
                description: "Return the recorded window: the simulation time of every sample and one value series per signal, index-aligned. A property that was missing or non-numeric at a tick records NaN rather than being skipped, so series never misalign.",
                inputSchema: { type: "object", properties: { captureId: { type: "string", description: "Capture name. Defaults to \"default\"." } } },
            },
            {
                name: "capture_clear",
                description: "Discard a capture and stop sampling it.",
                inputSchema: { type: "object", properties: { captureId: { type: "string", description: "Capture name. Defaults to \"default\"." } } },
            },
        ];
    }
}
