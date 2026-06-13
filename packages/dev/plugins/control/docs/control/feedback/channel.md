# Feedback Channel

`Control.Feedback:channel`

Z^-N tick delay, THE way to close a loop in the editor. Every closed-loop graph is conceptually cyclic: motor -> tachymeter -> PI -> motor. The editor runs sessions on the dynamic scheduler, which tolerates signal-only cycles (a per-tick dedup caps each signal-only node at one fire per tick), so a directly wired loop is not rejected; but it leaves the loop's timing implicit: where the one-tick lag lands depends on fire order, and the first turn has no defined starting value. Inserting a Feedback Channel on the backward edge makes the break explicit: the wire that goes backward in intent goes forward in time by exactly `delay` ticks, bootstrapped with `initial`.

## Delay semantics

The node keeps NO ring buffer. Every publish is stamped with a future tick index (`validAtTick = tickIndex + delay`) and parked in the session's deferred queue until that tick arrives; the consumer sees at tick t the value that entered at tick t - N. Because the stamp uses the integer scheduler tick counter, not sim time, the delay is independent of dt granularity: Z^-1 means "one scheduler run" at 200 kHz fixed-step and at free-running ~16 ms alike.

- `delay = 0`: passthrough, delivered the same tick. Still useful as a typed re-router / split-view placeholder, but it breaks NO cycle.
- `delay = 1`: classic Z^-1 unit delay. Default.
- `delay = N`: output at tick t equals input at tick t - N.

Bootstrap: at reset() the node seeds `delay` events carrying `initial` at the next `delay` ticks, so the consumer has values for the first turns of the loop before the first real input has come around. A standalone reset() mid-session first cancels the in-flight deferred events on this node's output channels, then re-seeds from the next tick forward.

Input read: the ports are signal-kind, so each fire reads the upstream's CURRENT value (zero-order hold), and falls back to `initial` when nothing has been published yet. The output wire is therefore never silent, which is what closed-loop consumers expect.

## Split view (two anchors)

The node renders as two visually independent widgets sharing one logical node: anchor 0 (the "out" half, exposing the `input` port) sits next to the signal source; anchor 1 (the "in" half, exposing the `output` port) sits next to the consumer. The user's cyclic intent becomes two short forward wires; no backward cable crosses the canvas.

## Ports

| Direction | Slot     | Type | Kind   | Anchor | Notes                                                   |
| --------- | -------- | ---- | ------ | ------ | ------------------------------------------------------- |
| in        | `input`  | any  | signal | 0      | Optional; unwired, the channel emits `initial` forever. |
| out       | `output` | any  | signal | 1      | The delayed value, never silent.                        |

`any` typed on purpose: floats (motor speeds), vectors (3-axis IMU), arrays, objects all flow through unchanged, same reference, no clone. The downstream port's type drives editor compatibility checks; the channel itself is type-agnostic.

## Editables

| Name      | Default | Meaning                                                                                                                                                                      |
| --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delay`   | 1       | Z^-N depth in scheduler ticks. Clamped to a non-negative integer (negative -> 0, fractional -> floor).                                                                       |
| `initial` | 0       | Bootstrap payload, also the fallback when `input` has never published. Any-typed, so the property panel shows it through the `output` viewable rather than a generic editor. |

Viewable: `output` mirrors the live in-flight value at each fire.

## The motorwatch omega -> load_torque pattern

A speed-dependent load (`Physics.Mechanical.Load:torque` in `quadratic` profile) needs the motor's own `omega`, and the motor needs the load's `tau_load` back: a two-node cycle. The motorwatch graphs break it with one Z^-1 channel on the omega path:

```
[DC motor]  omega ──────► [Feedback (omega, Z-1)]  anchor 0, by the motor
                               │  (forward in time, 1 tick)
[Load Torque]  omega ◄──────── output               anchor 1, by the load
      tau_load ──────────────► [DC motor] tau_load
```

The load law at tick t uses omega from tick t - 1; at simulation rates the one-tick lag is far below the mechanical time constants and invisible in the trajectory.

## Pitfalls

- Changing `delay` mid-session does nothing immediately: already-scheduled events keep their original `validAtTick`, and the bootstrap depth only rebuilds at the next reset(). Mid-run delay tweaks are a design-time experiment, not a control-loop knob.
- The delay lives entirely in the `validAtTick` stamping: the editor's session builder wires every connection as a plain (non-delayed) channel, and nothing marks this node's outputs `delayed: true`. Wiring the loop directly (without the channel) is NOT rejected in the editor's dynamic sessions; it just degrades to an implicit lag whose placement depends on fire order and whose first-turn value is whatever the unfired upstream happens to hold. Only the static scheduler topo-sorts and refuses cycles through non-delayed channels, and the editor never uses it.
- Payloads pass by reference, never cloned: a producer that mutates the object it published will retroactively change what the consumer sees N ticks later. Publish fresh objects in loops carrying mutable state.
- Each extra tick of `delay` is phase lag inside the control loop; large N with a tight controller is a textbook oscillation recipe. Keep N = 1 unless the model genuinely calls for transport delay.
