import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createFaultModulatorNode, FaultModulatorNode } from "./modulator.node.js";

export { FaultModulatorNode, createFaultModulatorNode };

const FLOAT_IN  = { optional: true,  type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const faultSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Fault:modulator", () => createFaultModulatorNode() as never, {
            label:    "Fault Modulator",
            category: "Physics.Mechanical.Fault",
            inputPorts: [
                { slot: "signal_in", ...FLOAT_IN },
                { slot: "freq",      ...FLOAT_IN },
                { slot: "amplitude", ...FLOAT_IN },
                { slot: "dt",        ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "signal_out", ...FLOAT_OUT },
            ],
        });
    },
};
