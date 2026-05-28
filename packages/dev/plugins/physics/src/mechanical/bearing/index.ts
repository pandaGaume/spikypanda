import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createBearingFaultNode, BearingFaultNode } from "./fault.node.js";

export { BearingFaultNode, createBearingFaultNode };

const FLOAT_IN  = { optional: true,  type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const bearingSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Bearing:fault", () => createBearingFaultNode() as never, {
            label:    "Bearing Fault Generator",
            category: "Physics.Mechanical.Bearing",
            inputPorts: [
                { slot: "signal_in", ...FLOAT_IN },
                { slot: "omega",     ...FLOAT_IN },
                { slot: "dt",        ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "signal_out", ...FLOAT_OUT },
                { slot: "bpfo_hz",    ...FLOAT_OUT },
                { slot: "bpfi_hz",    ...FLOAT_OUT },
                { slot: "bsf_hz",     ...FLOAT_OUT },
                { slot: "ftf_hz",     ...FLOAT_OUT },
            ],
        });
    },
};
