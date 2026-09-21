/**
 * Headless loading of a version-3 `.spikypanda` document: the same steps the
 * node editor takes at load and run time, without a canvas. In the core since
 * 2026-09-21: a document is a runtime notion, the editor is one of its hosts.
 *
 *   1. `registry.create(typeId)` for every saved node that carries one (the
 *      Start / Stop markers of old saves carry none and are skipped),
 *   2. `instance.deserialize(data)` to restore the saved fields,
 *   3. one runtime channel per saved connection whose two endpoints are
 *      runtime nodes; config wires such as `scene_out -> scene` land on
 *      GraphItems and are skipped, as graph-session-builder does,
 *   4. a `fault`-typed source port is an ApplyTo structural relation
 *      (fault operator -> model), not a data channel,
 *   5. root-scoped solver auto-fill through `buildSolverAttachmentsForGraph`,
 *   6. the root Scene item, when there is one, builds the session's
 *      `sceneStateView` exactly as the editor binds it, so gravity, time
 *      scale and the effective sample rate come from the document and a
 *      headless run reproduces the editor's numbers.
 *
 * Settings (`applySetting`) prefer the instance's public property, which
 * runs the node's own setter and change notification; when the property
 * does not exist on the instance they fall back to the saved data key, with
 * or without the leading underscore, through a full `deserialize`.
 */
import { ApplyTo } from "../graph/graph.olink";
import { buildSolverAttachmentsForGraph, collectDescriptors } from "../sim/solver.attachment";
import { RuntimeGraphBuilder } from "../execution/execution.builder";
import { Session } from "../execution/execution.session";
import { SimGraphNode } from "../sim/sim-graph.node";
import type { Channel } from "../execution/execution.channel";
import type { NodeRegistry } from "../graph/graph.registry";
import type { RuntimeGraph } from "../execution/execution.graph";
import type { IDeclaresPorts, IRuntimeNode } from "../execution/execution.interfaces";
import type { ISolver } from "../sim/sim.interfaces";
import type { SceneStateView } from "../sim/scene-state-view.interface";
import { DocumentError, type IDocumentSetting, type LoadedDocument, type SavedGraph, type SavedModelNode } from "./document.interfaces";

/** Shape-check a parsed document: version 3, a model with nodes and connections. `what` names it in the error. */
export function checkDocument(doc: unknown, what = "document"): SavedGraph {
    const d = doc as Partial<SavedGraph>;
    if (d?.version !== 3) throw new DocumentError(`${what}: expected a version 3 document, found ${String(d?.version)}`);
    if (!d.model || !Array.isArray(d.model.nodes) || !Array.isArray(d.model.connections)) {
        throw new DocumentError(`${what}: missing model.nodes or model.connections`);
    }
    return d as SavedGraph;
}

/** Parse the JSON text of a `.spikypanda` file and shape-check it. */
export function parseDocument(text: string, what = "document"): SavedGraph {
    let doc: unknown;
    try {
        doc = JSON.parse(text);
    } catch (e) {
        throw new DocumentError(`${what} is not JSON: ${(e as Error).message}`);
    }
    return checkDocument(doc, what);
}

interface SceneViewBuilderLike {
    buildStateView(resolver: unknown): SceneStateView;
}

function hasBuildStateView(x: unknown): x is SceneViewBuilderLike {
    return !!x && typeof (x as SceneViewBuilderLike).buildStateView === "function";
}

/**
 * The resolver the editor hands to the root Scene at bind time: publishers
 * and atmosphere resolve to nothing, so the Scene serves its static fields,
 * and the effective rate aggregates `requiredHz` over the session's nodes.
 */
function staticSceneResolver(session: Session): unknown {
    return {
        resolveNumberSource: () => null,
        resolveCartesian3Source: () => null,
        resolveQuaternionSource: () => null,
        resolveAtmosphere: () => null,
        aggregateEffectiveHz: () => SimGraphNode._aggregateRequiredHzFromSession(session),
    };
}

const isRuntime = (x: unknown): x is IRuntimeNode => !!x && typeof (x as IRuntimeNode).fire === "function";

/** Instantiate a document into a fresh session. Call once per run: sessions are not reset between points. */
export function instantiateDocument(doc: SavedGraph, registry: NodeRegistry): LoadedDocument {
    const instances = new Map<string, unknown>();
    const saved = new Map<string, SavedModelNode>();
    const missingTypeIds: string[] = [];
    for (const node of doc.model.nodes) {
        saved.set(node.id, node);
        if (!node.typeId) continue;
        const instance = registry.create(node.typeId);
        if (!instance) {
            if (!missingTypeIds.includes(node.typeId)) missingTypeIds.push(node.typeId);
            continue;
        }
        const deserializable = instance as { deserialize?: (blob: unknown) => void };
        if (node.data && typeof deserializable.deserialize === "function") deserializable.deserialize(node.data);
        instances.set(node.id, instance);
    }

    const runtimeNodes: IRuntimeNode[] = [];
    for (const instance of instances.values()) if (isRuntime(instance)) runtimeNodes.push(instance);

    const builder = new RuntimeGraphBuilder<IRuntimeNode, Channel>().withMode("dynamic").withNodes(...runtimeNodes);
    const skippedConnections: string[] = [];
    const applyToLinks: ApplyTo[] = [];
    const outputPortType = (node: IRuntimeNode, slot: string): string | undefined => (node as Partial<IDeclaresPorts>).outputPorts?.find((p) => p.slot === slot)?.type;
    for (const conn of doc.model.connections) {
        const from = instances.get(conn.from.node);
        const to = instances.get(conn.to.node);
        if (!isRuntime(from) || !isRuntime(to)) {
            skippedConnections.push(conn.id);
            continue;
        }
        if (outputPortType(from, conn.from.port) === "fault") {
            applyToLinks.push(new ApplyTo(from, to));
            continue;
        }
        builder.withChannel(from, to, conn.from.port, conn.to.port);
    }
    void applyToLinks; // held alive on the nodes' onsc/opsc

    const graph = builder.build() as RuntimeGraph<IRuntimeNode, Channel>;
    const session = new Session(graph);
    // The document's solver items (tolerance, maxStep) take precedence over
    // the registry defaults, as they do in the editor; a document without
    // one integrates with the defaults.
    const descriptors = collectDescriptors([...instances.values()] as Array<{ toSolverDescriptor?: () => never }>);
    for (const solver of buildSolverAttachmentsForGraph(descriptors, graph)) {
        (session as unknown as { attachSolver(s: ISolver): void }).attachSolver(solver);
    }

    let sceneBound = false;
    for (const instance of instances.values()) {
        if (!hasBuildStateView(instance)) continue;
        session.sceneStateView = instance.buildStateView(staticSceneResolver(session));
        sceneBound = true;
        break; // a session carries one ambient context; the editor takes the first too
    }

    return { session, graph, instances, saved, missingTypeIds, skippedConnections, sceneBound };
}

