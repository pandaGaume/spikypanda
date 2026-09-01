/**
 * Controller: every operation on the studio's graph, with no MCP in sight.
 *
 * Split from the adapter deliberately. The four-layer stack asks that each
 * layer be independently testable, and soldering this logic to `McpAdapterBase`
 * made it reachable only through a transport. Here it is a plain class over a
 * `GraphRunner`, so the rules that matter (a read-only property is refused, a
 * batch is all-or-nothing, a capture stays index-aligned, a mutation notifies)
 * can be verified without a server, a broker or a browser.
 *
 * It takes the runner the editor is already using, so the session it reads and
 * steps is the one the view is drawing. Building a second session with
 * `buildSessionFromViewer` would be easy and wrong: the graph would run, the
 * numbers would look plausible, and nothing on screen would move.
 *
 * One rule is enforced here rather than inherited. `UIItemBase.setProperty`
 * falls back to assigning the field directly when a node is not `Inspectable`,
 * so it will happily write to a property the node declared read-only. This
 * checks `editable` first and refuses, returning the node's own `hint`.
 */
import type { IPortDescriptor } from "spikypanda-core";
import { enrichNodeDefFromMeta, listDocLocales, resolveDocPath, type GraphRunner, type NodeUI, type Port } from "spikypanda-nodeeditor";
import type { PropertyEntry } from "spikypanda-nodeeditor/inspectable.js";
import { URI_GRAPH, URI_GRAPH_STATE, URI_PLUGINS, URI_REGISTRY, uriForCapture, uriForNode } from "./resource.uri.js";
import type { GraphState, NodeState, NodeTypeState, PluginsState, PortState, RegistryState, SimulationState } from "./state.js";

/** A resource body, in the shape MCP expects but without depending on it. */
export interface ResourceContent {
    readonly uri: string;
    readonly mimeType: string;
    readonly text: string;
}

/** Outcome of an operation. Neutral so the controller stays transport-free. */
export type ControllerResult = { readonly ok: true; readonly data: unknown } | { readonly ok: false; readonly error: string };

export function ok(data: unknown): ControllerResult {
    return { ok: true, data };
}

export function fail(error: string): ControllerResult {
    return { ok: false, error };
}

/** JSON body helper: every resource in this namespace is JSON. */
function jsonResource(uri: string, body: unknown): ResourceContent {
    return { uri, mimeType: "application/json", text: JSON.stringify(body) };
}

/**
 * Flatten a registry port descriptor for transport.
 *
 * Ports are identified by `slot`, not by a name: the visual `Port.name` of the
 * editor is a rendering concern and the two must not be conflated. `unit` is
 * carried through deliberately, since it is a wiring-time contract the node
 * already declares and the only machine-readable physical typing available.
 */
function describePort(port: IPortDescriptor): PortState {
    return {
        slot: port.slot,
        optional: port.optional,
        type: port.type ?? null,
        unit: port.unit ?? null,
        kind: port.kind ?? "stream",
        multiplicity: port.multiplicity ?? "single",
    };
}

/** One signal being recorded: a property of a node, sampled every step. */
interface CaptureSpec {
    readonly nodeId: string;
    readonly property: string;
}

/** An armed capture and what it has collected so far. */
interface Capture {
    readonly specs: ReadonlyArray<CaptureSpec>;
    /** Simulation time of each sample. */
    readonly t: number[];
    /** One series per spec, index-aligned with `specs`. */
    readonly series: number[][];
}

/**
 * Make one reflected property safe to serialize.
 *
 * Real nodes are not the tidy value bags a test double suggests. `UIItemBase`
 * reflects over every public field, and those fields hold live objects: link
 * observers, parent references, scene views. They form cycles, and
 * `JSON.stringify` throws on the first one, taking the whole tool call with it.
 *
 * Only primitives survive intact. Anything else is replaced by a short type
 * tag, which is all a caller can act on anyway: a property whose value is an
 * object graph is not one you set through a scalar API, and `UIItemBase`
 * already reports it as non-editable. The tag keeps the property visible, so
 * the node's shape is still legible, without pretending the value is transport
 * material.
 */
