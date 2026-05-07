import { IPmsmMachineFaultHost } from "../faults/PmsmFaultContracts";
import { GravityVector } from "./GravityVector";
import { IPmsmEnvNode } from "./IPmsmEnvNode";

// Static rotor sag under gravity. The rotor weight deflects the shaft
// in the direction of the gravity component perpendicular to the shaft
// axis :
//
//   delta_sag = m_rotor * g_perp / k_radial
//
// where g_perp is the magnitude of the body-frame gravity in the rotor
// (XY) plane and k_radial is the radial bearing stiffness. The deflection
// shifts the rotor center off the magnetic axis ; the resulting air-gap
// modulation amounts to a static eccentricity in the rotor frame oriented
// along the projection of gravity in the XY plane :
//
//   epsilon = delta_sag / g_0           (fractional gap modulation)
//   theta_grav = atan2(g_y, g_x)        (azimuth of the sag in body frame)
//   flux_envelope(theta_m) = 1 + epsilon * cos(theta_m - theta_grav)
//
// This produces a 1x f_mech sideband on i_d / i_q after the FOC controller
// reacts. It vanishes in three regimes that matter for the proposal :
//   - microgravity (g_world = 0) : g_perp = 0, no envelope.
//   - shaft along gravity (verticalUp / verticalDown) : g_perp = 0, idem.
//   - rigid bearing (k_radial -> infty) : delta_sag -> 0.
//
// Composes multiplicatively with EccentricityFault (D4) when both are
// active. The two contributions add in the eccentricity vector.
export interface IRotorSagConfig {
    rotorMass: number;              // kg
    bearingRadialStiffness: number; // N/m
    airGap: number;                 // m, nominal magnetic air-gap
    label?: string;
}

export class RotorSagModel implements IPmsmEnvNode {
    public readonly kind: string = "pmsm.env.rotor-sag";
    public readonly cfg: Required<Omit<IRotorSagConfig, "label">> & { label: string };
    public readonly gravity: GravityVector;

    public constructor(cfg: IRotorSagConfig, gravity: GravityVector) {
        if (cfg.rotorMass <= 0) throw new Error("RotorSagModel: rotorMass must be > 0");
        if (cfg.bearingRadialStiffness <= 0) throw new Error("RotorSagModel: bearingRadialStiffness must be > 0");
        if (cfg.airGap <= 0) throw new Error("RotorSagModel: airGap must be > 0");
        this.cfg = {
            rotorMass: cfg.rotorMass,
            bearingRadialStiffness: cfg.bearingRadialStiffness,
            airGap: cfg.airGap,
            label: cfg.label ?? "Rotor sag",
        };
        this.gravity = gravity;
    }

    public advance(_t: number): void { /* stateless */ }
    public reset(): void { /* stateless */ }

    public preStep(_t: number, machine: IPmsmMachineFaultHost): void {
        const gPerp = this.gravity.radialMagnitude();
        if (gPerp < 1e-12) return;            // microgravity or vertical shaft
        const delta = this.cfg.rotorMass * gPerp / this.cfg.bearingRadialStiffness;
        const epsilon = delta / this.cfg.airGap;
        if (epsilon < 1e-12) return;
        const thetaGrav = this.gravity.radialAngle();
        const envelope = 1 + epsilon * Math.cos(machine.thetaM - thetaGrav);
        machine.addFluxEnvelope(envelope);
    }

    // Diagnostic accessors used by tests and metadata exporters.
    public currentEpsilon(): number {
        const gPerp = this.gravity.radialMagnitude();
        if (gPerp < 1e-12) return 0;
        return (this.cfg.rotorMass * gPerp) / (this.cfg.bearingRadialStiffness * this.cfg.airGap);
    }

    public currentDeltaSag(): number {
        return (this.cfg.rotorMass * this.gravity.radialMagnitude()) / this.cfg.bearingRadialStiffness;
    }
}
