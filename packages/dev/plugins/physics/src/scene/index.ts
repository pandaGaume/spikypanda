import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createSceneNode, SceneNode } from "./scene.node.js";
import {
    createEarthSceneNode,
    createMoonSceneNode,
    createMarsSceneNode,
    createOrbitalSceneNode,
    EARTH_PRESET,
    MOON_PRESET,
    MARS_PRESET,
    ORBITAL_PRESET,
    SCENE_PRESETS,
} from "./presets.js";

export {
    SceneNode,
    createSceneNode,
    createEarthSceneNode,
    createMoonSceneNode,
    createMarsSceneNode,
    createOrbitalSceneNode,
    EARTH_PRESET,
    MOON_PRESET,
    MARS_PRESET,
    ORBITAL_PRESET,
    SCENE_PRESETS,
};
export type { IScenePreset } from "./presets.js";

/** Shared port descriptor blocks; identical across the generic Scene
 *  node and every preset, since presets are just pre-configured
 *  SceneNode instances. */
const SCENE_IN_PORTS = [
    { slot: "gravity", optional: true, type: "vec3" },
    { slot: "temperature", optional: true, type: "float" },
    { slot: "pressure", optional: true, type: "float" },
    { slot: "time_scale", optional: true, type: "float" },
] as const;
const SCENE_OUT_PORTS = [{ slot: "scene", optional: false, type: "any" }] as const;

/**
 * `Physics.Scene` sub-plugin. Exposes a generic editable Scene plus four
 * planetary presets (Earth, Moon, Mars, Orbital). All five entries
 * share the same SceneNode runtime class — presets just hand-configure
 * its editables on construction. Users can drop a preset and still
 * tweak any field afterwards via the property panel.
 *
 * Layout in the palette (all under "Physics.Scene"):
 *   Scene     — generic, defaults to Earth surface
 *   Earth     — preset wrapper (identical to default Scene)
 *   Moon      — 1.625 m/s², ~vacuum, 250 K
 *   Mars      — 3.721 m/s², 600 Pa, 210 K
 *   Orbital   — 0 m/s², cabin ECLSS (1 atm, 293 K)
 */
export const sceneSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        const inputPorts: ReadonlyArray<{ slot: string; optional: boolean; type: string }> = [...SCENE_IN_PORTS];
        const outputPorts: ReadonlyArray<{ slot: string; optional: boolean; type: string }> = [...SCENE_OUT_PORTS];

        ctx.nodes.register("Physics.Scene:scene", () => createSceneNode() as never, {
            label: "Scene",
            category: "Physics.Scene",
            inputPorts,
            outputPorts,
        });
        ctx.nodes.register("Physics.Scene:earth", () => createEarthSceneNode() as never, {
            label: EARTH_PRESET.name,
            category: "Physics.Scene",
            inputPorts,
            outputPorts,
        });
        ctx.nodes.register("Physics.Scene:moon", () => createMoonSceneNode() as never, {
            label: MOON_PRESET.name,
            category: "Physics.Scene",
            inputPorts,
            outputPorts,
        });
        ctx.nodes.register("Physics.Scene:mars", () => createMarsSceneNode() as never, {
            label: MARS_PRESET.name,
            category: "Physics.Scene",
            inputPorts,
            outputPorts,
        });
        ctx.nodes.register("Physics.Scene:orbital", () => createOrbitalSceneNode() as never, {
            label: ORBITAL_PRESET.name,
            category: "Physics.Scene",
            inputPorts,
            outputPorts,
        });
    },
};