function safeProperty(entry: PropertyEntry): PropertyEntry {
    const v = entry.value;
    if (v === null || v === undefined) return entry;
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") return entry;
    if (t === "function") return { ...entry, value: "[function]", editable: false };
    // Arrays of primitives are common and genuinely useful (coefficients,
    // thresholds), so they are kept when they carry no nested structure.
    if (Array.isArray(v) && v.every((x) => x === null || ["string", "number", "boolean"].includes(typeof x))) {
        return entry;
    }
    const name = (v as object).constructor?.name ?? "object";
    return {
        ...entry,
        value: `[${name}]`,
        editable: false,
        hint: entry.hint ?? "not a scalar: the live value is an object and is not transported",
    };
}

/**
 * Does `target` expose a settable accessor named `name` on its prototype?
 *
 * Reflection over a node's own fields sees `_severity`, the private backing
 * store, never `severity`, the accessor that validates and clamps. Writing the
 * backing field directly therefore lands, and skips the very check the node
 * wrote to protect itself: a severity outside [0, 1], an angle nobody wrapped.
 *
 * Walking the prototype chain finds the accessor so the property can be offered
 * and written under its real name.
 */
function findAccessor(target: unknown, name: string): { get: boolean; set: boolean } | undefined {
    if (target === null || typeof target !== "object") return undefined;
    let proto = Object.getPrototypeOf(target);
    while (proto && proto !== Object.prototype) {
        const d = Object.getOwnPropertyDescriptor(proto, name);
        if (d && (d.get || d.set)) return { get: !!d.get, set: !!d.set };
        proto = Object.getPrototypeOf(proto);
    }
    return undefined;
}

/**
 * Rewrite a reflected private field onto its public accessor when there is one.
 *
 * `_severity` becomes `severity`, and the entry is marked editable only when
 * the accessor actually has a setter: a read-only computed value stays visible
 * but is refused, with a hint saying why rather than failing silently.
 */
function withAccessorName(entry: PropertyEntry, data: unknown): PropertyEntry {
    if (!entry.key.startsWith("_")) return entry;
    const publicName = entry.key.slice(1);
    const accessor = findAccessor(data, publicName);
    if (!accessor) return entry;
    return {
        ...entry,
        key: publicName,
        editable: accessor.set,
        hint: accessor.set ? entry.hint : (entry.hint ?? "computed by the node, no setter"),
    };
}

export class GraphController {
    private readonly _runner: GraphRunner;

    /**
     * Armed captures, by id.
     *
     * This is the piece that replaces writing a throwaway test to ask one
     * question. A port is only readable at the current tick, while a lock-in
     * or an FFT needs a window, so the sequence has to be: arm, step, read
     * back. Sampling happens inside the stepping loop because that is the only
     * place where the intermediate ticks exist at all.
     *
     * Signals are addressed as node properties rather than channel indices.
     * That keeps one addressing scheme across the whole surface, the same one
     * the property panel shows, instead of asking a caller to know a channel
     * index that nothing else in the API uses.
     */
    private readonly _captures = new Map<string, Capture>();

    /**
     * @param runner the runner the studio is driving. Its `session` getter is
     *               read-only and may be null while idle, which is a normal
     *               state and not an error: tools that need a running session
     *               say so rather than starting one behind the user's back.
     */
    /** Notified with a URI whenever a resource's content changed. */
    public onChanged: (uri: string) => void = () => {};

    public constructor(runner: GraphRunner) {
        this._runner = runner;
    }

    // ── Resources ──────────────────────────────────────────────────────

    public async readResourceAsync(uri: string): Promise<ResourceContent | undefined> {
        switch (uri) {
            case URI_PLUGINS:
                return jsonResource(uri, this._readPlugins());
            case URI_REGISTRY:
                return jsonResource(uri, this._readRegistry());
            case URI_GRAPH:
                return jsonResource(uri, this._readGraph());
            case URI_GRAPH_STATE:
                return jsonResource(uri, this._readGraphState());
            default:
                break;
        }
        const node = this._nodeByUri(uri);
        return node ? jsonResource(uri, this._describeNode(node)) : undefined;
    }

