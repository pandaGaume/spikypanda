/**
 * Physics.Mechanical.Load:gravity-payload validation (scene-aware).
 *
 * The payload is a world object: it reads the BOUND scene's gravity and
 * projects it through its own world (identity here) -> g_radial / g_angle,
 * then a crank mass m at arm r reacts as a 1x f_mech torque ripple
 *   tau = m * g_radial * r * sin((rotorAngle + phi0) - g_angle)
 * plus axial/radial bearing loads. With identity pose and Earth gravity
 * (0,0,-9.81): g_radial = 9.81, g_angle = -pi/2, ripple amplitude
 * m*9.81*r. It vanishes with no scene or in microgravity (g = 0).
 */
import { buildDefaultStateView, Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession, SceneStateView } from "spikypanda-core";
import { createGravityPayloadLoadNode, GravityPayloadLoadNode } from "../../dev/plugins/physics/src/mechanical/load/index";

function viewWithGravity(id: string, g: { x: number; y: number; z: number }): SceneStateView {
    const base = buildDefaultStateView(id);
    return new Proxy(base, {
        get(target, prop) {
            return prop === "gravity" ? g : Reflect.get(target, prop);
        },
    });
}

class FuncSource extends RuntimeNode {
    public constructor(private readonly _f: (t: number) => number) {
        super();
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, this._f(t));
        }
    }
}

/** Bind the scene, sweep rotorAngle over one turn, return node + tau series. */
function sweep(scene: SceneStateView | null, n: number): { node: GravityPayloadLoadNode; tau: number[] } {
    const node = createGravityPayloadLoadNode();
    const dTheta = (2 * Math.PI) / n;
    const sTh = new FuncSource((t) => t * dTheta);
    const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
    builder.withNodes(node, sTh).withChannel(sTh, node, "out", "rotorAngle");
    const session = new Session(builder.build());
    if (scene) session.sceneStateView = scene;
    node.reset(session);
    const tau: number[] = [];
    for (let i = 0; i <= n; i++) {
        session.run(i);
        tau.push(node.loadTorque);
    }
    return { node, tau };
}

const EARTH = { x: 0, y: 0, z: -9.81 };

describe("Gravity payload load (scene-aware)", () => {
    it("Earth: 1x torque ripple of amplitude m*g_radial*r, zero mean", () => {
        const { node, tau } = sweep(viewWithGravity("earth", EARTH), 360);
        const expectedAmp = node.payloadMass * 9.81 * node.armRadius;
        const peak = Math.max(...tau.map(Math.abs));
        const mean = tau.reduce((a, b) => a + b, 0) / tau.length;
        expect(peak).toBeCloseTo(expectedAmp, 6);
        expect(node.tau_ripple_amplitude).toBeCloseTo(expectedAmp, 9);
        expect(Math.abs(mean)).toBeLessThan(expectedAmp * 0.02);
    });

    it("microgravity (g = 0): no torque ripple", () => {
        const { node, tau } = sweep(viewWithGravity("orbital", { x: 0, y: 0, z: 0 }), 180);
        expect(Math.max(...tau.map(Math.abs))).toBeCloseTo(0, 12);
        expect(node.tau_ripple_amplitude).toBeCloseTo(0, 12);
    });

    it("no bound scene: inert (no gravity defined)", () => {
        const { tau } = sweep(null, 180);
        expect(Math.max(...tau.map(Math.abs))).toBeCloseTo(0, 12);
    });

    it("bearing loads track the gravity projection (identity pose)", () => {
        const { node } = sweep(viewWithGravity("earth", EARTH), 10);
        expect(node.radialForce).toBeCloseTo(node.payloadMass * 9.81, 6);
        expect(node.axialForce).toBeCloseTo(0, 6); // gravity is body-radial at identity
    });
});
