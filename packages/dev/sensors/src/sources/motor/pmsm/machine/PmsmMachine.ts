import { ISimNode } from "../../../../interfaces/SimNode";
import { IPmsmMachineFaultHost } from "../faults/PmsmFaultContracts";
import { ThreePhaseTransforms } from "../control/transforms";
import { IPmsmMachineConfig } from "./PmsmMachineConfig";

// PMSM machine in the rotor synchronous (dq) frame.
//
// State : i_d, i_q, omega_m, theta_m. Inputs : v_a, v_b, v_c (line-neutral
// phase voltages, set via setPhaseVoltages before advance).
//
// Equations (SPM friendly, salient via L_d != L_q):
//   V_d = R_s*i_d + L_d*di_d/dt - omega_e*L_q*i_q
//   V_q = R_s*i_q + L_q*di_q/dt + omega_e*L_d*i_d + omega_e*lambda_m_eff
//   T_e = (3/2)*p*(lambda_m_eff*i_q + (L_d - L_q)*i_d*i_q)
//   J*domega_m/dt + B*omega_m = T_e - T_load
//   dtheta_m/dt = omega_m
//
// Integration : implicit Euler on the electrical 2x2 system (linear under
// the standard implicit-explicit split where omega_e is held at its
// pre-step value). Mechanical : implicit Euler on omega_m, trapezoidal on
// theta_m. Substep capped by min(L/(10R), J/(10B), 5e-6) so PWM transients
// in the input voltage are resolvable.
//
// IPmsmMachineFaultHost contract :
//   addFluxEnvelope(scale): faults call this in their preStep. The
//     accumulated envelope multiplies lambda_m for one advance() cycle and
//     resets to 1 afterwards.
//   setPhaseResistance / setPhaseInductance: stored but NOT applied in
//     Phase 1. The dq formulation assumes balanced phases; Phase 2 will
//     switch to an abc-frame integration when D3 (inter-turn short) lands.
//     Calling these in Phase 1 has no effect on the simulation; the
//     methods exist so fault models compile against the host contract.
export class PmsmMachine implements ISimNode, IPmsmMachineFaultHost {
    public readonly kind: string = "pmsm.machine";
    public readonly cfg: Required<Omit<IPmsmMachineConfig, "loadTorque" | "nominalCurrentA" | "initialId" | "initialIq" | "initialOmegaM" | "initialThetaM">> & {
        loadTorque: number;
        nominalCurrentA: number;
        initialId: number;
        initialIq: number;
        initialOmegaM: number;
        initialThetaM: number;
    };

    private _iD: number;
    private _iQ: number;
    private _omegaM: number;
    private _thetaM: number;
    private _t: number = 0;
    private _started: boolean = false;

    // Voltage inputs latched by setPhaseVoltages, consumed by advance.
    private _vA: number = 0;
    private _vB: number = 0;
    private _vC: number = 0;

    // Runtime-tunable load torque, distinct from the constructor default
    // so a controller / scenario can ramp the load without rebuilding.
    private _loadTorque: number;

    // Per-cycle flux envelope. Multiplicative product of all faults'
    // contributions; reset to 1 after each advance().
    private _fluxEnvelope: number = 1;

    // Per-phase R / L overrides. Stored for forward compatibility with
    // Phase 2 abc-frame integration; ignored by the dq integrator.
    private readonly _rOverride: [number | null, number | null, number | null] = [null, null, null];
    private readonly _lOverride: [number | null, number | null, number | null] = [null, null, null];

    private readonly _maxSubstep: number;

