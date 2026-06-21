/**
 * SP2 end-to-end, the MCSA flagship: a squirrel-cage induction motor
 * running direct-on-line develops a broken-rotor-bar fault WHILE
 * RUNNING; a MotorwatchDevice fed a demodulated stator-current feature
 * stream discovers the fault regime open-set (exactly one NEW_REGIME
 * alarm), the central station pushes a 3-cause diagnostic ONNX model at
 * runtime and labels it "broken_rotor_bar"; the label federates across
 * sites; a pure load step on the healthy motor is the negative control
 * (different regime, different diagnosis).
 *
 * Harness choices (documented):
 *   - The motor is voltage-driven with the EXACT direct-on-line pattern
 *     of packages/tests/physics/induction-motor.test.ts (re-armable
 *     driven-input session, balanced 3-phase sinusoids, constant tau).
 *     dt = 1/(60*84) (~5040 Hz, same regime as the node's 2e-4
 *     calibration) so one supply period is EXACTLY 84 solver samples
 *     and the RMS demodulation window nulls the 60 Hz carrier.
 *   - DEMODULATED FEED, not raw 60 Hz current: stator-current envelope
 *     demodulation is standard MCSA practice; the broken-bar rotor
 *     asymmetry modulates the envelope at 2*s*f (a few Hz, ~10.6 Hz
 *     here) with depth ~k/N, which the encoder's slope/band features
 *     can separate, while raw 60 Hz would alias through the level-band
 *     encoder. The harness chain is the classic AM detector:
 *       phaseCurrentA -> sliding RMS over one supply period (carrier removal,
 *       hop 28 -> 180 Hz envelope rate)
 *           -> |env - ENV_REF| (AC coupling against the healthy
 *              commissioning baseline + rectification)
 *           -> sliding mean over 76 envelope samples (~0.42 s, ~4.5
 *              modulation periods: ripple smoothing)
 *           -> PEDESTAL + DEMOD_GAIN * (.) (sensor calibration: healthy
 *              floor ~0.10 sits below the encoder's first level band at
 *              0.15, the fault level lands mid band 1).
 *     The result is a LEVEL-coded stream: healthy ~0.10, broken bars
 *     ~0.42, load step ~2.9 (saturating every band): three directions
 *     pairwise > 0.39 cosine distance apart in embedding space, while
 *     within-regime jitter stays < 0.02.
 *   - BAR_SEVERITY = 2 (documented choice): severity 1 yields a 4.2
 *     percent envelope modulation, severity 2 yields 8.0 percent, which
 *     puts the demodulated fault level ~480x above the healthy
 *     demodulation floor with a moderate calibration gain. Severity 1
 *     also separates, with half the margin.
 *   - The monitor is ARMED at T_ARM = 2.5 s, after the direct-on-line
 *     run-up: the locked-rotor inrush is a quasi-plateau (~5x rated
 *     current over ~0.8 s) that a level encoder would otherwise learn
 *     as the cold-start baseline. Gating the feed to the settled drive
 *     is standard MCSA measurement practice.
 *   - Gate epsilon 0.12: the smoothed fault plateau keeps ~5 percent
 *     residual ripple; transitions between levels are step-like and
 *     still trip the gate by a wide margin.
 *   - COLD-START SEMANTIC (device contract): the first profile (k = 1,
 *     healthy) is the baseline and does NOT alarm; each later open-set
 *     discovery alarms exactly once.
 */
import { InductionMotorDynamicNode } from "spikypanda-plugin-physics";
import { sha256Hex } from "spikypanda-plugin-onnx";
import { CentralStation, InProcessDeviceServer, MotorwatchDevice, RegimeCatalog, mergeCatalogs } from "spikypanda-applications-motorwatch";
import type { IDeviceAlarm, IRegimeCurrentResult } from "spikypanda-applications-motorwatch";
import { ENCODER_DIM, bindDrivenInputs, buildDiagnosticBytes, buildEncoderBytes, emptySession, makeGaussian, slidingMean, slidingRms } from "./helpers";

// ─── Simulation constants ───────────────────────────────────────────────────

