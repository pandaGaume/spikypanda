/**
 * The `fit` job: dataset in, the scrubber health model out.
 *
 * Two lines are held here. The arithmetic one: the file computes what was
 * fitted, through the runtime's own ONNX engine, to float32 rounding. The
 * interface one: the file has the same graph, weights and tensor names as the
 * one the scrubber firmware's generator writes for the same points
 * (`fixtures/scrubber_health.reference.onnx`), so the device loads it without
 * a change on its side.
 */
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { OnnxParser } from "spikypanda-onnx";
import { fitAffine, parseSpec, predictHealth, runFit, runHealthModel, serializeHealthModel, FitError, SpecError, DatasetError, readRows } from "spikypanda-factory";
import type { FitSpec } from "spikypanda-factory";

const SPECS = path.resolve(__dirname, "../../dev/factory/specs");
const BENCH_SPEC = path.join(SPECS, "scrubber-health-bench.json");
const REFERENCE = path.join(__dirname, "fixtures", "scrubber_health.reference.onnx");

function loadSpec(file: string): FitSpec {
    const spec = parseSpec(JSON.parse(fs.readFileSync(file, "utf8")));
    if (spec.job !== "fit") throw new Error("expected a fit spec");
    return spec;
}

function tempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "spikypanda-fit-"));
}

/** Float32 values of an initializer, whichever field the writer used. */
function weights(t: { floatData?: Float32Array; rawData?: Uint8Array }): number[] {
    if (t.floatData) return [...t.floatData];
    const raw = t.rawData!;
    return [...new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength))];
}

describe("affine fit and closed form", () => {
    it("recovers a known line exactly", () => {
        const duty = [0.2, 0.4, 0.6, 0.8];
        const current = duty.map((d) => 0.09 + 0.15 * d);
        const c = fitAffine(duty, current);
        expect(c.slope).toBeCloseTo(0.15, 12);
        expect(c.intercept).toBeCloseTo(0.09, 12);
        expect(predictHealth(c, 0.5, 0.2).residual).toBeCloseTo(Math.abs(0.09 + 0.075 - 0.2), 12);
    });

    it("refuses points that all share one duty", () => {
        expect(() => fitAffine([0.3, 0.3], [0.1, 0.2])).toThrow(/same duty/);
    });
});

describe("health model bytes", () => {
    const c = { slope: 0.1611, intercept: 0.0879 };
    const bytes = serializeHealthModel(c);

    it("parse back to Gemm, Relu, Gemm on `features` [1,3] -> `health` [1,2]", () => {
        const parsed = OnnxParser.parse(bytes)!;
        expect(parsed).not.toBeNull();
        expect(parsed.nodes.map((n) => n.opType)).toEqual(["Gemm", "Relu", "Gemm"]);
        expect(parsed.inputs.map((i) => [i.name, i.shape])).toEqual([["features", [1, 3]]]);
        expect(parsed.outputs.map((o) => [o.name, o.shape])).toEqual([["health", [1, 2]]]);
        expect(parsed.initializers.map((t) => [t.name, t.dims])).toEqual([
            ["w1", [4, 3]],
            ["b1", [4]],
            ["w2", [2, 4]],
            ["b2", [2]],
        ]);
    });

    it("compute the closed form through the ONNX engine, on both sides of the line", () => {
        const rows = [
            [0.15, 0.1054, 0],
            [0.55, 0.17, 0],
            [0.5, 0.4, 0], // draws far too much: residual = current - expected
            [0.5, 0.05, 0], // draws far too little: residual = expected - current
        ] as const;
        const out = runHealthModel(bytes, rows);
        rows.forEach(([d, i], k) => {
            const ref = predictHealth(c, d, i);
            expect(out[k].expected).toBeCloseTo(ref.expected, 6);
            expect(out[k].residual).toBeCloseTo(ref.residual, 6);
        });
    });

    it("carry the same graph, weights and interface as the firmware's generator for the bench points", () => {
        const reference = OnnxParser.parse(new Uint8Array(fs.readFileSync(REFERENCE)))!;
        const bench = fitAffine([0.15, 0.25, 0.35, 0.45, 0.55], [0.1054, 0.1312, 0.1515, 0.1631, 0.17]);
        const ours = OnnxParser.parse(serializeHealthModel(bench))!;
        expect(ours.graphName).toBe(reference.graphName);
        expect(ours.nodes.map((n) => [n.opType, n.inputs, n.outputs, n.attributes.get("transB")])).toEqual(
            reference.nodes.map((n) => [n.opType, n.inputs, n.outputs, n.attributes.get("transB")])
        );
        expect(ours.inputs).toEqual(reference.inputs);
        expect(ours.outputs).toEqual(reference.outputs);
        expect(ours.initializers.map((t) => t.name)).toEqual(reference.initializers.map((t) => t.name));
        ours.initializers.forEach((t, k) => {
            const r = reference.initializers[k];
            expect(t.dims).toEqual(r.dims);
            const a = weights(t);
            const b = weights(r);
            expect(a).toHaveLength(b.length);
            a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));
        });
        // The generator prints these to two places; the fixture README keeps the command.
        expect(bench.slope).toBeCloseTo(0.1611, 4);
        expect(bench.intercept).toBeCloseTo(0.0879, 4);
    });
});

