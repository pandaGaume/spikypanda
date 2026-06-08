/**
 * Unit tests for `Physics.Scene:atmosphere-gate` (F10d / P7).
 *
 * Coverage:
 *   1. Three modes: closed (no flux), open_passive (linear ΔP-driven),
 *      hvac_forced (fixed volumetric flow).
 *   2. Conservation: A_delta_i + B_delta_i = 0 exactly per species.
 *   3. Sign convention: A side negative when material leaves A,
 *      B side positive when material enters B.
 *   4. Upwind selection in open_passive: high-P side donates its
 *      mole fractions; low-P side composition is irrelevant.
 *   5. bidirectional flag: false → check-valve (no back-flow).
 *   6. IIntegrable surface: stateSize = 1 only when mode === hvac_forced
 *      AND trackThroughput === true. rhs returns the volumetric flow.
 *   7. Quantity-aware accessors (areaQ, forcedFlowQ) round-trip
 *      arbitrary input units down to canonical SI.
 */
import type { IChannel, IIntegrationInputs, IOlink, ISession } from "spikypanda-core";
import { Area, CHEMICAL_SPECIES_V1, GAS_CONSTANT_R, V1_SPECIES_ORDER, VolumetricFlow } from "../../dev/core/src";
import {
    AtmosphereGateNode,
    GATE_IN_A_MOLE_FRACTION_PREFIX,
    GATE_IN_A_PRESSURE,
    GATE_IN_A_TEMPERATURE,
    GATE_IN_B_MOLE_FRACTION_PREFIX,
    GATE_IN_B_PRESSURE,
    GATE_IN_B_TEMPERATURE,
    GATE_OUT_A_DELTA_PREFIX,
    GATE_OUT_B_DELTA_PREFIX,
} from "../../dev/plugins/physics/src/scene/atmosphere-gate.node";

// ─────────────────────────────────────────────────────────────────────
// Test harness — feed inputs + capture outputs through a mock Session
// ─────────────────────────────────────────────────────────────────────

interface InputSpec {
    slot: string;
    value: number;
}

function runFire(
    node: AtmosphereGateNode,
    inputs: InputSpec[],
    outputSlots: string[]
): Map<string, number> {
    const inLinks: IChannel[] = inputs.map(
        (i) => ({ slot: i.slot, enabled: true } as unknown as IChannel),
    );
    const outLinks: IChannel[] = outputSlots.map(
        (s) => ({ slot: s, enabled: true } as unknown as IChannel),
    );
    const allLinks = [...inLinks, ...outLinks];
    const linkStates = allLinks.map((_, i) => ({ ready: i < inputs.length }));
    const captured = new Map<string, number>();
    const session: ISession = {
        graph: { links: allLinks },
        linkStates,
        consume: (idx: number) => {
            if (idx >= inputs.length) return undefined;
            linkStates[idx].ready = false;
            return inputs[idx].value;
        },
        publish: (idx: number, value: unknown) => {
            captured.set(allLinks[idx].slot as string, value as number);
        },
        peek: () => undefined,
        sceneStateView: null,
    } as unknown as ISession;
    (node as unknown as { _opsc: IOlink[] })._opsc = inLinks as unknown as IOlink[];
    (node as unknown as { _onsc: IOlink[] })._onsc = outLinks as unknown as IOlink[];
    node.fire(session, 0);
    return captured;
}

/** Every per-species A/B delta slot, in the canonical order. */
function allDeltaSlots(): string[] {
    const slots: string[] = [];
    for (const sp of V1_SPECIES_ORDER) {
        slots.push(`${GATE_OUT_A_DELTA_PREFIX}${sp}`);
        slots.push(`${GATE_OUT_B_DELTA_PREFIX}${sp}`);
    }
    return slots;
}

/** Build a "physical" Earth-air mole-fraction wiring for one side. */
function earthAir(side: "A" | "B"): InputSpec[] {
    const prefix = side === "A" ? GATE_IN_A_MOLE_FRACTION_PREFIX : GATE_IN_B_MOLE_FRACTION_PREFIX;
    return [
        { slot: `${prefix}N2`, value: 0.78 },
        { slot: `${prefix}O2`, value: 0.21 },
        { slot: `${prefix}CO2`, value: 0.0004 },
        { slot: `${prefix}H2O`, value: 0.0096 },
        { slot: `${prefix}Ar`, value: 0 },
    ];
}

