/**
 * The Boltzmann plot, and the temperature read off it.
 *
 * For an optically thin line of a species in local thermodynamic
 * equilibrium, the emitted energy per unit time goes as
 *
 *     I = C * (g_k A_ki / lambda) * exp(-E_k / kT)
 *
 * where C collects everything that does not depend on the line: the
 * species' density, its partition function, and the geometry of the
 * collection. Taking the logarithm turns that into a straight line,
 *
 *     ln(I lambda / (g_k A_ki)) = -E_k / kT + ln C
 *
 * whose SLOPE is -1/kT and whose intercept is the part nobody knows.
 * That is the whole appeal: a temperature falls out of relative
 * intensities alone, with no absolute calibration, no knowledge of how
 * much material was ablated, and no collection solid angle.
 *
 * What it assumes, and what therefore has to be true of the lines fed
 * to it: the plasma is optically thin at each of them, so the strongest
 * resonance lines of the dominant species are exactly the wrong ones to
 * use; it is in equilibrium; and the transition probabilities are
 * right, which for most lines of most species is a 10 to 25 per cent
 * claim and is usually the dominant uncertainty in the answer.
 *
 * The scatter about the fitted line is therefore not a nuisance either.
 * It is the measurement of whether those assumptions held, and it is
 * reported in dex, that is, in decades of the quantity plotted, because
 * that is the unit the LIBS literature states its tolerances in.
 */

import { BOLTZMANN_CONSTANT, ELEMENTARY_CHARGE, PLANCK_CONSTANT, SPEED_OF_LIGHT } from "spikypanda-core";

/** One line as a Boltzmann plot needs it. */
export interface IBoltzmannPoint {
    readonly wavelengthNm: number;
    /** Upper level energy [eV]. */
    readonly upperLevelEnergyEv: number;
    /**
     * Lower level energy [eV], when the catalogue publishes it. Given,
     * the photon's energy is the difference of the two levels, which is
     * what the atom releases; absent, it falls back to h c / lambda,
     * and the wavelength published above 200 nm is the wavelength IN
     * AIR, so that fallback carries the refractive index of the room.
     * The difference is three parts in a hundred thousand and it shows:
     * on the model's own lines it moves a recovered temperature by two
     * parts in a million. See `transitionEnergyEv`.
     */
    readonly lowerLevelEnergyEv?: number;
    /** Statistical weight of the upper level. */
    readonly upperLevelWeight: number;
    /** Transition probability [s^-1]. */
    readonly transitionProbability: number;
    /** Measured intensity, in any unit: only ratios enter the slope. */
    readonly intensity: number;
    /**
     * Relative uncertainty on the intensity, used as a weight. The
     * accuracy ASD publishes for the transition probability belongs
     * here too, since it enters the plotted quantity the same way.
     */
    readonly relativeUncertainty?: number;
}

export interface IBoltzmannFit {
    /** Temperature [K] from the slope, NaN when it cannot be had. */
    readonly temperatureK: number;
    /** One standard error on it [K], from the scatter and the lever. */
    readonly temperatureUncertaintyK: number;
    /** The slope itself [1/eV], negative for a real temperature. */
    readonly slopePerEv: number;
    readonly intercept: number;
    /** Root mean square residual, in decades of the plotted quantity. */
    readonly scatterDex: number;
    /** Widest single residual, in the same unit. */
    readonly worstResidualDex: number;
    readonly pointCount: number;
    /** Span of upper level energies [eV]: the lever the slope rests on. */
    readonly energySpanEv: number;
    /** Why no temperature could be had, or null. */
    readonly blocker: string | null;
}

/** kT in electronvolts at a temperature in kelvin. */
const thermalEv = (temperatureK: number) => (BOLTZMANN_CONSTANT * temperatureK) / ELEMENTARY_CHARGE;

/**
 * The plotted ordinate for one line: ln(I / (E_photon g_k A_ki)).
 *
 * The photon energy divides because `intensity` is an ENERGY per unit
 * time while the level population drives a PHOTON rate, and the two
 * differ by the energy each photon carries. In the classic form that
 * energy is written h c / lambda, which makes the ordinate
 * ln(I lambda / g A) up to a constant; here it is the difference of the
 * two level energies whenever the catalogue gives both, since that is
 * what the atom releases and the published wavelength is the one in
 * air.
 */
