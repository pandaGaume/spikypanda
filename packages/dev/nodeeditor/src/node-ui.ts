import { UIItemBase } from "./inspectable.js";
import { Port } from "./port.js";
import { NodeDef, PortType } from "./types.js";

const GRID = 20;

let nodeIdCounter = 0;

export class NodeUI {
    readonly id: string;
    readonly el: HTMLDivElement;
    readonly label: string;
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
    }

    getAllPorts(): Port[] {
        return [...this.inputs, ...this.outputs];
    }

    findPortByDot(dot: HTMLElement): Port | undefined {
        return this.getAllPorts().find((p) => p.dot === dot);
    }
}
