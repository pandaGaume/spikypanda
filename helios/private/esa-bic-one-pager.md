# DotVision

## Adapting industrial predictive-maintenance AI to microgravity operations

**Request to the ESA BIC: an incubation seat and the 60 k€ grant.**

---

### Opportunity

Space hardware depends on rotating machinery: pumps, compressors, fans, electrolyzer drives, scrubber motors, water-recovery systems. Failures of this equipment have been a recurring issue on the ISS and will be more critical on long-duration missions where resupply is limited. The ESA Gateway, the commercial stations replacing the ISS, and Mars architectures all need predictive maintenance that catches degradation early.

Industrial predictive maintenance has matured on Earth over the past decade, using motor current signature analysis (MCSA), vibration patterns and other modalities to detect faults before failure. DotVision works in this field and has documented research on the topic.

A specific technical gap stands in the way of bringing these methods directly into space. Microgravity changes the physics of fault detection: lubrication behavior, debris settling, vibration propagation and thermal coupling are different. Earth-trained models do not transfer unchanged. Our own published work documents this effect quantitatively: gravity amplifies the visibility of certain fault signatures, microgravity attenuates them. This finding raises a precise research and engineering question.

### The project

The 60 k€ funds a focused technical project: characterizing how DotVision's existing predictive-maintenance models behave in microgravity, and adapting them to recover operationally useful performance in that regime.

The work covers:

- Quantifying the gap between Earth-trained and microgravity-relevant performance, using existing test data and accessible microgravity datasets.
- Adapting the model architectures (signal processing, feature extraction, embedded inference) to compensate for the physical effects gravity imposes.
- Validating on a representative rotating-machinery setup, with the adapted models running on the CyanMycelium embedded AI runtime that DotVision already deploys.
- Documenting the methodology and the results so they are reusable by the ESA technical community.

Deliverable at the end of incubation: a demonstrator predictive-maintenance agent, microgravity-adapted, running on representative space-grade-target hardware, with characterized accuracy under gravity-varying conditions.

### Why DotVision

DotVision designs and deploys industrial predictive-maintenance AI. The SpikyPanda graph framework and the CyanMycelium embedded-AI runtime are operational technology, not roadmap items. Our MCSA work is documented in a research paper, and our results on gravity effects on fault signatures provide the empirical starting point for this project. The work proposed here is an adaptation of working capability, which is what 60 k€ realistically funds.

### HELIOS as the medium-term integration platform

DotVision is developing HELIOS, an open-source digital twin platform for closed-loop life support systems. HELIOS includes a distributed agent architecture in which predictive-maintenance agents on rotating machinery are first-class components, alongside thermal, chemical and safety agents on the same loop.

The work funded by this incubation feeds directly into HELIOS as the future integration target. The microgravity-adapted maintenance models become a HELIOS agent family. The validation methodology becomes the qualification approach for other agent families. HELIOS is the broader experimentation terrain DotVision intends to develop in the medium term, with European space primes, agencies and academic partners.

### Business model

Open-core. The HELIOS platform and the adapted maintenance models are open source. Revenue comes from custom integration on specific space platforms (instrumenting a pump, scrubber or electrolyzer for a given operator), validation services, and specialized commercial modules. DotVision's existing Earth-side industrial customers continue to fund baseline activity during incubation.

Target space customers: European primes (Airbus Defence and Space, Thales Alenia Space, OHB), ECLSS integrators, agencies, and commercial habitat operators (Axiom, Vast, Starlab).

### Team and academic collaborations

DotVision develops this work through two academic research collaborations. The National and Kapodistrian University of Athens contributes to the mathematical models underpinning fault-signature analysis, the numerical methods and the spectral analysis. The University of Houston contributes control systems and space architecture expertise, the latter through its Sasakawa International Center for Space Architecture.

The founding team combines industrial AI engineering and the space domain. [Team members and roles to confirm before the meeting: Guillaume Pelletier, Ali Nehme, Ferdinand Sellin.]

### What DotVision seeks from the ESA BIC beyond the grant

- Access to the ESA technical network and the ECLSS and Operations communities.
- Access, where possible, to microgravity datasets and facilities (parabolic flights, drop towers).
- Credibility with European primes and operators.
- Business development support to convert the demonstrator into a first paid integration.

### Contact

helios.iofmars.com | contact@iofmars.com | Open source under Apache 2.0

---

*Notes for Guillaume, not part of the one-pager:*

- *Confirm DotVision's ESA BIC eligibility (country of establishment, company age cap, usually 5 years).*
- *Confirm team names and roles.*
- *Athens partner confirmed as NKUA. Confirm collaboration scope.*
- *Microgravity data access: identify what DotVision can use (ESA parabolic flights, Bremen drop tower, ISS archives via ESA). If access requires the BIC's help, mention it explicitly during the meeting as a leverage point.*
- *Cite the DotVision MCSA paper specifically if published or submitted. Even "submitted to [journal]" is a strong credibility signal.*
- *This version narrows the ambition from full HELIOS-now to microgravity maintenance now + HELIOS medium-term. More credible for a BIC evaluator at 60 k€.*
- *If you want a designed one-page PDF, it can be produced from this content.*
