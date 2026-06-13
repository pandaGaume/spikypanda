/**
 * Physics + MCSA spectral tests for the squirrel-cage induction motor
 * node (Physics.Electric.Motor.Induction:dynamic).
 *
 * Scenarios:
 *   a) Direct-on-line start with balanced 3-phase sinusoidal voltages:
 *      the motor accelerates, settles below synchronous speed, slip in
 *      (0, 0.2) under a modest constant load, all signals finite/bounded.
 *   b) Te > 0 (on average) during acceleration; omega rises
 *      monotonically-ish toward steady state.
 *   c) Broken-rotor-bar spectral signature: single-bin Hann-windowed DFT
 *      of i_a at f_supply*(1 +/- 2s) relative to the fundamental.
 *      Faulty sidebands exceed healthy by a clear factor, and 4 broken
 *      bars give larger sidebands than 2 (ratio roughly tracking k).
 *
 * Inputs are injected with a session mock that emulates the minimal
 * IChannel + linkStates contract (same approach as faultable.test.ts),
 * re-armed each tick so the test drives time-varying voltages. The
 * rate-declaration scenarios (requiredHz heuristic, Euler stability,
 * slip convergence) run a real Session over a sine-source -> motor
 * graph so the publish/consume plumbing is exercised end-to-end.
 */
import { Channel, RuntimeGraph, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, IOlink, ISession } from "spikypanda-core";
import { InductionMotorDynamicNode, createInductionMotorDynamicNode } from "../../dev/plugins/physics/src/electric/motor-induction/index";

// ---------------------------------------------------------------------------
// Session mock with re-armable driven input channels.
// ---------------------------------------------------------------------------

interface DrivenSession {
    session: ISession;
    /** Set the value the next consume() of `slot` returns. */
    set(slot: string, value: number): void;
    /** Re-arm every channel (tokens are consumed once per fire()). */
    arm(): void;
}

