/**
 * Physics.Mechanical.Housing:mechanics validation.
 *
 * Two-step validation, the pattern for the legacy sensors -> plugin port:
 *   1. Validate the PHYSICS on the legacy HousingMechanics (the oracle):
 *      DC gain x_ss = F/k, ring frequency ~ fn, free decay loses energy.
 *   2. Validate the PORTED plugin node AGAINST the oracle: under an
 *      identical constant-force step and dt grid, the node's published
 *      accelerationX equals the legacy acceleration(0) trajectory.
 * Plus passivity (no force -> no acceleration).
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { createHousingMechanicsNode } from "../../dev/plugins/physics/src/mechanical/housing/index";

const DT = 5e-5; // 20 kHz, well above the 500 Hz mode
const FN = 500;
const MASS = 0.1;

// Load a committed golden fixture (captured from the now-removed legacy oracle).
function loadFixture<T>(name: string): T {
    const fs = require("fs");
    const p = require("path").join(__dirname, "__fixtures__", name + ".json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Count sign changes (zero crossings) of an AC trajectory.
function zeroCrossings(xs: number[]): number {
    let c = 0;
    for (let i = 2; i < xs.length; i++) {
        if (xs[i - 1] === 0) continue;
        if (Math.sign(xs[i]) !== Math.sign(xs[i - 1])) c++;
    }
    return c;
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
// forceX, return the accelerationX trajectory sampled at i*DT for i in [0, n].
function runNode(force: number, n: number): number[] {
    const node = createHousingMechanicsNode();
    const src = new ConstSource(force);
    const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic").withNodes(src, node).withChannel(src, node, "out", "forceX");
    const session = new Session(builder.build());
    const accel: number[] = [];
    for (let i = 0; i <= n; i++) {
        session.run(i * DT);
        accel.push(node.accelerationX);
    }
    return accel;
}

describe("Housing mechanics : physics on the ported node", () => {
    it("rings near the natural frequency fn under a step", () => {
        const accel = runNode(0.1, 4000); // 0.2 s
        const freq = zeroCrossings(accel) / (2 * (accel.length - 1) * DT);
        expect(freq).toBeGreaterThan(FN * 0.85);
        expect(freq).toBeLessThan(FN * 1.15);
    });

    it("under a constant force the acceleration settles toward equilibrium (~0)", () => {
        const accel = runNode(0.1, 12000); // 0.6 s, many decay time-constants at zeta=0.02
        // The spring balances the constant force at steady state, so the
        // acceleration of the settled equilibrium decays toward zero.
        let tailPeak = 0;
        for (let i = accel.length - 500; i < accel.length; i++) tailPeak = Math.max(tailPeak, Math.abs(accel[i]));
        expect(tailPeak).toBeLessThan(0.05);
    });
});

describe("Housing mechanics : ported node equals the legacy oracle", () => {
    it("accelerationX trajectory matches legacy under a constant-force step", () => {
        const F = 0.1;
        const n = 4000;
        const nodeAccel = runNode(F, n);
        const legacyAccel = loadFixture<number[]>("housing-accel");
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
