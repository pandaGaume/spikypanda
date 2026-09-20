# `@spiky-panda/factory`: headless jobs over SpikyPanda graphs

The factory is the Tier 0 side of the substrate used as a means of production:
it runs a graph without an editor, over a grid of settings, and writes what a
training step or a report needs. One entry point, `spikypanda-job <spec.json>`,
bundled into a single Node file so the same job runs on a laptop, in a
container, and on a serverless job platform, with the same spec and the same
outputs.

Three jobs ship: `sweep` (a graph over a grid of settings, to a dataset),
`fit` (a dataset to the ONNX model the device loads, with its contract) and
`evaluate` in its first form (that model judged against the oracle, to a
report with a verdict). The second form of `evaluate` (a language-model
provider on a scenario) is specified, not built.

Where these jobs sit in the tier architecture, who may call them and when
(before deployment, on alarm, periodically) is specified in
`docs/architecture/usine-jobs.fr.md`. This file is the operating manual.

## Run it

```sh
npm run bundle:factory
node packages/dev/factory/bundle/spikypanda-job.js packages/dev/factory/specs/rs385-tilt.json --out ./outputs
```

```
spikypanda-job <spec.json> [--out <dir>] [--dry-run]

  spec.json   a job specification; relative graph paths resolve against the spec file's directory
  --out       output directory; a <spec.name>/ folder is created inside.
              Default: spec.outputs.dir, then $NEBIUS_OUTPUT_DIR, then ./outputs
  --dry-run   validate the spec, load the graph once, print the plan, run nothing
  --version   print the runner version

exit codes: 0 completed, 1 failed while running, 2 input refused
```

Progress goes to stderr; the output directory is the only line on stdout.

## The spec

```json
{
    "version": 1,
    "job": "sweep",
    "name": "rs385-tilt",
    "graph": "../../../../report/rs385/graphs/rs385-complete.spikypanda",
    "run": { "dt": 0.0002, "duration": 1.0, "settle": 0.5 },
    "set": [{ "node": "drive", "property": "value", "value": 7 }],
    "grid": [
        { "node": "attitude", "property": "pitch", "values": [0, 45, 90] },
        { "node": "imbalance", "property": "severity", "range": { "from": 0, "to": 1, "step": 0.25 } }
    ],
    "record": [
        { "node": "motor",   "property": "angularVelocity", "as": "omega" },
        { "node": "motor",   "property": "armatureCurrent", "as": "current" },
        { "node": "housing", "property": "accelerationY",   "as": "accel_y" }
    ],
    "summary": [
        { "field": "omega",   "stat": "mean" },
        { "field": "current", "stat": "mean",   "as": "current_dc" },
        { "field": "current", "stat": "lockin", "as": "current_1x", "frequency": { "fromField": "omega", "kind": "angular" } },
        { "field": "accel_y", "stat": "lockin", "as": "vib_1x",     "frequency": { "fromField": "omega", "kind": "angular" } }
    ],
    "outputs": { "samples": false }
}
```

| Key | Meaning |
|---|---|
| `graph` | A version 3 `.spikypanda` document, as saved by the editor. |
| `run.dt`, `run.duration` | Tick period and simulated duration of one point, in seconds. The loop is the editor's without the animation frame: `session.run(k*dt)`. |
| `run.settle` | Samples before this time are left out of the summary window (the motor spinning up, buffers filling). |
| `set` | Settings applied to every point, before the grid. |
| `grid` | One axis per entry, `values` or an inclusive `range`; the job runs the cartesian product, first axis slowest. |
| `record` | Fields read from node instances after every tick. `as` names the column; default `<node>.<property>`. |
| `summary` | Window statistics per point: `mean`, `min`, `max`, `rms`, `lockin`. A lock-in needs a `frequency`: a constant `{ "hz": 50 }`, or the window mean of a recorded column read as an angular velocity (`kind: "angular"`, divided by 2π) or as hertz. |
| `outputs.samples` | Also write every tick of every point as JSON lines. |

