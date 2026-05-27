import { McpAdapterBase, McpResourceContent, McpToolResult, McpToolResults, JsonRpcMimeType } from "@cyanmycelium/mcp-core";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, basename, sep } from "node:path";
import { homedir } from "node:os";

/**
 * Filesystem-backed adapter for the research store. Persists experiments,
 * hypotheses, reports and dataset entries under a single root directory
 * (default `~/spikypanda-research`, override with the SPK_RESEARCH_DIR env
 * var) so the data outlives the SpikyPanda repo and can be shared across
 * machines / agents.
 *
 * Directory layout :
 *
 *     <root>/
 *       experiments/        one JSON file per experiment, named with ISO timestamp
 *       hypotheses/         markdown files, free names provided by the agent
 *       reports/            markdown files, free names provided by the agent
 *       dataset/
 *         manifest.json     append-only list of labeled samples
 *
 * The adapter exposes two URI schemes:
 *
 *   research://experiments[/<id>]     experiments collection or single entry
 *   research://hypotheses[/<name>]    hypotheses collection or single document
 *   research://reports[/<name>]       reports collection or single document
 *   research://dataset                dataset manifest
 *
 * All write operations are constrained to the configured root via
 * {@link _resolveSafe}; attempts to escape with `..` segments raise an
 * MCP error rather than touching the filesystem.
 */
export class SpkResearchAdapter extends McpAdapterBase {
    public static readonly DOMAIN = "research";

    public static readonly URI_EXPERIMENTS = "research://experiments";
    public static readonly URI_HYPOTHESES  = "research://hypotheses";
    public static readonly URI_REPORTS     = "research://reports";
    public static readonly URI_DATASET     = "research://dataset";

    private _root: string;
    private _experimentsDir: string;
    private _hypothesesDir: string;
    private _reportsDir: string;
    private _datasetDir: string;
    private _datasetManifestPath: string;
    private _initialized = false;

    public constructor(rootDirectory?: string) {
        super(SpkResearchAdapter.DOMAIN);
        const envRoot = process.env["SPK_RESEARCH_DIR"];
        const requested = rootDirectory ?? envRoot ?? join(homedir(), "spikypanda-research");
        this._root = resolve(requested);
        this._experimentsDir      = join(this._root, "experiments");
        this._hypothesesDir       = join(this._root, "hypotheses");
        this._reportsDir          = join(this._root, "reports");
        this._datasetDir          = join(this._root, "dataset");
        this._datasetManifestPath = join(this._datasetDir, "manifest.json");
    }

    public get rootDirectory(): string {
        return this._root;
    }

    /**
     * Switches the storage root at runtime. New target is created on disk
     * (mkdir -p) and the manifest is initialized when missing. Existing data
     * under the old root is left untouched; readers that open the resource
     * tree after this call see the new layout.
     */
    public async setRootDirectory(newRoot: string): Promise<void> {
        const cleaned = (newRoot || "").trim();
        if (!cleaned) throw new Error("Empty research root.");
        this._root = resolve(cleaned);
        this._experimentsDir      = join(this._root, "experiments");
        this._hypothesesDir       = join(this._root, "hypotheses");
        this._reportsDir          = join(this._root, "reports");
        this._datasetDir          = join(this._root, "dataset");
        this._datasetManifestPath = join(this._datasetDir, "manifest.json");
        this._initialized = false;
        await this.ensureInitialized();
        this._forwardResourceChanged();
    }

    public async ensureInitialized(): Promise<void> {
        if (this._initialized) return;
        await mkdir(this._experimentsDir, { recursive: true });
        await mkdir(this._hypothesesDir,  { recursive: true });
        await mkdir(this._reportsDir,     { recursive: true });
        await mkdir(this._datasetDir,     { recursive: true });
        if (!existsSync(this._datasetManifestPath)) {
            await writeFile(this._datasetManifestPath, JSON.stringify({ entries: [] }, null, 2), "utf8");
        }
        this._initialized = true;
    }

