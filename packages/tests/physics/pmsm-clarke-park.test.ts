/**
 * Physics.Electric.Motor.PMSM:clarke and :park validation.
 *
 *   1. NODE == ORACLE: the Clarke node (abc -> alpha-beta) equals the
 *      legacy ThreePhaseTransforms.clarke.
 *   2. NODE == ORACLE: the Park node (alpha-beta -> dq at polePairs*rotorAngle)
 *      equals the legacy ThreePhaseTransforms.park.
 *   3. CHAIN: Clarke -> Park on balanced phase currents recovers the
 *      legacy abcToDq pipeline (the canonical FOC feedback path).
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { createClarkeNode, createParkNode, ClarkeNode, ParkNode } from "../../dev/plugins/physics/src/electric/motor-pmsm/index";

const DT = 5e-5;

// Load phaseA committed golden fixture (captured from the now-removed legacy oracle).
function loadFixture<T>(name: string): T {
    const fs = require("fs");
    const p = require("path").join(__dirname, "__fixtures__", name + ".json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

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
        const phaseA = (t: number) => 3 * Math.cos(2 * Math.PI * 50 * t);
        const phaseB = (t: number) => 3 * Math.cos(2 * Math.PI * 50 * t - (2 * Math.PI) / 3);
        const phaseC = (t: number) => 3 * Math.cos(2 * Math.PI * 50 * t + (2 * Math.PI) / 3);
        const n = 300;

        const node: ClarkeNode = createClarkeNode();
        const sA = new FuncSource(phaseA),
            sB = new FuncSource(phaseB),
            sC = new FuncSource(phaseC);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sA, sB, sC).withChannel(sA, node, "out", "phaseA").withChannel(sB, node, "out", "phaseB").withChannel(sC, node, "out", "phaseC");
        const session = new Session(builder.build());
        node.reset(session);

        const oracle = loadFixture<number[][]>("pmsm-clarke");
        let maxErr = 0;
        for (let i = 0; i <= n; i++) {
            session.run(i * DT);
            const [al, be] = oracle[i];
            maxErr = Math.max(maxErr, Math.abs(node.alpha - al), Math.abs(node.beta - be));
        }
        expect(maxErr).toBeLessThan(1e-12);
    });
});

describe("PMSM Park : node equals the legacy oracle", () => {
    it("directAxis / quadratureAxis match ThreePhaseTransforms.park at electricalAngle = polePairs*rotorAngle", () => {
        const polePairs = 3;
        const al = (t: number) => 2 * Math.cos(2 * Math.PI * 30 * t);
        const be = (t: number) => 2 * Math.sin(2 * Math.PI * 30 * t);
        const th = (t: number) => 120 * t;
        const n = 300;

        const node: ParkNode = createParkNode();
        node.polePairs = polePairs;
        const sAl = new FuncSource(al),
            sBe = new FuncSource(be),
            sTh = new FuncSource(th);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sAl, sBe, sTh).withChannel(sAl, node, "out", "alpha").withChannel(sBe, node, "out", "beta").withChannel(sTh, node, "out", "rotorAngle");
        const session = new Session(builder.build());
        node.reset(session);

        const oracle = loadFixture<number[][]>("pmsm-park");
        let maxErr = 0;
        for (let i = 0; i <= n; i++) {
            session.run(i * DT);
            const [directAxis, quadratureAxis] = oracle[i];
            maxErr = Math.max(maxErr, Math.abs(node.directAxis - directAxis), Math.abs(node.quadratureAxis - quadratureAxis));
        }
        expect(maxErr).toBeLessThan(1e-12);
    });
});

describe("PMSM Clarke -> Park chain : canonical FOC feedback path", () => {
    it("abc currents through Clarke then Park recover the legacy abcToDq", () => {
        const polePairs = 2;
        const phaseA = (t: number) => 4 * Math.cos(2 * Math.PI * 60 * t);
        const phaseB = (t: number) => 4 * Math.cos(2 * Math.PI * 60 * t - (2 * Math.PI) / 3);
        const phaseC = (t: number) => 4 * Math.cos(2 * Math.PI * 60 * t + (2 * Math.PI) / 3);
        const th = (t: number) => 80 * t;
        const n = 300;

        const clarke: ClarkeNode = createClarkeNode();
        const park: ParkNode = createParkNode();
        park.polePairs = polePairs;
        const sA = new FuncSource(phaseA),
            sB = new FuncSource(phaseB),
            sC = new FuncSource(phaseC),
            sTh = new FuncSource(th);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder
            .withNodes(clarke, park, sA, sB, sC, sTh)
            .withChannel(sA, clarke, "out", "phaseA")
            .withChannel(sB, clarke, "out", "phaseB")
            .withChannel(sC, clarke, "out", "phaseC")
            .withChannel(clarke, park, "alpha", "alpha")
            .withChannel(clarke, park, "beta", "beta")
            .withChannel(sTh, park, "out", "rotorAngle");
        const session = new Session(builder.build());
        clarke.reset(session);
        park.reset(session);

        const oracle = loadFixture<number[][]>("pmsm-clarke-park-chain");
        let maxErr = 0;
        for (let i = 0; i <= n; i++) {
            session.run(i * DT);
            const [directAxis, quadratureAxis] = oracle[i];
            maxErr = Math.max(maxErr, Math.abs(park.directAxis - directAxis), Math.abs(park.quadratureAxis - quadratureAxis));
        }
        expect(maxErr).toBeLessThan(1e-9);
    });
});
