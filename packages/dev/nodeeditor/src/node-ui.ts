import { UIItemBase, IRunnableNode, IToggableNode, isRunnableNode, isToggableNode } from "./inspectable.js";
import { Port } from "./port.js";
import { NodeDef, PortType } from "./types.js";

const RUN_PLAY_SVG  = '<svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor"><path d="M4 3l9 5-9 5V3z"/></svg>';
const RUN_STOP_SVG  = '<svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="1.5"/></svg>';
const ENABLED_SVG   = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8 7 12 13 4"/></svg>';
const DISABLED_SVG  = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';

const GRID = 20;

let nodeIdCounter = 0;

export class NodeUI {
    readonly id: string;
    readonly el: HTMLDivElement;
    readonly label: string;
    readonly color?: string;
    readonly inputs: Port[] = [];
    readonly outputs: Port[] = [];
    readonly item: UIItemBase<unknown>;

    x = 0;
    y = 0;
    selected = false;

    private readonly inputsContainer: HTMLDivElement;
    private readonly outputsContainer: HTMLDivElement;
    private readonly headerEl: HTMLDivElement;
    private readonly titleEl: HTMLSpanElement;
    private runBtn: HTMLButtonElement | null = null;   // play (start) button
    private stopBtn: HTMLButtonElement | null = null;  // stop button
    private toggleBtn: HTMLButtonElement | null = null;
    private _inPlayMode = false;

    constructor(def: NodeDef, parent: HTMLElement) {
        this.id = `node_${nodeIdCounter++}`;
        this.label = def.label;
        this.color = def.color;
        this.item = new UIItemBase(def.data ?? def);

        this.el = document.createElement("div");
        this.el.className = "ne-node";
        this.el.dataset["nodeId"] = this.id;

        this.headerEl = document.createElement("div");
        this.headerEl.className = "ne-node-header";
        if (def.color) {
            this.headerEl.style.background = def.color;
        }
        // Title + runtime-button slot. Title gets its own span so external
        // code can locate and update it (e.g. an auto-rename routine that
        // tracks a node's inbound wiring).
        this.titleEl = document.createElement("span");
        this.titleEl.className = "ne-node-title";
        this.titleEl.textContent = def.label;
        this.headerEl.appendChild(this.titleEl);
        this._installRuntimeButtons();
        this.el.appendChild(this.headerEl);

        const body = document.createElement("div");
        body.className = "ne-node-body";

        this.inputsContainer = document.createElement("div");
        this.inputsContainer.className = "ne-node-inputs";
        body.appendChild(this.inputsContainer);

        this.outputsContainer = document.createElement("div");
        this.outputsContainer.className = "ne-node-outputs";
        body.appendChild(this.outputsContainer);

        this.el.appendChild(body);
        parent.appendChild(this.el);

        for (const inp of def.inputs) {
            this.addInput(inp.name, inp.type);
        }
        for (const out of def.outputs) {
            this.addOutput(out.name, out.type);
        }
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

    getAllPorts(): Port[] {
        return [...this.inputs, ...this.outputs];
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
     * Refresh the visual state of the runtime header buttons. Read the data
     * object's IRunnableNode / IToggableNode methods and the current play
     * mode to decide which buttons are enabled and their accent colour.
     *
     * Rules for IRunnableNode (sources):
     *   Design mode : both play and stop buttons disabled (grey)
     *   Play + stopped : play button green/enabled, stop button grey/disabled
     *   Play + running : play button grey/disabled, stop button red/enabled
     *
     * Rules for IToggableNode (faults, environment):
     *   Design mode : toggle button disabled (grey)
     *   Play mode   : toggle button reflects enabled state (green = on)
     */
    refreshRuntimeButtons(): void {
        const data = this.item.data;
        const inPlay = this._inPlayMode;

        if (this.runBtn && this.stopBtn && isRunnableNode(data)) {
            const r = (data as IRunnableNode).isRunning();
            // Play button: active only in play mode when the source is stopped.
            this.runBtn.disabled  = !inPlay || r;
            this.runBtn.classList.toggle("ne-rtbtn-play-active", inPlay && !r);
            // Stop button: active (red) only in play mode when the source runs.
            this.stopBtn.disabled = !inPlay || !r;
            this.stopBtn.classList.toggle("ne-rtbtn-stop-active", inPlay && r);
        }
        if (this.toggleBtn && isToggableNode(data)) {
            const e = (data as IToggableNode).isEnabled();
            this.toggleBtn.disabled = !inPlay;
            this.toggleBtn.classList.toggle("ne-rtbtn-play-active", inPlay && e);
            this.toggleBtn.innerHTML = e ? ENABLED_SVG : DISABLED_SVG;
            this.toggleBtn.title = e ? "Disable" : "Enable";
        }
    }

    /**
     * Build header buttons for whichever runtime interfaces the data
     * object implements. Idempotent on first call.
     *
     * IRunnableNode gets two separate buttons: a play button (▶) and a
     * stop button (⬛). Each targets one direction only so their disabled
     * state can independently reflect the current running state.
     *
     * IToggableNode gets a single enable/disable toggle (checkmark / cross).
     *
     * Both sets are disabled in Design mode; setPlayMode(true) unlocks them.
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

        if (isRunnableNode(data)) {
            // --- Play (start) button ---
            const playBtn = document.createElement("button");
            playBtn.type = "button";
            playBtn.className = "ne-node-runtime-btn";
            playBtn.title = "Start";
            playBtn.innerHTML = RUN_PLAY_SVG;
            playBtn.addEventListener("pointerdown", blockDrag, { capture: true });
            playBtn.addEventListener("mousedown",   blockDrag, { capture: true });
            playBtn.addEventListener("click", (ev: MouseEvent) => {
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                (data as IRunnableNode).setRunning(true);
                this.refreshRuntimeButtons();
            });
            this.headerEl.appendChild(playBtn);
            this.runBtn = playBtn;

            // --- Stop button ---
            const stopBtn = document.createElement("button");
            stopBtn.type = "button";
            stopBtn.className = "ne-node-runtime-btn";
            stopBtn.title = "Stop";
            stopBtn.innerHTML = RUN_STOP_SVG;
            stopBtn.addEventListener("pointerdown", blockDrag, { capture: true });
            stopBtn.addEventListener("mousedown",   blockDrag, { capture: true });
            stopBtn.addEventListener("click", (ev: MouseEvent) => {
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                (data as IRunnableNode).setRunning(false);
                this.refreshRuntimeButtons();
            });
            this.headerEl.appendChild(stopBtn);
            this.stopBtn = stopBtn;
        }

        if (isToggableNode(data)) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ne-node-runtime-btn";
            btn.addEventListener("pointerdown", blockDrag, { capture: true });
            btn.addEventListener("mousedown",   blockDrag, { capture: true });
            btn.addEventListener("click", (ev: MouseEvent) => {
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                const e = (data as IToggableNode).isEnabled();
                (data as IToggableNode).setEnabled(!e);
                this.refreshRuntimeButtons();
            });
            this.headerEl.appendChild(btn);
            this.toggleBtn = btn;
        }

        // Initial visual state: Design mode, all buttons disabled.
        this.refreshRuntimeButtons();
    }
}
