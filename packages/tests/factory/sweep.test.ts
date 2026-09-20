/**
 * The `sweep` job on the RS-385 complete montage, in process.
 *
 * The acceptance criterion is physical, not cosmetic: tilting the shaft
 * takes the radial gravity from g to zero over 90 degrees, so the 1x
 * current signature must follow cos(pitch) and the centrifugal vibration
 * must not move (report/rs385). A runner that loaded the document, bound
 * the scene and stepped the session incorrectly could still write pretty
 * files; it could not reproduce the cosine.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { applySetting, axisValues, buildJobRegistry, gridPoints, instantiateDocument, parseSpec, readDocument, runSweep, SpecError, resolveOutputDir } from "spikypanda-factory";
import type { SweepSpec } from "spikypanda-factory";

const SPECS = path.resolve(__dirname, "../../dev/factory/specs");
const RS385_SPEC = path.join(SPECS, "rs385-tilt.json");

function loadSpec(file: string): SweepSpec {
    const spec = parseSpec(JSON.parse(fs.readFileSync(file, "utf8")));
    if (spec.job !== "sweep") throw new Error("expected a sweep spec");
    return spec;
}

function tempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "spikypanda-factory-"));
}

describe("spec parsing", () => {
    it("accepts the shipped RS-385 tilt spec and expands its grid", () => {
        const spec = loadSpec(RS385_SPEC);
        expect(spec.job).toBe("sweep");
        expect(gridPoints(spec.grid ?? [])).toHaveLength(3);
        expect(spec.record.map((r) => r.as)).toEqual(["omega", "current", "accel_y"]);
    });

    it("refuses a summary over a column that is not recorded, naming the path", () => {
        const raw = JSON.parse(fs.readFileSync(RS385_SPEC, "utf8")) as { summary: Array<{ field: string }> };
        raw.summary[0].field = "torque";
        expect(() => parseSpec(raw)).toThrow(SpecError);
        expect(() => parseSpec(raw)).toThrow(/spec\.summary\[0\]\.field/);
    });

    it("refuses an unknown job type and a settle past the duration", () => {
        const raw = JSON.parse(fs.readFileSync(RS385_SPEC, "utf8")) as Record<string, unknown>;
        expect(() => parseSpec({ ...raw, job: "train" })).toThrow(/spec\.job/);
        expect(() => parseSpec({ ...raw, run: { dt: 1e-4, duration: 1, settle: 1 } })).toThrow(/spec\.run\.settle/);
    });

    it("expands a range without dropping its last value to rounding", () => {
        expect(axisValues({ node: "n", property: "p", range: { from: 0, to: 90, step: 15 } })).toEqual([0, 15, 30, 45, 60, 75, 90]);
        expect(axisValues({ node: "n", property: "p", range: { from: 0, to: 0.3, step: 0.1 } })).toHaveLength(4);
    });

    it("resolves the output directory in the documented order", () => {
        const spec = loadSpec(RS385_SPEC);
        const env = { NEBIUS_OUTPUT_DIR: "/outputs" } as NodeJS.ProcessEnv;
        expect(resolveOutputDir(spec, "cli", env)).toBe(path.resolve("cli", spec.name));
        expect(resolveOutputDir(spec, undefined, env)).toBe(path.resolve("/outputs", spec.name));
        expect(resolveOutputDir(spec, undefined, {} as NodeJS.ProcessEnv)).toBe(path.resolve("outputs", spec.name));
    });
});

describe("document settings", () => {
    const registry = buildJobRegistry();
    const spec = loadSpec(RS385_SPEC);
    const doc = readDocument(path.resolve(SPECS, spec.graph));

    it("binds the root Scene of the document to the session", () => {
        const loaded = instantiateDocument(doc, registry);
        expect(loaded.missingTypeIds).toEqual([]);
        expect(loaded.sceneBound).toBe(true);
        expect(loaded.skippedConnections).toEqual(["scene:scene_out->motor:scene"]);
    });

    it("sets a public property through its setter, and a saved key through deserialize", () => {
        const loaded = instantiateDocument(doc, registry);
        applySetting(loaded, { node: "attitude", property: "pitch", value: 30 });
        expect((loaded.instances.get("attitude") as { pitch: number }).pitch).toBe(30);
        // `_yaw` is a saved key, not a public name: the fallback path.
        applySetting(loaded, { node: "attitude", property: "_yaw", value: 12 });
        expect((loaded.instances.get("attitude") as { yaw: number }).yaw).toBe(12);
    });

    it("refuses a node id or property that the document does not have", () => {
        const loaded = instantiateDocument(doc, registry);
        expect(() => applySetting(loaded, { node: "nope", property: "pitch", value: 1 })).toThrow(/not in the document/);
        expect(() => applySetting(loaded, { node: "attitude", property: "bank", value: 1 })).toThrow(/no property "bank"/);
    });
});

describe("sweep job on the RS-385 complete montage", () => {
    const registry = buildJobRegistry();
    const outDir = tempDir();
    const spec = loadSpec(RS385_SPEC);
    const log: string[] = [];
    const report = runSweep(spec, { registry, specDir: SPECS, outDir, log: (l) => log.push(l), factoryVersion: "test" });

    it("runs every grid point and writes the summary, the CSV and the manifest", () => {
        expect(report.points).toHaveLength(3);
        for (const name of ["summary.json", "summary.csv", "manifest.json"]) expect(fs.existsSync(path.join(outDir, name))).toBe(true);
        const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "manifest.json"), "utf8")) as {
            graph: { sha256: string; sceneBound: boolean };
            grid: { points: number };
            files: string[];
        };
        expect(manifest.graph.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(manifest.graph.sceneBound).toBe(true);
        expect(manifest.grid.points).toBe(3);
        expect(manifest.files).toContain("summary.csv");
        expect(log.some((l) => l.includes("[3/3]"))).toBe(true);
    });

    it("reads the cosine law on the 1x current and leaves the centrifugal vibration alone", () => {
        const [horizontal, tilted, vertical] = report.points.map((p) => p.summary);
        expect(horizontal.omega_mean).toBeGreaterThan(100);
        expect(horizontal.current_1x).toBeGreaterThan(0);
        expect(tilted.current_1x / horizontal.current_1x).toBeCloseTo(Math.cos(Math.PI / 4), 2);
        expect(vertical.current_1x / horizontal.current_1x).toBeLessThan(1e-2);
        expect(vertical.current_dc).toBeCloseTo(horizontal.current_dc, 2);
        expect(vertical.vib_1x / horizontal.vib_1x).toBeCloseTo(1, 2);
    });

    it("matches the jest harness of report/rs385 on the horizontal 1x current", () => {
        // rs385-complete-graph.test.ts prints 7.214e-3 A for the same document,
        // dt and window. Same runtime, same numbers, no editor in the loop.
        expect(report.points[0].summary.current_1x).toBeCloseTo(7.214e-3, 5);
    });

    it("writes one JSON-lines file per point when samples are requested", () => {
        const dir = tempDir();
        const small: SweepSpec = {
            ...spec,
            name: "rs385-samples",
            run: { dt: 2e-4, duration: 0.05, settle: 0.02 },
            grid: [{ node: "attitude", property: "pitch", values: [0, 90] }],
            outputs: { samples: true },
        };
        const r = runSweep(small, { registry, specDir: SPECS, outDir: dir, log: () => undefined, factoryVersion: "test" });
        expect(r.files.filter((f) => f.startsWith("samples/"))).toEqual(["samples/point-0000.jsonl", "samples/point-0001.jsonl"]);
        const lines = fs
            .readFileSync(path.join(dir, "samples", "point-0000.jsonl"), "utf8")
            .trim()
            .split("\n");
        expect(lines).toHaveLength(250);
        expect(Object.keys(JSON.parse(lines[0]))).toEqual(["t", "omega", "current", "accel_y"]);
    });
});
