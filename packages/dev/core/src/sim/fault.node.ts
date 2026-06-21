import { IOlink } from "../graph/graph.interfaces";
import { IChannel, IDeclaresPorts, IPortDescriptor, ISession, inSlotOf } from "../execution/execution.interfaces";
import type { ICartesian } from "../geometry/geometry.interfaces";
import type { Nullable } from "../types";
import { TransformNode } from "./transform.node";

/**
 * Canonical fault descriptor carried on the variadic `fault_N` ports.
 *
 *   target   the physical quantity the fault perturbs. By convention:
 *            "tau"  → additive torque [Nm]   (bearing, gear, shaft, modulator)
 *            "flux" → multiplicative magnet-flux modulation (sag, eccentricity)
 *            "R"    → stator/armature resistance multiplicative delta
 *            "L"    → inductance multiplicative delta
 *            "backEmfConstant"   → back-EMF constant multiplicative delta (demag)
 *            "torqueConstant"   → torque constant multiplicative delta
 *            "b"    → viscous friction additive delta [Nm·s/rad]
 *            "J"    → inertia additive delta [kg·m²]
 *            "broken_bar" → induction-machine rotor-bar asymmetry, ...
 *            Subclasses MAY introduce model-specific targets. A subclass
 *            decides which targets are physically meaningful for it by
 *            overriding `acceptFault` (e.g. a brushless motor rejects
 *            "broken_bar", which only an induction machine models).
 *
 *   value    the numerical perturbation, units context-dependent on target.
 *
 * A plain `number` token auto-wraps to `{ target: "tau", value }`, the V1
 * lingua franca every scalar fault generator (Bearing, Shaft, Gear,
 * Fault.modulator) still emits.
 */
export interface IFaultDescriptor {
    target: string;
    value: number;
}

/** Lightweight structural guard; matches duck-typed objects too. */
export function isFaultDescriptor(v: unknown): v is IFaultDescriptor {
    if (!v || typeof v !== "object") return false;
    const o = v as Partial<IFaultDescriptor>;
    return typeof o.target === "string" && typeof o.value === "number";
}

/** Slot prefix that identifies a variadic fault input. */
const FAULT_SLOT_PREFIX = "fault_";

/** Returns true when `slot` looks like `fault_<int>`. */
function isFaultSlot(slot: string): boolean {
    if (slot.indexOf(FAULT_SLOT_PREFIX) !== 0) return false;
    const idxStr = slot.slice(FAULT_SLOT_PREFIX.length);
    if (idxStr.length === 0) return false;
    const n = Number(idxStr);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
}

/**
 * Base class for every runtime object that accepts fault perturbations on
 * a variadic `fault_N` input bank. Sits between TransformNode and the
 * concrete motor/sensor classes:
 *
 *     RuntimeNode → TransformNode → FaultableNode → DcMotorDynamicNode
 *                                                 → BldcMotorDynamicNode
 *                                                 → ...
 *
 * On every fire(): `super.fire()` (the TransformNode hop) consumes
 * local/parentWorld and publishes the world matrix, then this class
 * iterates opsc again, consumes every wired `fault_N` token, and routes
 * it through `acceptFault()` before accumulating. Plain numbers auto-wrap
 * to target "tau"; structured `{ target, value }` tokens flow through.
 *
 * Subclasses query the accumulator via `getFault(target)` (SUM this tick,
 * 0 if none) and restrict their physically-meaningful targets by
 * overriding `acceptFault`.
 *
 * This is a CORE primitive (previously vendored inside the physics plugin).
 */
export class FaultableNode extends TransformNode implements IDeclaresPorts {
    /** First variadic fault slot. The editor grows fault_1, fault_2, ... */
    public static readonly INPUT_FAULT_0 = "fault_0";

    /** Reusable port block: spread into subclass inputPorts. */
    public static readonly FAULT_INPUT_PORTS: ReadonlyArray<IPortDescriptor> = [{ slot: FaultableNode.INPUT_FAULT_0, optional: true, type: "any" }];

    /** Aggregated transform + fault input ports. */
    public static readonly BASE_INPUT_PORTS: ReadonlyArray<IPortDescriptor> = [...TransformNode.TRANSFORM_INPUT_PORTS, ...FaultableNode.FAULT_INPUT_PORTS];

    /** Faults add no outputs; alias of the transform output block. */
    public static readonly BASE_OUTPUT_PORTS: ReadonlyArray<IPortDescriptor> = TransformNode.TRANSFORM_OUTPUT_PORTS;

    /** Per-tick accumulator: target → summed value. Reset every fire(). */
    private readonly _faultSum: Map<string, number> = new Map();

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = FaultableNode.BASE_INPUT_PORTS;
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = FaultableNode.BASE_OUTPUT_PORTS;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /**
     * Decide whether a fault is physically meaningful for THIS model.
     * Default accepts every target. Subclasses override to whitelist the
     * targets their physics actually implements, so an incoherent fault
     * (e.g. a broken-rotor-bar fault wired into a brushless PMSM, which
     * has no cage) is silently ignored rather than corrupting the model.
     *
     *     protected override acceptFault(f: IFaultDescriptor): boolean {
     *         return f.target === "tau" || f.target === "flux";
     *     }
     *
     * Called once per wired-and-ready fault token, before accumulation.
     */
    protected acceptFault(_fault: IFaultDescriptor): boolean {
        return true;
    }

    /**
     * Returns the accumulated, accepted fault value for `target` this tick
     * (0 when none). Safe to call before fire() in a tick (returns 0).
     */
    protected getFault(target: string): number {
        return this._faultSum.get(target) ?? 0;
    }

    /** Iterate every accepted entry in the accumulator. */
    protected forEachFault(cb: (target: string, value: number) => void): void {
        this._faultSum.forEach((v, k) => cb(k, v));
    }

    public override reset(session: ISession): void {
        super.reset(session);
        this._faultSum.clear();
    }

    public override fire(session: ISession, t: number): void {
        // 1) TransformNode hop: consume local/parentWorld, publish world.
        super.fire(session, t);

        // 2) Reset the accumulator and scan fault_N tokens.
        this._faultSum.clear();

        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (!isFaultSlot(slot)) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);

            let fault: IFaultDescriptor | null = null;
            if (typeof value === "number") {
                fault = { target: "tau", value };
            } else if (isFaultDescriptor(value)) {
                fault = value;
            }
            if (!fault) continue;

            // Model-coherence filter: drop faults this model does not own.
            if (!this.acceptFault(fault)) continue;

            const prev = this._faultSum.get(fault.target) ?? 0;
            this._faultSum.set(fault.target, prev + fault.value);
        }
    }
}
