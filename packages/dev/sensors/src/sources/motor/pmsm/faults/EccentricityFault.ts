import { clamp01 } from "../../../../util/math";
import { IPmsmFaultNode, IPmsmMachineFaultHost } from "./PmsmFaultContracts";
import { PMSM_FAULT_PRESENTATION, PmsmFaultType } from "./PmsmFault";

// Static air-gap eccentricity (D4).
//
//   severity    : in [0, 1]. epsilon = severity * epsilonMax. epsilon is
//                 the fractional gap modulation amplitude
//                 (delta_static / g_0).
//   epsilonMax  : maximum fractional gap modulation at severity = 1.
//                 Default 0.5 (rotor offset = half the air gap, beyond
//                 which contact would occur).
//   thetaOffset : azimuthal angle of the eccentricity in the rotor frame
//                 (rad). Default 0 (offset on the d axis).
export interface IEccentricityFaultConfig {
    severity: number;
    epsilonMax?: number;
    thetaOffset?: number;
    displayName?: string;
    description?: string;
}

// Eccentricity fault node.
//
// preStep  : multiplies the rotor flux envelope by (1 + epsilon * cos(
//            theta_m - thetaOffset)) on every machine integration cycle.
//            The envelope variation at 1x f_mech produces sidebands at
//            f_e +/- f_mech in i_d / i_q after the controller's response.
// postStep : noop. The mechanical effect of static eccentricity is
//            already captured through the radial flux modulation; no
//            additional housing force is injected.
export class EccentricityFault implements IPmsmFaultNode {
    public readonly kind: string = "pmsm.fault.eccentricity";
    public readonly type: PmsmFaultType.ECCENTRICITY = PmsmFaultType.ECCENTRICITY;
    public readonly cfg: Required<IEccentricityFaultConfig>;

    public constructor(cfg: IEccentricityFaultConfig) {
        const presentation = PMSM_FAULT_PRESENTATION[PmsmFaultType.ECCENTRICITY];
        this.cfg = {
            severity: clamp01(cfg.severity),
            epsilonMax: cfg.epsilonMax ?? 0.5,
            thetaOffset: cfg.thetaOffset ?? 0,
            displayName: cfg.displayName ?? presentation.displayName,
            description: cfg.description ?? presentation.description,
        };
    }

    public advance(_t: number): void {
        // Stateless.
    }

    public reset(): void {
        // Stateless.
    }

    public preStep(_t: number, machine: IPmsmMachineFaultHost): void {
        const epsilon = this.cfg.severity * this.cfg.epsilonMax;
        if (epsilon <= 0) return;
        const envelope = 1 + epsilon * Math.cos(machine.thetaM - this.cfg.thetaOffset);
        machine.addFluxEnvelope(envelope);
    }
}
