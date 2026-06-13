import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createFaultModulatorNode, FaultModulatorNode } from "./modulator.node.js";
import { createEccentricityFaultNode, EccentricityFaultNode } from "./eccentricity.node.js";
import { createImbalanceFaultNode, ImbalanceFaultNode } from "./imbalance.node.js";

export { FaultModulatorNode, createFaultModulatorNode, EccentricityFaultNode, createEccentricityFaultNode, ImbalanceFaultNode, createImbalanceFaultNode };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const faultSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Fault:modulator", () => createFaultModulatorNode() as never, {
            label: "Fault Modulator",
            category: "Physics.Mechanical.Fault",
            docPath: ctx.assetUrl("docs/physics/fault/modulator.md"),
            inputPorts: [
                { slot: "signal_in", ...FLOAT_IN },
                { slot: "freq", ...FLOAT_IN },
                { slot: "amplitude", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "signal_out", ...FLOAT_OUT }],
        });
        ctx.nodes.register("Physics.Mechanical.Fault:eccentricity", () => createEccentricityFaultNode() as never, {
            label: "Eccentricity Fault (D4)",
            category: "Physics.Mechanical.Fault",
            docPath: ctx.assetUrl("docs/physics/fault/eccentricity.md"),
            inputPorts: [{ slot: "theta_m", ...FLOAT_IN }],
            outputPorts: [{ slot: "flux", optional: false, type: "any" }],
        });
        ctx.nodes.register("Physics.Mechanical.Fault:imbalance", () => createImbalanceFaultNode() as never, {
            label: "Imbalance Fault (D1)",
            category: "Physics.Mechanical.Fault",
            docPath: ctx.assetUrl("docs/physics/fault/imbalance.md"),
            inputPorts: [
                { slot: "omega", ...FLOAT_IN },
                { slot: "theta_m", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "force_y", ...FLOAT_OUT },
                { slot: "force_z", ...FLOAT_OUT },
            ],
        });
    },
};
