# Array library

`Logic.Array:makeArray` (+ 13 operations: `:length`, `:clear`, `:shuffle`, `:reverse`, `:sort`, `:add`, `:insert`, `:set`, `:get`, `:remove`, `:removeIndex`, `:contains`, `:find`)

UE5-Blueprint-inspired array toolkit. The model is IMMUTABLE: every "mutating" operation outputs a NEW array instead of touching the one that arrived, which fits the dataflow scheduler (channels carry values, not shared references) and keeps downstream snapshots stable. Elements are typed `any`; equality is strict `===` (primitives and same-reference objects match, structurally equal objects do not).

## Operations

| typeId | Label | Inputs | Output | Behavior |
|---|---|---|---|---|
| `:makeArray` | Make Array | `item_0`, `item_1`, ... (variadic, any) | `array` | Collects every READY `item_N` token into a new array in slot-index order; unwired or empty slots are skipped; empty array when nothing delivered |
| `:length` | Length | `array` | `length` (float) | Element count |
| `:clear` | Clear | `array` | `array` | Always publishes `[]` |
| `:shuffle` | Shuffle | `array` | `array` | Fisher-Yates over a copy, driven by `Math.random()` (NOT the deterministic `Logic.Sim:rng-seed` stream) |
| `:reverse` | Reverse | `array` | `array` | Reversed copy |
| `:sort` | Sort | `array` | `array` | Numeric ascending when ALL elements are numbers; otherwise JS default (string-coercing) sort |
| `:add` | Add | `array`, `item` | `array` | Copy with `item` appended |
| `:insert` | Insert | `array`, `index`, `item` | `array` | Copy with `item` spliced in at `floor(index)` clamped to `[0, length]` |
| `:set` | Set Elem | `array`, `index`, `item` | `array` | Copy with the element at `floor(index)` replaced; out-of-range index leaves the copy unchanged (no grow) |
| `:get` | Get | `array`, `index` | `item` (any) | Element at `floor(index)`; publishes `undefined` when out of range |
| `:remove` | Remove | `array`, `item` | `array` | Copy with the FIRST `===` match removed; unchanged copy when not found |
| `:removeIndex` | Remove Index | `array`, `index` | `array` | Copy with the element at `floor(index)` removed; out-of-range is a no-op |
| `:contains` | Contains | `array`, `item` | `result` (boolean) | `true` when a `===` match exists |
| `:find` | Find | `array`, `item` | `index` (float) | Index of the first `===` match, `-1` when absent |

## Defaults and fallbacks

- A missing or non-array token on `array` falls back to `[]` for that fire.
- `index` is also an editable (default 0) on `:insert`, `:set`, `:get`, `:removeIndex`: the wired token wins when present and numeric, otherwise the editable is used.
- `item` has no editable; an unwired `item` resolves to `undefined` (so `:add` can legitimately append `undefined`).

## Pitfalls

- Strict `===` matching means two structurally equal objects (`{x:1}` vs `{x:1}`) never match in `:remove` / `:contains` / `:find`. Match by primitive keys, or carry the same reference through the graph.
- `:sort` on mixed types uses the JS default comparator (string coercion): `[10, 2, "a"]` sorts as strings. Keep arrays homogeneous numeric for numeric order.
- `:makeArray` packs only the slots that DELIVERED this tick: if `item_1`'s upstream skipped a tick you get a shorter array, not a hole. Slot order is preserved among delivered items.
- `:shuffle` is non-reproducible across runs (engine `Math.random()`), even in graphs that otherwise use `Logic.Sim:rng-seed` for determinism.
