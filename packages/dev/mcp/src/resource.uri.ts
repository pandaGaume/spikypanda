/**
 * Resource URIs exposed by the MCP controller.
 *
 * These identify the read-only snapshots an agent can subscribe to. They are
 * the contract between the three layers that sit above them: STATE describes
 * what a URI contains, the ADAPTER produces it and signals when it changed,
 * and the BEHAVIOR declares it to the client.
 *
 * The scheme is deliberate. `spk://` is not a network location: the graph runs
 * in the same browser VM as the view, and nothing here is fetched over the
 * wire. It is an identifier namespace, which is also what lets these URIs be
 * reused as the `href` of a Web of Things form without inventing a second
 * naming scheme for the same objects.
 *
 * Every URI here is mutable. A registry grows when a plugin is loaded, a graph
 * changes on every edit, and the state advances on every simulation step. That
 * is why each one has to be paired with a change notification rather than
 * being polled.
 */

/** Scheme shared by every resource this controller exposes. */
export const SPK_SCHEME = "spk:";

/** Plugins currently activated, and how many node types each contributes. */
export const URI_PLUGINS = "spk://plugins";

/**
 * The node catalogue: available types with their ports, properties and
 * resolved documentation. Invalidated whenever a plugin is loaded or
 * unloaded, which is what makes the catalogue live rather than a startup
 * inventory.
 */
export const URI_REGISTRY = "spk://registry";

/** Structure of the current graph: nodes, channels, properties. */
export const URI_GRAPH = "spk://graph";

/** Current port values and simulation time. Changes on every step. */
export const URI_GRAPH_STATE = "spk://graph/state";

/** URI of one node instance, used as the identity of its Thing Description. */
export function uriForNode(nodeId: string): string {
    return `spk://graph/node/${encodeURIComponent(nodeId)}`;
}

/** URI of one armed capture, holding a window over one or more ports. */
export function uriForCapture(captureId: string): string {
    return `spk://capture/${encodeURIComponent(captureId)}`;
}

/** True when `uri` belongs to this controller's namespace. */
export function isSpkUri(uri: string): boolean {
    return uri.startsWith("spk://");
}
