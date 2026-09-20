# Crew

`Physics.LifeSupport:crew`

The CO2 source of a cabin: a group of people at one activity level. Several groups at different activities (two asleep, two exercising) are several Crew nodes, wired into the cabin's `emissionA..D` inputs.

## Physical thesis

A person exhales CO2 at a rate that follows the metabolic level: roughly one kilogram per day at rest, two to three times more under exercise. In a sealed, well-mixed volume that mass rate becomes a concentration rate (ppm per minute) once divided by the cabin volume. This node takes the rates already expressed in ppm per minute per person for the cabin it lives in (the reference model of the CO2 control sample folds the volume into them) and multiplies by the head count:

```
co2Emission = count * emissionPerPerson[activity]        [ppm/min]
```

Nothing is integrated here; the cabin node integrates.

## Ports

| Port | Direction | Kind | Meaning |
|---|---|---|---|
| `count` | input | signal, optional | head count of the group; when not wired, the `count` editable |
| `activity` | input | signal, optional, `any` | `"sleep"`, `"rest"`, `"light_work"`, `"heavy_work"`, or the index 0 to 3; when not wired, the `activity` editable |
| `co2Emission` | output | signal | ppm per minute |

Drive `count` and `activity` from `Logic.Time:timeline` nodes to play a schedule.

## Editables

| Field | Default | Unit | Meaning |
|---|---|---|---|
| `emissionSleepPpmPerMinute` | 2.0 | ppm/min per person | asleep |
| `emissionRestPpmPerMinute` | 3.5 | ppm/min per person | awake, seated |
| `emissionLightWorkPpmPerMinute` | 5.5 | ppm/min per person | light work |
| `emissionHeavyWorkPpmPerMinute` | 7.0 | ppm/min per person | heavy work, exercise |
| `count` | 4 | persons | used when the `count` input is not wired |
| `activity` | `sleep` | | used when the `activity` input is not wired |

The defaults are the CO2 control sample's (`ACTIVITY_EMISSION`). They are assumptions to review for a given cabin; a demo sets them from a parameter file so that a saved document carries the reviewed values.

## Verified physics

`packages/tests/physics/lifesupport.test.ts`: emission equals count times the per-activity rate, by name and by index; wired signals override the editables; and, driven together with the scrubber and cabin nodes by the sample's explicit minute step, the three nodes reproduce the sample's trajectory to rounding over an eight-hour schedule.
