import { IDisposable, IEnabled, IRunnable, Observable, PropertyChangedEventArgs, getRunnableAffordance, isEnabled, isRunnable, supportsEnabling } from "spikypanda-core";
import { UIItemBase } from "./inspectable";
import { Port } from "./port";
import { StandardsRegistry } from "./standards";
import { NodeDef, PortType } from "./types";

const RUN_PLAY_SVG = '<svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor"><path d="M4 3l9 5-9 5V3z"/></svg>';
const RUN_STOP_SVG = '<svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="1.5"/></svg>';
const REC_SVG = '<svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="5"/></svg>';
const ENABLED_SVG =
    '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8 7 12 13 4"/></svg>';
const DISABLED_SVG =
    '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';

const GRID = 20;
const SPLIT_ANCHOR_GAP = 200;

let nodeIdCounter = 0;

/**
 * One visual anchor (widget) of a node. Ordinary nodes have exactly one
 * anchor; "split-view" nodes (e.g. Feedback Channel) have N anchors,
 * each independently draggable but sharing one logical NodeUI (selection,
 * model, properties, deletion all apply across the whole group).
 *
 * Each anchor owns its own DOM subtree (header, body with port columns,
 * footer with status). Ports route to a specific anchor's containers via
 * `PortDef.anchor`; out-of-range or omitted anchor indices fall back to 0.
 */
export interface NodeAnchor {
    el: HTMLDivElement;
    headerEl: HTMLDivElement;
    titleEl: HTMLSpanElement;
    toolbarEl: HTMLDivElement;
    inputsContainer: HTMLDivElement;
    outputsContainer: HTMLDivElement;
    controlInputsContainer: HTMLDivElement;
    controlOutputsContainer: HTMLDivElement;
    footerEl: HTMLDivElement;
    statusEl: HTMLSpanElement;
    statusDotEl: HTMLSpanElement;
    statusTextEl: HTMLSpanElement;
    x: number;
    y: number;
}

/**
 * Build the CSS background for a node header. Resolution chain:
 *   skin token (--ne-color-category-<sanitized-category>)
 *   → def.color literal
 *   → --ne-color-node-header (skin default).
 * The chain is expressed with var() fallbacks so a runtime skin switch
 * propagates without rebuilding the node DOM.
 */
/** Normalise a NodeDef's variadic descriptor (single OR array form)
 *  into the same shape the field is declared as. Each descriptor is
 *  shallow-copied so the reconciler reads frozen values.
 *
 *  Type assertions inside are needed because Array.isArray doesn't
 *  narrow the `ReadonlyArray<T>` branch of a union — it widens to
 *  `unknown[]` rather than preserving the element type. The runtime
 *  shape is unchanged.
 */
function _copyVariadic(src: NodeDef["variadicInput"]): { prefix: string; type: string } | ReadonlyArray<{ prefix: string; type: string }> | undefined {
    if (!src) return undefined;
    if (Array.isArray(src)) {
        const arr = src as ReadonlyArray<{ prefix: string; type: string }>;
        return arr.map((d) => ({ prefix: d.prefix, type: d.type }));
    }
    const single = src as { prefix: string; type: string };
    return { prefix: single.prefix, type: single.type };
}

function computeNodeHeaderBackground(def: NodeDef): string | null {
    const fallback = def.color ? def.color : "var(--ne-color-node-header)";
    if (def.category) {
        const sanitized = def.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return `var(--ne-color-category-${sanitized}, ${fallback})`;
    }
    return def.color ?? null;
}

