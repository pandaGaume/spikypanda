// ============================================================
// KWS sample data + adapter to spikypanda-core planning module.
//
// `loadKwsData()` fetches the real kws_conv_tiny.onnx from the
// neighbouring KWS sample, parses + builds a ComputeGraph via
// SpikypandaOnnx, runs the KahnFifoScheduler + computeLifetimes
// from SpikypandaCore, then projects the result onto the legacy
// `tensors[]` shape the rest of the UI consumes.
//
// Before loadKwsData runs, all dynamic globals (NODES, BASE_TENSORS,
// ALLOCATIONS, FILE_META) are empty; the EmptyState in memory-viz.jsx
// stays visible until the promise resolves.
// ============================================================

// Path to the real KWS model already shipped with the KWS sample.
const MODEL_URL = "../kws/models/kws_conv_tiny.onnx";

// Op colour palette. Keyed on whatever the kernel `nodeType` resolves to.
// SpikypandaOnnx prefixes runtime op types with `onnx_` (e.g. `onnx_conv`,
// `onnx_relu`), so we cover both the canonical ONNX names and the runtime
// prefixed variants. Aliases from older mock catalogs (Conv2D, BatchNorm)
// are kept for backwards compat.
const OP_COLORS = {
  // Inputs / outputs / static data
  Input:              "#94a3b8", onnx_input:       "#94a3b8",
  Output:             "#94a3b8", onnx_output:      "#94a3b8",
  onnx_initializer:   "#475569",
  onnx_constant:      "#64748b",
  // Convolution
  Conv:               "#7c9eb2", onnx_conv:        "#7c9eb2",
  Conv2D:             "#7c9eb2",
  ConvTranspose:      "#7c9eb2",
  // Activation
  Relu:               "#a9c46c", onnx_relu:        "#a9c46c",
  LeakyRelu:          "#a9c46c", onnx_leakyrelu:   "#a9c46c",
  Sigmoid:            "#9fc46c", onnx_sigmoid:     "#9fc46c",
  Tanh:               "#9fc46c", onnx_tanh:        "#9fc46c",
  Clip:               "#a9c46c", onnx_clip:        "#a9c46c",
  // Pooling
  MaxPool:            "#d4a373", onnx_maxpool:           "#d4a373",
  AveragePool:        "#d4a373", onnx_averagepool:       "#d4a373",
  GlobalAveragePool:  "#bcb88a", onnx_globalaveragepool: "#bcb88a",
  GlobalAvgPool:      "#bcb88a",
  // Norm
  BatchNormalization: "#c08497", onnx_batchnormalization: "#c08497",
  BatchNorm:          "#c08497",
  LayerNormalization: "#c08497", onnx_layernormalization: "#c08497",
  // Matmul / classifier
  MatMul:             "#9f86c0", onnx_matmul:      "#9f86c0",
  Gemm:               "#9f86c0", onnx_gemm:        "#9f86c0",
  // Element-wise
  Add:                "#f4a261", onnx_add:         "#f4a261",
  Sub:                "#f4a261", onnx_sub:         "#f4a261",
  Mul:                "#f4a261", onnx_mul:         "#f4a261",
  Div:                "#f4a261", onnx_div:         "#f4a261",
  // Softmax family
  Softmax:            "#83c5be", onnx_softmax:     "#83c5be",
  LogSoftmax:         "#83c5be", onnx_logsoftmax:  "#83c5be",
  // Shape ops
  Concat:             "#e6b8d0", onnx_concat:      "#e6b8d0",
  Slice:              "#e6b8d0", onnx_slice:       "#e6b8d0",
  Reshape:            "#a3a3a3", onnx_reshape:     "#a3a3a3",
  Transpose:          "#a3a3a3", onnx_transpose:   "#a3a3a3",
  Flatten:            "#a3a3a3", onnx_flatten:     "#a3a3a3",
  Squeeze:            "#a3a3a3", onnx_squeeze:     "#a3a3a3",
  Unsqueeze:          "#a3a3a3", onnx_unsqueeze:   "#a3a3a3",
  Identity:           "#a3a3a3", onnx_identity:    "#a3a3a3",
  // RNN
  LSTM:               "#9f86c0", onnx_lstm:        "#9f86c0",
  GRU:                "#9f86c0", onnx_gru:         "#9f86c0",
  // Fallback
  Scratch:            "#525252",
  Unknown:            "#525252",
};

