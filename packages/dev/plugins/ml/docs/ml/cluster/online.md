# Online Clusterer (open-set)

`ML.Cluster:online`

Open-set regime discovery: assigns each incoming embedding to the nearest profile by cosine distance, CREATES a profile when nothing is close enough, and raises an `alarm` on every creation. The machine discovers how many regimes exist (including "just one"): k is an OUTPUT, not a configuration.

Direct port of the DriverV2 brick 4 (anonymous open-set clustering), calibrated thresholds included.

## Mechanics

- `d < assign_thr` (0.05): assign to the closest profile; below `update_thr` (0.02) the centroid EMA-follows (`alpha` 0.15).
- otherwise: NEW profile, `is_new` true, and one `alarm` token: `{ topic: "NEW_REGIME", severity: "warn", payload: { message, k, label, distance } }`, wire-compatible with `Logic.Event:alert-bus` (severity MUST be "warn": the bus normalizes unknown severities to "info").
- on every match to an existing profile, the tracking centroid is also compared to the profile's ANCHOR (see "Drift anchors"); past `drift_thr` (0.1) one `alarm` token `{ topic: "REGIME_DRIFT", severity: "warn", payload: { message, k, label, distance, driftSteps } }` is published and the profile re-anchors. `drift_count` (viewable) totals these events since reset.
- `_recluster` (CONTROL-plane input): any token runs the batch agglomerative merge over the bounded history (`link_thr` 0.06 absolute, `k_max` 4) to heal over-segmentation. Labels are NEVER stable identifiers across a recluster. A recluster is a deliberate RE-BASELINING: rebuilt profiles get fresh anchors (their new centroids) and zeroed drift counters.
- `k` is published at most once per fire, with the final post-recluster value. The `alarm` output advertises capacity 4: a fire draining several embeddings can burst one alarm token per assignment.

## Drift anchors

The boiling-frog problem: the EMA update absorbs benign jitter, BUT it also follows a slow derangement. When every step stays under `update_thr`, each assignment moves the reference itself, so the assign distance never grows and a machine can wear all the way out of its baseline without a single alarm (load-torque RAMP mode reproduced this exactly: zero regime changes detected). DriverV2's `update_thr` gating was the anti-drift compromise for DRIVERS, whose behavioral profile should not creep; industrial machines DO drift (wear), so tracking alone is a blind spot.

Each profile therefore keeps an ANCHOR: an immutable snapshot of its centroid taken at creation. On every match the tracking centroid is compared to the anchor; when the cosine distance exceeds `drift_thr` the node publishes one `REGIME_DRIFT` alarm and RE-ANCHORS the profile at its current centroid.

Staircase semantics: each alarm means "the reference moved another `drift_thr` since the last anchor". A continuous slow derangement produces a regular trail of alarms instead of silence; a stable regime produces none; `driftSteps` in the payload numbers the stairs per profile.

Tuning: `drift_thr` defaults to 0.1, i.e. 2x the default `assign_thr` (0.05): a reference that silently walked twice the open-set radius is no longer the reference that was learned. Keep `drift_thr` comfortably above the within-regime jitter floor (otherwise noise convergence right after a profile is created fires a spurious stair) and scale it with `assign_thr` when retuning. `drift_thr` 0 disables drift detection entirely (the pre-anchor behavior, useful as a regression pin).

## Inputs and privacy

`embedding` accepts any numeric tensor/array payload and l2-normalizes internally: only DIRECTION separates regimes (a pure amplitude scaling is invisible: encoders must encode level into direction, e.g. via saturating bands plus a constant bias path). History is a bounded ring (`history_max` 512); `reset()` erases everything, anchors included: profiles are anonymous and erasable by design.

## Pitfalls

- The FIRST embedding always creates profile 0 and fires the alarm: cold-start suppression (silent baseline) is an application-level semantic (see the motorwatch device facade), not a node behavior.
- A slow drift is EMA-absorbed and NEVER mints a profile (every step under `update_thr` moves the reference along): with `drift_thr` 0 that derangement is fully silent, the boiling-frog failure. Leave drift anchors on so it surfaces as a `REGIME_DRIFT` staircase instead (see "Drift anchors"); only a SHARP change past `assign_thr` mints a profile.
- Mixed windows straddling a regime change can mint phantom profiles: gate and quarantine upstream (block-cadence acquisition makes this a 1-block-per-edge event).