/** Apply one setting to a loaded document. Throws a `DocumentError` when nothing can take it. */
export function applySetting(loaded: LoadedDocument, setting: IDocumentSetting): void {
    const instance = loaded.instances.get(setting.node);
    if (instance === undefined) {
        throw new DocumentError(`node "${setting.node}" is not in the document (ids: ${[...loaded.instances.keys()].join(", ")})`);
    }
    const target = instance as Record<string, unknown>;
    if (setting.property in target) {
        try {
            target[setting.property] = setting.value;
        } catch (e) {
            throw new DocumentError(`node "${setting.node}": cannot set "${setting.property}": ${(e as Error).message}`);
        }
        return;
    }
    const node = loaded.saved.get(setting.node);
    const data = node?.data ?? {};
    const key = setting.property in data ? setting.property : `_${setting.property}` in data ? `_${setting.property}` : undefined;
    const deserializable = instance as { deserialize?: (blob: unknown) => void };
    if (key === undefined || typeof deserializable.deserialize !== "function") {
        throw new DocumentError(
            `node "${setting.node}" has no property "${setting.property}" and no saved key "${setting.property}" or "_${setting.property}" (saved keys: ${Object.keys(data).join(", ")})`
        );
    }
    deserializable.deserialize({ ...data, [key]: setting.value });
}

/** Read a numeric property of an instantiated node, refusing anything that is not a finite number. */
export function readNumber(loaded: LoadedDocument, node: string, property: string): number {
    const instance = loaded.instances.get(node);
    if (instance === undefined) throw new DocumentError(`node "${node}" is not in the document`);
    const value = (instance as Record<string, unknown>)[property];
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new DocumentError(`node "${node}": "${property}" is ${typeof value === "number" ? String(value) : typeof value}, not a finite number`);
    }
    return value;
}

export interface IDocumentProbe {
    /** Saved node id. */
    readonly node: string;
    /** A numeric property of the instance, read after each tick. */
    readonly property: string;
}

export interface IDocumentRunOptions {
    /** Session seconds per tick. */
    readonly dt: number;
    /** Session seconds to run; the number of ticks is `round(duration / dt)`. */
    readonly duration: number;
    readonly probes: ReadonlyArray<IDocumentProbe>;
    /** Keep one sample every `sampleEvery` ticks (1 = every tick). */
    readonly sampleEvery?: number;
    /** Settings applied before the run (initial states included); the session is reset after them. */
    readonly settings?: ReadonlyArray<IDocumentSetting>;
}

export interface IDocumentRun {
    readonly ticks: number;
    readonly samples: number;
    /** By `node.property`, `samples` values each. */
    readonly series: Map<string, Float64Array>;
    readonly wallMs: number;
}

/**
 * The tick loop of the editor, minus the animation frame: `session.run(t)`
 * at t = k * dt, then the probes are read. The same loop serves a sweep, a
 * twin behind a broker and a sandbox run; the numbers are the editor's.
 */
export function runDocument(loaded: LoadedDocument, options: IDocumentRunOptions): IDocumentRun {
    if (loaded.missingTypeIds.length > 0) throw new DocumentError(`the registry cannot resolve: ${loaded.missingTypeIds.join(", ")}`);
    for (const s of options.settings ?? []) applySetting(loaded, s);
    for (const p of options.probes) readNumber(loaded, p.node, p.property); // refuse a probe that is not a number before running
    loaded.session.reset();
    const started = Date.now();
    const ticks = Math.max(0, Math.round(options.duration / options.dt));
    const every = Math.max(1, Math.round(options.sampleEvery ?? 1));
    const samples = Math.ceil(ticks / every);
    const series = new Map<string, Float64Array>(options.probes.map((p) => [`${p.node}.${p.property}`, new Float64Array(samples)]));
    for (let k = 0; k < ticks; k++) {
        loaded.session.run(k * options.dt);
        if (k % every !== 0) continue;
        const i = k / every;
        for (const p of options.probes) series.get(`${p.node}.${p.property}`)![i] = readNumber(loaded, p.node, p.property);
    }
    return { ticks, samples, series, wallMs: Date.now() - started };
}
