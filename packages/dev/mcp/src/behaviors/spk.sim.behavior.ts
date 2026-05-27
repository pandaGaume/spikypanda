import { McpBehavior, McpBehaviorOptions, McpResource, McpTool, McpToolResult, McpToolResults, JsonRpcMimeType } from "@cyanmycelium/mcp-core";
import { SpkSimulationAdapter } from "../adapters/spk.simulation.adapter.js";

/**
 * Behavior covering simulation lifecycle: enter play mode, advance time,
 * and reset back to edit.
 *
 * Time advances internally through a `setTimeout` wrapped in a Promise inside
 * `window.__spk.run`. The MCP server returns synchronously when the timeout
 * resolves, so callers can chain `sim_run` then `measure_*` without manual
 * waits.
 *
 * Enabling/disabling nodes (gravity, faults, environment processors) is handled
 * uniformly by `scenario_configure_node` with `config: { enabled: bool }`.
 * There is no dedicated gravity-toggle tool; use
 * `scenario_configure_node(opId="spk.WorldGravity", config={ enabled: false })`.
 */
export class SpkSimBehavior extends McpBehavior {
    public static readonly NAMESPACE = "sim";

    public static readonly ToolStatus = "sim_status";
    public static readonly ToolRun    = "sim_run";
    public static readonly ToolReset  = "sim_reset";

    private readonly _spkAdapter: SpkSimulationAdapter;

    public constructor(adapter: SpkSimulationAdapter, options: McpBehaviorOptions = {}) {
        super(adapter, {
            ...options,
            domain: options.domain ?? SpkSimulationAdapter.DOMAIN,
            namespace: options.namespace ?? SpkSimBehavior.NAMESPACE,
            name: options.name ?? "Simulation Lifecycle",
            description: options.description ?? "Run, reset and inspect the live simulation.",
            mimeType: options.mimeType ?? JsonRpcMimeType,
        });
        this._spkAdapter = adapter;
    }

    // ── Resources ────────────────────────────────────────────────────────

    protected override _buildResources(): McpResource[] {
        return [
            {
                uri: SpkSimulationAdapter.URI_SIMULATION,
                name: "Simulation status",
                description: "Mode (edit/play), sample rate, list of currently running source nodes.",
                mimeType: JsonRpcMimeType,
            },
        ];
    }

    // ── Tools ────────────────────────────────────────────────────────────

    protected override _buildTools(): McpTool[] {
        return [
            {
                name: SpkSimBehavior.ToolStatus,
                description: "Returns the current simulation status: mode, sample rate, count of running sources.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uri: { type: "string", description: "Simulation namespace URI. Default: spk://simulation." },
                    },
                    required: [],
                    additionalProperties: false,
                },
            },
            {
                name: SpkSimBehavior.ToolRun,
                description:
                    "Enters play mode if needed, then advances simulation time for `seconds` seconds. " +
                    "Resolves after the timeout. Allow at least 3 seconds for the FOC controller and " +
                    "downstream filters to settle before reading measurements.",
                inputSchema: {
                    type: "object",
                    properties: {
                        seconds: {
                            type: "number",
                            minimum: 0,
                            maximum: 300,
                            description: "Wall-clock seconds to advance the simulation.",
                        },
                    },
                    required: ["seconds"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkSimBehavior.ToolReset,
                description: "Exits play mode and clears the executor state. Use between experiments to start from a clean baseline.",
                inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
            },
        ];
    }

    // ── Runtime ──────────────────────────────────────────────────────────

    public override async executeToolAsync(_uri: string, toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
        const spk = this._spkAdapter.getSpk();
        if (!spk) return McpToolResults.error("SpikyPanda control API is not available (window.__spk missing).");

        switch (toolName) {
            case SpkSimBehavior.ToolStatus: {
                const status = this._spkAdapter.getStatus();
                if (!status) return McpToolResults.error("graphStatus() returned null.");
                const running = status.nodes.filter((n) => n.running).map((n) => ({ id: n.id, op: n.op }));
                return McpToolResults.json({
                    mode: status.mode,
                    sampleRateHz: status.sampleRateHz ?? null,
                    runningCount: running.length,
                    running,
                });
            }

            case SpkSimBehavior.ToolRun: {
                const seconds = Number(args["seconds"]);
                if (!Number.isFinite(seconds) || seconds < 0) return McpToolResults.error("seconds must be a non-negative finite number.");
                try {
                    await spk.run(seconds);
                    return McpToolResults.json({ ranSeconds: seconds, mode: this._spkAdapter.getStatus()?.mode ?? "unknown" });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return McpToolResults.error(`run() failed: ${msg}`);
                }
            }

            case SpkSimBehavior.ToolReset: {
                try {
                    await spk.reset();
                    return McpToolResults.text("Simulation reset to edit mode.");
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return McpToolResults.error(`reset() failed: ${msg}`);
                }
            }

            default:
                return McpToolResults.error(`Unknown tool: "${toolName}"`);
        }
    }
}
