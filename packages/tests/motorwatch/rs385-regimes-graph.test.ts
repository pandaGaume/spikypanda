/**
 * Phase 6 — generate the RS-385 REGIME graph as an editable .spikypanda and
 * verify it loads + runs (compatibility check ahead of the MCP sprints).
 *
 * The regime SCHEDULER is now a CHAIN of `Load:torque` segments (no monolithic
 * node): each segment runs its profile for `duration`, then pulses `_completed`
 * (a CONTROL-plane trigger) into the next segment's `_start`. A timed segment
 * has no data input, so it stays a "true source" the scheduler ticks every sim
 * step (its duration clock never stalls); the open-ended fan-law segment reads
 * the motor speed (fed back) and ignores it while inactive. This test generates
 * the graph via the real registry (v3-graph-gen), writes the .spikypanda, then
 * loads it headless and confirms every typeId resolves and the loaded chain
 * drives the motor through the 3 regimes (speed falls as the load rises).
 */
import * as fs from "fs";
import * as path from "path";
import { predictRegimeSteady } from "spikypanda-applications-microg";
import { DcMotorDynamicNode, LoadTorqueNode } from "spikypanda-plugin-physics";
import { buildHeadlessRegistry, findInstance, GRAPHS_DIR, loadGraphHeadless } from "./graphs.loader";
import { buildV3Document, type ConnSpec, type NodeSpec, type TileSpec } from "./v3-graph-gen";

const OUT = "rs385-regimes.spikypanda";

const r1 = predictRegimeSteady(1);

// Editor time scale: ~5 s plateaus so the regimes step at t=5 s and t=10 s
// (lengthen `duration` in the property panel for a slow 2-min run). Each timed
// segment is autoStart=false except the first.
const REGIME = { torque1: 2e-3, torque2: 5e-3, fanCoefficient: 1.5e-8, plateau: 5 } as const;

const NODES: NodeSpec[] = [
    { id: "scene", typeId: "Physics.Scene:earth", x: 40, y: 40 },
    // Drive: a slider whose RANGE covers the bench voltage (a default 0..1
    // slider would clamp 7 V to 1 V in the editor and the motor would coast).
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
            initialAngularVelocity: r1.omega, // start at regime-1 steady (no startup transient)
            initialArmatureCurrent: r1.current,
        },
    },
    // Regime chain: baseline -> overload -> fan law. Segment i's `_completed`
    // wires to segment i+1's `_start` (built in CONNS below).
    { id: "seg1", typeId: "Physics.Mechanical.Load:torque", x: 40, y: 440, params: { profile: "constant", baseTorque: REGIME.torque1, duration: REGIME.plateau, autoStart: true } },
    {
        id: "seg2",
        typeId: "Physics.Mechanical.Load:torque",
        x: 280,
        y: 440,
        params: { profile: "constant", baseTorque: REGIME.torque2, duration: REGIME.plateau, autoStart: false },
    },
    { id: "seg3", typeId: "Physics.Mechanical.Load:torque", x: 520, y: 440, params: { profile: "quadratic", k: REGIME.fanCoefficient, duration: 0, autoStart: false } },
    { id: "feedback", typeId: "Control.Feedback:channel", x: 360, y: 600 },
    { id: "housing", typeId: "Physics.Mechanical.Housing:mechanics", x: 700, y: 320 },
    { id: "imu", typeId: "Physics.Mechanical.Vibration:imu", x: 1000, y: 320 },
    { id: "split", typeId: "spk.geometry:cartesian3-split", x: 1300, y: 320 },
    { id: "sensor", typeId: "Physics.Electric.Motor.DC:currentSensor", x: 700, y: 120 },
];

const CONNS: ConnSpec[] = [
    { from: ["drive", "value"], to: ["motor", "armatureVoltage"] },
    // Each segment drives the motor; only the ACTIVE one publishes (the rest
    // return early), so the motor's loadTorque signal carries the live regime.
    { from: ["seg1", "loadTorque"], to: ["motor", "loadTorque"] },
    { from: ["seg2", "loadTorque"], to: ["motor", "loadTorque"] },
    { from: ["seg3", "loadTorque"], to: ["motor", "loadTorque"] },
    // Event chain on the CONTROL plane: reach -> next.
    { from: ["seg1", "_completed"], to: ["seg2", "_start"] },
    { from: ["seg2", "_completed"], to: ["seg3", "_start"] },
    // Speed feedback (Z^-1) into the fan-law segment.
    { from: ["motor", "angularVelocity"], to: ["feedback", "input"] },
    { from: ["feedback", "output"], to: ["seg3", "angularVelocity"] },
    // Vibration + current measurement chains.
    { from: ["motor", "forceY"], to: ["housing", "forceY"] },
    { from: ["motor", "forceZ"], to: ["housing", "forceZ"] },
    { from: ["housing", "acceleration"], to: ["imu", "acceleration"] },
    { from: ["imu", "measuredAcceleration"], to: ["split", "vec3"] },
    { from: ["motor", "armatureCurrent"], to: ["sensor", "armatureCurrent"] },
    { from: ["scene", "scene_out"], to: ["motor", "scene"] },
];

