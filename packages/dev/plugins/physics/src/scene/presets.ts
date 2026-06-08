import { Cartesian3 } from "spikypanda-core";
import { SceneItem } from "./scene.item.js";

/**
 * Frozen-struct snapshot of a scene preset. Stores only the scalar
 * latents (gravity / temperature / pressure / timeScale) — the
 * transform, atmosphere, solvers, and shared nodes are user-edited
 * after dropping the preset, so V1 presets don't try to pre-fill them.
 */
export interface IScenePreset {
    /** Display label, shown in the palette and as the node header. */
    readonly name: string;
    /** One-sentence summary of the preset's intended use. */
    readonly description: string;
    /** Gravity acceleration [m/s²], body frame, +Z up. */
    readonly gravity: Readonly<{ x: number; y: number; z: number }>;
    /** Ambient temperature [K]. */
    readonly temperature: number;
    /** Ambient pressure [Pa]. */
    readonly pressure: number;
    /** Sim-to-wall time multiplier. 1.0 = real time. */
    readonly timeScale: number;
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
 * Earth surface, 20 °C lab default. Mirrors the SceneItem constructor
 * defaults — the preset exists so users get an explicit "Earth"
 * palette entry that stays in sync with the generic Scene defaults
 * even if those evolve.
 */
export const EARTH_PRESET: IScenePreset = Object.freeze({
    name: "Earth",
    description: "Earth surface, ICAO standard atmosphere at 20 °C / sea level.",
    gravity: Object.freeze({ x: 0, y: 0, z: -9.81 }),
    temperature: 293.15,
    pressure: 101325,
    timeScale: 1.0,
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
    gravity: Object.freeze({ x: 0, y: 0, z: -1.625 }),
    temperature: 250,
    pressure: 0,
    timeScale: 1.0,
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
    gravity: Object.freeze({ x: 0, y: 0, z: -3.721 }),
    temperature: 210,
    pressure: 600,
    timeScale: 1.0,
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
    gravity: Object.freeze({ x: 0, y: 0, z: 0 }),
    temperature: 278.6,
    pressure: 0,
    timeScale: 1.0,
});

/** Lookup table for tests + future preset-picker UI. */
export const SCENE_PRESETS: Readonly<Record<string, IScenePreset>> = Object.freeze({
    earth: EARTH_PRESET,
    moon: MOON_PRESET,
    mars: MARS_PRESET,
    orbital: ORBITAL_PRESET,
});

// ---------------------------------------------------------------------------
// Factory functions — one per preset. Each constructs a SceneItem and
// pushes the preset values through the editable setters so the item
// behaves identically to a freshly-dropped Scene that the user has
// hand-configured (LiveBinder propagation fires, undo history works).
// ---------------------------------------------------------------------------

function applyPreset(item: SceneItem, preset: IScenePreset): SceneItem {
    item.gravity = new Cartesian3(preset.gravity.x, preset.gravity.y, preset.gravity.z);
    item.temperature = preset.temperature;
    item.pressure = preset.pressure;
    item.timeScale = preset.timeScale;
    return item;
}

export function createEarthSceneItem(): SceneItem {
    return applyPreset(new SceneItem(), EARTH_PRESET);
}
export function createMoonSceneItem(): SceneItem {
    return applyPreset(new SceneItem(), MOON_PRESET);
}
export function createMarsSceneItem(): SceneItem {
    return applyPreset(new SceneItem(), MARS_PRESET);
}
export function createOrbitalSceneItem(): SceneItem {
    return applyPreset(new SceneItem(), ORBITAL_PRESET);
}
