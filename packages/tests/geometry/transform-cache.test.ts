/**
 * GraphNode IHasTransform: cache + version + invalidation.
 *
 * The node caches its local / world 4x4 directly (no separate composer) and
 * invalidates by nulling the matrix. World-staleness is detected in O(1) via
 * a `transformVersion` counter (no per-call matrix value compare). This suite
 * pins the cache identity, the version propagation parent -> child, the buffer
 * reuse on a moving parent, the borrowed read-only return, and the explicit
 * `invalidateTransform()` escape hatch for in-place pose mutation.
 */
import { Cartesian3, GraphNode, Quaternion } from "spikypanda-core";

/** Translation X of a returned transform (column-major: m[12]). */
function tx(m: { m: ArrayLike<number> }): number {
    return m.m[12];
}

describe("GraphNode transform cache", () => {
    test("localTransform is cached (same instance) until a pose change", () => {
        const n = new GraphNode();
        n.position = new Cartesian3(1, 2, 3);
        const a = n.localTransform();
        expect(n.localTransform()).toBe(a); // repeated read = same cached instance
        expect(tx(a)).toBeCloseTo(1, 12);

        n.position = new Cartesian3(5, 0, 0);
        expect(tx(n.localTransform())).toBeCloseTo(5, 12); // recomposed after the change
    });

    test("the setter short-circuits on an identical reference (no invalidation)", () => {
        const n = new GraphNode();
        const p = new Cartesian3(1, 1, 1);
        n.position = p;
        const a = n.localTransform();
        n.position = p; // same ref -> no-op
        expect(n.localTransform()).toBe(a);
    });

    test("transformVersion advances on a pose change, stable otherwise", () => {
        const n = new GraphNode();
        const v0 = n.transformVersion;
        expect(n.transformVersion).toBe(v0); // stable read
        n.position = new Cartesian3(1, 0, 0);
        expect(n.transformVersion).toBeGreaterThan(v0);
    });

    test("a root node's worldTransform returns its local instance (borrowed)", () => {
        const n = new GraphNode();
        n.position = new Cartesian3(2, 0, 0);
        expect(n.worldTransform()).toBe(n.localTransform());
    });

    test("child world = parentWorld x local; buffer reused; recomposes only when the parent moves", () => {
        const parent = new GraphNode();
        parent.position = new Cartesian3(10, 0, 0);
        const child = new GraphNode();
        child.position = new Cartesian3(1, 0, 0);
        child.parent = parent;

        const w1 = child.worldTransform();
        expect(tx(w1)).toBeCloseTo(11, 12); // 10 + 1
        expect(child.worldTransform()).toBe(w1); // cached, no recompose

        parent.position = new Cartesian3(20, 0, 0);
        const w3 = child.worldTransform();
        expect(w3).toBe(w1); // SAME buffer reused (no realloc on a moving parent)
        expect(tx(w3)).toBeCloseTo(21, 12); // 20 + 1, recomposed in place
    });

    test("invalidateTransform picks up an in-place pose mutation the setter cannot see", () => {
        const n = new GraphNode();
        const p = new Cartesian3(1, 0, 0);
        n.position = p;
        expect(tx(n.localTransform())).toBeCloseTo(1, 12);

        p.x = 7; // mutated in place -> the setter never ran
        expect(tx(n.localTransform())).toBeCloseTo(1, 12); // still the stale cached value

        n.invalidateTransform();
        expect(tx(n.localTransform())).toBeCloseTo(7, 12); // now recomposed
    });

    test("orientation participates in the local matrix", () => {
        const n = new GraphNode();
        // 90 deg about Z: the X axis (column 0) rotates onto +Y.
        n.orientation = new Quaternion(0, 0, Math.SQRT1_2, Math.SQRT1_2);
        const m = n.localTransform().m;
        expect(m[0]).toBeCloseTo(0, 6);
        expect(m[1]).toBeCloseTo(1, 6);
    });
});
