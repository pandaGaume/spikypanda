═══════════════════════════════════════════════════════════════════════
PART 1 — EMAIL (peer register — paste as the message body)
Salutation is left open: use first names / whichever colleague.
═══════════════════════════════════════════════════════════════════════

Subject: Where the motor / micro-g thread is leading — computation as a process, not stored weights

[Karolos —]

A follow-on to the motor and micro-gravity work you already know. My thinking has moved
somewhere I'd like your systems read on before I over-commit to it — and I'd rather you
tear it apart than nod at it.

The seed is in the broken-rotor-bar result: the reason a ~4.8k-parameter model holds its
own against million-parameter black boxes is that the physics — the sideband / envelope
structure — is made *explicit* rather than learned. I've been asking how far that goes if
you make it the *substrate* instead of a preprocessing step. Let the unit of computation
be a complex transfer function over a few frequency bands. Then information rides on bands
(multiplexing — modes sharing a structure), behavior lives in the *coupling* between them
(sidebands / cross-frequency modulation), and because the latent is complex, phase carries
information and gates without a switch. I have small, reproducible experiments behind each
piece.

That much is "only" a better representation. The part I actually want to argue with you
about is the reframe underneath: a trained network *stores weights* — the frozen trace of
learning that already happened — whereas a dynamical system has *state* evolving under its
dynamics. Biology is the latter (efficacy is state, maintained by a process and encoded by
a compact rule; generating the weights already assumes the memory acquired). So: could a
learner be built as a *driven dynamical process* — in the limit, a complex field under
wave-like dynamics (Helmholtz / damped wave) — rather than a stored map? That's a controls
and structures question far more than an ML one: stability of fast/slow dynamics,
reduced-order modal representations, identifiability. It's also oddly close to your world —
a tensegrity, or a deployable micro-g structure, whose "behavior" is nothing but its
coupled modal dynamics.

Two pages attached that lay it out cleanly. Coffee to pick it apart?

— G


═══════════════════════════════════════════════════════════════════════
PART 2 — ATTACHED NOTE (1–2 pages)
═══════════════════════════════════════════════════════════════════════

# Computation as a frequency-domain process
### Neural networks built more like dynamical systems than lookup tables

*Guillaume Pelletier — working note.*

---

## A structure that computes without storing anything

A tensegrity structure — or a deployable micro-gravity structure — stores its behavior
nowhere. What it "does" emerges from the coupled dynamics of its modes: excite it, and
energy flows through eigenfrequencies, each with an amplitude and a phase, coupling when
the response is nonlinear. No table of numbers; the structure simply *is* a dynamical
system with a characteristic frequency response.

An artificial neural network is the opposite: behavior is stored explicitly, as a large
table of scalar weights fixed once by training, and at inference the network replays a
stored map.

The question here: **what if we built the network like the structure** — the unit of
computation a transfer function, information carried on frequency bands, the useful
behavior living in the coupling between them?

## 1. The unit is a transfer function, not a weight

Replace the scalar weight on each connection with a **complex transfer function over a few
bands**: `W_b = g_b · e^{iφ_b}` — a gain and a phase per band. Your vocabulary, not ML's.
A connection no longer multiplies by a number; it *shapes* a signal. Two consequences,
each checked in small reproducible experiments:

- **Multiplexing.** Several signals ride the same connection on distinct bands and separate
  cleanly at the output — superposition plus filtering, no discrete routing decision.
  On-bin, cross-talk sits at the numerical-noise floor; off-bin there is a clean density
  limit one can map. Modes sharing a medium.
- **Coupling.** When bands interact *nonlinearly* (one modulating another), energy appears
  at sum/difference frequencies — sidebands — and it is controllable: sideband amplitude
  tracks modulation depth. Cross-frequency coupling; intermodulation, in your terms. This
  is where computation beyond parallel channels lives.

## 2. Why complex — phase is not a detail

The latent is naturally complex (amplitude *and* phase). Phase then carries information and
routes: two sources add constructively or destructively by relative phase — a gate with no
switch. A magnitude-only representation is blind to this; a complex-valued network is not.
This is exactly the regime — vibration, RF, modal dynamics — where complex-valued networks
and Fourier neural operators need fewer parameters for equivalent expressiveness. Training
is standard CVNN: complex weights `A + iB`, Wirtinger gradients, phase-preserving
activations.

## 3. The anchor you already know

The broken-rotor-bar result — a 4,773-parameter model at 88% on public data — is small
precisely because the sideband / envelope physics was made explicit rather than learned.
The substrate here makes that structure the computing *primitive* rather than a
preprocessing step: bands at the `f(1 ± 2s)` sidebands, coupling = modulation depth =
severity, read natively in the complex domain. Same logic, pushed down a level — and a
clean testbed for "structure provided" vs. "structure learned."

## 4. The reframe — in systems language

A trained network stores weights: the frozen trace of past learning. A dynamical system
does not store its response — it has *state* evolving under its dynamics. Biology is closer
to the latter: synaptic efficacy is *state*, continuously maintained by a process (events
plus slow chemical regulation), encoded by a compact developmental rule — not a parameter
set once. Sharply: *generating the weights assumes the memory already acquired.*

So the target is to treat the network less as a stored map and more as a **driven dynamical
process** — in the limit a complex field under wave-like dynamics (Helmholtz, or a damped
wave equation), where superposition, propagation, and resonance are *intrinsic* rather than
learned indirectly. The discrete "bands + coupling + phase" are the **modal skeleton** of
such a field; the field is its continuous limit. A deployable micro-g structure is, in this
sense, already a computer whose behavior is only its coupled modal dynamics.

This is where systems analysis is the missing toolkit, not a metaphor:
- **stability** of a two-timescale process (fast state / slow regulation);
- **reduced-order modal representations** of the latent field;
- **identifiability** — a system-ID framing of "reading structure" vs. "fitting data";
- the latent as a **distributed system**, not a lookup table.

## Honestly

A handful of small, reproducible results and one real diagnostic anchor — not a finished
theory, and not yet trained at scale. Several mechanisms restate textbook signal-processing
and structural-dynamics facts; the wager is in their *assembly* into a computing substrate,
and in the "state, not stored weight" reframing. The sharpest questions should come from a
controls / systems view — which is why I'm bringing it to you first.

*Touchpoints: Fourier Neural Operators (Li et al., 2021); Deep Complex Networks (Trabelsi
et al., 2018); Physics-Informed Neural Networks (Raissi et al., 2019); cross-frequency
coupling in the neuroscience of oscillations.*
