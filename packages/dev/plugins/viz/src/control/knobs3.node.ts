import * as Nexus from "nexusui";
import {
    cloneable, editable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import type { IRenderable } from "spikypanda-nodeeditor";

/**
 * Three-knob control surface, rendered as a Dashboard tile. SOURCE
 * node: publishes the current knob values on every tick. Use one tile
 * per object you want to control (3 oscillator params, 3 PID gains,
 * 3 fault levels, ...).
 *
 * UX (delegated to NexusUI's `Dial`):
 *   - Knob is a circular dial with an arc indicator.
 *   - Drag vertically on a knob → rotate (DAW convention: up = bigger).
 *   - Wheel on a knob → fine adjustment.
 *   - Double-click → text input for direct numeric entry.
 *
 * Why NexusUI rather than a custom knob:
 *   - The widget code (drag math, modes "relative" / "absolute", edge
 *     cases like wrap-around on touch) is dense and error-prone — we
 *     don't want to own it. NexusUI is the de-facto standard for
 *     audio-research web UIs (Stanford CCRMA, NYU MARL); ~70 KB; MIT;
 *     stable since 2018 (a feature, not a bug — no breaking changes).
 *   - Same library can ship XY-pad, multi-slider, envelope, sequencer
 *     widgets later without adding another dep.
 *
 * Outputs (3 fixed slots):
 *   out_0 / out_1 / out_2   the three knob values, broadcast per tick.
 *
 * Editables (per-knob: label, min, max, default value):
 *   label_0..2     display label under the knob.
 *   min_0..2       minimum value (default 0).
 *   max_0..2       maximum value (default 1).
 *   value_0..2     initial value (cloneable so save/load round-trips
 *                  the last user-set position).
 *
 * Mutating the editables (e.g. typing a new min in the property panel)
 * recreates the affected dial on the next paint — NexusUI dials don't
 * support live range changes after construction.
 */

const KNOB_COUNT = 3;

export class Knobs3Node extends RuntimeNode implements IDeclaresPorts, IRenderable {
    public readonly renderableType = "Viz.Control:knobs3";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "out_0", optional: false, type: "float" },
        { slot: "out_1", optional: false, type: "float" },
        { slot: "out_2", optional: false, type: "float" },
    ];

    // ── Per-knob editables ─────────────────────────────────────────────
    // Three knobs × four fields each. Stored as three parallel triples
    // (labels/mins/maxs/values) rather than three objects, because the
    // @cloneable + @editable decorator stack works on direct primitive
    // fields, not on nested objects. The setters route writes through
    // setField so the property panel + save/load + clone path stay
    // consistent.
    @cloneable private _label_0: string = "Frequency";
    @cloneable private _label_1: string = "Amplitude";
    @cloneable private _label_2: string = "Phase";

    @cloneable private _min_0: number = 1;
    @cloneable private _min_1: number = 0;
    @cloneable private _min_2: number = 0;

    @cloneable private _max_0: number = 200;
    @cloneable private _max_1: number = 1;
    @cloneable private _max_2: number = 2 * Math.PI;

    @cloneable private _value_0: number = 50;
    @cloneable private _value_1: number = 1;
    @cloneable private _value_2: number = 0;

    // ── Generated getters/setters per knob ──────────────────────────────
    // The three-way fan-out below is verbose but keeps the @editable
    // decorator behaviour intact (decorators must annotate concrete
    // accessors, not be applied through a loop).

    @editable("string") public get label_0(): string { return this._label_0; }
    public set label_0(v: string) { this.setField("label_0", this._label_0, v, (n) => { this._label_0 = n; this._dirty = true; }); }
    @editable("string") public get label_1(): string { return this._label_1; }
    public set label_1(v: string) { this.setField("label_1", this._label_1, v, (n) => { this._label_1 = n; this._dirty = true; }); }
    @editable("string") public get label_2(): string { return this._label_2; }
    public set label_2(v: string) { this.setField("label_2", this._label_2, v, (n) => { this._label_2 = n; this._dirty = true; }); }

    @editable("number") public get min_0(): number { return this._min_0; }
    public set min_0(v: number) { this.setField("min_0", this._min_0, v, (n) => { this._min_0 = n; this._dirty = true; }); }
    @editable("number") public get min_1(): number { return this._min_1; }
    public set min_1(v: number) { this.setField("min_1", this._min_1, v, (n) => { this._min_1 = n; this._dirty = true; }); }
    @editable("number") public get min_2(): number { return this._min_2; }
    public set min_2(v: number) { this.setField("min_2", this._min_2, v, (n) => { this._min_2 = n; this._dirty = true; }); }

    @editable("number") public get max_0(): number { return this._max_0; }
    public set max_0(v: number) { this.setField("max_0", this._max_0, v, (n) => { this._max_0 = n; this._dirty = true; }); }
    @editable("number") public get max_1(): number { return this._max_1; }
    public set max_1(v: number) { this.setField("max_1", this._max_1, v, (n) => { this._max_1 = n; this._dirty = true; }); }
    @editable("number") public get max_2(): number { return this._max_2; }
    public set max_2(v: number) { this.setField("max_2", this._max_2, v, (n) => { this._max_2 = n; this._dirty = true; }); }

    // ── Mount state ────────────────────────────────────────────────────
    private _host: HTMLElement | null = null;
    private _dialHosts: (HTMLElement | null)[] = [null, null, null];
    private _dials: (any | null)[] = [null, null, null];
    /** Marks the dial geometry stale (min/max/label changed). Triggers
     *  a re-render in repaint() so editable changes from the property
     *  panel take effect without a full tile remount. */
    private _dirty: boolean = false;

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    public override reset(_session: ISession): void { /* nothing to reset */ }

    public override fire(session: ISession, _t: number): void {
        // Source pattern: publish the current knob value on each tick.
        // The Number Slider node does the same — every tick republishes
        // so downstream nodes that consume immediately see the latest
        // user input without dropouts.
        const values = [this._value_0, this._value_1, this._value_2];
        const slots = ["out_0", "out_1", "out_2"];
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (let i = 0; i < KNOB_COUNT; i++) {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slots[i] || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, values[i]);
            }
        }
    }

    // ── IRenderable ────────────────────────────────────────────────────

    public mountInto(host: HTMLElement): void {
        this._host = host;
        host.classList.add("ne-knobs3");
        host.replaceChildren();
        this._renderDials();
    }

    public unmountFrom(host: HTMLElement): void {
        this._destroyDials();
        host.classList.remove("ne-knobs3");
        host.replaceChildren();
        this._host = null;
    }

    /**
     * Dashboard rAF tick. NexusUI handles its own user-input → state
     * loop, so we only do work here when the dial geometry needs
     * rebuilding (min/max/label changed via the property panel).
     */
    public repaint(): void {
        if (!this._host || !this._dirty) return;
        this._dirty = false;
        this._destroyDials();
        this._renderDials();
    }

    public onResize(_width: number, _height: number): void {
        // NexusUI dials have a fixed size; we don't try to scale them
        // with the tile. The CSS flex container centres them and adds
        // a horizontal scroll bar if the tile is too narrow.
    }

    // ── Internals ──────────────────────────────────────────────────────

    private _renderDials(): void {
        if (!this._host) return;
        const labels = [this._label_0, this._label_1, this._label_2];
        const mins   = [this._min_0,   this._min_1,   this._min_2];
        const maxs   = [this._max_0,   this._max_1,   this._max_2];
        const values = [this._value_0, this._value_1, this._value_2];

        for (let i = 0; i < KNOB_COUNT; i++) {
            // Per-knob cell: dial on top, label and live value below.
            const cell = document.createElement("div");
            cell.className = "ne-knobs3-cell";
            const dialHost = document.createElement("div");
            dialHost.className = "ne-knobs3-dial";
            const labelEl = document.createElement("div");
            labelEl.className = "ne-knobs3-label";
            labelEl.textContent = labels[i];
            const valueEl = document.createElement("div");
            valueEl.className = "ne-knobs3-value";
            valueEl.textContent = _format(values[i]);

            cell.appendChild(dialHost);
            cell.appendChild(labelEl);
            cell.appendChild(valueEl);
            this._host.appendChild(cell);

            // NexusUI Dial is constructed against a real DOM element.
            // `mode: relative` so the dial responds to drag DELTAS
            // (matching DAW UX) rather than jumping to the click point.
            const dial = new (Nexus as any).Dial(dialHost, {
                size: [72, 72],
                interaction: "vertical",
                mode: "relative",
                min: mins[i],
                max: maxs[i],
                step: 0,
                value: values[i],
            });
            const idx = i;
            dial.on("change", (v: number) => {
                this._setValueAt(idx, v);
                valueEl.textContent = _format(v);
            });
            this._dialHosts[i] = dialHost;
            this._dials[i] = dial;
        }
    }

    private _destroyDials(): void {
        for (let i = 0; i < KNOB_COUNT; i++) {
            const dial = this._dials[i];
            if (dial && typeof dial.destroy === "function") {
                try { dial.destroy(); } catch { /* ignore */ }
            }
            this._dials[i] = null;
            this._dialHosts[i] = null;
        }
        if (this._host) this._host.replaceChildren();
    }

    /** Setter route used by the dial's change handler. We DON'T go
     *  through the @editable setters because (a) `value_i` isn't
     *  declared as an editable (the knob IS the editor), and (b) we
     *  want save/load round-trip via @cloneable, not property-panel
     *  re-render on every drag. */
    private _setValueAt(i: number, v: number): void {
        const next = Number.isFinite(v) ? v : 0;
        if (i === 0) this.setField("value_0", this._value_0, next, (n) => { this._value_0 = n; });
        else if (i === 1) this.setField("value_1", this._value_1, next, (n) => { this._value_1 = n; });
        else if (i === 2) this.setField("value_2", this._value_2, next, (n) => { this._value_2 = n; });
    }
}

