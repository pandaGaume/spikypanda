/**
 * The `fit` job: a dataset of steady-state (duty, current) pairs in, a model
 * the device can load out, with everything the push needs to trust it.
 *
 *   1. read the rows, take the two columns, rescale them to physical units,
 *   2. normalise with the device's full scales, keep the rows inside the
 *      validity domain (below it the machine is stopped or starting and the
 *      friction term has no meaning),
 *   3. least squares on what is left,
 *   4. serialize the model with the runtime's own ONNX writer,
 *   5. parity: parse the bytes back and run them through the runtime's ONNX
 *      engine on every kept row, against the closed form in double
 *      precision. The artifact must compute what was fitted, or nothing is
 *      written as trusted.
 *
 * The contract (`contract.json`) is written in the vocabulary of
 * `OnnxModelGraph.loadModelValidated`: sha256, expected input shape, output
 * count and shape, so the station can push the file with the same checks
 * the device applies. The full scales and the validity domain ride along
 * because the device declares them on its side and they must agree.
 */
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { columnValues, readRows } from "./dataset.js";
import { fitAffine, HEALTH_INPUT, HEALTH_INPUT_SHAPE, HEALTH_OUTPUT, HEALTH_OUTPUT_SHAPE, predictHealth, runHealthModel, serializeHealthModel } from "./health-model.js";
import type { AffineCoefficients } from "./health-model.js";
import { JobWriter, sha256File } from "./outputs.js";
import type { FitSpec } from "./spec.js";

export interface FitContext {
    readonly specDir: string;
    readonly outDir: string;
    readonly log: (line: string) => void;
    readonly gitSha?: string;
    readonly factoryVersion: string;
}

/** A row of the fit table: what the model would say about each kept measurement. */
export interface FitRow {
    readonly dutyN: number;
    readonly measuredN: number;
    readonly expectedN: number;
    readonly residualN: number;
}

export interface FitQuality {
    readonly rows: number;
    readonly kept: number;
    readonly excluded: number;
    readonly rmse: number;
    /** The largest residual on the kept rows: an alarm threshold has to clear it. */
    readonly worstCaseError: number;
}

export interface ParityReport {
    readonly rows: number;
    readonly maxAbsError: number;
    readonly tolerance: number;
    readonly ok: boolean;
}

export interface FitReport {
    readonly name: string;
    readonly outDir: string;
    readonly coefficients: AffineCoefficients;
    readonly quality: FitQuality;
    readonly parity: ParityReport;
    readonly sha256: string;
    readonly files: ReadonlyArray<string>;
    readonly wallMs: number;
}

export interface FitPlan {
    readonly dataset: string;
    readonly rows: number;
    readonly kept: number;
    readonly excluded: number;
}

/** float32 evaluation of an affine model against its double closed form: rounding, never more. */
export const PARITY_TOLERANCE = 1e-6;

export class FitError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "FitError";
    }
}

/** Same rule as graphs: absolute, then next to the spec, then the working directory. */
export function resolveDatasetPath(spec: FitSpec, specDir: string): string {
    const file = spec.dataset.file;
    if (path.isAbsolute(file)) return file;
    const bySpec = path.resolve(specDir, file);
    if (fs.existsSync(bySpec)) return bySpec;
    const byCwd = path.resolve(file);
    return fs.existsSync(byCwd) ? byCwd : bySpec;
}

interface Prepared {
    readonly datasetPath: string;
    readonly rows: number;
    readonly dutyN: number[];
    readonly currentN: number[];
    readonly excluded: number;
}

function prepare(spec: FitSpec, specDir: string): Prepared {
    const datasetPath = resolveDatasetPath(spec, specDir);
    const rows = readRows(datasetPath);
    if (rows.length === 0) throw new FitError(`${path.basename(datasetPath)} has no rows`);
    const duty = columnValues(rows, spec.dataset.duty, "duty");
    const current = columnValues(rows, spec.dataset.current, "current");
    const dutyN: number[] = [];
    const currentN: number[] = [];
    let excluded = 0;
    for (let i = 0; i < rows.length; i++) {
        const d = duty[i] / spec.fullScale.duty;
        if (d < spec.domain.dutyMin || d > spec.domain.dutyMax) {
            excluded++;
            continue;
        }
        dutyN.push(d);
        currentN.push(current[i] / spec.fullScale.current);
    }
    return { datasetPath, rows: rows.length, dutyN, currentN, excluded };
}

