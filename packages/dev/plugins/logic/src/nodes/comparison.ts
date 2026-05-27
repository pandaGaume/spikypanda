import {
    editable,
    viewable,
    cloneable,
    IOlink,
    IDeclaresPorts,
    IPortDescriptor,
    ISession,
    publishToFirstOutput,
    resolveSlotInputs,
    RuntimeNode,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Shared base for binary scalar comparisons (a ?? b → boolean).
 *
 * All six subclasses (Equal / NotEqual / Greater / Less / GreaterOrEqual /
 * LessOrEqual) share the same shape: two editable scalars + two
 * optional input ports + one boolean output. Only the predicate
 * differs, so it lives as an abstract hook.
 *
 * Design-time semantics (via LiveBinder): every write to `a` or `b`
 * fires onPropertyChanged, the downstream re-reads `result`, and the
 * predicate runs on the fresh inputs. No execution engine needed.
 *
 * Runtime semantics (via Scheduler.RunDynamic): fire() resolves any
 * wired input over the editable defaults and publishes the predicate
 * result on the first output.
 */
abstract class BinaryCompareNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable protected _a: number = 0;
    @cloneable protected _b: number = 0;

    public static readonly INPUT_A      = "a";
    public static readonly INPUT_B      = "b";
    public static readonly OUTPUT_RESULT = "result";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: BinaryCompareNode.INPUT_A, optional: true, type: "float" },
        { slot: BinaryCompareNode.INPUT_B, optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: BinaryCompareNode.OUTPUT_RESULT, optional: false, type: "boolean" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) {
        super(onsc, opsc, position);
    }

    @editable("number")
    public get a(): number { return this._a; }
    public set a(v: number) { this.setField("a", this._a, v, (n) => { this._a = n; }); }

    @editable("number")
    public get b(): number { return this._b; }
    public set b(v: number) { this.setField("b", this._b, v, (n) => { this._b = n; }); }

    @viewable("boolean")
    public get result(): boolean {
        return this._predicate(this._a, this._b);
    }

    protected abstract _predicate(a: number, b: number): boolean;

    public override fire(session: ISession, _t: number): void {
        const { a, b } = resolveSlotInputs(session, this, {
            [BinaryCompareNode.INPUT_A]: this._a,
            [BinaryCompareNode.INPUT_B]: this._b,
        }, { validator: (_slot, v) => typeof v === "number" });

        publishToFirstOutput(session, this, this._predicate(a, b));
    }
}

export class EqualNode          extends BinaryCompareNode { protected _predicate(a: number, b: number): boolean { return a === b; } }
export class NotEqualNode       extends BinaryCompareNode { protected _predicate(a: number, b: number): boolean { return a !== b; } }
export class GreaterNode        extends BinaryCompareNode { protected _predicate(a: number, b: number): boolean { return a >   b; } }
export class LessNode           extends BinaryCompareNode { protected _predicate(a: number, b: number): boolean { return a <   b; } }
export class GreaterOrEqualNode extends BinaryCompareNode { protected _predicate(a: number, b: number): boolean { return a >=  b; } }
export class LessOrEqualNode    extends BinaryCompareNode { protected _predicate(a: number, b: number): boolean { return a <=  b; } }