export class NodeUI {
    readonly id: string;
    readonly label: string;
    readonly typeId?: string;
    readonly color?: string;
    readonly inputs: Port[] = [];
    readonly outputs: Port[] = [];
    /** Control-plane inputs (_enable, _start, _stop, ...) — rendered in
     *  a separate row above the data inputs, distinct visual treatment. */
    readonly controlInputs: Port[] = [];
    readonly controlOutputs: Port[] = [];
    readonly item: UIItemBase<unknown>;
    /** Variadic port descriptors copied from the NodeDef. The editor's
     *  VariadicReconciler reads these to keep exactly one trailing
     *  unconnected port for each set. Undefined when the node is not
     *  variadic on that side. Accepts either a single descriptor OR
     *  an array of descriptors for nodes with multiple parallel
     *  variadic groups on the same side (e.g. Stem's paired f_/A_). */
    readonly variadicInput?: { prefix: string; type: string } | ReadonlyArray<{ prefix: string; type: string }>;
    readonly variadicOutput?: { prefix: string; type: string } | ReadonlyArray<{ prefix: string; type: string }>;
    /** Standards declarations (e.g. `["onnx", { id: "ue5", version: "5.4" }]`)
     *  carried straight from the source NodeDef so the property panel
     *  can render shields without going back to the node registry. */
    readonly standards?: NodeDef["standards"];

    /**
     * One entry per visual widget. Ordinary nodes have a single anchor;
     * split-view nodes (anchorCount >= 2 on the NodeDef) have multiple
     * anchors, each draggable independently. Backward-compat getters
     * (`el`, `x`, `y`) forward to `anchors[0]` so existing call sites
     * keep working transparently.
     */
    readonly anchors: NodeAnchor[] = [];

    selected = false;

    private runBtn: HTMLButtonElement | null = null; // start button (lifecycle)
    private stopBtn: HTMLButtonElement | null = null; // stop button (lifecycle)
    private toggleBtn: HTMLButtonElement | null = null; // enable / disable
    private _inPlayMode = false;
    private _modelSubscription: IDisposable | null = null;

    constructor(def: NodeDef, parent: HTMLElement, standards?: StandardsRegistry) {
        this.id = `node_${nodeIdCounter++}`;
        this.label = def.label;
        this.typeId = def.typeId;
        this.color = def.color;
        this.standards = def.standards;
        this.item = new UIItemBase(def.data ?? def);

        // Build N anchor widgets. Default = 1 (the ordinary single-widget
        // node, full backward-compat). Each anchor has the same DOM shape
        // (header + body with input/output port columns + footer) so the
        // existing CSS keeps working uniformly across anchors. Position
        // anchors at horizontal offsets so the user sees them as
        // initially-distinct widgets — they reposition individually
        // afterwards.
        const anchorCount = Math.max(1, def.anchorCount ?? 1);
        for (let i = 0; i < anchorCount; i++) {
            const anchor = this._buildAnchor(def, parent, i, anchorCount);
            anchor.x = i * SPLIT_ANCHOR_GAP;
            anchor.el.style.transform = `translate(${anchor.x}px, ${anchor.y}px)`;
            this.anchors.push(anchor);
        }

        // Runtime buttons attach to the primary anchor only; the
        // secondary halves of split nodes inherit lifecycle state via
        // the shared model and don't need their own toolbar copies.
        this._installRuntimeButtons();

        for (const inp of def.controlInputs ?? []) {
            this.addControlInput(inp.name, inp.type);
        }
        for (const out of def.controlOutputs ?? []) {
            this.addControlOutput(out.name, out.type);
        }
        for (const inp of def.inputs) {
            this.addInput(inp.name, inp.type, inp.anchor);
        }
        for (const out of def.outputs) {
            this.addOutput(out.name, out.type, out.anchor);
        }

        this.variadicInput = _copyVariadic(def.variadicInput);
        this.variadicOutput = _copyVariadic(def.variadicOutput);
    }

    // ── Backward-compat surface ─────────────────────────────────────────
    /** Primary anchor's root DOM element. */
    get el(): HTMLDivElement {
        return this.anchors[0].el;
    }
    /** Primary anchor's x position (grid-snapped). */
    get x(): number {
        return this.anchors[0].x;
    }
    /** Primary anchor's y position (grid-snapped). */
    get y(): number {
        return this.anchors[0].y;
    }

