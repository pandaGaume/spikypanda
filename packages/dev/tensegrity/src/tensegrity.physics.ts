import { Cartesian3 } from "spikypanda-core";
import { BucklingModel, IConnectionPoint, Member, MemberKind } from "./tensegrity.interfaces";

export const Gravity = new Cartesian3(0, 0, -9.81);

/*
  Helper: Euclidean distance between two connection points.

  Assumptions
  - IConnectionPoint has an optional `position: Cartesian3`.
  - If a point has no position, we fall back to the origin. This avoids NaN
    and makes the behavior explicit.

  Returns
  - Distance in meters (or the same unit as your Cartesian3 coordinates).
*/
function length3(a: IConnectionPoint, b: IConnectionPoint): number {
  const p0 = a.position ?? Cartesian3.Zero();
  const p1 = b.position ?? Cartesian3.Zero();
  return p0.distance(p1);
}

/* Clamp a number to [0, 1]. */
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/*
  stiffness

  Purpose
  - Compute the axial stiffness of a member between two nodes.
  - For tension members, supports slack (dead length) before the cable becomes taut.
  - For compression members, optionally reduces stiffness to model buckling.

  Parameters
  - m: Member containing material and geometric properties:
      E  Young's modulus [Pa]
      A  Cross-sectional area [m^2]
      slack  Optional dead length for cables [m]
      buckling  Optional config for compression members
  - start, end: Node objects providing positions used to measure the current length L.
  - axialForceN: Optional current axial force. Positive means compression.
    Only used when buckling.model is ForceBased.

  Model overview
  - Tension members:
      If L <= slack, cable is slack, stiffness = 0.
      Else linearized stiffness k = E*A/(L - slack).
    This is a simple linear spring around the taut length.

  - Compression members:
      Base axial stiffness k = E*A/L.
      Optionally apply a reduction factor phi in (0..1) to mimic loss of tangent stiffness
      near Euler buckling. Two options:
        ForceBased:
          Requires axialForceN, second moment I, and effective length factor K.
          Pcr = pi^2 * E * I / (K*L)^2
          k_eff = k * max(0, 1 - N/Pcr)
        SlendernessBased:
          Requires I, uses lambda = L / r with r = sqrt(I/A).
          k_eff = k * [ 1 / (1 + (lambda/lambda0)^2) ], lambda0 is a tuning constant.

  Returns
  - Finite positive stiffness in N/m.
  - Infinity when L <= 0 to flag coincident nodes. Upstream code can catch this and
    either skip the element or regularize the geometry.
*/
export function stiffness(
  m: Member,
  start: IConnectionPoint,
  end: IConnectionPoint,
  axialForceN?: number // positive in compression; ignored for tension members
): number {
  const L = length3(start, end);
  if (L <= 0) return Infinity; // degeneracy guard: coincident nodes

  // Unpack material and buckling data once
  const { E, A, slack = 0, buckling } = m.props;

  // Tension member behavior
  if (m.kind === MemberKind.Tension) {
    // Cable is not taut yet: no axial response
    if (L <= slack) return 0;

    // Linearized stiffness once taut. The denominator (L - slack) reflects
    // the effective elastic length after removing the dead length.
    return (E * A) / (L - slack);
  }

  // Compression member: base axial stiffness
  let k = (E * A) / L;

  // No buckling modeling requested
  if (!buckling || buckling.model === BucklingModel.None) return k;

  // Buckling requires a second moment of area
  const I = buckling.I;
  if (!I || I <= 0) return k;

  switch (buckling.model) {
    case BucklingModel.ForceBased: {
      // Euler critical load: Pcr = pi^2 * E * I / (K*L)^2
      const K = buckling.K ?? 1.0;
      const Le = K * L;
      if (Le <= 0) return k;

      const Pcr = (Math.PI ** 2 * E * I) / (Le * Le);
      if (Pcr <= 0 || axialForceN === undefined) return k;

      // Tangent-stiffness style reduction
      // When N -> Pcr, phi -> 0. Do not allow negative stiffness.
      const phi = clamp01(1 - Math.max(0, axialForceN) / Pcr);
      return k * phi;
    }

    case BucklingModel.SlendernessBased: {
      // Slenderness lambda = L / r, with r = sqrt(I/A)
      // Larger lambda means more prone to buckling, hence lower phi.
      const r = Math.sqrt(I / A);
      if (!isFinite(r) || r <= 0) return k;

      const lambda = L / r;
      const lambda0 = buckling.lambda0 ?? 100; // tuning constant; pick per material/code

      // Smooth, monotone reduction. phi in (0, 1].
      const phi = 1 / (1 + (lambda / lambda0) ** 2);
      return k * clamp01(phi);
    }

    default:{
      return k;
    }
  }
}
