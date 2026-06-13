# Sequence

`Logic.Flow:sequence`

Fan-out exec splitter: one trigger on `in` fires every connected `then_N` output, in order, inside the single tick that received the trigger. Use it to impose a deterministic order on several exec chains hanging off one event.

## Mechanics

- Outputs are variadic (`then_0`, `then_1`, ...): the editor grows the port list as you wire the trailing slot.
- At fire time the node collects every outgoing channel whose source slot starts with `then_`, sorts them by numeric suffix, and publishes a `true` token on each in that order. The scheduler then drains the burst FIFO within the same `Session.run(t)`, so `then_0`'s subgraph executes before `then_1`'s.
- Like every exec node here, nothing fires until a token lands on `in`; the `in` token is consumed so the node re-arms for the next trigger.

## Pitfalls

- Order is by numeric suffix, not by wiring order or visual position: `then_2` always fires after `then_0` even if you wired it first.
- All branches receive their token in the same tick. A `then_0` subgraph that takes several ticks to settle (e.g. a cross-tick loop) does NOT delay `then_1`; Sequence orders the dispatch, not the completion.
