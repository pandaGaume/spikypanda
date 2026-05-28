/**
 * Pure-struct 3D vector. Used in the scene payload instead of
 * spikypanda-core's `ICartesian3` because the latter extends the methodful
 * `ICartesian` interface (distance/subtract/...). Plain `{ x, y, z }`
 * JSON-friendly objects suffice here, and any `Cartesian3` instance
 * satisfies this shape structurally.
 */
export interface IVec3 {
    x: number;
    y: number;
    z: number;
}

/**
 * Structured environmental context shared by every physical object in a
 * given world. The payload is what flows on a `scene` cable from a
 * `SceneNode` down to any TransformNode-derived consumer (motors,
 * sensors, future rigid bodies).
 *
 * Field set is intentionally small for V1; extending it is a
 * non-breaking change as long as we keep adding optional-with-default
 * accessors on TransformNode. Inspiration:
 *   - UE5    : WorldSettings.GravityZ, TimeDilation, atmosphere subsystems
 *   - Unity  : Physics.gravity, RenderSettings
 *   - Bullet : btDynamicsWorld.setGravity / setGravityForce
 *
 * Units are SI throughout. Z is "up" by convention (gravity points
 * along -Z at Earth surface), matching engineering / robotics ground
 * frames where the floor plane is X-Y and altitude is +Z:
 *   gravity      [m/s²]  body-frame gravity acceleration vector
 *                        (typical Earth surface: [0, 0, -9.81])
 *   temperature  [K]     ambient temperature
 *                        (typical lab default: 293.15 ≈ 20 °C)
 *   pressure     [Pa]    ambient atmospheric pressure
 *                        (typical sea level: 101325)
 *   timeScale    [-]     wall-clock-to-sim-time multiplier
 *                        (mirror of UE5 WorldSettings.TimeDilation)
 */
export interface IScene {
    gravity: IVec3;
    temperature: number;
    pressure: number;
    timeScale: number;
}

/**
 * Frozen Earth-surface reference scene. Used as the fallback when no
 * `scene` input is wired on a TransformNode, so unwired graphs still
 * have sensible physics defaults instead of zero gravity at 0 K.
 *
 * Frozen at every level to prevent a subtle bug where a consumer
 * accidentally mutates the default (e.g. `scene.gravity.y *= 2`) and
 * poisons every other consumer in the session.
 */
export const DEFAULT_SCENE: IScene = Object.freeze({
    gravity: Object.freeze({ x: 0, y: 0, z: -9.81 }) as IVec3,
    temperature: 293.15,
    pressure: 101325,
    timeScale: 1.0,
});

/**
 * Lightweight structural guard. Accepts duck-typed objects with the
 * four required fields of the right shape/type; matches both
 * `DEFAULT_SCENE` and the output of `SceneNode.fire()`.
 *
 * The gravity sub-object is checked structurally too (just x/y/z must
 * be finite numbers) so Cartesian3 instances and plain JSON objects
 * both qualify.
 */
export function isScene(v: unknown): v is IScene {
    if (!v || typeof v !== "object") return false;
    const o = v as Partial<IScene>;
    if (typeof o.temperature !== "number") return false;
    if (typeof o.pressure !== "number") return false;
    if (typeof o.timeScale !== "number") return false;
    const g = o.gravity;
    if (!g || typeof g !== "object") return false;
    if (typeof (g as IVec3).x !== "number") return false;
    if (typeof (g as IVec3).y !== "number") return false;
    if (typeof (g as IVec3).z !== "number") return false;
    return true;
}

/** Slot name carried by the cable on every TransformNode and SceneNode. */
export const SCENE_SLOT = "scene";
