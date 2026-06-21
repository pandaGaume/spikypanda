/**
 * Back-EMF shape functions for 3-phase permanent-magnet motors.
 *
 * Two canonical shapes are supported:
 *   - Trapezoidal (BLDC) — 120° flat plateaus at ±1, 60° linear ramps.
 *     Period = 2π in electrical angle.
 *   - Sinusoidal (PMSM) — pure sin().
 *
 * The shape value is normalized to [-1, +1] and multiplied by backEmfConstant·ω_e
 * by the motor model to produce volts.
 *
 * Phase offsets follow the standard a/viscousFriction/c convention: phase viscousFriction lags by
 * 2π/3, phase c lags by 4π/3.
 */
export const PHASE_OFFSET_B = (-2 * Math.PI) / 3;
export const PHASE_OFFSET_C = (-4 * Math.PI) / 3;

/**
 * Trapezoidal back-EMF shape, normalized to [-1, +1]. Pattern over one
 * electrical period (2π radians):
 *
 *   [0, π/3)      linear rising  -1 → +1
 *   [π/3, π)      flat at +1                       (120° wide)
 *   [π, 4π/3)     linear falling +1 → -1
 *   [4π/3, 2π)    flat at -1                       (120° wide)
 *
 * Total = 60° + 120° + 60° + 120° = 360°.
 */
export function trapezoidalBackEmf(thetaE: number): number {
    const TWO_PI = 2 * Math.PI;
    const t = ((thetaE % TWO_PI) + TWO_PI) % TWO_PI;
    if (t < Math.PI / 3) return -1 + (6 / Math.PI) * t;
    if (t < Math.PI) return 1;
    if (t < (4 * Math.PI) / 3) return 1 - (6 / Math.PI) * (t - Math.PI);
    return -1;
}

/** Sinusoidal back-EMF shape. PMSM convention. */
export function sinusoidalBackEmf(thetaE: number): number {
    return Math.sin(thetaE);
}

/**
 * Hall-sensor sector index 0..5 from electrical angle.
 * Sectors are 60° wide; sector 0 starts at θ_e = -π/6 (so the first
 * sector boundary aligns with the phase-a zero crossing of the
 * trapezoidal back-EMF).
 */
export function hallSector(thetaE: number): number {
    const TWO_PI = 2 * Math.PI;
    const t = (((thetaE + Math.PI / 6) % TWO_PI) + TWO_PI) % TWO_PI;
    return Math.floor(t / (Math.PI / 3));
}