    addControlInput(name: string, type: PortType, anchor: number = 0): Port {
        const a = this._anchorAt(anchor);
        const port = new Port(name, type, "input");
        port.attachTo(a.el, a.controlInputsContainer);
        port.el.classList.add("ne-port-control");
        this.controlInputs.push(port);
        return port;
    }

    addControlOutput(name: string, type: PortType, anchor: number = 0): Port {
        const a = this._anchorAt(anchor);
        const port = new Port(name, type, "output");
        port.attachTo(a.el, a.controlOutputsContainer);
        port.el.classList.add("ne-port-control");
        this.controlOutputs.push(port);
        return port;
    }

    addInput(name: string, type: PortType, anchor: number = 0): Port {
        const a = this._anchorAt(anchor);
        const port = new Port(name, type, "input");
        port.attachTo(a.el, a.inputsContainer);
        this.inputs.push(port);
        return port;
    }

    addOutput(name: string, type: PortType, anchor: number = 0): Port {
        const a = this._anchorAt(anchor);
        const port = new Port(name, type, "output");
        port.attachTo(a.el, a.outputsContainer);
        this.outputs.push(port);
        return port;
    }

    /**
     * Remove an input port from this node. Returns true if the port was
     * found and removed. The caller is responsible for cleaning up any
     * connections to/from the port BEFORE calling this; otherwise the
     * editor will hold dangling Connection objects that point at a Port
     * with no DOM. NodeEditor.removeNodePort() handles both steps.
     */
    removeInput(port: Port): boolean {
        const idx = this.inputs.indexOf(port);
        if (idx < 0) return false;
        this.inputs.splice(idx, 1);
        port.detach();
        return true;
    }

    /** Mirror of removeInput for output ports. */
    removeOutput(port: Port): boolean {
        const idx = this.outputs.indexOf(port);
        if (idx < 0) return false;
        this.outputs.splice(idx, 1);
        port.detach();
        return true;
    }

    /**
     * Move the primary anchor (index 0). Other anchors keep their
     * positions. Use `setAnchorPosition(i, x, y)` to move a specific
     * non-primary anchor of a split-view node.
     */
    setPosition(x: number, y: number): void {
        this.setAnchorPosition(0, x, y);
    }

    /**
     * Move a specific anchor of a split-view node. Out-of-range indices
     * are ignored silently (split nodes that grew a new anchor don't
     * need a try/catch around old serialized positions).
     */
    setAnchorPosition(index: number, x: number, y: number): void {
        const a = this.anchors[index];
        if (!a) return;
        a.x = Math.round(x / GRID) * GRID;
        a.y = Math.round(y / GRID) * GRID;
        a.el.style.transform = `translate(${a.x}px, ${a.y}px)`;
    }

    /**
     * Locate which anchor (if any) contains the given DOM element.
     * Returns -1 when `el` is outside every anchor's subtree. Used by
     * the hit-test pass in graph-viewer's mouse handler so drag/grab
     * targets the correct anchor of a split-view node.
     */
    findAnchorIndex(el: HTMLElement | null): number {
        if (!el) return -1;
        for (let i = 0; i < this.anchors.length; i++) {
            if (this.anchors[i].el === el || this.anchors[i].el.contains(el)) return i;
        }
        return -1;
    }

    setSelected(selected: boolean): void {
        this.selected = selected;
        for (const a of this.anchors) {
            a.el.classList.toggle("ne-node-selected", selected);
            if (selected) {
                a.el.style.setProperty("border-color", "#00d4ff", "important");
                a.el.style.setProperty("box-shadow", "0 0 0 2px #00d4ff, 0 4px 16px rgba(0,0,0,0.6)", "important");
            } else {
                a.el.style.removeProperty("border-color");
                a.el.style.removeProperty("box-shadow");
            }
        }
    }

    reorderInputs(order: number[] | string[]): void {
        this.reorderPorts(this.inputs, order);
    }

