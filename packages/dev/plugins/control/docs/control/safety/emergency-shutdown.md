# Emergency Shutdown

`Control.Safety:emergency-shutdown`

A single latched safety bit, the standard fail-safe latch: any `trigger = true` trips it, and it STAYS tripped until an explicit `reset = true` arrives (or the session resets). A transient fault is enough to latch; "the trigger went away" is never enough to clear. Gate downstream actuators by ANDing with `!shutdown`.

## Mechanics

- Each fire consumes every ready token on `trigger` and `reset`. Any truthy non-null value counts (`true`, `1`, a non-empty payload): the ports are typed boolean, but a sloppy upstream converter should still trip the latch rather than be silently ignored.
- Trigger is applied first, reset last: a fire carrying BOTH `trigger=true` and `reset=true` ends up cleared. The operator-initiated reset always wins over a same-tick re-trigger, so the system stays recoverable even while the fault source is still active.
- `shutdown` is published on EVERY fire, latched or not. Downstream gating is a simple per-tick AND, no edge-detection logic needed.

## Inputs

| Slot      | Type    | Required | Notes                                |
| --------- | ------- | -------- | ------------------------------------ |
| `trigger` | boolean | no       | Any truthy token latches `shutdown`. |
| `reset`   | boolean | no       | Any truthy token clears the latch.   |

## Outputs

| Slot       | Type    | Notes                                                             |
| ---------- | ------- | ----------------------------------------------------------------- |
| `shutdown` | boolean | The latch state, broadcast each fire (level semantics, not edge). |

## Viewables

| Name              | Meaning                                                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isShutdown`      | The latch state mirrored for the property panel.                                                                                                                                                                                 |
| `triggerCount`    | Total `trigger=true` tokens observed since the last session reset. Several triggers in one tick all count, so a saturating fault source shows up as many events. Note: it is NOT cleared by `reset=true`, only by session reset. |
| `lastTriggerTick` | Scheduler tick of the most recent trigger (NaN before the first trigger of a session). Updated even while already latched, so the panel reflects ongoing fault activity.                                                         |

No editables: the latch has no thresholds, it reacts to whatever boolean logic feeds `trigger` (comparators, watchdogs, an alert bus adapter).

## Pitfalls

- Level, not edge: consumers see `shutdown=false` tokens too, on every fire. Do not treat the mere ARRIVAL of a token as "we are down"; read its value.
- Falsy tokens (`false`, `0`) on `trigger` or `reset` are consumed and ignored; you cannot un-latch by sending `trigger=false`.
- Session reset clears everything (latch, `triggerCount`, `lastTriggerTick`): a latched fault does NOT survive stop/play. Persisting trip history across sessions is an application concern.
