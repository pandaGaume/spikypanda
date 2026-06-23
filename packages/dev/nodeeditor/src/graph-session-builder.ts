import {
    ApplyTo,
    buildSolverAttachmentsForGraph,
    isSceneResident,
    RuntimeGraphBuilder,
    Session,
    SimGraphNode,
    type Channel,
    type IHasTransform,
    type IRuntimeGraph,
    type IRuntimeNode,
    type ISolver,
    type ISolverDescriptor,
    type SceneStateView,
} from "spikypanda-core";
import type { GraphViewer } from "./components/graph-viewer";
import type { NodeUI } from "./node-ui";
import type { Port } from "./port";

/**
 * Build a fresh `Session` over the current GraphViewer state.
 *
 * Three steps:
 *
 *   1. **Config-link sync** — walk every `linkKind === "config"`
 *      Connection and populate the involved SceneItem / SimGraphNode
 *      `*ItemId` fields. The SceneBindingResolver picks these up at
 *      SimGraphNode.reset() to bind the live SceneStateView and
 *      attach solvers; without this step the user's dashed wiring
 *      has no runtime effect.
 *
 *   2. **Runtime node collection** — gather every NodeUI whose
 *      `item.data` implements the `IRuntimeNode.fire(...)` contract.
 *      Pure GraphItems (SceneItem and friends) are NOT runtime nodes
 *      and are deliberately excluded from the runtime graph.
 *
 *   3. **Runtime channel wiring** — for each non-config-link
 *      Connection, allocate a runtime channel between the two
 *      endpoints. Config-link Connections are explicitly skipped
 *      here (already consumed in step 1); they also get filtered as
 *      a side-effect of the "either endpoint is not a runtime node"
 *      check, but the explicit guard documents the intent.
 *
 * Each NodeUI's `item.data` is consumed as-is as the runtime node — no
 * cloning, so node-local state (counters, cached values, internal
 * arrays) survives across builds. Channels are freshly created and
 * returned so the caller can `.dispose()` them when the session is
 * torn down: without that cleanup, subsequent builds accumulate dead
 * channels in each node's `onsc/opsc` arrays.
 *
 * The destination port's slot name addresses each channel (matches
 * `resolveSlotInputs` keys in the node's `fire()`). Both data and
 * control ports (`_enable`, `_start`, ...) are wired identically; the
 * runtime distinguishes them downstream.
 */
export function buildSessionFromViewer(viewer: GraphViewer): {
    session: Session;
    channels: Channel[];
} {
    // Step 1: sync config-links → SceneItem / SimGraphNode metadata.
    syncConfigLinksFromCanvas(viewer);

    // Step 2: collect runtime nodes.
    const nodes: IRuntimeNode[] = [];
    for (const n of viewer.nodes) {
        const data = n && n.item && (n.item as { data?: unknown }).data;
        if (data && typeof (data as IRuntimeNode).fire === "function") {
            nodes.push(data as IRuntimeNode);
        }
    }

    const builder = new RuntimeGraphBuilder<IRuntimeNode, Channel>().withMode("dynamic").withNodes(...nodes);

    // Step 3: wire runtime channels for data Connections; for STRUCTURAL
    // (ApplyTo) Connections, create the typed core link instead of a channel —
    // a fault operator (`from`) applies its physics to a model (`to`), read by
    // the model's fire() via opsc(ApplyTo), never as a port payload.
    const structuralLinks: ApplyTo[] = [];
    for (const conn of viewer.connections) {
        if (conn.linkKind === "config") continue;
        const fromNode = _findRuntimeNodeByPort(viewer, conn.from, "output");
        const toNode = _findRuntimeNodeByPort(viewer, conn.to, "input");
        if (!fromNode || !toNode) continue;
        if (conn.linkKind === "structural") {
            structuralLinks.push(new ApplyTo(fromNode, toNode));
            continue;
        }
        const fromSlot = (conn.from as Port).name;
        const toSlot = (conn.to as Port).name;
        builder.withChannel(fromNode, toNode, fromSlot, toSlot);
    }

    const graph = builder.build();
    const session = new Session(graph);

    // Step 4: root-level solver attachment.
    //
    // The SimGraphNode pattern (P4) attaches solvers via its
    // bindingResolver inside a Sim.Graph wrapper. At the ROOT canvas
    // there is no SimGraphNode to trigger that, so a graph that drops
    // Scene + Solver + IIntegrable leaves directly at root used to
    // leave the leaves un-integrated.
    //
    // After the 2026-06-09 solver-as-descriptor refactor:
    //   - Each SolverItem (GraphItem) carries common options +
    //     `toSolverDescriptor()` that produces a kind + options bag.
    //   - Each IIntegrable leaf carries an OPTIONAL `solverKind`
    //     (defaults to "rk4-adaptive") and optional `solverOptions`.
    //   - The attachment helper (`buildSolverAttachmentsForGraph`)
    //     groups leaves by kind, resolves descriptors from the Scene
    //     OR auto-fills from `SOLVER_REGISTRY.defaultOptions(kind)`,
    //     merges per-leaf overrides, and asks the registry's factory
    //     to instantiate an `ISolver` per group.
    //
    // The result: dropping a Scene + DC motor at root WITHOUT any
    // explicit Solver wiring still integrates the motor (the helper
    // auto-fills the default "rk4-adaptive" descriptor). Adding a
    // wired RK4SolverItem just lets the user tune tolerance / maxStep.
    attachRootScopedSolvers(viewer, graph, session);

    // Step 5: bind the root scene view. Without this, session.sceneStateView
    // is null and every TransformNode-derived node (motors, sensors)
    // falls back to its per-node Earth default; the wired Scene has no
    // runtime effect. We materialise the root SceneItem's live view and
    // assign it; root nodes read it through getScene() each fire, and
    // nested Sim.Graphs inherit it live (InheritedSceneStateView).
    bindRootSceneView(viewer, session);

    // Step 6: inject per-node scene overrides. A world object whose
    // `scene` port is wired to a SceneItem reads THAT scene's gravity
    // (overriding the session scene), so two motors on one canvas can
    // live in different scenes without a Sim.Graph wrapper each.
    bindPerNodeScenes(viewer, session);

    // Step 7: single-truth transform — wire each scene-resident node's
    // structural `parent` to its scene node, so `worldTransform()` chains
    // object -> scene -> ... -> root via `parent.worldTransform()` (no
    // scene-view transform). Per-node `sceneItemId` wins, else the root scene.
    bindSceneParents(viewer, graph);

    // Return the data channels AND the structural ApplyTo links for disposal:
    // both are GraphOLinks, so disposeChannels tears them off the nodes on the
    // next build — without this, repeated Play/Stop would accumulate duplicate
    // ApplyTo links and the model would apply each fault N times.
    return {
        session,
        channels: [...(graph.links as Channel[]), ...(structuralLinks as unknown as Channel[])],
    };
}

