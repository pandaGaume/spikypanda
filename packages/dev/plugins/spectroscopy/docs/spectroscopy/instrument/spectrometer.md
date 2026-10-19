# LIBS Spectrometer

`Spectro.Instrument:spectrometer`

The measurement stage. Samples a plasma's line list onto a pixel grid and reports three curves that stay separable.

## What an instrument does to a spectrum

A spectrometer does not see lines, it sees pixels. Four effects sit between the plasma and the numbers a user reads:

1. **the window and the sampling**: a range of wavelengths spread over a finite pixel count, so a line is sampled, never measured exactly;
2. **the slit function**: every line is blurred by the optics and the slit, modelled here as a Gaussian of FWHM `resolution_fwhm`. This is usually the dominant width in LIBS, well above the Doppler width;
3. **the wavelength calibration**: the map from pixel to wavelength is a measured polynomial, and its error displaces every line on the reported axis;
4. **noise**: photon shot noise, which grows as the square root of the signal, and additive read noise.

## Three curves, kept separate

| Output | What it is |
|---|---|
| `ideal_out` | the plasma's own emission plus the continuum, with Doppler and collisional widths only. No instrument. |
| `instrumented_out` | the same folded with the slit function, displaced by the calibration error, times `gain`, plus `offset`. |
| `measured_out` | `instrumented` plus noise. What a detector would report. |
| `noise_out` | the noise sample alone. |

`measured - noise` is exactly `instrumented`, and an overlay of `ideal` against `measured` reads off what the instrument did. Test V1-A of the LIBS brief needs precisely that separation to tell a calibration error from a model error, which is why the curves are ports and not an internal detail.

## The slit function is folded into the line, not applied to the curve

Widths add in quadrature for Gaussians, so the slit function is folded into each line's Gaussian width **before** sampling, instead of smoothing an already-sampled spectrum. The reason is in the brief's own test list: broadening must not move a line's centre. Convolving a sampled curve displaces peaks by up to half a pixel, because the sharp line was first quantised onto the grid. Folding the width in keeps the centre exact and conserves the line's area, and both are tested.

The calibration error, by contrast, belongs to the instrument stage only: it displaces the lines of `instrumented` and `measured` while leaving `ideal` where the physics puts them.

## Ports

| Direction | Slot | Type | Notes |
|---|---|---|---|
| in | `emission_in` | any | `IPlasmaEmission` from `Spectro.Libs:plasma`, validated with `isPlasmaEmission`. Nothing wired gives a flat zero curve of the right length, which is what a spectrometer reads in the dark. |
| out | `spectrum_out` | any | The full `ISpectrum1D` record: the four curves, the unit, the simulation id, the seed, the line count and any blocker. |
| out | `wavelength_out` | any | `Float64Array`, the reported axis in nm. Wire it to a chart's `x`. |
| out | `ideal_out` | any | `Float32Array`. |
| out | `instrumented_out` | any | `Float32Array`. |
| out | `measured_out` | any | `Float32Array`. |
| out | `noise_out` | any | `Float32Array`. |

## Parameters

| Field | @editable | Default | Meaning |
|---|---|---|---|
| `range_start` | nm | 200 | Window start. Refused if not below `range_end`. |
| `range_end` | nm | 900 | Window end. |
| `pixel_count` | number | 3500 | Samples across the window. The grid is affine; a real pixel-to-wavelength map is a polynomial, which is a listed approximation. |
| `resolution_fwhm` | nm | 0.1 | Slit-function FWHM. 0 means a perfect instrument. |
| `calibration_shift` | nm | 0 | Systematic calibration error. Displaces `instrumented` and `measured`, never `ideal`. |
| `gain` | number | 1 | Multiplies the instrumented curve. |
| `offset` | number | 0 | Added to the instrumented curve, like a dark level. |
| `noise_enabled` | boolean | false | Off by default so a first spectrum is readable. |
| `shot_noise_factor` | number | 0.01 | Shot-noise strength: sigma = sqrt(signal x factor). |
| `read_noise` | number | 0.002 | Additive noise standard deviation. |
| `seed` | number | 1 | PRNG seed. Same seed, same noise vector, on any machine. |

## Reproducibility

Noise comes from a seeded generator (mulberry32 plus Box-Muller), so a spectrum is reproducible from its parameters alone. `simulation_id` is a deterministic 8-character hash of the composition, the plasma state, the instrument parameters, the provenance and the catalogue size: two spectra that differ in any of those never share an id, and two runs of the same configuration always do.

The curves are **not** part of the node's serialised state. A saved document carries the parameters and the seed, which reproduce them exactly, rather than a few thousand numbers rewritten on every edit.

## What is not modelled

The shot-to-shot plasma fluctuation, which dominates real LIBS repeatability, is not here: it belongs to the plasma stage. Neither is the wavelength-dependent instrument efficiency, which multiplies a real spectrum by a curve that varies strongly from 200 to 900 nm. Both are on the track's list, and until they exist a `measured` curve from this node is smoother and more honest-looking than a real acquisition.

## Unit

Whatever the emission stage published, and the two are different claims: `eV/s per atom` in the physical model (ratios are physical, the overall scale is unknown because the ablated mass is not modelled) or `relative` in the relative model (no physics in the ratios either). Never a radiometric unit at this version. A chart should label the Y axis from `spectrum_out.unit` rather than assume.
