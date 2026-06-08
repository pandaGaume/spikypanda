import { ATMOSPHERE_PRESETS, Cartesian3, Pressure, Temperature } from "spikypanda-core";
import type { IAtmospherePreset, ICartesian3 } from "spikypanda-core";
import { SceneItem } from "./scene.item.js";

/**
 * Frozen-Quantity snapshot of a scene preset.
 *
 * After P2.6 the SceneItem stores `temperature` in canonical SI
 * (kelvin) and exposes a `Temperature` Quantity getter / setter for
 * unit-aware code. The preset contract mirrors that: every numeric
 * latent that has a unit travels as a `Quantity` instance (Temperature,
 * Pressure) so the consumer side never has to guess "is this K or °C?"
 * /"is this Pa or atm?".
 *
 * Vector fields (gravity) stay `ICartesian3` (V1 scope — vector
 * Quantity deferred). Dimensionless fields (timeScale) stay plain
 * numbers.
 *
 * The `atmosphere` reference points at an `IAtmospherePreset` from
 * `core/sim/chemical.species` so the editor can offer "Earth Scene =
 * humid air at sea level, Mars Scene = thin CO2" as one-click drops.
 * V1 wires this metadata-only: the factory does NOT auto-instantiate
 * an AtmosphereStateNode (the user drops one separately and picks
 * its preset). A future iteration may add a "Scene with atmosphere"
 * compound palette entry that drops both nodes pre-wired.
 */
export interface IScenePreset {
    /** Display label, shown in the palette and as the node header. */
    readonly name: string;
    /** One-sentence summary of the preset's intended use. */
    readonly description: string;
    /** Gravity acceleration in m/s², body frame, +Z up. Frozen
     *  Cartesian3 instance so the preset never gets mutated. */
    readonly gravity: ICartesian3;
    /** Ambient temperature as a `Temperature` Quantity. Frozen. */
    readonly temperature: Temperature;
    /** Ambient pressure as a `Pressure` Quantity. Frozen. */
    readonly pressure: Pressure;
    /** Sim-to-wall time multiplier. Dimensionless, plain number. */
    readonly timeScale: number;
    /** Canonical atmosphere preset associated with this scene. The
     *  editor surfaces this in the property panel as the default
     *  `initialAtmosphere` for any AtmosphereStateNode the user
     *  drops alongside the Scene. `undefined` when the preset is
     *  about a vacuum / non-gaseous environment that doesn't
     *  warrant an atmosphere model (Moon, Orbital exterior). */
    readonly atmosphere?: IAtmospherePreset;
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

/** Earth surface, 20 °C lab default. */
export const EARTH_PRESET: IScenePreset = Object.freeze({
    name: "Earth",
    description: "Earth surface, ICAO standard atmosphere at 20 °C / sea level.",
    gravity: Object.freeze(new Cartesian3(0, 0, -9.81)),
    temperature: Object.freeze(new Temperature(293.15, Temperature.Units.k)) as Temperature,
    pressure: Object.freeze(new Pressure(101325, Pressure.Units.Pa)) as Pressure,
    timeScale: 1.0,
    atmosphere: ATMOSPHERE_PRESETS.earthHumidAirSeaLevel,
});

/** Moon surface, lunar daytime mean. */
export const MOON_PRESET: IScenePreset = Object.freeze({
    name: "Moon",
    description: "Lunar surface, mean equatorial conditions. Near-vacuum exosphere.",
    gravity: Object.freeze(new Cartesian3(0, 0, -1.625)),
    temperature: Object.freeze(new Temperature(250, Temperature.Units.k)) as Temperature,
    pressure: Object.freeze(new Pressure(0, Pressure.Units.Pa)) as Pressure,
    timeScale: 1.0,
    atmosphere: ATMOSPHERE_PRESETS.vacuum,
});

/** Mars surface, mean equatorial conditions. */
export const MARS_PRESET: IScenePreset = Object.freeze({
    name: "Mars",
    description: "Mars surface, MSL mean. Thin CO2 atmosphere at ~600 Pa, ~210 K.",
    gravity: Object.freeze(new Cartesian3(0, 0, -3.721)),
    temperature: Object.freeze(new Temperature(210, Temperature.Units.k)) as Temperature,
    pressure: Object.freeze(new Pressure(600, Pressure.Units.Pa)) as Pressure,
    timeScale: 1.0,
    atmosphere: ATMOSPHERE_PRESETS.marsAtmosphereMean,
});

/** Free-space orbital reference: vacuum + microgravity. */
export const ORBITAL_PRESET: IScenePreset = Object.freeze({
    name: "Orbital",
    description: "Free space: hard vacuum, microgravity, ~278 K grey-body equilibrium at 1 AU.",
    gravity: Object.freeze(new Cartesian3(0, 0, 0)),
    temperature: Object.freeze(new Temperature(278.6, Temperature.Units.k)) as Temperature,
    pressure: Object.freeze(new Pressure(0, Pressure.Units.Pa)) as Pressure,
    timeScale: 1.0,
    atmosphere: ATMOSPHERE_PRESETS.vacuum,
});

/**
 * ISS cabin preset — Earth dry air at the ECLSS spec, used for
 * crewed habitat interiors. Gravity is zero (orbital free-fall) but
 * the pressure is sea-level cabin so the AtmosphereStateNode
 * derivation still works. Distinct from `Orbital` because Orbital is
 * the EXTERIOR (vacuum) reference; ISS Cabin is the INTERIOR.
 */
export const ISS_CABIN_PRESET: IScenePreset = Object.freeze({
    name: "ISS Cabin",
    description: "ISS pressurised cabin, ECLSS spec (1 atm, ~21 °C, CO2 cap at 3000 ppm).",
    gravity: Object.freeze(new Cartesian3(0, 0, 0)),
    temperature: Object.freeze(new Temperature(294.15, Temperature.Units.k)) as Temperature,
    pressure: Object.freeze(new Pressure(101325, Pressure.Units.Pa)) as Pressure,
    timeScale: 1.0,
    atmosphere: ATMOSPHERE_PRESETS.issCabinECLSS,
});

/** Lookup table for tests + future preset-picker UI. */
export const SCENE_PRESETS: Readonly<Record<string, IScenePreset>> = Object.freeze({
    earth: EARTH_PRESET,
    moon: MOON_PRESET,
    mars: MARS_PRESET,
    orbital: ORBITAL_PRESET,
    issCabin: ISS_CABIN_PRESET,
});

// ---------------------------------------------------------------------------
// Factory functions — one per preset.
//
// After P2.6 the SceneItem exposes Quantity-aware accessors
// (`temperatureQ`, `pressureQ`). The factories use them so a freshly-
// dropped preset round-trips through the Quantity layer (no implicit
// "is this K or °C?" assumption when the preset eventually moves to
// a non-canonical storage unit).
// ---------------------------------------------------------------------------

function applyPreset(item: SceneItem, preset: IScenePreset): SceneItem {
    item.gravity = new Cartesian3(preset.gravity.x, preset.gravity.y, preset.gravity.z);
    item.temperatureQ = preset.temperature.clone() as Temperature;
    item.pressureQ = preset.pressure.clone() as Pressure;
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
export function createIssCabinSceneItem(): SceneItem {
    return applyPreset(new SceneItem(), ISS_CABIN_PRESET);
}
