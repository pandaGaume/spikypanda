/**
 * SP2 companion coverage: the motorwatch recipe is MOTOR-AGNOSTIC. A
 * 3-phase PMSM (sinusoidal back-EMF) running open-loop at synchronous
 * speed takes a load-torque step; the same envelope-feed approach
 * (sliding RMS of one phase current over one electrical period) drives
 * the same MotorwatchDevice, which discovers the second regime open-set
 * (k == 2, exactly one alarm) and the central loop labels it through a
 * runtime-pushed 3-cause diagnostic model. Deliberately compact: the
 * induction suite is the flagship.
 *
 * Harness choices (documented):
 *   - Same voltage-drive harness as the induction suite
 *     (induction-motor.test.ts pattern via bindDrivenInputs).
 *   - The PMSM starts AT synchronism (omega0 = omega_sync): a
 *     synchronous machine has no asynchronous starting torque; real
 *     drives ramp the frequency, the test starts locked.
 *   - R = 2.0 (vs the 0.5 default): open-loop V/f operation of a
 *     low-inertia PMSM is marginally stable; raising the stator
 *     resistance damps the rotor swing mode (classic V/f stability
 *     result). With R = 0.5 the tau step makes the rotor hunt and slip
 *     poles; with R = 2.0 both regimes are locked and stationary.
 *   - The fault channel is purely ELECTRICAL: speed returns to exactly
 *     omega_sync after the step (synchronous machine), only the load
 *     angle and the current amplitude change: monitoring the current
 *     envelope is what reveals the regime, a speed sensor would see
 *     nothing.
 *   - SENSOR_GAIN = 0.21 calibrates the two envelope levels (2.10 A and
 *     3.08 A RMS) onto the encoder's level bands: regime 1 ~0.44 (band
 *     1 active), regime 2 ~0.65 (band 1 saturated + band 2 active),
 *     ~0.20 cosine distance apart, far above the 0.05 assign threshold.
 *   - COLD-START SEMANTIC: regime 1 (k == 1) is the silent baseline,
 *     the load step alarms exactly once.
 */
import { PmsmMotorDynamicNode } from "spikypanda-plugin-physics";
import { sha256Hex } from "spikypanda-plugin-onnx";
import { CentralStation, InProcessDeviceServer, MotorwatchDevice } from "spikypanda-applications-motorwatch";
import type { IDeviceAlarm, IRegimeCurrentResult } from "spikypanda-applications-motorwatch";
import { ENCODER_DIM, bindDrivenInputs, buildDiagnosticBytes, buildEncoderBytes, emptySession, makeGaussian, slidingRms } from "./helpers";

// ─── Simulation constants ───────────────────────────────────────────────────

const TWO_PI = 2 * Math.PI;
const F_ELEC = 100; // Hz electrical supply
const DT = 5e-5; // 20 kHz solver (L/R = 1 ms at R = 2.0)
const SAMPLES_PER_PERIOD = 200; // exact electrical period
const V_PEAK = 36; // V phase peak (back-EMF at sync is 31.4 V)
const R_STATOR = 2.0; // swing-mode damping, see header
const TAU_NOMINAL = 0.05; // Nm
const TAU_STEP = 1.0; // Nm (1.5 would lose synchronism)
const T_STEP = 1.4; // s
const T_END = 3.0; // s
const NOISE_STD = 0.003; // 3 mA sensor noise, deterministic seed

const ENV_HOP = 50; // envelope rate 400 Hz
const SENSOR_GAIN = 0.21; // levels ~0.44 / ~0.65 on the encoder bands
const FRAME_SIZE = 64; // 0.16 s per window

/** Causes and Gemm weights over the l2-normalized 5-d embedding
 *  (row-major [ENCODER_DIM][3]): the load-step regime lights band 2
 *  (~[0.70, 0.59, 0, 0, 0.40] normalized), so "load_step" wins with a
 *  wide margin while "supply_sag" goes negative. */
const CAUSES = ["load_step", "magnet_demag", "supply_sag"];
// prettier-ignore
const DIAG_W = [
    0, 0, -2,
    3, 0, 0,
    0, 0, 0,
    0, 2, 0,
    0, 0, 0,
];
const DIAG_B = [0, 0, 0];

// ─── Physics: open-loop synchronous drive ───────────────────────────────────

interface PmsmRun {
    ia: Float64Array;
    omega: Float64Array;
    omegaSync: number;
}

