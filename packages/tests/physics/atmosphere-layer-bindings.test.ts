/**
 * Binding tests for `Physics.Scene:atmosphere-layer` (was atmosphere-state).
 *
 * Covers the config-link-driven behavior at the LAYER level. The
 * AtmosphereContainer's composite behavior is tested in
 * atmosphere-container.test.ts.
 *
 *   1. Bound CompositionNode supplies the species schema and the
 *      initial mass via ideal gas at the composition's reference
 *      pressure.
 *   2. Trace VOCs / pollutant-class gases that the user wires through
 *      the composition's `gas_in_<k>` (with zero mole fraction) are
 *      indistinguishable from bulk species at the integrator level:
 *      pollutant-ness is metadata on the GasNode itself, not a
 *      separate binding seam.
 *   3. Bound ParticulateNode(s) are recorded as metadata only; the
 *      state vector ignores them in V1.
 *   4. `clearBindings()` wipes prior wirings so a fresh sync pass
 *      reflects the canvas state without leaking removed connections.
 *   5. Fallback path: with no bindings, the layer reverts to the V1
 *      schema + ATMOSPHERE_PRESETS (regression coverage).
 */
import type { IIntegrationInputs, ISession, SceneStateView } from "spikypanda-core";
import {
    AtmosphereLayerNode,
    isCompositionView,
} from "../../dev/plugins/physics/src/scene/atmosphere-layer.node";
import { GAS_CONSTANT_R, V1_SPECIES_ORDER, buildDefaultStateView } from "../../dev/core/src";

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

class InputsStub implements IIntegrationInputs {
    private readonly _data = new Map<string, number>();
    public set(port: string, value: number): void {
        this._data.set(port, value);
    }
    public get(port: string): number | undefined {
        return this._data.get(port);
    }
    public has(port: string): boolean {
        return this._data.has(port);
    }
    public sumPrefix(prefix: string): number {
        let total = 0;
        for (const [port, value] of this._data) {
            if (port.startsWith(prefix)) total += value;
        }
        return total;
    }
}