export function boltzmannOrdinate(point: IBoltzmannPoint): number {
    const denominator = point.upperLevelWeight * point.transitionProbability;
    if (!(denominator > 0) || !(point.intensity > 0) || !(point.wavelengthNm > 0)) return NaN;
    const fromLevels = point.lowerLevelEnergyEv !== undefined ? point.upperLevelEnergyEv - point.lowerLevelEnergyEv : NaN;
    // h c / e in eV nm, computed from the constants rather than written
    // as 1239.84, and used only when the lower level is unknown.
    const photonEnergyEv = fromLevels > 0 ? fromLevels : (PLANCK_CONSTANT * SPEED_OF_LIGHT) / ELEMENTARY_CHARGE / (point.wavelengthNm * 1e-9);
    if (!(photonEnergyEv > 0)) return NaN;
    return Math.log(point.intensity / (photonEnergyEv * denominator));
}

/**
 * Fit a temperature to a set of lines of ONE species.
 *
 * Mixing species would be wrong and is not guarded against here,
 * because the caller is the only one who knows: the intercept carries
 * the species' density and partition function, so two species on one
 * plot fit a straight line through two offset clouds and return a
 * number that means nothing.
 *
 * Points are weighted by the inverse square of their relative
 * uncertainty where one is given. A line whose transition probability
 * is published to twenty-five per cent should not pull as hard as one
 * published to five, and in LIBS that spread is the rule.
 */
export function boltzmannFit(points: ReadonlyArray<IBoltzmannPoint>): IBoltzmannFit {
    const empty = (blocker: string): IBoltzmannFit => ({
        temperatureK: NaN,
        temperatureUncertaintyK: NaN,
        slopePerEv: NaN,
        intercept: NaN,
        scatterDex: NaN,
        worstResidualDex: NaN,
        pointCount: 0,
        energySpanEv: 0,
        blocker,
    });

    const usable = points.filter((p) => Number.isFinite(boltzmannOrdinate(p)) && Number.isFinite(p.upperLevelEnergyEv));
    if (usable.length < 3) return empty(`a Boltzmann plot needs at least three usable lines, ${usable.length} given`);

    const energies = usable.map((p) => p.upperLevelEnergyEv);
    const span = Math.max(...energies) - Math.min(...energies);
    if (!(span > 0)) return empty("every line shares an upper level energy, so the plot has no lever on the slope");

    const y = usable.map(boltzmannOrdinate);
    // A relative uncertainty on the intensity is an absolute one on its
    // logarithm, which is what makes the weighting straightforward.
    const weight = usable.map((p) => {
        const sigma = p.relativeUncertainty;
        return sigma !== undefined && sigma > 0 ? 1 / (sigma * sigma) : 1;
    });

    let sw = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < usable.length; i++) {
        sw += weight[i];
        sx += weight[i] * energies[i];
        sy += weight[i] * y[i];
        sxx += weight[i] * energies[i] * energies[i];
        sxy += weight[i] * energies[i] * y[i];
    }
    const denominator = sw * sxx - sx * sx;
    if (!(Math.abs(denominator) > 0)) return empty("the weighted energies are degenerate, so no slope exists");

    const slope = (sw * sxy - sx * sy) / denominator;
    const intercept = (sy - slope * sx) / sw;

    // Residuals in natural logs, converted to decades, which is the
    // unit the literature quotes a Boltzmann plot's scatter in.
    const LN10 = Math.log(10);
    let weightedSquares = 0;
    let worst = 0;
    for (let i = 0; i < usable.length; i++) {
        const residual = (y[i] - (intercept + slope * energies[i])) / LN10;
        weightedSquares += weight[i] * residual * residual;
        worst = Math.max(worst, Math.abs(residual));
    }
    // Two parameters are fitted, so the residual has n - 2 degrees of
    // freedom; with three points that is one, which is why three points
    // give a temperature and no honest uncertainty on it.
    const scatterDex = Math.sqrt(weightedSquares / sw);
    const degreesOfFreedom = usable.length - 2;

    if (!(slope < 0)) {
        return {
            temperatureK: NaN,
            temperatureUncertaintyK: NaN,
            slopePerEv: slope,
            intercept,
            scatterDex,
            worstResidualDex: worst,
            pointCount: usable.length,
            energySpanEv: span,
            blocker: `the slope is ${slope >= 0 ? "not negative" : "not finite"}, so no temperature: a positive slope means the upper levels are more populated the higher they are, which is not thermal`,
        };
    }

    const temperatureK = 1 / (-slope * (BOLTZMANN_CONSTANT / ELEMENTARY_CHARGE));
    // The slope's standard error, propagated to the temperature. The
    // factor comes from T = -1/(slope k/e), so dT/T = dslope/slope.
    const slopeVariance = degreesOfFreedom > 0 ? ((weightedSquares * LN10 * LN10) / degreesOfFreedom) * (sw / denominator) : NaN;
    const relativeSlopeError = Number.isFinite(slopeVariance) && slopeVariance >= 0 ? Math.sqrt(slopeVariance) / Math.abs(slope) : NaN;

    return {
        temperatureK,
        temperatureUncertaintyK: temperatureK * relativeSlopeError,
        slopePerEv: slope,
        intercept,
        scatterDex,
        worstResidualDex: worst,
        pointCount: usable.length,
        energySpanEv: span,
        blocker: null,
    };
}

