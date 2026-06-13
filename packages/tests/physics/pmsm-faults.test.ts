/**
 * Physics.Mechanical.Fault:eccentricity and :imbalance validation against
 * the legacy sensors fault oracle (EccentricityFault, ImbalanceFault).
 *
 *   1. Eccentricity flux delta == legacy preStep addFluxEnvelope envelope
 *      (envelope = 1 + delta) across a theta_m sweep; zero at severity 0.
 *   2. Imbalance force_y/z == legacy postStep centripetal force m*r*omega^2
 *      in quadrature; scales with omega^2 and severity.
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { EccentricityFault } from "spikypanda-sensors/sources/motor/pmsm/faults/EccentricityFault";
import { ImbalanceFault } from "spikypanda-sensors/sources/motor/pmsm/faults/ImbalanceFault";
import { createEccentricityFaultNode, createImbalanceFaultNode, EccentricityFaultNode } from "../../dev/plugins/physics/src/mechanical/fault/index";

const DT = 5e-5;

class FuncSource extends RuntimeNode {
    public constructor(private readonly _f: (t: number) => number) {
        super();
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, this._f(t));
        }
    }
}

function runNode(node: RuntimeNode, inputs: Record<string, number>): void {
    const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
    const srcs: FuncSource[] = [];
    const slots: string[] = [];
    for (const slot of Object.keys(inputs)) {
        srcs.push(new FuncSource(() => inputs[slot]));
        slots.push(slot);
    }
    builder.withNodes(node, ...srcs);
    for (let i = 0; i < srcs.length; i++) builder.withChannel(srcs[i], node, "out", slots[i]);
    const session = new Session(builder.build());
    node.reset(session);
    session.run(0);
    session.run(DT);
}

// Legacy machine fault host capturing addFluxEnvelope / addForce.
function legacyFluxEnvelope(fault: EccentricityFault, thetaM: number): number {
    let captured = 1;
    fault.preStep(0, {
        thetaM,
        omegaM: 0,
        thetaE: 0,
        setPhaseResistance() {},
        setPhaseInductance() {},
        addFluxEnvelope(s: number) {
            captured = s;
        },
    });
    return captured;
}

describe("Eccentricity fault == legacy oracle", () => {
    it("flux_envelope matches legacy preStep across a theta_m sweep", () => {
        const severity = 0.4,
            epsilonMax = 0.5,
            thetaOffset = 0.3;
        const legacy = new EccentricityFault({ severity, epsilonMax, thetaOffset });
        let maxErr = 0;
        for (let k = 0; k <= 32; k++) {
            const thetaM = (2 * Math.PI * k) / 32;
            const node: EccentricityFaultNode = createEccentricityFaultNode();
            node.severity = severity;
            node.epsilonMax = epsilonMax;
            node.thetaOffset = thetaOffset;
            runNode(node, { theta_m: thetaM });
            maxErr = Math.max(maxErr, Math.abs(node.flux_envelope - legacyFluxEnvelope(legacy, thetaM)));
        }
        expect(maxErr).toBeLessThan(1e-12);
    });

    it("zero severity yields no modulation", () => {
        const node = createEccentricityFaultNode();
        runNode(node, { theta_m: 1.0 });
        expect(node.flux_envelope).toBe(1);
        expect(node.flux_delta).toBe(0);
    });
});

describe("Imbalance fault == legacy oracle", () => {
    function legacyForces(fault: ImbalanceFault, omega: number, thetaM: number): [number, number] {
        const f = [0, 0, 0];
        fault.postStep(
            0,
            { thetaM, omegaM: omega, thetaE: 0, setPhaseResistance() {}, setPhaseInductance() {}, addFluxEnvelope() {} },
            {
                addForce(axis: 0 | 1 | 2, force: number) {
                    f[axis] += force;
                },
            }
        );
        return [f[1], f[2]];
    }

    it("force_y / force_z match legacy postStep centripetal force", () => {
        const severity = 0.6,
            kImbalanceMax = 5e-6;
        const legacy = new ImbalanceFault({ severity, kImbalanceMax });
        const omega = 314,
            thetaM = 1.234;

        const node = createImbalanceFaultNode();
        node.severity = severity;
        node.kImbalanceMax = kImbalanceMax;
        runNode(node, { omega, theta_m: thetaM });
        const [ly, lz] = legacyForces(legacy, omega, thetaM);
        expect(Math.abs(node.force_y - ly)).toBeLessThan(1e-15);
        expect(Math.abs(node.force_z - lz)).toBeLessThan(1e-15);
        // axis x sees no force; the magnitude is m*r*omega^2.
        const mag = Math.sqrt(node.force_y ** 2 + node.force_z ** 2);
        expect(mag).toBeCloseTo(severity * kImbalanceMax * omega * omega, 12);
    });

    it("force scales with omega^2", () => {
        const make = (omega: number): number => {
            const node = createImbalanceFaultNode();
            node.severity = 1;
            runNode(node, { omega, theta_m: 0 });
            return node.force_y; // theta_m=0 -> force on y
        };
        const f1 = make(100);
        const f2 = make(200);
        expect(f2 / f1).toBeCloseTo(4, 6); // 2x omega -> 4x force
    });
});
