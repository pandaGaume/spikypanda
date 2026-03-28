import { UIItemBase } from "./inspectable.js";
import { Port } from "./port.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function screenToLocal(el: SVGSVGElement, sx: number, sy: number): { x: number; y: number } {
    const pt = el.createSVGPoint();
    pt.x = sx;
    pt.y = sy;
    const ctm = el.getScreenCTM();
    if (!ctm) return { x: sx, y: sy };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
}

export class Connection {
    readonly from: Port;
    readonly to: Port;
    readonly path: SVGPathElement;
    readonly item: UIItemBase<unknown>;

    private readonly svg: SVGSVGElement;

    constructor(from: Port, to: Port, svg: SVGSVGElement, strokeColor = "#fff") {
        this.from = from;
        this.to = to;
        this.svg = svg;
        this.item = new UIItemBase({ name: "Connection", from: from.name, to: to.name, fromType: from.type, toType: to.type });

        this.path = document.createElementNS(SVG_NS, "path") as SVGPathElement;
        this.path.setAttribute("stroke", strokeColor);
        this.path.setAttribute("fill", "none");
        this.path.setAttribute("stroke-width", "2");
        this.path.classList.add("ne-connection");
        this.svg.appendChild(this.path);

        this.update();
    }

    update(): void {
        const p1 = this.from.getCenter();
        const p2 = this.to.getCenter();

        const l1 = screenToLocal(this.svg, p1.x, p1.y);
        const l2 = screenToLocal(this.svg, p2.x, p2.y);

        this.path.setAttribute("d", bezierPath(l1.x, l1.y, l2.x, l2.y));
    }

    remove(): void {
        this.path.remove();
    }

    containsPort(port: Port): boolean {
        return this.from === port || this.to === port;
    }
}

export class ConnectionPreview {
    readonly path: SVGPathElement;
    private readonly svg: SVGSVGElement;

    constructor(svg: SVGSVGElement) {
        this.svg = svg;
        this.path = document.createElementNS(SVG_NS, "path") as SVGPathElement;
        this.path.setAttribute("stroke", "#00d4ff");
        this.path.setAttribute("fill", "none");
        this.path.setAttribute("stroke-width", "2");
        this.path.setAttribute("stroke-dasharray", "6,4");
        svg.appendChild(this.path);
    }

    updateScreen(sx1: number, sy1: number, sx2: number, sy2: number): void {
        const l1 = screenToLocal(this.svg, sx1, sy1);
        const l2 = screenToLocal(this.svg, sx2, sy2);
        this.path.setAttribute("d", bezierPath(l1.x, l1.y, l2.x, l2.y));
    }

    remove(): void {
        this.path.remove();
    }
}
