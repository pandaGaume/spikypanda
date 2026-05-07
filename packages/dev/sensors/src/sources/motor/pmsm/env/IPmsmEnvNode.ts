import { IPmsmFaultNode } from "../faults/PmsmFaultContracts";

// Marker interface : an environment node has the same machine /
// housing perturbation contract as a fault node, but represents a
// physical environment effect (gravity coupling, thermal drift,
// vibration loading) rather than a fault condition.
//
// The orchestrator runs env nodes around faults : env.preStep before
// faults.preStep (env establishes the operating-point baseline),
// env.postStep after faults.postStep (env contributes its share of
// housing forces last). This way faults compose on top of the
// environment without overwriting it.
//
// In dataset metadata, env nodes describe the operating point ; faults
// are the labels. Keeping them in distinct arrays is a discipline that
// helps downstream stratified analysis.
export interface IPmsmEnvNode extends IPmsmFaultNode {}
