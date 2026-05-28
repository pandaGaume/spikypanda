import { ISimNode } from "../../../../interfaces/SimNode";

// Configuration of the 3-phase voltage source inverter.
//
//   vBus : nominal DC bus voltage. May be overridden at runtime via
//          setVBus() (proposal scenario : DC bus modulation, brown-out, ...).
//
// Phase 1 model : averaged inverter, no switching, no deadtime, ideal
// switches. Output line-neutral voltages are the average over a PWM
// cycle of the duty cycles applied to the bus. The model is
// computationally trivial (a 3x3 linear map) and is the right level of
// detail for FOC closed-loop validation, MCSA spectrum sanity, and
// cogging-torque experiments.
//
// Phase 2 will add a switching variant with deadtime, on-resistance, and
// free-wheeling diode behavior. Both variants share this interface so the
// downstream components (machine) need no change.
export interface IThreePhaseInverterConfig {
    vBus: number;
}

// 3-phase inverter, averaged. Maps duty cycles (a, b, c) in [0, 1] to
// line-neutral phase voltages :
//
//   v_a_ln = (2*duty_a - duty_b - duty_c) * V_bus / 3
//   v_b_ln = (-duty_a + 2*duty_b - duty_c) * V_bus / 3
//   v_c_ln = (-duty_a - duty_b + 2*duty_c) * V_bus / 3
//
// This is the average of a 2-level VSI driven by complementary PWM with
// zero deadtime, referenced to the star neutral. Equivalent to subtracting
// the common-mode voltage ((v_a + v_b + v_c) / 3) from the phase-to-bus-
// negative voltages duty_k * V_bus.
//
// Round-trip property (used in tests) : if upstream the SVPWM modulator
// produced the duties from (V_alpha_ref, V_beta_ref) in the linear range,
// then Clarke(v_a_ln, v_b_ln, v_c_ln) returns (V_alpha_ref, V_beta_ref).
// Zero-sequence content cancels through the LN reference.
export class ThreePhaseInverter implements ISimNode {
    public readonly kind: string = "pmsm.inverter.three-phase";

    private _vBus: number;
    private _dutyA: number = 0.5;
    private _dutyB: number = 0.5;
    private _dutyC: number = 0.5;
    private _vA: number = 0;
    private _vB: number = 0;
    private _vC: number = 0;

    public constructor(cfg: IThreePhaseInverterConfig) {
        if (cfg.vBus <= 0) throw new Error("ThreePhaseInverter: vBus must be > 0");
        this._vBus = cfg.vBus;
    }

    public advance(_t: number): void {
        const oneThird = 1 / 3;
        const v = this._vBus * oneThird;
        this._vA = v * (2 * this._dutyA - this._dutyB - this._dutyC);
        this._vB = v * (-this._dutyA + 2 * this._dutyB - this._dutyC);
        this._vC = v * (-this._dutyA - this._dutyB + 2 * this._dutyC);
    }

    public reset(): void {
        this._dutyA = 0.5;
        this._dutyB = 0.5;
        this._dutyC = 0.5;
        this._vA = 0;
        this._vB = 0;
        this._vC = 0;
    }

    public setDuties(dA: number, dB: number, dC: number): void {
        this._dutyA = dA;
        this._dutyB = dB;
        this._dutyC = dC;
    }

    public setVBus(vBus: number): void {
        if (vBus <= 0) throw new Error("ThreePhaseInverter: vBus must be > 0");
        this._vBus = vBus;
    }

    public phaseVoltages(): [number, number, number] {
        return [this._vA, this._vB, this._vC];
    }

    public get vBus(): number {
        return this._vBus;
    }
}
