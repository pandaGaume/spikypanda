# From Single-Loop to Coupled Systems: Why We Are Building This

## What this document is

This is the connective tissue between our experiments. The CO2 MPC demo
(sample 1) is a proof of concept for a few theoretical points about world
models on microcontrollers. Sample 2 will add coupled constraints and show
what the first sample deliberately could not. This document explains why we
built the first one, what it actually taught us, and where the real value
of a world-model-based controller shows up.

Read this if you want the arc, not the technical details.

## The opening question

Consider a sealed habitat: a lunar module, a deep-space capsule, a
submarine, an offshore platform, an industrial control room in a harsh
environment. The systems that keep people alive or keep the process running
must make decisions continuously, in real time, with no ability to offload
computation to a remote server. Latency to Earth or to the cloud is too
long, bandwidth is too narrow, availability is not guaranteed.

The question is not "can a neural network classify sensor data on a
microcontroller." That has been answered many times. The question is
"can a microcontroller run a controller intelligent enough to arbitrate
between competing life-critical subsystems under a tight power budget,
using learned models of the system's own dynamics."

That is the question SpikyPanda exists to answer. Everything else,
including the ONNX runtime, the DSP operators, the conformance test
suite, the compute graph engine, the CyanMycelium C++ port, serves this
question.

## What sample 1 actually proved

We built the CO2 scrubbing demo to answer three narrower questions first:

**Can we run a learned dynamics model, a cost function, and a planner
together on the same compute graph?** Yes. The RolloutNode wraps a 401-
parameter neural model, the ObjectiveNode scores trajectories, the
ShootingSelectorNode runs the optimization. The whole thing fits in a
few kilobytes and runs in about 2 ms in the browser. The same compute
graph runs through the SpikyPanda TypeScript runtime and the CyanMycelium
C++ runtime.

**Does the world model concept actually matter, or is threshold control
enough?** The threshold controller and the MPC give nearly identical
results on oversized hardware with a single objective. On degraded
hardware the MPC keeps CO2 about 40 percent lower at the same energy
consumption, or uses less energy at the same CO2. That is a measurable
improvement but not a dramatic one. Both controllers solve the problem.

**Does the cost function shape matter?** Yes, and this was the most
important lesson. With a binary cost (zero below a limit, large above),
the MPC degenerates into a threshold controller because there is no
gradient to follow. Replacing the binary cost with a smooth three-zone
gradient turned the MPC into an actual regulator. This is not a
SpikyPanda specificity. It is a generic property of model predictive
control and it was worth demonstrating concretely.

**Does the training distribution matter?** Yes. When the model was
trained only on oversized hardware, it extrapolated badly on degraded
hardware. Retraining on a distribution that covered all three hardware
regimes restored accurate control in every regime. The world model is
only as good as the breadth of the data it was fit on.

These four findings are documented in
[world-models-and-regulation.md](world-models-and-regulation.md).

## The honest limitation of sample 1

For a single-objective control problem (keep CO2 under a limit), a
properly-tuned PID or a hysteresis threshold produces results very
close to our MPC. The MPC advantage in this specific setup is marginal.

That is the truth and we acknowledge it. Anyone reading the demo can
run the threshold and the MPC back to back, compare the numbers, and
conclude that the machinery we wrapped around a neural network is
overkill for controlling one gas concentration with one actuator.

If the story ended there, SpikyPanda would not be justified. Decades of
classical control theory already solved the single-loop problem.

## Where the real value is

A sealed habitat does not have one controller. It has a dozen of them,
and they are coupled. This is not a software opinion, it is an
architectural fact well documented in the space habitat literature.
Research by Olga Bannova at the University of Houston on lunar and
Martian habitat design shows that the interactions between life support,
thermal management, power allocation, and crew activity define the
habitability envelope more than any single subsystem does in isolation.
The systems cannot be designed independently, and by extension, they
cannot be controlled independently either.

- **CO2 scrubbing** removes carbon dioxide. It draws power.
- **Oxygen generation** splits water electrolytically. It draws power
  and consumes water.