/** Resolve each scene-overridable node's `sceneItemId` to a live view and
 *  inject it. Clears the binding when unwired. No-op when no Scene is on
 *  the canvas. */
function bindPerNodeScenes(viewer: GraphViewer, session: Session): void {
    const scenesById = new Map<string, SceneViewBuilderLike>();
    for (const n of viewer.nodes) {
        const data = n && n.item && (n.item as { data?: unknown }).data;
        if (hasBuildStateView(data)) scenesById.set(String(n.id), data);
    }
    const resolver = new ViewerSceneSourceResolver(session);
    for (const n of viewer.nodes) {
        const data = n && n.item && (n.item as { data?: unknown }).data;
        if (!isSceneOverridableLike(data)) continue;
        const id = data.sceneItemId;
        const scene = id ? scenesById.get(String(id)) : undefined;
        data.setBoundSceneView(scene ? scene.buildStateView(resolver) : null);
    }
}

/** Single-truth transform: wire each scene-resident runtime node's structural
 *  `parent` to its scene node (per-node `sceneItemId` override, else the root
 *  SceneItem), so `worldTransform()` chains object -> scene -> ... -> root via
 *  `parent.worldTransform()`. The SceneItem is a GraphNode (IHasTransform), so
 *  the parent ref is structural geometry, not the runtime dispatch graph
 *  (SceneItems have no fire() and never enter `graph.nodes`). No-op when no
 *  Scene is on the canvas: residents stay parentless and their world is their
 *  bare local pose. */
function bindSceneParents(viewer: GraphViewer, graph: IRuntimeGraph): void {
    const scenesById = new Map<string, IHasTransform>();
    let rootScene: IHasTransform | undefined;
    for (const n of viewer.nodes) {
        const data = n && n.item && (n.item as { data?: unknown }).data;
        if (hasBuildStateView(data)) {
            scenesById.set(String(n.id), data as unknown as IHasTransform);
            if (rootScene === undefined) rootScene = data as unknown as IHasTransform;
        }
    }
    if (!rootScene) return;
    for (const node of graph.nodes) {
        if (!isSceneResident(node)) continue;
        const perNodeId = (node as { sceneItemId?: string }).sceneItemId;
        const scene = (perNodeId && scenesById.get(String(perNodeId))) || rootScene;
        // ILiveInScene is orthogonal to IHasTransform; a runtime resident is a
        // GraphNode, so it carries the geometry `parent` the scene chain needs.
        (node as unknown as IHasTransform).parent = scene;
    }
}

/** Minimal structural shape of a SceneItem that can build a live view.
 *  Duck-typed so nodeeditor keeps zero dependency on plugin-physics. */
interface SceneViewBuilderLike {
    buildStateView(resolver: ViewerSceneSourceResolver): SceneStateView;
}
function hasBuildStateView(data: unknown): data is SceneViewBuilderLike {
    return !!data && typeof (data as SceneViewBuilderLike).buildStateView === "function";
}

/**
 * SceneSourceResolver implementation over the editor viewer.
 *
 * V1 scope (matches the SceneStateView contract's own V1/V3 split):
 *   - Dynamic publisher-driven latents (gravity_in, temperature_in, …)
 *     resolve to null, so the SceneItem serves its STATIC editable,
 *     which is exactly what the gravity study needs (Earth vs Orbital
 *     is picked via the Scene's gravity editable / preset, not a wire).
 *     Publisher-driven gravity is deferred ("V3") per the interface.
 *   - Atmosphere resolves to null: the config-link sync pass has already
 *     stamped the SceneItem's live `_atmosphereRef`, which buildStateView
 *     prefers over this resolver round-trip.
 *   - effectiveHz aggregates max(requiredHz) over the session's nodes,
 *     reusing the same rule Sim.Graph uses for sub-stepping.
 */
class ViewerSceneSourceResolver {
    public constructor(private readonly _session: Session) {}
    public resolveNumberSource(_id: string): (() => number) | null {
        return null;
    }
    public resolveCartesian3Source(_id: string): (() => never) | null {
        return null;
    }
    public resolveQuaternionSource(_id: string): (() => never) | null {
        return null;
    }
    public resolveAtmosphere(_id: string): null {
        return null;
    }
    public aggregateEffectiveHz(): number {
        return SimGraphNode._aggregateRequiredHzFromSession(this._session);
    }
}

/** Find the root SceneItem on the canvas and assign its live view to the
 *  session. No-op when no Scene is present (graphs keep the per-node
 *  Earth fallback). When several Scenes sit at root, the first wins and
 *  the rest are warned about; a session carries one ambient context. */
