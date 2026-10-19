/**
 * The instrument's spectral response, from a calibrated lamp.
 *
 * A spectrometer does not report the light that reached it. It reports
 * counts, and the number of counts a given amount of light produces
 * varies by orders of magnitude across a band: a silicon detector is
 * nearly blind at 200 nm, best around 650, and blind again past 1100,
 * and the grating, the slit and the window each add their own shape.
 *
 * That shape is not a nuisance to be tolerated. It is multiplicative in
 * the wavelength, so it goes straight into any quantity read from the
 * RATIO of two lines at different wavelengths, which is what a
 * Boltzmann plot is and therefore what a measured temperature is. A
 * response that rises by a factor forty between 250 and 650 nm, which
 * is what the instrument of V1-B does, would put a factor forty into a
 * line ratio spanning that range and come back as a plausible-looking
 * temperature. Dividing it out is not optional before any intensity is
 * interpreted.
 *
 * The measurement that gives it: a lamp whose spectral irradiance the
 * manufacturer certifies, measured by the instrument itself. The
 * response is then the quotient, counts per unit of irradiance, and
 * everything the instrument later reports can be divided by it.
 *
 * On deuterium-halogen lamps, which is what V1-B's data set carries.
 * Such a lamp has TWO sources in one housing, a deuterium arc for the
 * ultraviolet and a halogen filament for the visible and the infrared,
 * and the certificate covers the assembly with both running. A data set
 * that measured each source separately therefore holds two spectra
 * whose SUM corresponds to the certificate, not two spectra each of
 * which does. Dividing one of them alone by the combined certificate is
 * wrong everywhere the other source contributes, and `combine` exists
 * to make that explicit rather than leave it to be rediscovered.
 */

/** A spectrum as a measurement reports it: a grid and a value per point. */
export interface ISampledCurve {
    readonly wavelengthNm: ReadonlyArray<number>;
    readonly values: ReadonlyArray<number>;
}

/** The response, on the reference's own grid. */
export interface IInstrumentResponse {
    readonly wavelengthNm: ReadonlyArray<number>;
    /** Counts per unit of the certificate's irradiance, per point. */
    readonly countsPerIrradiance: ReadonlyArray<number>;
    /** The unit the certificate was in, carried so a corrected spectrum
     *  can say what it is in. */
    readonly irradianceUnit: string;
    /** Points the certificate covers but the measurement does not, or
     *  where the certificate is zero, so no quotient exists. */
    readonly gaps: ReadonlyArray<number>;
    /**
     * Points whose bin took measured samples from one side of it only,
     * which is what happens at the two ends of the measured range and
     * at a hole in it. Their average is of a half interval rather than
     * a centred one, so it is biased by the slope across that half: on
     * the synthetic curves of the test, 1.2e-2 at the first point and
     * 3.3e-3 at the last, against 4.2e-4 everywhere inside.
     *
     * They are reported rather than dropped, because the end of the
     * range is often exactly where a measurement is wanted, and
     * rather than silently kept, because a per cent of bias at 200 nm
     * would travel into every intensity read there.
     */
    readonly oneSidedBins: ReadonlyArray<number>;
    /** How many measured points went into each reference point, at the
     *  median. A measured grid finer than the certificate's is averaged
     *  into it, which is the right way round: the certificate is smooth
     *  and the measurement is noisy. */
    readonly pointsPerBin: number;
}

/** Two measurements of one lamp, summed point by point on a shared grid. */
export function combine(a: ISampledCurve, b: ISampledCurve): ISampledCurve {
    if (a.wavelengthNm.length !== b.wavelengthNm.length) throw new Error(`cannot combine curves of ${a.wavelengthNm.length} and ${b.wavelengthNm.length} points`);
    const values: number[] = [];
    for (let i = 0; i < a.values.length; i++) {
        if (a.wavelengthNm[i] !== b.wavelengthNm[i]) throw new Error(`cannot combine curves on different grids: ${a.wavelengthNm[i]} against ${b.wavelengthNm[i]} at index ${i}`);
        values.push(a.values[i] + b.values[i]);
    }
    return { wavelengthNm: a.wavelengthNm, values };
}

/**
 * Average a finely sampled curve into the bins of a coarser grid, each
 * bin being the points nearest to that grid point.
 *
 * Averaging rather than interpolating is deliberate: the measurement
 * carries detector noise, which averages down over the fifty points
 * that fall inside one nanometre, while interpolating the certificate
 * onto the fine grid would keep every one of those noisy points and
 * invent nothing in return.
 */
