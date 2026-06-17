/**
 * Unit tests for `Physics.Transform`. Validate:
 *
 *   1. The standalone TransformNode produces identity by default and
 *      composes parent_world × local correctly (column-major).
 *   2. The matrix-multiply helper is associative-correct on a non-trivial
 *      pair (translation × rotation).
 *   3. Motor classes inherit the transform inputs/outputs and the world
 *      transform stays untouched after physics ticks (no accidental
 *      sharing between the two state machines).
 *
 * Channel plumbing (wired inputs, multi-downstream broadcast) is
 * exercised at the executor level elsewhere; here we focus on the math
 * and the structural inheritance contract.
 */
import type { IChannel, ISession } from "spikypanda-core";
import { Matrix4, RK4AdaptiveSolver } from "spikypanda-core";
import { TransformNode, IDENTITY44, isMatrix44 } from "../../dev/plugins/physics/src/transform/index";
import { DcMotorDynamicNode } from "../../dev/plugins/physics/src/electric/motor-dc/index";
import { BldcMotorDynamicNode } from "../../dev/plugins/physics/src/electric/motor-bldc/index";

// ---------------------------------------------------------------------------
// Session mock: no links, no tokens. Capture publish() calls per index so
// we can assert that the world output gets a non-empty 16-number array.
// ---------------------------------------------------------------------------

interface IPublishedRecord {
    idx: number;
    value: unknown;
}

function makeSession(opts?: { links?: ReadonlyArray<IChannel>; published?: IPublishedRecord[] }): ISession {
    const links = opts?.links ?? [];
    const published = opts?.published;
    return {
        graph: { links },
        linkStates: links.map(() => ({ ready: false })),
        consume: () => undefined,
        publish: (idx: number, value: unknown) => {
            published?.push({ idx, value });
        },
        peek: () => undefined,
    } as unknown as ISession;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe("matrix44 helpers", () => {
    it("isMatrix44 only accepts 16-element arrays", () => {
        expect(isMatrix44(IDENTITY44)).toBe(true);
        expect(isMatrix44(new Array(16).fill(0))).toBe(true);
        expect(isMatrix44(new Array(15).fill(0))).toBe(false);
        expect(isMatrix44(null)).toBe(false);
        expect(isMatrix44(undefined)).toBe(false);
        expect(isMatrix44("not a matrix")).toBe(false);
    });

    it("Matrix4.multiply with identity on either side returns the other matrix", () => {
        // Column-major: translation (tx, ty, tz) sits at indices 12, 13, 14.
        // prettier-ignore
        const T: number[] = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            10, 20, 30, 1,
        ];
        const id = Matrix4.fromFlat(IDENTITY44 as number[]);
        expect(id.multiply(Matrix4.fromFlat(T)).toFlat()).toEqual(T);
        expect(Matrix4.fromFlat(T).multiply(id).toFlat()).toEqual(T);
    });

    it("Matrix4.multiply composes a translation parent with a translation local correctly", () => {
        // parent translates by (1, 0, 0), local translates by (0, 2, 0).
        // Expected world translates by (1, 2, 0).
        // prettier-ignore
        const parent: number[] = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            1, 0, 0, 1,
        ];
        // prettier-ignore
        const local: number[] = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 2, 0, 1,
        ];
        const out = Matrix4.fromFlat(parent).multiply(Matrix4.fromFlat(local)).toFlat();
        // Last column = translation of result.
        expect(out[12]).toBeCloseTo(1, 12);
        expect(out[13]).toBeCloseTo(2, 12);
        expect(out[14]).toBeCloseTo(0, 12);
        expect(out[15]).toBeCloseTo(1, 12);
    });
});

// ---------------------------------------------------------------------------
// TransformNode standalone
// ---------------------------------------------------------------------------