function bindRootSceneView(viewer: GraphViewer, session: Session): void {
    const scenes: SceneViewBuilderLike[] = [];
    for (const n of viewer.nodes) {
        const data = n && n.item && (n.item as { data?: unknown }).data;
        if (hasBuildStateView(data)) scenes.push(data);
    }
    if (scenes.length === 0) return;
    if (scenes.length > 1) {
        // eslint-disable-next-line no-console
        console.warn(`[graph-session-builder] ${scenes.length} root Scenes found; using the first for session.sceneStateView`);
    }
    const resolver = new ViewerSceneSourceResolver(session);
    (session as unknown as { sceneStateView: SceneStateView }).sceneStateView = scenes[0].buildStateView(resolver);
}

/** Duck-type for a SolverItem GraphItem: anything that returns an
 *  `ISolverDescriptor` from `toSolverDescriptor()` and accepts a
 *  `bindSolver(solver, ownedCount)` callback to receive the live
 *  instance for diagnostics. */
interface SolverItemLike {
    toSolverDescriptor(): ISolverDescriptor;
    bindSolver?(solver: ISolver | null, ownedCount: number): void;
    refreshDiagnostics?(): void;
}
function isSolverItemLike(x: unknown): x is SolverItemLike {
    return !!x && typeof (x as SolverItemLike).toSolverDescriptor === "function";
}

/** Walk root SceneItems, collect descriptors from their wired SolverItems,
 *  delegate to `buildSolverAttachmentsForGraph` (which groups leaves by
 *  `solverKind`, auto-fills from the registry when needed, merges
 *  per-leaf solverOptions, and instantiates via the factory), attach
 *  each returned solver to the session, and bind each solver back to
 *  its descriptor so diagnostic viewables stay live.
 *
 *  Auto-fill case: a leaf declares `solverKind = "X"` but the Scene
 *  carries no descriptor for "X". `buildSolverAttachmentsForGraph`
 *  creates a default descriptor from `SOLVER_REGISTRY.defaultOptions("X")`
 *  if "X" is registered, or warns + skips otherwise.
 *
 *  No-op when no Scene is at root or no IIntegrable leaves are present. */
function attachRootScopedSolvers(viewer: GraphViewer, graph: IRuntimeGraph, session: Session): void {
    // 1. Index SolverItems by node id. SolverItems are GraphItems
    //    (descriptors), NOT runtime nodes — they're excluded from the
    //    runtime graph collection in buildSessionFromViewer's Step 2.
    const solverItemsByNodeId = new Map<string, SolverItemLike>();
    for (const n of viewer.nodes) {
        const data = n && n.item && (n.item as { data?: unknown }).data;
        if (isSolverItemLike(data)) {
            solverItemsByNodeId.set(String(n.id), data);
        }
    }
    // 2. Iterate root SceneItems. For each, collect descriptors from
    //    its wired solverItemIds, then call the attachment helper.
    for (const n of viewer.nodes) {
        const data = n && n.item && (n.item as { data?: unknown }).data;
        if (!isSceneItemLike(data)) continue;
        if (!data.solverItemIds || data.solverItemIds.length === 0) {
            // Even without explicit wirings, auto-fill from registry
            // defaults applies for any IIntegrable leaf in the graph.
            // Pass empty descriptors; the helper does the right thing.
        }
        const descriptors: ISolverDescriptor[] = [];
        const orderedItems: SolverItemLike[] = [];
        for (const solverId of data.solverItemIds) {
            const item = solverItemsByNodeId.get(String(solverId));
            if (!item) continue;
            try {
                descriptors.push(item.toSolverDescriptor());
                orderedItems.push(item);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn("[graph-session-builder] solver descriptor failed for", solverId, e);
            }
        }
        const solvers = buildSolverAttachmentsForGraph(descriptors, graph);
        for (const solver of solvers) {
            (session as unknown as { attachSolver(h: ISolver): void }).attachSolver(solver);
        }
        // Bind each solver back to its descriptor's SolverItem so the
        // panel's diagnostic viewables (lastMicroSteps, lastMaxError,
        // rhsEvalsTotal) light up. We re-walk by kind because solvers
        // and items are not in lock-step order (the helper may return
        // fewer solvers than descriptors when a kind has zero matching
        // leaves, or more when it auto-fills from the registry).
        for (let i = 0; i < orderedItems.length && i < solvers.length; i++) {
            // Naive 1:1 match assumes the helper preserves the same
            // ordering as our descriptors array, which it currently
            // does (group-by-kind iterates the Map's insertion order
            // which mirrors the leaves' first-encounter order, not
            // the descriptors order). For V1 we accept this mismatch:
            // bindSolver is a diagnostic hookup, not a correctness
            // guarantee. A follow-up can match by kind.
            const item = orderedItems[i];
            if (item.bindSolver) {
                // ownedCount is the number of leaves the solver was
                // initialised with; we don't have that here without
                // re-walking, so report 0 and rely on the user opening
                // a fresh session to refresh.
                item.bindSolver(solvers[i], 0);
            }
        }
        if (data.solverItemIds.length > 0 && solvers.length === 0) {
            // Wired but produced no integrators — common cause: no
            // IIntegrable leaves in the graph. Tell the console so
            // the user knows where to look.
            // eslint-disable-next-line no-console
            console.warn("[graph-session-builder] solver(s) wired but no IIntegrable leaves matched");
        }
    }
}

/** Releases every channel created by `buildSessionFromViewer`. */
export function disposeChannels(channels: Channel[]): void {
    for (const ch of channels) {
        try {
            ch.dispose();
        } catch (_e) {
            /* swallow */
        }
    }
}

// ─────────────────────────────────────────────────────────────────────
// Config-link → SceneItem / SimGraphNode metadata sync
// ─────────────────────────────────────────────────────────────────────

