# Graph Architecture, Runtimes, and Validation

This document describes the compute layer of SpikyPanda end-to-end: the
graph types and how they relate, the runtimes that execute them, the
algorithms behind each runtime, and the validation strategy that keeps
the whole stack honest. It is the single reference for "how does
inference actually run" and "why we trust it."

A French version is available at
[graph-runtime-architecture.fr.md](graph-runtime-architecture.fr.md).

---

## 1. Graph layer

SpikyPanda has two graph families that coexist:

1. **Domain graphs** (`IGraph<N, L>`) for neural networks expressed as
   neurons + synapses. MLP, CNN and RNN (LSTM/GRU) all specialize this
   shape with their own neuron and synapse types. These are the graphs
   you build with the `MlpBuilder`, `CnnBuilder`, etc. They are good for
   training, structural plasticity, and family-specific algorithms.

2. **Compute graphs** (`IComputeGraph`) for tensor-flow programs
   expressed as kernels + data links. ONNX models load into this shape.
   Each node is an `IKernel` with an `execute(inputs[]): outputs[]`
   contract; each edge is an `IDataLink` carrying an `ITensor` from a
   producer slot to a consumer slot.

The two families are bridged by exporters (domain graph → ONNX bytes)
and importers (ONNX bytes → `ComputeGraph`). Quantization, profiling
and deployment travel through the compute-graph side because that is
the format ONNX, onnxruntime and CyanMycelium all understand.

### 1.1 Base contracts (`packages/dev/core/src/compute/`)

| Type            | File                       | Role                                                                |
| --------------- | -------------------------- | ------------------------------------------------------------------- |
| `ITensor`       | `compute.interfaces.ts`    | `Float32Array` payload + `shape: number[]` + optional `name`, optional `quantization` metadata. |
| `IDataLink`     | `compute.interfaces.ts`    | Directed edge; narrows `IChannel<ITensor>` with a positional `slot` (ONNX input ordering). |
| `IKernel`       | `compute.interfaces.ts`    | Compute node: `execute(inputs: ITensor[]): ITensor[]` + per-node `outputShapes`. |
| `IComputeGraph` | `compute.interfaces.ts`    | `IRuntimeGraph<IKernel, IDataLink>`; DAG of kernels under static scheduling. |
| `Kernel`        | `compute.node.base.ts`     | Abstract base: gathers inputs by slot, calls `execute`, caches `bag.lastOutputs`, publishes downstream. |

The optional `quantization?: IQuantizationParams` field on `ITensor` is
informational metadata for fake-quant tensors (see §3). It never
changes the `data` dtype, which always remains `Float32Array`.

### 1.2 Concrete compute graphs

* **`ComputeGraph`** (`compute.graph.ts`) extends `RuntimeGraph<IKernel, IDataLink>`. It owns `nodes`, `links`, and exposes `infer(externalInputs?): Map<string, ITensor>` which injects named tensors into source kernels, runs one tick of the scheduler, and collects sink outputs by name.
* **`OnnxGraph`** (`packages/dev/onnx/src/onnx/onnx.graph.ts`) is a thin subclass of `ComputeGraph` hard-coded to `mode: "static"` (Kahn topological scheduling). Models built by `OnnxGraphBuilder` materialize here.

### 1.3 Domain graphs

Each family lives under `packages/dev/core/src/neuralnetwork/`:

* **MLP** (`ann/mlp/`)
  * `IMlpNeuron` (bias + optional activation), `IMlpSynapse` (weight), `IMlpGraph = IGraph<IMlpNeuron, IMlpSynapse>`.
  * `MlpBuilder` chains `.withDenseLayer(...)` → `.build()`.

