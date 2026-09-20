/**
 * Physics.LifeSupport (crew, scrubber, cabin-air) and Physics.Electric:battery.
 *
 * The oracle is the CO2 control sample's `physicsStep` (co2-mpc.js /
 * simulate_co2.py), ported here with a continuous command: an explicit
 * step of one minute with emission by activity, removal proportional to
 * the excess above 400 ppm, a first-order lag on the scrubber and a leak.
 *
 *   1. Driven by the same explicit step (the nodes' `rhs` advanced by
 *      Euler over sixty seconds), the nodes reproduce the sample to
 *      rounding: the equations are the sample's.
 *   2. Wired into a graph and integrated by the RK4 solver at one story
 *      minute per step, the same schedule stays within a fraction of a
 *      percent of a fine-step (one second) Euler reference: the graph
 *      plumbing (signals, solver, four leaves) carries the model.
 *   3. The battery drains by the integral of the scrubber's power plus the
 *      other loads, and the state of charge is that integral.
 */
import { buildSolverAttachmentsForGraph, Channel, DEFAULT_SOLVER_KIND, RK4AdaptiveSolver, RuntimeGraphBuilder, RuntimeNode, Session, SOLVER_REGISTRY } from "spikypanda-core";
import type { IChannel, IIntegrationInputs, ISession, ISolver } from "spikypanda-core";
import { CabinAirNode, CrewNode, ScrubberNode, CABIN_STATE_CRITICAL, CABIN_STATE_ELEVATED, CABIN_STATE_NOMINAL } from "../../dev/plugins/physics/src/lifesupport/index";
import type { CrewActivity } from "../../dev/plugins/physics/src/lifesupport/index";
import { BatteryNode } from "../../dev/plugins/physics/src/electric/battery/index";

// ── The sample's constants, verbatim ──────────────────────────────────────
const EMISSION: Record<CrewActivity, number> = { sleep: 2.0, rest: 3.5, light_work: 5.5, heavy_work: 7.0 };
const RATE_AT_FULL = 0.05; // the "normal" preset, rates[3]
const TAU_FRACTION = 0.3; // per-minute step fraction of the sample
const LAG_MINUTES = 1 / TAU_FRACTION; // its continuous equivalent
const LEAK = 0.001;
const FLOOR = 400;
const INITIAL = 1500;

type Group = { count: number; activity: CrewActivity };
const NIGHT9: Array<{ from: number; to: number; crew: Group[] }> = [
    { from: 0, to: 200, crew: [{ count: 4, activity: "sleep" }] },
    {
        from: 200,
        to: 260,
        crew: [
            { count: 2, activity: "sleep" },
            { count: 2, activity: "heavy_work" },
        ],
    },
    {
        from: 260,
        to: 320,
        crew: [
            { count: 2, activity: "rest" },
            { count: 2, activity: "heavy_work" },
        ],
    },
    { from: 320, to: 480, crew: [{ count: 4, activity: "light_work" }] },
];
function crewAt(minute: number): Group[] {
    return NIGHT9.find((s) => minute >= s.from && minute < s.to)?.crew ?? [];
}
function emissionOf(groups: Group[]): number {
    return groups.reduce((sum, g) => sum + g.count * EMISSION[g.activity], 0);
}

/** The sample's physicsStep, one minute, continuous command. */
function referenceStep(co2: number, rate: number, command: number, groups: Group[]): { co2: number; rate: number } {
    const target = RATE_AT_FULL * command;
    const nextRate = Math.max(0, Math.min(RATE_AT_FULL, rate + (target - rate) * TAU_FRACTION));
    const e = emissionOf(groups);
    const scrub = rate * Math.max(co2 - FLOOR, 0);
    const leak = LEAK * co2;
    let next = co2 + e - scrub - leak;
    if (next < 300) next = 300;
    if (next > 10000) next = 10000;
    return { co2: next, rate: nextRate };
}

