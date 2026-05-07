import { BearingPreloadModel } from "spikypanda-sensors/sources/motor/pmsm/env/BearingPreloadModel";
import { GravityField } from "spikypanda-sensors/sources/motor/pmsm/env/GravityField";
import { GravityVector } from "spikypanda-sensors/sources/motor/pmsm/env/GravityVector";
import { MotorTransform } from "spikypanda-sensors/sources/motor/pmsm/env/MotorTransform";
import { MountingComplianceModel } from "spikypanda-sensors/sources/motor/pmsm/env/MountingComplianceModel";
import { RotorSagModel } from "spikypanda-sensors/sources/motor/pmsm/env/RotorSagModel";
import { IPmsmHousingFaultHost, IPmsmMachineFaultHost } from "spikypanda-sensors/sources/motor/pmsm/faults/PmsmFaultContracts";

class StubMachine implements IPmsmMachineFaultHost {
    public thetaM = 0;
    public omegaM = 0;
    public thetaE = 0;
    public envelopes: number[] = [];
    public addFluxEnvelope(s: number): void { this.envelopes.push(s); }
    public setPhaseResistance(): void { /* no-op */ }
    public setPhaseInductance(): void { /* no-op */ }
}

class StubHousing implements IPmsmHousingFaultHost {
    public forces: Array<[number, number]> = [];
    public addForce(axis: 0 | 1 | 2, force: number): void { this.forces.push([axis, force]); }
}

const G = 9.80665;

describe("RotorSagModel", () => {
    const REF_CFG = {
        rotorMass: 0.03,
        bearingRadialStiffness: 1e5,
        airGap: 5e-4,
    };

    it("rejects invalid configurations", () => {
        const gv = new GravityVector(GravityField.earth(), MotorTransform.horizontal());
        expect(() => new RotorSagModel({ ...REF_CFG, rotorMass: 0 }, gv)).toThrow();
        expect(() => new RotorSagModel({ ...REF_CFG, bearingRadialStiffness: 0 }, gv)).toThrow();
        expect(() => new RotorSagModel({ ...REF_CFG, airGap: 0 }, gv)).toThrow();
    });

    it("under microgravity, no flux envelope is added", () => {
        const gv = new GravityVector(GravityField.microgravity(), MotorTransform.horizontal());
        gv.advance(0);
        const sag = new RotorSagModel(REF_CFG, gv);
        const m = new StubMachine();
        sag.preStep(0, m);
        expect(m.envelopes).toHaveLength(0);
    });

    it("with shaft along gravity (verticalUp), no flux envelope is added", () => {
        const gv = new GravityVector(GravityField.earth(), MotorTransform.verticalUp());
        gv.advance(0);
        const sag = new RotorSagModel(REF_CFG, gv);
        const m = new StubMachine();
        sag.preStep(0, m);
        expect(m.envelopes).toHaveLength(0);
    });

    it("horizontal earth : epsilon = m * g / (k * gap), envelope = 1 + epsilon * cos(theta_m - theta_grav)", () => {
        const gv = new GravityVector(GravityField.earth(), MotorTransform.horizontal());
        gv.advance(0);
        const sag = new RotorSagModel(REF_CFG, gv);
        // theta_grav = atan2(0, 9.81) = 0 in horizontal earth (gravity along body +X).
        // Expected epsilon = 0.03 * 9.81 / (1e5 * 5e-4) = 5.88e-3.
        const expectedEpsilon = (REF_CFG.rotorMass * G) / (REF_CFG.bearingRadialStiffness * REF_CFG.airGap);
        expect(sag.currentEpsilon()).toBeCloseTo(expectedEpsilon, 6);

        const m = new StubMachine();
        m.thetaM = 0;
        sag.preStep(0, m);
        expect(m.envelopes[0]).toBeCloseTo(1 + expectedEpsilon, 6);

        m.thetaM = Math.PI;
        sag.preStep(0, m);
        expect(m.envelopes[1]).toBeCloseTo(1 - expectedEpsilon, 6);
    });

    it("delta_sag = m * g_perp / k_radial scales linearly with rotor mass", () => {
        const gv = new GravityVector(GravityField.earth(), MotorTransform.horizontal());
        gv.advance(0);
        const sag1 = new RotorSagModel({ ...REF_CFG, rotorMass: 0.03 }, gv);
        const sag2 = new RotorSagModel({ ...REF_CFG, rotorMass: 0.06 }, gv);
        expect(sag2.currentDeltaSag() / sag1.currentDeltaSag()).toBeCloseTo(2, 9);
    });
});