const TWO_PI = 2 * Math.PI;
const F_SUPPLY = 60; // Hz
const SAMPLES_PER_PERIOD = 84; // exact carrier period in solver samples
const DT = 1 / (F_SUPPLY * SAMPLES_PER_PERIOD); // ~1.984e-4 s (5040 Hz)
const V_PEAK = 80; // armatureVoltage phase peak (node calibration point)
const TAU_NOMINAL = 1.5; // Nm
const TAU_STEP = 2.0; // Nm (negative control; 3.0 would stall: breakdown)
const NOISE_STD = 0.003; // 3 mA sensor noise, deterministic seed

const BROKEN_BARS = 2;
const BAR_SEVERITY = 2; // documented choice, see header
const T_FAULT = 5; // s, live flip while the motor keeps running
const T_END_FAULT = 11; // s, end of stream 1
const T_LOAD = 5; // s, load step instant of stream 2
const T_END_LOAD = 9; // s, end of stream 2

// ─── Demodulation constants ─────────────────────────────────────────────────

const ENV_HOP = 28; // envelope rate 5040/28 = 180 Hz
const LP_WIN = 76; // ~0.42 s envelope-follower smoothing
const PEDESTAL = 0.1; // healthy floor, below the 0.15 band edge
const DEMOD_GAIN = 3.6; // fault level ~0.42, mid band 1
const T_ARM = 2.5; // s, monitor armed after run-up
const REF_TO = 4.5; // s, healthy commissioning window [T_ARM, REF_TO)
const FRAME_SIZE = 64; // 64 envelope samples = 0.356 s per window

// ─── Diagnostic bank ────────────────────────────────────────────────────────

/** Causes and Gemm weights over the l2-normalized 5-d embedding
 *  [band1, 2 band2, 3 band3, |slope|, 0.2] (row-major [ENCODER_DIM][3]).
 *  The fault regime (band 1 only lit, ~[0.80, 0, 0, ~0, 0.60]) scores
 *  "broken_rotor_bar" with a wide margin; the load step (all bands
 *  saturated, ~[0.26, 0.52, 0.78, ~0, 0.15]) scores "load_change" and
 *  pushes "broken_rotor_bar" NEGATIVE: the differential value of the
 *  pushed model. */
const CAUSES = ["broken_rotor_bar", "load_change", "supply_unbalance"];
// prettier-ignore
const DIAG_W = [
    4, 0, 0,
    -4, 3, 0,
    0, 1, 0,
    0, 0, 2,
    0, 0, 0,
];
const DIAG_B = [0, 0, 0];

// ─── Physics: direct-on-line drive (induction-motor.test.ts pattern) ────────

interface InductionRun {
    /** Noisy sensed phase-a current at the solver rate. */
    ia: Float64Array;
    angularVelocity: Float64Array;
    node: InductionMotorDynamicNode;
}

function runDirectOnLine(seconds: number, seed: number, control: (node: InductionMotorDynamicNode, t: number) => number): InductionRun {
    const node = new InductionMotorDynamicNode();
    node.supplyFrequency = F_SUPPLY;
    node.reset(emptySession());
    const drv = bindDrivenInputs(node, ["phaseVoltageA", "phaseVoltageB", "phaseVoltageC", "loadTorque"]);
    const gauss = makeGaussian(seed);
    const n = Math.round(seconds / DT);
    const ia = new Float64Array(n);
    const angularVelocity = new Float64Array(n);
    const w = TWO_PI * F_SUPPLY;
    for (let k = 0; k < n; k++) {
        const t = k * DT;
        drv.set("phaseVoltageA", V_PEAK * Math.sin(w * t));
        drv.set("phaseVoltageB", V_PEAK * Math.sin(w * t - TWO_PI / 3));
        drv.set("phaseVoltageC", V_PEAK * Math.sin(w * t + TWO_PI / 3));
        drv.set("loadTorque", control(node, t));
        drv.arm();
        node.fire(drv.session, t);
        ia[k] = node.phaseCurrentA + NOISE_STD * gauss();
        angularVelocity[k] = node.angularVelocity;
    }
    return { ia, angularVelocity, node };
}

