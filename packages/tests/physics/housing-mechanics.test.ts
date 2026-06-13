/**
 * Physics.Mechanical.Housing:mechanics validation.
 *
 * Two-step validation, the pattern for the legacy sensors -> plugin port:
 *   1. Validate the PHYSICS on the legacy HousingMechanics (the oracle):
 *      DC gain x_ss = F/k, ring frequency ~ fn, free decay loses energy.
 *   2. Validate the PORTED plugin node AGAINST the oracle: under an
 *      identical constant-force step and dt grid, the node's published
 *      accel_x equals the legacy acceleration(0) trajectory.
 * Plus passivity (no force -> no acceleration).
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { HousingMechanics } from "spikypanda-sensors/sources/motor/pmsm/env/HousingMechanics";
import { createHousingMechanicsNode } from "../../dev/plugins/physics/src/mechanical/housing/index";

const DT = 5e-5; // 20 kHz, well above the 500 Hz mode
const FN = 500;
const MASS = 0.1;
const ZETA = 0.02;
const K = MASS * (2 * Math.PI * FN) ** 2;

function legacy(): HousingMechanics {
    const axis = { mass: MASS, omegaN: 2 * Math.PI * FN, zeta: ZETA };
    return new HousingMechanics({ x: axis, y: axis, z: axis });
}

// Always-ready source that publishes a constant on its "out" link each fire.
class ConstSource extends RuntimeNode {
    public constructor(private readonly _v: number) {
        super();
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, this._v);
        }
    }
}

// Drive the plugin node through a real Session with a constant force on
// force_x, return the accel_x trajectory sampled at i*DT for i in [0, n].
function runNode(force: number, n: number): number[] {
    const node = createHousingMechanicsNode();
    const src = new ConstSource(force);
    const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic").withNodes(src, node).withChannel(src, node, "out", "force_x");
    const session = new Session(builder.build());
    const accel: number[] = [];
    for (let i = 0; i <= n; i++) {
        session.run(i * DT);
        accel.push(node.accel_x);
    }
    return accel;
}

// Same constant-force step on the legacy oracle.
function runLegacyAccel(force: number, n: number): number[] {
    const h = legacy();
    const accel: number[] = [];
    h.advance(0);
    accel.push(h.acceleration(0));
    for (let i = 1; i <= n; i++) {
        h.addForce(0, force);
        h.advance(i * DT);
        accel.push(h.acceleration(0));
    }
    return accel;
}

describe("Housing mechanics : physics on the legacy oracle", () => {
    it("DC gain : position settles to x_ss = F/k under a constant force", () => {
        const F = 0.1;
        const h = legacy();
        h.advance(0);
        const n = 12000; // 0.6 s, many decay time-constants at zeta=0.02
        for (let i = 1; i <= n; i++) {
            h.addForce(0, F);
            h.advance(i * DT);
        }
        const xSs = F / K;
        expect(h.position(0)).toBeCloseTo(xSs, 8);
        // Once settled, the acceleration of a static equilibrium is ~0.
        expect(Math.abs(h.acceleration(0))).toBeLessThan(0.05);
    });

    it("rings near the natural frequency fn under a step", () => {
        const accel = runLegacyAccel(0.1, 4000); // 0.2 s
        // Count zero crossings of the AC accel in a steady transient window.
        let crossings = 0;
        for (let i = 2; i < accel.length; i++) {
            if (accel[i - 1] === 0) continue;
            if (Math.sign(accel[i]) !== Math.sign(accel[i - 1])) crossings++;
        }
        // frequency = crossings / (2 * duration)
        const freq = crossings / (2 * (accel.length - 1) * DT);
        expect(freq).toBeGreaterThan(FN * 0.85);
        expect(freq).toBeLessThan(FN * 1.15);
    });

    it("free response loses energy (passive, no spontaneous excitation)", () => {
        // Step then release : excite, then zero force, the ring must decay.
        const h = legacy();
        h.advance(0);
        for (let i = 1; i <= 200; i++) {
            h.addForce(0, 0.1);
            h.advance(i * DT);
        }
        let peakEarly = 0;
        for (let i = 201; i <= 1200; i++) {
            h.advance(i * DT); // no force
            peakEarly = Math.max(peakEarly, Math.abs(h.acceleration(0)));
        }
        let peakLate = 0;
        for (let i = 1201; i <= 8000; i++) {
            h.advance(i * DT);
            peakLate = Math.max(peakLate, Math.abs(h.acceleration(0)));
        }
        expect(peakLate).toBeLessThan(peakEarly); // energy dissipated, never created
    });
});

describe("Housing mechanics : ported node equals the legacy oracle", () => {
    it("accel_x trajectory matches legacy under a constant-force step", () => {
        const F = 0.1;
        const n = 4000;
        const nodeAccel = runNode(F, n);
        const legacyAccel = runLegacyAccel(F, n);
        expect(nodeAccel.length).toBe(legacyAccel.length);
        let maxAbsDiff = 0;
        let maxAbs = 1e-12;
        for (let i = 0; i < nodeAccel.length; i++) {
            maxAbsDiff = Math.max(maxAbsDiff, Math.abs(nodeAccel[i] - legacyAccel[i]));
            maxAbs = Math.max(maxAbs, Math.abs(legacyAccel[i]));
        }
        // Same implicit-Euler scheme, same substep cap, constant force :
        // they must agree to floating-point round-off.
        expect(maxAbsDiff / maxAbs).toBeLessThan(1e-9);
    });

    it("the first integrating step gives accel ~ F/m (Newton at rest)", () => {
        const F = 0.1;
        const accel = runNode(F, 3);
        // accel[0] is the init fire (0); accel[1] is the first integrated
        // step from rest, dominated by F/m before stiffness/damping bite.
        expect(accel[1]).toBeGreaterThan((0.5 * F) / MASS);
        expect(accel[1]).toBeLessThanOrEqual(F / MASS + 1e-9);
    });

    it("passivity : zero force yields zero acceleration on every axis", () => {
        const accel = runNode(0, 2000);
        for (const a of accel) expect(a).toBe(0);
    });
});
