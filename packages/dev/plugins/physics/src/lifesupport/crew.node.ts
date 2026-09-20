import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * `Physics.LifeSupport:crew`: the CO2 source of a cabin, a group of
 * people at one activity level.
 *
 * Physical thesis: a person exhales CO2 at a rate that follows the
 * metabolic level (roughly 1 kg per day at rest, two to three times more
 * under exercise). In a sealed, well-mixed volume that mass rate becomes a
 * concentration rate, ppm per minute, once divided by the cabin volume.
 * This node takes the rates ALREADY expressed in ppm per minute per
 * person for the cabin it lives in (the reference model of the CO2
 * control sample folds the volume into them), and multiplies by the head
 * count:
 *
 *     co2Emission = count * emissionPerPerson[activity]        [ppm/min]
 *
 * Several groups at different activities (two asleep, two exercising)
 * are several Crew nodes wired into the cabin's `emissionA..D` inputs.
 *
 * Every rate is an editable so the assumption is visible and reviewable
 * in the property panel and in the saved document; the demo's parameter
 * file sets them at instantiation.
 *
 * Inputs are signals: `count` and `activity` may be driven by a timeline
 * (the crew schedule of a scenario); when a port is not wired the
 * editable of the same name is used. `activity` accepts the name
 * ("sleep", "rest", "light_work", "heavy_work") or the index (0 to 3).
 */
export const CREW_ACTIVITIES = ["sleep", "rest", "light_work", "heavy_work"] as const;
export type CrewActivity = (typeof CREW_ACTIVITIES)[number];

export class CrewNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _emissionSleep: number = 2.0;
    @cloneable private _emissionRest: number = 3.5;
    @cloneable private _emissionLightWork: number = 5.5;
    @cloneable private _emissionHeavyWork: number = 7.0;
    @cloneable private _count: number = 4;
    @cloneable private _activity: CrewActivity = "sleep";
    @cloneable private _co2Emission: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "count", optional: true, type: "float", kind: "signal" },
        { slot: "activity", optional: true, type: "any", kind: "signal" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "co2Emission", optional: false, type: "float", kind: "signal" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get emissionSleepPpmPerMinute(): number {
        return this._emissionSleep;
    }
    public set emissionSleepPpmPerMinute(v: number) {
        this.setField("emissionSleepPpmPerMinute", this._emissionSleep, Math.max(0, v), (n) => (this._emissionSleep = n));
    }
    @editable("number") public get emissionRestPpmPerMinute(): number {
        return this._emissionRest;
    }
    public set emissionRestPpmPerMinute(v: number) {
        this.setField("emissionRestPpmPerMinute", this._emissionRest, Math.max(0, v), (n) => (this._emissionRest = n));
    }
    @editable("number") public get emissionLightWorkPpmPerMinute(): number {
        return this._emissionLightWork;
    }
    public set emissionLightWorkPpmPerMinute(v: number) {
        this.setField("emissionLightWorkPpmPerMinute", this._emissionLightWork, Math.max(0, v), (n) => (this._emissionLightWork = n));
    }
    @editable("number") public get emissionHeavyWorkPpmPerMinute(): number {
        return this._emissionHeavyWork;
    }
    public set emissionHeavyWorkPpmPerMinute(v: number) {
        this.setField("emissionHeavyWorkPpmPerMinute", this._emissionHeavyWork, Math.max(0, v), (n) => (this._emissionHeavyWork = n));
    }
    /** Head count of this group, used when the `count` input is not wired. */
    @editable("number") public get count(): number {
        return this._count;
    }
    public set count(v: number) {
        this.setField("count", this._count, Math.max(0, v), (n) => (this._count = n));
    }
    /** Activity of this group, used when the `activity` input is not wired. */
    @editable("string", { enum: [...CREW_ACTIVITIES] }) public get activity(): CrewActivity {
        return this._activity;
    }
    public set activity(v: CrewActivity) {
        const next = CrewNode.toActivity(v);
        if (next === undefined) return;
        this.setField("activity", this._activity, next, (n) => (this._activity = n));
    }

    /** The emission this group produced on the last tick, in ppm per minute. */
    @viewable("number") public get co2Emission(): number {
        return this._co2Emission;
    }

    /** Emission per person at an activity, in ppm per minute. */
    public emissionPerPerson(activity: CrewActivity): number {
        switch (activity) {
            case "sleep":
                return this._emissionSleep;
            case "rest":
                return this._emissionRest;
            case "light_work":
                return this._emissionLightWork;
            case "heavy_work":
                return this._emissionHeavyWork;
        }
    }

    /** Accepts the activity name or its index (0 to 3); anything else is undefined. */
    public static toActivity(value: unknown): CrewActivity | undefined {
        if (typeof value === "number" && Number.isFinite(value)) {
            const i = Math.round(value);
            return i >= 0 && i < CREW_ACTIVITIES.length ? CREW_ACTIVITIES[i] : undefined;
        }
        if (typeof value === "string") return (CREW_ACTIVITIES as ReadonlyArray<string>).includes(value) ? (value as CrewActivity) : undefined;
        return undefined;
    }

    public override reset(_session: ISession): void {
        this._co2Emission = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let count = this._count;
        let activity = this._activity;
        // Signal inputs: read the latest value, never drained; an unwired
        // or not yet published input leaves the editable in charge.
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            const value = session.readSignal(idx);
            if (slot === "count" && typeof value === "number" && Number.isFinite(value)) count = Math.max(0, value);
            else if (slot === "activity") {
                const a = CrewNode.toActivity(value);
                if (a !== undefined) activity = a;
            }
        }
        const emission = count * this.emissionPerPerson(activity);
        this.setField("co2Emission", this._co2Emission, emission, (n) => (this._co2Emission = n));
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "co2Emission" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, emission);
        }
    }
}

export function createCrewNode(): CrewNode {
    return new CrewNode();
}