function emptySession(view?: SceneStateView): ISession {
    return {
        graph: { links: [] },
        linkStates: [],
        sceneStateView: view ?? null,
        consume: () => undefined,
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
}

/** Default-temperature session (buildDefaultStateView hardcodes
 *  293.15 K, which is what every test here wants). */
function defaultSession(): ISession {
    return emptySession(buildDefaultStateView("scene"));
}

function particulateMock(particulateId: string) {
    return {
        particulateId,
        displayName: particulateId,
        characteristicDiameter: 1e-5,
        density: 1500,
        pmClass: "pm10",
    };
}

function dryAirCompositionMock(
    referencePressurePa = 101325,
    particulates: ReadonlyArray<ReturnType<typeof particulateMock>> = [],
): {
    components: ReadonlyArray<{ speciesId: string; moleFraction: number; molarMass: number }>;
    referencePressurePa: number;
    particulates: ReadonlyArray<ReturnType<typeof particulateMock>>;
} {
    return {
        components: [
            { speciesId: "N2", moleFraction: 0.78, molarMass: 0.0280134 },
            { speciesId: "O2", moleFraction: 0.21, molarMass: 0.0319988 },
            { speciesId: "Ar", moleFraction: 0.01, molarMass: 0.039948 },
        ],
        referencePressurePa,
        particulates,
    };
}

/** Mock of a composition that includes a VOC trace species at zero
 *  mole fraction — exactly the shape the session builder produces
 *  when the user wires a `Chemistry.Gas:formaldehyde` GasNode into
 *  a composition's `gas_in_<k>` slot. The pollutant-ness lives on
 *  the gas (OEL TWA, IDLH, hazard class set), but the composition
 *  itself only sees a species with molar mass + mole fraction. */
function dryAirWithFormaldehydeMock(): {
    components: ReadonlyArray<{ speciesId: string; moleFraction: number; molarMass: number }>;
    referencePressurePa: number;
    particulates: ReadonlyArray<ReturnType<typeof particulateMock>>;
} {
    return {
        components: [
            { speciesId: "N2", moleFraction: 0.78, molarMass: 0.0280134 },
            { speciesId: "O2", moleFraction: 0.21, molarMass: 0.0319988 },
            { speciesId: "Ar", moleFraction: 0.01, molarMass: 0.039948 },
            { speciesId: "HCHO", moleFraction: 0, molarMass: 0.0300260 },
        ],
        referencePressurePa: 101325,
        particulates: [],
    };
}

// ─────────────────────────────────────────────────────────────────────
// 1. Composition-driven schema + initial mass
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — bound composition drives schema and IC", () => {
    it("3-component composition shrinks stateSize from V1's 5 to 3", () => {
        const atm = new AtmosphereLayerNode();
        atm.volume = 100;
        atm.bindComposition("composition-uuid", dryAirCompositionMock());
        atm.reset(emptySession());
        expect(atm.stateSize).toBe(3);
        expect(atm.activeSpecies).toEqual(["N2", "O2", "Ar"]);
    });

    it("initial mass derived from composition ref pressure × V / RT × moleFractions × molarMass", () => {
        const atm = new AtmosphereLayerNode();
        atm.volume = 100;
        const composition = dryAirCompositionMock();
        atm.bindComposition("composition-uuid", composition);
        atm.reset(defaultSession());
        // n_total = P V / RT
        const T = 293.15;
        const expectedTotalMoles = (composition.referencePressurePa * 100) / (GAS_CONSTANT_R * T);
        // m_i = x_i × n_total × M_i
        const expectedN2Mass = 0.78 * expectedTotalMoles * 0.0280134;
        const expectedO2Mass = 0.21 * expectedTotalMoles * 0.0319988;
        const expectedArMass = 0.01 * expectedTotalMoles * 0.039948;
        const y = new Float64Array(3);
        atm.gatherState(y, 0);
        expect(y[0]).toBeCloseTo(expectedN2Mass, 6);
        expect(y[1]).toBeCloseTo(expectedO2Mass, 6);
        expect(y[2]).toBeCloseTo(expectedArMass, 6);
    });

    it("composition with referencePressurePa=0 yields zero mass (vacuum-like)", () => {
        const atm = new AtmosphereLayerNode();
        atm.volume = 100;
        atm.bindComposition("composition-uuid", dryAirCompositionMock(0));
        atm.reset(defaultSession());
        const y = new Float64Array(atm.stateSize);
        atm.gatherState(y, 0);
        for (let i = 0; i < atm.stateSize; i++) {
            expect(y[i]).toBeCloseTo(0, 12);
        }
    });

    it("stateNames mirror composition order: m_N2, m_O2, m_Ar (no V1 leakage)", () => {
        const atm = new AtmosphereLayerNode();
        atm.bindComposition("composition-uuid", dryAirCompositionMock());
        atm.reset(emptySession());
        expect(atm.stateNames).toEqual(["m_N2", "m_O2", "m_Ar"]);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Pollutant-class gases reach the atmosphere via the composition
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — pollutant-class gases via composition", () => {
    it("a VOC in the composition just extends the species list (no special pollutant binding)", () => {
        const atm = new AtmosphereLayerNode();
        atm.volume = 100;
        atm.bindComposition("comp-1", dryAirWithFormaldehydeMock());
        atm.reset(defaultSession());
        expect(atm.stateSize).toBe(4);
        expect(atm.activeSpecies).toEqual(["N2", "O2", "Ar", "HCHO"]);
    });

    it("a zero-mole-fraction trace species seeds at zero mass (producers add over time)", () => {
        const atm = new AtmosphereLayerNode();
        atm.volume = 100;
        atm.bindComposition("comp-1", dryAirWithFormaldehydeMock());
        atm.reset(defaultSession());
        const y = new Float64Array(atm.stateSize);
        atm.gatherState(y, 0);
        // Last slot = HCHO, initial mass 0 (mole fraction was 0).
        expect(y[atm.stateSize - 1]).toBeCloseTo(0, 12);
        // Composition bulk slots remain non-zero.
        expect(y[0]).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Particulates ride along inside the bound Composition (V1 stub)
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — particulates from composition are V1 metadata only", () => {
    it("particulates inside the composition leave stateSize / species list untouched", () => {
        const atm = new AtmosphereLayerNode();
        const composition = dryAirCompositionMock(101325, [particulateMock("pm10"), particulateMock("pm2_5")]);
        atm.bindComposition("composition-uuid", composition);
        atm.reset(emptySession());
        expect(atm.stateSize).toBe(3);
        expect(atm.activeSpecies).toEqual(["N2", "O2", "Ar"]);
        expect(atm.bound_particulate_count).toBe(2);
    });

    it("no composition wired → bound_particulate_count = 0 (V1 fallback)", () => {
        const atm = new AtmosphereLayerNode();
        atm.reset(emptySession());
        expect(atm.activeSpecies).toEqual(V1_SPECIES_ORDER);
        expect(atm.bound_particulate_count).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. clearBindings invariants (session-builder sync pass)
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — clearBindings wipes stale config-links", () => {
    it("clearBindings followed by re-bind reflects the current canvas only", () => {
        const atm = new AtmosphereLayerNode();
        atm.bindComposition("comp-1", dryAirWithFormaldehydeMock());
        // User removes the wire on the canvas; the next sync pass
        // calls clearBindings + re-binds the composition only.
        atm.clearBindings();
        atm.bindComposition("comp-1", dryAirWithFormaldehydeMock());
        atm.reset(emptySession());
        expect(atm.activeSpecies).toEqual(["N2", "O2", "Ar", "HCHO"]);
        expect(atm.bound_particulate_count).toBe(0);
        expect(atm.bound_composition_components).toBe(4);
    });

    it("clearBindings on its own reverts the atmosphere to V1 fallback at next reset", () => {
        const atm = new AtmosphereLayerNode();
        atm.bindComposition("comp-1", dryAirCompositionMock());
        atm.clearBindings();
        atm.reset(emptySession());
        expect(atm.activeSpecies).toEqual(V1_SPECIES_ORDER);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. rhs() interaction with the bound species list
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — rhs respects the bound species order", () => {
    it("delta_<sp>_<k> for non-bound species contributes nothing to dydt", () => {
        const atm = new AtmosphereLayerNode();
        atm.bindComposition("comp-1", dryAirCompositionMock()); // N2/O2/Ar only
        atm.reset(emptySession());
        const inputs = new InputsStub();
        // CO2 is NOT in the bound composition; the corresponding delta
        // slot has no entry in _effectiveSpecies, so it must not bleed
        // into another species' rhs.
        inputs.set("delta_CO2_0", 1.0);
        const y = new Float64Array(atm.stateSize);
        const dydt = new Float64Array(atm.stateSize);
        atm.rhs(0, y, 0, inputs, dydt);
        for (let i = 0; i < atm.stateSize; i++) expect(dydt[i]).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 6. Fallback regression: no bindings → V1 behavior
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — V1 fallback when nothing is bound", () => {
    it("stateSize stays at V1_SPECIES_ORDER.length when no config-link is wired", () => {
        const atm = new AtmosphereLayerNode();
        atm.reset(emptySession());
        expect(atm.stateSize).toBe(V1_SPECIES_ORDER.length);
        expect(atm.activeSpecies).toEqual(V1_SPECIES_ORDER);
    });

    it("default earthHumidAirSeaLevel preset still yields ~101325 Pa at 20 °C", () => {
        const atm = new AtmosphereLayerNode();
        atm.volume = 100;
        atm.reset(defaultSession());
        expect(atm.total_pressure).toBeCloseTo(101325, -1);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 7. isCompositionView structural guard
// ─────────────────────────────────────────────────────────────────────

describe("isCompositionView guard", () => {
    it("accepts a well-formed composition object", () => {
        expect(isCompositionView(dryAirCompositionMock())).toBe(true);
    });
    it("rejects null / non-object / missing-fields payloads", () => {
        expect(isCompositionView(null)).toBe(false);
        expect(isCompositionView(undefined)).toBe(false);
        expect(isCompositionView("composition")).toBe(false);
        expect(isCompositionView({ components: [] })).toBe(false); // no referencePressurePa
        expect(isCompositionView({ referencePressurePa: 101325 })).toBe(false); // no components
    });
});
