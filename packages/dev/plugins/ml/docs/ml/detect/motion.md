# Motion Watch (freeze/jump)

`ML.Detect:motion`

Per-element MOVEMENT watching: learns, once, how much each component of the incoming vector typically moves per step, then flags any element that stops moving (freeze) or makes an abnormally large step (jump). The alarm names the element, so the detection localizes the fault to a channel or a latent dimension instead of reporting "something changed somewhere".

## Mechanics

- The first `warmup` (64) vectors freeze the reference: per-element typical step `s_e` = median of the warmup `|x_e[t] - x_e[t-1]|` (mean fallback when the median is 0, epsilon last), and baseline window path `P_e = s_e * window`. The reference NEVER updates afterward: it is a snapshot of the HEALTHY moving system, symmetric to the clusterer's anchor philosophy.
- After warmup, per element per step: JUMP when `z_e = |delta_e| / s_e` exceeds `z_jump` (6), one `alarm` token `{ topic: "REGIME_JUMP", severity: "warn", payload: { message, element, score } }`; FREEZE when the rolling path `L_e` (sum of `|delta|` over the last `window` (16) steps) drops below `freeze_ratio` (0.1) of `P_e`, one `alarm` token `{ topic: "REGIME_FREEZE", severity: "warn", payload: { message, element, score } }`. Both are wire-compatible with `Logic.Event:alert-bus` (severity MUST be "warn": the bus normalizes unknown severities to "info").
- `_rebaseline` (CONTROL-plane input): any token re-enters warmup, a deliberate re-baselining after a known intervention (sensor swap, maintenance). Changing `warmup` or `window` re-baselines too (the library consumes them during warmup). The `jump_count` / `freeze_count` viewables keep their totals; only a session reset zeroes them.
- The `alarm` output advertises capacity 4: a single step can fire several elements at once (one token max per element and signature thanks to the latches). The optional `moving` output publishes, on each processed vector, the count of currently NOT-frozen elements (cheap liveness signal).

## Two signatures

FREEZE is a path collapse over a window: the sum of per-step motion drains below `freeze_ratio * P_e`. Path length, NOT instantaneous velocity and NOT net displacement: an oscillating element that doubles back every few steps keeps a large path even though it ends up where it started, so it does not read as frozen. Only an element whose per-step motion actually dies can drain the path. The freeze test waits for the post-warmup window to fill before its first evaluation.

JUMP is an abnormal single step against the frozen per-element scale: `z_e = |delta_e| / s_e` past `z_jump`. A dynamics break that leaves the position continuous (a transient, a relay chatter, a step in one channel) is exactly what the clusterer's position test glosses over.

Both signatures are rising-edge latched with hysteresis: jump fires once when `z_e > z_jump` and re-arms below `z_jump / 2`; freeze fires once when `L_e < freeze_ratio * P_e` and re-arms above `2 * freeze_ratio * P_e`. A persistent condition therefore produces exactly ONE alarm per element, not a flood, and a marginal signal cannot chatter across the threshold.

## Inputs

`vector` accepts any numeric tensor/array payload. Elements are the vector components: the caller decides what an element is, a physical channel from a mux or a latent dimension from an encoder. The node learns no basis; the representation is upstream's job.

## Position vs movement

`ML.Cluster:online` detects by POSITION: a sharp displacement past `assign_thr` mints a new profile, a slow walk climbs the anchor staircase as REGIME_DRIFT. This node detects by MOVEMENT: a dynamics change that leaves the position continuous (one element jumps, one element dies) plus per-element localization, which the cluster's whole-vector cosine cannot give. Each is blind where the other sees: the cluster misses a single frozen dimension (the position barely moves) and the motion watch misses a slow drift (each step looks typical against the frozen scale). Run BOTH for full coverage.

## Pitfalls

- Warmup must see a HEALTHY MOVING system: a reference frozen on an already-degraded or still-starting machine bakes the fault into the baseline. Re-baseline (`_rebaseline`) after any known intervention.
- The frozen reference never tracks: if the operating point legitimately changes the typical step scale, jumps or freezes will fire until you re-baseline. That is the design (a tracker would absorb degradations); the staircase-anchored clusterer covers the slow side.
- Fixed vector length contract: the element topology is locked by the first vector. The library throws on a length change; the node catches it, warns once, and re-baselines on the new shape (the offending vector seeds the new warmup).
- Freeze cannot fire before the post-warmup window fills: expect a `window`-step delay between a stand-still and its REGIME_FREEZE, by construction of the rolling path.