* **CNN** (`cnn/`)
  * `CnnLayerType` enum: `Input | Conv | Pool | Flatten | Dense | Upsample | Reshape`.
  * `ICnnNeuron` carries spatial metadata (row, col, channel, layer type, pool type) + `bag` for runtime state.
  * `IConvKernel` holds shared weights (height, width, inputChannels, weights, bias) referenced by `ICnnSynapse`.
  * `ICnnLayerDescriptor` is the per-layer summary: type, spatial dims, ordered neuron list, kernel size, stride, padding, conv kernels.
  * `ICnnGraph = IGraph<ICnnNeuron, ICnnSynapse> + kernels + layerDescriptors`.
  * `CnnBuilder` chains `.withInputLayer().withConvLayer().withPoolLayer().withDenseLayer().build()`.
  * **Neuron ordering for Conv layers is filter-major**: index = `f * H * W + h * W + w`, which matches NCHW row-major layout. This is critical for ONNX export compatibility.

* **RNN** (`rnn/`)
  * `RnnCellType` enum: `LSTM | GRU`.
  * `IRnnNeuron<B>` carries `hiddenState`, `resetState()`, plus cell-specific state (`cellState` and four gate biases for LSTM; two gates + candidate bias for GRU).
  * `IRnnSynapse` carries multi-weight gates (4 for LSTM, 3 for GRU).
  * State persists across `step()` calls; `run(sequence)` iterates.

### 1.4 Quantized variant

A quantized CNN is not a new compute graph: it is metadata wrapping the
FP32 `ICnnGraph`. In `packages/dev/core/src/neuralnetwork/cnn/quantization/`:

* `QuantizedCnnLayer`: per-layer record (type, spatial dims, int8 `QuantizedBuffer` for weights, FP32 bias, output `IQuantizationParams` from calibration, kernel/stride/padding/pool/activation metadata).
* `QuantizedCnnGraph`: frozen `{ source: ICnnGraph, layers: QuantizedCnnLayer[], inputParams }`.
* `QuantizedCnnGraphBuilder.fromCalibration(cnn, calib)` assembles a `QuantizedCnnGraph` by quantizing the source CNN's weights with the family-appropriate scheme (per-channel symmetric for Conv, per-tensor symmetric for Dense) and folding in the per-layer activation parameters from calibration.

The quantized graph is not executable on its own; it is the input to the
ONNX exporter (see §3.3).

### 1.5 Hierarchy diagram

```text
IComputeGraph
└── ComputeGraph (static scheduling)
    └── OnnxGraph (mode = "static", QLinear-aware via op registry)

IGraph<N, L>
├── IMlpGraph (IMlpNeuron, IMlpSynapse)
├── ICnnGraph (ICnnNeuron, ICnnSynapse, +kernels, +layerDescriptors)
│   └── wrapped by QuantizedCnnGraph (FP32 graph + int8 weights + activation params)
└── IRnnGraph (IRnnNeuron, IRnnSynapse)
    ├── LSTM (4 gates, hidden + cell state)
    └── GRU  (2 gates + candidate, hidden state)

Exporters / importers:
  ICnnGraph        ── CnnGraphOnnxExporter           ──► ONNX bytes
  QuantizedCnnGraph── QuantizedCnnGraphOnnxExporter  ──► ONNX bytes (QLinear ops)
  ONNX bytes       ── OnnxParser + OnnxGraphBuilder  ──► ComputeGraph
```

---

## 2. Runtime layer

### 2.1 The dispatcher: `readyQueueDispatch`

File: `packages/dev/core/src/graph/graph.dataflow.ts`.

This is the topological event-driven core that every neural-network
runtime uses. The signature:

```ts
readyQueueDispatch<N extends INode, L extends IOlink>(
    graph: IGraph<N, L>,
    options: IReadyQueueDispatchOptions<N, L>
): void
```

Algorithm in plain words:

1. Initialize a per-node "remaining inputs" counter to its in-degree;
   seeds are zeroed so the queue starts with them.
2. Pop the front of a FIFO ready queue.
3. For each outgoing edge of that node, call `propagate(source, target, edge)` to update the target's accumulator, then decrement the target's counter.
4. When a target's counter reaches zero, call `fire(target)` (which produces its output) and enqueue it.
5. Repeat until the queue drains.

This is fan-in driven, not layer driven. A node fires the instant all
its predecessors have fired. Layered topologies emerge naturally from
the input wiring.

### 2.2 MLP inference