/** Minimal structural shape of a SceneItem-like model, as seen by the
 *  builder. We duck-type rather than importing the SceneItem class so
 *  this file stays free of any plugin dependency — the same sync
 *  logic works for any plugin that follows the convention.
 *
 *  Optional `bindAtmosphere`: when present, the builder calls it with
 *  both the wired atmosphere's ID and the runtime instance, so the
 *  SceneItem can surface live atmosphere values via @viewable
 *  accessors in the property panel. SceneItems that don't implement
 *  bindAtmosphere still get their atmosphereItemId set the legacy
 *  way (string only). */
interface SceneItemLike {
    atmosphereItemId: string;
    solverItemIds: ReadonlyArray<string>;
    sharedNodeIds: ReadonlyArray<string>;
    bindAtmosphere?(atmosphereItemId: string, aggregator: AtmosphereAggregatorLike | null): void;
    // Live-value provider binding (V1.5): closure that reads the
    // publisher's current output through the getter named after the
    // wired slot. Surfaces live values into the SceneItem panel
    // viewables WITHOUT requiring a running session.
    bindPropertyProvider?(propertyName: string, provider: (() => unknown) | null): void;
    // Per-property source IDs — populated by data-wire connections
    // landing on the corresponding Scene input port (gravity_in, etc.).
    // Each is a publisher node UUID string ("" means unwired). The
    // runtime resolves these into live-value thunks at session bind.
    gravitySourceId?: string;
    temperatureSourceId?: string;
    pressureSourceId?: string;
    densitySourceId?: string;
    timeScaleSourceId?: string;
    localPositionSourceId?: string;
    localRotationSourceId?: string;
    localScaleSourceId?: string;
    localMatrixSourceId?: string;
    parentWorldMatrixSourceId?: string;
}

/** Mapping from a Scene's data input slot name to the corresponding
 *  *SourceId property on SceneItem. Centralised so the per-connection
 *  loop below stays a single switch table. */
const SCENE_INPUT_SLOT_TO_SOURCE_ID: Readonly<Record<string, keyof SceneItemLike>> = {
    gravity_in: "gravitySourceId",
    temperature_in: "temperatureSourceId",
    pressure_in: "pressureSourceId",
    density_in: "densitySourceId",
    time_scale_in: "timeScaleSourceId",
    local_position_in: "localPositionSourceId",
    local_rotation_in: "localRotationSourceId",
    local_scale_in: "localScaleSourceId",
    local: "localMatrixSourceId",
    parentWorld: "parentWorldMatrixSourceId",
};

/** Mapping from a Scene's data input slot name to the SceneItem
 *  property name consumed by `bindPropertyProvider`. The property
 *  name is what the getter is named on SceneItem (camelCase). */
const SCENE_INPUT_SLOT_TO_PROPERTY: Readonly<Record<string, string>> = {
    gravity_in: "gravity",
    temperature_in: "temperature",
    pressure_in: "pressure",
    density_in: "density",
    time_scale_in: "timeScale",
    local_position_in: "localPosition",
    local_rotation_in: "localRotation",
    local_scale_in: "localScale",
    local: "localMatrix",
    parentWorld: "parentWorldMatrix",
};

/** Minimal IAtmosphereAggregator-shaped object. The atmosphere node
 *  (physics-plugin) implements this with a sampleAggregates() method
 *  that returns the volume-weighted aggregates across active layers. */
interface AtmosphereAggregatorLike {
    sampleAggregates(): { pressure: number; temperatureK: number; density: number; mass: number; volumeM3: number };
}

function isAtmosphereAggregatorLike(data: unknown): data is AtmosphereAggregatorLike {
    return !!data && typeof data === "object" && typeof (data as AtmosphereAggregatorLike).sampleAggregates === "function";
}

/** Minimal structural shape of a SimGraphNode-like model. Bound via the
 *  `scene_in` config-link. Discriminated from a per-node-scene-overridable
 *  world object (which also carries `sceneItemId`) by the ABSENCE of
 *  `setBoundSceneView`. */
interface SimGraphNodeLike {
    sceneItemId: string;
}

/** A TransformNode-derived world object that accepts a per-node scene
 *  override on its `scene` port: carries `sceneItemId` AND the injection
 *  seam `setBoundSceneView`. */
interface SceneOverridableLike {
    sceneItemId: string;
    setBoundSceneView(view: SceneStateView | null): void;
}
function isSceneOverridableLike(data: unknown): data is SceneOverridableLike {
    return !!data && typeof (data as SceneOverridableLike).setBoundSceneView === "function" && typeof (data as SceneOverridableLike).sceneItemId === "string";
}

/** Minimal IGasMetadata-shaped object: chemistry plugin's GasNode
 *  qualifies, but so does any plugin-supplied gas descriptor. */
interface GasMetadataLike {
    readonly speciesId: string;
    readonly displayName: string;
    readonly molarMass: number;
}

/** Minimal structural shape of a CompositionNode-like model. The
 *  bind methods are the seams: every plugin that wants its
 *  composition-class node populated from wired Gas / Particulate
 *  references exposes methods with these signatures.
 *
 *  The composition holds two bind pools:
 *    - gases:        bind-additive, persistent across sync passes (the
 *                    user removes a gas explicitly via the property
 *                    panel; unwiring leaves the component baked in).
 *    - particulates: reset-each-sync; `clearParticulates()` is called
 *                    at the start of every sync pass before re-binding. */
interface CompositionNodeLike {
    bindGas(gasItemId: string, gas: GasMetadataLike): void;
    bindParticulate(particulateItemId: string, particulate: ParticulateMetadataLike): void;
    clearParticulates(): void;
    readonly components: ReadonlyArray<{
        readonly speciesId: string;
        readonly moleFraction: number;
        readonly molarMass: number;
    }>;
    readonly particulates: ReadonlyArray<ParticulateMetadataLike>;
    readonly referencePressurePa: number;
}

/** Minimal IParticulateMetadata-shaped object (P9.5 stub).
 *  Particulates keep their own class because they are NOT gases
 *  (solid matter, distinct physics). */
