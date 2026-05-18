import { McpBehavior, McpBehaviorOptions, McpResource, McpResourceTemplate, McpTool, McpToolResult, McpToolResults, JsonRpcMimeType } from "@cyanmycelium/mcp-core";
import { SpkProjectAdapter } from "./spk.project.adapter.js";
import {
    Prerequisite, Hypothesis, MatrixSpec,
    PrereqStatus, HypothesisStatus, ProjectStatus, ArtifactType,
    BUILT_IN_CHECK_KINDS,
} from "./spk.project.types.js";

/**
 * MCP behavior driving the research project lifecycle.
 *
 * The agent is the project author: it composes prerequisites, hypotheses
 * and the experimental matrix, then runs the prereq checks (or asks the
 * page to run them), iterates on remediation actions until everything is
 * green, then sets the project to `active`.
 *
 * The behavior never executes a check itself; it only records the result
 * supplied by the caller (page or agent) so the project file stays the
 * single source of truth.
 */
export class SpkProjectBehavior extends McpBehavior {
    public static readonly NAMESPACE = "projects";

    public static readonly ToolList                 = "project_list";
    public static readonly ToolGet                  = "project_get";
    public static readonly ToolCreate               = "project_create";
    public static readonly ToolUpdate               = "project_update";
    public static readonly ToolDelete               = "project_delete";
    public static readonly ToolSetStatus            = "project_set_status";
    public static readonly ToolDefinePrereqs        = "project_define_prerequisites";
    public static readonly ToolSetPrereqResult      = "project_set_prereq_result";
    public static readonly ToolAckPrereq            = "project_ack_prereq";
    public static readonly ToolDefineHypotheses     = "project_define_hypotheses";
    public static readonly ToolSetHypothesisStatus  = "project_set_hypothesis_status";
    public static readonly ToolSetMatrix            = "project_set_matrix";
    public static readonly ToolRecordArtifact       = "project_record_artifact";
    public static readonly ToolListCheckKinds       = "project_list_check_kinds";

    private readonly _projectAdapter: SpkProjectAdapter;

    public constructor(adapter: SpkProjectAdapter, options: McpBehaviorOptions = {}) {
        super(adapter, {
            ...options,
            domain: options.domain ?? SpkProjectAdapter.DOMAIN,
            namespace: options.namespace ?? SpkProjectBehavior.NAMESPACE,
            name: options.name ?? "Research Projects",
            description: options.description ?? "Project lifecycle: prerequisites, hypotheses, experimental matrix, artifacts.",
            mimeType: options.mimeType ?? JsonRpcMimeType,
        });
        this._projectAdapter = adapter;
    }

    // ── Resources ────────────────────────────────────────────────────

    protected override _buildResources(): McpResource[] {
        return [
            { uri: SpkProjectAdapter.URI_PROJECTS,    name: "Projects list",        description: "Summary of every project under the current research root.", mimeType: JsonRpcMimeType },
            { uri: SpkProjectAdapter.URI_CHECK_KINDS, name: "Check-kind catalogue", description: "Built-in check kinds the agent may reference in auto prerequisites.", mimeType: JsonRpcMimeType },
        ];
    }

    protected override _buildTemplate(): McpResourceTemplate[] {
        return [
            { uriTemplate: "projects://{projectId}", name: "Project record", description: "Full project data: hypotheses, prerequisites, matrix, artifacts, stats.", mimeType: JsonRpcMimeType },
        ];
    }

    // ── Tools ────────────────────────────────────────────────────────

