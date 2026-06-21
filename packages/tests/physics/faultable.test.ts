/**
 * Unit tests for `FaultableNode` and the motor classes' fault wiring.
 *
 * Test layout:
 *   1. FaultableNode accumulator math: multiple descriptors on the same
 *      target sum, distinct targets stay separate, unknown targets
 *      accumulate but are invisible to consumers.
 *   2. Auto-wrap: a plain `number` token on fault_N is wrapped as
 *      { target: "tau", value }.
 *   3. Reset clears the accumulator.
 *   4. Motor inheritance: DcMotorSteadyNode reacts to a fault on fault_0
 *      exactly as if it had received the same delta on loadTorque.
 *
 * The motor wiring tests use a SessionMock helper that emulates the
 * minimal IChannel + linkStates contract the runtime nodes touch.
 */
import type { IChannel, IOlink, ISession } from "spikypanda-core";
import {
    FaultableNode, isFaultDescriptor, IDENTITY44,
} from "../../dev/plugins/physics/src/transform/index";
import type { IFaultDescriptor } from "../../dev/plugins/physics/src/transform/index";
import { DcMotorSteadyNode } from "../../dev/plugins/physics/src/electric/motor-dc/index";

// ---------------------------------------------------------------------------
// Session mock with a single ready channel feeding a slot.
// ---------------------------------------------------------------------------

interface ChannelSpec {
    slot:  string;
    value: unknown;
    /** Whether the channel is wired and has a ready token to consume. */
    ready?: boolean;
    /** Whether the channel is enabled. Default true. */
    enabled?: boolean;
}

/**
 * Build an ISession exposing the given channels as opsc of `node`. Each
 * channel is registered in `graph.links` and as an OLink reachable via
 * `node.opsc<IChannel>()`. After consume() returns the token once, the
 * link state flips to !ready (consumed semantics).
 */
function bindOpsc(node: { _opsc: IOlink[] }, channels: ChannelSpec[]): {
    session: ISession;
    consumed: string[];
} {
    const links: IChannel[] = channels.map((c, idx) => ({
        slot: c.slot,
        enabled: c.enabled !== false,
        // The runtime only needs `slot` + `enabled` from IChannel for our
        // dispatch logic. Cast through unknown to satisfy the broader
        // IChannel surface that we don't exercise here.
    } as unknown as IChannel));
    const linkStates = channels.map((c) => ({ ready: c.ready !== false }));
    const consumed: string[] = [];
    // Stamp the channels into the node's opsc list. opsc<T>() returns
    // node._opsc — we replace its contents in place so the runtime sees
    // them through the existing opsc<IChannel>() accessor.
    node._opsc = links as unknown as IOlink[];
    const session: ISession = {
        graph: { links },
        linkStates,
        consume: (i: number) => {
            const ch = channels[i];
            if (!ch || !linkStates[i].ready) return undefined;
            linkStates[i].ready = false;
            consumed.push(ch.slot);
            return ch.value;
        },
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
    return { session, consumed };
}

function emptySession(): ISession {
    return {
        graph: { links: [] },
        linkStates: [],
        consume: () => undefined,
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
}

// ---------------------------------------------------------------------------
// Test helper: an unrestricted FaultableNode that exposes the accumulator
// for direct verification (avoids dragging in a motor's physics).
// ---------------------------------------------------------------------------

class TestFaultableNode extends FaultableNode {
    public read(target: string): number {
        // Reach the protected accessor via the same protected scope.
        return (this as unknown as { getFault: (t: string) => number }).getFault(target);
    }
    public dump(): Record<string, number> {
        const r: Record<string, number> = {};
        (this as unknown as { forEachFault: (cb: (k: string, v: number) => void) => void })
            .forEachFault((k, v) => { r[k] = v; });
        return r;
    }
}

// ---------------------------------------------------------------------------
// isFaultDescriptor guard
// ---------------------------------------------------------------------------

describe("isFaultDescriptor", () => {
    it("accepts plain { target, value } objects", () => {
        expect(isFaultDescriptor({ target: "tau", value: 1.5 })).toBe(true);
        expect(isFaultDescriptor({ target: "armatureResistance",   value: 0   })).toBe(true);
    });
    it("rejects missing or wrongly-typed fields", () => {
        expect(isFaultDescriptor({ target: "tau" })).toBe(false);
        expect(isFaultDescriptor({ value: 1 })).toBe(false);
        expect(isFaultDescriptor({ target: 42, value: 1 })).toBe(false);
        expect(isFaultDescriptor({ target: "tau", value: "1" })).toBe(false);
    });
    it("rejects null / undefined / scalars", () => {
        expect(isFaultDescriptor(null)).toBe(false);
        expect(isFaultDescriptor(undefined)).toBe(false);
        expect(isFaultDescriptor(42)).toBe(false);
        expect(isFaultDescriptor("tau")).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// FaultableNode accumulator
// ---------------------------------------------------------------------------

describe("FaultableNode accumulator", () => {
    it("starts at 0 for any target before any fire()", () => {
        const node = new TestFaultableNode();
        node.reset(emptySession());
        expect(node.read("tau")).toBe(0);
        expect(node.read("armatureResistance")).toBe(0);
        expect(node.read("anything")).toBe(0);
    });

    it("auto-wraps a plain number on fault_0 as { target: 'tau', value }", () => {
        const node = new TestFaultableNode();
        node.reset(emptySession());
        const { session } = bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "fault_0", value: 2.5 },
        ]);
        node.fire(session, 0);
        expect(node.read("tau")).toBeCloseTo(2.5, 12);
    });

    it("accepts a structured descriptor unchanged", () => {
        const node = new TestFaultableNode();
        node.reset(emptySession());
        const fault: IFaultDescriptor = { target: "armatureResistance", value: 0.07 };
        const { session } = bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "fault_0", value: fault },
        ]);
        node.fire(session, 0);
        expect(node.read("armatureResistance")).toBeCloseTo(0.07, 12);
        expect(node.read("tau")).toBe(0);
    });

    it("sums multiple descriptors that share a target", () => {
        const node = new TestFaultableNode();
        node.reset(emptySession());
        const { session } = bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "fault_0", value: 1 },                                   // tau += 1 (auto-wrap)
            { slot: "fault_1", value: { target: "tau", value: 2 } },
            { slot: "fault_2", value: { target: "armatureResistance",   value: 0.5 } },
        ]);
        node.fire(session, 0);
        expect(node.read("tau")).toBeCloseTo(3, 12);
        expect(node.read("armatureResistance")).toBeCloseTo(0.5, 12);
    });

    it("clears the accumulator at the start of each fire()", () => {
        const node = new TestFaultableNode();
        node.reset(emptySession());
        // Tick 1 with a fault.
        const { session: s1 } = bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "fault_0", value: 5 },
        ]);
        node.fire(s1, 0);
        expect(node.read("tau")).toBe(5);
        // Tick 2 with nothing wired — accumulator must reset to 0.
        node.fire(emptySession(), 1e-3);
        expect(node.read("tau")).toBe(0);
    });

    it("ignores tokens that are neither numbers nor IFaultDescriptor", () => {
        const node = new TestFaultableNode();
        node.reset(emptySession());
        const { session } = bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "fault_0", value: "garbage" },
            { slot: "fault_1", value: { not: "a fault" } },
            { slot: "fault_2", value: 7 },                                    // valid
        ]);
        node.fire(session, 0);
        // Only the valid scalar landed.
        expect(node.read("tau")).toBeCloseTo(7, 12);
    });

    it("ignores non-fault slots", () => {
        const node = new TestFaultableNode();
        node.reset(emptySession());
        const { session } = bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "loadTorque", value: 99 },                                  // wrong slot family
            { slot: "fault_X",  value: 1  },                                  // bad index suffix
            { slot: "fault_0",  value: 3  },
        ]);
        node.fire(session, 0);
        expect(node.read("tau")).toBeCloseTo(3, 12);
    });

    it("publishes world identity through the TransformNode super-call", () => {
        const node = new TestFaultableNode();
        node.reset(emptySession());
        node.fire(emptySession(), 0);
        expect(Array.from(node.world)).toEqual(Array.from(IDENTITY44));
    });
});

