import { IMultiChannelSource } from "spikypanda-sensors/interfaces/MultiChannelRecorder";
import {
    pmsmEccentricityScenario,
    pmsmHealthyScenario,
    pmsmImbalanceScenario,
} from "spikypanda-sensors/sources/motor/pmsm/PmsmScenario";
import { PmsmSimulation } from "spikypanda-sensors/sources/motor/pmsm/PmsmSimulation";

// Drive the simulation forward by calling host.advance(t) at a fixed
// orchestration cadence, returning per-channel sample arrays for the
// requested channels and times.
function runScenario(src: IMultiChannelSource, durationS: number, dtS: number, channels: ReadonlyArray<string>):
    { times: number[]; series: Map<string, number[]> } {
    const series = new Map<string, number[]>();
    for (const k of channels) series.set(k, []);
    const times: number[] = [];
    const n = Math.floor(durationS / dtS);
    for (let i = 1; i <= n; i++) {
        const t = i * dtS;
        // Advance the host once per step. Every probe at this t reads the
        // same state thanks to host idempotence.
        (src.host as PmsmSimulation).advance(t);
        for (const k of channels) {
            const ch = src.channels.get(k);
            if (!ch) throw new Error(`unknown channel ${k}`);
            series.get(k)!.push(ch.source.signal(t));
        }
        times.push(t);
    }
    return { times, series };
}

function rms(xs: number[]): number {
    let s = 0;
    for (const x of xs) s += x * x;
    return Math.sqrt(s / Math.max(1, xs.length));
}

function mean(xs: number[]): number {
    let s = 0;
    for (const x of xs) s += x;
    return s / Math.max(1, xs.length);
}

function ptp(xs: number[]): number {
    return Math.max(...xs) - Math.min(...xs);
}

// Settle phase : let the FOC bring the machine to steady state before
// any signature analysis. ECX PRIME at 50 rps with 1e-6 kg.m^2 inertia
// and 1 kHz current loop : ~50-100 ms is enough.
const SETTLE_S = 0.2;
// Window for steady-state analysis (5 mechanical periods at 50 Hz = 100 ms).
const WINDOW_S = 0.1;
const ORCH_DT_S = 5e-5;             // 20 kHz

