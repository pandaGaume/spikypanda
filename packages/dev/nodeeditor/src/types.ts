export type PortDirection = "input" | "output";

/**
 * Port type catalog.
 *
 * Data types (carry a value through a runtime cable on every fire):
 *   float, vec2, vec3, vec4, tensor, any, exec, matrix44, boolean,
 *   trigger, array.
 *
 * Config-link types (P4/P5 architecture — carry a REFERENCE resolved
 * at session bind, never a runtime payload during fire). Rendered
 * with a dashed cable style to make the distinction visually
 * unmistakable in the canvas:
 *
 *   scene       SceneItem ↔ Sim.Graph binding (the canonical "this
 *               sub-graph belongs to that Scene" link).
 *   solver      SolverNode ↔ SceneItem (the Scene's variadic
 *               `solver_in_<k>` collection; each SolverNode
 *               publishes `solver_out` here).
 *   atmosphere  AtmosphereStateNode ↔ SceneItem (single-slot typed
 *               wiring; the gate code consumes the resolved
 *               atmosphere via this slot, not a runtime cable).
 *   shared      Generic shared-node ↔ SceneItem (the variadic
 *               `shared_in_<k>` pool that generates proxy nodes
 *               inside every Sim.Graph that references the Scene).
 *   gas         GasNode ↔ CompositionNode (P9.1). One gas-species
 *               descriptor feeds a composition's variadic `gas_in_<k>`
 *               slot pool.
 *   composition CompositionNode ↔ AtmosphereStateNode (P9.3). The bulk
 *               mixture spec: drives the atmosphere's species schema
 *               and seeds the initial mass vector at reset.
 *   layer       AtmosphereLayerNode ↔ AtmosphereNode (container).
 *               Variadic `layer_in_<k>` pool on the container; each
 *               layer is its own IIntegrable state-carrier with a
 *               composition + particulates. The container is a
 *               composite IIntegrable that delegates to its bound
 *               layers (or a hidden internal default when none are
 *               wired) and publishes volume-weighted aggregates.
 *   particulate ParticulateNode ↔ AtmosphereLayerNode (P9.5, stub).
 *               Variadic `particulate_in_<k>` pool. V1 only declares
 *               the slot so the topology survives V2: no integration
 *               logic is wired up yet.
 *
 * Compatibility rule below routes config-link pairs only against
 * matching config types; you cannot wire a `scene` source into a
 * `float` consumer or vice versa (the editor silently refuses such
 * drops).
 */
export type PortType =
    | "float"
    | "vec2"
    | "vec3"
    | "vec4"
    | "tensor"
    | "any"
    | "exec"
    | "matrix44"
    | "boolean"
    | "trigger"
    | "array"
    | "scene"
    | "solver"
    | "atmosphere"
    | "shared"
    | "gas"
    | "composition"
    | "particulate"
    | "layer";

/**
 * The four config-link types — referenced from `Connection` to decide
 * whether a cable should render dashed. Centralised here so the
 * runtime layer (core/sim anchors) and the rendering layer share a
 * single source of truth.
 */
export const CONFIG_LINK_TYPES: ReadonlySet<PortType> = new Set<PortType>([
    "scene",
    "solver",
    "atmosphere",
    "shared",
    "gas",
    "composition",
    "particulate",
    "layer",
]);

/** True when the given port type belongs to the config-link family
 *  (scene / solver / atmosphere / shared). Used by `Connection` to
 *  pick the dashed style. */
export function isConfigLinkType(t: PortType): boolean {
    return CONFIG_LINK_TYPES.has(t);
}

/**
 * True iff a wire from a producer port of type `from` to a consumer port
 * of type `to` is type-safe. The rule is intentionally minimal:
 *   - identical types match
 *   - "any" acts as a wildcard on either side EXCEPT for config-link
 *     types: a `scene` / `solver` / `atmosphere` / `shared` port may
 *     only connect to another port of the SAME config-link type.
 *     Config-links are reference handoffs resolved at session bind;
 *     letting them silently match `any` would let the editor accept
 *     wirings the runtime can't make sense of.
 * Everything else is rejected, including looking-alike pairs like
 * trigger vs exec or boolean vs trigger. Editors call this from their
 * connect() path to silently refuse drops that would produce a runtime
 * type error downstream.
 */