describe("fit job on the bench dataset", () => {
    const spec = loadSpec(BENCH_SPEC);
    const outDir = tempDir();
    const log: string[] = [];
    const report = runFit(spec, { specDir: SPECS, outDir, log: (l) => log.push(l), factoryVersion: "test" });

    it("writes the model, the contract, the fit report, the parity and the manifest", () => {
        for (const name of ["scrubber_health.onnx", "contract.json", "fit-report.json", "fit-report.csv", "parity.json", "manifest.json"]) {
            expect(fs.existsSync(path.join(outDir, name))).toBe(true);
        }
        expect(report.quality).toMatchObject({ rows: 5, kept: 5, excluded: 0 });
        expect(report.quality.worstCaseError).toBeLessThan(0.01);
        expect(report.parity.ok).toBe(true);
        expect(report.parity.maxAbsError).toBeLessThan(1e-6);
    });

    it("writes a contract in the vocabulary of loadModelValidated, with the file's own digest", () => {
        const contract = JSON.parse(fs.readFileSync(path.join(outDir, "contract.json"), "utf8")) as Record<string, unknown>;
        expect(contract.sha256).toBe(report.sha256);
        expect(contract.expectInputShape).toEqual([1, 3]);
        expect(contract.expectOutputCount).toBe(1);
        expect(contract.expectOutputShape).toEqual([1, 2]);
        expect(contract.inputNames).toEqual(["features"]);
        expect(contract.outputNames).toEqual(["health"]);
        const features = contract.features as Array<{ name: string; scale: number; validMin?: number }>;
        expect(features.map((f) => f.name)).toEqual(["motor/speed", "motor/current", "motor/senseSpan"]);
        expect(features[0].scale).toBeCloseTo(0.01, 12);
        expect(features[0].validMin).toBe(0.15);
        // Decision 3: the thresholds live in the monitor's specification and are copied verbatim.
        expect(contract.monitor).toEqual({ residual: { threshold: 0.04, debounceCycles: 30, severity: 350, alarm: "drift.current" } });
        const outputs = contract.outputs as Array<{ name: string; alarm?: string }>;
        expect(outputs[1]).toMatchObject({ name: "residual", alarm: "drift.current" });
        const onDisk = fs.readFileSync(path.join(outDir, "scrubber_health.onnx"));
        const digest = crypto.createHash("sha256").update(onDisk).digest("hex");
        expect(digest).toBe(report.sha256);
    });

    it("keeps the fit table readable", () => {
        const csv = fs.readFileSync(path.join(outDir, "fit-report.csv"), "utf8").trim().split("\n");
        expect(csv[0]).toBe("duty_n,measured_n,expected_n,residual_n");
        expect(csv).toHaveLength(6);
        expect(log.some((l) => l.includes("parity through the ONNX engine"))).toBe(true);
    });
});

