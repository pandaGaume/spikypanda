import { clamp01 } from "../../../../util/math";
import { IPmsmFaultNode, IPmsmHousingFaultHost, IPmsmMachineFaultHost } from "./PmsmFaultContracts";
import { PMSM_FAULT_PRESENTATION, PmsmFaultType } from "./PmsmFault";

// Rotor imbalance (D1).
//
//   severity              : in [0, 1]. m_b * r_b = severity * kImbalanceMax.
//   kImbalanceMax         : kg.m, the m*r product at severity = 1. Default
//                           5e-6 (5 mg at 1 mm radius), small but visible
//                           on a small-motor bench. Phase 3 calibrates.
//   enableCurrentCoupling : Phase 1 default false. When true (Phase 2),
//                           the centripetal force also modulates the load
//                           torque seen by the speed loop, which leaks
//                           into i_q at 1x f_mech. Phase 1 leaves the
//                           current channel clean to isolate the housing
//                           vibration calibration.
export interface IImbalanceFaultConfig {
    severity: number;
    kImbalanceMax?: number;
    enableCurrentCoupling?: boolean;
    displayName?: string;
    description?: string;
}

// Imbalance fault node.
//
// preStep  : noop in Phase 1. Phase 2 will modulate the load torque to
//            inject the balourd signature into i_q.
// postStep : injects the centripetal force F = m*r*omega^2 onto housing
//            axes y and z, in quadrature to produce a 1x f_mech rotating
//            force. Axis x (shaft axis) sees no force.
export class ImbalanceFault implements IPmsmFaultNode {
    public readonly kind: string = "pmsm.fault.imbalance";
    public readonly type: PmsmFaultType.IMBALANCE = PmsmFaultType.IMBALANCE;
    public readonly cfg: Required<IImbalanceFaultConfig>;

    public constructor(cfg: IImbalanceFaultConfig) {
        const presentation = PMSM_FAULT_PRESENTATION[PmsmFaultType.IMBALANCE];
        this.cfg = {
            severity: clamp01(cfg.severity),
            kImbalanceMax: cfg.kImbalanceMax ?? 5e-6,
            enableCurrentCoupling: cfg.enableCurrentCoupling ?? false,
            displayName: cfg.displayName ?? presentation.displayName,
            description: cfg.description ?? presentation.description,
        };
    }

    public advance(_t: number): void {
        // Stateless contribution; nothing to integrate here.
    }

    public reset(): void {
        // Stateless.
    }

    public preStep(_t: number, _machine: IPmsmMachineFaultHost): void {
        // Phase 1 : current coupling disabled. Phase 2 will modulate load
        // torque or fluxEnvelope at 1x f_mech here.
    }

    public postStep(_t: number, machine: IPmsmMachineFaultHost, housing: IPmsmHousingFaultHost): void {
        const mr = this.cfg.severity * this.cfg.kImbalanceMax;
        if (mr <= 0) return;
        const omega = machine.omegaM;
        const theta = machine.thetaM;
        const F = mr * omega * omega;
        housing.addForce(1, F * Math.cos(theta));
        housing.addForce(2, F * Math.sin(theta));
    }
}
