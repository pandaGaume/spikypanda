/**
 * Tests for the P8 sample-rate requirement infrastructure (2026-06-09).
 *
 * Coverage:
 *   1. `IHasSampleRateRequirement` structural guard accepts well-formed
 *      objects + rejects malformed ones.
 *   2. Concrete plugin-physics nodes opt in correctly (AtmosphereLayer,
 *      AtmosphereGate, DcMotorDynamic) with sensible defaults.
 *   3. `SimGraphNode._aggregateRequiredHzFromSession` takes max() and
 *      floors at MIN_EFFECTIVE_HZ (60 Hz).
 *   4. Mixed graphs (some opt-in, some not) — only opt-in nodes
 *      contribute; the rest are ignored.
 *   5. Empty / all-non-opt-in graphs return 0 (caller's signal to
 *      fall back further).
 */

import { Frequency, hasSampleRateRequirement, MIN_EFFECTIVE_HZ, SimGraphNode } from "../../dev/core/src";
import type { IHasSampleRateRequirement } from "../../dev/core/src";
import { AtmosphereGateNode } from "../../dev/plugins/physics/src/scene/atmosphere-gate.node";
import { AtmosphereLayerNode } from "../../dev/plugins/physics/src/scene/atmosphere-layer.node";
import { DcMotorDynamicNode } from "../../dev/plugins/physics/src/electric/motor-dc/dynamic.node";

// ─────────────────────────────────────────────────────────────────────
// 1. Guard
// ─────────────────────────────────────────────────────────────────────

