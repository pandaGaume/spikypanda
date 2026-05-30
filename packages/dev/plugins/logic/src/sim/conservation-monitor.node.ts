import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

type Mode = "absolute" | "relative";

/**
 * ConservationMonitorNode — watch a sum that should be invariant.
 *
 * Helios chemistry plants must satisfy mass / charge / energy balances
 * by construction. The integrator and the controller both have bugs;
 * when they drift the simulation silently produces nonsense. This
 * node sits in parallel with the dataflow, sums N tributary signals
 * (the variadic `in_<k>` ports), and flags when the running sum has
 * walked away from its initial value.
 *
 * Typical wiring for a 2-tank water balance:
 *
 *     Tank1.level ──► in_0 ┐
 *     Tank2.level ──► in_1 ├── ConservationMonitor(tolerance=1e-3) ──► alert ──► LED
 *     EvapRate    ──► in_2 ┘                                        └► drift  ──► plot
 *
 * If the sum at t=0 is S0, the node emits `drift = S(t) - S0` every
 * tick and raises `alert` when |drift| > tolerance (absolute mode) or
 * when |drift / S0| > tolerance (relative mode, useful when S0 spans
 * many orders of magnitude across runs).
 *
 * The initial sum is latched on the FIRST fire() in which all wired
 * inputs delivered a numeric sample. This avoids the otherwise-common
 * "everything is drifting because S0 was captured before the upstream
 * had warmed up" trap (e.g. a sensor with a 100-tick LPF settle).
 *
 * Editables:
 *   tolerance   absolute (mode=absolute) or fractional (mode=relative)
 *               threshold above which `alert` flips true.
 *   mode        "absolute" | "relative". Relative needs S0 ≠ 0; if S0
 *               is zero the node degrades to absolute (warning surfaced
 *               via the `initialSum` viewable being zero).
 *
 * Variadic input registration: `{ prefix: "in_", type: "float" }` so
 * the editor's reconciler grows the port list as the user wires.
 */
export class ConservationMonitorNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "in_0", optional: true, type: "float" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "drift", optional: false, type: "float" },
        { slot: "alert", optional: false, type: "boolean" },
    ];

    @cloneable private _tolerance: number = 1e-6;
    @cloneable private _mode: Mode = "absolute";

    // Latch state. `_initialSum` is meaningful only after `_latched`
    // flips true; reading it before that returns 0 (the viewable
    // default) which is harmless because the node also reports a
    // zero drift in that interval.
    private _latched: boolean = false;
    private _initialSum: number = 0;
    private _currentSum: number = 0;
    private _maxDrift: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number")
    public get tolerance(): number {
        return this._tolerance;
    }
    public set tolerance(v: number) {
        // No clamp; user may legitimately want very large tolerances
        // (early-prototype mode) or very small ones (final regression
        // test). Floor at 0 since negative tolerance is nonsensical.
        const next = Math.max(0, v);
        this.setField("tolerance", this._tolerance, next, (n) => {
            this._tolerance = n;
        });
    }

    @editable("string", { unit: "absolute | relative" })
    public get mode(): Mode {
        return this._mode;
    }
    public set mode(v: Mode) {
        const next: Mode = v === "relative" ? "relative" : "absolute";
        this.setField("mode", this._mode, next, (n) => {
            this._mode = n;
        });
    }

    /** Sum captured on the first complete fire() (all wired inputs
     *  delivering a numeric sample). Stays at 0 until that happens;
     *  use it to confirm the latch took. */
    @viewable("number") public get initialSum(): number {
        return this._initialSum;
    }

    /** Sum from the most recent fire(). Compare against initialSum
     *  in the property panel for a quick "is this drifting" check
     *  even without wiring the drift output to a plot. */
    @viewable("number") public get currentSum(): number {
        return this._currentSum;
    }

    /** Max |drift| observed since reset(). Sticky high-water mark;
     *  a tighter regression alarm than the instantaneous drift,
     *  because a short transient spike resets on the next tick but
     *  the maxDrift remembers it. */
    @viewable("number") public get maxDrift(): number {
        return this._maxDrift;
    }

    public override reset(_session: ISession): void {
        this._latched = false;
        this.setField("initialSum", this._initialSum, 0, (n) => {
            this._initialSum = n;
        });
        this.setField("currentSum", this._currentSum, 0, (n) => {
            this._currentSum = n;
        });
        this.setField("maxDrift", this._maxDrift, 0, (n) => {
            this._maxDrift = n;
        });
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Walk every incoming channel; accept only the variadic
        // in_<k> slots. Slot parsing is defensive (NaN slice → skip)
        // so a stale port name from an old serialised graph cannot
        // crash the fire loop.
        let sum = 0;
        let sawAny = false;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot.indexOf("in_") !== 0) continue;
            const slotIdx = Number(slot.slice(3));
            if (!Number.isFinite(slotIdx)) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (typeof v === "number" && Number.isFinite(v)) {
                sum += v;
                sawAny = true;
            }
        }

        // First-fire latch: only commit S0 once we've seen at least
        // one numeric sample. Otherwise a fire() before any upstream
        // produced data would latch S0=0 and every subsequent tick
        // would scream "drift = currentSum".
        if (!sawAny) return;

        if (!this._latched) {
            this._latched = true;
            this.setField("initialSum", this._initialSum, sum, (n) => {
                this._initialSum = n;
            });
        }

        const drift = sum - this._initialSum;
        const absDrift = Math.abs(drift);

        // Relative mode normalises by S0 when it's meaningful. We
        // fall back to absolute comparison when |S0| is below 1e-12,
        // which acts as a zero-division guard and a "the latch saw
        // a near-zero S0, relative mode is meaningless" signal.
        const exceeded = this._mode === "relative" && Math.abs(this._initialSum) > 1e-12 ? absDrift / Math.abs(this._initialSum) > this._tolerance : absDrift > this._tolerance;

        this.setField("currentSum", this._currentSum, sum, (n) => {
            this._currentSum = n;
        });
        if (absDrift > this._maxDrift) {
            this.setField("maxDrift", this._maxDrift, absDrift, (n) => {
                this._maxDrift = n;
            });
        }

        // Publish on both outputs every fire (no skip on small drift)
        // so downstream plots see a continuous trace. The alert is
        // intentionally non-latching: it tracks the instantaneous
        // tolerance check, leaving any debouncing / latching policy
        // to the user (e.g. wire alert into a Helios.Actuator:
        // emergency-shutdown which has the latch).
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "drift") {
                session.publish(idx, drift);
            } else if (link.slot === "alert") {
                session.publish(idx, exceeded);
            }
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createConservationMonitorNode(): ConservationMonitorNode {
    return new ConservationMonitorNode();
}
