// SpikyPanda v1 op set.
//
// Each entry is a node TYPE: id, ports, default config, attribute schema
// (drives the editor's property panel) and, for source/sink kinds, a
// detail-page sample. The editor renders one toolbar button per op.
//
// The motor "source" decomposes into atomic ops so the graph mirrors the
// actual physics composition (motor + faults + gravity) instead of hiding
// it inside a tabbed page. Faults take the motor's kinematics stream as
// input and emit a current contribution; a Sum node combines all current
// contributions before they hit the Sensor (ADC).
//
// `kind` is the runtime archetype:
//   - "source"    : no inputs; runs in a detail-page tab or in the runner.
//   - "processor" : has inputs and outputs; runs in the graph-runner.
//   - "sink"      : no outputs (or passthrough); runs in a detail-page tab.
// `detailPage` is a path relative to samples/ (the editor lives at
// samples/nodeeditor/ and resolves URLs as `../<detailPage>`).
//
// `attrSchema` is the per-op editable surface. Each entry: { key, label,
// type, ...constraints }. Types: "number" | "int" | "string" | "boolean".
// "select" is reserved for future use; until the editor's PropertyPanel
// gains a dropdown widget, dropdowns are emulated as "string".

// ---- Shared port type for kinematic streams ---------------------------
// Kinematics carries (theta, omega) per sample. Encoded as vec2 so the
// editor draws the port in vec2 color and prevents miswiring to scalars.
const KINEMATICS = "vec2";

// ---- MotorDC (atomic healthy motor) -----------------------------------
// Healthy DC motor with optional PWM driver. Two outputs:
//   - current     : clean armature current at sample rate (no faults).
//   - kinematics  : (theta, omega) at sample rate; faults subscribe to it
//                   to compute their per-sample contribution.
const MOTOR_DC = {
    id: "spk.MotorDC",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "source",
    category: "Source",
    label: "Motor (DC)",
    color: "#2a6",
    // "start" and "stop" exec inputs are auto-injected by buildNodeDef for
    // all source nodes; there is no autoStart flag. Wire StartRuntime.started
    // to Motor.start so the motor activates when Play begins, or leave it
    // unwired and use the on-node play button to start it manually.
    inputs: [],
    outputs: [
        { name: "current",    type: "float" },
        { name: "kinematics", type: KINEMATICS },
    ],
    defaultConfig: {
        // The motor is a pure physics source: signal(t) with no knowledge
        // of sampling rate. The ADC (Sensor node) owns the sample rate.
        supplyVoltage: 24.0,
        resistance: 1.2,
        inductance: 0.01,
        backEmfConstant: 0.36,
        motorSpeedRps: 50.0,
        commutatorBars: 12,
        brushCount: 2,
        nominalCurrent: 5.0,
        loadFactor: 1.0,
        rippleFactor: 0.05,
        pwmFrequencyHz: 10000,
        pwmDutyCycle: 1.0,
    },
    attrSchema: [
        { key: "supplyVoltage",    label: "Supply (V)",         type: "number", min: 0.1,   step: 0.5  },
        { key: "resistance",       label: "Resistance (Ohm)",   type: "number", min: 0.001, step: 0.05 },
        { key: "inductance",       label: "Inductance (H)",     type: "number", min: 1e-6,  step: 0.001 },
        { key: "backEmfConstant",  label: "Back-EMF Ke (V/rps)",type: "number", min: 0,     step: 0.005 },
        { key: "motorSpeedRps",    label: "Speed nom (rps)",    type: "number", min: 0.1,   step: 1    },
        { key: "commutatorBars",   label: "Commutator bars",    type: "int",    min: 1,     step: 1    },
        { key: "brushCount",       label: "Brush count",        type: "int",    min: 0,     step: 1    },
        { key: "nominalCurrent",   label: "Nominal current (A)",type: "number", min: 0,     step: 0.1  },
        { key: "loadFactor",       label: "Load factor",        type: "number", min: 0,     step: 0.05 },
        { key: "rippleFactor",     label: "Ripple factor",      type: "number", min: 0, max: 1, step: 0.01 },
        { key: "pwmFrequencyHz",   label: "PWM freq (Hz)",      type: "number", min: 100,   step: 500  },
        { key: "pwmDutyCycle",     label: "PWM duty (0-1)",     type: "number", min: 0, max: 1, step: 0.01 },
    ],
};