    protected override _buildTools(): McpTool[] {
        const builtInKinds = BUILT_IN_CHECK_KINDS.map((k) => k.kind);

        return [
            {
                name: SpkProjectBehavior.ToolList,
                description: "Lists every project under the current research root with its prereq progress and run count.",
                inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
            },
            {
                name: SpkProjectBehavior.ToolGet,
                description: "Returns the full project record (prerequisites, hypotheses, matrix, artifacts).",
                inputSchema: {
                    type: "object",
                    properties: { projectId: { type: "string", description: "Project identifier." } },
                    required: ["projectId"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolCreate,
                description: "Creates a new project in `draft` status with an optional explicit id; the agent then defines prerequisites and hypotheses.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id:    { type: "string", description: "Optional explicit id; defaults to a slug derived from the name." },
                        name:  { type: "string", description: "Human-readable project name." },
                        goal:  { type: "string", description: "One-paragraph statement of the research goal." },
                        notes: { type: "string", description: "Free-form context (priors, motivation, references)." },
                    },
                    required: ["name", "goal"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolUpdate,
                description: "Patches a project record. Pass `projectId` plus any subset of mutable fields (name, goal, notes).",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        name:  { type: "string" },
                        goal:  { type: "string" },
                        notes: { type: "string" },
                    },
                    required: ["projectId"],
                    additionalProperties: true,
                },
            },
            {
                name: SpkProjectBehavior.ToolDelete,
                description: "Removes a project and all its artifacts on disk. Irreversible.",
                inputSchema: {
                    type: "object",
                    properties: { projectId: { type: "string" } },
                    required: ["projectId"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolSetStatus,
                description: "Transitions a project between draft, ready, active and closed.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        status:    { type: "string", enum: ["draft", "ready", "active", "closed"] },
                    },
                    required: ["projectId", "status"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolDefinePrereqs,
                description:
                    "Replaces the prerequisite list. Each entry is { id, type ('auto'|'manual'), category, description, " +
                    "check?: { kind, args }, remediation? }. Auto checks must reference one of the kinds returned by " +
                    "project_list_check_kinds. Statuses default to 'pending'.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId:     { type: "string" },
                        prerequisites: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id:          { type: "string" },
                                    type:        { type: "string", enum: ["auto", "manual"] },
                                    category:    { type: "string", enum: ["op", "runtime", "graph", "doc", "dataset", "training", "other"] },
                                    description: { type: "string" },
                                    check: {
                                        type: "object",
                                        properties: {
                                            kind: { type: "string", enum: builtInKinds.length ? builtInKinds : undefined },
                                            args: { type: "object", additionalProperties: true },
                                        },
                                        required: ["kind"],
                                        additionalProperties: false,
                                    },
                                    remediation: { type: "string" },
                                },
                                required: ["type", "category", "description"],
                                additionalProperties: true,
                            },
                        },
                    },
                    required: ["projectId", "prerequisites"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolSetPrereqResult,
                description: "Records the outcome of an auto check (status: 'pass' | 'fail') with an optional message.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        prereqId:  { type: "string" },
                        status:    { type: "string", enum: ["pass", "fail", "pending"] },
                        message:   { type: "string" },
                    },
                    required: ["projectId", "prereqId", "status"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolAckPrereq,
                description: "Acknowledges a manual prerequisite. Sets status to 'acked' with an audit trail (who, when, message).",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        prereqId:  { type: "string" },
                        ackedBy:   { type: "string" },
                        message:   { type: "string" },
                    },
                    required: ["projectId", "prereqId"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolDefineHypotheses,
                description: "Replaces the hypotheses list. Each entry: { id?, statement, falsifyIf, status?, notes? }.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId:  { type: "string" },
                        hypotheses: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id:        { type: "string" },
                                    statement: { type: "string" },
                                    falsifyIf: { type: "string" },
                                    status:    { type: "string", enum: ["open", "validated", "falsified", "inconclusive"] },
                                    notes:     { type: "string" },
                                },
                                required: ["statement", "falsifyIf"],
                                additionalProperties: false,
                            },
                        },
                    },
                    required: ["projectId", "hypotheses"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolSetHypothesisStatus,
                description: "Updates the falsification verdict on one hypothesis.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId:    { type: "string" },
                        hypothesisId: { type: "string" },
                        status:       { type: "string", enum: ["open", "validated", "falsified", "inconclusive"] },
                        notes:        { type: "string" },
                    },
                    required: ["projectId", "hypothesisId", "status"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolSetMatrix,
                description: "Sets or replaces the experimental matrix (factors x values, replicates, totalRuns).",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        matrix: {
                            type: "object",
                            properties: {
                                factors:    { type: "object", additionalProperties: { type: "array" } },
                                replicates: { type: "integer", minimum: 1 },
                                totalRuns:  { type: "integer", minimum: 0 },
                            },
                            required: ["factors"],
                            additionalProperties: false,
                        },
                    },
                    required: ["projectId"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolRecordArtifact,
                description: "Appends an artifact descriptor (experiment id, report path, dataset entry, training run, ...). Stats counters move accordingly.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        type:      { type: "string", enum: ["experiment", "report", "hypothesis", "dataset", "training", "other"] },
                        path:      { type: "string", description: "Path relative to the project directory or absolute." },
                        metadata:  { type: "object", additionalProperties: true },
                    },
                    required: ["projectId", "type", "path"],
                    additionalProperties: false,
                },
            },
            {
                name: SpkProjectBehavior.ToolListCheckKinds,
                description: "Returns the catalogue of built-in check kinds (id, description, args schema, runs-on).",
                inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
            },
        ];
    }

    // ── Runtime ──────────────────────────────────────────────────────

    public override async executeToolAsync(_uri: string, toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
        try {
            switch (toolName) {
                case SpkProjectBehavior.ToolList: {
                    const items = await this._projectAdapter.listProjects();
                    return McpToolResults.json({ count: items.length, items });
                }
                case SpkProjectBehavior.ToolGet: {
                    const p = await this._projectAdapter.getProject(args["projectId"] as string);
                    if (!p) return McpToolResults.error(`Unknown project: "${args["projectId"]}"`);
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolCreate: {
                    const p = await this._projectAdapter.createProject({
                        id:    args["id"]    as string | undefined,
                        name:  String(args["name"]),
                        goal:  String(args["goal"] ?? ""),
                        notes: args["notes"] as string | undefined,
                    });
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolUpdate: {
                    const { projectId, ...patch } = args as Record<string, unknown>;
                    const p = await this._projectAdapter.updateProject(String(projectId), patch as Partial<typeof patch>);
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolDelete: {
                    await this._projectAdapter.deleteProject(args["projectId"] as string);
                    return McpToolResults.text(`Deleted project "${args["projectId"]}".`);
                }
                case SpkProjectBehavior.ToolSetStatus: {
                    const p = await this._projectAdapter.setStatus(
                        args["projectId"] as string,
                        args["status"] as ProjectStatus,
                    );
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolDefinePrereqs: {
                    const p = await this._projectAdapter.definePrerequisites(
                        args["projectId"] as string,
                        (args["prerequisites"] as Prerequisite[]) ?? [],
                    );
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolSetPrereqResult: {
                    const p = await this._projectAdapter.setPrereqResult(
                        args["projectId"] as string,
                        args["prereqId"] as string,
                        args["status"] as PrereqStatus,
                        args["message"] as string | undefined,
                    );
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolAckPrereq: {
                    const p = await this._projectAdapter.ackPrereq(
                        args["projectId"] as string,
                        args["prereqId"] as string,
                        args["ackedBy"] as string | undefined,
                        args["message"] as string | undefined,
                    );
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolDefineHypotheses: {
                    const p = await this._projectAdapter.defineHypotheses(
                        args["projectId"] as string,
                        (args["hypotheses"] as Hypothesis[]) ?? [],
                    );
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolSetHypothesisStatus: {
                    const p = await this._projectAdapter.setHypothesisStatus(
                        args["projectId"] as string,
                        args["hypothesisId"] as string,
                        args["status"] as HypothesisStatus,
                        args["notes"] as string | undefined,
                    );
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolSetMatrix: {
                    const p = await this._projectAdapter.setMatrix(
                        args["projectId"] as string,
                        (args["matrix"] as MatrixSpec | null | undefined) ?? null,
                    );
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolRecordArtifact: {
                    const p = await this._projectAdapter.recordArtifact(
                        args["projectId"] as string,
                        args["type"] as ArtifactType,
                        args["path"] as string,
                        args["metadata"] as Record<string, unknown> | undefined,
                    );
                    return McpToolResults.json(p);
                }
                case SpkProjectBehavior.ToolListCheckKinds: {
                    return McpToolResults.json({ count: BUILT_IN_CHECK_KINDS.length, kinds: BUILT_IN_CHECK_KINDS });
                }
                default:
                    return McpToolResults.error(`Unknown tool: "${toolName}"`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return McpToolResults.error(`projects tool failed: ${msg}`);
        }
    }
}
