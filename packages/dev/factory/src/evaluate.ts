/**
 * The `evaluate` job, first form: a monitor judged against the oracle
 * (docs/architecture/usine-jobs.fr.md, 3.3.1).
 *
 * The artifact is run as the device runs it: the bytes, through the
 * runtime's ONNX engine, once per cycle, on the command and the mean current
 * of the cycle, normalised with the scales the contract declares; then the
 * alarm rule the contract declares (threshold, debounce, validity domain).
 * Nothing here knows the closed form of the model: if the file were wrong,
 * the verdict would say so.
 *
 * A scenario is the oracle's side: a graph at an operating point, faults
 * injected at instants, and what the monitor is expected to do. The
 * thresholds come from the contract; the reaction time comes from the
 * scenario, because it is an operating requirement, not a property of the
 * monitor. A negative verdict is a result, not an error.
 */
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { applySetting, instantiateDocument, readDocument, readNumber, DocumentError } from "./document.js";
import type { LoadedDocument } from "./document.js";
import { HEALTH_INPUT, HEALTH_INPUT_SHAPE, HEALTH_OUTPUT, HEALTH_OUTPUT_SHAPE, loadHealthModel } from "./health-model.js";
import type { NodeRegistry } from "spikypanda-core";
import { JobWriter, sha256File } from "./outputs.js";
import type { EvaluateSpec, GraphQuantity, MonitorSpec, Scenario } from "./spec.js";

export interface EvaluateContext {
    readonly registry: NodeRegistry;
    readonly specDir: string;
    readonly outDir: string;
    readonly log: (line: string) => void;
    readonly gitSha?: string;
    readonly factoryVersion: string;
}

export class EvaluateError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "EvaluateError";
    }
}

/** The part of `contract.json` this job reads; anything else in the file is carried, not interpreted. */
interface MonitorContract {
    sha256: string;
    expectInputShape: number[];
    expectOutputCount: number;
    expectOutputShape: number[];
    features: Array<{ name: string; scale: number; offset?: number; validMin?: number; validMax?: number }>;
    monitor: MonitorSpec;
}

/** One evaluated cycle, as written to the trace. */
export interface CycleRecord {
    readonly t: number;
    readonly duty: number;
    readonly current: number;
    readonly dutyN: number;
    readonly currentN: number;
    readonly inDomain: boolean;
    readonly expected: number | null;
    readonly residual: number | null;
    readonly above: boolean;
    readonly count: number;
    readonly alarm: boolean;
}

export interface ScenarioResult {
    readonly name: string;
    readonly duration: number;
    readonly injectedAt: number | null;
    readonly expect: Scenario["expect"];
    readonly firstAlarmAt: number | null;
    /** Seconds from the (last) injection to the first alarm; null without alarm or without injection. */
    readonly delay: number | null;
    readonly cyclesEvaluated: number;
    readonly cyclesOutOfDomain: number;
    readonly pass: boolean;
    readonly reason: string;
}

export interface ConfusionCounts {
    /** Fault scenarios with an alarm inside the deadline and none before the injection. */
    readonly truePositives: number;
    /** Fault scenarios without an alarm inside the deadline. */
    readonly falseNegatives: number;
    /** Nominal scenarios with an alarm, plus fault scenarios with an alarm before the injection. */
    readonly falsePositives: number;
    /** Nominal scenarios that stayed silent. */
    readonly trueNegatives: number;
}

export interface EvaluateReport {
    readonly name: string;
    readonly outDir: string;
    readonly verdict: "pass" | "fail";
    readonly scenarios: ReadonlyArray<ScenarioResult>;
    readonly confusion: ConfusionCounts;
    readonly artifactSha256: string;
    /** sha256 of report.json: what a registration at Tier 2 refers to. */
    readonly reportId: string;
    readonly files: ReadonlyArray<string>;
    readonly wallMs: number;
}

export interface EvaluatePlan {
    readonly artifact: string;
    readonly contract: string;
    readonly graph: string;
    readonly scenarios: number;
    readonly simulatedSeconds: number;
    readonly ticks: number;
}

