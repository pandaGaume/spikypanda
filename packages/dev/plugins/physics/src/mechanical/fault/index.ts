import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createFaultModulatorNode, FaultModulatorNode } from "./modulator.node.js";
import { createEccentricityFaultNode, EccentricityFaultNode } from "./eccentricity.node.js";
import { createImbalanceFaultNode, ImbalanceFaultNode } from "./imbalance.node.js";
import { createRotorSagFaultNode, RotorSagFaultNode } from "./rotor-sag.node.js";
import { createRotorEccentricityFaultNode, RotorEccentricityFaultNode } from "./rotor-eccentricity.node.js";
import { createRotorImbalanceFaultNode, RotorImbalanceFaultNode } from "./rotor-imbalance.node.js";

export {
    FaultModulatorNode,
    createFaultModulatorNode,
    EccentricityFaultNode,
    createEccentricityFaultNode,
    ImbalanceFaultNode,
    createImbalanceFaultNode,
    RotorSagFaultNode,
    createRotorSagFaultNode,
    RotorEccentricityFaultNode,
    createRotorEccentricityFaultNode,
    RotorImbalanceFaultNode,
    createRotorImbalanceFaultNode,
};

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const faultSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Fault:modulator", () => createFaultModulatorNode() as never, {
            label: "Fault Modulator",
            category: "Physics.Mechanical.Fault",
            docPath: ctx.assetUrl("docs/physics/fault/modulator.md"),
            inputPorts: [
                { slot: "inputSignal", ...FLOAT_IN },
                { slot: "freq", ...FLOAT_IN },
                { slot: "amplitude", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "outputSignal", ...FLOAT_OUT }],
        });
        ctx.nodes.register("Physics.Mechanical.Fault:eccentricity", () => createEccentricityFaultNode() as never, {
            label: "Eccentricity Fault (D4)",
            category: "Physics.Mechanical.Fault",
            docPath: ctx.assetUrl("docs/physics/fault/eccentricity.md"),
            inputPorts: [{ slot: "rotorAngle", ...FLOAT_IN }],
            outputPorts: [{ slot: "flux", optional: false, type: "any" }],
        });
        ctx.nodes.register("Physics.Mechanical.Fault:imbalance", () => createImbalanceFaultNode() as never, {
            label: "Imbalance Fault (D1)",
            category: "Physics.Mechanical.Fault",
            docPath: ctx.assetUrl("docs/physics/fault/imbalance.md"),
            inputPorts: [
                { slot: "angularVelocity", ...FLOAT_IN },
                { slot: "rotorAngle", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "forceY", ...FLOAT_OUT },
                { slot: "forceZ", ...FLOAT_OUT },
            ],
        });

        // Apply-to CAUSE faults (FMEA cause -> eccentricity state). They carry no
        // data ports: they are linked to a motor by a structural `ApplyTo` link
        // and read the motor MODEL's properties in `applyTo`. (Drawing the
        // ApplyTo link in the editor is pending; usable programmatically today.)
        ctx.nodes.register("Physics.Mechanical.Fault:rotor-sag", () => createRotorSagFaultNode() as never, {
            label: "Rotor Sag (gravity cause)",
            category: "Physics.Mechanical.Fault",
            inputPorts: [],
            outputPorts: [],
        });
        ctx.nodes.register("Physics.Mechanical.Fault:rotor-eccentricity", () => createRotorEccentricityFaultNode() as never, {
            label: "Rotor Eccentricity (static cause)",
            category: "Physics.Mechanical.Fault",
            inputPorts: [],
            outputPorts: [],
        });
        ctx.nodes.register("Physics.Mechanical.Fault:rotor-imbalance", () => createRotorImbalanceFaultNode() as never, {
            label: "Rotor Imbalance (mechanical cause)",
            category: "Physics.Mechanical.Fault",
            inputPorts: [],
            outputPorts: [],
        });
    },
};