A setting names a node by its saved id and a property. The runner prefers the
instance's public property (`pitch`), which runs the node's own setter; when
the property does not exist it falls back to the saved data key (`_pitch`),
with or without the underscore, through a full `deserialize`. Anything else
is refused with the list of what exists.

Validation is strict: an unknown key, a summary over a column that is not
recorded, a `settle` past the `duration`, all refuse the job before it runs,
naming the path (`spec.summary[0].field`). `--dry-run` goes one step
further and instantiates the document once, so a wrong node id or an
unresolved `typeId` is caught before a job platform bills a minute.

## What it writes

```
<out>/<name>/
  manifest.json      spec, graph path and sha256, grid size, timings, versions, per-point settings
  summary.json       one row per point: grid values and summary statistics
  summary.csv        the same, for a spreadsheet or pandas
  samples/           when requested: point-0000.jsonl ... one object per tick {t, <columns>}
```

`summary.csv` for the shipped spec, on the RS-385 complete montage (35 nodes):

```
point,attitude.pitch,omega_mean,current_dc,current_1x,vib_1x
0,0,704.18,0.99312,0.0072138,20.641
1,45,704.18,0.99312,0.0051010,20.641
2,90,704.18,0.99312,3.77e-17,20.641
```

The 1x current follows `cos(pitch)` and the centrifugal vibration does not
move: `report/rs385`, reproduced headless in 0.25 s for 3 x 5000 ticks.
`packages/tests/factory/sweep.test.ts` holds that line.

## The `fit` job

A dataset of steady-state (duty, current) pairs in, the scrubber health model
out: `expected = intercept + slope * duty_n`, `residual = |expected - current_n|`,
the residual being the clogging indicator. The ONNX layout is the one the
scrubber firmware already loads (`CyanMycelium/tools/make_health_onnx.py`):
Gemm (3 -> 4), Relu, Gemm (4 -> 2), input `features` [1,3] = (duty_n,
current_n, senseSpan_n), output `health` [1,2] = (expected, residual).
Normalisation stays on the device side, so the spec carries the full scales
the device declares.

```json
{
    "version": 1,
    "job": "fit",
    "name": "scrubber-health-bench",
    "model": "affine-residual",
    "dataset": { "file": "bench/scrubber-bench.csv", "duty": "duty_percent", "current": "current_amps" },
    "fullScale": { "duty": 100, "current": 1.0, "senseSpan": 100 },
    "domain": { "dutyMin": 0.15, "dutyMax": 0.8 },
    "monitor": { "residual": { "threshold": 0.04, "debounceCycles": 30, "severity": 350, "alarm": "drift.current" } },
    "outputs": { "file": "scrubber_health.onnx" }
}
```