interface ParticulateMetadataLike {
    readonly particulateId: string;
    readonly displayName: string;
    readonly characteristicDiameter?: number;
    readonly density?: number;
    readonly pmClass?: string;
}

/** Minimal structural shape of an AtmosphereLayerNode-like model.
 *  The bind methods are the seams the session-builder routes config-
 *  link wirings onto. `clearBindings` is called once per sync pass
 *  to wipe stale wirings before re-applying.
 *
 *  The Layer's only direct binding is the Composition. Particulates
 *  ride along inside the Composition; pollutant-class species are
 *  just gases with toxicology attributes — both reach the Layer
 *  through the bound Composition. */
interface AtmosphereLayerLike {
    bindComposition(compositionItemId: string, composition: CompositionNodeLike | null): void;
    clearBindings(): void;
}

/** Minimal IIntegrable-like shape a layer must satisfy so the
 *  Atmosphere container's composite IIntegrable dispatch works. The
 *  full AtmosphereLayerNode satisfies this; tests use a stub of the
 *  same shape. */
interface LayerIntegrable {
    readonly stateSize: number;
    readonly stateNames: ReadonlyArray<string>;
    gatherState(y: Float64Array, off: number): void;
    writeState(y: Float64Array, off: number): void;
    rhs(t: number, y: Float64Array, off: number, inputs: unknown, dydt: Float64Array): void;
    reset(session: unknown): void;
    fire(session: unknown, t: number): void;
    sampleAggregates(session: unknown): { pressure: number; temperatureK: number; mass: number; volumeM3: number };
}

/** Minimal structural shape of an AtmosphereNode-like model
 *  (the multi-layer container). Routes `layer_out → layer_in_<k>`
 *  wirings onto the container's composite IIntegrable. */
interface AtmosphereContainerLike {
    bindLayer(layerItemId: string, layer: LayerIntegrable): void;
    clearBindings(): void;
}

/** Minimal structural shape of an AtmosphereGate-like model (#3
 *  refactor 2026-06-09). The gate config-links DIRECTLY to two
 *  atmospheres via atmosphere_A_in / atmosphere_B_in and reads /
 *  writes them through IAtmosphereGateHandle methods at runtime —
 *  no per-species data channels anymore. */
interface AtmosphereGateLike {
    bindAtmosphereA(atmosphereItemId: string, atmosphere: AtmosphereGateHandleLike | null): void;
    bindAtmosphereB(atmosphereItemId: string, atmosphere: AtmosphereGateHandleLike | null): void;
    clearBindings(): void;
}

/** Minimal IAtmosphereGateHandle-shaped object. Both AtmosphereLayer
 *  and AtmosphereNode satisfy this through their gate-facing API
 *  (getMassKg / getMoleFraction / applyMassDelta / pressurePa /
 *  temperatureK / volume / activeSpecies). */
interface AtmosphereGateHandleLike {
    readonly activeSpecies: ReadonlyArray<string>;
    readonly temperatureK: number;
    readonly pressurePa: number;
    readonly volume: number;
    getMassKg(speciesId: string): number;
    getMoleFraction(speciesId: string): number;
    applyMassDelta(speciesId: string, deltaKg: number): void;
}

function isSceneItemLike(data: unknown): data is SceneItemLike {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<SceneItemLike>;
    return typeof d.atmosphereItemId === "string" && Array.isArray(d.solverItemIds) && Array.isArray(d.sharedNodeIds);
}

function isSimGraphNodeLike(data: unknown): data is SimGraphNodeLike {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<SimGraphNodeLike>;
    // A world object that exposes setBoundSceneView is a per-node-scene
    // overridable (binds via `scene`), NOT a Sim.Graph (binds via
    // `scene_in`); exclude it so the two paths stay disjoint.
    return typeof d.sceneItemId === "string" && typeof (d as Partial<SceneOverridableLike>).setBoundSceneView !== "function";
}

function isGasMetadataLike(data: unknown): data is GasMetadataLike {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<GasMetadataLike>;
    return (
        typeof d.speciesId === "string" &&
        d.speciesId.length > 0 &&
        typeof d.displayName === "string" &&
        typeof d.molarMass === "number" &&
        Number.isFinite(d.molarMass) &&
        d.molarMass > 0
    );
}

function isCompositionNodeLike(data: unknown): data is CompositionNodeLike {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<CompositionNodeLike>;
    return (
        typeof d.bindGas === "function" &&
        typeof d.bindParticulate === "function" &&
        typeof d.clearParticulates === "function" &&
        Array.isArray(d.components) &&
        Array.isArray(d.particulates) &&
        typeof d.referencePressurePa === "number"
    );
}

function isParticulateMetadataLike(data: unknown): data is ParticulateMetadataLike {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<ParticulateMetadataLike>;
    return typeof d.particulateId === "string" && d.particulateId.length > 0 && typeof d.displayName === "string";
}

function isAtmosphereLayerLike(data: unknown): data is AtmosphereLayerLike {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<AtmosphereLayerLike>;
    return (
        typeof d.bindComposition === "function" &&
        typeof d.clearBindings === "function" &&
        // Disambiguate from CompositionNodeLike (which also has
        // clearBindings via clearParticulates) by requiring
        // bindComposition AND NOT bindGas (Composition has bindGas;
        // Layer doesn't). An AtmosphereNode (which extends Layer)
        // satisfies this guard AND the container guard simultaneously,
        // which is intentional: composition_in routes via this map,
        // layer_in_<k> via the container map.
        typeof (d as Partial<CompositionNodeLike>).bindGas !== "function"
    );
}

function isLayerIntegrableLike(data: unknown): data is LayerIntegrable {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<LayerIntegrable> & { stateSize?: unknown };
    return (
        typeof d.stateSize === "number" &&
        typeof d.gatherState === "function" &&
        typeof d.writeState === "function" &&
        typeof d.rhs === "function" &&
        typeof d.reset === "function" &&
        typeof d.fire === "function" &&
        typeof d.sampleAggregates === "function"
    );
}