// ── Charts: time-domain f(t) line plots + FFT spectra (I, accX/Y/Z) ──────────
const FFT_CHANNELS: ReadonlyArray<{ name: string; src: [string, string] }> = [
    { name: "current", src: ["sensor", "measuredCurrent"] },
    { name: "accX", src: ["split", "x"] },
    { name: "accY", src: ["split", "y"] },
    { name: "accZ", src: ["split", "z"] },
];
const LINE_CHANNELS: ReadonlyArray<{ name: string; src: [string, string] }> = [...FFT_CHANNELS, { name: "speed", src: ["motor", "angularVelocity"] }];

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

describe("RS-385 regime graph (.spikypanda generate + verify)", () => {
    const registry = buildHeadlessRegistry();

    it("generates the full regime graph (chain + f(t) lines + FFT spectra); every typeId resolves", () => {
        const json = buildV3Document(registry, ALL_NODES, ALL_CONNS, TILES);
        fs.writeFileSync(path.join(GRAPHS_DIR, OUT), json);
        const loaded = loadGraphHeadless(OUT, registry);
        expect(loaded.missingTypeIds).toEqual([]); // MCP compatibility: every node type resolves
        // The only skipped wire is scene_out -> motor.scene: the Scene is a
        // GraphItem (no fire), so its per-node binding is editor-structural, not
        // a runtime channel. Every other (data + control) connection is wired.
        expect(loaded.skippedConnections).toEqual(["scene:scene_out->motor:scene"]);
    });

    it("the loaded chain drives the motor through the 3 regimes (speed falls as load rises)", () => {
        if (!fs.existsSync(path.join(GRAPHS_DIR, OUT))) fs.writeFileSync(path.join(GRAPHS_DIR, OUT), buildV3Document(registry, ALL_NODES, ALL_CONNS, TILES));
        const loaded = loadGraphHeadless(OUT, registry);
        const motor = findInstance(loaded, DcMotorDynamicNode);
        const seg1 = loaded.instances.get("seg1") as LoadTorqueNode;
        const seg2 = loaded.instances.get("seg2") as LoadTorqueNode;
        const seg3 = loaded.instances.get("seg3") as LoadTorqueNode;
        // Compress the editor's 40 s plateaus so the regimes are reachable in a
        // short headless run.
        seg1.duration = 0.1;
        seg2.duration = 0.1;

        const dt = 5e-5;
        let w1 = 0;
        let w3 = 0;
        const steps = Math.round(0.3 / dt);
        for (let k = 0; k < steps; k++) {
            const t = k * dt;
            loaded.session.run(t);
            if (t >= 0.09 && t < 0.1) w1 = motor.angularVelocity; // regime 1 (light load)
            if (t >= 0.29) w3 = motor.angularVelocity; // regime 3 (fan law)
        }

        expect(seg1.active).toBe(false); // seg1 completed and handed over
        expect(seg2.active).toBe(false); // seg2 completed and handed over
        expect(seg3.active).toBe(true); // the chain advanced to the open-ended fan-law regime
        expect(w1).toBeGreaterThan(w3); // load up -> speed down across regimes
        // ABSOLUTE steady speeds (not just monotonic): a coasting / under-driven
        // motor would also satisfy w1>w3, so pin each regime to its closed form.
        // This is what catches a mis-ranged drive slider (7 V clamped to 1 V).
        const r3 = predictRegimeSteady(3);
        expect(w1).toBeGreaterThan(r1.omega * 0.97); // regime 1 driven steady (~800 rad/s)
        expect(w1).toBeLessThan(r1.omega * 1.03);
        expect(w3).toBeGreaterThan(r3.omega * 0.97); // regime 3 fan-law steady (~704 rad/s)
        expect(w3).toBeLessThan(r3.omega * 1.03);
    });
});
