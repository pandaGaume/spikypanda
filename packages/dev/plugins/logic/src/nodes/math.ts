import {
    editable,
    viewable,
    cloneable,
    IOlink,
    IDeclaresPorts,
    IPortDescriptor,
    ISession,
    RuntimeNode,
    publishToFirstOutput,
    resolveSlotInputs,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Scalar math node family.
 *
 * Three shared bases keep the per-node boilerplate trivial:
 *   - BinaryMathNode   a, b → result    (Add, Sub, Mul, Div, Mod, Min, Max, Pow)
 *   - UnaryMathNode    a → result       (Negate, Abs, Floor, Ceil, Round, Sqrt, Sin, Cos)
 *   - Custom 3-arg     specific naming  (Clamp{value,min,max}, Lerp{a,b,t})
 *
 * Each base provides:
 *   - editable defaults so unwired inputs still have meaningful values
 *   - a `@viewable result` getter that recomputes on read, so the
 *     LiveBinder propagates downstream the moment any input changes
 *   - a `fire(session, t)` that resolves wired inputs over editables and
 *     publishes through the first output channel
 *
 * Number-vs-anything: inputs are typed `"float"`; non-number values are
 * silently rejected by the resolver's validator and the editable
 * default takes over for that slot. That mirrors how `Branch.condition`
 * tolerates a mistyped upstream wire.
 */

// ── Binary base ──────────────────────────────────────────────────────

abstract class BinaryMathNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable protected _a: number = 0;
    @cloneable protected _b: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "a", optional: true, type: "float" },
        { slot: "b", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "result", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get a(): number { return this._a; }
    public set a(v: number) { this.setField("a", this._a, v, (n) => { this._a = n; }); }

    @editable("number")
    public get b(): number { return this._b; }
    public set b(v: number) { this.setField("b", this._b, v, (n) => { this._b = n; }); }

    @viewable("number")
    public get result(): number { return this._compute(this._a, this._b); }

    protected abstract _compute(a: number, b: number): number;

    public override fire(session: ISession, _t: number): void {
        const { a, b } = resolveSlotInputs(session, this, {
            a: this._a,
            b: this._b,
        }, { validator: (_slot, v) => typeof v === "number" });
        publishToFirstOutput(session, this, this._compute(a, b));
    }
}

export class AddNode      extends BinaryMathNode { protected _compute(a: number, b: number): number { return a + b; } }
export class SubtractNode extends BinaryMathNode { protected _compute(a: number, b: number): number { return a - b; } }
export class MultiplyNode extends BinaryMathNode { protected _compute(a: number, b: number): number { return a * b; } }
export class DivideNode   extends BinaryMathNode { protected _compute(a: number, b: number): number { return b !== 0 ? a / b : 0; } }
export class ModNode      extends BinaryMathNode { protected _compute(a: number, b: number): number { return b !== 0 ? a % b : 0; } }
export class MinNode      extends BinaryMathNode { protected _compute(a: number, b: number): number { return Math.min(a, b); } }
export class MaxNode      extends BinaryMathNode { protected _compute(a: number, b: number): number { return Math.max(a, b); } }
export class PowNode      extends BinaryMathNode { protected _compute(a: number, b: number): number { return Math.pow(a, b); } }

// ── Unary base ───────────────────────────────────────────────────────

abstract class UnaryMathNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable protected _a: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "a", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "result", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get a(): number { return this._a; }
    public set a(v: number) { this.setField("a", this._a, v, (n) => { this._a = n; }); }

    @viewable("number")
    public get result(): number { return this._compute(this._a); }

    protected abstract _compute(a: number): number;

    public override fire(session: ISession, _t: number): void {
        const { a } = resolveSlotInputs(session, this, {
            a: this._a,
        }, { validator: (_slot, v) => typeof v === "number" });
        publishToFirstOutput(session, this, this._compute(a));
    }
}

export class NegateNode extends UnaryMathNode { protected _compute(a: number): number { return -a; } }
export class AbsNode    extends UnaryMathNode { protected _compute(a: number): number { return Math.abs(a); } }
export class FloorNode  extends UnaryMathNode { protected _compute(a: number): number { return Math.floor(a); } }
export class CeilNode   extends UnaryMathNode { protected _compute(a: number): number { return Math.ceil(a); } }
export class RoundNode  extends UnaryMathNode { protected _compute(a: number): number { return Math.round(a); } }
export class SqrtNode   extends UnaryMathNode { protected _compute(a: number): number { return Math.sqrt(a); } }
export class SinNode    extends UnaryMathNode { protected _compute(a: number): number { return Math.sin(a); } }
export class CosNode    extends UnaryMathNode { protected _compute(a: number): number { return Math.cos(a); } }

// ── Clamp ────────────────────────────────────────────────────────────

export class ClampNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _value: number = 0;
    @cloneable private _min:   number = 0;
    @cloneable private _max:   number = 1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "value", optional: true, type: "float" },
        { slot: "min",   optional: true, type: "float" },
        { slot: "max",   optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "result", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get value(): number { return this._value; }
    public set value(v: number) { this.setField("value", this._value, v, (n) => { this._value = n; }); }

    @editable("number")
    public get min(): number { return this._min; }
    public set min(v: number) { this.setField("min", this._min, v, (n) => { this._min = n; }); }

    @editable("number")
    public get max(): number { return this._max; }
    public set max(v: number) { this.setField("max", this._max, v, (n) => { this._max = n; }); }

    @viewable("number")
    public get result(): number {
        return Math.max(this._min, Math.min(this._max, this._value));
    }

    public override fire(session: ISession, _t: number): void {
        const { value, min, max } = resolveSlotInputs(session, this, {
            value: this._value,
            min:   this._min,
            max:   this._max,
        }, { validator: (_slot, v) => typeof v === "number" });
        publishToFirstOutput(session, this, Math.max(min, Math.min(max, value)));
    }
}

// ── Lerp ─────────────────────────────────────────────────────────────

export class LerpNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _a: number = 0;
    @cloneable private _b: number = 1;
    @cloneable private _t: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "a", optional: true, type: "float" },
        { slot: "b", optional: true, type: "float" },
        { slot: "t", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "result", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get a(): number { return this._a; }
    public set a(v: number) { this.setField("a", this._a, v, (n) => { this._a = n; }); }

    @editable("number")
    public get b(): number { return this._b; }
    public set b(v: number) { this.setField("b", this._b, v, (n) => { this._b = n; }); }

    @editable("number")
    public get t(): number { return this._t; }
    public set t(v: number) { this.setField("t", this._t, v, (n) => { this._t = n; }); }

    @viewable("number")
    public get result(): number {
        return this._a + (this._b - this._a) * this._t;
    }

    public override fire(session: ISession, _t: number): void {
        const { a, b, t } = resolveSlotInputs(session, this, {
            a: this._a,
            b: this._b,
            t: this._t,
        }, { validator: (_slot, v) => typeof v === "number" });
        publishToFirstOutput(session, this, a + (b - a) * t);
    }
}
