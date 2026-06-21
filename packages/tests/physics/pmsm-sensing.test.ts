/**
 * PMSM sensing chains (reuse of existing generic transducers, no legacy
 * ideal-adapter port):
 *
 *   1. Current sensor (Physics.Electric.Sensor:current) on the PMSM phase
 *      current: ideal bypass measures phaseCurrentA exactly; quantization snaps to
 *      the ADC step. The machine's per-tick stream output feeds the
 *      sensor's signal-kind input transparently.
 *   2. Vibration chain: an Imbalance fault force -> Housing Mechanics ->
 *      Accelerometer yields a measured vibration that vanishes when the
 *      fault is off.
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { createPmsmMachineDqNode } from "../../dev/plugins/physics/src/electric/motor-pmsm/index";
import { createCurrentSensorNode } from "../../dev/plugins/physics/src/electric/sensor/index";
import { createImbalanceFaultNode } from "../../dev/plugins/physics/src/mechanical/fault/index";
import { createHousingMechanicsNode } from "../../dev/plugins/physics/src/mechanical/housing/index";
import { createAccelerometerNode } from "../../dev/plugins/physics/src/mechanical/vibration/index";

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

describe("Current sensor on a PMSM phase current", () => {
    function run(resolution: number): { ia: number[]; meas: number[] } {
        const m = createPmsmMachineDqNode();
        m.initialAngularVelocity = 250;
        const cs = createCurrentSensorNode();
        cs.bandwidthHz = 0; // ideal LPF bypass
        cs.noiseStdDev = 0;
        cs.resolution = resolution;
        const va = (t: number) => 0.3 * Math.cos(250 * t),
            vb = (t: number) => 0.3 * Math.cos(250 * t - (2 * Math.PI) / 3),
            vc = (t: number) => 0.3 * Math.cos(250 * t + (2 * Math.PI) / 3);
        const sA = new FuncSource(va),
            sB = new FuncSource(vb),
            sC = new FuncSource(vc);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder
            .withNodes(m, cs, sA, sB, sC)
            .withChannel(sA, m, "out", "phaseVoltageA")
            .withChannel(sB, m, "out", "phaseVoltageB")
            .withChannel(sC, m, "out", "phaseVoltageC")
            .withChannel(m, cs, "phaseCurrentA", "armatureCurrent");
        const session = new Session(builder.build());
        m.reset(session);
        cs.reset(session);
        const ia: number[] = [],
            meas: number[] = [];
        for (let i = 0; i <= 200; i++) {
            session.run(i * DT);
            ia.push(m.phaseCurrentA);
            meas.push(cs.measuredCurrent);
        }
        return { ia, meas };
    }

    it("ideal bypass measures the phase current exactly", () => {
        const { ia, meas } = run(0);
        let maxErr = 0;
        for (let i = 0; i < ia.length; i++) maxErr = Math.max(maxErr, Math.abs(ia[i] - meas[i]));
        expect(maxErr).toBeLessThan(1e-9);
    });

    it("quantization snaps to the ADC step", () => {
        const resolution = 0.01;
        const { ia, meas } = run(resolution);
        let maxErr = 0,
            maxSnap = 0;
        for (let i = 0; i < ia.length; i++) {
            maxErr = Math.max(maxErr, Math.abs(ia[i] - meas[i]));
            maxSnap = Math.max(maxSnap, Math.abs(meas[i] / resolution - Math.round(meas[i] / resolution)));
        }
        expect(maxSnap).toBeLessThan(1e-9); // measured is a multiple of resolution
        expect(maxErr).toBeLessThanOrEqual(resolution); // within one ADC step
    });
});

describe("Vibration chain : Imbalance -> Housing -> Accelerometer", () => {
    function acRms(xs: number[]): number {
        let m = 0;
        for (const x of xs) m += x;
        m /= xs.length;
        let s = 0;
        for (const x of xs) s += (x - m) * (x - m);
        return Math.sqrt(s / xs.length);
    }

    function measuredVibration(severity: number): number[] {
        const angularVelocity = 200;
        const imb = createImbalanceFaultNode();
        imb.severity = severity;
        imb.maxUnbalanceProduct = 1e-3; // exaggerate for a clearly visible bench signal
        const housing = createHousingMechanicsNode();
        const accel = createAccelerometerNode();
        accel.noiseStdDev = 0;
        accel.resolution = 0;
        accel.bandwidthHz = 0; // ideal: read the housing acceleration directly

        const sOm = new FuncSource(() => angularVelocity);
        const sTh = new FuncSource((t) => angularVelocity * t);
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        builder
            .withNodes(imb, housing, accel, sOm, sTh)
            .withChannel(sOm, imb, "out", "angularVelocity")
            .withChannel(sTh, imb, "out", "rotorAngle")
            .withChannel(imb, housing, "forceY", "forceY")
            .withChannel(housing, accel, "accelerationY", "vibration");
        const session = new Session(builder.build());
        imb.reset(session);
        housing.reset(session);
        accel.reset(session);
        const out: number[] = [];
        const n = 4000;
        for (let i = 0; i <= n; i++) {
            session.run(i * DT);
            if (i > n / 2) out.push(accel.measuredVibration);
        }
        return out;
    }

    it("a measured vibration appears with imbalance and vanishes without", () => {
        const withFault = acRms(measuredVibration(1));
        const healthy = acRms(measuredVibration(0));
        expect(healthy).toBeLessThan(1e-9);
        expect(withFault).toBeGreaterThan(1e-3);
    });
});
