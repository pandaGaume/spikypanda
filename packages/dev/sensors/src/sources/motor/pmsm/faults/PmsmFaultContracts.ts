import { ISimNode } from "../../../../interfaces/SimNode";

// PMSM-specific fault contracts. These narrow erasures of the concrete
// PmsmMachine and HousingMechanics types let fault models perturb the host
// without taking a hard dependency on the concrete classes (avoids a
// circular import between the faults/ tree and the machine/ tree).
//
// "Machine" is used throughout instead of the control-theory term "plant",
// for consistency with the rest of the codebase and to keep the prose
// natural in both English and French.
//
// All amplitudes are SI (ohms, henries, dimensionless flux scale, newtons).

// Machine-side host : what an electrical fault is allowed to perturb on
// the PMSM machine. preStep() of an IPmsmFaultNode receives this handle.
//
//   setPhaseResistance / setPhaseInductance:
//     per-phase coefficient overrides. Pass null to clear the override and
//     fall back to the machine's nominal value. Used by D3 (inter-turn
//     short) to introduce phase asymmetry before integration.
//
//   addFluxEnvelope:
//     multiplicative envelope on the rotor flux at the current theta_e.
//     Multiple faults compose multiplicatively (envelope = product). Used
//     by D4 (eccentricity) and any future flux-modulating fault.
//
//   thetaM / omegaM / thetaE:
//     read-only state queries useful for fault models that need the
//     current rotor angle or speed (e.g. centripetal force, impulse
//     train scheduling).
export interface IPmsmMachineFaultHost {
    setPhaseResistance(phase: 0 | 1 | 2, rOverride: number | null): void;
    setPhaseInductance(phase: 0 | 1 | 2, lOverride: number | null): void;
    addFluxEnvelope(scale: number): void;

    readonly thetaM: number;
    readonly omegaM: number;
    readonly thetaE: number;
}

// Housing-side host : what a mechanical fault is allowed to inject into
// the housing dynamics. postStep() of an IPmsmFaultNode receives this
// handle. addForce accumulates within a single advance cycle and is
// consumed by the housing integrator.
export interface IPmsmHousingFaultHost {
    addForce(axis: 0 | 1 | 2, force: number): void;
}

// PMSM fault node. Splits its work in two phases around the machine step:
//
//   preStep  : runs BEFORE machine.advance(t). Modifies machine
//              coefficients (R_s', L' per phase, lambda_m envelope).
//              Used by D3 and D4.
//
//   postStep : runs AFTER machine.advance(t). Injects external forces
//              and air-gap perturbations. Used by D1 and D2.
//
// A fault may implement either, both, or neither (in which case it is a
// pure ISimNode with internal state that the host does not query).
export interface IPmsmFaultNode extends ISimNode {
    preStep?(t: number, machine: IPmsmMachineFaultHost): void;
    postStep?(t: number, machine: IPmsmMachineFaultHost, housing: IPmsmHousingFaultHost): void;
}
