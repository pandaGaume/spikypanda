# HELIOS - Conference presentation draft

*Draft for presenting the HELIOS project at academic and industry conferences, prepared at the request of the University of Houston. Contains a submission-ready abstract and an extended description for the talk itself. Founder names are included by design, since this is a public-facing presentation document.*

---

## Title

**HELIOS: An Open Source Digital Twin for Closed-Loop Life Support Simulation, Distributed Autonomy, and Crew Training**

Alternative shorter title for constrained formats:

**HELIOS: Distributed Autonomous Agents for Closed-Loop Life Support**

---

## Founding team

The project is structured as a joint academic and industry effort.

**University of Houston**

- Dr. Grigoriadis [first name and exact department/title to confirm before submission]
- Dr. Chen [first name and exact department/title to confirm]
- Alizée Pelletier [program/affiliation to confirm: Space Architecture / SICSA or Mechanical Engineering]

**Industry**

- Guillaume Pelletier, SpikyPanda / CyanMycelium
- Ali Nehme [affiliation to confirm]
- Ferdinand Sellin [affiliation to confirm]

[Note for the team: complete the first names, titles, and exact affiliations before any conference submission. Most venues require full author identification.]

---

## Abstract (submission-ready, ~250 words)

HELIOS is an open source digital twin for environmental control and life support systems in lunar and Martian habitats. It addresses a gap in current simulation tooling. High-fidelity computational fluid dynamics is accurate but too slow for interactive use or crew training. Lightweight behavioral models are interactive but not physically credible enough for validation. HELIOS targets the space between them, with credible compartmental physics, distributed autonomous agents, and a real-time VR/AR experience layer.

The reference application simulates a complete closed loop that converts exhaled CO2 into methane and oxygen through the Sabatier reaction coupled with water electrolysis. Twenty-eight autonomous agents are distributed across the process equipment for monitoring, safety, and optimization, with six agents on the Sabatier reactor alone. The same agents deploy without modification on microcontrollers, in an Unreal Engine digital twin, or in the design environment. A language-model scenario director generates adaptive crisis training scenarios through a bounded protocol that never touches the physics integration or the safety agents.

HELIOS is released under a permissive open source license and is designed to contain no export-controlled content, which enables international academic collaboration. The project combines research direction from the University of Houston in control systems and space architecture with a simulation framework and runtime contributed by industry partners.

The presentation covers the system architecture, the agent distribution methodology, the three-runtime deployment topology, and the research directions the platform supports: distributed agent arbitration with safety guarantees, physics-informed surrogate models, and human-AI collaboration in spacecraft operations.

---

## Extended description (for the talk and handouts)

### The problem

Long-duration crewed missions to the Moon and Mars require closed-loop life support. A 30-day lunar mission can rely on resupply. A 900-day Mars mission cannot. Closing the loop means recycling water, recovering respiratory oxygen through the carbon cycle, and ideally producing propellant from local processes.

The chemical core of this closure is the Sabatier reaction, discovered by Paul Sabatier in 1902. It combines carbon dioxide and hydrogen over a metallic catalyst to produce methane and water. Coupled with water electrolysis, it forms a complete cycle: electrolysis splits water into hydrogen and oxygen, Sabatier recombines carbon dioxide and hydrogen back into methane and water. The oxygen supports the crew, the methane becomes fuel, the water returns to the cycle. This is the process NASA targets for Mars architectures under the ECLSS Forward program.

Designing, validating, and operating such a system needs a simulation tool that current options do not provide. High-fidelity CFD is accurate but a full-loop simulation over 24 hours takes hours of cluster computation, which rules out interactive supervision or crew training. Simplified behavioral simulations run in real time but lack rigorous conservation and realistic kinetics, which rules out validation. HELIOS is built for the unoccupied middle ground.

### The HELIOS concept

HELIOS is a digital twin of a closed-loop life support process, built on three technical pillars.

The first pillar is a deterministic physical simulation. The process is modeled as a graph of stateful compartments, each carrying explicit internal state and a rate-of-change function. Per-species mass conservation, energy conservation, and operational safety constraints are verified at every integration step. The solver scales from an adaptive Runge-Kutta scheme at low fidelity to stiff implicit methods when the Arrhenius kinetics of the Sabatier reaction demand it.

