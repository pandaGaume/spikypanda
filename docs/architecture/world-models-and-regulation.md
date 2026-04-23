# Dynamics Is Not a World Model: What We Learned Building a CO2 Controller

## Summary in one sentence

A dynamics model predicts. A world model decides. The difference is the cost function,
and without an explicit cost you cannot go beyond threshold control.

## The experimental finding

We built a Model Predictive Controller for CO2 scrubbing in a closed habitat
(see `packages/host/www/samples/co2-mpc/`). The setup:

- A 401-parameter neural dynamics model predicts CO2 evolution one minute ahead
  given current CO2, crew activity, and scrubber state.
- A ShootingSelectorNode samples K candidate action sequences, runs each
  through the dynamics model over a 30 to 60 minute horizon, and picks the
  first action of the lowest-cost sequence.
- A three-zone scrubber model (oversized, normal, degraded) lets the user
  test different hardware conditions.

Initially, the MPC behaved **exactly like a threshold controller**: it did
nothing until CO2 approached 3500 ppm, then commanded the scrubber at high
power. Swapping the hardware preset from oversized to degraded changed the
amount of energy consumed, but the decision policy was unchanged. The MPC
was not regulating. It was reacting.

## Why it happened

The cost function looked like this:

```
cost(trajectory, actions) =
    1000 × (CO2 above 3500)²      # hard penalty
  + 1e6 × (CO2 above 4000)         # safety
  + energy_weight × Σ power(action) # energy
```

The problem: for every state where CO2 is below 3500 ppm, the trajectory
cost is dominated by **zero**. Any rollout that stays under 3500 returns
the same CO2 cost (zero) regardless of where it sits. Given a choice
between `CO2 stays at 1800` (energy cost 0) and `CO2 stays at 3400`
(energy cost 0), the MPC is indifferent on the CO2 axis and picks the one
with lower energy. That is always "do nothing until trouble."

This is mathematically identical to a threshold controller. The MPC
machinery (rollouts, candidates, neural dynamics) adds nothing because
there is no gradient to follow.

## The fix

We replaced the binary penalty with a three-zone gradient:

```
[0, comfort]        : no cost
[comfort, soft]     : linear ramp, small weight
[soft, vital]       : quadratic ramp, 100x weight
above vital         : catastrophic
```

With `comfort = 2000 ppm`, `soft = 3500 ppm`, `vital = 4000 ppm`, the
cost function now has a non-zero gradient at every CO2 level that would
realistically appear during a run. The MPC now has a direction to follow
at each state: bring CO2 back toward comfort when energy is cheap, tolerate
drift up to soft when energy is expensive, never cross vital.

The behavior changed completely. The MPC now holds the scrubber at a low
or medium level continuously during crew activity, keeping CO2 near the
comfort target. The reactive threshold still oscillates between 2500 and
3700 ppm with pulsed high-power scrubbing. Total energy and peak CO2 both
drop with the MPC. The AI now earns its cost.

## The generalization: dynamics is not enough

A world model has three components, all necessary:

| Component | Role | What we had | What was missing |
|---|---|---|---|
| **Dynamics** | f(state, action) → next_state | Neural MLP (401 params) | — |
| **Cost / value** | c(trajectory) → scalar preference | Flat below soft | Gradient everywhere |
| **Planner** | argmin cost over actions | Random shooting | — |

Without an explicit cost function, the dynamics model is a **simulator**.
It predicts what happens. It does not judge. A simulator answers "what if?"
but it cannot answer "what should I do?"

The world model emerges when you attach preferences to the dynamics. The
preferences tell the simulator which futures are better. Only then does
rolling out alternative action sequences produce a decision. Without
preferences, all rollouts are equivalent and the system collapses to
whatever rule the sampler happens to favor (typically: minimum energy,
equivalent to threshold).

## Connection to factor graphs and STAG

This is exactly the point made by Frank Dellaert in *Factor Graphs and
World Models* (gtsam.org, 2026). A factor graph is an energy-based world
model because it encodes simultaneously:

- **Transition factors**: the dynamics (how one state leads to the next)
- **Unary factors**: the preferences (which states are good, which are bad)

Sense-Think-Act with Graphs (STAG) uses the same factor graph for
perception (past graph: smooth recent trajectory given measurements) and
planning (future graph: optimize upcoming actions given objectives). Both
share the dynamics. The difference is which factors are active:
measurement factors for the past, objective factors for the future.

Our CO2 controller is a runnable instance of this idea. The dynamics
model is the transition factor. The zoned cost is the objective factor.
The ShootingSelectorNode is the energy minimizer. Remove the objective
and the whole construction is still mathematically valid but operationally
useless.

## Practical guidance

| Situation | Right choice |
|---|---|
| Single objective (stay under X), well-dimensioned hardware | **Threshold or hysteresis**. Simple, cheap, near-optimal. MPC adds cost for no benefit. |
| Single objective, marginal or failing hardware | **MPC with zoned cost**. Anticipation of lag matters, gradient guides smooth control. |
| Multiple competing objectives (safety + comfort + energy + wear + lifetime) | **MPC with multi-term cost**. Only explicit cost function can arbitrate between objectives. Threshold has no mechanism for trade-offs. |
| Unpredictable disturbances (varying crew, failing sensors) | **MPC with receding horizon**. Replanning every step absorbs uncertainty. |

## The one-line takeaway

> **Dynamics without cost is prediction. Dynamics with cost is a world model. Only a world model lets you regulate instead of react.**

This is not a SpikyPanda-specific insight. It applies to any control
system. But it is especially relevant for embedded AI: a neural network
that predicts the world is useful only when paired with a cost function
that expresses what you want. Ship both, or ship neither.
