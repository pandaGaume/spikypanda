/**
 * PMSM machine: INTERNALISED gravity coupling (rotor sag + bearing preload).
 *
 * The machine is a world object that reads its bound scene's gravity and
 * computes its own sag -> flux modulation, with no rotor-sag node wired.
 * Validates against the legacy RotorSagModel / BearingPreloadModel analytic
 * and the microgravity vanishing:
 *
 *   sag delta = (rotorMass * g_radial / bearingRadialStiffness / airGap)
 *               * cos(theta_m - g_angle)
 *   F_radial_eff = nominalRadialPreload + rotorMass * g_radial
 *
 * Identity pose + Earth gravity (0,0,-9.81) -> g_body = (0,0,-9.81), so
 * g_radial = 9.81 and g_angle = atan2(-9.81, 0) = -pi/2. Aligning the
 * rotor at theta0 = -pi/2 makes cos(theta - g_angle) = 1, i.e. the sag
 * delta equals the bare fractional gap modulation epsilon.
 */
import { buildDefaultStateView, RuntimeGraphBuilder, Session, type SceneStateView } from "spikypanda-core";
import { createPmsmMachineDqNode } from "../../dev/plugins/physics/src/electric/motor-pmsm/index";

function viewWithGravity(id: string, g: { x: number; y: number; z: number }): SceneStateView {
    const base = buildDefaultStateView(id);
    return new Proxy(base, {
        get(target, prop) {
            return prop === "gravity" ? g : Reflect.get(target, prop);
        },
    });
}

function fireUnder(scene: SceneStateView | null, configure?: (n: ReturnType<typeof createPmsmMachineDqNode>) => void) {
    const node = createPmsmMachineDqNode();
    node.theta0 = -Math.PI / 2; // align with Earth g_angle so cos() = 1
    configure?.(node);
    const session = new Session(new RuntimeGraphBuilder().withMode("dynamic").withNodes(node).build());
    if (scene) session.sceneStateView = scene;
    node.reset(session);
    node.fire(session, 0);
    return node;
}

const EARTH = { x: 0, y: 0, z: -9.81 };
const ORBITAL = { x: 0, y: 0, z: 0 };

describe("PMSM intrinsic gravity coupling", () => {
    it("Earth: rotor-sag flux delta matches the analytic epsilon", () => {
        const n = fireUnder(viewWithGravity("earth", EARTH));
        const eps = (n.rotorMass * 9.81) / n.bearingRadialStiffness / n.airGap;
        expect(n.g_radial).toBeCloseTo(9.81, 6);
        expect(n.gravity_flux_delta).toBeCloseTo(eps, 9); // cos term = 1
    });

    it("Orbital (microgravity): the sag sideband vanishes", () => {
        const n = fireUnder(viewWithGravity("orbital", ORBITAL));
        expect(n.g_radial).toBeCloseTo(0, 12);
        expect(n.gravity_flux_delta).toBeCloseTo(0, 12);
    });

    it("gravityCoupling = false disables it even under Earth", () => {
        const n = fireUnder(viewWithGravity("earth", EARTH), (m) => (m.gravityCoupling = false));
        expect(n.gravity_flux_delta).toBeCloseTo(0, 12);
        expect(n.g_radial).toBeCloseTo(0, 12);
    });

    it("no bound scene: gravity-free (headless drive validation stays bit-exact)", () => {
        const n = fireUnder(null);
        expect(n.gravity_flux_delta).toBeCloseTo(0, 12);
    });

    it("a per-node bound scene overrides the session scene (Earth motor in an Orbital session)", () => {
        const node = createPmsmMachineDqNode();
        node.theta0 = -Math.PI / 2;
        const session = new Session(new RuntimeGraphBuilder().withMode("dynamic").withNodes(node).build());
        session.sceneStateView = viewWithGravity("session-orbital", ORBITAL); // session = microgravity
        node.setBoundSceneView(viewWithGravity("per-node-earth", EARTH)); // this motor lives on Earth
        node.reset(session);
        node.fire(session, 0);
        const eps = (node.rotorMass * 9.81) / node.bearingRadialStiffness / node.airGap;
        expect(node.gravity_flux_delta).toBeCloseTo(eps, 9);
        expect(node.g_radial).toBeCloseTo(9.81, 6);
    });

    it("bearing radial preload picks up the gravity load", () => {
        const n = fireUnder(viewWithGravity("earth", EARTH));
        // identity pose -> gravity is body-radial (along body Z), no axial.
        expect(n.F_radial_eff).toBeCloseTo(n.nominalRadialPreload + n.rotorMass * 9.81, 9);
        expect(n.F_axial_eff).toBeCloseTo(n.nominalAxialPreload, 9);
    });
});
