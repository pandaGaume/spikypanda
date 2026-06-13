# motorwatch

Industrial port of the DriverV2 open-set recipe (reference book part V.2.1): a current
sensor discovers its machine's OPERATING REGIMES by itself, without labels, and signals
"a new regime appeared" to a central station. The central pushes ONNX diagnostic models
to the device AT RUNTIME to run a differential diagnosis, labels the regime, and the
label is referenced locally on the device and shared between sites.

Two sub-projects share the same application layer:

- **SP1: R385 brushed DC motor** (single current channel),
- **SP2: brushless (PMSM/BLDC) and squirrel-cage induction motors** (three channels),
  including broken-rotor-bar simulation with the classic MCSA stator-current sidebands
  at `f(1 +/- 2s)` (amplitude scaling with `broken_bars / total_bars`, cf.
  `docs/research/motor-current-mcsa-principles.md`).

## Where things live (placement rule: generic nodes in plugins, framework in core)

| Piece | Location |
|---|---|
| Load torque profiles (constant / step / ramp / quadratic / periodic) | `@spikypanda/plugin-physics` `Physics.Mechanical.Load:torque` |
| Squirrel-cage induction motor (broken-bar asymmetry) | `@spikypanda/plugin-physics` `Physics.Electric.Motor.Induction:dynamic` |
| Steady-state regime gate (hysteresis, captures ESTABLISHED states) | `@spikypanda/plugin-dsp` `DSP.Detect:steadystate` |
| Channel mux, multi-channel frames, tensor relayout | `@spikypanda/plugin-dsp` `DSP.Stream:mux`, `DSP.Stream:buffer` ([T,C]), `DSP.Tensor:transpose` |
| Open-set clustering (lib + node, NEW_REGIME alarm) | `@spikypanda/plugin-ml` `ML.Cluster:online` |
| Validated runtime model push (sha256 + I/O contract + double bank) | `@spikypanda/plugin-onnx` `OnnxModelGraph.loadModelValidated` |
| Fractal model streaming by port name (parent graph wiring) | core `RuntimeGraph` boundary ports |
| Business logic (this package) | catalog, federation, station, MCP-style protocol, device facade |

This package deliberately contains NO generic node: only the scenario logic.

## Acquisition contract (IEC 61430 / 61407 profile as specified by the owner)

Sensors own their sampling clock: the generic `DSP.Acquire:daq` node samples the
analog signal at **10.24 kHz** (2.56 x Fmax, Fmax = 4 kHz) on a SIM-TIME clock
(decoupled from the session tick rate; property tested at 20 kHz vs 200 kHz ticks)
and emits **2048-sample / 200 ms blocks** plus the per-block RMS. Consequences
wired into the demo graphs: the regime gate consumes block RMS at 5 Hz cadence
(no sample-level smoothing needed), and the MCSA FFT runs on full blocks
(2048 points = 5 Hz bins, resolving the f(1 +/- 2s) sidebands).

- `src/edge/device.ts`: `MotorwatchDevice`, the sensor-side facade. Owns the headless
  edge graph (source -> steady-state gate -> mux -> window -> transpose -> ONNX encoder
  -> open-set clusterer) plus a separate diagnostic model bank. Cold-start semantic:
  the FIRST profile is the silent baseline; each later new regime alarms exactly once.
- `src/protocol/mcp.ts`: transport-agnostic JSON-RPC-shaped contract modeled on the
  DriverV2 device API (tools `diagnostic_load_model`, `regime_current`,
  `catalog_apply_label`, `device_reset` (confirm required), `capture_set_profile`;
  notifications `alarm`, `diagnostic_result`, `catalog_updated`, `status`), wired
  in-process by `InProcessDeviceServer`.
- `src/central/station.ts`: subscribes to alarms, pushes the registered diagnostic
  model, reads the differential diagnosis `{topCause, score, runnerUp, margin}`,
  labels (or `regime_<k>_unlabeled` under the margin), applies the label centrally
  AND on the device.
- `src/central/regime.catalog.ts` + `src/central/federation.ts`: labeled centroid
  catalog (cosine lookup, export/import) and pure inter-site merge (majority vote,
  count-weighted centroids, site union): the "shared between sites" learning loop.

## Demo graphs (versioned, editable in node-editor v2)

`packages/host/www/data/graphs/`:

- `motor-r385.spikypanda`: the reusable DC motor block alone. The load is a SINGLE
  swappable wire into `tau_load` (replace the Load Torque node to reuse the motor
  block in any application; quadratic profiles read `omega` back).
- `motorwatch-r385.spikypanda`: motor block + monitoring chain + FFT/waterfall plots.
  Drop an encoder ONNX (input `current_window` [1,1,64], output `embedding`) on the
  model node and the graph becomes a live open-set monitor.
- `motor-induction.spikypanda` / `motorwatch-induction.spikypanda`: same structure,
  3-phase squirrel cage; set `broken_bars` > 0 live and watch the `f(1 +/- 2s)`
  sidebands rise in the MCSA spectrum while the clusterer raises NEW_REGIME.

The round-trip test (`packages/tests/motorwatch/graphs.roundtrip.test.ts`) loads these
files headless through the same wiring rules as the editor and proves the full chain,
including the runtime encoder push and the load-swap independence.

Note: a Sim.Graph encapsulation of the motor block is editor-only today (the saved
`subGraphJson` is not instantiated at load time), which is why the graphs are flat;
the single-wire load contract carries the reusability requirement instead.

## Tests

```
npx jest packages/tests/motorwatch          # central, r385 e2e, pmsm, induction, graph roundtrip
npx jest packages/tests/ml                  # open-set clustering lib + node
npx jest packages/tests/dsp                 # steadystate gate, mux, multi-channel buffer, transpose
npx jest packages/tests/onnx-plugin         # sha256 + validated model push + fractal streaming
npx jest packages/tests/physics/loadtorque.node.test.ts packages/tests/physics/induction-motor.test.ts
```

All ONNX models used by tests are synthesized on the fly through `OnnxGraphExporter`.
The two DEMO artifacts the editor graphs reference are exported (deterministically,
fixed weights) by `packages/tests/motorwatch/demo-models.export.test.ts` into
`packages/host/www/data/models/`:

- `motorwatch-encoder-demo.onnx`: drop it on the model node of `motorwatch-r385`
  (input `current_window` (1,1,64), output `embedding` (1,5)). DriverV2 topology:
  3x Conv1d + GlobalAveragePool + Gemm head, 493 fixed handcrafted parameters
  (NOT trained: training is the cahier part V.3 follow-up),
- `motorwatch-diagnostic-demo.onnx`: the 3-cause differential head
  (nominal / overload_step / fan_quadratic) in the shape the central station pushes.

Deleting them is safe: one run of that suite regenerates byte-identical files. Out of scope for now: a TRAINED industrial encoder and its
sim-to-real campaign (reference book part V.3), real transports (BLE/MQTT/WS), and
the ESP32 port.
