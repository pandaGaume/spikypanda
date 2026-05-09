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
                    "\"<node-label>.<port>\". Lock-in nodes expose their magnitude port here, so this " +
                    "is typically the first call after sim_run.",
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
                    "Reads the magnitude of the FFT bin closest to `freqHz` for the named channel. " +
                    "Bin width = sampleRate / N. Pass `windowHz` to widen the search and pick the local " +
                    "maximum, useful when speed ripple shifts the peak by a few bins.",
                inputSchema: {
                    type: "object",
                    properties: {
                        channel: {
                            type: "string",
                            description: "FFT node label or stream key (e.g. 'FFT.spectrum' or the FFT node's display name).",
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
                    required: ["channel", "freqHz"],
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
                const channel = args["channel"] as string | undefined;
                const freqHz  = Number(args["freqHz"]);
                const windowHz = args["windowHz"] !== undefined ? Number(args["windowHz"]) : undefined;
                if (!channel) return McpToolResults.error("Missing required argument: channel");
                if (!Number.isFinite(freqHz)) return McpToolResults.error("freqHz must be a finite number.");
                const value = spk.readFftPeak(channel, freqHz, windowHz);
                if (value === null) return McpToolResults.error(`No FFT data found for channel "${channel}" near ${freqHz} Hz.`);
                return McpToolResults.json({ channel, freqHz, windowHz: windowHz ?? null, magnitude: value });
            }

            case SpkMeasureBehavior.ToolExportData: {
                const payload = spk.exportData();
                if (!payload) return McpToolResults.error("exportData returned null. Run the simulation first.");
                return McpToolResults.json({ format: "stream-snapshot-v1", data: JSON.parse(payload) });
            }

            default:
                return McpToolResults.error(`Unknown tool: "${toolName}"`);
        }
    }
}
