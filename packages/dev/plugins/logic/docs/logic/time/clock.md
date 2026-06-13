# Clock

`Logic.Time:clock`

Pure time source: publishes the session's simulation time `t` (the value threaded by `Session.run(t)`, in seconds) on its `t` output every cycle. The single canonical clock for a graph; fan one Clock out to every consumer rather than dropping several.

## Mechanics

- No inputs. The `t` output BROADCASTS to every wired downstream channel (fan-out safe: Clock.t can feed a Divide AND a comparison simultaneously).
- In Play mode the GraphRunner advances `t` per frame, so downstream sees a monotonically increasing clock; in Run Once mode the inferrer passes `t = 0` and the clock ticks once with 0.
- The viewable `t` mirrors the last published value (property panel) and resets to 0 on session reset.

## Pitfalls

- `t` is SIM time, not wall time: pausing freezes it, the sim rate scales it.
- Time-referenced laws downstream (e.g. a step at `tStep`) restart with the session, since `t` restarts at 0 on reset.
