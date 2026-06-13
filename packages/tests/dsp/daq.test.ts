/**
 * Behavioral tests for DSP.Acquire:daq (DaqNode):
 *
 *   - RATE INDEPENDENCE (the core property): the sampling clock is
 *     SIM-TIME based, so two sessions ticking at 200 kHz and 20 kHz
 *     produce the same block geometry and (up to ZOH granularity)
 *     the same block RMS for the same input sinusoid;
 *   - block geometry: defaults produce 2048-sample blocks 0.2 s of
 *     sim time apart, and the published rms matches a hand-computed
 *     RMS of the captured block;
 *   - ZOH degenerate mode: a session far slower than fs still forms
 *     blocks, with ~fs/tickRate consecutive samples held equal;
 *   - the 1-pole anti-alias stage strongly attenuates an out-of-band
 *     line at block-RMS level;
 *   - reset() clears mid-block accumulation (no partial-block leaks);
 *   - a single large sim-time jump (free-mode catch-up) emits several
 *     blocks in one fire without overflowing the capacity-4 outputs.
 *
 * Nodes are driven through a real RuntimeGraph + Session (dynamic
 * scheduler) so input delivery, gating and publish semantics are the
 * production ones.
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import { DaqNode } from "../../dev/plugins/dsp/src/acquire/daq.node";
import { FrameCollector, TokenCollector, TokenSource } from "./helpers";

interface IDaqRig {
    daq: DaqNode;
    cBlock: FrameCollector;
    cRms: TokenCollector;
    session: Session;
}

/** Wire source -> daq -> block/rms collectors (not run yet, so the
 *  scenarios can interleave session.run with reset / reconfiguration). */
function buildDaqRig(tokens: unknown[], configure?: (daq: DaqNode) => void): IDaqRig {
    const source = new TokenSource(tokens);
    const daq = new DaqNode();
    const cBlock = new FrameCollector();
    const cRms = new TokenCollector();
    const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
        .withMode("dynamic")
        .withNodes(source, daq, cBlock, cRms)
        .withChannel(source, daq, "out", "value")
        .withChannel(daq, cBlock, "block")
        .withChannel(daq, cRms, "rms")
        .build();
    if (configure) configure(daq);
    return { daq, cBlock, cRms, session: new Session(graph) };
}

/** One sinusoid sample per tick at the session's own dt. */
function sine(freqHz: number, dt: number, ticks: number): number[] {
    const samples: number[] = [];
    for (let k = 0; k < ticks; k++) {
        samples.push(Math.sin(2 * Math.PI * freqHz * k * dt));
    }
    return samples;
}

/** Run `ticks` session cycles at t = k * dt, invoking the optional
 *  per-tick callback AFTER each cycle (block-emission timestamping). */
function runTicks(rig: IDaqRig, dt: number, ticks: number, onTick?: (k: number, t: number) => void): void {
    for (let k = 0; k < ticks; k++) {
        const t = k * dt;
        rig.session.run(t);
        if (onTick) onTick(k, t);
    }
}

function rmsOf(values: number[]): number {
    let sumSq = 0;
    for (const v of values) sumSq += v * v;
    return Math.sqrt(sumSq / values.length);
}

