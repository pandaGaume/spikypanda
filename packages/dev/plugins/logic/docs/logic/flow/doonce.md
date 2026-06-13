# Do Once

`Logic.Flow:doOnce`

One-shot latch: the first trigger on `in` passes through to `then`, every later one is swallowed until a `_reset` re-arms the latch. Use for init-only actions (take a baseline snapshot, print a banner, arm a fault once).

## Mechanics

- `in` (trigger, data plane) gates firing. On the first fire the latch closes and `then` publishes a `true` token; subsequent `in` tokens are consumed silently.
- `_reset` (trigger) lives in the CONTROL plane: it is drained in `processControlInputs` before readiness is evaluated, so it never counts toward the scheduler's required-inputs gate and re-opens the latch on any token.
- `_enable` (boolean, control plane) is the standard node enable.
- Session reset restores the latch to its `startClosed`-seeded state.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `startClosed` | `false` | When true the latch starts in the "already fired" state: the first `in` is silently consumed and only post-`_reset` triggers propagate |

## Pitfalls

- `_reset` only re-arms; it does not fire `then` by itself. The next `in` token after the reset does.
- The latch state is runtime-only: a session reset (not just a pause) is what re-seeds it from `startClosed`.