/** Envelope-sample index of solver time t (slidingRms output space). */
function envIndex(t: number): number {
    return Math.max(0, Math.floor((t / DT - SAMPLES_PER_PERIOD) / ENV_HOP) + 1);
}

function mean(x: Float64Array, from: number, to: number): number {
    let s = 0;
    for (let i = from; i < to; i++) s += x[i];
    return s / (to - from);
}

function meanSlip(run: InductionRun, fromT: number, toT: number): number {
    const omegaMean = mean(run.angularVelocity, Math.round(fromT / DT), Math.round(toT / DT));
    return (TWO_PI * F_SUPPLY - run.node.polePairs * omegaMean) / (TWO_PI * F_SUPPLY);
}

// ─── Precomputed streams (one sim each, reused across every assertion) ──────

interface Streams {
    /** Demodulated feed, healthy steady state then broken bars. */
    faultFeed: Float64Array;
    /** Index of the first faultFeed sample whose smoothing window
     *  touches post-flip data (everything before is pure healthy). */
    faultOnset: number;
    /** Demodulated feed, healthy steady state then a pure load step. */
    loadFeed: Float64Array;
    envRef: number;
    fault: InductionRun;
    load: InductionRun;
}

function buildStreams(): Streams {
    // Stream 1: ONE continuous run; brokenBarCount is flipped LIVE at
    // T_FAULT (editable, the motor keeps running through the change).
    const fault = runDirectOnLine(T_END_FAULT, 0x51ca1, (node, t) => {
        if (t >= T_FAULT && node.brokenBarCount === 0) {
            node.brokenBarCount = BROKEN_BARS;
            node.barFaultSeverity = BAR_SEVERITY;
        }
        return TAU_NOMINAL;
    });
    // Stream 2 (negative control): healthy motor, loadTorque raised.
    const load = runDirectOnLine(T_END_LOAD, 0x10ad, (_node, t) => (t < T_LOAD ? TAU_NOMINAL : TAU_STEP));

    const faultEnv = slidingRms(fault.ia, SAMPLES_PER_PERIOD, ENV_HOP);
    const loadEnv = slidingRms(load.ia, SAMPLES_PER_PERIOD, ENV_HOP);

    // Healthy commissioning baseline, measured once on the known-good
    // machine and shared by every later measurement (site constant).
    const envRef = mean(faultEnv, envIndex(T_ARM), envIndex(REF_TO));

    const demodulate = (env: Float64Array): Float64Array => {
        const rect = new Float64Array(env.length);
        for (let i = 0; i < env.length; i++) rect[i] = Math.abs(env[i] - envRef);
        const lp = slidingMean(rect, LP_WIN);
        const feed = new Float64Array(lp.length - envIndex(T_ARM));
        for (let i = 0; i < feed.length; i++) feed[i] = PEDESTAL + DEMOD_GAIN * lp[envIndex(T_ARM) + i];
        return feed;
    };

    return {
        faultFeed: demodulate(faultEnv),
        // lp[i] spans env[i .. i+LP_WIN): the last index untouched by
        // the flip is envIndex(T_FAULT) - LP_WIN.
        faultOnset: envIndex(T_FAULT) - LP_WIN - envIndex(T_ARM),
        loadFeed: demodulate(loadEnv),
        envRef,
        fault,
        load,
    };
}

// ─── The end-to-end scenario ────────────────────────────────────────────────

