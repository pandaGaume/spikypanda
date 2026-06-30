/**
 * Phase 8: the gravity-sensitive turbine / scrubber as an editable .spikypanda.
 *
 * The faults are applied to the TURBINE PAYLOAD (imbalance -> fault_0, static
 * eccentricity -> fault_1); the turbine composes them with its mass + the scene
 * gravity + its fan-law load and forwards ONE fault to the motor
 * (turbine.applyTo -> motor.fault_0). Speed feeds back through a Z^-1 channel.
 *
 * This test generates that montage with REAL registry nodes (v3-graph-gen, no
 * hand-rolled JSON), writes it to report/phase8/graphs/ + the host graphs dir,
 * then loads it headless and confirms: every typeId resolves, the chain drives
 * the motor (loaded by the fan law, 1x ["once per shaft revolution"] vibration
 * present), and the gravity signature behaves -- the 1x CURRENT line is larger in
 * earth than in microgravity (the imbalance-gravity part), while the DC current
 * (the aero load) and the 1x vibration (centrifugal) are gravity-blind.
 */
import * as fs from "fs";
import * as path from "path";
import { lockIn } from "spikypanda-applications-microg";
import { buildDefaultStateView } from "spikypanda-core";
import type { SceneStateView } from "spikypanda-core";
import { DcMotorDynamicNode, HousingMechanicsNode } from "spikypanda-plugin-physics";
import { buildHeadlessRegistry, findInstance, GRAPHS_DIR, loadGraphHeadless } from "./graphs.loader";
import { buildV3Document, type ConnSpec, type NodeSpec, type TileSpec } from "./v3-graph-gen";

const OUT = "turbine-scrubber.spikypanda";
const REPORT_GRAPHS = path.resolve(__dirname, "../../../report/phase8/graphs");

const SCENE_G: Record<string, number> = { earth: 9.81, orbital: 1e-6 };
function sceneView(scene: "earth" | "orbital"): SceneStateView {
    const g = SCENE_G[scene];
    const base = buildDefaultStateView(`scrubber-${scene}`);
    return new Proxy(base, { get: (t, p): unknown => (p === "gravity" ? { x: 0, y: 0, z: -g } : Reflect.get(t, p)) }) as SceneStateView;
}

const NODES: NodeSpec[] = [
    { id: "scene", typeId: "Physics.Scene:earth", x: 40, y: 40 },
    { id: "drive", typeId: "Logic.Input:slider", x: 40, y: 240, params: { value: 7, min: 0, max: 16, step: 0.1 } },
    {
        id: "motor",
        typeId: "Physics.Electric.Motor.DC:dynamic",
        x: 360,
        y: 120,
        params: {
            armatureResistance: 1.22,
            armatureInductance: 1e-3,
            torqueConstant: 8.22e-3,
            backEmfConstant: 8.22e-3,
            rotorInertia: 6e-7,
            viscousFriction: 1.03e-6,
            umpRadialStiffness: 4000,
        },
    },
    // The scrubber load + fault composer: fan law k*omega^2, carries the faults.
    { id: "turbine", typeId: "Physics.Mechanical.Load:turbine", x: 40, y: 440, params: { fanCoefficient: 1.5e-8, payloadMass: 0.05, unbalanceRadius: 1e-3 } },
    // Imbalance (gravity pendulum on the offset CG) -> turbine.fault_0.
    { id: "imbalance", typeId: "Physics.Mechanical.Fault:rotor-imbalance", x: 40, y: 640, params: { severity: 1, gravityCoupling: true } },
    // Static eccentricity (a desaxage) -> turbine.fault_1. Wired to show the
    // two-fault composition; severity 0 = inert by default. Dial it up in the
    // editor to add a gravity-INDEPENDENT current line (it persists in orbit,
    // unlike the imbalance gravity line -- the MCSA distinction), but a strong
    // one MASKS the gravity signature, so it stays off for the clean demo.
    { id: "eccentricity", typeId: "Physics.Mechanical.Fault:rotor-eccentricity", x: 280, y: 640, params: { severity: 0 } },
    { id: "feedback", typeId: "Control.Feedback:channel", x: 360, y: 440 },
    { id: "housing", typeId: "Physics.Mechanical.Housing:mechanics", x: 700, y: 320 },
    { id: "imu", typeId: "Physics.Mechanical.Vibration:imu", x: 1000, y: 320 },
    { id: "split", typeId: "spk.geometry:cartesian3-split", x: 1300, y: 320 },
    { id: "sensor", typeId: "Physics.Electric.Motor.DC:currentSensor", x: 700, y: 120 },
];

