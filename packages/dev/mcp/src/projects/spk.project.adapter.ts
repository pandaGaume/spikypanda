import { McpAdapterBase, McpResourceContent, McpToolResult, McpToolResults, JsonRpcMimeType } from "@cyanmycelium/mcp-core";
import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { homedir } from "node:os";
import {
    Project, ProjectStatus, ProjectSummary, Prerequisite, PrereqStatus,
    Hypothesis, HypothesisStatus, MatrixSpec, Artifact, ArtifactType,
    BUILT_IN_CHECK_KINDS, CheckKindSchema,
} from "./spk.project.types.js";

/**
 * Filesystem-backed adapter for SpikyPanda research projects.
 *
 * The adapter stores one project per directory under
 * `<root>/projects/<projectId>/project.json`, with sibling sub-directories
 * `experiments/`, `reports/`, `hypotheses/`, `training/` holding artifacts
 * that belong to that project.
 *
 * The project root is the same root used by SpkResearchAdapter so a single
 * runtime change (admin /admin/research-dir) relocates every research
 * surface together. The adapter receives a getter into the research adapter
 * to read the live root, rather than caching it; this keeps projects in
 * sync with the research store at all times.
 */
export class SpkProjectAdapter extends McpAdapterBase {
    public static readonly DOMAIN = "projects";

    public static readonly URI_PROJECTS = "projects://list";
    public static readonly URI_CHECK_KINDS = "projects://check-kinds";

    private readonly _getResearchRoot: () => string;

    public constructor(getResearchRoot?: () => string) {
        super(SpkProjectAdapter.DOMAIN);
        this._getResearchRoot = getResearchRoot ?? (() => {
            return process.env["SPK_RESEARCH_DIR"] || resolve(homedir(), "spikypanda-research");
        });
    }

    public get projectsRoot(): string {
        return resolve(this._getResearchRoot(), "projects");
    }

    public projectDir(projectId: string): string {
        return join(this.projectsRoot, this._safeName(projectId));
    }

    public projectFile(projectId: string): string {
        return join(this.projectDir(projectId), "project.json");
    }

    public async ensureProjectsRoot(): Promise<void> {
        await mkdir(this.projectsRoot, { recursive: true });
    }

    // ── IMcpBehaviorAdapter ──────────────────────────────────────────

    public async readResourceAsync(uri: string): Promise<McpResourceContent | undefined> {
        if (uri === SpkProjectAdapter.URI_PROJECTS) {
            const items = await this.listProjects();
            return this._jsonContent(uri, { count: items.length, items });
        }
        if (uri === SpkProjectAdapter.URI_CHECK_KINDS) {
            return this._jsonContent(uri, { count: BUILT_IN_CHECK_KINDS.length, kinds: BUILT_IN_CHECK_KINDS });
        }
        const prefix = "projects://";
        if (uri.startsWith(prefix)) {
            const id = uri.slice(prefix.length);
            const project = await this.getProject(id);
            if (!project) return undefined;
            return this._jsonContent(uri, project);
        }
        return undefined;
    }

    public async executeToolAsync(_uri: string, toolName: string, _args: Record<string, unknown>): Promise<McpToolResult> {
        return McpToolResults.error(`SpkProjectAdapter: tool not handled at adapter level: "${toolName}"`);
    }

    // ── CRUD ─────────────────────────────────────────────────────────

    public async listProjects(): Promise<ProjectSummary[]> {
        await this.ensureProjectsRoot();
        const names = await readdir(this.projectsRoot);
        const out: ProjectSummary[] = [];
        for (const n of names) {
            const file = join(this.projectsRoot, n, "project.json");
            if (!existsSync(file)) continue;
            try {
                const p = JSON.parse(await readFile(file, "utf8")) as Project;
                out.push(this._summarize(p));
            } catch { /* skip malformed */ }
        }
        out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return out;
    }