describe("motorwatch induction motor end-to-end (SP2, MCSA flagship)", () => {
    it("discovers a live broken-bar fault open-set, diagnoses it at runtime, federates the label, and tells it apart from a load step", () => {
        // (a) Physics sanity: the regimes are what the scenario claims.
        const s = buildStreams();
        expect(s.envRef).toBeGreaterThan(1.5); // healthy envelope ~1.84 A
        expect(s.envRef).toBeLessThan(2.2);

        // Healthy steady state is flat; broken bars modulate the
        // envelope at 2*s*f with the k/N-scale depth (~8 percent at
        // severity 2), exactly the MCSA signature being monitored.
        const env = slidingRms(s.fault.ia, SAMPLES_PER_PERIOD, ENV_HOP);
        const depthOver = (from: number, to: number): number => {
            let mn = Infinity;
            let mx = -Infinity;
            for (let i = envIndex(from); i < envIndex(to); i++) {
                mn = Math.min(mn, env[i]);
                mx = Math.max(mx, env[i]);
            }
            return (mx - mn) / 2 / s.envRef;
        };
        expect(depthOver(T_ARM, REF_TO)).toBeLessThan(0.01);
        expect(depthOver(7, T_END_FAULT)).toBeGreaterThan(0.04);
        expect(depthOver(7, T_END_FAULT)).toBeLessThan(0.15);

        const faultSlip = meanSlip(s.fault, 7, T_END_FAULT);
        expect(faultSlip).toBeGreaterThan(0.05);
        expect(faultSlip).toBeLessThan(0.15);
        expect(2 * faultSlip * F_SUPPLY).toBeGreaterThan(8); // f_mod ~10.6 Hz
        expect(2 * faultSlip * F_SUPPLY).toBeLessThan(13);
        const loadSlip = meanSlip(s.load, 7, T_END_LOAD);
        expect(loadSlip).toBeGreaterThan(faultSlip); // real load rise, no stall
        expect(loadSlip).toBeLessThan(0.2);

        // The demodulated levels land where the encoder wants them.
        expect(mean(s.faultFeed, 10, s.faultOnset)).toBeGreaterThan(0.09);
        expect(mean(s.faultFeed, 10, s.faultOnset)).toBeLessThan(0.12); // below the 0.15 band edge
        const faultTail = mean(s.faultFeed, s.faultFeed.length - 200, s.faultFeed.length);
        expect(faultTail).toBeGreaterThan(0.3); // mid band 1
        expect(faultTail).toBeLessThan(0.5);
        const loadTail = mean(s.loadFeed, s.loadFeed.length - 200, s.loadFeed.length);
        expect(loadTail).toBeGreaterThan(1.4); // saturates every band

        // (viscousFriction) Edge device + central station wired BEFORE the data flows.
        const device = new MotorwatchDevice({ frameSize: FRAME_SIZE, deviceId: "edge-induction", gate: { epsilon: 0.12 } });
        const encoderBytes = buildEncoderBytes(FRAME_SIZE);
        const encoderReport = device.loadEncoder(encoderBytes, { sha256: sha256Hex(encoderBytes), name: "induction-encoder.onnx" });
        expect(encoderReport.ok).toBe(true);
        expect(encoderReport.inputNames).toEqual(["current_window"]);

        const server = new InProcessDeviceServer(device);
        const station = new CentralStation("site-A");
        const diagBytes = buildDiagnosticBytes(ENCODER_DIM, CAUSES.length, DIAG_W, DIAG_B);
        station.registerDiagnostic("default", { bytes: diagBytes, sha256: sha256Hex(diagBytes), causes: CAUSES, name: "mcsa-diag.onnx" });
        station.connect(server);

        const alarms: IDeviceAlarm[] = [];
        device.onAlarm((alarm) => alarms.push(alarm));

        // (c) Healthy steady state: ONE profile, cold start, silent.
        device.feedSamples(s.faultFeed.subarray(0, s.faultOnset));
        expect(device.status().k).toBe(1);
        expect(device.status().windowsSeen).toBeGreaterThan(3);
        expect(alarms).toHaveLength(0);
        expect(station.history).toHaveLength(0);

        // (d) Broken bars appear LIVE: exactly ONE new regime.
        device.feedSamples(s.faultFeed.subarray(s.faultOnset), s.faultOnset);
        const afterFault = device.status();
        expect(afterFault.k).toBe(2);
        expect(afterFault.state).toBe("steady");
        expect(alarms).toHaveLength(1);
        expect(alarms[0].detail.k).toBe(2);
        expect(alarms[0].detail.distance).toBeGreaterThan(0.3); // truly open-set
        expect(alarms[0].detail.centroid).toHaveLength(ENCODER_DIM);

        // The alarm triggered the runtime push and the differential
        // diagnosis picked the broken bar over both alternatives.
        expect(station.history).toHaveLength(1);
        const brokenBar = station.history[0];
        expect(brokenBar.error).toBeUndefined();
        expect(brokenBar.fromCatalog).toBeUndefined();
        expect(brokenBar.diagnostic).toBeDefined();
        expect(brokenBar.diagnostic!.margin).toBeGreaterThan(station.labelMargin);
        expect(brokenBar.label).toBe("broken_rotor_bar");
        expect(brokenBar.diagnostic!.scores.broken_rotor_bar).toBeGreaterThan(brokenBar.diagnostic!.scores.load_change);
        expect(brokenBar.diagnostic!.scores.broken_rotor_bar).toBeGreaterThan(brokenBar.diagnostic!.scores.supply_unbalance);
        expect(device.status().diagnostic).toMatchObject({ loaded: true, name: "mcsa-diag.onnx", causes: CAUSES });

        // The label landed on BOTH sides: central catalog and device.
        expect(station.catalog.lookup(alarms[0].detail.centroid)!.label).toBe("broken_rotor_bar");
        expect(device.labelCount).toBe(1);
        expect(device.labelFor(alarms[0].detail.centroid)!.label).toBe("broken_rotor_bar");
        const current = server.callTool("regime_current") as IRegimeCurrentResult;
        expect(current.label).toBe("broken_rotor_bar");
        expect(current.k).toBe(2);

        // (e) Negative control: a pure load step on the HEALTHY motor
        // is a different regime with a different diagnosis.
        device.feedSamples(s.loadFeed, s.faultFeed.length);
        expect(device.status().k).toBe(3);
        expect(alarms).toHaveLength(2); // the healthy prefix re-matched silently
        expect(alarms[1].detail.k).toBe(3);
        expect(station.history).toHaveLength(2);
        const loadStep = station.history[1];
        expect(loadStep.label).toBe("load_change");
        expect(loadStep.label).not.toBe("broken_rotor_bar");
        expect(loadStep.diagnostic!.scores.load_change).toBeGreaterThan(loadStep.diagnostic!.scores.broken_rotor_bar);
        expect(loadStep.diagnostic!.scores.broken_rotor_bar).toBeLessThan(0); // anti-correlated, not just smaller
        expect((server.callTool("regime_current") as IRegimeCurrentResult).label).toBe("load_change");

        // (f) Federation: the broken-bar label survives the export ->
        // import -> merge path with counts summed across sites.
        expect(station.catalog.size).toBe(2);
        const exported = JSON.parse(JSON.stringify(station.catalog.export()));
        const reimported = RegimeCatalog.import(exported);
        expect(reimported.lookup(alarms[0].detail.centroid)!.label).toBe("broken_rotor_bar");

        const siteB = new RegimeCatalog("site-B");
        for (const entry of reimported.entries) {
            siteB.applyLabel(entry.centroid, entry.label, entry.diagnosis, "site-B");
        }
        const merged = mergeCatalogs([station.catalog, siteB]);
        expect(merged.size).toBe(2);
        const hit = merged.lookup(alarms[0].detail.centroid);
        expect(hit).not.toBeNull();
        expect(hit!.label).toBe("broken_rotor_bar");
        expect(hit!.entry.count).toBe(2); // counts summed across sites
        expect(hit!.entry.site).toBe("site-A,site-B");

        // A site-B device referencing the merged catalog resolves a
        // similar fault embedding locally, no diagnostic round needed.
        const deviceB = new MotorwatchDevice({ frameSize: FRAME_SIZE, deviceId: "edge-induction-viscousFriction" });
        for (const entry of merged.entries) {
            deviceB.applyLabel(entry.label, entry.centroid);
        }
        const similar = alarms[0].detail.centroid.map((v, i) => (i === 1 ? v + 0.04 : v));
        const resolved = deviceB.labelFor(similar);
        expect(resolved).not.toBeNull();
        expect(resolved!.label).toBe("broken_rotor_bar");
        expect(resolved!.distance).toBeLessThan(0.06);
    }, 60000);
});
