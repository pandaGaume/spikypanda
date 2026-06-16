/**
 * The `Physics.Electric.Motor.PMSM:gravity-coupled` container RUNS nested.
 *
 * This is the payoff of the specialized-graph-node pattern: the motor is
 * an ASSEMBLY (FOC + dq machine + gravity payload + resonant housing)
 * whose interior is built AT CONSTRUCTION, embedded as a single node in a
 * parent graph. Driven by a speed setpoint on its `speed_target` boundary
 * input, with the Scene inherited from the parent session, it spins up and
 * exposes the machine current + housing vibration on its boundary outputs.
 *
 * The gravity dependence is the scientific point: the housing acceleration
 * (the UMP rotor-sag vibration) is present under Earth and COLLAPSES under
 * microgravity (Orbital), with no rewiring: the same Earth->Orbital swap a
 * user makes on the root Scene reaches the machine inside the container
 * live, through InheritedSceneStateView.
 */
import { buildDefaultStateView, RuntimeGraphBuilder, Session, type IChannel, type IRuntimeNode, type SceneStateView } from "spikypanda-core";
import { createGravityCoupledPmsmGraph } from "../../dev/plugins/physics/src/electric/motor-pmsm/index";
import { ConsumerNode, ProducerNode } from "../execution/poc-nodes";

const DT = 5e-5; // 20 kHz, the atlas integration step
const TARGET = 2 * Math.PI * 50; // 50 rps -> f_mech = 50 Hz

/** A default Earth-surface view with its gravity vector overridden. */
function viewWithGravity(id: string, g: { x: number; y: number; z: number }): SceneStateView {
    const base = buildDefaultStateView(id);
    return new Proxy(base, {
        get(target, prop) {
            if (prop === "gravity") return g;
            return Reflect.get(target, prop);
        },
    });
}

function mean(xs: ReadonlyArray<number>): number {
    let s = 0;
    for (const x of xs) s += x;
    return xs.length ? s / xs.length : 0;
}
function rms(xs: ReadonlyArray<number>): number {
    let s = 0;
    for (const x of xs) s += x * x;
    return xs.length ? Math.sqrt(s / xs.length) : 0;
}

interface RunResult {
    omega: number;
    iqRms: number;
    accelRms: number;
}

/** Embed the container in a parent, drive speed_target, run under `scene`,
 *  and read its boundary outputs (omega / i_q / accel_y) back through
 *  parent consumers. */
function runContainer(scene: SceneStateView): RunResult {
    const container = createGravityCoupledPmsmGraph();
    const speed = new ProducerNode(TARGET);
    const omegaSink = new ConsumerNode();
    const iqSink = new ConsumerNode();
    const accelSink = new ConsumerNode();

    const parent = new RuntimeGraphBuilder<IRuntimeNode, IChannel>()
        .withMode("dynamic")
        .withNodes(speed, container, omegaSink, iqSink, accelSink)
        .withChannel(speed, container, "value", "speed_target")
        .withChannel(container, omegaSink, "omega", "in")
        .withChannel(container, iqSink, "i_q", "in")
        .withChannel(container, accelSink, "accel_y", "in")
        .build();

    const session = new Session(parent);
    // Set BEFORE running: the container's InheritedSceneStateView reads the
    // parent's view live, so the inner machine sees this gravity.
    (session as unknown as { sceneStateView: SceneStateView }).sceneStateView = scene;

    const settle = 8000; // 0.4 s for the FOC to converge
    const capture = 4000; // 0.2 s = 10 cycles of 50 Hz
    for (let i = 0; i < settle; i++) session.run(i * DT);
    omegaSink.received.length = 0;
    iqSink.received.length = 0;
    accelSink.received.length = 0;
    for (let i = 0; i < capture; i++) session.run((settle + i) * DT);

    return { omega: mean(omegaSink.received), iqRms: rms(iqSink.received), accelRms: rms(accelSink.received) };
}

describe("Physics.Electric.Motor.PMSM:gravity-coupled container", () => {
    it("exposes the assembly's boundary ports (interior built at construction)", () => {
        const container = createGravityCoupledPmsmGraph();
        expect(container.inputPorts.map((p) => p.slot)).toEqual(["speed_target"]);
        expect(container.outputPorts.map((p) => p.slot)).toEqual(["i_q", "omega", "force_y", "force_z", "accel_y", "accel_z"]);
        // The interior is live immediately (not an empty shell awaiting JSON).
        expect(container.nodes.length).toBeGreaterThanOrEqual(4);
    });

    it("spins to speed and emits gravity-driven vibration under Earth", () => {
        const earth = runContainer(viewWithGravity("earth", { x: 0, y: 0, z: -9.81 }));
        // FOC spun the inner machine near the setpoint, through the container boundary.
        expect(earth.omega).toBeGreaterThan(0.7 * TARGET);
        // Drive current flows.
        expect(earth.iqRms).toBeGreaterThan(0);
        // Housing acceleration (UMP rotor-sag vibration) is present.
        expect(earth.accelRms).toBeGreaterThan(0);
    });

    it("the SAME container runs in microgravity with the vibration collapsed (no rewiring)", () => {
        const earth = runContainer(viewWithGravity("earth", { x: 0, y: 0, z: -9.81 }));
        const orbital = runContainer(viewWithGravity("orbital", { x: 0, y: 0, z: 0 }));

        // The drive still spins the machine in microgravity.
        expect(orbital.omega).toBeGreaterThan(0.7 * TARGET);
        // The gravity-driven vibration collapses: Orbital accel is a tiny
        // fraction of Earth's (ideally ~0, since no sag without gravity).
        expect(orbital.accelRms).toBeLessThan(0.01 * earth.accelRms);
    });
});
