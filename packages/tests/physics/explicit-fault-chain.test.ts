/**
 * Explicit fault chain, FMEA-layered (cause -> state -> consequence -> symptom):
 *
 *   CAUSE   a fault is an OPERATOR linked to a motor by an `ApplyTo` relation;
 *           it reads the motor MODEL's properties + (for sag) the scene-latent
 *           gravity, and CONTRIBUTES a rotor radial displacement.
 *   STATE   the motor aggregates every contribution into ONE air-gap
 *           eccentricity (eccentricityY/Z).
 *   CONSEQ  the MOTOR (the electromagnetic model) turns that eccentricity into
 *           BOTH a flux modulation (-> armature current) AND a UMP radial force
 *           (-> housing -> vibration). No fault computes flux or UMP.
 *   SYMPTOM current ripple (MCSA) + vibration.
 *
 * No eccentricity -> fluxModulation = 0 -> the motor is bit-exact.
 */
import type { ISession, SceneStateView } from "spikypanda-core";
import { ApplyTo, buildDefaultStateView, RuntimeGraphBuilder, Session } from "spikypanda-core";
import { DcMotorDynamicNode } from "../../dev/plugins/physics/src/electric/motor-dc/index";
import { RotorEccentricityFaultNode } from "../../dev/plugins/physics/src/mechanical/fault/rotor-eccentricity.node";
import { RotorSagFaultNode } from "../../dev/plugins/physics/src/mechanical/fault/rotor-sag.node";
import { RotorImbalanceFaultNode } from "../../dev/plugins/physics/src/mechanical/fault/rotor-imbalance.node";

function viewWithGravity(id: string, g: { x: number; y: number; z: number }): SceneStateView {
    const base = buildDefaultStateView(id);
    return new Proxy(base, { get: (t, p) => (p === "gravity" ? g : Reflect.get(t, p)) });
}
const EARTH = { x: 0, y: 0, z: -9.81 };
const ORBITAL = { x: 0, y: 0, z: 0 };

function mockSession(dt: number): ISession {
    return {
        dt,
        graph: { links: [] },
        linkStates: [],
        consume: () => undefined,
        publish: () => undefined,
        peek: () => undefined,
        sceneStateView: undefined,
    } as unknown as ISession;
}
function inputs(armatureVoltage: number): { get: (k: string) => number | undefined } {
    return { get: (k: string) => (k === "armatureVoltage" ? armatureVoltage : 0) };
}

