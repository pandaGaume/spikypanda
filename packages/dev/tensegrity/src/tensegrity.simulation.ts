// simulator.engine.ts
import { ICartesian3, Cartesian3, ICartesian, IGraph } from "spikypanda-core";
import { IConnectionPoint, Member, MemberKind } from "./tensegrity.interfaces";
import { Gravity, stiffness } from "./tensegrity.physics";


export interface NodeState {
  position: ICartesian;   // working position
  velocity: ICartesian3;  // working velocity
  mass: number;           // kg
  anchored?: boolean;     // true = fixed support
  force: ICartesian3;     // per-step accumulator
}

export interface MemberState {
  L0: number;                  // rest length
  start: IConnectionPoint;     // cached oini
  end: IConnectionPoint;       // cached ofin
  k?: number;
}


export interface EngineOptions {
  defaultMass?: number;
  gravity?: Cartesian3;        // default (0,0,-9.81)
  linearDamping?: number;      // small per-step coefficient, default 0.02
  cableOnlyTension?: boolean;  // default true
}

export class SimulatorEngine {
  private graph: IGraph<IConnectionPoint, Member>;
  private defaultMass: number;
  private gravity: Cartesian3;
  private linearDamping: number;
  private cableOnlyTension: boolean;

  public constructor(graph: IGraph<IConnectionPoint, Member>, opts: EngineOptions = {}) {
    this.graph = graph;
    this.defaultMass = opts.defaultMass ?? 1.0;
    this.gravity = opts.gravity ?? Gravity;
    this.linearDamping = opts.linearDamping ?? 0.02;
    this.cableOnlyTension = opts.cableOnlyTension ?? true;

    this.initialize(); // prepare bags and L0
  }

  /** One dynamics step (semi-implicit Euler). */
  public step(dt: number): void {
    // Ensure state (safe if already created)
    for (const n of this.graph.nodes) this._ensureNodeState(n);
    for (const l of this.graph.links) this._ensureMemberState(l);

    // Clear force accumulators
    for (const n of this.graph.nodes) {
      const s = n.bag as NodeState;
      s.force = Cartesian3.Zero();
    }

    // Member forces
    for (const l of this.graph.links) {
      const ms = l.bag as MemberState | undefined;
      if (!ms) continue;

      const ns = (ms.start.bag as NodeState);
      const ne = (ms.end.bag as NodeState);

      const { L, u } = this._lengthAndDir(ns.position, ne.position);
      if (L <= 0) continue;

      // Axial extension relative to rest length
      const e = L - ms.L0;

      // Tension-only for cables
      if (this.cableOnlyTension && l.kind === MemberKind.Tension && e <= 0) {
        continue;
      }

      // Stiffness from your physics (handles slack/buckling)
      const k = stiffness(l, ms.start as any, ms.end as any);
      if (!isFinite(k) || k <= 0) continue;

      const N = k * e; // axial force magnitude (sign follows e)

      // Equal and opposite endpoint forces
      const Fi = u.multiplyByScalar(+N);
      const Fj = u.multiplyByScalar(-N);

      ns.force.addInPlace(Fi);
      ne.force.addInPlace(Fj);
    }

    // Add gravity and damping; integrate v and x
    for (const n of this.graph.nodes) {
      const s = n.bag as NodeState;

      if (s.mass > 0) s.force.addInPlace(this.gravity.multiplyByScalar(s.mass));

      const c = (s.mass || 1) * this.linearDamping;
      if (c > 0) s.force.addInPlace(s.velocity.multiplyByScalar(-c));

      if (s.anchored) {
        s.velocity = Cartesian3.Zero();
        continue;
      }

      const invm = s.mass > 0 ? 1 / s.mass : 0;
      const a = s.force.multiplyByScalar(invm);
      s.velocity.addInPlace(a.multiplyByScalar(dt));

      // If your ICartesian lacks addInPlace, swap to immutable add:
      // s.position = s.position.add(s.velocity.multiplyByScalar(dt));
      s.position.addInPlace(s.velocity.multiplyByScalar(dt));
    }
  }