// ---------------------------------------------------------------------------
// Motor fault wiring — DcMotorSteadyNode is the easiest analytic check
// ---------------------------------------------------------------------------

describe("DcMotorSteadyNode fault wiring", () => {
    it("a fault on fault_0 perturbs angularVelocity exactly like loadTorque would", () => {
        // Steady-state angularVelocity formula:
        //     ω = (armatureVoltage·torqueConstant - armatureResistance·τ_eff) / (backEmfConstant·torqueConstant + armatureResistance·viscousFriction)
        // With armatureVoltage=0 and the fault as the only torque, τ_eff = fault_value
        // and ω = -armatureResistance·fault / (backEmfConstant·torqueConstant + armatureResistance·viscousFriction). With defaults armatureResistance=1, torqueConstant=backEmfConstant=0.01,
        // viscousFriction=1e-4, denom = 1e-4 + 1e-4 = 2e-4, so ω = -1·1/2e-4 = -5000.
        const node = new DcMotorSteadyNode();
        const { session } = bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "fault_0", value: 1 },                                    // 1 Nm torque fault
        ]);
        node.fire(session, 0);
        const denom = node.backEmfConstant * node.torqueConstant + node.armatureResistance * node.viscousFriction;
        const expectedOmega = -node.armatureResistance * 1 / denom;
        expect(node.angularVelocity).toBeCloseTo(expectedOmega, 6);
    });

    it("declares fault_0 in its inputPorts", () => {
        const node = new DcMotorSteadyNode();
        const slots = node.inputPorts.map((p) => p.slot);
        expect(slots).toContain("fault_0");
        // Order: transform (local, parentWorld, scene), then fault, then motor own.
        const fIdx = slots.indexOf("fault_0");
        const vIdx = slots.indexOf("armatureVoltage");
        expect(fIdx).toBeGreaterThan(slots.indexOf("scene"));
        expect(fIdx).toBeLessThan(vIdx);
    });
});
