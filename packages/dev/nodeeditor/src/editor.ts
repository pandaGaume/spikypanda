import { Camera } from "./camera.js";
import { Connection, ConnectionPreview } from "./connection.js";
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

    private currentProfile: ExportProfile = EXPORT_PROFILES["dark"];
    private currentProfileName = "dark";
    private selectedNode: NodeUI | null = null;
    private dragNode: NodeUI | null = null;
    private dragOffset = { x: 0, y: 0 };
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private dragPort: Port | null = null;
    private preview: ConnectionPreview | null = null;

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

        this.bindEvents();
        this.camera.apply(this.viewport);
        this.setProfile("dark");
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

        if (this.selectedNode === node) {
            this.selectedNode = null;
        }
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

    private selectNode(node: NodeUI | null): void {
        if (this.selectedNode) {
            this.selectedNode.setSelected(false);
        }
        this.selectedNode = node;
        if (node) {
            node.setSelected(true);
            this.propertyPanel.show(node.item);
        } else {
            this.propertyPanel.hide();
        }
    }

    private selectConnection(conn: Connection): void {
        this.selectNode(null);
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

    private findConnectionByPath(el: HTMLElement): Connection | undefined {
        return this.connections.find((c) => c.path === el);
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
            this.selectNode(node);
            this.dragNode = node;

            const worldMouse = this.camera.screenToWorld(e.clientX, e.clientY);
            this.dragOffset.x = worldMouse.x - node.x;
            this.dragOffset.y = worldMouse.y - node.y;
            node.el.style.cursor = "grabbing";
            return;
        }

        const conn = this.findConnectionByPath(target);
        if (conn) {
            e.stopPropagation();
            this.selectConnection(conn);
            return;
        }

        this.selectNode(null);
        this.isPanning = true;
        this.panStart.x = e.clientX - this.camera.x;
        this.panStart.y = e.clientY - this.camera.y;
        this.canvas.style.cursor = "grabbing";
    }

    private onMouseMove(e: MouseEvent): void {
        if (this.dragPort && this.preview) {
            const p1 = this.dragPort.getCenter();
            this.preview.updateScreen(p1.x, p1.y, e.clientX, e.clientY);
            return;
        }

        if (this.dragNode) {
            const worldMouse = this.camera.screenToWorld(e.clientX, e.clientY);
            this.dragNode.setPosition(
                worldMouse.x - this.dragOffset.x,
                worldMouse.y - this.dragOffset.y,
            );
            this.updateConnections();
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
            return;
        }

        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = "";
        }
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (e.key === "Delete" || e.key === "Backspace") {
            if (this.selectedNode && document.activeElement === document.body) {
                this.removeNode(this.selectedNode);
            }
        }
    }

    private onContextMenu(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        const conn = this.findConnectionByPath(target);
        if (conn) {
            e.preventDefault();
            this.removeConnection(conn);
        }
    }
}
