import { McpBehavior, McpBehaviorOptions, McpResource, McpTool, McpToolResult, McpToolResults, JsonRpcMimeType } from "@dev/core";
import { SpkSimulationAdapter } from "../adapters/spk.simulation.adapter.js";

/**
 * Behavior covering measurement readouts: instantaneous amplitudes, FFT peak
 * lookup, and full data export. Reads exclusively through window.__spk so
 * the executor's stream registry is the single source of truth.
 *
 * The export tool returns the raw Float32Array contents serialized as plain
 * JSON arrays. For long captures the payload can grow into the megabyte
 * range; agents are expected to call this once per experiment, not per tick.
 */
export class SpkMeasureBehavior extends McpBehavior {
    public static readonly NAMESPACE = "measure";

    public static readonly ToolReadAmplitudes = "measure_read_amplitudes";
    public static readonly ToolReadFftPeak    = "measure_read_fft_peak";
    public static readonly ToolExportData     = "measure_export_data";
    public static readonly ToolCaptureScope    = "measure_capture_scope";
    public static readonly ToolExportGraphSvg  = "measure_export_graph_svg";

    private readonly _spkAdapter: SpkSimulationAdapter;

    public constructor(adapter: SpkSimulationAdapter, options: McpBehaviorOptions = {}) {
        super(adapter, {
            ...options,
            domain: options.domain ?? SpkSimulationAdapter.DOMAIN,
            namespace: options.namespace ?? SpkMeasureBehavior.NAMESPACE,
            name: options.name ?? "Measurements",
            description: options.description ?? "Read live amplitudes, lookup FFT peaks, export full stream history.",
            mimeType: options.mimeType ?? JsonRpcMimeType,
        });
        this._spkAdapter = adapter;
    }

    // ── Resources ────────────────────────────────────────────────────────

    protected override _buildResources(): McpResource[] {
        return [
            {
                uri: SpkSimulationAdapter.URI_MEASUREMENT,
                name: "Live measurements",
                description: "Last sample value for every active float stream, keyed by node label and port.",
                mimeType: JsonRpcMimeType,
            },
        ];
    }

    // ── Tools ────────────────────────────────────────────────────────────

