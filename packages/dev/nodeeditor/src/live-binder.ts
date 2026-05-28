import type { IDisposable } from "spikypanda-core";
import type { GraphViewer } from "./components/graph-viewer";
import type { Connection } from "./connection";
import type { NodeUI } from "./node-ui";

interface IObservableLike {
    onPropertyChanged?: {
        add(cb: (args: { propertyName?: string }) => void): { dispose(): void } | null;
    };
}

interface IBinding {
    sub: { dispose(): void } | null;
}

/**
 * Design-time data propagation for a GraphViewer.
 *
 * When a connection links `from-node.out_slot -> to-node.in_slot`, the
 * binder subscribes to the upstream node's `onPropertyChanged` and
 * mirrors `from-node[out_slot]` into `to-node[in_slot]` every time the
 * upstream notifies. The downstream node's setter fires its own
 * `onPropertyChanged`, so any property-panel widget watching the same
 * field refreshes naturally.
 *
 * Convention: slot names ARE property names. A node exposing an output
 * port "vec3" must also have a getter named "vec3" returning the slot's
 * value; a node receiving on input port "position" must have an
 * editable setter named "position". Mismatch yields silently no-op
 * bindings — diagnosable via `console.warn` traces on write failure.
 *
 * Control-plane slots (those whose name starts with "_", e.g.
 * `_enable` / `_enabled`) are intentionally skipped: they are
 * lifecycle triggers, not data values.
 *
 * Listening to the whole stream (instead of filtering on the exact
 * out_slot name) covers derived getters that do not self-notify, such
 * as a viewable `vec3` computed from `x/y/z` setters that each fire
 * their own per-axis events.
 *
 * Lifecycle:
 *   - Chains the viewer's onConnectionAdded / onConnectionRemoved
 *     callbacks; any pre-existing handler is preserved and invoked
 *     after the binder's own logic.
 *   - dispose() restores the prior handlers and tears down every live
 *     subscription. The binder is single-use after dispose.
 */
export class LiveBinder implements IDisposable {
    private readonly _viewer: GraphViewer;
    private readonly _bindings = new Map<Connection, IBinding>();
    private readonly _prevAdd: ((c: Connection) => void) | null;
    private readonly _prevRemove: ((c: Connection) => void) | null;
    private _disposed = false;

    public constructor(viewer: GraphViewer) {
        this._viewer = viewer;
        this._prevAdd = viewer.onConnectionAdded;
        this._prevRemove = viewer.onConnectionRemoved;

        viewer.onConnectionAdded = (conn) => {
            this._bind(conn);
            if (this._prevAdd) this._prevAdd(conn);
        };
        viewer.onConnectionRemoved = (conn) => {
            this._unbind(conn);
            if (this._prevRemove) this._prevRemove(conn);
        };

        // Bind any connections already present (e.g. when the binder is
        // attached after a graph load).
        for (const conn of viewer.connections) this._bind(conn);
    }

    public dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        for (const conn of Array.from(this._bindings.keys())) this._unbind(conn);
        this._viewer.onConnectionAdded = this._prevAdd;
        this._viewer.onConnectionRemoved = this._prevRemove;
    }

    private _findNode(port: unknown, direction: "input" | "output"): NodeUI | null {
        for (const n of this._viewer.nodes) {
            if (direction === "output" && n.outputs.includes(port as never)) return n;
            if (direction === "input" && n.inputs.includes(port as never)) return n;
        }
        return null;
    }

    private _bind(conn: Connection): void {
        const fromNode = this._findNode(conn.from, "output");
        const toNode = this._findNode(conn.to, "input");
        if (!fromNode || !toNode) return;

        const fromData = fromNode.item && (fromNode.item as { data?: unknown }).data;
        const toData = toNode.item && (toNode.item as { data?: unknown }).data;
        if (!fromData || !toData) return;

        const fromObservable = fromData as IObservableLike;
        if (!fromObservable.onPropertyChanged || typeof fromObservable.onPropertyChanged.add !== "function") {
            return;
        }

        const fromSlot = (conn.from as { name: string }).name;
        const toSlot = (conn.to as { name: string }).name;
        if (fromSlot.startsWith("_") || toSlot.startsWith("_")) return;

        const write = (): void => {
            try {
                const v = (fromData as Record<string, unknown>)[fromSlot];
                if (v === undefined) return;
                (toData as Record<string, unknown>)[toSlot] = v;
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn(`[LiveBinder] write failed: ${fromSlot} -> ${toSlot}`, e);
            }
        };

        const sub = fromObservable.onPropertyChanged.add(() => write());
        write(); // seed the downstream field with the current upstream value
        this._bindings.set(conn, { sub });
    }

    private _unbind(conn: Connection): void {
        const entry = this._bindings.get(conn);
        if (!entry) return;
        if (entry.sub && typeof entry.sub.dispose === "function") entry.sub.dispose();
        this._bindings.delete(conn);
    }
}
