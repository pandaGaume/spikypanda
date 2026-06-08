# FFT

`DSP.Transform:fft`

Discrete Fourier transform of a real-valued time-domain frame. Returns the complex spectrum, packed as a tensor. Pair it with `DSP.Frame:frame` upstream (to window and slice the buffer) and `Viz.Plot:spectrum` downstream (to visualise).

Compliance: **onnx 1.18**, **ue5 5.4**.

## What the node consumes

The FFT eats one **frame** at a time: a Float32 tensor of length `N`, where `N` should be a power of two for the FFT kernel to take the fast path. Typical sources:

- `DSP.Frame:frame` — slices a streaming `Buffer` into hop-overlapped frames.
- `DSP.Generator:oscillator` followed by `DSP.Window:window` — for synthetic test stimuli.

## What it emits

A complex spectrum laid out as `[re_0, im_0, re_1, im_1, ..., re_{N/2}, im_{N/2}]` (the one-sided positive-frequency representation), length `N + 2`. Two convenience downstream nodes unpack it:

- `DSP.Transform:magnitude` — `|X[k]|` per bin.
- `DSP.Transform:phase` — `atan2(im, re)` per bin.

## Frequency axis

The bin centre frequency is

```
f[k] = k · fs / N
```

where `fs` is the **sample rate of the upstream Frame node**, not the runner's simRate. Mismatching these is the most common source of "my peak is in the wrong place" bugs.

## Pitfalls

- **Windowing.** Feeding a raw frame (no window) into the FFT scallops the peaks against the rectangular-window sinc. Always wire `DSP.Window:window` between Frame and FFT.
- **Power-of-two N.** If N is not a power of two, the kernel falls back to a slower mixed-radix path. Use 256, 512, 1024, 2048, 4096.
- **DC bias.** Subtracting the mean of each frame before windowing avoids a giant bin 0 that masks low-frequency content.

## MCSA chain reminder

```
CurrentSensor -> Buffer -> Frame -> Window -> FFT -> Magnitude -> Spectrum
```

For motor-current signature analysis on a brushed DC drive switching at `f_pwm = 10 kHz`, a frame of `N = 4096` at `fs = 200 kHz` gives a bin width of ~49 Hz — fine enough to resolve the bearing-fault sidebands typically a few hundred Hz off the carrier.