describe("hasSampleRateRequirement guard", () => {
    it("accepts a plain object with positive finite requiredHz", () => {
        expect(hasSampleRateRequirement({ requiredHz: 100 })).toBe(true);
        expect(hasSampleRateRequirement({ requiredHz: 1 })).toBe(true);
        expect(hasSampleRateRequirement({ requiredHz: 60_000 })).toBe(true);
    });

    it("rejects malformed payloads", () => {
        expect(hasSampleRateRequirement(null)).toBe(false);
        expect(hasSampleRateRequirement(undefined)).toBe(false);
        expect(hasSampleRateRequirement("100")).toBe(false);
        expect(hasSampleRateRequirement({})).toBe(false);
        expect(hasSampleRateRequirement({ requiredHz: 0 })).toBe(false);
        expect(hasSampleRateRequirement({ requiredHz: -10 })).toBe(false);
        expect(hasSampleRateRequirement({ requiredHz: NaN })).toBe(false);
        expect(hasSampleRateRequirement({ requiredHz: Infinity })).toBe(false);
        expect(hasSampleRateRequirement({ requiredHz: "100" })).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Plugin-physics node defaults
// ─────────────────────────────────────────────────────────────────────

describe("plugin-physics nodes opt into IHasSampleRateRequirement", () => {
    it("AtmosphereLayerNode defaults to 100 Hz", () => {
        const layer = new AtmosphereLayerNode();
        expect(hasSampleRateRequirement(layer)).toBe(true);
        const r: IHasSampleRateRequirement = layer;
        expect(r.requiredHz).toBe(100);
    });

    it("AtmosphereGateNode defaults to 100 Hz", () => {
        const gate = new AtmosphereGateNode();
        expect(hasSampleRateRequirement(gate)).toBe(true);
        expect((gate as IHasSampleRateRequirement).requiredHz).toBe(100);
    });

    it("DcMotorDynamicNode derives from armatureInductance/armatureResistance electrical time constant", () => {
        const motor = new DcMotorDynamicNode();
        expect(hasSampleRateRequirement(motor)).toBe(true);
        // Default params: armatureInductance=1e-3 H, armatureResistance=1 Ω → τ_e = 1 ms → 10/τ = 10 kHz.
        // rotorInertia=1e-5, viscousFriction=1e-4 → τ_m = 0.1 s = much slower; τ_e dominates.
        expect((motor as IHasSampleRateRequirement).requiredHz).toBe(10_000);
    });

    it("DcMotorDynamicNode requiredHz follows armatureInductance / armatureResistance changes (not pinned)", () => {
        const motor = new DcMotorDynamicNode();
        motor.armatureInductance = 10e-3; // 10× slower τ_e → 1 kHz
        expect(motor.requiredHz).toBe(1000);
        motor.armatureResistance = 10; // back to τ_e = 1 ms → 10 kHz
        expect(motor.requiredHz).toBe(10_000);
    });

    it("DcMotorDynamicNode requiredHz user-pin overrides computed value", () => {
        const motor = new DcMotorDynamicNode();
        motor.requiredSampleRateHz = 2000;
        expect(motor.requiredHz).toBe(2000);
        expect(motor.requiredSampleRateHzUserDefined).toBe(true);
        // Changing armatureInductance / armatureResistance no longer affects the displayed value while pinned.
        motor.armatureInductance = 50e-3;
        expect(motor.requiredHz).toBe(2000);
        // Setting 0 / negative unpins and falls back to computed.
        motor.requiredSampleRateHz = 0;
        expect(motor.requiredSampleRateHzUserDefined).toBe(false);
        // After armatureInductance=50e-3 armatureResistance=1: τ_e = 50ms → 10/τ = 200 Hz (above the 60 Hz floor).
        expect(motor.requiredHz).toBe(200);
    });

    it("the editable accessor reflects + clamps values", () => {
        const layer = new AtmosphereLayerNode();
        layer.requiredSampleRateHz = 250;
        expect(layer.requiredHz).toBe(250);
        // Negative / non-finite values fall back to a positive default.
        layer.requiredSampleRateHz = -10;
        expect(layer.requiredHz).toBe(100);
        layer.requiredSampleRateHz = NaN;
        expect(layer.requiredHz).toBe(100);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Aggregation: max + floor
// ─────────────────────────────────────────────────────────────────────

function fakeSession(nodes: Array<unknown>): { graph: { nodes: unknown[] } } {
    return { graph: { nodes } };
}

describe("SimGraphNode._aggregateRequiredHzFromSession", () => {
    it("returns 0 when no nodes opt in", () => {
        const session = fakeSession([{}, {}]);
        expect(SimGraphNode._aggregateRequiredHzFromSession(session as never)).toBe(0);
    });

    it("returns max(requiredHz) floored at MIN_EFFECTIVE_HZ for a single opt-in node", () => {
        // requiredHz lower than the floor → floor wins.
        const slow = fakeSession([{ requiredHz: 20 }]);
        const floor = MIN_EFFECTIVE_HZ.getValue(Frequency.Units.Hz);
        expect(SimGraphNode._aggregateRequiredHzFromSession(slow as never)).toBe(floor);
        // requiredHz above the floor → reported as-is.
        const fast = fakeSession([{ requiredHz: 500 }]);
        expect(SimGraphNode._aggregateRequiredHzFromSession(fast as never)).toBe(500);
    });

    it("takes the max across multiple opt-in nodes", () => {
        const mixed = fakeSession([
            { requiredHz: 100 },
            { requiredHz: 1000 },
            { requiredHz: 250 },
        ]);
        expect(SimGraphNode._aggregateRequiredHzFromSession(mixed as never)).toBe(1000);
    });

    it("ignores nodes that don't opt in (guarded filter)", () => {
        const mixed = fakeSession([
            { requiredHz: 100 }, // opt-in
            {}, // not opt-in (no requiredHz)
            { requiredHz: 200 }, // opt-in
            { somethingElse: 999 }, // not opt-in
        ]);
        expect(SimGraphNode._aggregateRequiredHzFromSession(mixed as never)).toBe(200);
    });

    it("rejects malformed requiredHz fields (NaN / 0 / negative) silently", () => {
        // 75 is above the floor → result = 75 (the other entries are
        // all rejected by the guard, so they contribute nothing).
        const oddAboveFloor = fakeSession([
            { requiredHz: NaN },
            { requiredHz: 0 },
            { requiredHz: -10 },
            { requiredHz: 75 },
        ]);
        expect(SimGraphNode._aggregateRequiredHzFromSession(oddAboveFloor as never)).toBe(75);

        // Only entry valid AND below the floor → result = floor.
        const oddBelowFloor = fakeSession([{ requiredHz: 30 }, { requiredHz: -5 }]);
        const floor = MIN_EFFECTIVE_HZ.getValue(Frequency.Units.Hz);
        expect(SimGraphNode._aggregateRequiredHzFromSession(oddBelowFloor as never)).toBe(floor);
    });

    it("returns 0 for a session with no graph (defensive guard)", () => {
        expect(SimGraphNode._aggregateRequiredHzFromSession({} as never)).toBe(0);
        expect(SimGraphNode._aggregateRequiredHzFromSession({ graph: {} } as never)).toBe(0);
        expect(SimGraphNode._aggregateRequiredHzFromSession({ graph: { nodes: [] } } as never)).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. End-to-end: real plugin-physics nodes in a fake graph
// ─────────────────────────────────────────────────────────────────────

describe("SimGraphNode aggregation with concrete plugin-physics nodes", () => {
    it("motor dominates over atmosphere (10 kHz > 100 Hz with default params)", () => {
        const session = fakeSession([new AtmosphereLayerNode(), new DcMotorDynamicNode()]);
        // Default motor: τ_e = 1 ms → 10 kHz.
        expect(SimGraphNode._aggregateRequiredHzFromSession(session as never)).toBe(10_000);
    });

    it("user override on motor flows through aggregation", () => {
        const motor = new DcMotorDynamicNode();
        motor.requiredSampleRateHz = 5000;
        const session = fakeSession([new AtmosphereLayerNode(), motor]);
        expect(SimGraphNode._aggregateRequiredHzFromSession(session as never)).toBe(5000);
    });

    it("all atmospheres → 100 Hz (above the 60 Hz floor)", () => {
        const session = fakeSession([new AtmosphereLayerNode(), new AtmosphereGateNode(), new AtmosphereLayerNode()]);
        expect(SimGraphNode._aggregateRequiredHzFromSession(session as never)).toBe(100);
    });
});
