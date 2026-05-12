import { IRuntimeNode, ISession } from "../execution/execution.interfaces";

/**
 * Sim layer: time-discrete simulation extension on top of core/execution.
 * The runtime layer is pure KPN/dataflow and knows nothing about phases;
 * this file adds the phase concept as a session-level context and an
 * opt-in interface that nodes implement when they want to gate themselves
 * on the current phase.
 */

/**
 * Named scheduling phases for time-discrete simulation. SimSession
 * iterates these in declaration order at each tick, setting
 * currentPhase before dispatching the underlying scheduler. Domain
 * extensions append new phases to this enum, the type intentionally
 * stays closed (no arbitrary strings).
 */
export enum SimPhase {
    PreStep = 0,
    Step = 1,
    PostStep = 2,
}

/**
 * Sim-specific session: extends the generic ISession with the phase
 * currently being dispatched. SimSession sets this once per phase
 * iteration before draining the ready-queue; nodes that implement
 * ISupportsPhasing read it via the session cast to gate themselves.
 */
export interface ISimSession extends ISession {
    readonly currentPhase: SimPhase;
    readonly phases: ReadonlyArray<SimPhase>;
}

/**
 * Opt-in marker for nodes that gate themselves on the current phase.
 * Nodes not implementing this fire whenever their inputs are ready,
 * regardless of phase (pure KPN behaviour). Nodes implementing this
 * skip phases not in their declared list even when data is ready.
 *
 * The scheduler itself remains phase-agnostic; the gating happens in
 * the node's isReady() (see PhasedNode for the canonical implementation).
 */
export interface ISupportsPhasing {
    readonly phases: ReadonlyArray<SimPhase>;
}

/**
 * Type guard for ISupportsPhasing on a runtime node.
 */
export function supportsPhasing(n: IRuntimeNode): n is IRuntimeNode & ISupportsPhasing {
    const candidate = n as IRuntimeNode & Partial<ISupportsPhasing>;
    return Array.isArray(candidate.phases);
}

/**
 * Type guard for ISimSession on a generic ISession. True when the
 * session carries the sim-specific currentPhase + phases fields, which
 * is the contract SimSession adds on top of Session.
 */
export function isSimSession(s: ISession): s is ISimSession {
    const candidate = s as ISession & Partial<ISimSession>;
    return typeof candidate.currentPhase === "number" && Array.isArray(candidate.phases);
}