    public async getProject(projectId: string): Promise<Project | null> {
        const file = this.projectFile(projectId);
        if (!existsSync(file)) return null;
        try {
            return JSON.parse(await readFile(file, "utf8")) as Project;
        } catch {
            return null;
        }
    }

    public async createProject(input: { id?: string; name: string; goal: string; notes?: string }): Promise<Project> {
        await this.ensureProjectsRoot();
        if (!input.name || !input.name.trim()) throw new Error("Missing 'name'.");
        const id = this._safeName(input.id || this._slug(input.name));
        const dir = this.projectDir(id);
        if (existsSync(join(dir, "project.json"))) {
            throw new Error(`Project already exists: "${id}"`);
        }
        await mkdir(dir, { recursive: true });
        await mkdir(join(dir, "experiments"), { recursive: true });
        await mkdir(join(dir, "reports"),     { recursive: true });
        await mkdir(join(dir, "hypotheses"),  { recursive: true });
        await mkdir(join(dir, "training"),    { recursive: true });

        const now = new Date().toISOString();
        const project: Project = {
            id, name: input.name.trim(), goal: (input.goal || "").trim(),
            createdAt: now, updatedAt: now, status: "draft",
            hypotheses: [], prerequisites: [], matrix: null, artifacts: [],
            stats: { runsCompleted: 0, datasetEntries: 0, reportCount: 0, trainingRuns: 0 },
            notes: (input.notes || "").trim(),
        };
        await this._save(project);
        return project;
    }

    public async updateProject(projectId: string, patch: Partial<Project>): Promise<Project> {
        const project = await this._loadOrThrow(projectId);
        const merged: Project = {
            ...project,
            ...patch,
            id: project.id,
            createdAt: project.createdAt,
            updatedAt: new Date().toISOString(),
        };
        await this._save(merged);
        return merged;
    }

    public async deleteProject(projectId: string): Promise<void> {
        const dir = this.projectDir(projectId);
        if (!existsSync(dir)) return;
        await rm(dir, { recursive: true, force: true });
    }

    public async setStatus(projectId: string, status: ProjectStatus): Promise<Project> {
        return this.updateProject(projectId, { status });
    }

    // ── Prerequisites ────────────────────────────────────────────────

    public async definePrerequisites(projectId: string, prerequisites: Prerequisite[]): Promise<Project> {
        // Normalize: stamp pending status when missing, dedupe ids.
        const seen = new Set<string>();
        const cleaned: Prerequisite[] = [];
        for (const p of prerequisites) {
            const id = p.id || this._slug(p.description || "prereq");
            if (seen.has(id)) continue;
            seen.add(id);
            cleaned.push({
                ...p,
                id,
                status: p.status ?? "pending",
            });
        }
        return this.updateProject(projectId, { prerequisites: cleaned });
    }

    public async setPrereqResult(projectId: string, prereqId: string, status: PrereqStatus, message?: string): Promise<Project> {
        const project = await this._loadOrThrow(projectId);
        const idx = project.prerequisites.findIndex((p) => p.id === prereqId);
        if (idx < 0) throw new Error(`Unknown prerequisite: "${prereqId}"`);
        const now = new Date().toISOString();
        project.prerequisites[idx] = {
            ...project.prerequisites[idx],
            status, lastRun: now, message,
        };
        project.updatedAt = now;
        await this._save(project);
        return project;
    }

    public async ackPrereq(projectId: string, prereqId: string, ackedBy?: string, message?: string): Promise<Project> {
        const project = await this._loadOrThrow(projectId);
        const idx = project.prerequisites.findIndex((p) => p.id === prereqId);
        if (idx < 0) throw new Error(`Unknown prerequisite: "${prereqId}"`);
        const now = new Date().toISOString();
        project.prerequisites[idx] = {
            ...project.prerequisites[idx],
            status: "acked",
            lastRun: now,
            message: message ?? project.prerequisites[idx].message,
            ackedBy: ackedBy || "human",
            ackedAt: now,
        };
        project.updatedAt = now;
        await this._save(project);
        return project;
    }

