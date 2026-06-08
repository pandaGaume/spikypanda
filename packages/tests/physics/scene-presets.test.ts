/**
 * Unit tests for the 4 Physics.Scene presets (Earth, Moon, Mars, Orbital).
 *
 * Each preset is verified at two levels:
 *   1. The static IScenePreset constant carries the documented values,
 *      and is frozen at every level (defensive contract).
 *   2. The preset factory builds a SceneItem whose editables match the
 *      preset constants exactly (no drift between data + factory).
 *
 * In the v2 model SceneItem is a descriptor (GraphItem, NOT RuntimeNode),
 * so there is no longer a fire()/publish path to assert against. The
 * editables-to-SceneStateView pipeline is exercised by the
 * scene.test.ts companion suite via SceneItem.buildStateView().
 */
import {
    EARTH_PRESET,
    MARS_PRESET,
    MOON_PRESET,
    ORBITAL_PRESET,
    SCENE_PRESETS,
    SceneItem,
    createEarthSceneItem,
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
    expect(item.temperature).toBeCloseTo(preset.temperature, 12);
    expect(item.pressure).toBeCloseTo(preset.pressure, 12);
    expect(item.timeScale).toBeCloseTo(preset.timeScale, 12);
}

// ---------------------------------------------------------------------------
// Documented numerical contract
// ---------------------------------------------------------------------------

describe("Scene preset constants", () => {
    it("EARTH_PRESET has Earth-surface values (Z-down convention)", () => {
        expect(EARTH_PRESET.gravity.x).toBe(0);
        expect(EARTH_PRESET.gravity.y).toBe(0);
        expect(EARTH_PRESET.gravity.z).toBeCloseTo(-9.81, 6);
        expect(EARTH_PRESET.temperature).toBeCloseTo(293.15, 6);
        expect(EARTH_PRESET.pressure).toBe(101325);
        expect(EARTH_PRESET.timeScale).toBe(1);
        expect(EARTH_PRESET.name).toBe("Earth");
    });

    it("MOON_PRESET has lunar gravity (Z-down), ~250 K, near-vacuum", () => {
        expect(MOON_PRESET.gravity.x).toBe(0);
        expect(MOON_PRESET.gravity.y).toBe(0);
        expect(MOON_PRESET.gravity.z).toBeCloseTo(-1.625, 6);
        expect(MOON_PRESET.temperature).toBe(250);
        expect(MOON_PRESET.pressure).toBe(0);
        expect(MOON_PRESET.name).toBe("Moon");
    });

    it("MARS_PRESET has Martian gravity (Z-down), 210 K, 600 Pa", () => {
        expect(MARS_PRESET.gravity.x).toBe(0);
        expect(MARS_PRESET.gravity.y).toBe(0);
        expect(MARS_PRESET.gravity.z).toBeCloseTo(-3.721, 6);
        expect(MARS_PRESET.temperature).toBe(210);
        expect(MARS_PRESET.pressure).toBe(600);
        expect(MARS_PRESET.name).toBe("Mars");
    });

    it("ORBITAL_PRESET is free-space vacuum at grey-body thermal equilibrium", () => {
        expect(ORBITAL_PRESET.gravity.x).toBe(0);
        expect(ORBITAL_PRESET.gravity.y).toBe(0);
        expect(ORBITAL_PRESET.gravity.z).toBe(0);
        expect(ORBITAL_PRESET.temperature).toBeCloseTo(278.6, 1);
        expect(ORBITAL_PRESET.pressure).toBe(0);
        expect(ORBITAL_PRESET.name).toBe("Orbital");
    });

    it("all preset constants are frozen at every level", () => {
        for (const preset of [EARTH_PRESET, MOON_PRESET, MARS_PRESET, ORBITAL_PRESET]) {
            expect(Object.isFrozen(preset)).toBe(true);
            expect(Object.isFrozen(preset.gravity)).toBe(true);
        }
        expect(Object.isFrozen(SCENE_PRESETS)).toBe(true);
    });

    it("SCENE_PRESETS lookup table is in sync with the 4 individual constants", () => {
        expect(SCENE_PRESETS.earth).toBe(EARTH_PRESET);
        expect(SCENE_PRESETS.moon).toBe(MOON_PRESET);
        expect(SCENE_PRESETS.mars).toBe(MARS_PRESET);
        expect(SCENE_PRESETS.orbital).toBe(ORBITAL_PRESET);
    });
});

// ---------------------------------------------------------------------------
// Factory functions produce SceneItems with the preset editables applied
// ---------------------------------------------------------------------------

describe("Scene preset factories: editables wired to preset values", () => {
    it("createEarthSceneItem applies EARTH_PRESET to its editables", () => {
        assertItemMatchesPreset(createEarthSceneItem(), EARTH_PRESET);
    });
    it("createMoonSceneItem applies MOON_PRESET to its editables", () => {
        assertItemMatchesPreset(createMoonSceneItem(), MOON_PRESET);
    });
    it("createMarsSceneItem applies MARS_PRESET to its editables", () => {
        assertItemMatchesPreset(createMarsSceneItem(), MARS_PRESET);
    });
    it("createOrbitalSceneItem applies ORBITAL_PRESET to its editables", () => {
        assertItemMatchesPreset(createOrbitalSceneItem(), ORBITAL_PRESET);
    });
});
