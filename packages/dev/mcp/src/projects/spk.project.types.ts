/**
 * Persistent shape of a SpikyPanda research project.
 *
 * The structure is fully defined by the agent: the system supplies primitives
 * (create, define, run-check, ack) and a registry of *check kinds* the agent
 * may reference. The agent decides what to track, what to verify, and what
 * counts as feasible for a given research phase.
 */

export type ProjectStatus = "draft" | "ready" | "active" | "closed";

export type HypothesisStatus = "open" | "validated" | "falsified" | "inconclusive";

export type PrereqStatus = "pending" | "pass" | "fail" | "acked";

export type PrereqCategory = "op" | "runtime" | "graph" | "doc" | "dataset" | "training" | "other";

export type PrereqType = "auto" | "manual";

export interface CheckSpec {
    /** Identifier of a check function registered in window.SpkPrereqChecks. */
    kind: string;
    /** Arguments forwarded to the check function as a single object. */
    args?: Record<string, unknown>;
}

export interface Prerequisite {
    id: string;
    type: PrereqType;
    category: PrereqCategory;
    description: string;
    /** Required when type === "auto"; ignored otherwise. */
    check?: CheckSpec | null;
    /**
     * Human-readable instruction shown when the prereq fails. The agent uses
     * this slot to describe the dev work needed (new node, formula change,
     * library entry...) so a follow-up loop can act on it.
     */
    remediation?: string;
    status: PrereqStatus;
    /** ISO timestamp of the last `run_check` or `ack` operation. */
    lastRun?: string;
    /** Free message returned by the check or supplied by the human ack. */
    message?: string;
    ackedBy?: string;
    ackedAt?: string;
}

export interface Hypothesis {
    id: string;
    statement: string;
    /** Falsification criterion. Required so the hypothesis is testable. */
    falsifyIf: string;
    status: HypothesisStatus;
    notes?: string;
}

export interface MatrixSpec {
    factors: Record<string, Array<string | number | boolean>>;
    replicates?: number;
    totalRuns?: number;
}

export type ArtifactType = "experiment" | "report" | "hypothesis" | "dataset" | "training" | "other";

export interface Artifact {
    id: string;
    type: ArtifactType;
    /** Path relative to the project directory, or absolute when external. */
    path: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

export interface ProjectStats {
    runsCompleted: number;
    datasetEntries: number;
    reportCount: number;
    trainingRuns: number;
}

export interface Project {
    id: string;
    name: string;
    goal: string;
    createdAt: string;
    updatedAt: string;
    status: ProjectStatus;
    hypotheses: Hypothesis[];
    prerequisites: Prerequisite[];
    matrix: MatrixSpec | null;
    artifacts: Artifact[];
    stats: ProjectStats;
    notes: string;
}

export interface ProjectSummary {
    id: string;
    name: string;
    goal: string;
    status: ProjectStatus;
    createdAt: string;
    updatedAt: string;
    prereqProgress: { total: number; pass: number; acked: number; fail: number; pending: number };
    runsCompleted: number;
}

/**
 * Lightweight schema describing one supported check kind, exposed to the
 * agent so it can pick the right primitive when defining auto-prereqs.
 *
 * The actual JS implementation lives in the browser registry
 * (`window.SpkPrereqChecks[<kind>]`). The Node side does not run these
 * checks; the page or the agent does, and the result is stored back via
 * `project_set_prereq_result`.
 */
export interface CheckKindSchema {
    kind: string;
    description: string;
    /** JSON-schema-ish description of the `args` object. */
    args: Record<string, { type: string; description: string; required?: boolean }>;
    /** "browser" or "node" — where the check function executes. */
    runs: "browser" | "node" | "either";
}

export const BUILT_IN_CHECK_KINDS: CheckKindSchema[] = [
    { kind: "spk_api_available", description: "window.__spk control surface is available on the connected page.", args: {}, runs: "browser" },
    { kind: "op_registered",     description: "An op id is present in the OPS_V1 registry (window.__spkOps).", args: { opId: { type: "string", description: "Op id, e.g. 'spk.MotorPMSM'.", required: true } }, runs: "browser" },
    { kind: "op_in_active_graph",description: "The active graph has at least one node of the given op.",       args: { opId: { type: "string", description: "Op id to look for.", required: true } }, runs: "browser" },
    { kind: "port_present",      description: "The op exposes a named port in the requested direction.",       args: { opId: { type: "string", description: "Op id.", required: true }, port: { type: "string", description: "Port name.", required: true }, direction: { type: "string", description: "'input' or 'output'.", required: true } }, runs: "browser" },
    { kind: "graph_in_library",  description: "A named graph file exists under the static library.",            args: { name: { type: "string", description: "File name without extension under /data/graphs/.", required: true } }, runs: "browser" },
    { kind: "research_dir_writable", description: "Research root replies to a noop POST on the admin endpoint.", args: {}, runs: "browser" },
    { kind: "dataset_min_entries", description: "The global dataset manifest holds at least N entries.",        args: { n: { type: "number", description: "Lower bound on the entry count.", required: true } }, runs: "browser" },
];
