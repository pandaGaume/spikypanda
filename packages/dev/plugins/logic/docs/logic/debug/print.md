# Print String

`Logic.Debug:print`

Logs a line to the editor's debug console (the DebugBus panel in the v2 footer) and pulses `then`. UE5 PrintString semantics PLUS a data-friendly mode, so it works both as an exec breadcrumb and as a quick "what is flowing through this wire" probe.

## The two modes

1. EXEC mode (UE5): a token on `in` triggers the print. The payload is, in precedence order:
   - the token that arrived on the `text` port this tick, if any;
   - else, the `in` token ITSELF when it is non-boolean (an alarm object, a number: this closes the classic footgun of wiring a payload into `in` and reading an empty line);
   - else, the static `text` editable.
2. DATA mode: when `in` is UNWIRED, a token landing on `text` triggers the print by itself and prints itself. Wire any data stream straight into `text` and every sample logs one line.

When BOTH ports are wired, only `in` triggers: a `text` token arriving on a tick without an `in` token is consumed and DROPPED, not queued. Both arriving the same tick prints once with the text token as payload.

## Mechanics

- Non-string payloads are stringified: numbers/booleans via `String()`, objects via `JSON.stringify` (falling back to `String()` on circular structures).
- The line is logged at `info` level under the `label` editable, and `then` publishes a `true` trigger token for chaining.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `text` | `""` | Static payload used in exec mode when nothing better arrived |
| `label` | `"Print"` | Console tag for the line (falls back to "Print" when emptied) |

## Pitfalls

- A plain Start-style trigger (boolean `true`) on `in` with an empty `text` editable prints an empty string; set `text` or `label` so the line is identifiable.
- One print per trigger: bursts of several `text` tokens within one tick collapse to the LAST one (the consume loop drains the queue and keeps the most recent).
