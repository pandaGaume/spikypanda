# Arbitrator

`Logic.Event:arbitrator`

Merges variadic action requests (`req_0`, `req_1`, ...) into one applied action under a selectable policy. The use case: N controllers (PID, safety override, human pilot, learned policy) competing for ONE actuator. Centralizing the fusion rule keeps the actuator single-input and makes the policy a graph-visible editable; switching from `priority` to `blend` (teleop to shared autonomy) is one click, not a re-wire.

## Request protocol

Each `req_*` slot is read AT MOST ONCE per tick (no draining: the natural "one request per controller per tick" cadence; rate-divide bursty upstreams on their side). Tokens parse as:

- a finite NUMBER: `{ priority: 0, value: n }` (vote-only / fallback request);
- an OBJECT with a finite numeric `value`: `{ priority: Number(.priority) or 0, value }`; a safety override publishing `{ priority: 999, value: 0 }` wins every priority tie;
- anything else: silently dropped (the token is still consumed, so the producer never stalls).

## Policies

| `policy` | Rule | `sourceIdx` |
|---|---|---|
| `priority` (default) | Highest `priority` wins; ties break to the LOWEST input index | winning slot index |
| `blend` | Weighted average `sum(p_i * v_i) / sum(p_i)`; when every priority is 0, falls back to the plain arithmetic mean (never NaN) | `-1` (no single winner) |
| `vote` | Median of values, priorities ignored; even counts take the LOWER middle (deterministic, tie-free). Robust to one misbehaving controller | `-1` |

Invalid policy strings clamp to `"priority"`; the node never crashes a session over a typo.

## Outputs

- `applied` (float): the fused action.
- `sourceIdx` (float): winning input index in priority mode, -1 in blend/vote.
- A tick with ZERO usable requests publishes NOTHING, so a stale arbitration never overrides the actuator's current setpoint; the inactivity is visible as `activeRequests == 0`.

## Viewables

`lastApplied`, `lastSourceIdx` (initialized to -1 = "no decision yet"), `activeRequests` (usable requests on the last fire). Together the property panel doubles as a live trace of WHICH controller is in command, invaluable for "why is the actuator twitching".

## Pitfalls

- Plain-number requests carry priority 0: in priority mode any explicit-priority producer beats all of them, and among the zeros the LOWEST slot index wins. Wire the default controller to `req_0`.
- In blend mode a priority-0 request contributes NOTHING when at least one other request has positive priority (its weight is zero); the all-zero mean fallback only applies when every request omitted priority.
