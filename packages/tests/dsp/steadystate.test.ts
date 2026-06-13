/**
 * Behavioral tests for DSP.Detect:steadystate (SteadyStateGateNode):
 *
 *   - a noisy-constant signal enters steady after `settle` samples and
 *     gates values through from that point on;
 *   - a step change closes the gate within `breakHold` samples and the
 *     gate reopens once the EMA baseline has converged to the new
 *     plateau and `settle` stable samples have accumulated;
 *   - one `transition` token fires on EACH steady<->transient edge;
 *   - the optional input-smoothing stage (`smoothAlpha` < 1) recovers
 *     the gate on a resolved PWM carrier ripple that chatters the
 *     unsmoothed decision shut, while `value_gated` keeps forwarding
 *     the RAW samples.
 *
 * Nodes are driven through a real RuntimeGraph + Session (dynamic
 * scheduler) so input delivery, gating and publish semantics are the
 * production ones.
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import { SteadyStateGateNode } from "../../dev/plugins/dsp/src/detect/steadystate.node";
import { TokenCollector, TokenSource } from "./helpers";

interface IGateRig {
    gate: SteadyStateGateNode;
    cGated: TokenCollector;
    cSteady: TokenCollector;
    cTrans: TokenCollector;
    session: Session;
}

interface IGateRun {
    gate: SteadyStateGateNode;
    gated: number[];
    steady: boolean[];
    transitions: unknown[];
    session: Session;
}

/** Wire source -> gate -> three per-output collectors (not run yet, so
 *  scenarios can interleave session.run with reset / reconfiguration). */
function buildGateRig(samples: number[], configure?: (gate: SteadyStateGateNode) => void): IGateRig {
    const source = new TokenSource(samples);
    const gate = new SteadyStateGateNode();
    const cGated = new TokenCollector();
    const cSteady = new TokenCollector();
    const cTrans = new TokenCollector();
    const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
        .withMode("dynamic")
        .withNodes(source, gate, cGated, cSteady, cTrans)
        .withChannel(source, gate, "out", "value")
        .withChannel(gate, cGated, "value_gated")
        .withChannel(gate, cSteady, "steady")
        .withChannel(gate, cTrans, "transition")
        .build();
    if (configure) configure(gate);
    return { gate, cGated, cSteady, cTrans, session: new Session(graph) };
}

/** Wire source -> gate -> three per-output collectors and run every sample. */
function runGate(samples: number[], configure?: (gate: SteadyStateGateNode) => void): IGateRun {
    const rig = buildGateRig(samples, configure);
    for (let k = 0; k < samples.length; k++) {
        rig.session.run(k);
    }
    return {
        gate: rig.gate,
        gated: rig.cGated.tokens as number[],
        steady: rig.cSteady.tokens as boolean[],
        transitions: rig.cTrans.tokens,
        session: rig.session,
    };
}

// ---------------------------------------------------------------------------
// Ripple signal fixtures (deterministic)
// ---------------------------------------------------------------------------

/** Deterministic PRNG (mulberry32) so the ripple scenarios reproduce
 *  bit-for-bit run to run. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Standard-normal sampler (Box-Muller over mulberry32). */