    // ── IMcpBehaviorAdapter ──────────────────────────────────────────────

    public async readResourceAsync(uri: string): Promise<McpResourceContent | undefined> {
        await this.ensureInitialized();

        if (uri === SpkResearchAdapter.URI_EXPERIMENTS) {
            const items = await this._listDir(this._experimentsDir, ".json");
            return this._jsonContent(uri, { count: items.length, items });
        }
        if (uri.startsWith(SpkResearchAdapter.URI_EXPERIMENTS + "/")) {
            const id = uri.slice(SpkResearchAdapter.URI_EXPERIMENTS.length + 1);
            const path = this._resolveSafe(this._experimentsDir, this._safeName(id) + ".json");
            if (!existsSync(path)) return undefined;
            const data = JSON.parse(await readFile(path, "utf8"));
            return this._jsonContent(uri, data);
        }

        if (uri === SpkResearchAdapter.URI_HYPOTHESES) {
            const items = await this._listDir(this._hypothesesDir, ".md");
            return this._jsonContent(uri, { count: items.length, items });
        }
        if (uri.startsWith(SpkResearchAdapter.URI_HYPOTHESES + "/")) {
            const name = uri.slice(SpkResearchAdapter.URI_HYPOTHESES.length + 1);
            const path = this._resolveSafe(this._hypothesesDir, this._safeName(name) + ".md");
            if (!existsSync(path)) return undefined;
            const text = await readFile(path, "utf8");
            return { uri, mimeType: "text/markdown", text };
        }

        if (uri === SpkResearchAdapter.URI_REPORTS) {
            const items = await this._listDir(this._reportsDir, ".md");
            return this._jsonContent(uri, { count: items.length, items });
        }
        if (uri.startsWith(SpkResearchAdapter.URI_REPORTS + "/")) {
            const name = uri.slice(SpkResearchAdapter.URI_REPORTS.length + 1);
            const path = this._resolveSafe(this._reportsDir, this._safeName(name) + ".md");
            if (!existsSync(path)) return undefined;
            const text = await readFile(path, "utf8");
            return { uri, mimeType: "text/markdown", text };
        }

        if (uri === SpkResearchAdapter.URI_DATASET) {
            const manifest = await this._readManifest();
            return this._jsonContent(uri, manifest);
        }

        return undefined;
    }

    public async executeToolAsync(_uri: string, toolName: string, _args: Record<string, unknown>): Promise<McpToolResult> {
        return McpToolResults.error(`SpkResearchAdapter: tool not handled at adapter level: "${toolName}"`);
    }

    // ── Public mutators (called by the behavior) ─────────────────────────

    public async logExperiment(entry: Record<string, unknown>): Promise<{ id: string; path: string; projectPath?: string }> {
        await this.ensureInitialized();
        const ts = (entry["timestamp"] as string | undefined) ?? new Date().toISOString();
        const id = (entry["id"] as string | undefined) ?? this._isoToId(ts);
        const safeId = this._safeName(id);
        const payload = { id: safeId, timestamp: ts, ...entry };

        // When the entry references a project, write exclusively into the
        // project's own experiments/ folder. Writing to the global root as
        // well would create duplicates; consumers that need all experiments
        // for a project should scope their query to the project directory.
        const projectId = entry["projectId"] as string | undefined;
        if (projectId) {
            const safeProjectId = this._safeName(projectId);
            const projDir = join(this._root, "projects", safeProjectId, "experiments");
            await mkdir(projDir, { recursive: true });
            const projectPath = join(projDir, safeId + ".json");
            await writeFile(projectPath, JSON.stringify(payload, null, 2), "utf8");
            return { id: safeId, path: projectPath, projectPath };
        }

        const path = this._resolveSafe(this._experimentsDir, safeId + ".json");
        await writeFile(path, JSON.stringify(payload, null, 2), "utf8");
        return { id: safeId, path };
    }

