/**
 * Physics.Electric.Motor.PMSM:foc validation.
 *
 *   1. NODE == ORACLE: same feedback / setpoint / dcBusVoltage / dt give
 *      voltageAlpha/voltageBeta equal to the legacy FocController.references().
 *   2. CLOSED LOOP: FOC + PMSM machine wired in a loop, angularVelocity converges
 *      to speedTarget (the controller actually commands the machine).
 *   3. Saturations: i_q_ref bounded by maxCurrent; |(directAxisVoltage,quadratureAxisVoltage)| <= dcBusVoltage/sqrt(3).
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { createPmsmFocNode, createPmsmMachineDqNode, PmsmFocNode, PmsmMachineDqNode } from "../../dev/plugins/physics/src/electric/motor-pmsm/index";

const DT = 5e-5;

// Load a committed golden fixture (captured from the now-removed legacy oracle).
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

describe("PMSM FOC : node equals the legacy oracle", () => {
    it("voltageAlpha / voltageBeta match legacy FocController under a feedback sequence", () => {
        const iD = (t: number) => 0.1 * Math.sin(2 * Math.PI * 30 * t);
        const iQ = (t: number) => 0.3 * Math.cos(2 * Math.PI * 25 * t);
        const om = (t: number) => 50 + 40 * Math.sin(2 * Math.PI * 5 * t);
        const th = (t: number) => 200 * t;
        const sp = (_t: number) => 100;
        const n = 400;

        const node = createPmsmFocNode(); // defaults, polePairs=2
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        const sId = new FuncSource(iD),
            sIq = new FuncSource(iQ),
            sOm = new FuncSource(om),
            sTh = new FuncSource(th),
            sSp = new FuncSource(sp);
        builder
            .withNodes(node, sId, sIq, sOm, sTh, sSp)
            .withChannel(sId, node, "out", "directAxisCurrent")
            .withChannel(sIq, node, "out", "quadratureAxisCurrent")
            .withChannel(sOm, node, "out", "angularVelocity")
            .withChannel(sTh, node, "out", "rotorAngle")
            .withChannel(sSp, node, "out", "speedTarget");
        const session = new Session(builder.build());
        node.reset(session);
        const nA: number[] = [],
            nB: number[] = [];
        for (let i = 0; i <= n; i++) {
            session.run(i * DT);
            nA.push(node.voltageAlpha);
            nB.push(node.voltageBeta);
        }

        const oracle = loadFixture<{ a: number[]; b: number[] }>("pmsm-foc");
        const lA = oracle.a,
            lB = oracle.b;

        const maxRel = (a: number[], b: number[]): number => {
            let d = 0,
                mx = 1e-9;
            for (let i = 0; i < a.length; i++) {
                d = Math.max(d, Math.abs(a[i] - b[i]));
                mx = Math.max(mx, Math.abs(b[i]));
            }
            return d / mx;
        };
        expect(maxRel(nA, lA)).toBeLessThan(1e-9);
        expect(maxRel(nB, lB)).toBeLessThan(1e-9);
    });
});

describe("PMSM FOC : closed loop commands the machine", () => {
    it("angularVelocity converges to the speed setpoint", () => {
        // Consistent ECX-ish drive: gains tuned for the machine defaults
        // (armatureResistance=2, armatureInductance=3e-4, lambda=2e-3, polePairs=1, rotorInertia=1e-6, b=1e-7).
        const machine: PmsmMachineDqNode = createPmsmMachineDqNode(); // polePairs=1 default
        const foc: PmsmFocNode = createPmsmFocNode();
        const kt = 1.5 * 1 * 2e-3;
        const wI = 2 * Math.PI * 1000,
            wW = 2 * Math.PI * 100;
        foc.polePairs = 1;
        foc.currentProportionalGain = wI * 3e-4;
        foc.currentIntegralGain = wI * 2;
        foc.speedProportionalGain = (wW * 1e-6) / kt;
        foc.speedIntegralGain = (wW * 1e-7) / kt;
        foc.maxCurrent = 5;
        foc.maxVoltagePerAxis = 12;
        foc.dcBusVoltage = 24;

        const target = 100; // rad/s
        // Break the FOC<->machine cycle with one-tick-lagged source nodes
        // that read the other node's live getters (a real graph uses a
        // Control.Feedback:channel for the same Z^-1 effect; a direct
        // Session cycle overflows the capacity-1 slots).
        const sSp = new FuncSource(() => target);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        const fVa = new FuncSource(() => foc.phaseVoltageA),
            fVb = new FuncSource(() => foc.phaseVoltageB),
            fVc = new FuncSource(() => foc.phaseVoltageC);
        const mId = new FuncSource(() => machine.directAxisCurrent),
            mIq = new FuncSource(() => machine.quadratureAxisCurrent),
            mOm = new FuncSource(() => machine.angularVelocity),
            mTh = new FuncSource(() => machine.rotorAngle);
        builder
            .withNodes(foc, machine, sSp, fVa, fVb, fVc, mId, mIq, mOm, mTh)
            .withChannel(sSp, foc, "out", "speedTarget")
            .withChannel(mId, foc, "out", "directAxisCurrent")
            .withChannel(mIq, foc, "out", "quadratureAxisCurrent")
            .withChannel(mOm, foc, "out", "angularVelocity")
            .withChannel(mTh, foc, "out", "rotorAngle")
            .withChannel(fVa, machine, "out", "phaseVoltageA")
            .withChannel(fVb, machine, "out", "phaseVoltageB")
            .withChannel(fVc, machine, "out", "phaseVoltageC");
        const session = new Session(builder.build());
        foc.reset(session);
        machine.reset(session);

        for (let i = 0; i <= 8000; i++) session.run(i * DT); // 0.4 s
        // The closed loop drives the machine to the commanded speed.
        expect(Math.abs(machine.angularVelocity - target)).toBeLessThan(0.1 * target);
    });
});

describe("PMSM FOC : saturations", () => {
    function runWith(target: number, n: number): PmsmFocNode {
        const node = createPmsmFocNode();
        // Low bus so the joint dcBusVoltage/sqrt(3) cap (~5.8 armatureVoltage) binds below the
        // per-axis cap (12 armatureVoltage), forcing the joint-saturation path.
        node.dcBusVoltage = 10;
        const sSp = new FuncSource(() => target);
        const sOm = new FuncSource(() => 0); // huge error: angularVelocity stuck at 0
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sSp, sOm).withChannel(sSp, node, "out", "speedTarget").withChannel(sOm, node, "out", "angularVelocity");
        const session = new Session(builder.build());
        node.reset(session);
        for (let i = 0; i <= n; i++) session.run(i * DT);
        return node;
    }

    it("i_q_ref is bounded by +/- maxCurrent under a large speed error", () => {
        const node = runWith(1e6, 500);
        expect(Math.abs(node.quadratureCurrentReference)).toBeLessThanOrEqual(node.maxCurrent + 1e-9);
    });

    it("the voltage vector is clamped to dcBusVoltage/sqrt(3) and flags saturation", () => {
        const node = runWith(1e6, 500);
        const vMag = Math.sqrt(node.vd_ref * node.vd_ref + node.vq_ref * node.vq_ref);
        expect(vMag).toBeLessThanOrEqual(node.dcBusVoltage / Math.sqrt(3) + 1e-9);
        expect(node.saturated_voltage).toBe(true);
    });
});

describe("PMSM FOC : torque mode bypasses the speed PI", () => {
    function runTorque(iqCmd: number): PmsmFocNode {
        const node = createPmsmFocNode();
        node.torqueMode = true;
        // A huge speed error would slam the speed PI to +/- maxCurrent; torque
        // mode must ignore it and use quadratureCurrentReference directly instead.
        const sCmd = new FuncSource(() => iqCmd);
        const sSp = new FuncSource(() => 1e6);
        const sOm = new FuncSource(() => 0);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder
            .withNodes(node, sCmd, sSp, sOm)
            .withChannel(sCmd, node, "out", "quadratureCurrentReference")
            .withChannel(sSp, node, "out", "speedTarget")
            .withChannel(sOm, node, "out", "angularVelocity");
        const session = new Session(builder.build());
        node.reset(session);
        for (let i = 0; i <= 200; i++) session.run(i * DT);
        return node;
    }

    it("i_q_ref equals the commanded torque current, ignoring the speed loop", () => {
        const node = runTorque(2.5);
        expect(node.quadratureCurrentReference).toBeCloseTo(2.5, 9);
    });

    it("the torque command is bounded by +/- maxCurrent", () => {
        const node = runTorque(1e3);
        expect(node.quadratureCurrentReference).toBeCloseTo(node.maxCurrent, 9);
    });
});
