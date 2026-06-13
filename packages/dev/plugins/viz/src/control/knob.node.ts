import * as Nexus from "nexusui";
import { cloneable, editable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import type { IRenderable } from "spikypanda-nodeeditor";

/**
 * Single control knob, rendered as a Dashboard tile. SOURCE node:
 * publishes the current knob value on `value` every tick. The generic
 * one-parameter command surface, e.g. a speed setpoint driving a FOC
 * controller's `speed_target`, a load level, a gain.
 *
 * UX delegated to NexusUI's Dial (drag vertical = rotate, wheel = fine,
 * double-click = numeric entry), same library as Knobs3.
 *
 * Editables: label (display name under the dial), min, max. The live
 * position `value` is cloneable so save/load round-trips it.
 */
export class KnobNode extends RuntimeNode implements IDeclaresPorts, IRenderable {
    public readonly renderableType = "Viz.Control:knob";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "value", optional: false, type: "float" }];

    @cloneable private _label: string = "Value";
    @cloneable private _min: number = 0;
    @cloneable private _max: number = 100;
    @cloneable private _value: number = 0;

    private _host: HTMLElement | null = null;
    private _dialHost: HTMLElement | null = null;
    private _dial: unknown | null = null;
    private _valueEl: HTMLElement | null = null;
    private _labelEl: HTMLElement | null = null;
    private _dirty: boolean = false;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("string") public get label(): string {
        return this._label;
    }
    public set label(v: string) {
        this.setField("label", this._label, v, (n) => {
            this._label = n;
            this._dirty = true;
        });
    }
    @editable("number") public get min(): number {
        return this._min;
    }
    public set min(v: number) {
        this.setField("min", this._min, v, (n) => {
            this._min = n;
            this._dirty = true;
        });
    }
    @editable("number") public get max(): number {
        return this._max;
    }
    public set max(v: number) {
        this.setField("max", this._max, v, (n) => {
            this._max = n;
            this._dirty = true;
        });
    }

    /** Live value (read-only externally; set by dragging the dial). */
    public get value(): number {
        return this._value;
    }

    public override reset(_session: ISession): void {
        /* nothing to reset; the knob position persists */
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "value" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, this._value);
        }
    }

    // ── IRenderable ────────────────────────────────────────────────────
    public mountInto(host: HTMLElement): void {
        this._host = host;
        host.classList.add("ne-knob");
        host.replaceChildren();
        this._render();
    }

    public unmountFrom(host: HTMLElement): void {
        this._destroy();
        host.classList.remove("ne-knob");
        host.replaceChildren();
        this._host = null;
    }

    public repaint(): void {
        if (!this._host || !this._dirty) return;
        this._dirty = false;
        this._destroy();
        this._render();
    }

    public onResize(_width: number, _height: number): void {
        /* fixed-size dial; CSS centres it */
    }

    private _render(): void {
        if (!this._host) return;
        const cell = document.createElement("div");
        cell.className = "ne-knob-cell";
        const dialHost = document.createElement("div");
        dialHost.className = "ne-knob-dial";
        this._labelEl = document.createElement("div");
        this._labelEl.className = "ne-knob-label";
        this._labelEl.textContent = this._label;
        this._valueEl = document.createElement("div");
        this._valueEl.className = "ne-knob-value";
        this._valueEl.textContent = _format(this._value);
        cell.appendChild(dialHost);
        cell.appendChild(this._labelEl);
        cell.appendChild(this._valueEl);
        this._host.appendChild(cell);

        const dial = new (Nexus as unknown as { Dial: new (el: HTMLElement, opts: unknown) => unknown }).Dial(dialHost, {
            size: [80, 80],
            interaction: "vertical",
            mode: "relative",
            min: this._min,
            max: this._max,
            step: 0,
            value: this._value,
        });
        (dial as { on: (ev: string, cb: (v: number) => void) => void }).on("change", (v: number) => {
            const next = Number.isFinite(v) ? v : 0;
            this.setField("value", this._value, next, (n) => {
                this._value = n;
            });
            if (this._valueEl) this._valueEl.textContent = _format(next);
        });
        this._dialHost = dialHost;
        this._dial = dial;
    }

    private _destroy(): void {
        const d = this._dial as { destroy?: () => void } | null;
        if (d && typeof d.destroy === "function") {
            try {
                d.destroy();
            } catch {
                /* ignore */
            }
        }
        this._dial = null;
        this._dialHost = null;
        if (this._host) this._host.replaceChildren();
    }
}

function _format(v: number): string {
    if (!Number.isFinite(v)) return "—";
    if (Math.abs(v) >= 100) return String(Math.round(v));
    if (Math.abs(v) >= 10) return v.toFixed(1);
    return v.toFixed(3);
}

export function createKnobNode(): KnobNode {
    return new KnobNode();
}

const KNOB_CSS = `
.ne-knob {
    width: 100%; height: 100%; overflow: auto; box-sizing: border-box;
    display: flex; align-items: center; justify-content: center; padding: 8px;
}
.ne-knob-cell {
    display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 0 0 auto;
}
.ne-knob-dial { width: 80px; height: 80px; }
.ne-knob-label {
    font: 11px -apple-system, "Segoe UI", sans-serif; color: #B0B0B8;
    text-transform: uppercase; letter-spacing: 0.05em;
}
.ne-knob-value {
    font: 13px ui-monospace, Consolas, monospace; color: #E8E8F0;
    min-width: 60px; text-align: center;
}
`;

if (typeof document !== "undefined") {
    const tag = "ne-knob-styles";
    if (!document.getElementById(tag)) {
        const style = document.createElement("style");
        style.id = tag;
        style.textContent = KNOB_CSS;
        document.head.appendChild(style);
    }
}