The second pillar is a distributed agent layer. Twenty-eight autonomous agents are placed across the process equipment, following criticality rather than equipment complexity. The Sabatier reactor concentrates six agents, including a safety agent with absolute authority that is the only one permitted to trigger an emergency shutdown. Three cross-node agents enforce global conservation invariants. Agents are not uniformly machine learning models: some are deterministic formulas, some are rules, some are neural networks, chosen by what is physically justified.

The third pillar is a real-time experience layer. An Unreal Engine plugin exposes the system in virtual reality, then augmented reality, with research-grade instrumentation built in for user studies. A language-model scenario director generates adaptive crisis training scenarios. The language model acts as a game master: it injects faults, redefines objectives, and simulates ground communications through a bounded protocol, but it never controls the physics or overrides a safety agent. The boundary is explicit. The model simulates the decision environment, it does not take the technical decision in place of the system.

### Deployment

HELIOS uses a three-runtime deployment topology connected by a single portable format. A design environment handles agent training and validation. A microcontroller runtime deploys the agents on physical hardware, with portable code ready for the next generation of spaceflight processors. An Unreal Engine runtime hosts the digital twin for demonstration and training. The same agent definitions move across all three without modification.

### Open source and collaboration model

HELIOS is open source from the first commit under a permissive license. It is designed to contain no export-controlled content, which preserves the ability for international contributors to participate and for the project to be hosted publicly.

The collaboration model is deliberately dual. The University of Houston contributes research direction in control systems and space architecture. Industry partners contribute the underlying simulation framework and runtime, drawn from the existing SpikyPanda and CyanMycelium open source stack. This structure lets academic research and deployable engineering develop together rather than in sequence, which matters for a system whose research questions only become concrete once the engineering substrate exists.

The platform is instrumented for academic reuse: reproducible by seed, structured logging, bit-exact replay, versioned reference configurations. A laboratory can use HELIOS as a research framework without depending on the original authors.

### Research directions the platform enables

HELIOS is a platform, not a fixed research program. The directions below are made possible by the platform; the choice belongs to each research team.

Distributed agent arbitration on safety-critical systems is the most immediate. The case of six independent agents on a single reactor poses a formal problem of hierarchical arbitration with provable safety properties.

Physics-informed surrogate models are a second direction. Neural surrogates can accelerate exploration by orders of magnitude, but a surrogate that violates mass conservation is unacceptable for life support. Building surrogates that respect conservation invariants over mission-length horizons is an open problem.

Human-AI collaboration in spacecraft operations is a third. The VR/AR layer with its scenario director is an instrument for studying how crews supervise and intervene in autonomous systems under stress, which connects directly to the concerns of NASA's Human Research Program.

### Current status and roadmap

[To be completed by the team with the honest current state. Suggested framing: state what is implemented, what is in progress, what is planned. Do not describe planned work as if it were achieved. A conference audience values an honest status more than an inflated one.]

The roadmap follows a phased plan, from the simulation framework foundations through the agent runtime, the Unreal experience layer, the scenario director, and the rise in physical fidelity. The full thirteen-sprint roadmap is documented in the project repository.

### Conclusion

HELIOS treats closed-loop life support as a problem that needs a shared, open, and credible simulation substrate before its harder research questions can be addressed. The project invites collaboration from academic laboratories, aerospace industry partners, and individual contributors.

---

## Contact and resources

- Project repository: github.com/iofmars/helios [active once the organization is created]
- Project site: helios.iofmars.com [in development]
- Contact: contact@iofmars.com
- License: Apache 2.0

---

## Notes for conference submission

Different venues need different formats. This draft supports several:

For a poster or short abstract submission, use the abstract section alone, trimmed to the venue word limit (often 150 to 300 words).

For an oral presentation, the extended description maps roughly to a 15 to 20 minute talk. One section per two or three slides.

For a full paper, the extended description is a skeleton. Each pillar and each research direction needs to be developed with references, comparison to prior art, and quantitative results where available.

Relevant venues to consider, by community:

- Aerospace and life support: AIAA SciTech, International Conference on Environmental Systems (ICES), International Astronautical Congress (IAC).
- Control and autonomy: IFAC World Congress, IEEE Conference on Decision and Control, American Control Conference.
- Space architecture: the SICSA community and related habitat design venues.
- Human factors: Human Factors and Ergonomics Society, if the VR/AR crew training work is the focus.

ICES is probably the most natural first target, since it is the dedicated venue for environmental control and life support systems and the audience maps exactly to the project.

[Verify before submission: full author names and affiliations, current project status section, any claim that depends on work not yet completed.]
