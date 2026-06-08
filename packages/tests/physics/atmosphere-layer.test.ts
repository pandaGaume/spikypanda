/**
 * Unit tests for `Physics.Scene:atmosphere-layer` (was atmosphere-state;
 * renamed 2026-06-08 when the Atmosphere split into a Layer carrier
 * and a Container facade).
 *
 * Coverage:
 *   1. Default initialisation matches the preset (Earth humid air at
 *      sea level): species inventory derived from ideal-gas law,
 *      total pressure ≈ 101325 Pa.
 *   2. stateSize / stateNames match the V1 species schema.
 *   3. gatherState / writeState round-trip the mass vector through a
 *      Float64Array slice.
 *   4. rhs sums variadic `delta_<species>_<k>` slots via
 *      `IIntegrationInputs.sumPrefix`.
 *   5. fire() publishes per-species and aggregate observables on the
 *      right output slots (mass / mole-fraction / partial-pressure /
 *      ppm / pressure / temperature / density).
 *   6. Vacuum preset yields zero mass and zero pressure.
 */
import type { IChannel, IIntegrationInputs, IOlink, ISession, SceneStateView } from "spikypanda-core";
import {
    AtmosphereLayerNode,
    ATMOSPHERE_LAYER_IN_DELTA_PREFIX as ATMOSPHERE_IN_DELTA_PREFIX,
    ATMOSPHERE_LAYER_OUT_DENSITY as ATMOSPHERE_OUT_DENSITY,
    ATMOSPHERE_LAYER_OUT_MASS as ATMOSPHERE_OUT_MASS,
    ATMOSPHERE_LAYER_OUT_MOLE_FRACTION as ATMOSPHERE_OUT_MOLE_FRACTION,
    ATMOSPHERE_LAYER_OUT_PARTIAL_PRESSURE as ATMOSPHERE_OUT_PARTIAL_PRESSURE,
    ATMOSPHERE_LAYER_OUT_PPM as ATMOSPHERE_OUT_PPM,
    ATMOSPHERE_LAYER_OUT_PRESSURE as ATMOSPHERE_OUT_PRESSURE,
    ATMOSPHERE_LAYER_OUT_TEMPERATURE as ATMOSPHERE_OUT_TEMPERATURE,
} from "../../dev/plugins/physics/src/scene/atmosphere-layer.node";
import { CHEMICAL_SPECIES_V1, Frequency, GAS_CONSTANT_R, Pressure, Temperature, V1_SPECIES_ORDER, buildDefaultStateView } from "../../dev/core/src";

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

function makePublishSession(view: SceneStateView, channels: { slot: string }[]): {
    session: ISession;
    captured: Map<string, number>;
} {
    const links: IChannel[] = channels.map((c) => ({ slot: c.slot, enabled: true } as unknown as IChannel));
    const captured = new Map<string, number>();
    const session: ISession = {
        graph: { links },
        linkStates: links.map(() => ({ ready: false })),
        sceneStateView: view,
        consume: () => undefined,
        publish: (idx: number, value: unknown) => {
            captured.set(links[idx].slot as string, value as number);
        },
        peek: () => undefined,
    } as unknown as ISession;
    return { session, captured };
}

