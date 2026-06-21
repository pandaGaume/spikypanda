/**
 * Unit tests for `Physics.Scene:atmosphere-gate` (refactored 2026-06-09).
 *
 * Coverage:
 *   1. Default state: no atmospheres bound → no flux, no throughput.
 *   2. closed mode: never moves mass.
 *   3. open_passive: pressure-driven flux A→B (positive ΔP); check-valve
 *      semantics with `bidirectional = false`.
 *   4. hvac_forced: fixed flow A→B; throughput accumulator updates only
 *      when trackThroughput is true.
 *   5. Mass conservation: per species, A.delta + B.delta ≈ 0 across
 *      a fire().
 *   6. Bindings: bindAtmosphereA/B/clearBindings invariants.
 *   7. Sample-rate requirement: defaults + editable accessor.
 */

import { AtmosphereGateNode, GATE_IN_ATMOSPHERE_A, GATE_IN_ATMOSPHERE_B, GATE_OUT_FLOW_RATE } from "../../dev/plugins/physics/src/scene/atmosphere-gate.node";
import type { IAtmosphereGateHandle } from "../../dev/plugins/physics/src/scene/atmosphere-gate.node";

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** A minimal mutable atmosphere stub satisfying IAtmosphereGateHandle.
 *  We track applied deltas per species so tests can assert what the
 *  gate did without relying on the real ideal-gas pressure model. */
class StubAtmosphere implements IAtmosphereGateHandle {
    public activeSpecies: string[];
    public temperatureK: number;
    public pressurePa: number;
    public volume: number;
    public massBySpecies: Map<string, number>;
    public moleFractionBySpecies: Map<string, number>;
    public deltaLog: Array<{ species: string; deltaKg: number }> = [];

    public constructor(opts: { species: string[]; T?: number; P?: number; volume?: number; mass?: Record<string, number>; moleFraction?: Record<string, number> }) {
        this.activeSpecies = [...opts.species];
        this.temperatureK = opts.T ?? 293.15;
        this.pressurePa = opts.P ?? 101325;
        this.volume = opts.volume ?? 100;
        this.massBySpecies = new Map(Object.entries(opts.mass ?? {}));
        this.moleFractionBySpecies = new Map(Object.entries(opts.moleFraction ?? {}));
    }

    public getMassKg(speciesId: string): number {
        return this.massBySpecies.get(speciesId) ?? 0;
    }
    public getMoleFraction(speciesId: string): number {
        return this.moleFractionBySpecies.get(speciesId) ?? 0;
    }
    public applyMassDelta(speciesId: string, deltaKg: number): void {
        this.deltaLog.push({ species: speciesId, deltaKg });
        const cur = this.massBySpecies.get(speciesId) ?? 0;
        this.massBySpecies.set(speciesId, Math.max(0, cur + deltaKg));
    }
}

interface FakeChannel {
    slot: string;
    enabled: boolean;
}

function fakeSession(
    dt = 0.01,
    channels: FakeChannel[] = []
): {
    dt: number;
    graph: { links: FakeChannel[] };
    published: Map<string, number>;
    publish(idx: number, v: unknown): void;
    consume(): unknown;
} {
    const published = new Map<string, number>();
    return {
        dt,
        graph: { links: channels },
        published,
        publish(idx: number, v: unknown) {
            published.set(channels[idx].slot, v as number);
        },
        consume() {
            return undefined;
        },
    };
}

// Standard 3-species setup (dry air-ish): same composition on both
// sides at different pressures so open_passive drives a non-zero flux.
function buildPair(): { A: StubAtmosphere; B: StubAtmosphere } {
    const moleFraction = { N2: 0.78, O2: 0.21, Ar: 0.01 };
    const A = new StubAtmosphere({
        species: ["N2", "O2", "Ar"],
        T: 293.15,
        P: 110_000, // higher
        volume: 100,
        moleFraction,
        mass: { N2: 100, O2: 25, Ar: 1 },
    });
    const B = new StubAtmosphere({
        species: ["N2", "O2", "Ar"],
        T: 293.15,
        P: 90_000, // lower
        volume: 100,
        moleFraction,
        mass: { N2: 100, O2: 25, Ar: 1 },
    });
    return { A, B };
}