    public constructor(cfg: IPmsmMachineConfig) {
        if (cfg.resistance <= 0) throw new Error("PmsmMachine: resistance must be > 0");
        if (cfg.inductanceD <= 0 || cfg.inductanceQ <= 0) throw new Error("PmsmMachine: inductances must be > 0");
        if (cfg.polePairs <= 0 || !Number.isInteger(cfg.polePairs)) throw new Error("PmsmMachine: polePairs must be a positive integer");
        if (cfg.rotorInertia <= 0) throw new Error("PmsmMachine: rotorInertia must be > 0");
        if (cfg.viscousFriction < 0) throw new Error("PmsmMachine: viscousFriction must be >= 0");

        this.cfg = {
            resistance: cfg.resistance,
            inductanceD: cfg.inductanceD,
            inductanceQ: cfg.inductanceQ,
            rotorFluxLinkage: cfg.rotorFluxLinkage,
            polePairs: cfg.polePairs,
            rotorInertia: cfg.rotorInertia,
            viscousFriction: cfg.viscousFriction,
            loadTorque: cfg.loadTorque ?? 0,
            nominalSpeedRps: cfg.nominalSpeedRps,
            nominalCurrentA: cfg.nominalCurrentA ?? 0,
            initialId: cfg.initialId ?? 0,
            initialIq: cfg.initialIq ?? 0,
            initialOmegaM: cfg.initialOmegaM ?? 0,
            initialThetaM: cfg.initialThetaM ?? 0,
        };

        this._iD = this.cfg.initialId;
        this._iQ = this.cfg.initialIq;
        this._omegaM = this.cfg.initialOmegaM;
        this._thetaM = this.cfg.initialThetaM;
        this._loadTorque = this.cfg.loadTorque;

        // Substep : tightest of L/R and J/B time constants, scaled by 1/10
        // so a single time constant resolves to ~10 substeps. Hard floor
        // 5 us so the cost stays bounded for very fast electrical dynamics.
        const tauElec = Math.min(this.cfg.inductanceD, this.cfg.inductanceQ) / this.cfg.resistance;
        const tauMech = this.cfg.viscousFriction > 0
            ? this.cfg.rotorInertia / this.cfg.viscousFriction
            : Number.POSITIVE_INFINITY;
        this._maxSubstep = Math.max(5e-6, Math.min(tauElec / 10, tauMech / 10));
    }

    // --- ISimNode ----------------------------------------------------------

    public advance(t: number): void {
        if (!this._started) {
            this._t = t;
            this._started = true;
            return;
        }
        if (t < this._t) {
            // Going backwards : reset to initial state. Same convention as
            // MotorCurrentSource. Callers that want time-reversal must
            // manage their own checkpoints.
            this._iD = this.cfg.initialId;
            this._iQ = this.cfg.initialIq;
            this._omegaM = this.cfg.initialOmegaM;
            this._thetaM = this.cfg.initialThetaM;
            this._t = t;
            this._fluxEnvelope = 1;
            return;
        }

        const lambdaMEff = this.cfg.rotorFluxLinkage * this._fluxEnvelope;

        while (this._t < t) {
            const dt = Math.min(this._maxSubstep, t - this._t);
            this._integrateOneSubstep(dt, lambdaMEff);
            this._t += dt;
        }

        // Consume the per-cycle flux envelope. Faults must call
        // addFluxEnvelope before each advance to keep their effect active.
        this._fluxEnvelope = 1;
    }

    public reset(): void {
        this._iD = this.cfg.initialId;
        this._iQ = this.cfg.initialIq;
        this._omegaM = this.cfg.initialOmegaM;
        this._thetaM = this.cfg.initialThetaM;
        this._t = 0;
        this._started = false;
        this._vA = 0; this._vB = 0; this._vC = 0;
        this._loadTorque = this.cfg.loadTorque;
        this._fluxEnvelope = 1;
        for (let i = 0; i < 3; i++) {
            this._rOverride[i] = null;
            this._lOverride[i] = null;
        }
    }

    // --- Inputs ------------------------------------------------------------

    // Latch the line-neutral phase voltages for the next advance().
    // Conventionally called by the inverter (averaged) or by a test.
    public setPhaseVoltages(vA: number, vB: number, vC: number): void {
        this._vA = vA;
        this._vB = vB;
        this._vC = vC;
    }

    public setLoadTorque(tau: number): void {
        this._loadTorque = tau;
    }

