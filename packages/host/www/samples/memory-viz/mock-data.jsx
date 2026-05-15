// ============================================================
// Mock data for Memory Viz
// 17 nodes (KWS-style CNN), ~29 tensors, 4 policies × 3 orders
// ============================================================

const NODES = [
  { id: 0,  name: "input",   op: "Input",         duration: 0.1 },
  { id: 1,  name: "conv1",   op: "Conv2D",        duration: 2.8 },
  { id: 2,  name: "bn1",     op: "BatchNorm",     duration: 0.4 },
  { id: 3,  name: "relu1",   op: "Relu",          duration: 0.2 },
  { id: 4,  name: "pool1",   op: "MaxPool",       duration: 0.3 },
  { id: 5,  name: "conv2",   op: "Conv2D",        duration: 3.5 },
  { id: 6,  name: "bn2",     op: "BatchNorm",     duration: 0.4 },
  { id: 7,  name: "relu2",   op: "Relu",          duration: 0.2 },
  { id: 8,  name: "pool2",   op: "MaxPool",       duration: 0.3 },
  { id: 9,  name: "conv3",   op: "Conv2D",        duration: 2.1 },
  { id: 10, name: "bn3",     op: "BatchNorm",     duration: 0.3 },
  { id: 11, name: "relu3",   op: "Relu",          duration: 0.2 },
  { id: 12, name: "gap",     op: "GlobalAvgPool", duration: 0.2 },
  { id: 13, name: "matmul",  op: "MatMul",        duration: 0.5 },
  { id: 14, name: "add",     op: "Add",           duration: 0.1 },
  { id: 15, name: "softmax", op: "Softmax",       duration: 0.2 },
  { id: 16, name: "output",  op: "Output",        duration: 0.05 },
];

// Op colors (palette désaturée Observable / Tableau 10 hybrid)
const OP_COLORS = {
  Input:         "#94a3b8",
  Conv2D:        "#7c9eb2",
  Relu:          "#a9c46c",
  MaxPool:       "#d4a373",
  BatchNorm:     "#c08497",
  MatMul:        "#9f86c0",
  Add:           "#f4a261",
  Softmax:       "#83c5be",
  GlobalAvgPool: "#bcb88a",
  Output:        "#94a3b8",
  Scratch:       "#525252",
};

