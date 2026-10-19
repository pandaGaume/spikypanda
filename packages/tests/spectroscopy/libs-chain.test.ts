/**
 * The LIBS chain end to end (experiment E0 of the brief): material,
 * plasma, spectrometer, chart. Twice over, because the two paths must
 * agree:
 *
 *   1. through the nodes' own API, as a Node script or a job would;
 *   2. through a SERIALISED DOCUMENT instantiated headlessly, as the
 *      editor's save file does, including a hot edit of a concentration
 *      and a save / reload round trip.
 *
 * The test that carries the most physics is "the plasma reads atom
 * fractions": a line is emitted by atoms, so iron oxide must weight its
 * iron lines by 0.4 (atoms) and not by 0.699 (mass). Getting that wrong
 * is invisible on a single element and wrong on every mixture.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDocumentJson, instantiateDocument, parseDocument, runDocument, validateDocumentSpec } from "spikypanda-core";
import { buildJobRegistry } from "spikypanda-factory";
import { createMaterialNode, createTestOxideMixMaterialNode } from "../../dev/plugins/chemistry/src";
import { createLibsPlasmaNode, createSpectrometerNode, isMaterialSpecView, isPlasmaEmission, isSpectrum1D } from "../../dev/plugins/spectroscopy/src";

const registry = buildJobRegistry();

/** material -> plasma -> spectrometer -> xy chart, as a document. */
function libsDocument(components: string): string {
    const nodes = [
        { id: "material", typeId: "Chemistry.Material:material", x: 0, y: 0, params: { components, basis: "mass", display_name: "sample", provenance: "test" } },
        { id: "plasma", typeId: "Spectro.Libs:plasma", x: 200, y: 0, params: { temperature: 10000, electron_density_cm3: 1e17, continuum_level: 0.01 } },
        { id: "spectrometer", typeId: "Spectro.Instrument:spectrometer", x: 400, y: 0, params: { range_start: 240, range_end: 450, pixel_count: 2100, resolution_fwhm: 0.1, noise_enabled: false } },
        { id: "chart", typeId: "Viz.Plot:xy", x: 600, y: 0, params: {} },
    ];
    const connections = [
        { from: ["material", "material_out"] as [string, string], to: ["plasma", "material_in"] as [string, string] },
        { from: ["plasma", "emission_out"] as [string, string], to: ["spectrometer", "emission_in"] as [string, string] },
        { from: ["spectrometer", "wavelength_out"] as [string, string], to: ["chart", "x"] as [string, string] },
        { from: ["spectrometer", "measured_out"] as [string, string], to: ["chart", "y_1"] as [string, string] },
        { from: ["spectrometer", "ideal_out"] as [string, string], to: ["chart", "y_2"] as [string, string] },
    ];
    return buildDocumentJson(registry, nodes, connections);
}

// ─────────────────────────────────────────────────────────────────────
// 1. Through the nodes' API
// ─────────────────────────────────────────────────────────────────────