File: `packages/dev/core/src/neuralnetwork/ann/mlp/mlp.inference.ts`.

`MLPInferenceRuntime.run(inputValues)` seeds the input neurons
(`activation = input`, `remainingInputs = 0`) and calls
`readyQueueDispatch` with:

* `propagate(src, tgt, syn): tgt.sum += src.activation * syn.weight`
* `fire(n): n.activation = activationFn(n.sum + n.bias)`

No explicit layer iteration; the topology determines the schedule.

### 2.3 CNN inference

File: `packages/dev/core/src/neuralnetwork/cnn/cnn.inference.ts`.

`CnnInferenceRuntime` uses the same dispatcher but dispatches on
`target.layerType` for the per-layer accumulation policy:

| Target layer        | propagate                                       | fire                                  |
| ------------------- | ----------------------------------------------- | ------------------------------------- |
| Conv / Dense        | `sum += src.activation * syn.weight`            | `activation = fn(sum + bias)`         |
| Pool (Max)          | `sum = max(sum, src.activation)` (first input seeds) | `activation = sum`                   |
| Pool (Avg)          | `sum += src.activation`                         | `activation = sum / totalInputs`      |
| Flatten / Input / Reshape / Upsample | `sum = src.activation`                | `activation = sum`                    |

Bias is added at `fire()`, not at `propagate()` (so it is counted once
per output neuron, not once per incoming edge).

### 2.4 RNN inference

File: `packages/dev/core/src/neuralnetwork/rnn/rnn.inference.ts`.

Two entry points:

* `step(inputValues)` runs one timestep and updates `hiddenState` (and `cellState` for LSTM) in place on each neuron.
* `run(sequence)` calls `step` over a list of inputs and returns the list of outputs.

For LSTM, each timestep accumulates four gate sums in parallel
(`sum_forget`, `sum_input`, `sum_candidate`, `sum_output`) from both
the input edges and the recurrent edges (using the *previous* hidden
state). At `fire()`:

```
forget    = sigmoid(sum_forget    + bias_forget)
input     = sigmoid(sum_input     + bias_input)
candidate = tanh   (sum_candidate + bias_candidate)
output    = sigmoid(sum_output    + bias_output)
cellState = forget * cellState + input * candidate
hiddenState = output * tanh(cellState)
```

GRU is the same shape with two gates (reset, update) and a candidate.

State is owned by the neuron, not the runtime: `resetState()` is the
only way to clear it. This makes the runtime stateless and reentrant
for the framework, while the persistent context lives with the model.

### 2.5 ONNX op execution: `ComputeGraph.infer`

File: `packages/dev/core/src/compute/compute.graph.ts`.

```ts
public infer(externalInputs?: Map<string, ITensor>): Map<string, ITensor> {
    this._injectExternalInputs(externalInputs);
    this.run(0);
    return this._collectResults();
}
```

The mechanics:

1. **Inject** named tensors onto source kernels' `bag.pendingInput`,
   keyed by the kernel's id/tag.
2. **Run one tick** of the static scheduler (Kahn topological order).
3. For every kernel, `Kernel.fire(session, t)`:
   * gathers inputs from incoming `IDataLink`s in slot order,
   * calls the concrete `execute(inputs[])`,
   * stores outputs in `bag.lastOutputs` for sink collection or
     debugging,
   * publishes outputs to outgoing channels.
4. **Collect** sink outputs into a `Map<string, ITensor>` keyed by the
   output names declared in the graph spec.

Each `OnnxOpNode` (`packages/dev/onnx/src/onnx/registry.ts`) is a
concrete `Kernel`. Its `execute` is the pure tensor-in / tensor-out
implementation of one ONNX op; the rest is plumbing inherited from the
base class. This makes per-op kernels small and uniform; adding a new
op is "register a factory + write the math."

### 2.6 Activations

File: `packages/dev/core/src/neuralnetwork/ann/mlp/mlp.activation.ts`.

`ActivationFunctions` exports `relu`, `sigmoid`, `tanh`, `linear`. They
are wired per-neuron (`n.activationFn`) and applied at `fire()`, after
bias addition. There is no "activation layer" object; the activation is
a property of the producing neuron.

