import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createAccelerometerNode, AccelerometerNode } from "./accelerometer.node.js";

export { AccelerometerNode, createAccelerometerNode };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const vibrationSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Vibration:accelerometer", () => createAccelerometerNode() as never, {
            label: "Accelerometer",
            category: "Physics.Mechanical.Vibration",
            docPath: ctx.assetUrl("docs/physics/vibration/accelerometer.md"),
            inputPorts: [
                { slot: "vibration", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "vibration_measured", ...FLOAT_OUT }],
        });
    },
};
