# CO2 Scrubber

`Physics.LifeSupport:scrubber`

The CO2 sink of a cabin: a fan that pulls the air through absorbent beds, with the lag of its removal rate and its electrical power draw.

## Physical thesis

The beds remove CO2 in proportion to the flow the fan pushes through them, and the flow follows the command with a lag: chemical activation and gas transport take minutes, so a scrubber ordered to full command does not remove at full rate at once. This node owns that lag, as a removal rate in 1/min for the cabin's volume:

```
target     = rateAtFullCommandPerMinute * command          [1/min], command in 0..1
d(rate)/dt = (target - rate) / lagTimeConstantMinutes       the one integrated state
```

The removal itself, `rate * (excess of CO2 above the absorbent's floor)`, is computed by the cabin node from its own integrated concentration. That keeps the loop cabin -> scrubber -> cabin out of the graph (no feedback channel, no one-tick lag) and lets the solver see the removal as a continuous function of the state.

The power draw has the shape of the real motor on the bench, the current-versus-command line the factory's `fit` job measured, scaled to habitat size:

```
power = supplyVolts * (interceptAmps + slopeAmps * command) * habitatScale   [W]
```

This is the reference model of the CO2 control sample (removal proportional to the excess, first-order lag), with a continuous command in place of its four levels. The sample's per-minute step fraction `tau` (0.3) corresponds to a time constant of `1/tau` minutes (3.33).

## Ports

| Port | Direction | Kind | Meaning |
|---|---|---|---|
| `command` | input | signal, optional | the fan command, 0 to 1 (the board's speed percent divided by 100) |
| `power` | output | signal | W; wire it into a battery's `powerA..D` |
| `effectiveRate` | output | signal | the lagged removal rate, 1/min; wire it into the cabin's `scrubberRate` |
| `effectiveFraction` | output | signal | the same, as a fraction of the full-command rate |

## Editables

| Field | Default | Unit | Meaning |
|---|---|---|---|
| `rateAtFullCommandPerMinute` | 0.05 | 1/min | fraction of the excess removed per minute at full command (the sample's "normal" preset; 0.20 oversized, 0.022 degraded) |
| `lagTimeConstantMinutes` | 3.33 | min | first-order lag of the effective rate |
| `supplyVolts` | 6 | V | motor supply |
| `interceptAmps` | 0.0879 | A | current at zero command, measured on the bench |
| `slopeAmps` | 0.1611 | A per unit of command | current slope, measured on the bench |
| `habitatScale` | 300 | | bench watts to habitat watts |
| `initialEffectiveRatePerMinute` | 0 | 1/min | the rate at reset (0: the scrubber starts cold) |

## Solver

`IIntegrable`, one state (`effectiveRatePerMinute`), integrated by the scene's solver. Required sample rate: ten samples per time constant. A document that runs at one story minute per step declares a solver item with `maxStep` 60 s; the registry default (0.01 s) integrates correctly but slowly.

## Verified physics

`packages/tests/physics/lifesupport.test.ts`: driven by the sample's explicit minute step, the lag and the cabin reproduce the sample's trajectory to rounding; integrated by the RK4 solver at one story minute per tick, the whole cabin graph stays within 0.5 % of a one-second Euler reference over eight hours; the power law is checked at both ends of the command range.