// ---- Fault ops --------------------------------------------------------
// All faults share the same shape: kinematics in, current contribution out.
// The fault-specific attrs differ. Each contribution is summed onto the
// motor's clean current downstream by spk.Sum.
function faultOp(id, label, color, defaults, schema) {
    return {
        id, domain: "spikypanda.ai", opset: 1,
        kind: "processor",
        category: "Fault",
        label, color,
        inputs:  [{ name: "kinematics", type: KINEMATICS }],
        outputs: [{ name: "current",    type: "float" }],
        defaultConfig: defaults,
        attrSchema: schema,
    };
}

const SEVERITY_ATTR = { key: "severity", label: "Severity (0-1)", type: "number", min: 0, max: 1, step: 0.05 };

const MISALIGNMENT     = faultOp("spk.MisalignmentFault",  "Fault: Misalignment", "#a44",
    { severity: 0.5 },
    [SEVERITY_ATTR]);

const BEARING_DEFECT   = faultOp("spk.BearingFault",       "Fault: Bearing",      "#a64",
    { severity: 0.5, bpfoFactor: 4.5, bpfiFactor: 5.5 },
    [
        SEVERITY_ATTR,
        { key: "bpfoFactor", label: "BPFO factor", type: "number", min: 0.1, step: 0.1 },
        { key: "bpfiFactor", label: "BPFI factor", type: "number", min: 0.1, step: 0.1 },
    ]);

const BROKEN_BAR       = faultOp("spk.BrokenBarFault",     "Fault: Broken Bar",   "#a84",
    { severity: 0.5, totalBars: 12, brokenIndices: "0" },
    [
        SEVERITY_ATTR,
        { key: "totalBars",     label: "Total bars",       type: "int",    min: 1, step: 1 },
        // Encoded as a comma-separated string ("0,3,7"). Property panel
        // gives plain text editing; the runtime parses on init. Will be
        // upgraded to a structured editor when PropertyPanel grows arrays.
        { key: "brokenIndices", label: "Broken (csv idx)", type: "string" },
    ]);

const ECCENTRICITY     = faultOp("spk.EccentricityFault",  "Fault: Eccentricity", "#a4a",
    { severity: 0.5 },
    [SEVERITY_ATTR]);

const BRUSH_FAULT      = faultOp("spk.BrushFault",         "Fault: Brush",        "#84a",
    { severity: 0.5, faultyBrushIndex: 0 },
    [
        SEVERITY_ATTR,
        { key: "faultyBrushIndex", label: "Faulty brush idx", type: "int", min: 0, step: 1 },
    ]);

// ---- Gravity modulation (also kinematics-driven) ----------------------
// Encodes the horizontal-axis gravity sag that modulates the air gap at
// 1 x fMech. Same input/output shape as faults but conceptually environment
// (always-on if connected), not a defect. Kept as its own op for clarity.
const GRAVITY = {
    id: "spk.GravityModulation",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "processor",
    category: "Environment",
    label: "Gravity (1x fMech)",
    color: "#666",
    inputs:  [{ name: "kinematics", type: KINEMATICS }],
    outputs: [{ name: "current",    type: "float" }],
    defaultConfig: {
        rotorMass: 0.15,
        airGap: 0.0005,
        bearingRadialStiffness: 300000,
        // Equivalent current used to compute amplitude: typically motor
        // nominal current. Required because gravity sag amplitude scales
        // with the operating point current, not just shaft mass.
        equivalentCurrent: 5.0,
    },
    attrSchema: [
        { key: "rotorMass",              label: "Rotor mass (kg)",      type: "number", min: 0,     step: 0.01    },
        { key: "airGap",                 label: "Air gap g0 (m)",       type: "number", min: 1e-6,  step: 0.0001  },
        { key: "bearingRadialStiffness", label: "Bearing k (N/m)",      type: "number", min: 1,     step: 10000   },
        { key: "equivalentCurrent",      label: "I_eq (A)",             type: "number", min: 0,     step: 0.1     },
    ],
};

