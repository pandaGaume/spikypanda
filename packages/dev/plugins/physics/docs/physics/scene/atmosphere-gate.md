# Atmosphere Gate

`Physics.Scene:atmosphere-gate`

Couples two `Physics.Scene:atmosphere-state` instances by computing a per-species mass flow (kg/s) according to one of three modes (`closed`, `open_passive`, `hvac_forced`) and publishing the result with **opposite signs on the two sides** — `A_delta_<species>` is the negative of `B_delta_<species>` by construction, so mass conservation is native.

The gate reads each atmosphere's pressure / temperature / per-species mole fractions through standard runtime cables (no config-link needed for the data path). Output `<A|B>_delta_<species>` slots feed the downstream atmosphere's variadic `delta_<species>_<k>` inputs.

## Equations

For all modes, per species `i`:

```
kg/s_i = V̇ × P_upwind × x_upwind_i × M_i / (R × T_upwind)
```

where `M_i` is the species molar mass from `core/sim/chemical.species`, `R = 8.314462618 J/(mol·K)`, and `V̇` is the volumetric flow rate (m³/s) determined by the mode:

| Mode | V̇ formula | Upwind side |
|---|---|---|
| `closed` | 0 | – (no flux) |
| `open_passive` | `leakCoeff × area × |P_A − P_B|` | max(P_A, P_B) — global upwind |
| `hvac_forced` | `forcedFlow` (editable) | A (unidirectional A → B) |

`open_passive` is a linearised orifice law (sqrt-form `C × A × √(2ΔP/ρ)` deferred to V2). The `bidirectional` flag turns the gate into a check-valve: when `false`, flux is zero whenever `P_A < P_B`.

Sign convention:

```
A_delta_<species> = − kg/s_i_AtoB             (mass leaving A → negative)
B_delta_<species> = + kg/s_i_AtoB             (mass entering B → positive)
```

When B is upwind (reverse flow in `open_passive`), `kg/s_AtoB` is negative, so the publishing roles invert automatically — A_delta becomes positive (entering A), B_delta becomes negative (leaving B).

## Ports

| Direction | Slot | Type | Kind | Notes |
|---|---|---|---|---|
| in | `A_pressure` | float | signal | From `AtmosphereStateNode.pressure` of side A. |
| in | `A_temperature` | float | signal | From `AtmosphereStateNode.temperature` of side A. |
| in | `B_pressure` | float | signal | From `AtmosphereStateNode.pressure` of side B. |
| in | `B_temperature` | float | signal | From `AtmosphereStateNode.temperature` of side B. |
| in (variadic) | `A_mole_fraction_<species>` | float | signal | From `AtmosphereStateNode.mole_fraction_<species>` of side A. Used only when A is upwind. |
| in (variadic) | `B_mole_fraction_<species>` | float | signal | Same for side B. |
| out (variadic) | `A_delta_<species>` | float | signal | Mass-flow contribution to be wired to `A_atmosphere.delta_<species>_<k>`. Negative when A loses mass. |
| out (variadic) | `B_delta_<species>` | float | signal | Mass-flow contribution to be wired to `B_atmosphere.delta_<species>_<k>`. Positive when B gains mass. |

For 5 active species (V1), the variadic groups expand to 5 × 2 = **10 input mole-fraction slots and 10 output delta slots** per gate. The reconciler grows them lock-step with wiring.

## Parameters

| Name | Quantity / Unit | Default | Meaning |
|---|---|---|---|
| `mode` | enum | `open_passive` | One of `closed`, `open_passive`, `hvac_forced`. Topology change (any mode swap) triggers a session reset (`stateSize` may flip). |
| `area` / `areaQ` | Area (m²) | 1 m² | Throat / passage area. Used by `open_passive`. The Quantity accessor accepts `m²`, `cm²`, `mm²`, `in²`, `ft²`, `ha`, `km²`. |
| `leakCoeff` | dimensionless | 1e-3 | Linearised leak coefficient. Tuned per scenario: hairline crack ~1e-6, mm-scale leak ~1e-3, wide-open door ~1. |
| `forcedFlow` / `forcedFlowQ` | VolumetricFlow (m³/s) | 0 | Forced volumetric flow rate. Used by `hvac_forced`. The Quantity accessor accepts `m³/s`, `L/s`, `L/min`, `m³/h`, `cfm`, `gpm`. |
| `bidirectional` | bool | true | When false, `open_passive` becomes a check-valve (no back-flow when `P_A < P_B`). |
| `trackThroughput` | bool | false | When true AND `mode = hvac_forced`, the gate is `IIntegrable` with a 1-D state = cumulative volume moved (m³) by the fan. Used for aging models. Off by default to keep `stateSize = 0`. |

