/**
 * The physical emission model: partition functions, Boltzmann
 * populations, the Saha balance, and the emissivity they produce.
 *
 * These are physics tests, not plumbing tests. Each one states what the
 * physics requires and checks the code against it:
 *
 *   - a partition function at low temperature is the ground level's own
 *     weight, and it grows with temperature;
 *   - the Saha balance ionises more when it is hotter and less when
 *     electrons are denser;
 *   - calcium, whose first ionisation energy is only 6.11 eV, is almost
 *     entirely ionised at 10 000 K, which is why its two strongest LIBS
 *     lines are ION lines;
 *   - the ratio of two lines of the same species is a Boltzmann factor
 *     and nothing else, which is what makes a Boltzmann plot possible.
 *
 * The reference values are computed by hand from the shipped NIST data
 * inside the tests, so a change in the catalogue changes the expected
 * number rather than silently breaking the claim.
 */
import { thermalEnergyEv } from "../../dev/core/src";
import {
    computePhysicalEmissions,
    ionisationFractions,
    NIST_IONISATION_ENERGIES_EV,
    NIST_SPECIES,
    partitionFunction,
    photonEnergyEv,
    transitionEnergyEv,
    physicalDataBlocker,
    sahaRatio,
} from "../../dev/plugins/spectroscopy/src";
import type { IPhysicalModelData } from "../../dev/plugins/spectroscopy/src";

const DATA: IPhysicalModelData = {
    species: NIST_SPECIES.map((s) => ({ element: s.element, ionisation: s.ionisation, asdName: s.asdName, lines: s.lines, levels: s.levels })),
    ionisationEnergiesEv: NIST_IONISATION_ENERGIES_EV,
};

const speciesOf = (element: string, ionisation: 0 | 1 | 2) => DATA.species.find((s) => s.element === element && s.ionisation === ionisation)!;

// ─────────────────────────────────────────────────────────────────────
// 1. Photon energy
// ─────────────────────────────────────────────────────────────────────