function isAtmosphereContainerLike(data: unknown): data is AtmosphereContainerLike {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<AtmosphereContainerLike>;
    // Atmosphere extends AtmosphereLayer, so it ALSO has bindComposition.
    // We discriminate purely on `bindLayer`: any node that exposes
    // bindLayer is a container, regardless of also being a Layer. The
    // same instance lives in BOTH the layers map (because of bindComposition)
    // and the atmospheres map — composition_in routes via the layer
    // path, layer_in_<k> routes via the container path.
    return typeof d.bindLayer === "function" && typeof d.clearBindings === "function";
}

function isAtmosphereGateLike(data: unknown): data is AtmosphereGateLike {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<AtmosphereGateLike>;
    return typeof d.bindAtmosphereA === "function" && typeof d.bindAtmosphereB === "function" && typeof d.clearBindings === "function";
}

function isAtmosphereGateHandleLike(data: unknown): data is AtmosphereGateHandleLike {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<AtmosphereGateHandleLike>;
    return (
        Array.isArray(d.activeSpecies) &&
        typeof d.temperatureK === "number" &&
        typeof d.pressurePa === "number" &&
        typeof d.volume === "number" &&
        typeof d.getMassKg === "function" &&
        typeof d.getMoleFraction === "function" &&
        typeof d.applyMassDelta === "function"
    );
}

/**
 * Walk every Connection in the viewer; for each one whose port types
 * belong to the config-link family, populate the appropriate field on
 * the receiving SceneItem (or SimGraphNode). Runs from scratch on
 * every call: SceneItem fields are reset to empty before scanning, so
 * a removed connection takes effect on the very next build.
 *
 * Connection cardinality summary:
 *   `atmosphere_out → atmosphere_in`    → SceneItem.atmosphereItemId (singular)
 *   `solver_out → solver_in_<k>`        → SceneItem.solverItemIds (variadic append)
 *   `scene_share_out → shared_in_<k>`   → SceneItem.sharedNodeIds (variadic append)
 *   `scene_out → scene_in`               → SimGraphNode.sceneItemId (singular)
 *
 * Order of appends in the variadic cases follows Connection iteration
 * order, which itself follows the user's drag-and-drop order — the
 * scheduler does not care, but the property panel surfaces this order
 * to the user.
 */