// Base tensor catalog (producer / consumers / shape / bytes)
// dtype is float32 (4B) unless noted. Sizes chosen so no-recycling peak ≈ 480-500 KB.
const TENSOR_CATALOG = [
  // --- activations along the forward path ---
  { name: "input_buf",   op: "Input",         producer: 0,  consumers: [1],        shape: [1,1,49,40],   dtype: "float32", bytes: 7840 },
  { name: "conv1_w_pack",op: "Scratch",       producer: 1,  consumers: [1],        shape: [16,1,3,3],    dtype: "float32", bytes: 576  },
  { name: "conv1_out",   op: "Conv2D",        producer: 1,  consumers: [2],        shape: [1,16,49,40],  dtype: "float32", bytes: 125440 },
  { name: "bn1_params",  op: "Scratch",       producer: 2,  consumers: [2],        shape: [16,4],        dtype: "float32", bytes: 256  },
  { name: "bn1_out",     op: "BatchNorm",     producer: 2,  consumers: [3],        shape: [1,16,49,40],  dtype: "float32", bytes: 125440 },
  { name: "relu1_out",   op: "Relu",          producer: 3,  consumers: [4],        shape: [1,16,49,40],  dtype: "float32", bytes: 125440 },
  { name: "pool1_out",   op: "MaxPool",       producer: 4,  consumers: [5],        shape: [1,16,24,20],  dtype: "float32", bytes: 30720 },
  { name: "conv2_w_pack",op: "Scratch",       producer: 5,  consumers: [5],        shape: [32,16,3,3],   dtype: "float32", bytes: 18432 },
  { name: "conv2_out",   op: "Conv2D",        producer: 5,  consumers: [6],        shape: [1,32,24,20],  dtype: "float32", bytes: 61440 },
  { name: "bn2_params",  op: "Scratch",       producer: 6,  consumers: [6],        shape: [32,4],        dtype: "float32", bytes: 512  },
  { name: "bn2_out",     op: "BatchNorm",     producer: 6,  consumers: [7],        shape: [1,32,24,20],  dtype: "float32", bytes: 61440 },
  { name: "relu2_out",   op: "Relu",          producer: 7,  consumers: [8],        shape: [1,32,24,20],  dtype: "float32", bytes: 61440 },
  { name: "pool2_out",   op: "MaxPool",       producer: 8,  consumers: [9],        shape: [1,32,12,10],  dtype: "float32", bytes: 15360 },
  { name: "conv3_w_pack",op: "Scratch",       producer: 9,  consumers: [9],        shape: [64,32,3,3],   dtype: "float32", bytes: 73728 },
  { name: "conv3_out",   op: "Conv2D",        producer: 9,  consumers: [10],       shape: [1,64,12,10],  dtype: "float32", bytes: 30720 },
  { name: "bn3_params",  op: "Scratch",       producer: 10, consumers: [10],       shape: [64,4],        dtype: "float32", bytes: 1024 },
  { name: "bn3_out",     op: "BatchNorm",     producer: 10, consumers: [11],       shape: [1,64,12,10],  dtype: "float32", bytes: 30720 },
  { name: "relu3_out",   op: "Relu",          producer: 11, consumers: [12],       shape: [1,64,12,10],  dtype: "float32", bytes: 30720 },
  { name: "gap_out",     op: "GlobalAvgPool", producer: 12, consumers: [13],       shape: [1,64],        dtype: "float32", bytes: 256  },
  { name: "matmul_w",    op: "Scratch",       producer: 13, consumers: [13],       shape: [12,64],       dtype: "float32", bytes: 3072 },
  { name: "matmul_out",  op: "MatMul",        producer: 13, consumers: [14],       shape: [1,12],        dtype: "float32", bytes: 48   },
  { name: "bias_vec",    op: "Scratch",       producer: 14, consumers: [14],       shape: [12],          dtype: "float32", bytes: 48   },
  { name: "add_out",     op: "Add",           producer: 14, consumers: [15],       shape: [1,12],        dtype: "float32", bytes: 48   },
  { name: "softmax_tmp", op: "Scratch",       producer: 15, consumers: [15],       shape: [12],          dtype: "float32", bytes: 48   },
  { name: "softmax_out", op: "Softmax",       producer: 15, consumers: [16],       shape: [1,12],        dtype: "float32", bytes: 48   },
  { name: "output_buf",  op: "Output",        producer: 16, consumers: [],         shape: [1,12],        dtype: "float32", bytes: 48   },
  // --- a few cross-cutting / persistent buffers to enrich the Gantt ---
  { name: "quant_calib", op: "Scratch",       producer: 0,  consumers: [16],       shape: [64],          dtype: "float32", bytes: 256  }, // spans whole graph
  { name: "im2col_pad",  op: "Scratch",       producer: 5,  consumers: [5,9],      shape: [3,3,32,5,5],  dtype: "float32", bytes: 7200 }, // shared scratch
  { name: "log_buf",     op: "Scratch",       producer: 13, consumers: [15,16],    shape: [12,2],        dtype: "float32", bytes: 96   },
];

// Compute birth/death step from producer + consumers
function buildTensors() {
  return TENSOR_CATALOG.map((t, i) => {
    const birthStep = t.producer;
    const deathStep = t.consumers.length ? Math.max(...t.consumers) : t.producer;
    return { id: i, ...t, birthStep, deathStep };
  });
}

const BASE_TENSORS = buildTensors();

