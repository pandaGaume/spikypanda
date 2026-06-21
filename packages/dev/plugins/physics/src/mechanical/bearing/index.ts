import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createBearingFaultNode, BearingFaultNode } from "./fault.node.js";

export { BearingFaultNode, createBearingFaultNode };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const bearingSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Bearing:fault", () => createBearingFaultNode() as never, {
            label: "Bearing Fault Generator",
            category: "Physics.Mechanical.Bearing",
            docPath: ctx.assetUrl("docs/physics/bearing/fault.md"),
            inputPorts: [
                { slot: "inputSignal", ...FLOAT_IN },
                { slot: "angularVelocity", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "outputSignal", ...FLOAT_OUT },
                { slot: "outerRaceDefectFrequencyHz", ...FLOAT_OUT },
                { slot: "innerRaceDefectFrequencyHz", ...FLOAT_OUT },
                { slot: "ballSpinFrequencyHz", ...FLOAT_OUT },
                { slot: "cageFrequencyHz", ...FLOAT_OUT },
            ],
        });
    },
};
