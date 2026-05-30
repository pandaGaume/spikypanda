import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createRngSeedNode, RngSeedNode } from "./rng-seed.node.js";
import { createSnapshotNode, SnapshotNode } from "./snapshot.node.js";
import { createRestoreNode, RestoreNode } from "./restore.node.js";
import { createRateDividerNode, RateDividerNode } from "./rate-divider.node.js";
import { createConservationMonitorNode, ConservationMonitorNode } from "./conservation-monitor.node.js";

export { RngSeedNode, createRngSeedNode };
export { SnapshotNode, createSnapshotNode };
export { RestoreNode, createRestoreNode };
export { RateDividerNode, createRateDividerNode };
export { ConservationMonitorNode, createConservationMonitorNode };

/**
 * `Logic.Sim` — simulation runtime primitives.
 *
 * Generic, domain-agnostic plumbing every simulation needs:
 *
 *   rng-seed              deterministic PRNG (Mulberry32), seeded
 *   snapshot / restore    state checkpoint via module-level slot registry
 *   rate-divider          emit 1 of N (multi-rate scheduling primitive)
 *   conservation-monitor  generic invariant drift gauge (variadic sum)
 *
 * Lives in plugin-logic next to Logic.Time / Logic.Input — these are
 * "scheduling and reproducibility" primitives, not domain-specific to
 * any one application (Helios, MCSA, future control systems all use them).
 */
export const logicSimSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Logic.Sim:rng-seed", () => createRngSeedNode() as never, {
            label: "RNG Seed",
            category: "Logic.Sim",
            inputPorts: [],
            outputPorts: [{ slot: "value", optional: false, type: "float" }],
        });
        ctx.nodes.register("Logic.Sim:snapshot", () => createSnapshotNode() as never, {
            label: "Snapshot",
            category: "Logic.Sim",
            inputPorts: [
                { slot: "trigger", optional: true, type: "boolean" },
                { slot: "payload", optional: true, type: "any" },
            ],
            outputPorts: [{ slot: "stored", optional: false, type: "boolean" }],
        });
        ctx.nodes.register("Logic.Sim:restore", () => createRestoreNode() as never, {
            label: "Restore",
            category: "Logic.Sim",
            inputPorts: [{ slot: "trigger", optional: true, type: "boolean" }],
            outputPorts: [{ slot: "payload", optional: false, type: "any" }],
        });
        ctx.nodes.register("Logic.Sim:rate-divider", () => createRateDividerNode() as never, {
            label: "Rate Divider",
            category: "Logic.Sim",
            inputPorts: [{ slot: "value", optional: true, type: "any" }],
            outputPorts: [
                { slot: "value", optional: false, type: "any" },
                { slot: "tick", optional: false, type: "boolean" },
            ],
        });
        ctx.nodes.register("Logic.Sim:conservation-monitor", () => createConservationMonitorNode() as never, {
            label: "Conservation Monitor",
            category: "Logic.Sim",
            inputPorts: [{ slot: "in_0", optional: true, type: "float" }],
            outputPorts: [
                { slot: "drift", optional: false, type: "float" },
                { slot: "alert", optional: false, type: "boolean" },
            ],
            variadicInput: { prefix: "in_", type: "float" },
        });
    },
};
