# Alert Bus

`Logic.Event:alert-bus`

Typed pub/sub broker: every token on `publish` is normalized into a canonical `{ topic, severity, payload }` message, matched against the topic filter, and fanned out to EVERY wire on `subscribe`. Modeling the bus as a node (rather than a hidden service) keeps event routing visible in the editor and lets graph snapshots capture recent history; V1 contract is one bus instance per graph.

## Message normalization

- A STRING token becomes `{ topic: <string>, severity: "info", payload: null }`.
- An OBJECT is accepted when it carries a string `topic`; `payload` defaults to null.
- Severity is normalized into the closed set `"info" | "warn" | "error"`: missing or UNKNOWN severities become `"info"`. Producers that want to be heard as warnings MUST send exactly `"warn"` (this is the wire-compatible level the `ML.Cluster:online` alarms use; `"warning"`, `"WARN"` etc. silently demote to info).
- Anything else (number, boolean, null) is uninterpretable and dropped before ingestion: it does not count, does not enter the ring.

## Topic filter

`topicFilter` editable, default `"*"`. Grammar is deliberately minimal in V1: `"*"` (or the empty string) matches every topic; ANY other value is exact-string equality with `message.topic`. No glob/regex yet (topic conventions are still settling; a wildcard dialect would be premature). Non-matching messages are counted and ringed but NOT forwarded: the bus is a passive broker, not a sink.

## Fan-out and history

- Each tick drains EVERY queued `publish` token (bursty upstreams deliver several messages per tick), so order is preserved and nothing backlogs.
- Matched messages republish on every wired `subscribe` channel (true fan-out: N subscribers each get the message object, by reference).
- A fixed ring buffer keeps the last 32 INGESTED messages (pre-filter, FIFO overwrite), exposed to diagnostics via the `recentEvents()` method, oldest first. It is runtime state: cleared on session reset, never serialized.

## Viewables

| Viewable | Meaning |
|---|---|
| `lastTopic` / `lastSeverity` | Most recently FORWARDED message (filtered-out events do not update them: the panel reads like a tap on what subscribers actually receive) |
| `publishedCount` | Total ingested since reset, including filter rejects |
| `subscribedCount` | Total forwarded; the gap to `publishedCount` is the filter's reject rate |

## Pitfalls

- Subscribers receive the message OBJECT by reference; do not mutate it downstream.
- A topic typo on either side fails silently: the filter is exact-match. The `publishedCount` vs `subscribedCount` gap plus `recentEvents()` is the debugging path for "why isn't my subscriber seeing X".
- One bus per graph is the V1 contract; partitioned channels (busId routing) is a future evolution, today drop two bus nodes only if their publisher/subscriber sets are fully disjoint.