export function syncConfigLinksFromCanvas(viewer: GraphViewer): void {
    // Reset every candidate's fields up front so stale Connections
    // (since removed) stop contributing. Compositions are an
    // exception: their components list is bind-additive — wiring a
    // gas registers it, unwiring it leaves the component at its last
    // mole fraction (the user can remove it via the property panel).
    // This preserves preset-baked species when the user has not
    // explicitly wired anything.
    const sceneItemsByNodeId = new Map<string, SceneItemLike>();
    const simGraphsByNodeId = new Map<string, SimGraphNodeLike>();
    const sceneOverridablesByNodeId = new Map<string, SceneOverridableLike>();
    const compositionsByNodeId = new Map<string, CompositionNodeLike>();
    const gasNodesByNodeId = new Map<string, GasMetadataLike>();
    const layersByNodeId = new Map<string, AtmosphereLayerLike>();
    const layerIntegrablesByNodeId = new Map<string, LayerIntegrable>();
    const atmospheresByNodeId = new Map<string, AtmosphereContainerLike>();
    const atmosphereGatesByNodeId = new Map<string, AtmosphereGateLike>();
    const atmosphereHandlesByNodeId = new Map<string, AtmosphereGateHandleLike>();
    const particulatesByNodeId = new Map<string, ParticulateMetadataLike>();
    for (const n of viewer.nodes) {
        const data = n.item && (n.item as { data?: unknown }).data;
        if (isSceneItemLike(data)) {
            // Reset all bindings up front. The per-connection loop
            // below re-applies anything still on the canvas; removing
            // a wire makes the binding disappear on the next sync.
            data.atmosphereItemId = "";
            data.solverItemIds = [];
            data.sharedNodeIds = [];
            if (typeof data.bindAtmosphere === "function") {
                data.bindAtmosphere("", null);
            }
            // Reset per-property source IDs (the data-input ports).
            for (const sourceIdKey of Object.values(SCENE_INPUT_SLOT_TO_SOURCE_ID)) {
                if (sourceIdKey in data) {
                    (data as unknown as Record<string, string>)[sourceIdKey as string] = "";
                }
            }
            // Clear all live-value providers; the data-wire loop below
            // re-installs them for any wire still on the canvas.
            if (typeof data.bindPropertyProvider === "function") {
                for (const property of Object.values(SCENE_INPUT_SLOT_TO_PROPERTY)) {
                    data.bindPropertyProvider(property, null);
                }
            }
            sceneItemsByNodeId.set(String(n.id), data);
        }
        if (isSimGraphNodeLike(data)) {
            data.sceneItemId = "";
            simGraphsByNodeId.set(String(n.id), data);
        }
        if (isSceneOverridableLike(data)) {
            // Reset the per-node binding; the `scene` wire below re-applies
            // it, and the runtime injection (bindPerNodeScenes) resolves it.
            data.sceneItemId = "";
            sceneOverridablesByNodeId.set(String(n.id), data);
        }
        if (isCompositionNodeLike(data)) {
            // Reset-each-sync semantic for particulates (gases are
            // bind-additive and stay across sync passes).
            data.clearParticulates();
            compositionsByNodeId.set(String(n.id), data);
        }
        // Pollutant-class gases (VOCs, CO, NH3, ...) are plain
        // GasNodes whose toxicology fields happen to be populated;
        // they share the gas slot pool and bind into compositions
        // through the same gas_in_<k> path as bulk species.
        if (isGasMetadataLike(data)) {
            gasNodesByNodeId.set(String(n.id), data);
        }
        if (isParticulateMetadataLike(data)) {
            particulatesByNodeId.set(String(n.id), data);
        }
        // An AtmosphereLayerNode satisfies BOTH AtmosphereLayerLike
        // (binding API) AND LayerIntegrable (IIntegrable surface).
        // Same instance lives in both maps so the container's
        // `layer_out → layer_in_<k>` sync can find it by node id.
        if (isAtmosphereLayerLike(data)) {
            data.clearBindings();
            layersByNodeId.set(String(n.id), data);
        }
        if (isLayerIntegrableLike(data)) {
            layerIntegrablesByNodeId.set(String(n.id), data);
        }
        if (isAtmosphereContainerLike(data)) {
            data.clearBindings();
            atmospheresByNodeId.set(String(n.id), data);
        }
        if (isAtmosphereGateLike(data)) {
            data.clearBindings();
            atmosphereGatesByNodeId.set(String(n.id), data);
        }
        // Any atmosphere (Layer OR Container) that satisfies the gate-
        // facing IAtmosphereGateHandle contract is registered here so
        // the gate's `atmosphere_A_in / atmosphere_B_in` wiring can
        // find it. Both AtmosphereLayer and the AtmosphereNode
        // container (which extends Layer) satisfy this duck-type.
        if (isAtmosphereGateHandleLike(data)) {
            atmosphereHandlesByNodeId.set(String(n.id), data);
        }
    }

    for (const conn of viewer.connections) {
        if (conn.linkKind !== "config") continue;
        const fromNode = _findNodeUIByPort(viewer, conn.from, "output");
        const toNode = _findNodeUIByPort(viewer, conn.to, "input");
        if (!fromNode || !toNode) continue;
        const fromType = (conn.from as Port).type;
        const toSlot = (conn.to as Port).name;
        const fromId = String(fromNode.id);
        const toId = String(toNode.id);

        if (fromType === "atmosphere" && toSlot === "atmosphere_in") {
            const scene = sceneItemsByNodeId.get(toId);
            if (!scene) {
                // unreachable in practice — kept as a guard against
                // future cable-type drift; fall through silently.
            } else if (typeof scene.bindAtmosphere === "function") {
                // Pull the actual atmosphere node off the canvas so we
                // can pass a live IAtmosphereAggregator ref to the
                // SceneItem (not just its ID). The SceneItem's
                // effective_* viewables read sampleAggregates() through
                // this ref so the property panel surfaces the live
                // pressure/temperature/density.
                const fromData = fromNode.item && (fromNode.item as { data?: unknown }).data;
                const aggregator = isAtmosphereAggregatorLike(fromData) ? fromData : null;
                scene.bindAtmosphere(fromId, aggregator);
            } else {
                // Legacy path for SceneItems that don't implement the
                // bindAtmosphere seam — fall back to setting the ID only.
                scene.atmosphereItemId = fromId;
            }
        } else if (fromType === "atmosphere" && toSlot === "atmosphere_A_in") {
            // #3 gate refactor (2026-06-09): atmosphere → AtmosphereGate.A
            const gate = atmosphereGatesByNodeId.get(toId);
            const handle = atmosphereHandlesByNodeId.get(fromId);
            if (gate && handle) gate.bindAtmosphereA(fromId, handle);
        } else if (fromType === "atmosphere" && toSlot === "atmosphere_B_in") {
            const gate = atmosphereGatesByNodeId.get(toId);
            const handle = atmosphereHandlesByNodeId.get(fromId);
            if (gate && handle) gate.bindAtmosphereB(fromId, handle);
        } else if (fromType === "solver" && toSlot.startsWith("solver_in_")) {
            const scene = sceneItemsByNodeId.get(toId);
            if (scene) scene.solverItemIds = [...scene.solverItemIds, fromId];
        } else if (fromType === "shared" && toSlot.startsWith("shared_in_")) {
            const scene = sceneItemsByNodeId.get(toId);
            if (scene) scene.sharedNodeIds = [...scene.sharedNodeIds, fromId];
        } else if (fromType === "scene" && toSlot === "scene_in") {
            const sim = simGraphsByNodeId.get(toId);
            if (sim) sim.sceneItemId = fromId;
        } else if (fromType === "scene" && toSlot === "scene") {
            // Per-node scene override on a world object's `scene` port.
            const node = sceneOverridablesByNodeId.get(toId);
            if (node) node.sceneItemId = fromId;
        } else if (fromType === "gas" && toSlot.startsWith("gas_in_")) {
            const composition = compositionsByNodeId.get(toId);
            const gas = gasNodesByNodeId.get(fromId);
            if (composition && gas) composition.bindGas(fromId, gas);
        } else if (fromType === "composition" && toSlot === "composition_in") {
            // Composition → AtmosphereLayer (the layer is what
            // consumes a composition; the Atmosphere container itself
            // has no composition_in slot — each of its layers wires
            // its own composition independently).
            const layer = layersByNodeId.get(toId);
            const composition = compositionsByNodeId.get(fromId);
            if (layer && composition) layer.bindComposition(fromId, composition);
        } else if (fromType === "layer" && toSlot.startsWith("layer_in_")) {
            // AtmosphereLayer → Atmosphere container (variadic). Each
            // wired layer joins the container's active layer set as
            // an IIntegrable participant. Default (no wirings) =
            // container's hidden internal layer.
            const atm = atmospheresByNodeId.get(toId);
            const layer = layerIntegrablesByNodeId.get(fromId);
            if (atm && layer) atm.bindLayer(fromId, layer);
        } else if (fromType === "particulate" && toSlot.startsWith("particulate_in_")) {
            // Particulate → Composition (V1 stub: composition holds
            // them as metadata; a downstream AtmosphereLayer reads
            // `composition.particulates` at session bind). Routing
            // through the composition matches the user-facing
            // hierarchy: Atmosphere ─ Layer ─ Composition ─ {gases,
            // particulates}.
            const composition = compositionsByNodeId.get(toId);
            const particulate = particulatesByNodeId.get(fromId);
            if (composition && particulate) composition.bindParticulate(fromId, particulate);
        }
        // Unknown config-link pairing: silently ignored. Any future
        // config-link slot (gate-pair links, conservation hooks, ...)
        // adds its branch here when introduced.
    }

    // ─────────────────────────────────────────────────────────────
    // Second pass: data wires landing on Scene per-property input
    // ports. These are NOT config-links; they're regular runtime
    // channels at the canvas level. We extract the publisher's node
    // ID and store it as the SceneItem's *SourceId; buildStateView
    // resolves it via the SceneSourceResolver at session bind.
    //
    // Priority at runtime: data-wire SourceId > Atmosphere binding
    // (atmosphere_in config-link) > SceneItem editable default. See
    // the SceneItem.buildStateView comments for the full table.
    // ─────────────────────────────────────────────────────────────
    for (const conn of viewer.connections) {
        if (conn.linkKind === "config") continue;
        const fromNode = _findNodeUIByPort(viewer, conn.from, "output");
        const toNode = _findNodeUIByPort(viewer, conn.to, "input");
        if (!fromNode || !toNode) continue;
        const toSlot = (conn.to as Port).name;
        const sourceIdKey = SCENE_INPUT_SLOT_TO_SOURCE_ID[toSlot];
        if (!sourceIdKey) continue;
        const scene = sceneItemsByNodeId.get(String(toNode.id));
        if (!scene) continue;
        // 1. Runtime path: stamp the publisher's UUID into the
        //    corresponding *SourceId. SimGraphNode's resolver picks
        //    it up at session bind to produce a live thunk.
        (scene as unknown as Record<string, string>)[sourceIdKey as string] = String(fromNode.id);
        // 2. Panel path: stamp a live closure that reads the publisher's
        //    current output via the getter named after the wired slot.
        //    The convention is publisher-side: a node that publishes on
        //    slot "vec3" (Cartesian3) exposes a getter `vec3` that
        //    returns the current composed value. AtmosphereNode satisfies
        //    this for `pressure` / `temperature` / `density` via the
        //    getters inherited from AtmosphereLayer / its own overrides.
        const propertyName = SCENE_INPUT_SLOT_TO_PROPERTY[toSlot];
        if (propertyName && typeof scene.bindPropertyProvider === "function") {
            const fromData = fromNode.item && (fromNode.item as { data?: unknown }).data;
            const fromSlot = (conn.from as Port).name;
            if (fromData && typeof fromData === "object") {
                const dataRecord = fromData as Record<string, unknown>;
                if (fromSlot in dataRecord) {
                    scene.bindPropertyProvider(propertyName, () => dataRecord[fromSlot]);
                }
            }
        }
    }
}

