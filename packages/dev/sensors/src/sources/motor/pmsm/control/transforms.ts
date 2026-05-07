// Stationary <-> rotor frame transformations used by FOC.
//
// Wrapped in a static class to avoid name collisions with other modules
// that may want to expose their own clarke / park / dq helpers (e.g. a
// signal-processing package, a different motor topology, ...).
//
// Convention: amplitude-invariant Clarke (a.k.a. Concordia in the
// proposal terminology). Under balanced three-phase inputs
// i_a = I·cos(theta), i_b = I·cos(theta - 2pi/3), i_c = I·cos(theta + 2pi/3),
// alpha component equals I·cos(theta) and beta equals I·sin(theta). This
// matches the proposal's MCSA conventions and is the dominant convention
// in the SVPWM / FOC literature targeted at MCU implementation.
//
// All methods are pure: no state, no allocation in the hot path beyond a
// small fixed-size tuple. The callers (FocController, sondes) wrap them.
export class ThreePhaseTransforms {
    private constructor() {
        throw new Error("ThreePhaseTransforms is a static helper, do not instantiate.");
    }

    // Clarke (abc -> alpha beta), amplitude-invariant.
    //
    //   alpha = (2/3) · (a - b/2 - c/2)
    //   beta  = (2/3) · (sqrt(3)/2) · (b - c)
    public static clarke(a: number, b: number, c: number): [number, number] {
        const alpha = (2 / 3) * (a - 0.5 * b - 0.5 * c);
        const beta = (2 / 3) * (0.5 * Math.sqrt(3)) * (b - c);
        return [alpha, beta];
    }

    // Inverse Clarke (alpha beta -> abc). Closes the round trip with clarke().
    //
    //   a = alpha
    //   b = -alpha/2 + sqrt(3)/2 · beta
    //   c = -alpha/2 - sqrt(3)/2 · beta
    public static inverseClarke(alpha: number, beta: number): [number, number, number] {
        const half = 0.5;
        const sqrt3Over2 = 0.5 * Math.sqrt(3);
        const a = alpha;
        const b = -half * alpha + sqrt3Over2 * beta;
        const c = -half * alpha - sqrt3Over2 * beta;
        return [a, b, c];
    }

    // Park (alpha beta -> dq). Aligns the d axis with the rotor flux at
    // angle theta_e (electrical angle, p · theta_m).
    //
    //   d =  alpha · cos(theta_e) + beta · sin(theta_e)
    //   q = -alpha · sin(theta_e) + beta · cos(theta_e)
    public static park(alpha: number, beta: number, thetaE: number): [number, number] {
        const c = Math.cos(thetaE);
        const s = Math.sin(thetaE);
        const d = alpha * c + beta * s;
        const q = -alpha * s + beta * c;
        return [d, q];
    }

    // Inverse Park (dq -> alpha beta).
    //
    //   alpha = d · cos(theta_e) - q · sin(theta_e)
    //   beta  = d · sin(theta_e) + q · cos(theta_e)
    public static inversePark(d: number, q: number, thetaE: number): [number, number] {
        const c = Math.cos(thetaE);
        const s = Math.sin(thetaE);
        const alpha = d * c - q * s;
        const beta = d * s + q * c;
        return [alpha, beta];
    }

    // Convenience: full abc -> dq pipeline. Used by FOC feedback path
    // (phase currents to rotor frame) and by the i_d / i_q probes.
    public static abcToDq(a: number, b: number, c: number, thetaE: number): [number, number] {
        const [alpha, beta] = ThreePhaseTransforms.clarke(a, b, c);
        return ThreePhaseTransforms.park(alpha, beta, thetaE);
    }

    // Convenience: full dq -> abc pipeline. Used by FOC to project the dq
    // voltage references to phase voltage references for the modulator.
    public static dqToAbc(d: number, q: number, thetaE: number): [number, number, number] {
        const [alpha, beta] = ThreePhaseTransforms.inversePark(d, q, thetaE);
        return ThreePhaseTransforms.inverseClarke(alpha, beta);
    }
}