describe("photonEnergyEv", () => {
    it("is h c / (lambda e), the constant everyone writes as 1239.84", () => {
        expect(photonEnergyEv(500)).toBeCloseTo(2.47968, 5);
        expect(photonEnergyEv(1239.84193)).toBeCloseTo(1, 5);
        expect(photonEnergyEv(0)).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Partition functions
// ─────────────────────────────────────────────────────────────────────

describe("partitionFunction", () => {
    it("collapses to the ground level's weight when it is cold", () => {
        const ca = speciesOf("Ca", 0);
        // Ca I ground level is 4s2 1S0: J = 0, so g = 1, and the next
        // level is 1.89 eV up, far above kT at room temperature.
        expect(partitionFunction(ca.levels, 300).value).toBeCloseTo(1, 6);

        const fe = speciesOf("Fe", 0);
        // Fe I ground level is a5D4: J = 4, so g = 9. But its ground
        // TERM is split by fine structure over about 0.12 eV, and kT at
        // 300 K is 0.026 eV, so the J = 3, 2, 1, 0 levels are already
        // populated: U is 10.2, not 9. It takes a much colder plasma to
        // see the bare ground level, and this is exactly the kind of
        // detail a partition function has to get right.
        expect(partitionFunction(fe.levels, 300).value).toBeGreaterThan(10);
        expect(partitionFunction(fe.levels, 300).value).toBeLessThan(10.5);
        expect(partitionFunction(fe.levels, 50).value).toBeCloseTo(9, 3);
    });

    it("grows with temperature, because more levels get populated", () => {
        const fe = speciesOf("Fe", 0);
        const u6000 = partitionFunction(fe.levels, 6000).value;
        const u10000 = partitionFunction(fe.levels, 10000).value;
        const u15000 = partitionFunction(fe.levels, 15000).value;
        expect(u6000).toBeLessThan(u10000);
        expect(u10000).toBeLessThan(u15000);
    });

    it("lands on the published value for Fe I at 10 000 K", () => {
        // The literature value for U(Fe I) at 10 000 K is about 60; the
        // shipped level list gives 59.7. A reader who needs more than
        // two digits has to extend the level list, which is exactly
        // what topDecileShare is there to warn about.
        const u = partitionFunction(speciesOf("Fe", 0).levels, 10000);
        expect(u.value).toBeGreaterThan(55);
        expect(u.value).toBeLessThan(65);
    });

    it("reports how much of the sum sits in the top decile of the level list", () => {
        const fe = speciesOf("Fe", 0);
        const cold = partitionFunction(fe.levels, 6000);
        const hot = partitionFunction(fe.levels, 15000);
        // Cold: the tail contributes nothing, the truncation is
        // harmless. Hot: it starts to matter, and stays under 2 % here.
        expect(cold.topDecileShare).toBeLessThan(0.001);
        expect(hot.topDecileShare).toBeGreaterThan(cold.topDecileShare);
        expect(hot.topDecileShare).toBeLessThan(0.05);
    });

    it("returns zero rather than a NaN for a degenerate input", () => {
        expect(partitionFunction([], 10000).value).toBe(0);
        expect(partitionFunction(speciesOf("Ca", 0).levels, 0).value).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. The Saha balance
// ─────────────────────────────────────────────────────────────────────

describe("sahaRatio and ionisationFractions", () => {
    const caNeutral = () => partitionFunction(speciesOf("Ca", 0).levels, 10000).value;
    const caIon = () => partitionFunction(speciesOf("Ca", 1).levels, 10000).value;

    it("ionises more when it is hotter", () => {
        const u = (t: number) => [partitionFunction(speciesOf("Ca", 0).levels, t).value, partitionFunction(speciesOf("Ca", 1).levels, t).value] as const;
        const r = (t: number) => sahaRatio(...u(t), NIST_IONISATION_ENERGIES_EV["Ca I"], t, 1e17);
        expect(r(8000)).toBeLessThan(r(10000));
        expect(r(10000)).toBeLessThan(r(12000));
    });

    it("ionises less when electrons are denser, which is the n_e in the denominator", () => {
        const hot = sahaRatio(caNeutral(), caIon(), NIST_IONISATION_ENERGIES_EV["Ca I"], 10000, 1e16);
        const dense = sahaRatio(caNeutral(), caIon(), NIST_IONISATION_ENERGIES_EV["Ca I"], 10000, 1e18);
        expect(dense).toBeLessThan(hot);
        expect(dense * 100).toBeCloseTo(hot, 6);
    });

    /** The whole chain for one element at one temperature. */
    const chainOf = (element: string, temperatureK: number, electronDensityCm3 = 1e17) => {
        const u = (stage: 0 | 1 | 2) => partitionFunction(speciesOf(element, stage).levels, temperatureK).value;
        const ratio = (lower: 0 | 1) =>
            sahaRatio(u(lower), u((lower + 1) as 1 | 2), NIST_IONISATION_ENERGIES_EV[`${element} ${lower === 0 ? "I" : "II"}`], temperatureK, electronDensityCm3);
        return ionisationFractions([ratio(0), ratio(1)]);
    };

    it("leaves calcium almost entirely ionised at 10 000 K", () => {
        // E_ion(Ca I) = 6.11 eV, fourth lowest of the twelve elements
        // after K at 4.34, Na at 5.14 and Al at 5.99, so calcium is the
        // textbook case: its LIBS spectrum is dominated by ION lines even
        // at modest temperatures. The three alkalis below it are more
        // ionised still, 97 % of potassium being K II at 10 000 K.
        const f = chainOf("Ca", 10000);
        expect(f[0]).toBeLessThan(0.1);
        expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    });

    it("keeps silicon mostly neutral at the same temperature, because its ionisation energy is higher", () => {
        expect(chainOf("Si", 10000)[0]).toBeGreaterThan(0.2);
        expect(chainOf("Si", 10000)[0]).toBeGreaterThan(chainOf("Ca", 10000)[0]);
    });

    it("sends calcium to its second ionisation as the plasma heats, which a two-stage balance cannot do", () => {
        // At 11 605 K, nine per cent of the calcium is already Ca III.
        // A balance that stopped at the first ion would hand that nine
        // per cent back to Ca I and Ca II and bias every ratio calcium
        // appears in. Measured against the NIST LIBS Database in
        // internals/libs/07-V1B0-NIST-CROSSCHECK.md.
        const f = chainOf("Ca", 11604.518);
        expect(f[2]).toBeGreaterThan(0.08);
        expect(f[2]).toBeLessThan(0.11);
        // And it keeps rising with temperature, which is the point of
        // carrying the stage at all.
        expect(chainOf("Ca", 14000)[2]).toBeGreaterThan(f[2]);
        // Iron, whose second ionisation energy is higher, stays far
        // behind at the same point.
        expect(chainOf("Fe", 11604.518)[2]).toBeLessThan(0.01);
    });

    it("is safe on a degenerate input", () => {
        expect(sahaRatio(1, 1, 6, 10000, 0)).toBe(0);
        // A ratio that is not a number ends the chain there: the stage
        // below keeps everything and the stages above get nothing.
        expect(ionisationFractions([Number.NaN])).toEqual([1, 0]);
        expect(ionisationFractions([])).toEqual([1]);
        expect(ionisationFractions([1, Number.NaN])).toEqual([0.5, 0.5, 0]);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Emissivities
// ─────────────────────────────────────────────────────────────────────

describe("computePhysicalEmissions", () => {
    const emissions = (fractions: Record<string, number>, t = 10000, ne = 1e17) => computePhysicalEmissions(fractions, DATA, t, ne, 1);

    const strongest = (result: ReturnType<typeof emissions>, element?: string, ionisation?: 0 | 1) =>
        result.intensities
            .filter((i) => (element === undefined || i.line.element === element) && (ionisation === undefined || i.line.ionisation === ionisation))
            .reduce((best, i) => (best === null || i.intensity > best.intensity ? i : best), null as (typeof result.intensities)[number] | null);

    it("puts the Ca II H and K pair at the top of a calcium spectrum", () => {
        const top = strongest(emissions({ Ca: 1 }));
        expect(top).not.toBeNull();
        // 393.37 nm, the K line: the strongest line of calcium in any
        // LIBS spectrum, and an ION line at this temperature.
        expect(top!.line.wavelengthNm).toBeCloseTo(393.366, 2);
        expect(top!.line.ionisation).toBe(1);
    });

    it("makes the ratio of two lines of the same species a pure Boltzmann factor", () => {
        const result = emissions({ Ca: 1 });
        const find = (nm: number) => result.intensities.find((i) => Math.abs(i.line.wavelengthNm - nm) < 0.01)!;
        const k = find(393.366);
        const h = find(396.847);

        const ktEv = thermalEnergyEv(10000);
        // The energy each photon carries is the difference between the
        // two levels, not h c / lambda: the wavelength ASD publishes is
        // the one in AIR, and the refractive index of the room has no
        // business in an emission model. See `transitionEnergyEv`.
        const predicted =
            (k.line.upperLevelWeight! * Math.exp(-k.line.upperLevelEnergyEv! / ktEv) * k.line.transitionProbability! * transitionEnergyEv(k.line)) /
            (h.line.upperLevelWeight! * Math.exp(-h.line.upperLevelEnergyEv! / ktEv) * h.line.transitionProbability! * transitionEnergyEv(h.line));
        expect(k.intensity / h.intensity).toBeCloseTo(predicted, 10);
        // And it is about 2, which is the textbook K/H ratio.
        expect(k.intensity / h.intensity).toBeGreaterThan(1.5);
        expect(k.intensity / h.intensity).toBeLessThan(2.5);
    });

    it("moves the ion-to-neutral ratio with temperature, which is the Saha balance showing through", () => {
        const ratioAt = (t: number) => {
            const r = emissions({ Ca: 1 }, t);
            return strongest(r, "Ca", 1)!.intensity / strongest(r, "Ca", 0)!.intensity;
        };
        expect(ratioAt(7000)).toBeLessThan(ratioAt(10000));
        expect(ratioAt(10000)).toBeLessThan(ratioAt(13000));
    });

    it("scales linearly with the element's atom fraction", () => {
        const half = strongest(emissions({ Ca: 0.5, Fe: 0.5 }), "Ca")!.intensity;
        const tenth = strongest(emissions({ Ca: 0.1, Fe: 0.9 }), "Ca")!.intensity;
        expect(half / tenth).toBeCloseTo(5, 6);
    });

    it("reports an element it has no data for instead of dropping it", () => {
        // Manganese is outside the twelve the catalogue carries, and
        // deliberately so: MnO sits at 0.1 to 0.2 % in the V1-B
        // compositions and its lines are weak at that level
        // (`internals/libs/10-CATALOGUE-EXTENSION.md`). It is named
        // rather than quietly left out of the spectrum.
        const r = emissions({ Ca: 0.5, Mn: 0.5 });
        expect(r.missingElements).toEqual(["Mn"]);
        expect(r.intensities.every((i) => i.line.element === "Ca")).toBe(true);
    });

    it("reports what it assumed, per element", () => {
        const r = emissions({ Ca: 0.5, Si: 0.5 });
        const ca = r.elements.find((e) => e.element === "Ca")!;
        expect(ca.missingSpecies).toEqual([]);
        expect(ca.missingIonisationEnergy).toEqual([]);
        // Three stages carried, three partition functions, and the
        // balance solved across all three.
        expect(ca.partitionFunctions).toHaveLength(3);
        expect(ca.partitionFunctions.every((u) => u > 0)).toBe(true);
        expect(ca.stagesSolved).toBe(3);
        expect(ca.stageFractions).toHaveLength(3);
        expect(ca.stageFractions.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
        expect(ca.stageFractions[0]).toBeLessThan(0.1);
        expect(ca.partitionTopDecileShare).toBeLessThan(0.01);
    });

    it("names the stage its balance stopped at when an ionisation energy is missing", () => {
        // Strip the energy that takes Ca II to Ca III: the chain must
        // stop there and say so, rather than carry on with a guess.
        const trimmed = { ...DATA, ionisationEnergiesEv: { ...DATA.ionisationEnergiesEv, "Ca II": undefined as unknown as number } };
        delete (trimmed.ionisationEnergiesEv as Record<string, number | undefined>)["Ca II"];
        const r = computePhysicalEmissions({ Ca: 1 }, trimmed, 10000, 1e17, 1);
        const ca = r.elements.find((e) => e.element === "Ca")!;
        expect(ca.missingIonisationEnergy).toEqual(["Ca II"]);
        expect(ca.stagesSolved).toBe(2);
        expect(ca.stageFractions[2]).toBe(0);
        // And no Ca III line is emitted, since no atom was put there.
        expect(r.intensities.some((i) => i.line.ionisation === 2)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. The model still refuses what it cannot do
// ─────────────────────────────────────────────────────────────────────

describe("physicalDataBlocker", () => {
    it("passes the shipped data set", () => {
        expect(physicalDataBlocker(DATA)).toBeNull();
    });

    it("names what is missing, rather than letting a model run half-blind", () => {
        expect(physicalDataBlocker(undefined)).toMatch(/no level data/);
        expect(physicalDataBlocker({ species: [], ionisationEnergiesEv: {} })).toMatch(/no species/);
        expect(physicalDataBlocker({ species: [{ element: "Ca", ionisation: 0, asdName: "Ca I", lines: [], levels: [] }], ionisationEnergiesEv: { "Ca I": 6.11 } })).toMatch(
            /no level list for Ca I/
        );
        expect(physicalDataBlocker({ species: DATA.species, ionisationEnergiesEv: {} })).toMatch(/no ionisation energies/);
    });
});
