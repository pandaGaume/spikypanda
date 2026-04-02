# Prior Art Research — Microgravity Vibration Diagnostic Model for DC Motors

**Date**: April 2, 2026

## Summary

A thorough literature and project search confirms that **no published work exists** at the intersection of vibration-based motor fault detection and microgravity validation. The proposed experiment (training a fault classification model on Earth, validating it at 0g) appears to be **original and unexplored**.

## Search Results by Topic

| Question | Finding |
|---|---|
| Vibration model trained on Earth, validated in 0g? | **No published work found** — this is a gap |
| ISS / CubeSat mission for motor vibration predictive maintenance? | **None.** ISS has vibration isolation (CDL, MAVIS) and CMG monitoring, but no dedicated motor PdM experiment |
| Experimental data on microgravity effect on motor vibration signatures? | **Theoretically understood** (bearing load redistribution, lubricant behavior, accelerometer baseline shift) but **never experimentally validated** with vibration data |
| Single-orientation vs multi-orientation training comparison? | **No direct comparison.** Virtual sensor augmentation via coordinate rotation (MDPI 2021) is closest, showing +44-49% validation accuracy improvement |
| Edge AI / embedded ML for predictive maintenance in space? | **Active area** (Phi-Sat-2, FEDGE, La Jument, JPL, TinyML) but never applied to motor vibration diagnostics in orbit |

## Closest Related Work

### Fault Detection in Space Systems
- **ReLAA** — Idaho National Laboratory, *npj Microgravity* (2023). Reinforcement learning agent trained against a digital twin of a space habitat thermal control system for fault detection. Not motor-specific.
- **NASA ISHM** — Integrated System Health Management program, including ADTM (Anomaly Detection via Topological-feature Map) at NASA Ames for real-time spacecraft anomaly detection.
- **NASA Reaction Wheel Optimization** — Documents bearing surface lubricant redistribution creating detectable vibration deviations over time in CMGs/reaction wheels.

### Orientation Effects on Vibration Diagnostics
- **Virtual Sensor Data Augmentation via Coordinate Rotation** — MDPI Mathematics (2021). Mathematically rotating accelerometer coordinate frames to simulate different sensor orientations. Reports 44-49% validation accuracy improvement. Directly relevant to the multi-axial training concept.
- **Gravity Acceleration Decomposition (GAD) Method** — MDPI Applied Sciences (2024). Explicitly addresses how gravity orientation affects accelerometer signals on rotating machinery.

### Edge AI for Space
- **Phi-Sat-2 (ESA)** — Onboard AI on a 6U CubeSat using Intel Movidius Myriad 2.
- **FEDGE Framework** — Federated learning for satellite constellations, targeting predictive maintenance and anomaly detection.
- **TinyML Motor PdM (terrestrial)** — Renesas and Syntiant demonstrations of vibration anomaly detection on microcontrollers. Compatible hardware with space deployment but never flown for motor diagnostics.

### Microgravity Vibration Environment
- **NASA TM-2018-220075** — Spacecraft micro-vibration from reaction wheels, cryocoolers, and rotating equipment. Focuses on structural response, not fault detection.
- **MAVIS** — *npj Microgravity* (2024). Active vibration isolation system flight-tested on the Chinese Space Station.

## Conclusion

The building blocks exist on both sides — mature vibration ML models on Earth, and emerging edge AI platforms in space — but no one has connected them. This represents a genuine, publishable research opportunity with clear novelty.
