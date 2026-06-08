/**
 * Tests for `Physics.Scene:atmosphere` — the multi-layer container
 * (introduced 2026-06-08 when the Atmosphere split into a Layer
 * IIntegrable + a Container facade).
 *
 * Coverage:
 *   1. Default behavior: with NO layers wired, the container falls
 *      back to its hidden internal default layer (working atmosphere
 *      out of the box, no extra wiring needed).
 *   2. Composite IIntegrable: stateSize / stateNames / gatherState /
 *      writeState / rhs dispatch across the active layer set with
 *      proper offsets.
 *   3. Aggregation: volume-weighted pressure/temperature/density
 *      across multiple layers reduce correctly for the 1-layer case
 *      and combine for the N-layer case.
 *   4. clearBindings + re-bind: a sync pass that re-wires the same
 *      layers reflects only the current canvas state.
 */

import type { IIntegrationInputs, ISession, SceneStateView } from "spikypanda-core";
import { AtmosphereLayerNode } from "../../dev/plugins/physics/src/scene/atmosphere-layer.node";
import { AtmosphereNode } from "../../dev/plugins/physics/src/scene/atmosphere.node";
import type { ILayerHandle } from "../../dev/plugins/physics/src/scene/atmosphere.node";
import { V1_SPECIES_ORDER, buildDefaultStateView } from "../../dev/core/src";

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

function defaultSession(): ISession {
    return emptySession(buildDefaultStateView("scene"));
}

/** Build a Layer pre-configured with a small mock composition (dry air
 *  with custom volume) so we can predict its share of aggregates. */
function dryAirLayer(volumeM3: number): AtmosphereLayerNode {
    const layer = new AtmosphereLayerNode();
    layer.volume = volumeM3;
    layer.bindComposition("composition-uuid", {
        components: [
            { speciesId: "N2", moleFraction: 0.78, molarMass: 0.0280134 },
            { speciesId: "O2", moleFraction: 0.21, molarMass: 0.0319988 },
            { speciesId: "Ar", moleFraction: 0.01, molarMass: 0.039948 },
        ],
        referencePressurePa: 101325,
        particulates: [],
    });
    layer.reset(defaultSession());
    return layer;
}

