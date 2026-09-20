# Timeline

`Logic.Time:timeline`

A piecewise-constant source: a list of segments, each with a start, an end and a value; on every tick the node publishes the value of the segment that contains the session time on its `value` output. The schedule of a scenario (who is asleep, who is exercising, from which minute to which) is one timeline per driven quantity.

## Segments

Edited as JSON, so a saved document carries the schedule in the open:

```json
[{ "from": 0, "to": 12000, "value": 4 }, { "from": 12000, "to": 15600, "value": 2 }]
```

Times are session seconds (the `t` of `Session.run`); a segment covers `[from, to)`. Values may be numbers or strings (an activity name); the port is typed `any`. Outside every segment the node publishes `defaultValue`. Segments must not overlap and must end after they start; the setter refuses a bad list, naming the segment or the pair, and keeps the previous list.

## Ports

| Port | Direction | Meaning |
|---|---|---|
| `value` | output | the current segment's value, or `defaultValue` |

## Editables

| Field | Default | Meaning |
|---|---|---|
| `segments` | `[]` | the JSON list |
| `defaultValue` | 0 | published outside every segment |

## Verified

`packages/tests/logic/timeline.test.ts`: the value inside and outside segments through a graph, the refusals (overlap, empty span, non JSON, bad value type) with the previous list kept, and the serialize / deserialize round trip with the parsed list restored and sorted.
