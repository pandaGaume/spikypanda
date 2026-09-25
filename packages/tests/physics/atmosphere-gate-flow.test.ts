/**
 * AtmosphereGateNode, the `flow` input and the `exchange` mode
 * (2026-09-25): a ventilation loop between two volumes, at a flow a fan
 * may drive.
 *
 *   1. `exchange` moves the flow both ways: no net air, each species
 *      from the richer side to the poorer, mass conserved.
 *   2. A wired `flow` signal overrides the `forcedFlow` editable, in
 *      `hvac_forced` and in `exchange`; an unwired gate keeps the editable.
 *   3. `closed` still moves nothing, whatever is wired.
 */
import { AtmosphereGateNode, GATE_IN_FLOW } from "../../dev/plugins/physics/src/scene/atmosphere-gate.node";
import type { IAtmosphereGateHandle } from "../../dev/plugins/physics/src/scene/atmosphere-gate.node";

const R = 8.314462618;
const M: Record<string, number> = { N2: 28.0134e-3, O2: 31.9988e-3, CO2: 44.0095e-3 };

/** A well-mixed volume at a fixed temperature and volume: pressure and mole fractions follow its masses (ideal gas). */
class Volume implements IAtmosphereGateHandle {
    public readonly activeSpecies: string[];
    public readonly temperatureK = 295.15;
    public mass: Record<string, number>;
    public constructor(public readonly volume: number, mass: Record<string, number>) {
        this.mass = { ...mass };
        this.activeSpecies = Object.keys(mass);
    }
    private moles(): number {
        return this.activeSpecies.reduce((n, s) => n + this.mass[s] / M[s], 0);
    }
    public get pressurePa(): number {
        return (this.moles() * R * this.temperatureK) / this.volume;
    }
    public getMassKg(s: string): number {
        return this.mass[s] ?? 0;
    }
    public getMoleFraction(s: string): number {
        return this.mass[s] / M[s] / this.moles();
    }
    public applyMassDelta(s: string, d: number): void {
        this.mass[s] = Math.max(0, (this.mass[s] ?? 0) + d);
    }
    public get co2Ppm(): number {
        return this.getMoleFraction("CO2") * 1e6;
    }
    public get total(): number {
        return this.activeSpecies.reduce((m, s) => m + this.mass[s], 0);
    }
}

/** Two volumes of 30 m3 of air at 101325 Pa, the first at 2000 ppm of CO2, the second at 1000. */
function pair(): { A: Volume; B: Volume } {
    const air = (ppm: number) => {
        const n = (101325 * 30) / (R * 295.15);
        const x = { N2: 0.79 - ppm * 1e-6, O2: 0.21, CO2: ppm * 1e-6 };
        return Object.fromEntries(Object.entries(x).map(([s, f]) => [s, f * n * M[s]]));
    };
    return { A: new Volume(30, air(2000)), B: new Volume(30, air(1000)) };
}

/** A session whose links carry a `flow` signal into the gate when asked. */
function session(dt: number, flow?: number, gate?: AtmosphereGateNode): { dt: number; graph: { links: unknown[] }; publish(): void; consume(): unknown; readSignal(idx: number): unknown } {
    const links: unknown[] = [];
    if (flow !== undefined && gate) {
        // A channel into the gate's `flow` slot, as the runtime builder would register it on the node.
        const link = { slot: "value", toSlot: GATE_IN_FLOW, enabled: true, oini: null, ofin: gate };
        links.push(link);
        (gate as unknown as { add(l: unknown): void }).add(link);
    }
    return { dt, graph: { links }, publish() {}, consume: () => undefined, readSignal: (idx: number) => (idx === 0 && flow !== undefined ? flow : undefined) };
}

describe("AtmosphereGateNode: the exchange mode", () => {
    it("moves CO2 from the richer volume to the poorer with no net air, mass conserved", () => {
        const { A, B } = pair();
        const gate = new AtmosphereGateNode();
        gate.mode = "exchange";
        gate.forcedFlow = 0.033; // 2 m3/min each way
        gate.bindAtmosphereA("a", A);
        gate.bindAtmosphereB("b", B);
        const before = { a: A.total, b: B.total, co2: A.mass.CO2 + B.mass.CO2, ppmA: A.co2Ppm, ppmB: B.co2Ppm };
        const s = session(6);
        for (let k = 0; k < 100; k++) gate.fire(s as never, k * 6);
        expect(A.co2Ppm).toBeLessThan(before.ppmA);
        expect(B.co2Ppm).toBeGreaterThan(before.ppmB);
        expect(A.mass.CO2 + B.mass.CO2).toBeCloseTo(before.co2, 12);
        // No net air: each side keeps its total mass to the precision of the CO2 it traded for N2/O2.
        expect(Math.abs(A.total - before.a) / before.a).toBeLessThan(1e-3);
        expect(Math.abs(B.total - before.b) / before.b).toBeLessThan(1e-3);
        expect(gate.lastVolumetricFlow).toBeCloseTo(0.033, 9);
    });

    it("carries the flux the mass balance says: Q times the difference of CO2 densities, over the first tick", () => {
        const { A, B } = pair();
        const gate = new AtmosphereGateNode();
        gate.mode = "exchange";
        gate.forcedFlow = 0.05;
        gate.bindAtmosphereA("a", A);
        gate.bindAtmosphereB("b", B);
        const rho = (v: Volume) => (v.getMoleFraction("CO2") * v.pressurePa * M.CO2) / (R * v.temperatureK);
        const expected = 0.05 * (rho(A) - rho(B)) * 6;
        const co2A = A.mass.CO2;
        gate.fire(session(6) as never, 0);
        expect(co2A - A.mass.CO2).toBeCloseTo(expected, 9);
    });
});

describe("AtmosphereGateNode: the flow input", () => {
    it("takes a wired flow over the editable, in the forced and exchange modes", () => {
        for (const mode of ["hvac_forced", "exchange"] as const) {
            const { A, B } = pair();
            const gate = new AtmosphereGateNode();
            gate.mode = mode;
            gate.forcedFlow = 0.001;
            gate.trackThroughput = true;
            gate.bindAtmosphereA("a", A);
            gate.bindAtmosphereB("b", B);
            gate.fire(session(6, 0.02, gate) as never, 0);
            expect(gate.lastVolumetricFlow).toBeCloseTo(0.02, 9);
            expect(gate.throughput).toBeCloseTo(0.12, 9);
        }
    });

    it("keeps the editable when nothing is wired, and moves nothing when closed", () => {
        const { A, B } = pair();
        const gate = new AtmosphereGateNode();
        gate.mode = "hvac_forced";
        gate.forcedFlow = 0.01;
        gate.bindAtmosphereA("a", A);
        gate.bindAtmosphereB("b", B);
        gate.fire(session(6) as never, 0);
        expect(gate.lastVolumetricFlow).toBeCloseTo(0.01, 9);
        gate.mode = "closed";
        const co2 = A.mass.CO2;
        gate.fire(session(6, 0.05, gate) as never, 6);
        expect(gate.lastVolumetricFlow).toBe(0);
        expect(A.mass.CO2).toBe(co2);
    });
});
