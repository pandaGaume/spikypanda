/**
 * Physics.Electric.Motor.PMSM:machine validation.
 *
 * Two-step port validation (legacy sensors PmsmMachine = oracle):
 *   1. PHYSICS on the node: torque law T_e = 1.5*p*lambda_m*i_q (SPM).
 *   2. NODE == ORACLE: identical V_abc / tau_load / flux_envelope / dt
 *      give i_d/i_q/omega/i_abc equal to the legacy PmsmMachine.
 * Plus the headline objective: the MECHANICAL signature carried by the
 * flux envelope appears in the ELECTRICAL current (MCSA coupling).
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { PmsmMachine } from "spikypanda-sensors/sources/motor/pmsm/machine/PmsmMachine";
import { createPmsmMachineDqNode, PmsmMachineDqNode } from "../../dev/plugins/physics/src/electric/motor-pmsm/index";

const DT = 5e-5; // 20 kHz
// ECX PRIME 6M/16L, the node defaults.
const R = 2.0,
    LD = 3e-4,
    LQ = 3e-4,
    LAMBDA = 2e-3,
    P = 1,
    J = 1e-6,
    B = 1e-7;

function legacyMachine(initialOmegaM: number, rotorInertia: number): PmsmMachine {
    return new PmsmMachine({
        resistance: R,
        inductanceD: LD,
        inductanceQ: LQ,
        rotorFluxLinkage: LAMBDA,
        polePairs: P,
        rotorInertia,
        viscousFriction: B,
        nominalSpeedRps: 50,
        initialOmegaM,
    });
}

// A source publishing F(t) on its "out" link each fire (always ready).
// F may return a number OR a fault descriptor object (for the flux bank).
class FuncSource extends RuntimeNode {
    public constructor(private readonly _f: (t: number) => unknown) {
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

interface IDrive {
    va?: (t: number) => number;
    vb?: (t: number) => number;
    vc?: (t: number) => number;
    tau?: (t: number) => number;
    env?: (t: number) => number;
}

// Build a Session driving the node with the given input functions.
function buildNode(node: PmsmMachineDqNode, d: IDrive): Session {
    const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
    const srcs: { src: FuncSource; slot: string }[] = [];
    const add = (f: ((t: number) => number) | undefined, slot: string): void => {
        if (f) srcs.push({ src: new FuncSource(f), slot });
    };
    add(d.va, "V_a");
    add(d.vb, "V_b");
    add(d.vc, "V_c");
    add(d.tau, "tau_load");
    // The flux envelope rides the fault bank now: emit {target:"flux",
    // value: env-1} so the machine forms lambda_eff = lambda_m*(1+flux) = env.
    if (d.env) {
        const env = d.env;
        srcs.push({ src: new FuncSource((t) => ({ target: "flux", value: env(t) - 1 })), slot: "fault_0" });
    }
    builder.withNodes(node, ...srcs.map((s) => s.src));
    for (const { src, slot } of srcs) builder.withChannel(src, node, "out", slot);
    return new Session(builder.build());
}

function acRms(xs: number[]): number {
    let m = 0;
    for (const x of xs) m += x;
    m /= xs.length;
    let s = 0;
    for (const x of xs) s += (x - m) * (x - m);
    return Math.sqrt(s / xs.length);
}

describe("PMSM dq machine : physics", () => {
    it("torque law T_e = 1.5*p*lambda_m*i_q holds each tick (SPM, envelope 1)", () => {
        const node = createPmsmMachineDqNode();
        node.omega0 = 250;
        const session = buildNode(node, {
            va: (t) => 0.3 * Math.cos(P * 250 * t),
            vb: (t) => 0.3 * Math.cos(P * 250 * t - (2 * Math.PI) / 3),
            vc: (t) => 0.3 * Math.cos(P * 250 * t + (2 * Math.PI) / 3),
        });
        node.reset(session);
        let maxErr = 0;
        for (let i = 0; i <= 300; i++) {
            session.run(i * DT);
            const expected = 1.5 * P * LAMBDA * node.i_q;
            maxErr = Math.max(maxErr, Math.abs(node.tau_em - expected));
        }
        expect(maxErr).toBeLessThan(1e-9);
    });
});

describe("PMSM dq machine : node equals the legacy oracle", () => {
    it("i_d / i_q / omega / i_a match legacy under voltage + load + flux envelope", () => {
        const omega0 = 200;
        const va = (t: number) => 0.3 * Math.cos(P * omega0 * t);
        const vb = (t: number) => 0.3 * Math.cos(P * omega0 * t - (2 * Math.PI) / 3);
        const vc = (t: number) => 0.3 * Math.cos(P * omega0 * t + (2 * Math.PI) / 3);
        const tau = (_t: number) => 0.0005;
        const env = (t: number) => 1 + 0.1 * Math.sin(2 * Math.PI * 20 * t);
        const n = 400;

        const node = createPmsmMachineDqNode();
        node.omega0 = omega0;
        const session = buildNode(node, { va, vb, vc, tau, env });
        node.reset(session);
        const nIq: number[] = [],
            nId: number[] = [],
            nW: number[] = [],
            nIa: number[] = [];
        for (let i = 0; i <= n; i++) {
            session.run(i * DT);
            nIq.push(node.i_q);
            nId.push(node.i_d);
            nW.push(node.omega);
            nIa.push(node.i_a);
        }

        const leg = legacyMachine(omega0, J);
        leg.advance(0);
        const lIq = [leg.iQ],
            lId = [leg.iD],
            lW = [leg.omegaM],
            lIa = [leg.iAbc()[0]];
        for (let i = 1; i <= n; i++) {
            const t = i * DT;
            leg.setPhaseVoltages(va(t), vb(t), vc(t));
            leg.setLoadTorque(tau(t));
            leg.addFluxEnvelope(env(t));
            leg.advance(t);
            lIq.push(leg.iQ);
            lId.push(leg.iD);
            lW.push(leg.omegaM);
            lIa.push(leg.iAbc()[0]);
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
        expect(maxRel(nIq, lIq)).toBeLessThan(1e-9);
        expect(maxRel(nId, lId)).toBeLessThan(1e-9);
        expect(maxRel(nW, lW)).toBeLessThan(1e-9);
        expect(maxRel(nIa, lIa)).toBeLessThan(1e-9);
    });
});

describe("PMSM dq machine : the mechanical flux signature appears in the current (MCSA)", () => {
    // Spin at constant omega (large inertia, no applied voltage); the
    // only thing driving an AC component in i_q is the flux envelope
    // modulation riding the back-EMF term omega_e*lambda_m_eff. With a
    // flat envelope the current is DC; with a modulated envelope i_q
    // carries the modulation. That is the mechanical-to-electrical path.
    function iqAfterSettle(env: (t: number) => number): number[] {
        const node = createPmsmMachineDqNode();
        node.J = 1; // huge inertia: omega stays ~constant
        node.omega0 = 314; // ~50 Hz mechanical
        const session = buildNode(node, { env });
        node.reset(session);
        const iq: number[] = [];
        const n = 4000;
        for (let i = 0; i <= n; i++) {
            session.run(i * DT);
            if (i > n / 2) iq.push(node.i_q); // latter half, post-settle
        }
        return iq;
    }

    it("flat envelope yields a near-DC i_q (no spurious AC)", () => {
        expect(acRms(iqAfterSettle(() => 1))).toBeLessThan(1e-4);
    });

    it("a modulated envelope injects an i_q AC component that scales with depth", () => {
        const small = acRms(iqAfterSettle((t) => 1 + 0.05 * Math.sin(2 * Math.PI * 30 * t)));
        const large = acRms(iqAfterSettle((t) => 1 + 0.2 * Math.sin(2 * Math.PI * 30 * t)));
        // The mechanical signature is readable in the electrical current,
        // and grows with the modulation depth (4x depth -> ~4x AC).
        expect(small).toBeGreaterThan(1e-3);
        expect(large).toBeGreaterThan(3 * small);
    });
});

describe("PMSM dq machine : acceptFault drops incoherent faults", () => {
    // Spin at constant omega (huge inertia, no applied voltage); the
    // steady i_q is set by the back-EMF term omega_e*lambda_m_eff, so it
    // moves iff a fault actually reaches lambda_m_eff.
    function steadyIq(fault: { target: string; value: number } | null): number {
        const node = createPmsmMachineDqNode();
        node.J = 1;
        node.omega0 = 314;
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        const src = fault ? new FuncSource(() => fault) : null;
        if (src) builder.withNodes(node, src).withChannel(src, node, "out", "fault_0");
        else builder.withNodes(node);
        const session = new Session(builder.build());
        node.reset(session);
        let last = 0;
        for (let i = 0; i <= 2000; i++) {
            session.run(i * DT);
            last = node.i_q;
        }
        return last;
    }

    it("a broken_bar fault is ignored (PMSM has no cage); a flux fault is applied", () => {
        const healthy = steadyIq(null);
        const broken = steadyIq({ target: "broken_bar", value: 0.5 });
        const flux = steadyIq({ target: "flux", value: 0.5 });
        expect(Math.abs(broken - healthy)).toBeLessThan(1e-9); // rejected by acceptFault
        expect(Math.abs(flux - healthy)).toBeGreaterThan(1e-3); // accepted
    });
});