---

## 3. Quantization pipeline (Phase 7)

### 3.1 Conventions (CyanMycelium-compatible)

The quantization stack targets CyanMycelium for ESP32 deployment and
follows its conventions strictly:

* **int8 grid** `[-128, 127]` with `-128` reserved as the asymmetric
  guard slot; weights live on `[-127, 127]` (symmetric).
* **Weights**:
  * Conv: per-channel symmetric on the filter axis (one scale per
    output channel). Zero point is always 0.
  * Dense: per-tensor symmetric (one scale for the whole matrix).
* **Activations**: per-tensor asymmetric (one scale + one zero point per
  tensor). Real zero is preserved on the grid.
* **Rounding**: banker's rounding (round-half-to-even, matching
  `nearbyintf` with `FE_TONEAREST` on the C side).
* **Layout**: Conv weights are stored OIHW (`[F, Cin, kH, kW]`), which
  is what ONNX `QLinearConv` expects.
* **Bias for QLinearConv**: int32, pre-scaled to the compound scale
  `(x_scale * w_scale[f])`. Bias for Dense is added in FP32 after
  dequantize (see §3.3).
* **Operator set**: `QuantizeLinear`, `DequantizeLinear`, `QLinearConv`,
  `QLinearMatMul`. No QDQ-pair format; CyanMycelium expects QLinear
  ops directly.

### 3.2 Core primitives

`packages/dev/core/src/quantization/`:

| File                                    | Contents                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `quantization.interfaces.ts`            | `QuantDType`, `QuantScheme`, `IQuantizationParams`, `IQuantizedTensor`, `isInt8QuantizedTensor`     |
| `quantization.math.ts`                  | `roundHalfEven`, `dtypeBounds`, `quantizeScalar`, `dequantizeScalar`, `asymmetricParamsFromRange`, `symmetricParamsFromAbsMax`, `quantizeTensor`, `dequantizeTensor`, `fakeQuantizeTensor` |
| `quantization.calibration.ts`           | `ICalibrationStrategy`, `MinMaxStrategy`, `CalibrationRunner.observe(samples)`                      |
| `quantization.weights.ts`               | `WeightQuantizer.{perTensorSymmetric, perChannelSymmetric, perTensorAsymmetric, dequantize}`, `QuantizedBuffer` |

`MinMaxStrategy` is the only finalizer implemented today: it tracks
running `min, max` across samples, then derives asymmetric params via
`asymmetricParamsFromRange`. Percentile / entropy / KL strategies are
future work; the interface is open.

### 3.3 CNN-specific marshallers

`packages/dev/core/src/neuralnetwork/cnn/quantization/`:

* **`cnn.weights.ts`**
  * `extractConvLayerWeights(kernels, inputChannels)` repacks shared kernels into OIHW.
  * `extractDenseLayerWeights(denseDesc, prevDesc)` walks synapses, builds `[units, prev_size]` row-major. Column order matches `prevDesc.neurons`, which is itself filter-major for a Conv predecessor (so the dense flatten order matches ONNX `Flatten` of an `[1, F, H, W]` tensor).
  * `quantizeConvLayer` → per-channel symmetric, axis 0.
  * `quantizeDenseLayer` → per-tensor symmetric.

* **`cnn.calibration.ts`**
  * `CnnLayerCalibrationHelper.observe(cnn, runtime, samples)` runs `CnnInferenceRuntime.run(sample)` for each calibration sample, then reads `neuron.bag.activation` for every neuron in every layer descriptor to reconstruct per-layer output tensors. Returns `{ inputParams, layerOutputParams[] }` plug-compatible with `QuantizedCnnGraphBuilder`.

* **`cnn.quantized.graph.ts`**
  * `QuantizedCnnGraphBuilder.fromCalibration(cnn, calib)` walks `cnn.layerDescriptors`, quantizes Conv and Dense weights, copies pool/flatten metadata, attaches activation params, and freezes the result.

### 3.4 ONNX export

File: `packages/dev/onnx/src/onnx/export/cnn/cnn.quantized.export.ts`.

