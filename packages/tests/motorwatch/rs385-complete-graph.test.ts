/**
 * The complete RS-385 montage as an editable `.spikypanda`, placement included.
 *
 * This is the Phase 8 scrubber with the piece it was missing: an explicit
 * placement chain. `Attitude` publishes a quaternion, the geometry `Transform`
 * turns it into a matrix, and that one matrix is the `parentWorld` of every
 * body that projects gravity, which is the motor, the turbine and the housing.
 * Editing `pitch` on the Attitude node tilts the whole assembly, and the
 * gravity each body feels follows, because `TransformNode` re-projects the
 * scene world gravity into its own frame whenever the orientation moves.
 *
 * The verification is the part that would otherwise be assumed: load the graph
 * headless and check that a pitch of 90 degrees actually reaches all three
 * bodies. A placement wired to only one of them would still run, still look
 * right in the editor, and quietly leave the other two horizontal.
 */
import * as fs from "fs";
import * as path from "path";
import { lockIn } from "spikypanda-applications-microg";
import { buildDefaultStateView } from "spikypanda-core";
import type { SceneStateView } from "spikypanda-core";
import { DcMotorDynamicNode, HousingMechanicsNode } from "spikypanda-plugin-physics";
import { buildHeadlessRegistry, findInstance, GRAPHS_DIR, loadGraphHeadless } from "./graphs.loader";
import { buildV3Document, type ConnSpec, type NodeSpec, type TileSpec } from "./v3-graph-gen";

const OUT = "rs385-complete.spikypanda";
const REPORT_GRAPHS = path.resolve(__dirname, "../../../report/rs385/graphs");

function sceneView(g: number): SceneStateView {
    const base = buildDefaultStateView("rs385-complete");
    return new Proxy(base, { get: (t, p): unknown => (p === "gravity" ? { x: 0, y: 0, z: -g } : Reflect.get(t, p)) }) as SceneStateView;
}

const NODES: NodeSpec[] = [
    { id: "scene", typeId: "Physics.Scene:earth", x: 40, y: 40 },
    // Placement: the orientation knob of the whole montage. Pitch is the axis
    // that changes what the machine feels, because the shaft lies along body X
    // and gravity along world -Z, so tilting takes the radial gravity from g
    // down to zero over 90 degrees. Yaw turns the assembly about the gravity
    // vector itself and changes nothing.
    { id: "attitude", typeId: "spk.geometry:attitude", x: 40, y: 840, params: { yaw: 0, pitch: 0, roll: 0 }, label: "Attitude (tilt)" },
    { id: "transform", typeId: "spk.geometry:transform", x: 280, y: 840, label: "Placement" },
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
    { id: "turbine", typeId: "Physics.Mechanical.Load:turbine", x: 40, y: 440, params: { fanCoefficient: 1.5e-8, payloadMass: 0.05, unbalanceRadius: 1e-3 } },
    { id: "imbalance", typeId: "Physics.Mechanical.Fault:rotor-imbalance", x: 40, y: 640, params: { severity: 1, gravityCoupling: true } },
    // Severity 0 = inert. Dial it up to add a gravity-INDEPENDENT current line
    // that survives both a tilt and microgravity, which is how a real defect
    // is told apart from the gravity signature.
    { id: "eccentricity", typeId: "Physics.Mechanical.Fault:rotor-eccentricity", x: 280, y: 640, params: { severity: 0 } },
    { id: "feedback", typeId: "Control.Feedback:channel", x: 360, y: 440 },
    { id: "housing", typeId: "Physics.Mechanical.Housing:mechanics", x: 700, y: 320 },
    { id: "imu", typeId: "Physics.Mechanical.Vibration:imu", x: 1000, y: 320 },
    { id: "split", typeId: "spk.geometry:cartesian3-split", x: 1300, y: 320 },
    { id: "sensor", typeId: "Physics.Electric.Motor.DC:currentSensor", x: 700, y: 120 },
];

const CONNS: ConnSpec[] = [
    { from: ["drive", "value"], to: ["motor", "armatureVoltage"] },
    // Placement -> every body that projects gravity. One source, three
    // consumers, all on the single output slot of the Transform.
    { from: ["attitude", "rotation"], to: ["transform", "rotation"] },
    { from: ["transform", "matrix"], to: ["motor", "parentWorld"] },
    { from: ["transform", "matrix"], to: ["turbine", "parentWorld"] },
    { from: ["transform", "matrix"], to: ["housing", "parentWorld"] },
    // Faults apply to the turbine; the turbine forwards one composed fault.
    { from: ["imbalance", "applyTo"], to: ["turbine", "fault_0"] },
    { from: ["eccentricity", "applyTo"], to: ["turbine", "fault_1"] },
    { from: ["turbine", "applyTo"], to: ["motor", "fault_0"] },
    { from: ["motor", "angularVelocity"], to: ["feedback", "input"] },
    { from: ["feedback", "output"], to: ["turbine", "angularVelocity"] },
    { from: ["motor", "forceY"], to: ["housing", "forceY"] },
    { from: ["motor", "forceZ"], to: ["housing", "forceZ"] },
    { from: ["housing", "acceleration"], to: ["imu", "acceleration"] },
    { from: ["imu", "measuredAcceleration"], to: ["split", "vec3"] },
    { from: ["motor", "armatureCurrent"], to: ["sensor", "armatureCurrent"] },
    { from: ["scene", "scene_out"], to: ["motor", "scene"] },
];

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

