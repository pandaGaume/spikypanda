import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { Transform } from "./nodes/transform.js";
import { Attitude } from "./nodes/attitude.js";

export { Transform, Attitude };

const plugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register(
            "spk.geometry:transform",
            () => new Transform(),
            {
                label: "Transform",
                category: "geometry",
                inputPorts:  [
                    { slot: "position", optional: true,  type: "vec3" },
                    { slot: "rotation", optional: true,  type: "vec4" },
                ],
                outputPorts: [
                    { slot: "matrix",   optional: false, type: "matrix44" },
                ],
            },
        );

        ctx.nodes.register(
            "spk.geometry:attitude",
            () => new Attitude(),
            {
                label: "Attitude",
                category: "geometry",
                inputPorts:  [
                    { slot: "yaw",      optional: true,  type: "float" },
                    { slot: "pitch",    optional: true,  type: "float" },
                    { slot: "roll",     optional: true,  type: "float" },
                ],
                outputPorts: [
                    { slot: "rotation", optional: false, type: "vec4" },
                ],
            },
        );
    },
};

export default plugin;