describe("Explicit fault chain : a CAUSE contributes eccentricity, the MOTOR computes flux + UMP", () => {
    it("a static eccentricity contributes a displacement; the motor turns it into a flux modulation (reading its air gap)", () => {
        const motor = new DcMotorDynamicNode();
        motor.airGap = 5e-4;
        motor.initialRotorAngle = 0; // aligned with eccentricityPhase=0 -> cos(phase)=1
        const fault = new RotorEccentricityFaultNode();
        fault.severity = 0.1; // 10% of the gap
        fault.eccentricityPhase = 0;
        new ApplyTo(fault, motor);

        const session = mockSession(1e-4);
        fault.reset(session);
        motor.reset(session);
        motor.fire(session, 0);

        // δ = severity·airGap (along phase 0 -> δY=δ, δZ=0); flux = δ/airGap = severity.
        expect(fault.eccentricityY).toBeCloseTo(0.1 * 5e-4, 15);
        expect(fault.eccentricityZ).toBeCloseTo(0, 15);
        expect(motor.fluxModulation).toBeCloseTo(0.1, 9);
    });

    it("severity 0 contributes no eccentricity -> no flux (the motor stays bit-exact)", () => {
        const motor = new DcMotorDynamicNode();
        const fault = new RotorEccentricityFaultNode();
        fault.severity = 0;
        new ApplyTo(fault, motor);
        const session = mockSession(1e-4);
        fault.reset(session);
        motor.reset(session);
        motor.fire(session, 0);
        expect(motor.fluxModulation).toBe(0);

        const y = Float64Array.from([2, 314]);
        const dydt = new Float64Array(2);
        motor.rhs(0, y, 0, inputs(0) as never, dydt);
        const ref = new DcMotorDynamicNode();
        const dref = new Float64Array(2);
        ref.rhs(0, y, 0, inputs(0) as never, dref);
        expect(dydt[0]).toBe(dref[0]);
        expect(dydt[1]).toBe(dref[1]);
    });

    it("the motor folds its computed flux into rhs (torque + back-emf scaled by 1+flux)", () => {
        const motor = new DcMotorDynamicNode();
        motor.airGap = 5e-4;
        motor.initialRotorAngle = 0;
        const fault = new RotorEccentricityFaultNode();
        fault.severity = 0.1;
        new ApplyTo(fault, motor);
        const session = mockSession(1e-4);
        fault.reset(session);
        motor.reset(session);
        motor.fire(session, 0);
        const flux = motor.fluxModulation;
        expect(Math.abs(flux)).toBeGreaterThan(1e-3);

        const i = 2,
            omega = 314;
        const y = Float64Array.from([i, omega]);
        const dydt = new Float64Array(2);
        motor.rhs(0, y, 0, inputs(0) as never, dydt);
        const expectedDi = (0 - motor.armatureResistance * i - motor.backEmfConstant * (1 + flux) * omega) / motor.armatureInductance;
        const expectedDomega = (motor.torqueConstant * (1 + flux) * i - motor.viscousFriction * omega) / motor.rotorInertia;
        expect(dydt[0]).toBeCloseTo(expectedDi, 6);
        expect(dydt[1]).toBeCloseTo(expectedDomega, 6);
    });

    it("integrated: the faulted armature current ripples at the rotor frequency, the healthy one is smooth", () => {
        const dt = 1e-4;
        const N = 3000;
        function run(severity: number): number[] {
            const motor = new DcMotorDynamicNode();
            motor.airGap = 5e-4;
            const fault = new RotorEccentricityFaultNode();
            fault.severity = severity; // fraction of the gap
            new ApplyTo(fault, motor);
            const session = mockSession(dt);
            fault.reset(session);
            motor.reset(session);
            const y = new Float64Array(2);
            const dydt = new Float64Array(2);
            const drive = inputs(6);
            const trace: number[] = [];
            motor.gatherState(y, 0);
            for (let k = 0; k < N; k++) {
                motor.fire(session, k * dt); // fault -> eccentricity ; motor -> flux from theta=∫omega
                motor.rhs(0, y, 0, drive as never, dydt);
                y[0] += dydt[0] * dt;
                y[1] += dydt[1] * dt;
                motor.writeState(y, 0);
                if (k > N / 2) trace.push(y[0]);
            }
            return trace;
        }
        const healthy = run(0);
        const faulted = run(0.4);
        let maxDiff = 0;
        for (let k = 0; k < healthy.length; k++) maxDiff = Math.max(maxDiff, Math.abs(faulted[k] - healthy[k]));
        expect(maxDiff).toBeGreaterThan(1e-3);
        let signFlips = 0;
        let prev = 0;
        for (let k = 1; k < faulted.length; k++) {
            const d = faulted[k] - faulted[k - 1] - (healthy[k] - healthy[k - 1]);
            const s = Math.sign(d);
            if (s !== 0 && prev !== 0 && s !== prev) signFlips++;
            if (s !== 0) prev = s;
        }
        expect(signFlips).toBeGreaterThan(5);
    });
});