const POLICIES      = ["no-recycling", "refcount-release", "arena-planned-firstfit", "arena-planned-greedy"];
const POLICY_LABELS = {
  "no-recycling":           "no-recycling",
  "refcount-release":       "refcount-release",
  "arena-planned-firstfit": "arena-planned-firstfit",
  "arena-planned-greedy":   "arena-planned-greedy",
};
const ORDER_KEYS = ["kahn-fifo", "free-the-most-first", "min-cut-heuristic"];

const STRATEGY_CLASS = {
  "no-recycling":           "NoRecyclingStrategy",
  "refcount-release":       "RefcountReleaseStrategy",
  "arena-planned-firstfit": "ArenaFirstFitStrategy",
  "arena-planned-greedy":   "ArenaGreedyStrategy",
};

// --- dynamic globals, filled by loadKwsData() ---------------------------------

let NODES         = [];
let BASE_TENSORS  = [];       // every tensor in the graph (flash + sram + state)
let SRAM_TENSORS  = [];       // subset planned by the strategies (working set)
let FLASH_TENSORS = [];       // constants/initializers, static, never recycled
let FLASH_BYTES   = 0;        // sum of FLASH_TENSORS sizes (a single number)
let ALLOCATIONS   = {};
let FILE_META     = { name: "kws_conv_tiny.onnx", nodes: 0, tensors: 0 };

// --- memory region classification -------------------------------------------
// On ESP32, weights live in flash (read-only, slow); activations / inputs /
// state live in SRAM (fast, scarce). Most allocator policies only care about
// the SRAM peak; flash is a constant cost paid once.
function classifyRegion(op) {
  if (op === "onnx_initializer" || op === "onnx_constant") return "flash";
  return "sram";
}

// ESP32-S3 single-core baseline. Used purely for budget display.
const TARGET = {
  sramBytes:  520 * 1024,   // internal SRAM
  flashBytes: 4 * 1024 * 1024, // typical 4 MB flash
};

// --- core-backed planning ----------------------------------------------------

function tensorsToLifetimes(tensors) {
  return tensors.map((t) => ({
    tensorId:    t.name,
    producerId:  `n${t.producer}`,
    consumerIds: t.consumers.map((c) => `n${c}`),
    outputIndex: 0,
    birthStep:   t.birthStep,
    deathStep:   t.deathStep,
    shape:       t.shape,
    dtype:       t.dtype,
    bytes:       t.bytes,
  }));
}

function runPolicy(policyName, tensors) {
  const Strategy = window.SpikypandaCore?.[STRATEGY_CLASS[policyName]];
  if (!Strategy) {
    console.error(`SpikypandaCore.${STRATEGY_CLASS[policyName]} unavailable; check bundle load.`);
    return tensors.map((t) => ({ ...t, offset: 0 }));
  }
  const scheduleIds = NODES.map((n) => `n${n.id}`);
  const plan = new Strategy().plan(tensorsToLifetimes(tensors), scheduleIds);
  return tensors.map((t) => {
    const alloc = plan.allocations.get(t.name);
    return { ...t, offset: alloc ? alloc.offset : 0 };
  });
}

// --- public accessors --------------------------------------------------------

function getAllocation(policy, order) {
  return ALLOCATIONS[order]?.[policy] ?? [];
}

function computePeak(tensors) {
  return tensors.reduce((m, t) => Math.max(m, t.offset + t.bytes), 0);
}

function computeLiveAtStep(tensors, step) {
  return tensors.filter((t) => t.birthStep <= step && t.deathStep >= step);
}

function computeCurrentMemory(tensors, step) {
  const live = computeLiveAtStep(tensors, step);
  return live.reduce((m, t) => Math.max(m, t.offset + t.bytes), 0);
}

function computeMemoryOverTime(tensors, numSteps) {
  return Array.from({ length: numSteps }, (_, s) => computeCurrentMemory(tensors, s));
}