describe("fit job refusals", () => {
    const spec = loadSpec(BENCH_SPEC);

    function withDataset(csv: string, patch: Partial<FitSpec> = {}): { spec: FitSpec; dir: string } {
        const dir = tempDir();
        fs.writeFileSync(path.join(dir, "data.csv"), csv);
        return { spec: { ...spec, ...patch, dataset: { ...spec.dataset, file: path.join(dir, "data.csv") } }, dir };
    }

    it("reads CSV, JSON lines and JSON arrays alike", () => {
        const dir = tempDir();
        fs.writeFileSync(path.join(dir, "a.csv"), 'duty,"cur rent"\n15,0.1\n25,0.2\n');
        fs.writeFileSync(path.join(dir, "a.jsonl"), '{"duty":15,"cur rent":0.1}\n{"duty":25,"cur rent":0.2}\n');
        fs.writeFileSync(path.join(dir, "a.json"), '[{"duty":15,"cur rent":0.1},{"duty":25,"cur rent":0.2}]');
        for (const f of ["a.csv", "a.jsonl", "a.json"])
            expect(readRows(path.join(dir, f))).toEqual([
                { duty: 15, "cur rent": 0.1 },
                { duty: 25, "cur rent": 0.2 },
            ]);
    });

    it("refuses a dataset with fewer than two rows inside the domain", () => {
        const { spec: s, dir } = withDataset("duty_percent,current_amps\n10,0.1\n12,0.11\n30,0.15\n");
        expect(() => runFit(s, { specDir: dir, outDir: dir, log: () => undefined, factoryVersion: "test" })).toThrow(FitError);
        expect(() => runFit(s, { specDir: dir, outDir: dir, log: () => undefined, factoryVersion: "test" })).toThrow(/needs at least 2/);
    });

    it("refuses a line that goes negative inside the domain, since the file could not compute it", () => {
        const { spec: s, dir } = withDataset("duty_percent,current_amps\n40,0.10\n60,0.30\n80,0.50\n");
        expect(() => runFit(s, { specDir: dir, outDir: dir, log: () => undefined, factoryVersion: "test" })).toThrow(/negative inside the domain/);
    });

    it("refuses a missing column with the row number and the columns it saw", () => {
        const { spec: s, dir } = withDataset("duty_percent,amps\n15,0.1\n25,0.2\n");
        expect(() => runFit(s, { specDir: dir, outDir: dir, log: () => undefined, factoryVersion: "test" })).toThrow(DatasetError);
        expect(() => runFit(s, { specDir: dir, outDir: dir, log: () => undefined, factoryVersion: "test" })).toThrow(/row 1 .*"current_amps".*columns: duty_percent, amps/);
    });

    it("refuses a threshold that does not clear the model's worst-case error, and accepts one that does", () => {
        const { spec: s, dir } = withDataset(["duty_percent,current_amps", "15,0.1054", "25,0.1312", "35,0.1515", "45,0.1631", "55,0.1700", ""].join("\n"));
        // Worst-case error on these points is 7.3 mA; 0.005 (5 mA) sits below it.
        const low: FitSpec = { ...s, monitor: { residual: { ...s.monitor.residual, threshold: 0.005 } } };
        expect(() => runFit(low, { specDir: dir, outDir: path.join(dir, "low"), log: () => undefined, factoryVersion: "test" })).toThrow(FitError);
        expect(() => runFit(low, { specDir: dir, outDir: path.join(dir, "low"), log: () => undefined, factoryVersion: "test" })).toThrow(
            /does not clear the model's worst-case error/
        );
        expect(fs.existsSync(path.join(dir, "low", "scrubber_health.onnx"))).toBe(false);
        const report = runFit(s, { specDir: dir, outDir: path.join(dir, "ok"), log: () => undefined, factoryVersion: "test" });
        expect(report.quality.worstCaseError).toBeLessThan(0.04);
    });

    it("refuses a spec without a monitor block, or with a malformed one, naming the path", () => {
        const raw = JSON.parse(fs.readFileSync(BENCH_SPEC, "utf8")) as Record<string, unknown>;
        const { monitor: _monitor, ...without } = raw;
        void _monitor;
        expect(() => parseSpec(without)).toThrow(/spec\.monitor/);
        expect(() => parseSpec({ ...raw, monitor: { residual: { threshold: 0.04, debounceCycles: 2.5, severity: 350, alarm: "drift.current" } } })).toThrow(
            /spec\.monitor\.residual\.debounceCycles/
        );
        expect(() => parseSpec({ ...raw, monitor: { residual: { threshold: 0, debounceCycles: 30, severity: 350, alarm: "drift.current" } } })).toThrow(
            /spec\.monitor\.residual\.threshold/
        );
    });

    it("refuses a spec whose output is not a plain .onnx name or whose domain is inverted", () => {
        const raw = JSON.parse(fs.readFileSync(BENCH_SPEC, "utf8")) as Record<string, unknown>;
        expect(() => parseSpec({ ...raw, outputs: { file: "../model.onnx" } })).toThrow(SpecError);
        expect(() => parseSpec({ ...raw, domain: { dutyMin: 0.8, dutyMax: 0.2 } })).toThrow(/spec\.domain/);
        expect(() => parseSpec({ ...raw, model: "mlp" })).toThrow(/spec\.model/);
    });
});
