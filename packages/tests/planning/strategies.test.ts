/**
 * Allocation strategy unit tests.
 *
 * Operates on hand-crafted lifetimes so the algorithms can be exercised
 * without building a real ComputeGraph. Two flavours:
 *
 *   1. Synthetic 3-tensor scenarios to verify each strategy's specific
 *      behaviour (sequential stacking, refcount release, offline
 *      packing).
 *
 *   2. End-to-end check on the KWS-style catalog the memory-viz sample
 *      uses, to lock in the four peak values surfaced in the UI
 *      (no-recycling ≈ 793 KB, refcount/firstfit ≈ 253 KB,
 *      greedy ≈ 245 KB).
 */
import {
    ArenaFirstFitStrategy,
    ArenaGreedyStrategy,
    NoRecyclingStrategy,
    RefcountReleaseStrategy,
    maxSimultaneousBytes,
    overhead,
    type ITensorLifetime,
    type PlanDType,
} from "spikypanda-core";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function L(
    tensorId: string,
    producerId: string,
    consumerIds: string[],
    birthStep: number,
    deathStep: number,
    bytes: number,
): ITensorLifetime {
    return {
        tensorId, producerId, consumerIds,
        outputIndex: 0,
        birthStep, deathStep,
        shape: [bytes / 4],
        dtype: "float32" as PlanDType,
        bytes,
    };
}

function makeSchedule(length: number): string[] {
    return Array.from({ length }, (_, i) => `n${i}`);
}

// ─── Synthetic scenarios ─────────────────────────────────────────────────────

describe("allocation strategies — synthetic", () => {
    // Three tensors with non-overlapping lifetimes (each one dies
    // strictly before the next is born). A perfect allocator should
    // place all three at offset 0, peak = max size.
    //
    // schedule steps: 0─1─2─3─4─5
    //  t0 alive [0,1] (dies at step 1)
    //  t1 alive [2,3] (born after t0 dead)
    //  t2 alive [4,5]
    const lifetimes: ITensorLifetime[] = [
        L("t0", "n0", ["n1"], 0, 1, 1000),
        L("t1", "n2", ["n3"], 2, 3, 2000),
        L("t2", "n4", ["n5"], 4, 5, 1500),
    ];
    const schedule = makeSchedule(6);

    test("no-recycling stacks tensors monotonically", () => {
        const plan = new NoRecyclingStrategy().plan(lifetimes, schedule);
        expect(plan.peakBytes).toBe(1000 + 2000 + 1500);
        expect(plan.allocations.get("t0")?.offset).toBe(0);
        expect(plan.allocations.get("t1")?.offset).toBe(1000);
        expect(plan.allocations.get("t2")?.offset).toBe(3000);
    });

    test("refcount-release recycles offset 0 after each death", () => {
        const plan = new RefcountReleaseStrategy().plan(lifetimes, schedule);
        // All three lifetimes are disjoint, refcount drops each tensor
        // before the next placement → every tensor lands at offset 0.
        expect(plan.peakBytes).toBe(2000);
        for (const t of lifetimes) {
            expect(plan.allocations.get(t.tensorId)?.offset).toBe(0);
        }
    });

    test("arena-greedy never exceeds refcount-release", () => {
        const refcount = new RefcountReleaseStrategy().plan(lifetimes, schedule);
        const greedy   = new ArenaGreedyStrategy().plan(lifetimes, schedule);
        expect(greedy.peakBytes).toBeLessThanOrEqual(refcount.peakBytes);
    });

    test("all strategies share the same minBound", () => {
        const expected = maxSimultaneousBytes(lifetimes, schedule.length);
        for (const Strat of [NoRecyclingStrategy, RefcountReleaseStrategy, ArenaFirstFitStrategy, ArenaGreedyStrategy]) {
            const plan = new Strat().plan(lifetimes, schedule);
            expect(plan.minBound).toBe(expected);
        }
    });

    test("overhead is zero when greedy is optimal", () => {
        // Two non-overlapping tensors: any reasonable allocator should
        // place them at the same offset, peak = max(sizes), no waste.
        const nonOverlap: ITensorLifetime[] = [
            L("a", "n0", ["n1"], 0, 1, 4000),
            L("b", "n1", ["n2"], 2, 3, 5000),
        ];
        const greedy = new ArenaGreedyStrategy().plan(nonOverlap, makeSchedule(4));
        expect(greedy.peakBytes).toBe(5000);
        expect(overhead(greedy)).toBe(0);
    });
});

// ─── End-to-end : KWS-style catalog ──────────────────────────────────────────

/**
 * Direct port of the memory-viz mock catalog. The exact byte counts and
 * lifespans matter because we want the migrated planner to reproduce
 * the numbers users see in the browser.
 */
