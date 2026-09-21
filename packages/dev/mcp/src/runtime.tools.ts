/**
 * The runtime surface's tools, as plain data: the catalogue (shared), the
 * documents, the sessions. Kept apart from the behavior so a test can read
 * them without loading the MCP server library.
 */
import { catalogueTools } from "./catalogue.js";

const SPEC_SCHEMA = {
    type: "object",
    description: "A document spec: node ids with their type ids and parameters, and the wires between ports; positions are laid out when absent",
    properties: {
        nodes: { type: "array", items: { type: "object", properties: { id: { type: "string" }, typeId: { type: "string" }, params: { type: "object" }, label: { type: "string" }, x: { type: "number" }, y: { type: "number" } }, required: ["id", "typeId"] } },
        connections: { type: "array", items: { type: "object", properties: { from: { description: "[nodeId, outputPort] or { node, port }" }, to: { description: "[nodeId, inputPort] or { node, port }" } }, required: ["from", "to"] } },
    },
    required: ["nodes", "connections"],
} as const;

const DOCUMENT_PROPERTIES = {
    name: { type: "string", description: "A document of the store (built earlier with a name)" },
    document: { description: "The JSON text (or object) of a .spikypanda file, when it is not in the store" },
} as const;

export interface RuntimeToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export function runtimeTools(): RuntimeToolDefinition[] {
    return [

            ...catalogueTools(),
            {
                name: "document_validate",
                description: "Check a document spec against the catalogue without building it: unknown type ids, unknown ports, two wires into one input, two connected ports whose declared units disagree. Empty problems means document_build will accept it.",
                inputSchema: { type: "object", properties: { spec: SPEC_SCHEMA }, required: ["spec"] },
            },
            {
                name: "document_build",
                description: "Build a .spikypanda document from a spec through the real registry (every node created, parameters set through its setters, state serialized; nothing hand-written). With a name, the document is kept in the store for document_instantiate and session_run; without one, its JSON text is returned. Returns its sha256.",
                inputSchema: { type: "object", properties: { spec: SPEC_SCHEMA, name: { type: "string", description: "Store the document under this name" } }, required: ["spec"] },
            },
            {
                name: "document_instantiate",
                description: "Instantiate a document in a fresh session without running it: which nodes the registry could create, which type ids it could not, which connections were skipped, whether a scene bound the session. The check a builder runs before spending a session.",
                inputSchema: { type: "object", properties: { ...DOCUMENT_PROPERTIES } },
            },
            {
                name: "session_run",
                description: "Run a document for a duration and read probes at every tick: the tick loop of the editor without the screen. Returns the series (thinned to the sample limit), a summary per probe (first, last, min, max), the tick count and the wall time, with the document's sha256. Settings are applied before the run.",
                inputSchema: {
                    type: "object",
                    properties: {
                        ...DOCUMENT_PROPERTIES,
                        dt: { type: "number", description: "session seconds per tick" },
                        duration: { type: "number", description: "session seconds to run" },
                        probes: { type: "array", description: "numeric properties to read after each tick", items: { type: "object", properties: { node: { type: "string" }, property: { type: "string" } }, required: ["node", "property"] } },
                        sampleEvery: { type: "number", description: "keep one sample every N ticks (1 by default; raised automatically to stay under the sample limit)" },
                        settings: { type: "array", description: "values set before the run: { node, property, value }", items: { type: "object", properties: { node: { type: "string" }, property: { type: "string" }, value: {} }, required: ["node", "property"] } },
                    },
                    required: ["dt", "duration", "probes"],
                },
            },
    ];
}
