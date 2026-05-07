import { EccentricityFault } from "spikypanda-sensors/sources/motor/pmsm/faults/EccentricityFault";
import { ImbalanceFault } from "spikypanda-sensors/sources/motor/pmsm/faults/ImbalanceFault";
import { IPmsmFaultNode, IPmsmHousingFaultHost, IPmsmMachineFaultHost } from "spikypanda-sensors/sources/motor/pmsm/faults/PmsmFaultContracts";

class StubMachineHost implements IPmsmMachineFaultHost {
    public thetaM: number = 0;
    public omegaM: number = 0;
    public thetaE: number = 0;
    public envelopes: number[] = [];
    public phaseR: Array<number | null> = [null, null, null];
    public phaseL: Array<number | null> = [null, null, null];

    public addFluxEnvelope(scale: number): void {
        this.envelopes.push(scale);
    }
    public setPhaseResistance(phase: 0 | 1 | 2, r: number | null): void {
        this.phaseR[phase] = r;
    }
    public setPhaseInductance(phase: 0 | 1 | 2, l: number | null): void {
        this.phaseL[phase] = l;
    }
}

class StubHousingHost implements IPmsmHousingFaultHost {
    public forces: Array<[number, number]> = [];
    public addForce(axis: 0 | 1 | 2, force: number): void {
        this.forces.push([axis, force]);
    }
}

describe("ImbalanceFault (D1)", () => {
    it("clamps severity to [0, 1]", () => {
        const f1 = new ImbalanceFault({ severity: 1.5 });
        const f2 = new ImbalanceFault({ severity: -0.2 });
        expect(f1.cfg.severity).toBe(1);
        expect(f2.cfg.severity).toBe(0);
    });

    it("populates default presentation strings from the registry", () => {
        const f = new ImbalanceFault({ severity: 0.5 });
        expect(f.cfg.displayName.length).toBeGreaterThan(0);
        expect(f.cfg.description.length).toBeGreaterThan(0);
    });

    it("postStep injects a rotating force F = m*r*omega^2 on x and y", () => {
        const fault = new ImbalanceFault({ severity: 1, kImbalanceMax: 1e-3 });
        const machine = new StubMachineHost();
        const housing = new StubHousingHost();
        machine.omegaM = 100;        // rad/s
        machine.thetaM = 0;
        fault.postStep!(0, machine, housing);
        const expectedF = 1 * 1e-3 * 100 * 100;
        // theta = 0 -> all force on x, none on y.
        expect(housing.forces).toHaveLength(2);
        expect(housing.forces[0][0]).toBe(0);
        expect(housing.forces[0][1]).toBeCloseTo(expectedF, 9);
        expect(housing.forces[1][0]).toBe(1);
        expect(housing.forces[1][1]).toBeCloseTo(0, 9);
    });

    it("force scales as omega squared", () => {
        const fault = new ImbalanceFault({ severity: 0.5, kImbalanceMax: 1e-3 });
        const machine = new StubMachineHost();
        const housing1 = new StubHousingHost();
        const housing2 = new StubHousingHost();
        machine.omegaM = 50; machine.thetaM = 0;
        fault.postStep!(0, machine, housing1);
        machine.omegaM = 100;
        fault.postStep!(0, machine, housing2);
        const F1 = housing1.forces[0][1];
        const F2 = housing2.forces[0][1];
        // omega doubles -> force quadruples.
        expect(F2 / F1).toBeCloseTo(4, 6);
    });

    it("at severity = 0 produces no force", () => {
        const fault = new ImbalanceFault({ severity: 0 });
        const machine = new StubMachineHost();
        const housing = new StubHousingHost();
        machine.omegaM = 100;
        fault.postStep!(0, machine, housing);
        expect(housing.forces).toHaveLength(0);
    });

    it("preStep is a no-op in Phase 1 (no current coupling)", () => {
        const fault = new ImbalanceFault({ severity: 1 });
        const machine = new StubMachineHost();
        machine.omegaM = 100;
        fault.preStep!(0, machine);
        expect(machine.envelopes).toHaveLength(0);
    });
});

describe("EccentricityFault (D4)", () => {
    it("clamps severity to [0, 1]", () => {
        const f1 = new EccentricityFault({ severity: 1.5 });
        const f2 = new EccentricityFault({ severity: -0.2 });
        expect(f1.cfg.severity).toBe(1);
        expect(f2.cfg.severity).toBe(0);
    });

    it("preStep adds a flux envelope scaled by 1 + epsilon * cos(theta_m - thetaOffset)", () => {
        const fault = new EccentricityFault({ severity: 0.5, epsilonMax: 0.4, thetaOffset: 0 });
        const machine = new StubMachineHost();
        // epsilon = 0.5 * 0.4 = 0.2.
        // theta_m = 0 -> envelope = 1 + 0.2 * cos(0) = 1.2
        machine.thetaM = 0;
        fault.preStep!(0, machine);
        expect(machine.envelopes[0]).toBeCloseTo(1.2, 9);
        // theta_m = pi -> envelope = 1 + 0.2 * cos(pi) = 0.8
        machine.thetaM = Math.PI;
        fault.preStep!(0, machine);
        expect(machine.envelopes[1]).toBeCloseTo(0.8, 9);
    });

    it("at severity = 0 does not modulate flux", () => {
        const fault = new EccentricityFault({ severity: 0 });
        const machine = new StubMachineHost();
        machine.thetaM = 1.0;
        fault.preStep!(0, machine);
        expect(machine.envelopes).toHaveLength(0);
    });

    it("postStep is undefined (eccentricity is captured through flux modulation only)", () => {
        const fault: IPmsmFaultNode = new EccentricityFault({ severity: 0.5 });
        expect(fault.postStep).toBeUndefined();
    });
});