/** A fine-step Euler reference, `sub` steps per minute, for the solver comparison. */
function referenceFine(minutes: number, command: (minute: number) => number, sub: number): { co2: number; rate: number; energyWh: number } {
    let co2 = INITIAL,
        rate = 0,
        energyWh = 0;
    const h = 1 / sub;
    for (let k = 0; k < minutes * sub; k++) {
        const minute = k * h;
        const u = command(minute);
        const e = emissionOf(crewAt(minute));
        const dco2 = e - rate * Math.max(co2 - FLOOR, 0) - LEAK * co2;
        const drate = (RATE_AT_FULL * u - rate) / LAG_MINUTES;
        const power = 6 * (0.0879 + 0.1611 * u) * 300 + 900;
        co2 = Math.max(300, Math.min(10000, co2 + dco2 * h));
        rate += drate * h;
        energyWh += (power * h) / 60;
    }
    return { co2, rate, energyWh };
}

function inputsOf(values: Record<string, number>): IIntegrationInputs {
    return {
        get: (k) => values[k],
        has: (k) => k in values,
        sumPrefix: (p) =>
            Object.entries(values)
                .filter(([k]) => k.startsWith(p))
                .reduce((s, [, v]) => s + v, 0),
    };
}

function emptySession(): ISession {
    return { graph: { links: [] }, linkStates: [], consume: () => undefined, publish: () => undefined, readSignal: () => undefined, dt: 60 } as unknown as ISession;
}

function configuredScrubber(): ScrubberNode {
    const s = new ScrubberNode();
    s.rateAtFullCommandPerMinute = RATE_AT_FULL;
    s.lagTimeConstantMinutes = LAG_MINUTES;
    s.supplyVolts = 6;
    s.interceptAmps = 0.0879;
    s.slopeAmps = 0.1611;
    s.habitatScale = 300;
    return s;
}
function configuredCabin(): CabinAirNode {
    const c = new CabinAirNode();
    c.initialPpm = INITIAL;
    c.leakPerMinute = LEAK;
    c.removalFloorPpm = FLOOR;
    c.elevatedPpm = 3500;
    c.criticalPpm = 4000;
    return c;
}

describe("Crew: emission by head count and activity", () => {
    it("multiplies the per-person rate by the count, by name and by index", () => {
        const crew = new CrewNode();
        crew.count = 4;
        crew.activity = "sleep";
        crew.fire(emptySession(), 0);
        expect(crew.co2Emission).toBeCloseTo(8.0, 12);
        crew.activity = "heavy_work";
        crew.fire(emptySession(), 0);
        expect(crew.co2Emission).toBeCloseTo(28.0, 12);
        expect(CrewNode.toActivity(2)).toBe("light_work");
        expect(CrewNode.toActivity("rest")).toBe("rest");
        expect(CrewNode.toActivity("running")).toBeUndefined();
    });

    it("takes count and activity from the wired signals when they are published", () => {
        const crew = new CrewNode();
        crew.count = 4;
        crew.activity = "sleep";
        const count = new ConstSource(2);
        const activity = new ConstSource("heavy_work");
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic").withNodes(crew, count, activity);
        builder.withChannel(count, crew, "out", "count");
        builder.withChannel(activity, crew, "out", "activity");
        const session = new Session(builder.build());
        crew.reset(session);
        session.run(0);
        session.run(1);
        expect(crew.co2Emission).toBeCloseTo(14.0, 12);
    });
});