describe("Explicit fault chain : rotor sag (gravity), ONE eccentricity drives flux + UMP", () => {
    function sagUnder(scene: SceneStateView | null): DcMotorDynamicNode {
        const motor = new DcMotorDynamicNode();
        motor.umpRadialStiffness = 4000; // enable the UMP vibration force
        motor.initialRotorAngle = -Math.PI / 2; // aligned with Earth eccentricity direction -> cos(phase)=1
        const fault = new RotorSagFaultNode();
        new ApplyTo(fault, motor);
        const session = new Session(new RuntimeGraphBuilder().withMode("dynamic").withNodes(motor, fault).build());
        if (scene) session.sceneStateView = scene;
        fault.reset(session);
        motor.reset(session);
        motor.fire(session, 0); // angularVelocity = 0 -> rotorAngle stays at initialRotorAngle
        return motor;
    }

    it("Earth: the SAME air-gap eccentricity drives a flux modulation (current) AND a UMP force (vibration)", () => {
        const motor = sagUnder(viewWithGravity("earth", EARTH));
        const delta = (motor.rotorMass * 9.81) / motor.bearingRadialStiffness; // the shared displacement
        // mechanical: UMP force magnitude = umpStiffness · delta -> housing -> vibration.
        expect(Math.hypot(motor.umpForceY, motor.umpForceZ)).toBeCloseTo(motor.umpRadialStiffness * delta, 9);
        // electrical: flux = delta / airGap (cos(phase)=1 by alignment) -> current.
        expect(motor.fluxModulation).toBeCloseTo(delta / motor.airGap, 12);
        // proof they share ONE eccentricity: flux == |UMP| / (airGap · umpStiffness).
        expect(motor.fluxModulation).toBeCloseTo(Math.hypot(motor.umpForceY, motor.umpForceZ) / (motor.airGap * motor.umpRadialStiffness), 12);
    });

    it("Orbital (microgravity): the eccentricity vanishes -> no flux, no UMP force", () => {
        const motor = sagUnder(viewWithGravity("orbital", ORBITAL));
        expect(motor.fluxModulation).toBeCloseTo(0, 12);
        expect(motor.umpForceY).toBeCloseTo(0, 12);
        expect(motor.umpForceZ).toBeCloseTo(0, 12);
    });

    it("no bound scene: gravity-free (a headless drive stays inert)", () => {
        const motor = sagUnder(null);
        expect(motor.fluxModulation).toBe(0);
        expect(motor.umpForceY).toBe(0);
        expect(motor.umpForceZ).toBe(0);
    });
});

describe("Explicit fault chain : multiple causes feed ONE eccentricity state", () => {
    it("a sag + a static eccentricity superpose on the motor's air-gap eccentricity", () => {
        const motor = new DcMotorDynamicNode();
        motor.umpRadialStiffness = 4000;
        motor.initialRotorAngle = 0;
        const sag = new RotorSagFaultNode();
        const ecc = new RotorEccentricityFaultNode();
        ecc.severity = 0.05;
        ecc.eccentricityPhase = -Math.PI / 2; // same (body -Z) direction as Earth sag, so they add
        new ApplyTo(sag, motor);
        new ApplyTo(ecc, motor);
        const session = new Session(new RuntimeGraphBuilder().withMode("dynamic").withNodes(motor, sag, ecc).build());
        session.sceneStateView = viewWithGravity("earth", EARTH);
        sag.reset(session);
        ecc.reset(session);
        motor.reset(session);
        motor.fire(session, 0);

        // both causes push along body -Z: total displacement = sag δ + static δ.
        const sagDelta = (motor.rotorMass * 9.81) / motor.bearingRadialStiffness;
        const eccDelta = 0.05 * motor.airGap;
        const total = sagDelta + eccDelta;
        // the motor's UMP force magnitude reflects the AGGREGATED eccentricity.
        expect(Math.hypot(motor.umpForceY, motor.umpForceZ)).toBeCloseTo(motor.umpRadialStiffness * total, 9);
    });
});

