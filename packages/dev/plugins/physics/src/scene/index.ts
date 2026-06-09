import { V1_SPECIES_ORDER } from "spikypanda-core";
import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
// V1_SPECIES_ORDER is still imported because the AtmosphereGateNode
// registration below uses it to enumerate its A_/B_ mole-fraction
// I/O slots. The atmosphere itself no longer leaks the V1 species
// schema to the editor: its species list is purely composition-driven.
void V1_SPECIES_ORDER;
import {
    AtmosphereGateNode,
    createAtmosphereGateNode,
    GATE_IN_ATMOSPHERE_A,
    GATE_IN_ATMOSPHERE_B,
    GATE_OUT_FLOW_RATE,
} from "./atmosphere-gate.node.js";
import {
    ATMOSPHERE_LAYER_IN_COMPOSITION,
    AtmosphereLayerNode,
    createAtmosphereLayerNode,
} from "./atmosphere-layer.node.js";
import {
    ATMOSPHERE_IN_LAYER_PREFIX,
    AtmosphereNode,
    createAtmosphereNode,
} from "./atmosphere.node.js";
import {
    createEarthSceneItem,
    createIssCabinSceneItem,
    createMarsSceneItem,
    createMoonSceneItem,
    createOrbitalSceneItem,
    EARTH_PRESET,
    ISS_CABIN_PRESET,
    MARS_PRESET,
    MOON_PRESET,
    ORBITAL_PRESET,
    SCENE_PRESETS,
} from "./presets.js";
import { createSceneItem, SceneItem } from "./scene.item.js";
import type { SceneSourceResolver } from "./scene.item.js";

