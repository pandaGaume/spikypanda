/**
 * @spikypanda/mcp
 *
 * MCP controller for the SpikyPanda graph.
 *
 * The architecture is model, view, controller, where **the model is the
 * graph**. All three run inside the browser VM: the studio hosts the live
 * session because the runtime has to be local for the view and the time
 * series to keep up. The separation is logical, not a process boundary.
 *
 *   Claude Code --stdio--> mcp-broker (Node) <--WebSocket-- browser VM
 *                          relay, holds no state              |- Model       Session + graph
 *                                                             |- Controller  this package
 *                                                             `- View        node editor
 *
 * The broker is a relay. It knows nothing about graphs and can be replaced
 * without touching a behavior.
 *
 * Two rules this package does not bend:
 *
 * 1. **All state lives in the graph.** A tool that carried its own state would
 *    be invisible to the view and to any other client, which is why there is
 *    no verb like `toggle_gravity`: gravity is a property of a scene node and
 *    is set through the generic property API.
 * 2. **This is a facade, never a second implementation.** Measurement calls
 *    the repository's own code; composition goes through `NodeRegistry.create`
 *    by type id rather than hand-built JSON.
 */

export {
    SPK_SCHEME,
    URI_PLUGINS,
    URI_REGISTRY,
    URI_GRAPH,
    URI_GRAPH_STATE,
    uriForNode,
    uriForCapture,
    isSpkUri,
} from "./resource.uri.js";

export { GraphController, ok, fail, type ControllerResult, type ResourceContent } from "./graph.controller.js";
export { GraphAdapter } from "./graph.adapter.js";
export { GraphBehavior } from "./graph.behavior.js";
export type { PortState, NodeTypeState, RegistryState, PluginsState, GraphState, SimulationState, NodeState, NodePropertyState } from "./state.js";

export { publishToBroker, type PublishOptions, type Publication } from "./provider.js";
