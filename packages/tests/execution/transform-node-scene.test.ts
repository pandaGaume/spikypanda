/**
 * TransformNode parent-frame inheritance.
 *
 * When the `parent_world` port is unwired, a TransformNode inherits the
 * enclosing scene's worldTransform as its parent frame (the unifying
 * "the scene is the default parent of every world object" rule), rather
 * than the bare identity. Backward compatible: a session with no scene
 * (or a scene with an identity pose) yields an identity parent.
 *
 * world matrices are column-major flat[16]; the translation lives in
 * m[12..14].
 */
import { buildDefaultStateView, Cartesian3, makeTransform, Quaternion, RuntimeGraph, Session, TransformNode, type SceneStateView } from "spikypanda-core";

function viewTranslatedBy(id: string, x: number, y: number, z: number): SceneStateView {
    const base = buildDefaultStateView(id);
    return new Proxy(base, {
        get(target, prop) {
            if (prop === "worldTransform") return makeTransform(new Cartesian3(x, y, z), new Quaternion(0, 0, 0, 1), new Cartesian3(1, 1, 1));
            return Reflect.get(target, prop);
        },
    });
}

function worldOf(scene: SceneStateView | null): ReadonlyArray<number> {
    const tn = new TransformNode();
    const session = new Session(new RuntimeGraph([tn]));
    if (scene) session.sceneStateView = scene;
    session.run(0);
    return tn.world;
}

describe("TransformNode inherits the scene world as parent_world", () => {
    it("identity parent when no scene is bound (historical default)", () => {
        const w = worldOf(null);
        expect(w[12]).toBeCloseTo(0, 9);
        expect(w[13]).toBeCloseTo(0, 9);
        expect(w[14]).toBeCloseTo(0, 9);
    });

    it("inherits the scene's world translation when parent_world is unwired", () => {
        const w = worldOf(viewTranslatedBy("posed", 5, -2, 3));
        expect(w[12]).toBeCloseTo(5, 6);
        expect(w[13]).toBeCloseTo(-2, 6);
        expect(w[14]).toBeCloseTo(3, 6);
    });

    it("a per-node bound scene overrides the session scene", () => {
        const tn = new TransformNode();
        const session = new Session(new RuntimeGraph([tn]));
        session.sceneStateView = viewTranslatedBy("session", 1, 1, 1);
        tn.setBoundSceneView(viewTranslatedBy("per-node", 9, 0, 0));
        session.run(0);
        // world = (per-node scene world) x identity -> translation (9,0,0).
        expect(tn.world[12]).toBeCloseTo(9, 6);
        expect(tn.world[13]).toBeCloseTo(0, 6);
    });

    it("clearing the per-node binding falls back to the session scene", () => {
        const tn = new TransformNode();
        const session = new Session(new RuntimeGraph([tn]));
        session.sceneStateView = viewTranslatedBy("session", 1, 1, 1);
        tn.setBoundSceneView(viewTranslatedBy("per-node", 9, 0, 0));
        tn.setBoundSceneView(null);
        session.run(0);
        expect(tn.world[12]).toBeCloseTo(1, 6);
    });
});
