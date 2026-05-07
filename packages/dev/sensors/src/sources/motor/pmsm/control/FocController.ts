import { ISimNode } from "../../../../interfaces/SimNode";
import { PiController } from "./PiController";
import { ThreePhaseTransforms } from "./transforms";

// Configuration of the FOC controller. Three nested PI loops :
//
//   speed PI : tracks omega_ref, outputs i_q_ref. Bounded by iMax.
//   id PI    : tracks i_d_ref (default 0 for SPM machines), outputs v_d_ref.
//   iq PI    : tracks i_q_ref (from speed PI), outputs v_q_ref.
//
// Voltage reference saturation is applied jointly on the (v_d, v_q) vector
// in the alpha-beta plane (radius V_bus / sqrt(3)). The current loops
// each clamp their unsaturated output at iMax * resistance worth of volts
// to keep their integrators sane; the joint vector saturation is
// downstream of those.
//
//   speedKp / speedKi  : speed loop gains
//   currentKp / currentKi : id and iq loop gains (same on both axes,
//     consistent with SPM L_d = L_q tuning)
//   iMax               : magnitude cap on i_q_ref, in amperes
//   vMaxPerAxis        : per-axis voltage saturation for the current PIs.
//     Default vBus / 2 (loose; the joint saturation does the real work).
//   vBusForSat         : DC bus used to compute the joint saturation
//     radius. Updated at runtime via setVBus().
//   idRef              : direct-axis current reference. Default 0 (SPM
//     pure quadrature drive). Field-weakening sets idRef negative.
export interface IFocControllerConfig {
    speedKp: number;
    speedKi: number;
    currentKp: number;
    currentKi: number;
    iMax: number;
    vMaxPerAxis: number;
    vBusForSat: number;
    idRef?: number;
}

// FOC composite controller. Time discipline : the orchestrator latches
// the speed target via setSpeedTarget(), latches the latest measurements
// (i_d, i_q, omega_m, theta_e) via setFeedback(), then calls advance(t).
// advance(t) runs the three PI loops in sequence (speed -> id, iq) and
// produces (v_alpha_ref, v_beta_ref) as outputs, queried via references().
//
// The internal PI loops use the same t passed to advance(), so dt
// computation inside each PI is consistent with the global clock.
export class FocController implements ISimNode {
    public readonly kind: string = "pmsm.control.foc";
    public readonly cfg: Required<IFocControllerConfig>;

    private readonly _piSpeed: PiController;
    private readonly _piId: PiController;
    private readonly _piIq: PiController;

    private _omegaRef: number = 0;
    private _iD: number = 0;
    private _iQ: number = 0;
    private _omegaM: number = 0;
    private _thetaE: number = 0;
    private _vBus: number;

    private _vAlphaRef: number = 0;
    private _vBetaRef: number = 0;
    private _vDRef: number = 0;
    private _vQRef: number = 0;
    private _iQRef: number = 0;
    private _saturatedVoltage: boolean = false;

    public constructor(cfg: IFocControllerConfig) {
        this.cfg = {
            speedKp: cfg.speedKp,
            speedKi: cfg.speedKi,
            currentKp: cfg.currentKp,
            currentKi: cfg.currentKi,
            iMax: cfg.iMax,
            vMaxPerAxis: cfg.vMaxPerAxis,
            vBusForSat: cfg.vBusForSat,
            idRef: cfg.idRef ?? 0,
        };
        this._vBus = cfg.vBusForSat;

        this._piSpeed = new PiController({
            kp: cfg.speedKp, ki: cfg.speedKi,
            outMin: -cfg.iMax, outMax: cfg.iMax,
        });
        this._piId = new PiController({
            kp: cfg.currentKp, ki: cfg.currentKi,
            outMin: -cfg.vMaxPerAxis, outMax: cfg.vMaxPerAxis,
        });
        this._piIq = new PiController({
            kp: cfg.currentKp, ki: cfg.currentKi,
            outMin: -cfg.vMaxPerAxis, outMax: cfg.vMaxPerAxis,
        });
    }

    public advance(t: number): void {
        // Speed PI : drives omega -> omega_ref. Output is i_q_ref.
        this._iQRef = this._piSpeed.update(this._omegaRef, this._omegaM, t);

        // Current PIs : id -> idRef, iq -> iQRef.
        this._vDRef = this._piId.update(this.cfg.idRef, this._iD, t);
        this._vQRef = this._piIq.update(this._iQRef, this._iQ, t);

        // Joint voltage saturation in the alpha-beta plane.
        const vMagSq = this._vDRef * this._vDRef + this._vQRef * this._vQRef;
        const vMax = this._vBus / Math.sqrt(3);
        if (vMagSq > vMax * vMax) {
            const scale = vMax / Math.sqrt(vMagSq);
            this._vDRef *= scale;
            this._vQRef *= scale;
            this._saturatedVoltage = true;
        } else {
            this._saturatedVoltage = false;
        }

        // Output : project dq -> alpha-beta with the latched theta_e. The
        // modulator downstream consumes (v_alpha_ref, v_beta_ref).
        const [alpha, beta] = ThreePhaseTransforms.inversePark(this._vDRef, this._vQRef, this._thetaE);
        this._vAlphaRef = alpha;
        this._vBetaRef = beta;
    }

    public reset(): void {
        this._piSpeed.reset();
        this._piId.reset();
        this._piIq.reset();
        this._omegaRef = 0;
        this._iD = 0; this._iQ = 0; this._omegaM = 0; this._thetaE = 0;
        this._vAlphaRef = 0; this._vBetaRef = 0;
        this._vDRef = 0; this._vQRef = 0; this._iQRef = 0;
        this._saturatedVoltage = false;
    }

    // Inputs ----------------------------------------------------------------

    public setSpeedTarget(omegaRef: number): void {
        this._omegaRef = omegaRef;
    }

    public setFeedback(iD: number, iQ: number, omegaM: number, thetaE: number): void {
        this._iD = iD;
        this._iQ = iQ;
        this._omegaM = omegaM;
        this._thetaE = thetaE;
    }

    public setVBus(vBus: number): void {
        if (vBus <= 0) throw new Error("FocController: vBus must be > 0");
        this._vBus = vBus;
    }

    // Outputs ---------------------------------------------------------------

    public references(): [number, number] {
        return [this._vAlphaRef, this._vBetaRef];
    }

    public get vDRef(): number { return this._vDRef; }
    public get vQRef(): number { return this._vQRef; }
    public get iQRef(): number { return this._iQRef; }
    public get saturatedVoltage(): boolean { return this._saturatedVoltage; }
}
