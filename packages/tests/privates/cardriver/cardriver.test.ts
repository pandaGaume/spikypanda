/**
 * Integration test for the Driving Signature Encoder pipeline.
 *
 * Uses a synthetic 3-axis accelerometer stream (sinusoidal mix per axis)
 * to drive the full pipeline:
 *
 *   AccelSource -> NormKernel -> WindowNode -> NormalizeKernel
 *               -> CnnAdapterKernel -> EmbeddingSink
 *
 * The test exercises three properties:
 *   1. Warm-up: no embedding is produced before the window has 30 samples.
 *   2. Steady-state: one embedding per tick once warmed up, with the
 *      expected shape (EMBEDDING_SIZE).
 *   3. Reset: session.reset() clears the window and the sink so the next
 *      run-through has to warm up again.
 */
import { ITensor, Session } from "spikypanda-core";
import {
    buildDrivingSignaturePipeline,
    CHANNELS,
    EMBEDDING_SIZE,
    WINDOW_SIZE,
} from "spikypanda-applications-cardriver";

function makeFakeSamples(count: number): number[][] {
    const out: number[][] = [];
    for (let t = 0; t < count; t++) {
        // Three slightly out-of-phase sinusoids plus a small DC offset per
        // axis. Enough variety that mean / std are non-trivial and the
        // CNN cannot collapse to a degenerate output.
        out.push([
            0.1 + Math.sin(t * 0.20),
            -0.2 + Math.cos(t * 0.17),
            0.05 + Math.sin(t * 0.31 + 0.5),
        ]);
    }
    return out;
}

function isFinite32(t: ITensor): boolean {
    for (let i = 0; i < t.data.length; i++) {
        if (!Number.isFinite(t.data[i])) {
            return false;
        }
    }
    return true;
}

describe("Driving Signature pipeline (integration)", () => {
    test("warm-up phase produces no embedding before the window is full", () => {
        const samples = makeFakeSamples(WINDOW_SIZE - 1);
        const pipe = buildDrivingSignaturePipeline({ samples });
        const session = new Session(pipe.graph);

        for (let t = 0; t < samples.length; t++) {
            session.run(t);
        }

        expect(pipe.window.isFull).toBe(false);
        expect(pipe.sink.received.length).toBe(0);
    });

    test("steady state produces one embedding per tick once warmed up", () => {
        const totalTicks = WINDOW_SIZE + 5; // 5 inferences after warm-up
        const samples = makeFakeSamples(totalTicks);
        const pipe = buildDrivingSignaturePipeline({ samples });
        const session = new Session(pipe.graph);

        for (let t = 0; t < totalTicks; t++) {
            session.run(t);
        }

        // Warm-up consumes the first WINDOW_SIZE samples (tick 0..29).
        // Tick 29 also produces the first embedding because WindowNode
        // becomes full at the end of that fire(). 5 more ticks each
        // produce one extra embedding.
        expect(pipe.window.isFull).toBe(true);
        expect(pipe.sink.received.length).toBe(totalTicks - WINDOW_SIZE + 1);

        for (const t of pipe.sink.received) {
            expect(t.shape).toEqual([EMBEDDING_SIZE]);
            expect(t.data.length).toBe(EMBEDDING_SIZE);
            expect(isFinite32(t)).toBe(true);
        }
    });

    test("input/window/normalize layout: every channel gets normalized to zero mean", () => {
        const totalTicks = WINDOW_SIZE; // single inference
        const samples = makeFakeSamples(totalTicks);
        const pipe = buildDrivingSignaturePipeline({ samples });
        const session = new Session(pipe.graph);

        for (let t = 0; t < totalTicks; t++) {
            session.run(t);
        }

        // Inspect the cached output of the NormalizeKernel via its bag.
        const normalized = pipe.normalizeKernel.bag?.lastOutputs?.[0];
        expect(normalized).toBeDefined();
        if (!normalized) return;
        expect(normalized.shape).toEqual([WINDOW_SIZE, CHANNELS]);

        // Per-channel mean over the time axis must be ~0.
        for (let c = 0; c < CHANNELS; c++) {
            let m = 0;
            for (let i = 0; i < WINDOW_SIZE; i++) {
                m += normalized.data[i * CHANNELS + c];
            }
            m /= WINDOW_SIZE;
            expect(Math.abs(m)).toBeLessThan(1e-4);
        }
    });

    test("session.reset() clears window state and sink", () => {
        const totalTicks = WINDOW_SIZE + 2;
        const samples = makeFakeSamples(totalTicks);
        const pipe = buildDrivingSignaturePipeline({ samples });
        const session = new Session(pipe.graph);

        for (let t = 0; t < totalTicks; t++) {
            session.run(t);
        }
        expect(pipe.sink.received.length).toBeGreaterThan(0);
        expect(pipe.window.isFull).toBe(true);

        session.reset();

        expect(pipe.sink.received.length).toBe(0);
        expect(pipe.window.isFull).toBe(false);
    });
});