    reorderOutputs(order: number[] | string[]): void {
        this.reorderPorts(this.outputs, order);
    }

    moveInputPort(from: number, to: number): void {
        this.movePort(this.inputs, from, to);
    }

    moveOutputPort(from: number, to: number): void {
        this.movePort(this.outputs, from, to);
    }

    moveControlInputPort(from: number, to: number): void {
        this.movePort(this.controlInputs, from, to);
    }

    moveControlOutputPort(from: number, to: number): void {
        this.movePort(this.controlOutputs, from, to);
    }

    getAllPorts(): Port[] {
        return [...this.controlInputs, ...this.inputs, ...this.outputs, ...this.controlOutputs];
    }

    findPortByDot(dot: HTMLElement): Port | undefined {
        return this.getAllPorts().find((p) => p.dot === dot);
    }

    /**
     * Re-append ports in `order` into their host container so the visual
     * order matches the runtime array order. Routing respects the port's
     * current `nodeEl` (which was set at attachTo() to the right anchor's
     * el) so split-view ports stay anchored to their original half.
     */
    private reorderPorts(ports: Port[], order: number[] | string[]): void {
        const resolved: Port[] = [];
        for (const ref of order) {
            const port = typeof ref === "number" ? ports[ref] : ports.find((p) => p.name === ref);
            if (port) resolved.push(port);
        }
        for (const p of ports) {
            if (!resolved.includes(p)) resolved.push(p);
        }
        ports.length = 0;
        for (const p of resolved) ports.push(p);
        for (const p of ports) {
            // Re-append into the port's existing parent (anchor-aware).
            const parent = p.el.parentElement;
            if (parent) parent.appendChild(p.el);
        }
    }

    private movePort(ports: Port[], from: number, to: number): void {
        if (from < 0 || from >= ports.length || to < 0 || to >= ports.length) return;
        const [port] = ports.splice(from, 1);
        ports.splice(to, 0, port);
        for (const p of ports) {
            const parent = p.el.parentElement;
            if (parent) parent.appendChild(p.el);
        }
    }

    setTitle(title: string): void {
        // Mirror the title across every anchor — the secondary halves
        // of a split-view node carry the same label so the user can tell
        // they belong together at a glance.
        for (const a of this.anchors) a.titleEl.textContent = title;
    }

    setPlayMode(inPlay: boolean): void {
        this._inPlayMode = inPlay;
        this.refreshRuntimeButtons();
    }

    refreshRuntimeButtons(): void {
        const data = this.item.data;
        const inPlay = this._inPlayMode;

        if (this.runBtn && this.stopBtn && isRunnable(data)) {
            const s = data.status;
            const transitioning = s === "starting" || s === "stopping";
            const started = s === "started";
            const canStart = !started && !transitioning;
            const canStop = started && !transitioning;
            const affordance = getRunnableAffordance(data);
            const isRecord = affordance === "record";

            this.runBtn.disabled = !inPlay || !canStart;
            this.runBtn.classList.toggle("ne-rtbtn-play-active", inPlay && canStart && !isRecord);
            this.runBtn.classList.toggle("ne-rtbtn-record-active", inPlay && canStart && isRecord);
            this.stopBtn.disabled = !inPlay || !canStop;
            this.stopBtn.classList.toggle("ne-rtbtn-stop-active", inPlay && canStop);
        }
        if (this.toggleBtn && isEnabled(data)) {
            const e = data.enabled;
            this.toggleBtn.disabled = false;
            this.toggleBtn.classList.toggle("ne-rtbtn-play-active", e);
            this.toggleBtn.innerHTML = e ? ENABLED_SVG : DISABLED_SVG;
            this.toggleBtn.title = e ? "Disable" : "Enable";
        }

        this.refreshStatusBar();
    }

