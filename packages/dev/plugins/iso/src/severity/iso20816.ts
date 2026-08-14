import { getFFTEngine, resolveUnit } from "spikypanda-core";
import type { IUnitTag, IProvenance } from "spikypanda-core";

// ═══════════════════════════════════════════════════════════════════════════
// ISO 20816-3 broadband vibration-severity assessment (pure numerics).
//
// The classic reliability gauge: is a machine's broadband vibration Good /
// Acceptable / Unsatisfactory / Unacceptable? We compute the broadband RMS of
// VELOCITY (mm/s) over the ISO 10-1000 Hz band and classify it into a zone
// A/B/C/D against the standard threshold table for the machine's group and
// support type.
//
// This module is pure (no node/session): a signal + its unit tag + machine
// metadata in, a verdict out. It REFUSES (never guesses) when the unit is
// undeclared, the sample rate is too low to cover the band, or the machine is
// out of ISO scope. `g -> mm/s` is NOT a unit conversion (different dimensions):
// it is a frequency-domain integration V(f)=A(f)/(j.2.pi.f), done here.
//
// Threshold values: ISO 10816-3:2009 four-zone table. ISO 20816-3:2022
// supersedes it and merges zones A and B; we keep A/B for practitioner
// familiarity and state that in `thresholdProvenance`.
// ═══════════════════════════════════════════════════════════════════════════

export type IsoZone = "A" | "B" | "C" | "D";
export type MachineGroup = 1 | 2;
export type SupportType = "rigid" | "flexible";
export type SeverityLevel = "Good" | "Acceptable" | "Unsatisfactory" | "Unacceptable";
export type ColorCode = "green" | "yellow" | "orange" | "red";
export type AlertLevel = "none" | "warning" | "alarm" | "danger";

export interface IIsoMachine {
    group: MachineGroup;
    support: SupportType;
    /** Operating speed (rpm). Below 600 rpm the band's lower edge drops to 2 Hz. */
    rpm?: number;
    /** Declared shaft power (kW). Below 15 kW is outside ISO 20816-3 scope. */
    powerKw?: number;
}

export interface IIsoVerdict {
    status: "assessed" | "refused";
    /** refused only: why + how to fix. Refusal is a first-class result, never a guess. */
    reason?: string;
    remedy?: string;
    // assessed only:
    zone?: IsoZone;
    severityLevel?: SeverityLevel;
    colorCode?: ColorCode;
    alertLevel?: AlertLevel;
    rmsVelocityMmS?: number;
    machineGroup?: MachineGroup;
    supportType?: SupportType;
    frequencyRangeHz?: [number, number];
    /** What produced this grade (standard, edition, threshold table). Every
     *  graded output carries provenance; see provenance-convention.md. */
    provenance?: IProvenance;
}

// Zone boundaries (mm/s RMS velocity), = upper limit of zones A, B, C. Above C|D = D.
const ZONE_BOUNDARIES: Record<MachineGroup, Record<SupportType, [number, number, number]>> = {
    1: { rigid: [2.3, 4.5, 7.1], flexible: [3.5, 7.1, 11.0] },
    2: { rigid: [1.4, 2.8, 4.5], flexible: [2.3, 4.5, 7.1] },
};

const ZONE_META: Record<IsoZone, { level: SeverityLevel; color: ColorCode; alert: AlertLevel }> = {
    A: { level: "Good", color: "green", alert: "none" },
    B: { level: "Acceptable", color: "yellow", alert: "warning" },
    C: { level: "Unsatisfactory", color: "orange", alert: "alarm" },
    D: { level: "Unacceptable", color: "red", alert: "danger" },
};

export const THRESHOLD_PROVENANCE =
    "ISO 10816-3:2009 four-zone (A-D) broadband velocity-RMS; superseded by ISO 20816-3:2022 " +
    "which merges zones A and B; A/B kept for practitioner familiarity.";

/** The standard's provenance stamped on every graded verdict (the `basis`
 *  field is filled per-verdict with the machine group + support). */
const ISO_PROVENANCE: IProvenance = {
    kind: "standard",
    source: "ISO 20816-3",
    version: "2022 (supersedes ISO 10816-3:2009)",
    note: THRESHOLD_PROVENANCE,
};

const ISO_BAND_UPPER_HZ = 1000;
const ISO_BAND_CLAMP_FRACTION = 0.95; // upper edge <= 0.95 * Nyquist so the band is truly covered
const ISO_POWER_FLOOR_KW = 15;
const MIN_SAMPLES = 64;
const SUPPORTED_QUANTITIES = new Set(["Acceleration", "Speed"]);

function nextPow2(n: number): number {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
}

/** Classify a broadband velocity RMS (mm/s) into an ISO zone. `<=` semantics:
 *  a boundary value belongs to the LOWER zone. */
export function classifyZone(rmsMmS: number, group: MachineGroup, support: SupportType): IsoZone {
    const [ab, bc, cd] = ZONE_BOUNDARIES[group][support];
    if (rmsMmS <= ab) return "A";
    if (rmsMmS <= bc) return "B";
    if (rmsMmS <= cd) return "C";
    return "D";
}

/**
 * Broadband velocity RMS (mm/s) over the ISO 10-1000 Hz band. If the signal is
 * tagged Acceleration it is integrated to velocity in the frequency domain
 * (V(f)=A(f)/(j.2.pi.f)); if tagged Speed it is used directly. The unit factor
 * (`resolveUnit(tag).value`) brings samples to SI base (m/s^2 or m/s). The tag
 * is assumed already validated by `assessSeverity`.
 */
