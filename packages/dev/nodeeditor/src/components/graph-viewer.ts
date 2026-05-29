import { defaultLayout, LayoutStrategy } from "../auto-layout";
import { Camera } from "../camera";
import { Connection, ConnectionPreview } from "../connection";
import { NodeUI } from "../node-ui";
import { Permissions } from "../permissions";
import { Port } from "../port";
import { Skin, SkinRegistry } from "../skin-registry";
import { StandardsRegistry } from "../standards";
import { darkSkin } from "../styles/skins/dark";
import { heliosSkin } from "../styles/skins/helios";
import { lightSkin } from "../styles/skins/light";
import { transparentDarkSkin, transparentLightSkin } from "../styles/skins/transparent";
import { arePortTypesCompatible, ExportProfile, EXPORT_PROFILES, NodeDef, PORT_COLORS, SerializedGraph } from "../types";
import { DebugBus } from "../debug-bus";
import type { INodeRegistry } from "spikypanda-core";

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
        node.setPosition(x, y);
        this.nodes.push(node);
        this.applyProfileToNode(node);
        return node;
    }

    removeNode(node: NodeUI): void {
        const connsToRemove = this.connections.filter((c) => node.getAllPorts().some((p) => c.containsPort(p)));
        for (const c of connsToRemove) this.removeConnection(c);

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

    connect(from: Port, to: Port): Connection | null {
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

        const conn = new Connection(from, to, this.svg, this.currentProfile.connectionStroke);
        this.connections.push(conn);
        if (this.onConnectionAdded) this.onConnectionAdded(conn);
        return conn;
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
    setLayoutStrategy(strategy: LayoutStrategy): void {
        this.layoutStrategy = strategy;
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
            connections: this.connections.map((c) => {
                const fromNode = this.nodes.find((n) => n.outputs.includes(c.from))!;
                const toNode = this.nodes.find((n) => n.inputs.includes(c.to))!;
                return {
                    fromNodeId: fromNode.id,
                    fromPortIndex: fromNode.outputs.indexOf(c.from),
                    toNodeId: toNode.id,
                    toPortIndex: toNode.inputs.indexOf(c.to),
                };
            }),
        };
    }

    save(): string {
        const connId = (c: Connection): string => {
            const fromNode = this.nodes.find((n) => n.outputs.includes(c.from))!;
            const toNode = this.nodes.find((n) => n.inputs.includes(c.to))!;
            return `${fromNode.id}:${c.from.name}->${toNode.id}:${c.to.name}`;
        };
        const data = {
            // v3 adds `typeId` per node in BOTH layout and model so load()
            // can rebind every node to a fresh runtime IRuntimeNode via
            // a NodeRegistry. v2 saves still load (typeId is optional);
            // the runtime model just isn't rebuildable from them.
            version: 3,
            layout: {
                nodes: this.nodes.map((n) => ({
                    id: n.id,
                    typeId: n.typeId,
                    x: n.x,
                    y: n.y,
                    color: n.color,
                    inputs: n.inputs.map((p) => ({ name: p.name, type: p.type, direction: p.direction })),
                    outputs: n.outputs.map((p) => ({ name: p.name, type: p.type, direction: p.direction })),
                })),
                connections: this.connections.map((c) => {
                    const fromNode = this.nodes.find((n) => n.outputs.includes(c.from))!;
                    const toNode = this.nodes.find((n) => n.inputs.includes(c.to))!;
                    return {
                        id: connId(c),
                        fromNodeId: fromNode.id,
                        fromPortIndex: fromNode.outputs.indexOf(c.from),
                        toNodeId: toNode.id,
                        toPortIndex: toNode.inputs.indexOf(c.to),
                    };
                }),
            },
            model: {
                nodes: this.nodes.map((n) => ({
                    id: n.id,
                    label: n.label,
                    typeId: n.typeId,
                    data: n.item.serialize(),
                })),
                connections: this.connections.map((c) => {
                    const fromNode = this.nodes.find((nd) => nd.outputs.includes(c.from))!;
                    const toNode = this.nodes.find((nd) => nd.inputs.includes(c.to))!;
                    return {
                        id: connId(c),
                        from: { node: fromNode.id, port: c.from.name },
                        to: { node: toNode.id, port: c.to.name },
                    };
                }),
            },
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
    load(json: string, registry?: INodeRegistry): void {
        const data = JSON.parse(json);
        this.clear();

        const layout = data.layout ?? data;
        const model = data.model;
        const layoutNodes = layout.nodes ?? [];
        const layoutConns = layout.connections ?? [];
        const modelNodes = model?.nodes;

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

            const def: NodeDef = {
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
            const node = this.addNode(def, sn.x, sn.y);
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
                const fromPort = fromNode.outputs[sc.fromPortIndex];
                const toPort = toNode.inputs[sc.toPortIndex];
                if (fromPort && toPort) this.connect(fromPort, toPort);
            }
        }
    }

    exportModel(): string {
        const data = {
            version: 1,
            nodes: this.nodes.map((n) => ({ id: n.id, label: n.label, data: n.item.serialize() })),
            connections: this.connections.map((c) => {
                const fromNode = this.nodes.find((nd) => nd.outputs.includes(c.from))!;
                const toNode = this.nodes.find((nd) => nd.inputs.includes(c.to))!;
                return {
                    id: `${fromNode.id}:${c.from.name}->${toNode.id}:${c.to.name}`,
                    from: { node: fromNode.id, port: c.from.name },
                    to: { node: toNode.id, port: c.to.name },
                };
            }),
        };
        return JSON.stringify(data, null, 2);
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

        interface NodeMeasure {
            node: NodeUI;
            w: number;
            h: number;
            portPositions: Map<Port, { x: number; y: number }>;
        }
        const measures: NodeMeasure[] = [];

        for (const n of this.nodes) {
            const rect = n.el.getBoundingClientRect();
            const w = Math.max(140, rect.width / this.camera.scale);
            const maxPorts = Math.max(n.inputs.length, n.outputs.length, 1);
            const h = HEADER_H + PORT_PAD_TOP + maxPorts * PORT_SPACING + 8;

            const portPositions = new Map<Port, { x: number; y: number }>();
            for (let i = 0; i < n.inputs.length; i++) {
                portPositions.set(n.inputs[i], { x: n.x, y: n.y + HEADER_H + PORT_PAD_TOP + i * PORT_SPACING + PORT_SPACING / 2 });
            }
            for (let i = 0; i < n.outputs.length; i++) {
                portPositions.set(n.outputs[i], { x: n.x + w, y: n.y + HEADER_H + PORT_PAD_TOP + i * PORT_SPACING + PORT_SPACING / 2 });
            }
            measures.push({ node: n, w, h, portPositions });
        }

        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        for (const m of measures) {
            minX = Math.min(minX, m.node.x);
            minY = Math.min(minY, m.node.y);
            maxX = Math.max(maxX, m.node.x + m.w);
            maxY = Math.max(maxY, m.node.y + m.h);
        }
        const svgW = maxX - minX + PADDING * 2;
        const svgH = maxY - minY + PADDING * 2;
        const ox = -minX + PADDING,
            oy = -minY + PADDING;

        const parts: string[] = [];
        parts.push(`<svg xmlns="${SVG_NS}" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`);
        if (theme.background) parts.push(`<rect width="100%" height="100%" fill="${theme.background}" rx="8"/>`);

        const allPortPos = new Map<Port, { x: number; y: number }>();
        for (const m of measures) for (const [p, pos] of m.portPositions) allPortPos.set(p, { x: pos.x + ox, y: pos.y + oy });

        for (const c of this.connections) {
            const p1 = allPortPos.get(c.from);
            const p2 = allPortPos.get(c.to);
            if (!p1 || !p2) continue;
            const dx = Math.abs(p2.x - p1.x) * 0.5;
            parts.push(
                `<path d="M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}" stroke="${theme.connectionStroke}" fill="none" stroke-width="2"/>`
            );
        }

        for (const m of measures) {
            const nx = m.node.x + ox,
                ny = m.node.y + oy;
            const headerColor =
                m.node.el
                    .querySelector(".ne-node-header")
                    ?.getAttribute("style")
                    ?.match(/background:\s*([^;]+)/)?.[1] || "#335";
            parts.push(`<g>`);
            parts.push(`<rect x="${nx}" y="${ny}" width="${m.w}" height="${m.h}" rx="8" fill="${theme.nodeBody}" stroke="${theme.nodeBorder}" stroke-width="1"/>`);
            parts.push(`<rect x="${nx}" y="${ny}" width="${m.w}" height="${HEADER_H}" rx="8" fill="${headerColor}"/>`);
            parts.push(`<rect x="${nx}" y="${ny + HEADER_H - 8}" width="${m.w}" height="8" fill="${headerColor}"/>`);
            parts.push(`<text x="${nx + 10}" y="${ny + 16}" fill="${theme.headerText}" font-family="${FONT}" font-size="11" font-weight="600">${m.node.label}</text>`);

            for (let i = 0; i < m.node.inputs.length; i++) {
                const p = m.node.inputs[i];
                const pos = allPortPos.get(p)!;
                const color = PORT_COLORS[p.type];
                parts.push(`<circle cx="${pos.x}" cy="${pos.y}" r="${PORT_R}" fill="${color}" stroke="${theme.portStroke}" stroke-width="1.5"/>`);
                parts.push(`<text x="${pos.x + PORT_R + 4}" y="${pos.y + 4}" fill="${theme.portLabel}" font-family="${FONT}" font-size="9">${p.name}</text>`);
            }
            for (let i = 0; i < m.node.outputs.length; i++) {
                const p = m.node.outputs[i];
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
        input.accept = opts?.accept ?? "application/json,.json";
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
        return this.nodes.find((n) => n.el === nodeEl);
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

        // Node click: selection is read; drag setup is write.
        const node = this.findNodeByEl(target);
        if (node) {
            e.stopPropagation();
            const ctrlOrMeta = e.ctrlKey || e.metaKey;
            if (ctrlOrMeta) this.selectNode(node, true);
            else if (!this.selectedNodes.has(node)) this.selectNode(node, false);

            if (canWrite && this.selectedNodes.has(node)) {
                this.dragNode = node;
                this.isDraggingSelection = this.selectedNodes.size > 1;
                const worldMouse = this.camera.screenToWorld(e.clientX, e.clientY);
                this.dragOffset.x = worldMouse.x - node.x;
                this.dragOffset.y = worldMouse.y - node.y;
                node.el.style.cursor = "grabbing";
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
            if (this.isDraggingSelection && this.selectedNodes.size > 1) {
                const dx = newX - this.dragNode.x,
                    dy = newY - this.dragNode.y;
                for (const n of this.selectedNodes) n.setPosition(n.x + dx, n.y + dy);
            } else {
                this.dragNode.setPosition(newX, newY);
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
            this.dragNode.el.style.cursor = "grab";
            this.dragNode = null;
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
    }

    private onContextMenu(e: MouseEvent): void {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const conn = this.findConnectionByPath(target);
        if (conn && this.permissions.write) this.removeConnection(conn);
    }
}
