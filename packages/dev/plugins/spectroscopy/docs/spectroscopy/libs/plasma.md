# LIBS Plasma

`Spectro.Libs:plasma`

The emission stage of the LIBS chain. Reads a material specification and publishes a **line list**: one amplitude and one Doppler width per atomic transition.

## The physics, and the part of it that is not here

LIBS means laser-induced breakdown spectroscopy. A laser pulse vaporises a small mass of the sample into a plasma; the plasma's atoms and ions, excited by collisions, fall back to lower levels and emit photons at the wavelengths of their transitions. A spectrum is therefore a comb of lines whose positions name the elements present and whose intensities depend, in a complicated way, on how much of each element is there.

The full chain is in the track document `internals/libs/02-LIBS-FORWARD-MODEL.md`. This node implements the two parts that can be stated honestly today, and refuses the rest:

| Stage | Here? |
|---|---|
| composition of the plasma from the composition of the solid | **no**: assumed equal, which ablation fractionation makes false |
| level populations (Boltzmann) | **yes**, in `physical` mode |
| ionisation balance (Saha) | **yes**, first ionisation only |
| line amplitude from a transition probability | **yes**, from the NIST `A_ki`, `g_k`, `E_k` |
| second ionisation | **yes**, since it is not a detail: at 11 605 K and 1e17 cm^-3, 9.1 % of calcium is doubly ionised against 0.2 % of iron, and at 15 000 K calcium reaches 63 %. Leaving it out biased a Ca/Si intensity ratio by 10 %, now 0.02 % |
| third ionisation | **no**: beyond Ca III, Fe III and Si III the balance stops, and `stages_solved` says so per element |
| Doppler broadening from temperature and atomic mass | **yes** |
| collisional (Stark-like) broadening from electron density | **yes**, with one global coefficient instead of per-line Stark data |
| self-absorption | **no** |
| plasma inhomogeneity, time evolution, molecular bands | **no** |

## Two emission models, and what each one claims

`emission_model = "physical"` (the default since the NIST catalogue shipped): the Boltzmann / Saha / transition-probability chain.

| Stage | How |
|---|---|
| partition function | `U(T) = sum of g exp(-E/kT)` over the species' complete NIST level list |
| level population | Boltzmann: the fraction on level k is `g_k exp(-E_k/kT) / U(T)` |
| ionisation balance | Saha, solved at the node's electron density, over the **three** lowest stages: neutral, singly and doubly ionised |
| line emissivity | the optically thin form, `A_ki` times the upper level population, times the energy of the photon |
| the photon's energy | the difference between the two levels, `E_k - E_i`, not `h c / lambda` |

Why the photon energy comes from the levels and not from the wavelength: above 200 nm the wavelength NIST publishes is the wavelength **in air**, so `h c / lambda` is the photon's energy multiplied by the refractive index of the room, which is not constant across the band. Taking `E_k - E_i` instead removed a wavelength-dependent error of 3e-5 on every intensity. It was found by comparing against the NIST LIBS Database, which is an independent implementation of this same model: `packages/tests/spectroscopy/v1b0-nist-reference.test.ts`. A line whose lower level NIST does not publish falls back to the wavelength.

Intensities are published in **eV per second per atom**: the emissivity per unit total atom density, without the 1/4 pi solid angle. Nothing in the chain fixes how many atoms the laser ablated, so the overall SCALE is unknown. Every **ratio** is physical: line to line, species to species, element to element, and their variation with temperature and electron density. That is what a Boltzmann plot or a line-ratio thermometer needs, and it is exactly what the node claims, no more.

`emission_model = "relative"`: amplitude = `intensity_scale` x atom fraction x the catalogue's relative strength. Not physics, and not claimed to be: no temperature in the intensity, no ionisation balance. It is what the built-in catalogue supports, and the unit published is the string `relative`.

**The refusal is still there.** Asking for `physical` on a catalogue that cannot support it returns a refusal naming what is missing (`no level data...`, or unverified lines), an empty line list, and a `blocker` that travels all the way to the spectrometer. No downstream node ever receives an intensity that pretends to be physical. The two guards are `physicalDataBlocker` and `physicalModeBlocker`.

## Two catalogues, never mixed

| `line_catalogue` | Lines | Elements | Physical model |
|---|---:|---|---|
| `nist` (default) | 9 394 verified transitions | Ca, Fe, Si, each as the neutral atom, the ion and the doubly ionised atom | runs |
| `builtin` | 48 strong lines written from memory, all flagged unverified | 20 elements | refuses |