  /** Reinitialize bags and set L0 from current geometry. Call if you move the graph manually. */
  public initialize(): void {
    for (const n of this.graph.nodes) this._ensureNodeState(n, true);
    for (const l of this.graph.links) this._ensureMemberState(l, true);
  }

  /** Reset dynamic state (zero velocities and forces), keep positions as-is. */
  public resetDynamics(): void {
    for (const n of this.graph.nodes) {
      const s = this._ensureNodeState(n);
      s.velocity = Cartesian3.Zero();
      s.force = Cartesian3.Zero();
    }
  }

  /** Set rest lengths to current geometric lengths (useful after editing geometry). */
  public setRestLengthsFromGeometry(): void {
    for (const l of this.graph.links) {
      const ms = this._ensureMemberState(l);
      if (!ms) {
        continue;
      }
      const ns = this._ensureNodeState(ms.start);
      const ne = this._ensureNodeState(ms.end);
      const { L } = this._lengthAndDir(ns.position, ne.position);
      ms.L0 = L;
    }
  }

  /**
   * Apply a uniform pretension/relaxation factor to rest lengths.
   * factor < 1.0 shrinks L0 (pretension in cables), > 1.0 expands.
   */
  public scaleRestLengths(factor: number): void {
    for (const l of this.graph.links) {
      const ms = this._ensureMemberState(l);
      if (!ms) {
        continue;
      }
      ms.L0 *= factor;
    }
  }

  public setRestLength(l: Member, L0: number): void {
    const ms = this._ensureMemberState(l);
    if (ms) ms.L0 = L0;
  }

  public setNodeMass(n: IConnectionPoint, mass: number): void {
    const s = this._ensureNodeState(n);
    s.mass = mass;
  }

  public setNodeAnchored(n: IConnectionPoint, anchored: boolean): void {
    const s = this._ensureNodeState(n);
    s.anchored = anchored;
    if (anchored) s.velocity = Cartesian3.Zero();
  }


  /** Tune runtime parameters on the fly. */
  public setGravity(g: Cartesian3): void { this.gravity = g; }
  public setLinearDamping(d: number): void { this.linearDamping = d; }
  public setCableOnlyTension(enabled: boolean): void { this.cableOnlyTension = enabled; }

  /** Read helpers */
  public getNodeState(n: IConnectionPoint): NodeState { return this._ensureNodeState(n); }
  public getMemberState(l: Member): MemberState | null { return this._ensureMemberState(l) ?? null; }

  /* --------------- internals --------------- */

  private _lengthAndDir(a: ICartesian, b: ICartesian) {
    const d = b.subtract(a);
    const L = d.magnitude();
    const u = L > 0 ? d.divideByScalar(L) : Cartesian3.Zero();
    return { L, u };
  }

  private _ensureNodeState(n: IConnectionPoint, overwrite = false): NodeState {
    const bag = n.bag as NodeState | undefined;
    if (!overwrite && bag && bag.position && bag.velocity && bag.force) return bag;

    const position = (n.position ?? Cartesian3.Zero()).clone();
    const velocity = Cartesian3.Zero();
    const force = Cartesian3.Zero();
    const mass = (n as any).mass ?? this.defaultMass;
    const anchored = (n as any).anchored === true;

    const s: NodeState = { position, velocity, mass, anchored, force };
    n.bag = s;
    return s;
  }

  private _ensureMemberState(l: Member, overwrite = false): MemberState | null {
    const start = l.oini as IConnectionPoint | null;
    const end = l.ofin as IConnectionPoint | null;
    if (!start || !end) return null;

    const cur = l.bag as MemberState | undefined;
    if (!overwrite && cur && cur.start === start && cur.end === end) return cur;

    // L0 from current geometry
    const p0 = start.position ?? Cartesian3.Zero();
    const p1 = end.position ?? Cartesian3.Zero();
    const { L } = this._lengthAndDir(p0, p1);

    const ms: MemberState = { L0: L, start, end };
    l.bag = ms;
    return ms;
  }
}
