import type { NodeEditor } from "./editor.js";

export interface FileHandler {
    /** File extensions this handler supports (without dot), e.g. ["onnx"] */
    readonly extensions: string[];

    /** MIME types this handler supports, e.g. ["application/octet-stream"] */
    readonly mimeTypes?: string[];

    /** Display name for UI, e.g. "ONNX Model" */
    readonly displayName: string;

    /** Load a file into the editor. Receives raw bytes. */
    load(data: ArrayBuffer, editor: NodeEditor, filename: string): void;

    /** Optional: can this handler save/export? */
    canSave?: boolean;

    /** Optional: serialize the editor to a downloadable blob. */
    save?(editor: NodeEditor): { data: string | ArrayBuffer; extension: string; mimeType: string };
}

export class FileHandlerRegistry {
    private readonly handlers: FileHandler[] = [];

    register(handler: FileHandler): void {
        this.handlers.push(handler);
    }

    unregister(handler: FileHandler): void {
        const idx = this.handlers.indexOf(handler);
        if (idx >= 0) this.handlers.splice(idx, 1);
    }

    findByExtension(ext: string): FileHandler | undefined {
        const lower = ext.toLowerCase().replace(/^\./, "");
        return this.handlers.find((h) =>
            h.extensions.some((e) => e.toLowerCase() === lower),
        );
    }

    findByMime(mime: string): FileHandler | undefined {
        const lower = mime.toLowerCase();
        return this.handlers.find((h) =>
            h.mimeTypes?.some((m) => m.toLowerCase() === lower),
        );
    }

    getAll(): readonly FileHandler[] {
        return this.handlers;
    }

    getSaveable(): FileHandler[] {
        return this.handlers.filter((h) => h.canSave && h.save);
    }

    getAcceptString(): string {
        const exts = this.handlers.flatMap((h) => h.extensions.map((e) => "." + e));
        return exts.join(",");
    }

    getExportAcceptString(): string {
        const exts = this.getSaveable().flatMap((h) => h.extensions.map((e) => "." + e));
        return exts.join(",");
    }
}
