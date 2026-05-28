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
// (YZ) plane and k_radial is the radial bearing stiffness. The deflection
// shifts the rotor center off the magnetic axis ; the resulting air-gap
// modulation amounts to a static eccentricity in the rotor frame oriented
// along the projection of gravity in the YZ plane :
//
//   epsilon = delta_sag / g_0           (fractional gap modulation)
//   theta_grav = atan2(g_z, g_y)        (azimuth of the sag in body frame)
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
    rotorMass: number; // kg
    bearingRadialStiffness: number; // N/m
    airGap: number; // m, nominal magnetic air-gap
    // Electromagnetic radial stiffness for the rotating UMP component (N/m).
    // As the rotor turns through the eccentric air gap, the interaction of
    // the rotating PM field with the fixed gap asymmetry produces a force
    // that rotates at fMech. Amplitude = umpRadialStiffness * delta_sag.
    // Set to 0 (default) to disable; use MAXON_ECX_PRIME_ENV_DEFAULTS.umpRadialStiffness
    // for a calibrated estimate.
    umpRadialStiffness?: number; // N/m, default 0
    label?: string;
}

export class RotorSagModel implements IPmsmEnvNode {
    public readonly kind: string = "pmsm.env.rotor-sag";
    public readonly cfg: Required<IRotorSagConfig> & { label: string };
    public readonly gravity: GravityVector;

    public constructor(cfg: IRotorSagConfig, gravity: GravityVector) {
        if (cfg.rotorMass <= 0) throw new Error("RotorSagModel: rotorMass must be > 0");
        if (cfg.bearingRadialStiffness <= 0) throw new Error("RotorSagModel: bearingRadialStiffness must be > 0");
        if (cfg.airGap <= 0) throw new Error("RotorSagModel: airGap must be > 0");
        this.cfg = {
            rotorMass: cfg.rotorMass,
            bearingRadialStiffness: cfg.bearingRadialStiffness,
            airGap: cfg.airGap,
            umpRadialStiffness: cfg.umpRadialStiffness ?? 0,
            label: cfg.label ?? "Rotor sag",
        };
        this.gravity = gravity;
    }

    public advance(_t: number): void {
        /* stateless */
    }
    public reset(): void {
        /* stateless */
    }

    public preStep(_t: number, machine: IPmsmMachineFaultHost): void {
        const gPerp = this.gravity.radialMagnitude();
        if (gPerp < 1e-12) return; // microgravity or vertical shaft
        const delta = (this.cfg.rotorMass * gPerp) / this.cfg.bearingRadialStiffness;
        const epsilon = delta / this.cfg.airGap;
        if (epsilon < 1e-12) return;
        const thetaGrav = this.gravity.radialAngle();
        const envelope = 1 + epsilon * Math.cos(machine.thetaM - thetaGrav);
        machine.addFluxEnvelope(envelope);
    }

    // Rotating UMP : the interaction of the spinning PM field with the fixed
    // air-gap asymmetry produces a radial force component that rotates at
    // fMech. Injected into the housing so accel_y / accel_z carry a 1x peak.
    // Skipped when umpRadialStiffness is zero (default backward-compat mode).
    public postStep(
        _t: number,
        machine: import("../faults/PmsmFaultContracts").IPmsmMachineFaultHost,
        housing: import("../faults/PmsmFaultContracts").IPmsmHousingFaultHost
    ): void {
        if (!this.cfg.umpRadialStiffness) return;
        const gPerp = this.gravity.radialMagnitude();
        if (gPerp < 1e-12) return;
        const delta = (this.cfg.rotorMass * gPerp) / this.cfg.bearingRadialStiffness;
        if (delta < 1e-12) return;
        const F = this.cfg.umpRadialStiffness * delta;
        const theta = machine.thetaM - this.gravity.radialAngle();
        // Body frame: X = shaft axis, Y and Z = radial (axes 1 and 2 in housing).
        housing.addForce(1, F * Math.cos(theta));
        housing.addForce(2, F * Math.sin(theta));
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
