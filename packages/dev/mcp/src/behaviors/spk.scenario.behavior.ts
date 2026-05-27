import { McpBehavior, McpBehaviorOptions, McpResource, McpResourceTemplate, McpTool, McpToolResult, McpToolResults, JsonRpcMimeType } from "@cyanmycelium/mcp-core";
import { SpkSimulationAdapter } from "../adapters/spk.simulation.adapter.js";

/**
 * Behavior covering the simulation scenario : the structure of the active
 * graph (nodes, ops, configs) and the operations needed to set up an
 * experiment before pressing Run.
 *
 * Tool schemas are derived from {@link window.__spkOps} at construction time:
 * adding a new op in `spikypanda-ops.js` automatically extends the
 * `scenario_configure_node` schema after a rebuild, no MCP code change
 * required.
 */
export class SpkScenarioBehavior extends McpBehavior {
    public static readonly NAMESPACE = "scenario";

    public static readonly ToolListNodes      = "scenario_list_nodes";
    public static readonly ToolListOps        = "scenario_list_ops";
    public static readonly ToolDescribeOp     = "scenario_describe_op";
    public static readonly ToolConfigureNode  = "scenario_configure_node";

    private readonly _spkAdapter: SpkSimulationAdapter;

    public constructor(adapter: SpkSimulationAdapter, options: McpBehaviorOptions = {}) {
        super(adapter, {
            ...options,
            domain: options.domain ?? SpkSimulationAdapter.DOMAIN,
            namespace: options.namespace ?? SpkScenarioBehavior.NAMESPACE,
            name: options.name ?? "Simulation Scenario",
            description: options.description ?? "Active graph topology, op registry and per-node configuration.",
            mimeType: options.mimeType ?? JsonRpcMimeType,
        });
        this._spkAdapter = adapter;
    }

    // ── Resources ────────────────────────────────────────────────────────

    protected override _buildResources(): McpResource[] {
        return [
            {
                uri: SpkSimulationAdapter.URI_SCENARIO,
                name: "Active scenario",
                description: "Live snapshot of the graph: every node id, op id, label, running flag and current config.",
                mimeType: JsonRpcMimeType,
            },
            {
                uri: SpkSimulationAdapter.URI_OPS,
                name: "Op registry",
                description: "Static catalogue of every op type known to SpikyPanda: id, kind, ports, attrSchema, defaultConfig.",
                mimeType: JsonRpcMimeType,
            },
        ];
    }

    protected override _buildTemplate(): McpResourceTemplate[] {
        return [
            {
                uriTemplate: "spk://scenario/node/{nodeId}",
                name: "Scenario node",
                description: "Single node instance addressed by its node id (e.g. node_3).",
                mimeType: JsonRpcMimeType,
            },
            {
                uriTemplate: "spk://ops/{opId}",
                name: "Op definition",
                description: "Single op type addressed by its op id (e.g. spk.MotorPMSM).",
                mimeType: JsonRpcMimeType,
            },
        ];
    }

    // ── Tools ────────────────────────────────────────────────────────────

