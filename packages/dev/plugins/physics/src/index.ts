import { transformSubPlugin } from "./transform/index.js";
import { sceneSubPlugin } from "./scene/index.js";
import { motorDcSubPlugin } from "./electric/motor-dc/index.js";
import { motorBldcSubPlugin } from "./electric/motor-bldc/index.js";
import { motorInductionSubPlugin } from "./electric/motor-induction/index.js";
import { motorPmsmSubPlugin } from "./electric/motor-pmsm/index.js";
import { electricSensorSubPlugin } from "./electric/sensor/index.js";
import { bearingSubPlugin } from "./mechanical/bearing/index.js";
import { shaftSubPlugin } from "./mechanical/shaft/index.js";
import { gearSubPlugin } from "./mechanical/gear/index.js";
import { frictionSubPlugin } from "./mechanical/friction/index.js";
import { loadSubPlugin } from "./mechanical/load/index.js";
import { vibrationSubPlugin } from "./mechanical/vibration/index.js";
import { faultSubPlugin } from "./mechanical/fault/index.js";
import { housingSubPlugin } from "./mechanical/housing/index.js";
import { environmentGravitySubPlugin } from "./environment/gravity/index.js";
import { physicsParticulateSubPlugin } from "./particulate/index.js";

export * from "./transform/index.js";
export * from "./scene/index.js";
export * from "./electric/motor-dc/index.js";
export * from "./electric/motor-bldc/index.js";
export * from "./electric/motor-induction/index.js";
export * from "./mechanical/bearing/index.js";
export * from "./mechanical/shaft/index.js";
export * from "./mechanical/gear/index.js";
export * from "./mechanical/friction/index.js";
export * from "./mechanical/load/index.js";
export * from "./mechanical/vibration/index.js";
export * from "./mechanical/fault/index.js";
export * from "./particulate/particulate.node.js";
export {
    motorPmsmSubPlugin,
    createPmsmMachineDqNode,
    PmsmMachineDqNode,
    createPmsmFocNode,
    PmsmFocNode,
    createGravityCoupledPmsmGraph,
    GravityCoupledPmsmGraph,
} from "./electric/motor-pmsm/index.js";
export { housingSubPlugin, createHousingMechanicsNode, HousingMechanicsNode } from "./mechanical/housing/index.js";
export { environmentGravitySubPlugin, createGravityVectorNode, GravityVectorNode, createRotorSagNode, RotorSagNode } from "./environment/gravity/index.js";
export { electricSensorSubPlugin, CurrentSensorNode, createCurrentSensorNode, PowerMeterNode, createPowerMeterNode } from "./electric/sensor/index.js";
export { physicsParticulateSubPlugin } from "./particulate/index.js";

/**
 * @spikypanda/plugin-physics
 *
 * Thematic physics nodes organized as a tree of sub-plugins under
 * `Physics.*`. V1 ships:
 *
 *   Transform     — world-frame transform composer; base class for every
 *                   physical object that lives in a world reference frame
 *                   (motors, sensors, mechanical bodies inherit it).
 *
 *   Scene         — environmental context broadcaster (gravity,
 *                   temperature, pressure, time_scale). Wire its `scene`
 *                   output to a TransformNode's `scene` input to attach.
 *
 *   Electric/
 *     Motor/
 *       DC        — brush DC motor (4 nodes: dynamic, steady, speedPI, tachymeter)
 *       BLDC      — brushless DC + PMSM (4 nodes: bldc dynamic, pmsm dynamic, inverter, speedPI)
 *       Induction — squirrel-cage asynchronous motor (alpha-beta dynamic model,
 *                   emergent slip, broken-rotor-bar MCSA sidebands at f(1 +/- 2s))
 *
 *   Mechanical/
 *     Bearing   — defect-frequency fault generator (BPFO/BPFI/BSF/FTF)
 *     Shaft     — unbalance modulator at 1× shaft frequency
 *     Gear      — mesh harmonic + tooth-fault Gaussian pulse
 *     Friction  — Coulomb + Stribeck + viscous combined torque
 *     Load      — load-torque source with profiles (constant, step, ramp,
 *                 quadratic, periodic) for any motor's tau_load input
 *     Vibration — accelerometer transducer (LPF + noise + quantization)
 *     Fault     — generic sinusoidal modulator (composable building block)
 *
 *   Particulate  — solid-phase matter descriptors (PM2.5, PM10, dust,
 *                  lunar regolith). Wired to the atmosphere through
 *                  its `particulate_in_<k>` config-link variadic. V1
 *                  records metadata only; V2 will add settling under
 *                  gravity, drag, re-suspension, filtration.
 *
 * Generic control-system primitives (Setpoint, EmergencyShutdown) used
 * to live here as `Physics.Control:*` but were moved to plugin-control
 * (`Control.Actuator:*` / `Control.Safety:*`) once the catalog grew
 * past a single node — they were never physics-specific.
 *
 * None of these nodes are ONNX-backed — they are pure runtime sim
 * primitives, so they declare no standards. ONNX export of a sim graph
 * built from them is a separate concern (a future codegen pass).
 */
export default {
    subPlugins: {
        "Physics.Transform": transformSubPlugin,
        "Physics.Scene": sceneSubPlugin,
        "Physics.Electric.Motor.DC": motorDcSubPlugin,
        "Physics.Electric.Motor.BLDC": motorBldcSubPlugin,
        "Physics.Electric.Motor.Induction": motorInductionSubPlugin,
        "Physics.Electric.Motor.PMSM": motorPmsmSubPlugin,
        "Physics.Electric.Sensor": electricSensorSubPlugin,
        "Physics.Mechanical.Bearing": bearingSubPlugin,
        "Physics.Mechanical.Shaft": shaftSubPlugin,
        "Physics.Mechanical.Gear": gearSubPlugin,
        "Physics.Mechanical.Friction": frictionSubPlugin,
        "Physics.Mechanical.Load": loadSubPlugin,
        "Physics.Mechanical.Vibration": vibrationSubPlugin,
        "Physics.Mechanical.Fault": faultSubPlugin,
        "Physics.Mechanical.Housing": housingSubPlugin,
        "Physics.Environment.Gravity": environmentGravitySubPlugin,
        "Physics.Particulate": physicsParticulateSubPlugin,
    },
};