    // ── Hypotheses ───────────────────────────────────────────────────

    public async defineHypotheses(projectId: string, hypotheses: Hypothesis[]): Promise<Project> {
        const seen = new Set<string>();
        const cleaned: Hypothesis[] = [];
        for (const h of hypotheses) {
            const id = h.id || this._slug(h.statement || "h");
            if (seen.has(id)) continue;
            seen.add(id);
            cleaned.push({ ...h, id, status: h.status ?? "open" });
        }
        return this.updateProject(projectId, { hypotheses: cleaned });
    }

    public async setHypothesisStatus(projectId: string, hypothesisId: string, status: HypothesisStatus, notes?: string): Promise<Project> {
        const project = await this._loadOrThrow(projectId);
        const idx = project.hypotheses.findIndex((h) => h.id === hypothesisId);
        if (idx < 0) throw new Error(`Unknown hypothesis: "${hypothesisId}"`);
        project.hypotheses[idx] = {
            ...project.hypotheses[idx], status, notes: notes ?? project.hypotheses[idx].notes,
        };
        project.updatedAt = new Date().toISOString();
        await this._save(project);
        return project;
    }

    // ── Matrix / artifacts / stats ───────────────────────────────────

    public async setMatrix(projectId: string, matrix: MatrixSpec | null): Promise<Project> {
        return this.updateProject(projectId, { matrix });
    }

    public async recordArtifact(projectId: string, type: ArtifactType, path: string, metadata?: Record<string, unknown>): Promise<Project> {
        const project = await this._loadOrThrow(projectId);
        const id = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const artifact: Artifact = {
            id, type, path, createdAt: new Date().toISOString(), metadata,
        };
        project.artifacts.push(artifact);

        // Live counters
        if (type === "experiment") project.stats.runsCompleted += 1;
        if (type === "dataset")    project.stats.datasetEntries += 1;
        if (type === "report")     project.stats.reportCount += 1;
        if (type === "training")   project.stats.trainingRuns += 1;

        project.updatedAt = new Date().toISOString();
        await this._save(project);
        return project;
    }

    public async incrementStat(projectId: string, key: keyof Project["stats"], by = 1): Promise<Project> {
        const project = await this._loadOrThrow(projectId);
        project.stats[key] = (project.stats[key] || 0) + by;
        project.updatedAt = new Date().toISOString();
        await this._save(project);
        return project;
    }

    // ── Internals ────────────────────────────────────────────────────

    private async _save(project: Project): Promise<void> {
        const file = this.projectFile(project.id);
        await writeFile(file, JSON.stringify(project, null, 2), "utf8");
    }

    private async _loadOrThrow(projectId: string): Promise<Project> {
        const p = await this.getProject(projectId);
        if (!p) throw new Error(`Unknown project: "${projectId}"`);
        return p;
    }

    private _summarize(p: Project): ProjectSummary {
        const tally = { total: p.prerequisites.length, pass: 0, acked: 0, fail: 0, pending: 0 };
        for (const r of p.prerequisites) {
            if (r.status === "pass")    tally.pass += 1;
            else if (r.status === "acked") tally.acked += 1;
            else if (r.status === "fail")  tally.fail += 1;
            else                            tally.pending += 1;
        }
        return {
            id: p.id, name: p.name, goal: p.goal, status: p.status,
            createdAt: p.createdAt, updatedAt: p.updatedAt,
            prereqProgress: tally, runsCompleted: p.stats.runsCompleted,
        };
    }

    private _safeName(s: string): string {
        const cleaned = s.replace(/[^A-Za-z0-9._-]/g, "_");
        if (!cleaned) throw new Error("Empty name after sanitisation.");
        return basename(cleaned);
    }

    private _slug(s: string): string {
        const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        return base ? `${base}-${stamp}` : `project-${stamp}`;
    }

    private _jsonContent(uri: string, body: unknown): McpResourceContent {
        return { uri, mimeType: JsonRpcMimeType, text: JSON.stringify(body) };
    }
}
