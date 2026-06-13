/**
 * Physics.Electric.Motor.PMSM:foc validation.
 *
 *   1. NODE == ORACLE: same feedback / setpoint / v_bus / dt give
 *      V_alpha/V_beta equal to the legacy FocController.references().
 *   2. CLOSED LOOP: FOC + PMSM machine wired in a loop, omega converges
 *      to speed_target (the controller actually commands the machine).
 *   3. Saturations: i_q_ref bounded by iMax; |(v_d,v_q)| <= v_bus/sqrt(3).
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { FocController } from "spikypanda-sensors/sources/motor/pmsm/control/FocController";
import { createPmsmFocNode, createPmsmMachineDqNode, PmsmFocNode, PmsmMachineDqNode } from "../../dev/plugins/physics/src/electric/motor-pmsm/index";

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

describe("PMSM FOC : node equals the legacy oracle", () => {
    it("V_alpha / V_beta match legacy FocController under a feedback sequence", () => {
        const P = 2;
        const iD = (t: number) => 0.1 * Math.sin(2 * Math.PI * 30 * t);
        const iQ = (t: number) => 0.3 * Math.cos(2 * Math.PI * 25 * t);
        const om = (t: number) => 50 + 40 * Math.sin(2 * Math.PI * 5 * t);
        const th = (t: number) => 200 * t;
        const sp = (_t: number) => 100;
        const n = 400;

        const node = createPmsmFocNode(); // defaults, P=2
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        const sId = new FuncSource(iD),
            sIq = new FuncSource(iQ),
            sOm = new FuncSource(om),
            sTh = new FuncSource(th),
            sSp = new FuncSource(sp);
        builder
            .withNodes(node, sId, sIq, sOm, sTh, sSp)
            .withChannel(sId, node, "out", "i_d")
            .withChannel(sIq, node, "out", "i_q")
            .withChannel(sOm, node, "out", "omega")
            .withChannel(sTh, node, "out", "theta_m")
            .withChannel(sSp, node, "out", "speed_target");
        const session = new Session(builder.build());
        node.reset(session);
        const nA: number[] = [],
            nB: number[] = [];
        for (let i = 0; i <= n; i++) {
            session.run(i * DT);
            nA.push(node.V_alpha);
            nB.push(node.V_beta);
        }

        const leg = new FocController({
            speedKp: node.speedKp,
            speedKi: node.speedKi,
            currentKp: node.currentKp,
            currentKi: node.currentKi,
            iMax: node.iMax,
            vMaxPerAxis: node.vMaxPerAxis,
            vBusForSat: node.vBus,
            idRef: node.idRef,
        });
        const lA: number[] = [],
            lB: number[] = [];
        for (let i = 0; i <= n; i++) {
            const t = i * DT;
            leg.setSpeedTarget(sp(t));
            leg.setFeedback(iD(t), iQ(t), om(t), P * th(t));
            leg.advance(t);
            const [a, b] = leg.references();
            lA.push(a);
            lB.push(b);
        }

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
    it("omega converges to the speed setpoint", () => {
        // Consistent ECX-ish drive: gains tuned for the machine defaults
        // (R=2, L=3e-4, lambda=2e-3, P=1, J=1e-6, b=1e-7).
        const machine: PmsmMachineDqNode = createPmsmMachineDqNode(); // P=1 default
        const foc: PmsmFocNode = createPmsmFocNode();
        const kt = 1.5 * 1 * 2e-3;
        const wI = 2 * Math.PI * 1000,
            wW = 2 * Math.PI * 100;
        foc.P = 1;
        foc.currentKp = wI * 3e-4;
        foc.currentKi = wI * 2;
        foc.speedKp = (wW * 1e-6) / kt;
        foc.speedKi = (wW * 1e-7) / kt;
        foc.iMax = 5;
        foc.vMaxPerAxis = 12;
        foc.vBus = 24;

        const target = 100; // rad/s
        // Break the FOC<->machine cycle with one-tick-lagged source nodes
        // that read the other node's live getters (a real graph uses a
        // Control.Feedback:channel for the same Z^-1 effect; a direct
        // Session cycle overflows the capacity-1 slots).
        const sSp = new FuncSource(() => target);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        const fVa = new FuncSource(() => foc.V_a),
            fVb = new FuncSource(() => foc.V_b),
            fVc = new FuncSource(() => foc.V_c);
        const mId = new FuncSource(() => machine.i_d),
            mIq = new FuncSource(() => machine.i_q),
            mOm = new FuncSource(() => machine.omega),
            mTh = new FuncSource(() => machine.theta_m);
        builder
            .withNodes(foc, machine, sSp, fVa, fVb, fVc, mId, mIq, mOm, mTh)
            .withChannel(sSp, foc, "out", "speed_target")
            .withChannel(mId, foc, "out", "i_d")
            .withChannel(mIq, foc, "out", "i_q")
            .withChannel(mOm, foc, "out", "omega")
            .withChannel(mTh, foc, "out", "theta_m")
            .withChannel(fVa, machine, "out", "V_a")
            .withChannel(fVb, machine, "out", "V_b")
            .withChannel(fVc, machine, "out", "V_c");
        const session = new Session(builder.build());
        foc.reset(session);
        machine.reset(session);

        for (let i = 0; i <= 8000; i++) session.run(i * DT); // 0.4 s
        // The closed loop drives the machine to the commanded speed.
        expect(Math.abs(machine.omega - target)).toBeLessThan(0.1 * target);
    });
});

describe("PMSM FOC : saturations", () => {
    function runWith(target: number, n: number): PmsmFocNode {
        const node = createPmsmFocNode();
        // Low bus so the joint v_bus/sqrt(3) cap (~5.8 V) binds below the
        // per-axis cap (12 V), forcing the joint-saturation path.
        node.vBus = 10;
        const sSp = new FuncSource(() => target);
        const sOm = new FuncSource(() => 0); // huge error: omega stuck at 0
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sSp, sOm).withChannel(sSp, node, "out", "speed_target").withChannel(sOm, node, "out", "omega");
        const session = new Session(builder.build());
        node.reset(session);
        for (let i = 0; i <= n; i++) session.run(i * DT);
        return node;
    }

    it("i_q_ref is bounded by +/- iMax under a large speed error", () => {
        const node = runWith(1e6, 500);
        expect(Math.abs(node.iq_ref)).toBeLessThanOrEqual(node.iMax + 1e-9);
    });

    it("the voltage vector is clamped to v_bus/sqrt(3) and flags saturation", () => {
        const node = runWith(1e6, 500);
        const vMag = Math.sqrt(node.vd_ref * node.vd_ref + node.vq_ref * node.vq_ref);
        expect(vMag).toBeLessThanOrEqual(node.vBus / Math.sqrt(3) + 1e-9);
        expect(node.saturated_voltage).toBe(true);
    });
});

describe("PMSM FOC : torque mode bypasses the speed PI", () => {
    function runTorque(iqCmd: number): PmsmFocNode {
        const node = createPmsmFocNode();
        node.torqueMode = true;
        // A huge speed error would slam the speed PI to +/- iMax; torque
        // mode must ignore it and use iq_ref directly instead.
        const sCmd = new FuncSource(() => iqCmd);
        const sSp = new FuncSource(() => 1e6);
        const sOm = new FuncSource(() => 0);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder.withNodes(node, sCmd, sSp, sOm).withChannel(sCmd, node, "out", "iq_ref").withChannel(sSp, node, "out", "speed_target").withChannel(sOm, node, "out", "omega");
        const session = new Session(builder.build());
        node.reset(session);
        for (let i = 0; i <= 200; i++) session.run(i * DT);
        return node;
    }

    it("i_q_ref equals the commanded torque current, ignoring the speed loop", () => {
        const node = runTorque(2.5);
        expect(node.iq_ref).toBeCloseTo(2.5, 9);
    });

    it("the torque command is bounded by +/- iMax", () => {
        const node = runTorque(1e3);
        expect(node.iq_ref).toBeCloseTo(node.iMax, 9);
    });
});
