import { editable, viewable, cloneable, IOlink, IDeclaresPorts, IPortDescriptor, ISession, RuntimeNode, publishToFirstOutput, resolveSlotInputs } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Conditional pass-through. UE5-Blueprint equivalent of the "Select"
 * macro: emits `a` when `condition` is true, otherwise emits `b`.
 *
 * Inputs are typed `any` so the same node works for floats, vectors,
 * arrays, strings or anything else flowing through the graph; the
 * boolean `condition` decides which one is forwarded. Pair with
 * `GreaterOrEqual(elapsed, duration)` to flip from a ramp value to a
 * user-controlled value once the ramp completes.
 *
 * `condition` is also editable so the user can set the initial mode
 * from the property panel without wiring anything; once a wire arrives
 * the runtime input wins via `resolveSlotInputs`.
 *
 * `result` is exposed as a `@viewable` getter that recomputes on read,
 * so the design-time LiveBinder propagates the selected value to
 * downstream nodes the moment `a`, `b`, or `condition` changes
 * upstream.
 */
export class SelectNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _a: unknown = undefined;
    @cloneable private _b: unknown = undefined;
    @cloneable private _condition: boolean = false;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "a", optional: true, type: "any" },
        { slot: "b", optional: true, type: "any" },
        { slot: "condition", optional: true, type: "boolean" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "result", optional: false, type: "any" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // a / b are property-only (no @editable) because the value can be
    // anything — there is no generic editor for `any`. They still need
    // public setters so the LiveBinder can mirror upstream values into
    // the runtime instance on connection-changed events.
    public get a(): unknown {
        return this._a;
    }
    public set a(v: unknown) {
        this.setField("a", this._a, v, (x) => {
            this._a = x;
        });
    }

    public get b(): unknown {
        return this._b;
    }
    public set b(v: unknown) {
        this.setField("b", this._b, v, (x) => {
            this._b = x;
        });
    }

    @editable("boolean")
    public get condition(): boolean {
        return this._condition;
    }
    public set condition(v: boolean) {
        this.setField("condition", this._condition, v, (x) => {
            this._condition = x;
        });
    }

    @viewable("any")
    public get result(): unknown {
        return this._condition ? this._a : this._b;
    }

    public override fire(session: ISession, _t: number): void {
        const { a, b, condition } = resolveSlotInputs(session, this, {
            a: this._a,
            b: this._b,
            condition: this._condition,
        });
        publishToFirstOutput(session, this, condition ? a : b);
    }
}