export function planFit(spec: FitSpec, ctx: Pick<FitContext, "specDir">): FitPlan {
    const p = prepare(spec, ctx.specDir);
    return { dataset: p.datasetPath, rows: p.rows, kept: p.dutyN.length, excluded: p.excluded };
}

export function runFit(spec: FitSpec, ctx: FitContext): FitReport {
    const started = Date.now();
    const p = prepare(spec, ctx.specDir);
    if (p.dutyN.length < 2) {
        throw new FitError(`${p.dutyN.length} row(s) inside the validity domain [${spec.domain.dutyMin}, ${spec.domain.dutyMax}] of ${p.rows}; the fit needs at least 2`);
    }
    ctx.log(`${spec.name}: ${p.rows} row(s) in ${path.basename(p.datasetPath)}, ${p.dutyN.length} inside the domain, ${p.excluded} excluded`);

    let coefficients: AffineCoefficients;
    try {
        coefficients = fitAffine(p.dutyN, p.currentN);
    } catch (e) {
        throw new FitError((e as Error).message);
    }

    // The ONNX absolute value is relu(d) + relu(-d) and `expected` passes
    // through a Relu, so the file computes what was fitted only where the
    // line stays non-negative. Affine, so the two ends of the domain decide.
    const atMin = predictHealth(coefficients, spec.domain.dutyMin, 0).expected;
    const atMax = predictHealth(coefficients, spec.domain.dutyMax, 0).expected;
    if (atMin < 0 || atMax < 0) {
        throw new FitError(
            `the fitted line is negative inside the domain (expected ${atMin.toExponential(3)} at dutyMin, ${atMax.toExponential(3)} at dutyMax); ` +
                "the affine-residual family cannot represent it: raise domain.dutyMin or revisit the full scales"
        );
    }
    const overRange = p.currentN.filter((c) => c > 1).length;
    if (overRange > 0) ctx.log(`warning: ${overRange} row(s) have a normalised current above 1: fullScale.current (${spec.fullScale.current}) is below what this machine draws`);

    const table: FitRow[] = [];
    let sumSq = 0;
    let worst = 0;
    for (let i = 0; i < p.dutyN.length; i++) {
        const { expected, residual } = predictHealth(coefficients, p.dutyN[i], p.currentN[i]);
        table.push({ dutyN: p.dutyN[i], measuredN: p.currentN[i], expectedN: expected, residualN: residual });
        sumSq += residual * residual;
        if (residual > worst) worst = residual;
    }
    const quality: FitQuality = { rows: p.rows, kept: p.dutyN.length, excluded: p.excluded, rmse: Math.sqrt(sumSq / p.dutyN.length), worstCaseError: worst };
    // The alarm threshold has to clear the model's own imperfection, or the
    // alarm would ring because of the model and not because of the machine.
    // The job neither chooses nor corrects the threshold: it checks and copies it.
    const threshold = spec.monitor.residual.threshold;
    if (threshold <= worst) {
        throw new FitError(
            `monitor.residual.threshold (${threshold}) does not clear the model's worst-case error on the fit points (${worst.toExponential(3)} normalised current); ` +
                "an alarm set below the model's error rings because of the model, not the machine: raise the threshold, or improve the model"
        );
    }
    ctx.log(
        `expected = ${coefficients.intercept.toFixed(5)} + ${coefficients.slope.toFixed(5)} * duty_n; rmse ${quality.rmse.toExponential(3)}, worst-case error ${worst.toExponential(3)} (normalised current)`
    );

    const bytes = serializeHealthModel(coefficients);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

    // Parity: the artifact, through the runtime's own engine, against the closed form.
    const predictions = runHealthModel(
        bytes,
        table.map((r) => [r.dutyN, r.measuredN, 0] as const)
    );
    let maxAbsError = 0;
    for (let i = 0; i < table.length; i++) {
        maxAbsError = Math.max(maxAbsError, Math.abs(predictions[i].expected - table[i].expectedN), Math.abs(predictions[i].residual - table[i].residualN));
    }
    const parity: ParityReport = { rows: table.length, maxAbsError, tolerance: PARITY_TOLERANCE, ok: maxAbsError <= PARITY_TOLERANCE };
    ctx.log(`parity through the ONNX engine: max |error| ${maxAbsError.toExponential(3)} on ${table.length} row(s), ${parity.ok ? "ok" : "FAILED"}`);
    if (!parity.ok) throw new FitError(`the serialized model does not reproduce the fit: max |error| ${maxAbsError} > ${PARITY_TOLERANCE}`);

    const writer = new JobWriter(ctx.outDir);
    const onnxPath = path.join(ctx.outDir, spec.outputs.file);
    fs.writeFileSync(onnxPath, bytes);
    writer.files.push(spec.outputs.file);
    if (sha256File(onnxPath) !== sha256) throw new FitError("the file on disk does not hash to the bytes that passed parity");

    const contract = {
        name: spec.name,
        model: spec.model,
        file: spec.outputs.file,
        bytes: bytes.length,
        sha256,
        // The vocabulary of OnnxModelGraph.loadModelValidated, so the push can pass it through.
        expectInputShape: [...HEALTH_INPUT_SHAPE],
        expectOutputCount: 1,
        expectOutputShape: [...HEALTH_OUTPUT_SHAPE],
        inputNames: [HEALTH_INPUT],
        outputNames: [HEALTH_OUTPUT],
        ops: ["Gemm", "Relu", "Gemm"],
        opset: 13,
        // What the device declares on its side; the model is meaningless with other scales.
        features: [
            { name: "motor/speed", scale: 1 / spec.fullScale.duty, offset: 0, validMin: spec.domain.dutyMin, validMax: spec.domain.dutyMax },
            { name: "motor/current", scale: 1 / spec.fullScale.current, offset: 0 },
            { name: "motor/senseSpan", scale: 1 / spec.fullScale.senseSpan, offset: 0, note: "carried with zero weight by this family" },
        ],
        outputs: [
            { index: 0, name: "expected", unit: "normalised current" },
            { index: 1, name: "residual", unit: "normalised current", alarm: spec.monitor.residual.alarm },
        ],
        // Copied verbatim from the monitor's specification (decision 3): the
        // thresholds live here, and evaluate judges against them.
        monitor: spec.monitor,
        coefficients,
        fit: quality,
        parity,
        producer: `spikypanda-factory ${ctx.factoryVersion}`,
    };
    writer.writeJson("contract.json", contract);
    writer.writeJson("fit-report.json", { coefficients, quality, table });
    writer.writeCsv(
        "fit-report.csv",
        ["duty_n", "measured_n", "expected_n", "residual_n"],
        table.map((r) => ({ duty_n: r.dutyN, measured_n: r.measuredN, expected_n: r.expectedN, residual_n: r.residualN }))
    );
    writer.writeJson("parity.json", parity);

    const finished = Date.now();
    writer.writeJson("manifest.json", {
        name: spec.name,
        job: spec.job,
        spec,
        dataset: { path: p.datasetPath, sha256: sha256File(p.datasetPath), rows: p.rows },
        model: { file: spec.outputs.file, sha256, bytes: bytes.length },
        started: new Date(started).toISOString(),
        finished: new Date(finished).toISOString(),
        wallMs: finished - started,
        versions: { factory: ctx.factoryVersion, node: process.version, gitSha: ctx.gitSha },
        files: [...writer.files, "manifest.json"],
    });

    return { name: spec.name, outDir: ctx.outDir, coefficients, quality, parity, sha256, files: writer.files, wallMs: finished - started };
}