describe("Scrubber + cabin: the sample's step, to rounding", () => {
    it("reproduces physicsStep over the night-9 schedule when advanced by the same explicit minute step", () => {
        const scrubber = configuredScrubber();
        const cabin = configuredCabin();
        scrubber.reset(emptySession());
        cabin.reset(emptySession());
        let ref = { co2: INITIAL, rate: 0 };
        const y = new Float64Array(2);
        const dydt = new Float64Array(2);
        let worst = 0;
        for (let minute = 0; minute < 480; minute++) {
            const command = minute < 230 ? 0.33 : minute < 250 ? 0 : 1.0; // the plan, the stop, full flow
            const groups = crewAt(minute);
            const emission: Record<string, number> = { scrubberRate: scrubber.effectiveRatePerMinute };
            groups.forEach((g, i) => (emission["emission" + "ABCD"[i]] = g.count * EMISSION[g.activity]));
            // both leaves read the state of the START of the minute, as the sample does
            scrubber.gatherState(y, 0);
            cabin.gatherState(y, 1);
            scrubber.rhs(minute * 60, y, 0, inputsOf({ command }), dydt);
            cabin.rhs(minute * 60, y, 1, inputsOf(emission), dydt);
            y[0] += dydt[0] * 60;
            y[1] += dydt[1] * 60;
            scrubber.writeState(y, 0);
            cabin.writeState(y, 1);
            ref = referenceStep(ref.co2, ref.rate, command, groups);
            worst = Math.max(worst, Math.abs(cabin.co2Ppm - ref.co2), Math.abs(scrubber.effectiveRatePerMinute - ref.rate) * 1e4);
            expect(cabin.co2Ppm).toBeCloseTo(ref.co2, 6);
            expect(scrubber.effectiveRatePerMinute).toBeCloseTo(ref.rate, 10);
        }
        expect(worst).toBeLessThan(1e-6);
        // and the story's shape: full flow after the stop brings the cabin down
        expect(cabin.co2Ppm).toBeLessThan(ref.co2 + 1e-6);
    });

    it("classifies the three states on its thresholds and clamps at the floor", () => {
        const cabin = configuredCabin();
        expect(cabin.stateOf(1500)).toBe(CABIN_STATE_NOMINAL);
        expect(cabin.stateOf(3500)).toBe(CABIN_STATE_ELEVATED);
        expect(cabin.stateOf(4000)).toBe(CABIN_STATE_CRITICAL);
        const y = new Float64Array([250]);
        cabin.writeState(y, 0);
        expect(cabin.co2Ppm).toBe(300);
    });

    it("power follows the measured current line, scaled", () => {
        const s = configuredScrubber();
        expect(s.powerAt(0)).toBeCloseTo(6 * 0.0879 * 300, 9);
        expect(s.powerAt(1)).toBeCloseTo(6 * (0.0879 + 0.1611) * 300, 9);
        expect(s.powerAt(2)).toBeCloseTo(s.powerAt(1), 12);
    });
});

// ── Graph with the solver ──────────────────────────────────────────────────

class ConstSource extends RuntimeNode {
    public constructor(private _value: number | string) {
        super();
    }
    public set value(v: number | string) {
        this._value = v;
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, this._value);
        }
    }
}

function ensureRk4(): void {
    if (SOLVER_REGISTRY.hasKind(DEFAULT_SOLVER_KIND)) return;
    SOLVER_REGISTRY.register(DEFAULT_SOLVER_KIND, {
        factory: (options, leaves) => {
            const tolerance = typeof options.tolerance === "number" ? options.tolerance : 1e-6;
            const maxStep = typeof options.maxStep === "number" ? options.maxStep : 1e-2;
            const solver = new RK4AdaptiveSolver({ tolerance, maxStep });
            solver.initialize(leaves, 0);
            return solver;
        },
        defaults: { tolerance: 1e-6, maxStep: 1e-2 },
    });
}

interface CabinGraph {
    session: Session;
    cabin: CabinAirNode;
    scrubber: ScrubberNode;
    battery: BatteryNode;
    command: ConstSource;
    crewA: CrewNode;
    crewB: CrewNode;
    countA: ConstSource;
    activityA: ConstSource;
    countB: ConstSource;
    activityB: ConstSource;
}