They are never combined: a spectrum built from verified and unverified numbers at once could not be interpreted. An element outside the chosen catalogue is reported in `missing_elements`, never silently dropped.

The NIST data is generated into `lines/nist-catalogue.data.ts` by `tools/build-nist-catalogue.mjs`, from the exports listed in `internals/libs/data/MANIFEST.md`, and carries the sha256 of every file it was parsed from.

## Mole fractions, not mass fractions

The node reads the material's **mole** (atom) fractions. A line is emitted by atoms: in iron oxide 69.94 % of the mass is iron but only 40 % of the atoms are. Feeding the mass vector would over-weight every heavy element's lines. The material node publishes both vectors so that this one can take the right one, and the choice is tested.

## Ports

| Direction | Slot | Type | Notes |
|---|---|---|---|
| in | `material_in` | any | An `IMaterialSpec` from `Chemistry.Material:material`, validated with the duck-typed `isMaterialSpecView` guard. Nothing wired means an empty line list, which is what a plasma without a sample emits. |
| out | `emission_out` | any | `IPlasmaEmission`: lines, missing elements, the plasma state that produced them, the composition's provenance, and `blocker`. |

The payload is a line list and not a sampled curve on purpose: a plasma emits transitions at their own wavelengths, and the observed window, the resolution and the pixel count belong to the instrument. Giving the plasma a grid would force it to carry parameters it has no business knowing.

The cable is a normal data cable rather than a dashed config-link, for the structural reason explained in `Chemistry.Material`'s own document: the config-link binding tables are hardcoded in two framework files and `PortType` is a closed union.

## Parameters

| Field | @editable | Default | Meaning |
|---|---|---|---|
| `temperature` | K | 10000 | Excitation temperature. Drives the Doppler width; drives nothing else in relative mode. |
| `electron_density_cm3` | number | 1e17 | Electron density in cm^-3. No `Quantity` class covers a number density, so the unit is in the name. |
| `reference_electron_density_cm3` | number | 1e17 | Density at which `collisional_width` is stated. |
| `collisional_width` | nm | 0.05 | Collisional FWHM at the reference density. One global number: a placeholder for tabulated per-line Stark coefficients. |
| `intensity_scale` | number | 1 | Global amplitude multiplier. |
| `continuum_level` | number | 0.02 | Flat continuum, in the same relative units as the lines. A stand-in for bremsstrahlung and recombination, which are not flat. |
| `emission_model` | string | `"physical"` | `"physical"` or `"relative"`. Any other value is ignored. |
| `line_catalogue` | string | `"nist"` | `"nist"` or `"builtin"`, see above. |

Every default is a **working value**, not a measured one. Their status is tracked in `internals/libs/parameters/libs-parameters.json`.

## Viewables

| Name | Notes |
|---|---|
| `line_count` | lines published for the current composition |
| `catalogue_size` | lines available in the catalogue in use |
| `material_name` | display name of the wired material, or `(nothing wired)` |
| `missing_elements` | elements of the composition the catalogue cannot emit. Not an error: information |
| `model_blocker` | empty when the requested model ran, the refusal otherwise |
| `collisional_width_applied` | the collisional FWHM actually used at the current density |
| `intensity_unit` | `eV/s per atom` or `relative`: the two models do not claim the same thing |
| `catalogue_provenance` | the database and version behind the current catalogue |
| `stage_fractions` | per element, how its atoms are shared between the neutral, singly and doubly ionised stages |
| `stages_solved` | per element, how deep the balance was actually solved: 3 is up to the doubly ionised atom |
| `partition_top_decile_share` | how much of a partition function comes from the top tenth of its level list. Large means the published list stops too early for this temperature |

## The catalogues, and what they are worth

`NIST_LINE_CATALOGUE` is NIST ASD 5.12 data, downloaded on 19 October 2026, restricted to transitions with a published transition probability (`line_out=1`). A line that exists in nature but has no `A_ki` is therefore absent from the model: when a real spectrum shows a line this model does not, that is the first thing to check.

`BUILTIN_LINE_CATALOGUE` is the MVP's own list, written from memory, every entry `verified: false`. It stays because it covers twenty elements where NIST covers three, and because it is the fallback that keeps a demonstration runnable. It cannot support the physical model, by construction.

`setCatalogue(lines, physicalData)` swaps both at once, which is how a future `Spectro.Lines` bank node will feed a selection. Passing no physical data makes the physical model refuse, which is the right outcome for a catalogue without level lists.

A line carries its element **and** its ionisation stage, so that nobody can write "one band equals one element": an element is a set of transitions, lines of different elements overlap, and at 10 000 K calcium's strongest lines belong to its ION, not to the neutral atom.