export {
    AtmosphereGateNode,
    AtmosphereLayerNode,
    AtmosphereNode,
    createAtmosphereGateNode,
    createAtmosphereLayerNode,
    createAtmosphereNode,
    SceneItem,
    createSceneItem,
    createEarthSceneItem,
    createMoonSceneItem,
    createMarsSceneItem,
    createOrbitalSceneItem,
    createIssCabinSceneItem,
    EARTH_PRESET,
    MOON_PRESET,
    MARS_PRESET,
    ORBITAL_PRESET,
    ISS_CABIN_PRESET,
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
        // SceneItem is a GraphItem (not a RuntimeNode), but the editor
        // still needs to render its config-link anchors so the user
        // can drag dashed wires between Scene ↔ Atmosphere /
        // Scene ↔ Solver / Scene ↔ Sim.Graph / Scene ↔ shared nodes.
        //
        // The port types are all config-link family (P5a): the
        // dashed-cable renderer triggers automatically. The runtime
        // layer does NOT allocate channels for these because the
        // SceneItem never enters the scheduler — the editor's session-
        // builder reads the resulting Connections at bind time and
        // populates the SceneItem's *ItemId fields.
        const sceneInputPorts = [
            { slot: "atmosphere_in", optional: true, type: "atmosphere" },
            { slot: "solver_in_0", optional: true, type: "solver" },
            { slot: "shared_in_0", optional: true, type: "shared" },
            // Data input ports — explicit per-property overrides. When
            // wired, the corresponding _<property>SourceId on SceneItem
            // is populated by the session-builder, and buildStateView
            // resolves through it. Priority (highest first):
            //   1. Data wire on this port  (e.g. publisher → gravity_in)
            //   2. Atmosphere binding via atmosphere_in (temperature /
            //      pressure / density only)
            //   3. SceneItem editable default.
            { slot: "gravity_in", optional: true, type: "vec3" },
            { slot: "temperature_in", optional: true, type: "float" },
            { slot: "pressure_in", optional: true, type: "float" },
            { slot: "density_in", optional: true, type: "float" },
            { slot: "time_scale_in", optional: true, type: "float" },
            { slot: "local_position_in", optional: true, type: "vec3" },
            { slot: "local_rotation_in", optional: true, type: "vec4" },
            { slot: "local_scale_in", optional: true, type: "vec3" },
        ] as const;
        const sceneOutputPorts = [{ slot: "scene_out", optional: true, type: "scene" }] as const;
        const sceneVariadicInput = [
            { prefix: "solver_in_", type: "solver" as const },
            { prefix: "shared_in_", type: "shared" as const },
        ];

        const sceneDocPath = ctx.assetUrl("docs/physics/scene/scene.md");
        const registerScene = (typeId: string, factory: () => unknown, label: string): void => {
            ctx.nodes.register(typeId, factory as never, {
                label,
                category: "Physics.Scene",
                docPath: sceneDocPath,
                inputPorts: [...sceneInputPorts],
                outputPorts: [...sceneOutputPorts],
                variadicInput: sceneVariadicInput,
            });
        };
        registerScene("Physics.Scene:scene", createSceneItem, "Scene");
        registerScene("Physics.Scene:earth", createEarthSceneItem, EARTH_PRESET.name);
        registerScene("Physics.Scene:moon", createMoonSceneItem, MOON_PRESET.name);
        registerScene("Physics.Scene:mars", createMarsSceneItem, MARS_PRESET.name);
        registerScene("Physics.Scene:orbital", createOrbitalSceneItem, ORBITAL_PRESET.name);
        registerScene("Physics.Scene:iss-cabin", createIssCabinSceneItem, ISS_CABIN_PRESET.name);

        // ── Atmosphere Layer (was Physics.Scene:atmosphere-state)
        //
        // The IIntegrable state-carrier. A user wires this Layer's
        // `layer_out` anchor into an Atmosphere container's variadic
        // `layer_in_<k>`. Each Layer has ONE composition_in slot;
        // particulates ride along inside the bound Composition (their
        // own `particulate_in_<k>` slots live on the Composition node).
        // Species schema is composition-driven (no V1-hardcoded ports).
        const layerInputs: ReadonlyArray<{ slot: string; optional: boolean; type: string }> = [
            { slot: ATMOSPHERE_LAYER_IN_COMPOSITION, optional: true, type: "composition" },
        ];
        const layerOutputs: ReadonlyArray<{ slot: string; optional: boolean; type: string }> = [
            { slot: "pressure", optional: true, type: "float" },
            { slot: "temperature", optional: true, type: "float" },
            { slot: "density", optional: true, type: "float" },
            { slot: "layer_out", optional: true, type: "layer" },
        ];
        ctx.nodes.register("Physics.Scene:atmosphere-layer", () => createAtmosphereLayerNode() as never, {
            label: "Atmosphere Layer",
            category: "Physics.Scene",
            docPath: ctx.assetUrl("docs/physics/scene/atmosphere-layer.md"),
            inputPorts: layerInputs,
            outputPorts: layerOutputs,
        });

        // ── Atmosphere Container ─────────────────────────────────────
        //
        // Composite IIntegrable that holds 1..N Layers. Default = 1
        // hidden internal Layer: drop "Atmosphere" → working atmosphere
        // with V1 fallback config (no extra wiring needed). Wire one or
        // more Layers into `layer_in_<k>` to opt into multi-layer
        // stratification; the hidden default is then suppressed.
        // Aggregates pressure/temperature/density are volume-weighted
        // across the active layer set.
        const atmosphereInputs: ReadonlyArray<{ slot: string; optional: boolean; type: string }> = [
            { slot: `${ATMOSPHERE_IN_LAYER_PREFIX}0`, optional: true, type: "layer" },
        ];
        const atmosphereOutputs: ReadonlyArray<{ slot: string; optional: boolean; type: string }> = [
            { slot: "pressure", optional: true, type: "float" },
            { slot: "temperature", optional: true, type: "float" },
            { slot: "density", optional: true, type: "float" },
            { slot: "atmosphere_out", optional: true, type: "atmosphere" },
        ];
        ctx.nodes.register("Physics.Scene:atmosphere", () => createAtmosphereNode() as never, {
            label: "Atmosphere",
            category: "Physics.Scene",
            docPath: ctx.assetUrl("docs/physics/scene/atmosphere.md"),
            inputPorts: atmosphereInputs,
            outputPorts: atmosphereOutputs,
            variadicInput: [{ prefix: ATMOSPHERE_IN_LAYER_PREFIX, type: "layer" as const }],
        });

        // ── F10d + #3 refactor (2026-06-09): AtmosphereGateNode ────
        // Couples two AtmosphereStateNodes via direct config-link refs
        // (no more per-species data channels). The gate reads each
        // atmosphere's pressure / temperature / mole fractions through
        // the IAtmosphereGateHandle methods and writes mass deltas via
        // applyMassDelta. Species enumeration is the union of both
        // bound compositions; conservation is native (the gate adds
        // ±delta in the same fire()).
        const gateInputs = [
            { slot: GATE_IN_ATMOSPHERE_A, optional: true, type: "atmosphere" },
            { slot: GATE_IN_ATMOSPHERE_B, optional: true, type: "atmosphere" },
        ];
        const gateOutputs = [
            { slot: GATE_OUT_FLOW_RATE, optional: true, type: "float" },
        ];
        ctx.nodes.register("Physics.Scene:atmosphere-gate", () => createAtmosphereGateNode() as never, {
            label: "Atmosphere Gate",
            category: "Physics.Scene",
            docPath: ctx.assetUrl("docs/physics/scene/atmosphere-gate.md"),
            inputPorts: gateInputs,
            outputPorts: gateOutputs,
        });
    },
};
