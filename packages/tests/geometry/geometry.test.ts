// import your interfaces and classes
import { Cartesian2, Cartesian3, Cartesian4 } from "spikypanda-core"; 

describe("Cartesian2", () => {
  test("distance and basic ops", () => {
    const a = new Cartesian2(1, 2);
    const b = new Cartesian2(4, 6);

    expect(a.distance(b)).toBeCloseTo(5); // 3-4-5
    const s = a.subtract(b);
    expect(s.x).toBe(-3);
    expect(s.y).toBe(-4);

    const sum = a.add(b);
    expect(sum.x).toBe(5);
    expect(sum.y).toBe(8);

    const scaled = a.multiplyByScalar(3);
    expect(scaled.x).toBe(3);
    expect(scaled.y).toBe(6);

    const mag = new Cartesian2(3, 4).magnitude();
    expect(mag).toBeCloseTo(5);

    const clone = a.clone();
    expect(clone).not.toBe(a);
    expect(clone.x).toBe(1);
    expect(clone.y).toBe(2);
  });

  test("fluent this returns", () => {
    const a = new Cartesian2(1, 1);
    const r = a.add(new Cartesian2(1, 2)).subtract(new Cartesian2(1, 1));
    // r should still be a Cartesian2 and have correct values
    expect(r instanceof Cartesian2).toBe(true);
    expect(r.x).toBe(1);
    expect(r.y).toBe(2);
  });
});

describe("Cartesian3", () => {
  test("distance, magnitude and scalar ops", () => {
    const a = new Cartesian3(1, 2, 3);
    const b = new Cartesian3(4, 6, 3);
    expect(a.distance(b)).toBeCloseTo(5); // same z
    const s = a.subtract(b);
    expect(s.x).toBe(-3);
    expect(s.y).toBe(-4);
    expect(s.z).toBe(0);

    const m = new Cartesian3(2, -2, 1).multiplyByScalar(2);
    expect(m.x).toBe(4);
    expect(m.y).toBe(-4);
    expect(m.z).toBe(2);

    expect(new Cartesian3(2, 3, 6).magnitude()).toBeCloseTo(7);
  });

  test("clone keeps runtime type", () => {
    const a = new Cartesian3(7, 8, 9);
    const c = a.clone();
    expect(c instanceof Cartesian3).toBe(true);
    expect(c).not.toBe(a);
    expect(c.x).toBe(7);
    expect(c.y).toBe(8);
    expect(c.z).toBe(9);
  });
});

describe("Cartesian4 (homogeneous)", () => {
  // These tests assume the homogeneous-aware Cartesian4 from our last message:
  // - points have w = 1 (normalized on construction)
  // - vectors have w = 0
  // - rules: point+vector=point, vector+point=point, vector+vector=vector,
  //          point+point throws; point-point=vector; point-vector=point; vector-vector=vector; vector-point throws
  const P = (x: number, y: number, z: number) => new Cartesian4(x, y, z, 1);
  const V = (x: number, y: number, z: number) => new Cartesian4(x, y, z, 0);

  test("constructor normalizes points with w != 1", () => {
    const p = new Cartesian4(2, 4, 6, 2);
    expect(p.w).toBe(1);
    expect(p.x).toBe(1);
    expect(p.y).toBe(2);
    expect(p.z).toBe(3);
  });

  test("point + vector -> point", () => {
    const p = P(1, 2, 3);
    const v = V(1, -2, 0.5);
    const r = p.add(v);
    expect(r instanceof Cartesian4).toBe(true);
    expect((r as Cartesian4).w).toBe(1);
    expect(r.x).toBeCloseTo(2);
    expect(r.y).toBeCloseTo(0);
    expect(r.z).toBeCloseTo(3.5);
  });

  test("vector + point -> point", () => {
    const r = V(1, 1, 1).add(P(2, 3, 4));
    expect((r as Cartesian4).w).toBe(1);
    expect(r.x).toBe(3);
    expect(r.y).toBe(4);
    expect(r.z).toBe(5);
  });

  test("vector + vector -> vector", () => {
    const r = V(1, 2, 3).add(V(4, 5, 6));
    expect((r as Cartesian4).w).toBe(0);
    expect(r.x).toBe(5);
    expect(r.y).toBe(7);
    expect(r.z).toBe(9);
  });

  test("point + point throws", () => {
    expect(() => P(1, 2, 3).add(P(0, 0, 0))).toThrow();
  });

  test("point - point -> vector", () => {
    const r = P(4, 6, 8).subtract(P(1, 2, 3));
    expect((r as Cartesian4).w).toBe(0);
    expect(r.x).toBe(3);
    expect(r.y).toBe(4);
    expect(r.z).toBe(5);
  });

  test("point - vector -> point", () => {
    const r = P(1, 2, 3).subtract(V(1, 2, 3));
    expect((r as Cartesian4).w).toBe(1);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.z).toBe(0);
  });

  test("vector - vector -> vector", () => {
    const r = V(5, 5, 5).subtract(V(2, 3, 4));
    expect((r as Cartesian4).w).toBe(0);
    expect(r.x).toBe(3);
    expect(r.y).toBe(2);
    expect(r.z).toBe(1);
  });

  test("vector - point throws", () => {
    expect(() => V(1, 2, 3).subtract(P(1, 2, 3))).toThrow();
  });

  test("distance only between points", () => {
    const a = P(1, 2, 3);
    const b = new Cartesian4(2, 4, 3, 2); // will normalize to (1,2,1.5,1) on construct
    expect(a.distance(b)).toBeCloseTo(1.5); // from (1,2,3) to (1,2,1.5) is 1.5
    expect(() => a.distance(V(1, 0, 0))).toThrow();
  });

  test("magnitude only for vectors", () => {
    expect(V(3, 4, 0).magnitude()).toBeCloseTo(5);
    expect(() => P(0, 0, 0).magnitude()).toThrow();
  });

  test("clone preserves w and values", () => {
    const p = P(7, 8, 9);
    const c1 = p.clone();
    expect((c1 as Cartesian4).w).toBe(1);
    expect(c1.x).toBe(7);

    const v = V(1, 2, 3);
    const c2 = v.clone();
    expect((c2 as Cartesian4).w).toBe(0);
    expect(c2.z).toBe(3);
  });
});
