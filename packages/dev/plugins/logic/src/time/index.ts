import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { ClockNode, DeltaTimeNode } from "../nodes/time.js";
import { TimerNode } from "../nodes/timer.js";

const UE5 = ["ue5"] as const;

export const logicTimeSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Logic.Time:clock", () => new ClockNode() as never, {
            label: "Clock",
            category: "Logic.Time",
            inputPorts: [],
            outputPorts: [{ slot: "t", optional: false, type: "float" }],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Time:deltaTime", () => new DeltaTimeNode() as never, {
            label: "Delta Time",
            category: "Logic.Time",
            inputPorts: [],
            outputPorts: [{ slot: "dt", optional: false, type: "float" }],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Time:timer", () => new TimerNode() as never, {
            label: "Timer",
            category: "Logic.Time",
            inputPorts: [
                { slot: "duration", optional: true, type: "float" },
                { slot: "from", optional: true, type: "float" },
                { slot: "to", optional: true, type: "float" },
            ],
            outputPorts: [
                { slot: "progress", optional: false, type: "float" },
                { slot: "value", optional: false, type: "float" },
            ],
            standards: UE5,
        });
    },
};
