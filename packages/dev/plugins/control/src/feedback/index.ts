import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createFeedbackChannelNode, FeedbackChannelNode } from "./channel.node.js";

export { FeedbackChannelNode, createFeedbackChannelNode };

/**
 * `Control.Feedback` — cycle-breaking primitives.
 *
 * The single node here, `Feedback Channel`, is a Z^-N unit delay used
 * to turn cyclic control graphs (DC motor → tachymeter → PI → motor)
 * into a topologically valid DAG. The runtime scheduler does NOT
 * support cycles; inserting a Feedback Channel between the measurement
 * and the controller introduces a `delay`-tick latency that matches
 * the physical "sensor sample arrives one tick after the actuator
 * command" interpretation.
 *
 * V1 ships with one node. Future companions (Hold, Sample, ZOH,
 * Quantizer, Bus Reroute) belong here too.
 */
export const controlFeedbackSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Control.Feedback:channel", () => createFeedbackChannelNode() as never, {
            label: "Feedback Channel",
            docPath: ctx.assetUrl("docs/control/feedback/channel.md"),
            category: "Control.Feedback",
            // Split-view: two visually-independent widgets sharing one
            // logical node. Anchor 0 (the "out" half) sits near the
            // signal source and exposes the `input` port; anchor 1 (the
            // "in" half) sits near the consumer and exposes the `output`
            // port. The cycle that appears in the user's intent (motor
            // omega -> FB.input ... FB.output -> PI.omega_measured)
            // becomes two short forward wires, no backward edges drawn.
            anchorCount: 2,
            inputPorts: [{ slot: "input", optional: true, type: "any", anchor: 0 }],
            outputPorts: [{ slot: "output", optional: false, type: "any", anchor: 1 }],
        });
    },
};
