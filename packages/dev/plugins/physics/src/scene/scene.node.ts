import { Cartesian3, cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import { DEFAULT_SCENE, SCENE_SLOT } from "../transform/scene.js";
import type { IScene, IVec3 } from "../transform/scene.js";

/**
 * Environmental context broadcaster. Each tick, assembles an `IScene`
 * payload from its editable defaults — optionally overridden per-field
 * by a wired input — and publishes it on the `scene` output port to
 * every TransformNode-derived consumer wired to it.
 *
 * Inputs (all optional, when unwired the editable is used):
 *   gravity      [m/s²]  vec3 gravity acceleration vector
 *   temperature  [K]     ambient temperature
 *   pressure     [Pa]    ambient pressure
 *   time_scale   [-]     wall-clock-to-sim-time multiplier
 *
 * Output:
 *   scene        IScene struct (consumed via TransformNode.getScene())
 *
 * Default values mirror DEFAULT_SCENE (Earth surface at 20 °C, sea
 * level). The editables are independently overrideable so the user can
 * stage a Mars run (-3.72 m/s² in y, 210 K, 600 Pa) without rewiring.
 *
 * Multiple Scene nodes can coexist in a graph (e.g. for A/B comparisons
 * of two distinct environments) — each downstream TransformNode wires
 * to exactly one Scene at a time. This matches the explicit attach
 * model documented in the architecture decision (see Physics.Scene
 * sub-plugin README).
 */
export class SceneNode extends RuntimeNode implements IDeclaresPorts {
    // Editable env defaults; mirror DEFAULT_SCENE on construction.
    @cloneable private _gravity: Cartesian3 = new Cartesian3(DEFAULT_SCENE.gravity.x, DEFAULT_SCENE.gravity.y, DEFAULT_SCENE.gravity.z);
    @cloneable private _temperature: number = DEFAULT_SCENE.temperature;
    @cloneable private _pressure: number = DEFAULT_SCENE.pressure;
    @cloneable private _timeScale: number = DEFAULT_SCENE.timeScale;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "gravity", optional: true, type: "vec3" },
        { slot: "temperature", optional: true, type: "float" },
        { slot: "pressure", optional: true, type: "float" },
        { slot: "time_scale", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: SCENE_SLOT, optional: false, type: "any" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("vector3", { layout: "block", alignement: "horizontal", unit: "m/s²" })
    public get gravity(): Cartesian3 {
        return this._gravity;
    }
    public set gravity(v: Cartesian3) {
        this.setField("gravity", this._gravity, v, (n) => {
            this._gravity = n;
        });
    }

    @editable("number", { unit: "K" })
    public get temperature(): number {
        return this._temperature;
    }
    public set temperature(v: number) {
        this.setField("temperature", this._temperature, v, (n) => {
            this._temperature = n;
        });
    }

    @editable("number", { unit: "Pa" })
    public get pressure(): number {
        return this._pressure;
    }
    public set pressure(v: number) {
        this.setField("pressure", this._pressure, v, (n) => {
            this._pressure = n;
        });
    }

    @editable("number", { unit: "×" })
    public get timeScale(): number {
        return this._timeScale;
    }
    public set timeScale(v: number) {
        this.setField("timeScale", this._timeScale, v, (n) => {
            this._timeScale = n;
        });
    }

    /** Read-only mirrors for the property panel. */
    @viewable("vector3") public get last_gravity(): IVec3 {
        return this._gravity;
    }
    @viewable("number") public get last_temperature(): number {
        return this._temperature;
    }
    @viewable("number") public get last_pressure(): number {
        return this._pressure;
    }
    @viewable("number") public get last_time_scale(): number {
        return this._timeScale;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let gravity: IVec3 = this._gravity;
        let temperature: number = this._temperature;
        let pressure: number = this._pressure;
        let timeScale: number = this._timeScale;

        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (slot === "gravity") {
                if (isVec3Like(value)) gravity = value;
            } else if (typeof value === "number") {
                if (slot === "temperature") temperature = value;
                else if (slot === "pressure") pressure = value;
                else if (slot === "time_scale") timeScale = value;
            }
        }

        // Build the IScene payload. We hand out a plain object (not the
        // Cartesian3 reference) so consumers can't mutate our internal
        // gravity field by accident. Frozen as a parallel safety net.
        const scene: IScene = Object.freeze({
            gravity: Object.freeze({ x: gravity.x, y: gravity.y, z: gravity.z }) as IVec3,
            temperature,
            pressure,
            timeScale,
        });

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== SCENE_SLOT || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, scene);
        }
    }
}

/** Structural vec3 guard: any `{ x, y, z }` of finite numbers passes. */
function isVec3Like(v: unknown): v is IVec3 {
    if (!v || typeof v !== "object") return false;
    const o = v as Partial<IVec3>;
    return typeof o.x === "number" && typeof o.y === "number" && typeof o.z === "number";
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createSceneNode(): SceneNode {
    return new SceneNode();
}
