# Material

`Chemistry.Material:material` (+ 3 synthetic presets: `:calcium-pure`, `:calcium-magnesium`, `:test-oxide-mix`)

Condensed-matter composition. Holds the constituents of a sample as chemical formulas with their proportions, and publishes the **elemental** vector that stoichiometry resolves them to. Entry point of the LIBS chain: `material_out` feeds a plasma node.

A `RuntimeNode` and a source: it consumes nothing and publishes its spec on every `fire()`.

## The thesis, in one line

A mass fraction of `Fe2O3` is **not** a mass fraction of `Fe`. Iron is 69.94 % of the mass of its sesquioxide, so "20 % Fe2O3" means 13.99 % iron and 6.01 % extra oxygen. Reading one as the other inflates an iron concentration by a factor 1.43, and the error surfaces later as an apparently broken emission model. This node is the single place where that conversion happens, with an explicit basis and a recorded provenance.

## Why this node is not `Chemistry.Composition:composition`

| | `Composition` | `Material` |
|---|---|---|
| Describes | a gas mixture | a solid or any condensed sample |
| Default basis | mole fraction | **mass** fraction, declared explicitly |
| Constituents | catalogued gas species (`N2`, `CO2`, …) | arbitrary chemical formulas (`SiO2`, `Fe2O3`, `Fe`) |
| Extra state | reference pressure, ideal-gas seeding | none |
| Cable | dashed config-link `composition` | normal data cable, `any` |

They are siblings, not replacements. Nothing in the atmosphere stack changes.

## Ports

| Direction | Slot | Type | Notes |
|---|---|---|---|
| out | `material_out` | any | Immutable `IMaterialSpec`, republished every tick. `specVersion` increments on every edit, so a consumer recomputes only when it changed. |

The payload travels on a **data** cable rather than a dashed config-link. The reason is structural: the config-link binding table is hardcoded in `core/src/document/document.instantiate.ts` and in `nodeeditor/src/graph-session-builder.ts`, and `PortType` is a closed union in `nodeeditor/src/types.ts`. Introducing a `material` relation would mean editing the framework to hand one value from one node to the next. A consumer validates the payload with the duck-typed `isMaterialSpec` guard instead, which also keeps the consuming plugin free of any dependency on this one.

## Parameters

| Field | @editable | Default | Meaning |
|---|---|---|---|
| `preset_id` | string | `"custom"` | Identifier of the preset the node came from. |
| `display_name` | string | `"Material"` | Panel header. |
| `basis` | string | `"mass"` | `"mass"` or `"mole"`. Any other value is **ignored**, not applied: a basis is a statement about the user's numbers. |
| `components` | string | `""` | The constituent list, one line: `SiO2:0.6, Fe2O3:0.2, CaCO3:0.15, MgO:0.05`. `=` works as well as `:`, and `60%` means `0.6`. |
| `provenance` | string | `"user input"` | Where the numbers come from. Carried into every downstream simulation record. |

V1 limitation, the same one `Composition` documents: the property panel has no dynamic list editor, so the component list is one text field. Code and tests use `setComponents`, `upsertComponent`, `removeComponent`.

Fractions do **not** have to sum to 1. The node normalises and reports the original total in `input_fraction_sum`, so a rescale is visible rather than silent.

## Viewables

| Name | Notes |
|---|---|
| `component_count` | number of constituents parsed |
| `element_count` | number of distinct elements resolved |
| `input_fraction_sum` | total of the declared fractions, before normalisation |
| `resolution_error` | empty when the composition resolved, the reason otherwise |
| `resolved_mass_fractions` | one-line summary, e.g. `C:1.80% O:48.95% Mg:3.02% Si:28.04% Ca:6.01% Fe:13.99%` |

## Error handling

A malformed formula does not throw from the setter: a half-typed formula in a property panel would make the editor unusable. The text is kept, the resolution fails softly, `resolution_error` says why, and the published spec carries **empty** vectors so that no downstream node computes on a guess.

Refused rather than guessed: unknown element symbols, hydrates (`CuSO4·5H2O`), charges (`SO4^2-`), isotopes (`13C`), fractional subscripts, zero atom counts, unbalanced brackets, negative fractions.

Supported: element symbols with counts (`Fe2O3`), nested groups with multipliers (`Ca(OH)2`, `Al2(SO4)3`), repeated elements (`CH3COOH` reads as C2H4O2), and two-letter symbols read as one element (`Co` is cobalt, `CO` is carbon monoxide).

## Presets

The three presets are **test scenarios, not reference materials**: pure calcium and a calcium / magnesium mix for the plumbing test, plus the four-oxide mixture of the LIBS brief for the stoichiometry test. A real sample's composition comes from its certificate, with its uncertainties, through `provenance`.

## Where the constants live

Atomic masses come from `CHEMICAL_ELEMENTS` in `core/src/sim/chemical.elements.ts` (standard atomic weights, five significant digits, stated as `a_verifier` until checked against the primary source). The parser and the basis resolution are in `core/src/sim/chemical.formula.ts`. Neither is duplicated here.
