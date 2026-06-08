# Gas

`Chemistry.Gas:gas` (+ 12 presets: `:n2`, `:o2`, `:co2`, `:h2o`, `:ar`, `:ch4`, `:co`, `:nh3`, `:he`, `:n2o`, `:ne`, `:xe`)

Descriptor for a single chemical-gas species. A `GraphItem` (not a `RuntimeNode`) — carries the physico-chemical constants the rest of the simulation needs (molar mass, density, specific heat, thermal conductivity, viscosity) and wires to a `Chemistry.Composition:*` aggregator via the dashed `gas_out` config-link.

Implements `IGasMetadata` (core/sim/chemistry.interfaces.ts), so any plugin that consumes "a gas" duck-types on this interface without depending on the chemistry plugin's bundle.

## Storage convention

Canonical SI throughout the storage layer:

| Field | Unit | Why SI |
|---|---|---|
| `molarMass` | kg/mol | The atmospheric ideal-gas formulas operate in kg/mol; converting at the storage boundary keeps consumers free of conversion calls. |
| `density` | kg/m³ | Direct comparison with `Density` Quantity bases. |
| `specificHeat` | J/(kg·K) | Energy / temperature equations stay one-liner. |
| `thermalConductivity` | W/(m·K) | Direct hand-off to heat-flux equations. |
| `viscosity` | Pa·s | Same as Navier–Stokes / Reynolds-number calculations. |

The property panel exposes the engineering-natural units users actually write in: g/mol for molar mass (28.0134 not 0.0280134), μPa·s for gas viscosity (17.81 not 1.781e-5). The `@editable` getters convert at the panel boundary; `@cloneable` storage stays SI.

For unit-aware code paths, the Quantity-typed accessors (`molarMassQ: MolarMass`, `densityQ: Density`, `specificHeatQ: MassSpecificHeat`, `thermalConductivityQ: ThermalConductivity`, `viscosityQ: DynamicViscosity`) return fresh Quantity instances over the canonical-SI storage. Callers use `.getValue(SomeUnit.Units.x)` to extract any target unit without manual conversion.

## Anchors (editor-only config-links)

| Direction | Anchor | Type | Notes |
|---|---|---|---|
| out | `gas_out` | gas | Dashed config-link onto a CompositionNode's variadic `gas_in_<k>`. Resolved at session bind, never carries a runtime payload. |

`gas` is a config-link type (P5a), so the cable renders dashed automatically. The compatibility rule refuses `any ↔ gas` drops — the editor silently rejects any attempt to wire a gas anchor to a non-gas slot.

## Parameters

| Field | @editable unit | Storage unit | Default (N2) | Meaning |
|---|---|---|---|---|
| `id` | string | – | `"N2"` | Stable identifier; appears in `delta_<id>_<k>` and `mass_<id>` slots on downstream atmospheres / gates. |
| `displayName` | string | – | `"Nitrogen"` | Property-panel header label. |
| `formula` | string | – | `"N₂"` | Empirical formula for display. |
| `casNumber` | string | – | `"7727-37-9"` | CAS registry number — useful for cross-referencing safety data sheets. |
| `molarMassGperMol` | g/mol | kg/mol | 28.0134 | Molecular weight. |
| `densityKgPerM3` | kg/m³ | kg/m³ | 1.2506 | Density at standard temperature & pressure (0 °C / 100 kPa). |
| `specificHeatJPerKgK` | J/(kg·K) | J/(kg·K) | 1040 | Cp at constant pressure, per unit mass. |
| `thermalConductivityWPerMK` | W/(m·K) | W/(m·K) | 0.0259 | Heat conduction coefficient at room T. |
| `viscosityMicroPas` | µPa·s | Pa·s | 17.81 | Dynamic viscosity at room T. |

## Presets

| typeId | M (g/mol) | ρ at STP (kg/m³) | Cp (J/(kg·K)) | k (W/(m·K)) | μ (μPa·s) |
|---|---|---|---|---|---|
| `:n2` Nitrogen | 28.0134 | 1.2506 | 1040 | 0.0259 | 17.81 |
| `:o2` Oxygen | 31.9988 | 1.429 | 918 | 0.0263 | 20.55 |
| `:co2` Carbon dioxide | 44.0095 | 1.977 | 844 | 0.0166 | 14.91 |
| `:h2o` Water vapor | 18.0153 | 0.804 | 1996 | 0.0182 | 9.85 |
| `:ar` Argon | 39.948 | 1.784 | 520 | 0.01772 | 22.74 |
| `:ch4` Methane | 16.0425 | 0.717 | 2226 | 0.0341 | 11.0 |
| `:co` Carbon monoxide | 28.0101 | 1.250 | 1041 | 0.0250 | 17.5 |
| `:nh3` Ammonia | 17.0305 | 0.7710 | 2097 | 0.0247 | 10.07 |
| `:he` Helium | 4.0026 | 0.1786 | 5193 | 0.1513 | 19.6 |
| `:n2o` Nitrous oxide | 44.0128 | 1.9775 | 872 | 0.01757 | 14.6 |
| `:ne` Neon | 20.1797 | 0.9002 | 1030 | 0.0491 | 31.1 |
| `:xe` Xenon | 131.293 | 5.887 | 158 | 0.00569 | 23.0 |

Sources: NIST WebBook + Engineering ToolBox cross-checked. Values are conservative engineering averages — publication-quality work should re-read CODATA / NIST directly.

## Wiring example

```
[Nitrogen (Chemistry.Gas:n2)]
[Oxygen (Chemistry.Gas:o2)]
[Carbon dioxide (Chemistry.Gas:co2)]
[Water vapor (Chemistry.Gas:h2o)]
[Argon (Chemistry.Gas:ar)]
   gas_out  ───pointillé───►  [Earth humid air (Chemistry.Composition:earth-humid)]
                                  (variadic gas_in_0..gas_in_4)
                                  composition_out  ───pointillé──► [Atmosphere]
```

## Pitfalls

- **Editing a preset is non-destructive.** A dropped `Chemistry.Gas:n2` carries the canonical N2 values, but the user can override any field. The runtime reads whatever's in `item.data` — there's no "snap back to N2" once edited. Use the generic `Chemistry.Gas:gas` if the intent is to author a fully custom gas.
- **Quantity round-trip rounding.** Setting `gas.molarMassQ = new MolarMass(28.0134, MolarMass.Units.gpmol)` stores `0.0280134` kg/mol exactly. Reading `gas.molarMassQ.getValue(MolarMass.Units.gpmol)` returns `28.0134` to float precision. Don't compare via `.toBe(...)` with strict equality; use `.toBeCloseTo(..., 9)` or similar.
- **Wiring `gas_out` to a non-`gas_in_<k>` slot.** Type compatibility (`gas → gas`) is enforced — the editor silently drops the connection. Same for `gas_out → atmosphere_in` (the rule is strict, no implicit conversions across config-link families).
- **Multiple GasNodes with the same `id`.** Nothing prevents the user from dropping two `Chemistry.Gas:n2` presets on the canvas and wiring both to a composition. The composition does NOT deduplicate by `id` — it carries the two as separate components. For correct behavior, ensure the `id` field is unique within a composition's component list (the editor's property panel should soon surface a warning; today it's the user's responsibility).