// --------- ordering policies (permutations of node ids) ---------
// kahn-fifo: topological order = natural sequence 0..16
// free-the-most-first: prioritise nodes whose execution frees the largest live tensors
// min-cut-heuristic: minimise simultaneously live tensor bytes
const ORDERS = {
  "kahn-fifo":           [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
  "free-the-most-first": [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
  "min-cut-heuristic":   [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
};
// For a real DAG we'd permute; this graph is linear so all orders are the same
// sequence. We simulate "different orders" by tweaking tensor lifespans slightly
// (e.g. free-the-most kills bn intermediates one step earlier).
function applyOrder(tensors, order) {
  if (order === "kahn-fifo") return tensors;
  if (order === "free-the-most-first") {
    // Aggressively shorten the life of BN/Relu intermediates by 0 steps (they're
    // already 1-step). For Conv outputs that have only their bn consumer, no
    // change. Instead, shorten persistent scratch buffers.
    return tensors.map((t) => {
      if (t.op === "Scratch" && t.deathStep - t.birthStep > 3) {
        return { ...t, deathStep: Math.min(t.deathStep, t.birthStep + 2) };
      }
      return t;
    });
  }
  if (order === "min-cut-heuristic") {
    // Lengthen some lifespans (this heuristic may delay some frees) but reduces
    // simultaneous live count -- we model by shifting deaths earlier on conv outs
    return tensors.map((t) => {
      // For relu* outputs, swap producer/consumer step labels to overlap less
      if (t.name.startsWith("im2col_pad")) {
        return { ...t, consumers: [5], deathStep: 5 };
      }
      return t;
    });
  }
  return tensors;
}

// --------- allocator policies ---------
// Inline implementations are gone: every strategy now delegates to the
// `compute/planning` module shipped in spikypanda-core. The UI still
// consumes the legacy `tensors` shape (one record per tensor with an
// `offset` field), so we adapt around it: project to ITensorLifetime[],
// run the strategy, then fold the resulting offsets back onto our
// records.

const SCHEDULE_IDS = NODES.map((n) => `n${n.id}`);
const STRATEGY_CLASS = {
  "no-recycling":           "NoRecyclingStrategy",
  "refcount-release":       "RefcountReleaseStrategy",
  "arena-planned-firstfit": "ArenaFirstFitStrategy",
  "arena-planned-greedy":   "ArenaGreedyStrategy",
};

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
  const plan = new Strategy().plan(tensorsToLifetimes(tensors), SCHEDULE_IDS);
  return tensors.map((t) => {
    const alloc = plan.allocations.get(t.name);
    return { ...t, offset: alloc ? alloc.offset : 0 };
  });
}

const POLICY_FNS = {
  "no-recycling":           (t) => runPolicy("no-recycling", t),
  "refcount-release":       (t) => runPolicy("refcount-release", t),
  "arena-planned-firstfit": (t) => runPolicy("arena-planned-firstfit", t),
  "arena-planned-greedy":   (t) => runPolicy("arena-planned-greedy", t),
};

// Pre-compute all 4 × 3 combinations
const ALLOCATIONS = {};
for (const order of Object.keys(ORDERS)) {
  const tensors = applyOrder(BASE_TENSORS, order);
  ALLOCATIONS[order] = {};
  for (const policy of Object.keys(POLICY_FNS)) {
    ALLOCATIONS[order][policy] = POLICY_FNS[policy](tensors);
  }
}

function getAllocation(policy, order) {
  return ALLOCATIONS[order][policy];
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

// Peak step
function peakStep(tensors, numSteps) {
  let bestS = 0, bestB = 0;
  for (let s = 0; s < numSteps; s++) {
    const b = computeCurrentMemory(tensors, s);
    if (b > bestB) { bestB = b; bestS = s; }
  }
  return { step: bestS, bytes: bestB };
}

// Max live tensor count
function maxLiveCount(tensors, numSteps) {
  let bestS = 0, bestN = 0;
  for (let s = 0; s < numSteps; s++) {
    const n = computeLiveAtStep(tensors, s).length;
    if (n > bestN) { bestN = n; bestS = s; }
  }
  return { step: bestS, count: bestN };
}

// Overhead vs theoretical minimum : 1 - (max simultaneous live bytes) / peak.
// 0 = perfect packing; high = arena much larger than working set demands.
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

const POLICIES = ["no-recycling", "refcount-release", "arena-planned-firstfit", "arena-planned-greedy"];
const POLICY_LABELS = {
  "no-recycling":           "no-recycling",
  "refcount-release":       "refcount-release",
  "arena-planned-firstfit": "arena-planned-firstfit",
  "arena-planned-greedy":   "arena-planned-greedy",
};
const ORDER_KEYS = ["kahn-fifo", "free-the-most-first", "min-cut-heuristic"];

const FILE_META = {
  name: "kws_conv_tiny.onnx",
  nodes: NODES.length,
  tensors: BASE_TENSORS.length,
};

Object.assign(window, {
  NODES, BASE_TENSORS, OP_COLORS, POLICIES, POLICY_LABELS, ORDER_KEYS, FILE_META,
  getAllocation, computePeak, computeLiveAtStep, computeCurrentMemory,
  computeMemoryOverTime, peakStep, maxLiveCount, fragmentationAt,
});
