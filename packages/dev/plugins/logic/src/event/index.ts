import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createAlertBusNode, AlertBusNode } from "./alert-bus.node.js";
import { createArbitratorNode, ArbitratorNode } from "./arbitrator.node.js";

export { AlertBusNode, createAlertBusNode };
export { ArbitratorNode, createArbitratorNode };

/**
 * `Logic.Event` — typed event / messaging primitives.
 *
 *   alert-bus   pub/sub of severity-tagged messages (info/warn/error)
 *   arbitrator  variadic action-request merger with policy
 *               (priority / blend / vote) — typical use is N controllers
 *               competing for one actuator
 *
 * Sits in plugin-logic next to Logic.Flow (Branch, Gate, Select) because
 * these are also flow-control primitives — but they specifically handle
 * MULTI-SOURCE coordination (vs. Flow's single-stream branching).
 */
export const logicEventSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Logic.Event:alert-bus", () => createAlertBusNode() as never, {
            label: "Alert Bus",
            docPath: ctx.assetUrl("docs/logic/event/alert-bus.md"),
            category: "Logic.Event",
            inputPorts: [{ slot: "publish", optional: true, type: "any" }],
            outputPorts: [{ slot: "subscribe", optional: false, type: "any" }],
        });
        ctx.nodes.register("Logic.Event:arbitrator", () => createArbitratorNode() as never, {
            label: "Arbitrator",
            docPath: ctx.assetUrl("docs/logic/event/arbitrator.md"),
            category: "Logic.Event",
            inputPorts: [{ slot: "req_0", optional: true, type: "any" }],
            outputPorts: [
                { slot: "applied", optional: false, type: "float" },
                { slot: "sourceIdx", optional: false, type: "float" },
            ],
            variadicInput: { prefix: "req_", type: "any" },
        });
    },
};