describe("Explicit fault chain : combined imbalance + eccentricity (vibration masks, current does not)", () => {
    const OMEGA = 100; // rad/s

    // A rotating imbalance force + a static-sag eccentricity UMP, both on one
    // motor; returns the measured vibration force magnitude + the current-side
    // flux signature, for a given imbalance phase.
    function combined(imbalancePhase: number): { force: number; flux: number; ump: number } {
        const motor = new DcMotorDynamicNode();
        motor.umpRadialStiffness = 4000;
        motor.comOffset = 1e-3;
        motor.initialAngularVelocity = OMEGA;
        motor.initialRotorAngle = -Math.PI / 2; // align the rotor with Earth eccentricity -> flux cos(phase)=1
        const sag = new RotorSagFaultNode();
        const imbalance = new RotorImbalanceFaultNode();
        // Match the rotating imbalance force to the sag UMP so opposition cancels.
        const delta = (motor.rotorMass * 9.81) / motor.bearingRadialStiffness;
        const ump = motor.umpRadialStiffness * delta;
        imbalance.severity = ump / (motor.rotorMass * motor.comOffset * OMEGA * OMEGA);
        imbalance.phaseOffset = imbalancePhase;
        new ApplyTo(sag, motor);
        new ApplyTo(imbalance, motor);
        const session = new Session(new RuntimeGraphBuilder().withMode("dynamic").withNodes(motor, sag, imbalance).build());
        session.sceneStateView = viewWithGravity("earth", EARTH);
        sag.reset(session);
        imbalance.reset(session);
        motor.reset(session);
        motor.fire(session, 0);
        return { force: Math.hypot(motor.forceY, motor.forceZ), flux: motor.fluxModulation, ump };
    }

    it("the vibration is the VECTOR SUM: it adds in phase and masks in opposition", () => {
        const inPhase = combined(0); // imbalance aligned with the eccentricity UMP
        const opposed = combined(Math.PI); // imbalance opposed -> cancellation

        // In phase: both forces add -> roughly twice the single-fault UMP.
        expect(inPhase.force).toBeCloseTo(2 * inPhase.ump, 6);
        // Opposed + matched amplitudes: the two faults MASK each other -> ~0
        // vibration, far below either fault alone. A basic amplitude check would
        // read the machine as healthy despite TWO real faults.
        expect(opposed.force).toBeLessThan(opposed.ump * 1e-6);
        expect(inPhase.force).toBeGreaterThan(opposed.force);
    });

    it("the CURRENT signature (flux) is invariant to the imbalance phase -> MCSA un-masks the eccentricity", () => {
        const inPhase = combined(0);
        const opposed = combined(Math.PI);
        // The imbalance is purely mechanical (no air gap): the flux/current
        // depends on the eccentricity ALONE, so it is identical whether the
        // vibration adds or cancels -> the masked eccentricity stays detectable.
        expect(inPhase.flux).toBeCloseTo(opposed.flux, 12);
        expect(Math.abs(opposed.flux)).toBeGreaterThan(1e-6);
    });

    it("nonlinear nuance: a pure imbalance has NO current signature, but a strong one with dynamicEccentricityCoupling does", () => {
        function fluxFromImbalance(coupling: boolean): number {
            const motor = new DcMotorDynamicNode();
            motor.airGap = 5e-4;
            motor.comOffset = 1e-3;
            motor.initialAngularVelocity = 300;
            motor.initialRotorAngle = 0;
            const imbalance = new RotorImbalanceFaultNode();
            imbalance.severity = 5; // a strong imbalance
            imbalance.dynamicEccentricityCoupling = coupling;
            new ApplyTo(imbalance, motor);
            const session = new Session(new RuntimeGraphBuilder().withMode("dynamic").withNodes(motor, imbalance).build());
            // No scene -> no gravity -> no sag: the imbalance is the only fault.
            imbalance.reset(session);
            motor.reset(session);
            motor.fire(session, 0);
            return motor.fluxModulation;
        }
        // Pure imbalance is mechanical only: 1x vibration with NO current signature.
        expect(fluxFromImbalance(false)).toBe(0);
        // Strong imbalance + the nonlinear coupling: the shaft deflection becomes a
        // dynamic eccentricity -> a current signature appears.
        expect(Math.abs(fluxFromImbalance(true))).toBeGreaterThan(1e-9);
    });
});
