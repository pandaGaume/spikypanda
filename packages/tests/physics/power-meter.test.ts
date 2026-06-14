/**
 * Physics.Electric.Sensor:power validation (analytic, no legacy oracle).
 *
 * Balanced 3-phase sinusoids v_k = V cos(theta+k), i_k = I cos(theta-phi+k):
 *   P  -> 1.5 V I cos(phi)     S -> 1.5 V I     Q -> 1.5 V I |sin(phi)|
 *   PF -> cos(phi)
 * dq channel is exact and instantaneous.
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { createPowerMeterNode, PowerMeterNode } from "../../dev/plugins/physics/src/electric/sensor/index";

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

const V = 10,
    I = 2,
    F = 50,
    W = 2 * Math.PI * F;
const TWO3 = (2 * Math.PI) / 3;

function runAbc(phi: number): PowerMeterNode {
    const node = createPowerMeterNode();
    node.averagingHz = 5; // well below the 50 Hz fundamental
    const va = (t: number) => V * Math.cos(W * t),
        vb = (t: number) => V * Math.cos(W * t - TWO3),
        vc = (t: number) => V * Math.cos(W * t + TWO3);
    const ia = (t: number) => I * Math.cos(W * t - phi),
        ib = (t: number) => I * Math.cos(W * t - phi - TWO3),
        ic = (t: number) => I * Math.cos(W * t - phi + TWO3);
    const srcs: Array<[FuncSource, string]> = [
        [new FuncSource(va), "v_a"],
        [new FuncSource(vb), "v_b"],
        [new FuncSource(vc), "v_c"],
        [new FuncSource(ia), "i_a"],
        [new FuncSource(ib), "i_b"],
        [new FuncSource(ic), "i_c"],
    ];
    const b = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
    b.withNodes(node, ...srcs.map((s) => s[0]));
    for (const [s, slot] of srcs) b.withChannel(s, node, "out", slot);
    const session = new Session(b.build());
    node.reset(session);
    for (let i = 0; i <= 8000; i++) session.run(i * DT); // 0.4 s, settle the averaging
    return node;
}

describe("Power meter : abc indicators", () => {
    const S0 = 1.5 * V * I; // 30 VA

    it("unity power factor (phi = 0): P = S, Q ~ 0, PF ~ 1", () => {
        const n = runAbc(0);
        expect(n.S).toBeCloseTo(S0, 0);
        expect(n.P).toBeGreaterThan(0.97 * S0);
        expect(n.Q).toBeLessThan(0.06 * S0);
        expect(n.power_factor).toBeGreaterThan(0.97);
    });

    it("phi = 60 deg: PF ~ 0.5, P ~ S/2, Q ~ S*sin60", () => {
        const n = runAbc(Math.PI / 3);
        expect(n.power_factor).toBeCloseTo(0.5, 1);
        expect(n.P).toBeCloseTo(S0 * 0.5, 0);
        expect(n.Q).toBeCloseTo(S0 * Math.sin(Math.PI / 3), 0);
    });

    it("purely reactive (phi = 90 deg): P ~ 0, Q ~ S, PF ~ 0", () => {
        const n = runAbc(Math.PI / 2);
        expect(Math.abs(n.P)).toBeLessThan(0.06 * S0);
        expect(n.Q).toBeGreaterThan(0.94 * S0);
        expect(Math.abs(n.power_factor)).toBeLessThan(0.06);
    });

    it("active energy accumulates at the active-power rate", () => {
        const n = runAbc(0);
        // E_active ~ P * total_time over the run (P ~ S0 at PF 1).
        expect(n.E_active / 0.4).toBeCloseTo(S0, 0);
    });
});

describe("Power meter : dq channel is exact", () => {
    it("P_dq / Q_dq match the instantaneous dq power formulas", () => {
        const node = createPowerMeterNode();
        const vd = 12,
            vq = 5,
            idc = 3,
            iqc = 7;
        const srcs: Array<[FuncSource, string]> = [
            [new FuncSource(() => vd), "v_d"],
            [new FuncSource(() => vq), "v_q"],
            [new FuncSource(() => idc), "i_d"],
            [new FuncSource(() => iqc), "i_q"],
        ];
        const b = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        b.withNodes(node, ...srcs.map((s) => s[0]));
        for (const [s, slot] of srcs) b.withChannel(s, node, "out", slot);
        const session = new Session(b.build());
        node.reset(session);
        session.run(0);
        session.run(DT);
        expect(node.P_dq).toBeCloseTo(1.5 * (vd * idc + vq * iqc), 9);
        expect(node.Q_dq).toBeCloseTo(1.5 * (vq * idc - vd * iqc), 9);
    });
});
