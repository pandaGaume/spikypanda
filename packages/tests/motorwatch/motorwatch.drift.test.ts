/**
 * Boiling-frog drift, device level (the load-torque RAMP blind spot).
 *
 * A current envelope that RAMPS slowly from 0.3 A to 1.4 A: every
 * per-window embedding step stays far under the clusterer's update_thr
 * (verified by the "no NEW_REGIME" assertion below: had any step
 * escaped the EMA, the open set would have minted a profile), so the
 * per-profile centroid silently follows the wear. The OLD behavior was
 * total silence: k stays 1, zero alarms, while the machine walks out of
 * its baseline. With the cluster anchors (drift_thr default 0.1) the
 * device must instead emit a REGIME_DRIFT staircase, reaching BOTH the
 * onAlarm subscribers and the protocol notification stream, with the
 * NEW_REGIME cold-start suppression untouched.
 *
 * Harness choices (documented, r385 e2e style):
 *   - synthetic envelope feed: the encoder's saturating level bands
 *     (helpers.ts) turn the rising level into a slowly ROTATING
 *     embedding direction, which is the exact geometry of wear;
 *   - per-window delta ~1.8 mA (1.1 A over ~620 windows of 16): small
 *     enough that the EMA lag distance stays well under update_thr
 *     (empirically pinned by k == 1 + zero NEW_REGIME);
 *   - deterministic Gaussian sensor noise (sigma 3 mA), same as the
 *     r385 suite, so the gate sees a realistic but steady signal (the
 *     ramp slope is ~30x below the gate's epsilon band).
 */
import { sha256Hex } from "spikypanda-plugin-onnx";
import { InProcessDeviceServer, MotorwatchDevice } from "spikypanda-applications-motorwatch";
import type { IDeviceAlarm, McpNotification } from "spikypanda-applications-motorwatch";
import { ENCODER_DIM, buildEncoderBytes, makeGaussian } from "./helpers";

const FRAME_SIZE = 16;
const WINDOWS = 620;
const SAMPLES = FRAME_SIZE * WINDOWS;
const LEVEL_START = 0.3;
const LEVEL_END = 1.4;
const NOISE_STD = 0.003;

/** The wire literal type still says "NEW_REGIME" (protocol/mcp.ts is
 *  the wire owner; widening it is a protocol follow-up), so the code is
 *  compared as a plain string. */
function codeOf(alarm: IDeviceAlarm): string {
    return alarm.code as string;
}

describe("motorwatch slow-drift ramp (boiling frog)", () => {
    it("a slow ramp raises a REGIME_DRIFT staircase on device alarms AND notifications, with zero NEW_REGIME", () => {
        const device = new MotorwatchDevice({ frameSize: FRAME_SIZE, deviceId: "edge-drift" });
        const encoderBytes = buildEncoderBytes(FRAME_SIZE);
        expect(device.loadEncoder(encoderBytes, { sha256: sha256Hex(encoderBytes), name: "drift-encoder.onnx" }).ok).toBe(true);

        // Both alarm paths observed: the facade subscribers and the
        // protocol notification stream of the in-process server.
        const server = new InProcessDeviceServer(device);
        const alarms: IDeviceAlarm[] = [];
        device.onAlarm((alarm) => alarms.push(alarm));
        const notified: McpNotification[] = [];
        server.subscribe((n) => notified.push(n));

        // Slowly ramping envelope: wear, not a regime change.
        const gauss = makeGaussian(0xd217f);
        const samples = Array.from({ length: SAMPLES }, (_, i) => LEVEL_START + ((LEVEL_END - LEVEL_START) * i) / (SAMPLES - 1) + NOISE_STD * gauss());
        device.feedSamples(samples);

        const status = device.status();
        expect(status.state).toBe("steady"); // the ramp never trips the gate
        expect(status.windowsSeen).toBeGreaterThan(500);

        // The boiling frog half: the open set NEVER fires. k stays 1
        // (every step was EMA-absorbed) and the cold-start suppression
        // keeps profile 0 silent, so NOT ONE NEW_REGIME device alarm.
        expect(status.k).toBe(1);
        expect(alarms.filter((a) => codeOf(a) === "NEW_REGIME")).toHaveLength(0);

        // The fix half: the anchor saw the centroid walk away and the
        // staircase reached the subscribers, never suppressed.
        const drifts = alarms.filter((a) => codeOf(a) === "REGIME_DRIFT");
        expect(drifts.length).toBeGreaterThanOrEqual(1);
        expect(drifts.map((a) => (a.detail as { driftSteps?: number }).driftSteps)).toEqual(drifts.map((_, i) => i + 1));
        for (const a of drifts) {
            expect(a.severity).toBe("warn");
            expect(a.detail.label).toBe(0); // the (deranged) baseline profile
            expect(a.detail.k).toBe(1);
            expect(a.detail.distance).toBeGreaterThan(0.1); // one anchor stair
            expect(a.detail.centroid).toHaveLength(ENCODER_DIM); // wire-ready, like NEW_REGIME
        }
        expect(status.alarmsRaised).toBe(drifts.length);

        // ...and the protocol notification stream carries the same
        // staircase with its own code (server pass-through is 1:1).
        const wireDrifts = notified.filter((n) => n.method === "alarm" && (n.params.code as string) === "REGIME_DRIFT");
        expect(wireDrifts).toHaveLength(drifts.length);
        expect(notified.filter((n) => n.method === "alarm" && (n.params.code as string) === "NEW_REGIME")).toHaveLength(0);
    });
});