describe("PMSM scenarios end-to-end", () => {
    it("D0 healthy : reaches the speed target with low vibration on all axes", () => {
        const sc = pmsmHealthyScenario();
        const src = sc.factory();
        const { series } = runScenario(src, SETTLE_S + WINDOW_S, ORCH_DT_S, ["accel_x", "accel_y", "accel_z", "i_q"]);

        const sim = src.host as PmsmSimulation;
        const targetOmegaRps = sim.machine.cfg.nominalSpeedRps;
        const omegaActualRps = sim.machine.omegaM / (2 * Math.PI);
        expect(Math.abs(omegaActualRps - targetOmegaRps) / targetOmegaRps).toBeLessThan(0.02);

        // Steady-state window (drop the settle prefix).
        const skip = Math.floor(SETTLE_S / ORCH_DT_S);
        const ax = series.get("accel_x")!.slice(skip);
        const ay = series.get("accel_y")!.slice(skip);
        const az = series.get("accel_z")!.slice(skip);

        // No fault, no cogging, no switching : housing acceleration should
        // be at the numerical noise floor (well below 0.01 m/s^2).
        expect(rms(ax)).toBeLessThan(1e-6);
        expect(rms(ay)).toBeLessThan(1e-6);
        expect(rms(az)).toBeLessThan(1e-6);

        // i_q is essentially DC (small drive against viscous friction).
        const iq = series.get("i_q")!.slice(skip);
        expect(Math.abs(mean(iq))).toBeGreaterThan(0); // some torque required
        expect(ptp(iq) / Math.max(1e-12, Math.abs(mean(iq)))).toBeLessThan(0.05);
    });

    it("D1 imbalance : vibration RMS on y and z is non-zero and scales with severity", () => {
        const skip = Math.floor(SETTLE_S / ORCH_DT_S);

        const scMild = pmsmImbalanceScenario(0.3);
        const srcMild = scMild.factory();
        const out1 = runScenario(srcMild, SETTLE_S + WINDOW_S, ORCH_DT_S, ["accel_y", "accel_z"]);
        const ay1 = out1.series.get("accel_y")!.slice(skip);
        const az1 = out1.series.get("accel_z")!.slice(skip);
        const rmsYZ1 = Math.sqrt(rms(ay1) ** 2 + rms(az1) ** 2);

        const scHigh = pmsmImbalanceScenario(0.9);
        const srcHigh = scHigh.factory();
        const out2 = runScenario(srcHigh, SETTLE_S + WINDOW_S, ORCH_DT_S, ["accel_y", "accel_z"]);
        const ay2 = out2.series.get("accel_y")!.slice(skip);
        const az2 = out2.series.get("accel_z")!.slice(skip);
        const rmsYZ2 = Math.sqrt(rms(ay2) ** 2 + rms(az2) ** 2);

        // Vibration is non-zero at both severities.
        expect(rmsYZ1).toBeGreaterThan(1e-3);
        expect(rmsYZ2).toBeGreaterThan(1e-3);
        // The 0.9 severity has stronger vibration than 0.3 (force scales
        // linearly with severity, so RMS does too at fixed omega).
        expect(rmsYZ2 / rmsYZ1).toBeGreaterThan(2.0);
        expect(rmsYZ2 / rmsYZ1).toBeLessThan(4.5);  // ~3x with some bench tolerance
    });

    it("D1 imbalance : force is in radial plane (y, z) only, x (shaft axis) stays clean", () => {
        const sc = pmsmImbalanceScenario(0.8);
        const src = sc.factory();
        const skip = Math.floor(SETTLE_S / ORCH_DT_S);
        const out = runScenario(src, SETTLE_S + WINDOW_S, ORCH_DT_S, ["accel_x", "accel_y", "accel_z"]);
        const ax = out.series.get("accel_x")!.slice(skip);
        const ay = out.series.get("accel_y")!.slice(skip);
        const az = out.series.get("accel_z")!.slice(skip);
        // RMS on y and z is significant; x (shaft axis) stays at the noise floor.
        expect(rms(ay)).toBeGreaterThan(1e-3);
        expect(rms(az)).toBeGreaterThan(1e-3);
        expect(rms(ax)).toBeLessThan(1e-6);
    });

    it("D4 eccentricity : i_q develops AC content absent from the healthy baseline", () => {
        const skip = Math.floor(SETTLE_S / ORCH_DT_S);

        const scH = pmsmHealthyScenario();
        const srcH = scH.factory();
        const outH = runScenario(srcH, SETTLE_S + WINDOW_S, ORCH_DT_S, ["i_q"]);
        const iqH = outH.series.get("i_q")!.slice(skip);
        const acH = ptp(iqH);

        const scE = pmsmEccentricityScenario(0.6);
        const srcE = scE.factory();
        const outE = runScenario(srcE, SETTLE_S + WINDOW_S, ORCH_DT_S, ["i_q"]);
        const iqE = outE.series.get("i_q")!.slice(skip);
        const acE = ptp(iqE);

        // Eccentricity injects a 1x f_mech ripple in the flux, which the
        // current loop sees as a disturbance and tracks it. The peak-to-
        // peak of i_q under D4 must exceed the healthy baseline.
        expect(acE).toBeGreaterThan(5 * acH);
    });

    it("scenario factory rebuilds a fresh host on each call (clean transient)", () => {
        const sc = pmsmHealthyScenario();
        const a = sc.factory();
        const b = sc.factory();
        expect(a.host).not.toBe(b.host);
        // Channels are different instances too (probes are per-host).
        expect(a.channels.get("i_a")?.source).not.toBe(b.channels.get("i_a")?.source);
    });

    it("scenario meta records the speed target and load torque", () => {
        const sc = pmsmHealthyScenario();
        expect(sc.meta?.speedTargetRps).toBeDefined();
        expect(sc.meta?.loadTorque).toBeDefined();
    });
});
