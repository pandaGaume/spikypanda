/**
 * Fitting a measured window against the model's lines.
 *
 * The protocol of V1-B fits ten parameters and never the composition
 * (`internals/libs/08-V1B-PROTOCOL.md` section 4). Four of them are
 * local to a stretch of spectrum, and those are what this fits: the
 * wavelength offset, the instrumental width, one amplitude and a flat
 * continuum. The six that are global, the temperature, the electron
 * density, the collisional coefficient and the two linear trends in
 * offset and width, are estimated from how these four come out across
 * many windows, which also TESTS the linear trend instead of assuming
 * it.
 *
 * Two of the four are linear and two are not, and the method follows
 * that split rather than throwing all four at an optimiser. For a given
 * offset and width the model is
 *
 *     measured = scale * profile + continuum
 *
 * which is a two-parameter linear least squares with an exact solution,
 * so only the offset and the width are ever searched. That is both
 * faster and far more robust: an optimiser wandering in four dimensions
 * can trade amplitude against width and settle anywhere, while here the
 * amplitude is never free to be wrong.
 *
 * The profile itself is not reimplemented. `accumulateLines` is the
 * same function the forward model renders with, so a fitted window and
 * a simulated one differ in their parameters and in nothing else.
 */

import { accumulateLines } from "./engine.js";
import type { ILineEmission } from "./engine.js";

export interface IWindowFitResult {
    /** Wavelength offset applied to the model's lines [nm]: positive
     *  means the measurement sits above the catalogue. */
    readonly offsetNm: number;
    /** Instrumental Gaussian FWHM, folded in on top of each line's own
     *  Doppler width [nm]. */
    readonly instrumentalFwhmNm: number;
    /** Amplitude the window needed, in measured units per model unit. */
    readonly scale: number;
    /** Flat continuum under the window, in measured units. */
    readonly continuum: number;
    /** Root mean square residual, in measured units. */
    readonly rmsResidual: number;
    /** That residual as a share of the window's strongest measured
     *  point above the fitted continuum, which is the form the
     *  protocol's M5 states its tolerance in. */
    readonly residualShareOfPeak: number;
    /** Widest single residual, as the same share. */
    readonly worstResidualShare: number;
    readonly pointCount: number;
    readonly lineCount: number;
    readonly blocker: string | null;
}

export interface IWindowFitOptions {
    /** Widest offset to consider either way [nm]. */
    readonly maxOffsetNm?: number;
    /** Range of instrumental width to consider [nm]. */
    readonly fwhmRangeNm?: readonly [number, number];
    /** Lorentz FWHM to fold in, the collisional width of the plasma
     *  [nm]. Held fixed here: it is one of the global parameters, and a
     *  single window cannot separate it from the instrumental width. */
    readonly collisionalFwhmNm?: number;
    /**
     * Steps per axis in the coarse pass. Two refinements follow, each
     * narrowing the bracket by half the step count, so with the default
     * sixteen steps and a 0.3 nm offset bracket the three passes reach
     * 37.5 pm, then 4.7 pm, then **0.59 pm**: thirty times finer than
     * the 20 pm grid a real measurement samples on, and a thirtieth of
     * the tolerance the protocol's M1 states.
     */
    readonly stepsPerAxis?: number;
}

/** Solve `measured ~ scale * profile + continuum` exactly. */
function linearPart(measured: ArrayLike<number>, profile: ArrayLike<number>): { scale: number; continuum: number } | null {
    const n = measured.length;
    let sp = 0;
    let sy = 0;
    let spp = 0;
    let spy = 0;
    for (let i = 0; i < n; i++) {
        sp += profile[i];
        sy += measured[i];
        spp += profile[i] * profile[i];
        spy += profile[i] * measured[i];
    }
    const determinant = n * spp - sp * sp;
    // A flat profile carries no information about the amplitude: the
    // window has no line in it, or the width has smeared it into the
    // continuum. Either way there is nothing to solve.
    if (!(Math.abs(determinant) > 0)) return null;
    return { scale: (n * spy - sp * sy) / determinant, continuum: (spp * sy - sp * spy) / determinant };
}

/**
 * Fit one window.
 *
 * `grid` and `measured` are the window as the instrument reports it,
 * and `lines` are the model's emissions inside it, with the amplitudes
 * the forward model gave them: the fit scales them together and never
 * line by line, because their relative amplitudes are the physics being
 * tested.
 */
