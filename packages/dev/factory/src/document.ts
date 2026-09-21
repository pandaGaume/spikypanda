/**
 * The document library lives in the core since 2026-09-21 (`spikypanda-core`,
 * `document/`): a `.spikypanda` document is a runtime notion, and a process
 * with no editor instantiates and runs it the same way. This module keeps
 * what needs a file system, `readDocument`, and re-exports the rest so the
 * jobs and the demo keep their imports.
 */
import * as fs from "fs";
import * as path from "path";
import { DocumentError, parseDocument, type SavedGraph } from "spikypanda-core";

export { DocumentError, applySetting, instantiateDocument, parseDocument, checkDocument, readNumber, runDocument } from "spikypanda-core";
export type { SavedModelNode, SavedConnection, SavedGraph, LoadedDocument, IDocumentSetting, IDocumentProbe, IDocumentRunOptions, IDocumentRun } from "spikypanda-core";

/** Read and shape-check a document from disk. */
export function readDocument(file: string): SavedGraph {
    let raw: string;
    try {
        raw = fs.readFileSync(file, "utf8");
    } catch (e) {
        throw new DocumentError(`cannot read ${file}: ${(e as Error).message}`);
    }
    return parseDocument(raw, path.basename(file));
}
