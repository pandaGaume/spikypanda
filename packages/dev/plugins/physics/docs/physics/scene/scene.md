# Scene

`Physics.Scene:scene` (plus presets `:earth`, `:moon`, `:mars`, `:orbital`, `:iss-cabin`)

Descriptive carrier for a simulation domain's environment: gravity, temperature, pressure, time scale, local 3D transform, references to solvers / atmosphere / shared nodes. Unlike most palette entries, `SceneItem` is a **GraphItem, not a RuntimeNode** — it never fires during the dispatch loop. The runtime reads it once at session bind and builds a live `SceneStateView` that consumers (motors, sensors, gates, atmospheres) read through `session.sceneStateView`.

A scene wires to one or more `Sim.Graph:graph` containers via the dashed `scene_out` → `scene_in` config-link (the dashed style marks any binding that resolves at bind time rather than carrying a payload per tick).

## Model

```
[SceneItem]                         (Quantity-typed editables)
  ├─ gravity        m/s²            (ICartesian3)
  ├─ temperature    K               (Temperature Quantity, accepts K / °C / °F via temperatureQ)
  ├─ pressure       Pa              (Pressure Quantity, accepts Pa / kPa / atm / bar / torr / psi / hPa / mbar / MPa via pressureQ)
  ├─ timeScale      –               (dimensionless multiplier, mirror of UE5 WorldSettings.TimeDilation)
  ├─ local{Position,Rotation,Scale} (3D transform, relative to parent in scene tree)
  ├─ manualHz       Hz              (Frequency Quantity; 0 = auto-derive from owned leaves)
  └─ isPrimary      bool            (root-canvas convention: when several Scenes coexist, the primary one drives the runner)
```

At session bind, `SceneItem.buildStateView(resolver)` produces a `SceneStateView` whose getters re-read the SceneItem's storage on every consumer access. Editing a value in the property panel propagates to consumers on the very next tick without rebuild.

## Anchors (editor-only config-links)

| Direction | Anchor | Type | Notes |
|---|---|---|---|
| out | `scene_out` | scene | Dashed config-link to any `Sim.Graph:graph` that uses this scene as its sim domain. |
| in | `atmosphere_in` | atmosphere | Single-slot reference to one `Physics.Scene:atmosphere-state`. The `SceneStateView.atmosphere` getter exposes this for gates and proxies. |
| in (variadic) | `solver_in_<k>` | solver | One or more `Control.Sim:rk4-solver` (or future Rosenbrock / Euler) nodes. The Sim.Graph reads this list at reset and attaches each ISolverHandle to its inner session. |
| in (variadic) | `shared_in_<k>` | shared | Generic shared-resource pool. Inside every Sim.Graph that consumes this scene, the editor auto-generates a proxy node per shared entry (P5b mechanism). |

These anchors render as **dashed cables** in the canvas to distinguish them from the solid runtime cables. The compatibility rule in `arePortTypesCompatible` refuses any wildcard `any ↔ config-link` drop so the editor silently rejects nonsense wirings.

## Parameters

| Name | Quantity / Unit | Default | Meaning |
|---|---|---|---|
| `gravity` | ICartesian3 (m/s²) | `(0, 0, -9.81)` | Body-frame gravity acceleration vector. Z-up convention (engineering / robotics). |
| `temperature` / `temperatureQ` | Temperature (K) | 293.15 K (20 °C) | Ambient temperature consumed by motors, atmospheres, and gates. Static for V1; dynamic temperature source via wired publisher deferred. |
| `pressure` / `pressureQ` | Pressure (Pa) | 101325 Pa (1 atm) | Ambient pressure. Used by gates' ideal-gas conversions and by future thermodynamic nodes. |
| `timeScale` | number | 1.0 | Sim-to-wall-time multiplier. |
| `localPosition` / `localRotation` / `localScale` | ICartesian3 / Quaternion / ICartesian3 | identity | Local 3D transform relative to parent in the scene tree. `worldTransform` chains automatically through enclosing Sim.Graph wiring. |
| `manualHz` / `manualHzQ` | Frequency (Hz) | 0 | When > 0, pins the effective sample rate. When 0, the rate is derived from owned `IIntegrable` leaves' `requiredHz` (P8 — currently V1 floor 60 Hz). |
| `isPrimary` | bool | false | At root canvas: marks the scene the GraphRunner uses when several Scenes coexist. Auto-elected when only one Scene is present. |

