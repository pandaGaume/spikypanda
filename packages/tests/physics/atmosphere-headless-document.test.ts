/**
 * An atmosphere in a document, without the editor (2026-09-25). What a
 * factory's sandbox or a job does: build the document through the
 * registry, instantiate it, run it. Three things that did not hold before:
 *
 *   1. a producer wired into `delta_CO2_<k>` feeds the atmosphere's
 *      balance (the ports are declared; a second index of the pool is
 *      accepted by the document builder as a variadic slot);
 *   2. a gate wired to two atmospheres is bound, not turned into dead
 *      channels: it fires, and its exchange moves CO2 from the richer
 *      volume to the poorer;
 *   3. the transfer survives the solver: the solver re-reads the leaves
 *      before each step, so the mass of the two volumes together changes
 *      only by the producer, and the exchange is not erased.
 */
import { buildDocumentJson, instantiateDocument, parseDocument, runDocument, validateDocumentSpec } from "spikypanda-core";
import { buildJobRegistry } from "spikypanda-factory";

const R = 8.314462618;
const M = { N2: 28.0134e-3, O2: 31.9988e-3, CO2: 44.0095e-3, H2O: 18.01528e-3, Ar: 39.948e-3 };
const T = 295.15;

/** The initial masses of 30 m3 of Earth air at 101325 Pa with the CO2 replaced, in the V1 species order. */
function masses(co2Ppm: number, volume = 30): number[] {
    const x: Record<string, number> = { N2: 0.7715, O2: 0.2072, CO2: co2Ppm * 1e-6, H2O: 0.0116, Ar: 0.00928 };
    const n = (101325 * volume) / (R * T);
    return ["N2", "O2", "CO2", "H2O", "Ar"].map((s) => x[s] * n * M[s as keyof typeof M]);
}

const registry = buildJobRegistry();

function document(extra: { producerKgps?: number; gateMode?: string; flow?: number }): string {
    const nodes: Array<{ id: string; typeId: string; x: number; y: number; params?: Record<string, unknown> }> = [
        { id: "solver", typeId: "Control.Sim:rk4-solver", x: 0, y: 0, params: { tolerance: 1e-6, maxStep: 6 } },
        { id: "a", typeId: "Physics.Scene:atmosphere", x: 0, y: 0, params: { volume: 30, temperature_k: T, _initialMassKg: masses(2000) } },
        { id: "b", typeId: "Physics.Scene:atmosphere", x: 0, y: 0, params: { volume: 30, temperature_k: T, _initialMassKg: masses(1000) } },
    ];
    const connections: Array<{ from: [string, string]; to: [string, string] }> = [];
    if (extra.producerKgps !== undefined) {
        nodes.push({ id: "source", typeId: "Logic.Input:constant", x: 0, y: 0, params: { value: extra.producerKgps } });
        // The second index of the pool: declared as a variadic group, not as a port.
        connections.push({ from: ["source", "value"], to: ["a", "delta_CO2_1"] });
    }
    if (extra.gateMode) {
        nodes.push({ id: "gate", typeId: "Physics.Scene:atmosphere-gate", x: 0, y: 0, params: { mode: extra.gateMode, forcedFlow: 0.033, trackThroughput: true } });
        connections.push({ from: ["a", "atmosphere_out"], to: ["gate", "atmosphere_A_in"] }, { from: ["b", "atmosphere_out"], to: ["gate", "atmosphere_B_in"] });
        if (extra.flow !== undefined) {
            nodes.push({ id: "fan", typeId: "Logic.Input:constant", x: 0, y: 0, params: { value: extra.flow } });
            connections.push({ from: ["fan", "value"], to: ["gate", "flow"] });
        }
    }
    return buildDocumentJson(registry, nodes, connections);
}

type Atmosphere = { getMassKg(s: string): number; getMoleFraction(s: string): number; total_mass: number };

describe("an atmosphere in a document, headless", () => {
    it("validates a connection into a second index of the delta pool as the builder builds it", () => {
        const nodes = [
            { id: "a", typeId: "Physics.Scene:atmosphere", x: 0, y: 0, params: { volume: 30 } },
            { id: "source", typeId: "Logic.Input:constant", x: 0, y: 0, params: { value: 1e-5 } },
        ];
        expect(validateDocumentSpec(registry, nodes, [{ from: ["source", "value"], to: ["a", "delta_CO2_1"] }])).toEqual([]);
        expect(validateDocumentSpec(registry, nodes, [{ from: ["source", "value"], to: ["a", "delta_CO2_x"] }]).map((p) => p.what)).toEqual(['node "a" has no input port "delta_CO2_x"']);
    });

    it("takes a producer on a second index of its delta pool, and the solver integrates it", () => {
        const loaded = instantiateDocument(parseDocument(document({ producerKgps: 1e-5 })), registry);
        expect(loaded.missingTypeIds).toEqual([]);
        expect(loaded.skippedConnections).toEqual([]);
        const a = loaded.instances.get("a") as Atmosphere;
        const before = a.getMassKg("CO2");
        runDocument(loaded, { dt: 6, duration: 600, probes: [{ node: "a", property: "total_mass" }] });
        // 100 ticks of 6 s, the first of which does not integrate (no elapsed time yet): 594 s at 1e-5 kg/s.
        expect(a.getMassKg("CO2") - before).toBeCloseTo(5.94e-3, 6);
    });

    it("binds a gate to its two atmospheres instead of allocating dead channels, and the exchange moves CO2 across the solver's steps", () => {
        const loaded = instantiateDocument(parseDocument(document({ gateMode: "exchange" })), registry);
        expect(loaded.skippedConnections).toEqual([]);
        const gate = loaded.instances.get("gate") as { isAtmosphereAWired: boolean; isAtmosphereBWired: boolean; throughput: number; lastVolumetricFlow: number };
        expect(gate.isAtmosphereAWired && gate.isAtmosphereBWired).toBe(true);
        const a = loaded.instances.get("a") as Atmosphere;
        const b = loaded.instances.get("b") as Atmosphere;
        const co2Before = a.getMassKg("CO2") + b.getMassKg("CO2");
        const ppmABefore = a.getMoleFraction("CO2") * 1e6;
        const ppmBBefore = b.getMoleFraction("CO2") * 1e6;
        runDocument(loaded, { dt: 6, duration: 600, probes: [{ node: "gate", property: "throughput" }] });
        expect(gate.lastVolumetricFlow).toBeCloseTo(0.033, 9);
        // The gate fires on every tick but the first one carries no elapsed time: 99 ticks of 6 s.
        expect(gate.throughput).toBeCloseTo(0.033 * 594, 6);
        // With 2 m3/min each way between two volumes of 30 m3, ten minutes bring them most of the way together.
        expect(a.getMoleFraction("CO2") * 1e6).toBeLessThan(ppmABefore - 300);
        expect(b.getMoleFraction("CO2") * 1e6).toBeGreaterThan(ppmBBefore + 300);
        expect(a.getMassKg("CO2") + b.getMassKg("CO2")).toBeCloseTo(co2Before, 9);
    });

    it("lets a wired flow drive the gate", () => {
        const loaded = instantiateDocument(parseDocument(document({ gateMode: "exchange", flow: 0.01 })), registry);
        expect(loaded.skippedConnections).toEqual([]);
        const gate = loaded.instances.get("gate") as { lastVolumetricFlow: number };
        runDocument(loaded, { dt: 6, duration: 60, probes: [{ node: "gate", property: "throughput" }] });
        expect(gate.lastVolumetricFlow).toBeCloseTo(0.01, 9);
    });
});
