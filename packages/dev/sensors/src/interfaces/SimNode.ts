// A simulation node with a temporal discipline. All compute components
// participating in any simulation graph (transforms, controllers, machines,
// housing, faults, environment models) implement this contract.
//
// advance(t) advances the internal state from t_prev to t. It must be
// called with a monotonically non-decreasing t. Implementations may
// integrate lazily (no state change when t == t_prev) and may sub-step
// internally.
//
// reset() returns the node to its initial state. Used by scenario
// factories when a fresh run is requested.
//
// This interface is intentionally domain-agnostic. Theme-specific fault
// contracts (electrical, mechanical, chemical, thermal, ...) live next to
// the modules they belong to (e.g. sources/motor/pmsm/faults/PmsmFaultContracts.ts
// for PMSM-typed fault hosts), and extend ISimNode with their own typed
// pre / post step signatures.
export interface ISimNode {
    readonly kind: string;
    advance(t: number): void;
    reset(): void;
}
