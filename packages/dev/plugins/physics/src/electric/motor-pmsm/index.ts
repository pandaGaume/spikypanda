import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createPmsmMachineDqNode, PmsmMachineDqNode } from "./machine-dq.node.js";
import { createPmsmFocNode, PmsmFocNode } from "./foc.node.js";
import { createPmsmSvpwmNode, PmsmSvpwmNode } from "./svpwm.node.js";
import { createPmsmInverterNode, PmsmInverterNode } from "./inverter.node.js";
import { createClarkeNode, ClarkeNode } from "./clarke.node.js";
import { createParkNode, ParkNode } from "./park.node.js";
import { createGravityCoupledPmsmGraph, GravityCoupledPmsmGraph } from "./gravity-coupled.graph.js";
// Sinusoidal abc-frame PMSM: code lives in motor-bldc/ (shares back-emf.ts
// with the trapezoidal BLDC), but it is phaseA PMSM, so it is registered HERE,
// in the PMSM family. Class re-exported from motor-bldc/index.
import { createPmsmMotorDynamicNode } from "../motor-bldc/pmsm-dynamic.node.js";

export {
    PmsmMachineDqNode,
    createPmsmMachineDqNode,
    PmsmFocNode,
    createPmsmFocNode,
    PmsmSvpwmNode,
    createPmsmSvpwmNode,
    PmsmInverterNode,
    createPmsmInverterNode,
    ClarkeNode,
    createClarkeNode,
    ParkNode,
    createParkNode,
    GravityCoupledPmsmGraph,
    createGravityCoupledPmsmGraph,
};

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;
const SCENE_IN = { optional: true, type: "scene" } as const;
const MAT44_IN = { optional: true, type: "matrix44" } as const;
const MAT44_OUT = { optional: false, type: "matrix44" } as const;
const FAULT_IN = { optional: true, type: "any" } as const;