/** Format a knob value for display under the dial. Compact: 3 sig figs
 *  for small numbers, integer for ≥100. Avoids "5.000000001" jitter. */
function _format(v: number): string {
    if (!Number.isFinite(v)) return "—";
    if (Math.abs(v) >= 100) return String(Math.round(v));
    if (Math.abs(v) >= 10) return v.toFixed(1);
    return v.toFixed(3);
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createKnobs3Node(): Knobs3Node {
    return new Knobs3Node();
}

// ─────────────────────────────────────────────────────────────────────
// Scoped styles. Injected once on import — keeps plugin-viz a single
// .js bundle (no separate .css to ship). All rules scoped to
// .ne-knobs3 so they cannot leak into other tiles.
// ─────────────────────────────────────────────────────────────────────

const KNOBS3_CSS = `
.ne-knobs3 {
    width: 100%; height: 100%; overflow: auto; box-sizing: border-box;
    display: flex; flex-direction: row; align-items: center; justify-content: space-around;
    gap: 12px; padding: 8px;
}
.ne-knobs3-cell {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    flex: 0 0 auto;
}
.ne-knobs3-dial { width: 72px; height: 72px; }
.ne-knobs3-label {
    font: 11px -apple-system, "Segoe UI", sans-serif; color: #B0B0B8;
    text-transform: uppercase; letter-spacing: 0.05em;
}
.ne-knobs3-value {
    font: 12px ui-monospace, Consolas, monospace; color: #E8E8F0;
    min-width: 60px; text-align: center;
}
`;

if (typeof document !== "undefined") {
    const tag = "ne-knobs3-styles";
    if (!document.getElementById(tag)) {
        const style = document.createElement("style");
        style.id = tag;
        style.textContent = KNOBS3_CSS;
        document.head.appendChild(style);
    }
}
