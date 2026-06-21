/**
 * Headless loader for the version-3 .spikypanda graph files shipped in
 * packages/host/www/data/graphs/. Replicates what the node editor does
 * at load + run time, without any DOM:
 *
 *   1. registry.create(typeId) for every model node that carries one
 *      (the colored Start / Stop markers carry none and are skipped),
 *   2. instance.deserialize(model.data) to restore @cloneable fields,
 *   3. one runtime channel per model connection whose two endpoints
 *      are runtime nodes (config wires such as scene_out -> scene land
 *      on GraphItems and are skipped, mirroring graph-session-builder),
 *   4. root-scoped solver attachment through the same
 *      buildSolverAttachmentsForGraph auto-fill path the editor uses
 *      (a Scene + IIntegrable leaves integrate without an explicit
 *      solver item, cf. graph-session-builder.ts step 4).
 *
 * Viz.Plot:* nodes are registered as inert stubs: their real
 * implementations are render-only (fire() collects, repaint() no-ops
 * headless) but importing the viz plugin would drag uplot / pixi.js
 * into jest for no behavioral gain.
 */
import { ApplyTo, buildSolverAttachmentsForGraph, Channel, NodeRegistry, RuntimeGraph, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, IDeclaresPorts, IRuntimeNode, ISession, ISolver } from "spikypanda-core";
import * as fs from "fs";
import * as path from "path";

import physicsPlugin from "../../dev/plugins/physics/src/index";
import dspPlugin from "../../dev/plugins/dsp/src/index";
import mlPlugin from "../../dev/plugins/ml/src/index";
import logicPlugin from "../../dev/plugins/logic/src/index";
import controlPlugin from "../../dev/plugins/control/src/index";
import onnxPlugin from "../../dev/plugins/onnx/src/index";
import { registerLifecycleNodes } from "../../dev/nodeeditor/src/lifecycle-nodes";

export const GRAPHS_DIR = path.resolve(__dirname, "../../host/www/data/graphs");

// ─── Serialized document shape (version 3) ──────────────────────────────────

interface ISavedModelNode {
    id: string;
    label?: string;
    typeId?: string;
    data?: Record<string, unknown>;
}

interface ISavedConnection {
    id: string;
    from: { node: string; port: string };
    to: { node: string; port: string };
}

interface ISavedGraph {
    version: number;
    model: { nodes: ISavedModelNode[]; connections: ISavedConnection[] };
}

// ─── Plugin activation against a minimal headless context ───────────────────

/** Consumes anything on its single input; stands in for Viz.Plot:*. */
class VizStubNode extends RuntimeNode {
    public consumed = 0;

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                session.consume(idx);
                this.consumed++;
            }
        }
    }
}

interface IPluginModule {
    subPlugins?: Record<string, { activate(ctx: unknown): void }>;
    activate?(ctx: unknown): void;
}

export function buildHeadlessRegistry(): NodeRegistry {
    const registry = new NodeRegistry();
    const ctx = {
        id: "headless-tests",
        nodes: registry,
        editors: { register: () => undefined },
        assetUrl: (p: string) => p,
    };
    const plugins: IPluginModule[] = [physicsPlugin, dspPlugin, mlPlugin, logicPlugin, controlPlugin, onnxPlugin as unknown as IPluginModule];
    for (const plugin of plugins) {
        if (plugin.subPlugins) {
            for (const sub of Object.values(plugin.subPlugins)) {
                sub.activate(ctx);
            }
        } else if (typeof plugin.activate === "function") {
            plugin.activate(ctx);
        }
    }
    // Lifecycle Start / Stop: registry-backed since the typeId fix (a
    // save without typeId lost them to layout-only blobs at load).
    registerLifecycleNodes(registry);
    for (const typeId of ["Viz.Plot:line", "Viz.Plot:spectrum", "Viz.Plot:waterfall"]) {
        registry.register(typeId, () => new VizStubNode() as never, {
            label: `${typeId} (headless stub)`,
            category: "Viz.Plot",
            inputPorts: [{ slot: "value", optional: true, type: "any" }],
            outputPorts: [],
        });
    }
    return registry;
}

// ─── Loading ─────────────────────────────────────────────────────────────────

export interface ILoadedGraph {
    session: Session;
    graph: RuntimeGraph<IRuntimeNode, Channel>;
    /** Every instantiated node (runtime nodes AND GraphItems), by saved id. */
    instances: Map<string, unknown>;
    /** typeIds present in the file that the registry could not resolve. */
    missingTypeIds: string[];
    /** Model connections skipped because an endpoint is not a runtime node. */
    skippedConnections: string[];
}

export function loadGraphHeadless(fileName: string, registry: NodeRegistry): ILoadedGraph {
    const raw = fs.readFileSync(path.join(GRAPHS_DIR, fileName), "utf8");
    const doc = JSON.parse(raw) as ISavedGraph;
    expect(doc.version).toBe(3);

    const instances = new Map<string, unknown>();
    const missingTypeIds: string[] = [];
    for (const saved of doc.model.nodes) {
        if (!saved.typeId) continue; // Start / Stop markers
        const instance = registry.create(saved.typeId);
        if (!instance) {
            missingTypeIds.push(saved.typeId);
            continue;
        }
        const deserializable = instance as { deserialize?: (blob: unknown) => void };
        if (saved.data && typeof deserializable.deserialize === "function") {
            deserializable.deserialize(saved.data);
        }
        instances.set(saved.id, instance);
    }

    const isRuntime = (x: unknown): x is IRuntimeNode => !!x && typeof (x as IRuntimeNode).fire === "function";
    const runtimeNodes: IRuntimeNode[] = [];
    for (const instance of instances.values()) {
        if (isRuntime(instance)) runtimeNodes.push(instance);
    }

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
        // A `fault`-typed source port is an ApplyTo structural relation (fault
        // operator -> model), NOT a data channel: build the typed core link so
        // the model's fire() drives it via opsc(ApplyTo).
        if (outputPortType(from, conn.from.port) === "fault") {
            applyToLinks.push(new ApplyTo(from, to));
            continue;
        }
        builder.withChannel(from, to, conn.from.port, conn.to.port);
    }
    void applyToLinks; // held alive on the nodes' onsc/opsc; kept for clarity

    const graph = builder.build() as RuntimeGraph<IRuntimeNode, Channel>;
    const session = new Session(graph);

    // Root-scoped solver auto-fill (editor parity): with a Scene item in
    // the file and IIntegrable leaves in the graph, the default
    // rk4-adaptive descriptor is auto-filled from SOLVER_REGISTRY (the
    // control plugin's activation registered the factory).
    const solvers = buildSolverAttachmentsForGraph([], graph);
    for (const solver of solvers) {
        (session as unknown as { attachSolver(s: ISolver): void }).attachSolver(solver);
    }

    return { session, graph, instances, missingTypeIds, skippedConnections };
}

/** Find the first instantiated node of the given class, with its saved id. */
export function findInstance<T>(loaded: ILoadedGraph, ctor: new (...args: never[]) => T): T {
    for (const instance of loaded.instances.values()) {
        if (instance instanceof ctor) return instance;
    }
    throw new Error(`No instance of ${ctor.name} in the loaded graph`);
}

/** Step the session over n ticks of dt seconds, starting after t0. */
export function runTicks(session: Session, n: number, dt: number, t0 = 0): number {
    let t = t0;
    for (let k = 1; k <= n; k++) {
        t = t0 + k * dt;
        session.run(t);
    }
    return t;
}
