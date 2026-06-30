/**
 * Phase 6 (single load ramp-up) as an editable .spikypanda graph.
 *
 * The headless analysis (packages/tests/privates/microg/rs385-rampup.test.ts)
 * drives a constant 7 V RS-385 with ONE Load Torque ramping 2 -> 22 mN.m over
 * 10 s plus a rotor-imbalance fault, then decomposes the signals second by
 * second. This test reproduces that exact montage with REAL registry nodes
 * (via v3-graph-gen, no hand-rolled JSON): a `ramp`-profile LoadTorque
 * (baseTorque -> targetTorque at rampRate), the imbalance wired to the motor's
 * fault_0 (an ApplyTo), and the housing/IMU/current measurement chains feeding
 * line + FFT tiles. It writes the graph to report/graphs/ (the deliverable) and
 * to the host graphs dir (so the editor can open it), then loads it headless and
 * confirms every typeId resolves and the loaded graph ramps the motor down while
 * the imbalance vibration is present.
 */
import * as fs from "fs";
import * as path from "path";
import { DEFAULT_RAMPUP, predictRampup } from "spikypanda-applications-microg";
import { DcMotorDynamicNode, HousingMechanicsNode, LoadTorqueNode } from "spikypanda-plugin-physics";
import { buildHeadlessRegistry, findInstance, GRAPHS_DIR, loadGraphHeadless } from "./graphs.loader";
import { buildV3Document, type ConnSpec, type NodeSpec, type TileSpec } from "./v3-graph-gen";

const OUT = "phase6-rampup.spikypanda";
const REPORT_GRAPHS = path.resolve(__dirname, "../../../report/phase6/graphs");

// Single load ramp: base -> target at |rampRate|, then HOLD (the LoadTorque ramp
// profile). rampRate = (tauHigh - tauLow) / rampSeconds reaches the plateau in
// exactly rampSeconds; duration=0 leaves the segment open-ended (no chain).
const RAMP = {
    base: DEFAULT_RAMPUP.tauLow, // 2e-3 N.m
    target: DEFAULT_RAMPUP.tauHigh, // 22e-3 N.m
    rate: (DEFAULT_RAMPUP.tauHigh - DEFAULT_RAMPUP.tauLow) / DEFAULT_RAMPUP.rampSeconds, // 2e-3 N.m/s
} as const;
const p0 = predictRampup(DEFAULT_RAMPUP.tauLow, DEFAULT_RAMPUP.driveVoltage); // regime-1 steady start

const NODES: NodeSpec[] = [
    { id: "scene", typeId: "Physics.Scene:earth", x: 40, y: 40 },
    // Drive: a constant-voltage slider, range covers the 7 V bench point (a
    // default 0..1 slider would clamp 7 V to 1 V and the motor would coast).
    { id: "drive", typeId: "Logic.Input:slider", x: 40, y: 240, params: { value: DEFAULT_RAMPUP.driveVoltage, min: 0, max: 16, step: 0.1 } },
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
            initialAngularVelocity: p0.omega, // start at the tauLow steady (no startup transient on ω)
            initialArmatureCurrent: p0.current,
        },
    },
    // The single load: a slow drift 2 -> 22 mN.m over 10 s, then a plateau.
    {
        id: "load",
        typeId: "Physics.Mechanical.Load:torque",
        x: 40,
        y: 440,
        params: { profile: "ramp", baseTorque: RAMP.base, targetTorque: RAMP.target, rampRate: RAMP.rate, duration: 0, autoStart: true },
    },
    // Rotor imbalance: a fault CAUSE applied to the motor (its `applyTo` output is
    // `fault`-typed, so the loader turns it into an ApplyTo structural link onto
    // the motor's fault_0). It contributes the rotating m.r.w^2 force the housing
    // turns into the 1x vibration.
    { id: "imbalance", typeId: "Physics.Mechanical.Fault:rotor-imbalance", x: 360, y: 440, params: { severity: 1 } },
    { id: "housing", typeId: "Physics.Mechanical.Housing:mechanics", x: 700, y: 320 },
    { id: "imu", typeId: "Physics.Mechanical.Vibration:imu", x: 1000, y: 320 },
    { id: "split", typeId: "spk.geometry:cartesian3-split", x: 1300, y: 320 },
    { id: "sensor", typeId: "Physics.Electric.Motor.DC:currentSensor", x: 700, y: 120 },
];

const CONNS: ConnSpec[] = [
    { from: ["drive", "value"], to: ["motor", "armatureVoltage"] },
    { from: ["load", "loadTorque"], to: ["motor", "loadTorque"] },
    // Fault apply point: `fault`-typed source -> ApplyTo(imbalance, motor).
    { from: ["imbalance", "applyTo"], to: ["motor", "fault_0"] },
    // Vibration + current measurement chains.
    { from: ["motor", "forceY"], to: ["housing", "forceY"] },
    { from: ["motor", "forceZ"], to: ["housing", "forceZ"] },
    { from: ["housing", "acceleration"], to: ["imu", "acceleration"] },
    { from: ["imu", "measuredAcceleration"], to: ["split", "vec3"] },
    { from: ["motor", "armatureCurrent"], to: ["sensor", "armatureCurrent"] },
    { from: ["scene", "scene_out"], to: ["motor", "scene"] },
];

