import { IDisposable, IEnabled, IRunnable, Observable, PropertyChangedEventArgs, getRunnableAffordance, isEnabled, isRunnable, supportsEnabling } from "spikypanda-core";
import { UIItemBase } from "./inspectable";
import { Port } from "./port";
import { StandardsRegistry } from "./standards";
import { NodeDef, PortType } from "./types";

const RUN_PLAY_SVG  = '<svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor"><path d="M4 3l9 5-9 5V3z"/></svg>';
const RUN_STOP_SVG  = '<svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="1.5"/></svg>';
const REC_SVG       = '<svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="5"/></svg>';
const ENABLED_SVG   = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8 7 12 13 4"/></svg>';
const DISABLED_SVG  = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';

const GRID = 20;

let nodeIdCounter = 0;

/**
 * Build the CSS background for a node header. Resolution chain:
 *   skin token (--ne-color-category-<sanitized-category>)
 *   → def.color literal
 *   → --ne-color-node-header (skin default).
 * The chain is expressed with var() fallbacks so a runtime skin switch
 * propagates without rebuilding the node DOM.
 */
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
    readonly el: HTMLDivElement;
    readonly label: string;
    readonly color?: string;
    readonly inputs: Port[] = [];
    readonly outputs: Port[] = [];
    /** Control-plane inputs (_enable, _start, _stop, ...) — rendered in
     *  a separate row above the data inputs, distinct visual treatment. */
    readonly controlInputs: Port[] = [];
    readonly controlOutputs: Port[] = [];
    readonly item: UIItemBase<unknown>;

    x = 0;
    y = 0;
    selected = false;

    private readonly inputsContainer: HTMLDivElement;
    private readonly outputsContainer: HTMLDivElement;
    private readonly controlInputsContainer: HTMLDivElement;
    private readonly controlOutputsContainer: HTMLDivElement;
    private readonly headerEl: HTMLDivElement;
    private readonly titleEl: HTMLSpanElement;
    private readonly toolbarEl: HTMLDivElement;
    private readonly footerEl: HTMLDivElement;
    private readonly statusEl: HTMLSpanElement;
    private readonly statusDotEl: HTMLSpanElement;
    private readonly statusTextEl: HTMLSpanElement;
    private runBtn: HTMLButtonElement | null = null;    // start button (lifecycle)
    private stopBtn: HTMLButtonElement | null = null;   // stop button (lifecycle)
    private toggleBtn: HTMLButtonElement | null = null; // enable / disable
    private _inPlayMode = false;
    private _modelSubscription: IDisposable | null = null;

    constructor(def: NodeDef, parent: HTMLElement, standards?: StandardsRegistry) {
        this.id = `node_${nodeIdCounter++}`;
        this.label = def.label;
        this.color = def.color;
        this.item = new UIItemBase(def.data ?? def);

        this.el = document.createElement("div");
        this.el.className = "ne-node";
        this.el.dataset["nodeId"] = this.id;

        this.headerEl = document.createElement("div");
        this.headerEl.className = "ne-node-header";
        // Resolution order for the header background:
        //   1. skin token --ne-color-category-<def.category> if set
        //   2. def.color literal if provided
        //   3. --ne-color-node-header default (active skin's fallback)
        // The chain is encoded as a CSS var() fallback so it stays live
        // when the user switches skin at runtime.
        const headerBg = computeNodeHeaderBackground(def);
        if (headerBg) {
            this.headerEl.style.background = headerBg;
        }
        // Title + runtime-button slot. Title gets its own span so external
        // code can locate and update it (e.g. an auto-rename routine that
        // tracks a node's inbound wiring). Toolbar is a separate container
        // so runtime buttons stay visually grouped to the right of the
        // title and out of the title's text-overflow path.
        this.titleEl = document.createElement("span");
        this.titleEl.className = "ne-node-title";
        this.titleEl.textContent = def.label;
        this.headerEl.appendChild(this.titleEl);

        this.toolbarEl = document.createElement("div");
        this.toolbarEl.className = "ne-node-toolbar";
        this.headerEl.appendChild(this.toolbarEl);

        // Standards badges (e.g. ONNX). Rendered between the title and
        // the toolbar so they sit near the identity of the node, not
        // mixed with the lifecycle buttons. Empty unless def.standards
        // declares anything.
        if (def.standards && def.standards.length > 0) {
            const badgeWrap = document.createElement("div");
            badgeWrap.className = "ne-node-standards";
            for (const id of def.standards) {
                const info = standards?.get(id);
                const b = document.createElement("span");
                b.className = `ne-standard-badge ne-standard-${id}`;
                b.textContent = info?.glyph ?? id.slice(0, 1).toUpperCase();
                b.title = info ? info.label : id;
                if (info?.color) b.style.backgroundColor = info.color;
                badgeWrap.appendChild(b);
            }
            this.headerEl.insertBefore(badgeWrap, this.toolbarEl);
        }

        this.el.appendChild(this.headerEl);

        // Control-plane row sits ABOVE the data body: control inputs on
        // the left, control outputs on the right. Hidden via CSS
        // (:empty) when neither row has content, so plain data nodes
        // look identical to before.
        const controlRow = document.createElement("div");
        controlRow.className = "ne-node-control-row";
        this.controlInputsContainer = document.createElement("div");
        this.controlInputsContainer.className = "ne-node-control-inputs";
        controlRow.appendChild(this.controlInputsContainer);
        this.controlOutputsContainer = document.createElement("div");
        this.controlOutputsContainer.className = "ne-node-control-outputs";
        controlRow.appendChild(this.controlOutputsContainer);
        this.el.appendChild(controlRow);

        const body = document.createElement("div");
        body.className = "ne-node-body";

        this.inputsContainer = document.createElement("div");
        this.inputsContainer.className = "ne-node-inputs";
        body.appendChild(this.inputsContainer);

        this.outputsContainer = document.createElement("div");
        this.outputsContainer.className = "ne-node-outputs";
        body.appendChild(this.outputsContainer);

        this.el.appendChild(body);

        // Footer + status bar. Always present in the DOM so the layout
        // stays predictable; refreshStatusBar() hides the footer entirely
        // (display:none) for nodes that expose neither IRunnable nor
        // IEnabled, preserving the compact look of pure data nodes.
        this.footerEl = document.createElement("div");
        this.footerEl.className = "ne-node-footer";
        this.statusEl = document.createElement("span");
        this.statusEl.className = "ne-node-status";
        this.statusDotEl = document.createElement("span");
        this.statusDotEl.className = "ne-node-status-dot";
        this.statusTextEl = document.createElement("span");
        this.statusTextEl.className = "ne-node-status-text";
        this.statusEl.appendChild(this.statusDotEl);
        this.statusEl.appendChild(this.statusTextEl);
        this.footerEl.appendChild(this.statusEl);
        this.el.appendChild(this.footerEl);

        // Buttons + subscription + initial refresh. Footer must already
        // exist because refreshRuntimeButtons cascades into the status
        // bar refresh.
        this._installRuntimeButtons();

        parent.appendChild(this.el);

        for (const inp of def.controlInputs ?? []) {
            this.addControlInput(inp.name, inp.type);
        }
        for (const out of def.controlOutputs ?? []) {
            this.addControlOutput(out.name, out.type);
        }
        for (const inp of def.inputs) {
            this.addInput(inp.name, inp.type);
        }
        for (const out of def.outputs) {
            this.addOutput(out.name, out.type);
        }
    }

    addControlInput(name: string, type: PortType): Port {
        const port = new Port(name, type, "input");
        port.attachTo(this.el, this.controlInputsContainer);
        port.el.classList.add("ne-port-control");
        this.controlInputs.push(port);
        return port;
    }

    addControlOutput(name: string, type: PortType): Port {
        const port = new Port(name, type, "output");
        port.attachTo(this.el, this.controlOutputsContainer);
        port.el.classList.add("ne-port-control");
        this.controlOutputs.push(port);
        return port;
    }

    addInput(name: string, type: PortType): Port {
        const port = new Port(name, type, "input");
        port.attachTo(this.el, this.inputsContainer);
        this.inputs.push(port);
        return port;
    }

    addOutput(name: string, type: PortType): Port {
        const port = new Port(name, type, "output");
        port.attachTo(this.el, this.outputsContainer);
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

    setPosition(x: number, y: number): void {
        this.x = Math.round(x / GRID) * GRID;
        this.y = Math.round(y / GRID) * GRID;
        this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }

    setSelected(selected: boolean): void {
        this.selected = selected;
        this.el.classList.toggle("ne-node-selected", selected);
        if (selected) {
            this.el.style.setProperty("border-color", "#00d4ff", "important");
            this.el.style.setProperty("box-shadow", "0 0 0 2px #00d4ff, 0 4px 16px rgba(0,0,0,0.6)", "important");
        } else {
            this.el.style.removeProperty("border-color");
            this.el.style.removeProperty("box-shadow");
        }
    }

    reorderInputs(order: number[] | string[]): void {
        this.reorderPorts(this.inputs, this.inputsContainer, order);
    }

    reorderOutputs(order: number[] | string[]): void {
        this.reorderPorts(this.outputs, this.outputsContainer, order);
    }

    moveInputPort(from: number, to: number): void {
        this.movePort(this.inputs, this.inputsContainer, from, to);
    }

    moveOutputPort(from: number, to: number): void {
        this.movePort(this.outputs, this.outputsContainer, from, to);
    }

    moveControlInputPort(from: number, to: number): void {
        this.movePort(this.controlInputs, this.controlInputsContainer, from, to);
    }

    moveControlOutputPort(from: number, to: number): void {
        this.movePort(this.controlOutputs, this.controlOutputsContainer, from, to);
    }

    getAllPorts(): Port[] {
        return [...this.controlInputs, ...this.inputs, ...this.outputs, ...this.controlOutputs];
    }

    findPortByDot(dot: HTMLElement): Port | undefined {
        return this.getAllPorts().find((p) => p.dot === dot);
    }

    private reorderPorts(ports: Port[], container: HTMLDivElement, order: number[] | string[]): void {
        const resolved: Port[] = [];
        for (const ref of order) {
            const port = typeof ref === "number"
                ? ports[ref]
                : ports.find((p) => p.name === ref);
            if (port) resolved.push(port);
        }
        // Append any ports not mentioned in order (keep them at the end)
        for (const p of ports) {
            if (!resolved.includes(p)) resolved.push(p);
        }
        // Update the array in-place
        ports.length = 0;
        for (const p of resolved) ports.push(p);
        // Re-append DOM in new order
        for (const p of ports) {
            container.appendChild(p.el);
        }
    }

    private movePort(ports: Port[], container: HTMLDivElement, from: number, to: number): void {
        if (from < 0 || from >= ports.length || to < 0 || to >= ports.length) return;
        const [port] = ports.splice(from, 1);
        ports.splice(to, 0, port);
        for (const p of ports) {
            container.appendChild(p.el);
        }
    }

    /**
     * Update the visible header title without rebuilding the node.
     */
    setTitle(title: string): void {
        this.titleEl.textContent = title;
    }

    /**
     * Switch between Design mode (all runtime buttons disabled/grey) and
     * Play mode (buttons reflect live running state). Must be called by the
     * host whenever the editor transitions between modes.
     */
    setPlayMode(inPlay: boolean): void {
        this._inPlayMode = inPlay;
        this.refreshRuntimeButtons();
    }

    /**
     * Refresh the visual state of the runtime header buttons from the
     * model's IRunnable.status and IEnabled.enabled, gated by play mode.
     *
     * Lifecycle (IRunnable):
     *   Design mode    : both buttons disabled (grey)
     *   started        : start disabled, stop enabled (red)
     *   starting/stopping : both disabled (transition in progress)
     *   idle/stopped/failed : start enabled (green), stop disabled
     *
     * Enable toggle (IEnabled):
     *   Design mode : disabled (grey)
     *   Play mode   : reflects enabled state (green when on)
     */
    refreshRuntimeButtons(): void {
        const data = this.item.data;
        const inPlay = this._inPlayMode;

        if (this.runBtn && this.stopBtn && isRunnable(data)) {
            const s = data.status;
            const transitioning = s === "starting" || s === "stopping";
            const started = s === "started";
            const canStart = !started && !transitioning;
            const canStop  =  started && !transitioning;
            const affordance = getRunnableAffordance(data);
            const isRecord = affordance === "record";

            this.runBtn.disabled = !inPlay || !canStart;
            this.runBtn.classList.toggle("ne-rtbtn-play-active",   inPlay && canStart && !isRecord);
            this.runBtn.classList.toggle("ne-rtbtn-record-active", inPlay && canStart &&  isRecord);
            this.stopBtn.disabled = !inPlay || !canStop;
            this.stopBtn.classList.toggle("ne-rtbtn-stop-active", inPlay && canStop);
        }
        if (this.toggleBtn && isEnabled(data)) {
            const e = data.enabled;
            // Enable is a design-time + runtime concept (the user may
            // pre-disable a node before pressing Play). Keep the toggle
            // interactive even outside play mode; only the visual
            // "active" state is gated on play.
            this.toggleBtn.disabled = false;
            this.toggleBtn.classList.toggle("ne-rtbtn-play-active", e);
            this.toggleBtn.innerHTML = e ? ENABLED_SVG : DISABLED_SVG;
            this.toggleBtn.title = e ? "Disable" : "Enable";
        }

        this.refreshStatusBar();
    }

    /**
     * Update the footer status bar from the data's lifecycle and enabled
     * state. For nodes that expose neither IRunnable nor IEnabled the
     * status element is emptied; a `:empty` CSS rule hides the footer
     * so non-runnable nodes keep their original compact look.
     */
    refreshStatusBar(): void {
        const data = this.item.data;
        const runnable = isRunnable(data) ? data : null;
        // Skip IEnabled status entirely when the node opts out of
        // enable semantics (StartNode / StopNode etc.).
        const enableable = (isEnabled(data) && supportsEnabling(data)) ? data : null;

        if (!runnable && !enableable) {
            this.footerEl.style.display = "none";
            return;
        }
        this.footerEl.style.display = "";

        const parts: string[] = [];
        let dotState = "idle";
        if (runnable) {
            parts.push(runnable.status);
            dotState = runnable.status;
        }
        if (enableable) {
            if (!enableable.enabled) {
                // Disabled wins visually: an enabled=false node is
                // inert regardless of its lifecycle status, so the dot
                // turns grey and "disabled" appears in the text.
                parts.push("disabled");
                dotState = "disabled";
            } else if (!runnable) {
                // Pure IEnabled nodes (no lifecycle) get an explicit
                // "enabled" marker so the footer is never just a dot.
                parts.push("enabled");
            }
        }

        this.statusTextEl.textContent = parts.join(" · ");
        this.statusDotEl.className = `ne-node-status-dot ne-status-${dotState}`;
        this.statusEl.title = parts.join(" · ");
    }

    /**
     * Build header buttons for whichever model contracts the data
     * implements (IRunnable for lifecycle, IEnabled for on/off toggle).
     *
     * IRunnable gets a start button (▶) and a stop button (⬛). Each
     * targets one direction only so their disabled state can
     * independently reflect the current lifecycle status.
     *
     * IEnabled gets a single enable/disable toggle (checkmark / cross).
     *
     * All buttons are disabled in Design mode; setPlayMode(true) unlocks
     * them. If the data exposes an onPropertyChanged Observable, the UI
     * subscribes to it so that asynchronous transitions (starting →
     * started, stopping → stopped) refresh the buttons without an
     * explicit caller-side refresh.
     */
    private _installRuntimeButtons(): void {
        const data = this.item.data;

        // Block the node drag/select handler from consuming pointer events on
        // runtime buttons regardless of whether the drag handler uses capture
        // or bubbling phase. stopImmediatePropagation covers same-element
        // capture listeners registered after ours.
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
            playBtn.addEventListener("mousedown",   blockDrag, { capture: true });
            playBtn.addEventListener("click", (ev: MouseEvent) => {
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                const result = (data as IRunnable).start();
                if (result instanceof Promise) {
                    result.finally(() => this.refreshRuntimeButtons());
                }
                this.refreshRuntimeButtons();
            });
            this.toolbarEl.appendChild(playBtn);
            this.runBtn = playBtn;

            const stopBtn = document.createElement("button");
            stopBtn.type = "button";
            stopBtn.className = "ne-node-runtime-btn";
            stopBtn.title = isRecord ? "Stop recording" : "Stop";
            stopBtn.innerHTML = RUN_STOP_SVG;
            stopBtn.addEventListener("pointerdown", blockDrag, { capture: true });
            stopBtn.addEventListener("mousedown",   blockDrag, { capture: true });
            stopBtn.addEventListener("click", (ev: MouseEvent) => {
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                const result = (data as IRunnable).stop();
                if (result instanceof Promise) {
                    result.finally(() => this.refreshRuntimeButtons());
                }
                this.refreshRuntimeButtons();
            });
            this.toolbarEl.appendChild(stopBtn);
            this.stopBtn = stopBtn;
        }

        if (isEnabled(data) && supportsEnabling(data)) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ne-node-runtime-btn";
            btn.addEventListener("pointerdown", blockDrag, { capture: true });
            btn.addEventListener("mousedown",   blockDrag, { capture: true });
            btn.addEventListener("click", (ev: MouseEvent) => {
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                (data as IEnabled).enabled = !(data as IEnabled).enabled;
                this.refreshRuntimeButtons();
            });
            this.toolbarEl.appendChild(btn);
            this.toggleBtn = btn;
        }

        this._subscribeToModel();

        // Initial visual state: Design mode, all buttons disabled.
        this.refreshRuntimeButtons();
    }

    /**
     * Duck-checks the data object for an onPropertyChanged Observable
     * (exposed by GraphItem-derived models). When present, refresh the
     * runtime buttons on every "status" or "enabled" property change so
     * the UI stays in sync with asynchronous lifecycle transitions
     * without callers having to invoke refreshRuntimeButtons themselves.
     */
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
     * Release model subscriptions and detach DOM. Called by the editor
     * when this node is removed from the graph.
     */
    dispose(): void {
        this._modelSubscription?.dispose();
        this._modelSubscription = null;
        this.el.remove();
    }
}
