import { Cartesian3 } from "spikypanda-core";
import type { IScene } from "../transform/scene.js";
import { SceneNode } from "./scene.node.js";

/**
 * Named environmental preset: an immutable IScene snapshot for a known
 * physical context (Earth surface, Moon surface, ...). Used both as a
 * standalone constant (e.g. as the source of truth for a unit test) and
 * as the source of editable defaults a preset SceneNode factory pushes
 * into its instance after construction.
 *
 * `description` is intentionally human-readable — surfaced in the
 * property panel's preset picker and in the manifest entry. Keep it
 * under ~80 chars so the v2 editor's tooltip stays readable.
 */
export interface IScenePreset {
    /** Display label, shown in the palette and as the node header. */
    readonly name: string;
    /** One-sentence summary of the preset's intended use. */
    readonly description: string;
    /** Frozen IScene snapshot with the preset's defaults applied. */
    readonly scene: IScene;
}

// ---------------------------------------------------------------------------
// Preset constants
// ---------------------------------------------------------------------------
// Sources for the numerical values:
//   Earth   : ICAO standard atmosphere @ sea level; gravity = standard.
//   Moon    : Apollo lunar surface mean; pressure ≈ vacuum.
//   Mars    : Mars Climate Database mean; Curiosity/MSL pressure record.
//   Orbital : free-fall, hard vacuum, sun-illuminated grey-body thermal eq.
// All values are SI; gravity is a body-frame vector with -Z as "down"
// (engineering / robotics convention: floor plane is X-Y, altitude +Z).
// ---------------------------------------------------------------------------

/**
 * Earth surface, 20 °C lab default. Mirrors DEFAULT_SCENE exactly — the
 * preset exists so users get an explicit "Earth" palette entry that
 * stays in sync with the generic Scene defaults even if those evolve.
 */
export const EARTH_PRESET: IScenePreset = Object.freeze({
    name: "Earth",
    description: "Earth surface, ICAO standard atmosphere at 20 °C / sea level.",
    scene: Object.freeze({
        gravity: Object.freeze({ x: 0, y: 0, z: -9.81 }),
        temperature: 293.15,
        pressure: 101325,
        timeScale: 1.0,
    }),
});

/**
 * Moon surface, lunar daytime mean. Gravity from the IAU standard
 * (1.625 m/s²). Temperature is a defensible engineering middle of the
 * highly variable equatorial day/night range (~100 K to ~390 K).
 * Pressure approximated as near-vacuum (3e-15 Pa exosphere is too
 * small to matter for any sim downstream).
 */
export const MOON_PRESET: IScenePreset = Object.freeze({
    name: "Moon",
    description: "Lunar surface, mean equatorial conditions. Near-vacuum exosphere.",
    scene: Object.freeze({
        gravity: Object.freeze({ x: 0, y: 0, z: -1.625 }),
        temperature: 250,
        pressure: 0,
        timeScale: 1.0,
    }),
});

/**
 * Mars surface, mean equatorial conditions. Gravity from Mars Climate
 * Sounder mean (3.721 m/s²). Pressure 600 Pa is the annual mean (varies
 * seasonally 400-870 Pa as CO₂ condenses on the poles). Temperature 210
 * K is the global annual mean (-63 °C).
 */
export const MARS_PRESET: IScenePreset = Object.freeze({
    name: "Mars",
    description: "Mars surface, MSL mean. Thin CO₂ atmosphere at ~600 Pa, ~210 K.",
    scene: Object.freeze({
        gravity: Object.freeze({ x: 0, y: 0, z: -3.721 }),
        temperature: 210,
        pressure: 600,
        timeScale: 1.0,
    }),
});

/**
 * Free-space orbital reference: hard vacuum, microgravity free-fall,
 * sun-illuminated grey-body thermal equilibrium at 1 AU. Use for
 * external orbital bodies (CubeSat skin, EVA tool, deployed boom).
 *
 * Temperature 278.6 K is the equilibrium temperature of a passive
 * gray-body sphere with albedo = 0.3 receiving solar flux at 1 AU
 * (S₀ = 1361 W/m²); a defensible neutral default that sits between
 * sun-side (~360 K for a black sphere) and shadow (~0 K). For ISS
 * cabin interior conditions, tweak pressure ← 101325, temperature ←
 * 293.15 on this instance after dropping.
 */
export const ORBITAL_PRESET: IScenePreset = Object.freeze({
    name: "Orbital",
    description: "Free space: hard vacuum, microgravity, ~278 K grey-body equilibrium at 1 AU.",
    scene: Object.freeze({
        gravity: Object.freeze({ x: 0, y: 0, z: 0 }),
        temperature: 278.6,
        pressure: 0,
        timeScale: 1.0,
    }),
});

/** Lookup table for tests + future preset-picker UI. */
export const SCENE_PRESETS: Readonly<Record<string, IScenePreset>> = Object.freeze({
    earth: EARTH_PRESET,
    moon: MOON_PRESET,
    mars: MARS_PRESET,
    orbital: ORBITAL_PRESET,
});

// ---------------------------------------------------------------------------
// Factory functions — one per preset. Each constructs a SceneNode and
// pushes the preset values through the editable setters so the node
// behaves identically to a freshly-dropped Scene that the user has
// hand-configured (LiveBinder propagation fires, undo history works).
// ---------------------------------------------------------------------------

function applyPreset(node: SceneNode, preset: IScenePreset): SceneNode {
    const { gravity, temperature, pressure, timeScale } = preset.scene;
    node.gravity = new Cartesian3(gravity.x, gravity.y, gravity.z);
    node.temperature = temperature;
    node.pressure = pressure;
    node.timeScale = timeScale;
    return node;
}

export function createEarthSceneNode(): SceneNode {
    return applyPreset(new SceneNode(), EARTH_PRESET);
}
export function createMoonSceneNode(): SceneNode {
    return applyPreset(new SceneNode(), MOON_PRESET);
}
export function createMarsSceneNode(): SceneNode {
    return applyPreset(new SceneNode(), MARS_PRESET);
}
export function createOrbitalSceneNode(): SceneNode {
    return applyPreset(new SceneNode(), ORBITAL_PRESET);
}
