import { GridItemHTMLElement, GridStack, GridStackNode } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import type { NodeUI } from "./node-ui";

/**
 * Contract a graph node must implement to be rendered as a Dashboard
 * tile. The Dashboard pairs the IRenderable with a GridStack tile and
 * drives its lifecycle:
 *
 *   1. mountInto(host)   when the tile is first created or re-shown
 *   2. onResize(w, h)    when GridStack resizes the tile
 *   3. repaint()         called every animation frame while the tile
 *                        is visible, so the node can flush its internal
 *                        ring buffer into the renderer (uPlot, PixiJS, …)
 *   4. unmountFrom(host) when the tile is removed or the host changes
 *
 * The node ALSO continues to receive normal `fire()` calls from the
 * runtime — IRenderable is purely additive. The convention is for
 * `fire()` to push into an internal buffer (no DOM access) and for
 * `repaint()` to do the actual canvas / WebGL update. This split lets
 * a detached Dashboard window or a runtime-only deployment render the
 * same node without changing the runtime path.
 */
export interface IRenderable {
    /** Stable identifier for the tile type (e.g. "Viz.Plot:line"). The
     *  Dashboard surfaces it in the tile chrome and uses it as the
     *  default tile factory key when re-creating tiles on load. */
    readonly renderableType: string;

    /** Called once when the node is mounted into a tile. The host is
     *  a content `<div>` inside the GridStack item — the node is free
     *  to clear it and append its own canvas / svg / element tree. */
    mountInto(host: HTMLElement): void;

    /** Counterpart to `mountInto`. Receives the same host so the node
     *  can dispose listeners / renderers attached to it. */
    unmountFrom(host: HTMLElement): void;

    /** Called on every animation frame while the tile is visible.
     *  Read from the internal buffer (populated by fire()) and push to
     *  the renderer. Cheap — must be safe to invoke at 60fps. */
    repaint(): void;

    /** Called when GridStack resizes the tile. Width/height are the
     *  new content area dimensions in CSS pixels. */
    onResize(width: number, height: number): void;
}

/** Structural duck-type guard for IRenderable. */
export function isRenderable(obj: unknown): obj is IRenderable {
    if (!obj || typeof obj !== "object") return false;
    const o = obj as Partial<IRenderable>;
    return (
        typeof o.renderableType === "string" &&
        typeof o.mountInto === "function" &&
        typeof o.unmountFrom === "function" &&
        typeof o.repaint === "function" &&
        typeof o.onResize === "function"
    );
}

/**
 * Serialized tile entry. Each tile references a graph node by id and
 * carries its position / size in the GridStack grid. The tile type
 * `renderableType` is stored too, so a load can validate that the
 * referenced node still implements that contract (defensive, in case
 * the graph was edited externally).
 */
export interface ISerializedTile {
    nodeId: string;
    renderableType: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Serialized dashboard. The plural `id`/`name` shape is set up from V1
 * so multi-dashboard support in V2 can append entries without breaking
 * the on-disk format.
 */
export interface ISerializedDashboard {
    id: string;
    name: string;
    tiles: ISerializedTile[];
}

/**
 * Dashboard panel: a GridStack-backed grid of tiles where each tile
 * mounts a graph node implementing `IRenderable`. The Dashboard owns
 * the GridStack instance, runs a single rAF loop that fan-outs to each
 * visible tile's `repaint()`, and persists its layout for round-trip
 * with the graph save/load.
 *
 * Phase 1 scope: a single embedded dashboard at the bottom of the v2
 * editor. The internal data model is already plural-keyed (tiles[] in
 * an ISerializedDashboard with id/name) so Phase 2 (detach to a window)
 * and Phase 3 (multi-dashboard tabs) can layer on without breaking
 * the on-disk format.
 */
export class Dashboard {
    /** Stable id of this dashboard. V1 always uses "main". */
    public readonly id: string;
    /** Human label, surfaced in the tab UI when multi-dashboard lands. */
    public name: string;

    private readonly _host: HTMLElement;
    private readonly _grid: GridStack;
    private readonly _tiles = new Map<string, MountedTile>();
    private _rafHandle: number | null = null;
    private _running = false;

