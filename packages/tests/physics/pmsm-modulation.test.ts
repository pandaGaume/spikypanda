/**
 * Physics.Electric.Motor.PMSM:svpwm and :inverter validation.
 *
 *   1. NODE == ORACLE: the SVPWM node duties equal the legacy
 *      SvpwmModulator under the same (voltageAlpha, voltageBeta, dcBusVoltage).
 *   2. NODE == ORACLE: the inverter node phase voltages equal the legacy
 *      ThreePhaseInverter under the same duties.
 *   3. CHAIN INVARIANT: in the linear range, Clarke(inverter(svpwm(V_ab)))
 *      recovers (voltageAlpha, voltageBeta); the saturation flag rises beyond
 *      dcBusVoltage / sqrt(3).
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
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

function clarke(a: number, viscousFriction: number, c: number): [number, number] {
    return [(2 / 3) * (a - 0.5 * viscousFriction - 0.5 * c), (2 / 3) * (0.5 * Math.sqrt(3)) * (viscousFriction - c)];
}

// Load a committed golden fixture (captured from the now-removed legacy oracle).
function loadFixture<T>(name: string): T {
    const fs = require("fs");
    const p = require("path").join(__dirname, "__fixtures__", name + ".json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

describe("PMSM SVPWM : node equals the legacy oracle", () => {
    it("duties match the legacy SvpwmModulator", () => {
        const dcBusVoltage = 24;
        const va = (t: number) => 8 * Math.cos(2 * Math.PI * 50 * t);
        const vb = (t: number) => 8 * Math.sin(2 * Math.PI * 50 * t);
        const n = 400;

        const node: PmsmSvpwmNode = createPmsmSvpwmNode();
        const sA = new FuncSource(va),
            sB = new FuncSource(vb),
            sV = new FuncSource(() => dcBusVoltage);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sA, sB, sV).withChannel(sA, node, "out", "voltageAlpha").withChannel(sB, node, "out", "voltageBeta").withChannel(sV, node, "out", "dcBusVoltage");
        const session = new Session(builder.build());
        node.reset(session);

        const oracle = loadFixture<number[][]>("pmsm-svpwm");
        let maxErr = 0;
        for (let i = 0; i <= n; i++) {
            session.run(i * DT);
            const [da, db, dc] = oracle[i];
            maxErr = Math.max(maxErr, Math.abs(node.dutyCycleA - da), Math.abs(node.dutyCycleB - db), Math.abs(node.dutyCycleC - dc));
        }
        expect(maxErr).toBeLessThan(1e-12);
    });
});

describe("PMSM inverter : node equals the legacy oracle", () => {
    it("phase voltages match the legacy ThreePhaseInverter", () => {
        const dcBusVoltage = 24;
        const da = (t: number) => 0.5 + 0.3 * Math.cos(2 * Math.PI * 40 * t);
        const db = (t: number) => 0.5 + 0.3 * Math.cos(2 * Math.PI * 40 * t - (2 * Math.PI) / 3);
        const dc = (t: number) => 0.5 + 0.3 * Math.cos(2 * Math.PI * 40 * t + (2 * Math.PI) / 3);
        const n = 400;

        const node: PmsmInverterNode = createPmsmInverterNode();
        node.dcBusVoltage = dcBusVoltage;
        const sA = new FuncSource(da),
            sB = new FuncSource(db),
            sC = new FuncSource(dc);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sA, sB, sC).withChannel(sA, node, "out", "dutyCycleA").withChannel(sB, node, "out", "dutyCycleB").withChannel(sC, node, "out", "dutyCycleC");
        const session = new Session(builder.build());
        node.reset(session);

        const oracle = loadFixture<number[][]>("pmsm-inverter");
        let maxErr = 0;
        for (let i = 0; i <= n; i++) {
            session.run(i * DT);
            const [a, viscousFriction, c] = oracle[i];
            maxErr = Math.max(maxErr, Math.abs(node.phaseVoltageA - a), Math.abs(node.phaseVoltageB - viscousFriction), Math.abs(node.phaseVoltageC - c));
        }
        expect(maxErr).toBeLessThan(1e-12);
    });
});

describe("PMSM modulation chain : round trip", () => {
    it("Clarke(inverter(svpwm(V_ab))) recovers voltageAlpha / voltageBeta in the linear range", () => {
        const dcBusVoltage = 24;
        const vMax = dcBusVoltage / Math.sqrt(3);
        // A reference well inside the linear circle.
        const vAlpha = 0.6 * vMax,
            vBeta = 0.3 * vMax;

        const svpwm: PmsmSvpwmNode = createPmsmSvpwmNode();
        const inv: PmsmInverterNode = createPmsmInverterNode();
        inv.dcBusVoltage = dcBusVoltage;
        const sA = new FuncSource(() => vAlpha),
            sB = new FuncSource(() => vBeta),
            sV = new FuncSource(() => dcBusVoltage);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder
            .withNodes(svpwm, inv, sA, sB, sV)
            .withChannel(sA, svpwm, "out", "voltageAlpha")
            .withChannel(sB, svpwm, "out", "voltageBeta")
            .withChannel(sV, svpwm, "out", "dcBusVoltage")
            .withChannel(svpwm, inv, "dutyCycleA", "dutyCycleA")
            .withChannel(svpwm, inv, "dutyCycleB", "dutyCycleB")
            .withChannel(svpwm, inv, "dutyCycleC", "dutyCycleC")
            .withChannel(sV, inv, "out", "dcBusVoltage");
        const session = new Session(builder.build());
        svpwm.reset(session);
        inv.reset(session);

        // A few ticks to let the acyclic chain settle through both nodes.
        for (let i = 0; i <= 5; i++) session.run(i * DT);
        const [a, viscousFriction] = clarke(inv.phaseVoltageA, inv.phaseVoltageB, inv.phaseVoltageC);
        expect(Math.abs(a - vAlpha)).toBeLessThan(1e-9);
        expect(Math.abs(viscousFriction - vBeta)).toBeLessThan(1e-9);
        expect(svpwm.saturated).toBe(false);
    });

    it("the saturation flag rises beyond dcBusVoltage / sqrt(3)", () => {
        const dcBusVoltage = 24;
        const vMax = dcBusVoltage / Math.sqrt(3);
        const svpwm: PmsmSvpwmNode = createPmsmSvpwmNode();
        const sA = new FuncSource(() => 1.5 * vMax),
            sB = new FuncSource(() => 0),
            sV = new FuncSource(() => dcBusVoltage);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(svpwm, sA, sB, sV).withChannel(sA, svpwm, "out", "voltageAlpha").withChannel(sB, svpwm, "out", "voltageBeta").withChannel(sV, svpwm, "out", "dcBusVoltage");
        const session = new Session(builder.build());
        svpwm.reset(session);
        for (let i = 0; i <= 3; i++) session.run(i * DT);
        expect(svpwm.saturated).toBe(true);
    });
});
