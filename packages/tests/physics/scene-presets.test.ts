/**
 * Unit tests for the 4 Physics.Scene presets (Earth, Moon, Mars, Orbital).
 *
 * Each preset is verified at three levels:
 *   1. The static IScenePreset constant carries the documented values,
 *      and is frozen at every level (defensive contract).
 *   2. The preset factory builds a SceneNode whose editables match the
 *      preset constants exactly (no drift between data + factory).
 *   3. The factory-built SceneNode publishes those same values when
 *      fired, validating that the editable-to-output pipeline works
 *      end-to-end with a preset.
 */
import type { IChannel, IOlink, ISession } from "spikypanda-core";
import {
    SceneNode,
    EARTH_PRESET, MOON_PRESET, MARS_PRESET, ORBITAL_PRESET, SCENE_PRESETS,
    createEarthSceneNode, createMoonSceneNode,
    createMarsSceneNode,  createOrbitalSceneNode,
    DEFAULT_SCENE, isScene,
} from "../../dev/plugins/physics/src/index";
import type { IScene, IScenePreset } from "../../dev/plugins/physics/src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bindOnsc(node: { _onsc: IOlink[] }): {
    session: ISession;
    published: { idx: number; value: unknown }[];
} {
    const links: IChannel[] = [{ slot: "scene", enabled: true } as unknown as IChannel];
    node._onsc = links as unknown as IOlink[];
    const published: { idx: number; value: unknown }[] = [];
    const session: ISession = {
        graph: { links },
        linkStates: [{ ready: false }],
        consume: () => undefined,
        publish: (idx: number, value: unknown) => { published.push({ idx, value }); },
        peek: () => undefined,
    } as unknown as ISession;
    return { session, published };
}

function assertSceneEquals(actual: IScene, expected: IScene): void {
    expect(actual.gravity.x).toBeCloseTo(expected.gravity.x, 12);
    expect(actual.gravity.y).toBeCloseTo(expected.gravity.y, 12);
    expect(actual.gravity.z).toBeCloseTo(expected.gravity.z, 12);
    expect(actual.temperature).toBeCloseTo(expected.temperature, 12);
    expect(actual.pressure).toBeCloseTo(expected.pressure, 12);
    expect(actual.timeScale).toBeCloseTo(expected.timeScale, 12);
}

function assertNodeMatchesPreset(node: SceneNode, preset: IScenePreset): void {
    expect(node.gravity.x).toBeCloseTo(preset.scene.gravity.x, 12);
    expect(node.gravity.y).toBeCloseTo(preset.scene.gravity.y, 12);
    expect(node.gravity.z).toBeCloseTo(preset.scene.gravity.z, 12);
    expect(node.temperature).toBeCloseTo(preset.scene.temperature, 12);
    expect(node.pressure).toBeCloseTo(preset.scene.pressure, 12);
    expect(node.timeScale).toBeCloseTo(preset.scene.timeScale, 12);
}

function assertPublishesPreset(factory: () => SceneNode, preset: IScenePreset): void {
    const node = factory();
    const { session, published } = bindOnsc(node as unknown as { _onsc: IOlink[] });
    node.fire(session, 0);
    expect(published).toHaveLength(1);
    const scene = published[0].value as IScene;
    expect(isScene(scene)).toBe(true);
    assertSceneEquals(scene, preset.scene);
}

// ---------------------------------------------------------------------------
// Documented numerical contract
// ---------------------------------------------------------------------------

describe("Scene preset constants", () => {
    it("EARTH_PRESET matches DEFAULT_SCENE (single source of truth)", () => {
        assertSceneEquals(EARTH_PRESET.scene, DEFAULT_SCENE);
        expect(EARTH_PRESET.name).toBe("Earth");
    });

    it("MOON_PRESET has lunar gravity (Z-down), ~250 K, near-vacuum", () => {
        expect(MOON_PRESET.scene.gravity.x).toBe(0);
        expect(MOON_PRESET.scene.gravity.y).toBe(0);
        expect(MOON_PRESET.scene.gravity.z).toBeCloseTo(-1.625, 6);
        expect(MOON_PRESET.scene.temperature).toBe(250);
        expect(MOON_PRESET.scene.pressure).toBe(0);
        expect(MOON_PRESET.name).toBe("Moon");
    });

    it("MARS_PRESET has Martian gravity (Z-down), 210 K, 600 Pa", () => {
        expect(MARS_PRESET.scene.gravity.x).toBe(0);
        expect(MARS_PRESET.scene.gravity.y).toBe(0);
        expect(MARS_PRESET.scene.gravity.z).toBeCloseTo(-3.721, 6);
        expect(MARS_PRESET.scene.temperature).toBe(210);
        expect(MARS_PRESET.scene.pressure).toBe(600);
        expect(MARS_PRESET.name).toBe("Mars");
    });

    it("ORBITAL_PRESET is free-space vacuum at grey-body thermal equilibrium", () => {
        expect(ORBITAL_PRESET.scene.gravity.x).toBe(0);
        expect(ORBITAL_PRESET.scene.gravity.y).toBe(0);
        expect(ORBITAL_PRESET.scene.gravity.z).toBe(0);
        expect(ORBITAL_PRESET.scene.temperature).toBeCloseTo(278.6, 1);
        expect(ORBITAL_PRESET.scene.pressure).toBe(0);
        expect(ORBITAL_PRESET.name).toBe("Orbital");
    });

    it("all preset constants are frozen at every level", () => {
        for (const preset of [EARTH_PRESET, MOON_PRESET, MARS_PRESET, ORBITAL_PRESET]) {
            expect(Object.isFrozen(preset)).toBe(true);
            expect(Object.isFrozen(preset.scene)).toBe(true);
            expect(Object.isFrozen(preset.scene.gravity)).toBe(true);
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
// Factory functions produce nodes with the preset editables applied
// ---------------------------------------------------------------------------

describe("Scene preset factories: editables wired to preset values", () => {
    it("createEarthSceneNode applies EARTH_PRESET to its editables", () => {
        assertNodeMatchesPreset(createEarthSceneNode(), EARTH_PRESET);
    });
    it("createMoonSceneNode applies MOON_PRESET to its editables", () => {
        assertNodeMatchesPreset(createMoonSceneNode(), MOON_PRESET);
    });
    it("createMarsSceneNode applies MARS_PRESET to its editables", () => {
        assertNodeMatchesPreset(createMarsSceneNode(), MARS_PRESET);
    });
    it("createOrbitalSceneNode applies ORBITAL_PRESET to its editables", () => {
        assertNodeMatchesPreset(createOrbitalSceneNode(), ORBITAL_PRESET);
    });
});

// ---------------------------------------------------------------------------
// End-to-end: factory → fire() → published IScene matches the preset
// ---------------------------------------------------------------------------

describe("Scene preset factories: fire() publishes the preset's IScene", () => {
    it("Earth", () => { assertPublishesPreset(createEarthSceneNode,   EARTH_PRESET);   });
    it("Moon",  () => { assertPublishesPreset(createMoonSceneNode,    MOON_PRESET);    });
    it("Mars",  () => { assertPublishesPreset(createMarsSceneNode,    MARS_PRESET);    });
    it("Orbital", () => { assertPublishesPreset(createOrbitalSceneNode, ORBITAL_PRESET); });
});
