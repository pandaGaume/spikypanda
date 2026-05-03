import { PortDirection, PortType, PORT_COLORS, Vec2 } from "./types.js";

export class Port {
    readonly el: HTMLDivElement;
    readonly dot: HTMLDivElement;
    readonly labelEl: HTMLSpanElement;
    readonly direction: PortDirection;
    readonly type: PortType;
    readonly name: string;

    nodeEl!: HTMLDivElement;

    constructor(name: string, type: PortType, direction: PortDirection) {
        this.name = name;
        this.type = type;
        this.direction = direction;

        this.el = document.createElement("div");
        this.el.className = `ne-port ne-port-${direction}`;

        this.dot = document.createElement("div");
        this.dot.className = "ne-port-dot";
        this.dot.style.background = PORT_COLORS[type];
        this.dot.title = `${name} (${type})`;

        this.labelEl = document.createElement("span");
        this.labelEl.className = "ne-port-label";
        this.labelEl.textContent = name;

        if (direction === "input") {
            this.el.appendChild(this.dot);
            this.el.appendChild(this.labelEl);
        } else {
            this.el.appendChild(this.labelEl);
            this.el.appendChild(this.dot);
        }
    }

    getCenter(): Vec2 {
        const rect = this.dot.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    }

    attachTo(nodeEl: HTMLDivElement, container: HTMLDivElement): void {
        this.nodeEl = nodeEl;
        container.appendChild(this.el);
    }

    /**
     * Detach this port's DOM from its parent. The port object itself stays
     * around so any caller still holding a reference (e.g. an active drag)
     * does not crash; callers that own the port are expected to drop it
     * after detach.
     */
    detach(): void {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
    }
}