// ---- StartRuntime (event source) --------------------------------------
// Fires a single "started" event on its output port when the executor
// enters Play mode. Source nodes that prefer to be coordinated rather than
// auto-starting can wire their (future) `trigger` input to this output;
// they will run only when the StartRuntime fires.
//
// Phase 4d ships only the descriptor: graphs can include the node and the
// editor renders/serializes it, but the executor does not yet propagate
// trigger events. Phase 5 wires the plumbing. Until then, sources rely on
// their own `autoStart` config flag (and the manual chip in the Play panel
// header) for run/stop control.
const START_RUNTIME = {
    id: "spk.StartRuntime",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "source",
    category: "Composition",
    label: "Start Runtime",
    color: "#5a5",
    inputs: [],
    outputs: [{ name: "started", type: "exec" }],
    defaultConfig: {},
    attrSchema: [],
};

// ---- Sum (variadic adder) ---------------------------------------------
// Truly variadic: ships with one trailing input port (the "+"). The editor
// reconciles every Sum node so there is always exactly one unconnected
// trailing input; connecting it adds the next slot. Disconnecting the last
// connected input shrinks the chain back. The runtime side iterates all
// inputs by their port name (`in_<N>`) so any number works at runtime.
const SUM = {
    id: "spk.Sum",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "processor",
    category: "Composition",
    label: "Sum",
    color: "#446",
    inputs: [{ name: "in_0", type: "float" }],
    outputs: [{ name: "out", type: "float" }],
    defaultConfig: {},
    attrSchema: [],
    // Editor hint: this op uses the variadic-input convention. The naming
    // pattern `in_<N>` is mandatory; reconciler relies on it.
    variadicInput: { prefix: "in_", type: "float" },
};

// ---- FFT (windowed magnitude spectrum) --------------------------------
// Buffers the input stream up to `size` samples, applies a Hann window,
// computes the FFT, and emits one magnitude frame on its output port.
// Output cadence = 1 frame every `size` input samples (no overlap in v1).
//
// Each emitted payload carries `frame: true` so a downstream Scope (or
// any frame-aware viewer) replaces its display buffer with the new
// frame instead of appending — avoiding the "ramp of magnitudes" you
// would see if frames were treated as a continuous time-domain stream.
const FFT = {
    id: "spk.FFT",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "processor",
    category: "DSP",
    label: "FFT (magnitude)",
    color: "#27a",
    inputs:  [{ name: "in",       type: "float" }],
    outputs: [{ name: "spectrum", type: "float" }],
    defaultConfig: {
        // Power of 2. 1024 at fs=5000 Hz gives ~5 frames/s with 4.88 Hz bin
        // resolution and a Nyquist of 2500 Hz over 512 magnitude bins.
        size: 1024,
        // Hann is the default; "rect" disables windowing for testing.
        windowType: "hann",
        // Subtract the block mean before windowing (DC removal). Eliminates
        // spectral leakage from large DC offsets (e.g. motor nominal current)
        // that would otherwise swamp AC harmonics under auto-scale. Disable
        // only when you explicitly want to see the absolute signal level.
        dcRemoval: true,
    },
    attrSchema: [
        { key: "size",       label: "FFT size (pow2)",  type: "int",     min: 64, step: 64 },
        { key: "windowType", label: "Window (hann|rect)", type: "string" },
        { key: "dcRemoval",  label: "DC removal",        type: "boolean" },
    ],
};