`QuantizedCnnGraphOnnxExporter.emit(qcnn, inputName, outputName, ctx)`
walks the quantized layers and produces this canonical op chain:

```text
inputName (FP32)
  ─► QuantizeLinear                                        (FP32 → int8 stream)
  ─► QLinearConv  [fused Relu via y_scale/y_zp saturation]
  ─► (more QLinearConv layers if any)
  ─► AveragePool / MaxPool                                 (operates directly on int8)
  ─► Flatten                                               (no-op reshape)
  ─► QLinearMatMul                                         (int8 dense)
  ─► DequantizeLinear                                      (int8 → FP32)
  ─► Add (FP32 bias)                                       (Dense bias in FP32)
outputName (FP32)
```

Three patterns are worth singling out because they are easy to get
wrong:

1. **Relu is fused into QLinearConv, not emitted as a separate node.**
   The post-Relu activation calibration yields `y_zp = -128`, which
   represents real `0` on the int8 grid. Any negative pre-activation
   value saturates to `-128` inside `QLinearConv`. Emitting a separate
   ONNX `Relu` after the int8 output would clip the *integer
   representation* (treating `-92` as a number to clamp to 0), which
   maps to real `(0 + 128) * y_scale ≈ y_scale * 128` and destroys the
   output. The exporter therefore omits the explicit Relu and asserts
   that no other activation is supported on Conv layers yet.

2. **Dense bias is added in FP32 after `DequantizeLinear`.**
   Standard ONNX `Add` does not accept int8 operands; onnxruntime
   rejects such graphs as invalid. The exporter emits
   `QLinearMatMul → DequantizeLinear → Add(fp32 bias)`. When Dense is
   the terminal layer (typical CNN case), this dequantize also serves
   as the graph-exit dequantize, so there is no trailing
   `DequantizeLinear` node.

3. **Conv bias is int32, pre-scaled to the compound scale.**
   `bias_int32[f] = round(bias_fp32[f] / (x_scale * w_scale[f]))`. The
   QLinearConv accumulator adds `bias_int32` directly to the integer
   matmul, then scales by the compound scale, then re-quantizes against
   `y_scale, y_zp`.

### 3.5 ONNX import (fake-quant TS kernels)

File: `packages/dev/onnx/src/onnx/ops/quant.ts`.

The TS side does not introduce an int8 `ITensor` type. Instead, every
tensor remains `Float32Array`, and the QLinear kernels simulate int8
arithmetic in FP32 with an explicit `quantization` metadata field on
the output. This is the "fake-quant" path: numerically equivalent to
real int8, but staying on the framework's existing FP32 spine.

Implemented kernels:

* `QuantizeLinearNode`: `q = clamp(round(x / scale) + zp, [-128, 127])`. Output `ITensor.data` is FP32 carrying integer values; `quantization` is set.
* `DequantizeLinearNode`: `out = (x - zp) * scale`. Output is pure FP32; `quantization` cleared.
* `QLinearConvNode`: 4D NCHW convolution. The accumulator is FP64 (more than enough for our ranges), built from `(x - x_zp) * (w - w_zp)` plus the pre-scaled int32 bias, then multiplied by the compound scale and requantized against `y_scale, y_zp`.
* `QLinearMatMulNode`: 2D matmul, same structure, per-tensor scales.

Initializer support in `packages/dev/onnx/src/onnx/registry.ts` was
extended so `getInitializerData` returns properly-typed views for
INT8 / INT32 / UINT8 in addition to the existing FLOAT and INT64.

Registration is one call:

```ts
registerQuantOps(registry);   // QuantizeLinear, DequantizeLinear, QLinearConv, QLinearMatMul
```

Already wired into `createDefaultRegistry()`.

---

## 4. Validation strategy

The stack has four concentric layers of validation. Each layer catches
a different class of bug; together they bound the trust we place in the
pipeline.

### 4.1 Test inventory

All tests live under `packages/tests/`. The quantization suite is at
`packages/tests/quantization/`:

