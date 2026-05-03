// Cached 2π. Hot loops in the source generators evaluate sin(2π f t) on
// every sample, so binding the constant once avoids a multiplication per
// term per sample.
export const TWO_PI = 2.0 * Math.PI;

export function clamp(x: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, x));
}

// Clamp to [0, 1]. Used wherever a "severity" or "fraction" value needs to
// be bounded before being multiplied into an amplitude.
export function clamp01(x: number): number {
    return clamp(x, 0.0, 1.0);
}
