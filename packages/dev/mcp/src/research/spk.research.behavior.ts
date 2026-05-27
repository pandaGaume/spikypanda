import { McpBehavior, McpBehaviorOptions, McpResource, McpResourceTemplate, McpTool, McpToolResult, McpToolResults, JsonRpcMimeType } from "@cyanmycelium/mcp-core";
import { SpkResearchAdapter } from "./spk.research.adapter.js";

/**
 * MCP behavior backing the research store. Exposes write/read tools for
 * experiments, hypotheses, reports and the dataset manifest, plus resource
 * URIs that let an agent browse the store via the MCP `resources/read`
 * primitive.
 */
export class SpkResearchBehavior extends McpBehavior {
    public static readonly NAMESPACE = "research";

    public static readonly ToolLogExperiment      = "log_experiment";
    public static readonly ToolGetExperiments     = "get_experiments";
    public static readonly ToolWriteHypothesis    = "write_hypothesis";
    public static readonly ToolUpdateHypothesis   = "update_hypothesis";
    public static readonly ToolListHypotheses     = "list_hypotheses";
    public static readonly ToolWriteReport        = "write_report";
    public static readonly ToolReadReport         = "read_report";
    public static readonly ToolListReports        = "list_reports";
    public static readonly ToolAddDatasetEntry    = "add_dataset_entry";
    public static readonly ToolGetDatasetManifest = "get_dataset_manifest";
    public static readonly ToolSaveFigure         = "save_figure";
    public static readonly ToolSaveSvg            = "save_svg";

    private readonly _researchAdapter: SpkResearchAdapter;

    public constructor(adapter: SpkResearchAdapter, options: McpBehaviorOptions = {}) {
        super(adapter, {
            ...options,
            domain: options.domain ?? SpkResearchAdapter.DOMAIN,
            namespace: options.namespace ?? SpkResearchBehavior.NAMESPACE,
            name: options.name ?? "Scientific Research Store",
            description: options.description ?? "Persistent log of experiments, hypotheses, reports and dataset entries.",
            mimeType: options.mimeType ?? JsonRpcMimeType,
        });
        this._researchAdapter = adapter;
    }

    // ── Resources ────────────────────────────────────────────────────────

    protected override _buildResources(): McpResource[] {
        return [
            { uri: SpkResearchAdapter.URI_EXPERIMENTS, name: "Experiments",  description: "JSON entries logged via log_experiment.",  mimeType: JsonRpcMimeType },
            { uri: SpkResearchAdapter.URI_HYPOTHESES,  name: "Hypotheses",   description: "Markdown documents describing pending hypotheses.", mimeType: JsonRpcMimeType },
            { uri: SpkResearchAdapter.URI_REPORTS,     name: "Reports",      description: "Markdown reports written by the agent.",   mimeType: JsonRpcMimeType },
            { uri: SpkResearchAdapter.URI_DATASET,     name: "Dataset",      description: "Manifest of labeled samples for downstream training.", mimeType: JsonRpcMimeType },
        ];
    }

    protected override _buildTemplate(): McpResourceTemplate[] {
        return [
            { uriTemplate: "research://experiments/{id}", name: "Experiment record", description: "Single experiment entry by id.", mimeType: JsonRpcMimeType },
            { uriTemplate: "research://hypotheses/{name}", name: "Hypothesis document", description: "Single hypothesis markdown by name.", mimeType: "text/markdown" },
            { uriTemplate: "research://reports/{name}",    name: "Report document",     description: "Single report markdown by name.",    mimeType: "text/markdown" },
        ];
    }

    // ── Tools ────────────────────────────────────────────────────────────

