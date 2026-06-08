import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import {
    createEarthSceneItem,
    createMarsSceneItem,
    createMoonSceneItem,
    createOrbitalSceneItem,
    EARTH_PRESET,
    MARS_PRESET,
    MOON_PRESET,
    ORBITAL_PRESET,
    SCENE_PRESETS,
} from "./presets.js";
import { createSceneItem, SceneItem } from "./scene.item.js";
import type { SceneSourceResolver } from "./scene.item.js";

export {
    SceneItem,
    createSceneItem,
    createEarthSceneItem,
    createMoonSceneItem,
    createMarsSceneItem,
    createOrbitalSceneItem,
    EARTH_PRESET,
    MOON_PRESET,
    MARS_PRESET,
    ORBITAL_PRESET,
    SCENE_PRESETS,
};
export type { IScenePreset } from "./presets.js";
export type { SceneSourceResolver };

/**
 * `Physics.Scene` sub-plugin. Exposes a generic editable Scene plus four
 * planetary presets (Earth, Moon, Mars, Orbital). All five entries are
 * `SceneItem` instances (GraphItem, NOT RuntimeNode) — they are pure
 * descriptors of an environment + simulation domain, read at session
 * bind by the enclosing Sim.Graph (or by the GraphRunner at root) to
 * build a live SceneStateView consumers read each tick.
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
        // SceneItem is a GraphItem, not a RuntimeNode — it has no
        // runtime input/output ports. The editor surfaces its
        // anchors (sceneOut / atmosphereIn / solverIn / sharedIn) as
        // config-links (dashed style) handled by the editor renderer,
        // not as scheduler-visible channels. The empty port arrays
        // below preserve the registration shape for backward
        // compatibility with the palette UI.
        const inputPorts: ReadonlyArray<{ slot: string; optional: boolean; type: string }> = [];
        const outputPorts: ReadonlyArray<{ slot: string; optional: boolean; type: string }> = [];

        ctx.nodes.register("Physics.Scene:scene", () => createSceneItem() as never, {
            label: "Scene",
            category: "Physics.Scene",
            inputPorts,
            outputPorts,
        });
        ctx.nodes.register("Physics.Scene:earth", () => createEarthSceneItem() as never, {
            label: EARTH_PRESET.name,
            category: "Physics.Scene",
            inputPorts,
            outputPorts,
        });
        ctx.nodes.register("Physics.Scene:moon", () => createMoonSceneItem() as never, {
            label: MOON_PRESET.name,
            category: "Physics.Scene",
            inputPorts,
            outputPorts,
        });
        ctx.nodes.register("Physics.Scene:mars", () => createMarsSceneItem() as never, {
            label: MARS_PRESET.name,
            category: "Physics.Scene",
            inputPorts,
            outputPorts,
        });
        ctx.nodes.register("Physics.Scene:orbital", () => createOrbitalSceneItem() as never, {
            label: ORBITAL_PRESET.name,
            category: "Physics.Scene",
            inputPorts,
            outputPorts,
        });
    },
};