export function averageInto(fine: ISampledCurve, coarseWavelengthNm: ReadonlyArray<number>): { values: number[]; counts: number[]; oneSided: boolean[] } {
    const values = coarseWavelengthNm.map(() => 0);
    const counts = coarseWavelengthNm.map(() => 0);
    // Counted per side of the bin centre, so a bin fed from one side
    // only can say so: its average is of a half interval.
    const below = coarseWavelengthNm.map(() => 0);
    const above = coarseWavelengthNm.map(() => 0);
    if (coarseWavelengthNm.length === 0) return { values, counts, oneSided: [] };

    // The coarse grid is sorted, so each fine point's bin is found by
    // walking forward: one pass over both, no search per point.
    let bin = 0;
    for (let i = 0; i < fine.wavelengthNm.length; i++) {
        const nm = fine.wavelengthNm[i];
        while (bin + 1 < coarseWavelengthNm.length && Math.abs(coarseWavelengthNm[bin + 1] - nm) <= Math.abs(coarseWavelengthNm[bin] - nm)) bin++;
        // Outside the coarse grid's own span by more than half a bin,
        // the point belongs to no bin rather than to the nearest end.
        const half =
            coarseWavelengthNm.length > 1
                ? Math.abs(coarseWavelengthNm[Math.min(bin + 1, coarseWavelengthNm.length - 1)] - coarseWavelengthNm[Math.max(bin - 1, 0)]) / 2
                : Infinity;
        if (Math.abs(coarseWavelengthNm[bin] - nm) > Math.max(half, Number.EPSILON)) continue;
        values[bin] += fine.values[i];
        counts[bin] += 1;
        if (nm < coarseWavelengthNm[bin]) below[bin] += 1;
        else if (nm > coarseWavelengthNm[bin]) above[bin] += 1;
    }
    for (let k = 0; k < values.length; k++) if (counts[k] > 0) values[k] /= counts[k];
    return { values, counts, oneSided: counts.map((c, k) => c > 0 && (below[k] === 0 || above[k] === 0)) };
}

/**
 * The instrument's response: measured counts per unit of certified
 * irradiance, on the certificate's grid.
 *
 * `measured` is what the instrument reported for the lamp, on whatever
 * grid it samples; `certificate` is the manufacturer's irradiance. A
 * certificate point with no measurement behind it, or with an
 * irradiance of zero, yields no response and is listed in `gaps`
 * rather than filled in.
 */
export function instrumentResponse(measured: ISampledCurve, certificate: ISampledCurve, irradianceUnit: string): IInstrumentResponse {
    const { values, counts, oneSided } = averageInto(measured, certificate.wavelengthNm);
    const countsPerIrradiance: number[] = [];
    const gaps: number[] = [];
    const oneSidedBins: number[] = [];

    for (let k = 0; k < certificate.wavelengthNm.length; k++) {
        const irradiance = certificate.values[k];
        if (counts[k] === 0 || !(irradiance > 0)) {
            countsPerIrradiance.push(NaN);
            gaps.push(certificate.wavelengthNm[k]);
            continue;
        }
        countsPerIrradiance.push(values[k] / irradiance);
        if (oneSided[k]) oneSidedBins.push(certificate.wavelengthNm[k]);
    }

    const filled = counts.filter((c) => c > 0).sort((a, b) => a - b);
    return {
        wavelengthNm: certificate.wavelengthNm,
        countsPerIrradiance,
        irradianceUnit,
        gaps,
        oneSidedBins,
        pointsPerBin: filled.length > 0 ? filled[Math.floor(filled.length / 2)] : 0,
    };
}

/**
 * Divide a measured spectrum by the response, turning counts into the
 * certificate's physical unit.
 *
 * The response lives on the certificate's coarse grid and the spectrum
 * on the instrument's fine one, so the response is interpolated between
 * its points. Interpolating is right here and averaging was right the
 * other way round: the response is a smooth property of the instrument,
 * while the spectrum has structure at the fine grid's own scale that
 * must not be smeared.
 *
 * A point outside the response's range, or inside one of its gaps,
 * comes back as NaN. That is deliberate: a corrected spectrum with
 * silent zeros in it would be read as "no light there".
 */
export function applyInstrumentResponse(spectrum: ISampledCurve, response: IInstrumentResponse): ISampledCurve {
    const grid = response.wavelengthNm;
    const values: number[] = [];
    let k = 0;

    for (let i = 0; i < spectrum.wavelengthNm.length; i++) {
        const nm = spectrum.wavelengthNm[i];
        while (k + 1 < grid.length && grid[k + 1] < nm) k++;
        if (nm < grid[0] || nm > grid[grid.length - 1]) {
            values.push(NaN);
            continue;
        }
        const left = response.countsPerIrradiance[k];
        const right = response.countsPerIrradiance[Math.min(k + 1, grid.length - 1)];
        const span = grid[Math.min(k + 1, grid.length - 1)] - grid[k];
        const t = span > 0 ? (nm - grid[k]) / span : 0;
        const r = span > 0 ? left + t * (right - left) : left;
        values.push(Number.isFinite(r) && r !== 0 ? spectrum.values[i] / r : NaN);
    }
    return { wavelengthNm: spectrum.wavelengthNm, values };
}
