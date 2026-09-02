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

/**
 * One settable or observable property of a node instance.
 *
 * Shaped for what a node *declares*, not for what reflection can guess. It
 * deliberately does not reuse the editor's `PropertyEntry`: that type has no
 * room for a unit, and a unit is the whole point of the declaration.
 */
export interface NodePropertyState {
    readonly key: string;
    readonly value: unknown;
    /** False for `@viewable`: computed or derived, writes are refused. */
    readonly editable: boolean;
    /** JSON-ish type, when the declared editor kind maps onto one. */
    readonly type: "string" | "number" | "boolean" | "select" | null;
    /**
     * Editor kind exactly as declared, e.g. "vector3", "matrix4", "slider".
     * Richer than `type`, which collapses everything structured to null.
     */
    readonly kind: string | null;
    /**
     * Canonical UCUM code of the declared unit, e.g. "Hz", "N.m", "Cel".
     *
     * Resolved through the unit system rather than copied from the
     * declaration, so what a client receives is the machine identity and not
     * a display symbol. Null when the property carries no unit, which is the
     * ordinary case for a string or a boolean.
     */
    readonly unit: string | null;
    /**
     * What the value measures, e.g. "ElectricCurrent" for a unit of "A".
     *
     * The half of the identity UCUM cannot express. It is what tells apparent
     * power from reactive power, both of which are "V.A", and it is the term
     * a semantic exposition maps onto a QUDT quantity kind.
     */
    readonly quantityKind: string | null;
    /** Why a write is refused, when it is. Null when the property is settable. */
    readonly hint: string | null;
}

/** `spk://graph/node/<id>`: one node instance, as the property panel sees it. */
export interface NodeState {
    readonly id: string;
    readonly uri: string;
    readonly typeId: string | null;
    readonly displayName: string;
    /**
     * Where `properties` came from, and therefore how much to trust them.
     *
     * `declared` means the node used `@editable` / `@viewable`, so every entry
     * is one the node chose to expose, with the editability and unit it stated.
     * That is the case for the overwhelming majority: 596 properties across the
     * plugins carry a decorator.
     *
     * `reflected` is the fallback for a node that declares nothing. Its public
     * fields are enumerated instead, which surfaces internal machinery
     * (`_onsc`, `inputPorts`, link observers) alongside real settings and can
     * infer nothing beyond the JavaScript type of a value.
     */
    readonly propertySource: "declared" | "reflected";
    readonly properties: ReadonlyArray<NodePropertyState>;
    readonly inputs: ReadonlyArray<string>;
    readonly outputs: ReadonlyArray<string>;
}