    protected override _buildTools(): McpTool[] {
        return [
            {
                name: SpkResearchBehavior.ToolLogExperiment,
                description:
                    "Persists a single experiment record. The payload is opaque JSON; canonical keys are " +
                    "`scenario`, `measurements`, `notes`. When `projectId` is set the record is also " +
                    "written under projects/<id>/experiments/. Returns the assigned id and paths.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id:           { type: "string", description: "Optional explicit id; defaults to a timestamp-derived slug." },
                        projectId:    { type: "string", description: "If set, dual-write under the matching project's experiments/ folder. Caller should also call project_record_artifact to update project stats." },
                        scenario:     { type: "object", description: "Snapshot of the simulation configuration that produced the data.", additionalProperties: true },
                        measurements: { type: "object", description: "Numeric readouts: amplitudes, FFT peaks, derived metrics.",        additionalProperties: true },
                        notes:        { type: "string", description: "Free text observations." },
                    },
                    required: [],
                    additionalProperties: true,
                },
            },
            {
                name: SpkResearchBehavior.ToolGetExperiments,
                description: "Returns up to `limit` experiment records, newest first. Optionally filtered by `since` (ISO timestamp).",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: { type: "integer", minimum: 1, maximum: 1000, description: "Maximum number of records to return." },
                        since: { type: "string", description: "ISO timestamp; only records modified at or after this point are returned." },
                    },
                    required: [],
                    additionalProperties: false,
                },
            },
            {
                name: SpkResearchBehavior.ToolWriteHypothesis,
                description: "Creates a new hypothesis document or replaces an existing one with the given name. Project-local when `projectId` is set, global otherwise.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name:      { type: "string", description: "Document name (without extension)." },
                        content:   { type: "string", description: "Full markdown body." },
                        projectId: { type: "string", description: "If set, write under projects/<id>/hypotheses/ instead of the global folder." },
                    },
                    required: ["name", "content"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkResearchBehavior.ToolUpdateHypothesis,
                description: "Alias of write_hypothesis: replaces the document body in full. Project-local when `projectId` is set.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name:      { type: "string", description: "Document name (without extension)." },
                        content:   { type: "string", description: "Full replacement body." },
                        projectId: { type: "string", description: "Same semantics as write_hypothesis." },
                    },
                    required: ["name", "content"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkResearchBehavior.ToolListHypotheses,
                description: "Lists every hypothesis document with its size and last-modified timestamp.",
                inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
            },
            {
                name: SpkResearchBehavior.ToolWriteReport,
                description: "Creates a new report document or replaces an existing one with the given name. Project-local when `projectId` is set, global otherwise.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name:      { type: "string", description: "Document name (without extension)." },
                        content:   { type: "string", description: "Full markdown body authored by the agent." },
                        projectId: { type: "string", description: "If set, write under projects/<id>/reports/ instead of the global folder." },
                    },
                    required: ["name", "content"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkResearchBehavior.ToolReadReport,
                description: "Returns the markdown body of a single report document. Project-local when `projectId` is set.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name:      { type: "string", description: "Document name (without extension)." },
                        projectId: { type: "string", description: "If set, read from projects/<id>/reports/ instead of the global folder." },
                    },
                    required: ["name"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkResearchBehavior.ToolListReports,
                description: "Lists every report document with its size and last-modified timestamp.",
                inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
            },
            {
                name: SpkResearchBehavior.ToolAddDatasetEntry,
                description:
                    "Appends one entry to the dataset manifest. Canonical keys: `label` (class), " +
                    "`features` (object of named scalars), `source` (link or path to raw data).",
                inputSchema: {
                    type: "object",
                    properties: {
                        label:    { type: "string", description: "Sample class name (e.g. 'D1_imbalance_0p5_gravity_on')." },
                        features: { type: "object", description: "Map of feature names to numeric values.", additionalProperties: true },
                        source:   { type: "string", description: "Optional pointer back to the raw measurement (file path, experiment id, ...)." },
                    },
                    required: [],
                    additionalProperties: true,
                },
            },
            {
                name: SpkResearchBehavior.ToolGetDatasetManifest,
                description: "Returns the full dataset manifest (every entry ever appended).",
                inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
            },
            {
                name: SpkResearchBehavior.ToolSaveFigure,
                description:
                    "Saves a base64 PNG data URL returned by measure_capture_scope (format='png') as a PNG file under " +
                    "~/spikypanda-research/reports/figures/ (or the project equivalent). " +
                    "Returns { name, path, relativePath } where relativePath (e.g. 'figures/fft_accelx_D1.png') " +
                    "can be embedded directly in a markdown report: ![label](figures/name.png). " +
                    "Typical workflow: measure_capture_scope (png) -> save_figure -> reference in write_report.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name:      { type: "string",  description: "File name without extension (e.g. 'fft_accelx_D1_gravity_on')." },
                        dataUrl:   { type: "string",  description: "Base64 PNG data URL from measure_capture_scope (data:image/png;base64,...)." },
                        projectId: { type: "string",  description: "If set, save under projects/<id>/reports/figures/ instead of the global folder." },
                    },
                    required: ["name", "dataUrl"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkResearchBehavior.ToolSaveSvg,
                description:
                    "Saves an SVG string returned by measure_capture_scope (format='svg') or " +
                    "measure_export_graph_svg as an SVG file under " +
                    "~/spikypanda-research/reports/figures/ (or the project equivalent). " +
                    "Returns { name, path, relativePath } where relativePath (e.g. 'figures/fft_accelx_D1.svg') " +
                    "can be embedded directly in a markdown report: ![label](figures/name.svg). " +
                    "SVG files are resolution-independent and preferred for printed reports. " +
                    "Typical workflows: " +
                    "measure_capture_scope (svg) -> save_svg -> reference in write_report; " +
                    "measure_export_graph_svg -> save_svg -> reference in write_report.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name:      { type: "string", description: "File name without extension (e.g. 'fft_accelx_D1_gravity_on')." },
                        content:   { type: "string", description: "SVG string from measure_capture_scope (format=svg) or measure_export_graph_svg." },
                        projectId: { type: "string", description: "If set, save under projects/<id>/reports/figures/ instead of the global folder." },
                    },
                    required: ["name", "content"],
                    additionalProperties: false,
                },
            },
        ];
    }

    // ── Runtime ──────────────────────────────────────────────────────────

    public override async executeToolAsync(_uri: string, toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
        try {
            switch (toolName) {
                case SpkResearchBehavior.ToolLogExperiment: {
                    const out = await this._researchAdapter.logExperiment(args);
                    return McpToolResults.json(out);
                }
                case SpkResearchBehavior.ToolGetExperiments: {
                    const limit = args["limit"] !== undefined ? Number(args["limit"]) : undefined;
                    const since = args["since"] as string | undefined;
                    const items = await this._researchAdapter.getExperiments(limit, since);
                    return McpToolResults.json({ count: items.length, items });
                }
                case SpkResearchBehavior.ToolWriteHypothesis:
                case SpkResearchBehavior.ToolUpdateHypothesis: {
                    const name = args["name"] as string | undefined;
                    const content = args["content"] as string | undefined;
                    const projectId = args["projectId"] as string | undefined;
                    if (!name || content === undefined) return McpToolResults.error("Missing required argument: name and content.");
                    const out = await this._researchAdapter.writeHypothesis(name, content, projectId);
                    return McpToolResults.json(out);
                }
                case SpkResearchBehavior.ToolListHypotheses: {
                    const items = await this._researchAdapter.listHypotheses();
                    return McpToolResults.json({ count: items.length, items });
                }
                case SpkResearchBehavior.ToolWriteReport: {
                    const name = args["name"] as string | undefined;
                    const content = args["content"] as string | undefined;
                    const projectId = args["projectId"] as string | undefined;
                    if (!name || content === undefined) return McpToolResults.error("Missing required argument: name and content.");
                    const out = await this._researchAdapter.writeReport(name, content, projectId);
                    return McpToolResults.json(out);
                }
                case SpkResearchBehavior.ToolReadReport: {
                    const name = args["name"] as string | undefined;
                    const projectId = args["projectId"] as string | undefined;
                    if (!name) return McpToolResults.error("Missing required argument: name.");
                    const text = await this._researchAdapter.readReport(name, projectId);
                    if (text === null) return McpToolResults.error(`Report not found: "${name}"`);
                    return McpToolResults.text(text);
                }
                case SpkResearchBehavior.ToolListReports: {
                    const items = await this._researchAdapter.listReports();
                    return McpToolResults.json({ count: items.length, items });
                }
                case SpkResearchBehavior.ToolAddDatasetEntry: {
                    const out = await this._researchAdapter.addDatasetEntry(args);
                    return McpToolResults.json(out);
                }
                case SpkResearchBehavior.ToolGetDatasetManifest: {
                    const m = await this._researchAdapter.getDatasetManifest();
                    return McpToolResults.json(m);
                }
                case SpkResearchBehavior.ToolSaveFigure: {
                    const name      = args["name"]      as string | undefined;
                    const dataUrl   = args["dataUrl"]   as string | undefined;
                    const projectId = args["projectId"] as string | undefined;
                    if (!name)    return McpToolResults.error("Missing required argument: name.");
                    if (!dataUrl) return McpToolResults.error("Missing required argument: dataUrl.");
                    if (!dataUrl.startsWith("data:")) return McpToolResults.error("dataUrl must be a valid data URI (starts with 'data:').");
                    const out = await this._researchAdapter.saveFigure(name, dataUrl, projectId);
                    return McpToolResults.json(out);
                }
                case SpkResearchBehavior.ToolSaveSvg: {
                    const name      = args["name"]      as string | undefined;
                    const content   = args["content"]   as string | undefined;
                    const projectId = args["projectId"] as string | undefined;
                    if (!name)    return McpToolResults.error("Missing required argument: name.");
                    if (!content) return McpToolResults.error("Missing required argument: content.");
                    if (!content.includes("<svg")) return McpToolResults.error("content does not look like an SVG string (expected '<svg' element).");
                    const out = await this._researchAdapter.saveSvg(name, content, projectId);
                    return McpToolResults.json(out);
                }
                default:
                    return McpToolResults.error(`Unknown tool: "${toolName}"`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return McpToolResults.error(`research tool failed: ${msg}`);
        }
    }
}
