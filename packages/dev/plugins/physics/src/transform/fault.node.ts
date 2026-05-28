import { IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import { TransformNode } from "./transform.node.js";

/**
 * Canonical fault descriptor carried on the variadic `fault_N` ports.
 *
 *   target   the physical quantity the fault perturbs. By convention:
 *            "tau" → additive torque [Nm]   (bearing, gear, shaft, modulator)
 *            "R"   → stator/armature resistance multiplicative delta
 *            "L"   → inductance multiplicative delta
 *            "Ke"  → back-EMF constant multiplicative delta (demag)
 *            "Kt"  → torque constant multiplicative delta
 *            "b"   → viscous friction additive delta [Nm·s/rad]
 *            "J"   → inertia additive delta [kg·m²]
 *            Subclasses MAY introduce motor-specific targets ("R_a",
 *            "Va_offset", ...). Unknown targets are accumulated but
 *            ignored by subclasses that don't read them.
 *
 *   value    the numerical perturbation, units context-dependent on target.
 *
 * The "tau" target is the V1 lingua franca: every existing fault
 * generator (Bearing, Shaft, Gear, Fault.modulator) emits a scalar torque
 * signature, so the auto-wrap fallback in FaultableNode turns a plain
 * `number` into `{ target: "tau", value: number }` for fluent wiring.
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

/**
 * Slot prefix that identifies a variadic fault input. We mirror the
 * convention used by SequenceNode / MakeArrayNode: only `fault_0` is
 * declared statically, and the editor grows `fault_1`, `fault_2`, ...
 * as users wire additional fault sources.
 */
const FAULT_SLOT_PREFIX = "fault_";

/**
 * Returns true when `slot` looks like `fault_<int>`. Used by the fire()
 * loop to filter opsc.
 */
function isFaultSlot(slot: string): boolean {
    if (slot.indexOf(FAULT_SLOT_PREFIX) !== 0) return false;
    const idxStr = slot.slice(FAULT_SLOT_PREFIX.length);
    if (idxStr.length === 0) return false;
    const n = Number(idxStr);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
}

/**
 * Base class for every physical object that accepts fault perturbations
 * on a variadic `fault_N` input bank. Sits between TransformNode and the
 * concrete motor/sensor classes so the inheritance chain is:
 *
 *     RuntimeNode → TransformNode → FaultableNode → DcMotorDynamicNode
 *                                                 → BldcMotorDynamicNode
 *                                                 → ...
 *
 * On every fire(), the accumulator is reset, then `super.fire()` (the
 * TransformNode hop) consumes local/parent_world and publishes the world
 * matrix, then this class iterates opsc again and consumes every wired
 * `fault_N` token. Tokens that are plain numbers are auto-wrapped with
 * target "tau" (the common case, since every existing fault generator
 * still emits a scalar). Structured `{ target, value }` tokens flow
 * through unchanged.
 *
 * Subclasses query the accumulator via `getFault(target)`, which returns
 * the SUM of every fault descriptor with that target this tick (0 if
 * none). Unknown targets are accepted into the accumulator but stay
 * invisible to subclasses that don't read them; this is intentional, it
 * lets the user wire ahead of subclass support without errors.
 *
 * The fault payload is documented in `IFaultDescriptor`.
 */
export class FaultableNode extends TransformNode implements IDeclaresPorts {
    /** First variadic fault slot. The editor grows fault_1, fault_2, ... */
    public static readonly INPUT_FAULT_0 = "fault_0";

    /** Reusable port block: spread into subclass inputPorts to advertise
     *  the fault bank. Only the first slot is statically declared; the
     *  rest are conjured by the editor on demand. */
    public static readonly FAULT_INPUT_PORTS: ReadonlyArray<IPortDescriptor> = [{ slot: FaultableNode.INPUT_FAULT_0, optional: true, type: "any" }];

    /** Aggregated input-port block covering everything inherited from
     *  the transform + fault layers. Subclasses spread this to avoid
     *  re-listing TRANSFORM_INPUT_PORTS + FAULT_INPUT_PORTS by hand. */
    public static readonly BASE_INPUT_PORTS: ReadonlyArray<IPortDescriptor> = [...TransformNode.TRANSFORM_INPUT_PORTS, ...FaultableNode.FAULT_INPUT_PORTS];

    /** Faults add no outputs (they are sinks). Re-exported as a stable
     *  alias so subclasses can spread BASE_OUTPUT_PORTS regardless of
     *  whether new output-producing mixins are inserted later. */
    public static readonly BASE_OUTPUT_PORTS: ReadonlyArray<IPortDescriptor> = TransformNode.TRANSFORM_OUTPUT_PORTS;

    /** Per-tick accumulator: target → summed value. Reset at the start
     *  of every fire(), so faults are transient (single-tick) by design. */
    private readonly _faultSum: Map<string, number> = new Map();

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = FaultableNode.BASE_INPUT_PORTS;
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = FaultableNode.BASE_OUTPUT_PORTS;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /**
     * Returns the accumulated fault value for the given target this tick.
     * Returns 0 when no fault descriptor with that target was wired/ready.
     * Safe to call before `fire()` has run in a given tick (returns 0).
     *
     * Subclass usage in fire():
     *
     *     super.fire(session, t);           // populates the accumulator
     *     const tauFault = this.getFault("tau");
     *     const tauLoadEffective = tauLoadInput + tauFault;
     */
    protected getFault(target: string): number {
        return this._faultSum.get(target) ?? 0;
    }

    /**
     * Iterate every entry in the accumulator. Useful for debug logging
     * or for subclasses that want to apply unknown targets generically.
     */
    protected forEachFault(cb: (target: string, value: number) => void): void {
        this._faultSum.forEach((v, k) => cb(k, v));
    }

    public override reset(session: ISession): void {
        super.reset(session);
        this._faultSum.clear();
    }

    public override fire(session: ISession, t: number): void {
        // 1) Let TransformNode consume local/parent_world and publish world.
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

            // Auto-wrap: plain number → { target: "tau", value }. This
            // keeps the existing fault generators (Bearing.fault,
            // Shaft.unbalance, Gear.mesh, Fault.modulator), which all
            // emit floats, wire-and-play without an explicit wrap node.
            let fault: IFaultDescriptor | null = null;
            if (typeof value === "number") {
                fault = { target: "tau", value };
            } else if (isFaultDescriptor(value)) {
                fault = value;
            }
            if (!fault) continue;

            const prev = this._faultSum.get(fault.target) ?? 0;
            this._faultSum.set(fault.target, prev + fault.value);
        }
    }
}