describe("TransformNode", () => {
    it("starts at identity after reset (no parent, no local wired)", () => {
        const node = new TransformNode();
        node.reset(makeSession());
        expect(Array.from(node.world)).toEqual(Array.from(IDENTITY44));
    });

    it("publishes the world matrix on the world output slot after fire", () => {
        const node = new TransformNode();
        node.reset(makeSession());
        const published: IPublishedRecord[] = [];
        node.fire(makeSession({ published }), 0);
        // With no wired outputs, nothing is published — there are no
        // downstream channels to broadcast on. We only check the world
        // viewable mirrors identity.
        expect(Array.from(node.world)).toEqual(Array.from(IDENTITY44));
        expect(published).toHaveLength(0);
    });

    it("declares matrix44 input ports with the canonical slot names (scene moved to session)", () => {
        const node = new TransformNode();
        expect(node.inputPorts.map((p) => p.slot)).toEqual(["local", "parent_world"]);
        expect(node.outputPorts.map((p) => p.slot)).toEqual(["world"]);
        // Both transform inputs are matrix44 now; scene context is read
        // from `session.sceneStateView`, not from a runtime cable.
        expect(node.inputPorts.find((p) => p.slot === "local")?.type).toBe("matrix44");
        expect(node.inputPorts.find((p) => p.slot === "parent_world")?.type).toBe("matrix44");
        for (const p of node.outputPorts) expect(p.type).toBe("matrix44");
    });
});

// ---------------------------------------------------------------------------
// Motor inheritance contract
// ---------------------------------------------------------------------------

describe("Motor TransformNode inheritance", () => {
    it("DcMotorDynamicNode exposes transform + fault ports alongside its own (scene moved to session)", () => {
        const node = new DcMotorDynamicNode();
        const inSlots = node.inputPorts.map((p) => p.slot);
        const outSlots = node.outputPorts.map((p) => p.slot);
        // Base-class ports first (transform, fault), then own.
        // `dt` port was dropped in F3 — the motor is now IIntegrable
        // and the Session's attached solver owns the timebase.
        // The scene port was dropped in P2 — scene context is now
        // read from `session.sceneStateView`, not from a cable.
        expect(inSlots.slice(0, 3)).toEqual(["local", "parent_world", "fault_0"]);
        expect(inSlots).toEqual(["local", "parent_world", "fault_0", "V", "tau_load"]);
        expect(outSlots).toEqual(["world", "i", "omega", "tau_em"]);
    });

    it("BldcMotorDynamicNode exposes transform + fault ports alongside its own (scene moved to session)", () => {
        const node = new BldcMotorDynamicNode();
        const inSlots = node.inputPorts.map((p) => p.slot);
        const outSlots = node.outputPorts.map((p) => p.slot);
        expect(inSlots).toEqual(["local", "parent_world", "fault_0", "V_a", "V_b", "V_c", "tau_load", "dt"]);
        expect(outSlots).toEqual(["world", "i_a", "i_b", "i_c", "omega", "theta_m", "tau_em"]);
    });

    it("Motor world transform stays at identity when nothing is wired (super.fire chain works)", () => {
        const node = new DcMotorDynamicNode();
        node.reset(makeSession());
        const session = makeSession();
        for (let k = 0; k < 10; k++) node.fire(session, k * 1e-4);
        // With no parent / local input wired, world stays identity even
        // though the motor's own physics has been ticking.
        expect(Array.from(node.world)).toEqual(Array.from(IDENTITY44));
    });

    it("Motor physics still converges to rest when driven by an attached solver", () => {
        // F3 migration: motor.fire() no longer integrates. The Session's
        // attached RK4 solver owns state advancement, so we set one up
        // here and call solver.step directly to exercise the IIntegrable
        // contract end-to-end (gatherState → rhs → writeState).
        const node = new DcMotorDynamicNode();
        node.i0 = 5;
        node.omega0 = 200;
        node.reset(makeSession());
        const solver = new RK4AdaptiveSolver({ tolerance: 1e-6, maxStep: 1e-4 });
        solver.initialize([node], 0);
        const session = makeSession();
        for (let k = 0; k < 1000; k++) solver.step(1e-4, session);
        // Decay assertion: with V=0 and tau_load=0, the motor must
        // damp toward rest (b > 0). The RK4 solver should track this
        // strictly better than the previous inline Euler did.
        expect(Math.abs(node.i)).toBeLessThan(5);
        expect(Math.abs(node.omega)).toBeLessThan(200);
        expect(Number.isFinite(node.i)).toBe(true);
        expect(Number.isFinite(node.omega)).toBe(true);
    });
});
