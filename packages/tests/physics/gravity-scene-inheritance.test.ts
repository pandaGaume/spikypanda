/**
 * End-to-end: scene gravity flows into a node nested inside a Sim.Graph.
 *
 * This is the user-facing payoff of the fractal scene binding: a
 * GravityVector wrapped in a SimGraphNode reads the gravity set on the
 * PARENT session (Earth vs Orbital), with no explicit wiring: the
 * sub-graph inherits its enclosing scene live. The same swap that a
 * user makes on the root Scene (Earth -> Orbital) therefore reaches
 * every world object inside every nested sub-graph.
 *
 * GravityVector with an identity transform projects g_body = g_world,
 * so g_radial = sqrt(g_y^2 + g_z^2): 9.81 on Earth (g = (0,0,-9.81)),
 * 0 in microgravity (g = 0).
 */
import { buildDefaultStateView, RuntimeGraph, Session, SimGraphNode, type SceneStateView } from "spikypanda-core";
import { createGravityVectorNode } from "../../dev/plugins/physics/src/environment/gravity/index";

function viewWithGravity(id: string, g: { x: number; y: number; z: number }): SceneStateView {
    const base = buildDefaultStateView(id);
    return new Proxy(base, {
        get(target, prop) {
            if (prop === "gravity") return g;
            return Reflect.get(target, prop);
        },
    });
}

/** Wrap a GravityVector in a Sim.Graph, embed it in a parent graph, run
 *  it under the given parent scene view, and return the node's g_radial. */
function gRadialUnderScene(scene: SceneStateView | null): number {
    const gv = createGravityVectorNode();
    const sim = new SimGraphNode([gv], [], "dynamic");
    const parent = new Session(new RuntimeGraph([sim]));
    if (scene) parent.sceneStateView = scene;
    parent.run(0);
    return gv.g_radial;
}

describe("Scene gravity inheritance through a Sim.Graph", () => {
    it("a GravityVector inside a sub-graph reads the parent scene's Earth gravity", () => {
        const g = gRadialUnderScene(viewWithGravity("earth", { x: 0, y: 0, z: -9.81 }));
        expect(g).toBeCloseTo(9.81, 6);
    });

    it("the same sub-graph reads ~0 under microgravity (Orbital), no rewiring", () => {
        const g = gRadialUnderScene(viewWithGravity("orbital", { x: 0, y: 0, z: 0 }));
        expect(g).toBeCloseTo(0, 9);
    });

    it("degrades to the Earth-surface default when the parent binds no scene", () => {
        // No parent view: the inherited view falls back to DEFAULT_GRAVITY.
        const g = gRadialUnderScene(null);
        expect(g).toBeCloseTo(9.81, 6);
    });
});