function peakStep(tensors, numSteps) {
  let bestS = 0, bestB = 0;
  for (let s = 0; s < numSteps; s++) {
    const b = computeCurrentMemory(tensors, s);
    if (b > bestB) { bestB = b; bestS = s; }
  }
  return { step: bestS, bytes: bestB };
}

function maxLiveCount(tensors, numSteps) {
  let bestS = 0, bestN = 0;
  for (let s = 0; s < numSteps; s++) {
    const n = computeLiveAtStep(tensors, s).length;
    if (n > bestN) { bestN = n; bestS = s; }
  }
  return { step: bestS, count: bestN };
}

// Overhead vs theoretical minimum : 1 - (max simultaneous live bytes) / peak.
function fragmentationAt(tensors, numSteps) {
  const peak = computePeak(tensors);
  if (peak === 0) return 0;
  let maxSum = 0;
  for (let s = 0; s < numSteps; s++) {
    const sum = computeLiveAtStep(tensors, s).reduce((a, t) => a + t.bytes, 0);
    if (sum > maxSum) maxSum = sum;
  }
  return Math.max(0, 1 - maxSum / peak);
}

// --- loader: parse + build a ComputeGraph, project into our legacy shape -----
// Accepts either a Uint8Array of ONNX bytes (drag-drop / file picker)
// or, when nothing is provided, falls back to fetching the KWS sample
// shipped with the project.

// ONNX TensorProto.DataType (subset useful for MCU planning).
const ONNX_DTYPE_TO_PLAN = {
  1:  "float32",   // FLOAT
  2:  "uint8",     // UINT8
  3:  "int8",      // INT8
  5:  "int16",     // INT16
  6:  "int32",     // INT32
  7:  "int32",     // INT64 (4-byte planning approximation; we never plan int64 weights)
  9:  "uint8",     // BOOL
  10: "int16",     // FLOAT16 (2 bytes, planning bucket)
  11: "float32",   // DOUBLE rounded down to 4
};

async function loadOnnxBytes(bytes, displayName) {
  const RT_ONNX = window.SpikypandaOnnx;
  const C       = window.SpikypandaCore;
  if (!RT_ONNX) throw new Error("SpikypandaOnnx bundle missing");
  if (!C)       throw new Error("SpikypandaCore bundle missing");

  const parsed = RT_ONNX.OnnxParser.parse(bytes);
  if (!parsed) throw new Error("OnnxParser.parse returned null");

  const registry = RT_ONNX.createDefaultRegistry();
  const builder  = new RT_ONNX.OnnxGraphBuilder(registry);
  const result   = builder.build(parsed);
  const graph    = result.graph;

  // Models exported by PyTorch / tf2onnx often omit intermediate value_info,
  // so kernel.outputShapes stays empty for transient activations. Run a
  // dummy inference with zero-filled inputs (using the declared input
  // shapes) so each kernel's bag.lastOutputs gets populated; afterwards
  // we patch the empty outputShapes from those tensors.
  tryResolveShapes(graph);

  // The TS runtime stores every tensor as a Float32Array (fake-quant),
  // so the dummy infer above cannot tell us the deployment dtype of
  // initializers (int8 weights, int32 biases, ...). Read it directly
  // from the parsed ONNX initializer table by index: the OnnxGraphBuilder
  // creates one `onnx_initializer` kernel per parsed initializer, in
  // order. The dtype we record here is the "intended" / deployment dtype
  // that ESP32 / CyanMycelium would actually use; if absent we fall
  // back to whatever the dummy infer reported.
  applyInitializerDtypes(graph, parsed);

  return projectGraph(graph, bytes, displayName, C);
}

function applyInitializerDtypes(graph, parsed) {
  const inits = parsed?.initializers;
  if (!inits || inits.length === 0) return;
  const initKernels = graph.nodes.filter((k) => k.nodeType === "onnx_initializer");
  const n = Math.min(initKernels.length, inits.length);
  for (let i = 0; i < n; i++) {
    const onnxDtype = inits[i].dataType ?? inits[i].data_type;
    const dtype = ONNX_DTYPE_TO_PLAN[onnxDtype] ?? "float32";
    const k = initKernels[i];
    // Preserve dummy-infer dtypes for non-output slots if any; we only
    // touch slot 0 since initializers are single-output by ONNX spec.
    const existing = KERNEL_DTYPES.get(k) ?? [];
    existing[0] = dtype;
    KERNEL_DTYPES.set(k, existing);
  }
}

