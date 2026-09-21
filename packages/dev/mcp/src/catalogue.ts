/**
 * The node catalogue as MCP clients read it, from a `NodeRegistry` alone: no
 * viewer, no page. The studio's controller and the runtime controller both
 * answer `registry_list_nodes`, `registry_describe_node` and
 * `registry_search` through these functions, so the same catalogue is served
 * whether the host is a browser tab or a Node process (the factory's
 * container, a twin behind a broker).
 */
import { listDocLocales, resolveDocPath, searchSignatures, type INodeMeta, type IPortDescriptor, type NodeRegistry } from "spikypanda-core";
import type { NodeTypeState, PortState, RegistryState } from "./state.js";

export function describePort(port: IPortDescriptor): PortState {
    return {
        slot: port.slot,
        optional: port.optional,
        type: port.type ?? null,
        unit: port.unit ?? null,
        kind: port.kind ?? "stream",
        multiplicity: port.multiplicity ?? "single",
    };
}

/** Every meta of the registry, in registration order; a type without meta is a registry inconsistency and is skipped. */
export function registryMetas(registry: NodeRegistry): INodeMeta[] {
    const metas: INodeMeta[] = [];
    for (const type of registry.types()) {
        const meta = registry.meta(type);
        if (meta) metas.push(meta);
    }
    return metas;
}

/**
 * The catalogue the activated plugins have registered. Documentation is
 * resolved rather than left as a raw path, because the point of exposing the
 * catalogue is that an agent can read what a node claims to do before wiring
 * it, not that it can discover a filename.
 */
export function describeRegistry(registry: NodeRegistry, locales: ReadonlyArray<string> = ["en"]): RegistryState {
    const types: NodeTypeState[] = registryMetas(registry).map((meta) => ({
        type: meta.type,
        label: meta.label,
        category: meta.category ?? null,
        inputPorts: meta.inputPorts.map(describePort),
        outputPorts: meta.outputPorts.map(describePort),
        standards: meta.standards ?? null,
        signature: meta.signature ?? null,
        doc: resolveDocPath(meta.docPath, locales),
        docLocales: listDocLocales(meta.docPath),
    }));
    return { count: types.length, types };
}

/** The planner's question: node types by the outputs a plan needs, the capabilities, the words of the purpose (`searchSignatures` of the core). */
export function searchRegistry(registry: NodeRegistry, args: Record<string, unknown>): { signed: number; total: number; matches: ReturnType<typeof searchSignatures> } {
    const metas = registryMetas(registry);
    const outputs = Array.isArray(args.requiredOutputs)
        ? (args.requiredOutputs as Array<{ quantity?: unknown; unit?: unknown }>).filter((o) => typeof o?.quantity === "string").map((o) => ({ quantity: String(o.quantity), ...(typeof o.unit === "string" ? { unit: o.unit } : {}) }))
        : [];
    const capabilities = Array.isArray(args.capabilities) ? (args.capabilities as unknown[]).map(String) : [];
    const matches = searchSignatures(metas, { requiredOutputs: outputs, capabilities, text: typeof args.text === "string" ? args.text : undefined, limit: typeof args.limit === "number" ? args.limit : undefined });
    return { signed: metas.filter((m) => m.signature).length, total: metas.length, matches };
}

/** The locales a tool argument asks for, English last. */
export function localesOf(arg: unknown): string[] {
    const asked = typeof arg === "string" && arg.trim() ? [arg.trim()] : [];
    return asked.includes("en") ? asked : [...asked, "en"];
}

/** The three catalogue tools, the same schemas on every host. */
export function catalogueTools(): Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> {
    return [
        {
            name: "registry_list_nodes",
            description: "List every node type the activated plugins registered, with ports, declared interop standards, signature and resolved documentation. This is the catalogue to consult before wiring anything.",
            inputSchema: {
                type: "object",
                properties: { locale: { type: "string", description: 'Preferred documentation locale, e.g. "fr". Falls back to English.' } },
            },
        },
        {
            name: "registry_search",
            description: "Search the catalogue by what a plan must produce: node types whose signature outputs the required quantities (and units), carries the capabilities, or whose purpose mentions the words; best first, with the signature of each. The question a planner asks before choosing nodes.",
            inputSchema: {
                type: "object",
                properties: {
                    requiredOutputs: { type: "array", description: '[{ quantity, unit? }] the outputs the plan needs, e.g. { quantity: "Concentration", unit: "ppm" }', items: { type: "object", properties: { quantity: { type: "string" }, unit: { type: "string" } }, required: ["quantity"] } },
                    capabilities: { type: "array", description: "tags the type should carry, e.g. exchange, prediction", items: { type: "string" } },
                    text: { type: "string", description: "free words looked for in the purpose" },
                    limit: { type: "number", description: "at most this many, default 10" },
                },
            },
        },
        {
            name: "registry_describe_node",
            description: "Describe one node type: its ports with their declared units and stream/signal kind, its signature, and its documentation. Use before adding a node to check what it expects.",
            inputSchema: {
                type: "object",
                properties: {
                    type: { type: "string", description: "Node type id as listed by `registry_list_nodes`." },
                    locale: { type: "string", description: "Preferred documentation locale." },
                },
                required: ["type"],
            },
        },
    ];
}