    refreshStatusBar(): void {
        const data = this.item.data;
        const runnable = isRunnable(data) ? data : null;
        const enableable = isEnabled(data) && supportsEnabling(data) ? data : null;

        // Status bar lives on the primary anchor only — the secondary
        // halves of a split node hide their footer (their status would
        // be duplicate noise).
        const primary = this.anchors[0];
        if (!runnable && !enableable) {
            primary.footerEl.style.display = "none";
            return;
        }
        primary.footerEl.style.display = "";

        const parts: string[] = [];
        let dotState = "idle";
        if (runnable) {
            parts.push(runnable.status);
            dotState = runnable.status;
        }
        if (enableable) {
            if (!enableable.enabled) {
                parts.push("disabled");
                dotState = "disabled";
            } else if (!runnable) {
                parts.push("enabled");
            }
        }

        primary.statusTextEl.textContent = parts.join(" · ");
        primary.statusDotEl.className = `ne-node-status-dot ne-status-${dotState}`;
        primary.statusEl.title = parts.join(" · ");
    }

    /**
     * Build a single anchor's DOM. Each anchor is a self-contained
     * `.ne-node` element with the same structural skeleton as the
     * legacy single-element node so existing CSS keeps working. The
     * `data-anchor-role` attribute lets skins style split halves
     * distinctly (chevron decoration on the out / in sides) without
     * needing to know the node's typeId.
     */
    private _buildAnchor(def: NodeDef, parent: HTMLElement, index: number, count: number): NodeAnchor {
        const el = document.createElement("div");
        el.className = "ne-node";
        el.dataset["nodeId"] = this.id;
        el.dataset["anchorIndex"] = String(index);
        // Anchor role hints: "single" for ordinary nodes, "out" for the
        // first anchor of a split (near the source), "in" for the last
        // anchor (near the consumer), "mid" for any in-between (rare).
        const role = count === 1 ? "single" : index === 0 ? "out" : index === count - 1 ? "in" : "mid";
        el.dataset["anchorRole"] = role;

        const headerEl = document.createElement("div");
        headerEl.className = "ne-node-header";
        const headerBg = computeNodeHeaderBackground(def);
        if (headerBg) headerEl.style.background = headerBg;

        const titleEl = document.createElement("span");
        titleEl.className = "ne-node-title";
        titleEl.textContent = def.label;
        headerEl.appendChild(titleEl);

        const toolbarEl = document.createElement("div");
        toolbarEl.className = "ne-node-toolbar";
        headerEl.appendChild(toolbarEl);

        el.appendChild(headerEl);

        const controlRow = document.createElement("div");
        controlRow.className = "ne-node-control-row";
        const controlInputsContainer = document.createElement("div");
        controlInputsContainer.className = "ne-node-control-inputs";
        controlRow.appendChild(controlInputsContainer);
        const controlOutputsContainer = document.createElement("div");
        controlOutputsContainer.className = "ne-node-control-outputs";
        controlRow.appendChild(controlOutputsContainer);
        el.appendChild(controlRow);

        const body = document.createElement("div");
        body.className = "ne-node-body";

        const inputsContainer = document.createElement("div");
        inputsContainer.className = "ne-node-inputs";
        body.appendChild(inputsContainer);

        const outputsContainer = document.createElement("div");
        outputsContainer.className = "ne-node-outputs";
        body.appendChild(outputsContainer);

        el.appendChild(body);

        const footerEl = document.createElement("div");
        footerEl.className = "ne-node-footer";
        const statusEl = document.createElement("span");
        statusEl.className = "ne-node-status";
        const statusDotEl = document.createElement("span");
        statusDotEl.className = "ne-node-status-dot";
        const statusTextEl = document.createElement("span");
        statusTextEl.className = "ne-node-status-text";
        statusEl.appendChild(statusDotEl);
        statusEl.appendChild(statusTextEl);
        footerEl.appendChild(statusEl);
        el.appendChild(footerEl);

        parent.appendChild(el);

        return {
            el,
            headerEl,
            titleEl,
            toolbarEl,
            inputsContainer,
            outputsContainer,
            controlInputsContainer,
            controlOutputsContainer,
            footerEl,
            statusEl,
            statusDotEl,
            statusTextEl,
            x: 0,
            y: 0,
        };
    }

