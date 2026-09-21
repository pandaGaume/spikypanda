/**
 * The runtime as MCP clients reach it, with no editor: the catalogue of node
 * types (a `NodeRegistry`), documents (`.spikypanda` texts, validated, built
 * by the document builder, instantiated) and sessions (a document run for a
 * duration, probes read at each tick). Everything here exists in the core;
 * this controller only answers tool calls with it. The studio's controller
 * hosts the same catalogue on the page's registry and adds what is proper to
 * a screen; a Node process (the factory's container, a twin behind a broker)
 * publishes this one as it is.
 *
 * A document store is where built documents go and where named documents
 * come from. The default keeps them in memory; a host gives its own (a
 * workspace on disk, a bucket).
 */
import { buildDocumentJson, instantiateDocument, parseDocument, runDocument, validateDocumentSpec, DocumentBuildError, DocumentError, type DocumentConnectionSpec, type DocumentNodeSpec, type IDocumentSetting, type NodeRegistry } from "spikypanda-core";
import { describeRegistry, localesOf, searchRegistry } from "./catalogue.js";
import { URI_REGISTRY } from "./resource.uri.js";
import { fail, ok, type ControllerResult } from "./result.js";

export const URI_DOCUMENTS = "spk://documents";

export interface IDocumentStore {
    list(): ReadonlyArray<string>;
    read(name: string): string | undefined;
    write(name: string, text: string): void;
}

export class MemoryDocumentStore implements IDocumentStore {
    private readonly _docs = new Map<string, string>();
    public list(): ReadonlyArray<string> {
        return [...this._docs.keys()];
    }
    public read(name: string): string | undefined {
        return this._docs.get(name);
    }
    public write(name: string, text: string): void {
        this._docs.set(name, text);
    }
}

export interface RuntimeControllerOptions {
    documents?: IDocumentStore;
    /** Samples kept per probe in one `session_run`; more are thinned by `sampleEvery`. Default 4096. */
    maxSamples?: number;
    /** Ticks one `session_run` may take. Default 2 000 000. */
    maxTicks?: number;
}

const DEFAULT_MAX_SAMPLES = 4096;
const DEFAULT_MAX_TICKS = 2_000_000;