export function fitWindow(grid: Float64Array, measured: ArrayLike<number>, lines: ReadonlyArray<ILineEmission>, options: IWindowFitOptions = {}): IWindowFitResult {
    const empty = (blocker: string): IWindowFitResult => ({
        offsetNm: NaN,
        instrumentalFwhmNm: NaN,
        scale: NaN,
        continuum: NaN,
        rmsResidual: NaN,
        residualShareOfPeak: NaN,
        worstResidualShare: NaN,
        pointCount: grid.length,
        lineCount: lines.length,
        blocker,
    });

    if (grid.length < 8) return empty(`a window needs at least eight points, ${grid.length} given`);
    if (measured.length !== grid.length) return empty(`the grid has ${grid.length} points and the measurement ${measured.length}`);
    if (lines.length === 0) return empty("no modelled line in this window, so nothing to fit");

    const maxOffset = options.maxOffsetNm ?? 0.3;
    const [fwhmLow, fwhmHigh] = options.fwhmRangeNm ?? [0.02, 1.0];
    const lorentz = options.collisionalFwhmNm ?? 0;
    const steps = Math.max(4, options.stepsPerAxis ?? 16);

    let best: { offset: number; fwhm: number; scale: number; continuum: number; sumSquares: number } | null = null;

    // Coarse sweep, then two refinements ten times finer around the
    // winner. The surface in these two parameters is smooth and single
    // peaked for a window with a line in it, so this finds the same
    // place a descent would and cannot run away.
    let offsetCentre = 0;
    let offsetHalfWidth = maxOffset;
    let fwhmCentre = (fwhmLow + fwhmHigh) / 2;
    let fwhmHalfWidth = (fwhmHigh - fwhmLow) / 2;

    for (let pass = 0; pass < 3; pass++) {
        for (let a = 0; a <= steps; a++) {
            const offset = offsetCentre - offsetHalfWidth + (2 * offsetHalfWidth * a) / steps;
            for (let b = 0; b <= steps; b++) {
                const fwhm = fwhmCentre - fwhmHalfWidth + (2 * fwhmHalfWidth * b) / steps;
                if (!(fwhm > 0)) continue;
                const profile = accumulateLines(grid, lines, lorentz, fwhm, offset);
                const linear = linearPart(measured, profile);
                // A negative amplitude would be a fit to the continuum
                // with the lines upside down, which is not a fit.
                if (!linear || !(linear.scale > 0)) continue;
                let sumSquares = 0;
                for (let i = 0; i < grid.length; i++) {
                    const residual = measured[i] - (linear.scale * profile[i] + linear.continuum);
                    sumSquares += residual * residual;
                }
                if (!best || sumSquares < best.sumSquares) best = { offset, fwhm, ...linear, sumSquares };
            }
        }
        if (!best) return empty("no offset and width gave a positive amplitude: the window's lines are not in the measurement");
        offsetCentre = best.offset;
        fwhmCentre = best.fwhm;
        offsetHalfWidth /= steps / 2;
        fwhmHalfWidth /= steps / 2;
    }

    // The loop above returns early when nothing fitted, so by here a
    // best exists; the local binding says so to the compiler.
    const winner = best as { offset: number; fwhm: number; scale: number; continuum: number; sumSquares: number };
    const profile = accumulateLines(grid, lines, lorentz, winner.fwhm, winner.offset);
    let peakAboveContinuum = 0;
    let worst = 0;
    for (let i = 0; i < grid.length; i++) {
        peakAboveContinuum = Math.max(peakAboveContinuum, measured[i] - winner.continuum);
        worst = Math.max(worst, Math.abs(measured[i] - (winner.scale * profile[i] + winner.continuum)));
    }
    const rms = Math.sqrt(winner.sumSquares / grid.length);

    return {
        offsetNm: winner.offset,
        instrumentalFwhmNm: winner.fwhm,
        scale: winner.scale,
        continuum: winner.continuum,
        rmsResidual: rms,
        residualShareOfPeak: peakAboveContinuum > 0 ? rms / peakAboveContinuum : NaN,
        worstResidualShare: peakAboveContinuum > 0 ? worst / peakAboveContinuum : NaN,
        pointCount: grid.length,
        lineCount: lines.length,
        blocker: null,
    };
}

/**
 * A straight line through per-window results, which is how the two
 * global trends of the protocol's section 4 are estimated: the offset
 * and the width are each modelled as `a + b (lambda - lambda_0)`.
 *
 * The scatter about the line is returned with it, because that is what
 * says whether a straight line was the right model. A protocol that
 * declares two coefficients and never looks at the residual has assumed
 * its answer.
 */
export function fitLinearTrend(
    wavelengthNm: ReadonlyArray<number>,
    value: ReadonlyArray<number>,
    pivotNm: number
): { constant: number; slopePerNm: number; rmsResidual: number; pointCount: number; blocker: string | null } {
    const usable: Array<[number, number]> = [];
    for (let i = 0; i < wavelengthNm.length; i++) if (Number.isFinite(wavelengthNm[i]) && Number.isFinite(value[i])) usable.push([wavelengthNm[i] - pivotNm, value[i]]);
    if (usable.length < 3)
        return { constant: NaN, slopePerNm: NaN, rmsResidual: NaN, pointCount: usable.length, blocker: `a trend needs at least three windows, ${usable.length} given` };

    const n = usable.length;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (const [x, y] of usable) {
        sx += x;
        sy += y;
        sxx += x * x;
        sxy += x * y;
    }
    const determinant = n * sxx - sx * sx;
    if (!(Math.abs(determinant) > 0))
        return { constant: NaN, slopePerNm: NaN, rmsResidual: NaN, pointCount: n, blocker: "every window sits at the same wavelength, so no trend exists" };

    const slope = (n * sxy - sx * sy) / determinant;
    const constant = (sy - slope * sx) / n;
    let sumSquares = 0;
    for (const [x, y] of usable) sumSquares += (y - (constant + slope * x)) ** 2;
    return { constant, slopePerNm: slope, rmsResidual: Math.sqrt(sumSquares / n), pointCount: n, blocker: null };
}
