import { motorDcSubPlugin }   from "./electric/motor-dc/index.js";
import { motorBldcSubPlugin } from "./electric/motor-bldc/index.js";
import { bearingSubPlugin }   from "./mechanical/bearing/index.js";
import { shaftSubPlugin }     from "./mechanical/shaft/index.js";
import { gearSubPlugin }      from "./mechanical/gear/index.js";
import { frictionSubPlugin }  from "./mechanical/friction/index.js";
import { vibrationSubPlugin } from "./mechanical/vibration/index.js";
import { faultSubPlugin }     from "./mechanical/fault/index.js";

export * from "./electric/motor-dc/index.js";
export * from "./electric/motor-bldc/index.js";
export * from "./mechanical/bearing/index.js";
export * from "./mechanical/shaft/index.js";
export * from "./mechanical/gear/index.js";
export * from "./mechanical/friction/index.js";
export * from "./mechanical/vibration/index.js";
export * from "./mechanical/fault/index.js";

/**
 * @spikypanda/plugin-physics
 *
 * Thematic physics nodes organized as a tree of sub-plugins under
 * `Physics.*`. V1 ships:
 *
 *   Electric/
 *     Motor/
 *       DC   — brush DC motor (4 nodes: dynamic, steady, speedPI, tachymeter)
 *       BLDC — brushless DC + PMSM (4 nodes: bldc dynamic, pmsm dynamic, inverter, speedPI)
 *
 *   Mechanical/
 *     Bearing   — defect-frequency fault generator (BPFO/BPFI/BSF/FTF)
 *     Shaft     — unbalance modulator at 1× shaft frequency
 *     Gear      — mesh harmonic + tooth-fault Gaussian pulse
 *     Friction  — Coulomb + Stribeck + viscous combined torque
 *     Vibration — accelerometer transducer (LPF + noise + quantization)
 *     Fault     — generic sinusoidal modulator (composable building block)
 *
 * None of these nodes are ONNX-backed — they are pure runtime sim
 * primitives, so they declare no standards. ONNX export of a sim graph
 * built from them is a separate concern (a future codegen pass).
 */
export default {
    subPlugins: {
        "Physics.Electric.Motor.DC":         motorDcSubPlugin,
        "Physics.Electric.Motor.BLDC":       motorBldcSubPlugin,
        "Physics.Mechanical.Bearing":        bearingSubPlugin,
        "Physics.Mechanical.Shaft":          shaftSubPlugin,
        "Physics.Mechanical.Gear":           gearSubPlugin,
        "Physics.Mechanical.Friction":       frictionSubPlugin,
        "Physics.Mechanical.Vibration":      vibrationSubPlugin,
        "Physics.Mechanical.Fault":          faultSubPlugin,
    },
};