    public async getExperiments(limit?: number, since?: string): Promise<Array<Record<string, unknown>>> {
        await this.ensureInitialized();
        const items = await this._listDir(this._experimentsDir, ".json");
        const filtered = since ? items.filter((it) => it.modifiedIso >= since) : items;
        const sorted = filtered.sort((a, b) => b.modifiedIso.localeCompare(a.modifiedIso));
        const top = typeof limit === "number" && limit > 0 ? sorted.slice(0, limit) : sorted;
        const out: Array<Record<string, unknown>> = [];
        for (const it of top) {
            const path = join(this._experimentsDir, it.name);
            try {
                const data = JSON.parse(await readFile(path, "utf8"));
                out.push(data);
            } catch { /* skip malformed file */ }
        }
        return out;
    }

    public async writeHypothesis(name: string, content: string, projectId?: string): Promise<{ name: string; path: string }> {
        await this.ensureInitialized();
        const safe = this._safeName(name);
        if (projectId) {
            const safeProjectId = this._safeName(projectId);
            const projDir = join(this._root, "projects", safeProjectId, "hypotheses");
            await mkdir(projDir, { recursive: true });
            const path = join(projDir, safe + ".md");
            await writeFile(path, content, "utf8");
            return { name: safe, path };
        }
        const path = this._resolveSafe(this._hypothesesDir, safe + ".md");
        await writeFile(path, content, "utf8");
        return { name: safe, path };
    }

    public async listHypotheses(): Promise<Array<{ name: string; modifiedIso: string; sizeBytes: number }>> {
        await this.ensureInitialized();
        return this._listDir(this._hypothesesDir, ".md");
    }

    public async writeReport(name: string, content: string, projectId?: string): Promise<{ name: string; path: string }> {
        await this.ensureInitialized();
        const safe = this._safeName(name);
        if (projectId) {
            const safeProjectId = this._safeName(projectId);
            const projDir = join(this._root, "projects", safeProjectId, "reports");
            await mkdir(projDir, { recursive: true });
            const path = join(projDir, safe + ".md");
            await writeFile(path, content, "utf8");
            return { name: safe, path };
        }
        const path = this._resolveSafe(this._reportsDir, safe + ".md");
        await writeFile(path, content, "utf8");
        return { name: safe, path };
    }

    public async readReport(name: string, projectId?: string): Promise<string | null> {
        await this.ensureInitialized();
        const safe = this._safeName(name);
        if (projectId) {
            const safeProjectId = this._safeName(projectId);
            const path = join(this._root, "projects", safeProjectId, "reports", safe + ".md");
            if (!existsSync(path)) return null;
            return readFile(path, "utf8");
        }
        const path = this._resolveSafe(this._reportsDir, safe + ".md");
        if (!existsSync(path)) return null;
        return readFile(path, "utf8");
    }

    public async listReports(): Promise<Array<{ name: string; modifiedIso: string; sizeBytes: number }>> {
        await this.ensureInitialized();
        return this._listDir(this._reportsDir, ".md");
    }

    public async saveFigure(
        name: string,
        dataUrl: string,
        projectId?: string,
    ): Promise<{ name: string; path: string; relativePath: string }> {
        await this.ensureInitialized();
        const safe = this._safeName(name);
        // Strip the data URI prefix (data:image/png;base64,<data> or data:image/...;base64,<data>).
        const commaIdx = dataUrl.indexOf(",");
        if (commaIdx === -1) throw new Error("dataUrl does not contain a valid data URI comma separator.");
        const b64 = dataUrl.slice(commaIdx + 1);
        const buf = Buffer.from(b64, "base64");

        let figuresDir: string;
        let relativePath: string;
        if (projectId) {
            const safeProjectId = this._safeName(projectId);
            figuresDir = join(this._root, "projects", safeProjectId, "reports", "figures");
            relativePath = "figures/" + safe + ".png";
        } else {
            figuresDir = join(this._reportsDir, "figures");
            relativePath = "figures/" + safe + ".png";
        }
        await mkdir(figuresDir, { recursive: true });
        const path = join(figuresDir, safe + ".png");
        await writeFile(path, buf);
        return { name: safe, path, relativePath };
    }