// Side map populated by tryResolveShapes: kernel → array of per-output dtypes
// (1 entry per output slot). Used later by projectGraph to right-size
// fake-quant tensors. Falls back to "float32" when absent.
const KERNEL_DTYPES = new WeakMap();

function tryResolveShapes(graph) {
  const needsResolve = graph.nodes.some(
    (k) => k.outputShapes.length === 0 && k.nodeType !== "onnx_initializer"
  );

  // Assemble a dummy named-input map from the declared input shapes.
  const inputs = new Map();
  for (const k of graph.nodes) {
    if (k.nodeType !== "onnx_input") continue;
    const shape = k.outputShapes[0];
    if (!shape || shape.length === 0) continue;
    let n = 1;
    for (const d of shape) n *= Math.max(1, d);
    const key = String(k.id ?? k.tag ?? "");
    if (!key) continue;
    inputs.set(key, { data: new Float32Array(n), shape: shape.slice() });
  }

  // Run the dummy infer whenever we have an input. This serves both
  // shape resolution (PyTorch exports lack value_info) and dtype
  // resolution (fake-quant tensors carry their quantization metadata
  // on the produced ITensor, not on outputShapes).
  if (inputs.size > 0) {
    try {
      graph.infer(inputs);
    } catch (e) {
      console.warn("dummy infer failed, shapes/dtypes may stay incomplete:", e);
      return;
    }
  } else if (!needsResolve) {
    return;
  }

  for (const k of graph.nodes) {
    const last = k.bag?.lastOutputs;
    if (!last || last.length === 0) continue;
    if (k.outputShapes.length === 0) {
      k.outputShapes = last.map((t) => Array.isArray(t.shape) ? t.shape.slice() : []);
    }
    // Record per-output dtype. Fake-quant tensors keep a Float32Array
    // payload but expose a `quantization` metadata field whose `dtype`
    // names the physical type ("int8", "uint8", "int32"). When absent,
    // fall back to float32.
    KERNEL_DTYPES.set(k, last.map((t) => {
      const q = t?.quantization;
      if (q && q.dtype) return String(q.dtype).toLowerCase();
      return "float32";
    }));
  }
}

async function loadKwsData() {
  const resp = await fetch(MODEL_URL);
  if (!resp.ok) throw new Error(`fetch ${MODEL_URL}: HTTP ${resp.status}`);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  return loadOnnxBytes(bytes, "kws_conv_tiny.onnx");
}