// ---- Sensor (ADC) -----------------------------------------------------
// Takes the analog (continuous) current, applies gain/bias/Gaussian noise,
// emits a sampled stream at sampleRateHz. The actual "sampling" is implicit
// in the runtime: it drives the upstream node's clock at sampleRateHz.
const SENSOR = {
    id: "spk.Sensor",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "processor",
    category: "Sensor",
    label: "Sensor (ADC)",
    color: "#48a",
    inputs:  [{ name: "in",  type: "float" }],
    outputs: [{ name: "out", type: "float" }],
    // The Sensor (ADC) owns the sample rate. The physics source (MotorDC)
    // is a pure signal(t) model; it has no concept of sampling rate.
    // The executor picks up sampleRateHz from any node's config; placing it
    // here means the ADC sets the acquisition cadence for the whole chain.
    defaultConfig: {
        sampleRateHz: 5000,
        gain: 1.0,
        bias: 0.0,
        noiseStd: 0.01,
        rngSeed: 1,
    },
    attrSchema: [
        { key: "sampleRateHz", label: "Sample rate (Hz)", type: "int",    min: 100, step: 100 },
        { key: "gain",         label: "Gain",             type: "number",           step: 0.05 },
        { key: "bias",         label: "Bias (A)",         type: "number",           step: 0.01 },
        { key: "noiseStd",     label: "Noise std (A)",    type: "number", min: 0,   step: 0.005 },
        { key: "rngSeed",      label: "RNG seed",         type: "int",    min: 0,   step: 1    },
    ],
};

// ---- Scope (sink with detail page) ------------------------------------
// Live time-domain + spectrum view of any sample stream. Replaces the
// preview panels of the old all-in-one source page. The detail page itself
// lands in Phase 3; for now the descriptor is in place so graphs can wire
// to it.
const SCOPE = {
    id: "spk.Scope",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "sink",
    category: "Sink",
    label: "Scope",
    color: "#a55",
    inputs:  [{ name: "in", type: "float" }],
    outputs: [],
    detailPage: "scope/",  // built in Phase 3
    defaultConfig: {
        timeSpanS: 0.04,
    },
    attrSchema: [
        { key: "timeSpanS", label: "Time span (s)", type: "number", min: 0.001, step: 0.005 },
    ],
};

// ---- Composite "MotorCurrentDC" (legacy, kept as fallback) ------------
// Wraps the whole motor + sensor + faults pipeline in a single node whose
// detail page is the existing samples/motor/current/DC/source/ page. Useful
// as a quick-start for users who do not want to wire atomic nodes by hand.
// Internally it is the same physics; it is just not decomposed.
const MOTOR_CURRENT_DC_COMPOSITE = {
    id: "spk.MotorCurrentDC",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "source",
    category: "Source",
    label: "Motor Current DC (composite)",
    color: "#2a6",
    inputs: [],
    outputs: [{ name: "current", type: "float" }],
    detailPage: "motor/current/DC/source/",
    defaultConfig: {
        preset: "DC Brushed 24V",
        overrides: {},
        faults: [],
    },
    attrSchema: [
        { key: "preset", label: "Preset", type: "string" },
    ],
};

// ---- DatasetCapture (sink with passthrough output) --------------------
// Records labeled windows from its input stream and exposes a "dataset"
// stream so downstream NN training/inference nodes can subscribe.
const DATASET_CAPTURE = {
    id: "spk.DatasetCapture",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "sink",
    category: "Sink",
    label: "Dataset Capture",
    color: "#a33",
    inputs:  [{ name: "in", type: "float" }],
    outputs: [{ name: "dataset", type: "tensor" }],
    detailPage: "dataset/",
    defaultConfig: {
        label: "healthy",
        windowS: 1.0,
        count: 10,
        format: "json",
    },
    attrSchema: [
        { key: "label",   label: "Label",          type: "string" },
        { key: "windowS", label: "Window (s)",     type: "number", min: 0.05, step: 0.1 },
        { key: "count",   label: "Window count",   type: "int",    min: 1,    step: 1   },
        // Dropdown emulated as plain string until PropertyPanel grows a
        // proper select widget. Valid values: "json" | "csv".
        { key: "format",  label: "Format (json|csv)", type: "string" },
    ],
};

