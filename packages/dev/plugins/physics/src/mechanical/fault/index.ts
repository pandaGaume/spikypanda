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

        // Apply-to CAUSE faults (FMEA cause -> eccentricity state). They carry NO
        // data ports: a single `fault`-typed apply output is drawn onto a motor's
        // variadic `fault_N` input, which the editor + loader turn into a
        // structural `ApplyTo` link (the fault reads the motor MODEL's properties
        // in `applyTo`, not a port payload).
        const APPLY_TO_OUT = [{ slot: "applyTo", optional: false, type: "fault" }];
        ctx.nodes.register("Physics.Mechanical.Fault:rotor-sag", () => createRotorSagFaultNode() as never, {
            label: "Rotor Sag (gravity cause)",
            docPath: ctx.assetUrl("docs/physics/fault/rotor-sag.md"),
            category: "Physics.Mechanical.Fault",
            inputPorts: [],
            outputPorts: APPLY_TO_OUT,
        });
        ctx.nodes.register("Physics.Mechanical.Fault:rotor-eccentricity", () => createRotorEccentricityFaultNode() as never, {
            label: "Rotor Eccentricity (static cause)",
            docPath: ctx.assetUrl("docs/physics/fault/rotor-eccentricity.md"),
            category: "Physics.Mechanical.Fault",
            inputPorts: [],
            outputPorts: APPLY_TO_OUT,
        });
        ctx.nodes.register("Physics.Mechanical.Fault:rotor-imbalance", () => createRotorImbalanceFaultNode() as never, {
            label: "Rotor Imbalance (mechanical cause)",
            docPath: ctx.assetUrl("docs/physics/fault/rotor-imbalance.md"),
            category: "Physics.Mechanical.Fault",
            inputPorts: [],
            outputPorts: APPLY_TO_OUT,
        });
    },
};
