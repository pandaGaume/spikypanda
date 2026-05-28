import type { IDisposable } from "spikypanda-core";
import type { GraphViewer } from "./components/graph-viewer";
import type { NodeUI } from "./node-ui";
import type { Port } from "./port";

/**
 * Keeps variadic port sets balanced: every NodeUI carrying a
 * `variadicInput` or `variadicOutput` descriptor ends up with exactly
 * one trailing unconnected port matching the declared prefix.
 *
 * Connect a trailing port → a new empty port is appended (the "+" slot).
 * Disconnect any middle port → that slot stays (the user's wiring on
 * later ports must not be re-indexed).
 * Disconnect the last filled port → the now-trailing extra empty port
 * is trimmed so only ONE empty slot is left.
 *
 * Indexing starts at 0 and the names are formed by string-concatenation
 * (`${prefix}${n}`), matching the convention used by the Sequence /
 * MultiGate / DoN runtime nodes. The reconciler does NOT touch ports
 * outside the variadic set (e.g. a node's data port `condition` is
 * preserved untouched even when adjacent to variadic siblings).
 *
 * Reconciliation runs at boot (to seed any already-loaded graph) and
 * on every connection added / removed; the work is O(N*P) where N is
 * the number of nodes and P the size of their variadic sets, so it
 * comfortably fits inside the event handler.
 */
export class VariadicReconciler implements IDisposable {
    private readonly _viewer: GraphViewer;
    private readonly _prevAdd: ((c: unknown) => void) | null;
    private readonly _prevRemove: ((c: unknown) => void) | null;
    private _disposed = false;

    public constructor(viewer: GraphViewer) {
        this._viewer = viewer;
        this._prevAdd = viewer.onConnectionAdded as unknown as ((c: unknown) => void) | null;
        this._prevRemove = viewer.onConnectionRemoved as unknown as ((c: unknown) => void) | null;

        (viewer.onConnectionAdded as unknown) = (conn: unknown) => {
            if (this._prevAdd) this._prevAdd(conn);
            this._reconcileAll();
        };
        (viewer.onConnectionRemoved as unknown) = (conn: unknown) => {
            if (this._prevRemove) this._prevRemove(conn);
            this._reconcileAll();
        };

        this._reconcileAll();
    }

    public dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        (this._viewer.onConnectionAdded as unknown) = this._prevAdd;
        (this._viewer.onConnectionRemoved as unknown) = this._prevRemove;
    }

    private _reconcileAll(): void {
        for (const node of this._viewer.nodes) {
            if (node.variadicInput) this._reconcileSide(node, "input");
            if (node.variadicOutput) this._reconcileSide(node, "output");
        }
    }

    private _reconcileSide(node: NodeUI, direction: "input" | "output"): void {
        const desc = direction === "input" ? node.variadicInput! : node.variadicOutput!;
        const all = direction === "input" ? node.inputs : node.outputs;
        const variadic = all.filter((p) => p.name.indexOf(desc.prefix) === 0);

        // Seed: ensure at least one variadic port exists.
        if (variadic.length === 0) {
            this._addVariadicPort(node, direction, desc.prefix + "0", desc.type);
            return;
        }

        // Count trailing unconnected variadic ports at the end of the
        // matching subarray. The connected-or-middle ports stay put.
        let trailingEmpty = 0;
        for (let i = variadic.length - 1; i >= 0; i--) {
            if (this._isPortConnected(variadic[i])) break;
            trailingEmpty++;
        }

        if (trailingEmpty === 0) {
            // Last port is connected → grow by one empty trailing slot.
            const nextIdx = this._nextIndex(variadic, desc.prefix);
            this._addVariadicPort(node, direction, desc.prefix + nextIdx, desc.type);
        } else if (trailingEmpty > 1) {
            // Several empty trailing slots → trim down to one.
            const toRemove = trailingEmpty - 1;
            for (let k = 0; k < toRemove; k++) {
                const last = variadic[variadic.length - 1 - k];
                this._removeVariadicPort(node, last);
            }
        }
    }

    private _nextIndex(variadic: Port[], prefix: string): number {
        let max = -1;
        for (const p of variadic) {
            const n = Number(p.name.slice(prefix.length));
            if (Number.isFinite(n) && n > max) max = n;
        }
        return max + 1;
    }

    private _isPortConnected(port: Port): boolean {
        for (const c of this._viewer.connections) {
            if ((c as { from: Port; to: Port }).from === port) return true;
            if ((c as { from: Port; to: Port }).to === port) return true;
        }
        return false;
    }

    private _addVariadicPort(node: NodeUI, direction: "input" | "output", name: string, type: string): void {
        if (direction === "input") node.addInput(name, type as never);
        else node.addOutput(name, type as never);
    }

    private _removeVariadicPort(node: NodeUI, port: Port): void {
        // GraphViewer.removeNodePort drops any active connection on the
        // port first, then removes it from the NodeUI. Defensive: a
        // safety check via _isPortConnected is already done by the
        // caller, but using the public API keeps clean-up symmetric
        // with hand-drag removals.
        const remove = (this._viewer as unknown as { removeNodePort?: (n: NodeUI, p: Port) => boolean }).removeNodePort;
        if (remove) {
            remove.call(this._viewer, node, port);
        } else {
            if (port.direction === "input") node.removeInput(port);
            else node.removeOutput(port);
        }
    }
}