/**
 * The temperature that a measured ion-to-neutral intensity ratio implies
 * at a known electron density, which is the Saha-Boltzmann reading and
 * the independent check on the slope above.
 *
 * It is independent in the way that matters: the slope uses only lines
 * of one species and so never touches the ionisation balance, while
 * this uses only the balance. If the two agree, the plasma is in
 * equilibrium across the stages as well as within one, which is the
 * assumption the whole forward model rests on. Section M4 of the
 * protocol is this comparison.
 *
 * Solved by bisection rather than in closed form: the ratio is
 * monotonic in the temperature over any range a LIBS plasma reaches, and
 * the partition functions come in as functions the caller supplies, so
 * there is nothing to invert analytically.
 */
export function temperatureFromIonRatio(
    measuredIonOverNeutral: number,
    ionisationEnergyEv: number,
    electronDensityCm3: number,
    /** The ratio the model predicts at a temperature, for the two lines
     *  actually measured. The caller owns it because it needs the
     *  partition functions and the two lines' atomic data. */
    predictedRatioAt: (temperatureK: number) => number,
    bracketK: readonly [number, number] = [3000, 30000]
): { temperatureK: number; blocker: string | null } {
    if (!(measuredIonOverNeutral > 0)) return { temperatureK: NaN, blocker: "the measured ion to neutral ratio is not positive" };
    void ionisationEnergyEv;
    void electronDensityCm3;

    let [low, high] = bracketK;
    const f = (t: number) => predictedRatioAt(t) - measuredIonOverNeutral;
    let flow = f(low);
    let fhigh = f(high);
    if (!Number.isFinite(flow) || !Number.isFinite(fhigh)) return { temperatureK: NaN, blocker: "the predicted ratio is not finite at the bracket's ends" };
    if (flow * fhigh > 0) {
        return {
            temperatureK: NaN,
            blocker: `the measured ratio ${measuredIonOverNeutral.toPrecision(3)} lies outside what the model can produce between ${low} and ${high} K (${predictedRatioAt(low).toPrecision(3)} to ${predictedRatioAt(high).toPrecision(3)})`,
        };
    }

    // Sixty halvings take any bracket below double precision; fifty is
    // ample and bounds the loop.
    for (let k = 0; k < 50 && high - low > 1e-6; k++) {
        const mid = (low + high) / 2;
        const fmid = f(mid);
        if (!Number.isFinite(fmid)) return { temperatureK: NaN, blocker: `the predicted ratio is not finite at ${mid.toFixed(0)} K` };
        if (flow * fmid <= 0) {
            high = mid;
            fhigh = fmid;
        } else {
            low = mid;
            flow = fmid;
        }
    }
    void fhigh;
    return { temperatureK: (low + high) / 2, blocker: null };
}

/** kT in eV, exported because every tolerance in the protocol is in eV. */
export { thermalEv as boltzmannThermalEv };