    /**
     * The node catalogue the activated plugins have registered.
     *
     * Documentation is resolved here rather than left as a raw path, because
     * the point of exposing the catalogue is that an agent can read what a
     * node claims to do before wiring it, not that it can discover a filename.
     */
    private _readRegistry(locales: ReadonlyArray<string> = ["en"]): RegistryState {
        const registry = this._runner.viewer.getNodeRegistry();
        if (!registry) return { count: 0, types: [], note: "no node registry bound to the viewer" };

        const types: NodeTypeState[] = [];
        for (const type of registry.types()) {
            const meta = registry.meta(type);
            // A type without meta is a registry inconsistency, not a node to
            // describe: skipping it keeps the catalogue uniformly typed.
            if (!meta) continue;
            types.push({
                type: meta.type,
                label: meta.label,
                category: meta.category ?? null,
                inputPorts: meta.inputPorts.map(describePort),
                outputPorts: meta.outputPorts.map(describePort),
                standards: meta.standards ?? null,
                doc: resolveDocPath(meta.docPath, locales),
                docLocales: listDocLocales(meta.docPath),
            });
        }
        return { count: types.length, types };
    }

    /**
     * What the catalogue is made of, grouped by the category the nodes declare.
     *
     * The registry records node types, not the plugin that contributed them:
     * `register` takes no provenance. Category is the closest honest proxy, and
     * it is reported as such rather than inventing an attribution the runtime
     * does not carry.
     */
    private _readPlugins(): PluginsState {
        const registry = this._runner.viewer.getNodeRegistry();
        if (!registry) return { registryBound: false, total: 0, categories: [], note: "no node registry bound to the viewer" };

        const byCategory = new Map<string, number>();
        for (const type of registry.types()) {
            const category = registry.meta(type)?.category ?? "(uncategorised)";
            byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
        }
        return {
            registryBound: true,
            total: registry.types().length,
            categories: [...byCategory].map(([category, count]) => ({ category, count })).sort((a, b) => a.category.localeCompare(b.category)),
            note: "the registry records node types, not their contributing plugin; category is a proxy",
        };
    }

    /**
     * The graph, in the editor's own serialized form.
     *
     * Delegated to `GraphViewer.serialize()` rather than rebuilt here. A
     * parallel shape would be a second description of the same object and
     * would drift from the editor's the first time a field is added.
     */
    private _readGraph(): GraphState {
        return this._runner.viewer.serialize();
    }

    /** Where the simulation currently stands. Changes on every step. */
    private _readGraphState(): SimulationState {
        const session = this._runner.session;
        return {
            runner: this._runner.state,
            hasSession: session !== null,
            t: this._runner.t,
            tickIndex: session?.tickIndex ?? null,
            simRate: session?.simRate ?? null,
        };
    }

    // ── Tools ──────────────────────────────────────────────────────────

    public async executeToolAsync(_uri: string, toolName: string, args: Record<string, unknown>): Promise<ControllerResult> {
        switch (toolName) {
            case "graph_describe":
                return ok(this._readGraph());

            case "registry_list_nodes":
                return ok(this._readRegistry(this._localesOf(args.locale)));

            case "sim_status":
                return ok(this._readGraphState());

            case "sim_reset":
                this._runner.stop();
                this._changed(URI_GRAPH_STATE);
                return ok(this._readGraphState());

            case "sim_run":
                return this._simRun(args);

            case "node_describe":
                return this._nodeDescribe(args);

            case "node_set_property":
                return this._nodeSetProperties(args, [{ key: String(args.key ?? ""), value: args.value }]);

            case "node_list_ports":
                return this._withNode(args, (node) => ok({ nodeId: node.id, inputs: node.inputs.map((p) => p.name), outputs: node.outputs.map((p) => p.name) }));

            case "node_get_property":
                return this._withNode(args, (node) => {
                    const key = String(args.key ?? "");
                    const found = this._describeNode(node).properties.find((prop) => prop.key === key);
                    return found ? ok(found) : fail(`node "${node.id}" has no property "${key}"`);
                });

            case "registry_describe_node":
                return this._registryDescribeNode(args);

            case "plugin_list":
                return ok(this._readPlugins());

            case "capture_arm":
                return this._captureArm(args);

            case "capture_read":
                return this._captureRead(args);

            case "capture_clear":
                this._captures.delete(String(args.captureId ?? "default"));
                return ok({ cleared: String(args.captureId ?? "default"), remaining: [...this._captures.keys()] });

            case "graph_load":
                return this._graphLoad(args);

            case "graph_save":
                return ok({ graph: this._readGraph() });

            case "graph_add_node":
                return this._graphAddNode(args);

            case "graph_connect":
                return this._graphConnect(args);

            case "sweep_run":
                return this._sweepRun(args);

            case "graph_configure":
                return this._graphConfigure(args);

            case "node_set_properties":
                return this._nodeSetProperties(args, this._entriesOf(args.properties));

            default:
                return fail(`unknown tool: ${toolName}`);
        }
    }

