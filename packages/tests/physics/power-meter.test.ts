/**
 * Physics.Electric.Sensor:power validation (analytic, no legacy oracle).
 *
 * Balanced 3-phase sinusoids v_k = armatureVoltage cos(theta+k), i_k = I cos(theta-phi+k):
 *   activePower  -> 1.5 armatureVoltage I cos(phi)     apparentPower -> 1.5 armatureVoltage I     reactivePower -> 1.5 armatureVoltage I |sin(phi)|
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

const armatureVoltage = 10,
    I = 2,
    F = 50,
    W = 2 * Math.PI * F;
const TWO3 = (2 * Math.PI) / 3;

function runAbc(phi: number): PowerMeterNode {
    const node = createPowerMeterNode();
    node.averagingFrequencyHz = 5; // well below the 50 Hz fundamental
    const va = (t: number) => armatureVoltage * Math.cos(W * t),
        vb = (t: number) => armatureVoltage * Math.cos(W * t - TWO3),
        vc = (t: number) => armatureVoltage * Math.cos(W * t + TWO3);
    const ia = (t: number) => I * Math.cos(W * t - phi),
        ib = (t: number) => I * Math.cos(W * t - phi - TWO3),
        ic = (t: number) => I * Math.cos(W * t - phi + TWO3);
    const srcs: Array<[FuncSource, string]> = [
        [new FuncSource(va), "phaseVoltageA"],
        [new FuncSource(vb), "phaseVoltageB"],
        [new FuncSource(vc), "phaseVoltageC"],
        [new FuncSource(ia), "phaseCurrentA"],
        [new FuncSource(ib), "phaseCurrentB"],
        [new FuncSource(ic), "phaseCurrentC"],
    ];
    const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
    builder.withNodes(node, ...srcs.map((s) => s[0]));
    for (const [s, slot] of srcs) builder.withChannel(s, node, "out", slot);
    const session = new Session(builder.build());
    node.reset(session);
    for (let i = 0; i <= 8000; i++) session.run(i * DT); // 0.4 s, settle the averaging
    return node;
}

describe("Power meter : abc indicators", () => {
    const S0 = 1.5 * armatureVoltage * I; // 30 VA

    it("unity power factor (phi = 0): activePower = apparentPower, reactivePower ~ 0, PF ~ 1", () => {
        const n = runAbc(0);
        expect(n.apparentPower).toBeCloseTo(S0, 0);
        expect(n.activePower).toBeGreaterThan(0.97 * S0);
        expect(n.reactivePower).toBeLessThan(0.06 * S0);
        expect(n.powerFactor).toBeGreaterThan(0.97);
    });

    it("phi = 60 deg: PF ~ 0.5, activePower ~ apparentPower/2, reactivePower ~ apparentPower*sin60", () => {
        const n = runAbc(Math.PI / 3);
        expect(n.powerFactor).toBeCloseTo(0.5, 1);
        expect(n.activePower).toBeCloseTo(S0 * 0.5, 0);
        expect(n.reactivePower).toBeCloseTo(S0 * Math.sin(Math.PI / 3), 0);
    });

    it("purely reactive (phi = 90 deg): activePower ~ 0, reactivePower ~ apparentPower, PF ~ 0", () => {
        const n = runAbc(Math.PI / 2);
        expect(Math.abs(n.activePower)).toBeLessThan(0.06 * S0);
        expect(n.reactivePower).toBeGreaterThan(0.94 * S0);
        expect(Math.abs(n.powerFactor)).toBeLessThan(0.06);
    });

    it("active energy accumulates at the active-power rate", () => {
        const n = runAbc(0);
        // activeEnergy ~ activePower * total_time over the run (activePower ~ S0 at PF 1).
        expect(n.activeEnergy / 0.4).toBeCloseTo(S0, 0);
    });
});

describe("Power meter : dq channel is exact", () => {
    it("activePowerDq / reactivePowerDq match the instantaneous dq power formulas", () => {
        const node = createPowerMeterNode();
        const vd = 12,
            vq = 5,
            idc = 3,
            iqc = 7;
        const srcs: Array<[FuncSource, string]> = [
            [new FuncSource(() => vd), "directAxisVoltage"],
            [new FuncSource(() => vq), "quadratureAxisVoltage"],
            [new FuncSource(() => idc), "directAxisCurrent"],
            [new FuncSource(() => iqc), "quadratureAxisCurrent"],
        ];
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, ...srcs.map((s) => s[0]));
        for (const [s, slot] of srcs) builder.withChannel(s, node, "out", slot);
        const session = new Session(builder.build());
        node.reset(session);
        session.run(0);
        session.run(DT);
        expect(node.activePowerDq).toBeCloseTo(1.5 * (vd * idc + vq * iqc), 9);
        expect(node.reactivePowerDq).toBeCloseTo(1.5 * (vq * idc - vd * iqc), 9);
    });
});
