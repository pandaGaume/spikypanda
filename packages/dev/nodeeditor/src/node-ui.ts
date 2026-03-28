import { UIItemBase } from "./inspectable.js";
import { Port } from "./port.js";
import { NodeDef, PortType } from "./types.js";

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
        this.headerEl.textContent = def.label;
        if (def.color) {
            this.headerEl.style.background = def.color;
        }
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
}
