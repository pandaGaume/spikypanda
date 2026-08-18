import { defaultLayout, LayoutStrategy } from "../auto-layout";
import { Camera } from "../camera";
import { Connection, ConnectionLinkModel, ConnectionPreview, deriveLinkKind } from "../connection";
import { createConnectionLinkModel } from "../link-model";
import { NavigationStack, SIM_GRAPH_TYPE_ID, SUB_GRAPH_JSON_KEY } from "../navigation-stack";
import { enrichNodeDefFromMeta } from "../node-def";
import { NodeUI } from "../node-ui";
import { Permissions } from "../permissions";
import { Port } from "../port";
import { Skin, SkinRegistry } from "../skin-registry";
import { StandardsRegistry } from "../standards";
import { darkSkin } from "../styles/skins/dark";
import { heliosSkin } from "../styles/skins/helios";
import { lightSkin } from "../styles/skins/light";
import { transparentDarkSkin, transparentLightSkin } from "../styles/skins/transparent";
import { arePortTypesCompatible, ExportProfile, EXPORT_PROFILES, NodeDef, PORT_COLORS, SerializedConnection, SerializedGraph } from "../types";
import { DebugBus } from "../debug-bus";
import type { ILinkRegistry, INodeRegistry, IRuntimeNode } from "spikypanda-core";
import type { Dashboard, ISerializedDashboard } from "../dashboard";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * GraphViewer: standalone graph-editing canvas component.
 *
 * Self-contained: takes a host HTMLElement and creates its own viewport,
 * SVG, and nodes layer inside it. No panels, no property editor, no
 * registry coupling - external orchestrators (Palette, NodePropertyEditor,
 * Toolbar) wire themselves to this viewer through its event hooks and
 * public methods.
 *
 * Owns: nodes[], connections[], camera, selection, skins.
 * Emits: onSelectionChanged, onNodeActivated, onNodeChanged,
 *        onNodeAdded, onNodeRemoved,
 *        onConnectionAdded, onConnectionRemoved.
 */
export class GraphViewer {
    readonly host: HTMLElement;
    readonly viewport: HTMLDivElement;
    readonly nodesLayer: HTMLDivElement;
    readonly svg: SVGSVGElement;
    readonly camera: Camera;
    readonly skins: SkinRegistry;
    readonly permissions: Permissions;
    readonly standards: StandardsRegistry;

    readonly nodes: NodeUI[] = [];
    readonly connections: Connection[] = [];

    /**
     * Optional dashboard instance attached to this viewer. When set,
     * `save()` includes its layout under `dashboards[]` in the produced
     * JSON, and `load()` restores it after the graph nodes are created.
     * Hosts that don't want a dashboard simply leave this null.
     *
     * Typed loosely (just the methods we call) so this file doesn't have
     * a hard runtime import on Dashboard — it stays free in single-bundle
     * deployments that exclude it.
     */
    dashboard: Dashboard | null = null;

    private currentSkinName = "dark";
    private appliedSkinKeys: string[] = [];
    /**
     * Element the skin's `--ne-color-*` tokens get applied to.
     * Defaults to the viewer host (legacy behaviour: skin scoped to the
     * canvas). Apps with sibling editor components (Palette, Property
     * panel, DebugConsole) call `setSkinTarget(appShell)` so the skin
     * tokens become an ancestor of every component, keeping them
     * visually coherent.
     */
    private skinTarget: HTMLElement;
    private currentProfile: ExportProfile = EXPORT_PROFILES["dark"];
    private layoutStrategy: LayoutStrategy = defaultLayout;

    private readonly selectedNodes = new Set<NodeUI>();
    private dragNode: NodeUI | null = null;
    /**
     * Which anchor of the dragged node the user grabbed. 0 for ordinary
     * nodes; 0..N-1 for split-view nodes. Used to drag a specific half
     * of a Feedback Channel (or similar) without moving the other half.
     */
    private dragAnchor: number = 0;
    private dragOffset = { x: 0, y: 0 };
    private isDraggingSelection = false;
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private dragPort: Port | null = null;
    /** Target port currently under the mouse during a drag-from-port,
     *  tracked so we can clear the .ne-port-compatible / -incompatible
     *  classes when the hover moves off. */
    private _hoverTargetPort: Port | null = null;
    private preview: ConnectionPreview | null = null;
    private reorderPort: Port | null = null;
    private reorderNode: NodeUI | null = null;
    private reorderStartY = 0;
    private selectionRect: HTMLDivElement | null = null;
    private selRectStart = { x: 0, y: 0 };

    /** Selection changed (after click, ctrl-click, rubber-band). nodes[] is empty when nothing selected. */
    onSelectionChanged: ((nodes: NodeUI[]) => void) | null = null;
    /** Node was double-clicked (typical trigger for opening the property editor). */
    onNodeActivated: ((node: NodeUI) => void) | null = null;
    /** A connection on a selected node's port was clicked or rubber-band-selected. */
    onConnectionSelected: ((conn: Connection) => void) | null = null;
    /** A new connection was just created and added to connections[]. */
    onConnectionAdded: ((conn: Connection) => void) | null = null;
    /** A connection was just removed from connections[]. */
    onConnectionRemoved: ((conn: Connection) => void) | null = null;
    /** A new node was just added to nodes[] (via addNode or a load). */
    onNodeAdded: ((node: NodeUI) => void) | null = null;
    /** A node was just removed from nodes[]. Fires BEFORE the node's
     *  dispose() so listeners can still read its label/ports/data — the
     *  Dashboard relies on this to remove the matching tile cleanly. */
    onNodeRemoved: ((node: NodeUI) => void) | null = null;

    /**
     * Drill-down navigation state.
     *
     * Always carries at least one entry (the implicit root). The
     * viewer's `enterSubGraph()` pushes a new level after capturing
     * the current canvas's JSON; `leaveSubGraph()` pops the top
     * level and restores the captured JSON. Subscribers (typically
     * the Breadcrumb component) listen via `navigationStack.onChanged`.
     *
     * Mounted as a public field rather than tucked behind getters so
     * the Breadcrumb can construct itself from the same instance
     * without going through a viewer method.
     */
    readonly navigationStack: NavigationStack = new NavigationStack();

    /**
     * Last node-registry handed to `load()`. Cached so
     * `enterSubGraph` / `leaveSubGraph` can re-load the inner / parent
     * graphs without re-asking the caller for it on every level switch.
     * Set on every successful `load(json, registry)` call AND can be
     * primed externally via `setNodeRegistry()` when the host bootstraps
     * an empty viewer.
     */
    private _registry: INodeRegistry | null = null;
    /** Link counterpart of `_registry`, used to restore concrete edge
     * definitions and their serialized properties. */
    private _linkRegistry: ILinkRegistry | null = null;

