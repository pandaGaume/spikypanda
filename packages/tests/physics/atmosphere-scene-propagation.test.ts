/**
 * Atmosphere → Scene state propagation tests (2026-06-08).
 *
 * Validates that a Scene wired to an Atmosphere container reads the
 * atmosphere's volume-weighted aggregates as its own temperature /
 * pressure / density. The fallback path (no atmosphere wired) keeps
 * returning the SceneItem's editable defaults.
 *
 * The chain under test:
 *   1. AtmosphereLayer owns its temperature editable (no longer derived
 *      from SceneStateView).
 *   2. AtmosphereNode container implements IAtmosphereAggregator and
 *      exposes a session-free `sampleAggregates()`.
 *   3. SceneItem.buildStateView, when given a resolver that returns
 *      an atmosphere aggregator, wires the read* thunks to it. The
 *      SceneStateView's temperature / pressure / density now resolve
 *      live to the atmosphere's values.
 */

import { AtmosphereLayerNode } from "../../dev/plugins/physics/src/scene/atmosphere-layer.node";
import { AtmosphereNode } from "../../dev/plugins/physics/src/scene/atmosphere.node";
import { SceneItem, type SceneSourceResolver } from "../../dev/plugins/physics/src/scene/scene.item";
import { Temperature, Pressure, isAtmosphereAggregator } from "../../dev/core/src";

// ─────────────────────────────────────────────────────────────────────
// Resolver helpers
// ─────────────────────────────────────────────────────────────────────

function noOpResolver(): SceneSourceResolver {
    return {
        resolveNumberSource: () => null,
        resolveCartesian3Source: () => null,
        resolveQuaternionSource: () => null,
        aggregateEffectiveHz: () => 60,
        resolveAtmosphere: () => null,
    };
}

function atmosphereResolver(atm: AtmosphereNode): SceneSourceResolver {
    return {
        resolveNumberSource: () => null,
        resolveCartesian3Source: () => null,
        resolveQuaternionSource: () => null,
        aggregateEffectiveHz: () => 60,
        resolveAtmosphere: () => atm,
    };
}

function configureAtmosphere(atm: AtmosphereNode, temperatureK: number, volumeM3: number): void {
    atm.volume = volumeM3;
    atm.temperature_k = temperatureK;
    // The Atmosphere IS-A Layer (inheritance); bind a dry-air
    // composition directly on it so reset() derives the mass vector
    // via ideal gas (P V = nRT). No "default layer" indirection.
    atm.bindComposition("composition-uuid", {
        components: [
            { speciesId: "N2", moleFraction: 0.78, molarMass: 0.0280134 },
            { speciesId: "O2", moleFraction: 0.21, molarMass: 0.0319988 },
            { speciesId: "Ar", moleFraction: 0.01, molarMass: 0.039948 },
        ],
        referencePressurePa: 101325,
        particulates: [],
    });
    // reset() seeds mass from composition + own temperature, no session
    // needed (the layer no longer queries SceneStateView for temperature).
    atm.reset({} as never);
}