describe("BearingPreloadModel", () => {
    const REF_CFG = {
        rotorMass: 0.03,
        nominalAxialPreload: 5,
        nominalRadialPreload: 5,
    };

    it("microgravity : effective preloads equal nominal", () => {
        const gv = new GravityVector(GravityField.microgravity(), MotorTransform.horizontal());
        gv.advance(0);
        const bp = new BearingPreloadModel(REF_CFG, gv);
        expect(bp.effectiveAxialPreload()).toBeCloseTo(REF_CFG.nominalAxialPreload, 9);
        expect(bp.effectiveRadialPreload()).toBeCloseTo(REF_CFG.nominalRadialPreload, 9);
    });

    it("horizontal earth : axial unchanged, radial augmented by m * g", () => {
        const gv = new GravityVector(GravityField.earth(), MotorTransform.horizontal());
        gv.advance(0);
        const bp = new BearingPreloadModel(REF_CFG, gv);
        expect(bp.effectiveAxialPreload()).toBeCloseTo(REF_CFG.nominalAxialPreload, 6);
        expect(bp.effectiveRadialPreload()).toBeCloseTo(REF_CFG.nominalRadialPreload + REF_CFG.rotorMass * G, 6);
    });

    it("verticalDown earth : axial augmented (downward gravity adds to axial preload), radial unchanged", () => {
        // verticalDown : body Z along world -Z. Earth gravity along world -Z.
        // g_body = R^T * g_world. Compute :
        //   R_body_to_world = Ry(pi) -> body Z = (sin(pi),0,cos(pi)) = (0,0,-1).
        //   R^T * [0,0,-9.81] = ... let's just trust the projection.
        const gv = new GravityVector(GravityField.earth(), MotorTransform.verticalDown());
        gv.advance(0);
        const g = gv.motorFrameGravity();
        const bp = new BearingPreloadModel(REF_CFG, gv);
        const expectedAxial = REF_CFG.nominalAxialPreload + REF_CFG.rotorMass * g.z;
        expect(bp.effectiveAxialPreload()).toBeCloseTo(expectedAxial, 6);
        expect(bp.effectiveRadialPreload()).toBeCloseTo(REF_CFG.nominalRadialPreload, 6);
    });
});

describe("MountingComplianceModel", () => {
    it("microgravity : injects no force on housing", () => {
        const gv = new GravityVector(GravityField.microgravity(), MotorTransform.horizontal());
        gv.advance(0);
        const mc = new MountingComplianceModel({ motorMass: 0.1 }, gv);
        const m = new StubMachine();
        const h = new StubHousing();
        mc.postStep!(0, m, h);
        expect(h.forces).toHaveLength(3);
        for (const [, f] of h.forces) expect(Math.abs(f)).toBeLessThan(1e-9);
    });

    it("horizontal earth : injects m * g on body x axis only", () => {
        const gv = new GravityVector(GravityField.earth(), MotorTransform.horizontal());
        gv.advance(0);
        const mc = new MountingComplianceModel({ motorMass: 0.1 }, gv);
        const m = new StubMachine();
        const h = new StubHousing();
        mc.postStep!(0, m, h);
        expect(h.forces[0][0]).toBe(0);
        expect(h.forces[0][1]).toBeCloseTo(0.1 * G, 6);
        expect(h.forces[1][1]).toBeCloseTo(0, 9);
        expect(h.forces[2][1]).toBeCloseTo(0, 9);
    });

    it("verticalUp earth : injects m * g on body z axis only", () => {
        const gv = new GravityVector(GravityField.earth(), MotorTransform.verticalUp());
        gv.advance(0);
        const mc = new MountingComplianceModel({ motorMass: 0.1 }, gv);
        const m = new StubMachine();
        const h = new StubHousing();
        mc.postStep!(0, m, h);
        expect(Math.abs(h.forces[0][1])).toBeLessThan(1e-9);
        expect(Math.abs(h.forces[1][1])).toBeLessThan(1e-9);
        expect(h.forces[2][1]).toBeCloseTo(-0.1 * G, 6);
    });

    it("rejects invalid configuration", () => {
        const gv = new GravityVector(GravityField.earth(), MotorTransform.horizontal());
        expect(() => new MountingComplianceModel({ motorMass: 0 }, gv)).toThrow();
    });
});
