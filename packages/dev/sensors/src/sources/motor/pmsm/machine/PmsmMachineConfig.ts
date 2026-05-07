// Static parameters of a PMSM machine. SI units throughout.
//
//   resistance      : per-phase stator resistance R_s (ohms)
//   inductanceD     : direct-axis inductance L_d (henries)
//   inductanceQ     : quadrature-axis inductance L_q (henries). For a
//                     surface-PM machine (SPM, the case targeted by Phase 1)
//                     L_d = L_q. Salient PM machines have L_q > L_d.
//   rotorFluxLinkage: permanent magnet flux linkage lambda_m (Wb)
//   polePairs       : number of pole pairs p (positive integer)
//   rotorInertia    : J (kg.m^2), shaft + rotor + reflected load inertia
//   viscousFriction : B (N.m.s/rad), linear damping coefficient
//   loadTorque      : nominal external load tau_L (N.m). May be modified at
//                     runtime via setLoadTorque(). Default 0.
//
// Operating-point hints (used to size sample rates, substep, etc., and
// surfaced in the IDataSource meta of attached probes):
//
//   nominalSpeedRps : nominal mechanical speed at rated operating point
//                     (rev / s). Used by probes to populate fundamentalHz
//                     and sample rate hints.
//   nominalCurrentA : rated stator current per phase (RMS amperes). Used
//                     by probes for label / metadata; not enforced at
//                     runtime.
export interface IPmsmMachineConfig {
    resistance: number;
    inductanceD: number;
    inductanceQ: number;
    rotorFluxLinkage: number;
    polePairs: number;
    rotorInertia: number;
    viscousFriction: number;
    loadTorque?: number;

    nominalSpeedRps: number;
    nominalCurrentA?: number;

    // Initial state. All default to 0 (motor at rest, aligned with d axis).
    initialId?: number;
    initialIq?: number;
    initialOmegaM?: number;
    initialThetaM?: number;
}
