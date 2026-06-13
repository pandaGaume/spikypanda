/**
 * Unit tests for `LoadTorqueNode`, the tau_load generator for motor
 * simulation graphs.
 *
 * Test layout:
 *   1. Each profile shape: constant stays at tau0, step switches exactly
 *      at tStep, ramp drifts from tau0 toward tau1 at |rampRate| and
 *      holds at tau1 (bounded, both directions), quadratic equals
 *      k * omega * |omega| when omega is wired (signed opposing law),
 *      periodic oscillates around tau0 with the configured period.
 *   2. Invariants: the output never DRIVES the rotor (tau * omega >= 0
 *      for the omega-dependent profiles; >= 0 for the time-only braking
 *      profiles) and is never NaN, for every profile, wired or not.
 *   3. Passivity under reverse rotation, through a real Session: the
 *      quadratic law is odd in omega, and a reverse coast on a minimal
 *      J/b rotor decays instead of blowing up.
 *   4. Publication: fire() pushes the computed torque on every enabled
 *      "tau_load" outgoing link.
 *
 * Input wiring uses the same SessionMock helper as faultable.test.ts
 * for the profile-shape units; the passivity scenarios run a real
 * Session over a Producer -> LoadTorque -> Consumer chain.
 */
import { Channel, RuntimeGraph, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, IOlink, ISession } from "spikypanda-core";
import { LoadTorqueNode, createLoadTorqueNode } from "../../dev/plugins/physics/src/mechanical/load/index";

// ---------------------------------------------------------------------------
// Session mocks
// ---------------------------------------------------------------------------

interface ChannelSpec {
    slot: string;
    value: unknown;
    /** Whether the channel is wired and has a ready token to consume. */
    ready?: boolean;
    /** Whether the channel is enabled. Default true. */
    enabled?: boolean;
}

/**
 * Build an ISession exposing the given channels as opsc of `node`. Each
 * channel is registered in `graph.links` and reachable through the
 * existing opsc<IChannel>() accessor. After consume() returns the token
 * once, the link state flips to !ready (consumed semantics).
 */
