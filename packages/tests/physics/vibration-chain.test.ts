/**
 * Phase 5 vibration measurement chain — the vec3 -> per-axis-scalar adapter.
 *
 * `Cartesian3SplitNode` (spk.geometry:cartesian3-split) is the missing link that
 * turns the IMU's `measuredAcceleration` (one vec3) into three scalar streams
 * (accX / accY / accZ), each ready to feed a DSP buffer -> window -> FFT ->
 * spectrum chain. These tests pin the split + the IMU -> split integration.
 */
import { Cartesian3, FuncSource, RuntimeGraphBuilder, Session } from "spikypanda-core";
import { Cartesian3SplitNode } from "../../dev/plugins/geometry/src/nodes/cartesian3-split";
import { ImuNode } from "../../dev/plugins/physics/src/mechanical/vibration/imu.node";

describe("Phase 5 — vec3 split + IMU vibration chain", () => {
    it("splits a vec3 stream into x / y / z float components", () => {
        const split = new Cartesian3SplitNode();
        const src = new FuncSource(() => new Cartesian3(1.5, -2.5, 3.5));
        const builder = new RuntimeGraphBuilder().withMode("dynamic").withNodes(split, src);
        builder.withChannel(src, split, "out", "vec3");
        const session = new Session(builder.build());
        split.reset(session);
        src.reset(session);
        session.run(0);
        expect(split.x).toBeCloseTo(1.5, 9);
        expect(split.y).toBeCloseTo(-2.5, 9);
        expect(split.z).toBeCloseTo(3.5, 9);
    });

    it("the IMU's measuredAcceleration vec3 splits into per-axis scalars (ready for per-axis FFT)", () => {
        const imu = new ImuNode();
        imu.noiseStdDev = 0;
        imu.measuresGravity = false; // isolate the vibration term (no scene bound either)
        const split = new Cartesian3SplitNode();
        const src = new FuncSource(() => new Cartesian3(0, 0.05, -0.03)); // a Y/Z radial vibration
        const builder = new RuntimeGraphBuilder().withMode("dynamic").withNodes(src, imu, split);
        builder.withChannel(src, imu, "out", "acceleration");
        builder.withChannel(imu, split, "measuredAcceleration", "vec3");
        const session = new Session(builder.build());
        for (const n of [src, imu, split]) n.reset(session);
        session.run(0);
        expect(split.x).toBeCloseTo(0, 9);
        expect(split.y).toBeCloseTo(0.05, 9);
        expect(split.z).toBeCloseTo(-0.03, 9);
    });
});
