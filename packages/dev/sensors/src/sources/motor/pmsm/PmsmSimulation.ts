import { ISimNode } from "../../../interfaces/SimNode";
import { FocController } from "./control/FocController";
import { GravityField } from "./env/GravityField";
import { GravityVector } from "./env/GravityVector";
import { HousingMechanics } from "./env/HousingMechanics";
import { IPmsmEnvNode } from "./env/IPmsmEnvNode";
import { MotorTransform } from "./env/MotorTransform";
import { IPmsmFaultNode } from "./faults/PmsmFaultContracts";
import { ThreePhaseInverter } from "./inverter/ThreePhaseInverter";
import { PmsmMachine } from "./machine/PmsmMachine";
import { SvpwmModulator } from "./modulator/SvpwmModulator";

// Components composing one PMSM simulation. The host owns these, drives
// their advance() in the right order, and exposes accessors that the
// IDataSource probes (PhaseCurrentSource, VibrationAxisSource, ...)
// consume.
//
// gravityField, motorTransform, gravityVector establish the gravity
// context : the world-frame gravity field, the motor's orientation in
// the world, and the projection node that publishes the body-frame
// gravity to env nodes.
//
// env nodes (RotorSag, BearingPreload, MountingCompliance, ...) describe
// the operating-point environment. They consume gravityVector and
// perturb the machine / housing accordingly.
//
// fault nodes (Imbalance, Eccentricity, ...) describe the labels. They
// compose on top of the env perturbations.
export interface IPmsmSimulationComponents {
    machine: PmsmMachine;
    foc: FocController;
    modulator: SvpwmModulator;
    inverter: ThreePhaseInverter;
    housing: HousingMechanics;
    gravityField: GravityField;
    motorTransform: MotorTransform;
    gravityVector: GravityVector;
    env: ReadonlyArray<IPmsmEnvNode>;
    faults: ReadonlyArray<IPmsmFaultNode>;
}

// Top-level orchestrator. Implements ISimNode itself : a probe calls
// host.advance(t) which drives the entire graph forward.
//
// Order of operations per advance(t) :
//
//   0. gravityField.advance / motorTransform.advance / gravityVector.advance
//        Refresh the body-frame gravity projection.
//   1. env[].preStep(t, machine)
//        RotorSag adds its flux envelope. BearingPreload (Phase 2)
//        recomputes its effective preloads here.
//   2. faults[].preStep(t, machine)
//        D4 (eccentricity) adds its flux envelope on top of env. D3
//        (Phase 2) modifies per-phase R / L.
//   3. foc.setFeedback(machine state) ; foc.advance(t)
//        Reads the latched state from the previous step and produces the
//        new (V_alpha_ref, V_beta_ref).
//   4. modulator.setReference(...) ; modulator.advance(t)
//        Computes duty cycles from the voltage reference.
//   5. inverter.setDuties(...) ; inverter.advance(t)
//        Produces line-neutral phase voltages from the duties and V_bus.
//   6. machine.setPhaseVoltages(...) ; machine.advance(t)
//        Integrates dq + mechanical dynamics under the perturbed
//        coefficients.
//   7. faults[].postStep(t, machine, housing)
//        D1 (imbalance) injects the centripetal force into the housing
//        force accumulator.
//   8. env[].postStep(t, machine, housing)
//        MountingCompliance injects the static gravitational load on the
//        bracket. Comes after faults so env contributions accumulate
//        last and are not overridden.
//   9. housing.advance(t)
//        Integrates the housing dynamics with the accumulated forces.
//
// Idempotence : advance(t) where t == _t (or t < _t with the no-time-
// reversal contract) is a fast path. Probes can sample at different
// rates safely; the first one to call advance(t) drives the integration.
export class PmsmSimulation implements ISimNode {
    public readonly kind: string = "pmsm.simulation";
    public readonly machine: PmsmMachine;
    public readonly foc: FocController;
    public readonly modulator: SvpwmModulator;
    public readonly inverter: ThreePhaseInverter;
    public readonly housing: HousingMechanics;
    public readonly gravityField: GravityField;
    public readonly motorTransform: MotorTransform;
    public readonly gravityVector: GravityVector;
    public readonly env: ReadonlyArray<IPmsmEnvNode>;
    public readonly faults: ReadonlyArray<IPmsmFaultNode>;

    private _t: number = 0;
    private _started: boolean = false;

    public constructor(components: IPmsmSimulationComponents) {
        this.machine = components.machine;
        this.foc = components.foc;
        this.modulator = components.modulator;
        this.inverter = components.inverter;
        this.housing = components.housing;
        this.gravityField = components.gravityField;
        this.motorTransform = components.motorTransform;
        this.gravityVector = components.gravityVector;
        this.env = components.env;
        this.faults = components.faults;
    }

    public advance(t: number): void {
        if (!this._started) {
            this._t = t;
            this._started = true;
            return;
        }
        if (t <= this._t) return;

        // 0. Refresh gravity context.
        this.gravityField.advance(t);
        this.motorTransform.advance(t);
        this.gravityVector.advance(t);

        // 1. Env preStep : establishes the operating-point baseline.
        for (const e of this.env) {
            e.preStep?.(t, this.machine);
        }
        // 2. Faults preStep : labels compose on top of env.
        for (const f of this.faults) {
            f.preStep?.(t, this.machine);
        }

        // 3. FOC feedback + advance.
        this.foc.setFeedback(this.machine.iD, this.machine.iQ, this.machine.omegaM, this.machine.thetaE);
        this.foc.setVBus(this.inverter.vBus);
        this.foc.advance(t);
        const [vAlphaRef, vBetaRef] = this.foc.references();

        // 4. Modulator.
        this.modulator.setReference(vAlphaRef, vBetaRef);
        this.modulator.setVBus(this.inverter.vBus);
        this.modulator.advance(t);
        const [dA, dB, dC] = this.modulator.duties();

        // 5. Inverter.
        this.inverter.setDuties(dA, dB, dC);
        this.inverter.advance(t);
        const [vA, vB, vC] = this.inverter.phaseVoltages();

        // 6. Machine.
        this.machine.setPhaseVoltages(vA, vB, vC);
        this.machine.advance(t);

        // 7. Faults postStep : housing forces from labels.
        for (const f of this.faults) {
            f.postStep?.(t, this.machine, this.housing);
        }
        // 8. Env postStep : housing forces from environment (gravitational load).
        for (const e of this.env) {
            e.postStep?.(t, this.machine, this.housing);
        }

        // 9. Housing integrates with all accumulated forces.
        this.housing.advance(t);

        this._t = t;
    }

    public reset(): void {
        this.machine.reset();
        this.foc.reset();
        this.modulator.reset();
        this.inverter.reset();
        this.housing.reset();
        this.gravityField.reset();
        this.motorTransform.reset();
        this.gravityVector.reset();
        for (const e of this.env) e.reset();
        for (const f of this.faults) f.reset();
        this._t = 0;
        this._started = false;
    }

    // Convenience setter for scenarios that ramp the speed target.
    public setSpeedTarget(omegaRadS: number): void {
        this.foc.setSpeedTarget(omegaRadS);
    }

    public fundamentalElectricalHz(): number {
        return Math.abs(this.machine.omegaM) * this.machine.cfg.polePairs / (2 * Math.PI);
    }

    public fundamentalMechanicalHz(): number {
        return Math.abs(this.machine.omegaM) / (2 * Math.PI);
    }

    public get t(): number {
        return this._t;
    }
}
