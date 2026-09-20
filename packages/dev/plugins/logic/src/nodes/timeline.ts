import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * `Logic.Time:timeline`: a piecewise-constant source. A list of segments,
 * each with a start, an end and a value; on every tick the node publishes
 * the value of the segment that contains the session time, on its `value`
 * output. The schedule of a scenario (who is asleep, who is exercising,
 * from which minute to which) is one timeline per driven quantity.
 *
 * Segments are edited as JSON, so a saved document carries the schedule
 * in the open:
 *
 *     [{ "from": 0, "to": 12000, "value": 4 }, { "from": 12000, "to": 15600, "value": 2 }]
 *
 * Times are session seconds (`t` of `Session.run`). Values may be numbers
 * or strings (an activity name); the port is typed `any`. Outside every
 * segment the node publishes `defaultValue`. Segments must not overlap;
 * the setter refuses a list that does, naming the pair, and keeps the
 * previous list.
 */
export interface ITimelineSegment {
    readonly from: number;
    readonly to: number;
    readonly value: number | string;
}

export class TimelineNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _segmentsJson: string = "[]";
    @cloneable private _defaultValue: number = 0;
    @cloneable private _value: number | string = 0;
    private _segments: ReadonlyArray<ITimelineSegment> = [];

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "value", optional: false, type: "any" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** The segments, as a JSON array of `{ from, to, value }` in session seconds. */
    @editable("string") public get segments(): string {
        return this._segmentsJson;
    }
    public set segments(json: string) {
        const parsed = TimelineNode.parseSegments(json);
        this.setField("segments", this._segmentsJson, json, (n) => {
            this._segmentsJson = n;
            this._segments = parsed;
        });
    }
    /** Published outside every segment. */
    @editable("number") public get defaultValue(): number {
        return this._defaultValue;
    }
    public set defaultValue(v: number) {
        this.setField("defaultValue", this._defaultValue, v, (n) => (this._defaultValue = n));
    }

    /** The value published on the last tick. */
    @viewable("string") public get value(): string {
        return String(this._value);
    }

    /** The parsed segments (sorted by start). */
    public get segmentList(): ReadonlyArray<ITimelineSegment> {
        return this._segments;
    }

    /** Sets the segments from objects rather than JSON (the builders' path). */
    public setSegments(segments: ReadonlyArray<ITimelineSegment>): void {
        this.segments = JSON.stringify(segments);
    }

    /** The value at a time, with this node's segments. */
    public valueAt(t: number): number | string {
        for (const s of this._segments) {
            if (t >= s.from && t < s.to) return s.value;
        }
        return this._defaultValue;
    }

    public static parseSegments(json: string): ReadonlyArray<ITimelineSegment> {
        let raw: unknown;
        try {
            raw = JSON.parse(json);
        } catch (e) {
            throw new Error(`timeline: segments are not JSON: ${(e as Error).message}`);
        }
        if (!Array.isArray(raw)) throw new Error("timeline: segments must be a JSON array");
        const out: ITimelineSegment[] = raw.map((s, i) => {
            const seg = s as Record<string, unknown>;
            const from = seg?.from,
                to = seg?.to,
                value = seg?.value;
            if (typeof from !== "number" || typeof to !== "number" || !Number.isFinite(from) || !Number.isFinite(to))
                throw new Error(`timeline: segments[${i}].from and .to must be finite numbers`);
            if (to <= from) throw new Error(`timeline: segments[${i}] must end after it starts (from ${from}, to ${to})`);
            if (typeof value !== "number" && typeof value !== "string") throw new Error(`timeline: segments[${i}].value must be a number or a string`);
            return { from, to, value };
        });
        out.sort((a, b) => a.from - b.from);
        for (let i = 1; i < out.length; i++) {
            if (out[i].from < out[i - 1].to) throw new Error(`timeline: segments overlap between [${out[i - 1].from}, ${out[i - 1].to}) and [${out[i].from}, ${out[i].to})`);
        }
        return out;
    }

    /** Restores the parsed list after a document load (the JSON field is the saved state). */
    public override deserialize(blob: unknown): void {
        super.deserialize(blob);
        this._segments = TimelineNode.parseSegments(this._segmentsJson);
    }

    public override reset(_session: ISession): void {
        this._value = this._defaultValue;
    }

    public override fire(session: ISession, t: number): void {
        const value = this.valueAt(t);
        this.setField("value", this._value, value, (n) => (this._value = n));
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "value" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, value);
        }
    }
}

export function createTimelineNode(): TimelineNode {
    return new TimelineNode();
}
