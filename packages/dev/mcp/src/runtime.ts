/**
 * The runtime's MCP surface alone: what a Node process imports to publish
 * the catalogue, documents and sessions on a broker, with nothing of the
 * node editor loaded (`@spiky-panda/mcp/runtime`).
 */
export { RuntimeBehavior, RuntimeAdapter } from "./runtime.behavior.js";
export { RuntimeController, MemoryDocumentStore, URI_DOCUMENTS, type IDocumentStore, type RuntimeControllerOptions } from "./runtime.controller.js";
export { runtimeTools, type RuntimeToolDefinition } from "./runtime.tools.js";
export { EventLog, type RuntimeEvent, type EventsState } from "./events.js";
export { URI_EVENTS, URI_EVENTS_TEMPLATE, parseEventsUri } from "./resource.uri.js";
export { describeRegistry, searchRegistry, catalogueTools, registryMetas } from "./catalogue.js";
export { ok, fail, type ControllerResult } from "./result.js";