/** The same document with a different tilt baked into the Attitude node. */
function documentAt(registry: ReturnType<typeof buildHeadlessRegistry>, pitchDeg: number): string {
    const nodes = [...NODES, ...CHART_NODES].map((n) => (n.id === "attitude" ? { ...n, params: { ...n.params, pitch: pitchDeg } } : n));
    return buildV3Document(registry, nodes, [...CONNS, ...CHART_CONNS], TILES);
}

interface Reading {
    omega: number;
    currentDc: number;
    current1x: number;
    vib1x: number;
}

/** Load a document, run it, and read the steady signatures. */
function runDocument(json: string, registry: ReturnType<typeof buildHeadlessRegistry>, gravity: number): Reading {
    fs.writeFileSync(path.join(GRAPHS_DIR, OUT), json);
    const loaded = loadGraphHeadless(OUT, registry);
    (loaded.session as unknown as { sceneStateView: SceneStateView }).sceneStateView = sceneView(gravity);
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
    const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
    const meanOmega = mean(omega.slice(i0));
    const fMech = meanOmega / (2 * Math.PI);
    const wc = current.slice(i0);
    const wa = accelY.slice(i0);
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

describe("RS-385 complete graph with placement (.spikypanda)", () => {
    const registry = buildHeadlessRegistry();

    it("generates the montage; every typeId resolves and only the scene config wire is skipped", () => {
        const json = documentAt(registry, 0);
        fs.mkdirSync(REPORT_GRAPHS, { recursive: true });
        fs.writeFileSync(path.join(REPORT_GRAPHS, OUT), json); // the deliverable
        fs.writeFileSync(path.join(GRAPHS_DIR, OUT), json); // editor-openable copy
        const loaded = loadGraphHeadless(OUT, registry);
        expect(loaded.missingTypeIds).toEqual([]);
        expect(loaded.skippedConnections).toEqual(["scene:scene_out->motor:scene"]);
    });

    it("runs horizontal, with the gravity signature present", () => {
        const r = runDocument(documentAt(registry, 0), registry, 9.81);
        expect(r.omega).toBeGreaterThan(100);
        expect(r.currentDc).toBeGreaterThan(0);
        expect(r.current1x).toBeGreaterThan(0);
        expect(r.vib1x).toBeGreaterThan(0);
    }, 60000);

    it("carries the placement to EVERY body, not just the first consumer", () => {
        const horizontal = runDocument(documentAt(registry, 0), registry, 9.81);
        const vertical = runDocument(documentAt(registry, 90), registry, 9.81);

        const msg =
            `[complete graph] 1x current h=${horizontal.current1x.toExponential(3)} v=${vertical.current1x.toExponential(3)} ` +
            `vib h=${horizontal.vib1x.toExponential(3)} v=${vertical.vib1x.toExponential(3)} ` +
            `dc h=${horizontal.currentDc.toFixed(4)} v=${vertical.currentDc.toFixed(4)}`;
        // eslint-disable-next-line no-console
        console.log(msg);

        // The motor got the placement: its gravity signature is gone.
        expect(vertical.current1x / horizontal.current1x).toBeLessThan(1e-2);
        // The fan load is gravity-blind, so the operating point holds. Had the
        // turbine NOT received the placement it would still be computing its
        // payload weight against a horizontal shaft.
        expect(vertical.currentDc).toBeCloseTo(horizontal.currentDc, 2);
        expect(vertical.omega).toBeCloseTo(horizontal.omega, 0);
        // The housing got it too: the vibration is centrifugal, so it has to be
        // unchanged rather than absent.
        expect(vertical.vib1x).toBeGreaterThan(0);
        expect(vertical.vib1x / horizontal.vib1x).toBeCloseTo(1, 2);
    }, 120000);

    it("leaves the deliverable at tilt 0, the state the editor should open on", () => {
        const json = documentAt(registry, 0);
        fs.writeFileSync(path.join(REPORT_GRAPHS, OUT), json);
        fs.writeFileSync(path.join(GRAPHS_DIR, OUT), json);
        const doc = JSON.parse(json) as { model: { nodes: Array<{ id: string; data?: Record<string, unknown> }> } };
        const attitude = doc.model.nodes.find((n) => n.id === "attitude");
        expect(attitude).toBeDefined();
        expect(attitude?.data?._pitch).toBe(0);
    });
});