    protected override _buildTools(): McpTool[] {
        return [
            {
                name: SpkMeasureBehavior.ToolReadAmplitudes,
                description:
                    "Returns the last sample of every active float stream as a flat object keyed by " +
                    "\"<node_id>.<port>\" (e.g. \"node_18.magnitude\"). node_id is the only canonical " +
                    "reference for nodes; correlate against scenario_list_nodes to map ids to ops/labels.",
                inputSchema: {
                    type: "object",
                    properties: {
                        uri: { type: "string", description: "Measurement namespace URI. Default: spk://measurement." },
                    },
                    required: [],
                    additionalProperties: false,
                },
            },
            {
                name: SpkMeasureBehavior.ToolReadFftPeak,
                description:
                    "Reads the magnitude of the FFT bin closest to `freqHz` for a specific FFT node. " +
                    "Bin width = sampleRate / N. Pass `windowHz` to widen the search and pick the local " +
                    "maximum, useful when speed ripple shifts the peak by a few bins. Pre-resolve the " +
                    "FFT node_id via scenario_list_nodes (filter by op = spk.FFT) before calling.",
                inputSchema: {
                    type: "object",
                    properties: {
                        nodeId: {
                            type: "string",
                            description: "Node id of the target spk.FFT instance (e.g. 'node_22'). Labels are not accepted: they are not unique.",
                        },
                        freqHz: {
                            type: "number",
                            minimum: 0,
                            description: "Target frequency in Hz.",
                        },
                        windowHz: {
                            type: "number",
                            minimum: 0,
                            description: "Half-width of the search window in Hz around freqHz. Default: bin width.",
                        },
                    },
                    required: ["nodeId", "freqHz"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkMeasureBehavior.ToolExportData,
                description:
                    "Returns a JSON snapshot of every stream's recorded samples. Heavy payload; call " +
                    "once at the end of an experiment, not in a tight loop.",
                inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
            },
            {
                name: SpkMeasureBehavior.ToolCaptureScope,
                description:
                    "Captures the current canvas of a scope widget. " +
                    "format='png' (default): returns two content blocks — (1) a visual image block " +
                    "the LLM can inspect, (2) a text block with JSON { label, dataUrl } where dataUrl " +
                    "is the full 'data:image/png;base64,...' string to pass to save_figure. " +
                    "format='svg': returns a text block containing a self-contained SVG string " +
                    "(600x200 viewBox, same colours as the canvas, resolution-independent). " +
                    "Pass the SVG string to save_svg (spikypanda-research MCP) to persist it. " +
                    "The label parameter is the node id of the spk.Scope node (e.g. 'node_6'). " +
                    "Use scenario_list_nodes (filter op = spk.Scope) to discover scope node ids.",
                inputSchema: {
                    type: "object",
                    properties: {
                        label: {
                            type: "string",
                            description: "Node id of the spk.Scope widget to capture (e.g. 'node_6'). Use scenario_list_nodes to find scope node ids.",
                        },
                        format: {
                            type: "string",
                            enum: ["png", "svg"],
                            description: "Output format: 'png' (default, raster image) or 'svg' (vector, recommended for reports).",
                        },
                    },
                    required: ["label"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkMeasureBehavior.ToolExportGraphSvg,
                description:
                    "Exports the current node-editor graph as a self-contained SVG string. " +
                    "The SVG encodes all nodes, ports, labels, and connections with Bezier curves. " +
                    "Pass the result to save_svg (spikypanda-research MCP) to persist it as an SVG file " +
                    "that can be embedded in a markdown report with ![graph](figures/graph.svg). " +
                    "profile controls the colour theme: 'dark' (default), 'light', " +
                    "'transparent_dark', or 'transparent_light'.",
                inputSchema: {
                    type: "object",
                    properties: {
                        profile: {
                            type: "string",
                            enum: ["dark", "light", "transparent_dark", "transparent_light"],
                            description: "Colour theme for the exported SVG. Default: 'dark'.",
                        },
                    },
                    required: [],
                    additionalProperties: false,
                },
            },
        ];
    }

    // ── Runtime ──────────────────────────────────────────────────────────

    public override async executeToolAsync(_uri: string, toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
        const spk = this._spkAdapter.getSpk();
        if (!spk) return McpToolResults.error("SpikyPanda control API is not available (window.__spk missing).");

        switch (toolName) {
            case SpkMeasureBehavior.ToolReadAmplitudes: {
                const amps = spk.readAmplitudes();
                if (!amps) return McpToolResults.error("readAmplitudes returned null. Is the simulation in play mode?");
                return McpToolResults.json(amps);
            }

            case SpkMeasureBehavior.ToolReadFftPeak: {
                const nodeId   = args["nodeId"] as string | undefined;
                const freqHz   = Number(args["freqHz"]);
                const windowHz = args["windowHz"] !== undefined ? Number(args["windowHz"]) : undefined;
                if (!nodeId) return McpToolResults.error("Missing required argument: nodeId (target spk.FFT instance).");
                if (!Number.isFinite(freqHz)) return McpToolResults.error("freqHz must be a finite number.");
                const value = spk.readFftPeak(nodeId, freqHz, windowHz);
                if (value === null) return McpToolResults.error(`No FFT data for nodeId "${nodeId}" near ${freqHz} Hz. Confirm the node id (scenario_list_nodes filtered to op spk.FFT) and that the simulation is in play mode.`);
                return McpToolResults.json({ nodeId, freqHz, windowHz: windowHz ?? null, magnitude: value });
            }

            case SpkMeasureBehavior.ToolExportData: {
                const payload = spk.exportData();
                if (!payload) return McpToolResults.error("exportData returned null. Run the simulation first.");
                return McpToolResults.json({ format: "stream-snapshot-v1", data: JSON.parse(payload) });
            }

            case SpkMeasureBehavior.ToolCaptureScope: {
                const label  = args["label"]  as string | undefined;
                const format = (args["format"] as string | undefined) ?? "png";
                if (!label) return McpToolResults.error("Missing required argument: label.");

                if (format === "svg") {
                    const svg = spk.captureScopeSvg(label);
                    if (!svg) return McpToolResults.error(
                        `No scope widget found with title "${label}" or getSvg() failed. ` +
                        "Check that the widget is visible and its title matches exactly. " +
                        "Use scenario_list_nodes to discover scope node labels."
                    );
                    return McpToolResults.text(svg);
                }

                // Default: PNG — return visual image + text with dataUrl for save_figure.
                const dataUrl = spk.captureScope(label);
                if (!dataUrl) return McpToolResults.error(
                    `No scope widget found with title "${label}". ` +
                    "Check that the widget is visible and its title matches exactly. " +
                    "Use scenario_list_nodes to discover scope node labels."
                );
                const commaIdx = dataUrl.indexOf(",");
                const base64   = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
                return {
                    content: [
                        { type: "image", data: base64, mimeType: "image/png" },
                        { type: "text",  text: JSON.stringify({ label, dataUrl }) },
                    ],
                };
            }

            case SpkMeasureBehavior.ToolExportGraphSvg: {
                const profile = args["profile"] as string | undefined;
                const svg = spk.exportGraphSvg(profile);
                if (!svg) return McpToolResults.error(
                    "exportGraphSvg returned null. The node editor may not be initialised yet."
                );
                return McpToolResults.text(svg);
            }

            default:
                return McpToolResults.error(`Unknown tool: "${toolName}"`);
        }
    }
}
