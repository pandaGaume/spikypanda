# Doctoral Research Prospectus (draft)

## Parameter-Varying Complex-Spectral Models for Compact, Robust Machine and Structural Health Monitoring

**Candidate:** Guillaume Pelletier (DotVision, Houston TX)
**Proposed home:** University of Houston — Mechanical Engineering, Systems & Controls
**Proposed advisor:** Prof. Karolos M. Grigoriadis
**Status:** discussion draft, to be refined with the advisor

---

## 1. One-line thesis

*A structured, complex-valued, frequency-domain model whose modal/band structure is
**scheduled by measurable operating parameters** (slip, speed, load) can match black-box
deep networks on machine- and structure-health diagnosis at **orders of magnitude fewer
parameters**, with **provable robustness** across operating conditions — placing fault
diagnosis squarely inside linear-parameter-varying (LPV) systems theory rather than
generic machine learning.*

---

## 2. Problem and motivation

Condition monitoring of rotating machines and flexible structures is dominated today by
two unsatisfying options. Classical Motor Current Signature Analysis (MCSA) and modal
methods are interpretable and physically grounded but **fragile** under variable speed,
load, and noise. Large deep networks (CNNs/ResNets on spectrograms) are accurate but use
**tens to hundreds of millions of parameters**, require GPUs, and are opaque — impractical
for embedded, edge deployment and hard to certify.

The missing middle is a model that is **compact, interpretable, edge-deployable, and
robust across operating conditions**. The central obstacle to that middle is precisely a
*systems* obstacle: the diagnostic signature is **parameter-varying**. In an induction
motor, broken-rotor-bar faults appear as sidebands at `f(1 ± 2s)`, where the slip `s`
varies with load; in a flexible/aerospace structure, modal frequencies shift with
temperature, prestress, and configuration. The fault information lives at frequencies that
**move with a measurable operating parameter** — the defining situation of LPV systems.

---

## 3. Central idea

Replace the scalar weights of a neural model with **complex transfer functions over a few
frequency bands**, and let those bands be **scheduled by the operating parameter** (slip,
speed, temperature). Concretely:

- Each connection is a complex response `W_b(ρ) = g_b(ρ)·e^{iφ_b(ρ)}`, where `ρ` is the
  real-time-measurable scheduling parameter (LPV form).
- Information is carried on frequency bands (multiplexing) and, crucially, in the
  **coupling** between the carrier and its sidebands — which is exactly the fault mechanism
  (modulation depth ∝ severity).
- Because the latent is complex, **phase** carries information and provides gating.

This makes the diagnostic model a **parameter-varying complex-spectral system**: its
structure encodes the physics (where the fault lives, how it scales), and only a few
coefficients are learned. Structure substitutes for scale.

---

## 4. Why this is a systems & control thesis (fit with the advisor)

This is not incidental to LPV/robust control — it is an LPV problem:

- **LPV scheduling.** The sideband/modal structure is a linear-parameter-varying frequency
  response scheduled by `s`, speed, or prestress. Your LPV synthesis and gain-scheduling
  framework is the natural tool for a diagnosis model valid across the operating envelope,
  rather than retrained per condition.
- **Robustness (H∞ / robust control).** Performance must be guaranteed under noise and at
  light load, where the modulation approaches the noise floor. This is a robust-estimation
  problem, not a curve-fitting one.
- **Stability of two-timescale adaptation.** If the model adapts online (a fast local
  update under a slow regulatory signal), its stability across the parameter range is a
  control-theoretic question — reduced-order and LPV stability tools apply directly.
- **Identifiability / system-ID framing.** "Reading structure vs. fitting data" is a
  system-identification question with formal guarantees.
- **Structural dynamics / aerospace.** The same substrate is the modal skeleton of a
  distributed structure; the tensegrity / micro-gravity structural-health-monitoring angle
  is a second application domain within the same theory.

---

## 5. Preliminary results (already in hand)

This is not a blank start:

- A **published, ultra-compact diagnostic result**: a 4,773-parameter model grading
  5-class broken-rotor-bar severity at 88% (97.3% binary) on public data — small precisely
  because the sideband/envelope physics was made explicit rather than learned.
