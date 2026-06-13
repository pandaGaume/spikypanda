/**
 * Regime-edge frame purity (the device.ts header invariant: "Frames
 * must never straddle a regime change").
 *
 * The steady-state gate INTENTIONALLY forwards up to breakHold - 1
 * post-step samples while its hysteresis confirms the break; that leak
 * is the gate's contract, asserted by packages/tests/dsp/
 * steadystate.test.ts and NOT changed here. The device must therefore
 * quarantine the gated tail: if a frame boundary lands on one of those
 * leaked samples, a mixed frame is emitted, encoded and clustered in
 * the SAME session.run, minting a PHANTOM regime and a spurious
 * NEW_REGIME alarm.
 *
 * Alignment arithmetic (gate defaults: settle 20, breakHold 3, hop =
 * frameSize), asserted below so a default drift cannot silently
 * invalidate the repro:
 *   - the settle-completing sample IS forwarded, so after N1 baseline
 *     samples the gate has forwarded N1 - settle + 1 of them;
 *   - the FIRST leaked post-step sample is gated token
 *     N1 - settle + 2; choosing N1 = 2 * frameSize + settle - 2 puts
 *     it EXACTLY on the second frame boundary;
 *   - the mixed frame (frameSize - 1 baseline samples + one 2.9
 *     sample) points far from both pure regimes in embedding space
 *     (the |slope| feature dominates), so without the quarantine the
 *     device mints k = 3 and raises TWO alarms for a two-regime feed.
 *
 * Levels are the induction-suite calibration (healthy ~0.10, fault
 * step 2.9) so the synthesized encoder separates the true regimes by
 * a wide margin.
 */
import { sha256Hex } from "spikypanda-plugin-onnx";
import { MotorwatchDevice } from "spikypanda-applications-motorwatch";
import type { IDeviceAlarm } from "spikypanda-applications-motorwatch";
import { buildEncoderBytes } from "./helpers";

const FRAME_SIZE = 16;
const SETTLE = 20;
const BREAK_HOLD = 3;
const BASELINE = 0.1;
const STEP = 2.9;

describe("motorwatch regime-edge frame purity", () => {
    it("never lets a gate hysteresis leak straddle a frame: no phantom regime, exactly one alarm", () => {
        const device = new MotorwatchDevice({ frameSize: FRAME_SIZE, deviceId: "edge-quarantine" });

        // The alignment below is computed from these defaults; fail
        // loudly if they drift instead of silently missing the edge.
        expect(device.captureProfile()).toEqual({ epsilon: 0.05, settle: SETTLE, breakHold: BREAK_HOLD, emaAlpha: 0.05 });

        const encoderBytes = buildEncoderBytes(FRAME_SIZE);
        expect(device.loadEncoder(encoderBytes, { sha256: sha256Hex(encoderBytes), name: "edge-encoder.onnx" }).ok).toBe(true);

        const alarms: IDeviceAlarm[] = [];
        device.onAlarm((alarm) => alarms.push(alarm));

        // Baseline prefix sized so the FIRST leaked post-step sample is
        // exactly the 2*frameSize-th gated token (second frame boundary).
        const N1 = 2 * FRAME_SIZE + SETTLE - 2;
        const baseline = new Array<number>(N1).fill(BASELINE);
        device.feedSamples(baseline);

        // Pure baseline regime: one cluster, cold-start silent.
        expect(device.status().k).toBe(1);
        expect(device.status().windowsSeen).toBe(1);
        expect(alarms).toHaveLength(0);

        // Large step: the gate forwards breakHold - 1 = 2 leaked samples
        // before closing; the first one lands ON the frame boundary.
        const tail = new Array<number>(160).fill(STEP);
        device.feedSamples(tail, N1);

        const status = device.status();
        expect(status.k).toBe(2); // baseline + step, NO phantom in-between
        expect(alarms).toHaveLength(1); // exactly one NEW_REGIME discovery
        expect(alarms[0].detail.k).toBe(2);
        expect(status.windowsSeen).toBeGreaterThanOrEqual(2);
    });
});