    constructor(host: HTMLElement, permissions: Permissions = Permissions.FULL, standards?: StandardsRegistry) {
        this.host = host;
        this.host.classList.add("ne-viewer");
        this.host.classList.add(`ne-perms-${permissions.toString()}`);
        this.permissions = permissions;
        this.standards = standards ?? new StandardsRegistry();
        this.camera = new Camera();

        this.viewport = document.createElement("div");
        this.viewport.className = "ne-viewport";

        this.svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
        this.svg.classList.add("ne-svg");
        this.viewport.appendChild(this.svg);

        this.nodesLayer = document.createElement("div");
        this.nodesLayer.className = "ne-nodes-layer";
        this.viewport.appendChild(this.nodesLayer);

        this.host.appendChild(this.viewport);

        // Default skin target = host. Apps with sibling editor
        // components retarget it via setSkinTarget() so the skin
        // tokens are applied to a shared ancestor.
        this.skinTarget = this.host;

        this.skins = new SkinRegistry();
        this.skins.register("dark", darkSkin);
        this.skins.register("light", lightSkin);
        this.skins.register("helios", heliosSkin);
        this.skins.register("transparent_dark", transparentDarkSkin);
        this.skins.register("transparent_light", transparentLightSkin);

        this.bindEvents();
        this.camera.apply(this.viewport);
        this.setSkin("dark");
    }

    // ── Graph manipulation ─────────────────────────────────────────────

    addNode(def: NodeDef, x = 100, y = 100): NodeUI {
        const node = new NodeUI(def, this.nodesLayer, this.standards);
        // Initial layout: place anchor 0 at the requested point, then
        // translate every secondary anchor so it keeps its constructor-
        // assigned offset relative to anchor 0. Without this, split-view
        // nodes' secondary widgets stay at world (0, 0) instead of
        // landing near where the user dropped the primary widget.
        const baseOffsets = node.anchors.map((a) => ({ dx: a.x, dy: a.y }));
        for (let i = 0; i < node.anchors.length; i++) {
            node.setAnchorPosition(i, x + baseOffsets[i].dx, y + baseOffsets[i].dy);
        }
        this.nodes.push(node);
        this.applyProfileToNode(node);
        if (this.onNodeAdded) this.onNodeAdded(node);
        return node;
    }

    removeNode(node: NodeUI): void {
        const connsToRemove = this.connections.filter((c) => node.getAllPorts().some((p) => c.containsPort(p)));
        for (const c of connsToRemove) this.removeConnection(c);

        // Auto-clean the dashboard tile if one is attached to this node.
        // Done BEFORE dispose so the tile teardown still sees a live
        // renderable. The onNodeRemoved hook below lets external code
        // (test harnesses, custom panels) react too.
        if (this.dashboard?.hasTile(node.id)) {
            this.dashboard.removeTile(node.id);
        }
        if (this.onNodeRemoved) this.onNodeRemoved(node);

        const idx = this.nodes.indexOf(node);
        if (idx >= 0) this.nodes.splice(idx, 1);
        node.dispose();
        this.selectedNodes.delete(node);
    }

    removeNodePort(node: NodeUI, port: Port): boolean {
        if (!node.inputs.includes(port) && !node.outputs.includes(port)) return false;
        const conns = this.connections.filter((c) => c.containsPort(port));
        for (const c of conns) this.removeConnection(c);
        if (port.direction === "input") return node.removeInput(port);
        return node.removeOutput(port);
    }

    connect(from: Port, to: Port, persistedModel?: Partial<ConnectionLinkModel>): Connection | null {
        if (from.direction === to.direction) {
            this._reportRejection(from, to, `same direction (${from.direction})`);
            return null;
        }
        if (from.direction === "input") {
            const tmp = from;
            from = to;
            to = tmp;
        }

        if (!arePortTypesCompatible(from.type, to.type)) {
            this._reportRejection(from, to, `incompatible types ${from.type} → ${to.type}`);
            return null;
        }

        const exists = this.connections.some((c) => c.from === from && c.to === to);
        if (exists) return null;

        const linkKind = deriveLinkKind(from.type, to.type);
        const model = createConnectionLinkModel(this._linkRegistry, from.type, to.type, from.name, to.name, linkKind, persistedModel);
        const conn = new Connection(from, to, this.svg, this.currentProfile.connectionStroke, linkKind, model);
        this.connections.push(conn);
        if (this.onConnectionAdded) this.onConnectionAdded(conn);
        return conn;
    }

    /** Owning node of a connection's source / destination port. Checks the
     *  control arrays too, so a wire on a `_completed`/`_start` control port is
     *  resolved like a data wire. */
    private _fromNodeOf(c: Connection): NodeUI {
        return this.nodes.find((n) => n.outputs.includes(c.from) || n.controlOutputs.includes(c.from))!;
    }
    private _toNodeOf(c: Connection): NodeUI {
        return this.nodes.find((n) => n.inputs.includes(c.to) || n.controlInputs.includes(c.to))!;
    }

    /** Serialize a connection's endpoints. Control-plane ports index their
     *  controlOutputs/controlInputs array and carry a `*Control` flag; data
     *  ports keep the legacy outputs/inputs index with no flag. */
    private _serializeConnEndpoints(c: Connection): Pick<SerializedConnection, "fromNodeId" | "fromPortIndex" | "toNodeId" | "toPortIndex" | "fromControl" | "toControl"> {
        const fromNode = this._fromNodeOf(c);
        const toNode = this._toNodeOf(c);
        const fromControl = fromNode.controlOutputs.includes(c.from);
        const toControl = toNode.controlInputs.includes(c.to);
        return {
            fromNodeId: fromNode.id,
            fromPortIndex: (fromControl ? fromNode.controlOutputs : fromNode.outputs).indexOf(c.from),
            toNodeId: toNode.id,
            toPortIndex: (toControl ? toNode.controlInputs : toNode.inputs).indexOf(c.to),
            ...(fromControl ? { fromControl: true } : {}),
            ...(toControl ? { toControl: true } : {}),
        };
    }

    /** Surface a connection refusal both in the browser console (for
     *  developers) and in the in-app DebugConsole (for end users). */
    private _reportRejection(from: Port, to: Port, reason: string): void {
        const msg = `${from.name} (${from.type}) → ${to.name} (${to.type}): ${reason}`;
        console.warn(`[graph-viewer] rejected connection ${msg}`);
        DebugBus.instance.log("warn", "graph-viewer", `Rejected connection ${msg}`);
    }

    /** Drag-hover feedback: while a wire is being dragged from `dragPort`,
     *  paint the port under the cursor green (legal drop) or red with a
     *  "not-allowed" cursor (illegal drop). No-op when no port is hovered. */
    private _updateDragHoverFeedback(targetEl: HTMLElement): void {
        if (!this.dragPort) return;
        const port = this.findPortByDot(targetEl);
        if (port === this._hoverTargetPort) return;
        this._clearDragHoverFeedback();
        if (!port || port === this.dragPort) return;
        // Mirror the rule in connect(): same-direction or incompatible
        // types both count as illegal drops here.
        const sameDir = port.direction === this.dragPort.direction;
        const compat = sameDir ? false : port.direction === "input" ? arePortTypesCompatible(this.dragPort.type, port.type) : arePortTypesCompatible(port.type, this.dragPort.type);
        port.el.classList.add(compat ? "ne-port-compatible" : "ne-port-incompatible");
        this.host.style.cursor = compat ? "alias" : "not-allowed";
        this._hoverTargetPort = port;
    }

