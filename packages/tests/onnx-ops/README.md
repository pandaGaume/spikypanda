# ONNX Operator Conformance Tests

## Purpose

This test suite validates that SpikyPanda's ONNX operator implementations produce results identical to the official ONNX runtime (`onnxruntime`). It serves as the **ground truth** for correctness, ensuring compatibility with the ONNX standard and interoperability with existing ML frameworks (PyTorch, TensorFlow, etc.).

## Dual Implementation Strategy

SpikyPanda maintains **two parallel implementations** of ONNX operators:

### Generic Ops (`ops/activations.ts`, `ops/math.ts`, `ops/conv.ts`, etc.)

Straightforward, spec-compliant implementations of each ONNX operator. These are:

- **Reference implementations** — clear, readable code that maps directly to the ONNX specification
- **Portable baseline** — designed to be translatable to C++ for deployment on MCUs and embedded targets where the SpikyPanda graph runtime is not available
- **Fallback** — used when no higher-priority implementation is registered

### SpikyPanda Native Ops (`ops/spikypanda.ts`)

Optimized implementations that leverage SpikyPanda-specific patterns:

- **Higher priority** — registered with `PRIORITY_NATIVE` so they override generic ops when available
- **Platform-optimized** — can exploit SpikyPanda's runtime characteristics (memory layout, activation function reuse, cache-friendly tiling)
- **Selective** — only overrides ops where SpikyPanda can do better (currently: Relu, Sigmoid, Tanh, Gemm, LSTM, GRU, Conv)

The **priority-based registry** (`OnnxOpRegistry`) resolves which implementation runs at execution time. Both must produce identical outputs for the same inputs.

## Test Architecture

### 1. Reference Vector Generation (`generate_vectors.py`)

A Python script that:
- Builds a minimal single-operator ONNX model for each of the 45 supported ops
- Runs each model through `onnxruntime` (the reference ONNX implementation)
- Saves inputs, outputs, and model binaries for the TypeScript test suite

**Dependencies:** `pip install onnx onnxruntime numpy`

**Usage:** `python packages/tests/onnx-ops/generate_vectors.py`

**Outputs:**
- `test-vectors.json` — input/output reference data for all operators
- `models/*.onnx` — binary ONNX models for graph-pipeline tests

### 2. Test Suites (`onnx-ops.test.ts`)

Four test suites, each comparing against the same onnxruntime reference:

| Suite | What it tests | Count |
|---|---|---|
| **Generic ONNX ops** | Each op node in isolation via `createDefaultRegistry()` | 46 |
| **SpikyPanda native ops** | Each op node via `createSpikyPandaRegistry()` (native overrides active) | 45 |
| **Raw JS sanity checks** | Direct Math implementations (no framework) for elementary ops | 15 |
| **Graph pipeline** | Full pipeline: parse `.onnx` binary, build `ComputeGraph`, `graph.run()` | 46 |

The graph pipeline test is the most comprehensive — it exercises the entire chain from ONNX protobuf parsing through graph construction to tensor execution, catching integration bugs that isolated node tests miss.

### 3. Tolerance

All comparisons use `atol=1e-4, rtol=1e-4` to account for floating-point differences between JavaScript and onnxruntime's C++ backend.

## MCU / C++ Portability

The generic operator implementations are intentionally kept simple and dependency-free:

- Pure scalar loops (no SIMD intrinsics or platform APIs)
- Float32 only (matches MCU FPU capabilities)
- No dynamic allocation patterns that don't translate to C
- Each operator is self-contained with explicit input/output shapes

This makes them suitable as **reference C++ implementations** for SpikyPanda's embedded runtime (CyanMycelium). The conformance tests ensure that any C++ port produces the same results as the TypeScript version, which in turn matches onnxruntime.

## Adding a New Operator

1. Implement the generic op in the appropriate `ops/*.ts` file
2. Register it in the corresponding `register*Ops()` function
3. Add a generator function in `generate_vectors.py`
4. Run `python generate_vectors.py` to regenerate reference data
5. Run `npm test` — the new op is automatically picked up by all test suites
6. Optionally add a SpikyPanda native override in `ops/spikypanda.ts`

## Covered Operators (45)

**Activations:** Relu, Sigmoid, Tanh, LeakyRelu, Clip, Softmax, Exp, Log, Sqrt, Abs, Neg

**Math:** Add, Sub, Mul, Atan, Div, Pow, Gemm, Concat, Slice

**Matrix:** MatMul, Transpose, Reshape, Flatten, Squeeze, Unsqueeze, Gather

**Convolution:** Conv, MaxPool, AveragePool, GlobalAveragePool

**Normalization:** BatchNormalization, LayerNormalization, Dropout

**Misc:** ReduceMean, ReduceSum, Identity, Cast, Shape, ConstantOfShape, Pad, Min, Max

**Recurrent:** LSTM, GRU