- **Thermal regulation** pumps heat in and out. It draws power and
  depends on the radiator state.
- **Humidity control** condenses water vapor and returns it to the
  potable water loop. It interacts with thermal.
- **Pressure control** adjusts total atmosphere. It interacts with
  leakage and with gas composition.
- **Power management** allocates available energy, which is finite
  because solar input varies and batteries are sized for survival not
  comfort.
- **Crew activity schedule** drives the demand on every one of these
  subsystems, often with hours of advance notice.

Ten subsystems, each with its own dynamics, its own timescale, its own
actuator, its own measurements. They share the energy budget, the water
loop, the atmospheric composition. A local decision in one subsystem
propagates as a constraint on the others.

Classical control theory handles this badly. Independent PID loops tuned
per subsystem fight each other. Static priority schemes ("thermal first,
then CO2, then humidity") are brittle and produce bad outcomes when the
assumed priority is wrong for the current state. Gain scheduling helps
but requires a human engineer to anticipate every regime transition.
Supervisory logic piled on top becomes an unreadable state machine that
nobody dares touch.

What a world model changes is that all these subsystems can share a
single representation of the habitat's state and a single cost function
that expresses what the mission values. One planner then finds the
action sequence (across all actuators, over a planning horizon) that
minimizes the total cost.

This is where MPC earns its weight. It is not in replacing a PID on one
gas. It is in arbitrating between ten coupled subsystems under a hard
energy constraint, with known future disturbances, while respecting
safety margins on each variable.

No threshold controller can do that. No stack of independent PIDs can
do that either, without a brittle supervisor that usually ends up being
its own problem.

## What sample 2 will demonstrate

The next demo will keep CO2 as one of the variables, but it will add:

**A finite energy budget.** Solar input varies over time. Batteries have
limited capacity. The controller has a power envelope and must stay
inside it. If CO2 scrubbing and thermal regulation both want full power
at the same moment, something has to give. The world model picks what
to compromise based on the cost function.

**A second life-critical variable.** Probably thermal, because CO2 and
thermal compete for the same energy budget on a real habitat and the
physics is well documented. The controller has to keep both CO2 and
cabin temperature in their acceptable ranges simultaneously.

**A predictable disturbance.** The crew activity schedule, the solar
cycle, or both. The controller can look ahead and pre-act. A threshold
cannot. A PID cannot. An MPC with a correct dynamics model can.

**A visible failure mode for classical control.** A concrete scenario
where a well-tuned pair of independent PIDs produces a bad outcome
(constraint violation, resource exhaustion, or dangerous oscillation)
while the MPC produces a safe one. Without this, the demo is decorative.

The deliverable is not "another sample". It is the concrete
demonstration, runnable in a browser, that a world-model-based
controller on a microcontroller does something that cannot be replaced
by any combination of classical controllers tuned for each subsystem
in isolation.

## The position this takes

SpikyPanda is not another ONNX runtime. Many exist. It is not a
neural network toolkit either. Many exist.

It is an engine for running coupled, learned world models on
microcontrollers, with a cost function and a planner, closing the
sense-think-act loop inside the device. The CO2 sample established the
machinery. The next sample will establish why the machinery is
necessary rather than just possible.

That is the narrative. Everything we have built so far has earned its
place in it. Everything we build next has to answer: does it help that
specific story? If yes, it ships. If not, it is interesting but not
relevant.

## What comes after sample 2

If the coupled demo succeeds, the next step is hardware. A small
physical analog, probably based on an ESP32 class device, running the
same compute graph, driving real sensors and real actuators in a sealed
enclosure. The browser demo is the proof of software. The hardware
demo is the proof of deployment.

If the coupled demo uncovers something we did not anticipate, we
document it honestly and adjust. That is how the first sample went.
We thought we were proving MPC beats threshold. We proved something
more subtle and in some ways more useful: we proved that the value of
a world model emerges with coupling, not with any single loop. That
finding is what sample 2 has to exploit.
