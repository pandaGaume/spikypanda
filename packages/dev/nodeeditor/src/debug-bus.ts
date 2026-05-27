import type { IDisposable } from "spikypanda-core";

export type DebugLevel = "info" | "warn" | "error" | "watch";

export interface IDebugEntry {
    /** Wall-clock timestamp in ms (Date.now). */
    readonly ts: number;
    /** Severity / category. `watch` is the live-value variant. */
    readonly level: DebugLevel;
    /** Short identifier of the publisher (node label, plugin id, ...). */
    readonly source: string;
    /** Pre-stringified message body. Arrays / objects are stringified by
     *  the caller so the bus has no JSON / serialization concerns. */
    readonly message: string;
}

export type DebugHandler = (entry: IDebugEntry) => void;

/**
 * Process-wide observable for runtime print / watch / debug output.
 *
 * The runtime knows nothing about UIs; nodes (Print, Watch, custom
 * loggers) call `DebugBus.instance.log(...)` and a host (the editor's
 * console panel, an HTTP relay, an MCP exporter, ...) subscribes via
 * `addHandler` to render or forward the entries. Subscribing returns
 * an `IDisposable` so consumers can clean up cleanly.
 *
 * The bus is a singleton because runtime nodes don't have ambient
 * access to the editor host; a global keeps the call site trivial
 * (`DebugBus.instance.log("info", "MyNode", "fired")`) without
 * threading a context object through every node constructor.
 *
 * History is **not** retained on the bus itself — consumers that need
 * a buffer (e.g. the console panel that may attach after the first
 * messages) decide their own retention policy. Keeping the bus
 * stateless avoids unbounded memory growth in long-running graphs.
 */
export class DebugBus {
    private static _instance: DebugBus | null = null;

    public static get instance(): DebugBus {
        if (!DebugBus._instance) DebugBus._instance = new DebugBus();
        return DebugBus._instance;
    }

    private _handlers: DebugHandler[] = [];

    public addHandler(handler: DebugHandler): IDisposable {
        this._handlers.push(handler);
        return {
            dispose: (): void => {
                const i = this._handlers.indexOf(handler);
                if (i >= 0) this._handlers.splice(i, 1);
            },
        };
    }

    public log(level: DebugLevel, source: string, message: string): void {
        const entry: IDebugEntry = { ts: Date.now(), level, source, message };
        for (const h of this._handlers) {
            try { h(entry); } catch (e) { /* swallow — debug must never break run() */ void e; }
        }
    }
}
