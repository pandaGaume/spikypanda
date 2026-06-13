/**
 * Physics.Electric.Motor.PMSM:clarke and :park validation.
 *
 *   1. NODE == ORACLE: the Clarke node (abc -> alpha-beta) equals the
 *      legacy ThreePhaseTransforms.clarke.
 *   2. NODE == ORACLE: the Park node (alpha-beta -> dq at P*theta_m)
 *      equals the legacy ThreePhaseTransforms.park.
 *   3. CHAIN: Clarke -> Park on balanced phase currents recovers the
 *      legacy abcToDq pipeline (the canonical FOC feedback path).
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { ThreePhaseTransforms } from "spikypanda-sensors/sources/motor/pmsm/control/transforms";
import { createClarkeNode, createParkNode, ClarkeNode, ParkNode } from "../../dev/plugins/physics/src/electric/motor-pmsm/index";

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

describe("PMSM Clarke : node equals the legacy oracle", () => {
    it("alpha / beta match ThreePhaseTransforms.clarke", () => {
        const a = (t: number) => 3 * Math.cos(2 * Math.PI * 50 * t);
        const b = (t: number) => 3 * Math.cos(2 * Math.PI * 50 * t - (2 * Math.PI) / 3);
        const c = (t: number) => 3 * Math.cos(2 * Math.PI * 50 * t + (2 * Math.PI) / 3);
        const n = 300;

        const node: ClarkeNode = createClarkeNode();
        const sA = new FuncSource(a),
            sB = new FuncSource(b),
            sC = new FuncSource(c);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sA, sB, sC).withChannel(sA, node, "out", "a").withChannel(sB, node, "out", "b").withChannel(sC, node, "out", "c");
        const session = new Session(builder.build());
        node.reset(session);

        let maxErr = 0;
        for (let i = 0; i <= n; i++) {
            const t = i * DT;
            session.run(t);
            const [al, be] = ThreePhaseTransforms.clarke(a(t), b(t), c(t));
            maxErr = Math.max(maxErr, Math.abs(node.alpha - al), Math.abs(node.beta - be));
        }
        expect(maxErr).toBeLessThan(1e-12);
    });
});

describe("PMSM Park : node equals the legacy oracle", () => {
    it("d / q match ThreePhaseTransforms.park at theta_e = P*theta_m", () => {
        const P = 3;
        const al = (t: number) => 2 * Math.cos(2 * Math.PI * 30 * t);
        const be = (t: number) => 2 * Math.sin(2 * Math.PI * 30 * t);
        const th = (t: number) => 120 * t;
        const n = 300;

        const node: ParkNode = createParkNode();
        node.P = P;
        const sAl = new FuncSource(al),
            sBe = new FuncSource(be),
            sTh = new FuncSource(th);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sAl, sBe, sTh).withChannel(sAl, node, "out", "alpha").withChannel(sBe, node, "out", "beta").withChannel(sTh, node, "out", "theta_m");
        const session = new Session(builder.build());
        node.reset(session);

        let maxErr = 0;
        for (let i = 0; i <= n; i++) {
            const t = i * DT;
            session.run(t);
            const [d, q] = ThreePhaseTransforms.park(al(t), be(t), P * th(t));
            maxErr = Math.max(maxErr, Math.abs(node.d - d), Math.abs(node.q - q));
        }
        expect(maxErr).toBeLessThan(1e-12);
    });
});

describe("PMSM Clarke -> Park chain : canonical FOC feedback path", () => {
    it("abc currents through Clarke then Park recover the legacy abcToDq", () => {
        const P = 2;
        const a = (t: number) => 4 * Math.cos(2 * Math.PI * 60 * t);
        const b = (t: number) => 4 * Math.cos(2 * Math.PI * 60 * t - (2 * Math.PI) / 3);
        const c = (t: number) => 4 * Math.cos(2 * Math.PI * 60 * t + (2 * Math.PI) / 3);
        const th = (t: number) => 80 * t;
        const n = 300;

        const clarke: ClarkeNode = createClarkeNode();
        const park: ParkNode = createParkNode();
        park.P = P;
        const sA = new FuncSource(a),
            sB = new FuncSource(b),
            sC = new FuncSource(c),
            sTh = new FuncSource(th);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder
            .withNodes(clarke, park, sA, sB, sC, sTh)
            .withChannel(sA, clarke, "out", "a")
            .withChannel(sB, clarke, "out", "b")
            .withChannel(sC, clarke, "out", "c")
            .withChannel(clarke, park, "alpha", "alpha")
            .withChannel(clarke, park, "beta", "beta")
            .withChannel(sTh, park, "out", "theta_m");
        const session = new Session(builder.build());
        clarke.reset(session);
        park.reset(session);

        let maxErr = 0;
        for (let i = 0; i <= n; i++) {
            const t = i * DT;
            session.run(t);
            const [d, q] = ThreePhaseTransforms.abcToDq(a(t), b(t), c(t), P * th(t));
            maxErr = Math.max(maxErr, Math.abs(park.d - d), Math.abs(park.q - q));
        }
        expect(maxErr).toBeLessThan(1e-9);
    });
});