| Test file                       | Layer                | What it covers                                                                              |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `quantization-math.test.ts`     | primitives           | `roundHalfEven`, scalar quantize/dequantize, bounds saturation, param derivation            |
| `weights.test.ts`               | primitives           | `WeightQuantizer` for per-tensor / per-channel symmetric and asymmetric schemes             |
| `calibration.test.ts`           | primitives           | `MinMaxStrategy` accumulation, `CalibrationRunner` end-to-end                               |
| `cnn-layer-calibration.test.ts` | CNN component        | `CnnLayerCalibrationHelper` correctly captures per-layer activations from the runtime       |
| `quantized-cnn.test.ts`         | CNN component        | `QuantizedCnnGraphBuilder` produces well-formed layers (weights, biases, spatial metadata)  |
| `quantized-cnn-export.test.ts`  | ONNX export          | The op sequence is correct (`Quantize → QLinearConv → … → DequantizeLinear → Add`), initializer dtypes match (int8 weights, int32 conv bias, float32 dense bias) |
| `quantized-roundtrip.test.ts`   | TS integration       | Build → calibrate → quantize → export → re-import → infer; result agrees with the FP32 native CNN within quantization tolerance; quantization metadata survives import |
| `ort-cross-validate.test.ts`    | external cross-check | Same export, runs both TS fake-quant and Python `onnxruntime` on the same input, asserts bit-perfect agreement (`max |TS - ORT| < 1e-4`) |

Plus the broader framework suite (582 tests across 51 suites at the
time of this writing).

### 4.2 The four layers of validation

**Layer 1, Primitives.** Unit tests for the math kernels and the
weight quantizer. These catch off-by-one errors in rounding, clamping
boundaries, and parameter derivation. Fast (sub-second), exhaustive.

**Layer 2, Components.** Unit tests for the CNN marshallers and the
calibration helper. These catch ordering bugs (OIHW packing, dense
flatten order), missing metadata propagation, and frozen-graph
contract violations.

**Layer 3, TS integration round-trip.** The
`quantized-roundtrip.test.ts` builds a CNN, calibrates it, quantizes
it, exports to ONNX bytes, re-parses the bytes, rebuilds a compute
graph with QLinear ops registered, runs inference, and compares the
output to the FP32 native CNN. This catches anything that breaks the
TS pipeline end-to-end. It does *not* prove the export is
spec-compliant: a buggy exporter can still land near the FP32 answer
through a buggy importer that compensates.

**Layer 4, External cross-validation against onnxruntime.** This is
the layer that closes the trust loop. `ort-cross-validate.test.ts`
exports the quantized graph, dumps the bytes to a temp directory,
shells out to `scripts/verify-with-ort.py`, runs the same bytes through
Python's `onnxruntime`, and compares its output to our TS fake-quant
output on the same input. The pass threshold is `1e-4` (essentially
float rounding); in practice we observe bit-perfect agreement
(`max |TS - ORT| = 0.0`).

The cross-validation is gated on Python + `onnxruntime` being
available; if either is missing the test is skipped (it does not fail
CI on systems without Python). When it runs, it provides two
guarantees the round-trip cannot:

* **ONNX spec validity.** `onnxruntime` validates the graph on load and
  refuses invalid models. The exporter is correct ONNX iff this passes.
* **QLinear semantics.** `onnxruntime` is the reference implementation
  of the QLinear ops. If our TS QLinear kernels agree with it, our
  numerics match the spec.

### 4.3 Case studies: bugs caught by each layer

Three quantization bugs were caught by validation during Phase 7
development. They illustrate why each layer matters:

1. **Dense bias double-offset (caught by Layer 3, TS round-trip).** An
   early version of the exporter wrote the dense bias int8 as
   `round(bias / y_scale) + y_zp`. When summed with the `QLinearMatMul`
   output (which already carries the `+y_zp` offset) and then
   dequantized, the result picked up an extra `y_zp * y_scale` per
   output. The round-trip test caught it because the FP32 reference
   answer disagreed by exactly that constant offset.

