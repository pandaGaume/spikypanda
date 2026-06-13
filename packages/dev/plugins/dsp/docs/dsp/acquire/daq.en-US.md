# DAQ (block acquisition)

`DSP.Acquire:daq`

Sensor acquisition front-end: samples the upstream analog signal on **its own clock**, decoupled from the session tick rate, and delivers **blocks** of samples together with the **block RMS**. The simulated counterpart of a DAQ card (ADC + block buffer) as practiced by machine condition-monitoring standards.

## Acquisition profile (project IEC 61430 / 61407 requirement)

The defaults embody the mandated profile:

| Quantity | Value | Why |
|---|---|---|
| `sample_rate_hz` | **10 240 Hz** | the condition-monitoring **2.56 x Fmax** factor, with Fmax = 4 kHz analysis bandwidth |
| `block_size` | **2048 samples** | power of two (fast FFT path) |
| Block duration | **200 ms** | `block_size / sample_rate_hz` (exposed as a read-only viewable) |
| Spectral resolution | **5 Hz** | `fs / N`: what actually separates MCSA sidebands at f(1 +/- 2s) (~ +/- 10 Hz) |
| `aa_cutoff_hz` | **4000 Hz** | Fmax: the anti-aliasing stage (1-pole, standing in for the ADC brick-wall filter) cuts above the analysis band |

## The clock belongs to the sensor

Sampling instants are `t0 + k / fs` in **simulated time**: whether the session ticks at 20 kHz or 200 kHz (e.g. forced by a PWM inverter leaf), the produced blocks are the same (tested property). Between ticks the value is held (zero-order hold); when the session runs SLOWER than `fs`, several consecutive instants capture the same held value: a documented degraded mode, never an error.

## Outputs

- `block`: tensor `[block_size]` (independent copy, safe to hold downstream), one publish per completed block;
- `rms`: the scalar block RMS. This is **the natural input of the regime gate** (`DSP.Detect:steadystate`): at block cadence (5 Hz), switching ripple and sensor noise average out, no sample-level smoothing is needed.

## Typical chain (MCSA monitoring)

```
current sensor -> DAQ -> block -> Window (Hann) -> FFT 2048 -> spectrum (5 Hz bins)
                      -> rms   -> Steady-State Gate (settle/breakHold in BLOCKS)
                      -> block -> Frame(64, hop 2048) -> transposes -> ONNX encoder
```

## Pitfalls

- **Wired but starved input**: the node only fires when its wired input receives a token; no token, no clock progress. Unwired, it samples 0 every tick.
- **Changing `sample_rate_hz` or `block_size` mid-run**: the clock re-arms and the partial block is dropped (`block_count` is not reset).
- **Huge time jumps** (free-mode catch-up): several blocks may complete within one fire; outputs tolerate 4-block bursts, beyond that the channel overflow is deliberate.
- `anti_alias` off: the sampler reads the raw held value; anything above fs/2 folds into the band.
