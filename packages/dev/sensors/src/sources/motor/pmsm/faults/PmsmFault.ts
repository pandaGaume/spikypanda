// PMSM fault type discriminator. Numeric enum so it compiles to integer
// comparisons, ports cleanly to a C++ enum class on the MCU side, and
// fixes the wire / serialization contract.
//
// D5 (demagnetization) is intentionally absent : the proposal marks it as
// optional ("pending Axiom interest") and it is excluded from the
// simulation scope.
export enum PmsmFaultType {
    IMBALANCE = 1,             // D1 : rotor mass imbalance
    BEARING_RACE = 2,          // D2 : bearing race defect (Phase 2)
    INTER_TURN_SHORT = 3,      // D3 : stator inter-turn short (Phase 2)
    ECCENTRICITY = 4,          // D4 : static air-gap eccentricity
}

// Snake-case identifier suitable for CSV labels, log lines, and HDF5
// metadata. Use only at API boundaries; switch on the numeric value.
export function pmsmFaultLabel(type: PmsmFaultType): string {
    switch (type) {
        case PmsmFaultType.IMBALANCE: return "imbalance";
        case PmsmFaultType.BEARING_RACE: return "bearing_race";
        case PmsmFaultType.INTER_TURN_SHORT: return "inter_turn_short";
        case PmsmFaultType.ECCENTRICITY: return "eccentricity";
    }
}

// Human-readable presentation for UIs and report generation.
export interface IPmsmFaultPresentation {
    displayName: string;
    description: string;
}

export const PMSM_FAULT_PRESENTATION: Readonly<Record<PmsmFaultType, IPmsmFaultPresentation>> = Object.freeze({
    [PmsmFaultType.IMBALANCE]: {
        displayName: "Rotor imbalance",
        description: "Off-center rotor mass producing a centripetal force at 1x mechanical rotation. Couples primarily to the housing vibration; current coupling activates in Phase 2.",
    },
    [PmsmFaultType.BEARING_RACE]: {
        displayName: "Bearing race defect",
        description: "Inner / outer race defect producing impulse trains at the BPFI / BPFO characteristic frequencies. Couples to housing vibration and air-gap reluctance.",
    },
    [PmsmFaultType.INTER_TURN_SHORT]: {
        displayName: "Stator inter-turn short",
        description: "Localized short across a fraction of one phase's turns. Asymmetry in the three-phase impedances; introduces 2x f_e harmonics in i_d / i_q.",
    },
    [PmsmFaultType.ECCENTRICITY]: {
        displayName: "Static air-gap eccentricity",
        description: "Rotor center offset from the stator center. Modulates the rotor flux at 1x mechanical rotation, producing sidebands at f_e +/- f_mech in MCSA.",
    },
});