function bindDrivenInputs(node: InductionMotorDynamicNode, slots: string[]): DrivenSession {
    const links = slots.map((slot) => ({ slot, enabled: true }) as unknown as IChannel);
    const linkStates = slots.map(() => ({ ready: false }));
    const values = new Map<string, number>(slots.map((s) => [s, 0]));
    (node as unknown as { _opsc: IOlink[] })._opsc = links as unknown as IOlink[];
    const session = {
        graph: { links },
        linkStates,
        consume: (i: number) => {
            linkStates[i].ready = false;
            return values.get(slots[i]);
        },
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
    return {
        session,
        set: (slot: string, value: number) => {
            values.set(slot, value);
        },
        arm: () => {
            for (const st of linkStates) st.ready = true;
        },
    };
}

function emptySession(): ISession {
    return {
        graph: { links: [] },
        linkStates: [],
        consume: () => undefined,
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
}

// ---------------------------------------------------------------------------
// Simulation driver: direct-on-line balanced 3-phase supply.
// ---------------------------------------------------------------------------

const F_SUPPLY = 60; // Hz
const V_PEAK = 80; // V phase peak
const DT = 2e-4; // s (5 kHz legacy calibration regime; the node declares ~9.8 kHz)
const TAU_LOAD = 1.5; // Nm, modest constant load
const TWO_PI = 2 * Math.PI;

interface RunResult {
    node: InductionMotorDynamicNode;
    ia: Float64Array;
    omega: Float64Array;
    tauEm: Float64Array;
    dt: number;
}

function runDirectOnLine(seconds: number, configure?: (node: InductionMotorDynamicNode) => void, dt: number = DT): RunResult {
    const node = createInductionMotorDynamicNode();
    node.f_supply = F_SUPPLY;
    if (configure) configure(node);
    node.reset(emptySession());
    const drv = bindDrivenInputs(node, ["V_a", "V_b", "V_c", "tau_load"]);
    const n = Math.round(seconds / dt);
    const ia = new Float64Array(n);
    const omega = new Float64Array(n);
    const tauEm = new Float64Array(n);
    const w = TWO_PI * F_SUPPLY;
    for (let k = 0; k < n; k++) {
        const t = k * dt;
        drv.set("V_a", V_PEAK * Math.sin(w * t));
        drv.set("V_b", V_PEAK * Math.sin(w * t - TWO_PI / 3));
        drv.set("V_c", V_PEAK * Math.sin(w * t + TWO_PI / 3));
        drv.set("tau_load", TAU_LOAD);
        drv.arm();
        node.fire(drv.session, t);
        ia[k] = node.i_a;
        omega[k] = node.omega;
        tauEm[k] = node.tau_em;
    }
    return { node, ia, omega, tauEm, dt };
}

// ---------------------------------------------------------------------------
// Single-bin DFT magnitude at a target frequency, Hann-windowed.
// ---------------------------------------------------------------------------

function dftMag(x: Float64Array, start: number, count: number, dt: number, freq: number): number {
    let re = 0,
        im = 0,
        wSum = 0;
    for (let n = 0; n < count; n++) {
        const w = 0.5 * (1 - Math.cos((TWO_PI * n) / (count - 1)));
        const v = x[start + n] * w;
        const ang = TWO_PI * freq * n * dt;
        re += v * Math.cos(ang);
        im -= v * Math.sin(ang);
        wSum += w;
    }
    return (2 * Math.hypot(re, im)) / wSum;
}

function mean(x: Float64Array, start: number, end: number): number {
    let s = 0;
    for (let i = start; i < end; i++) s += x[i];
    return s / (end - start);
}

/** Steady-state spectral summary of one run: actual slip from omega,
 *  fundamental, and the two broken-bar sidebands at f*(1 +/- 2s). */
function analyze(
    run: RunResult,
    discardSeconds: number
): {
    slip: number;
    fundamental: number;
    lower: number;
    upper: number;
} {
    const start = Math.round(discardSeconds / run.dt);
    const count = run.ia.length - start;
    const omegaMean = mean(run.omega, start, run.ia.length);
    const omegaSync = TWO_PI * F_SUPPLY;
    const slip = (omegaSync - run.node.P * omegaMean) / omegaSync;
    return {
        slip,
        fundamental: dftMag(run.ia, start, count, run.dt, F_SUPPLY),
        lower: dftMag(run.ia, start, count, run.dt, F_SUPPLY * (1 - 2 * slip)),
        upper: dftMag(run.ia, start, count, run.dt, F_SUPPLY * (1 + 2 * slip)),
    };
}

// ---------------------------------------------------------------------------
// Defaults / instantiation
// ---------------------------------------------------------------------------

describe("InductionMotorDynamicNode defaults", () => {
    it("instantiates with the small-industrial defaults", () => {
        const node = new InductionMotorDynamicNode();
        expect(node.Rs).toBeCloseTo(2.3, 12);
        expect(node.Rr).toBeCloseTo(2.5, 12);
        expect(node.Ls).toBeCloseTo(0.23, 12);
        expect(node.Lr).toBeCloseTo(0.23, 12);
        expect(node.Lm).toBeCloseTo(0.22, 12);
        expect(node.P).toBe(2);
        expect(node.f_supply).toBe(60);
        expect(node.broken_bars).toBe(0);
        expect(node.total_bars).toBe(28);
        expect(node.bar_severity).toBe(1);
    });

    it("declares the motor ports on top of the transform/fault base", () => {
        const node = new InductionMotorDynamicNode();
        const inSlots = node.inputPorts.map((p) => p.slot);
        const outSlots = node.outputPorts.map((p) => p.slot);
        for (const s of ["fault_0", "V_a", "V_b", "V_c", "tau_load", "dt"]) {
            expect(inSlots).toContain(s);
        }
        for (const s of ["world", "i_a", "i_b", "i_c", "omega", "theta_m", "tau_em", "slip"]) {
            expect(outSlots).toContain(s);
        }
    });

    it("requiredHz honors the true fast pole (Rs AND Rr) and the 80x supply floor", () => {
        const node = new InductionMotorDynamicNode();
        // The fast flux pole is 1/tau_e = (Rs*Lr + Rr*Ls)/D with
        // D = Ls*Lr - Lm^2 ~ 4.5 mH^2: tau_e ~ 4.08 ms, so 40/tau_e
        // ~ 9813 Hz, above the 80*f_supply = 4800 Hz floor and at or
        // above the 5 kHz calibration regime.
        expect(node.requiredHz).toBeGreaterThanOrEqual(4800);
        expect(node.requiredHz).toBeGreaterThanOrEqual(5000);
        expect(node.requiredHz).toBeLessThan(20000);
        expect(node.required_hz_user_defined).toBe(false);
        // The heuristic must scale with the ROTOR resistance: high-Rr
        // rotors stiffen the fast pole (the old Rs-only estimate let
        // forward Euler diverge for Rr >~ 19*Rs).
        const stiff = new InductionMotorDynamicNode();
        stiff.Rr = 25 * stiff.Rs;
        expect(stiff.requiredHz).toBeGreaterThan(5 * node.requiredHz);
        node.required_hz = 20000;
        expect(node.requiredHz).toBe(20000);
        expect(node.required_hz_user_defined).toBe(true);
    });

    it("reset applies omega0/theta0 and a standstill slip of 1", () => {
        const node = new InductionMotorDynamicNode();
        node.omega0 = 50;
        node.theta0 = 1.2;
        node.reset(emptySession());
        expect(node.omega).toBe(50);
        expect(node.theta_m).toBe(1.2);
        node.omega0 = 0;
        node.reset(emptySession());
        expect(node.slip).toBe(1);
    });

    it("slip output reports plugging (s in (1, 2]) instead of clamping at 1", () => {
        const node = new InductionMotorDynamicNode();
        const graph = new RuntimeGraph<RuntimeNode, Channel>([node], [], "dynamic");
        const session = new Session(graph);
        // Reverse rotation at half synchronous speed: s = 1.5.
        node.omega0 = -(TWO_PI * F_SUPPLY) / (2 * node.P);
        node.reset(session);
        expect(node.slip).toBeCloseTo(1.5, 6);
        // Full reverse synchronous speed is the plugging extreme: s = 2.
        node.omega0 = -(TWO_PI * F_SUPPLY) / node.P;
        node.reset(session);
        expect(node.slip).toBeCloseTo(2, 6);
        // The regenerative side still clamps at -1.
        node.omega0 = (3 * TWO_PI * F_SUPPLY) / node.P;
        node.reset(session);
        expect(node.slip).toBe(-1);
    });
});

// ---------------------------------------------------------------------------
// Rate declaration: the declared requiredHz must be SUFFICIENT for the
// node's own forward-Euler integrator. Real Session, sine-source drive.
// ---------------------------------------------------------------------------

/** Publishes amp*sin(w*t + phase) on its single outgoing link. */
class SineSourceNode extends RuntimeNode {
    public constructor(
        private readonly _amp: number,
        private readonly _w: number,
        private readonly _phase: number
    ) {
        super();
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, t: number): void {
        const out = this.onsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(out);
        session.publish(idx, this._amp * Math.sin(this._w * t + this._phase));
    }
}

/** Publishes a constant value on its single outgoing link. */
class ConstantSourceNode extends RuntimeNode {
    public constructor(public value: number) {
        super();
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, _t: number): void {
        const out = this.onsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(out);
        session.publish(idx, this.value);
    }
}

interface SessionRun {
    node: InductionMotorDynamicNode;
    omega: Float64Array;
    ia: Float64Array;
    dt: number;
}

function runDirectOnLineSession(seconds: number, dt: number, configure?: (node: InductionMotorDynamicNode) => void): SessionRun {
    const node = createInductionMotorDynamicNode();
    node.f_supply = F_SUPPLY;
    if (configure) configure(node);
    const w = TWO_PI * F_SUPPLY;
    const va = new SineSourceNode(V_PEAK, w, 0);
    const vb = new SineSourceNode(V_PEAK, w, -TWO_PI / 3);
    const vc = new SineSourceNode(V_PEAK, w, TWO_PI / 3);
    const tau = new ConstantSourceNode(TAU_LOAD);
    const links = [new Channel(va, node, "V_a"), new Channel(vb, node, "V_b"), new Channel(vc, node, "V_c"), new Channel(tau, node, "tau_load")];
    const graph = new RuntimeGraph<RuntimeNode, Channel>([va, vb, vc, tau, node], links, "dynamic");
    const session = new Session(graph);
    node.reset(session);
    const n = Math.round(seconds / dt);
    const omega = new Float64Array(n);
    const ia = new Float64Array(n);
    for (let k = 0; k < n; k++) {
        session.run(k * dt);
        omega[k] = node.omega;
        ia[k] = node.i_a;
    }
    return { node, omega, ia, dt };
}

function meanSlipOf(run: SessionRun, fromSeconds: number, toSeconds: number): number {
    const omegaMean = mean(run.omega, Math.round(fromSeconds / run.dt), Math.round(toSeconds / run.dt));
    return (TWO_PI * F_SUPPLY - run.node.P * omegaMean) / (TWO_PI * F_SUPPLY);
}

describe("InductionMotorDynamicNode rate declaration (real Session)", () => {
    it("forward Euler stays finite at the declared rate for Rr = 25*Rs (sweep guard)", () => {
        const probe = new InductionMotorDynamicNode();
        probe.Rr = 25 * probe.Rs;
        const dt = 1 / probe.requiredHz;
        const run = runDirectOnLineSession(1, dt, (n) => {
            n.Rr = 25 * n.Rs;
        });
        let finite = true;
        for (let k = 0; k < run.omega.length && finite; k++) {
            finite = Number.isFinite(run.omega[k]) && Number.isFinite(run.ia[k]);
        }
        expect(finite).toBe(true);
    }, 30000);

    it("steady-state slip at the declared rate is within 20 percent of a 4x-oversampled reference", () => {
        // Run-up completes by ~3 s at the declared rate (~4 s at 4x),
        // so the [4, 5] s window is true steady state for both runs.
        const dtDeclared = 1 / new InductionMotorDynamicNode().requiredHz;
        const declared = runDirectOnLineSession(5, dtDeclared);
        const reference = runDirectOnLineSession(5, dtDeclared / 4);
        const slipDeclared = meanSlipOf(declared, 4, 5);
        const slipReference = meanSlipOf(reference, 4, 5);
        // The 4x-oversampled run sits close to the converged operating
        // point (slip ~ 10.1 percent measured, ~ 10.4 fully converged).
        expect(slipReference).toBeGreaterThan(0.08);
        expect(slipReference).toBeLessThan(0.13);
        expect(Math.abs(slipDeclared - slipReference) / slipReference).toBeLessThan(0.2);
    }, 120000);
});

// ---------------------------------------------------------------------------
// Calibration anchor at the declared rate: the numbers documented in the
// node header (operating point + broken-bar sideband ratios) are measured
// HERE, at dt = 1/requiredHz. Keep both in sync.
// ---------------------------------------------------------------------------

describe("InductionMotorDynamicNode calibration at the declared rate", () => {
    it("matches the header operating point and sideband ratios", () => {
        const dt = 1 / createInductionMotorDynamicNode().requiredHz;
        const healthy = analyze(
            runDirectOnLine(
                8,
                (n) => {
                    n.broken_bars = 0;
                },
                dt
            ),
            4
        );
        const f2 = analyze(
            runDirectOnLine(
                8,
                (n) => {
                    n.broken_bars = 2;
                },
                dt
            ),
            4
        );
        const f4 = analyze(
            runDirectOnLine(
                8,
                (n) => {
                    n.broken_bars = 4;
                },
                dt
            ),
            4
        );
        // Operating point: slip ~ 9.2 percent (omega ~ 171 rad/s).
        expect(healthy.slip).toBeGreaterThan(0.085);
        expect(healthy.slip).toBeLessThan(0.1);
        // Healthy sidebands at the numerical floor.
        expect(healthy.lower / healthy.fundamental).toBeLessThan(1e-5);
        expect(healthy.upper / healthy.fundamental).toBeLessThan(1e-5);
        // 2/28 bars: lower ~ 3.5 percent of fundamental, upper ~ 0.28.
        expect(f2.lower / f2.fundamental).toBeGreaterThan(0.025);
        expect(f2.lower / f2.fundamental).toBeLessThan(0.045);
        expect(f2.upper / f2.fundamental).toBeGreaterThan(0.0015);
        expect(f2.upper / f2.fundamental).toBeLessThan(0.005);
        // 4/28 bars: lower ~ 6.7 percent, ratio ~ 1.9x vs k = 2.
        expect(f4.lower / f4.fundamental).toBeGreaterThan(0.05);
        expect(f4.lower / f4.fundamental).toBeLessThan(0.085);
        expect(f4.lower / f2.lower).toBeGreaterThan(1.5);
        expect(f4.lower / f2.lower).toBeLessThan(2.5);
    }, 120000);
});

// ---------------------------------------------------------------------------
// a) Direct-on-line start
// ---------------------------------------------------------------------------

describe("InductionMotorDynamicNode direct-on-line start", () => {
    // 3 s is enough: acceleration completes in ~1 s with these params.
    const run = runDirectOnLine(3);
    const omegaSyncMech = (TWO_PI * F_SUPPLY) / run.node.P;

    it("accelerates and settles below synchronous speed", () => {
        expect(run.node.omega).toBeGreaterThan(0.5 * omegaSyncMech);
        expect(run.node.omega).toBeLessThan(omegaSyncMech);
    });

    it("steady-state slip is in (0, 0.2) under the modest load", () => {
        const a = analyze(run, 2);
        expect(a.slip).toBeGreaterThan(0);
        expect(a.slip).toBeLessThan(0.2);
        // The node's own slip output agrees with the omega-derived value.
        expect(run.node.slip).toBeCloseTo(a.slip, 2);
    });

    it("all signals stay finite and bounded", () => {
        for (let k = 0; k < run.ia.length; k++) {
            expect(Number.isFinite(run.ia[k])).toBe(true);
            expect(Number.isFinite(run.omega[k])).toBe(true);
        }
        let iaMax = 0,
            omegaMax = 0;
        for (let k = 0; k < run.ia.length; k++) {
            iaMax = Math.max(iaMax, Math.abs(run.ia[k]));
            omegaMax = Math.max(omegaMax, Math.abs(run.omega[k]));
        }
        expect(iaMax).toBeLessThan(100); // inrush stays sane
        expect(omegaMax).toBeLessThan(omegaSyncMech); // never oversynchronous
    });

    it("phase currents sum to ~0 (isolated neutral)", () => {
        expect(Math.abs(run.node.i_a + run.node.i_b + run.node.i_c)).toBeLessThan(1e-9);
    });
});

// ---------------------------------------------------------------------------
// b) Torque sign + speed monotonicity during acceleration
// ---------------------------------------------------------------------------

describe("InductionMotorDynamicNode acceleration phase", () => {
    const run = runDirectOnLine(3);

    it("mean Te is positive during acceleration", () => {
        const accelEnd = Math.round(0.8 / DT);
        expect(mean(run.tauEm, 0, accelEnd)).toBeGreaterThan(0);
    });

    it("omega rises monotonically-ish to steady state", () => {
        // Sample omega every 200 ms over the first 1.6 s; each sample
        // must not regress more than 2 percent of synchronous speed
        // below the running maximum (tolerates the electrical-transient
        // torque ripple at startup).
        const omegaSyncMech = (TWO_PI * F_SUPPLY) / run.node.P;
        const stepTicks = Math.round(0.2 / DT);
        let runningMax = -Infinity;
        for (let k = stepTicks; k <= Math.round(1.6 / DT); k += stepTicks) {
            const w = run.omega[k];
            expect(w).toBeGreaterThan(runningMax - 0.02 * omegaSyncMech);
            runningMax = Math.max(runningMax, w);
        }
        // And the end point dominates the early transient.
        expect(run.omega[Math.round(1.6 / DT)]).toBeGreaterThan(run.omega[stepTicks]);
    });
});

// ---------------------------------------------------------------------------
// c) Broken-rotor-bar MCSA signature: sidebands at f*(1 +/- 2s)
// ---------------------------------------------------------------------------

describe("InductionMotorDynamicNode broken-bar spectral signature", () => {
    // 6 s per run: ~1 s startup + transient decay, analysis over the
    // last 4 s (frequency resolution 0.25 Hz, ~40 modulation periods at
    // 2*s*f ~ 10 Hz). Three runs: healthy, 2 bars, 4 bars.
    const SIM_SECONDS = 6;
    const DISCARD_SECONDS = 2;

    const healthy = analyze(
        runDirectOnLine(SIM_SECONDS, (n) => {
            n.broken_bars = 0;
        }),
        DISCARD_SECONDS
    );
    const faulty2 = analyze(
        runDirectOnLine(SIM_SECONDS, (n) => {
            n.broken_bars = 2;
        }),
        DISCARD_SECONDS
    );
    const faulty4 = analyze(
        runDirectOnLine(SIM_SECONDS, (n) => {
            n.broken_bars = 4;
        }),
        DISCARD_SECONDS
    );

    it("all runs reach a comparable steady state (slip in (0, 0.2))", () => {
        for (const a of [healthy, faulty2, faulty4]) {
            expect(a.slip).toBeGreaterThan(0);
            expect(a.slip).toBeLessThan(0.2);
            expect(a.fundamental).toBeGreaterThan(0.5);
        }
        // Broken bars raise the effective rotor resistance: slip should
        // not decrease with severity.
        expect(faulty2.slip).toBeGreaterThanOrEqual(healthy.slip - 1e-3);
        expect(faulty4.slip).toBeGreaterThanOrEqual(faulty2.slip - 1e-3);
    });

    it("healthy sidebands sit at the numerical floor", () => {
        expect(healthy.lower / healthy.fundamental).toBeLessThan(1e-3);
        expect(healthy.upper / healthy.fundamental).toBeLessThan(1e-3);
    });

    it("2 broken bars produce clear sidebands at f*(1 +/- 2s)", () => {
        // Calibration (see node header): lower ~ 3.9 percent of the
        // fundamental, upper ~ 0.4 percent. Both must exceed the
        // healthy reference by far more than the required 5x.
        const lowerRel = faulty2.lower / faulty2.fundamental;
        const upperRel = faulty2.upper / faulty2.fundamental;
        expect(lowerRel).toBeGreaterThan(0.01);
        expect(upperRel).toBeGreaterThan(0.001);
        expect(faulty2.lower).toBeGreaterThan(5 * healthy.lower);
        expect(faulty2.upper).toBeGreaterThan(5 * healthy.upper);
    });

    it("4 broken bars give larger sidebands than 2, ratio roughly tracking k", () => {
        expect(faulty4.lower).toBeGreaterThan(faulty2.lower);
        expect(faulty4.upper).toBeGreaterThan(faulty2.upper);
        // delta doubles (4/28 vs 2/28): in the linear small-asymmetry
        // regime the sideband should roughly double. Generous tolerance.
        const ratio = faulty4.lower / faulty2.lower;
        expect(ratio).toBeGreaterThan(1.4);
        expect(ratio).toBeLessThan(3.2);
    });

    it("bar_severity scales the signature", () => {
        const tame = analyze(
            runDirectOnLine(SIM_SECONDS, (n) => {
                n.broken_bars = 2;
                n.bar_severity = 0.5;
            }),
            DISCARD_SECONDS
        );
        expect(tame.lower).toBeGreaterThan(5 * healthy.lower);
        expect(tame.lower).toBeLessThan(faulty2.lower);
    });
});