    private _clearDragHoverFeedback(): void {
        if (this._hoverTargetPort) {
            this._hoverTargetPort.el.classList.remove("ne-port-compatible", "ne-port-incompatible");
            this._hoverTargetPort = null;
        }
        this.host.style.cursor = "";
    }

    removeConnection(conn: Connection): void {
        const idx = this.connections.indexOf(conn);
        if (idx >= 0) this.connections.splice(idx, 1);
        conn.remove();
        if (this.onConnectionRemoved) this.onConnectionRemoved(conn);
    }

    updateConnections(): void {
        for (const c of this.connections) c.update();
    }

    clear(): void {
        while (this.connections.length > 0) this.removeConnection(this.connections[0]);
        while (this.nodes.length > 0) this.removeNode(this.nodes[0]);
        this.selectedNodes.clear();
        if (this.onSelectionChanged) this.onSelectionChanged([]);
    }

    // ── Layout ─────────────────────────────────────────────────────────

    autoLayout(): void {
        this.layoutStrategy(this);
    }
    setLayoutStrategy(modulationStrategy: LayoutStrategy): void {
        this.layoutStrategy = modulationStrategy;
    }

    // ── Selection ──────────────────────────────────────────────────────

    getSelectedNodes(): ReadonlySet<NodeUI> {
        return this.selectedNodes;
    }

    /**
     * Externally-driven node UI refresh after a property panel commits
     * changes. The viewer does not own the editor registry; the orchestrator
     * calls this after PropertyEditor.onApply to keep label/color in sync.
     */
    applyNodeChanges(item: import("../inspectable").UIItemBase<unknown>, changes: Map<string, unknown>): void {
        const node = this.nodes.find((n) => n.item === item);
        if (!node) return;
        if (changes.has("label")) {
            const headerEl = node.el.querySelector(".ne-node-header");
            if (headerEl) headerEl.textContent = String(changes.get("label"));
        }
        if (changes.has("color")) {
            const headerEl = node.el.querySelector(".ne-node-header") as HTMLElement | null;
            if (headerEl) headerEl.style.background = String(changes.get("color"));
        }
    }

    // ── Skin / theming ─────────────────────────────────────────────────

    setSkin(name: string): void {
        const skin = this.skins.getSkin(name);
        if (!skin) return;

        for (const key of this.appliedSkinKeys) this.skinTarget.style.removeProperty(key);
        this.appliedSkinKeys = [];

        this.skinTarget.classList.remove(`ne-skin-${this.currentSkinName}`);
        this.skinTarget.classList.add(`ne-skin-${name}`);
        this.currentSkinName = name;

        for (const [key, value] of Object.entries(skin)) {
            this.skinTarget.style.setProperty(key, value);
            this.appliedSkinKeys.push(key);
        }

        this._applyProfile(this._deriveProfileFromSkin(skin));
    }

    getSkinName(): string {
        return this.currentSkinName;
    }

    /**
     * Retarget where the skin's CSS tokens are applied. Defaults to the
     * viewer's own host (legacy: skin scoped to the canvas). Apps with
     * sibling editor components (Palette, Property panel, DebugConsole)
     * pass a shared ancestor so the skin tokens cascade to all of them
     * and the editor looks coherent across panels.
     *
     * Any currently-applied skin is moved to the new target immediately,
     * so callers don't need to re-call setSkin().
     */
    setSkinTarget(el: HTMLElement): void {
        if (el === this.skinTarget) return;
        // Pull current tokens off the old target.
        for (const key of this.appliedSkinKeys) this.skinTarget.style.removeProperty(key);
        this.skinTarget.classList.remove(`ne-skin-${this.currentSkinName}`);
        const appliedKeys = this.appliedSkinKeys.slice();
        this.appliedSkinKeys = [];
        this.skinTarget = el;
        // Re-apply on the new target.
        const skin = this.skins.getSkin(this.currentSkinName);
        if (!skin) return;
        this.skinTarget.classList.add(`ne-skin-${this.currentSkinName}`);
        for (const key of appliedKeys) {
            const v = skin[key];
            if (v === undefined) continue;
            this.skinTarget.style.setProperty(key, v);
            this.appliedSkinKeys.push(key);
        }
    }

    private _deriveProfileFromSkin(skin: Skin): ExportProfile {
        const pick = (key: string, fallback: string): string => (skin[key] !== undefined ? skin[key] : fallback);
        const cur = this.currentProfile;
        return {
            background: pick("--ne-color-bg", cur.background ?? "#111"),
            nodeBody: pick("--ne-color-surface", cur.nodeBody),
            nodeBorder: pick("--ne-color-border", cur.nodeBorder),
            headerText: pick("--ne-color-text-strong", cur.headerText),
            portLabel: pick("--ne-color-text-muted", cur.portLabel),
            portStroke: pick("--ne-color-border-strong", cur.portStroke),
            connectionStroke: pick("--ne-color-connection", cur.connectionStroke),
        };
    }

    private _applyProfile(p: ExportProfile): void {
        this.currentProfile = p;
        const isLight = p.connectionStroke !== "#fff";
        const bg = p.background ?? (isLight ? "#f8f9fa" : "#111");
        const s = this.host.style;
        s.setProperty("--ne-bg", bg);
        s.setProperty("--ne-grid-dot", isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)");
        s.setProperty("--ne-node-body", p.nodeBody);
        s.setProperty("--ne-node-border", p.nodeBorder);
        s.setProperty("--ne-header-text", p.headerText);
        s.setProperty("--ne-port-label", p.portLabel);
        s.setProperty("--ne-port-stroke", p.portStroke);
        s.setProperty("--ne-connection", p.connectionStroke);

        const gridDot = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)";
        s.setProperty("background-color", bg, "important");
        s.setProperty("background-image", `radial-gradient(circle, ${gridDot} 1px, transparent 1px)`, "important");

