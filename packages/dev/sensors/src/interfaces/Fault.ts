// Common shape of any fault descriptor across sensor domains (motor,
// vibration, acoustic, structural, ...). Domain-specific subtypes
// (e.g. IMotorFault) extend this with their own physics fields.
//
//   displayName : short human label, e.g. "Misalignment". Shown in UIs
//                 and tooltips. Free to override per instance.
//   description : one-line plain-English description of the physical
//                 phenomenon and its expected signature.
//   severity    : normalized severity in [0, 1]; how much the fault
//                 affects the measurement
//
// displayName and description are deliberately strings: they live at the
// API boundary (UIs, JSON metadata, log lines), not in the inner sample
// loop. The inner loop only switches on the numeric type discriminator.
export interface IFault {
    displayName: string;
    description: string;
    severity: number;
}
