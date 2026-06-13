# Load Torque

`Physics.Mechanical.Load:torque`

Load-torque source for any motor's `tau_load` input: the missing piece between "a motor model" and "a motor doing a JOB". Profiles model operating-regime changes; swapping the load law = swapping this one node, which keeps the motor block reusable across applications.

## Profiles

| `profile` | Law | Models |
|---|---|---|
| `constant` | tau0 | a fixed regime |
| `step` | tau0 then tau1 at tStep | the APPEARANCE of a new regime |
| `ramp` | drifts tau0 -> tau1 at \|rampRate\|, then HOLDS at tau1 | slow drift INTO a new regime (wear, fouling); bounded on purpose: an unbounded ramp exceeds the motor's stall torque and never stabilizes, so a steady-state monitoring chain downstream would never re-open |
| `quadratic` | k * omega * \|omega\| | fan / pump law (wire `omega` back through a `Control.Feedback:channel` on stream-port motors) |
| `periodic` | tau0 + amplitude * sin(2 pi f t) | periodic mechanical modulation |

## Passivity convention

Speed-dependent profiles are SIGNED so the torque always OPPOSES rotation (`tau * omega >= 0`): a quadratic "fan" spun backwards brakes instead of driving the reverse runaway to NaN. Time-only profiles (constant / step / ramp / periodic) stay `>= 0` braking torques.

## Pitfalls

- `tStep` and the periodic phase are referenced to ABSOLUTE session time: a session reset restarts the law.
- The `omega` input is optional and only read by `quadratic`; on stream-port motors the omega wire forms a dataflow cycle: break it with the split-view Feedback Channel (Z^-1).
