/**
 * Unit tests for the Physics.Scene presets (Earth, Moon, Mars,
 * Orbital, ISS Cabin) after the P6.1 Quantity-migration.
 *
 * Each preset is verified at three levels:
 *   1. The static `IScenePreset` constants carry the documented
 *      gravity / temperature / pressure / timeScale values via the
 *      Quantity API (Temperature in K, Pressure in Pa, gravity as
 *      ICartesian3 in m/s²).
 *   2. Each preset references an `IAtmospherePreset` (or null for
 *      pure-vacuum environments), and the wiring matches the
 *      narrative documentation (Earth → humid air, Mars → CO2-rich,
 *      Moon / Orbital exterior → vacuum, ISS Cabin → ECLSS).
 *   3. The preset factory builds a `SceneItem` whose Quantity
 *      getters (`temperatureQ` / `pressureQ`) match the preset
 *      constants exactly — the storage round-trip never loses
 *      precision through the canonical-SI scalar form.
 */
import {
    Pressure,
    Temperature,
    type IAtmospherePreset,
    ATMOSPHERE_PRESETS,
} from "../../dev/core/src";
import {
    EARTH_PRESET,
    ISS_CABIN_PRESET,
    MARS_PRESET,
    MOON_PRESET,
    ORBITAL_PRESET,
    SCENE_PRESETS,
    SceneItem,
    createEarthSceneItem,
    createIssCabinSceneItem,
    createMarsSceneItem,
    createMoonSceneItem,
    createOrbitalSceneItem,
} from "../../dev/plugins/physics/src/index";
import type { IScenePreset } from "../../dev/plugins/physics/src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertItemMatchesPreset(item: SceneItem, preset: IScenePreset): void {
    expect(item.gravity.x).toBeCloseTo(preset.gravity.x, 12);
    expect(item.gravity.y).toBeCloseTo(preset.gravity.y, 12);
    expect(item.gravity.z).toBeCloseTo(preset.gravity.z, 12);
    expect(item.temperatureQ.getValue(Temperature.Units.k)).toBeCloseTo(preset.temperature.getValue(Temperature.Units.k), 9);
    expect(item.pressureQ.getValue(Pressure.Units.Pa)).toBeCloseTo(preset.pressure.getValue(Pressure.Units.Pa), 6);
    expect(item.timeScale).toBeCloseTo(preset.timeScale, 12);
}

// ---------------------------------------------------------------------------
// Documented numerical contract — Quantity values
// ---------------------------------------------------------------------------