describe("the chain, node by node", () => {
    it("carries a pure element from formula to spectrum", () => {
        const material = createMaterialNode();
        material.components = "Ca:1";

        const plasma = createLibsPlasmaNode();
        plasma.setMaterial(material.spec);

        const spectrometer = createSpectrometerNode();
        spectrometer.range_start = 380;
        spectrometer.range_end = 440;
        spectrometer.pixel_count = 1200;
        spectrometer.setEmission(plasma.emission);

        // The node ships with the NIST catalogue and the physical model.
        expect(plasma.line_catalogue).toBe("nist");
        expect(plasma.emission_model).toBe("physical");
        expect(plasma.model_blocker).toBe("");
        expect(plasma.intensity_unit).toBe("eV/s per atom");

        expect(plasma.emission.lines.every((l) => l.element === "Ca")).toBe(true);
        const inWindow = plasma.emission.lines.filter((l) => l.wavelengthNm >= 380 && l.wavelengthNm <= 440);
        expect(inWindow.length).toBeGreaterThan(10);
        // And the strongest of them is the Ca II K line, as in every
        // calcium spectrum ever measured.
        const strongest = inWindow.reduce((b, l) => (l.intensity > b.intensity ? l : b));
        expect(strongest.wavelengthNm).toBeCloseTo(393.366, 3);
        expect(strongest.species).toBe("Ca II");

        const spectrum = spectrometer.spectrum;
        expect(spectrum.lineCount).toBe(plasma.emission.lines.length);
        expect(Math.max(...spectrum.measured)).toBeGreaterThan(0);
        expect(spectrum.blocker).toBeNull();
        expect(spectrum.unit).toBe("eV/s per atom");
    });

    it("passes every payload its consumer's own guard", () => {
        const material = createTestOxideMixMaterialNode();
        const plasma = createLibsPlasmaNode();
        plasma.setMaterial(material.spec);
        const spectrometer = createSpectrometerNode();
        spectrometer.setEmission(plasma.emission);

        expect(isMaterialSpecView(material.spec)).toBe(true);
        expect(isPlasmaEmission(plasma.emission)).toBe(true);
        expect(isSpectrum1D(spectrometer.spectrum)).toBe(true);
    });

    it("reads ATOM fractions, not mass fractions", () => {
        // Fe2O3: 69.94 % of the mass is iron, 40 % of the atoms are.
        // Shown on the built-in catalogue, because it is the one that
        // carries oxygen, and in relative mode, where the arithmetic is
        // visible: intensity = fraction x catalogue strength.
        const material = createMaterialNode();
        material.components = "Fe2O3:1";
        const plasma = createLibsPlasmaNode();
        plasma.line_catalogue = "builtin";
        plasma.emission_model = "relative";
        plasma.setMaterial(material.spec);

        const strongestOf = (element: string): number => Math.max(...plasma.emission.lines.filter((l) => l.element === element).map((l) => l.intensity));
        // Both elements' strongest built-in line has relativeStrength 1,
        // so the ratio of their amplitudes is the ratio of their atom
        // fractions: 0.4 / 0.6 = 0.667. The mass ratio would be 2.33.
        expect(strongestOf("Fe") / strongestOf("O")).toBeCloseTo(0.4 / 0.6, 6);
        expect(material.spec.massFractions.Fe / material.spec.massFractions.O).toBeCloseTo(2.327, 3);
    });

    it("weights by atom fraction in the physical model too", () => {
        // Same rule, physical model, on two elements the NIST catalogue
        // carries. Doubling calcium's atom fraction doubles every
        // calcium line, and leaves iron's alone.
        const plasma = createLibsPlasmaNode();
        const material = createMaterialNode();
        material.components = "Ca:0.5, Fe:0.5";
        plasma.setMaterial(material.spec);
        const caBefore = Math.max(...plasma.emission.lines.filter((l) => l.element === "Ca").map((l) => l.intensity));
        const feBefore = Math.max(...plasma.emission.lines.filter((l) => l.element === "Fe").map((l) => l.intensity));

        const material2 = createMaterialNode();
        material2.components = "Ca:0.8, Fe:0.2";
        plasma.setMaterial(material2.spec);
        const caAfter = Math.max(...plasma.emission.lines.filter((l) => l.element === "Ca").map((l) => l.intensity));
        const feAfter = Math.max(...plasma.emission.lines.filter((l) => l.element === "Fe").map((l) => l.intensity));

        // The expected ratios are the ATOM fraction ratios, not the mass
        // ones the user typed: "Ca:0.8, Fe:0.2" by mass is 84.8 % of the
        // atoms, because an iron atom weighs 1.39 times a calcium one.
        // Reading 0.8/0.5 here would be the very confusion this test
        // exists to catch.
        expect(caAfter / caBefore).toBeCloseTo(material2.spec.moleFractions.Ca / material.spec.moleFractions.Ca, 6);
        expect(feAfter / feBefore).toBeCloseTo(material2.spec.moleFractions.Fe / material.spec.moleFractions.Fe, 6);
        expect(material2.spec.moleFractions.Ca).toBeCloseTo(0.848, 3);
        expect(material2.spec.massFractions.Ca).toBeCloseTo(0.8, 6);
    });

    it("recomputes when a concentration changes, and not otherwise", () => {
        const material = createMaterialNode();
        material.components = "Ca:0.5, Mg:0.5";
        const plasma = createLibsPlasmaNode();
        plasma.setMaterial(material.spec);
        const first = plasma.emission;
        // Same material object: no recomputation, same instance back.
        expect(plasma.emission).toBe(first);

        material.components = "Ca:0.9, Mg:0.1";
        plasma.setMaterial(material.spec);
        const second = plasma.emission;
        expect(second).not.toBe(first);

        const caOf = (e: typeof first): number => Math.max(...e.lines.filter((l) => l.element === "Ca").map((l) => l.intensity));
        expect(caOf(second)).toBeGreaterThan(caOf(first));
    });

    it("gives an empty spectrum, not an error, when nothing is wired", () => {
        const spectrometer = createSpectrometerNode();
        spectrometer.pixel_count = 100;
        const s = spectrometer.spectrum;
        expect(s.lineCount).toBe(0);
        expect(Array.from(s.measured).every((v) => v === 0)).toBe(true);
        expect(s.wavelengthNm).toHaveLength(100);

        const plasma = createLibsPlasmaNode();
        expect(plasma.emission.lines).toEqual([]);
        expect(plasma.material_name).toBe("(nothing wired)");
    });

    it("refuses the physical model on a catalogue that cannot support it", () => {
        const material = createTestOxideMixMaterialNode();
        const plasma = createLibsPlasmaNode();
        plasma.setMaterial(material.spec);
        // The built-in catalogue has no level lists and no verified
        // lines: asking for physics on it is refused, named, and the
        // refusal travels to the spectrometer.
        plasma.line_catalogue = "builtin";
        plasma.emission_model = "physical";
        const spectrometer = createSpectrometerNode();
        spectrometer.setEmission(plasma.emission);

        expect(plasma.model_blocker).toMatch(/no level data|unverified/);
        expect(spectrometer.model_blocker).toMatch(/no level data|unverified/);
        expect(spectrometer.spectrum.lineCount).toBe(0);
    });

    it("says, in physical mode, which elements it has no data for", () => {
        // The oxide mix carries O, C and Mg, which the NIST subset does
        // not. They are reported, not silently dropped.
        const plasma = createLibsPlasmaNode();
        plasma.setMaterial(createTestOxideMixMaterialNode().spec);
        expect(plasma.missing_elements.split(" ").sort()).toEqual(["C", "Mg", "O"]);
        expect(plasma.line_count).toBeGreaterThan(0);
        // And it reports the Saha balance it solved for the ones it has.
        expect(plasma.neutral_fraction).toMatch(/Si:/);
        expect(plasma.partition_top_decile_share).toBeLessThan(0.01);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Through a serialised document, headless
// ─────────────────────────────────────────────────────────────────────

type MaterialInstance = { components: string; spec: { specVersion: number; massFractions: Record<string, number> } };
type PlasmaInstance = { line_count: number; material_name: string };
type SpectrometerInstance = { simulation_id: string; line_count: number; peak_measured: number; spectrum: { measured: Float32Array; wavelengthNm: Float64Array } };
type StubInstance = { consumed: number };

describe("the chain as a document, headless", () => {
    it("validates without a single unresolved port", () => {
        const nodes = [
            { id: "material", typeId: "Chemistry.Material:material", x: 0, y: 0, params: { components: "Ca:1" } },
            { id: "plasma", typeId: "Spectro.Libs:plasma", x: 0, y: 0, params: {} },
        ];
        expect(validateDocumentSpec(registry, nodes, [{ from: ["material", "material_out"], to: ["plasma", "material_in"] }])).toEqual([]);
        // A slot nobody declares is reported rather than silently dropped.
        expect(validateDocumentSpec(registry, nodes, [{ from: ["material", "material_out"], to: ["plasma", "composition_in"] }]).map((p) => p.what)).toEqual([
            'node "plasma" has no input port "composition_in"',
        ]);
    });

    it("instantiates, runs, and lights up every stage", () => {
        const loaded = instantiateDocument(parseDocument(libsDocument("SiO2:0.6, Fe2O3:0.2, CaCO3:0.15, MgO:0.05")), registry);
        expect(loaded.missingTypeIds).toEqual([]);
        expect(loaded.skippedConnections).toEqual([]);

        runDocument(loaded, { dt: 1, duration: 3, probes: [] });

        const plasma = loaded.instances.get("plasma") as PlasmaInstance;
        const spectrometer = loaded.instances.get("spectrometer") as SpectrometerInstance;
        const chart = loaded.instances.get("chart") as StubInstance;

        expect(plasma.material_name).toBe("sample");
        expect(plasma.line_count).toBeGreaterThan(5);
        expect(spectrometer.line_count).toBe(plasma.line_count);
        expect(spectrometer.peak_measured).toBeGreaterThan(0);
        // The chart is a headless stub: it drains what it is handed, so a
        // non-zero count proves the three curves reached it.
        expect(chart.consumed).toBeGreaterThan(0);
    });

    it("recomputes the spectrum after a hot edit of a concentration", () => {
        const loaded = instantiateDocument(parseDocument(libsDocument("Ca:0.5, Mg:0.5")), registry);
        runDocument(loaded, { dt: 1, duration: 2, probes: [] });

        const material = loaded.instances.get("material") as MaterialInstance;
        const spectrometer = loaded.instances.get("spectrometer") as SpectrometerInstance;
        const before = spectrometer.simulation_id;
        const peakBefore = spectrometer.peak_measured;

        // What the property panel does when the user types a new value.
        material.components = "Ca:0.95, Mg:0.05";
        runDocument(loaded, { dt: 1, duration: 2, probes: [] });

        expect(spectrometer.simulation_id).not.toBe(before);
        expect(spectrometer.peak_measured).toBeGreaterThan(peakBefore);
    });

    it("survives a save and reload, and does not serialise the curves", () => {
        const json = libsDocument("Fe:0.7, Cr:0.18, Ni:0.12");

        // The curves are computed state, not document state: a few
        // thousand numbers must not be rewritten on every edit.
        // "measured_out" appears as a PORT name, which is the point of
        // the check: the port is serialised, the curve behind it is not.
        expect(json).not.toMatch(/wavelengthNm/);
        expect(json).not.toMatch(/"(ideal|measured|instrumented|noise)"\s*:/);
        // No long numeric run anywhere: the curves would show up as one.
        expect(json).not.toMatch(/(-?\d+(\.\d+)?,\s*){50}/);
        expect(json.length).toBeLessThan(20000);

        const first = instantiateDocument(parseDocument(json), registry);
        runDocument(first, { dt: 1, duration: 2, probes: [] });
        const a = loadedSpectrum(first);

        const second = instantiateDocument(parseDocument(json), registry);
        runDocument(second, { dt: 1, duration: 2, probes: [] });
        const b = loadedSpectrum(second);

        // Same document, same spectrum, down to the identifier.
        expect(b.id).toBe(a.id);
        expect(Array.from(b.measured)).toEqual(Array.from(a.measured));
    });

    it("keeps the noise reproducible across a reload", () => {
        const nodes = [
            { id: "material", typeId: "Chemistry.Material:material", x: 0, y: 0, params: { components: "Ca:1" } },
            { id: "plasma", typeId: "Spectro.Libs:plasma", x: 0, y: 0, params: {} },
            {
                id: "spectrometer",
                typeId: "Spectro.Instrument:spectrometer",
                x: 0,
                y: 0,
                params: { range_start: 380, range_end: 440, pixel_count: 600, noise_enabled: true, seed: 12345, read_noise: 0.01 },
            },
        ];
        const connections = [
            { from: ["material", "material_out"] as [string, string], to: ["plasma", "material_in"] as [string, string] },
            { from: ["plasma", "emission_out"] as [string, string], to: ["spectrometer", "emission_in"] as [string, string] },
        ];
        const json = buildDocumentJson(registry, nodes, connections);
        expect(json).toMatch(/12345/);

        const run = (): Float32Array => {
            const loaded = instantiateDocument(parseDocument(json), registry);
            runDocument(loaded, { dt: 1, duration: 2, probes: [] });
            return (loaded.instances.get("spectrometer") as SpectrometerInstance).spectrum.measured;
        };
        expect(Array.from(run())).toEqual(Array.from(run()));
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. The example graph shipped in the repository
// ─────────────────────────────────────────────────────────────────────

describe("the example graph report/libs/graphs/libs-mvp.spikypanda", () => {
    const file = resolve(__dirname, "../../../report/libs/graphs/libs-mvp.spikypanda");

    it("loads, instantiates and produces a spectrum", () => {
        const loaded = instantiateDocument(parseDocument(readFileSync(file, "utf8")), registry);
        expect(loaded.missingTypeIds).toEqual([]);
        expect(loaded.skippedConnections).toEqual([]);

        runDocument(loaded, { dt: 1, duration: 2, probes: [] });

        const material = loaded.instances.get("material") as MaterialInstance;
        const spectrometer = loaded.instances.get("spectrometer") as SpectrometerInstance;

        // The four-oxide scenario, resolved: iron is 13.99 % of the mass.
        expect(material.spec.massFractions.Fe).toBeCloseTo(0.1399, 3);
        expect(spectrometer.line_count).toBeGreaterThan(5);
        expect(spectrometer.peak_measured).toBeGreaterThan(0);
        expect(spectrometer.spectrum.wavelengthNm).toHaveLength(2200);
    });

    it("carries the provenance of its composition, and says the numbers are not a reference", () => {
        const raw = readFileSync(file, "utf8");
        expect(raw).toMatch(/NOT a reference rock/);
        // Physical mode on the NIST catalogue: the graph's intensities
        // carry physical RATIOS, and the composition behind them is
        // still a synthetic scenario, which is why both statements have
        // to be readable in the saved file.
        expect(raw).toMatch(/"_emissionModel": "physical"/);
        expect(raw).toMatch(/"_catalogueChoice": "nist"/);
    });
});

function loadedSpectrum(loaded: { instances: Map<string, unknown> }): { id: string; measured: Float32Array } {
    const s = loaded.instances.get("spectrometer") as SpectrometerInstance;
    return { id: s.simulation_id, measured: s.spectrum.measured };
}