- **Reproducible mechanism studies** for the proposed substrate: clean frequency
  multiplexing (near-zero cross-talk), controlled and dosable cross-band coupling
  (sidebands tracking modulation depth), phase as an independent information/gating
  channel, and a compact spectral "signature" reproducing a target response with ~64×
  fewer numbers than a time-domain description.
- A **differentiability result**: a smooth frequency-domain blend is learned to numerical
  precision by gradient descent, where a hard discrete gate cannot — motivating the
  substrate over discrete routing.
- A coherent **conceptual framework** (four design decisions) on complex-valued training
  (Wirtinger, phase-preserving activations), state-vs-parameter, and the economics of
  structure-over-scale.

---

## 6. Research questions (bounded and defensible)

- **RQ1 (empirical core).** Can a slip-scheduled complex-spectral model match large deep
  networks on machine fault severity at 100× fewer parameters, and remain accurate across
  the full load range — including the light-load regime where black boxes and classical
  MCSA both degrade? *(Testbed: public MCSA datasets; deployment target: microcontroller.)*
- **RQ2 (systems/theory).** Formulate the substrate as an LPV system: gain-scheduled
  synthesis of its band structure, H∞-style robustness to noise and operating uncertainty,
  and stability of any online adaptation. *(This is the theoretical contribution.)*
- **RQ3 (learning economics).** When does supplying physical structure (a prior) provably
  beat scale/search — and what is the training objective (differentiable inner loop,
  evaluative outer loop) for a partly non-differentiable substrate?
- **RQ4 (stretch / structural HM).** Extend the substrate from rotating machines to
  flexible/aerospace structures (modal, parameter-varying), toward the continuous
  wave-field limit. *(Framed as horizon and future work, not core.)*

---

## 7. Methodology and three-year plan

- **Year 1 — substrate + empirical core.** Complex-valued spectral model with LPV
  scheduling; validate on synthetic parameter-varying signals, then on public MCSA data;
  compare against classical MCSA and compact/large neural baselines. *(RQ1)*
- **Year 2 — systems theory + robustness.** LPV formulation, gain-scheduled synthesis,
  H∞ robustness, stability of online adaptation; extend to a structural-health-monitoring
  case (flexible structure). *(RQ2, RQ3)*
- **Year 3 — consolidation.** Robustness across operating envelopes, edge deployment,
  the structure-vs-scale economics, thesis writing; scope the wave-field horizon. *(RQ3,
  RQ4)*

Expected output: 3–4 archival papers (a compact-diagnosis paper; an LPV-diagnosis-theory
paper; a robustness/edge paper; optionally a structural-HM paper) forming the thesis
chapters, plus the already-published MCSA result as a foundation chapter.

---

## 8. Positioning (honest novelty statement)

The individual ingredients are known — complex-valued networks (Deep Complex Networks),
frequency-domain learned operators (Fourier Neural Operators), classical MCSA, and LPV
control. **The contribution is their synthesis into a parameter-varying complex-spectral
diagnostic substrate, and the demonstrated claim that supplied physical structure can
replace model scale on a real industrial problem — with LPV/robust guarantees rather than
empirical accuracy alone.** The reframing of a diagnostic model as an LPV system, scheduled
by the physical operating parameter, appears to be new and is where systems-and-control
theory becomes the essential (not decorative) tool.

---

## 9. Fit and resources

- **DotVision** provides the application, real hardware and data, an edge-deployment target
  (microcontroller-class), and industrial motivation — an unusually concrete grounding for
  an applied systems PhD, and a natural vehicle for industry-linked funding.
- **UH Systems & Controls** provides the LPV/robust-control theory and rigor that the work
  needs and that the candidate seeks.
- The aerospace / structural-dynamics angle (flexible structures, tensegrity,
  micro-gravity) offers a second application domain within one theoretical frame.

---

*This prospectus is a starting point for a conversation, not a fixed plan. The scope is
deliberately bounded: the defensible core is compact, robust, parameter-varying diagnosis
(RQ1–RQ3); the broader vision of computation-as-process motivates the work and defines its
horizon (RQ4), but is not what the thesis claims to deliver.*
