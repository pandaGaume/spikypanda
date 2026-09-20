# Battery

`Physics.Electric:battery`

An energy reserve drained by the loads wired into it, reported as a state of charge. The night budget of a habitat, the pack of a rover: anything whose question is "how much is left".

## Physical thesis

Over hours, a battery is a bucket of energy. The chemistry (voltage sag, temperature, internal resistance) matters for seconds and for sizing; for a night's budget what matters is the integral of the power drawn:

```
d(energyUsedWh)/dt   = (powerA + powerB + powerC + powerD + otherLoadsW) / 3600     [Wh per second]
stateOfChargePercent = 100 * (initial charge in Wh - energyUsedWh) / capacityWh
```

`otherLoadsW` is everything the graph does not model explicitly, held constant. The state of charge is clamped to [0, 100]: an empty battery stays empty.

## Ports

| Port | Direction | Kind | Meaning |
|---|---|---|---|
| `powerA` .. `powerD` | input | signal, optional | loads, W, summed |
| `stateOfChargePercent` | output | signal | % |
| `energyUsedWh` | output | signal | Wh since reset |
| `remainingWh` | output | signal | Wh |

## Editables

| Field | Default | Unit | Meaning |
|---|---|---|---|
| `capacityWh` | 40000 | Wh | the reserve |
| `initialStateOfChargePercent` | 100 | % | at reset |
| `otherLoadsW` | 0 | W | constant loads not wired |

## Solver

`IIntegrable`, one state (`energyUsedWh`). Required sample rate: one per minute.

## Verified physics

`packages/tests/physics/lifesupport.test.ts`: over an eight-hour schedule the energy used matches the integral of the scrubber's power plus the other loads within 0.5 %, and the state of charge is that integral over the capacity.