function buildCabinGraph(maxStepSeconds: number): CabinGraph {
    ensureRk4();
    const crewA = new CrewNode(),
        crewB = new CrewNode();
    const countA = new ConstSource(4),
        activityA = new ConstSource("sleep"),
        countB = new ConstSource(0),
        activityB = new ConstSource("sleep");
    const scrubber = configuredScrubber();
    const cabin = configuredCabin();
    const battery = new BatteryNode();
    battery.capacityWh = 40000;
    battery.initialStateOfChargePercent = 41;
    battery.otherLoadsW = 900;
    const command = new ConstSource(0.33);
    const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>()
        .withMode("dynamic")
        .withNodes(crewA, crewB, countA, activityA, countB, activityB, scrubber, cabin, battery, command);
    builder.withChannel(countA, crewA, "out", "count");
    builder.withChannel(activityA, crewA, "out", "activity");
    builder.withChannel(countB, crewB, "out", "count");
    builder.withChannel(activityB, crewB, "out", "activity");
    builder.withChannel(crewA, cabin, "co2Emission", "emissionA");
    builder.withChannel(crewB, cabin, "co2Emission", "emissionB");
    builder.withChannel(command, scrubber, "out", "command");
    builder.withChannel(scrubber, cabin, "effectiveRate", "scrubberRate");
    builder.withChannel(scrubber, battery, "power", "powerA");
    const graph = builder.build();
    const session = new Session(graph);
    for (const n of [crewA, crewB, scrubber, cabin, battery, command, countA, activityA, countB, activityB]) n.reset(session);
    const solvers = buildSolverAttachmentsForGraph([{ kind: DEFAULT_SOLVER_KIND, options: { tolerance: 1e-6, maxStep: maxStepSeconds } }], graph);
    expect(solvers).toHaveLength(1);
    for (const solver of solvers) (session as unknown as { attachSolver(s: ISolver): void }).attachSolver(solver);
    return { session, cabin, scrubber, battery, command, crewA, crewB, countA, activityA, countB, activityB };
}

function applySchedule(g: CabinGraph, minute: number): void {
    const groups = crewAt(minute);
    g.countA.value = groups[0]?.count ?? 0;
    g.activityA.value = groups[0]?.activity ?? "sleep";
    g.countB.value = groups[1]?.count ?? 0;
    g.activityB.value = groups[1]?.activity ?? "sleep";
}

describe("Cabin graph integrated by the RK4 solver", () => {
    const commandAt = (minute: number): number => (minute < 230 ? 0.33 : minute < 250 ? 0 : 1.0);

    it("follows a fine-step reference over the night-9 schedule within 0.5 %, one story minute per tick", () => {
        const g = buildCabinGraph(60);
        g.session.run(0);
        for (let minute = 0; minute < 480; minute++) {
            applySchedule(g, minute);
            g.command.value = commandAt(minute);
            g.session.run((minute + 1) * 60);
        }
        const ref = referenceFine(480, commandAt, 60);
        expect(Math.abs(g.cabin.co2Ppm - ref.co2) / ref.co2).toBeLessThan(0.005);
        expect(Math.abs(g.scrubber.effectiveRatePerMinute - ref.rate)).toBeLessThan(0.005 * RATE_AT_FULL);
        // the battery drained by the integral of scrubber power plus the other loads
        expect(Math.abs(g.battery.energyUsedWh - ref.energyWh) / ref.energyWh).toBeLessThan(0.005);
        expect(g.battery.stateOfChargePercent).toBeCloseTo(41 - (100 * g.battery.energyUsedWh) / 40000, 6);
    });

    it("rises without the scrubber and settles below ELEVATED at full flow with four people resting", () => {
        const g = buildCabinGraph(60);
        g.countA.value = 4;
        g.activityA.value = "rest";
        g.countB.value = 0;
        g.command.value = 0;
        g.session.run(0);
        for (let minute = 1; minute <= 60; minute++) g.session.run(minute * 60);
        const afterHourOff = g.cabin.co2Ppm;
        expect(afterHourOff).toBeGreaterThan(INITIAL + 700); // 14 ppm/min minus a small leak
        g.command.value = 1;
        for (let minute = 61; minute <= 600; minute++) g.session.run(minute * 60);
        // steady state: e = rate * (ppm - 400) + leak * ppm -> ppm = (e + rate*400) / (rate + leak)
        const e = 4 * EMISSION.rest;
        const steady = (e + RATE_AT_FULL * FLOOR) / (RATE_AT_FULL + LEAK);
        expect(g.cabin.co2Ppm).toBeCloseTo(steady, 0);
        expect(g.cabin.state).toBe(CABIN_STATE_NOMINAL);
    });
});
