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
        n.omega0 = 50; n.theta0 = 1.2;
        n.reset(emptySession());
        expect(n.omega).toBe(50);
        expect(n.theta_m).toBe(1.2);
    });

    it("stays bounded over 5000 ticks at dt=100µs with V=0, tau_load=0", () => {
        const n = new BldcMotorDynamicNode();
        n.omega0 = 100;
        n.reset(emptySession());
        const session = emptySession();
        for (let k = 0; k < 5000; k++) n.fire(session, k * 1e-4);
        expect(Number.isFinite(n.omega)).toBe(true);
        expect(Number.isFinite(n.i_a)).toBe(true);
        expect(Math.abs(n.omega)).toBeLessThan(100);   // decays
    });
});

describe("PmsmMotorDynamicNode", () => {
    it("produces a strictly different transient than BLDC for the same initial state", () => {
        const bldc = new BldcMotorDynamicNode();
        const pmsm = new PmsmMotorDynamicNode();
        bldc.omega0 = 100; pmsm.omega0 = 100;
        bldc.theta0 = 0.3; pmsm.theta0 = 0.3;
        bldc.reset(emptySession()); pmsm.reset(emptySession());
        for (let k = 0; k < 200; k++) {
            bldc.fire(emptySession(), k * 1e-4);
            pmsm.fire(emptySession(), k * 1e-4);
        }
        // The torque ripple structure differs (6f_e for BLDC vs negligible
        // for PMSM in this stub), so the rotor angles must diverge.
        expect(bldc.theta_m).not.toBe(pmsm.theta_m);
    });
});

// ---------------------------------------------------------------------------
// BLDC inverter
// ---------------------------------------------------------------------------

describe("BldcInverterNode", () => {
    it("outputs zero when duty is zero", () => {
        const n = new BldcInverterNode();
        n.V_dc_default = 24;
        n.fire(emptySession(), 0);
        expect(n.V_a).toBe(0);
        expect(n.V_b).toBe(0);
        expect(n.V_c).toBe(0);
    });

    it("starts in sector 0 when theta_e is unwired", () => {
        const n = new BldcInverterNode();
        n.fire(emptySession(), 0);
        expect(n.sector).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// BLDC PI
// ---------------------------------------------------------------------------

describe("BldcSpeedPiNode", () => {
    it("starts with duty = 0 after reset", () => {
        const n = new BldcSpeedPiNode();
        n.reset(emptySession());
        expect(n.duty).toBe(0);
        expect(n.integral).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Mechanical sub-plugin nodes
// ---------------------------------------------------------------------------

describe("BearingFaultNode", () => {
    it("output = signal_in (0) when all amplitudes are zero", () => {
        const n = new BearingFaultNode();
        n.bpfoAmp = 0; n.bpfiAmp = 0; n.bsfAmp = 0; n.ftfAmp = 0;
        n.reset(emptySession());
        n.fire(emptySession(), 0);
        expect(n.signal_out).toBe(0);
    });
});

describe("ShaftUnbalanceNode", () => {
    it("output equals signal_in (0) at t=0 with phase=0 (sin(0)=0)", () => {
        const n = new ShaftUnbalanceNode();
        n.reset(emptySession());
        n.fire(emptySession(), 0);
        expect(n.signal_out).toBeCloseTo(0, 12);
    });
});

describe("GearMeshNode", () => {
    it("output = 0 with zero mesh amplitude and zero tooth amplitude", () => {
        const n = new GearMeshNode();
        n.meshAmp = 0; n.toothAmp = 0;
        n.reset(emptySession());
        n.fire(emptySession(), 0);
        expect(n.signal_out).toBe(0);
    });
});

describe("CoulombFrictionNode", () => {
    it("returns 0 when omega = 0 and viscous b = 0", () => {
        const n = new CoulombFrictionNode();
        n.b = 0;
        n.fire(emptySession(), 0);
        expect(n.tau_friction).toBe(0);
    });
});

describe("AccelerometerNode", () => {
    it("passes through when all imperfections disabled", () => {
        const n = new AccelerometerNode();
        n.noiseStd = 0; n.resolution = 0; n.bandwidthHz = 0;
        n.reset(emptySession());
        n.fire(emptySession(), 0);
        expect(n.vibration_measured).toBe(0);
    });
});

describe("FaultModulatorNode", () => {
    it("output = signal_in (0) when amplitude is zero", () => {
        const n = new FaultModulatorNode();
        n.amplitude = 0;
        n.reset(emptySession());
        n.fire(emptySession(), 0);
        expect(n.signal_out).toBe(0);
    });
});
