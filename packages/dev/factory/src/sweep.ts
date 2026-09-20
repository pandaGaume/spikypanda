/**
 * The `sweep` job: run one document over a grid of settings, record fields
 * every tick, summarise a window per point, and write the outputs.
 *
 * Every point instantiates the document afresh. That costs a few
 * milliseconds for a few dozen nodes and buys the only guarantee that
 * matters for a dataset: point k does not depend on point k-1 through a
 * solver state, a buffer or a catalogue that was not reset.
 *
 * The tick loop is the editor's, minus the animation frame: `session.run(t)`
 * at t = k*dt for k in [0, steps), then the fields are read from the node
 * instances. The summary window starts at `settle`, so the transient of a
 * cold start (the motor spinning up, the FFT buffers filling) is left out.
 */
import * as fs from "fs";
import * as path from "path";
import { detrend, lockIn, max, mean, min, rms } from "./analysis.js";
import { applySetting, instantiateDocument, readDocument, readNumber, DocumentError } from "./document.js";
import type { LoadedDocument, SavedGraph } from "./document.js";
import { JobWriter, sha256File } from "./outputs.js";
import { gridPoints, recordColumn, summaryColumn } from "./spec.js";
import type { NodeRegistry } from "spikypanda-core";
import type { NodeSetting, SweepSpec, SummaryStat } from "./spec.js";

export interface SweepContext {
    readonly registry: NodeRegistry;
    /** Directory the spec file lives in; relative graph paths resolve against it. */
    readonly specDir: string;
    /** Output directory, already resolved (see `resolveOutputDir`). */
    readonly outDir: string;
    readonly log: (line: string) => void;
    /** Recorded in the manifest when known (a container has no git). */
    readonly gitSha?: string;
    readonly factoryVersion: string;
}

export interface PointReport {
    readonly index: number;
    readonly settings: ReadonlyArray<NodeSetting>;
    readonly ticks: number;
    readonly wallMs: number;
    readonly summary: Readonly<Record<string, number>>;
}

export interface SweepReport {
    readonly name: string;
    readonly outDir: string;
    readonly points: ReadonlyArray<PointReport>;
    readonly files: ReadonlyArray<string>;
    readonly wallMs: number;
}

/** What `--dry-run` reports: the document resolves, and this is the size of the job. */
export interface SweepPlan {
    readonly graph: string;
    readonly nodes: number;
    readonly connections: number;
    readonly missingTypeIds: ReadonlyArray<string>;
    readonly skippedConnections: ReadonlyArray<string>;
    readonly sceneBound: boolean;
    readonly points: number;
    readonly ticksPerPoint: number;
}

/**
 * Absolute paths are taken as is. A relative path is tried against the spec
 * file's directory first, then against the working directory: a spec injected
 * into a container at /workspace can name a graph shipped in the image at
 * /app/graphs without knowing where it was injected.
 */
export function resolveGraphPath(spec: SweepSpec, specDir: string): string {
    if (path.isAbsolute(spec.graph)) return spec.graph;
    const bySpec = path.resolve(specDir, spec.graph);
    if (fs.existsSync(bySpec)) return bySpec;
    const byCwd = path.resolve(spec.graph);
    return fs.existsSync(byCwd) ? byCwd : bySpec;
}

export function planSweep(spec: SweepSpec, ctx: Pick<SweepContext, "registry" | "specDir">): SweepPlan {
    const graphPath = resolveGraphPath(spec, ctx.specDir);
    const doc = readDocument(graphPath);
    const loaded = instantiateDocument(doc, ctx.registry);
    // A settings pass on the plan catches a wrong node id or property before
    // any point runs, with the same error a real point would raise.
    for (const s of spec.set ?? []) applySetting(loaded, s);
    for (const point of gridPoints(spec.grid ?? [])) for (const s of point) applySetting(loaded, s);
    for (const r of spec.record) readNumber(loaded, r.node, r.property);
    return {
        graph: graphPath,
        nodes: doc.model.nodes.length,
        connections: doc.model.connections.length,
        missingTypeIds: loaded.missingTypeIds,
        skippedConnections: loaded.skippedConnections,
        sceneBound: loaded.sceneBound,
        points: gridPoints(spec.grid ?? []).length,
        ticksPerPoint: Math.round(spec.run.duration / spec.run.dt),
    };
}

function settingLabel(s: NodeSetting): string {
    return `${s.node}.${s.property}=${typeof s.value === "number" ? String(s.value) : JSON.stringify(s.value)}`;
}

function frequencyOf(stat: SummaryStat, window: ReadonlyMap<string, Float64Array>): number {
    const f = stat.frequency!;
    if ("hz" in f) return f.hz;
    const source = window.get(f.fromField)!;
    const m = mean(source);
    return f.kind === "angular" ? m / (2 * Math.PI) : m;
}

function summarise(spec: SweepSpec, window: ReadonlyMap<string, Float64Array>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const stat of spec.summary ?? []) {
        const samples = window.get(stat.field)!;
        let value: number;
        switch (stat.stat) {
            case "mean":
                value = mean(samples);
                break;
            case "min":
                value = min(samples);
                break;
            case "max":
                value = max(samples);
                break;
            case "rms":
                value = rms(samples);
                break;
            case "lockin":
                value = lockIn(detrend(samples), spec.run.dt, frequencyOf(stat, window)).amplitude;
                break;
        }
        out[summaryColumn(stat)] = value;
    }
    return out;
}