// ---- Op set ------------------------------------------------------------
// Order = toolbar order. Grouped logically for readability.
export const OPS_V1 = [
    // Motor + composite shortcut
    MOTOR_DC,
    MOTOR_CURRENT_DC_COMPOSITE,
    // Faults
    MISALIGNMENT,
    BEARING_DEFECT,
    BROKEN_BAR,
    ECCENTRICITY,
    BRUSH_FAULT,
    // Environment
    GRAVITY,
    // DSP
    FFT,
    // Composition / sensing
    START_RUNTIME,
    SUM,
    SENSOR,
    // Sinks
    SCOPE,
    DATASET_CAPTURE,
];

export function findOp(opId) {
    return OPS_V1.find((o) => o.id === opId) || null;
}

// Category render order. Editor menu bar uses this to lay out the menus
// left-to-right. Ops without a `category` (or with one not listed here)
// fall through to a "Misc" menu at the end.
export const CATEGORY_ORDER = [
    "Source",
    "Fault",
    "Environment",
    "DSP",
    "Composition",
    "Sensor",
    "Sink",
];

// Group OPS_V1 by category in the order defined above. Returns
// [{ name, ops: [...] }, ...] with empty categories omitted.
export function opsByCategory() {
    const buckets = new Map();
    CATEGORY_ORDER.forEach((c) => buckets.set(c, []));
    const misc = [];
    for (const op of OPS_V1) {
        const c = op.category;
        if (c && buckets.has(c)) buckets.get(c).push(op);
        else misc.push(op);
    }
    const out = [];
    for (const c of CATEGORY_ORDER) {
        const list = buckets.get(c);
        if (list && list.length) out.push({ name: c, ops: list });
    }
    if (misc.length) out.push({ name: "Misc", ops: misc });
    return out;
}