describe("Scene preset constants — gravity / temperature / pressure / atmosphere", () => {
    it("EARTH_PRESET: g=-9.81 m/s², T=293.15 K (20 °C), P=1 atm, humid air atmosphere", () => {
        expect(EARTH_PRESET.gravity.z).toBeCloseTo(-9.81, 6);
        expect(EARTH_PRESET.temperature).toBeInstanceOf(Temperature);
        expect(EARTH_PRESET.temperature.getValue(Temperature.Units.k)).toBeCloseTo(293.15, 6);
        expect(EARTH_PRESET.temperature.getValue(Temperature.Units.c)).toBeCloseTo(20, 6);
        expect(EARTH_PRESET.pressure).toBeInstanceOf(Pressure);
        expect(EARTH_PRESET.pressure.getValue(Pressure.Units.Pa)).toBe(101325);
        expect(EARTH_PRESET.pressure.getValue(Pressure.Units.atm)).toBeCloseTo(1, 6);
        expect(EARTH_PRESET.atmosphere).toBe(ATMOSPHERE_PRESETS.earthHumidAirSeaLevel);
        expect(EARTH_PRESET.name).toBe("Earth");
    });

    it("MOON_PRESET: g=-1.625 m/s², T=250 K, P=0 (vacuum atmosphere)", () => {
        expect(MOON_PRESET.gravity.z).toBeCloseTo(-1.625, 6);
        expect(MOON_PRESET.temperature.getValue(Temperature.Units.k)).toBe(250);
        expect(MOON_PRESET.pressure.getValue(Pressure.Units.Pa)).toBe(0);
        expect(MOON_PRESET.atmosphere).toBe(ATMOSPHERE_PRESETS.vacuum);
    });

    it("MARS_PRESET: g=-3.721 m/s², T=210 K, P=600 Pa, CO2-rich atmosphere", () => {
        expect(MARS_PRESET.gravity.z).toBeCloseTo(-3.721, 6);
        expect(MARS_PRESET.temperature.getValue(Temperature.Units.k)).toBe(210);
        expect(MARS_PRESET.pressure.getValue(Pressure.Units.Pa)).toBe(600);
        expect(MARS_PRESET.atmosphere).toBe(ATMOSPHERE_PRESETS.marsAtmosphereMean);
    });

    it("ORBITAL_PRESET: g=0, T≈278.6 K, P=0 (vacuum atmosphere)", () => {
        expect(ORBITAL_PRESET.gravity.x).toBe(0);
        expect(ORBITAL_PRESET.gravity.y).toBe(0);
        expect(ORBITAL_PRESET.gravity.z).toBe(0);
        expect(ORBITAL_PRESET.temperature.getValue(Temperature.Units.k)).toBeCloseTo(278.6, 1);
        expect(ORBITAL_PRESET.pressure.getValue(Pressure.Units.Pa)).toBe(0);
        expect(ORBITAL_PRESET.atmosphere).toBe(ATMOSPHERE_PRESETS.vacuum);
    });

    it("ISS_CABIN_PRESET: g=0, T≈294.15 K (21 °C), P=1 atm, ECLSS atmosphere", () => {
        expect(ISS_CABIN_PRESET.gravity.z).toBe(0);
        expect(ISS_CABIN_PRESET.temperature.getValue(Temperature.Units.c)).toBeCloseTo(21, 1);
        expect(ISS_CABIN_PRESET.pressure.getValue(Pressure.Units.atm)).toBeCloseTo(1, 6);
        expect(ISS_CABIN_PRESET.atmosphere).toBe(ATMOSPHERE_PRESETS.issCabinECLSS);
    });

    it("all preset constants are frozen at every level", () => {
        for (const preset of [EARTH_PRESET, MOON_PRESET, MARS_PRESET, ORBITAL_PRESET, ISS_CABIN_PRESET]) {
            expect(Object.isFrozen(preset)).toBe(true);
            expect(Object.isFrozen(preset.gravity)).toBe(true);
            expect(Object.isFrozen(preset.temperature)).toBe(true);
            expect(Object.isFrozen(preset.pressure)).toBe(true);
        }
        expect(Object.isFrozen(SCENE_PRESETS)).toBe(true);
    });

    it("SCENE_PRESETS lookup table is in sync with the individual constants", () => {
        expect(SCENE_PRESETS.earth).toBe(EARTH_PRESET);
        expect(SCENE_PRESETS.moon).toBe(MOON_PRESET);
        expect(SCENE_PRESETS.mars).toBe(MARS_PRESET);
        expect(SCENE_PRESETS.orbital).toBe(ORBITAL_PRESET);
        expect(SCENE_PRESETS.issCabin).toBe(ISS_CABIN_PRESET);
    });

    it("every preset's atmosphere reference is a valid IAtmospherePreset from core", () => {
        const validKeys = new Set(Object.keys(ATMOSPHERE_PRESETS));
        for (const preset of Object.values(SCENE_PRESETS)) {
            const atmo = preset.atmosphere as IAtmospherePreset | undefined;
            expect(atmo).toBeDefined();
            expect(validKeys.has(atmo!.id)).toBe(true);
        }
    });
});

// ---------------------------------------------------------------------------
// Factory functions produce SceneItems with the preset editables applied
// ---------------------------------------------------------------------------

describe("Scene preset factories apply Quantity values via SceneItem accessors", () => {
    it("createEarthSceneItem applies EARTH_PRESET (Quantity round-trip)", () => {
        assertItemMatchesPreset(createEarthSceneItem(), EARTH_PRESET);
    });
    it("createMoonSceneItem applies MOON_PRESET (vacuum pressure preserved)", () => {
        const item = createMoonSceneItem();
        assertItemMatchesPreset(item, MOON_PRESET);
        expect(item.pressure).toBe(0);
    });
    it("createMarsSceneItem applies MARS_PRESET (thin atmosphere = 600 Pa)", () => {
        const item = createMarsSceneItem();
        assertItemMatchesPreset(item, MARS_PRESET);
        expect(item.pressure).toBe(600);
    });
    it("createOrbitalSceneItem applies ORBITAL_PRESET", () => {
        assertItemMatchesPreset(createOrbitalSceneItem(), ORBITAL_PRESET);
    });
    it("createIssCabinSceneItem applies ISS_CABIN_PRESET (sea-level cabin)", () => {
        const item = createIssCabinSceneItem();
        assertItemMatchesPreset(item, ISS_CABIN_PRESET);
        expect(item.pressure).toBe(101325);
    });

    it("factory clones the preset Quantities — editing the SceneItem does not poison the preset", () => {
        const item = createEarthSceneItem();
        const beforeK = EARTH_PRESET.temperature.getValue(Temperature.Units.k);
        item.temperature = 250;
        expect(EARTH_PRESET.temperature.getValue(Temperature.Units.k)).toBe(beforeK);
    });
});