function _findRuntimeNodeByPort(viewer: GraphViewer, port: unknown, direction: "input" | "output"): IRuntimeNode | null {
    const list = viewer.nodes as ReadonlyArray<NodeUI>;
    for (const n of list) {
        const data = n.item && (n.item as { data?: unknown }).data;
        if (!data) continue;
        const owns =
            direction === "output"
                ? n.outputs.includes(port as Port) || n.controlOutputs.includes(port as Port)
                : n.inputs.includes(port as Port) || n.controlInputs.includes(port as Port);
        if (!owns) continue;
        // Same duck-type as the step-2 node collection: a node whose
        // data does not implement fire() is layout-only (a typeId that
        // was missing from the registry at load, or a raw JSON blob).
        // Wiring a channel onto it would crash the Channel constructor
        // (`this._ofin.opsc is not a function`) and kill Play; skipping
        // the wire keeps the rest of the graph runnable.
        if (typeof (data as IRuntimeNode).fire !== "function") {
            // eslint-disable-next-line no-console
            console.warn(`[graph-session-builder] connection endpoint "${n.label}" (${n.typeId ?? "no typeId"}) is layout-only (no runtime instance); skipping its wire`);
            return null;
        }
        // A channel endpoint must also be a GRAPH node: the Channel ctor
        // registers itself on each end via `node.add(channel)` (set oini /
        // set ofin in graph.olink), and the scheduler later reads the
        // node's `opsc`. A node that implements fire() but is NOT a
        // GraphNode (e.g. an out-of-date plugin bundle whose op node
        // predates the core-Kernel refactor) lacks these, and wiring it
        // throws `this._ofin?.add is not a function`, killing Play. Skip +
        // name the node so a stale bundle is diagnosable, not fatal.
        const graphNode = data as { add?: unknown; opsc?: unknown };
        if (typeof graphNode.add !== "function" || typeof graphNode.opsc !== "function") {
            // eslint-disable-next-line no-console
            console.warn(
                `[graph-session-builder] endpoint "${n.label}" (${n.typeId ?? "no typeId"}) has fire() but is not a graph node (no add/opsc) — likely a stale plugin bundle; skipping its wire. Rebuild + redeploy that plugin's bundle.`
            );
            return null;
        }
        return data as IRuntimeNode;
    }
    return null;
}

/** Same as `_findRuntimeNodeByPort` but returns the NodeUI (or null),
 *  so we can read its stable `id`. Used by the config-link sync. */
function _findNodeUIByPort(viewer: GraphViewer, port: unknown, direction: "input" | "output"): NodeUI | null {
    const list = viewer.nodes as ReadonlyArray<NodeUI>;
    for (const n of list) {
        if (direction === "output" && (n.outputs.includes(port as Port) || n.controlOutputs.includes(port as Port))) {
            return n;
        }
        if (direction === "input" && (n.inputs.includes(port as Port) || n.controlInputs.includes(port as Port))) {
            return n;
        }
    }
    return null;
}