// ─────────────────────────────────────────────────────────────────────
// 1. Default state
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode default state", () => {
    it("declares the new config-link ports and the single flow_rate output", () => {
        const gate = new AtmosphereGateNode();
        const inputs = gate.inputPorts.map((p) => p.slot);
        const outputs = gate.outputPorts.map((p) => p.slot);
        expect(inputs).toContain(GATE_IN_ATMOSPHERE_A);
        expect(inputs).toContain(GATE_IN_ATMOSPHERE_B);
        expect(outputs).toEqual([GATE_OUT_FLOW_RATE]);
    });

    it("does nothing when no atmospheres are bound", () => {
        const gate = new AtmosphereGateNode();
        const session = fakeSession();
        gate.fire(session as never, 0);
        expect(gate.lastVolumetricFlow).toBe(0);
        expect(gate.throughput).toBe(0);
    });

    it("defaults: mode=open_passive, requiredHz=100, bidirectional=true", () => {
        const gate = new AtmosphereGateNode();
        expect(gate.mode).toBe("open_passive");
        expect(gate.requiredHz).toBe(100);
        expect(gate.bidirectional).toBe(true);
        expect(gate.trackThroughput).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. closed mode
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode closed mode", () => {
    it("never moves mass, never updates flow", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "closed";
        const { A, B } = buildPair();
        gate.bindAtmosphereA("A", A);
        gate.bindAtmosphereB("B", B);
        gate.fire(fakeSession() as never, 0);
        expect(gate.lastVolumetricFlow).toBe(0);
        expect(A.deltaLog).toHaveLength(0);
        expect(B.deltaLog).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. open_passive mode
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode open_passive mode", () => {
    it("positive ΔP (A > B) drives mass A → B", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "open_passive";
        gate.area = 1.0;
        gate.leakCoeff = 1e-4;
        const { A, B } = buildPair(); // ΔP = +20 kPa
        gate.bindAtmosphereA("A", A);
        gate.bindAtmosphereB("B", B);
        gate.fire(fakeSession(0.01) as never, 0);

        expect(gate.lastVolumetricFlow).toBeGreaterThan(0);
        // A is losing mass on every species (signs negative on A side).
        for (const log of A.deltaLog) expect(log.deltaKg).toBeLessThan(0);
        for (const log of B.deltaLog) expect(log.deltaKg).toBeGreaterThan(0);
    });

    it("negative ΔP with bidirectional=false is a check-valve (no flow)", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "open_passive";
        gate.bidirectional = false;
        const { A, B } = buildPair();
        // Flip so B is higher than A → ΔP < 0 → check-valve blocks.
        A.pressurePa = 90_000;
        B.pressurePa = 110_000;
        gate.bindAtmosphereA("A", A);
        gate.bindAtmosphereB("B", B);
        gate.fire(fakeSession() as never, 0);
        expect(gate.lastVolumetricFlow).toBe(0);
        expect(A.deltaLog).toHaveLength(0);
        expect(B.deltaLog).toHaveLength(0);
    });

    it("negative ΔP with bidirectional=true gives reverse flow (B → A)", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "open_passive";
        gate.bidirectional = true;
        gate.area = 1.0;
        gate.leakCoeff = 1e-4;
        const { A, B } = buildPair();
        A.pressurePa = 90_000;
        B.pressurePa = 110_000;
        gate.bindAtmosphereA("A", A);
        gate.bindAtmosphereB("B", B);
        gate.fire(fakeSession(0.01) as never, 0);
        expect(gate.lastVolumetricFlow).toBeLessThan(0); // signed: B → A
        // A is GAINING mass; B is LOSING.
        for (const log of A.deltaLog) expect(log.deltaKg).toBeGreaterThan(0);
        for (const log of B.deltaLog) expect(log.deltaKg).toBeLessThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. hvac_forced mode + throughput
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode hvac_forced mode", () => {
    it("forces a fixed A → B flow even when ΔP is zero or negative", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "hvac_forced";
        gate.forcedFlow = 0.5;
        const { A, B } = buildPair();
        A.pressurePa = 90_000;
        B.pressurePa = 110_000; // B higher
        gate.bindAtmosphereA("A", A);
        gate.bindAtmosphereB("B", B);
        gate.fire(fakeSession(0.01) as never, 0);
        expect(gate.lastVolumetricFlow).toBeCloseTo(0.5, 9);
        for (const log of A.deltaLog) expect(log.deltaKg).toBeLessThan(0);
        for (const log of B.deltaLog) expect(log.deltaKg).toBeGreaterThan(0);
    });

    it("trackThroughput=true accumulates volume across fires (forcedFlow × Σdt)", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "hvac_forced";
        gate.forcedFlow = 0.5;
        gate.trackThroughput = true;
        const { A, B } = buildPair();
        gate.bindAtmosphereA("A", A);
        gate.bindAtmosphereB("B", B);
        gate.fire(fakeSession(0.01) as never, 0);
        gate.fire(fakeSession(0.01) as never, 0);
        gate.fire(fakeSession(0.01) as never, 0);
        expect(gate.throughput).toBeCloseTo(0.5 * 0.03, 9);
    });

    it("trackThroughput=false leaves the accumulator at 0", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "hvac_forced";
        gate.forcedFlow = 0.5;
        gate.trackThroughput = false;
        const { A, B } = buildPair();
        gate.bindAtmosphereA("A", A);
        gate.bindAtmosphereB("B", B);
        gate.fire(fakeSession(0.01) as never, 0);
        expect(gate.throughput).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Mass conservation
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode mass conservation", () => {
    it("per species, the delta applied to A equals -1× the delta applied to B", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "open_passive";
        gate.area = 1.0;
        gate.leakCoeff = 1e-4;
        const { A, B } = buildPair();
        gate.bindAtmosphereA("A", A);
        gate.bindAtmosphereB("B", B);
        gate.fire(fakeSession(0.01) as never, 0);
        // Sum per species across the deltas:
        const aBySpecies = new Map<string, number>();
        const bBySpecies = new Map<string, number>();
        for (const log of A.deltaLog) aBySpecies.set(log.species, (aBySpecies.get(log.species) ?? 0) + log.deltaKg);
        for (const log of B.deltaLog) bBySpecies.set(log.species, (bBySpecies.get(log.species) ?? 0) + log.deltaKg);
        for (const sp of A.activeSpecies) {
            const da = aBySpecies.get(sp) ?? 0;
            const db = bBySpecies.get(sp) ?? 0;
            expect(da + db).toBeCloseTo(0, 12);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────
// 6. Bindings + clearBindings
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode binding API", () => {
    it("bindAtmosphereA/B + clearBindings invariants", () => {
        const gate = new AtmosphereGateNode();
        expect(gate.isAtmosphereAWired).toBe(false);
        expect(gate.isAtmosphereBWired).toBe(false);
        const { A, B } = buildPair();
        gate.bindAtmosphereA("a", A);
        gate.bindAtmosphereB("b", B);
        expect(gate.isAtmosphereAWired).toBe(true);
        expect(gate.isAtmosphereBWired).toBe(true);
        gate.clearBindings();
        expect(gate.isAtmosphereAWired).toBe(false);
        expect(gate.isAtmosphereBWired).toBe(false);
    });

    it("unbinding one side stops all flow", () => {
        const gate = new AtmosphereGateNode();
        gate.mode = "hvac_forced";
        gate.forcedFlow = 1.0;
        const { A, B } = buildPair();
        gate.bindAtmosphereA("a", A);
        // B not bound.
        gate.fire(fakeSession() as never, 0);
        expect(gate.lastVolumetricFlow).toBe(0);
        expect(A.deltaLog).toHaveLength(0);
        expect(B.deltaLog).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 7. P8 sample rate
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereGateNode sample rate requirement", () => {
    it("requiredSampleRateHz editable clamps to positive defaults on bad input", () => {
        const gate = new AtmosphereGateNode();
        gate.requiredSampleRateHz = 250;
        expect(gate.requiredHz).toBe(250);
        gate.requiredSampleRateHz = -5;
        expect(gate.requiredHz).toBe(100);
        gate.requiredSampleRateHz = NaN;
        expect(gate.requiredHz).toBe(100);
    });
});
