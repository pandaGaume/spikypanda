/**
 * Smoke tests for the new V2 physics nodes: BLDC + PMSM motor models,
 * BLDC inverter, BLDC speed PI, and the 6 Mechanical sub-plugin nodes.
 *
 * Focus is on instantiation + a few invariants (signs, defaults,
 * monotonicity) rather than full physics correctness; the latter is
 * better validated through dedicated MCSA spectral fixtures.
 */
import type { ISession } from "spikypanda-core";
import {
    BldcMotorDynamicNode,
    PmsmMotorDynamicNode,
    BldcInverterNode,
    BldcSpeedPiNode,
    BearingFaultNode,
    ShaftUnbalanceNode,
    GearMeshNode,
    CoulombFrictionNode,
    AccelerometerNode,
    FaultModulatorNode,
} from "../../dev/plugins/physics/src/index";
import { trapezoidalBackEmf, sinusoidalBackEmf, hallSector } from "../../dev/plugins/physics/src/electric/motor-bldc/back-emf";

function emptySession(): ISession {
    return {
        graph: { links: [] },
        linkStates: [],
        consume: () => undefined,
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
}

// ---------------------------------------------------------------------------
// Back-EMF helpers
// ---------------------------------------------------------------------------

describe("back-EMF shape functions", () => {
    it("trapezoidal is bounded in [-1, 1]", () => {
        for (let k = 0; k < 360; k++) {
            const v = trapezoidalBackEmf(k * Math.PI / 180);
            expect(v).toBeGreaterThanOrEqual(-1);
            expect(v).toBeLessThanOrEqual(1);
        }
    });

    it("trapezoidal reaches +1 at the middle of the positive plateau (θ = 2π/3)", () => {
        expect(trapezoidalBackEmf(2 * Math.PI / 3)).toBeCloseTo(1, 6);
    });

    it("trapezoidal reaches -1 at the middle of the negative plateau (θ = 5π/3)", () => {
        expect(trapezoidalBackEmf(5 * Math.PI / 3)).toBeCloseTo(-1, 6);
    });

    it("sinusoidal matches Math.sin exactly", () => {
        for (let k = 0; k < 10; k++) {
            const x = k * Math.PI / 7;
            expect(sinusoidalBackEmf(x)).toBeCloseTo(Math.sin(x), 12);
        }
    });

    it("hallSector returns 0..5 for one full revolution", () => {
        const seen = new Set<number>();
        for (let k = 0; k < 360; k++) {
            const s = hallSector(k * Math.PI / 180);
            expect(s).toBeGreaterThanOrEqual(0);
            expect(s).toBeLessThanOrEqual(5);
            seen.add(s);
        }
        expect(seen.size).toBe(6);
    });
});

// ---------------------------------------------------------------------------
// BLDC / PMSM dynamic nodes
// ---------------------------------------------------------------------------

describe("BldcMotorDynamicNode", () => {
    it("starts at the configured initial conditions", () => {
        const n = new BldcMotorDynamicNode();
        n.initialAngularVelocity = 50; n.initialRotorAngle = 1.2;
        n.reset(emptySession());
        expect(n.angularVelocity).toBe(50);
        expect(n.rotorAngle).toBe(1.2);
    });

    it("stays bounded over 5000 ticks at dt=100µs with armatureVoltage=0, loadTorque=0", () => {
        const n = new BldcMotorDynamicNode();
        n.initialAngularVelocity = 100;
        n.reset(emptySession());
        const session = emptySession();
        for (let k = 0; k < 5000; k++) n.fire(session, k * 1e-4);
        expect(Number.isFinite(n.angularVelocity)).toBe(true);
        expect(Number.isFinite(n.phaseCurrentA)).toBe(true);
        expect(Math.abs(n.angularVelocity)).toBeLessThan(100);   // decays
    });
});

describe("PmsmMotorDynamicNode", () => {
    it("produces a strictly different transient than BLDC for the same initial state", () => {
        const bldc = new BldcMotorDynamicNode();
        const pmsm = new PmsmMotorDynamicNode();
        bldc.initialAngularVelocity = 100; pmsm.initialAngularVelocity = 100;
        bldc.initialRotorAngle = 0.3; pmsm.initialRotorAngle = 0.3;
        bldc.reset(emptySession()); pmsm.reset(emptySession());
        for (let k = 0; k < 200; k++) {
            bldc.fire(emptySession(), k * 1e-4);
            pmsm.fire(emptySession(), k * 1e-4);
        }
        // The torque ripple structure differs (6f_e for BLDC vs negligible
        // for PMSM in this stub), so the rotor angles must diverge.
        expect(bldc.rotorAngle).not.toBe(pmsm.rotorAngle);
    });
});

// ---------------------------------------------------------------------------
// BLDC inverter
// ---------------------------------------------------------------------------

describe("BldcInverterNode", () => {
    it("outputs zero when dutyCycle is zero", () => {
        const n = new BldcInverterNode();
        n.defaultDcBusVoltage = 24;
        n.fire(emptySession(), 0);
        expect(n.phaseVoltageA).toBe(0);
        expect(n.phaseVoltageB).toBe(0);
        expect(n.phaseVoltageC).toBe(0);
    });

    it("starts in sector 0 when electricalAngle is unwired", () => {
        const n = new BldcInverterNode();
        n.fire(emptySession(), 0);
        expect(n.sector).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// BLDC PI
// ---------------------------------------------------------------------------

describe("BldcSpeedPiNode", () => {
    it("starts with dutyCycle = 0 after reset", () => {
        const n = new BldcSpeedPiNode();
        n.reset(emptySession());
        expect(n.dutyCycle).toBe(0);
        expect(n.integral).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Mechanical sub-plugin nodes
// ---------------------------------------------------------------------------

describe("BearingFaultNode", () => {
    it("output = inputSignal (0) when all amplitudes are zero", () => {
        const n = new BearingFaultNode();
        n.outerRaceAmplitude = 0; n.innerRaceAmplitude = 0; n.ballSpinAmplitude = 0; n.cageAmplitude = 0;
        n.reset(emptySession());
        n.fire(emptySession(), 0);
        expect(n.outputSignal).toBe(0);
    });
});

describe("ShaftUnbalanceNode", () => {
    it("output equals inputSignal (0) at t=0 with phase=0 (sin(0)=0)", () => {
        const n = new ShaftUnbalanceNode();
        n.reset(emptySession());
        n.fire(emptySession(), 0);
        expect(n.outputSignal).toBeCloseTo(0, 12);
    });
});

describe("GearMeshNode", () => {
    it("output = 0 with zero mesh amplitude and zero tooth amplitude", () => {
        const n = new GearMeshNode();
        n.meshAmplitude = 0; n.toothFaultAmplitude = 0;
        n.reset(emptySession());
        n.fire(emptySession(), 0);
        expect(n.outputSignal).toBe(0);
    });
});

describe("CoulombFrictionNode", () => {
    it("returns 0 when angularVelocity = 0 and viscous viscousFriction = 0", () => {
        const n = new CoulombFrictionNode();
        n.viscousFriction = 0;
        n.fire(emptySession(), 0);
        expect(n.frictionTorque).toBe(0);
    });
});

describe("AccelerometerNode", () => {
    it("passes through when all imperfections disabled", () => {
        const n = new AccelerometerNode();
        n.noiseStdDev = 0; n.resolution = 0; n.bandwidthHz = 0;
        n.reset(emptySession());
        n.fire(emptySession(), 0);
        expect(n.measuredVibration).toBe(0);
    });
});

describe("FaultModulatorNode", () => {
    it("output = inputSignal (0) when amplitude is zero", () => {
        const n = new FaultModulatorNode();
        n.amplitude = 0;
        n.reset(emptySession());
        n.fire(emptySession(), 0);
        expect(n.outputSignal).toBe(0);
    });
});