        for (const n of this.nodes) this.applyProfileToNode(n);
        for (const c of this.connections) c.path.setAttribute("stroke", p.connectionStroke);
    }

    private applyProfileToNode(node: NodeUI): void {
        const p = this.currentProfile;
        node.el.style.setProperty("background-color", p.nodeBody, "important");
        node.el.style.setProperty("border-color", p.nodeBorder, "important");
        for (const port of node.getAllPorts()) {
            port.labelEl.style.color = p.portLabel;
            port.dot.style.borderColor = p.portStroke;
        }
    }

    // ── Serialization ──────────────────────────────────────────────────

    serialize(): SerializedGraph {
        return {
            nodes: this.nodes.map((n) => ({
                id: n.id,
                label: n.label,
                typeId: n.typeId,
                x: n.x,
                y: n.y,
                color: n.color,
                inputs: n.inputs.map((p) => ({ name: p.name, type: p.type, direction: p.direction })),
                outputs: n.outputs.map((p) => ({ name: p.name, type: p.type, direction: p.direction })),
            })),
            connections: this.connections.map((c) => this._serializeConnEndpoints(c)),
        };
    }

    save(): string {
        const connId = (c: Connection): string => `${this._fromNodeOf(c).id}:${c.from.name}->${this._toNodeOf(c).id}:${c.to.name}`;
        const data = {
            // v4 gives links the same persisted identity as nodes:
            // `{ id, typeId, data, from, to }`. A link registry can now
            // restore a concrete edge and its @cloneable properties.
            version: 4,
            layout: {
                nodes: this.nodes.map((n) => ({
                    id: n.id,
                    typeId: n.typeId,
                    x: n.x,
                    y: n.y,
                    // For split-view nodes (N >= 2 anchors), persist
                    // every anchor's position. Ordinary nodes (N == 1)
                    // skip this field entirely so v2/v3 saves are
                    // byte-identical to before. `anchors[0]` duplicates
                    // {x, y} for forward-compatibility — a loader that
                    // recognises `anchors` can ignore the legacy fields,
                    // and an older loader that only knows {x, y} still
                    // sees the primary position correctly.
                    anchors: n.anchors.length > 1 ? n.anchors.map((a) => ({ x: a.x, y: a.y })) : undefined,
                    color: n.color,
                    inputs: n.inputs.map((p) => ({ name: p.name, type: p.type, direction: p.direction })),
                    outputs: n.outputs.map((p) => ({ name: p.name, type: p.type, direction: p.direction })),
                })),
                connections: this.connections.map((c) => ({ id: connId(c), ...this._serializeConnEndpoints(c) })),
            },
            model: {
                nodes: this.nodes.map((n) => ({
                    id: n.id,
                    label: n.label,
                    typeId: n.typeId,
                    data: n.item.serialize(),
                })),
                connections: this.connections.map((c) => ({
                    id: connId(c),
                    typeId: c.typeId,
                    data: c.item.serialize(),
                    from: { node: this._fromNodeOf(c).id, port: c.from.name },
                    to: { node: this._toNodeOf(c).id, port: c.to.name },
                })),
            },
            // Dashboards array is plural-shaped from V1 so the on-disk
            // format stays stable when multi-dashboard (tabs) lands.
            // V1 emits exactly one entry when a Dashboard is attached,
            // or an empty array when this viewer has no dashboard host.
            dashboards: this.dashboard ? [this.dashboard.serialize()] : [],
        };
        return JSON.stringify(data, null, 2);
    }

    /**
     * Rebuild the graph from a JSON string previously produced by
     * `save()`. Optionally takes a `NodeRegistry`: when provided AND
     * the saved JSON carries a `typeId` per node (v3 saves), each node
     * is rebound to a fresh `IRuntimeNode` via `registry.create(typeId)`
     * and the saved state is restored on that instance through
     * `node.item.deserialize(savedData)`.
     *
     * Without a registry (or for legacy v2 saves with no typeId), the
     * load is layout-only: ports / positions / connections are restored
     * but the runtime model is just the raw saved JSON value, so play
     * mode won't actually fire those nodes — useful for previewing a
     * graph topology without a runtime context.
     *
     * The graph is cleared before reload. Errors during JSON parsing or
     * registry lookup bubble up to the caller; partial loads are
     * possible if some typeIds aren't registered (those nodes fall back
     * to layout-only).
     */
    load(json: string, registry?: INodeRegistry, linkRegistry?: ILinkRegistry): void {
        // Cache the registry so drill-down / leave can re-load
        // without the caller re-supplying it on every navigation.
        if (registry) this._registry = registry;
        if (linkRegistry) this._linkRegistry = linkRegistry;
        const data = JSON.parse(json);
        this.clear();

        const layout = data.layout ?? data;
        const model = data.model;
        const layoutNodes = layout.nodes ?? [];
        const layoutConns = layout.connections ?? [];
        const modelNodes = model?.nodes;
        const modelConns = model?.connections;

        const nodeMap = new Map<string, NodeUI>();
        for (const sn of layoutNodes) {
            const mn = modelNodes?.find((m: { id: string }) => m.id === sn.id);
            const label = mn?.label ?? sn.label ?? "Node";
            // typeId can live on either side (model or layout); prefer
            // model (closer to runtime truth) and fall back to layout.
            const typeId: string | undefined = mn?.typeId ?? sn.typeId;

            // Try the registry first: when both typeId and registry are
            // present, instantiate a fresh runtime IRuntimeNode that
            // play mode can actually fire(). Otherwise stay layout-only
            // and pass the saved JSON as the model (legacy behavior).
            let runtimeData: unknown = mn?.data ?? undefined;
            if (registry && typeId) {
                const instance = registry.create(typeId);
                if (instance) {
                    runtimeData = instance;
                } else if (typeof console !== "undefined") {
                    console.warn(`[graph-viewer] load: typeId "${typeId}" not in registry; falling back to layout-only for node "${sn.id}"`);
                }
            }

            let def: NodeDef = {
                label,
                typeId,
                inputs: (sn.inputs ?? [])
                    .filter((p: { direction: string }) => p.direction === "input")
                    .map((p: { name: string; type: string }) => ({ name: p.name, type: p.type })),
                outputs: (sn.outputs ?? [])
                    .filter((p: { direction: string }) => p.direction === "output")
                    .map((p: { name: string; type: string }) => ({ name: p.name, type: p.type })),
                color: sn.color,
                data: runtimeData,
            };
            // The save format only carries the port LISTS (whose order
            // the connections index into); everything else the palette-
            // drop path reads from the registry meta (split-view
            // anchorCount + per-port anchor routing, authoritative port
            // types, control ports, variadic descriptors, standards)
            // must be re-applied here, or a loaded Feedback Channel
            // collapses into a single box with its loop wires fully
            // drawn and stale saved port types render as mismatches.
            if (registry && typeId) {
                const meta = registry.meta(typeId);
                if (meta) {
                    def = enrichNodeDefFromMeta(def, meta, runtimeData as IRuntimeNode | undefined);
                }
            }
            const node = this.addNode(def, sn.x, sn.y);
            // Restore split-view anchor positions when they were saved.
            // Anchor 0 was already placed by addNode(sn.x, sn.y) above;
            // we replay anchors[1..] so each secondary widget lands where
            // the user dragged it last. Falls back to the default
            // gap-layout when `anchors` is absent (legacy single-anchor
            // saves OR newer saves whose split-view widget was never
            // moved away from the default offset).
            const savedAnchors = (sn as { anchors?: Array<{ x: number; y: number }> }).anchors;
            if (savedAnchors && Array.isArray(savedAnchors)) {
                for (let i = 0; i < savedAnchors.length; i++) {
                    const a = savedAnchors[i];
                    if (typeof a?.x === "number" && typeof a?.y === "number") {
                        node.setAnchorPosition(i, a.x, a.y);
                    }
                }
            }
            // Restore state only when we built a real runtime instance
            // (the deserialize contract is on IRuntimeNode, not on a
            // raw JSON payload that the legacy path leaves in def.data).
            if (registry && typeId && mn?.data !== null && mn?.data !== undefined) {
                const item = node.item.data as { deserialize?: (saved: unknown) => void };
                if (typeof item?.deserialize === "function") {
                    item.deserialize(mn.data);
                }
            }
            nodeMap.set(sn.id, node);
        }

        for (const sc of layoutConns) {
            const fromNode = nodeMap.get(sc.fromNodeId);
            const toNode = nodeMap.get(sc.toNodeId);
            if (fromNode && toNode) {
                // Control-plane endpoints index the control arrays (re-applied
                // from the registry meta by enrichNodeDefFromMeta above); data
                // endpoints keep the legacy outputs/inputs index.
                const fromPort = (sc.fromControl ? fromNode.controlOutputs : fromNode.outputs)[sc.fromPortIndex];
                const toPort = (sc.toControl ? toNode.controlInputs : toNode.inputs)[sc.toPortIndex];
                if (fromPort && toPort) {
                    const savedModel = modelConns?.find((candidate: { id?: string }) => candidate.id === sc.id);
                    this.connect(fromPort, toPort, savedModel ? { typeId: savedModel.typeId, data: savedModel.data } : undefined);
                }
            }
        }

        // Restore dashboard tile layout, if a Dashboard is attached AND
        // the save carries a dashboards[] entry. The resolver bridges
        // saved nodeIds back to the freshly-created NodeUI instances by
        // walking nodeMap (which is keyed by the SAVED id, not the new
        // assigned id like "node_42").
        const savedDashboards = (data as { dashboards?: unknown[] }).dashboards;
        if (this.dashboard && Array.isArray(savedDashboards) && savedDashboards.length > 0) {
            const saved = savedDashboards[0] as ISerializedDashboard;
            this.dashboard.deserialize(saved, (savedNodeId) => nodeMap.get(savedNodeId) ?? undefined);
        }
    }

    exportModel(): string {
        const data = {
            version: 1,
            nodes: this.nodes.map((n) => ({ id: n.id, label: n.label, data: n.item.serialize() })),
            connections: this.connections.map((c) => {
                const fromNode = this._fromNodeOf(c);
                const toNode = this._toNodeOf(c);
                return {
                    id: `${fromNode.id}:${c.from.name}->${toNode.id}:${c.to.name}`,
                    typeId: c.typeId,
                    data: c.item.serialize(),
                    from: { node: fromNode.id, port: c.from.name },
                    to: { node: toNode.id, port: c.to.name },
                };
            }),
        };
        return JSON.stringify(data, null, 2);
    }

    // ── Drill-down navigation (P5b) ─────────────────────────────────────

    /**
     * Prime the registry without performing a load. Useful when the
     * host bootstraps an empty viewer that the user later fills via
     * the palette and saves — `enterSubGraph()` still has the
     * registry it needs to re-instantiate runtime nodes inside a
     * sub-graph view.
     */
    public setNodeRegistry(registry: INodeRegistry | null): void {
        this._registry = registry;
    }

    public getNodeRegistry(): INodeRegistry | null {
        return this._registry;
    }

    /** Prime the concrete-link registry used by new cables and loads. */
    public setLinkRegistry(registry: ILinkRegistry | null): void {
        this._linkRegistry = registry;
    }

    public getLinkRegistry(): ILinkRegistry | null {
        return this._linkRegistry;
    }

    /**
     * Push the current canvas onto the navigation stack and load the
     * sub-graph stored on the given Sim.Graph node's `item.data`
     * under `SUB_GRAPH_JSON_KEY`. If no sub-graph has been authored
     * yet, an empty canvas is shown — the user can build it in place
     * and the changes flow back on `leaveSubGraph()`.
     *
     * Idempotent guard: the call no-ops when `node.typeId` is not a
     * Sim.Graph type, so a stray double-click on a regular node
     * never accidentally drills.
     */
    public enterSubGraph(node: NodeUI): void {
        if (node.typeId !== SIM_GRAPH_TYPE_ID) return;
        const currentJson = this.save();
        const innerJson = this._readSubGraphJson(node) ?? this._emptySubGraphJson();
        this.navigationStack.push({
            parentNodeId: node.id,
            label: node.label || "Sub-graph",
            parentSnapshot: currentJson,
        });
        this.clear();
        this.load(innerJson, this._registry ?? undefined);
    }

    /**
     * Pop the top navigation level: save the current (sub-graph)
     * canvas onto the parent node's data, then restore the parent
     * canvas from the stack's snapshot. No-op when already at root
     * (`depth === 1`).
     */
    public leaveSubGraph(): void {
        if (this.navigationStack.depth <= 1) return;
        const currentInnerJson = this.save();
        const popped = this.navigationStack.pop();
        if (!popped || !popped.parentSnapshot) return;
        this.clear();
        this.load(popped.parentSnapshot, this._registry ?? undefined);
        // Write the sub-graph back to its parent node (now visible
        // again on the restored canvas) so a subsequent
        // `enterSubGraph()` sees the user's latest edits.
        if (popped.parentNodeId) {
            const parent = this.nodes.find((n) => n.id === popped.parentNodeId);
            if (parent) this._writeSubGraphJson(parent, currentInnerJson);
        }
    }

    /**
     * Pop the navigation stack down to (and not including) the given
     * level index. `0` returns to the root, `1` goes one level deep,
     * etc. The breadcrumb wires its click handler to this method.
     * Intermediate sub-graphs along the path are NOT serialized back
     * — only the top-most one is saved. V1 limitation; revisit if
     * users actually edit intermediate levels often.
     */
    public popNavigationTo(index: number): void {
        // Single hop = canonical leave path (saves the current
        // sub-graph back). Multi-hop discards intermediate edits.
        if (index >= this.navigationStack.depth - 1) return;
        if (index === this.navigationStack.depth - 2) {
            this.leaveSubGraph();
            return;
        }
        // Multi-level pop: save the current canvas onto its parent,
        // then trash intermediate stack entries and restore the
        // selected level's snapshot directly.
        const currentInnerJson = this.save();
        const currentParentId = this.navigationStack.current.parentNodeId;
        const popped = this.navigationStack.popTo(index);
        const target = popped[0]; // oldest popped = the level we're restoring
        if (!target || !target.parentSnapshot) return;
        this.clear();
        this.load(target.parentSnapshot, this._registry ?? undefined);
        if (currentParentId) {
            const parent = this.nodes.find((n) => n.id === currentParentId);
            if (parent) this._writeSubGraphJson(parent, currentInnerJson);
        }
    }

    private _readSubGraphJson(node: NodeUI): string | null {
        const data = node.item.data as Record<string, unknown> | null | undefined;
        if (!data) return null;
        const stored = data[SUB_GRAPH_JSON_KEY];
        return typeof stored === "string" && stored.length > 0 ? stored : null;
    }

    private _writeSubGraphJson(node: NodeUI, json: string): void {
        const item = node.item as { data: Record<string, unknown> | null };
        const current = item.data ?? {};
        const next = { ...current, [SUB_GRAPH_JSON_KEY]: json };
        item.data = next;
    }

    private _emptySubGraphJson(): string {
        return JSON.stringify({
            version: 3,
            layout: { nodes: [], connections: [] },
            model: { nodes: [], connections: [] },
            dashboards: [],
        });
    }

    // ── SVG export ─────────────────────────────────────────────────────

    exportSVG(skinName?: string): string {
        let theme: ExportProfile = this.currentProfile;
        if (skinName) {
            const requestedSkin = this.skins.getSkin(skinName);
            if (requestedSkin) theme = this._deriveProfileFromSkin(requestedSkin);
        }

        const PADDING = 40,
            HEADER_H = 24,
            PORT_R = 5,
            PORT_SPACING = 20,
            PORT_PAD_TOP = 10;
        const FONT = "'Segoe UI', system-ui, sans-serif";

        // One drawn box PER ANCHOR, not per node. Split-view nodes (e.g.
        // Feedback Channel, anchorCount >= 2) own several independently-
        // positioned widgets; rendering a single box at anchor 0 collapsed
        // them and dropped the secondary widget's position. Each port is
        // grouped under the anchor whose DOM subtree contains it
        // (findAnchorIndex), and drawn at that anchor's own world position.
        // Ordinary single-anchor nodes are unchanged (one box, all ports).
        interface AnchorBox {
            label: string;
            headerColor: string;
            x: number;
            y: number;
            w: number;
            h: number;
            inputs: Port[];
            outputs: Port[];
        }
        const boxes: AnchorBox[] = [];
        const portPositions = new Map<Port, { x: number; y: number }>();

        for (const n of this.nodes) {
            const headerColor = n.anchors[0]?.headerEl?.getAttribute("style")?.match(/background:\s*([^;]+)/)?.[1] || "#335";
            const inByAnchor: Port[][] = n.anchors.map(() => []);
            const outByAnchor: Port[][] = n.anchors.map(() => []);
            for (const p of n.inputs) {
                const ai = n.findAnchorIndex(p.el);
                inByAnchor[ai < 0 ? 0 : ai].push(p);
            }
            for (const p of n.outputs) {
                const ai = n.findAnchorIndex(p.el);
                outByAnchor[ai < 0 ? 0 : ai].push(p);
            }

            for (let ai = 0; ai < n.anchors.length; ai++) {
                const anchor = n.anchors[ai];
                const rect = anchor.el.getBoundingClientRect();
                const w = Math.max(140, rect.width / this.camera.scale);
                const ins = inByAnchor[ai];
                const outs = outByAnchor[ai];
                const maxPorts = Math.max(ins.length, outs.length, 1);
                const h = HEADER_H + PORT_PAD_TOP + maxPorts * PORT_SPACING + 8;
                for (let i = 0; i < ins.length; i++) {
                    portPositions.set(ins[i], { x: anchor.x, y: anchor.y + HEADER_H + PORT_PAD_TOP + i * PORT_SPACING + PORT_SPACING / 2 });
                }
                for (let i = 0; i < outs.length; i++) {
                    portPositions.set(outs[i], { x: anchor.x + w, y: anchor.y + HEADER_H + PORT_PAD_TOP + i * PORT_SPACING + PORT_SPACING / 2 });
                }
                boxes.push({ label: n.label, headerColor, x: anchor.x, y: anchor.y, w, h, inputs: ins, outputs: outs });
            }
        }

        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        for (const b of boxes) {
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.w);
            maxY = Math.max(maxY, b.y + b.h);
        }
        if (!Number.isFinite(minX)) {
            minX = 0;
            minY = 0;
            maxX = 0;
            maxY = 0;
        }
        const svgW = maxX - minX + PADDING * 2;
        const svgH = maxY - minY + PADDING * 2;
        const ox = -minX + PADDING,
            oy = -minY + PADDING;

        const parts: string[] = [];
        parts.push(`<svg xmlns="${SVG_NS}" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`);
        if (theme.background) parts.push(`<rect width="100%" height="100%" fill="${theme.background}" rx="8"/>`);

        const allPortPos = new Map<Port, { x: number; y: number }>();
        for (const [p, pos] of portPositions) allPortPos.set(p, { x: pos.x + ox, y: pos.y + oy });

        for (const c of this.connections) {
            const p1 = allPortPos.get(c.from);
            const p2 = allPortPos.get(c.to);
            if (!p1 || !p2) continue;
            const dx = Math.abs(p2.x - p1.x) * 0.5;
            parts.push(
                `<path d="M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}" stroke="${theme.connectionStroke}" fill="none" stroke-width="2"/>`
            );
        }

        for (const b of boxes) {
            const nx = b.x + ox,
                ny = b.y + oy;
            parts.push(`<g>`);
            parts.push(`<rect x="${nx}" y="${ny}" width="${b.w}" height="${b.h}" rx="8" fill="${theme.nodeBody}" stroke="${theme.nodeBorder}" stroke-width="1"/>`);
            parts.push(`<rect x="${nx}" y="${ny}" width="${b.w}" height="${HEADER_H}" rx="8" fill="${b.headerColor}"/>`);
            parts.push(`<rect x="${nx}" y="${ny + HEADER_H - 8}" width="${b.w}" height="8" fill="${b.headerColor}"/>`);
            parts.push(`<text x="${nx + 10}" y="${ny + 16}" fill="${theme.headerText}" font-family="${FONT}" font-size="11" font-weight="600">${b.label}</text>`);

            for (let i = 0; i < b.inputs.length; i++) {
                const p = b.inputs[i];
                const pos = allPortPos.get(p)!;
                const color = PORT_COLORS[p.type];
                parts.push(`<circle cx="${pos.x}" cy="${pos.y}" r="${PORT_R}" fill="${color}" stroke="${theme.portStroke}" stroke-width="1.5"/>`);
                parts.push(`<text x="${pos.x + PORT_R + 4}" y="${pos.y + 4}" fill="${theme.portLabel}" font-family="${FONT}" font-size="9">${p.name}</text>`);
            }
            for (let i = 0; i < b.outputs.length; i++) {
                const p = b.outputs[i];
                const pos = allPortPos.get(p)!;
                const color = PORT_COLORS[p.type];
                parts.push(`<circle cx="${pos.x}" cy="${pos.y}" r="${PORT_R}" fill="${color}" stroke="${theme.portStroke}" stroke-width="1.5"/>`);
                parts.push(`<text x="${pos.x - PORT_R - 4}" y="${pos.y + 4}" fill="${theme.portLabel}" font-family="${FONT}" font-size="9" text-anchor="end">${p.name}</text>`);
            }
            parts.push(`</g>`);
        }
        parts.push(`</svg>`);
        return parts.join("\n");
    }

    downloadSVG(filename = "graph.svg"): void {
        this.downloadFile(this.exportSVG(), filename, "image/svg+xml");
    }

    downloadSave(filename = "graph.json"): void {
        this.downloadFile(this.save(), filename, "application/json");
    }

    downloadExport(filename = "model.json"): void {
        this.downloadFile(this.exportModel(), filename, "application/json");
    }

    /**
     * Open the browser file picker for a `.json` saved graph, read it,
     * and replace the current graph via `load(text, registry)`. Mirrors
     * the `downloadSave` UX path on the read side.
     *
     * `registry` is forwarded to `load`: pass the same NodeRegistry the
     * palette is bound to so saved typeIds resolve back to fresh runtime
     * IRuntimeNode instances. Without it the load is layout-only.
     *
     * `onError` receives anything thrown by JSON.parse or load() — typically
     * the host shows a toast / alert.
     */
    pickAndLoad(registry?: INodeRegistry, opts?: { onError?: (e: unknown) => void; accept?: string }): void {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = opts?.accept ?? ".spikypanda,application/json,.json";
        input.style.display = "none";
        input.addEventListener("change", () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onerror = () => {
                opts?.onError?.(reader.error ?? new Error("FileReader error"));
            };
            reader.onload = () => {
                try {
                    this.load(String(reader.result ?? ""), registry);
                } catch (e) {
                    opts?.onError?.(e);
                }
            };
            reader.readAsText(file);
        });
        // Append-and-click pattern keeps the input GC-safe across browsers
        // that ignore click() on detached inputs.
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    private downloadFile(content: string, filename: string, type: string): void {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ── Selection internals ────────────────────────────────────────────

    private emitSelectionChanged(): void {
        if (this.onSelectionChanged) this.onSelectionChanged([...this.selectedNodes]);
    }

    private clearSelection(): void {
        for (const n of this.selectedNodes) n.setSelected(false);
        this.selectedNodes.clear();
        this.emitSelectionChanged();
    }

    private selectNode(node: NodeUI, addToSelection = false): void {
        if (!addToSelection) {
            for (const n of this.selectedNodes) if (n !== node) n.setSelected(false);
            this.selectedNodes.clear();
        }

        if (addToSelection && this.selectedNodes.has(node)) {
            node.setSelected(false);
            this.selectedNodes.delete(node);
        } else {
            node.setSelected(true);
            this.selectedNodes.add(node);
        }
        this.emitSelectionChanged();
    }

    private selectNodes(nodes: NodeUI[]): void {
        for (const n of this.selectedNodes) n.setSelected(false);
        this.selectedNodes.clear();
        for (const n of nodes) {
            n.setSelected(true);
            this.selectedNodes.add(n);
        }
        this.emitSelectionChanged();
    }

    // ── Hit-testing helpers ────────────────────────────────────────────

    private findNodeByEl(el: HTMLElement): NodeUI | undefined {
        const nodeEl = el.closest(".ne-node") as HTMLElement | null;
        if (!nodeEl) return undefined;
        // Walk every node's anchor list — split-view nodes own multiple
        // .ne-node elements that all map back to the same logical NodeUI.
        return this.nodes.find((n) => n.anchors.some((a) => a.el === nodeEl));
    }

    /**
     * Locate the node AND the anchor index that contains the given DOM
     * element. Returns `{ node, anchor }` or undefined when the element
     * is not inside any node. Used by the drag handler so we move the
     * specific anchor of a split-view node, not the entire group.
     */
    private findNodeAndAnchorByEl(el: HTMLElement): { node: NodeUI; anchor: number } | undefined {
        const nodeEl = el.closest(".ne-node") as HTMLElement | null;
        if (!nodeEl) return undefined;
        for (const node of this.nodes) {
            for (let i = 0; i < node.anchors.length; i++) {
                if (node.anchors[i].el === nodeEl) return { node, anchor: i };
            }
        }
        return undefined;
    }

    private findPortByDot(el: HTMLElement): Port | undefined {
        if (!el.classList.contains("ne-port-dot")) return undefined;
        for (const node of this.nodes) {
            const port = node.findPortByDot(el);
            if (port) return port;
        }
        return undefined;
    }

    private findPortByLabel(el: HTMLElement): Port | undefined {
        if (!el.classList.contains("ne-port-label")) return undefined;
        for (const node of this.nodes) {
            const port = node.getAllPorts().find((p) => p.labelEl === el);
            if (port) return port;
        }
        return undefined;
    }

    private findNodeForPort(port: Port): NodeUI | undefined {
        return this.nodes.find((n) => n.inputs.includes(port) || n.outputs.includes(port) || n.controlInputs.includes(port) || n.controlOutputs.includes(port));
    }

    private findConnectionByPath(el: HTMLElement): Connection | undefined {
        return this.connections.find((c) => (c.path as unknown) === el);
    }

    // ── Events ─────────────────────────────────────────────────────────

    private bindEvents(): void {
        this.host.addEventListener("wheel", this.onWheel.bind(this), { passive: false });
        this.host.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.host.addEventListener("dblclick", this.onDblClick.bind(this));
        window.addEventListener("mousemove", this.onMouseMove.bind(this));
        window.addEventListener("mouseup", this.onMouseUp.bind(this));
        window.addEventListener("keydown", this.onKeyDown.bind(this));
        this.host.addEventListener("contextmenu", this.onContextMenu.bind(this));
    }

    private onWheel(e: WheelEvent): void {
        e.preventDefault();
        this.camera.zoom(e.deltaY, e.clientX, e.clientY);
        this.camera.apply(this.viewport);
        this.updateConnections();
    }

    private onDblClick(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        const node = this.findNodeByEl(target);
        if (!node) return;
        if (!this.selectedNodes.has(node)) this.selectNode(node, false);
        // Intercept double-click on a Sim.Graph node: drill into its
        // sub-graph rather than firing the generic "activated"
        // callback (which usually opens the property editor). The
        // user can still inspect properties via single-click; double-
        // click is the canonical "enter this container" gesture
        // across editors (UE Blueprint, Houdini, Substance).
        if (node.typeId === SIM_GRAPH_TYPE_ID) {
            this.enterSubGraph(node);
            return;
        }
        if (this.onNodeActivated) this.onNodeActivated(node);
    }

    private onMouseDown(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        const canWrite = this.permissions.write;

        // Port label drag (reorder) — write only.
        const labelPort = this.findPortByLabel(target);
        if (labelPort) {
            if (!canWrite) {
                e.preventDefault();
                return;
            }
            e.stopPropagation();
            e.preventDefault();
            this.reorderPort = labelPort;
            this.reorderNode = this.findNodeForPort(labelPort) ?? null;
            this.reorderStartY = e.clientY;
            labelPort.el.classList.add("ne-port-dragging");
            return;
        }

        // Port dot drag (connect) — write only.
        const port = this.findPortByDot(target);
        if (port) {
            if (!canWrite) return;
            e.stopPropagation();
            this.dragPort = port;
            this.preview = new ConnectionPreview(this.svg);
            return;
        }

        // Node click: selection is read; drag setup is write. Use the
        // anchor-aware lookup so a click on the secondary half of a
        // split-view node grabs that specific half, not the primary.
        const hit = this.findNodeAndAnchorByEl(target);
        if (hit) {
            const node = hit.node;
            e.stopPropagation();
            const ctrlOrMeta = e.ctrlKey || e.metaKey;
            if (ctrlOrMeta) this.selectNode(node, true);
            else if (!this.selectedNodes.has(node)) this.selectNode(node, false);

            if (canWrite && this.selectedNodes.has(node)) {
                this.dragNode = node;
                this.dragAnchor = hit.anchor;
                this.isDraggingSelection = this.selectedNodes.size > 1;
                const worldMouse = this.camera.screenToWorld(e.clientX, e.clientY);
                const a = node.anchors[hit.anchor];
                this.dragOffset.x = worldMouse.x - a.x;
                this.dragOffset.y = worldMouse.y - a.y;
                a.el.style.cursor = "grabbing";
            }
            return;
        }

        const conn = this.findConnectionByPath(target);
        if (conn) {
            e.stopPropagation();
            this.clearSelection();
            if (this.onConnectionSelected) this.onConnectionSelected(conn);
            return;
        }

        // Background
        if (e.button === 2 || e.button === 1) {
            this.isPanning = true;
            this.panStart.x = e.clientX - this.camera.x;
            this.panStart.y = e.clientY - this.camera.y;
            this.host.style.cursor = "grabbing";
        } else {
            this.clearSelection();
            this.selRectStart.x = e.clientX;
            this.selRectStart.y = e.clientY;
            this.selectionRect = document.createElement("div");
            this.selectionRect.className = "ne-selection-rect";
            this.host.appendChild(this.selectionRect);
        }
    }

    private onMouseMove(e: MouseEvent): void {
        if (this.reorderPort && this.reorderNode) {
            const dy = e.clientY - this.reorderStartY;
            const portHeight = this.reorderPort.el.offsetHeight + 4;
            const threshold = portHeight * 0.6;
            if (Math.abs(dy) > threshold) {
                const direction = dy > 0 ? 1 : -1;
                // Pick the array the port actually lives in: control vs
                // data. The dragged-port DOM carries .ne-port-control on
                // control ports, so we can tell without slot-name guessing.
                const isCtrl = this.reorderPort.el.classList.contains("ne-port-control");
                const ports = isCtrl
                    ? this.reorderPort.direction === "input"
                        ? this.reorderNode.controlInputs
                        : this.reorderNode.controlOutputs
                    : this.reorderPort.direction === "input"
                      ? this.reorderNode.inputs
                      : this.reorderNode.outputs;
                const idx = ports.indexOf(this.reorderPort);
                const newIdx = idx + direction;
                if (newIdx >= 0 && newIdx < ports.length) {
                    if (isCtrl) {
                        if (this.reorderPort.direction === "input") this.reorderNode.moveControlInputPort(idx, newIdx);
                        else this.reorderNode.moveControlOutputPort(idx, newIdx);
                    } else {
                        if (this.reorderPort.direction === "input") this.reorderNode.moveInputPort(idx, newIdx);
                        else this.reorderNode.moveOutputPort(idx, newIdx);
                    }
                    this.reorderStartY = e.clientY;
                    this.updateConnections();
                }
            }
            return;
        }
        if (this.dragPort && this.preview) {
            const p1 = this.dragPort.getCenter();
            this.preview.updateScreen(p1.x, p1.y, e.clientX, e.clientY);
            this._updateDragHoverFeedback(e.target as HTMLElement);
            return;
        }
        if (this.dragNode) {
            const worldMouse = this.camera.screenToWorld(e.clientX, e.clientY);
            const newX = worldMouse.x - this.dragOffset.x;
            const newY = worldMouse.y - this.dragOffset.y;
            const a = this.dragNode.anchors[this.dragAnchor];
            if (this.isDraggingSelection && this.selectedNodes.size > 1) {
                // Multi-select drag uses the grabbed anchor as the
                // reference point; every other selected node moves by
                // the same delta on its OWN primary anchor (anchor 0).
                // Secondary anchors of split nodes keep their own
                // positions — visually they "snap" with their primary.
                const dx = newX - a.x,
                    dy = newY - a.y;
                for (const n of this.selectedNodes) n.setPosition(n.x + dx, n.y + dy);
            } else {
                this.dragNode.setAnchorPosition(this.dragAnchor, newX, newY);
            }
            this.updateConnections();
            return;
        }
        if (this.selectionRect) {
            const x1 = Math.min(this.selRectStart.x, e.clientX);
            const y1 = Math.min(this.selRectStart.y, e.clientY);
            const x2 = Math.max(this.selRectStart.x, e.clientX);
            const y2 = Math.max(this.selRectStart.y, e.clientY);
            const hostRect = this.host.getBoundingClientRect();
            this.selectionRect.style.left = x1 - hostRect.left + "px";
            this.selectionRect.style.top = y1 - hostRect.top + "px";
            this.selectionRect.style.width = x2 - x1 + "px";
            this.selectionRect.style.height = y2 - y1 + "px";
            return;
        }
        if (this.isPanning) {
            this.camera.x = e.clientX - this.panStart.x;
            this.camera.y = e.clientY - this.panStart.y;
            this.camera.apply(this.viewport);
            this.updateConnections();
        }
    }

    private onMouseUp(e: MouseEvent): void {
        if (this.reorderPort) {
            this.reorderPort.el.classList.remove("ne-port-dragging");
            this.reorderPort = null;
            this.reorderNode = null;
            return;
        }
        if (this.dragPort && this.preview) {
            this.preview.remove();
            this.preview = null;
            const target = e.target as HTMLElement;
            const targetPort = this.findPortByDot(target);
            if (targetPort && targetPort !== this.dragPort) this.connect(this.dragPort, targetPort);
            this._clearDragHoverFeedback();
            this.dragPort = null;
            return;
        }
        if (this.dragNode) {
            const a = this.dragNode.anchors[this.dragAnchor] ?? this.dragNode.anchors[0];
            if (a) a.el.style.cursor = "grab";
            this.dragNode = null;
            this.dragAnchor = 0;
            this.isDraggingSelection = false;
            return;
        }
        if (this.selectionRect) {
            const rect = this.selectionRect.getBoundingClientRect();
            this.selectionRect.remove();
            this.selectionRect = null;
            if (rect.width > 4 || rect.height > 4) {
                const hits = this.nodes.filter((n) => {
                    const nr = n.el.getBoundingClientRect();
                    return nr.left < rect.right && nr.right > rect.left && nr.top < rect.bottom && nr.bottom > rect.top;
                });
                if (hits.length > 0) this.selectNodes(hits);
            }
            return;
        }
        if (this.isPanning) {
            this.isPanning = false;
            this.host.style.cursor = "";
        }
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (e.key === "Delete" || e.key === "Backspace") {
            if (!this.permissions.write) return;
            if (this.selectedNodes.size > 0 && document.activeElement === document.body) {
                const toRemove = [...this.selectedNodes];
                for (const node of toRemove) this.removeNode(node);
                this.emitSelectionChanged();
            }
        }
        // Drill-up shortcuts: Esc or Ctrl+ArrowUp leave the current
        // sub-graph back to its parent canvas. Same focus guard as
        // Delete — we only react when no input element is focused,
        // so the user can still press Esc inside a text field to
        // dismiss it without surprise navigation.
        if ((e.key === "Escape" || (e.key === "ArrowUp" && (e.ctrlKey || e.metaKey))) && document.activeElement === document.body) {
            if (this.navigationStack.depth > 1) {
                e.preventDefault();
                this.leaveSubGraph();
            }
        }
    }

    private onContextMenu(e: MouseEvent): void {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const conn = this.findConnectionByPath(target);
        if (conn && this.permissions.write) this.removeConnection(conn);
    }
}