Viewables:

| Name | Notes |
|---|---|
| `lastVolumetricFlow` | Signed V̇ from the previous fire [m³/s]; positive = A → B, negative = B → A. |
| `throughput` | Cumulative volume moved [m³]. Only meaningful when `trackThroughput && mode = hvac_forced`. |

## IIntegrable surface (conditional)

| Condition | `stateSize` | `stateNames` |
|---|---|---|
| `mode == "closed"` | 0 | – |
| `mode == "open_passive"` | 0 | – |
| `mode == "hvac_forced"` AND `!trackThroughput` | 0 | – |
| `mode == "hvac_forced"` AND `trackThroughput` | 1 | `["throughput_m3"]` |

When `stateSize === 1`, `rhs` returns `dV/dt = forcedFlow` (the volumetric flow rate). The solver integrates it into the cumulative throughput counter.

## Wiring example — leak between habitat and space

```
[HabitatAtmoState]                                 [SpaceAtmoState]
  pressure ─────────────►  A_pressure                pressure ────────►  B_pressure
  temperature ──────────►  A_temperature             temperature ─────►  B_temperature
  mole_fraction_N2 ─────►  A_mole_fraction_N2        mole_fraction_N2 ►  B_mole_fraction_N2
  ... (5 species)                                    ... (5 species)
                              │
                              ▼
                       [SmallLeakGate]
                       mode = open_passive
                       area = 1e-6 m²        (1 mm² hole)
                       leakCoeff = 1e-2
                       bidirectional = true
                              │
                              ▼
                       A_delta_N2 ────► HabitatAtmoState.delta_N2_0   (negative, mass leaving)
                       B_delta_N2 ────► SpaceAtmoState.delta_N2_0     (positive, mass entering)
                       ... (5 species)
```

For an HVAC fan that always blows ECLSS air from the cabin into the scrubber loop:

```
mode          = hvac_forced
forcedFlow    = 0.005 m³/s    (≈ 300 L/min, typical recirc fan)
trackThroughput = true        (for filter aging downstream)
```

## Pitfalls

- **Mode change without reset.** The `stateSize` getter is read by the solver at attachment time; flipping `mode` from `open_passive` to `hvac_forced` mid-session does NOT propagate. Stop and re-play (or call `Session.reset()`) for the solver to pick up the new state shape.
- **Forgetting to wire mole fractions.** Unwired species default to mole fraction 0, so the gate publishes zero flux for them. A scrubber gate that loses no CO2 is usually a wiring bug, not a physics bug — check that `A_mole_fraction_CO2` is connected.
- **`forcedFlow < 0`.** The setter clamps negative `forcedFlow` to 0. To reverse the HVAC direction, swap which atmosphere wires to A vs B (the gate is unidirectional A → B by convention).
- **`leakCoeff × area` too aggressive.** The linearised model has no upper bound on flux. If the user sets `area = 1 m²` and `leakCoeff = 1` for a small ΔP, the resulting flux can drain an atmosphere within a few ticks. Use realistic engineering values; for an orifice-correct model, prefer V2 sqrt-form.
- **Same-pressure same-composition gates.** When P_A == P_B AND `bidirectional = true`, V̇ = 0 and no flux is published. The gate effectively no-ops. This is correct physics (no driver) but can confuse a user expecting some baseline mixing.
- **No conservation enforcement node needed.** A_delta and B_delta are paired by construction; `A_delta_i + B_delta_i = 0` to float precision. A dedicated `Physics.Scene:conservation-hook` (F7) is unnecessary for gates — they're already conservant. The hook becomes useful only when N-to-1 producers without paired sinks are wired (e.g. a reaction node that converts species CO2 → CO).