    /**
     * Advance the session by `steps` ticks of `dt` seconds.
     *
     * Stepping is explicit rather than wall-clock driven: an agent needs a
     * reproducible number of ticks, and the runner's own animation-frame loop
     * does not exist outside a rendering context anyway.
     */
    private _simRun(args: Record<string, unknown>): ControllerResult {
        const session = this._runner.session;
        if (!session) return fail("no live session: start the runner before stepping");
        // Only one driver may advance time. If the runner's own loop is live
        // it would interleave its ticks with these, and the series would be
        // sampled at instants nobody chose. Pausing keeps the session alive,
        // unlike stop(), which tears it down.
        if (this._runner.state === "playing") this._runner.pause();

        const steps = Math.trunc(Number(args.steps ?? 0));
        const dt = Number(args.dt ?? 0);
        if (!Number.isFinite(steps) || steps <= 0) return fail("`steps` must be a positive integer");
        if (!Number.isFinite(dt) || dt <= 0) return fail("`dt` must be a positive number of seconds");

        const t0 = this._runner.t;
        for (let i = 0; i < steps; i++) {
            const t = t0 + i * dt;
            session.run(t);
            // Sampled inside the loop: the intermediate ticks exist nowhere else.
            this._sampleCaptures(t);
        }

        this._changed(URI_GRAPH_STATE);
        for (const id of this._captures.keys()) this._changed(uriForCapture(id));
        return ok({ steps, dt, from: t0, to: t0 + steps * dt, tickIndex: session.tickIndex });
    }

    private _nodeDescribe(args: Record<string, unknown>): ControllerResult {
        const node = this._nodeById(String(args.nodeId ?? ""));
        if (!node) return fail(`unknown node: ${String(args.nodeId ?? "")}`);
        return ok(this._describeNode(node));
    }

    /**
     * Apply one or more properties to a node as a unit.
     *
     * Every entry is validated against the node's declared properties before
     * anything is written, so a rejected entry cannot leave the node half
     * configured. A sweep that changes gravity and orientation together must
     * never be observable in between.
     */
    private _nodeSetProperties(args: Record<string, unknown>, entries: ReadonlyArray<{ key: string; value: unknown }>): ControllerResult {
        const nodeId = String(args.nodeId ?? "");
        const node = this._nodeById(nodeId);
        if (!node) return fail(`unknown node: ${nodeId}`);
        if (entries.length === 0) return fail("no properties given");

        // Validated against the same view the caller was given, accessor names
        // included, so what `node_describe` offers is exactly what can be set.
        const described = this._describeNode(node).properties;
        const declared = new Map(described.map((p) => [p.key, p]));
        for (const { key } of entries) {
            const property = declared.get(key);
            if (!property) return fail(`node "${nodeId}" has no property "${key}"`);
            if (property.editable === false) {
                return fail(`property "${key}" is read-only${property.hint ? `: ${property.hint}` : ""}`);
            }
        }

        for (const { key, value } of entries) node.item.setProperty(key, value);

        this._changed(uriForNode(nodeId));
        this._changed(URI_GRAPH);
        return ok({ nodeId, applied: entries.map((e) => e.key), properties: this._describeNode(node).properties });
    }

