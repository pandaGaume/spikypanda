import { Cartesian3 } from "@spiky-panda/core";
import { IPmsmHousingFaultHost } from "../faults/PmsmFaultContracts";
import { GravityVector } from "./GravityVector";
import { IPmsmEnvNode } from "./IPmsmEnvNode";

// Mounting compliance under static gravity load.
//
// The motor as a whole has a mass m_motor that hangs from a flexible
// bracket. Gravity exerts a static load F = m_motor * g_body on the
// bracket, which deflects the housing along the gravity direction (in
// body coordinates). Phase 1 : we model this as a static force injected
// into HousingMechanics on each tick. The housing dynamics deflect under
// the load and then hold a static offset ; the per-axis acceleration
// returns to zero at steady state because the spring balances gravity.
//
// What is observable :
//   - Initial transient (housing oscillates as gravity is "applied" at
//     t = 0) on the vibration channels.
//   - Steady-state position offset (visible if a position probe is added,
//     not implemented in Phase 1).
//   - In a sweep of orientations, each orientation produces a different
//     transient signature ; combined with bracket modal frequencies that
//     depend on the static loading (Phase 3 refinement), this is the
//     "mounting resonance" gravito-coupled mechanism of proposal 1.2.
//
// Phase 1 : F = m_motor * g_body each tick. Static force, no oscillation.
// Phase 3 will add orientation-dependent stiffness modulation
// (k_eff(orientation) = k_0 * (1 + gamma * g_axis / g_0)).
export interface IMountingComplianceConfig {
    motorMass: number;     // kg, total motor mass hanging on the bracket
    label?: string;
}

export class MountingComplianceModel implements IPmsmEnvNode {
    public readonly kind: string = "pmsm.env.mounting-compliance";
    public readonly cfg: Required<Omit<IMountingComplianceConfig, "label">> & { label: string };
    public readonly gravity: GravityVector;

    public constructor(cfg: IMountingComplianceConfig, gravity: GravityVector) {
        if (cfg.motorMass <= 0) throw new Error("MountingComplianceModel: motorMass must be > 0");
        this.cfg = {
            motorMass: cfg.motorMass,
            label: cfg.label ?? "Mounting compliance",
        };
        this.gravity = gravity;
    }

    public advance(_t: number): void { /* stateless */ }
    public reset(): void { /* stateless */ }

    public postStep(_t: number, _machine: import("../faults/PmsmFaultContracts").IPmsmMachineFaultHost, housing: IPmsmHousingFaultHost): void {
        const g = this.gravity.motorFrameGravity();
        const m = this.cfg.motorMass;
        // Static gravitational load on the bracket, body-frame.
        housing.addForce(0, m * g.x);
        housing.addForce(1, m * g.y);
        housing.addForce(2, m * g.z);
    }

    // Diagnostic accessor : effective static deflection along an axis,
    // computed by the caller using the housing stiffness on that axis.
    public staticForce(): Cartesian3 {
        const g = this.gravity.motorFrameGravity();
        const m = this.cfg.motorMass;
        return g.multiplyByScalar(m);
    }
}