// Charts: time-domain f(t) line plots + FFT spectra (current, accX/Y/Z).
const FFT_CHANNELS: ReadonlyArray<{ name: string; src: [string, string] }> = [
    { name: "current", src: ["sensor", "measuredCurrent"] },
    { name: "accX", src: ["split", "x"] },
    { name: "accY", src: ["split", "y"] },
    { name: "accZ", src: ["split", "z"] },
];
const LINE_CHANNELS: ReadonlyArray<{ name: string; src: [string, string] }> = [
    ...FFT_CHANNELS,
    { name: "speed", src: ["motor", "angularVelocity"] },
    { name: "load", src: ["load", "loadTorque"] },
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
    CHART_NODES.push({ id: fft, typeId: "DSP.Transform:fft", x: 2180, y, params: { nfft: 512, outputType: 1 } }); // outputType 1 = magnitude
    CHART_NODES.push({ id: spec, typeId: "Viz.Plot:spectrum", x: 2420, y, params: { title: `${ch.name} FFT` }, label: `${ch.name} FFT` });
    CHART_CONNS.push({ from: ch.src, to: [buf, "value"] });
    CHART_CONNS.push({ from: [buf, "frame"], to: [win, "signal"] });
    CHART_CONNS.push({ from: [win, "windowed"], to: [fft, "signal"] });
    CHART_CONNS.push({ from: [fft, "spectrum"], to: [spec, "magnitudes"] });
    TILES.push({ nodeId: spec, renderableType: "Viz.Plot:spectrum", x: (i % 2) * 4, y: 8 + Math.floor(i / 2) * 4, w: 4, h: 4 });
});

const ALL_NODES: NodeSpec[] = [...NODES, ...CHART_NODES];
const ALL_CONNS: ConnSpec[] = [...CONNS, ...CHART_CONNS];

describe("RS-385 Phase 6 ramp-up graph (.spikypanda generate + verify)", () => {
    const registry = buildHeadlessRegistry();

    it("generates the single-ramp graph (load ramp + imbalance + f(t) lines + FFT); every typeId resolves", () => {
        const json = buildV3Document(registry, ALL_NODES, ALL_CONNS, TILES);
        fs.mkdirSync(REPORT_GRAPHS, { recursive: true });
        fs.writeFileSync(path.join(REPORT_GRAPHS, OUT), json); // the deliverable
        fs.writeFileSync(path.join(GRAPHS_DIR, OUT), json); // editor-openable copy + load source
        const loaded = loadGraphHeadless(OUT, registry);
        expect(loaded.missingTypeIds).toEqual([]); // every node type resolves
        // The only skipped wire is scene_out -> motor.scene (the Scene is a
        // GraphItem, a structural binding not a runtime channel). The imbalance
        // fault wire is NOT skipped: it becomes an ApplyTo, not a channel.
        expect(loaded.skippedConnections).toEqual(["scene:scene_out->motor:scene"]);
    });

    it("the loaded graph ramps the motor down and carries the imbalance vibration", () => {
        if (!fs.existsSync(path.join(GRAPHS_DIR, OUT))) fs.writeFileSync(path.join(GRAPHS_DIR, OUT), buildV3Document(registry, ALL_NODES, ALL_CONNS, TILES));
        const loaded = loadGraphHeadless(OUT, registry);
        const motor = findInstance(loaded, DcMotorDynamicNode);
        const housing = findInstance(loaded, HousingMechanicsNode);
        const load = loaded.instances.get("load") as LoadTorqueNode;
        expect(load.profile).toBe("ramp");

        const dt = 2e-4; // 5 kHz, as in the headless analysis
        let wEarly = 0;
        let wLate = 0;
        let maxAccY = 0;
        const steps = Math.round(2.0 / dt); // 2 s: the load has ramped 2 -> 6 mN.m, plenty to slow the motor
        for (let k = 0; k < steps; k++) {
            const t = k * dt;
            loaded.session.run(t);
            if (t >= 0.2 && t < 0.2 + dt) wEarly = motor.angularVelocity; // light-load steady
            if (t >= 2.0 - dt) wLate = motor.angularVelocity; // after the load has risen
            maxAccY = Math.max(maxAccY, Math.abs(housing.accelerationY));
        }

        // Driven steady at the light load (~800 rad/s): catches a mis-ranged drive.
        expect(wEarly).toBeGreaterThan(p0.omega * 0.97);
        expect(wEarly).toBeLessThan(p0.omega * 1.03);
        // Load rose over the 2 s -> speed fell (the montee en charge).
        expect(wLate).toBeLessThan(wEarly);
        // The rotor imbalance reaches the housing: a real 1x vibration is present.
        expect(maxAccY).toBeGreaterThan(1.0);
    });
});
