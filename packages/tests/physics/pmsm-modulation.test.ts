/**
 * Physics.Electric.Motor.PMSM:svpwm and :inverter validation.
 *
 *   1. NODE == ORACLE: the SVPWM node duties equal the legacy
 *      SvpwmModulator under the same (V_alpha, V_beta, v_bus).
 *   2. NODE == ORACLE: the inverter node phase voltages equal the legacy
 *      ThreePhaseInverter under the same duties.
 *   3. CHAIN INVARIANT: in the linear range, Clarke(inverter(svpwm(V_ab)))
 *      recovers (V_alpha, V_beta); the saturation flag rises beyond
 *      v_bus / sqrt(3).
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { SvpwmModulator } from "spikypanda-sensors/sources/motor/pmsm/modulator/SvpwmModulator";
import { ThreePhaseInverter } from "spikypanda-sensors/sources/motor/pmsm/inverter/ThreePhaseInverter";
import { createPmsmInverterNode, createPmsmSvpwmNode, PmsmInverterNode, PmsmSvpwmNode } from "../../dev/plugins/physics/src/electric/motor-pmsm/index";

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

function clarke(a: number, b: number, c: number): [number, number] {
    return [(2 / 3) * (a - 0.5 * b - 0.5 * c), (2 / 3) * (0.5 * Math.sqrt(3)) * (b - c)];
}

describe("PMSM SVPWM : node equals the legacy oracle", () => {
    it("duties match the legacy SvpwmModulator", () => {
        const vBus = 24;
        const va = (t: number) => 8 * Math.cos(2 * Math.PI * 50 * t);
        const vb = (t: number) => 8 * Math.sin(2 * Math.PI * 50 * t);
        const n = 400;

        const node: PmsmSvpwmNode = createPmsmSvpwmNode();
        const sA = new FuncSource(va),
            sB = new FuncSource(vb),
            sV = new FuncSource(() => vBus);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sA, sB, sV).withChannel(sA, node, "out", "V_alpha").withChannel(sB, node, "out", "V_beta").withChannel(sV, node, "out", "v_bus");
        const session = new Session(builder.build());
        node.reset(session);

        const leg = new SvpwmModulator({ pwmFrequencyHz: node.pwmFrequencyHz });
        let maxErr = 0;
        for (let i = 0; i <= n; i++) {
            const t = i * DT;
            session.run(t);
            leg.setReference(va(t), vb(t));
            leg.setVBus(vBus);
            leg.advance(t);
            const [da, db, dc] = leg.duties();
            maxErr = Math.max(maxErr, Math.abs(node.duty_a - da), Math.abs(node.duty_b - db), Math.abs(node.duty_c - dc));
        }
        expect(maxErr).toBeLessThan(1e-12);
    });
});

describe("PMSM inverter : node equals the legacy oracle", () => {
    it("phase voltages match the legacy ThreePhaseInverter", () => {
        const vBus = 24;
        const da = (t: number) => 0.5 + 0.3 * Math.cos(2 * Math.PI * 40 * t);
        const db = (t: number) => 0.5 + 0.3 * Math.cos(2 * Math.PI * 40 * t - (2 * Math.PI) / 3);
        const dc = (t: number) => 0.5 + 0.3 * Math.cos(2 * Math.PI * 40 * t + (2 * Math.PI) / 3);
        const n = 400;

        const node: PmsmInverterNode = createPmsmInverterNode();
        node.vBus = vBus;
        const sA = new FuncSource(da),
            sB = new FuncSource(db),
            sC = new FuncSource(dc);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sA, sB, sC).withChannel(sA, node, "out", "duty_a").withChannel(sB, node, "out", "duty_b").withChannel(sC, node, "out", "duty_c");
        const session = new Session(builder.build());
        node.reset(session);

        const leg = new ThreePhaseInverter({ vBus });
        let maxErr = 0;
        for (let i = 0; i <= n; i++) {
            const t = i * DT;
            session.run(t);
            leg.setDuties(da(t), db(t), dc(t));
            leg.advance(t);
            const [a, b, c] = leg.phaseVoltages();
            maxErr = Math.max(maxErr, Math.abs(node.V_a - a), Math.abs(node.V_b - b), Math.abs(node.V_c - c));
        }
        expect(maxErr).toBeLessThan(1e-12);
    });
});

describe("PMSM modulation chain : round trip", () => {
    it("Clarke(inverter(svpwm(V_ab))) recovers V_alpha / V_beta in the linear range", () => {
        const vBus = 24;
        const vMax = vBus / Math.sqrt(3);
        // A reference well inside the linear circle.
        const vAlpha = 0.6 * vMax,
            vBeta = 0.3 * vMax;

        const svpwm: PmsmSvpwmNode = createPmsmSvpwmNode();
        const inv: PmsmInverterNode = createPmsmInverterNode();
        inv.vBus = vBus;
        const sA = new FuncSource(() => vAlpha),
            sB = new FuncSource(() => vBeta),
            sV = new FuncSource(() => vBus);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder
            .withNodes(svpwm, inv, sA, sB, sV)
            .withChannel(sA, svpwm, "out", "V_alpha")
            .withChannel(sB, svpwm, "out", "V_beta")
            .withChannel(sV, svpwm, "out", "v_bus")
            .withChannel(svpwm, inv, "duty_a", "duty_a")
            .withChannel(svpwm, inv, "duty_b", "duty_b")
            .withChannel(svpwm, inv, "duty_c", "duty_c")
            .withChannel(sV, inv, "out", "v_bus");
        const session = new Session(builder.build());
        svpwm.reset(session);
        inv.reset(session);

        // A few ticks to let the acyclic chain settle through both nodes.
        for (let i = 0; i <= 5; i++) session.run(i * DT);
        const [a, b] = clarke(inv.V_a, inv.V_b, inv.V_c);
        expect(Math.abs(a - vAlpha)).toBeLessThan(1e-9);
        expect(Math.abs(b - vBeta)).toBeLessThan(1e-9);
        expect(svpwm.saturated).toBe(false);
    });

    it("the saturation flag rises beyond v_bus / sqrt(3)", () => {
        const vBus = 24;
        const vMax = vBus / Math.sqrt(3);
        const svpwm: PmsmSvpwmNode = createPmsmSvpwmNode();
        const sA = new FuncSource(() => 1.5 * vMax),
            sB = new FuncSource(() => 0),
            sV = new FuncSource(() => vBus);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(svpwm, sA, sB, sV).withChannel(sA, svpwm, "out", "V_alpha").withChannel(sB, svpwm, "out", "V_beta").withChannel(sV, svpwm, "out", "v_bus");
        const session = new Session(builder.build());
        svpwm.reset(session);
        for (let i = 0; i <= 3; i++) session.run(i * DT);
        expect(svpwm.saturated).toBe(true);
    });
});
