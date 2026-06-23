/**
 * Scene matrix44 transform ports (Phase 5 follow-up). The Scene node now exposes
 * `local` / `parentWorld` matrix44 inputs like a TransformNode-derived node: a
 * wired geometry Transform `matrix` places/orients the scene. Unwired, it keeps
 * the existing composed-from-editables / GraphNode-chain behavior (contained
 * risk: the override only kicks in when a provider is bound).
 */
import { Cartesian3, Matrix4, Quaternion } from "spikypanda-core";
import { createSceneItem } from "../../dev/plugins/physics/src/scene/index";

describe("Scene matrix44 transform ports (local / parentWorld)", () => {
    it("a wired `local` matrix44 overrides the composed T·R·S pose", () => {
        const scene = createSceneItem();
        const wired = Matrix4.Compose(new Cartesian3(1, 1, 1), Quaternion.fromYawPitchRoll(0.3, 0.2, 0.1), new Cartesian3(7, 8, 9));
        scene.bindPropertyProvider("localMatrix", () => wired.toArrayRef([]));
        expect(scene.localTransform().equals(wired)).toBe(true);
    });

    it("unwired, localTransform still composes from the editables", () => {
        const scene = createSceneItem();
        scene.localPosition = new Cartesian3(3, 4, 5);
        const lt = scene.localTransform();
        // column-major translation lives at indices 12,13,14.
        expect(lt.m[12]).toBeCloseTo(3, 12);
        expect(lt.m[13]).toBeCloseTo(4, 12);
        expect(lt.m[14]).toBeCloseTo(5, 12);
    });

    it("a wired `parentWorld` matrix44 sets the parent frame: world = parentWorld × local", () => {
        const scene = createSceneItem();
        scene.localPosition = new Cartesian3(1, 0, 0); // local translation (1,0,0)
        // A pure-translation parent frame (10,20,30): world = parentWorld × local
        // so the world translation is the parent's plus the local's = (11,20,30).
        const parentFlat = Matrix4.Compose(new Cartesian3(1, 1, 1), new Quaternion(0, 0, 0, 1), new Cartesian3(10, 20, 30)).toArrayRef([]);
        scene.bindPropertyProvider("parentWorldMatrix", () => parentFlat);
        const world = scene.worldTransform();
        expect(world.m[12]).toBeCloseTo(11, 12);
        expect(world.m[13]).toBeCloseTo(20, 12);
        expect(world.m[14]).toBeCloseTo(30, 12);
    });

    it("unwired, a root scene's world equals its local (GraphNode chain)", () => {
        const scene = createSceneItem();
        scene.localPosition = new Cartesian3(2, 3, 4);
        expect(scene.worldTransform().equals(scene.localTransform())).toBe(true);
    });

    it("the wired indicators reflect the matrix ports", () => {
        const scene = createSceneItem();
        expect(scene.is_local_matrix_wired).toBe(false);
        scene.bindPropertyProvider("localMatrix", () => new Matrix4().toArrayRef([]));
        expect(scene.is_local_matrix_wired).toBe(true);
    });
});