    public async saveSvg(
        name: string,
        content: string,
        projectId?: string,
    ): Promise<{ name: string; path: string; relativePath: string }> {
        await this.ensureInitialized();
        const safe = this._safeName(name);
        let figuresDir: string;
        let relativePath: string;
        if (projectId) {
            const safeProjectId = this._safeName(projectId);
            figuresDir   = join(this._root, "projects", safeProjectId, "reports", "figures");
            relativePath = "figures/" + safe + ".svg";
        } else {
            figuresDir   = join(this._reportsDir, "figures");
            relativePath = "figures/" + safe + ".svg";
        }
        await mkdir(figuresDir, { recursive: true });
        const path = join(figuresDir, safe + ".svg");
        await writeFile(path, content, "utf8");
        return { name: safe, path, relativePath };
    }

    public async addDatasetEntry(entry: Record<string, unknown>): Promise<{ count: number }> {
        await this.ensureInitialized();
        const manifest = await this._readManifest();
        const ts = (entry["timestamp"] as string | undefined) ?? new Date().toISOString();
        const enriched = { timestamp: ts, ...entry };
        manifest.entries.push(enriched);
        await writeFile(this._datasetManifestPath, JSON.stringify(manifest, null, 2), "utf8");
        return { count: manifest.entries.length };
    }

    public async getDatasetManifest(): Promise<{ entries: Array<Record<string, unknown>> }> {
        await this.ensureInitialized();
        return this._readManifest();
    }

    // ── Internals ────────────────────────────────────────────────────────

    private _jsonContent(uri: string, body: unknown): McpResourceContent {
        return { uri, mimeType: JsonRpcMimeType, text: JSON.stringify(body) };
    }

    private async _readManifest(): Promise<{ entries: Array<Record<string, unknown>> }> {
        if (!existsSync(this._datasetManifestPath)) return { entries: [] };
        const text = await readFile(this._datasetManifestPath, "utf8");
        try {
            const data = JSON.parse(text);
            if (data && Array.isArray(data.entries)) return data;
            return { entries: [] };
        } catch {
            return { entries: [] };
        }
    }

    private async _listDir(dir: string, ext: string): Promise<Array<{ name: string; modifiedIso: string; sizeBytes: number }>> {
        const names = await readdir(dir);
        const out: Array<{ name: string; modifiedIso: string; sizeBytes: number }> = [];
        for (const n of names) {
            if (!n.endsWith(ext)) continue;
            const st = await stat(join(dir, n));
            out.push({ name: n, modifiedIso: st.mtime.toISOString(), sizeBytes: st.size });
        }
        return out;
    }

    /** Resolves a path under {@link base} and refuses any segment that escapes it. */
    private _resolveSafe(base: string, name: string): string {
        const baseAbs = resolve(base);
        const target  = resolve(baseAbs, name);
        if (target !== baseAbs && !target.startsWith(baseAbs + sep)) {
            throw new Error(`Refusing to write outside research root: ${target}`);
        }
        return target;
    }

    private _safeName(name: string): string {
        // Strip path separators, accept letters, digits, dot, hyphen, underscore.
        const cleaned = name.replace(/[^A-Za-z0-9._-]/g, "_");
        if (cleaned.length === 0) throw new Error("Empty name after sanitisation.");
        // basename() removes any residual path component injected by the agent.
        return basename(cleaned);
    }

    private _isoToId(iso: string): string {
        return iso.replace(/[:.]/g, "-");
    }
}
