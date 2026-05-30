import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Deterministic pseudo-random scalar source (Mulberry32).
 *
 * Helios sims need reproducible randomness for two reasons:
 *   - Regression tests: a failing trajectory must be re-runnable bit
 *     for bit, otherwise debugging a "the agent shut the loop down
 *     after 4000 ticks" event is impossible. Math.random() destroys
 *     that property because it's reseeded by the JS engine on every
 *     page load.
 *   - Monte-Carlo sweeps: running N realisations of the same scenario
 *     with `seed = base + i` produces N independent trajectories that
 *     a single human can also replay by hand.
 *
 * Mulberry32 was picked over xorshift / sfc32 / Math.random because it
 * is a 5-line uint32 algorithm with a known 2^32 period, no large state
 * to (de)serialise, and a well-documented seed-injectivity property:
 * the seed maps 1:1 onto a distinct stream prefix. That's good enough
 * for ECLSS-scale stochastic perturbations; we are not doing crypto.
 *
 * Editables:
 *   seed   integer used to seed the PRNG. Updating it mid-run forces
 *          an immediate stream-reset so the next fire() draws from
 *          the new sequence (handy for live A/B comparisons in the
 *          editor without restarting the graph).
 *
 * Outputs `value` on every fire(); a wire to `Logic.Math:multiply` or
 * a clamp turns this into uniform[a, b].
 */
export class RngSeedNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "value", optional: false, type: "float" }];

    @cloneable private _seed: number = 42;

    // Internal PRNG state. uint32 kept as a JS number; the >>> 0 in
    // _next() coerces back to uint32 after each step, so we never
    // accumulate float-mantissa drift across the 2^32 period.
    private _state: number = 0;
    private _lastValue: number = 0;
    private _tickCount: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
        this._state = this._seed >>> 0;
    }

    @editable("number")
    public get seed(): number {
        return this._seed;
    }
    public set seed(v: number) {
        const next = Math.floor(v) | 0;
        this.setField("seed", this._seed, next, (n) => {
            this._seed = n;
            // Re-seed immediately. Without this, a user editing the
            // seed mid-run would still see the previous stream (the
            // editable only takes effect on next reset()), which is
            // a frustrating UX for the A/B-comparison use case.
            this._state = n >>> 0;
        });
    }

    /** Last drawn value in [0, 1). Surface in the property panel
     *  for a quick "is this RNG ticking" check. */
    @viewable("number") public get lastValue(): number {
        return this._lastValue;
    }

    /** Number of fire() calls since last reset(). Doubles as a sanity
     *  check that the node is scheduled. */
    @viewable("number") public get tickCount(): number {
        return this._tickCount;
    }

    public override reset(_session: ISession): void {
        this._state = this._seed >>> 0;
        this._lastValue = 0;
        this.setField("tickCount", this._tickCount, 0, (n) => {
            this._tickCount = n;
        });
    }

    public override fire(session: ISession, _t: number): void {
        const v = this._next();
        this._lastValue = v;
        this.setField("tickCount", this._tickCount, this._tickCount + 1, (n) => {
            this._tickCount = n;
        });

        // Plain loop (not publishToFirstOutput) so the slot identity
        // stays explicit and the node can later grow a second output
        // (e.g. an `int` companion) without rewriting the publish path.
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "value" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, v);
        }
    }

    /** Mulberry32 step. Advances `_state` and returns a float in [0, 1).
     *  Standard implementation, kept here so the node has no external
     *  PRNG dependency (the whole point of the deterministic stream is
     *  that the algorithm itself cannot change between releases). */
    private _next(): number {
        let t = (this._state = (this._state + 0x6d2b79f5) >>> 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createRngSeedNode(): RngSeedNode {
    return new RngSeedNode();
}