    public constructor(host: HTMLElement, opts?: { id?: string; name?: string }) {
        this.id = opts?.id ?? "main";
        this.name = opts?.name ?? "Main";
        this._host = host;
        this._host.classList.add("ne-dashboard");

        // GridStack init: 12-column grid (industry-standard, lots of room
        // for asymmetric layouts), float = true so tiles don't auto-pack
        // to the top (better UX for free-form dashboards).
        this._grid = GridStack.init(
            {
                column: 12,
                cellHeight: 60,
                float: true,
                margin: 6,
                animate: true,
            },
            this._host
        );

        // GridStack's own resizestop event isn't used: we let a per-tile
        // ResizeObserver (set up in addTile) handle every size change
        // uniformly — initial mount layout, GridStack drag/resize, AND
        // window resize. Single code path, no missed events.
    }

    /**
     * Mount a graph node as a new tile. The node must implement
     * IRenderable AND its `RuntimeNode` id (e.g. "node_42") is used as
     * the tile's identifier. Subsequent calls with the same node are
     * idempotent (existing tile is returned unchanged).
     *
     * Layout defaults: 6 columns wide × 4 rows tall, auto-placed.
     */
    public addTile(node: NodeUI & { item: { data: unknown } }, opts?: { x?: number; y?: number; w?: number; h?: number }): void {
        if (this._tiles.has(node.id)) return;
        const renderable = node.item.data;
        if (!isRenderable(renderable)) {
            throw new Error(`[Dashboard] node ${node.id} (${node.label}) does not implement IRenderable`);
        }

        const item = document.createElement("div");
        item.className = "grid-stack-item";
        item.dataset["gsId"] = node.id;
        const content = document.createElement("div");
        content.className = "grid-stack-item-content ne-dashboard-tile";
        // Tile chrome: header with the node label + a remove button.
        const header = document.createElement("div");
        header.className = "ne-dashboard-tile-header";
        const title = document.createElement("span");
        title.className = "ne-dashboard-tile-title";
        title.textContent = node.label;
        const close = document.createElement("button");
        close.className = "ne-dashboard-tile-close";
        close.title = "Remove tile (keeps the node in the graph)";
        close.textContent = "×";
        close.addEventListener("click", () => this.removeTile(node.id));
        header.appendChild(title);
        header.appendChild(close);
        const body = document.createElement("div");
        body.className = "ne-dashboard-tile-body";
        content.appendChild(header);
        content.appendChild(body);
        item.appendChild(content);

        // GridStack 11 API: `makeWidget(el, opts)` registers an
        // existing DOM element as a grid item and returns the wrapped
        // GridItemHTMLElement. `addWidget(opts)` is for when we want
        // GridStack to also create the element from `opts.content`;
        // here we already own the chrome (header + body) so makeWidget
        // is the right entry point.
        const gridItem: GridItemHTMLElement = this._grid.makeWidget(item, {
            id: node.id,
            x: opts?.x,
            y: opts?.y,
            w: opts?.w ?? 6,
            h: opts?.h ?? 4,
            autoPosition: opts?.x === undefined || opts?.y === undefined,
        });

        renderable.mountInto(body);

        // ResizeObserver covers three cases the renderable cares about:
        //   1. Initial mount — body element gets its real size AFTER
        //      mountInto returns (GridStack hasn't placed it yet), so
        //      the renderable's first read is often (0, 0). The
        //      observer fires once layout settles and onResize sets
        //      the right dimensions.
        //   2. GridStack drag/resize (live updates while the user is
        //      dragging the handle).
        //   3. Browser window resize and splitter drag (both reflow
        //      the GridStack content box).
        // We skip events that report a zero dimension — happens at
        // tile teardown right before the body is detached.
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const w = Math.floor(entry.contentRect.width);
                const h = Math.floor(entry.contentRect.height);
                if (w > 0 && h > 0) renderable.onResize(w, h);
            }
        });
        observer.observe(body);

        this._tiles.set(node.id, {
            node,
            renderable,
            item: gridItem,
            bodyEl: body,
            observer,
        });

        this._start();
    }

    /**
     * Remove a tile (and unmount its renderable). The graph node itself
     * is NOT removed — only the dashboard binding goes away. The user
     * can re-add the same node later from the graph.
     */
    public removeTile(nodeId: string): void {
        const tile = this._tiles.get(nodeId);
        if (!tile) return;
        // Disconnect the observer BEFORE unmounting so the last
        // teardown-induced size change doesn't trigger a stale onResize.
        tile.observer.disconnect();
        tile.renderable.unmountFrom(tile.bodyEl);
        this._grid.removeWidget(tile.item);
        this._tiles.delete(nodeId);
        if (this._tiles.size === 0) this._stop();
    }

    /** True when the given graph node is currently tiled. */
    public hasTile(nodeId: string): boolean {
        return this._tiles.has(nodeId);
    }

    /** Unmount every tile and stop the rAF loop. Idempotent. */
    public clear(): void {
        for (const nodeId of [...this._tiles.keys()]) this.removeTile(nodeId);
    }

    /** Serialize the current layout for save/load round-trip. */
    public serialize(): ISerializedDashboard {
        const tiles: ISerializedTile[] = [];
        for (const [nodeId, tile] of this._tiles) {
            // GridItemHTMLElement carries the live position/size in its
            // `.gridstackNode` field (GridStack mutates this in-place on
            // drag/resize, so reading here gives us the current state).
            const gs: GridStackNode | undefined = tile.item.gridstackNode;
            if (!gs) continue;
            tiles.push({
                nodeId,
                renderableType: tile.renderable.renderableType,
                x: gs.x ?? 0,
                y: gs.y ?? 0,
                w: gs.w ?? 6,
                h: gs.h ?? 4,
            });
        }
        return { id: this.id, name: this.name, tiles };
    }

    /**
     * Restore tiles from a serialized dashboard. The caller hands a
     * lookup `(nodeId) => NodeUI | undefined` that resolves saved ids
     * against the freshly-loaded graph; missing nodes are logged and
     * skipped (forward-compat: an older save might reference a node
     * type that's no longer available).
     */
    public deserialize(saved: ISerializedDashboard, resolveNode: (nodeId: string) => (NodeUI & { item: { data: unknown } }) | undefined): void {
        this.clear();
        this.name = saved.name ?? this.name;
        for (const tile of saved.tiles ?? []) {
            const node = resolveNode(tile.nodeId);
            if (!node) {
                console.warn(`[Dashboard] saved tile references unknown node "${tile.nodeId}", skipping`);
                continue;
            }
            const data = node.item.data;
            if (!isRenderable(data)) {
                console.warn(`[Dashboard] saved tile references node "${tile.nodeId}" that no longer implements IRenderable`);
                continue;
            }
            this.addTile(node, { x: tile.x, y: tile.y, w: tile.w, h: tile.h });
        }
    }

    /**
     * Stop the rAF loop and detach the GridStack instance. Call before
     * dropping the Dashboard reference to avoid leaking the loop or
     * GridStack DOM listeners.
     */
    public dispose(): void {
        this.clear();
        this._stop();
        this._grid.destroy(false);
        this._host.classList.remove("ne-dashboard");
    }

    // ── Animation loop ─────────────────────────────────────────────────

    private _start(): void {
        if (this._running) return;
        this._running = true;
        const tick = (): void => {
            if (!this._running) return;
            for (const tile of this._tiles.values()) {
                tile.renderable.repaint();
            }
            this._rafHandle = requestAnimationFrame(tick);
        };
        this._rafHandle = requestAnimationFrame(tick);
    }

    private _stop(): void {
        this._running = false;
        if (this._rafHandle !== null) {
            cancelAnimationFrame(this._rafHandle);
            this._rafHandle = null;
        }
    }
}

interface MountedTile {
    node: NodeUI;
    renderable: IRenderable;
    item: GridItemHTMLElement;
    bodyEl: HTMLElement;
    observer: ResizeObserver;
}
