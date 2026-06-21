/**
 * Round-trip guarantee for the versioned motorwatch demo graphs
 * (packages/host/www/data/graphs/*.spikypanda, version 3): every
 * typeId resolves against the activated plugins, the graphs load and
 * RUN headless through the same wiring rules the node editor applies,
 * and the load torque stays a single externally swappable wire (the
 * motor block is reusable across applications by replacing one node).
 *
 * The editor-facing behaviors NOT covered here: dashboards and the
 * Viz.Plot renderers (registered as inert stubs, see graphs.loader.ts).
 */
import { DcMotorDynamicNode, InductionMotorDynamicNode, LoadTorqueNode } from "../../dev/plugins/physics/src/index";
import { OnnxModelGraph } from "../../dev/plugins/onnx/src/graphs/model.graph";
import { OnlineClusterNode } from "../../dev/plugins/ml/src/cluster/online-cluster.node";
import { buildEncoderBytes } from "./helpers";
import { buildHeadlessRegistry, findInstance, loadGraphHeadless, runTicks } from "./graphs.loader";

const registry = buildHeadlessRegistry();

const ALL_GRAPHS = ["motor-r385.spikypanda", "motorwatch-r385.spikypanda", "motor-induction.spikypanda", "motorwatch-induction.spikypanda"];

describe("demo graphs: headless round-trip", () => {
    test.each(ALL_GRAPHS)("%s: every typeId resolves and the graph loads", (file) => {
        const loaded = loadGraphHeadless(file, registry);
        expect(loaded.missingTypeIds).toEqual([]);
        // The only skipped wires are the scene config links (their
        // target SceneItem is not a runtime node).
        for (const id of loaded.skippedConnections) {
            expect(id).toContain("scene_out");
        }
    });

    test("motor-r385: the DC motor spins up and draws current", () => {
        const loaded = loadGraphHeadless("motor-r385.spikypanda", registry);
        const motor = findInstance(loaded, DcMotorDynamicNode);
        runTicks(loaded.session, 3000, 1e-4);
        expect(Number.isFinite(motor.armatureCurrent)).toBe(true);
        expect(Number.isFinite(motor.angularVelocity)).toBe(true);
        expect(Math.abs(motor.armatureCurrent)).toBeGreaterThan(1e-3);
        expect(motor.angularVelocity).toBeGreaterThan(1);
    });

    test("motorwatch-r385: monitoring chain runs alongside the motor", () => {
        const loaded = loadGraphHeadless("motorwatch-r385.spikypanda", registry);
        const motor = findInstance(loaded, DcMotorDynamicNode);
        runTicks(loaded.session, 3000, 1e-4);
        expect(Number.isFinite(motor.armatureCurrent)).toBe(true);
        expect(Math.abs(motor.armatureCurrent)).toBeGreaterThan(1e-3);
    });

    test("motorwatch-r385: the load is swappable from outside the motor block", () => {
        const loaded = loadGraphHeadless("motorwatch-r385.spikypanda", registry);
        const motor = findInstance(loaded, DcMotorDynamicNode);
        const load = findInstance(loaded, LoadTorqueNode);

        // Pin the shipped step profile to a light constant load and let
        // the motor settle.
        load.profile = "constant";
        load.baseTorque = 0.002;
        const t = runTicks(loaded.session, 4000, 1e-4);
        const omegaLight = motor.angularVelocity;

        // Swap the load law without touching anything else in the motor
        // block: same wire, heavier torque, the regime must change.
        load.baseTorque = 0.012;
        runTicks(loaded.session, 4000, 1e-4, t);
        const omegaHeavy = motor.angularVelocity;

        expect(Number.isFinite(omegaLight)).toBe(true);
        expect(Number.isFinite(omegaHeavy)).toBe(true);
        expect(omegaLight).toBeGreaterThan(1);
        // A heavier load must slow the motor measurably (> 5 percent).
        expect(omegaHeavy).toBeLessThan(omegaLight * 0.95);
    });

    test("motorwatch-r385: pushing the encoder turns the graph into a live open-set monitor", () => {
        const loaded = loadGraphHeadless("motorwatch-r385.spikypanda", registry);
        const load = findInstance(loaded, LoadTorqueNode);
        const model = findInstance(loaded, OnnxModelGraph);
        const cluster = findInstance(loaded, OnlineClusterNode);

        // The model node ships empty (the editor user drops the encoder
        // file); push it at runtime through the validated channel, the
        // same path the central station uses.
        const report = model.loadModelValidated(buildEncoderBytes(64), { name: "motorwatch-encoder-demo.onnx", expectInputShape: [1, 1, 64] });
        expect(report.ok).toBe(true);
        expect(report.inputNames).toEqual(["current_window"]);
        expect(report.outputNames).toEqual(["embedding"]);

        // Regime 1: light steady load. Cold start creates the first
        // profile once the gate settles and windows flow through
        // mux -> buffer -> transpose -> encoder -> clusterer.
        load.profile = "constant";
        load.baseTorque = 0.002;
        const t = runTicks(loaded.session, 9000, 1e-4);
        expect(cluster.k).toBeGreaterThanOrEqual(1);
        const kBefore = cluster.k;

        // Regime 2: heavier load through the SAME single loadTorque wire.
        // The open-set clusterer must discover a new regime.
        load.baseTorque = 0.012;
        runTicks(loaded.session, 9000, 1e-4, t);
        expect(cluster.k).toBeGreaterThan(kBefore);
    });

    test("motor-induction: spins up from the 3-phase supply, slip below 1", () => {
        const loaded = loadGraphHeadless("motor-induction.spikypanda", registry);
        const motor = findInstance(loaded, InductionMotorDynamicNode);
        runTicks(loaded.session, 5000, 2e-4);
        expect(Number.isFinite(motor.phaseCurrentA)).toBe(true);
        expect(Number.isFinite(motor.angularVelocity)).toBe(true);
        expect(motor.angularVelocity).toBeGreaterThan(1);
        expect(motor.slip).toBeLessThan(1);
    });

    test("motorwatch-induction: 3-phase monitoring chain runs", () => {
        const loaded = loadGraphHeadless("motorwatch-induction.spikypanda", registry);
        const motor = findInstance(loaded, InductionMotorDynamicNode);
        runTicks(loaded.session, 5000, 2e-4);
        expect(motor.angularVelocity).toBeGreaterThan(1);
    });
});