function runPoint(
    spec: SweepSpec,
    doc: SavedGraph,
    registry: NodeRegistry,
    settings: ReadonlyArray<NodeSetting>
): { loaded: LoadedDocument; series: Map<string, Float64Array>; ticks: number } {
    const loaded = instantiateDocument(doc, registry);
    if (loaded.missingTypeIds.length > 0) {
        throw new DocumentError(`the registry cannot resolve: ${loaded.missingTypeIds.join(", ")}`);
    }
    for (const s of spec.set ?? []) applySetting(loaded, s);
    for (const s of settings) applySetting(loaded, s);
    // The settings may include initial states: the run starts from them,
    // and the solvers re-read the leaves (the session was built before).
    loaded.session.reset();

    const { dt, duration } = spec.run;
    const ticks = Math.round(duration / dt);
    const columns = spec.record.map((r) => ({ column: recordColumn(r), node: r.node, property: r.property }));
    const series = new Map<string, Float64Array>(columns.map((c) => [c.column, new Float64Array(ticks)]));
    for (let k = 0; k < ticks; k++) {
        loaded.session.run(k * dt);
        for (const c of columns) series.get(c.column)![k] = readNumber(loaded, c.node, c.property);
    }
    return { loaded, series, ticks };
}

export function runSweep(spec: SweepSpec, ctx: SweepContext): SweepReport {
    const started = Date.now();
    const graphPath = resolveGraphPath(spec, ctx.specDir);
    const doc = readDocument(graphPath);
    const points = gridPoints(spec.grid ?? []);
    const writer = new JobWriter(ctx.outDir);
    const { dt, settle } = spec.run;
    const windowStart = Math.round(settle / dt);
    const gridColumns = (spec.grid ?? []).map((a) => `${a.node}.${a.property}`);
    const summaryColumns = (spec.summary ?? []).map(summaryColumn);
    const recordColumns = spec.record.map(recordColumn);

    ctx.log(`${spec.name}: ${points.length} point(s) x ${Math.round(spec.run.duration / dt)} ticks, graph ${path.basename(graphPath)} (${doc.model.nodes.length} nodes)`);

    const reports: PointReport[] = [];
    const rows: Record<string, unknown>[] = [];
    let firstLoaded: LoadedDocument | undefined;
    for (const [index, settings] of points.entries()) {
        const t0 = Date.now();
        const { loaded, series, ticks } = runPoint(spec, doc, ctx.registry, settings);
        firstLoaded ??= loaded;
        const window = new Map<string, Float64Array>();
        for (const [column, samples] of series) window.set(column, samples.subarray(windowStart));
        const summary = summarise(spec, window);
        const wallMs = Date.now() - t0;

        const row: Record<string, unknown> = { point: index };
        for (const [i, a] of (spec.grid ?? []).entries()) row[gridColumns[i]] = settings.find((s) => s.node === a.node && s.property === a.property)?.value;
        Object.assign(row, summary);
        rows.push(row);
        reports.push({ index, settings, ticks, wallMs, summary });

        if (spec.outputs?.samples) {
            const lines: Record<string, number>[] = [];
            for (let k = 0; k < ticks; k++) {
                const line: Record<string, number> = { t: k * dt };
                for (const column of recordColumns) line[column] = series.get(column)![k];
                lines.push(line);
            }
            writer.writeJsonLines(path.join("samples", `point-${String(index).padStart(4, "0")}.jsonl`), lines);
        }

        const label = settings.length ? settings.map(settingLabel).join(" ") : "(no grid)";
        const stats = Object.entries(summary)
            .map(([k, v]) => `${k}=${Number.isFinite(v) ? v.toExponential(3) : String(v)}`)
            .join(" ");
        ctx.log(`[${index + 1}/${points.length}] ${label} ${stats} (${(wallMs / 1000).toFixed(1)} s)`);
    }

    writer.writeJson("summary.json", rows);
    writer.writeCsv("summary.csv", ["point", ...gridColumns, ...summaryColumns], rows);

    const finished = Date.now();
    const manifest = {
        name: spec.name,
        job: spec.job,
        spec,
        graph: {
            path: graphPath,
            sha256: sha256File(graphPath),
            nodes: doc.model.nodes.length,
            connections: doc.model.connections.length,
            skippedConnections: firstLoaded?.skippedConnections ?? [],
            sceneBound: firstLoaded?.sceneBound ?? false,
        },
        grid: { axes: gridColumns, points: points.length },
        started: new Date(started).toISOString(),
        finished: new Date(finished).toISOString(),
        wallMs: finished - started,
        versions: { factory: ctx.factoryVersion, node: process.version, gitSha: ctx.gitSha },
        points: reports,
        files: [...writer.files, "manifest.json"],
    };
    writer.writeJson("manifest.json", manifest);

    return { name: spec.name, outDir: ctx.outDir, points: reports, files: writer.files, wallMs: finished - started };
}