function runPmsm(): PmsmRun {
    const node = new PmsmMotorDynamicNode();
    node.R = R_STATOR;
    const omegaSync = (TWO_PI * F_ELEC) / node.P;
    node.omega0 = omegaSync;
    node.reset(emptySession());
    const drv = bindDrivenInputs(node, ["V_a", "V_b", "V_c", "tau_load"]);
    const gauss = makeGaussian(0x9035);
    const n = Math.round(T_END / DT);
    const ia = new Float64Array(n);
    const omega = new Float64Array(n);
    const w = TWO_PI * F_ELEC;
    for (let k = 0; k < n; k++) {
        const t = k * DT;
        drv.set("V_a", V_PEAK * Math.sin(w * t));
        drv.set("V_b", V_PEAK * Math.sin(w * t - TWO_PI / 3));
        drv.set("V_c", V_PEAK * Math.sin(w * t + TWO_PI / 3));
        drv.set("tau_load", t < T_STEP ? TAU_NOMINAL : TAU_STEP);
        drv.arm();
        node.fire(drv.session, t);
        ia[k] = node.i_a + NOISE_STD * gauss();
        omega[k] = node.omega;
    }
    return { ia, omega, omegaSync };
}

function envIndex(t: number): number {
    return Math.max(0, Math.floor((t / DT - SAMPLES_PER_PERIOD) / ENV_HOP) + 1);
}

// ─── The scenario ───────────────────────────────────────────────────────────

describe("motorwatch PMSM end-to-end (SP2, motor-agnostic recipe)", () => {
    it("discovers the load-step regime open-set on a brushless machine and labels it through the central loop", () => {
        // (a) Physics sanity: locked at synchronism through BOTH
        // regimes (the signature is electrical, not mechanical).
        const run = runPmsm();
        const lockedWithin = (fromT: number, toT: number): number => {
            let worst = 0;
            for (let k = Math.round(fromT / DT); k < Math.round(toT / DT); k++) {
                worst = Math.max(worst, Math.abs(run.omega[k] - run.omegaSync));
            }
            return worst;
        };
        expect(lockedWithin(1.0, T_STEP)).toBeLessThan(1);
        expect(lockedWithin(2.5, T_END)).toBeLessThan(1);

        // The calibrated envelope levels sit on distinct encoder bands.
        const feed = slidingRms(run.ia, SAMPLES_PER_PERIOD, ENV_HOP).map((v) => SENSOR_GAIN * v);
        expect(feed[envIndex(1.0)]).toBeGreaterThan(0.3);
        expect(feed[envIndex(1.0)]).toBeLessThan(0.5); // band 1 active
        expect(feed[envIndex(2.5)]).toBeGreaterThan(0.55); // band 2 active
        expect(feed[envIndex(2.5)]).toBeLessThan(0.85);

        // (b) Same device recipe as the induction flagship.
        const device = new MotorwatchDevice({ frameSize: FRAME_SIZE, deviceId: "edge-pmsm" });
        const encoderBytes = buildEncoderBytes(FRAME_SIZE);
        expect(device.loadEncoder(encoderBytes, { sha256: sha256Hex(encoderBytes), name: "pmsm-encoder.onnx" }).ok).toBe(true);

        const server = new InProcessDeviceServer(device);
        const station = new CentralStation("site-A");
        const diagBytes = buildDiagnosticBytes(ENCODER_DIM, CAUSES.length, DIAG_W, DIAG_B);
        station.registerDiagnostic("default", { bytes: diagBytes, sha256: sha256Hex(diagBytes), causes: CAUSES, name: "pmsm-diag.onnx" });
        station.connect(server);

        const alarms: IDeviceAlarm[] = [];
        device.onAlarm((alarm) => alarms.push(alarm));

        // (c) Nominal regime: silent cold-start baseline.
        const split = envIndex(T_STEP);
        device.feedSamples(feed.subarray(0, split));
        expect(device.status().k).toBe(1);
        expect(alarms).toHaveLength(0);

        // (d) Load step: open-set discovery, k == 2, ONE alarm.
        device.feedSamples(feed.subarray(split), split);
        const status = device.status();
        expect(status.k).toBe(2);
        expect(status.state).toBe("steady");
        expect(status.windowsSeen).toBeGreaterThan(10);
        expect(alarms).toHaveLength(1);
        expect(alarms[0].detail.k).toBe(2);
        expect(alarms[0].detail.distance).toBeGreaterThan(0.1);

        // (e) Central loop: runtime push, diagnosis, label on both sides.
        expect(station.history).toHaveLength(1);
        const handled = station.history[0];
        expect(handled.error).toBeUndefined();
        expect(handled.diagnostic).toBeDefined();
        expect(handled.diagnostic!.margin).toBeGreaterThan(station.labelMargin);
        expect(handled.label).toBe("load_step");
        expect(handled.diagnostic!.scores.load_step).toBeGreaterThan(handled.diagnostic!.scores.magnet_demag);
        expect(handled.diagnostic!.scores.supply_sag).toBeLessThan(0);

        expect(station.catalog.lookup(alarms[0].detail.centroid)!.label).toBe("load_step");
        expect(device.labelCount).toBe(1);
        expect(device.labelFor(alarms[0].detail.centroid)!.label).toBe("load_step");
        const current = server.callTool("regime_current") as IRegimeCurrentResult;
        expect(current.label).toBe("load_step");
        expect(current.k).toBe(2);
    }, 30000);
});