// ─────────────────────────────────────────────────────────────────────
// 1. Initial state derived from preset
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — initial state from preset", () => {
    it("default preset (earthHumidAirSeaLevel) yields ~101325 Pa total pressure at 20 °C", () => {
        const node = new AtmosphereLayerNode();
        node.volume = 100;
        node.reset(emptySession());
        // Total pressure should match 1 atm within numerical tolerance.
        expect(node.totalPressure).toBeCloseTo(101325, -1);
    });

    it("total mass is positive and consistent with ideal-gas law (P V / R T × M_avg)", () => {
        const node = new AtmosphereLayerNode();
        node.volume = 50;
        node.reset(emptySession());
        // For Earth air at 1 atm / 20 °C, density ≈ 1.20 kg/m³.
        // Volume 50 → ~60 kg total mass.
        const totalMass = node.totalMass;
        expect(totalMass).toBeGreaterThan(50);
        expect(totalMass).toBeLessThan(70);
    });

    it("vacuum preset yields zero mass and zero pressure", () => {
        const node = new AtmosphereLayerNode();
        node.initialAtmosphere = "vacuum";
        node.reset(emptySession());
        expect(node.totalMass).toBe(0);
        expect(node.totalPressure).toBe(0);
    });

    it("invalid preset name falls back to earthHumidAirSeaLevel", () => {
        const node = new AtmosphereLayerNode();
        node.initialAtmosphere = "completely-invalid-key";
        // Setter clamps to the canonical default.
        expect(node.initialAtmosphere).toBe("earthHumidAirSeaLevel");
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. IIntegrable surface
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — IIntegrable surface", () => {
    it("stateSize equals the V1 species count (5)", () => {
        const node = new AtmosphereLayerNode();
        expect(node.stateSize).toBe(V1_SPECIES_ORDER.length);
        expect(node.stateSize).toBe(5);
    });

    it("stateNames are m_N2, m_O2, m_CO2, m_H2O, m_Ar", () => {
        const node = new AtmosphereLayerNode();
        expect(node.stateNames).toEqual(["m_N2", "m_O2", "m_CO2", "m_H2O", "m_Ar"]);
    });

    it("gatherState / writeState round-trip the mass vector through a Float64Array slice", () => {
        const node = new AtmosphereLayerNode();
        node.reset(emptySession());
        const y = new Float64Array(node.stateSize + 3); // pad with offset
        const off = 2;
        node.gatherState(y, off);
        // The gathered slice should be the live mass.
        for (let i = 0; i < node.stateSize; i++) {
            expect(y[off + i]).toBeGreaterThan(0);
        }
        // Mutate and write back.
        for (let i = 0; i < node.stateSize; i++) y[off + i] = 1.5 * (i + 1);
        node.writeState(y, off);
        const y2 = new Float64Array(node.stateSize);
        node.gatherState(y2, 0);
        for (let i = 0; i < node.stateSize; i++) {
            expect(y2[i]).toBeCloseTo(1.5 * (i + 1), 9);
        }
    });

    it("writeState clamps negative or non-finite values to 0 (no negative mass)", () => {
        const node = new AtmosphereLayerNode();
        node.reset(emptySession());
        const y = new Float64Array(node.stateSize);
        y[0] = -10;
        y[1] = NaN;
        y[2] = Infinity;
        y[3] = 0.5;
        y[4] = 2;
        node.writeState(y, 0);
        const y2 = new Float64Array(node.stateSize);
        node.gatherState(y2, 0);
        expect(y2[0]).toBe(0);
        expect(y2[1]).toBe(0);
        expect(y2[2]).toBe(0);
        expect(y2[3]).toBeCloseTo(0.5, 9);
        expect(y2[4]).toBeCloseTo(2, 9);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. rhs() sums variadic delta_<species>_<k>
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — rhs() species mass-flow accumulation", () => {
    it("rhs returns zero dydt when no delta slots are populated", () => {
        const node = new AtmosphereLayerNode();
        const y = new Float64Array(node.stateSize);
        const dydt = new Float64Array(node.stateSize);
        node.rhs(0, y, 0, new InputsStub(), dydt);
        for (let i = 0; i < node.stateSize; i++) expect(dydt[i]).toBe(0);
    });

    it("rhs sums every delta_<species>_<k> slot for each species", () => {
        const node = new AtmosphereLayerNode();
        const inputs = new InputsStub();
        // CO2: three producers contribute 0.1, 0.2, -0.05 kg/s.
        inputs.set(`${ATMOSPHERE_IN_DELTA_PREFIX("CO2")}0`, 0.1);
        inputs.set(`${ATMOSPHERE_IN_DELTA_PREFIX("CO2")}1`, 0.2);
        inputs.set(`${ATMOSPHERE_IN_DELTA_PREFIX("CO2")}2`, -0.05);
        // O2: a single producer pulls 0.3 kg/s.
        inputs.set(`${ATMOSPHERE_IN_DELTA_PREFIX("O2")}0`, -0.3);
        const y = new Float64Array(node.stateSize);
        const dydt = new Float64Array(node.stateSize);
        node.rhs(0, y, 0, inputs, dydt);
        // species indices follow V1_SPECIES_ORDER: N2, O2, CO2, H2O, Ar.
        const o2Idx = V1_SPECIES_ORDER.indexOf("O2");
        const co2Idx = V1_SPECIES_ORDER.indexOf("CO2");
        expect(dydt[o2Idx]).toBeCloseTo(-0.3, 9);
        expect(dydt[co2Idx]).toBeCloseTo(0.25, 9);
        // Other species: untouched.
        for (let i = 0; i < node.stateSize; i++) {
            if (i === o2Idx || i === co2Idx) continue;
            expect(dydt[i]).toBe(0);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. fire() publishes observables
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — fire() publishes observables", () => {
    it("publishes mass / mole-fraction / partial-pressure / ppm for every species + aggregates", () => {
        const node = new AtmosphereLayerNode();
        node.reset(emptySession(buildDefaultStateView("scene")));
        const channels = [
            ...V1_SPECIES_ORDER.flatMap((sp) => [
                { slot: ATMOSPHERE_OUT_MASS(sp) },
                { slot: ATMOSPHERE_OUT_MOLE_FRACTION(sp) },
                { slot: ATMOSPHERE_OUT_PARTIAL_PRESSURE(sp) },
                { slot: ATMOSPHERE_OUT_PPM(sp) },
            ]),
            { slot: ATMOSPHERE_OUT_PRESSURE },
            { slot: ATMOSPHERE_OUT_TEMPERATURE },
            { slot: ATMOSPHERE_OUT_DENSITY },
        ];
        const view = buildDefaultStateView("scene");
        const { session, captured } = makePublishSession(view, channels);
        // Wire the channels as outgoing for the node.
        (node as unknown as { _onsc: IOlink[] })._onsc = session.graph.links as unknown as IOlink[];
        node.fire(session, 0);
        // Every channel should have received a value.
        for (const ch of channels) {
            expect(captured.has(ch.slot)).toBe(true);
            const v = captured.get(ch.slot)!;
            expect(Number.isFinite(v)).toBe(true);
        }
        // Aggregates: ~101325 Pa, ~293.15 K, ~1.2 kg/m³.
        expect(captured.get(ATMOSPHERE_OUT_PRESSURE)).toBeCloseTo(101325, -1);
        expect(captured.get(ATMOSPHERE_OUT_TEMPERATURE)).toBeCloseTo(293.15, 6);
        expect(captured.get(ATMOSPHERE_OUT_DENSITY)).toBeGreaterThan(1);
        expect(captured.get(ATMOSPHERE_OUT_DENSITY)).toBeLessThan(1.5);
        // Sum of mole fractions ≈ 1.
        let sumX = 0;
        for (const sp of V1_SPECIES_ORDER) {
            sumX += captured.get(ATMOSPHERE_OUT_MOLE_FRACTION(sp)) ?? 0;
        }
        expect(sumX).toBeCloseTo(1, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Ideal gas consistency check
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — ideal gas consistency", () => {
    it("P × V = n × R × T holds within float precision", () => {
        const node = new AtmosphereLayerNode();
        node.volume = 25;
        node.initialAtmosphere = "earthDryAirSeaLevel";
        node.reset(emptySession());
        const P = node.totalPressure;
        const V = 25;
        const T = 293.15;
        // n = sum(m_i / M_i)
        let n = 0;
        const y = new Float64Array(node.stateSize);
        node.gatherState(y, 0);
        for (let i = 0; i < node.stateSize; i++) {
            n += y[i] / CHEMICAL_SPECIES_V1[V1_SPECIES_ORDER[i]].molarMass;
        }
        const rhs = n * GAS_CONSTANT_R * T;
        expect(P * V).toBeCloseTo(rhs, 1);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 6. Quantity construction (smoke test that math.units types still play nice)
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereLayerNode — Quantity construction", () => {
    it("produces total pressure that can wrap into a Pressure Quantity", () => {
        const node = new AtmosphereLayerNode();
        node.reset(emptySession());
        const P = new Pressure(node.totalPressure, Pressure.Units.Pa);
        expect(P.getValue(Pressure.Units.atm)).toBeCloseTo(1, 3);
        expect(P.getValue(Pressure.Units.kPa)).toBeCloseTo(101.325, 1);
    });

    it("temperature reading wraps into a Temperature Quantity (canonical 20 °C)", () => {
        const node = new AtmosphereLayerNode();
        node.reset(emptySession(buildDefaultStateView("any")));
        const channels = [{ slot: ATMOSPHERE_OUT_TEMPERATURE }];
        const view = buildDefaultStateView("any");
        const { session, captured } = makePublishSession(view, channels);
        (node as unknown as { _onsc: IOlink[] })._onsc = session.graph.links as unknown as IOlink[];
        node.fire(session, 0);
        const T_K = captured.get(ATMOSPHERE_OUT_TEMPERATURE)!;
        const T = new Temperature(T_K, Temperature.Units.k);
        expect(T.getValue(Temperature.Units.c)).toBeCloseTo(20, 1);
    });

    it("Frequency exists (smoke check that imports still resolve)", () => {
        expect(Frequency.Units.Hz.symbol).toBe("Hz");
    });
});