| Key | Meaning |
|---|---|
| `dataset.file` | A JSON array (a sweep's `summary.json`), JSON lines or CSV; absolute, else next to the spec, else in the working directory. |
| `dataset.duty`, `dataset.current` | A column name, or `{ "column", "scale", "offset" }` to rescale into percent of full speed and amperes. |
| `fullScale` | The device's normalisation: the model works in `physical / fullScale`. |
| `domain` | Validity in normalised duty; rows outside are left out of the fit (below it the machine is stopped or starting and the friction term means nothing). |
| `monitor` | What the artifact declares once installed as a monitor: the alarm on the residual (threshold in normalised current, debounce in cycles, severity, alarm name), exactly what the firmware states in its `OutputSpec`. The thresholds live here and are copied verbatim into `contract.json`; `evaluate` judges against them and never receives thresholds of its own (`docs/architecture/usine-jobs.fr.md`, decision 3). |

What it does, in order: read, rescale, normalise, keep the rows in the
domain, least squares, serialize with the runtime's own ONNX writer, then
**parity**: parse the bytes back and run them through the runtime's ONNX
engine on every kept row against the closed form in double precision. The
tolerance is float32 rounding (1e-6); a failure refuses the job. Three more
refusals: fewer than two rows in the domain; a line that goes negative
inside it, which the file could not compute (`expected` passes through a
Relu); and a `monitor.residual.threshold` that does not clear the model's
worst-case error on the fit points, since an alarm set below the model's
own error would ring because of the model and not because of the machine.
The job neither chooses nor corrects the threshold: it checks and copies it. A normalised current above 1 is a warning that `fullScale.current` is
below what the machine draws.

```
<out>/<name>/
  scrubber_health.onnx   the artifact (370 bytes for this family)
  contract.json          sha256, expectInputShape [1,3], expectOutputCount 1, expectOutputShape [1,2],
                         input/output names, feature scales and domain, the monitor block (thresholds),
                         coefficients, fit quality, parity
  fit-report.json/.csv   per kept row: duty_n, measured_n, expected_n, residual_n
  parity.json            rows, max |error|, tolerance, ok
  manifest.json          spec, dataset path and sha256, timings, versions
```

`contract.json` speaks the vocabulary of `OnnxModelGraph.loadModelValidated`,
so the station can push the file with the same checks the device applies.
`fit.worstCaseError` is the number an alarm threshold has to clear.

Two specs ship. `scrubber-health-bench.json` fits the five steady-state
points documented in the firmware's generator (`specs/bench/scrubber-bench.csv`):
`expected = 0.0879 + 0.1611 * duty_n`, worst-case error 7.3 mA, parity 1e-8.
`packages/tests/factory/fit.test.ts` checks that the file has the same graph,
weights and interface as the one the firmware's generator writes for those
points (`fixtures/scrubber_health.reference.onnx`), so what the factory
emits is what the firmware already loads.

`scrubber-health-twin.json` (a test fixture here, a demo spec in
`co2-scrubber-governed-agent`) fits the RS-385 twin instead, from the
`rs385-drive` sweep (drive voltage 1 to 14 V, `duty = volts * 100 / 16`). Its `fullScale.current` is 4 A, because the twin draws up to 3 A on a 16 V
bus, and its `domain.dutyMin` is 0.1875 (3 V): below that the fitted line
goes negative and the job refuses it, as it should. The fit is honest about
what it finds: the twin drives a fan-law load,
so its current is not affine in duty (rmse 0.018, worst-case 0.031 in units of 4 A, on 10
points) where the real board, measured without the turbine, is (worst-case
0.007). The affine family is the firmware's V1; a quadratic term is the
next model, on the same interface.

## The `evaluate` job, first form: a monitor against the oracle

The artifact is run as the device runs it: the bytes, through the runtime's
ONNX engine, once per cycle, on the command of the moment and the mean
current of the cycle, normalised with the scales the contract declares; then
the alarm rule the contract declares (threshold, debounce in cycles,
validity domain). Nothing in this job knows the closed form of the model.
The thresholds come from the contract; the reaction time comes from the
scenario, because it is an operating requirement and not a property of the
monitor.

```json
{
    "version": 1,
    "job": "evaluate",
    "name": "scrubber-health-eval",
    "kind": "monitor-vs-oracle",
    "model": "affine-residual",
    "artifact": { "file": "outputs/scrubber-health-twin/scrubber_health.onnx", "contract": "outputs/scrubber-health-twin/contract.json" },
    "graph": "../../../../report/rs385/graphs/rs385-complete.spikypanda",
    "run": { "dt": 0.0002, "cycle": 1.0, "settle": 2.0 },
    "features": {
        "duty":    { "node": "drive", "property": "value", "scale": 6.25 },
        "current": { "node": "motor", "property": "armatureCurrent" }
    },
    "operatingPoint": [{ "node": "drive", "property": "value", "value": 7 }],
    "scenarios": [
        { "name": "nominal",    "duration": 40, "inject": [], "expect": { "alarms": 0 } },
        { "name": "fouling-x2", "duration": 60, "inject": [{ "at": 10, "node": "turbine", "property": "fanCoefficient", "value": 3.0e-8 }], "expect": { "alarmWithin": 45 } }
    ]
}
```

| Key | Meaning |
|---|---|
| `artifact` | The `.onnx` and its `contract.json`. The job refuses a file whose sha256 is not the contract's, or whose shapes are not the family's. |
| `run.cycle` | The monitor's evaluation period in simulated seconds: the firmware's one-second cycle, which the contract's `debounceCycles` counts. |
| `features` | Where the monitor's inputs come from in the graph, rescaled to physical units (percent, amperes); the contract's scales then normalise them. |
| `operatingPoint` | Settings applied to every scenario first. |
| `scenarios[].inject` | Faults as the oracle injects them: at `at` seconds, a node property takes a value (here the turbine's aerodynamic coefficient doubles: fouling). |
| `scenarios[].expect` | `{ "alarms": 0 }` for a nominal scenario (no alarm tolerated), or `{ "alarmWithin": T }`: an alarm at most `T` seconds after the injection, and none before it. |

Per cycle: a command outside the validity domain is not evaluated; a residual
above the threshold increments a counter, otherwise resets it; the alarm is
raised on the cycle the counter reaches the debounce. One alarm per scenario.

```
<out>/<name>/
  report.json            per scenario: first alarm, delay from the injection, expectation, pass and why;
                         the four confusion counts; the verdict (pass only if every scenario passes)
  trace/<scenario>.jsonl per cycle: command, current, normalised inputs, expected, residual, counter, alarm
  manifest.json          sha256 of the artifact, the contract and the graph; the report id (sha256 of report.json)
```

The report id is what a registration at Tier 2 refers to. A negative
verdict is a result, not an error: the job exits 0 with the verdict in the
report; only a refused input exits 2.

The T0 chain on the twin (sweep, fit, evaluate) is a demo, so its specs live
in the demo repository, `co2-scrubber-governed-agent`, under `specs/`; copies
serve as test fixtures in `packages/tests/factory/specs/`.

Measured on 2026-09-16: 100 simulated seconds in 5.4 s. The twin at rest
(7 V, 43.75 %) leaves a residual of 0.0197 under the 0.04 threshold; doubling
the turbine's coefficient at 10 s raises the current from 0.993 A to 1.51 A,
the residual to 0.11, and the alarm comes at 40 s, exactly one debounce
after the injection. Verdict pass, confusion TP 1, FN 0, FP 0, TN 1.
`packages/tests/factory/evaluate.test.ts` runs this chain in process.

## How it loads a document

The same steps as the editor's session builder, without a canvas: create
every saved node through the registry, deserialize its data, wire one
channel per saved connection between runtime nodes (config wires such as
`scene_out -> scene` land on GraphItems and are skipped, and a `fault`-typed
source port becomes an ApplyTo relation), auto-fill the root solvers, and
bind the root Scene item to the session so gravity, time scale and the
effective rate come from the document.

The registry activates the physics, dsp, ml, logic, control and onnx
plugins against a context with no editor. Geometry nodes are registered
from their classes (the plugin index also registers a 3D editor), and
`Viz.Plot:*` are stubs that drain their input.

## On a serverless job platform

The bundle is the only artifact that runs outside a bundler with no setup:
`bundle/spikypanda-job.js` is shipped in the package (`bin: spikypanda-job`),
and `dist/` is rewritten after `tsc` so that Node resolves it too
(`scripts/fix-esm-dist.mjs`). The container image that runs the jobs on a
job platform (Nebius Serverless AI: a public image run once on a VM, the spec
injected as a file, the outputs on a mounted bucket) is a demo object and is
built in the demo repository, `co2-scrubber-governed-agent`, from the
published package plus the demo's graphs and specs. `NEBIUS_OUTPUT_DIR`, when
the platform sets it, is honoured as the default output directory.
