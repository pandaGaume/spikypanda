import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createAccelerometerNode, AccelerometerNode } from "./accelerometer.node.js";
import { createImuNode, ImuNode } from "./imu.node.js";

export { AccelerometerNode, createAccelerometerNode, ImuNode, createImuNode };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;
const VEC3_IN = { optional: true, type: "vec3" } as const;
const VEC3_OUT = { optional: false, type: "vec3" } as const;
const MAT44_IN = { optional: true, type: "matrix44" } as const;
const MAT44_OUT = { optional: false, type: "matrix44" } as const;

export const vibrationSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Vibration:accelerometer", () => createAccelerometerNode() as never, {
            label: "Accelerometer",
            category: "Physics.Mechanical.Vibration",
            docPath: ctx.assetUrl("docs/physics/vibration/accelerometer.md"),
            inputPorts: [
                { slot: "vibration", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "measuredVibration", ...FLOAT_OUT }],
        });

        // 3-axis IMU: a TransformNode (IHasTransform) placed on the housing/motor
        // with an attitude. Reads the true acceleration (vec3), adds the scene
        // gravity projected into its own body frame + per-axis noise, and emits
        // the measured specific force (vec3) a real accelerometer would read.
        ctx.nodes.register("Physics.Mechanical.Vibration:imu", () => createImuNode() as never, {
            label: "IMU (3-axis)",
            docPath: ctx.assetUrl("docs/physics/vibration/imu.md"),
            category: "Physics.Mechanical.Vibration",
            inputPorts: [
                { slot: "local", ...MAT44_IN },
                { slot: "parentWorld", ...MAT44_IN },
                { slot: "acceleration", ...VEC3_IN },
            ],
            outputPorts: [
                { slot: "world", ...MAT44_OUT },
                { slot: "measuredAcceleration", ...VEC3_OUT },
            ],
        });
    },
};