/** Absolute, then next to the spec, then the working directory (the same rule as graphs and datasets). */
function resolveInput(file: string, specDir: string): string {
    if (path.isAbsolute(file)) return file;
    const bySpec = path.resolve(specDir, file);
    if (fs.existsSync(bySpec)) return bySpec;
    const byCwd = path.resolve(file);
    return fs.existsSync(byCwd) ? byCwd : bySpec;
}

function readContract(file: string): MonitorContract {
    let raw: unknown;
    try {
        raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
        throw new EvaluateError(`cannot read the contract ${file}: ${(e as Error).message}`);
    }
    const c = raw as Partial<MonitorContract>;
    const shape = (x: unknown): x is number[] => Array.isArray(x) && x.every((v) => typeof v === "number");
    if (typeof c.sha256 !== "string" || !shape(c.expectInputShape) || typeof c.expectOutputCount !== "number" || !shape(c.expectOutputShape)) {
        throw new EvaluateError(`${path.basename(file)}: missing sha256, expectInputShape, expectOutputCount or expectOutputShape`);
    }
    if (!Array.isArray(c.features) || c.features.length < 2) throw new EvaluateError(`${path.basename(file)}: expected at least two features (duty, current)`);
    const r = c.monitor?.residual;
    if (!r || typeof r.threshold !== "number" || typeof r.debounceCycles !== "number") {
        throw new EvaluateError(`${path.basename(file)}: missing monitor.residual.threshold or monitor.residual.debounceCycles; the thresholds live in the contract`);
    }
    return c as MonitorContract;
}