export function arePortTypesCompatible(from: PortType, to: PortType): boolean {
    if (from === to) return true;
    if (isConfigLinkType(from) || isConfigLinkType(to)) return false;
    if (from === "any" || to === "any") return true;
    return false;
}

export const PORT_COLORS: Record<PortType, string> = {
    float: "#8cf",
    vec2: "#8f8",
    vec3: "#ff8",
    vec4: "#f8f",
    tensor: "#f88",
    any: "#ccc",
    matrix44: "#c8f",
    // Execution / event ports (white diamond, like UE Blueprint exec pins).
    exec: "#e8e8e8",
    // Control plane: boolean (state) and trigger (one-shot edge).
    boolean: "#cf6",
    trigger: "#fc6",
    // Collection ports: carry an opaque array. Pair with `any` for
    // element-level ports on array nodes (item, find result, etc.).
    array: "#a8d",
    // Config-link family — warm hues to read as "metadata" against the
    // cool data palette. Cables render dashed; ports show this colour
    // on the dot for at-a-glance identification.
    scene: "#f6b94d", // amber: the environment carrier
    solver: "#c98be0", // lavender: the integrator config
    atmosphere: "#7ecfb5", // teal: the species inventory
    shared: "#d96b9c", // rose: generic shared resource
    gas: "#b88c4d", // mustard: single-species descriptor (P9.1; pollutant attrs live on the gas itself)
    composition: "#e08a6a", // peach: gas mixture aggregator (P9.2)
    particulate: "#6a6a8c", // slate: particulate matter, stub for V2 (P9.5)
    layer: "#5cb8b0", // aqua: atmosphere layer (state carrier in a multi-layer atmosphere container)
};

export interface PortDef {
    name: string;
    type: PortType;
    direction: PortDirection;
    /**
     * Anchor index for split-view nodes. Routes this port's DOM
     * rendering to `NodeUI.anchors[anchor]` instead of the single
     * default widget. Used by Feedback Channel and similar "logical
     * one node, visually multiple widgets" affordances: input goes on
     * the half near its source, output goes on the half near its
     * consumer, with the two halves positioned independently. Default
     * undefined → routes to anchor 0 (the only widget for ordinary
     * nodes). Out-of-range values silently clamp to 0 — the renderer
     * never errors over a stale descriptor.
     */
    anchor?: number;
}

export interface VariadicPortDescriptor {
    /** Common prefix shared by every variadic port name (e.g. "then_"). */
    prefix: string;
    /** Type assigned to each variadic port. */
    type: PortType;
}

