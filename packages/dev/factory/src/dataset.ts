/**
 * Rows in, columns out. A dataset is a JSON array, a JSON lines file or a
 * CSV: the `summary.json` a sweep wrote, a telemetry export of the board, a
 * spreadsheet. The reader does not care where the rows came from; the spec
 * says which columns carry the duty and the current and how to rescale them.
 */
import * as fs from "fs";
import * as path from "path";
import type { ColumnRef } from "./spec.js";

export type DatasetRow = Readonly<Record<string, unknown>>;

export class DatasetError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DatasetError";
    }
}

/** Minimal RFC 4180 reader: quoted cells, doubled quotes, no embedded newlines. */
function parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"' && line[i + 1] === '"') {
                cell += '"';
                i++;
            } else if (c === '"') quoted = false;
            else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ",") {
            cells.push(cell);
            cell = "";
        } else cell += c;
    }
    cells.push(cell);
    return cells;
}

function rowsFromCsv(text: string): DatasetRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = parseCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
        const cells = parseCsvLine(line);
        const row: Record<string, unknown> = {};
        header.forEach((h, i) => {
            const raw = cells[i] ?? "";
            const n = Number(raw);
            row[h] = raw !== "" && Number.isFinite(n) ? n : raw;
        });
        return row;
    });
}

/** Read every row of a dataset file, by extension: .json (array), .jsonl, .csv. */
export function readRows(file: string): DatasetRow[] {
    let text: string;
    try {
        text = fs.readFileSync(file, "utf8");
    } catch (e) {
        throw new DatasetError(`cannot read ${file}: ${(e as Error).message}`);
    }
    const ext = path.extname(file).toLowerCase();
    const parseJson = (chunk: string, where: string): unknown => {
        try {
            return JSON.parse(chunk);
        } catch (e) {
            throw new DatasetError(`${where} is not JSON: ${(e as Error).message}`);
        }
    };
    if (ext === ".csv") return rowsFromCsv(text);
    if (ext === ".jsonl") {
        return text
            .split(/\r?\n/)
            .filter((l) => l.trim().length > 0)
            .map((l, i) => {
                const v = parseJson(l, `${path.basename(file)} line ${i + 1}`);
                if (typeof v !== "object" || v === null || Array.isArray(v)) throw new DatasetError(`${path.basename(file)} line ${i + 1}: expected an object`);
                return v as DatasetRow;
            });
    }
    if (ext === ".json") {
        const v = parseJson(text, path.basename(file));
        if (!Array.isArray(v)) throw new DatasetError(`${path.basename(file)}: expected a JSON array of rows`);
        return v as DatasetRow[];
    }
    throw new DatasetError(`${path.basename(file)}: unsupported extension "${ext}" (use .json, .jsonl or .csv)`);
}

/** One rescaled numeric column, refusing a missing or non-numeric cell with its row number. */
export function columnValues(rows: ReadonlyArray<DatasetRow>, ref: ColumnRef, label: string): Float64Array {
    const out = new Float64Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
        const v = rows[i][ref.column];
        if (typeof v !== "number" || !Number.isFinite(v)) {
            const columns = Object.keys(rows[i]).join(", ");
            throw new DatasetError(`${label}: row ${i + 1} has no finite number in column "${ref.column}" (columns: ${columns})`);
        }
        out[i] = v * ref.scale + ref.offset;
    }
    return out;
}