function buildKwsLifetimes(): ITensorLifetime[] {
    const catalog: Array<{ name: string; producer: number; consumers: number[]; bytes: number }> = [
        { name: "input_buf",    producer: 0,  consumers: [1],        bytes: 7840 },
        { name: "conv1_w_pack", producer: 1,  consumers: [1],        bytes: 576 },
        { name: "conv1_out",    producer: 1,  consumers: [2],        bytes: 125440 },
        { name: "bn1_params",   producer: 2,  consumers: [2],        bytes: 256 },
        { name: "bn1_out",      producer: 2,  consumers: [3],        bytes: 125440 },
        { name: "relu1_out",    producer: 3,  consumers: [4],        bytes: 125440 },
        { name: "pool1_out",    producer: 4,  consumers: [5],        bytes: 30720 },
        { name: "conv2_w_pack", producer: 5,  consumers: [5],        bytes: 18432 },
        { name: "conv2_out",    producer: 5,  consumers: [6],        bytes: 61440 },
        { name: "bn2_params",   producer: 6,  consumers: [6],        bytes: 512 },
        { name: "bn2_out",      producer: 6,  consumers: [7],        bytes: 61440 },
        { name: "relu2_out",    producer: 7,  consumers: [8],        bytes: 61440 },
        { name: "pool2_out",    producer: 8,  consumers: [9],        bytes: 15360 },
        { name: "conv3_w_pack", producer: 9,  consumers: [9],        bytes: 73728 },
        { name: "conv3_out",    producer: 9,  consumers: [10],       bytes: 30720 },
        { name: "bn3_params",   producer: 10, consumers: [10],       bytes: 1024 },
        { name: "bn3_out",      producer: 10, consumers: [11],       bytes: 30720 },
        { name: "relu3_out",    producer: 11, consumers: [12],       bytes: 30720 },
        { name: "gap_out",      producer: 12, consumers: [13],       bytes: 256 },
        { name: "matmul_w",     producer: 13, consumers: [13],       bytes: 3072 },
        { name: "matmul_out",   producer: 13, consumers: [14],       bytes: 48 },
        { name: "bias_vec",     producer: 14, consumers: [14],       bytes: 48 },
        { name: "add_out",      producer: 14, consumers: [15],       bytes: 48 },
        { name: "softmax_tmp",  producer: 15, consumers: [15],       bytes: 48 },
        { name: "softmax_out",  producer: 15, consumers: [16],       bytes: 48 },
        { name: "output_buf",   producer: 16, consumers: [],         bytes: 48 },
        { name: "quant_calib",  producer: 0,  consumers: [16],       bytes: 256 },
        { name: "im2col_pad",   producer: 5,  consumers: [5, 9],     bytes: 7200 },
        { name: "log_buf",      producer: 13, consumers: [15, 16],   bytes: 96 },
    ];
    return catalog.map(c => L(
        c.name,
        `n${c.producer}`,
        c.consumers.map(i => `n${i}`),
        c.producer,
        c.consumers.length === 0 ? c.producer : Math.max(...c.consumers),
        c.bytes,
    ));
}

describe("allocation strategies — KWS-style catalog", () => {
    const lifetimes = buildKwsLifetimes();
    const schedule = makeSchedule(17);

    test("no-recycling peak equals the sum of all transients", () => {
        const plan = new NoRecyclingStrategy().plan(lifetimes, schedule);
        const totalBytes = lifetimes.reduce((s, t) => s + t.bytes, 0);
        expect(plan.peakBytes).toBe(totalBytes);
        expect(totalBytes).toBe(812416); // sanity check on catalog totals
    });

    test("arena-greedy reaches the theoretical minimum (overhead = 0)", () => {
        const plan = new ArenaGreedyStrategy().plan(lifetimes, schedule);
        // The KWS schedule has a clean peak step that all live tensors
        // can be packed against; greedy should match the lower bound.
        expect(plan.peakBytes).toBe(plan.minBound);
        expect(plan.peakBytes).toBe(251392); // 245.5 KB
        expect(overhead(plan)).toBe(0);
    });

    test("refcount-release and arena-firstfit land between baseline and optimum", () => {
        const baseline = new NoRecyclingStrategy().plan(lifetimes, schedule).peakBytes;
        const optimum  = new ArenaGreedyStrategy().plan(lifetimes, schedule).peakBytes;
        const refcount = new RefcountReleaseStrategy().plan(lifetimes, schedule).peakBytes;
        const firstfit = new ArenaFirstFitStrategy().plan(lifetimes, schedule).peakBytes;

        // Both should beat the baseline by a wide margin (3x+).
        expect(refcount).toBeLessThan(baseline / 3);
        expect(firstfit).toBeLessThan(baseline / 3);

        // Neither can do better than greedy on this catalog.
        expect(refcount).toBeGreaterThanOrEqual(optimum);
        expect(firstfit).toBeGreaterThanOrEqual(optimum);

        // Refcount can in principle exceed offline firstfit but only by
        // a small margin; cap the slack at 5% to catch regressions.
        expect(refcount).toBeLessThanOrEqual(firstfit * 1.05);
    });

    test("strategies form a non-increasing peak order", () => {
        const peaks = [
            new NoRecyclingStrategy().plan(lifetimes, schedule).peakBytes,
            new RefcountReleaseStrategy().plan(lifetimes, schedule).peakBytes,
            new ArenaFirstFitStrategy().plan(lifetimes, schedule).peakBytes,
            new ArenaGreedyStrategy().plan(lifetimes, schedule).peakBytes,
        ];
        for (let i = 1; i < peaks.length; i++) {
            expect(peaks[i]).toBeLessThanOrEqual(peaks[i - 1]);
        }
    });
});