// Build the NodeDef the editor consumes. The data blob carries everything a
// detail page or the runtime needs to bind: op id (for dispatch), nodeId
// (its identity in the graph) and config (its applied attrs). Methods are
// attached so the editor's PropertyPanel can read/write the config via the
// Inspectable interface (getDisplayName / getProperties / setProperty),
// and so the editor renders runtime header buttons via the IRunnableNode
// (sources) / IToggableNode (faults, environment) interfaces.
export function buildNodeDef(op, nodeId) {
    const config = JSON.parse(JSON.stringify(op.defaultConfig));
    // Local runtime state that the on-node header buttons toggle. The
    // editor's Play mode wires _onRuntimeChange on Play start so the
    // toggle propagates to the executor; without a callback the state
    // is local-only (useful for design-time previewing of the on-state).
    const isStartRuntime = op.id === "spk.StartRuntime";
    const isSource   = op.kind === "source" && !isStartRuntime;
    const isToggable = op.category === "Fault" || op.category === "Environment";
    // Sources always start paused; the "start" exec input (wired from
    // StartRuntime or triggered by the on-node play button) activates them.
    let _running = false;
    let _enabled = true;
    const data = {
        op: op.id,
        domain: op.domain,
        opset: op.opset,
        nodeId: nodeId,
        config: config,
        // Optional callback: assigned by nodeeditor.js on Play start so
        // setRunning / setEnabled forward to executor.setNodeRunning. Null
        // in design mode and after Play exits.
        _onRuntimeChange: null,
        // Direct setters used by nodeeditor.js to sync local state from
        // the executor when entering Play (so the on-node button reflects
        // autoStart-derived initial state without firing the forwarder).
        _setRunningLocal: function (r) { _running = !!r; },
        _setEnabledLocal: function (e) { _enabled = !!e; },
        // Inspectable interface: drives the editor property panel. Each
        // schema entry becomes one editable row. We also expose op label
        // as the panel header so the user knows what they are editing.
        getDisplayName: function () { return op.label; },
        getProperties: function () {
            return (op.attrSchema || []).map(function (s) {
                return {
                    key: s.key,
                    value: config[s.key],
                    editable: true,
                    // PropertyPanel only knows string|number|boolean. Map
                    // "int" to "number" and validate integer in setProperty.
                    type: s.type === "boolean" ? "boolean"
                        : s.type === "string"  ? "string"
                        : "number",
                };
            });
        },
        setProperty: function (key, value) {
            const s = (op.attrSchema || []).find((x) => x.key === key);
            if (!s) { config[key] = value; return; }
            let v = value;
            if (s.type === "number" || s.type === "int") {
                v = (typeof v === "number") ? v : parseFloat(v);
                if (!isFinite(v)) return;
                if (s.type === "int") v = Math.round(v);
                if (s.min !== undefined && v < s.min) v = s.min;
                if (s.max !== undefined && v > s.max) v = s.max;
            } else if (s.type === "boolean") {
                v = !!v;
            } else {
                v = String(v);
            }
            config[key] = v;
        },
        // Serializable interface: editor.save() calls this so config
        // round-trips through .spikypanda files. We only persist the
        // pure-data subset; the methods are recreated on load.
        serialize: function () {
            return {
                op: this.op,
                domain: this.domain,
                opset: this.opset,
                nodeId: this.nodeId,
                config: JSON.parse(JSON.stringify(this.config)),
            };
        },
        deserialize: function (blob) {
            if (!blob || typeof blob !== "object") return;
            if (blob.op) this.op = blob.op;
            if (blob.nodeId) this.nodeId = blob.nodeId;
            if (blob.domain) this.domain = blob.domain;
            if (blob.opset) this.opset = blob.opset;
            if (blob.config) {
                // Replace, not merge: avoids stale keys from older versions.
                Object.keys(this.config).forEach((k) => delete this.config[k]);
                Object.assign(this.config, blob.config);
            }
        },
    };
    // IRunnableNode: only sources (excluding the event-emitter
    // StartRuntime which has no runtime to control).
    if (isSource) {
        data.isRunning = function () { return _running; };
        data.setRunning = function (r) {
            _running = !!r;
            if (typeof data._onRuntimeChange === "function") data._onRuntimeChange(_running);
        };
    }
    // IToggableNode: faults and environment processors.
    if (isToggable) {
        data.isEnabled = function () { return _enabled; };
        data.setEnabled = function (e) {
            _enabled = !!e;
            if (typeof data._onRuntimeChange === "function") data._onRuntimeChange(_enabled);
        };
    }
    // ── Auto-injected exec pins ──────────────────────────────────────────
    // Sources (IStartable) get "start" / "stop" prepended to their inputs.
    // Wire StartRuntime.started → source.start to activate on BeginPlay, or
    // wire any other event source to control it at runtime.
    //
    // Processors and sinks (not sources, not StartRuntime, not variadic) get
    // "pause" and "resume" appended to inputs, and "paused" to outputs.
    // "pause" freezes (no-op if already frozen); "resume" un-freezes (no-op if
    // already live). "paused" fires on entry; "resumed" fires on exit.
    // Variadic nodes (Sum) are excluded: their dynamic port lists would
    // interfere with index-based wiring in the editor.
    const execInputsPrefix = isSource
        ? [{ name: "start", type: "exec" }, { name: "stop", type: "exec" }]
        : [];
    const needsFlowPins = !isStartRuntime && !isSource && !op.variadicInput;
    const execInputsSuffix  = needsFlowPins
        ? [{ name: "pause", type: "exec" }, { name: "resume", type: "exec" }]
        : [];
    const execOutputsSuffix = [
        ...(isSource      ? [{ name: "started", type: "exec" }, { name: "stopped", type: "exec" }] : []),
        ...(needsFlowPins ? [{ name: "paused",  type: "exec" }, { name: "resumed", type: "exec" }] : []),
    ];

    return {
        label: op.label,
        color: op.color,
        inputs: [
            ...execInputsPrefix,
            ...op.inputs.map((p) => ({ name: p.name, type: p.type })),
            ...execInputsSuffix,
        ],
        outputs: [
            ...op.outputs.map((p) => ({ name: p.name, type: p.type })),
            ...execOutputsSuffix,
        ],
        data: data,
    };
}

// Best-effort unique id within a design session. Not cryptographic.
let _counter = 0;
export function generateNodeId(opId) {
    _counter += 1;
    const short = (opId || "node").replace(/^spk\./, "").toLowerCase();
    return `${short}_${Date.now().toString(36)}_${_counter}`;
}