function bindOpsc(node: { _opsc: IOlink[] }, channels: ChannelSpec[]): { session: ISession } {
    const links: IChannel[] = channels.map(
        (c) =>
            ({
                slot: c.slot,
                enabled: c.enabled !== false,
            }) as unknown as IChannel
    );
    const linkStates = channels.map((c) => ({ ready: c.ready !== false }));
    node._opsc = links as unknown as IOlink[];
    const session: ISession = {
        graph: { links },
        linkStates,
        consume: (i: number) => {
            const ch = channels[i];
            if (!ch || !linkStates[i].ready) return undefined;
            linkStates[i].ready = false;
            return ch.value;
        },
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
    return { session };
}

/**
 * Build an ISession exposing the given outgoing slots as onsc of `node`
 * and capture every publish() into `published`.
 */
function bindOnsc(node: { _onsc: IOlink[] }, slots: string[]): { session: ISession; published: number[] } {
    const links: IChannel[] = slots.map(
        (slot) =>
            ({
                slot,
                enabled: true,
            }) as unknown as IChannel
    );
    node._onsc = links as unknown as IOlink[];
    const published: number[] = [];
    const session: ISession = {
        graph: { links },
        linkStates: slots.map(() => ({ ready: false })),
        consume: () => undefined,
        publish: (_i: number, v: unknown) => {
            published.push(v as number);
        },
        peek: () => undefined,
    } as unknown as ISession;
    return { session, published };
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
// Construction + reset
// ---------------------------------------------------------------------------

describe("LoadTorqueNode construction", () => {
    it("factory returns a node with the documented defaults", () => {
        const n = createLoadTorqueNode();
        expect(n).toBeInstanceOf(LoadTorqueNode);
        expect(n.profile).toBe("constant");
        expect(n.tau0).toBeCloseTo(0.01, 12);
        expect(n.tau1).toBeCloseTo(0.02, 12);
        expect(n.tStep).toBe(5);
        expect(n.rampRate).toBeCloseTo(0.001, 12);
        expect(n.k).toBeCloseTo(1.5e-7, 15);
        expect(n.amplitude).toBeCloseTo(0.005, 12);
        expect(n.frequency).toBe(1);
        expect(n.tau).toBe(0);
    });

    it("declares omega in and tau_load out", () => {
        const n = new LoadTorqueNode();
        expect(n.inputPorts.map((p) => p.slot)).toEqual(["omega"]);
        expect(n.outputPorts.map((p) => p.slot)).toEqual(["tau_load"]);
        expect(n.inputPorts[0].optional).toBe(true);
        expect(n.outputPorts[0].optional).toBe(false);
    });

    it("clamps an invalid profile string to 'constant'", () => {
        const n = new LoadTorqueNode();
        n.profile = "step";
        expect(n.profile).toBe("step");
        n.profile = "garbage" as never;
        expect(n.profile).toBe("constant");
    });

    it("reset restores the viewable to 0", () => {
        const n = new LoadTorqueNode();
        n.fire(emptySession(), 0);
        expect(n.tau).toBeCloseTo(0.01, 12);
        n.reset(emptySession());
        expect(n.tau).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Profile shapes
// ---------------------------------------------------------------------------

describe("LoadTorqueNode profiles", () => {
    it("constant: tau stays at tau0 regardless of t", () => {
        const n = new LoadTorqueNode();
        n.tau0 = 0.03;
        for (const t of [0, 1, 5, 100]) {
            n.fire(emptySession(), t);
            expect(n.tau).toBeCloseTo(0.03, 12);
        }
    });

    it("step: switches from tau0 to tau1 exactly at tStep", () => {
        const n = new LoadTorqueNode();
        n.profile = "step";
        n.tau0 = 0.01;
        n.tau1 = 0.02;
        n.tStep = 5;
        n.fire(emptySession(), 0);
        expect(n.tau).toBeCloseTo(0.01, 12);
        n.fire(emptySession(), 4.999999);
        expect(n.tau).toBeCloseTo(0.01, 12);
        n.fire(emptySession(), 5); // t >= tStep: new regime
        expect(n.tau).toBeCloseTo(0.02, 12);
        n.fire(emptySession(), 100);
        expect(n.tau).toBeCloseTo(0.02, 12);
    });

    it("ramp: rises from tau0 toward tau1 at |rampRate| and holds at tau1", () => {
        const n = new LoadTorqueNode();
        n.profile = "ramp";
        n.tau0 = 0.01;
        n.tau1 = 0.02;
        n.rampRate = 0.001; // span 0.01 N.m: tau1 reached at t = 10 s
        n.fire(emptySession(), 0);
        expect(n.tau).toBeCloseTo(0.01, 12);
        n.fire(emptySession(), 5);
        expect(n.tau).toBeCloseTo(0.015, 12);
        n.fire(emptySession(), 10); // inclusive: exactly tau1 at the reach time
        expect(n.tau).toBeCloseTo(0.02, 12);
        n.fire(emptySession(), 1000); // holds at tau1, never beyond
        expect(n.tau).toBeCloseTo(0.02, 12);
    });

    it("ramp: drifts downward and holds at tau1 when tau1 < tau0", () => {
        const n = new LoadTorqueNode();
        n.profile = "ramp";
        n.tau0 = 0.03;
        n.tau1 = 0.01;
        n.rampRate = 0.002; // direction comes from sign(tau1 - tau0)
        n.fire(emptySession(), 0);
        expect(n.tau).toBeCloseTo(0.03, 12);
        n.fire(emptySession(), 5);
        expect(n.tau).toBeCloseTo(0.02, 12);
        n.fire(emptySession(), 10);
        expect(n.tau).toBeCloseTo(0.01, 12);
        n.fire(emptySession(), 500); // holds on the lower plateau
        expect(n.tau).toBeCloseTo(0.01, 12);
    });

    it("ramp: a negative rampRate drifts with the same magnitude", () => {
        const n = new LoadTorqueNode();
        n.profile = "ramp";
        n.tau0 = 0.01;
        n.tau1 = 0.02;
        n.rampRate = -0.001;
        n.fire(emptySession(), 5);
        expect(n.tau).toBeCloseTo(0.015, 12);
        n.fire(emptySession(), 50);
        expect(n.tau).toBeCloseTo(0.02, 12);
    });

    it("ramp: never NaN and clamps at 0 when drifting toward a negative tau1", () => {
        const n = new LoadTorqueNode();
        n.profile = "ramp";
        n.tau0 = 0.02;
        n.tau1 = -0.01;
        n.rampRate = 0.001;
        for (let kStep = 0; kStep <= 60; kStep++) {
            n.fire(emptySession(), kStep);
            expect(Number.isFinite(n.tau)).toBe(true);
            expect(n.tau).toBeGreaterThanOrEqual(0);
        }
        // Held at tau1 = -0.01, clamped by the braking >= 0 convention.
        n.fire(emptySession(), 1000);
        expect(n.tau).toBe(0);
    });

    it("quadratic: equals k * omega * |omega| when omega is wired", () => {
        const n = new LoadTorqueNode();
        n.profile = "quadratic";
        n.k = 1.5e-7;
        for (const omega of [0, 100, 314.159, 1000, -100, -314.159]) {
            const { session } = bindOpsc(n as unknown as { _opsc: IOlink[] }, [{ slot: "omega", value: omega }]);
            n.fire(session, 0);
            expect(n.tau).toBeCloseTo(1.5e-7 * omega * Math.abs(omega), 12);
        }
    });

    it("quadratic: defaults omega to 0 when unwired", () => {
        const n = new LoadTorqueNode();
        n.profile = "quadratic";
        n.fire(emptySession(), 3);
        expect(n.tau).toBe(0);
    });

    it("quadratic: a negative k clamps to 0 instead of driving", () => {
        const n = new LoadTorqueNode();
        n.profile = "quadratic";
        n.k = -1;
        for (const omega of [100, -100]) {
            const { session } = bindOpsc(n as unknown as { _opsc: IOlink[] }, [{ slot: "omega", value: omega }]);
            n.fire(session, 0);
            expect(n.tau).toBe(0);
        }
    });

    it("periodic: oscillates around tau0 with period 1/frequency", () => {
        const n = new LoadTorqueNode();
        n.profile = "periodic";
        n.tau0 = 0.01;
        n.amplitude = 0.005;
        n.frequency = 2; // period T = 0.5 s
        const T = 0.5;
        n.fire(emptySession(), 0);
        expect(n.tau).toBeCloseTo(0.01, 12); // sin(0) = 0
        n.fire(emptySession(), T / 4);
        expect(n.tau).toBeCloseTo(0.015, 12); // crest
        n.fire(emptySession(), T / 2);
        expect(n.tau).toBeCloseTo(0.01, 12); // back through the mean
        n.fire(emptySession(), (3 * T) / 4);
        expect(n.tau).toBeCloseTo(0.005, 12); // trough
        // Periodicity: tau(t + T) = tau(t).
        for (const t of [0.05, 0.1, 0.2]) {
            n.fire(emptySession(), t);
            const a = n.tau;
            n.fire(emptySession(), t + T);
            expect(n.tau).toBeCloseTo(a, 10);
        }
    });
});

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

describe("LoadTorqueNode invariants", () => {
    it("output is clamped at 0 when the law goes negative", () => {
        const n = new LoadTorqueNode();
        n.tau0 = -1; // constant, negative
        n.fire(emptySession(), 0);
        expect(n.tau).toBe(0);

        n.profile = "periodic";
        n.tau0 = 0.001;
        n.amplitude = 0.01; // trough at tau0 - amplitude < 0
        n.frequency = 1;
        n.fire(emptySession(), 0.75); // sin(2*pi*0.75) = -1
        expect(n.tau).toBe(0);
    });

    it("never drives, never NaN across all profiles, wired or not", () => {
        const profiles = ["constant", "step", "ramp", "quadratic", "periodic"] as const;
        for (const profile of profiles) {
            const n = new LoadTorqueNode();
            n.profile = profile;
            for (let kStep = 0; kStep <= 50; kStep++) {
                const t = kStep * 0.37;
                let omega = 0;
                if (kStep % 2 === 0) {
                    omega = 100 * Math.sin(t);
                    const { session } = bindOpsc(n as unknown as { _opsc: IOlink[] }, [{ slot: "omega", value: omega }]);
                    n.fire(session, t);
                } else {
                    n.fire(emptySession(), t);
                }
                expect(Number.isFinite(n.tau)).toBe(true);
                if (profile === "quadratic") {
                    // Omega-dependent: opposes the actual rotation.
                    expect(n.tau * omega).toBeGreaterThanOrEqual(0);
                } else {
                    // Time-only braking torque convention.
                    expect(n.tau).toBeGreaterThanOrEqual(0);
                }
            }
        }
    });
});

// ---------------------------------------------------------------------------
// Passivity under reverse rotation (real Session)
// ---------------------------------------------------------------------------

/** Publishes a mutable omega value on its single outgoing link. */
class OmegaSourceNode extends RuntimeNode {
    public value = 0;
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, _t: number): void {
        const out = this.onsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(out);
        session.publish(idx, this.value);
    }
}

/** Keeps the last torque token it consumed. */
class TauSinkNode extends RuntimeNode {
    public last = 0;
    public override fire(session: ISession, _t: number): void {
        const inc = this.opsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(inc);
        const v = session.consume(idx);
        if (typeof v === "number") this.last = v;
    }
}

function buildLoadChain(load: LoadTorqueNode): { session: Session; source: OmegaSourceNode; sink: TauSinkNode } {
    const source = new OmegaSourceNode();
    const sink = new TauSinkNode();
    const toLoad = new Channel(source, load, "omega");
    const toSink = new Channel(load, sink, "tau_load");
    const graph = new RuntimeGraph<RuntimeNode, Channel>([source, load, sink], [toLoad, toSink], "dynamic");
    return { session: new Session(graph), source, sink };
}

describe("LoadTorqueNode passivity under reverse rotation (real Session)", () => {
    it("quadratic: odd opposing law, tau(-200) == -tau(200)", () => {
        const load = new LoadTorqueNode();
        load.profile = "quadratic";
        load.k = 1.5e-7;
        const { session, source, sink } = buildLoadChain(load);
        source.value = 200;
        session.run(0);
        const forward = sink.last;
        expect(forward).toBeCloseTo(1.5e-7 * 200 * 200, 12);
        source.value = -200;
        session.run(1);
        expect(sink.last).toBeCloseTo(-forward, 12);
    });

    it("quadratic: a reverse coast on a minimal J/b rotor decays and stays finite", () => {
        // Repro of the passivity violation: with the unsigned law
        // tau = k*omega^2 a reverse-spinning rotor is ACCELERATED by its
        // own "passive" load (positive feedback) and reaches NaN in
        // finite time (J=0.005, b=1e-4, k=1.5/173^2, omega0=-5 diverges
        // to NaN at t ~ 25 s). With the signed law tau = k*omega*|omega|
        // the published torque opposes the motion and the coast decays.
        const J = 0.005;
        const b = 1e-4;
        const load = new LoadTorqueNode();
        load.profile = "quadratic";
        load.k = 1.5 / (173 * 173);
        const { session, source, sink } = buildLoadChain(load);
        const dt = 1e-3;
        let omega = -5;
        let finite = true;
        for (let step = 0; step <= 30000 && finite; step++) {
            source.value = omega;
            session.run(step * dt);
            // Minimal passive rotor: J*domega/dt = -b*omega - tau_load.
            omega += (dt * (-b * omega - sink.last)) / J;
            finite = Number.isFinite(omega);
        }
        expect(finite).toBe(true);
        // The coast DECAYS: |omega| shrinks (analytically ~1.3 rad/s at
        // t = 30 s) and the rotation never flips sign.
        expect(omega).toBeLessThanOrEqual(0);
        expect(Math.abs(omega)).toBeLessThan(2);
    });
});

// ---------------------------------------------------------------------------
// Publication
// ---------------------------------------------------------------------------

describe("LoadTorqueNode publication", () => {
    it("publishes tau on every enabled tau_load outgoing link", () => {
        const n = new LoadTorqueNode();
        n.tau0 = 0.04;
        const { session, published } = bindOnsc(n as unknown as { _onsc: IOlink[] }, ["tau_load", "tau_load"]);
        n.fire(session, 0);
        expect(published).toEqual([0.04, 0.04]);
    });

    it("skips links on other slots", () => {
        const n = new LoadTorqueNode();
        const { session, published } = bindOnsc(n as unknown as { _onsc: IOlink[] }, ["something_else"]);
        n.fire(session, 0);
        expect(published).toEqual([]);
    });
});