async function sha256Hex(text: string): Promise<string> {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

interface SpecArg {
    nodes: DocumentNodeSpec[];
    connections: DocumentConnectionSpec[];
}

/** The spec a client passes: node ids, type ids, parameters, wire endpoints; positions are laid out when absent. */
function readSpec(args: Record<string, unknown>): SpecArg {
    const spec = (args.spec ?? args) as { nodes?: unknown; connections?: unknown };
    if (!Array.isArray(spec.nodes) || !Array.isArray(spec.connections)) throw new DocumentBuildError("spec: expected { nodes: [...], connections: [...] }");
    const nodes: DocumentNodeSpec[] = (spec.nodes as Array<Record<string, unknown>>).map((n, i) => {
        if (typeof n?.id !== "string" || typeof n?.typeId !== "string") throw new DocumentBuildError(`spec.nodes[${i}]: id and typeId are required`);
        return {
            id: n.id,
            typeId: n.typeId,
            x: typeof n.x === "number" ? n.x : (i % 6) * 240,
            y: typeof n.y === "number" ? n.y : Math.floor(i / 6) * 160,
            ...(n.params && typeof n.params === "object" ? { params: n.params as Record<string, unknown> } : {}),
            ...(typeof n.label === "string" ? { label: n.label } : {}),
        };
    });
    const connections: DocumentConnectionSpec[] = (spec.connections as Array<Record<string, unknown>>).map((c, i) => {
        const from = c?.from as unknown;
        const to = c?.to as unknown;
        const pair = (v: unknown, what: string): [string, string] => {
            if (Array.isArray(v) && v.length === 2 && typeof v[0] === "string" && typeof v[1] === "string") return [v[0], v[1]];
            if (v && typeof v === "object" && typeof (v as { node?: unknown }).node === "string" && typeof (v as { port?: unknown }).port === "string") return [(v as { node: string }).node, (v as { port: string }).port];
            throw new DocumentBuildError(`spec.connections[${i}].${what}: expected [nodeId, port] or { node, port }`);
        };
        return { from: pair(from, "from"), to: pair(to, "to") };
    });
    return { nodes, connections };
}

export class RuntimeController {
    private readonly _documents: IDocumentStore;
    private readonly _maxSamples: number;
    private readonly _maxTicks: number;

    public constructor(
        private readonly _registry: NodeRegistry,
        options: RuntimeControllerOptions = {},
    ) {
        this._documents = options.documents ?? new MemoryDocumentStore();
        this._maxSamples = options.maxSamples ?? DEFAULT_MAX_SAMPLES;
        this._maxTicks = options.maxTicks ?? DEFAULT_MAX_TICKS;
    }

    public get registry(): NodeRegistry {
        return this._registry;
    }

    public get documents(): IDocumentStore {
        return this._documents;
    }

    public readResource(uri: string): unknown | undefined {
        if (uri === URI_REGISTRY) return describeRegistry(this._registry);
        if (uri === URI_DOCUMENTS) return { documents: this._documents.list() };
        return undefined;
    }

    public async executeToolAsync(toolName: string, args: Record<string, unknown>): Promise<ControllerResult> {
        try {
            switch (toolName) {
                case "registry_list_nodes":
                    return ok(describeRegistry(this._registry, localesOf(args.locale)));
                case "registry_describe_node": {
                    const type = String(args.type ?? "");
                    const found = describeRegistry(this._registry, localesOf(args.locale)).types.find((t) => t.type === type);
                    return found ? ok(found) : fail(`unknown node type: ${type}`);
                }
                case "registry_search":
                    return ok(searchRegistry(this._registry, args));
                case "document_validate": {
                    const spec = readSpec(args);
                    const problems = validateDocumentSpec(this._registry, spec.nodes, spec.connections);
                    return ok({ ok: problems.length === 0, problems });
                }
                case "document_build":
                    return ok(await this._build(args));
                case "document_instantiate":
                    return ok(await this._instantiate(args));
                case "session_run":
                    return ok(await this._run(args));
                default:
                    return fail(`unknown tool: ${toolName}`);
            }
        } catch (e) {
            if (e instanceof DocumentError || e instanceof DocumentBuildError) return fail(e.message);
            throw e;
        }
    }

    private async _build(args: Record<string, unknown>): Promise<unknown> {
        const spec = readSpec(args);
        const problems = validateDocumentSpec(this._registry, spec.nodes, spec.connections);
        if (problems.length) return { ok: false, problems };
        const json = buildDocumentJson(this._registry, spec.nodes, spec.connections);
        const sha256 = await sha256Hex(json);
        const name = typeof args.name === "string" && args.name.trim() ? args.name.trim() : undefined;
        if (name) this._documents.write(name, json);
        return { ok: true, name: name ?? null, sha256, bytes: json.length, nodes: spec.nodes.map((n) => ({ id: n.id, typeId: n.typeId })), connections: spec.connections.length, ...(name ? {} : { json }) };
    }

    /** The document a tool names: by `name` in the store, or as `document` text. */
    private _documentOf(args: Record<string, unknown>): { text: string; what: string } {
        if (typeof args.name === "string" && args.name.trim()) {
            const text = this._documents.read(args.name.trim());
            if (text === undefined) throw new DocumentError(`no document named "${args.name}" (documents: ${this._documents.list().join(", ") || "none"})`);
            return { text, what: args.name.trim() };
        }
        if (typeof args.document === "string") return { text: args.document, what: "document" };
        if (args.document && typeof args.document === "object") return { text: JSON.stringify(args.document), what: "document" };
        throw new DocumentError("give a document: `name` (from the store) or `document` (the JSON text of a .spikypanda file)");
    }

    private async _instantiate(args: Record<string, unknown>): Promise<unknown> {
        const { text, what } = this._documentOf(args);
        const doc = parseDocument(text, what);
        const loaded = instantiateDocument(doc, this._registry);
        return {
            ok: loaded.missingTypeIds.length === 0,
            sha256: await sha256Hex(text),
            nodes: doc.model.nodes.map((n) => ({ id: n.id, typeId: n.typeId ?? null, instantiated: loaded.instances.has(n.id) })),
            connections: doc.model.connections.length,
            missingTypeIds: loaded.missingTypeIds,
            skippedConnections: loaded.skippedConnections,
            sceneBound: loaded.sceneBound,
        };
    }

    private async _run(args: Record<string, unknown>): Promise<unknown> {
        const { text, what } = this._documentOf(args);
        const doc = parseDocument(text, what);
        const dt = Number(args.dt);
        const duration = Number(args.duration);
        if (!(dt > 0) || !(duration >= 0)) throw new DocumentError("session_run: dt must be > 0 and duration >= 0 (session seconds)");
        const ticks = Math.round(duration / dt);
        if (ticks > this._maxTicks) throw new DocumentError(`session_run: ${ticks} ticks asked, ${this._maxTicks} at most`);
        const probes = Array.isArray(args.probes) ? (args.probes as Array<Record<string, unknown>>).filter((p) => typeof p?.node === "string" && typeof p?.property === "string").map((p) => ({ node: String(p.node), property: String(p.property) })) : [];
        if (!probes.length) throw new DocumentError("session_run: give at least one probe { node, property }");
        const settings = Array.isArray(args.settings) ? (args.settings as Array<Record<string, unknown>>).filter((s) => typeof s?.node === "string" && typeof s?.property === "string").map((s): IDocumentSetting => ({ node: String(s.node), property: String(s.property), value: s.value })) : [];
        const asked = typeof args.sampleEvery === "number" && args.sampleEvery >= 1 ? Math.round(args.sampleEvery) : 1;
        const sampleEvery = Math.max(asked, Math.ceil(ticks / this._maxSamples));
        const loaded = instantiateDocument(doc, this._registry);
        const run = runDocument(loaded, { dt, duration, probes, sampleEvery, settings });
        const series: Record<string, number[]> = {};
        const summary: Record<string, { first: number; last: number; min: number; max: number }> = {};
        for (const [key, values] of run.series) {
            series[key] = Array.from(values);
            let min = Number.POSITIVE_INFINITY;
            let max = Number.NEGATIVE_INFINITY;
            for (const v of values) {
                if (v < min) min = v;
                if (v > max) max = v;
            }
            summary[key] = { first: values[0] ?? Number.NaN, last: values[values.length - 1] ?? Number.NaN, min, max };
        }
        return { documentSha256: await sha256Hex(text), dt, duration, ticks: run.ticks, samples: run.samples, sampleEvery, wallMs: run.wallMs, summary, series };
    }
}