async function projectGraph(graph, bytes, displayName, C) {
  // schedule and extract lifetimes via the core module
  const scheduler        = new C.KahnFifoScheduler();
  const scheduledKernels = scheduler.linearize(graph);
  const lifetimes        = C.computeLifetimes(graph, scheduledKernels);

  // 3. map every kernel to its display index (= schedule position)
  const idOf = (k, fallbackIdx) =>
    (k.id != null ? String(k.id)
                  : k.tag      ? String(k.tag)
                               : `node_${fallbackIdx}`);
  const idToIndex = new Map();
  scheduledKernels.forEach((k, i) => idToIndex.set(idOf(k, i), i));

  // 4. NODES (display) from scheduled kernels
  NODES = scheduledKernels.map((k, i) => ({
    id:       i,
    name:     idOf(k, i),
    op:       k.nodeType ?? "Unknown",
    duration: 1.0, // uniform until we wire profiling
  }));

  // 5. project ITensorLifetime[] onto legacy tensor records + tag region
  //    + fix bytes for fake-quant tensors (Float32Array carrying int8 values).
  const DTYPE_BYTES = { float32: 4, int32: 4, int16: 2, uint16: 2, int8: 1, uint8: 1 };
  BASE_TENSORS = lifetimes.map((lt, i) => {
    const producerIdx = idToIndex.get(lt.producerId) ?? 0;
    const consumerIdxs = lt.consumerIds
      .map((c) => idToIndex.get(c))
      .filter((idx) => idx !== undefined);
    const producerKernel = scheduledKernels[producerIdx];
    const op = producerKernel?.nodeType ?? "Unknown";

    // Right-size the tensor: prefer the dtype recorded during dummy infer
    // (which surfaces fake-quant tensors as their physical dtype). The
    // core's computeLifetimes assumed float32; we patch here.
    const dtypeArr = KERNEL_DTYPES.get(producerKernel);
    const dtype    = dtypeArr?.[lt.outputIndex] ?? lt.dtype;
    const bpe      = DTYPE_BYTES[dtype] ?? 4;
    // Some runtime kernels (QLinearConv on Conv1D) leave a `null` dim in
    // the output shape, which would NaN the product. Replace unresolved
    // dims with 1; better an under-estimate than a planner crash.
    let elements   = 1;
    for (const d of lt.shape) {
      const dim = (typeof d === "number" && d > 0) ? d : 1;
      elements *= dim;
    }
    const bytes    = lt.shape.length === 0 ? bpe : elements * bpe;

    return {
      id:        i,
      name:      lt.tensorId,
      op,
      region:    classifyRegion(op),
      producer:  producerIdx,
      consumers: consumerIdxs,
      shape:     Array.from(lt.shape),
      dtype,
      bytes,
      birthStep: lt.birthStep,
      deathStep: lt.deathStep,
    };
  });

  // 6. split flash (static, read-only) from SRAM (working set the policies plan).
  FLASH_TENSORS = BASE_TENSORS.filter((t) => t.region === "flash");
  SRAM_TENSORS  = BASE_TENSORS.filter((t) => t.region === "sram");
  FLASH_BYTES   = FLASH_TENSORS.reduce((s, t) => s + t.bytes, 0);

  // Renumber SRAM tensors by their position in the SRAM subset so the
  // strategy adapter feeds a clean array (offsets read back via tensorId).
  // 7. pre-compute 4×3 allocations on the SRAM subset only. Flash tensors
  //    keep a synthetic offset of 0 (they live in their own arena, not the
  //    SRAM heap the strategies are planning).
  ALLOCATIONS = {};
  for (const order of ORDER_KEYS) {
    ALLOCATIONS[order] = {};
    for (const policy of POLICIES) {
      ALLOCATIONS[order][policy] = runPolicy(policy, SRAM_TENSORS);
    }
  }

  FILE_META = {
    name:    displayName || "model.onnx",
    nodes:   NODES.length,
    tensors: BASE_TENSORS.length,
  };

  // re-publish so memory-viz.jsx + child components see the new data
  Object.assign(window, {
    NODES, BASE_TENSORS, SRAM_TENSORS, FLASH_TENSORS, FLASH_BYTES,
    ALLOCATIONS, FILE_META,
  });

  return {
    nodes:        NODES.length,
    tensors:      BASE_TENSORS.length,
    sramTensors:  SRAM_TENSORS.length,
    flashTensors: FLASH_TENSORS.length,
    flashKB:      (FLASH_BYTES / 1024).toFixed(2),
    modelBytes:   bytes.length,
    name:         FILE_META.name,
  };
}

// Helper: read a File (from <input type="file"> or drag-drop) into bytes
// and run the same load path.
async function loadOnnxFile(file) {
  const buf = await file.arrayBuffer();
  return loadOnnxBytes(new Uint8Array(buf), file.name);
}

// Initial publish (empty until a load function runs)
Object.assign(window, {
  NODES, BASE_TENSORS, SRAM_TENSORS, FLASH_TENSORS, FLASH_BYTES,
  OP_COLORS, POLICIES, POLICY_LABELS, ORDER_KEYS, FILE_META, TARGET,
  getAllocation, computePeak, computeLiveAtStep, computeCurrentMemory,
  computeMemoryOverTime, peakStep, maxLiveCount, fragmentationAt,
  loadKwsData, loadOnnxBytes, loadOnnxFile,
});
