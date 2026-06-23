/**
 * LoadTorque scheduler CHAIN — the event-driven sequencer.
 *
 * A LoadTorque is now a chainable timed SEGMENT: armed by the `_start` trigger
 * (or autoStart), it drives `loadTorque` for `duration` seconds, then pulses
 * `_completed` and goes silent. Wiring segment[i]._completed -> segment[i+1]._start
 * makes the sequence advance itself — no central scheduler node. `_start` /
 * `_completed` are CONTROL-plane ports so a timed segment stays a true source
 * the scheduler ticks every sim step (its duration clock never stalls). This
 * pins that contract:
 *   - exactly one segment is active at a time (the chain hands over),
 *   - each segment's torque is its own profile (local clock),
 *   - the open-ended last segment (duration<=0) never completes,
 *   - the legacy defaults (autoStart, duration 0) stay always-on.
 */
import { FuncSource, IChannel, ISession, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import { LoadTorqueNode } from "../../dev/plugins/physics/src/mechanical/load/load-torque.node";

/** Counts trigger pulses arriving on its single input. */
class PulseSink extends RuntimeNode {
    public pulses = 0;
    public override fire(session: ISession): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                session.consume(idx);
                this.pulses++;
            }
        }
    }
}

describe("LoadTorque scheduler chain (event-driven sequence)", () => {
    function segment(profile: "constant" | "quadratic", value: number, duration: number, autoStart: boolean): LoadTorqueNode {
        const s = new LoadTorqueNode();
        s.profile = profile;
        if (profile === "quadratic") s.k = value;
        else s.baseTorque = value;
        s.duration = duration;
        s.autoStart = autoStart;
        return s;
    }

    it("hands over baseline -> overload -> fan law via _completed -> _start, one segment active at a time", () => {
        const seg1 = segment("constant", 2e-3, 0.1, true); // baseline, auto-armed
        const seg2 = segment("constant", 5e-3, 0.1, false); // overload, armed by seg1._completed
        const seg3 = segment("quadratic", 1.5e-8, 0, false); // fan law, open-ended (never completes)
        const omega = new FuncSource(() => 700); // constant speed for the fan-law term
        const doneSink = new PulseSink(); // observes seg2._completed (a mid-chain "reached")

        const builder = new RuntimeGraphBuilder<RuntimeNode, never>().withMode("dynamic").withNodes(omega, seg1, seg2, seg3, doneSink);
        // Only the fan-law segment reads the speed signal; the timed segments
        // stay true sources (no data input) so the scheduler ticks them every
        // sim step and their duration clock never stalls. The chain advances on
        // the CONTROL plane: _completed -> _start.
        builder.withChannel(omega, seg3, "out", "angularVelocity");
        builder.withChannel(seg1, seg2, "_completed", "_start");
        builder.withChannel(seg2, seg3, "_completed", "_start");
        builder.withChannel(seg2, doneSink, "_completed", "in");
        const session = new Session(builder.build());
        for (const n of [omega, seg1, seg2, seg3, doneSink]) n.reset(session);

        const dt = 1e-3;
        const snap: Record<string, { a1: boolean; a2: boolean; a3: boolean; t1: number; t2: number; t3: number }> = {};
        for (let k = 0; k <= 300; k++) {
            const t = k * dt;
            session.run(t);
            if (k === 50) snap.r1 = { a1: seg1.active, a2: seg2.active, a3: seg3.active, t1: seg1.tau, t2: seg2.tau, t3: seg3.tau };
            if (k === 150) snap.r2 = { a1: seg1.active, a2: seg2.active, a3: seg3.active, t1: seg1.tau, t2: seg2.tau, t3: seg3.tau };
            if (k === 250) snap.r3 = { a1: seg1.active, a2: seg2.active, a3: seg3.active, t1: seg1.tau, t2: seg2.tau, t3: seg3.tau };
        }

        // Regime 1 (t~0.05): only seg1 drives, at its baseline torque.
        expect(snap.r1.a1).toBe(true);
        expect(snap.r1.a2).toBe(false);
        expect(snap.r1.a3).toBe(false);
        expect(snap.r1.t1).toBeCloseTo(2e-3, 9);

        // Regime 2 (t~0.15): seg1 has completed + gone silent, seg2 drives.
        expect(snap.r2.a1).toBe(false);
        expect(snap.r2.a2).toBe(true);
        expect(snap.r2.a3).toBe(false);
        expect(snap.r2.t2).toBeCloseTo(5e-3, 9);

        // Regime 3 (t~0.25): seg2 completed, seg3 (open-ended fan law) drives.
        expect(snap.r3.a2).toBe(false);
        expect(snap.r3.a3).toBe(true);
        expect(snap.r3.t3).toBeCloseTo(1.5e-8 * 700 * 700, 9);

        // The mid-chain "reached" event fired exactly once.
        expect(doneSink.pulses).toBe(1);
    });

    it("legacy defaults (autoStart, duration 0) keep the segment always-on (back-compat)", () => {
        const s = segment("constant", 7e-3, 0, true); // default-shaped: open-ended, auto-armed
        const builder = new RuntimeGraphBuilder<RuntimeNode, never>().withMode("dynamic").withNodes(s);
        const session = new Session(builder.build());
        s.reset(session);
        for (let k = 0; k <= 200; k++) session.run(k * 1e-3);
        expect(s.active).toBe(true); // never completes
        expect(s.tau).toBeCloseTo(7e-3, 9); // drives continuously
    });
});