export interface NodeDef {
    label: string;
    /**
     * Registry type identifier for this node (e.g. `Physics.Scene:earth`).
     * When set, `save()` writes it into the serialized form so that
     * `load(json, registry)` can instantiate a fresh runtime IRuntimeNode
     * via `registry.create(typeId)` and restore the node's state through
     * `node.item.deserialize(savedData)`. Without a typeId, load falls
     * back to a layout-only restore (ports + positions, no runtime
     * binding) — useful when the user picked a generic node off-palette
     * or built one programmatically.
     */
    typeId?: string;
    inputs: Omit<PortDef, "direction">[];
    outputs: Omit<PortDef, "direction">[];
    /** Control-plane input ports (e.g. _enable, _start, _stop). Rendered
     *  distinctly from data inputs (top row, control colour). */
    controlInputs?: Omit<PortDef, "direction">[];
    /** Control-plane output ports (_enabled, _started, _stopped). */
    controlOutputs?: Omit<PortDef, "direction">[];
    /** When set, the editor grows / shrinks the matching set of
     *  input ports so exactly one trailing unconnected port stays
     *  available at all times. Indices are appended after the prefix
     *  ("then_0", "then_1", ...). Pass an ARRAY of descriptors to
     *  manage multiple independent variadic groups on the same side
     *  (e.g. Stem's parallel `f_*` and `A_*` groups). */
    variadicInput?: VariadicPortDescriptor | ReadonlyArray<VariadicPortDescriptor>;
    /** Same as `variadicInput` but for the output side (e.g.
     *  Sequence's `then_*`). */
    variadicOutput?: VariadicPortDescriptor | ReadonlyArray<VariadicPortDescriptor>;
    /** Interop standards the node complies with (e.g. ["onnx"]). The
     *  editor renders one badge per id in the node header. The values
     *  are resolved via the host's StandardsRegistry for display. */
    standards?: ReadonlyArray<string>;
    /**
     * Per-instance literal color override for the node header background.
     * Lowest precedence: a skin's --ne-color-category-<category> token
     * wins when category is set and the token resolves to a value.
     */
    color?: string;
    /**
     * Free-form category string used by the active skin to pick a
     * header palette via the --ne-color-category-<category> token
     * (lowercased, non-alphanumeric chars replaced with "-"). Lets a
     * skin enforce a coherent palette across all nodes of the same
     * kind without per-op overrides.
     */
    category?: string;
    /**
     * Number of independent anchor widgets the node should render.
     * Default 1 (the ordinary single-widget node). Values >= 2 create
     * a split-view node: one logical entity drawn as N draggable
     * widgets, each with its own position, sharing model + selection +
     * properties. Ports route to widgets via PortDef.anchor; selection
     * and hover styles apply to every widget; deletion removes them all
     * together. Used by Feedback Channel (anchorCount=2: input-half
     * near source, output-half near consumer) and any future "Ref" /
     * "Reroute" affordance.
     */
    anchorCount?: number;
    data?: unknown;
}

export interface Vec2 {
    x: number;
    y: number;
}

export interface SerializedPort {
    name: string;
    type: PortType;
    direction: PortDirection;
}

export interface SerializedNode {
    id: string;
    label: string;
    /** Registry type id (e.g. `Physics.Scene:earth`) for runtime
     *  rebinding on load. Optional for back-compat with v2 saves and
     *  programmatically-built nodes that never carried a type. */
    typeId?: string;
    x: number;
    y: number;
    inputs: SerializedPort[];
    outputs: SerializedPort[];
    color?: string;
}

export interface SerializedConnection {
    fromNodeId: string;
    fromPortIndex: number;
    toNodeId: string;
    toPortIndex: number;
}

export interface SerializedGraph {
    nodes: SerializedNode[];
    connections: SerializedConnection[];
    /**
     * Dashboard layouts attached to this graph. Plural-keyed from V1 to
     * keep the on-disk format stable when multi-dashboard (tabs) lands
     * in V2 — V1 always emits a single `{ id: "main", … }` entry. The
     * concrete shape (id, name, tiles[]) lives in `dashboard.ts` as
     * `ISerializedDashboard` to avoid a circular dependency between
     * types.ts and dashboard.ts.
     */
    dashboards?: unknown[];
}

export interface ExportProfile {
    background?: string;
    nodeBody: string;
    nodeBorder: string;
    headerText: string;
    portLabel: string;
    portStroke: string;
    connectionStroke: string;
}

export const EXPORT_PROFILES: Record<string, ExportProfile> = {
    dark: {
        background: "#111",
        nodeBody: "#16213e",
        nodeBorder: "#0f3460",
        headerText: "#fff",
        portLabel: "#888",
        portStroke: "rgba(255,255,255,0.3)",
        connectionStroke: "#fff",
    },
    light: {
        background: "#fff",
        nodeBody: "#f4f5f7",
        nodeBorder: "#d0d5dd",
        headerText: "#fff",
        portLabel: "#555",
        portStroke: "rgba(0,0,0,0.2)",
        connectionStroke: "#333",
    },
    transparent_dark: {
        nodeBody: "#16213e",
        nodeBorder: "#0f3460",
        headerText: "#fff",
        portLabel: "#888",
        portStroke: "rgba(255,255,255,0.3)",
        connectionStroke: "#fff",
    },
    transparent_light: {
        nodeBody: "#f4f5f7",
        nodeBorder: "#d0d5dd",
        headerText: "#fff",
        portLabel: "#555",
        portStroke: "rgba(0,0,0,0.2)",
        connectionStroke: "#333",
    },
};