## Presets

| typeId | Gravity (z) | T | P | Atmosphere preset |
|---|---|---|---|---|
| `Physics.Scene:earth` | -9.81 | 293.15 K (20 °C) | 101325 Pa (1 atm) | `earthHumidAirSeaLevel` |
| `Physics.Scene:moon` | -1.625 | 250 K | 0 Pa | `vacuum` |
| `Physics.Scene:mars` | -3.721 | 210 K | 600 Pa | `marsAtmosphereMean` |
| `Physics.Scene:orbital` | 0 | 278.6 K | 0 Pa | `vacuum` |
| `Physics.Scene:iss-cabin` | 0 | 294.15 K (21 °C) | 101325 Pa | `issCabinECLSS` |

The `atmosphere` reference on each preset is **metadata** — it does NOT auto-spawn an `AtmosphereStateNode`. The editor uses it to pre-fill the `initialAtmosphere` field on any atmosphere-state node the user drops alongside the scene.

## Wiring-aware panel

When a per-property input port is wired (e.g. a publisher feeding `gravity_in`), the corresponding editable on the Scene's property panel renders in a **read-only / dimmed** style: typing in the dimmed field has no effect because the live value comes from the wire. The unwired editables stay live, as do the property's `is_X_wired` viewables that drive the dim state.

The convention is generic: any node can declare `disabledWhen: "is_X_wired"` on an `@editable` option to bind its dim state to a sibling viewable. The Scene applies it to:

| Editable          | Disabled when               |
|-------------------|-----------------------------|
| `gravity`         | `is_gravity_wired = true`   |
| `temperature`     | `is_temperature_wired = true` |
| `pressure`        | `is_pressure_wired = true`  |
| `density`         | `is_density_wired = true`   |
| `timeScale`       | `is_time_scale_wired = true` |
| `localPosition`   | `is_local_position_wired = true` |
| `localScale`      | `is_local_scale_wired = true` |

The Atmosphere binding follows the same precedence rule at the value-resolution level: when an `AtmosphereLayer` or `Atmosphere` container is wired through `atmosphere_in`, the Scene's `temperature` / `pressure` / `density` viewables prefer the atmosphere's live aggregates over the SceneItem's editable defaults — and the editables dim accordingly.

## Consumer reading pattern

```ts
// Inside any TransformNode-derived RuntimeNode:
const scene = this.getScene(session);        // SceneStateView
const g     = scene.gravity;                  // ICartesian3
const T_K   = scene.temperature.getValue(Temperature.Units.k);
const T_C   = scene.temperature.getValue(Temperature.Units.c);
const P_atm = scene.pressure.getValue(Pressure.Units.atm);
const myWorld = composeTransform(scene.worldTransform, this.localTransform);
```

When no scene is bound to the session (sample graphs without a Scene, unit tests), `getScene` falls back to a default Earth-surface view via `buildDefaultStateView` — gravity = -9.81 z, temperature = 293.15 K, identity transform, no atmosphere.

## Pitfalls

- **Multiple primary scenes.** If two `SceneItem` at the root canvas both have `isPrimary = true`, the GraphRunner picks the first one and warns. Use the property panel to disambiguate.
- **Atmosphere preset confusion.** The preset `atmosphere` field is informational — a `Physics.Scene:earth` does NOT come with a wired atmosphere node. Drop a `Physics.Scene:atmosphere-state` separately and pick `initialAtmosphere = "earthHumidAirSeaLevel"` to match.
- **Editing manualHz with no IIntegrable leaves.** When the scene's owned leaves declare no `requiredHz`, the effective rate floors at `MIN_EFFECTIVE_HZ` (60 Hz). Setting `manualHz` to a value below 60 Hz is overridden by the floor unless you also tighten the floor.
- **Dimmed editable is just a hint, not a hard lock.** The disabledWhen mechanism prevents the panel widget from accepting input visually but the underlying setter is still callable from code (cloned graphs, presets, undo). Treat the dim state as "the live value comes from elsewhere" rather than "this field is sealed."
- **Mutating scene values directly.** The `Temperature` / `Pressure` Quantity instances exposed by SceneStateView are fresh wrappers over the SceneItem's storage. Mutating them via `.value = …` does NOT write back to the SceneItem (the setter is on `temperatureQ` / `pressureQ` of the SceneItem, not on the Quantity itself). Use the Quantity accessors on the SceneItem to mutate the storage.