    protected override _buildTools(): McpTool[] {
        const ops = this._spkAdapter.getOps();
        const opIds = ops.map((o) => o.id);

        return [
            {
                name: SpkScenarioBehavior.ToolListNodes,
                description:
                    "Lists every node currently placed in the active graph with its id, op type, " +
                    "label, running flag and live config. Use this before configure to learn the " +
                    "exact node id to target.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uri: {
                            type: "string",
                            description: "Scenario namespace URI. Default: spk://scenario.",
                        },
                    },
                    required: [],
                    additionalProperties: false,
                },
            },
            {
                name: SpkScenarioBehavior.ToolListOps,
                description:
                    "Returns the op registry: every node type that can appear in a graph, with its " +
                    "kind, category, input/output ports and attrSchema. Independent from the active " +
                    "graph; use this to understand the modelling surface.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uri: {
                            type: "string",
                            description: "Ops namespace URI. Default: spk://ops.",
                        },
                    },
                    required: [],
                    additionalProperties: false,
                },
            },
            {
                name: SpkScenarioBehavior.ToolDescribeOp,
                description:
                    "Returns the full definition of a single op id (ports, attrSchema, default config). " +
                    "Use before configure to discover which keys are valid for a given node.",
                inputSchema: {
                    type: "object",
                    properties: {
                        opId: {
                            type: "string",
                            description: "Op identifier such as 'spk.MotorPMSM' or 'spk.FaultPmsm.Imbalance'.",
                            ...(opIds.length > 0 ? { enum: opIds } : {}),
                        },
                    },
                    required: ["opId"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkScenarioBehavior.ToolConfigureNode,
                description:
                    "Updates the configuration of a node. Pass either a node id (preferred when several " +
                    "nodes share the same op) or an op id (matches the first node of that type). " +
                    "Keys in `config` must match the op's attrSchema; unknown keys are ignored. " +
                    "When a fault op is targeted with severity > 0 the node is started; severity = 0 stops it.",
                inputSchema: {
                    type: "object",
                    properties: {
                        nodeId: {
                            type: "string",
                            description: "Node instance id (e.g. 'node_3'). Takes precedence over opId.",
                        },
                        opId: {
                            type: "string",
                            description: "Op identifier (e.g. 'spk.MotorPMSM'). Used when nodeId is omitted.",
                            ...(opIds.length > 0 ? { enum: opIds } : {}),
                        },
                        config: {
                            type: "object",
                            description: "Config keys with their new values. Must match the op's attrSchema.",
                            additionalProperties: true,
                        },
                    },
                    required: ["config"],
                    additionalProperties: false,
                },
            },
        ];
    }

    // ── Runtime ──────────────────────────────────────────────────────────

    public override async executeToolAsync(_uri: string, toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
        switch (toolName) {
            case SpkScenarioBehavior.ToolListNodes: {
                const status = this._spkAdapter.getStatus();
                if (!status) return McpToolResults.error("SpikyPanda control API is not available (window.__spk missing).");
                return McpToolResults.json({
                    mode: status.mode,
                    sampleRateHz: status.sampleRateHz ?? null,
                    nodes: status.nodes,
                });
            }

            case SpkScenarioBehavior.ToolListOps: {
                const ops = this._spkAdapter.getOps();
                return McpToolResults.json({ count: ops.length, ops });
            }

            case SpkScenarioBehavior.ToolDescribeOp: {
                const opId = args["opId"] as string | undefined;
                if (!opId) return McpToolResults.error("Missing required argument: opId");
                const op = this._spkAdapter.findOp(opId);
                if (!op) return McpToolResults.error(`Unknown op id: "${opId}"`);
                return McpToolResults.json(op);
            }

            case SpkScenarioBehavior.ToolConfigureNode: {
                const nodeId = (args["nodeId"] as string | undefined) ?? undefined;
                const opId   = (args["opId"]   as string | undefined) ?? undefined;
                const config = (args["config"] as Record<string, unknown> | undefined) ?? {};

                const spk = this._spkAdapter.getSpk();
                if (!spk) return McpToolResults.error("SpikyPanda control API is not available (window.__spk missing).");

                if (!nodeId && !opId) return McpToolResults.error("Provide either nodeId or opId.");

                const status = this._spkAdapter.getStatus();
                if (!status) return McpToolResults.error("Cannot read graph status.");

                const target = nodeId
                    ? status.nodes.find((n) => n.id === nodeId)
                    : status.nodes.find((n) => n.op === opId);
                if (!target) return McpToolResults.error(nodeId ? `Unknown nodeId: "${nodeId}"` : `No node with opId: "${opId}"`);

                // Forward to window.__spk.configure for the matched op. The
                // configure() implementation in nodeeditor.js iterates editor
                // nodes by op and applies the keys. We reuse it through a
                // single-entry nodes array to keep the contract narrow.
                const ok = spk.configure({
                    nodes: [
                        { id: target.id, op: target.op, config },
                    ],
                });

                if (!ok) return McpToolResults.error("configure() returned false");
                return McpToolResults.json({
                    nodeId: target.id,
                    op: target.op,
                    appliedKeys: Object.keys(config),
                });
            }

            default:
                return McpToolResults.error(`Unknown tool: "${toolName}"`);
        }
    }
}
