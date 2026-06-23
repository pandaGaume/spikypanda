import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createLoadTorqueNode, LoadTorqueNode } from "./load-torque.node.js";
import type { LoadProfile } from "./load-torque.node.js";
import { createGravityPayloadLoadNode, GravityPayloadLoadNode } from "./gravity-payload.node.js";

export { LoadTorqueNode, createLoadTorqueNode, GravityPayloadLoadNode, createGravityPayloadLoadNode };
export type { LoadProfile };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const loadSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        // Load Torque: a chainable timed SEGMENT. Drives the motor only while
        // active (armed by the `_start` trigger or autoStart), runs its profile
        // for `duration`, then pulses `_completed`. Wire segment[i]._completed ->
        // segment[i+1]._start to sequence operating regimes (the scheduler IS
        // the chain). `_start`/`_completed` are CONTROL-plane ports so a timed
        // segment stays a "true source" ticked every sim step (its duration
        // clock never stalls at steady speed). Defaults reproduce the legacy
        // always-on producer.
        ctx.nodes.register("Physics.Mechanical.Load:torque", () => createLoadTorqueNode() as never, {
            label: "Load Torque",
            docPath: ctx.assetUrl("docs/physics/load/torque.md"),
            category: "Physics.Mechanical.Load",
            inputPorts: [{ slot: "angularVelocity", ...FLOAT_IN }],
            outputPorts: [{ slot: "loadTorque", ...FLOAT_OUT }],
            controlInputPorts: [
                { slot: "_enable", optional: true, type: "boolean" },
                { slot: "_start", optional: true, type: "trigger" },
                { slot: "_reset", optional: true, type: "trigger" },
            ],
            controlOutputPorts: [
                { slot: "_enabled", optional: true, type: "boolean" },
                { slot: "_completed", optional: true, type: "trigger" },
            ],
        });
        // Gravitational payload: a crank mass whose weight m*g, projected
        // through the motor orientation (wire a GravityVector's g_* in),
        // produces a 1x torque ripple (-> quadratureAxisCurrent signature) + bearing loads.
        // Scales with g (0 in microgravity) and shaft tilt; the load the
        // gravity-signature atlas needs.
        ctx.nodes.register("Physics.Mechanical.Load:gravity-payload", () => createGravityPayloadLoadNode() as never, {
            label: "Gravity Payload Load",
            docPath: ctx.assetUrl("docs/physics/load/gravity-payload.md"),
            category: "Physics.Mechanical.Load",
            inputPorts: [
                { slot: "local", optional: true, type: "matrix44" },
                { slot: "parentWorld", optional: true, type: "matrix44" },
                { slot: "scene", optional: true, type: "scene" },
                { slot: "rotorAngle", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "world", optional: false, type: "matrix44" },
                { slot: "loadTorque", ...FLOAT_OUT },
                { slot: "axialForce", ...FLOAT_OUT },
                { slot: "radialForce", ...FLOAT_OUT },
            ],
        });
    },
};