// ─────────────────────────────────────────────────────────────────────
// 1. Closed mode
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode — closed mode", () => {
    it("publishes zero flux on every A/B delta slot when mode === closed", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "closed";
        const captured = runFire(
            gate,
            [
                { slot: GATE_IN_A_PRESSURE, value: 101325 },
                { slot: GATE_IN_B_PRESSURE, value: 50000 },
                { slot: GATE_IN_A_TEMPERATURE, value: 293.15 },
                { slot: GATE_IN_B_TEMPERATURE, value: 293.15 },
                ...earthAir("A"),
            ],
            allDeltaSlots(),
        );
        for (const slot of allDeltaSlots()) {
            expect(captured.get(slot)).toBeCloseTo(0, 12);
        }
        expect(gate.lastVolumetricFlow).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. open_passive mode
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode — open_passive mode", () => {
    it("produces non-zero, opposite-sign A/B deltas when ΔP > 0 (A → B flow)", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "open_passive";
        gate.area = 0.01;
        gate.leakCoeff = 1e-2;
        const captured = runFire(
            gate,
            [
                { slot: GATE_IN_A_PRESSURE, value: 102000 },
                { slot: GATE_IN_B_PRESSURE, value: 100000 },
                { slot: GATE_IN_A_TEMPERATURE, value: 293.15 },
                { slot: GATE_IN_B_TEMPERATURE, value: 293.15 },
                ...earthAir("A"),
            ],
            allDeltaSlots(),
        );
        // Mass is conserved per species: A_delta + B_delta = 0.
        for (const sp of V1_SPECIES_ORDER) {
            const A = captured.get(`${GATE_OUT_A_DELTA_PREFIX}${sp}`)!;
            const B = captured.get(`${GATE_OUT_B_DELTA_PREFIX}${sp}`)!;
            expect(A + B).toBeCloseTo(0, 12);
            // Active species (mole fraction > 0) get non-zero flux.
            if ((CHEMICAL_SPECIES_V1 as Record<string, { molarMass: number }>)[sp]) {
                const x = sp === "N2" ? 0.78 : sp === "O2" ? 0.21 : sp === "CO2" ? 0.0004 : sp === "H2O" ? 0.0096 : 0;
                if (x > 0) {
                    expect(A).toBeLessThan(0); // A loses mass
                    expect(B).toBeGreaterThan(0); // B gains mass
                }
            }
        }
        // Volumetric flow positive (A → B).
        expect(gate.lastVolumetricFlow).toBeGreaterThan(0);
    });

    it("uses A-side mole fractions when A is upwind (high P)", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "open_passive";
        gate.area = 1;
        gate.leakCoeff = 1e-3;
        // A is at high pressure with N2-only composition; B is irrelevant
        // because A is upwind.
        const captured = runFire(
            gate,
            [
                { slot: GATE_IN_A_PRESSURE, value: 200000 },
                { slot: GATE_IN_B_PRESSURE, value: 100000 },
                { slot: GATE_IN_A_TEMPERATURE, value: 293.15 },
                { slot: GATE_IN_B_TEMPERATURE, value: 293.15 },
                { slot: `${GATE_IN_A_MOLE_FRACTION_PREFIX}N2`, value: 1 },
                { slot: `${GATE_IN_B_MOLE_FRACTION_PREFIX}CO2`, value: 1 }, // irrelevant
            ],
            allDeltaSlots(),
        );
        // Only N2 flows (A-side composition); CO2 stays at zero.
        expect(captured.get(`${GATE_OUT_B_DELTA_PREFIX}N2`)!).toBeGreaterThan(0);
        expect(captured.get(`${GATE_OUT_B_DELTA_PREFIX}CO2`)!).toBe(0);
    });

    it("uses B-side mole fractions when B is upwind (reverse flow)", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "open_passive";
        gate.area = 1;
        gate.leakCoeff = 1e-3;
        gate.bidirectional = true;
        // B is at high pressure with pure CO2; A is irrelevant.
        const captured = runFire(
            gate,
            [
                { slot: GATE_IN_A_PRESSURE, value: 100000 },
                { slot: GATE_IN_B_PRESSURE, value: 200000 },
                { slot: GATE_IN_A_TEMPERATURE, value: 293.15 },
                { slot: GATE_IN_B_TEMPERATURE, value: 293.15 },
                { slot: `${GATE_IN_A_MOLE_FRACTION_PREFIX}N2`, value: 1 }, // irrelevant
                { slot: `${GATE_IN_B_MOLE_FRACTION_PREFIX}CO2`, value: 1 },
            ],
            allDeltaSlots(),
        );
        // Reverse flow: A_delta positive (mass entering A), B_delta negative.
        expect(captured.get(`${GATE_OUT_A_DELTA_PREFIX}CO2`)!).toBeGreaterThan(0);
        expect(captured.get(`${GATE_OUT_B_DELTA_PREFIX}CO2`)!).toBeLessThan(0);
        // N2 stays at zero (B-side composition only had CO2).
        expect(captured.get(`${GATE_OUT_A_DELTA_PREFIX}N2`)!).toBe(0);
        // Volumetric flow negative (reverse direction).
        expect(gate.lastVolumetricFlow).toBeLessThan(0);
    });

    it("check-valve: bidirectional=false blocks back-flow when P_A < P_B", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "open_passive";
        gate.bidirectional = false;
        const captured = runFire(
            gate,
            [
                { slot: GATE_IN_A_PRESSURE, value: 100000 },
                { slot: GATE_IN_B_PRESSURE, value: 200000 },
                { slot: GATE_IN_A_TEMPERATURE, value: 293.15 },
                { slot: GATE_IN_B_TEMPERATURE, value: 293.15 },
                ...earthAir("A"),
                ...earthAir("B"),
            ],
            allDeltaSlots(),
        );
        for (const slot of allDeltaSlots()) {
            expect(captured.get(slot)).toBeCloseTo(0, 12);
        }
        expect(gate.lastVolumetricFlow).toBe(0);
    });

    it("zero ΔP with bidirectional=true: no flux", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "open_passive";
        const captured = runFire(
            gate,
            [
                { slot: GATE_IN_A_PRESSURE, value: 100000 },
                { slot: GATE_IN_B_PRESSURE, value: 100000 },
                { slot: GATE_IN_A_TEMPERATURE, value: 293.15 },
                { slot: GATE_IN_B_TEMPERATURE, value: 293.15 },
                ...earthAir("A"),
            ],
            allDeltaSlots(),
        );
        for (const slot of allDeltaSlots()) {
            expect(captured.get(slot)).toBeCloseTo(0, 12);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. hvac_forced mode
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode — hvac_forced mode", () => {
    it("ignores ΔP — flux always A → B at forcedFlow rate", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "hvac_forced";
        gate.forcedFlow = 1; // m³/s
        // Even when B > A, mode forces A → B.
        const captured = runFire(
            gate,
            [
                { slot: GATE_IN_A_PRESSURE, value: 100000 },
                { slot: GATE_IN_B_PRESSURE, value: 200000 }, // B higher
                { slot: GATE_IN_A_TEMPERATURE, value: 293.15 },
                { slot: GATE_IN_B_TEMPERATURE, value: 293.15 },
                ...earthAir("A"),
            ],
            allDeltaSlots(),
        );
        // Active A species (N2, O2, CO2, H2O) move from A to B.
        expect(captured.get(`${GATE_OUT_A_DELTA_PREFIX}N2`)!).toBeLessThan(0);
        expect(captured.get(`${GATE_OUT_B_DELTA_PREFIX}N2`)!).toBeGreaterThan(0);
        expect(gate.lastVolumetricFlow).toBeGreaterThan(0);
    });

    it("flux scales linearly with forcedFlow", () => {
        const gate1 = new AtmosphereGateNode();
        gate1.mode = "hvac_forced";
        gate1.forcedFlow = 1;
        const gate2 = new AtmosphereGateNode();
        gate2.mode = "hvac_forced";
        gate2.forcedFlow = 2;
        const inputs = [
            { slot: GATE_IN_A_PRESSURE, value: 100000 },
            { slot: GATE_IN_B_PRESSURE, value: 90000 },
            { slot: GATE_IN_A_TEMPERATURE, value: 293.15 },
            { slot: GATE_IN_B_TEMPERATURE, value: 293.15 },
            { slot: `${GATE_IN_A_MOLE_FRACTION_PREFIX}N2`, value: 1 },
        ];
        const cap1 = runFire(gate1, inputs, [`${GATE_OUT_B_DELTA_PREFIX}N2`]);
        const cap2 = runFire(gate2, inputs, [`${GATE_OUT_B_DELTA_PREFIX}N2`]);
        const f1 = cap1.get(`${GATE_OUT_B_DELTA_PREFIX}N2`)!;
        const f2 = cap2.get(`${GATE_OUT_B_DELTA_PREFIX}N2`)!;
        expect(f2 / f1).toBeCloseTo(2, 6);
    });

    it("matches ideal-gas formula: kg/s = V̇ × P_A × x_A × M / RT_A", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "hvac_forced";
        gate.forcedFlow = 0.5;
        const inputs = [
            { slot: GATE_IN_A_PRESSURE, value: 101325 },
            { slot: GATE_IN_A_TEMPERATURE, value: 300 },
            { slot: `${GATE_IN_A_MOLE_FRACTION_PREFIX}N2`, value: 0.78 },
        ];
        const captured = runFire(gate, inputs, [`${GATE_OUT_B_DELTA_PREFIX}N2`]);
        const expected = (0.5 * 101325 * CHEMICAL_SPECIES_V1.N2.molarMass * 0.78) / (GAS_CONSTANT_R * 300);
        expect(captured.get(`${GATE_OUT_B_DELTA_PREFIX}N2`)!).toBeCloseTo(expected, 9);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. IIntegrable conditional
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode — IIntegrable conditional", () => {
    it("stateSize is 0 in closed and open_passive modes", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "closed";
        expect(gate.stateSize).toBe(0);
        gate.mode = "open_passive";
        expect(gate.stateSize).toBe(0);
    });

    it("stateSize is 0 in hvac_forced when trackThroughput is off", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "hvac_forced";
        gate.trackThroughput = false;
        expect(gate.stateSize).toBe(0);
    });

    it("stateSize is 1 in hvac_forced + trackThroughput=true (cumulative volume)", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "hvac_forced";
        gate.trackThroughput = true;
        gate.forcedFlow = 0.5;
        expect(gate.stateSize).toBe(1);
        expect(gate.stateNames).toEqual(["throughput_m3"]);
        // rhs returns the volumetric flow.
        const y = new Float64Array([0]);
        const dydt = new Float64Array([0]);
        const inputs: IIntegrationInputs = {
            get: () => undefined,
            has: () => false,
            sumPrefix: () => 0,
        };
        gate.rhs(0, y, 0, inputs, dydt);
        expect(dydt[0]).toBeCloseTo(0.5, 12);
    });

    it("gatherState / writeState round-trip the cumulative throughput", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "hvac_forced";
        gate.trackThroughput = true;
        const y = new Float64Array([123.45]);
        gate.writeState(y, 0);
        const y2 = new Float64Array(1);
        gate.gatherState(y2, 0);
        expect(y2[0]).toBeCloseTo(123.45, 9);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Quantity accessors
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode — Quantity-aware accessors", () => {
    it("areaQ setter accepts any Area unit and stores canonical m²", () => {
        const gate = new AtmosphereGateNode();
        gate.areaQ = new Area(100, Area.Units.cm2); // = 0.01 m²
        expect(gate.area).toBeCloseTo(0.01, 12);
        gate.areaQ = new Area(1, Area.Units.ft2);
        expect(gate.area).toBeCloseTo(0.09290304, 12);
    });

    it("forcedFlowQ setter accepts any VolumetricFlow unit (e.g. cfm, L/min)", () => {
        const gate = new AtmosphereGateNode();
        gate.forcedFlowQ = new VolumetricFlow(60, VolumetricFlow.Units.Lpmin); // = 1 L/s
        expect(gate.forcedFlow).toBeCloseTo(1e-3, 12);
        gate.forcedFlowQ = new VolumetricFlow(100, VolumetricFlow.Units.cfm);
        expect(gate.forcedFlow).toBeCloseTo(100 * 0.02831684659 / 60, 9);
    });

    it("Quantity getters return the canonical-SI value wrapped in a fresh instance", () => {
        const gate = new AtmosphereGateNode();
        gate.area = 0.05;
        expect(gate.areaQ.getValue(Area.Units.m2)).toBe(0.05);
        gate.forcedFlow = 0.001;
        expect(gate.forcedFlowQ.getValue(VolumetricFlow.Units.Lpmin)).toBeCloseTo(60, 6);
    });
});
