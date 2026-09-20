/**
 * Window statistics for the summary step. Pure functions over uniformly
 * sampled arrays; the only physics here is the lock-in.
 *
 * Lock-in (synchronous) detection at a known frequency f: multiply the
 * signal by cos(2*pi*f*t) and sin(2*pi*f*t), average over the window, and
 * read back the amplitude of the component exactly at f. It is a single-bin
 * FFT, immune to off-band noise. The factor 2 recovers the peak amplitude of
 * a real sinusoid, since the projection of A*cos(wt+phi) averages to A/2.
 * For a clean read the window should span an integer number of cycles;
 * partial cycles bias the estimate by O(1/Ncycles). The gravity-signature
 * study reads the 1x component this way, with f the shaft frequency taken
 * from the motor's own angular velocity, which is exact.
 */

export function mean(samples: ArrayLike<number>): number {
    const n = samples.length;
    if (n === 0) return 0;
    let acc = 0;
    for (let k = 0; k < n; k++) acc += samples[k];
    return acc / n;
}

export function min(samples: ArrayLike<number>): number {
    let m = Number.POSITIVE_INFINITY;
    for (let k = 0; k < samples.length; k++) if (samples[k] < m) m = samples[k];
    return samples.length === 0 ? Number.NaN : m;
}

export function max(samples: ArrayLike<number>): number {
    let m = Number.NEGATIVE_INFINITY;
    for (let k = 0; k < samples.length; k++) if (samples[k] > m) m = samples[k];
    return samples.length === 0 ? Number.NaN : m;
}

export function rms(samples: ArrayLike<number>): number {
    const n = samples.length;
    if (n === 0) return 0;
    let acc = 0;
    for (let k = 0; k < n; k++) acc += samples[k] * samples[k];
    return Math.sqrt(acc / n);
}

export interface LockInResult {
    /** Peak amplitude of the component at f, in the unit of the samples. */
    readonly amplitude: number;
    /** Phase in radians, atan2(Q, I). */
    readonly phase: number;
}

/** Amplitude and phase of the component at `frequencyHz`; `samples[k]` is taken at `t0 + k*dt`. */
export function lockIn(samples: ArrayLike<number>, dt: number, frequencyHz: number, t0 = 0): LockInResult {
    const n = samples.length;
    if (n === 0 || dt <= 0) return { amplitude: 0, phase: 0 };
    const w = 2 * Math.PI * frequencyHz;
    let i = 0;
    let q = 0;
    for (let k = 0; k < n; k++) {
        const t = t0 + k * dt;
        i += samples[k] * Math.cos(w * t);
        q += samples[k] * Math.sin(w * t);
    }
    i /= n;
    q /= n;
    return { amplitude: 2 * Math.sqrt(i * i + q * q), phase: Math.atan2(q, i) };
}

/** The signal with its window mean removed, so the lock-in reads the oscillation, not the DC offset. */
export function detrend(samples: ArrayLike<number>): Float64Array {
    const m = mean(samples);
    const out = new Float64Array(samples.length);
    for (let k = 0; k < samples.length; k++) out[k] = samples[k] - m;
    return out;
}