    /**
     * Arm a capture over one or more node properties.
     *
     * Arming resets: a capture is a window, and silently appending to a
     * previous run would splice two unrelated spans of simulation time into
     * one series that looks continuous.
     */
    private _captureArm(args: Record<string, unknown>): ControllerResult {
        const captureId = String(args.captureId ?? "default");
        const raw = Array.isArray(args.signals) ? args.signals : [];
        const specs: CaptureSpec[] = [];
        for (const entry of raw) {
            if (entry === null || typeof entry !== "object") continue;
            const spec = entry as Record<string, unknown>;
            const nodeId = String(spec.nodeId ?? "");
            const property = String(spec.property ?? "");
            const node = this._nodeById(nodeId);
            if (!node) return fail(`unknown node: ${nodeId}`);
            if (!this._describeNode(node).properties.some((p) => p.key === property)) {
                return fail(`node "${nodeId}" has no property "${property}"`);
            }
            specs.push({ nodeId, property });
        }
        if (specs.length === 0) return fail("`signals` must list at least one { nodeId, property }");

        this._captures.set(captureId, { specs, t: [], series: specs.map(() => []) });
        this._changed(uriForCapture(captureId));
        return ok({ captureId, signals: specs, samples: 0 });
    }

    private _captureRead(args: Record<string, unknown>): ControllerResult {
        const captureId = String(args.captureId ?? "default");
        const capture = this._captures.get(captureId);
        if (!capture) return fail(`no capture armed under "${captureId}"`);
        return ok({
            captureId,
            samples: capture.t.length,
            t: capture.t,
            signals: capture.specs.map((spec, i) => ({ ...spec, values: capture.series[i] })),
        });
    }

    /**
     * Sample every armed capture at time `t`.
     *
     * A property that is missing or not numeric records NaN rather than being
     * skipped: dropping it would shorten one series relative to the others and
     * silently misalign every sample after it.
     */
    private _sampleCaptures(t: number): void {
        if (this._captures.size === 0) return;
        for (const capture of this._captures.values()) {
            capture.t.push(t);
            capture.specs.forEach((spec, i) => {
                const node = this._nodeById(spec.nodeId);
                const value = node ? this._describeNode(node).properties.find((p) => p.key === spec.property)?.value : undefined;
                capture.series[i].push(typeof value === "number" ? value : Number.NaN);
            });
        }
    }

    /** Apply properties across several nodes in one call. */
    private _graphConfigure(args: Record<string, unknown>): ControllerResult {
        const raw = Array.isArray(args.nodes) ? args.nodes : [];
        const applied: unknown[] = [];
        for (const entry of raw) {
            if (entry === null || typeof entry !== "object") continue;
            const spec = entry as Record<string, unknown>;
            const result = this._nodeSetProperties(spec, this._entriesOf(spec.properties));
            if (result.ok === false) return result;
            applied.push({ nodeId: String(spec.nodeId ?? ""), keys: Object.keys((spec.properties ?? {}) as object) });
        }
        if (applied.length === 0) return fail("`nodes` must list at least one { nodeId, properties }");
        return ok({ applied });
    }

    private _registryDescribeNode(args: Record<string, unknown>): ControllerResult {
        const type = String(args.type ?? "");
        const catalogue = this._readRegistry(this._localesOf(args.locale));
        const found = catalogue.types.find((t) => t.type === type);
        return found ? ok(found) : fail(`unknown node type: ${type}`);
    }

    /** Resolve `args.nodeId` once, so every node tool reports the same error. */
    private _withNode(args: Record<string, unknown>, use: (node: NodeUI) => ControllerResult): ControllerResult {
        const nodeId = String(args.nodeId ?? "");
        const node = this._nodeById(nodeId);
        return node ? use(node) : fail(`unknown node: ${nodeId}`);
    }