export function broadbandVelocityRmsMmS(
    data: Float32Array | number[],
    tag: IUnitTag,
    opts?: { rpm?: number }
): { rms: number; band: [number, number] } {
    const fs = tag.sampleRateHz as number;
    const unit = resolveUnit(tag);
    const toSiBase = unit ? unit.value : 1; // sample * value -> m/s^2 (accel) or m/s (speed)
    const isAccel = tag.quantity === "Acceleration";

    const L = data.length;
    const N = nextPow2(L);
    const padded = new Float32Array(N);
    // to SI base + remove DC (DC integrates to a divide-by-zero and carries no ISO band energy)
    let mean = 0;
    for (let i = 0; i < L; i++) mean += data[i] * toSiBase;
    mean /= L;
    for (let i = 0; i < L; i++) padded[i] = data[i] * toSiBase - mean;

    const eng = getFFTEngine(N);
    const spec = eng.forwardComplex(padded); // interleaved [re,im], nBins = N/2 + 1
    const nBins = N / 2 + 1;
    const nyquist = fs / 2;
    const fLo = opts?.rpm !== undefined && opts.rpm > 0 && opts.rpm < 600 ? 2 : 10;
    const fHi = Math.min(ISO_BAND_UPPER_HZ, ISO_BAND_CLAMP_FRACTION * nyquist);

    const twoPi = 2 * Math.PI;
    for (let k = 0; k < nBins; k++) {
        const f = (k * fs) / N;
        let vr = spec[k * 2];
        let vi = spec[k * 2 + 1];
        if (isAccel) {
            if (k === 0 || f === 0) {
                vr = 0;
                vi = 0;
            } else {
                // V = A / (j.w) = (re + j.im) * (-j) / w = (im - j.re) / w
                const w = twoPi * f;
                const re = vr;
                const im = vi;
                vr = im / w;
                vi = -re / w;
            }
        }
        if (f < fLo || f > fHi) {
            vr = 0;
            vi = 0;
        }
        spec[k * 2] = vr;
        spec[k * 2 + 1] = vi;
    }

    const vBand = eng.inverse(spec); // N real samples, m/s
    // RMS over the ORIGINAL L samples (do not dilute with the zero pad).
    let acc = 0;
    for (let i = 0; i < L; i++) acc += vBand[i] * vBand[i];
    const rmsMs = Math.sqrt(acc / L);
    return { rms: rmsMs * 1000, band: [fLo, fHi] };
}

/** Full ISO 20816-3 broadband-severity verdict, with first-class refusals. */
export function assessSeverity(
    data: Float32Array | number[] | undefined,
    tag: IUnitTag | undefined,
    machine: IIsoMachine
): IIsoVerdict {
    const refuse = (reason: string, remedy: string): IIsoVerdict => ({ status: "refused", reason, remedy });

    if (!tag) {
        return refuse("physical unit not declared on the signal", "tag the source with a unit (Acceleration g / m/s2, or Speed).");
    }
    if (!SUPPORTED_QUANTITIES.has(tag.quantity)) {
        return refuse(`quantity '${tag.quantity}' is not gradable by ISO 20816-3`, "provide an Acceleration or Speed signal.");
    }
    if (resolveUnit(tag) === undefined) {
        return refuse(`unit '${tag.quantity}/${tag.unit}' is unknown`, "use a unit key from the quantity's Units table.");
    }
    if (!tag.sampleRateHz || tag.sampleRateHz <= 0) {
        return refuse("sample rate not declared", "set sampleRateHz on the signal tag.");
    }
    if (!data || data.length < MIN_SAMPLES) {
        return refuse("signal too short", `provide at least ${MIN_SAMPLES} samples.`);
    }
    if (ISO_BAND_CLAMP_FRACTION * (tag.sampleRateHz / 2) < ISO_BAND_UPPER_HZ) {
        return refuse(
            `sample rate too low (fs=${tag.sampleRateHz} Hz): the full 10-1000 Hz ISO band is not covered`,
            "sample at >= ~2106 Hz."
        );
    }
    if (machine.powerKw !== undefined && machine.powerKw > 0 && machine.powerKw < ISO_POWER_FLOOR_KW) {
        return refuse(
            `machine power ${machine.powerKw} kW is below the ISO 20816-3 scope floor (15 kW)`,
            "the zone table does not apply to small machines."
        );
    }

    const { rms, band } = broadbandVelocityRmsMmS(data, tag, { rpm: machine.rpm });
    const zone = classifyZone(rms, machine.group, machine.support);
    const meta = ZONE_META[zone];
    return {
        status: "assessed",
        zone,
        severityLevel: meta.level,
        colorCode: meta.color,
        alertLevel: meta.alert,
        rmsVelocityMmS: rms,
        machineGroup: machine.group,
        supportType: machine.support,
        frequencyRangeHz: band,
        provenance: { ...ISO_PROVENANCE, basis: `machine group ${machine.group}, ${machine.support} support` },
    };
}

/** Numeric zone index for a scalar output port: A=0, B=1, C=2, D=3, refused=-1. */
export function zoneIndex(v: IIsoVerdict): number {
    if (v.status !== "assessed" || !v.zone) return -1;
    return { A: 0, B: 1, C: 2, D: 3 }[v.zone];
}