const CONNS: ConnSpec[] = [
    { from: ["drive", "value"], to: ["motor", "armatureVoltage"] },
    // Faults apply to THE TURBINE; the turbine forwards the composed fault to the motor.
    { from: ["imbalance", "applyTo"], to: ["turbine", "fault_0"] },
    { from: ["eccentricity", "applyTo"], to: ["turbine", "fault_1"] },
    { from: ["turbine", "applyTo"], to: ["motor", "fault_0"] },
    // Speed feedback (Z^-1) so the turbine sees the motor's speed for the fan law.
    { from: ["motor", "angularVelocity"], to: ["feedback", "input"] },
    { from: ["feedback", "output"], to: ["turbine", "angularVelocity"] },
    // Vibration + current measurement chains.
    { from: ["motor", "forceY"], to: ["housing", "forceY"] },
    { from: ["motor", "forceZ"], to: ["housing", "forceZ"] },
    { from: ["housing", "acceleration"], to: ["imu", "acceleration"] },
    { from: ["imu", "measuredAcceleration"], to: ["split", "vec3"] },
    { from: ["motor", "armatureCurrent"], to: ["sensor", "armatureCurrent"] },
    { from: ["scene", "scene_out"], to: ["motor", "scene"] },
];

// Charts: line plots + FFT spectra (current, accX/Y/Z) + the turbine load.
const FFT_CHANNELS: ReadonlyArray<{ name: string; src: [string, string] }> = [
    { name: "current", src: ["sensor", "measuredCurrent"] },
    { name: "accX", src: ["split", "x"] },
    { name: "accY", src: ["split", "y"] },
    { name: "accZ", src: ["split", "z"] },
];
const LINE_CHANNELS: ReadonlyArray<{ name: string; src: [string, string] }> = [
    ...FFT_CHANNELS,
    { name: "speed", src: ["motor", "angularVelocity"] },
    { name: "load", src: ["turbine", "loadTorque"] },
];

const CHART_NODES: NodeSpec[] = [];
const CHART_CONNS: ConnSpec[] = [];
const TILES: TileSpec[] = [];
LINE_CHANNELS.forEach((ch, i) => {
    const id = `line_${ch.name}`;
    CHART_NODES.push({ id, typeId: "Viz.Plot:line", x: 1700, y: 40 + i * 120, params: { title: ch.name }, label: `${ch.name} f(t)` });
    CHART_CONNS.push({ from: ch.src, to: [id, "value"] });
    TILES.push({ nodeId: id, renderableType: "Viz.Plot:line", x: (i % 3) * 4, y: Math.floor(i / 3) * 4, w: 4, h: 4 });
});
FFT_CHANNELS.forEach((ch, i) => {
    const [buf, win, fft, spec] = [`buf_${ch.name}`, `win_${ch.name}`, `fft_${ch.name}`, `spec_${ch.name}`];
    const y = 820 + i * 200;
    CHART_NODES.push({ id: buf, typeId: "DSP.Stream:buffer", x: 1700, y, params: { frameSize: 512 } });
    CHART_NODES.push({ id: win, typeId: "DSP.Window:window", x: 1940, y });
    CHART_NODES.push({ id: fft, typeId: "DSP.Transform:fft", x: 2180, y, params: { nfft: 512, outputType: 1 } });
    CHART_NODES.push({ id: spec, typeId: "Viz.Plot:spectrum", x: 2420, y, params: { title: `${ch.name} FFT` }, label: `${ch.name} FFT` });
    CHART_CONNS.push({ from: ch.src, to: [buf, "value"] });
    CHART_CONNS.push({ from: [buf, "frame"], to: [win, "signal"] });
    CHART_CONNS.push({ from: [win, "windowed"], to: [fft, "signal"] });
    CHART_CONNS.push({ from: [fft, "spectrum"], to: [spec, "magnitudes"] });
    TILES.push({ nodeId: spec, renderableType: "Viz.Plot:spectrum", x: (i % 2) * 4, y: 8 + Math.floor(i / 2) * 4, w: 4, h: 4 });
});

