import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createLoadTorqueNode, LoadTorqueNode } from "./load-torque.node.js";
import type { LoadProfile } from "./load-torque.node.js";
import { createGravityPayloadLoadNode, GravityPayloadLoadNode } from "./gravity-payload.node.js";
import { createTurbinePayloadNode, TurbinePayloadNode } from "./turbine-payload.node.js";

export { LoadTorqueNode, createLoadTorqueNode, GravityPayloadLoadNode, createGravityPayloadLoadNode, TurbinePayloadNode, createTurbinePayloadNode };
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
        // Turbine / scrubber payload: the fan-law aerodynamic load AND a fault
        // COMPOSER. Imbalance / eccentricity faults wire into its fault_N bank;
        // it reads its own mass + the scene gravity, adds the k*omega^2 aero load
        // + the payload weight, and forwards the composed fault to the motor via
        // `applyTo` (-> motor.fault_0). Speed feeds back from the motor.
        ctx.nodes.register("Physics.Mechanical.Load:turbine", () => createTurbinePayloadNode() as never, {
            label: "Turbine Payload",
            category: "Physics.Mechanical.Load",
            inputPorts: [
                { slot: "local", optional: true, type: "matrix44" },
                { slot: "parentWorld", optional: true, type: "matrix44" },
                { slot: "scene", optional: true, type: "scene" },
                { slot: "fault_0", optional: true, type: "any" },
                { slot: "fault_1", optional: true, type: "any" },
                { slot: "angularVelocity", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "world", optional: false, type: "matrix44" },
                { slot: "applyTo", optional: false, type: "fault" },
                { slot: "loadTorque", ...FLOAT_OUT },
            ],
        });
    },
};