// ─────────────────────────────────────────────────────────────────────
// 1. Layer is self-contained for temperature (no SceneStateView cycle)
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayer self-contained temperature", () => {
    it("default temperature is 293.15 K (20 °C)", () => {
        const layer = new AtmosphereLayerNode();
        expect(layer.temperature_k).toBe(293.15);
    });

    it("temperatureQ accepts a Temperature in °C and stores K", () => {
        const layer = new AtmosphereLayerNode();
        layer.temperatureQ = new Temperature(50, Temperature.Units.c);
        expect(layer.temperature_k).toBeCloseTo(323.15, 6);
    });

    it("sampleAggregates() is session-free and reflects own temperature", () => {
        const layer = new AtmosphereLayerNode();
        layer.temperature_k = 310; // 36.85 °C
        layer.reset({} as never);
        const s = layer.sampleAggregates();
        expect(s.temperatureK).toBe(310);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Container is an IAtmosphereAggregator + routes editables to layer
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereNode container as IAtmosphereAggregator", () => {
    it("isAtmosphereAggregator(container) returns true", () => {
        const atm = new AtmosphereNode();
        expect(isAtmosphereAggregator(atm)).toBe(true);
    });

    it("container inherits temperature_k from Layer (no proxy field needed)", () => {
        const atm = new AtmosphereNode();
        atm.temperature_k = 280;
        // The Atmosphere IS-A Layer; the editable lives on it directly.
        expect(atm.temperature_k).toBe(280);
        expect(atm.temperatureK).toBe(280);
    });

    it("container inherits volume editable from Layer", () => {
        const atm = new AtmosphereNode();
        atm.volume = 250;
        expect(atm.volume).toBe(250);
    });

    it("sampleAggregates() yields volume-weighted means across active layers", () => {
        const atm = new AtmosphereNode();
        configureAtmosphere(atm, 293.15, 100);
        const s = atm.sampleAggregates();
        expect(s.temperatureK).toBeCloseTo(293.15, 6);
        // Dry air at 1 atm and 20 °C: density ≈ 1.20 kg/m³.
        expect(s.density).toBeGreaterThan(1);
        expect(s.density).toBeLessThan(2);
        // Pressure should be ~101325 Pa (ideal gas at the composition's
        // reference pressure).
        expect(s.pressure).toBeCloseTo(101325, -1);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Scene reads atmosphere aggregates via the bound resolver
// ─────────────────────────────────────────────────────────────────────

describe("SceneStateView reads bound Atmosphere when wired", () => {
    it("with no atmosphere wired: temperature / pressure / density fall back to SceneItem editables", () => {
        const scene = new SceneItem();
        scene.temperatureQ = new Temperature(15, Temperature.Units.c); // 288.15 K
        scene.pressureQ = new Pressure(0.6, Pressure.Units.atm); // Mars-ish
        // density editable defaults to 1.225 (sea-level standard).
        const view = scene.buildStateView(noOpResolver());
        expect(view.temperature.getValue(Temperature.Units.k)).toBeCloseTo(288.15, 6);
        expect(view.pressure.getValue(Pressure.Units.Pa)).toBeCloseTo(60795, 1);
        expect(view.density).toBe(1.225);
    });

    it("with an atmosphere wired: temperature / pressure / density mirror the atmosphere's aggregates", () => {
        const atm = new AtmosphereNode();
        configureAtmosphere(atm, 310, 50); // 36.85 °C, 50 m³
        const scene = new SceneItem();
        // Scene's own editables are deliberately set to garbage so we
        // can prove the atmosphere overrides them.
        scene.temperatureQ = new Temperature(0, Temperature.Units.k);
        scene.pressureQ = new Pressure(0, Pressure.Units.Pa);
        scene.atmosphereItemId = "atm-uuid";
        const view = scene.buildStateView(atmosphereResolver(atm));
        expect(view.temperature.getValue(Temperature.Units.k)).toBe(310);
        expect(view.pressure.getValue(Pressure.Units.Pa)).toBeGreaterThan(0);
        expect(view.density).toBeGreaterThan(0);
        // The temperature accessor is live: editing the atmosphere's
        // temperature shows up on the next read.
        atm.temperature_k = 250;
        atm.reset({} as never); // re-derive mass + pressure
        expect(view.temperature.getValue(Temperature.Units.k)).toBe(250);
    });

    it("SceneItem.bindAtmosphere makes temperature/pressure/density editables return live atmosphere values", () => {
        const atm = new AtmosphereNode();
        configureAtmosphere(atm, 305, 75);
        const scene = new SceneItem();
        // Static editables set to off-band values to prove the getter
        // takes the live atmosphere value over the editable.
        scene.temperatureQ = new Temperature(0, Temperature.Units.k);
        scene.pressureQ = new Pressure(1, Pressure.Units.Pa);
        scene.density = 999;

        // Before binding: getters return the editable defaults.
        // _temperatureK was clamped from 0 K (rejected) back to the
        // current storage, so reading temperatureQ may not return 0 —
        // verify against the storage by reading what the editable set.
        expect(scene.temperature).toBeGreaterThanOrEqual(0);
        expect(scene.pressure).toBe(1);
        expect(scene.density).toBe(999);

        // Session-builder-style binding: pass both ID and the
        // IAtmosphereAggregator instance.
        scene.bindAtmosphere("atm-uuid", atm);

        // Editables now resolve through the bound atmosphere.
        expect(scene.temperature).toBe(305);
        expect(scene.pressure).toBeGreaterThan(0);
        expect(scene.density).toBeGreaterThan(0);
        expect(scene.density).toBeLessThan(2); // dry air ≈ 1.2 kg/m³

        // Unbind reverts to fallback.
        scene.bindAtmosphere("", null);
        expect(scene.pressure).toBe(1);
        expect(scene.density).toBe(999);
        expect(scene.atmosphereItemId).toBe("");
    });

    it("an atmosphere that doesn't implement IAtmosphereAggregator is ignored", () => {
        const scene = new SceneItem();
        scene.temperatureQ = new Temperature(15, Temperature.Units.c); // 288.15 K
        scene.atmosphereItemId = "atm-uuid";
        // Resolver returns a plain IIntegrable stub without
        // sampleAggregates → SceneStateView should fall back to the
        // SceneItem editable.
        const fakeAtm = {
            stateSize: 0,
            stateNames: [],
            gatherState: () => undefined,
            writeState: () => undefined,
            rhs: () => undefined,
        };
        const resolver: SceneSourceResolver = {
            ...noOpResolver(),
            resolveAtmosphere: () => fakeAtm as never,
        };
        const view = scene.buildStateView(resolver);
        expect(view.temperature.getValue(Temperature.Units.k)).toBeCloseTo(288.15, 6);
        expect(view.density).toBe(1.225); // editable default
    });
});