const ALL_NODES: NodeSpec[] = [...NODES, ...CHART_NODES];
const ALL_CONNS: ConnSpec[] = [...CONNS, ...CHART_CONNS];

/** Load the graph in a given scene, run it, and read the steady signatures. */
function runLoaded(scene: "earth" | "orbital", registry: ReturnType<typeof buildHeadlessRegistry>): { omega: number; currentDc: number; current1x: number; vib1x: number } {
    const loaded = loadGraphHeadless(OUT, registry);
    (loaded.session as unknown as { sceneStateView: SceneStateView }).sceneStateView = sceneView(scene);
    const motor = findInstance(loaded, DcMotorDynamicNode);
    const housing = findInstance(loaded, HousingMechanicsNode);
    const dt = 2e-4;
    const omega: number[] = [];
    const current: number[] = [];
    const accelY: number[] = [];
    const steps = Math.round(1.0 / dt);
    for (let k = 0; k < steps; k++) {
        loaded.session.run(k * dt);
        omega.push(motor.angularVelocity);
        current.push(motor.armatureCurrent);
        accelY.push(housing.accelerationY);
    }
    const i0 = Math.round(steps / 2);
    const w = <T>(a: T[]): T[] => a.slice(i0);
    const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
    const meanOmega = mean(w(omega));
    const fMech = meanOmega / (2 * Math.PI);
    const wc = w(current);
    const wa = w(accelY);
    const cm = mean(wc);
    const am = mean(wa);
    return {
        omega: meanOmega,
        currentDc: cm,
        current1x: lockIn(
            wc.map((v) => v - cm),
            dt,
            fMech
        ).amplitude,
        vib1x: lockIn(
            wa.map((v) => v - am),
            dt,
            fMech
        ).amplitude,
    };
}

describe("RS-385 Phase 8 turbine graph (.spikypanda generate + verify)", () => {
    const registry = buildHeadlessRegistry();

    it("generates the turbine montage (faults -> turbine -> motor); every typeId resolves", () => {
        const json = buildV3Document(registry, ALL_NODES, ALL_CONNS, TILES);
        fs.mkdirSync(REPORT_GRAPHS, { recursive: true });
        fs.writeFileSync(path.join(REPORT_GRAPHS, OUT), json); // the deliverable
        fs.writeFileSync(path.join(GRAPHS_DIR, OUT), json); // editor-openable copy + load source
        const loaded = loadGraphHeadless(OUT, registry);
        expect(loaded.missingTypeIds).toEqual([]);
        // Only the scene config wire is skipped; the three fault wires become ApplyTo, not channels.
        expect(loaded.skippedConnections).toEqual(["scene:scene_out->motor:scene"]);
    });

    it("the loaded graph runs the scrubber and shows the gravity signature (earth vs microgravity)", () => {
        if (!fs.existsSync(path.join(GRAPHS_DIR, OUT))) fs.writeFileSync(path.join(GRAPHS_DIR, OUT), buildV3Document(registry, ALL_NODES, ALL_CONNS, TILES));
        const earth = runLoaded("earth", registry);
        const orbital = runLoaded("orbital", registry);
        // The fan law loaded the motor and the turbine forwarded a real 1x vibration.
        expect(earth.omega).toBeGreaterThan(100);
        expect(earth.omega).toBeLessThan(780);
        expect(earth.vib1x).toBeGreaterThan(0.01);
        // The aero DC current is present and gravity-blind (the motor never goes to zero current).
        expect(earth.currentDc).toBeGreaterThan(0.5);
        expect(Math.abs(earth.currentDc - orbital.currentDc) / orbital.currentDc).toBeLessThan(0.01);
        // The 1x vibration is gravity-independent (centrifugal).
        expect(Math.abs(earth.vib1x - orbital.vib1x) / orbital.vib1x).toBeLessThan(0.1);
        // The 1x CURRENT line is the gravity signature (the imbalance offset-CG
        // pendulum): present in earth, it collapses in microgravity.
        expect(earth.current1x).toBeGreaterThan(1e-4);
        expect(orbital.current1x).toBeLessThan(earth.current1x * 0.1);
    });
});
