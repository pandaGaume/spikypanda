/**
 * The `evaluate` job, first form (docs/architecture/usine-jobs.fr.md, 3.3.1):
 * a monitor judged against the oracle. The chain of the T0 moment is run in
 * process, sweep then fit then evaluate, on the RS-385 twin: the artifact
 * fitted on the twin's own operating points must stay silent on the twin at
 * rest and raise its alarm after the debounce once the turbine's load is
 * doubled. A negative verdict is a result and not an error, and a contract
 * that does not describe the artifact is refused before anything runs.
 */
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { buildJobRegistry, parseSpec, runEvaluate, runFit, runSweep, EvaluateError, SpecError } from "spikypanda-factory";
import type { EvaluateSpec, FitSpec, SweepSpec } from "spikypanda-factory";

/** The chain specs are test fixtures here; the demo repository carries its own copies. */
const SPECS = path.resolve(__dirname, "specs");
const EVAL_SPEC = path.join(SPECS, "scrubber-health-eval.json");

function tempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "spikypanda-eval-"));
}

function readJson(file: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
}

describe("evaluate spec parsing", () => {
    const raw = readJson(EVAL_SPEC);

    it("accepts the shipped spec", () => {
        const spec = parseSpec(raw);
        expect(spec.job).toBe("evaluate");
        if (spec.job !== "evaluate") return;
        expect(spec.scenarios.map((s) => s.name)).toEqual(["nominal", "fouling-x2"]);
        expect(spec.run).toEqual({ dt: 0.0002, cycle: 1, settle: 2 });
    });

    it("refuses a nominal scenario that injects, an alarm expectation without injection, and a deadline past the end", () => {
        const scenarios = raw.scenarios as Array<Record<string, unknown>>;
        const [nominal, fouling] = scenarios;
        expect(() => parseSpec({ ...raw, scenarios: [{ ...nominal, inject: fouling.inject }] })).toThrow(/spec\.scenarios\[0\]\.expect/);
        expect(() => parseSpec({ ...raw, scenarios: [{ ...fouling, inject: [] }] })).toThrow(/spec\.scenarios\[0\]\.expect/);
        expect(() => parseSpec({ ...raw, scenarios: [{ ...fouling, expect: { alarmWithin: 55 } }] })).toThrow(/alarmWithin/);
        expect(() => parseSpec({ ...raw, scenarios: [nominal, { ...fouling, name: "nominal" }] })).toThrow(/duplicate scenario/);
        expect(() => parseSpec({ ...raw, run: { dt: 0.01, cycle: 0.001 } })).toThrow(SpecError);
    });
});

