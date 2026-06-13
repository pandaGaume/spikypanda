# Delta Time

`Logic.Time:deltaTime`

Stateful time-step source: each fire publishes `dt = t - lastT`, the sim-time elapsed since its previous fire. The building block for explicit time-step integration (`x += dx * dt`) when a node does not get `dt` from the solver itself.

## Mechanics

- No inputs. The `dt` output broadcasts to every wired downstream channel.
- The FIRST fire after a session reset publishes `dt = 0` (the internal `lastT` marker is cleared on reset), so an integrator never inherits a huge spike from a stale previous session.
- The viewable `dt` mirrors the last published value in the property panel.

## Pitfalls

- `dt` measures the spacing of THIS node's fires. If the node is throttled (e.g. behind a Rate Divider pattern or a scheduler gap), `dt` grows accordingly; that is the correct integration step, but it may surprise a consumer expecting the session tick period.
- Sim time can only pause, not rewind, so `dt >= 0` in normal operation; a `dt` of exactly 0 marks the first post-reset fire.