/** The artifact must be the one the contract describes, and shaped as this family expects. */
function checkArtifact(bytes: Uint8Array, contract: MonitorContract, artifactPath: string): string {
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    if (digest !== contract.sha256.toLowerCase()) {
        throw new EvaluateError(
            `${path.basename(artifactPath)} hashes to ${digest.slice(0, 12)}..., the contract says ${contract.sha256.slice(0, 12)}...: not the artifact the contract describes`
        );
    }
    const same = (a: number[], b: readonly number[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
    if (!same(contract.expectInputShape, HEALTH_INPUT_SHAPE) || contract.expectOutputCount !== 1 || !same(contract.expectOutputShape, HEALTH_OUTPUT_SHAPE)) {
        throw new EvaluateError(
            `the contract's shapes are not those of the affine-residual family (${HEALTH_INPUT} ${JSON.stringify(HEALTH_INPUT_SHAPE)} -> ${HEALTH_OUTPUT} ${JSON.stringify(HEALTH_OUTPUT_SHAPE)})`
        );
    }
    return digest;
}

function readQuantity(loaded: LoadedDocument, q: GraphQuantity): number {
    return readNumber(loaded, q.node, q.property) * q.scale + q.offset;
}

interface ScenarioRun {
    readonly result: ScenarioResult;
    readonly trace: CycleRecord[];
}

function runScenario(
    spec: EvaluateSpec,
    scenario: Scenario,
    ctx: EvaluateContext,
    doc: ReturnType<typeof readDocument>,
    bytes: Uint8Array,
    contract: MonitorContract
): ScenarioRun {
    const loaded = instantiateDocument(doc, ctx.registry);
    if (loaded.missingTypeIds.length > 0) throw new DocumentError(`the registry cannot resolve: ${loaded.missingTypeIds.join(", ")}`);
    for (const s of spec.operatingPoint) applySetting(loaded, s);
    // The operating point may include initial states: the scenario starts from them.
    loaded.session.reset();

    const { dt, cycle, settle } = spec.run;
    const ticks = Math.round(scenario.duration / dt);
    const ticksPerCycle = Math.max(1, Math.round(cycle / dt));
    const dutyFeature = contract.features[0];
    const currentFeature = contract.features[1];
    const { threshold, debounceCycles } = contract.monitor.residual;
    const injections = [...scenario.inject].sort((a, b) => a.at - b.at);
    let nextInjection = 0;
    const model = loadHealthModel(bytes);

    const trace: CycleRecord[] = [];
    let sumCurrent = 0;
    let inCycle = 0;
    let count = 0;
    let firstAlarmAt: number | null = null;
    let cyclesEvaluated = 0;
    let cyclesOutOfDomain = 0;

    for (let k = 0; k < ticks; k++) {
        const t = k * dt;
        while (nextInjection < injections.length && injections[nextInjection].at <= t) {
            applySetting(loaded, injections[nextInjection]);
            nextInjection++;
        }
        loaded.session.run(t);
        sumCurrent += readQuantity(loaded, spec.features.current);
        inCycle++;
        if (inCycle < ticksPerCycle) continue;

        // End of a cycle: the monitor runs on the command of the moment and the mean current of the cycle.
        const tCycle = (k + 1) * dt;
        const duty = readQuantity(loaded, spec.features.duty);
        const current = sumCurrent / inCycle;
        sumCurrent = 0;
        inCycle = 0;
        if (tCycle < settle) continue;

        const dutyN = duty * dutyFeature.scale + (dutyFeature.offset ?? 0);
        const currentN = current * currentFeature.scale + (currentFeature.offset ?? 0);
        const inDomain = (dutyFeature.validMin === undefined || dutyN >= dutyFeature.validMin) && (dutyFeature.validMax === undefined || dutyN <= dutyFeature.validMax);
        let expected: number | null = null;
        let residual: number | null = null;
        let above = false;
        if (inDomain) {
            cyclesEvaluated++;
            const [out] = model([[dutyN, currentN, 0]]);
            expected = out.expected;
            residual = out.residual;
            above = residual > threshold;
            count = above ? count + 1 : 0;
        } else {
            cyclesOutOfDomain++;
        }
        const alarm = above && count >= debounceCycles && firstAlarmAt === null;
        if (alarm) firstAlarmAt = tCycle;
        trace.push({ t: tCycle, duty, current, dutyN, currentN, inDomain, expected, residual, above, count, alarm });
    }

    const injectedAt = injections.length ? injections[injections.length - 1].at : null;
    let pass: boolean;
    let reason: string;
    let delay: number | null = null;
    if ("alarms" in scenario.expect) {
        pass = firstAlarmAt === null;
        reason = pass ? "no alarm on a nominal scenario" : `alarm at ${firstAlarmAt} s on a nominal scenario`;
    } else {
        const deadline = injectedAt! + scenario.expect.alarmWithin;
        if (firstAlarmAt === null) {
            pass = false;
            reason = `no alarm before the deadline (${deadline} s)`;
        } else if (firstAlarmAt < injectedAt!) {
            pass = false;
            reason = `alarm at ${firstAlarmAt} s, before the injection at ${injectedAt} s`;
        } else {
            delay = firstAlarmAt - injectedAt!;
            pass = firstAlarmAt <= deadline;
            reason = pass
                ? `alarm ${delay} s after the injection (deadline ${scenario.expect.alarmWithin} s)`
                : `alarm ${delay} s after the injection, past the deadline of ${scenario.expect.alarmWithin} s`;
        }
    }
    return {
        result: { name: scenario.name, duration: scenario.duration, injectedAt, expect: scenario.expect, firstAlarmAt, delay, cyclesEvaluated, cyclesOutOfDomain, pass, reason },
        trace,
    };
}

function confusion(results: ReadonlyArray<ScenarioResult>): ConfusionCounts {
    let truePositives = 0;
    let falseNegatives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    for (const r of results) {
        if ("alarms" in r.expect) {
            if (r.firstAlarmAt === null) trueNegatives++;
            else falsePositives++;
        } else if (r.firstAlarmAt !== null && r.injectedAt !== null && r.firstAlarmAt < r.injectedAt) {
            falsePositives++;
        } else if (r.pass) {
            truePositives++;
        } else {
            falseNegatives++;
        }
    }
    return { truePositives, falseNegatives, falsePositives, trueNegatives };
}

export function planEvaluate(spec: EvaluateSpec, ctx: Pick<EvaluateContext, "registry" | "specDir">): EvaluatePlan {
    const artifact = resolveInput(spec.artifact.file, ctx.specDir);
    const contractPath = resolveInput(spec.artifact.contract, ctx.specDir);
    const graph = resolveInput(spec.graph, ctx.specDir);
    const contract = readContract(contractPath);
    checkArtifact(new Uint8Array(fs.readFileSync(artifact)), contract, artifact);
    const doc = readDocument(graph);
    const loaded = instantiateDocument(doc, ctx.registry);
    for (const s of spec.operatingPoint) applySetting(loaded, s);
    for (const sc of spec.scenarios) for (const i of sc.inject) applySetting(loaded, i);
    readQuantity(loaded, spec.features.duty);
    readQuantity(loaded, spec.features.current);
    const simulatedSeconds = spec.scenarios.reduce((s, sc) => s + sc.duration, 0);
    return { artifact, contract: contractPath, graph, scenarios: spec.scenarios.length, simulatedSeconds, ticks: Math.round(simulatedSeconds / spec.run.dt) };
}

export function runEvaluate(spec: EvaluateSpec, ctx: EvaluateContext): EvaluateReport {
    const started = Date.now();
    const artifactPath = resolveInput(spec.artifact.file, ctx.specDir);
    const contractPath = resolveInput(spec.artifact.contract, ctx.specDir);
    const graphPath = resolveInput(spec.graph, ctx.specDir);
    const contract = readContract(contractPath);
    const bytes = new Uint8Array(fs.readFileSync(artifactPath));
    const artifactSha256 = checkArtifact(bytes, contract, artifactPath);
    const doc = readDocument(graphPath);
    ctx.log(
        `${spec.name}: ${spec.scenarios.length} scenario(s) on ${path.basename(graphPath)}, monitor threshold ${contract.monitor.residual.threshold}, debounce ${contract.monitor.residual.debounceCycles} cycle(s) of ${spec.run.cycle} s`
    );

    const writer = new JobWriter(ctx.outDir);
    const results: ScenarioResult[] = [];
    for (const scenario of spec.scenarios) {
        const t0 = Date.now();
        const { result, trace } = runScenario(spec, scenario, ctx, doc, bytes, contract);
        results.push(result);
        writer.writeJsonLines(path.join("trace", `${scenario.name}.jsonl`), trace);
        ctx.log(`[${scenario.name}] ${result.pass ? "pass" : "FAIL"}: ${result.reason} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
    const counts = confusion(results);
    const verdict = results.every((r) => r.pass) ? "pass" : "fail";

    const report = {
        name: spec.name,
        kind: spec.kind,
        model: spec.model,
        verdict,
        artifact: { file: artifactPath, sha256: artifactSha256, contract: contractPath, contractSha256: sha256File(contractPath) },
        monitor: contract.monitor,
        run: spec.run,
        scenarios: results,
        confusion: counts,
    };
    const reportText = JSON.stringify(report, null, 2) + "\n";
    const reportId = crypto.createHash("sha256").update(reportText).digest("hex");
    fs.writeFileSync(path.join(ctx.outDir, "report.json"), reportText);
    writer.files.push("report.json");

    const finished = Date.now();
    writer.writeJson("manifest.json", {
        name: spec.name,
        job: spec.job,
        spec,
        inputs: {
            artifact: { path: artifactPath, sha256: artifactSha256 },
            contract: { path: contractPath, sha256: sha256File(contractPath) },
            graph: { path: graphPath, sha256: sha256File(graphPath), nodes: doc.model.nodes.length },
        },
        reportId,
        verdict,
        started: new Date(started).toISOString(),
        finished: new Date(finished).toISOString(),
        wallMs: finished - started,
        versions: { factory: ctx.factoryVersion, node: process.version, gitSha: ctx.gitSha },
        files: [...writer.files, "manifest.json"],
    });
    ctx.log(
        `${spec.name}: verdict ${verdict}, report ${reportId.slice(0, 12)}..., confusion TP ${counts.truePositives} FN ${counts.falseNegatives} FP ${counts.falsePositives} TN ${counts.trueNegatives}`
    );

    return { name: spec.name, outDir: ctx.outDir, verdict, scenarios: results, confusion: counts, artifactSha256, reportId, files: writer.files, wallMs: finished - started };
}