describe("the T0 chain on the RS-385 twin: sweep, fit, evaluate", () => {
    const registry = buildJobRegistry();
    const dir = tempDir();
    const log = (): void => undefined;

    // 1. sweep: four operating points, enough for an affine fit inside the domain.
    const sweepRaw = readJson(path.join(SPECS, "rs385-drive.json"));
    const sweep = parseSpec({ ...sweepRaw, grid: [{ node: "drive", property: "value", values: [4, 7, 10, 12] }] }) as SweepSpec;
    const sweepReport = runSweep(sweep, { registry, specDir: SPECS, outDir: path.join(dir, "sweep"), log, factoryVersion: "test" });

    // 2. fit: the twin's health model, with the shipped monitor block.
    const fitRaw = readJson(path.join(SPECS, "scrubber-health-twin.json"));
    const fit = parseSpec({ ...fitRaw, dataset: { ...(fitRaw.dataset as object), file: path.join(dir, "sweep", "summary.json") } }) as FitSpec;
    const fitReport = runFit(fit, { specDir: SPECS, outDir: path.join(dir, "fit"), log, factoryVersion: "test" });

    // 3. evaluate: the artifact against the oracle.
    const evalRaw = readJson(EVAL_SPEC);
    const artifact = { file: path.join(dir, "fit", "scrubber_health.onnx"), contract: path.join(dir, "fit", "contract.json") };
    const evaluate = parseSpec({ ...evalRaw, artifact }) as EvaluateSpec;
    const report = runEvaluate(evaluate, { registry, specDir: SPECS, outDir: path.join(dir, "eval"), log, factoryVersion: "test" });

    it("fitted the twin and judged the artifact the contract describes", () => {
        expect(sweepReport.points).toHaveLength(4);
        expect(fitReport.parity.ok).toBe(true);
        expect(report.artifactSha256).toBe(fitReport.sha256);
    });

    it("stays silent at rest and raises the alarm one debounce after the load is doubled", () => {
        const [nominal, fouling] = report.scenarios;
        expect(nominal).toMatchObject({ name: "nominal", firstAlarmAt: null, pass: true });
        expect(fouling).toMatchObject({ name: "fouling-x2", injectedAt: 10, firstAlarmAt: 40, delay: 30, pass: true });
        expect(report.verdict).toBe("pass");
        expect(report.confusion).toEqual({ truePositives: 1, falseNegatives: 0, falsePositives: 0, trueNegatives: 1 });
    });

    it("writes the report, one trace per scenario and a manifest whose report id is the report's digest", () => {
        const outDir = path.join(dir, "eval");
        for (const name of ["report.json", "manifest.json", path.join("trace", "nominal.jsonl"), path.join("trace", "fouling-x2.jsonl")]) {
            expect(fs.existsSync(path.join(outDir, name))).toBe(true);
        }
        const digest = crypto
            .createHash("sha256")
            .update(fs.readFileSync(path.join(outDir, "report.json")))
            .digest("hex");
        expect(report.reportId).toBe(digest);
        const manifest = readJson(path.join(outDir, "manifest.json")) as { reportId: string; verdict: string; inputs: { artifact: { sha256: string } } };
        expect(manifest.reportId).toBe(digest);
        expect(manifest.verdict).toBe("pass");
        expect(manifest.inputs.artifact.sha256).toBe(fitReport.sha256);
        const trace = fs
            .readFileSync(path.join(outDir, "trace", "fouling-x2.jsonl"), "utf8")
            .trim()
            .split(/\r?\n/)
            .map((l) => JSON.parse(l) as { t: number; residual: number; alarm: boolean });
        expect(trace.filter((c) => c.alarm)).toHaveLength(1);
        expect(trace.find((c) => c.t === 12)!.residual).toBeGreaterThan(0.04);
        expect(trace.find((c) => c.t === 9)!.residual).toBeLessThan(0.04);
    });

    it("returns a negative verdict as a result, not an error, when the deadline is shorter than the debounce", () => {
        const tight = parseSpec({
            ...evalRaw,
            artifact,
            scenarios: [{ ...(evalRaw.scenarios as Array<Record<string, unknown>>)[1], expect: { alarmWithin: 20 } }],
        }) as EvaluateSpec;
        const r = runEvaluate(tight, { registry, specDir: SPECS, outDir: path.join(dir, "eval-tight"), log, factoryVersion: "test" });
        expect(r.verdict).toBe("fail");
        expect(r.scenarios[0].reason).toMatch(/past the deadline/);
        expect(r.confusion).toEqual({ truePositives: 0, falseNegatives: 1, falsePositives: 0, trueNegatives: 0 });
    });

    it("refuses a contract that does not describe the artifact", () => {
        const contract = readJson(artifact.contract);
        const forged = path.join(dir, "forged-contract.json");
        fs.writeFileSync(forged, JSON.stringify({ ...contract, sha256: "0".repeat(64) }));
        const spec = parseSpec({ ...evalRaw, artifact: { ...artifact, contract: forged } }) as EvaluateSpec;
        expect(() => runEvaluate(spec, { registry, specDir: SPECS, outDir: path.join(dir, "eval-forged"), log, factoryVersion: "test" })).toThrow(EvaluateError);
        expect(() => runEvaluate(spec, { registry, specDir: SPECS, outDir: path.join(dir, "eval-forged"), log, factoryVersion: "test" })).toThrow(
            /not the artifact the contract describes/
        );
    });
});
