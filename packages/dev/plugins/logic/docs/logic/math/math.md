# Math

`Logic.Math:add` (+ 18 operators, see table)

Scalar math family. Every node resolves wired inputs over editable defaults, publishes a float `result`, and exposes `result` as a viewable that recomputes from the editables on read, so the design-time LiveBinder propagates fresh values through the property panel without running the graph. Non-number tokens are silently rejected by the validator and the editable default takes over for that slot.

## Operators

| typeId | Label | Inputs (defaults) | Result |
|---|---|---|---|
| `:add` | Add | `a` (0), `b` (0) | `a + b` |
| `:subtract` | Subtract | `a` (0), `b` (0) | `a - b` |
| `:multiply` | Multiply | `a` (0), `b` (0) | `a * b` |
| `:divide` | Divide | `a` (0), `b` (0) | `a / b`, or `0` when `b === 0` (no Infinity/NaN leak) |
| `:mod` | Mod | `a` (0), `b` (0) | `a % b` (JS remainder, sign follows `a`), or `0` when `b === 0` |
| `:min` | Min | `a` (0), `b` (0) | `Math.min(a, b)` |
| `:max` | Max | `a` (0), `b` (0) | `Math.max(a, b)` |
| `:pow` | Pow | `a` (0), `b` (0) | `Math.pow(a, b)` |
| `:negate` | Negate | `a` (0) | `-a` |
| `:abs` | Abs | `a` (0) | `Math.abs(a)` |
| `:floor` | Floor | `a` (0) | `Math.floor(a)` |
| `:ceil` | Ceil | `a` (0) | `Math.ceil(a)` |
| `:round` | Round | `a` (0) | `Math.round(a)` |
| `:sqrt` | Sqrt | `a` (0) | `Math.sqrt(a)` (NaN for negative input) |
| `:sin` | Sin | `a` (0) | `Math.sin(a)`, radians |
| `:cos` | Cos | `a` (0) | `Math.cos(a)`, radians |
| `:clamp` | Clamp | `value` (0), `min` (0), `max` (1) | `max(min, min(max, value))` |
| `:lerp` | Lerp | `a` (0), `b` (1), `t` (0) | `a + (b - a) * t`; `t` is NOT clamped, values outside [0, 1] extrapolate |
| `:sum` | Sum | `in_0`, `in_1`, ... (variadic) | `gain * Σ in_k` over the slots that delivered |

## Sum specifics

- Variadic: the editor's reconciler auto-grows `in_<N+1>` as `in_<N>` gets wired. No UE5 tag (Blueprint has no N-ary float Add).
- Unconnected or silent inputs contribute 0 (the additive identity), NOT an editable default; non-finite or non-number tokens are skipped.
- Editable `gain` (default 1) scales the final sum: three unit-amplitude oscillators peak at 3, set gain to 0.333 to renormalize before a Buffer/FFT.
- The `result` viewable mirrors the LAST PRODUCED sum (not a recompute), handy to confirm the wiring and see the live mix amplitude.

## Pitfalls

- `:divide` and `:mod` return 0 (not Infinity/NaN) on a zero divisor: convenient for control graphs, but it can mask a wiring bug. Watch the divisor if a ratio reads exactly 0.
- Trig is in radians; multiply by `Math.PI / 180` upstream for degrees.
- A mistyped wire falls back to the editable default silently (same tolerance as `Branch.condition`); if a result looks frozen, check the input types.
