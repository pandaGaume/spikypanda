import { GravityVector } from "./GravityVector";
import { IPmsmEnvNode } from "./IPmsmEnvNode";

// Gravity-modulated bearing preload. The nominal preload set at assembly
// (F_a_0 axial, F_r_0 radial) is augmented by the gravitational load
// projected onto the bearing axes :
//
//   F_a_eff = F_a_0 + m_rotor * g_axial      (axial : along shaft / body X)
//   F_r_eff = F_r_0 + m_rotor * g_radial     (radial : in body YZ plane)
//
// Phase 1 has no consumer (bearing race fault D2 is Phase 2). The model
// is in place so :
//   1. Future BearingRaceFault (D2) can read the effective preloads to
//      modulate its BPFI / BPFO amplitudes.
//   2. Probes / metadata exporters can record the operating-point preload
//      values into the dataset for stratified analysis.
//
// This is the "bearing preload" mechanism described in proposal section
// 1.2 ; gravity orientation changes the contact angle and the rolling-
// element load distribution, hence the harmonic structure of the bearing
// signature. We capture only the F_a / F_r magnitudes here ; the
// translation into contact angle alpha_eff and into BPFI / BPFO offsets
// belongs to BearingRaceFault.
export interface IBearingPreloadConfig {
    rotorMass: number; // kg
    nominalAxialPreload: number; // N
    nominalRadialPreload: number; // N
    label?: string;
}

export class BearingPreloadModel implements IPmsmEnvNode {
    public readonly kind: string = "pmsm.env.bearing-preload";
    public readonly cfg: Required<Omit<IBearingPreloadConfig, "label">> & { label: string };
    public readonly gravity: GravityVector;

    public constructor(cfg: IBearingPreloadConfig, gravity: GravityVector) {
        if (cfg.rotorMass <= 0) throw new Error("BearingPreloadModel: rotorMass must be > 0");
        this.cfg = {
            rotorMass: cfg.rotorMass,
            nominalAxialPreload: cfg.nominalAxialPreload,
            nominalRadialPreload: cfg.nominalRadialPreload,
            label: cfg.label ?? "Bearing preload",
        };
        this.gravity = gravity;
    }

    public advance(_t: number): void {
        /* stateless */
    }
    public reset(): void {
        /* stateless */
    }

    // Phase 1 : preStep is a no-op (no consumer). preStep is here so
    // future Phase 2 wiring can hook into the contract uniformly.
    public preStep(_t: number, _machine: import("../faults/PmsmFaultContracts").IPmsmMachineFaultHost): void {
        // Reserved for Phase 2 BearingRaceFault parameter feed-through.
    }

    // Effective preloads at the current operating point. Read by
    // metadata exporters and (Phase 2) by BearingRaceFault.
    public effectiveAxialPreload(): number {
        const gAxial = this.gravity.motorFrameGravity().x;
        return this.cfg.nominalAxialPreload + this.cfg.rotorMass * gAxial;
    }

    public effectiveRadialPreload(): number {
        return this.cfg.nominalRadialPreload + this.cfg.rotorMass * this.gravity.radialMagnitude();
    }
}
