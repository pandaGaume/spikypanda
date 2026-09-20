# Cabin Air (CO2)

`Physics.LifeSupport:cabin-air`

The CO2 balance of a sealed, well-mixed cabin, in ppm, and the three states the life-support rules read.

## Physical thesis

In a well-mixed volume the CO2 concentration is one number. It rises with what the crew exhales, falls with what the scrubber removes, and loses a small fraction per minute to leakage (seals, airlock cycles). The absorbent removes in proportion to the excess above a floor (it works on the partial pressure: a cabin near ambient gives it nothing to remove) and to the scrubber's effective rate. With the sources expressed as concentration rates for this volume:

```
removal      = scrubberRate * max(co2Ppm - removalFloorPpm, 0)                        [ppm/min]
d(co2Ppm)/dt = emissionA + emissionB + emissionC + emissionD - removal - leakPerMinute * co2Ppm
```

clamped between a numerical floor and ceiling. The state is the one integrated variable; the solver of the enclosing scene owns it, and the removal is a continuous function of that state, which is why it is computed here and not in the scrubber node.

Three states by two thresholds, the alarm levels of the rules that govern the scrubber (MIN-FLOW forbids a low flow while ELEVATED and forces full flow while CRITICAL):

```
NOMINAL   co2Ppm <  elevatedPpm
ELEVATED  elevatedPpm <= co2Ppm < criticalPpm
CRITICAL  co2Ppm >= criticalPpm
```

The thresholds are editables here so that the twin shows the same states as the device; in a demo they are set from the device's contract, never typed twice.

## Ports

| Port | Direction | Kind | Meaning |
|---|---|---|---|
| `scrubberRate` | input | signal, optional | the scrubber's effective rate, 1/min |
| `emissionA` .. `emissionD` | input | signal, optional | crew emissions, ppm/min, summed |
| `co2Ppm` | output | signal | the concentration |
| `state` | output | signal | 0 NOMINAL, 1 ELEVATED, 2 CRITICAL |
| `removal` | output | signal | ppm/min removed at the latest state and rate |

## Editables

| Field | Default | Unit | Meaning |
|---|---|---|---|
| `initialPpm` | 1500 | ppm | concentration at reset |
| `leakPerMinute` | 0.001 | 1/min | fraction lost to leakage per minute |
| `removalFloorPpm` | 400 | ppm | the absorbent removes the excess above this |
| `floorPpm` | 300 | ppm | numerical floor |
| `ceilingPpm` | 10000 | ppm | numerical ceiling |
| `elevatedPpm` | 3500 | ppm | ELEVATED from here |
| `criticalPpm` | 4000 | ppm | CRITICAL from here |

The defaults are the CO2 control sample's (comfort limit 3500, vital limit 4000).

## Steady state

For a constant crew emission `e` and rate `r`: `co2Ppm = (e + r * removalFloorPpm) / (r + leakPerMinute)`. This is what the minimum-flow floor of a life-support rule is read from: the lowest rate that keeps a given crew below `elevatedPpm`.

## Verified physics

`packages/tests/physics/lifesupport.test.ts`: the sample's trajectory to rounding under its explicit step; the steady state above, reached under the RK4 solver at full command with four people resting; the state classification and the clamp at the floor.
