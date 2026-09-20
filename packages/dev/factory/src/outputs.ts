/**
 * Where a job writes, and the few file shapes it writes.
 *
 * Resolution order for the output directory, first match wins: the `--out`
 * flag, `spec.outputs.dir`, the `NEBIUS_OUTPUT_DIR` environment variable a
 * serverless job exposes for its mounted bucket, then `./outputs`. The job
 * always creates a `<spec.name>/` folder inside it, so several jobs can
 * share one bucket without overwriting each other.
 */
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { JobSpec } from "./spec.js";

export function resolveOutputDir(spec: JobSpec, cliOut: string | undefined, env: NodeJS.ProcessEnv = process.env): string {
    const base = cliOut ?? spec.outputs?.dir ?? env.NEBIUS_OUTPUT_DIR ?? "outputs";
    return path.resolve(base, spec.name);
}

export function sha256File(file: string): string {
    return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** Writes the job's files under one directory and remembers what it wrote. */
export class JobWriter {
    public readonly files: string[] = [];

    public constructor(public readonly dir: string) {
        fs.mkdirSync(dir, { recursive: true });
    }

    public writeJson(name: string, value: unknown): string {
        return this.writeText(name, JSON.stringify(value, null, 2) + "\n");
    }

    /** One line per row, columns in the given order, RFC 4180 quoting where needed. */
    public writeCsv(name: string, columns: ReadonlyArray<string>, rows: ReadonlyArray<Record<string, unknown>>): string {
        const cell = (v: unknown): string => {
            if (v === undefined || v === null) return "";
            const s = typeof v === "number" ? String(v) : typeof v === "string" ? v : JSON.stringify(v);
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = [columns.join(",")];
        for (const row of rows) lines.push(columns.map((c) => cell(row[c])).join(","));
        return this.writeText(name, lines.join("\n") + "\n");
    }

    /** JSON lines: one object per line, the shape a training loader streams. */
    public writeJsonLines(name: string, rows: ReadonlyArray<unknown>): string {
        return this.writeText(name, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    }

    private writeText(name: string, text: string): string {
        const file = path.join(this.dir, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
        this.files.push(name.split(path.sep).join("/"));
        return file;
    }
}