// ─────────────────────────────────────────────────────────────────────
// 1. Default behavior: hidden internal layer when nothing wired
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereNode — default (no layers wired)", () => {
    it("active_layer_count = 1 when no layers are bound", () => {
        const atm = new AtmosphereNode();
        expect(atm.bound_layer_count).toBe(0);
        expect(atm.active_layer_count).toBe(1);
        expect(atm.boundLayerCount).toBe(0);
    });

    it("default (no layers wired) falls back to V1 schema at reset (inherited Layer behavior)", () => {
        const atm = new AtmosphereNode();
        atm.reset(defaultSession());
        // The Atmosphere IS-A Layer; activeSpecies returns the V1 set.
        expect(atm.activeSpecies).toEqual(V1_SPECIES_ORDER);
    });

    it("stateSize equals super.stateSize when no external layers wired (5 V1 species)", () => {
        const atm = new AtmosphereNode();
        atm.reset(defaultSession());
        expect(atm.stateSize).toBe(V1_SPECIES_ORDER.length);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Composite IIntegrable dispatch
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereNode — composite IIntegrable dispatch", () => {
    it("stateSize = sum of bound layer stateSizes (3 layers × 3 species)", () => {
        const atm = new AtmosphereNode();
        atm.bindLayer("L0", dryAirLayer(50));
        atm.bindLayer("L1", dryAirLayer(50));
        atm.bindLayer("L2", dryAirLayer(50));
        expect(atm.stateSize).toBe(9);
    });

    it("stateNames prefix each layer's species with L<index>_", () => {
        const atm = new AtmosphereNode();
        atm.bindLayer("L0", dryAirLayer(50));
        atm.bindLayer("L1", dryAirLayer(50));
        const names = atm.stateNames;
        expect(names).toEqual(["L0_m_N2", "L0_m_O2", "L0_m_Ar", "L1_m_N2", "L1_m_O2", "L1_m_Ar"]);
    });

    it("gatherState / writeState round-trip a contiguous vector across layers", () => {
        const atm = new AtmosphereNode();
        atm.bindLayer("L0", dryAirLayer(50));
        atm.bindLayer("L1", dryAirLayer(50));
        const y = new Float64Array(atm.stateSize);
        atm.gatherState(y, 0);
        // Each layer should have non-zero N2 mass after seeding.
        expect(y[0]).toBeGreaterThan(0);
        expect(y[3]).toBeGreaterThan(0);
        // Mutate and write back.
        for (let i = 0; i < y.length; i++) y[i] = 0.5 * (i + 1);
        atm.writeState(y, 0);
        const y2 = new Float64Array(atm.stateSize);
        atm.gatherState(y2, 0);
        for (let i = 0; i < y2.length; i++) {
            expect(y2[i]).toBeCloseTo(0.5 * (i + 1), 9);
        }
    });

    it("rhs dispatches per-layer at the right offset", () => {
        const atm = new AtmosphereNode();
        atm.bindLayer("L0", dryAirLayer(50));
        atm.bindLayer("L1", dryAirLayer(50));
        const inputs = new InputsStub();
        // Producer publishes only on a slot that the layer recognises.
        inputs.set("delta_N2_0", 0.123);
        const y = new Float64Array(atm.stateSize);
        const dydt = new Float64Array(atm.stateSize);
        atm.rhs(0, y, 0, inputs, dydt);
        // Layer 0 and Layer 1 both see the same input snapshot in V1
        // (the runtime doesn't yet route per-compartment slots), so
        // BOTH should pick up 0.123 in their N2 slot (index 0 inside
        // each layer's block: 0 for L0, 3 for L1).
        expect(dydt[0]).toBeCloseTo(0.123, 9);
        expect(dydt[3]).toBeCloseTo(0.123, 9);
        // Other slots stay zero.
        for (let i = 0; i < dydt.length; i++) {
            if (i !== 0 && i !== 3) expect(dydt[i]).toBe(0);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Aggregation
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereNode — aggregate publish via fire()", () => {
    it("captures volume-weighted pressure/temperature/density from active layers", () => {
        const atm = new AtmosphereNode();
        atm.bindLayer("L0", dryAirLayer(50));
        atm.bindLayer("L1", dryAirLayer(150)); // bigger layer → dominates the weighted mean

        // Build a session that captures publishes by slot name.
        const captured = new Map<string, number>();
        const slots = ["pressure", "temperature", "density"];
        // The container needs onsc links to publish — wire one channel
        // per output slot via the test helper that simulates a session.
        const links: { slot: string; enabled: boolean }[] = slots.map((s) => ({ slot: s, enabled: true }));
        const session: ISession = {
            graph: { links },
            linkStates: links.map(() => ({ ready: false })),
            sceneStateView: buildDefaultStateView("scene"),
            consume: () => undefined,
            publish: (idx: number, value: unknown) => {
                captured.set(links[idx].slot, value as number);
            },
            peek: () => undefined,
        } as unknown as ISession;
        // The publisher iterates over the node's own onsc<IChannel>(),
        // so attach the channels to the container's onsc pool. We use
        // the runtime's standard "link.target = node" handshake.
        for (const link of links) {
            (atm as unknown as { _onsc: unknown[] })._onsc =
                (atm as unknown as { _onsc?: unknown[] })._onsc ?? [];
            (atm as unknown as { _onsc: unknown[] })._onsc.push(link);
        }

        atm.fire(session, 0);
        // The captured values should be in the expected ranges. With
        // both layers at the same composition and 20 °C, pressure
        // ~101325 Pa, temperature 293.15 K, density ~1.2 kg/m³.
        expect(captured.get("pressure")).toBeCloseTo(101325, -1);
        expect(captured.get("temperature")).toBeCloseTo(293.15, 6);
        expect(captured.get("density")).toBeGreaterThan(1);
        expect(captured.get("density")).toBeLessThan(2);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. clearBindings + re-bind
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereNode — clearBindings sync invariants", () => {
    it("clearBindings drops to 0 bound layers (active layer count reverts to default = 1)", () => {
        const atm = new AtmosphereNode();
        atm.bindLayer("L0", dryAirLayer(50));
        atm.bindLayer("L1", dryAirLayer(50));
        expect(atm.bound_layer_count).toBe(2);
        atm.clearBindings();
        expect(atm.bound_layer_count).toBe(0);
        expect(atm.active_layer_count).toBe(1);
    });

    it("re-bind after clearBindings reflects current wirings only", () => {
        const atm = new AtmosphereNode();
        const a = dryAirLayer(50);
        const b = dryAirLayer(50);
        atm.bindLayer("L0", a);
        atm.bindLayer("L1", b);
        atm.clearBindings();
        atm.bindLayer("L0", a);
        expect(atm.bound_layer_count).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. ILayerHandle stub compatibility
// ─────────────────────────────────────────────────────────────────────

describe("AtmosphereNode — ILayerHandle stub interop", () => {
    it("accepts a minimal stub satisfying ILayerHandle", () => {
        const stub: ILayerHandle = {
            stateSize: 2,
            stateNames: ["x", "y"],
            gatherState: (y, off) => {
                y[off] = 1;
                y[off + 1] = 2;
            },
            writeState: () => undefined,
            rhs: (_t, _y, off, _inputs, dydt) => {
                dydt[off] = 10;
                dydt[off + 1] = 20;
            },
            reset: () => undefined,
            fire: () => undefined,
            sampleAggregates: () => ({ pressure: 1000, temperatureK: 300, density: 0.05, mass: 5, volumeM3: 100 }),
        };
        const atm = new AtmosphereNode();
        atm.bindLayer("stub-uuid", stub);
        expect(atm.stateSize).toBe(2);
        const dydt = new Float64Array(2);
        atm.rhs(0, new Float64Array(2), 0, new InputsStub(), dydt);
        expect(dydt[0]).toBe(10);
        expect(dydt[1]).toBe(20);
    });
});
