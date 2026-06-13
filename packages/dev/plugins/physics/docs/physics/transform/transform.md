# Transform

`Physics.Transform:transform`

World-frame transform composer: computes `world = parent_world x local` from two optional matrix44 inputs and publishes the result. Drop one on the canvas as an intermediate frame, a marker, or a debug attach-point; every physical object in the plugin (motors, sensors, mechanical bodies) inherits this exact behavior as its base class, so chaining Transforms builds a scene graph one cable at a time.

## Mechanics

- Matrices are flat arrays of 16 numbers in column-major layout (translation in indices 12/13/14), the same convention as the geometry plugin's TRS builder. Composing with a `Geometry.Transform` output just works, no conversion.
- Both inputs are optional and default to IDENTITY. The composition runs on EVERY fire with whatever tokens arrived this tick.
- The `world` output is fanned out to every wired channel on each fire; the internal field only updates (undo-journal entry) when the matrix actually changed, with a 1e-12 absolute tolerance per element.
- Environmental context (gravity, temperature, pressure, atmosphere) is NOT a port here: it lives on `session.sceneStateView`, bound by the enclosing Sim.Graph or the GraphRunner from a wired SceneItem. Subclasses read it through `getScene()`, which falls back to Earth-surface defaults when no scene is bound.

## Ports

| Direction | Slot           | Type     | Notes                                                                     |
| --------- | -------------- | -------- | ------------------------------------------------------------------------- |
| in        | `local`        | matrix44 | This object's pose in the parent's frame. Optional, identity when absent. |
| in        | `parent_world` | matrix44 | The parent's world transform. Optional, identity when absent.             |
| out       | `world`        | matrix44 | `parent_world x local`, recomputed every fire.                            |

## Pitfalls

- **Missing tokens mean identity, not last-value.** The inputs are stream ports: a token that is not ready this tick is treated as identity, and the recomputed world OVERWRITES the previous one. An upstream node that publishes its matrix only once leaves this node snapping back to identity on the next fire. Feed the pose every tick, or leave the input unwired if identity is what you mean.
- Non-matrix payloads (anything that is not a 16-element array) are consumed and silently ignored; the slot falls back to identity for that tick.
- `world` is not duplicated in the property panel (no viewable): inspect it by wiring the output downstream.
