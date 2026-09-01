/**
 * State: read-only snapshots of what the resources contain.
 *
 * These interfaces are the contract between the adapter that produces a
 * resource and the behavior that declares it. Without them both sides are free
 * to drift: a schema can promise a field the adapter stopped emitting, and
 * nothing fails until a client reads it.
 *
 * Two rules shape what is and is not declared here.
 *
 * **Nothing is re-invented.** The graph already has a serialized form,
 * `SerializedGraph`, produced by `GraphViewer.serialize()`. This layer reuses
 * it rather than describing the graph a second time; a parallel shape would
 * diverge from the editor's own the first time a field is added.
 *
 * **Nothing is invented at all.** Where the runtime does not carry a fact, it
 * is absent rather than guessed. The registry records node types but not the
 * plugin that contributed them, so `PluginsState` reports categories and says
 * so, instead of inventing a provenance.
 */
import type { SerializedGraph } from "spikypanda-nodeeditor";
import type { PropertyEntry } from "spikypanda-nodeeditor/inspectable.js";

/** A port as the registry declares it, flattened for transport. */
export interface PortState {
    /** Ports are addressed by slot. The editor's visual name is not an id. */
    readonly slot: string | number;
    readonly optional: boolean;
    readonly type: string | null;
    /** Wiring-time physical contract, when the node declares one. */
    readonly unit: unknown | null;
    /** "stream" for discrete events, "signal" for continuous zero-order hold. */
    readonly kind: "stream" | "signal";
    readonly multiplicity: "single" | "variadic";
}

/** One entry of the node catalogue. */
export interface NodeTypeState {
    readonly type: string;
    readonly label: string;
    readonly category: string | null;
    readonly inputPorts: ReadonlyArray<PortState>;
    readonly outputPorts: ReadonlyArray<PortState>;
    readonly standards: ReadonlyArray<string | { readonly id: string; readonly version?: string }> | null;
    /** Documentation path resolved for the requested locales, null when none. */
    readonly doc: string | null;
    /** Locales this node's documentation is available in. */
    readonly docLocales: ReadonlyArray<string>;
}

/** `spk://registry`: the catalogue, which grows when a plugin is loaded. */
export interface RegistryState {
    readonly count: number;
    readonly types: ReadonlyArray<NodeTypeState>;
    /** Set when no registry is bound; `types` is then empty by construction. */
    readonly note?: string;
}

/** `spk://plugins`: what the catalogue is made of. */
export interface PluginsState {
    readonly registryBound: boolean;
    readonly total: number;
    readonly categories: ReadonlyArray<{ readonly category: string; readonly count: number }>;
    /** States plainly that category is a proxy for provenance, not provenance. */
    readonly note: string;
}

/** `spk://graph`: the editor's own serialized form, reused verbatim. */
export type GraphState = SerializedGraph;

/** `spk://graph/state`: where the simulation currently stands. */
export interface SimulationState {
    /** Runner state as the runner reports it: idle, running, paused. */
    readonly runner: string;
    /** False while idle. Stepping tools refuse rather than starting a session. */
    readonly hasSession: boolean;
    readonly t: number;
    readonly tickIndex: number | null;
    readonly simRate: number | null;
}

/** `spk://graph/node/<id>`: one node instance, as the property panel sees it. */
export interface NodeState {
    readonly id: string;
    readonly uri: string;
    readonly typeId: string | null;
    readonly displayName: string;
    /**
     * Whether the node implements the `Inspectable` contract.
     *
     * Today no node in the repository does: they are plain `RuntimeNode`
     * subclasses with public fields, and `UIItemBase` reflects over them. So
     * this is false everywhere, and it does **not** mean writes are refused.
     * Reflected properties are still written, by direct field assignment.
     *
     * What changes with the source is the quality of the metadata, which is
     * why `propertySource` is reported alongside: declared properties can
     * carry a type, an editability and a hint the node chose, while reflected
     * ones only carry what can be inferred from the value's JavaScript type.
     */
    readonly inspectable: boolean;
    /** Where `properties` came from, and therefore how much to trust them. */
    readonly propertySource: "declared" | "reflected";
    readonly properties: ReadonlyArray<PropertyEntry>;
    readonly inputs: ReadonlyArray<string>;
    readonly outputs: ReadonlyArray<string>;
}
