import { UIItemBase } from "./inspectable";
import { Port } from "./port";
import { isConfigLinkType, type PortType } from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Cable rendering kind.
 *
 *   "data"   — solid bezier, the canonical runtime cable. Carries a
 *              payload at every fire.
 *   "config" — dashed bezier, the P4/P5 config-link family. Resolved
 *              once at session-bind (SceneItem ↔ Sim.Graph, SolverNode
 *              ↔ SceneItem, etc.) and never carries a runtime payload
 *              during fire(). The dash makes "this is not a normal
 *              wire — it's a binding" visible at a glance.
 *   "structural" — a typed STRUCTURAL relation (not a data cable, not a
 *              config binding): an `ApplyTo` link from a fault OPERATOR's
 *              apply point (a `fault`-typed output) onto a model's variadic
 *              `fault_N` input. The model reads the fault's physics, never a
 *              port payload. Rendered as a distinct sparse-dashed cable.
 *
 * The kind is normally DERIVED from the connected ports' types via
 * `deriveLinkKind` rather than passed explicitly: a wire from a `fault`
 * port is structural, a wire between two config-link-typed ports
 * (scene / solver / atmosphere / shared) is a config-link, everything
 * else stays a data cable. Callers that want to override can pass the
 * kind directly to the Connection constructor.
 */
export type LinkKind = "data" | "config" | "structural";

/**
 * Decide a cable's render style purely from its endpoint types. Used
 * by the GraphViewer's `connect()` so every new cable picks the
 * right style automatically — no per-call routing logic in the
 * viewer, no separate registration step in the plugins.
 *
 * The rule: if either endpoint is a config-link type, the whole wire
 * renders as a config-link. The `arePortTypesCompatible` guard in
 * `types.ts` already ensures the two endpoints MUST share the same
 * config-link type when one of them is config, so "either" is
 * equivalent to "both" here in practice.
 */
export function deriveLinkKind(from: PortType, to: PortType): LinkKind {
    // A `fault` endpoint marks an ApplyTo structural relation (a fault operator
    // applied to a model's fault_N input), distinct from a config binding.
    if (from === "fault" || to === "fault") return "structural";
    return isConfigLinkType(from) || isConfigLinkType(to) ? "config" : "data";
}

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
    readonly linkKind: LinkKind;

    private readonly svg: SVGSVGElement;

    /**
     * Construct a cable between two ports.
     *
     * `linkKind` selects the visual style; when omitted it is derived
     * from the endpoint types via `deriveLinkKind` so config-link
     * ports automatically get the dashed style without callers
     * needing to know. Explicit values are still honoured for the
     * edge case of a config-style wire between two `any` ports (e.g.
     * a plugin-defined virtual binding).
     */
    constructor(from: Port, to: Port, svg: SVGSVGElement, strokeColor = "#fff", linkKind?: LinkKind) {
        this.from = from;
        this.to = to;
        this.svg = svg;
        this.linkKind = linkKind ?? deriveLinkKind(from.type, to.type);
        this.item = new UIItemBase({
            name: "Connection",
            from: from.name,
            to: to.name,
            fromType: from.type,
            toType: to.type,
            linkKind: this.linkKind,
        });

        this.path = document.createElementNS(SVG_NS, "path") as SVGPathElement;
        this.path.setAttribute("stroke", strokeColor);
        this.path.setAttribute("fill", "none");
        this.path.setAttribute("stroke-width", "2");
        this.path.classList.add("ne-connection");
        // Config-link cables render dashed at reduced opacity to
        // mark them as "binding, not data flow". Solid (default)
        // covers the data-cable case. The class hooks let stylesheets
        // override the inline attributes without us caring.
        if (this.linkKind === "config") {
            this.path.classList.add("ne-connection-config");
            this.path.setAttribute("stroke-dasharray", "8,5");
            this.path.setAttribute("stroke-opacity", "0.85");
        } else if (this.linkKind === "structural") {
            // ApplyTo: a sparse dash distinct from the config dash, so a
            // fault->model relation reads as neither a data cable nor a binding.
            this.path.classList.add("ne-connection-structural");
            this.path.setAttribute("stroke-dasharray", "2,6");
            this.path.setAttribute("stroke-opacity", "0.8");
        } else {
            this.path.classList.add("ne-connection-data");
        }
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
