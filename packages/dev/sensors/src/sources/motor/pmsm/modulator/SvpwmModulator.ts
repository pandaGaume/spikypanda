import { ISimNode } from "../../../../interfaces/SimNode";
import { ThreePhaseTransforms } from "../control/transforms";

// Configuration of the SVPWM modulator (averaged variant for Phase 1).
//
//   pwmFrequencyHz : nominal carrier frequency. Not used by the averaged
//                    integrator (no switching) but propagated to the
//                    metadata of any probe attached downstream and to a
//                    future switching variant.
//   minDuty/maxDuty: hard saturation clamps applied to the final duty
//                    cycles. Default [0, 1]. A real driver may impose
//                    [0.05, 0.95] to guarantee bootstrap charging on
//                    high-side gate drivers; configurable to keep the
//                    test bench unconstrained.
export interface ISvpwmConfig {
    pwmFrequencyHz: number;
    minDuty?: number;
    maxDuty?: number;
}

// Space Vector PWM modulator, averaged (no switching ripple).
//
// Inputs  : (V_alpha_ref, V_beta_ref) latched via setReference(), and the
//           current DC bus voltage via setVBus().
// Outputs : (duty_a, duty_b, duty_c) in [minDuty, maxDuty], queried via
//           duties().
//
// Algorithm (min-max zero-sequence injection, equivalent to the standard
// 7-segment SVPWM in the averaged sense) :
//
//   1. Inverse Clarke : (V_alpha_ref, V_beta_ref) -> (v_a_ref, v_b_ref, v_c_ref)
//      line-neutral phase voltage references.
//   2. Saturation : if |V_ref| > V_bus / sqrt(3), scale the reference
//      vector down to that magnitude (linear modulation boundary).
//   3. Zero-sequence injection : v_zero = -(max + min) / 2. Adding v_zero
//      to all three phase references centers the duty cycles around 0.5
//      and extends the linear range to V_bus / sqrt(3).
//   4. Duty cycles : duty_k = 0.5 + (v_k_ref + v_zero) / V_bus, clamped to
//      [minDuty, maxDuty].
//
// Round-trip property : averaged over a PWM cycle, the line-neutral output
// voltages of the inverter (downstream) recover (V_alpha_ref, V_beta_ref)
// exactly when |V_ref| <= V_bus / sqrt(3), regardless of zero-sequence
// injection. This is the test we use to validate the chain.
export class SvpwmModulator implements ISimNode {
    public readonly kind: string = "pmsm.modulator.svpwm";
    public readonly cfg: Required<ISvpwmConfig>;

    private _vAlphaRef: number = 0;
    private _vBetaRef: number = 0;
    private _vBus: number = 0;
    private _dutyA: number = 0.5;
    private _dutyB: number = 0.5;
    private _dutyC: number = 0.5;
    private _saturated: boolean = false;

    public constructor(cfg: ISvpwmConfig) {
        if (cfg.pwmFrequencyHz <= 0) throw new Error("SvpwmModulator: pwmFrequencyHz must be > 0");
        const minDuty = cfg.minDuty ?? 0;
        const maxDuty = cfg.maxDuty ?? 1;
        if (minDuty < 0 || maxDuty > 1 || minDuty >= maxDuty) {
            throw new Error("SvpwmModulator: invalid duty bounds");
        }
        this.cfg = { pwmFrequencyHz: cfg.pwmFrequencyHz, minDuty, maxDuty };
    }

    public advance(_t: number): void {
        if (this._vBus <= 0) {
            // No bus voltage : park duties at the centered idle point.
            this._dutyA = 0.5; this._dutyB = 0.5; this._dutyC = 0.5;
            this._saturated = false;
            return;
        }

        // Step 1 : inverse Clarke to line-neutral phase references.
        let [vAref, vBref, vCref] = ThreePhaseTransforms.inverseClarke(this._vAlphaRef, this._vBetaRef);

        // Step 2 : saturation in the alpha-beta plane.
        const vMagSq = this._vAlphaRef * this._vAlphaRef + this._vBetaRef * this._vBetaRef;
        const vMax = this._vBus / Math.sqrt(3);
        if (vMagSq > vMax * vMax) {
            const scale = vMax / Math.sqrt(vMagSq);
            vAref *= scale; vBref *= scale; vCref *= scale;
            this._saturated = true;
        } else {
            this._saturated = false;
        }

        // Step 3 : zero-sequence (min-max) injection.
        const vMaxLN = Math.max(vAref, vBref, vCref);
        const vMinLN = Math.min(vAref, vBref, vCref);
        const vZero = -0.5 * (vMaxLN + vMinLN);

        // Step 4 : duty cycles.
        const dA = 0.5 + (vAref + vZero) / this._vBus;
        const dB = 0.5 + (vBref + vZero) / this._vBus;
        const dC = 0.5 + (vCref + vZero) / this._vBus;
        this._dutyA = clamp(dA, this.cfg.minDuty, this.cfg.maxDuty);
        this._dutyB = clamp(dB, this.cfg.minDuty, this.cfg.maxDuty);
        this._dutyC = clamp(dC, this.cfg.minDuty, this.cfg.maxDuty);
    }

    public reset(): void {
        this._vAlphaRef = 0; this._vBetaRef = 0; this._vBus = 0;
        this._dutyA = 0.5; this._dutyB = 0.5; this._dutyC = 0.5;
        this._saturated = false;
    }

    public setReference(vAlphaRef: number, vBetaRef: number): void {
        this._vAlphaRef = vAlphaRef;
        this._vBetaRef = vBetaRef;
    }

    public setVBus(vBus: number): void {
        this._vBus = vBus;
    }

    public duties(): [number, number, number] {
        return [this._dutyA, this._dutyB, this._dutyC];
    }

    // True when the most recent advance() had to scale (V_alpha_ref,
    // V_beta_ref) down to the V_bus/sqrt(3) circle. Useful for tests and
    // for over-modulation diagnostics.
    public get saturated(): boolean {
        return this._saturated;
    }
}

function clamp(x: number, lo: number, hi: number): number {
    return x < lo ? lo : x > hi ? hi : x;
}
