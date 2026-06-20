/**
 * GraphNode IHasTransform: cache + push invalidation.
 *
 * The node caches its local / world 4x4 directly (no separate composer) and
 * invalidates by nulling the matrix. There is no version counter: a pose /
 * parent change push-invalidates the cached world of this node AND of every
 * descendant via the `child` relation, so each recomposes on its next read.
 * This suite pins the cache identity, the push invalidation (parent -> child
 * and grandparent -> deep descendant), the borrowed read-only return, and the
 * explicit `invalidateTransform()` escape hatch for in-place pose mutation.
 */
import { Cartesian3, Child, GraphNode, IOlink, Quaternion } from "spikypanda-core";

/** Filter predicate: a structural `Child` relation link. */
const isChildLink = (l: IOlink): boolean => l instanceof Child;

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

    test("a parent pose change push-invalidates the child's cached world", () => {
        const parent = new GraphNode();
        const child = new GraphNode();
        child.parent = parent;
        parent.position = new Cartesian3(10, 0, 0);

        expect(tx(child.worldTransform())).toBeCloseTo(10, 12);
        // The parent moves -> the child's cached world is push-invalidated, so
        // the next read recomposes to the new value (no version poll).
        parent.position = new Cartesian3(20, 0, 0);
        expect(tx(child.worldTransform())).toBeCloseTo(20, 12);
    });

    test("a grandparent pose change push-invalidates a deep descendant", () => {
        const gp = new GraphNode();
        const p = new GraphNode();
        const c = new GraphNode();
        p.parent = gp;
        c.parent = p;
        gp.position = new Cartesian3(100, 0, 0);
        p.position = new Cartesian3(10, 0, 0);
        c.position = new Cartesian3(1, 0, 0);

        expect(tx(c.worldTransform())).toBeCloseTo(111, 12); // 100 + 10 + 1
        // Moving the grandparent invalidates the whole subtree down to c.
        gp.position = new Cartesian3(200, 0, 0);
        expect(tx(c.worldTransform())).toBeCloseTo(211, 12);
    });

    test("a root node's worldTransform returns its local instance (borrowed)", () => {
        const n = new GraphNode();
        n.position = new Cartesian3(2, 0, 0);
        expect(n.worldTransform()).toBe(n.localTransform());
    });

    test("child world = parentWorld x local; cached between reads, recomposed after the parent moves", () => {
        const parent = new GraphNode();
        parent.position = new Cartesian3(10, 0, 0);
        const child = new GraphNode();
        child.position = new Cartesian3(1, 0, 0);
        child.parent = parent;

        const w1 = child.worldTransform();
        expect(tx(w1)).toBeCloseTo(11, 12); // 10 + 1
        expect(child.worldTransform()).toBe(w1); // cached: same instance between reads, no recompose

        parent.position = new Cartesian3(20, 0, 0);
        expect(tx(child.worldTransform())).toBeCloseTo(21, 12); // 20 + 1, recomposed after the parent moved
    });

    test("re-parenting via `parent =` enforces a single parent (old relation dropped)", () => {
        const a = new GraphNode();
        a.position = new Cartesian3(10, 0, 0);
        const b = new GraphNode();
        b.position = new Cartesian3(20, 0, 0);
        const c = new GraphNode();
        c.position = new Cartesian3(1, 0, 0);

        c.parent = a;
        expect(c.parent).toBe(a);
        expect(a.children).toContain(c);
        expect(tx(c.worldTransform())).toBeCloseTo(11, 12);

        // Re-parent: the old (a -> c) Child relation must be dropped.
        c.parent = b;
        expect(c.parent).toBe(b);
        expect(b.children).toContain(c);
        expect(a.children).not.toContain(c); // single parent: a no longer parents c
        expect(c.opsc(isChildLink).length).toBe(1); // exactly one incoming Child link
        expect(tx(c.worldTransform())).toBeCloseTo(21, 12);
    });

    test("adding a second Child via add() replaces the parent (no double parent)", () => {
        const a = new GraphNode();
        const b = new GraphNode();
        const c = new GraphNode();

        new Child(a, c); // a -> c (wires via c.add())
        expect(c.parent).toBe(a);

        new Child(b, c); // b -> c ; add() must drop the a -> c relation first
        expect(c.parent).toBe(b);
        expect(a.children).not.toContain(c);
        expect(c.opsc(isChildLink).length).toBe(1); // single parent invariant holds
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

    test("scale participates in the local matrix (T·R·S)", () => {
        const n = new GraphNode();
        n.scale = new Cartesian3(2, 3, 4);
        const m = n.localTransform().m;
        // Per-axis scale rides the diagonal (identity rotation).
        expect(m[0]).toBeCloseTo(2, 12);
        expect(m[5]).toBeCloseTo(3, 12);
        expect(m[10]).toBeCloseTo(4, 12);
    });

    test("unset scale is identity; setting scale invalidates + recomposes", () => {
        const n = new GraphNode();
        // No scale set -> unit scale (identity diagonal).
        expect(n.localTransform().m[0]).toBeCloseTo(1, 12);
        n.scale = new Cartesian3(5, 5, 5);
        expect(n.localTransform().m[0]).toBeCloseTo(5, 12);
    });
});
