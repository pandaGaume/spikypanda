/**
 * 3-axis IMU node (Physics.Mechanical.Vibration:imu).
 *
 * The IMU is a TransformNode (IHasTransform): it reads a true acceleration as a
 * vec3 and outputs the SPECIFIC FORCE a real accelerometer measures —
 * `measured = a_body − g_body` — with the scene gravity projected into its OWN
 * body frame (so at rest it reads +1g "up"). These tests pin that contract and
 * the Housing -> IMU vec3 vibration chain.
 */
import type { SceneStateView } from "spikypanda-core";
import { buildDefaultStateView, Cartesian3, FuncSource, RuntimeGraphBuilder, Session } from "spikypanda-core";
import { ImuNode } from "../../dev/plugins/physics/src/mechanical/vibration/imu.node";
import { HousingMechanicsNode } from "../../dev/plugins/physics/src/mechanical/housing/housing-mechanics.node";

function viewWithGravity(id: string, g: { x: number; y: number; z: number }): SceneStateView {
    const base = buildDefaultStateView(id);
    return new Proxy(base, { get: (t, p) => (p === "gravity" ? g : Reflect.get(t, p)) });
}
const EARTH = { x: 0, y: 0, z: -9.81 };

/** Build: FuncSource(accel vec3) -> imu.acceleration, with a bound scene. */
function imuUnder(accel: Cartesian3, scene: SceneStateView | null, measuresGravity = true): ImuNode {
    const imu = new ImuNode();
    imu.noiseStdDev = 0; // deterministic
    imu.measuresGravity = measuresGravity;
    const src = new FuncSource(() => accel);
    const builder = new RuntimeGraphBuilder().withMode("dynamic").withNodes(imu, src);
    builder.withChannel(src, imu, "out", "acceleration");
    const session = new Session(builder.build());
    if (scene) session.sceneStateView = scene;
    imu.reset(session);
    src.reset(session);
    session.run(0);
    return imu;
}

describe("IMU (3-axis specific-force sensor)", () => {
    it("at rest under Earth gravity, reads +1g 'up' on the gravity axis", () => {
        const imu = imuUnder(new Cartesian3(0, 0, 0), viewWithGravity("earth", EARTH));
        // measured = 0 − g_body = -(0,0,-9.81) = (0,0,+9.81)
        expect(imu.measuredAccelerationX).toBeCloseTo(0, 9);
        expect(imu.measuredAccelerationY).toBeCloseTo(0, 9);
        expect(imu.measuredAccelerationZ).toBeCloseTo(9.81, 9);
    });

    it("adds the vibration acceleration on top of the gravity reaction", () => {
        const imu = imuUnder(new Cartesian3(1, 2, 3), viewWithGravity("earth", EARTH));
        // measured = (1,2,3) − (0,0,-9.81) = (1, 2, 12.81)
        expect(imu.measuredAccelerationX).toBeCloseTo(1, 9);
        expect(imu.measuredAccelerationY).toBeCloseTo(2, 9);
        expect(imu.measuredAccelerationZ).toBeCloseTo(12.81, 9);
    });

    it("is gravity-free with no scene bound (measures only the vibration)", () => {
        const imu = imuUnder(new Cartesian3(1, 2, 3), null);
        expect(imu.measuredAccelerationX).toBeCloseTo(1, 9);
        expect(imu.measuredAccelerationY).toBeCloseTo(2, 9);
        expect(imu.measuredAccelerationZ).toBeCloseTo(3, 9);
    });

    it("measuresGravity=false drops the gravity reaction (pure vibration under Earth)", () => {
        const imu = imuUnder(new Cartesian3(1, 2, 3), viewWithGravity("earth", EARTH), false);
        expect(imu.measuredAccelerationZ).toBeCloseTo(3, 9);
    });

    it("Housing.acceleration (vec3) feeds the IMU: the force -> accel -> IMU chain", () => {
        const housing = new HousingMechanicsNode();
        const imu = new ImuNode();
        imu.noiseStdDev = 0;
        imu.measuresGravity = false; // isolate the vibration term
        // Drive a constant radial force on the housing's Y axis.
        const force = new FuncSource(() => 1.0);
        const builder = new RuntimeGraphBuilder().withMode("dynamic").withNodes(housing, imu, force);
        builder.withChannel(force, housing, "out", "forceY");
        builder.withChannel(housing, imu, "acceleration", "acceleration");
        const session = new Session(builder.build());
        housing.reset(session);
        imu.reset(session);
        force.reset(session);
        // A few ticks for the housing's 2nd-order response to develop.
        for (let i = 0; i < 200; i++) session.run(i * 1e-4);
        // The IMU's vec3 measurement tracks the housing's Y acceleration.
        expect(Math.abs(imu.measuredAccelerationY)).toBeGreaterThan(0);
        expect(imu.measuredAccelerationY).toBeCloseTo(housing.accelerationY, 9);
    });
});
