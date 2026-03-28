import { Cartesian2, Cartesian3, PointSpatialTree } from "spikypanda-core";

describe("PointSpatialTree", () => {

    describe("2D (quadtree)", () => {
        function makeTree() {
            return new PointSpatialTree<Cartesian2>(
                { dimension: 2, maxItemsPerNode: 4, maxDepth: 8 },
                [0, 0],
                [100, 100]
            );
        }

        test("add and size", () => {
            const tree = makeTree();
            expect(tree.size).toBe(0);

            tree.add(new Cartesian2(10, 10));
            tree.add(new Cartesian2(20, 20));
            tree.add(new Cartesian2(-30, -30));
            expect(tree.size).toBe(3);
        });

        test("remove by reference", () => {
            const tree = makeTree();
            const p = new Cartesian2(5, 5);
            tree.add(p);
            expect(tree.size).toBe(1);

            expect(tree.remove(p)).toBe(true);
            expect(tree.size).toBe(0);

            expect(tree.remove(p)).toBe(false);
        });

        test("remove does not match different object at same position", () => {
            const tree = makeTree();
            tree.add(new Cartesian2(5, 5));
            expect(tree.remove(new Cartesian2(5, 5))).toBe(false);
            expect(tree.size).toBe(1);
        });

        test("queryRadius finds nearby points", () => {
            const tree = makeTree();
            const close1 = new Cartesian2(1, 0);
            const close2 = new Cartesian2(0, 1);
            const far = new Cartesian2(50, 50);
            tree.add(close1);
            tree.add(close2);
            tree.add(far);

            const ref: Cartesian2[] = [];
            tree.queryRadius(new Cartesian2(0, 0), 2, ref);
            expect(ref).toContain(close1);
            expect(ref).toContain(close2);
            expect(ref).not.toContain(far);
        });

        test("queryRadius with zero radius returns only exact matches", () => {
            const tree = makeTree();
            const origin = new Cartesian2(0, 0);
            const other = new Cartesian2(0.001, 0);
            tree.add(origin);
            tree.add(other);

            const ref: Cartesian2[] = [];
            tree.queryRadius(new Cartesian2(0, 0), 0, ref);
            expect(ref).toContain(origin);
            expect(ref).not.toContain(other);
        });

        test("queryRadius on empty tree returns nothing", () => {
            const tree = makeTree();
            const ref: Cartesian2[] = [];
            tree.queryRadius(new Cartesian2(0, 0), 100, ref);
            expect(ref.length).toBe(0);
        });

        test("kNearest returns correct number of closest points", () => {
            const tree = makeTree();
            const p1 = new Cartesian2(1, 0);
            const p2 = new Cartesian2(2, 0);
            const p3 = new Cartesian2(3, 0);
            const p4 = new Cartesian2(50, 50);
            tree.add(p1);
            tree.add(p2);
            tree.add(p3);
            tree.add(p4);

            const ref: Cartesian2[] = [];
            tree.kNearest(new Cartesian2(0, 0), 2, ref);
            expect(ref.length).toBe(2);
            expect(ref[0]).toBe(p1);
            expect(ref[1]).toBe(p2);
        });

        test("kNearest with k > size returns all points sorted", () => {
            const tree = makeTree();
            tree.add(new Cartesian2(10, 0));
            tree.add(new Cartesian2(1, 0));

            const ref: Cartesian2[] = [];
            tree.kNearest(new Cartesian2(0, 0), 100, ref);
            expect(ref.length).toBe(2);
            expect(ref[0].x).toBe(1);
            expect(ref[1].x).toBe(10);
        });

        test("clear resets the tree", () => {
            const tree = makeTree();
            tree.add(new Cartesian2(1, 1));
            tree.add(new Cartesian2(2, 2));
            tree.clear();
            expect(tree.size).toBe(0);

            const ref: Cartesian2[] = [];
            tree.queryRadius(new Cartesian2(0, 0), 1000, ref);
            expect(ref.length).toBe(0);
        });

        test("subdivision triggers when exceeding maxItemsPerNode", () => {
            const tree = makeTree();
            for (let i = 0; i < 10; i++) {
                tree.add(new Cartesian2(i * 10 - 50, i * 10 - 50));
            }
            expect(tree.size).toBe(10);

            const ref: Cartesian2[] = [];
            tree.queryRadius(new Cartesian2(0, 0), 200, ref);
            expect(ref.length).toBe(10);
        });

        test("handles many points with correct queryRadius results", () => {
            const tree = new PointSpatialTree<Cartesian2>(
                { dimension: 2, maxItemsPerNode: 16, maxDepth: 12 },
                [500, 500],
                [500, 500]
            );
            const points: Cartesian2[] = [];
            for (let i = 0; i < 10000; i++) {
                const p = new Cartesian2(Math.random() * 1000, Math.random() * 1000);
                points.push(p);
                tree.add(p);
            }

            const center = new Cartesian2(500, 500);
            const radius = 50;
            const ref: Cartesian2[] = [];
            tree.queryRadius(center, radius, ref);

            const brute = points.filter(p => center.distance(p) <= radius);
            expect(ref.length).toBe(brute.length);
            for (const p of brute) {
                expect(ref).toContain(p);
            }
        });
    });

    describe("3D (octree)", () => {
        function makeTree() {
            return new PointSpatialTree<Cartesian3>(
                { dimension: 3, maxItemsPerNode: 4, maxDepth: 8 },
                [0, 0, 0],
                [100, 100, 100]
            );
        }

        test("add, queryRadius, kNearest in 3D", () => {
            const tree = makeTree();
            const near = new Cartesian3(1, 1, 1);
            const mid = new Cartesian3(10, 10, 10);
            const far = new Cartesian3(80, 80, 80);
            tree.add(near);
            tree.add(mid);
            tree.add(far);

            const ref: Cartesian3[] = [];
            tree.queryRadius(new Cartesian3(0, 0, 0), 5, ref);
            expect(ref).toContain(near);
            expect(ref).not.toContain(mid);
            expect(ref).not.toContain(far);

            const kRef: Cartesian3[] = [];
            tree.kNearest(new Cartesian3(0, 0, 0), 2, kRef);
            expect(kRef.length).toBe(2);
            expect(kRef[0]).toBe(near);
            expect(kRef[1]).toBe(mid);
        });

        test("subdivision in 3D creates 8 children", () => {
            const tree = makeTree();
            for (let i = 0; i < 10; i++) {
                tree.add(new Cartesian3(i * 20 - 90, i * 20 - 90, i * 20 - 90));
            }
            expect(tree.size).toBe(10);

            const ref: Cartesian3[] = [];
            tree.queryRadius(new Cartesian3(0, 0, 0), 300, ref);
            expect(ref.length).toBe(10);
        });

        test("3D many points correctness", () => {
            const tree = new PointSpatialTree<Cartesian3>(
                { dimension: 3, maxItemsPerNode: 16, maxDepth: 10 },
                [50, 50, 50],
                [50, 50, 50]
            );
            const points: Cartesian3[] = [];
            for (let i = 0; i < 5000; i++) {
                const p = new Cartesian3(Math.random() * 100, Math.random() * 100, Math.random() * 100);
                points.push(p);
                tree.add(p);
            }

            const center = new Cartesian3(50, 50, 50);
            const radius = 20;
            const ref: Cartesian3[] = [];
            tree.queryRadius(center, radius, ref);

            const brute = points.filter(p => center.distance(p) <= radius);
            expect(ref.length).toBe(brute.length);
        });
    });

    describe("distanceSquared", () => {
        test("Cartesian2.distanceSquared", () => {
            const a = new Cartesian2(0, 0);
            const b = new Cartesian2(3, 4);
            expect(a.distanceSquared(b)).toBe(25);
            expect(a.distance(b)).toBeCloseTo(5);
        });

        test("Cartesian3.distanceSquared", () => {
            const a = new Cartesian3(0, 0, 0);
            const b = new Cartesian3(1, 2, 2);
            expect(a.distanceSquared(b)).toBe(9);
            expect(a.distance(b)).toBeCloseTo(3);
        });
    });
});
