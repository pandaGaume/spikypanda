import { StartNode, StopNode, CONTROL_PORT_STARTED, CONTROL_PORT_STOPPED } from "spikypanda-core";
import type { INodeRegistry } from "spikypanda-core";

/**
 * Registry type ids for the player lifecycle nodes (Begin-Play /
 * End-Play trigger sources armed by Session.start() / stop()).
 *
 * Lifecycle nodes used to be created by hosts WITHOUT a typeId, which
 * made them un-rebindable on load: a saved graph came back with plain
 * JSON blobs in their place, Session.start() found no StartNode to
 * arm, and every `Start -> _start` wire silently died (the session
 * builder now skips layout-only endpoints instead of crashing, which
 * surfaced the loss as "the node never fires"). Registering them like
 * any other node closes the loop: save() records the typeId, load()
 * rebuilds real instances.
 */
export const LIFECYCLE_START_TYPE_ID = "Core.Lifecycle:start";
export const LIFECYCLE_STOP_TYPE_ID = "Core.Lifecycle:stop";

/** Register the lifecycle nodes into a host's NodeRegistry. Idempotent
 *  enough for repeated activation (re-registering overwrites). */
export function registerLifecycleNodes(registry: INodeRegistry): void {
    registry.register(LIFECYCLE_START_TYPE_ID, () => new StartNode(), {
        label: "Start",
        // No IPluginContext here (lifecycle nodes are editor-owned, not
        // plugin-owned), so no ctx.assetUrl: the literal mirrors the
        // "../bundle/docs/..." shape assetUrl resolves for every plugin.
        docPath: "../bundle/docs/core/lifecycle/start.md",
        category: "Core.Lifecycle",
        inputPorts: [],
        outputPorts: [],
        controlInputPorts: [],
        controlOutputPorts: [{ slot: CONTROL_PORT_STARTED, optional: true, type: "trigger" }],
    });
    registry.register(LIFECYCLE_STOP_TYPE_ID, () => new StopNode(), {
        label: "Stop",
        docPath: "../bundle/docs/core/lifecycle/stop.md",
        category: "Core.Lifecycle",
        inputPorts: [],
        outputPorts: [],
        controlInputPorts: [],
        controlOutputPorts: [{ slot: CONTROL_PORT_STOPPED, optional: true, type: "trigger" }],
    });
}
