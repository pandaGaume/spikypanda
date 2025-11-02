import { describe, test, expect } from "@jest/globals";
import { Cartesian3, ICartesian3 } from "spikypanda-core";
import { MemberKind,NodeState, MemberState  } from "tensegrity";


const make = (x=0, y=0, z=0) => new Cartesian3(x, y, z);
const zero = () => make(0, 0, 0);

// One integration step that only touches .bag and ICartesian3 instance methods
function step(
  nodes: Array<{ bag: NodeState }>,
  members: Array<{ kind: MemberKind; bag: MemberState }>,
  opts: {
    gravity?: ICartesian3;
    linearDamping?: number;
    cableOnlyTension?: boolean;
    dt: number;
  }
) {
  const g = opts.gravity ?? make(0, 0, -9.81);
  const damping = opts.linearDamping ?? 0.0;
  const cableOnly = opts.cableOnlyTension ?? true;
  const dt = opts.dt;

  for (const n of nodes) {
    n.bag.force = zero();
    if (!n.bag.anchored) n.bag.force.addInPlace(g.clone().multiplyByScalar(n.bag.mass));
  }

  for (const m of members) {
    const ni = m.bag.start as unknown as { bag: NodeState };
    const nj = m.bag.end   as unknown as { bag: NodeState };

    const d = nj.bag.position.clone().subtract(ni.bag.position);
    const L = d.magnitude();
    if (L === 0) continue;

    const ext = L - m.bag.L0;
    if (m.kind === MemberKind.Tension && cableOnly && ext < 0) continue;

    const k = m.bag.k ?? 100;
    const dir = d.clone().divideByScalar(L);
    const F = dir.clone().multiplyByScalar(k * ext);

    if (!ni.bag.anchored) ni.bag.force.addInPlace(F);
    if (!nj.bag.anchored) nj.bag.force.addInPlace(F.clone().multiplyByScalar(-1));
  }

  for (const n of nodes) {
    if (n.bag.anchored) { n.bag.velocity = zero(); continue; }
    const a = n.bag.force.clone().divideByScalar(n.bag.mass);
    n.bag.velocity.addInPlace(a.multiplyByScalar(dt));
    n.bag.velocity.multiplyByScalar(1 - damping);
    n.bag.position.addInPlace(n.bag.velocity.clone().multiplyByScalar(dt));
  }
}

describe("Tensegrity simulation sanity checks with .bag", () => {
  test("Free fall: z ~= -0.5*g*t^2 when damping=0", () => {
    const dt = 0.01;
    const steps = 100;

    const n0 = {
      bag: {
        position: make(0, 0, 0),
        velocity: zero(),
        force: zero(),
        mass: 1,
        anchored: false
      } as NodeState
    };

    for (let s = 0; s < steps; s++) {
      step([n0], [], { gravity: make(0, 0, -9.81), linearDamping: 0, cableOnlyTension: true, dt });
    }

    const t = dt * steps;
    const expectedZ = -0.5 * 9.81 * t * t;
    const p = n0.bag.position as ICartesian3;
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(expectedZ, 3);
  });

  test("Cable in tension pulls nodes together", () => {
    const nA = { bag: { position: make(0, 0, 0), velocity: zero(), force: zero(), mass: 1, anchored: true } as NodeState };
    const nB = { bag: { position: make(1, 0, 0), velocity: zero(), force: zero(), mass: 1, anchored: false } as NodeState };

    const member = {
      kind: MemberKind.Tension,
      bag: {
        L0: 0.5,
        start: nA,    // direct references to nodes
        end: nB,
        k: 100
      } as unknown as MemberState
    };

    const d0 = nB.bag.position.distance(nA.bag.position);

    for (let i = 0; i < 50; i++) {
      step([nA, nB], [member], { gravity: zero(), linearDamping: 0.02, cableOnlyTension: true, dt: 0.01 });
    }

    const d1 = nB.bag.position.distance(nA.bag.position);
    expect(d1).toBeLessThan(d0);
    expect(d1).toBeGreaterThanOrEqual(member.bag.L0);
  });

  test("Cable-only-tension does not push under compression", () => {
    const nA = { bag: { position: make(0, 0, 0), velocity: zero(), force: zero(), mass: 1, anchored: true } as NodeState };
    const nB = { bag: { position: make(0.2, 0, 0), velocity: zero(), force: zero(), mass: 1, anchored: false } as NodeState };

    const member = {
      kind: MemberKind.Tension,
      bag: {
        L0: 0.5,   // compression at start
        start: nA,
        end: nB,
        k: 100
      } as unknown as MemberState
    };

    const before = nB.bag.position.distance(nA.bag.position);

    for (let i = 0; i < 50; i++) {
      step([nA, nB], [member], { gravity: zero(), linearDamping: 0.0, cableOnlyTension: true, dt: 0.01 });
    }

    const after = nB.bag.position.distance(nA.bag.position);
    expect(after).toBeCloseTo(before, 6);
  });
});