2. **Spurious Relu over the int8 grid (caught by Layer 3, TS
   round-trip).** The exporter initially emitted `QLinearConv → Relu`,
   thinking ONNX Relu would Relu the dequantized value. In our TS
   `Relu` implementation, the kernel just runs `max(x, 0)` on the
   `Float32Array`. With post-Relu calibration, the int8 representation
   of real `0.5` is `-100` (for some scale); applying `max(-100, 0)`
   gives `0`, which dequantizes to real `0.94`. One output came out as
   exactly `-128 * y_scale`, which is the smoking gun for "the int
   representation was clipped, not the real value." Fix: do not emit a
   separate Relu node; the post-Relu calibration already saturates the
   `QLinearConv` output via `y_zp = -128`.

3. **`Add` does not accept int8 in ONNX (caught by Layer 4, ORT
   cross-validation).** With the dense bias offset and the Relu fusion
   both fixed, the round-trip test passed. But onnxruntime refused the
   model on load:
   `Type Error: Type 'tensor(int8)' of input parameter ... of operator (Add) ... is invalid.`
   Our TS `Add` op is dtype-blind (it just adds two `Float32Array`s
   element-wise), so it ran the graph without complaining. The fix is
   to dequantize the matmul output before the bias add, which is also
   the standard ONNX pattern.

The third bug is the headline argument for keeping Layer 4 in the
suite: a TS-only test cannot catch ONNX-spec violations, because the
TS ops decide for themselves what dtypes they accept. An external
reference runtime is the cheapest way to enforce spec compliance.

### 4.4 What "validated" means here

The compute layer is **validated** for the following claims, in order
of strength:

* The math primitives (rounding, scaling, parameter derivation) are
  correct against a hand-computed reference. *(Layer 1)*
* The CNN marshallers produce well-formed quantized graphs and pack
  weights in the canonical layouts. *(Layer 2)*
* The full TS pipeline preserves the FP32 answer within quantization
  tolerance. *(Layer 3)*
* The exported ONNX is **spec-valid** and **bit-compatible with
  onnxruntime's** QLinear kernels. *(Layer 4)*

The last claim is the load-bearing one for deployment: if our exported
bytes give bit-identical results to `onnxruntime`, they will give
mathematically identical results to any conformant runtime, including
CyanMycelium on ESP32. The framework cannot remove all deployment risk
(target hardware can still have its own bugs), but it removes all of
the export-side risk.

---

## 5. File reference

| Concern                       | File                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Tensor + kernel contracts     | `packages/dev/core/src/compute/compute.interfaces.ts`                                               |
| Kernel base class             | `packages/dev/core/src/compute/compute.node.base.ts`                                                |
| ComputeGraph                  | `packages/dev/core/src/compute/compute.graph.ts`                                                    |
| Dispatcher                    | `packages/dev/core/src/graph/graph.dataflow.ts`                                                     |
| MLP runtime                   | `packages/dev/core/src/neuralnetwork/ann/mlp/mlp.inference.ts`                                      |
| CNN runtime                   | `packages/dev/core/src/neuralnetwork/cnn/cnn.inference.ts`                                          |
| RNN runtime                   | `packages/dev/core/src/neuralnetwork/rnn/rnn.inference.ts`                                          |
| Activations                   | `packages/dev/core/src/neuralnetwork/ann/mlp/mlp.activation.ts`                                     |
| Quantization primitives       | `packages/dev/core/src/quantization/`                                                               |
| CNN quantization marshallers  | `packages/dev/core/src/neuralnetwork/cnn/quantization/`                                             |
| ONNX op registry              | `packages/dev/onnx/src/onnx/registry.ts`                                                            |
| ONNX graph builder            | `packages/dev/onnx/src/onnx/graph-builder.ts`                                                       |
| ONNX QLinear kernels          | `packages/dev/onnx/src/onnx/ops/quant.ts`                                                           |
| ONNX quantized CNN exporter   | `packages/dev/onnx/src/onnx/export/cnn/cnn.quantized.export.ts`                                     |
| Quantization tests            | `packages/tests/quantization/`                                                                      |
| ORT cross-validation script   | `packages/tests/quantization/scripts/verify-with-ort.py`                                            |
