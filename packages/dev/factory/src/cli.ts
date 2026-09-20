/**
 * `spikypanda-job <spec.json> [--out <dir>] [--dry-run]`
 *
 * Exit codes follow the convention of the serverless job runner this is
 * meant to run under: 0 the job completed, 1 the job failed while running,
 * 2 the input was refused before anything ran. Progress goes to stderr and
 * the output directory is the only line on stdout, so a caller can pipe it.
 */
import * as fs from "fs";
import * as path from "path";
import { DatasetError } from "./dataset.js";
import { DocumentError } from "./document.js";
import { EvaluateError, planEvaluate, runEvaluate } from "./evaluate.js";
import { FitError, planFit, runFit } from "./fit.js";
import { resolveOutputDir } from "./outputs.js";
import { buildJobRegistry } from "./registry.js";
import { parseSpec, SpecError } from "./spec.js";
import { planSweep, runSweep } from "./sweep.js";

declare const __FACTORY_VERSION__: string | undefined;
const VERSION = typeof __FACTORY_VERSION__ === "string" ? __FACTORY_VERSION__ : "dev";

const USAGE = `spikypanda-job <spec.json> [--out <dir>] [--dry-run]

  spec.json   a job specification (see docs/README.md); relative graph
              paths resolve against the spec file's directory
  --out       output directory; a <spec.name>/ folder is created inside.
              Default: spec.outputs.dir, then $NEBIUS_OUTPUT_DIR, then ./outputs
  --dry-run   validate the spec, load the graph once, print the plan, run nothing
  --version   print the runner version

exit codes: 0 completed, 1 failed while running, 2 input refused`;

interface Args {
    spec?: string;
    out?: string;
    dryRun: boolean;
    help: boolean;
    version: boolean;
}

function parseArgs(argv: ReadonlyArray<string>): Args {
    const args: Args = { dryRun: false, help: false, version: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--out") {
            args.out = argv[++i];
            if (args.out === undefined) throw new SpecError("--out needs a directory");
        } else if (a === "--dry-run") args.dryRun = true;
        else if (a === "--help" || a === "-h") args.help = true;
        else if (a === "--version") args.version = true;
        else if (a.startsWith("-")) throw new SpecError(`unknown option ${a}`);
        else if (args.spec === undefined) args.spec = a;
        else throw new SpecError(`unexpected argument ${a}`);
    }
    return args;
}

export function main(argv: ReadonlyArray<string>, env: NodeJS.ProcessEnv = process.env): number {
    const log = (line: string): void => {
        process.stderr.write(line + "\n");
    };
    let args: Args;
    try {
        args = parseArgs(argv);
    } catch (e) {
        log(`spikypanda-job: ${(e as Error).message}\n\n${USAGE}`);
        return 2;
    }
    if (args.version) {
        process.stdout.write(VERSION + "\n");
        return 0;
    }
    if (args.help || args.spec === undefined) {
        log(USAGE);
        return args.help ? 0 : 2;
    }

    const specPath = path.resolve(args.spec);
    try {
        const spec = parseSpec(JSON.parse(fs.readFileSync(specPath, "utf8")));
        const specDir = path.dirname(specPath);
        const outDir = resolveOutputDir(spec, args.out, env);

        if (spec.job === "fit") {
            if (args.dryRun) {
                const plan = planFit(spec, { specDir });
                log(`${spec.name}: ${plan.rows} row(s) in ${path.basename(plan.dataset)}, ${plan.kept} inside the domain, ${plan.excluded} excluded`);
                log(`outputs would go to ${outDir}`);
                process.stdout.write(outDir + "\n");
                return 0;
            }
            const report = runFit(spec, { specDir, outDir, log, gitSha: env.SPIKYPANDA_GIT_SHA, factoryVersion: VERSION });
            log(
                `${report.name}: ${spec.outputs.file} sha256 ${report.sha256.slice(0, 12)}..., ${report.files.length} file(s) in ${report.outDir} (${(report.wallMs / 1000).toFixed(1)} s)`
            );
            process.stdout.write(report.outDir + "\n");
            return 0;
        }

        // The graph registry is only built for jobs that run a document.
        const registry = buildJobRegistry();

        if (spec.job === "evaluate") {
            if (args.dryRun) {
                const plan = planEvaluate(spec, { registry, specDir });
                log(
                    `${spec.name}: ${plan.scenarios} scenario(s), ${plan.simulatedSeconds} simulated second(s) (${plan.ticks} ticks) on ${path.basename(plan.graph)}, artifact ${path.basename(plan.artifact)}`
                );
                log(`outputs would go to ${outDir}`);
                process.stdout.write(outDir + "\n");
                return 0;
            }
            const report = runEvaluate(spec, { registry, specDir, outDir, log, gitSha: env.SPIKYPANDA_GIT_SHA, factoryVersion: VERSION });
            log(`${report.name}: ${report.files.length} file(s) in ${report.outDir} (${(report.wallMs / 1000).toFixed(1)} s)`);
            process.stdout.write(report.outDir + "\n");
            return 0;
        }

        if (args.dryRun) {
            const plan = planSweep(spec, { registry, specDir });
            log(`${spec.name}: ${plan.points} point(s) x ${plan.ticksPerPoint} ticks on ${path.basename(plan.graph)} (${plan.nodes} nodes, ${plan.connections} connections)`);
            log(`scene bound from the document: ${plan.sceneBound ? "yes" : "no (per-node Earth fallback)"}`);
            if (plan.skippedConnections.length) log(`config wires skipped: ${plan.skippedConnections.join(", ")}`);
            if (plan.missingTypeIds.length) {
                log(`unresolved typeIds: ${plan.missingTypeIds.join(", ")}`);
                return 2;
            }
            log(`outputs would go to ${outDir}`);
            process.stdout.write(outDir + "\n");
            return 0;
        }

        const report = runSweep(spec, { registry, specDir, outDir, log, gitSha: env.SPIKYPANDA_GIT_SHA, factoryVersion: VERSION });
        log(`${report.name}: ${report.points.length} point(s) in ${(report.wallMs / 1000).toFixed(1)} s, ${report.files.length} file(s) in ${report.outDir}`);
        process.stdout.write(report.outDir + "\n");
        return 0;
    } catch (e) {
        const err = e as Error;
        const refused = err instanceof SpecError || err instanceof DocumentError || err instanceof DatasetError || err instanceof FitError || err instanceof EvaluateError;
        if (refused || err instanceof SyntaxError || (err as NodeJS.ErrnoException).code === "ENOENT") {
            log(`spikypanda-job: ${err.message}`);
            return 2;
        }
        log(`spikypanda-job: failed: ${err.stack ?? err.message}`);
        return 1;
    }
}
