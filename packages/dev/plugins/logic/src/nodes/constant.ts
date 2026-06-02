import { editable, cloneable, IOlink, IDeclaresPorts, IPortDescriptor, ISession, IChannel, RuntimeNode } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Number Constant — pure scalar source whose value is set via direct
 * keyboard entry in the property panel (an `@editable("number")` field,
 * NOT a slider). Right tool when you need an exact numeric value rather
 * than a draggable bounded knob:
 *
 *   - fixed dt sources for closed-loop control sims (e.g. dt = 1e-4 s
 *     broadcast to PI, Motor.Dynamic, Tachymeter — slider would force
 *     bounded range + step UX that fights very small magnitudes);
 *   - reference setpoints (omega_ref, V_ref);
 *   - tuning constants pinned at design time;
 *   - debugging probes wired to multiple consumers.
 *
 * Publishes `value` on every fire so downstream sees live edits in Play
 * mode. Use NumberSliderNode instead when you want a bounded slider UI.
 */
export class NumberConstantNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _value: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "value", optional: false, type: "float" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number")
    public get value(): number {
        return this._value;
    }
    public set value(v: number) {
        this.setField("value", this._value, v, (n) => {
            this._value = n;
        });
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
}
