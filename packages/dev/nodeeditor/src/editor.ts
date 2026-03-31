import { defaultLayout, LayoutStrategy } from "./auto-layout.js";
import { Camera } from "./camera.js";
import { Connection, ConnectionPreview } from "./connection.js";
import { FileHandler, FileHandlerRegistry } from "./file-handler.js";
import { NodeUI } from "./node-ui.js";
import { Port } from "./port.js";
import { PropertyPanel } from "./property-panel.js";
import { ExportProfile, EXPORT_PROFILES, NodeDef, PORT_COLORS, SerializedGraph } from "./types.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export class NodeEditor {
    readonly container: HTMLElement;
    readonly leftPanel: HTMLDivElement;
    readonly canvas: HTMLDivElement;
    readonly rightPanel: HTMLDivElement;
    readonly viewport: HTMLDivElement;
    readonly nodesLayer: HTMLDivElement;
    readonly svg: SVGSVGElement;
    readonly camera: Camera;

    readonly nodes: NodeUI[] = [];
    readonly connections: Connection[] = [];
    readonly propertyPanel: PropertyPanel;
    readonly fileHandlers: FileHandlerRegistry;

    private currentProfile: ExportProfile = EXPORT_PROFILES["dark"];
    private currentProfileName = "dark";
    private layoutStrategy: LayoutStrategy = defaultLayout;
    private readonly selectedNodes = new Set<NodeUI>();
    private dragNode: NodeUI | null = null;
    private dragOffset = { x: 0, y: 0 };
    private isDraggingSelection = false;
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private dragPort: Port | null = null;
    private preview: ConnectionPreview | null = null;
    private reorderPort: Port | null = null;
    private reorderNode: NodeUI | null = null;
    private reorderStartY = 0;
    private selectionRect: HTMLDivElement | null = null;
    private selRectStart = { x: 0, y: 0 };

    constructor(container: HTMLElement) {
        this.container = container;
        this.container.classList.add("ne-editor");
        this.camera = new Camera();

        // 3-column layout: left | canvas | right
        this.leftPanel = document.createElement("div");
        this.leftPanel.className = "ne-panel ne-panel-left";
        this.container.appendChild(this.leftPanel);

        this.canvas = document.createElement("div");
        this.canvas.className = "ne-canvas";

        this.viewport = document.createElement("div");
        this.viewport.className = "ne-viewport";

        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
        this.svg.classList.add("ne-svg");
        this.viewport.appendChild(this.svg);

        this.nodesLayer = document.createElement("div");
        this.nodesLayer.className = "ne-nodes-layer";
        this.viewport.appendChild(this.nodesLayer);

        this.canvas.appendChild(this.viewport);
        this.container.appendChild(this.canvas);

        this.rightPanel = document.createElement("div");
        this.rightPanel.className = "ne-panel ne-panel-right";
        this.container.appendChild(this.rightPanel);

        this.propertyPanel = new PropertyPanel(this.rightPanel);
        this.propertyPanel.onApply = (item, changes) => this.onPropertyApply(item, changes);

        this.fileHandlers = new FileHandlerRegistry();
        this.fileHandlers.register(this.createJsonHandler());

        this.bindEvents();
        this.camera.apply(this.viewport);
        this.setProfile("dark");
    }

    private onPropertyApply(item: import("./inspectable.js").UIItemBase<unknown>, changes: Map<string, unknown>): void {
        const node = this.nodes.find((n) => n.item === item);
        if (node) {
            if (changes.has("label")) {
                const headerEl = node.el.querySelector(".ne-node-header");
                if (headerEl) headerEl.textContent = String(changes.get("label"));
            }
            if (changes.has("color")) {
                const headerEl = node.el.querySelector(".ne-node-header") as HTMLElement | null;
                if (headerEl) headerEl.style.background = String(changes.get("color"));
            }
        }
    }

    setProfile(nameOrProfile: string | ExportProfile): void {
        if (typeof nameOrProfile === "string") {
            this.currentProfileName = nameOrProfile;
            this.currentProfile = EXPORT_PROFILES[nameOrProfile] ?? EXPORT_PROFILES["dark"];
        } else {
            this.currentProfileName = "custom";
            this.currentProfile = nameOrProfile;
        }
        const p = this.currentProfile;
        const s = this.container.style;
        const isLight = this.isLightProfile(p);
        const bg = p.background ?? (isLight ? "#f8f9fa" : "#111");
        const panelBg = isLight ? "rgba(244,245,247,0.95)" : "rgba(22,33,62,0.95)";
        const panelBorder = p.nodeBorder;

        s.setProperty("--ne-bg", bg);
        s.setProperty("--ne-grid-dot", isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)");
        s.setProperty("--ne-node-body", p.nodeBody);
        s.setProperty("--ne-node-border", p.nodeBorder);
        s.setProperty("--ne-header-text", p.headerText);
        s.setProperty("--ne-port-label", p.portLabel);
        s.setProperty("--ne-port-stroke", p.portStroke);
        s.setProperty("--ne-connection", p.connectionStroke);

        // Canvas background
        const gridDot = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)";
        const cs = this.canvas.style;
        cs.setProperty("background-color", bg, "important");
        cs.setProperty("background-image",
            `radial-gradient(circle, ${gridDot} 1px, transparent 1px)`, "important");

        // Side panels
        for (const panel of [this.leftPanel, this.rightPanel]) {
            panel.style.setProperty("background-color", panelBg, "important");
            panel.style.setProperty("border-color", panelBorder, "important");
            panel.style.setProperty("color", isLight ? "#333" : "#e0e0e0", "important");
        }

        for (const n of this.nodes) {
            n.el.style.setProperty("background-color", p.nodeBody, "important");
            n.el.style.setProperty("border-color", p.nodeBorder, "important");
            for (const port of n.getAllPorts()) {
                port.labelEl.style.color = p.portLabel;
                port.dot.style.borderColor = p.portStroke;
            }
        }

        for (const c of this.connections) {
            c.path.setAttribute("stroke", p.connectionStroke);
        }
    }

    getProfile(): ExportProfile {
        return this.currentProfile;
    }

    getProfileName(): string {
        return this.currentProfileName;
    }

    private isLightProfile(p: ExportProfile): boolean {
        return p.connectionStroke !== "#fff";
    }

    addNode(def: NodeDef, x = 100, y = 100): NodeUI {
        const node = new NodeUI(def, this.nodesLayer);
        node.setPosition(x, y);
        this.nodes.push(node);
        this.applyProfileToNode(node);
        return node;
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

    removeNode(node: NodeUI): void {
        const connsToRemove = this.connections.filter(
            (c) => node.getAllPorts().some((p) => c.containsPort(p)),
        );
        for (const c of connsToRemove) {
            this.removeConnection(c);
        }

        const idx = this.nodes.indexOf(node);
        if (idx >= 0) this.nodes.splice(idx, 1);
        node.el.remove();

        this.selectedNodes.delete(node);
    }

    connect(from: Port, to: Port): Connection | null {
        if (from.direction === to.direction) return null;
        if (from.direction === "input") {
            const tmp = from;
            from = to;
            to = tmp;
        }

        const exists = this.connections.some((c) => c.from === from && c.to === to);
        if (exists) return null;

        const conn = new Connection(from, to, this.svg, this.currentProfile.connectionStroke);
        this.connections.push(conn);
        return conn;
    }

    removeConnection(conn: Connection): void {
        const idx = this.connections.indexOf(conn);
        if (idx >= 0) this.connections.splice(idx, 1);
        conn.remove();
    }

    updateConnections(): void {
        for (const c of this.connections) {
            c.update();
        }
    }

    serialize(): SerializedGraph {
        return {
            nodes: this.nodes.map((n) => ({
                id: n.id,
                label: n.label,
                x: n.x,
                y: n.y,
                color: n.color,
                inputs: n.inputs.map((p) => ({
                    name: p.name,
                    type: p.type,
                    direction: p.direction,
                })),
                outputs: n.outputs.map((p) => ({
                    name: p.name,
                    type: p.type,
                    direction: p.direction,
                })),
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
        const connSerializer = (c: Connection) => {
            const fromNode = this.nodes.find((n) => n.outputs.includes(c.from))!;
            const toNode = this.nodes.find((n) => n.inputs.includes(c.to))!;
            return {
                id: `${fromNode.id}:${c.from.name}->${toNode.id}:${c.to.name}`,
                fromNodeId: fromNode.id,
                fromPortIndex: fromNode.outputs.indexOf(c.from),
                toNodeId: toNode.id,
                toPortIndex: toNode.inputs.indexOf(c.to),
            };
        };

        const data = {
            version: 2,
            layout: {
                nodes: this.nodes.map((n) => ({
                    id: n.id,
                    x: n.x,
                    y: n.y,
                    color: n.color,
                    inputs: n.inputs.map((p) => ({
                        name: p.name,
                        type: p.type,
                        direction: p.direction,
                    })),
                    outputs: n.outputs.map((p) => ({
                        name: p.name,
                        type: p.type,
                        direction: p.direction,
                    })),
                })),
                connections: this.connections.map((c) => {
                    const s = connSerializer(c);
                    return { id: s.id, fromNodeId: s.fromNodeId, fromPortIndex: s.fromPortIndex, toNodeId: s.toNodeId, toPortIndex: s.toPortIndex };
                }),
            },
            model: {
                nodes: this.nodes.map((n) => ({
                    id: n.id,
                    label: n.label,
                    data: n.item.serialize(),
                })),
                connections: this.connections.map((c) => {
                    const fromNode = this.nodes.find((nd) => nd.outputs.includes(c.from))!;
                    const toNode = this.nodes.find((nd) => nd.inputs.includes(c.to))!;
                    return {
                        id: `${fromNode.id}:${c.from.name}->${toNode.id}:${c.to.name}`,
                        from: { node: fromNode.id, port: c.from.name },
                        to: { node: toNode.id, port: c.to.name },
                    };
                }),
            },
        };
        return JSON.stringify(data, null, 2);
    }

    load(json: string): void {
        const data = JSON.parse(json);
        this.clear();

        // Support both v1 (flat) and v2 (layout+model) formats
        const layout = data.layout ?? data;
        const model = data.model;
        const layoutNodes = layout.nodes ?? [];
        const layoutConns = layout.connections ?? [];
        const modelNodes = model?.nodes;

        const nodeMap = new Map<string, NodeUI>();
        for (const sn of layoutNodes) {
            // Merge label from model if available
            const mn = modelNodes?.find((m: { id: string }) => m.id === sn.id);
            const label = mn?.label ?? sn.label ?? "Node";

            const def: NodeDef = {
                label,
                inputs: (sn.inputs ?? [])
                    .filter((p: { direction: string }) => p.direction === "input")
                    .map((p: { name: string; type: string }) => ({ name: p.name, type: p.type })),
                outputs: (sn.outputs ?? [])
                    .filter((p: { direction: string }) => p.direction === "output")
                    .map((p: { name: string; type: string }) => ({ name: p.name, type: p.type })),
                color: sn.color,
                data: mn?.data ?? undefined,
            };
            const node = this.addNode(def, sn.x, sn.y);
            if (mn?.data != null) {
                node.item.deserialize(mn.data);
            }
            nodeMap.set(sn.id, node);
        }

        for (const sc of layoutConns) {
            const fromNode = nodeMap.get(sc.fromNodeId);
            const toNode = nodeMap.get(sc.toNodeId);
            if (fromNode && toNode) {
                const fromPort = fromNode.outputs[sc.fromPortIndex];
                const toPort = toNode.inputs[sc.toPortIndex];
                if (fromPort && toPort) {
                    this.connect(fromPort, toPort);
                }
            }
        }
    }

    exportModel(): string {
        const data = {
            version: 1,
            nodes: this.nodes.map((n) => ({
                id: n.id,
                label: n.label,
                data: n.item.serialize(),
            })),
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

    downloadSave(filename = "graph.json"): void {
        this.downloadFile(this.save(), filename, "application/json");
    }

    downloadExport(filename = "model.json"): void {
        this.downloadFile(this.exportModel(), filename, "application/json");
    }

    clear(): void {
        while (this.connections.length > 0) {
            this.removeConnection(this.connections[0]);
        }
        while (this.nodes.length > 0) {
            this.removeNode(this.nodes[0]);
        }
        this.propertyPanel.hide();
    }

    autoLayout(): void {
        this.layoutStrategy(this);
    }

    setLayoutStrategy(strategy: LayoutStrategy): void {
        this.layoutStrategy = strategy;
    }

    loadFile(data: ArrayBuffer, filename: string): void {
        const ext = filename.split(".").pop() ?? "";
        const handler = this.fileHandlers.findByExtension(ext);
        if (!handler) {
            throw new Error(`No file handler registered for .${ext}`);
        }
        handler.load(data, this, filename);
    }

    exportAs(extension: string): void {
        const handler = this.fileHandlers.findByExtension(extension);
        if (!handler || !handler.canSave || !handler.save) {
            throw new Error(`No saveable handler for .${extension}`);
        }
        const result = handler.save(this);
        const blob = typeof result.data === "string"
            ? new Blob([result.data], { type: result.mimeType })
            : new Blob([result.data], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export.${result.extension}`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportAsWithPrompt(extension: string): void {
        const handler = this.fileHandlers.findByExtension(extension);
        if (!handler || !handler.canSave || !handler.save) {
            throw new Error(`No saveable handler for .${extension}`);
        }
        const defaultName = `export.${handler.extensions[0]}`;
        const name = prompt(`Export as ${handler.displayName}:`, defaultName);
        if (!name) return;
        const result = handler.save(this);
        const blob = typeof result.data === "string"
            ? new Blob([result.data], { type: result.mimeType })
            : new Blob([result.data], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    }

    private createJsonHandler(): FileHandler {
        return {
            extensions: ["json"],
            mimeTypes: ["application/json"],
            displayName: "Graph JSON",
            canSave: true,
            load(data: ArrayBuffer, ed: NodeEditor) {
                const text = new TextDecoder().decode(data);
                ed.load(text);
            },
            save(ed: NodeEditor) {
                return {
                    data: ed.save(),
                    extension: "json",
                    mimeType: "application/json",
                };
            },
        };
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

    exportSVG(profile?: string | ExportProfile): string {
        const theme: ExportProfile = profile
            ? (typeof profile === "string" ? EXPORT_PROFILES[profile] ?? this.currentProfile : profile)
            : this.currentProfile;

        const PADDING = 40;
        const HEADER_H = 24;
        const PORT_R = 5;
        const PORT_SPACING = 20;
        const PORT_PAD_TOP = 10;
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
                portPositions.set(n.inputs[i], {
                    x: n.x,
                    y: n.y + HEADER_H + PORT_PAD_TOP + i * PORT_SPACING + PORT_SPACING / 2,
                });
            }
            for (let i = 0; i < n.outputs.length; i++) {
                portPositions.set(n.outputs[i], {
                    x: n.x + w,
                    y: n.y + HEADER_H + PORT_PAD_TOP + i * PORT_SPACING + PORT_SPACING / 2,
                });
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
        const ox = -minX + PADDING;
        const oy = -minY + PADDING;

        const parts: string[] = [];
        parts.push(
            `<svg xmlns="${SVG_NS}" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`,
        );
        if (theme.background) {
            parts.push(`<rect width="100%" height="100%" fill="${theme.background}" rx="8"/>`);
        }

        // connections
        const allPortPos = new Map<Port, { x: number; y: number }>();
        for (const m of measures) {
            for (const [p, pos] of m.portPositions) {
                allPortPos.set(p, { x: pos.x + ox, y: pos.y + oy });
            }
        }

        for (const c of this.connections) {
            const p1 = allPortPos.get(c.from);
            const p2 = allPortPos.get(c.to);
            if (!p1 || !p2) continue;
            const dx = Math.abs(p2.x - p1.x) * 0.5;
            parts.push(
                `<path d="M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}" stroke="${theme.connectionStroke}" fill="none" stroke-width="2"/>`,
            );
        }

        // nodes
        for (const m of measures) {
            const nx = m.node.x + ox;
            const ny = m.node.y + oy;
            const headerColor = m.node.el.querySelector(".ne-node-header")?.getAttribute("style")
                ?.match(/background:\s*([^;]+)/)?.[1] || "#335";

            parts.push(`<g>`);
            parts.push(
                `<rect x="${nx}" y="${ny}" width="${m.w}" height="${m.h}" rx="8" fill="${theme.nodeBody}" stroke="${theme.nodeBorder}" stroke-width="1"/>`,
            );
            parts.push(
                `<rect x="${nx}" y="${ny}" width="${m.w}" height="${HEADER_H}" rx="8" fill="${headerColor}"/>`,
            );
            parts.push(
                `<rect x="${nx}" y="${ny + HEADER_H - 8}" width="${m.w}" height="8" fill="${headerColor}"/>`,
            );
            parts.push(
                `<text x="${nx + 10}" y="${ny + 16}" fill="${theme.headerText}" font-family="${FONT}" font-size="11" font-weight="600">${m.node.label}</text>`,
            );

            for (let i = 0; i < m.node.inputs.length; i++) {
                const p = m.node.inputs[i];
                const pos = allPortPos.get(p)!;
                const color = PORT_COLORS[p.type];
                parts.push(
                    `<circle cx="${pos.x}" cy="${pos.y}" r="${PORT_R}" fill="${color}" stroke="${theme.portStroke}" stroke-width="1.5"/>`,
                );
                parts.push(
                    `<text x="${pos.x + PORT_R + 4}" y="${pos.y + 4}" fill="${theme.portLabel}" font-family="${FONT}" font-size="9">${p.name}</text>`,
                );
            }

            for (let i = 0; i < m.node.outputs.length; i++) {
                const p = m.node.outputs[i];
                const pos = allPortPos.get(p)!;
                const color = PORT_COLORS[p.type];
                parts.push(
                    `<circle cx="${pos.x}" cy="${pos.y}" r="${PORT_R}" fill="${color}" stroke="${theme.portStroke}" stroke-width="1.5"/>`,
                );
                parts.push(
                    `<text x="${pos.x - PORT_R - 4}" y="${pos.y + 4}" fill="${theme.portLabel}" font-family="${FONT}" font-size="9" text-anchor="end">${p.name}</text>`,
                );
            }

            parts.push(`</g>`);
        }

        parts.push(`</svg>`);
        return parts.join("\n");
    }

    downloadSVG(filename = "graph.svg"): void {
        const svgContent = this.exportSVG();
        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    getSelectedNodes(): ReadonlySet<NodeUI> {
        return this.selectedNodes;
    }

    private clearSelection(): void {
        for (const n of this.selectedNodes) {
            n.setSelected(false);
        }
        this.selectedNodes.clear();
        this.propertyPanel.hide();
    }

    private selectNode(node: NodeUI, addToSelection = false): void {
        if (!addToSelection) {
            for (const n of this.selectedNodes) {
                if (n !== node) n.setSelected(false);
            }
            this.selectedNodes.clear();
        }

        if (addToSelection && this.selectedNodes.has(node)) {
            node.setSelected(false);
            this.selectedNodes.delete(node);
            if (this.selectedNodes.size === 1) {
                this.propertyPanel.show([...this.selectedNodes][0].item);
            } else if (this.selectedNodes.size === 0) {
                this.propertyPanel.hide();
            }
        } else {
            node.setSelected(true);
            this.selectedNodes.add(node);
            if (this.selectedNodes.size === 1) {
                this.propertyPanel.show(node.item);
            } else {
                this.propertyPanel.hide();
            }
        }
    }

    private selectNodes(nodes: NodeUI[]): void {
        this.clearSelection();
        for (const n of nodes) {
            n.setSelected(true);
            this.selectedNodes.add(n);
        }
        if (nodes.length === 1) {
            this.propertyPanel.show(nodes[0].item);
        }
    }

    private selectConnection(conn: Connection): void {
        this.clearSelection();
        this.propertyPanel.show(conn.item);
    }

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
        return this.nodes.find((n) =>
            n.inputs.includes(port) || n.outputs.includes(port),
        );
    }

    private findConnectionByPath(el: HTMLElement): Connection | undefined {
        return this.connections.find((c) => (c.path as unknown) === el);
    }

    private bindEvents(): void {
        this.canvas.addEventListener("wheel", this.onWheel.bind(this), { passive: false });
        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        window.addEventListener("mousemove", this.onMouseMove.bind(this));
        window.addEventListener("mouseup", this.onMouseUp.bind(this));
        window.addEventListener("keydown", this.onKeyDown.bind(this));
        this.canvas.addEventListener("contextmenu", this.onContextMenu.bind(this));
    }

    private onWheel(e: WheelEvent): void {
        e.preventDefault();
        this.camera.zoom(e.deltaY, e.clientX, e.clientY);
        this.camera.apply(this.viewport);
        this.updateConnections();
    }

    private onMouseDown(e: MouseEvent): void {
        const target = e.target as HTMLElement;

        // Port label drag → reorder
        const labelPort = this.findPortByLabel(target);
        if (labelPort) {
            e.stopPropagation();
            e.preventDefault();
            this.reorderPort = labelPort;
            this.reorderNode = this.findNodeForPort(labelPort) ?? null;
            this.reorderStartY = e.clientY;
            labelPort.el.classList.add("ne-port-dragging");
            return;
        }

        const port = this.findPortByDot(target);
        if (port) {
            e.stopPropagation();
            this.dragPort = port;
            this.preview = new ConnectionPreview(this.svg);
            return;
        }

        const node = this.findNodeByEl(target);
        if (node) {
            e.stopPropagation();
            const ctrlOrMeta = e.ctrlKey || e.metaKey;

            if (ctrlOrMeta) {
                this.selectNode(node, true);
            } else if (!this.selectedNodes.has(node)) {
                this.selectNode(node, false);
            }
            // else: node already selected, keep current multi-selection for dragging

            if (this.selectedNodes.has(node)) {
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
            this.selectConnection(conn);
            return;
        }

        // Background: right-click or middle-click = pan, left-click = rectangle select
        if (e.button === 2 || e.button === 1) {
            this.isPanning = true;
            this.panStart.x = e.clientX - this.camera.x;
            this.panStart.y = e.clientY - this.camera.y;
            this.canvas.style.cursor = "grabbing";
        } else {
            // Left-click on background = rectangle selection
            this.clearSelection();
            this.selRectStart.x = e.clientX;
            this.selRectStart.y = e.clientY;
            this.selectionRect = document.createElement("div");
            this.selectionRect.className = "ne-selection-rect";
            this.canvas.appendChild(this.selectionRect);
        }
    }

    private onMouseMove(e: MouseEvent): void {
        if (this.reorderPort && this.reorderNode) {
            const dy = e.clientY - this.reorderStartY;
            const portHeight = this.reorderPort.el.offsetHeight + 4; // gap
            const threshold = portHeight * 0.6;

            if (Math.abs(dy) > threshold) {
                const direction = dy > 0 ? 1 : -1;
                const ports = this.reorderPort.direction === "input"
                    ? this.reorderNode.inputs
                    : this.reorderNode.outputs;
                const idx = ports.indexOf(this.reorderPort);
                const newIdx = idx + direction;

                if (newIdx >= 0 && newIdx < ports.length) {
                    if (this.reorderPort.direction === "input") {
                        this.reorderNode.moveInputPort(idx, newIdx);
                    } else {
                        this.reorderNode.moveOutputPort(idx, newIdx);
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
            return;
        }

        if (this.dragNode) {
            const worldMouse = this.camera.screenToWorld(e.clientX, e.clientY);
            const newX = worldMouse.x - this.dragOffset.x;
            const newY = worldMouse.y - this.dragOffset.y;

            if (this.isDraggingSelection && this.selectedNodes.size > 1) {
                const dx = newX - this.dragNode.x;
                const dy = newY - this.dragNode.y;
                for (const n of this.selectedNodes) {
                    n.setPosition(n.x + dx, n.y + dy);
                }
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
            const canvasRect = this.canvas.getBoundingClientRect();
            this.selectionRect.style.left = (x1 - canvasRect.left) + "px";
            this.selectionRect.style.top = (y1 - canvasRect.top) + "px";
            this.selectionRect.style.width = (x2 - x1) + "px";
            this.selectionRect.style.height = (y2 - y1) + "px";
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
            if (targetPort && targetPort !== this.dragPort) {
                this.connect(this.dragPort, targetPort);
            }
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

            // Find nodes within the selection rectangle
            if (rect.width > 4 || rect.height > 4) {
                const hits = this.nodes.filter((n) => {
                    const nr = n.el.getBoundingClientRect();
                    return (
                        nr.left < rect.right &&
                        nr.right > rect.left &&
                        nr.top < rect.bottom &&
                        nr.bottom > rect.top
                    );
                });
                if (hits.length > 0) {
                    this.selectNodes(hits);
                }
            }
            return;
        }

        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = "";
        }
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (e.key === "Delete" || e.key === "Backspace") {
            if (this.selectedNodes.size > 0 && document.activeElement === document.body) {
                const toRemove = [...this.selectedNodes];
                for (const node of toRemove) {
                    this.removeNode(node);
                }
            }
        }
    }

    private onContextMenu(e: MouseEvent): void {
        e.preventDefault(); // always prevent browser context menu on canvas
        const target = e.target as HTMLElement;
        const conn = this.findConnectionByPath(target);
        if (conn) {
            this.removeConnection(conn);
        }
    }
}
