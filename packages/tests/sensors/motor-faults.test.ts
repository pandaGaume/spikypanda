import {
    DEFAULT_MOTOR,
    MotorCurrentSource,
    MotorFaultSource,
    MotorFaultType,
    contiguousBrokenBars,
    evenlyDistributedBrokenBars,
    makeMotorFault,
} from "spikypanda-sensors";

function naiveDft(samples: Float32Array, fs: number, freq: number): number {
    const N = samples.length;
    let re = 0;
    let im = 0;
    const w = -2 * Math.PI * freq / fs;
    for (let n = 0; n < N; n++) {
        re += samples[n] * Math.cos(w * n);
        im += samples[n] * Math.sin(w * n);
    }
    return Math.sqrt(re * re + im * im) / N;
}

function captureWindow(source: { signal: (t: number) => number }, fs: number, durationS: number): Float32Array {
    const n = Math.floor(durationS * fs);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        out[i] = source.signal(i / fs);
    }
    return out;
}

const slowMotorCfg = { ...DEFAULT_MOTOR, motorSpeedRps: 30 };
function newSlowMotor() { return new MotorCurrentSource(slowMotorCfg); }

describe("MotorFaultSource: angular spatial model for broken bars", () => {
    it("3 contiguous bars excite low-order angular harmonics (k = 1) strongly", () => {
        const fault = new MotorFaultSource(
            makeMotorFault({
                type: MotorFaultType.BROKEN_BAR,
                severity: 1.0,
                totalBars: 12,
                brokenIndices: contiguousBrokenBars(12, 3),
            }),
            newSlowMotor(),
        );
        const fs = 4000;
        const buf = captureWindow(fault, fs, 4.0);
        const fMech = slowMotorCfg.motorSpeedRps;

        // k = 1 should dominate for a contiguous group; k = 4 should be near zero.
        const e1 = naiveDft(buf, fs, fMech);
        const e2 = naiveDft(buf, fs, 2 * fMech);
        const e3 = naiveDft(buf, fs, 3 * fMech);
        const e4 = naiveDft(buf, fs, 4 * fMech);
        expect(e1).toBeGreaterThan(e3);
        expect(e1).toBeGreaterThan(e4 * 5);
        // k = 2 still has energy but less than k = 1.
        expect(e1).toBeGreaterThan(e2 * 0.9);
    });

    it("3 evenly distributed bars in 12 cancel low orders, energize k = 3", () => {
        const fault = new MotorFaultSource(
            makeMotorFault({
                type: MotorFaultType.BROKEN_BAR,
                severity: 1.0,
                totalBars: 12,
                brokenIndices: evenlyDistributedBrokenBars(12, 3),
            }),
            newSlowMotor(),
        );
        const fs = 4000;
        const buf = captureWindow(fault, fs, 4.0);
        const fMech = slowMotorCfg.motorSpeedRps;

        const e1 = naiveDft(buf, fs, fMech);
        const e2 = naiveDft(buf, fs, 2 * fMech);
        const e3 = naiveDft(buf, fs, 3 * fMech);
        // k = 3 dominates by a wide margin; k = 1 and k = 2 are essentially noise.
        expect(e3).toBeGreaterThan(e1 * 50);
        expect(e3).toBeGreaterThan(e2 * 50);
    });

    it("predictPeaks lists k * f_mech for orders that have non-zero spatial Fourier amplitude", () => {
        const fault = new MotorFaultSource(
            makeMotorFault({
                type: MotorFaultType.BROKEN_BAR,
                severity: 0.5,
                totalBars: 12,
                brokenIndices: evenlyDistributedBrokenBars(12, 3),
            }),
            newSlowMotor(),
        );
        const peaks = fault.meta().expectedSpectralPeaks ?? [];
        // Expect the 3rd order peak; the 1st and 2nd should not appear.
        expect(peaks).toContain(3 * slowMotorCfg.motorSpeedRps);
        expect(peaks).not.toContain(1 * slowMotorCfg.motorSpeedRps);
        expect(peaks).not.toContain(2 * slowMotorCfg.motorSpeedRps);
    });
});

describe("MotorFaultSource: other fault types in the angular model", () => {
    it("misalignment puts energy at f_mech and 2*f_mech", () => {
        const fault = new MotorFaultSource(
            makeMotorFault({ type: MotorFaultType.MISALIGNMENT, severity: 1.0 }),
            newSlowMotor(),
        );
        const fs = 2000;
        const buf = captureWindow(fault, fs, 4.0);
        const fMech = slowMotorCfg.motorSpeedRps;
        expect(naiveDft(buf, fs, fMech)).toBeGreaterThan(5 * naiveDft(buf, fs, fMech + 5));
        expect(naiveDft(buf, fs, 2 * fMech)).toBeGreaterThan(5 * naiveDft(buf, fs, 2 * fMech + 5));
    });

    it("brush_fault produces sidebands at fComm ± fMech (AM modulation, not energy at fComm itself)", () => {
        // slowMotorCfg: motorSpeedRps=30, commutatorBars=12
        // fComm = 12*30 = 360 Hz
        // Expected sidebands (k=1): 330 Hz and 390 Hz
        // Reference (no fault energy): 285 Hz (not a multiple of 30, not a sideband)
        const fault = new MotorFaultSource(
            makeMotorFault({ type: MotorFaultType.BRUSH_FAULT, severity: 1.0 }),
            newSlowMotor(),
        );
        const fs = 4000;
        const buf = captureWindow(fault, fs, 4.0);
        const fMech = slowMotorCfg.motorSpeedRps;
        const bars = slowMotorCfg.commutatorBars;
        const fComm = bars * fMech;

        const eSideUp   = naiveDft(buf, fs, fComm + fMech);        // 390 Hz  (k=1 upper)
        const eSideDown = naiveDft(buf, fs, fComm - fMech);        // 330 Hz  (k=1 lower)
        // Quiet reference: not a multiple of fMech, not a sideband.
        const eBaseline = naiveDft(buf, fs, fComm - 2.5 * fMech);  // 285 Hz
        expect(eSideUp).toBeGreaterThan(10 * eBaseline);
        expect(eSideDown).toBeGreaterThan(10 * eBaseline);

        // Sidebands must dominate over the carrier frequency itself: the
        // healthy motor already supplies fComm energy, the fault should not
        // pile more onto fComm but should be clearly visible at the sidebands.
        const eCarrier = naiveDft(buf, fs, fComm);                 // 360 Hz
        // Both sidebands together should carry at least as much energy as the
        // carrier; exact ratio depends on motor ripple, so a soft check.
        expect(eSideUp + eSideDown).toBeGreaterThan(eCarrier * 0.5);
    });

    it("eccentricity puts energy at 1x mechanical rotation", () => {
        const fault = new MotorFaultSource(
            makeMotorFault({ type: MotorFaultType.ECCENTRICITY, severity: 1.0 }),
            newSlowMotor(),
        );
        const fs = 2000;
        const buf = captureWindow(fault, fs, 4.0);
        const fMech = slowMotorCfg.motorSpeedRps;
        expect(naiveDft(buf, fs, fMech)).toBeGreaterThan(10 * naiveDft(buf, fs, fMech + 10));
    });
});
