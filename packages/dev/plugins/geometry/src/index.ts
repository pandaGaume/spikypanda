import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { Transform } from "./nodes/transform.js";
import { Attitude } from "./nodes/attitude.js";
import { Cartesian3Node } from "./nodes/cartesian3.js";
import { attitude3DEditor } from "./editors/attitude-3d.js";

export { Transform, Attitude, Cartesian3Node };

const plugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("spk.geometry:transform", () => new Transform(), {
            label: "Transform",
            docPath: ctx.assetUrl("docs/geometry/transform.md"),
            category: "geometry",
            inputPorts: [
                { slot: "translation", optional: true, type: "vec3" },
                { slot: "rotation", optional: true, type: "vec4" },
            ],
            outputPorts: [{ slot: "matrix", optional: false, type: "matrix44" }],
            standards: ["ue5"],
        });

        ctx.nodes.register("spk.geometry:attitude", () => new Attitude(), {
            label: "Attitude",
            docPath: ctx.assetUrl("docs/geometry/attitude.md"),
            category: "geometry",
            inputPorts: [
                { slot: "yaw", optional: true, type: "float" },
                { slot: "pitch", optional: true, type: "float" },
                { slot: "roll", optional: true, type: "float" },
            ],
            outputPorts: [{ slot: "rotation", optional: false, type: "vec4" }],
            standards: ["ue5"],
        });

        ctx.nodes.register("spk.geometry:cartesian3", () => new Cartesian3Node(), {
            label: "Cartesian3",
            docPath: ctx.assetUrl("docs/geometry/cartesian3.md"),
            category: "geometry",
            inputPorts: [
                { slot: "x", optional: true, type: "float" },
                { slot: "y", optional: true, type: "float" },
                { slot: "z", optional: true, type: "float" },
            ],
            outputPorts: [{ slot: "vec3", optional: false, type: "vec3" }],
            standards: ["ue5"],
        });

        ctx.editors.register("attitude-3d", attitude3DEditor);
    },
};

export default plugin;
