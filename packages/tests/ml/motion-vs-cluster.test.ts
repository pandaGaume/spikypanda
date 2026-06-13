/**
 * THE comparison matrix: position (ML.Cluster:online's OnlineClusterer)
 * vs movement (ML.Detect:motion's MotionWatch), driven by the SAME
 * synthetic 5-dim trajectories, seeded, no Session. This is what makes
 * the two channels' complementarity falsifiable; it backs
 * docs/regime_detection_deux_canaux.md.
 *
 *   Scenario          | cluster (position)        | motion (movement)
 *   ------------------+---------------------------+--------------------------
 *   A sharp step      | NEW profile AT the step   | REGIME_JUMP AT the step
 *   B slow drift      | REGIME_DRIFT staircase    | SILENT (documented gap)
 *   C per-dim freeze  | SILENT (k=1, no drift)    | REGIME_FREEZE, names dim
 *   D benign jitter   | SILENT (k=1 after t=0)    | SILENT
 *
 * The two diagonal blind spots are the whole point: the cluster cannot
 * NAME a frozen dimension (the position barely moves), and a
 * frozen-reference movement detector cannot see a slow drift (each
 * step looks typical against the learned scale). Run both.
 */
import { MotionWatch, OnlineClusterer } from "../../dev/plugins/ml/src/index";
import type { AssignResult, IMotionEvent, MotionResult } from "../../dev/plugins/ml/src/index";

function makeLcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000 - 0.5;
    };
}

const PROTO_A = [1, 1, 1, 0, 0];
const PROTO_B = [0, 1, 1, 1, 0];

/** Component jitter +/- 0.01 (eps 0.02): cosine-negligible for the
 *  cluster (~1e-4, far under update_thr 0.02) and the motion baseline
 *  scale (per-step |delta| triangular on [0, 0.02], median ~ 0.0059,
 *  max 0.02, so the benign z ceiling is ~ 3.4 < z_jump 6). */
function noisy(proto: number[], rand: () => number): number[] {
    return proto.map((v) => v + 0.02 * rand());
}

/** Unit-norm direction rotated by theta in the plane spanned by the
 *  normalized dims 0..2 block and the orthogonal one-hot dim 4 (the
 *  rotated(theta) drift model from online-cluster.test.ts, in 5-d):
 *  per-step cosine distance is QUADRATIC in angle, so a slow rotation
 *  stays under update_thr forever while the excursion grows without
 *  bound: the boiling frog the anchors exist for. */
function rotated5(theta: number): number[] {
    const u0 = Math.cos(theta) / Math.sqrt(3);
    return [u0, u0, u0, 0, Math.sin(theta)];
}

/** Both detectors consume the SAME vectors; calibrated defaults on
 *  both sides (cluster: assign 0.05 / update 0.02 / alpha 0.15 /
 *  driftThr 0.1; motion: warmup 64 / window 16 / freezeRatio 0.1 /
 *  zJump 6). */
function driveBoth(vectors: number[][]): { cluster: AssignResult[]; motion: MotionResult[] } {
    const oc = new OnlineClusterer({ assignThr: 0.05, updateThr: 0.02, alpha: 0.15, driftThr: 0.1 });
    const mw = new MotionWatch();
    const cluster: AssignResult[] = [];
    const motion: MotionResult[] = [];
    for (const v of vectors) {
        cluster.push(oc.assign(v));
        motion.push(mw.step(v));
    }
    return { cluster, motion };
}

function newSteps(cluster: AssignResult[]): number[] {
    return cluster.map((r, t) => (r.isNew ? t : -1)).filter((t) => t >= 0);
}

function driftSteps(cluster: AssignResult[]): number[] {
    return cluster.map((r, t) => (r.drift ? t : -1)).filter((t) => t >= 0);
}

function eventSteps(motion: MotionResult[], kind: "jump" | "freeze"): { step: number; event: IMotionEvent }[] {
    const out: { step: number; event: IMotionEvent }[] = [];
    motion.forEach((r, t) => {
        for (const ev of r.events) {
            if (ev.kind === kind) out.push({ step: t, event: ev });
        }
    });
    return out;
}

