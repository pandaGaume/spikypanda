# Particulate

`Physics.Particulate:particulate` (+ 3 presets: `:pm2_5`, `:pm10`, `:lunar_dust`)

Descriptor for solid-phase particulate matter (PM2.5, PM10, dust, regolith). A `GraphItem`, not a `RuntimeNode`: it carries metadata only and wires to an atmosphere through a dashed config-link, resolved at session bind, never carrying a runtime payload. Particulate lives under `Physics` and not `Chemistry` because its dynamics (settling under gravity, drag, re-suspension, filtration) are physics, not chemical-species mass balance.

Implements `IParticulateMetadata` (core/sim/particulate.interfaces.ts), so consumers duck-type on the interface without depending on this plugin's bundle.

## V1 scope: a slot, not a simulation

V1 records the descriptor only. The atmosphere state node declares `particulate_in_<k>` variadic config-link inputs; a Particulate wired there is recorded by the SceneBindingResolver as part of the atmosphere's binding metadata, but contributes NOTHING to the state vector yet (no mass-loading segment, no rhs term). The slot exists so user topologies survive the V2 PM-integration refactor without re-wiring. V2 will add per-size-bin mass loading [kg/m3], `delta_particulate_<id>_<k>` producer ports, and gravity-dependent settling read from the SceneStateView.

## Anchors (editor-only config-links)

| Direction | Anchor            | Type        | Notes                                                                  |
| --------- | ----------------- | ----------- | ---------------------------------------------------------------------- |
| out       | `particulate_out` | particulate | Dashed config-link onto an atmosphere's variadic `particulate_in_<k>`. |

No runtime input ports at all: the node never fires.

## Editables

| Field                        | Unit   | Default (generic) | Meaning                                                                                                                                                                                                                  |
| ---------------------------- | ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `particulate_id`             | string | `"pm"`            | Stable identifier; becomes the slot suffix when V2 wiring lands. Empty values snap back to `"pm"`.                                                                                                                       |
| `display_name`               | string | `"Particulate"`   | Property-panel / dashboard label.                                                                                                                                                                                        |
| `characteristic_diameter_um` | µm     | 10                | Median aerodynamic diameter. Stored in metres (canonical SI) so V2 settling laws use it directly; the panel speaks µm because PM nomenclature does (PM2.5 = 2.5 µm). Negative values are rejected (previous value kept). |
| `material_density_kg_per_m3` | kg/m³  | 1000              | Bulk material density. Negative values rejected.                                                                                                                                                                         |
| `pm_class`                   | string | `"pm10"`          | Free-form hazard / size category for future filtering logic. Empty values snap back to `"pm10"`.                                                                                                                         |

## Presets

| typeId                   | id           | Diameter (µm) | Density (kg/m³) | pm_class | Notes                                               |
| ------------------------ | ------------ | ------------- | --------------- | -------- | --------------------------------------------------- |
| `:pm2_5` PM2.5           | `pm2_5`      | 2.5           | 1500            | `pm2_5`  | Fine particulate, the indoor air quality benchmark. |
| `:pm10` PM10             | `pm10`       | 10            | 1500            | `pm10`   | Coarse particulate.                                 |
| `:lunar_dust` Lunar dust | `lunar_dust` | 5             | 3100            | `dust`   | Abrasive Apollo-experience regolith.                |

## Pitfalls

- **Editing a preset is non-destructive.** A dropped `:pm2_5` carries the canonical values, but every field can be overridden and there is no "snap back". Use the generic `:particulate` when authoring a fully custom descriptor is the intent.
- **No effect on the simulation in V1.** Wiring a particulate changes nothing measurable yet (no settling, no concentration). If a number does not move, that is by design, not a bug.
- **Duplicate ids are not deduplicated.** Two descriptors with the same `particulate_id` wired to one atmosphere are carried as separate components; keep ids unique per atmosphere.