function gaussian(rand: () => number): () => number {
    return () => {
        const u = Math.max(rand(), 1e-12);
        const v = rand();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
}

/** A current level carrying a +/- 6 % triangular ripple with a
 *  20-sample period plus gaussian noise (sigma 1.6 %): the shape a
 *  200 kHz derived rate (20x fPwm) resolves out of a 10 kHz PWM loop,
 *  where the unsmoothed gate chatters because the ripple exceeds the
 *  5 % relative epsilon. */
function rippleSamples(count: number, level: number, seed: number): number[] {
    const noise = gaussian(mulberry32(seed));
    const samples: number[] = [];
    for (let k = 0; k < count; k++) {
        const phase = (k % 20) / 20;
        const tri = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
        samples.push(level * (1 + 0.06 * tri + 0.016 * noise()));
    }
    return samples;
}

describe("SteadyStateGateNode", () => {
    test("noisy constant enters steady after `settle` samples and gates values through", () => {
        // 100 samples around 10 with deterministic +-0.1 ripple: well
        // inside the default relative band (0.05 * 10 = 0.5), so every
        // sample is stable and the gate opens exactly at sample 20
        // (default settle), forwarding samples 20..100 = 81 values.
        const samples: number[] = [];
        for (let k = 0; k < 100; k++) samples.push(10 + 0.1 * Math.sin(0.7 * k));

        const { gate, gated, steady, transitions } = runGate(samples);

        expect(transitions.length).toBe(1);
        expect(gated.length).toBe(81);
        expect(gated[0]).toBeCloseTo(samples[19], 12); // the settle-completing sample IS forwarded
        expect(steady.length).toBe(100); // published on every fire
        expect(steady[18]).toBe(false); // sample 19: one short of settle
        expect(steady[19]).toBe(true); // sample 20: settle reached
        expect(steady[99]).toBe(true);
        expect(gate.isSteady).toBe(true);
        expect(gate.transitionCount).toBe(1);
    });

    test("step change closes the gate within breakHold samples and reopens at the new plateau", () => {
        // 60 samples at 10, then 60 at 20. Tuned editables keep the
        // arithmetic exactly checkable: emaAlpha=0.2 converges the
        // baseline onto the new plateau within the run.
        const samples: number[] = [];
        for (let k = 0; k < 60; k++) samples.push(10);
        for (let k = 0; k < 60; k++) samples.push(20);

        const { gated, steady, transitions } = runGate(samples, (g) => {
            g.epsilon = 0.05;
            g.settle = 10;
            g.breakHold = 3;
            g.emaAlpha = 0.2;
        });

        // Three edges: enter at sample 10, leave at sample 63
        // (breakHold=3 unstable samples after the step at sample 61),
        // re-enter at sample 81 once the EMA has converged (first
        // stable sample is 72, +10 settle).
        expect(transitions.length).toBe(3);

        // steady flag timeline (0-based indices = sample - 1).
        expect(steady[8]).toBe(false); // sample 9: still settling
        expect(steady[9]).toBe(true); // sample 10: open
        expect(steady[60]).toBe(true); // sample 61: 1st unstable, hysteresis holds
        expect(steady[61]).toBe(true); // sample 62: 2nd unstable, still holds
        expect(steady[62]).toBe(false); // sample 63: breakHold reached, gate closed
        expect(steady[79]).toBe(false); // sample 80: still re-settling
        expect(steady[80]).toBe(true); // sample 81: reopened on the new plateau
        expect(steady[119]).toBe(true);

        // Gated stream: 51 samples of the first plateau (10..60), the
        // 2 hysteresis-leak samples of the step (61, 62 are forwarded
        // while breakHold has not elapsed yet), then 40 samples of the
        // second plateau (81..120).
        expect(gated.length).toBe(51 + 2 + 40);
        expect(gated.slice(0, 51).every((v) => v === 10)).toBe(true);
        expect(gated.slice(51).every((v) => v === 20)).toBe(true);
    });

    test("transition tokens are one-shot edge events", () => {
        const samples: number[] = [];
        for (let k = 0; k < 30; k++) samples.push(5);
        const { transitions } = runGate(samples, (g) => {
            g.settle = 10;
        });
        // A single enter edge, no repeats while the regime persists.
        expect(transitions).toEqual([true]);
    });

    test("reset() restores cold state", () => {
        const samples: number[] = [];
        for (let k = 0; k < 40; k++) samples.push(7);
        const { gate, session } = runGate(samples);
        expect(gate.isSteady).toBe(true);
        expect(gate.transitionCount).toBe(1);

        gate.reset(session);
        expect(gate.isSteady).toBe(false);
        expect(gate.transitionCount).toBe(0);
        expect(gate.baseline).toBe(0);
    });
});

describe("SteadyStateGateNode input smoothing (smoothAlpha)", () => {
    // Monitoring tuning shared by the ripple scenarios: epsilon,
    // breakHold and emaAlpha stay at their defaults; settle = 50
    // mirrors a realistic dwell so a lucky noise streak cannot open
    // the unsmoothed gate by chance. Only smoothAlpha varies.
    function tune(gate: SteadyStateGateNode, smoothAlpha: number): void {
        gate.settle = 50;
        gate.smoothAlpha = smoothAlpha;
    }

    test("regression pin: resolved PWM ripple keeps the unsmoothed gate shut forever", () => {
        // The user-reported failure mode: at the 200 kHz derived rate
        // the +/- 6 % ripple exceeds epsilon (5 %) once per half-period
        // (every ~10 samples), so `settle` consecutive stable samples
        // never accumulate and no window ever reaches the encoder.
        const samples = rippleSamples(5000, 0.62, 0xc0ffee);
        const { gate, gated, transitions } = runGate(samples, (g) => tune(g, 1));

        expect(transitions.length).toBe(0);
        expect(gated.length).toBe(0);
        expect(gate.isSteady).toBe(false);
    });

    test("smoothAlpha = 0.01 opens on the same ripple and stays open", () => {
        const samples = rippleSamples(5000, 0.62, 0xc0ffee);
        const { gate, gated, transitions } = runGate(samples, (g) => tune(g, 0.01));

        // One enter edge, then the gate never drops: the smoothed
        // decision no longer sees the carrier.
        expect(transitions.length).toBe(1);
        expect(gate.isSteady).toBe(true);
        expect(gated.length).toBeGreaterThan(4000);

        // value_gated forwards the RAW samples: the full ripple spread
        // (+/- 6 % plus noise) survives; only the DECISION is smoothed.
        const max = gated.reduce((a, b) => Math.max(a, b), -Infinity);
        const min = gated.reduce((a, b) => Math.min(a, b), Infinity);
        expect(max - min).toBeGreaterThan(0.62 * 0.1);
        expect(gated[gated.length - 1]).toBeCloseTo(samples[samples.length - 1], 12);
    });

    test("a 2.5x level step closes the smoothed gate and re-opens on the new plateau", () => {
        const stepAt = 2000;
        const samples = [...rippleSamples(stepAt, 0.62, 0xc0ffee), ...rippleSamples(3000, 1.55, 0xbead42)];
        const { gate, steady, transitions } = runGate(samples, (g) => tune(g, 0.01));

        // Three edges in total: enter, leave on the step, re-enter.
        expect(transitions.length).toBe(3);
        expect(gate.isSteady).toBe(true);

        // Open right before the step, closed within a few hundred
        // samples of it (the smoother delays the reaction but the
        // baseline lag still trips epsilon while s drifts).
        expect(steady[stepAt - 1]).toBe(true);
        const closeIdx = steady.findIndex((flag, i) => i >= stepAt && flag === false);
        expect(closeIdx).toBeGreaterThanOrEqual(stepAt);
        expect(closeIdx - stepAt).toBeLessThan(300);

        // Re-opens on the new plateau and never drops again.
        const reopenIdx = steady.findIndex((flag, i) => i > closeIdx && flag === true);
        expect(reopenIdx).toBeGreaterThan(closeIdx);
        expect(steady.slice(reopenIdx).every(Boolean)).toBe(true);
    });

    test("reset() reseeds the smoother on the first sample after reset", () => {
        // 200 samples on a 0.62 A plateau, reset, then a 5x different
        // plateau through the SAME node. Reseeded, the smoother starts
        // on the new level and the gate opens after exactly `settle`
        // samples; a stale smoother would still be drifting from the
        // old plateau (time constant 1/smoothAlpha = 100 samples) and
        // hold the gate shut well past that point.
        const samples = [...rippleSamples(200, 0.62, 0x5eed01), ...rippleSamples(200, 3.1, 0x5eed02)];
        const rig = buildGateRig(samples, (g) => tune(g, 0.01));
        for (let k = 0; k < 200; k++) rig.session.run(k);
        expect(rig.gate.isSteady).toBe(true);

        rig.gate.reset(rig.session);
        expect(rig.gate.isSteady).toBe(false);
        expect(rig.gate.baseline).toBe(0);

        // 49 post-reset samples: one short of settle, still closed.
        for (let k = 200; k < 249; k++) rig.session.run(k);
        expect(rig.gate.isSteady).toBe(false);

        // The 50th completes settle: the first post-reset sample seeded
        // the smoother (and the baseline) on the new plateau.
        rig.session.run(249);
        expect(rig.gate.isSteady).toBe(true);
        expect(rig.gate.transitionCount).toBe(1);
    });
});
