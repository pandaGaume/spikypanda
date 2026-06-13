# Gate

`Logic.Flow:gate`

Openable exec valve: triggers on `in` pass through to `then` only while the gate is open. State is flipped by control-plane triggers, so other parts of the graph can arm and disarm an exec chain without participating in it.

## Mechanics

- `in` (trigger, data plane) gates firing; when the gate is open the token is forwarded as a `true` token on `then`, when closed it is consumed and dropped.
- `_open`, `_close`, `_toggle` (triggers) live in the CONTROL plane: drained every dispatch in `processControlInputs`, they mutate the open/closed state without gating the scheduler. They are processed in that order within one dispatch (open, then close, then toggle) if several arrive at once.
- `_enable` (boolean, control plane) is the standard node enable.
- Session reset seeds the state from `startClosed`.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `startClosed` | `false` | Initial state at session reset; the gate starts OPEN by default |

## Pitfalls

- Tokens arriving while the gate is closed are consumed, not queued: opening the gate later does not release them. Use a Do Once + reset pattern if you need "deliver the pending event on open".
- State mutations happen on every dispatch, firing only when `in` is ready: a `_toggle` storm between two `in` tokens nets out to whatever the final state is.