describe("DaqNode (DSP.Acquire:daq)", () => {
    test("rate independence: 200 kHz and 20 kHz sessions produce the same blocks in sim time", () => {
        // Same 1 kHz sinusoid, fs = 10240, block 512 (= 0.05 s of sim
        // time = 50 full cycles), AA off for exactness. The sample
        // instants derive from sim time, so both sessions sample at
        // the SAME 512 instants; values differ only by ZOH granularity
        // (the held value is at most one tick old).
        const fs = 10240;
        const block = 512;
        const configure = (d: DaqNode): void => {
            d.sample_rate_hz = fs;
            d.block_size = block;
            d.anti_alias = false;
        };

        const dtFast = 5e-6; // 200 kHz
        const ticksFast = Math.ceil(0.05 / dtFast) + 5;
        const rigFast = buildDaqRig(sine(1000, dtFast, ticksFast), configure);
        runTicks(rigFast, dtFast, ticksFast);

        const dtSlow = 5e-5; // 20 kHz
        const ticksSlow = Math.ceil(0.05 / dtSlow) + 5;
        const rigSlow = buildDaqRig(sine(1000, dtSlow, ticksSlow), configure);
        runTicks(rigSlow, dtSlow, ticksSlow);

        expect(rigFast.cBlock.frames.length).toBe(1);
        expect(rigSlow.cBlock.frames.length).toBe(1);
        expect(rigFast.cBlock.frames[0].shape).toEqual([block]);
        expect(rigSlow.cBlock.frames[0].shape).toEqual([block]);
        expect(rigFast.daq.block_duration_s).toBeCloseTo(block / fs, 12);
        expect(rigSlow.daq.block_duration_s).toBeCloseTo(block / fs, 12);

        const rmsFast = rigFast.cRms.tokens[0] as number;
        const rmsSlow = rigSlow.cRms.tokens[0] as number;
        expect(Math.abs(rmsFast - rmsSlow) / rmsFast).toBeLessThan(0.02);

        // Sanity: a unit sine over 50 full cycles has RMS ~ 1/sqrt(2).
        expect(rmsFast).toBeGreaterThan(0.65);
        expect(rmsFast).toBeLessThan(0.76);
    });

    test("block geometry: defaults emit 2048-sample blocks 0.2 s of sim time apart", () => {
        // dt = 1e-4 (10 kHz tick) against fs = 10240: blocks complete
        // at sim times ~0.2 and ~0.4 regardless of the tick grid.
        const dt = 1e-4;
        const ticks = 4150; // 0.415 s -> exactly 2 blocks
        const tokens: number[] = [];
        for (let k = 0; k < ticks; k++) {
            tokens.push(0.5 + Math.sin(2 * Math.PI * 7 * k * dt));
        }
        const rig = buildDaqRig(tokens, (d) => {
            d.anti_alias = false;
        });

        const emitTimes: number[] = [];
        let seen = 0;
        runTicks(rig, dt, ticks, (_k, t) => {
            if (rig.cBlock.frames.length > seen) {
                seen = rig.cBlock.frames.length;
                emitTimes.push(t);
            }
        });

        expect(rig.cBlock.frames.length).toBe(2);
        expect(rig.daq.block_count).toBe(2);
        expect(rig.cBlock.frames[0].shape).toEqual([2048]);
        expect(rig.cBlock.frames[1].shape).toEqual([2048]);
        expect(rig.daq.block_duration_s).toBeCloseTo(0.2, 12);

        // Consecutive emissions are 0.2 s of SIM time apart, within
        // one tick of tolerance (the completing instant lands between
        // two tick timestamps).
        expect(emitTimes.length).toBe(2);
        expect(Math.abs(emitTimes[1] - emitTimes[0] - 0.2)).toBeLessThanOrEqual(2 * dt);

        // The published rms matches a hand-computed RMS of the block.
        const hand0 = rmsOf(rig.cBlock.frames[0].values);
        const hand1 = rmsOf(rig.cBlock.frames[1].values);
        expect(rig.cRms.tokens.length).toBe(2);
        expect(rig.cRms.tokens[0] as number).toBeCloseTo(hand0, 6);
        expect(rig.cRms.tokens[1] as number).toBeCloseTo(hand1, 6);
        expect(rig.daq.last_rms).toBeCloseTo(hand1, 6);
    });

    test("ZOH degenerate mode: a 1 kHz session against fs = 10240 holds ~10-sample groups", () => {
        // The session ticks 10.24x slower than the ADC: every fire
        // takes 10 or 11 samples of the SAME held value (zero-order
        // hold staircase). Blocks still form and contain no NaN.
        const dt = 1e-3;
        const ticks = 60;
        const tokens: number[] = [];
        for (let k = 0; k < ticks; k++) tokens.push(k * 0.001); // strictly increasing ramp
        const rig = buildDaqRig(tokens, (d) => {
            d.block_size = 256;
            d.anti_alias = false;
        });
        runTicks(rig, dt, ticks);

        expect(rig.cBlock.frames.length).toBe(2);
        const values = [...rig.cBlock.frames[0].values, ...rig.cBlock.frames[1].values];
        expect(values.every(Number.isFinite)).toBe(true);

        // Consecutive blocks are contiguous in sample index, so run
        // lengths can be measured across the concatenation. Interior
        // runs are 10 or 11 samples long (10240 / 1000 = 10.24 per
        // tick); the first/last runs may be truncated.
        const runs: number[] = [];
        let run = 1;
        for (let i = 1; i < values.length; i++) {
            if (values[i] === values[i - 1]) {
                run++;
            } else {
                runs.push(run);
                run = 1;
            }
        }
        runs.push(run);
        const interior = runs.slice(1, -1);
        expect(interior.length).toBeGreaterThan(40);
        expect(interior.every((r) => r === 10 || r === 11)).toBe(true);
    });

    test("anti-alias: a 5 kHz line is attenuated > 10x at block RMS by the 100 Hz pole", () => {
        // 200 kHz ticks resolve the 5 kHz sine; with the 1-pole AA at
        // 100 Hz the line sits 50x above the corner, so its block RMS
        // collapses versus the AA-off run (1-pole rolloff ~ fc / f).
        const fs = 10240;
        const block = 512;
        const dt = 5e-6;
        const ticks = Math.ceil(0.05 / dt) + 5;
        const tokens = sine(5000, dt, ticks);
        const mkRig = (aa: boolean): IDaqRig =>
            buildDaqRig([...tokens], (d) => {
                d.sample_rate_hz = fs;
                d.block_size = block;
                d.anti_alias = aa;
                d.aa_cutoff_hz = 100;
            });

        const rigOff = mkRig(false);
        runTicks(rigOff, dt, ticks);
        const rigOn = mkRig(true);
        runTicks(rigOn, dt, ticks);

        expect(rigOff.cRms.tokens.length).toBe(1);
        expect(rigOn.cRms.tokens.length).toBe(1);
        const rmsOff = rigOff.cRms.tokens[0] as number;
        const rmsOn = rigOn.cRms.tokens[0] as number;
        expect(rmsOff).toBeGreaterThan(0.5);
        expect(rmsOn).toBeGreaterThan(0);
        expect(rmsOff / rmsOn).toBeGreaterThan(10);
    });

    test("reset() clears mid-block accumulation (no partial-block leak)", () => {
        const fs = 10240;
        const block = 512;
        const dt = 5e-5; // 20 kHz
        const totalTicks = 1600;
        const tokens: number[] = [];
        for (let k = 0; k < totalTicks; k++) tokens.push(1 + k * 0.001);
        const rig = buildDaqRig(tokens, (d) => {
            d.sample_rate_hz = fs;
            d.block_size = block;
            d.anti_alias = false;
        });

        // 500 ticks = 0.025 s = ~256 samples: mid-block, no emission.
        for (let k = 0; k < 500; k++) rig.session.run(k * dt);
        expect(rig.cBlock.frames.length).toBe(0);

        const preResetMax = 1 + 499 * 0.001;
        rig.daq.reset(rig.session);
        expect(rig.daq.block_count).toBe(0);
        expect(rig.daq.last_rms).toBe(0);

        // The clock re-arms on the next fire (t0 = 0.025 s); one full
        // block needs 512 / 10240 = 0.05 s = 1000 more ticks. Running
        // to tick 1599 yields EXACTLY one block: had the 256 pre-reset
        // samples leaked, a block would have completed ~25 ms earlier
        // and a second one would be in flight.
        for (let k = 500; k < totalTicks; k++) rig.session.run(k * dt);
        expect(rig.cBlock.frames.length).toBe(1);
        expect(rig.daq.block_count).toBe(1);
        expect(rig.cBlock.frames[0].values.length).toBe(block);

        // Every sample postdates the reset (the ramp makes pre-reset
        // values strictly smaller).
        expect(rig.cBlock.frames[0].values.every((v) => v > preResetMax)).toBe(true);
    });

    test("burst: a single large sim-time jump emits multiple blocks in one fire (capacity 4)", () => {
        // Free-mode catch-up: tick 1 arms the clock at t = 0, tick 2
        // jumps to t = 0.16 s = 1638 elapsed sampling instants = 3
        // full blocks of 512 + change, all published within ONE fire.
        // The capacity-4 block/rms ports absorb the burst without a
        // channel overflow.
        const fs = 10240;
        const block = 512;
        const rig = buildDaqRig([0.25, 0.25], (d) => {
            d.sample_rate_hz = fs;
            d.block_size = block;
            d.anti_alias = false;
        });

        rig.session.run(0);
        expect(rig.cBlock.frames.length).toBe(0);

        rig.session.run(0.16);
        expect(rig.cBlock.frames.length).toBe(3);
        expect(rig.daq.block_count).toBe(3);
        expect(rig.cRms.tokens.length).toBe(3);
        for (const frame of rig.cBlock.frames) {
            expect(frame.shape).toEqual([block]);
            expect(frame.values.every((v) => v === 0.25)).toBe(true);
        }
        for (const rms of rig.cRms.tokens) {
            expect(rms as number).toBeCloseTo(0.25, 6);
        }
    });
});