    private _graphLoad(args: Record<string, unknown>): ControllerResult {
        const json = typeof args.graph === "string" ? args.graph : JSON.stringify(args.graph ?? null);
        if (!json || json === "null") return fail("`graph` must be a serialized graph, as a string or an object");
        const viewer = this._runner.viewer;
        try {
            viewer.load(json, viewer.getNodeRegistry() ?? undefined, viewer.getLinkRegistry() ?? undefined);
        } catch (error) {
            return fail(`graph_load failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        // Loading replaces everything, including any node a capture referenced.
        this._captures.clear();
        this._changed(URI_GRAPH);
        this._changed(URI_GRAPH_STATE);
        return ok(this._readGraph());
    }

    /**
     * Instantiate a node from the catalogue.
     *
     * The definition is derived from the registry meta rather than supplied by
     * the caller: the node's own declaration is the authority on its ports, and
     * accepting a hand-written shape would let a graph be built that the
     * runtime cannot honour.
     */
    private _graphAddNode(args: Record<string, unknown>): ControllerResult {
        const type = String(args.type ?? "");
        const viewer = this._runner.viewer;
        const registry = viewer.getNodeRegistry();
        if (!registry) return fail("no node registry bound to the viewer");
        const meta = registry.meta(type);
        if (!meta) return fail(`unknown node type: ${type}`);

        // The runtime instance is what makes the node configurable: it becomes
        // `NodeUI.item.data`, and the property panel and this controller both
        // read their properties from it. Omitting it leaves a node that draws
        // correctly and exposes only its own definition (label, typeId, ports),
        // which looks right and cannot be set.
        const runtimeNode = registry.create(type) ?? null;

        // Control ports come from the instance when it has them: RunnableNode
        // adds _start/_stop on top of the base _enable, and the declaration in
        // the meta does not always carry that.
        const asPortDef = (port: IPortDescriptor, fallbackType: string) => ({
            name: String(port.slot),
            type: (port.type ?? fallbackType) as never,
            anchor: port.anchor,
        });
        const instance = runtimeNode as { controlInputPorts?: ReadonlyArray<IPortDescriptor>; controlOutputPorts?: ReadonlyArray<IPortDescriptor> } | null;
        const controlIn = instance?.controlInputPorts ?? meta.controlInputPorts ?? [{ slot: "_enable", optional: true, type: "boolean" }];
        const controlOut = instance?.controlOutputPorts ?? meta.controlOutputPorts ?? [{ slot: "_enabled", optional: true, type: "boolean" }];

        const def = {
            label: meta.label,
            typeId: meta.type,
            inputs: meta.inputPorts.map((p) => asPortDef(p, "tensor")),
            outputs: meta.outputPorts.map((p) => asPortDef(p, "tensor")),
            controlInputs: controlIn.map((p) => asPortDef(p, "boolean")),
            controlOutputs: controlOut.map((p) => asPortDef(p, "boolean")),
            data: runtimeNode,
            standards: meta.standards,
            variadicInput: meta.variadicInput,
            variadicOutput: meta.variadicOutput,
        };
        const enriched = enrichNodeDefFromMeta(def as never, meta, runtimeNode);
        const node = viewer.addNode(enriched, Number(args.x ?? 100), Number(args.y ?? 100));

        this._changed(URI_GRAPH);
        return ok(this._describeNode(node));
    }

    /** Connect two ports. The link type is resolved by the link registry. */
    private _graphConnect(args: Record<string, unknown>): ControllerResult {
        const from = this._portOf(args.from, "output");
        if (typeof from === "string") return fail(from);
        const to = this._portOf(args.to, "input");
        if (typeof to === "string") return fail(to);

        const connection = this._runner.viewer.connect(from, to);
        if (!connection) return fail("connection refused: the two port types are not compatible");
        this._changed(URI_GRAPH);
        return ok({ connected: { from: from.name, to: to.name } });
    }

    /**
     * Run a grid of configurations and return one capture per cell.
     *
     * The shape mirrors the repository's own sweep harness: settle, then
     * capture. A reading taken before transients decay measures the transient
     * rather than the steady state, and the settle phase is deliberately not
     * recorded so a window never straddles the two regimes.
     *
     * Collapsing the grid into one call is the point. A scene by orientation by
     * fault sweep is dozens of cells, and three round trips per cell turns a
     * measurement into an afternoon.
     */
    private _sweepRun(args: Record<string, unknown>): ControllerResult {
        const cells = Array.isArray(args.cells) ? args.cells : [];
        if (cells.length === 0) return fail("`cells` must list at least one configuration");
        const dt = Number(args.dt ?? 0);
        const settleSteps = Math.trunc(Number(args.settleSteps ?? 0));
        const captureSteps = Math.trunc(Number(args.captureSteps ?? 0));
        if (!Number.isFinite(dt) || dt <= 0) return fail("`dt` must be a positive number of seconds");
        if (captureSteps <= 0) return fail("`captureSteps` must be a positive integer");

        const signals = args.signals;
        const results: unknown[] = [];
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i] as Record<string, unknown>;
            const configured = this._graphConfigure({ nodes: cell.nodes });
            if (configured.ok === false) return configured;

            // Settle unrecorded, then arm and record: one window, one regime.
            this._captures.clear();
            if (settleSteps > 0) {
                const settled = this._simRun({ steps: settleSteps, dt });
                if (settled.ok === false) return settled;
            }
            const armed = this._captureArm({ captureId: "sweep", signals });
            if (armed.ok === false) return armed;
            const ran = this._simRun({ steps: captureSteps, dt });
            if (ran.ok === false) return ran;

            const capture = this._captures.get("sweep");
            results.push({
                index: i,
                label: cell.label ?? null,
                t: capture ? capture.t.slice() : [],
                signals: (capture?.specs ?? []).map((spec, k) => ({ ...spec, values: capture?.series[k]?.slice() ?? [] })),
            });
        }
        return ok({ cells: results.length, dt, settleSteps, captureSteps, results });
    }

    /** Resolve a { nodeId, port } pair to a live Port, or an error message. */
    private _portOf(raw: unknown, direction: "input" | "output"): Port | string {
        if (raw === null || typeof raw !== "object") return `expected { nodeId, port } for the ${direction} side`;
        const spec = raw as Record<string, unknown>;
        const nodeId = String(spec.nodeId ?? "");
        const portName = String(spec.port ?? "");
        const node = this._nodeById(nodeId);
        if (!node) return `unknown node: ${nodeId}`;
        const ports = direction === "output" ? node.outputs : node.inputs;
        const port = ports.find((p) => p.name === portName);
        return port ?? `node "${nodeId}" has no ${direction} port "${portName}"`;
    }

    // -- Helpers ----------------------------------------------------------────────

    private _describeNode(node: NodeUI): NodeState {
        // Private backing fields are renamed onto their public accessor, so a
        // caller sees `severity` rather than `_severity` and a write goes
        // through the node's own validation instead of around it.
        const data = (node.item as unknown as { data: unknown }).data;
        const seen = new Set<string>();
        const properties: PropertyEntry[] = [];
        for (const raw of node.item.getProperties()) {
            const named = withAccessorName(raw, data);
            // A node exposing both `_x` and a plain `x` field would otherwise
            // produce two entries under one key.
            if (seen.has(named.key)) continue;
            seen.add(named.key);
            properties.push(safeProperty(named));
        }
        return {
            id: node.id,
            uri: uriForNode(node.id),
            typeId: node.typeId ?? null,
            displayName: node.item.getDisplayName(),
            // False for every node today: none implements Inspectable, so the
            // properties below are reflected from public fields. Writes still
            // land, by direct assignment; only the metadata is poorer.
            inspectable: node.item.isInspectable(),
            propertySource: node.item.isInspectable() ? "declared" : "reflected",
            properties,
            inputs: node.inputs.map((p) => p.name),
            outputs: node.outputs.map((p) => p.name),
        };
    }

    private _nodeById(id: string): NodeUI | undefined {
        return this._runner.viewer.nodes.find((n) => n.id === id);
    }

    private _nodeByUri(uri: string): NodeUI | undefined {
        const prefix = "spk://graph/node/";
        if (!uri.startsWith(prefix)) return undefined;
        return this._nodeById(decodeURIComponent(uri.slice(prefix.length)));
    }

    /** Preferred locales for documentation resolution, English as the floor. */
    private _localesOf(raw: unknown): ReadonlyArray<string> {
        if (typeof raw === "string" && raw.length > 0) return [raw, "en"];
        return ["en"];
    }

    private _entriesOf(raw: unknown): ReadonlyArray<{ key: string; value: unknown }> {
        if (raw === null || typeof raw !== "object") return [];
        return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({ key, value }));
    }

    /** Signal a resource change. The adapter forwards it onto MCP. */
    private _changed(uri: string): void {
        this.onChanged(uri);
    }
}