    // --- Outputs / queries -------------------------------------------------

    public get iD(): number { return this._iD; }
    public get iQ(): number { return this._iQ; }
    public get omegaM(): number { return this._omegaM; }
    public get thetaM(): number { return this._thetaM; }
    public get thetaE(): number { return this.cfg.polePairs * this._thetaM; }

    public iAbc(): [number, number, number] {
        return ThreePhaseTransforms.dqToAbc(this._iD, this._iQ, this.thetaE);
    }

    public electromagneticTorque(): number {
        const lambdaM = this.cfg.rotorFluxLinkage * this._fluxEnvelope;
        const reluctant = (this.cfg.inductanceD - this.cfg.inductanceQ) * this._iD * this._iQ;
        return 1.5 * this.cfg.polePairs * (lambdaM * this._iQ + reluctant);
    }

    public get loadTorque(): number {
        return this._loadTorque;
    }

    // --- IPmsmMachineFaultHost --------------------------------------------

    public addFluxEnvelope(scale: number): void {
        this._fluxEnvelope *= scale;
    }

    public setPhaseResistance(phase: 0 | 1 | 2, rOverride: number | null): void {
        // Stored but not applied by the dq integrator. Phase 2 abc-frame
        // integration will consume these to model D3 (inter-turn short).
        this._rOverride[phase] = rOverride;
    }

    public setPhaseInductance(phase: 0 | 1 | 2, lOverride: number | null): void {
        this._lOverride[phase] = lOverride;
    }

    // --- Internals ---------------------------------------------------------

    private _integrateOneSubstep(dt: number, lambdaMEff: number): void {
        const Rs = this.cfg.resistance;
        const Ld = this.cfg.inductanceD;
        const Lq = this.cfg.inductanceQ;
        const p = this.cfg.polePairs;
        const J = this.cfg.rotorInertia;
        const B = this.cfg.viscousFriction;

        // Inputs : transform v_abc -> v_d, v_q with the rotor angle at the
        // start of the substep (implicit-explicit split : keeps the linear
        // 2x2 solve in i_d / i_q while omega_e and theta_e stay at their
        // pre-step values).
        const thetaE = p * this._thetaM;
        const omegaE = p * this._omegaM;
        const [vD, vQ] = ThreePhaseTransforms.abcToDq(this._vA, this._vB, this._vC, thetaE);

        // Implicit Euler on the electrical 2x2 system.
        //   [Ld/dt + Rs,    -omega_e*Lq] [iD_new]   [Ld/dt*iD + vD                       ]
        //   [omega_e*Ld,    Lq/dt + Rs ] [iQ_new] = [Lq/dt*iQ + vQ - omega_e*lambda_m_eff]
        const a11 = Ld / dt + Rs;
        const a12 = -omegaE * Lq;
        const a21 = omegaE * Ld;
        const a22 = Lq / dt + Rs;
        const b1 = (Ld / dt) * this._iD + vD;
        const b2 = (Lq / dt) * this._iQ + vQ - omegaE * lambdaMEff;
        const det = a11 * a22 - a12 * a21;
        const iDNew = (a22 * b1 - a12 * b2) / det;
        const iQNew = (a11 * b2 - a21 * b1) / det;

        // Implicit Euler on the mechanical equation. T_e is evaluated at
        // the new currents (consistent with implicit on i_d, i_q).
        const tEReluctant = (Ld - Lq) * iDNew * iQNew;
        const tENew = 1.5 * p * (lambdaMEff * iQNew + tEReluctant);
        const omegaMNew = (J / dt * this._omegaM + tENew - this._loadTorque) / (J / dt + B);

        // Trapezoidal on theta : energy-consistent under varying omega.
        const thetaMNew = this._thetaM + 0.5 * (this._omegaM + omegaMNew) * dt;

        this._iD = iDNew;
        this._iQ = iQNew;
        this._omegaM = omegaMNew;
        this._thetaM = thetaMNew;
    }
}