export const motorPmsmSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Electric.Motor.PMSM:foc", () => createPmsmFocNode() as never, {
            label: "PMSM FOC Controller",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/foc.md"),
            inputPorts: [
                { slot: "directAxisCurrent", ...FLOAT_IN },
                { slot: "quadratureAxisCurrent", ...FLOAT_IN },
                { slot: "angularVelocity", ...FLOAT_IN },
                { slot: "rotorAngle", ...FLOAT_IN },
                { slot: "speedTarget", ...FLOAT_IN },
                { slot: "quadratureCurrentReference", ...FLOAT_IN },
                { slot: "dcBusVoltage", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "voltageAlpha", ...FLOAT_OUT },
                { slot: "voltageBeta", ...FLOAT_OUT },
                { slot: "phaseVoltageA", ...FLOAT_OUT },
                { slot: "phaseVoltageB", ...FLOAT_OUT },
                { slot: "phaseVoltageC", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Electric.Motor.PMSM:machine", () => createPmsmMachineDqNode() as never, {
            label: "PMSM Machine (dq)",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/machine-dq.md"),
            inputPorts: [
                { slot: "local", optional: true, type: "matrix44" },
                { slot: "parentWorld", optional: true, type: "matrix44" },
                { slot: "scene", ...SCENE_IN },
                { slot: "fault_0", optional: true, type: "any" },
                { slot: "phaseVoltageA", ...FLOAT_IN },
                { slot: "phaseVoltageB", ...FLOAT_IN },
                { slot: "phaseVoltageC", ...FLOAT_IN },
                { slot: "loadTorque", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "world", optional: false, type: "matrix44" },
                { slot: "directAxisCurrent", ...FLOAT_OUT },
                { slot: "quadratureAxisCurrent", ...FLOAT_OUT },
                { slot: "phaseCurrentA", ...FLOAT_OUT },
                { slot: "phaseCurrentB", ...FLOAT_OUT },
                { slot: "phaseCurrentC", ...FLOAT_OUT },
                { slot: "angularVelocity", ...FLOAT_OUT },
                { slot: "rotorAngle", ...FLOAT_OUT },
                { slot: "electromagneticTorque", ...FLOAT_OUT },
                { slot: "forceY", ...FLOAT_OUT },
                { slot: "forceZ", ...FLOAT_OUT },
            ],
        });
        // Sinusoidal abc-frame PMSM (was Physics.Electric.Motor.BLDC:pmsm,
        // moved here 2026-06-15 so all PMSM live in the PMSM family). The
        // simpler explicit-Euler abc counterpart of the dq machine above:
        // non-salient, sinusoidal back-EMF, tau fault bank, no gravity
        // coupling. Code in motor-bldc/ (shares back-emf with the BLDC node).
        ctx.nodes.register("Physics.Electric.Motor.PMSM:dynamic", () => createPmsmMotorDynamicNode() as never, {
            label: "PMSM Motor (abc, sinusoidal)",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-bldc/pmsm-dynamic.md"),
            inputPorts: [
                { slot: "local", ...MAT44_IN },
                { slot: "parentWorld", ...MAT44_IN },
                { slot: "scene", ...SCENE_IN },
                { slot: "fault_0", ...FAULT_IN },
                { slot: "phaseVoltageA", ...FLOAT_IN },
                { slot: "phaseVoltageB", ...FLOAT_IN },
                { slot: "phaseVoltageC", ...FLOAT_IN },
                { slot: "loadTorque", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "world", ...MAT44_OUT },
                { slot: "phaseCurrentA", ...FLOAT_OUT },
                { slot: "phaseCurrentB", ...FLOAT_OUT },
                { slot: "phaseCurrentC", ...FLOAT_OUT },
                { slot: "angularVelocity", ...FLOAT_OUT },
                { slot: "rotorAngle", ...FLOAT_OUT },
                { slot: "electromagneticTorque", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Electric.Motor.PMSM:svpwm", () => createPmsmSvpwmNode() as never, {
            label: "SVPWM Modulator",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/svpwm.md"),
            inputPorts: [
                { slot: "voltageAlpha", ...FLOAT_IN },
                { slot: "voltageBeta", ...FLOAT_IN },
                { slot: "dcBusVoltage", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "dutyCycleA", ...FLOAT_OUT },
                { slot: "dutyCycleB", ...FLOAT_OUT },
                { slot: "dutyCycleC", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Electric.Motor.PMSM:inverter", () => createPmsmInverterNode() as never, {
            label: "3-Phase Inverter (averaged)",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/inverter.md"),
            inputPorts: [
                { slot: "dutyCycleA", ...FLOAT_IN },
                { slot: "dutyCycleB", ...FLOAT_IN },
                { slot: "dutyCycleC", ...FLOAT_IN },
                { slot: "dcBusVoltage", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "phaseVoltageA", ...FLOAT_OUT },
                { slot: "phaseVoltageB", ...FLOAT_OUT },
                { slot: "phaseVoltageC", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Electric.Motor.PMSM:clarke", () => createClarkeNode() as never, {
            label: "Clarke (abc to alpha-beta)",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/clarke-park.md"),
            inputPorts: [
                { slot: "phaseA", ...FLOAT_IN },
                { slot: "phaseB", ...FLOAT_IN },
                { slot: "phaseC", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "alpha", ...FLOAT_OUT },
                { slot: "beta", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Electric.Motor.PMSM:park", () => createParkNode() as never, {
            label: "Park (alpha-beta to dq)",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/clarke-park.md"),
            inputPorts: [
                { slot: "alpha", ...FLOAT_IN },
                { slot: "beta", ...FLOAT_IN },
                { slot: "rotorAngle", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "directAxis", ...FLOAT_OUT },
                { slot: "quadratureAxis", ...FLOAT_OUT },
            ],
        });
        // Specialized graph node: the gravity-coupled PMSM ASSEMBLY (FOC +
        // dq machine + gravity payload + resonant housing) packaged as phaseA
        // palette-droppable, drillable container. Its interior is built at
        // CONSTRUCTION (the factory returns phaseA fully-wired graph), so phaseA save
        // is just this typeId; on load the factory rebuilds the assembly.
        // Ports: `local` places + orients the whole body (yaw vs gravity),
        // `speedTarget` drives the FOC, the Scene is inherited; the machine
        // current/vibration + housing acceleration are the study readouts.
        ctx.nodes.register("Physics.Electric.Motor.PMSM:gravity-coupled", () => createGravityCoupledPmsmGraph() as never, {
            label: "PMSM (gravity-coupled)",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/gravity-coupled.md"),
            inputPorts: [
                { slot: "scene_in", ...SCENE_IN },
                { slot: "local", ...MAT44_IN },
                { slot: "speedTarget", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "world", ...MAT44_OUT },
                { slot: "quadratureAxisCurrent", ...FLOAT_OUT },
                { slot: "angularVelocity", ...FLOAT_OUT },
                { slot: "forceY", ...FLOAT_OUT },
                { slot: "forceZ", ...FLOAT_OUT },
                { slot: "accelerationY", ...FLOAT_OUT },
                { slot: "accelerationZ", ...FLOAT_OUT },
            ],
        });
    },
};
