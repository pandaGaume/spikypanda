import { IOlink, INode, isNode, isOlink } from "spikypanda-core";

export enum MemberKind {
  Tension = "tension",
  Compression = "compression",
}

/** Buckling reduction model selector */
export enum BucklingModel {
  None = "none",
  ForceBased = "force",         // needs axial force N, inertia I, and K
  SlendernessBased = "slender", // needs inertia I and a lambda0 reference
}

export interface PhysicalProps {
  E: number;        // Pa
  A: number;        // m^2
  slack?: number;   // m, optional for cables
  
  /** Optional buckling config for compression members */
  buckling?: {
    model: BucklingModel;
    I?: number;        // Second moment of area [m^4]
    K?: number;        // Effective length factor [-], default 1.0
    lambda0?: number;  // Reference slenderness for reduction, e.g. 100
  };
}

export interface IMember extends IOlink {
    kind: MemberKind
    props: PhysicalProps;
}

export interface ITensionMember extends IMember {
  kind: MemberKind.Tension;
}

export interface ICompressionMember extends IMember {
  kind: MemberKind.Compression;
}

export type Member = ITensionMember | ICompressionMember;

export interface IConnectionPoint extends INode {
  anchored?: boolean;
}

export interface IAnchor extends IConnectionPoint {
  anchored: true;
}

const has = (o: unknown, k: string): o is Record<string, unknown> =>
  typeof o === "object" && o !== null && k in o;

const isEnumValue = <E extends Record<string, string>>(e: E, v: unknown): v is E[keyof E] =>
  typeof v === "string" && Object.values(e as Record<string, string>).includes(v);

// Connection points
export function isConnectionPoint(x: unknown): x is IConnectionPoint {
  return isNode<IConnectionPoint>(x);
}

export function isAnchor(x: unknown): x is IAnchor {
  return isConnectionPoint(x) && x.anchored === true;
}

// Members
export function isMember(x: unknown): x is Member {
  return isOlink<Member>(x) && has(x, "kind") && isEnumValue(MemberKind, (x as any).kind);
}

export function isTensionMember(x: unknown): x is ITensionMember {
  return isOlink<Member>(x) && (x as any).kind === MemberKind.Tension;
}

export function isCompressionMember(x: unknown): x is ICompressionMember {
  return isOlink<Member>(x) && (x as any).kind === MemberKind.Compression;
}
