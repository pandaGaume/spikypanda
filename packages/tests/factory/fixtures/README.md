# Fixtures

`scrubber_health.reference.onnx` (387 bytes) was produced on 2026-09-16 by the
scrubber firmware's own generator, `CyanMycelium/tools/make_health_onnx.py`:

```sh
python tools/make_health_onnx.py -o scrubber_health.reference.onnx \
    --fit "0.15:0.1054,0.25:0.1312,0.35:0.1515,0.45:0.1631,0.55:0.1700"
```

Those five points are `packages/dev/factory/specs/bench/scrubber-bench.csv` in
physical units. The fit test checks that the factory's `fit` job writes a model
with the same graph, the same weights and the same interface as this file, so
what the factory emits is what the firmware already loads.