describe("motion vs cluster: the two-channel comparison matrix", () => {
    it("Scenario A (sharp step): BOTH fire, at the SAME step", () => {
        const rand = makeLcg(101);
        const STEP_AT = 120;
        const vectors = Array.from({ length: 200 }, (_, t) => noisy(t < STEP_AT ? PROTO_A : PROTO_B, rand));
        const { cluster, motion } = driveBoth(vectors);

        // Cluster cell: the step direction change (cos dist 1/3, far
        // past assign_thr 0.05) mints a NEW profile exactly at the step.
        expect(newSteps(cluster)).toEqual([0, STEP_AT]); // t=0 is profile 0's creation
        expect(driftSteps(cluster)).toEqual([]);

        // Motion cell: the same step is an abnormal per-element delta
        // exactly where the level changed (elements 0 and 3 swap between
        // 1 and 0; elements 1, 2, 4 keep their level and stay silent),
        // so the jump fires at the step AND names the moved elements.
        const jumps = eventSteps(motion, "jump");
        expect(jumps.map((j) => j.step)).toEqual([STEP_AT, STEP_AT]);
        expect(jumps.map((j) => j.event.element).sort()).toEqual([0, 3]);
        for (const j of jumps) {
            expect(j.event.score).toBeGreaterThan(6);
        }
        expect(eventSteps(motion, "freeze")).toEqual([]);
    });

    it("Scenario B (slow drift): cluster climbs the REGIME_DRIFT staircase, motion stays SILENT (the documented gap)", () => {
        const rand = makeLcg(202);
        const DTHETA = Math.PI / 1500; // per-step cos dist ~ 2e-6 << update_thr
        const STEPS = 700; // total rotation ~ 1.47 rad: cos excursion far past driftThr
        const vectors = Array.from({ length: STEPS }, (_, t) => noisy(rotated5(t * DTHETA), rand));
        const { cluster, motion } = driveBoth(vectors);

        // Cluster cell: the EMA silently follows the rotation (no NEW
        // profile, ever), but the immutable anchors see the cumulative
        // excursion: at least one REGIME_DRIFT stair (expected ~ 3 for
        // 1.47 rad at acos(1 - 0.1) ~ 0.45 rad per stair).
        expect(newSteps(cluster)).toEqual([0]);
        const drifts = driftSteps(cluster);
        expect(drifts.length).toBeGreaterThanOrEqual(1);
        expect(drifts.length).toBeLessThanOrEqual(5);

        // Motion cell: ZERO events. What makes motion blind here is
        // constructed honestly: the warmup runs ON jitter + drift, and
        // the per-step drift increment (<= dtheta ~ 0.0021 per element)
        // sits BELOW the jitter scale (median |delta| ~ 0.006), so the
        // drift IS the typical step: every post-warmup z stays around
        // 3-4 < z_jump 6, and the rolling path never collapses. A
        // frozen-reference movement detector measures per-step
        // dynamics; a drift slow enough to fool the cluster's EMA is
        // also made of individually unremarkable steps.
        expect(eventSteps(motion, "jump")).toEqual([]);
        expect(eventSteps(motion, "freeze")).toEqual([]);
    });

    it("Scenario C (one dim freezes, position unchanged): motion fires REGIME_FREEZE naming the dim, cluster stays SILENT", () => {
        const rand = makeLcg(303);
        const FREEZE_AT = 150;
        const WINDOW = 16; // MotionWatch default
        const vectors = Array.from({ length: 400 }, (_, t) => {
            const v = noisy(PROTO_A, rand);
            if (t >= FREEZE_AT) v[2] = PROTO_A[2]; // dim 2's jitter dies; the LEVEL does not move
            return v;
        });
        const { cluster, motion } = driveBoth(vectors);

        // Motion cell: exactly one REGIME_FREEZE (latched), naming dim 2,
        // once the stand-still has drained the rolling window (the
        // window-fill delay after the onset).
        const freezes = eventSteps(motion, "freeze");
        expect(freezes).toHaveLength(1);
        expect(freezes[0].event.element).toBe(2);
        expect(freezes[0].event.score).toBeLessThan(0.1);
        expect(freezes[0].step).toBeGreaterThanOrEqual(FREEZE_AT + WINDOW - 2);
        expect(freezes[0].step).toBeLessThanOrEqual(FREEZE_AT + WINDOW + 1);
        expect(eventSteps(motion, "jump")).toEqual([]);

        // Cluster cell: the position NEVER moved (one dim losing its
        // +/- 0.01 jitter is cosine-invisible), so the cluster has
        // nothing to say: k stays 1, zero drift events. This is the
        // localization gap motion exists for.
        expect(newSteps(cluster)).toEqual([0]);
        expect(driftSteps(cluster)).toEqual([]);
        expect(cluster.every((r) => r.label === 0)).toBe(true);
    });

    it("Scenario D (benign jitter): BOTH silent", () => {
        const rand = makeLcg(404);
        const vectors = Array.from({ length: 2000 }, () => noisy(PROTO_A, rand));
        const { cluster, motion } = driveBoth(vectors);

        // Cluster cell: one profile at t=0, then silence: no NEW, no drift.
        expect(newSteps(cluster)).toEqual([0]);
        expect(driftSteps(cluster)).toEqual([]);

        // Motion cell: silence, full stop.
        expect(eventSteps(motion, "jump")).toEqual([]);
        expect(eventSteps(motion, "freeze")).toEqual([]);
    });
});