    private _anchorAt(index: number): NodeAnchor {
        return this.anchors[index] ?? this.anchors[0];
    }

    /**
     * Build header buttons for whichever model contracts the data
     * implements (IRunnable for lifecycle, IEnabled for on/off toggle).
     * Buttons are installed on the primary anchor's toolbar only — the
     * secondary halves of a split-view node share the same model state
     * and don't need duplicate controls.
     */
    private _installRuntimeButtons(): void {
        const data = this.item.data;
        const primary = this.anchors[0];

        const blockDrag = (ev: Event): void => {
            ev.stopPropagation();
            ev.stopImmediatePropagation();
        };

        if (isRunnable(data)) {
            const isRecord = getRunnableAffordance(data) === "record";

            const playBtn = document.createElement("button");
            playBtn.type = "button";
            playBtn.className = "ne-node-runtime-btn";
            playBtn.title = isRecord ? "Record" : "Start";
            playBtn.innerHTML = isRecord ? REC_SVG : RUN_PLAY_SVG;
            playBtn.addEventListener("pointerdown", blockDrag, { capture: true });
            playBtn.addEventListener("mousedown", blockDrag, { capture: true });
            playBtn.addEventListener("click", (ev: MouseEvent) => {
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                const result = (data as IRunnable).start();
                if (result instanceof Promise) {
                    result.finally(() => this.refreshRuntimeButtons());
                }
                this.refreshRuntimeButtons();
            });
            primary.toolbarEl.appendChild(playBtn);
            this.runBtn = playBtn;

            const stopBtn = document.createElement("button");
            stopBtn.type = "button";
            stopBtn.className = "ne-node-runtime-btn";
            stopBtn.title = isRecord ? "Stop recording" : "Stop";
            stopBtn.innerHTML = RUN_STOP_SVG;
            stopBtn.addEventListener("pointerdown", blockDrag, { capture: true });
            stopBtn.addEventListener("mousedown", blockDrag, { capture: true });
            stopBtn.addEventListener("click", (ev: MouseEvent) => {
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                const result = (data as IRunnable).stop();
                if (result instanceof Promise) {
                    result.finally(() => this.refreshRuntimeButtons());
                }
                this.refreshRuntimeButtons();
            });
            primary.toolbarEl.appendChild(stopBtn);
            this.stopBtn = stopBtn;
        }

        if (isEnabled(data) && supportsEnabling(data)) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ne-node-runtime-btn";
            btn.addEventListener("pointerdown", blockDrag, { capture: true });
            btn.addEventListener("mousedown", blockDrag, { capture: true });
            btn.addEventListener("click", (ev: MouseEvent) => {
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                (data as IEnabled).enabled = !(data as IEnabled).enabled;
                this.refreshRuntimeButtons();
            });
            primary.toolbarEl.appendChild(btn);
            this.toggleBtn = btn;
        }

        this._subscribeToModel();

        this.refreshRuntimeButtons();
    }

    private _subscribeToModel(): void {
        const candidate = this.item.data as { onPropertyChanged?: Observable<PropertyChangedEventArgs<unknown, unknown>> };
        const obs = candidate?.onPropertyChanged;
        if (!obs || typeof obs.add !== "function") return;

        this._modelSubscription = obs.add((args) => {
            if (args.propertyName === "status" || args.propertyName === "enabled") {
                this.refreshRuntimeButtons();
            }
        });
    }

    /**
     * Release model subscriptions and detach every anchor's DOM. Called
     * by the editor when this node is removed from the graph.
     */
    dispose(): void {
        this._modelSubscription?.dispose();
        this._modelSubscription = null;
        for (const a of this.anchors) a.el.remove();
        this.anchors.length = 0;
    }
}
