export type PortDirection = "input" | "output";

export type PortType = "float" | "vec2" | "vec3" | "vec4" | "tensor" | "any" | "exec" | "matrix44" | "boolean" | "trigger" | "array";

/**
 * True iff a wire from a producer port of type `from` to a consumer port
 * of type `to` is type-safe. The rule is intentionally minimal:
 *   - identical types match
 *   - "any" acts as a wildcard on either side (collection element ports
 *     in the logic plugin rely on this)
 * Everything else is rejected, including looking-alike pairs like
 * trigger vs exec or boolean vs trigger. Editors call this from their
 * connect() path to silently refuse drops that would produce a runtime
 * type error downstream.
 */
export function arePortTypesCompatible(from: PortType, to: PortType): boolean {
    if (from === to) return true;
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
};

export interface PortDef {
    name: string;
    type: PortType;
    direction: PortDirection;
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
