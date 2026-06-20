/**
 * TransformNode parent-frame inheritance (single-truth transform).
 *
 * A world object's world pose is `parent.worldTransform() × local`, the one
 * geometry chain. The enclosing scene is wired as the node's structural
 * `parent` at session bind (the node is `ILiveInScene`); there is no separate
 * scene-view transform and no `_sceneWorld` snapshot. A session with no parent
 * (or an identity-posed parent) yields an identity parent frame.
 *
 * world matrices are column-major flat[16]; the translation lives in
 * m[12..14]. Here a bare posed `GraphNode` stands in for the scene parent
 * (any IHasTransform works as a structural parent).
 */
import { Cartesian3, GraphNode, RuntimeGraph, Session, TransformNode, type IHasTransform } from "spikypanda-core";

/** A bare posed node standing in for a scene (any IHasTransform is a valid
 *  structural parent). */
function posedParent(x: number, y: number, z: number): IHasTransform {
    const gn = new GraphNode();
    gn.position = new Cartesian3(x, y, z);
    return gn;
}

function worldOfParented(parent: IHasTransform | null): ReadonlyArray<number> {
    const tn = new TransformNode();
    if (parent) tn.parent = parent;
    const session = new Session(new RuntimeGraph([tn]));
    session.run(0);
    return tn.world;
}

describe("TransformNode world chains via its structural parent (single truth)", () => {
    it("identity parent when no parent is set (historical default)", () => {
        const w = worldOfParented(null);
        expect(w[12]).toBeCloseTo(0, 9);
        expect(w[13]).toBeCloseTo(0, 9);
        expect(w[14]).toBeCloseTo(0, 9);
    });

    it("inherits the parent's world translation via parent.worldTransform()", () => {
        const w = worldOfParented(posedParent(5, -2, 3));
        expect(w[12]).toBeCloseTo(5, 6);
        expect(w[13]).toBeCloseTo(-2, 6);
        expect(w[14]).toBeCloseTo(3, 6);
    });

    it("chains a multi-level parent tree (grandparent -> parent -> child)", () => {
        const grandparent = posedParent(10, 0, 0);
        const parent = new GraphNode();
        parent.position = new Cartesian3(0, 4, 0);
        parent.parent = grandparent;

        const tn = new TransformNode();
        tn.parent = parent;
        const session = new Session(new RuntimeGraph([tn]));
        session.run(0);

        // world = grandparent (10,0,0) ∘ parent (0,4,0) ∘ local (identity).
        expect(tn.world[12]).toBeCloseTo(10, 6);
        expect(tn.world[13]).toBeCloseTo(4, 6);
        expect(tn.world[14]).toBeCloseTo(0, 6);
    });
});
