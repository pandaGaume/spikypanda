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
// type, ...constraints }. Types: "number" | "int" | "string" | "boolean" | "select".
// "select" requires an `options: [{ value, label }]` array and renders as a
// native <select> dropdown in the property panel.
//
// Serialization format (.spikypanda JSON):
//   "@type"  : op id — the authoritative type discriminant for reconstruction.
//              Follows the JSON-LD / ONNX convention.  A loader uses "@type"
//              to look up the op and re-attach its methods; it does not need
//              any other context.  Versioning: "@type" is stable; breaking
//              changes increment opset and the deserializer can branch on it.
//   "op"     : same value as "@type", kept for human readability and backward
//              compatibility with files saved before "@type" was introduced.
//   "nodeId" : instance id assigned by the editor (node_N).
//   "config" : snapshot of the mutable attribute values.

// ---- Shared port types ------------------------------------------------
// Kinematics: (theta, omega) per sample. vec2 color prevents miswiring to scalars.
const KINEMATICS = "vec2";
// Fault: opaque config descriptor injected into a motor's simulation host.
// The motor runtime reads the op id and config of each connected fault node
// to build the fault pipeline before the first advance() tick. Not a
// streaming signal — no data flows at sample rate through this port.
const FAULT = "fault";

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
    //
    // dutyCycle: optional float input (0-1). When wired, overrides the static
    // pwmDutyCycle config each tick, allowing live speed control from any
    // float source (Constant, Ramp, PWM, etc.). When unwired, the config value is used.
    //
    // pwmFrequency: optional float input (Hz). When wired (e.g. from a spk.PWM
    // node), overrides the pwmFrequencyHz config each tick so both PWM params
    // can be driven together from a single PWM node.
    inputs: [
        { name: "dutyCycle",    type: "float" },
        { name: "pwmFrequency", type: "float" },
    ],
    // Fault nodes wire here. The reconciler keeps one trailing empty slot;
    // connecting it grows the chain automatically (same pattern as Sum).
    variadicInput: { prefix: "fault_", type: FAULT },
    outputs: [
        { name: "current",    type: "float" },
        { name: "kinematics", type: KINEMATICS },
        // Instantaneous mechanical speed in rps (revolutions per second),
        // one sample per tick. Feed into a Scope to monitor live speed,
        // or into a Sensor/FFT to analyse speed fluctuations.
        { name: "speed",      type: "float" },
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
        loadFactor: 1.0,
        rippleFactor: 0.05,
        pwmFrequencyHz: 10000,
        pwmDutyCycle: 1.0,
    },
    // I_DC (steady-state armature current) is NOT a direct property.
    // It is fully determined by the electrical equation:
    //   I_DC = (supplyVoltage * pwmDutyCycle - backEmfConstant * motorSpeedRps) / resistance
    // With the defaults below: (24*1 - 0.36*50) / 1.2 = (24-18)/1.2 = 5 A.
    // Adjust supplyVoltage, pwmDutyCycle, backEmfConstant, motorSpeedRps or
    // resistance to change the DC operating point.
    attrSchema: [
        { key: "supplyVoltage",    label: "Supply V  [I_DC = (V*D - Ke*w)/R]", type: "number", min: 0.1,   step: 0.5  },
        { key: "resistance",       label: "Resistance R (Ohm)",                 type: "number", min: 0.001, step: 0.05 },
        { key: "inductance",       label: "Inductance L (H)",                   type: "number", min: 1e-6,  step: 0.001 },
        { key: "backEmfConstant",  label: "Back-EMF Ke (V/rps)",                type: "number", min: 0,     step: 0.005 },
        { key: "motorSpeedRps",    label: "Speed w (rps)",                      type: "number", min: 0.1,   step: 1    },
        { key: "commutatorBars",   label: "Commutator bars",                    type: "int",    min: 1,     step: 1    },
        { key: "brushCount",       label: "Brush count",                        type: "int",    min: 0,     step: 1    },
        { key: "loadFactor",       label: "Load factor",                        type: "number", min: 0,     step: 0.05 },
        { key: "rippleFactor",     label: "Ripple factor",                      type: "number", min: 0, max: 1, step: 0.01 },
        { key: "pwmFrequencyHz",   label: "PWM freq (Hz)",                      type: "number", min: 100,   step: 500  },
        { key: "pwmDutyCycle",     label: "PWM duty D (0-1)",                   type: "number", min: 0, max: 1, step: 0.01 },
    ],
};

// ---- MotorPMSM (whole PMSM simulation as one source node) -------------
// Wraps the entire PmsmSimulation host : machine (dq state-space), FOC
// controller, SVPWM modulator, 3-phase inverter, housing mechanics,
// gravity context (field + transform + projection vector), env nodes
// (RotorSag, BearingPreload, MountingCompliance) and faults (Imbalance,
// Eccentricity).
//
// Unlike the brushed DC pattern (where faults are downstream processors
// on the kinematics stream), PMSM faults perturb the simulation's internal
// state (flux envelope, housing forces) inside the closed FOC loop. There
// is no clean way to extract a fault-only contribution from outside the
// loop. The pragmatic v1 exposes one configurable source node ; finer-
// grained ops will follow once the host pattern stabilises.
//
// Outputs (12 channels) :
//   i_a, i_b, i_c       : stator phase currents (A)
//   i_d, i_q            : rotor frame currents (A)
//   omega               : mechanical speed (rad/s)
//   theta               : mechanical angle (rad, unwrapped)
//   torque_em           : electromagnetic torque (N.m)
//   accel_x, accel_y, accel_z : housing acceleration (m/s^2)
//   v_bus               : DC bus voltage (V)
//
// Inputs : optional speedTarget and loadTorque overrides (when wired,
// they override the static config each tick).
const MOTOR_PMSM = {
    id: "spk.MotorPMSM",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "source",
    category: "Source",
    label: "Motor (PMSM / BLDC)",
    color: "#26a",
    inputs: [
        { name: "speedTarget", type: "float" },
        { name: "loadTorque",  type: "float" },
    ],
    // Fault nodes wire here. The reconciler keeps one trailing empty slot;
    // connecting it grows the chain automatically (same pattern as Sum).
    variadicInput: { prefix: "fault_", type: FAULT },
    outputs: [
        { name: "i_a",       type: "float" },
        { name: "i_b",       type: "float" },
        { name: "i_c",       type: "float" },
        { name: "i_d",       type: "float" },
        { name: "i_q",       type: "float" },
        { name: "omega",     type: "float" },
        { name: "theta",     type: "float" },
        { name: "torque_em", type: "float" },
        { name: "accel_x",   type: "float" },
        { name: "accel_y",   type: "float" },
        { name: "accel_z",   type: "float" },
        { name: "v_bus",     type: "float" },
    ],
    defaultConfig: {
        // Machine preset. Currently only ECX PRIME ; more presets land
        // alongside Phase 3 calibration.
        preset: "ecxPrime",
        // Operating point.
        speedTargetRps: 50.0,
        loadTorque:     0.0,
        // Inverter / SVPWM.
        vBus:           24.0,
        pwmFrequencyHz: 20000,
        // Gravity context.
        orientation:  "horizontal",   // horizontal | verticalUp | verticalDown
        gravityField: "earth",         // earth | microgravity
        // Env enables (full Phase 1 pipeline by default).
        enableRotorSag:           true,
        enableBearingPreload:     true,
        enableMountingCompliance: true,
        // Faults are now injected via the variadic fault_* input ports.
        // Connect a spk.FaultPmsm.* node to fault_0..fault_3 to activate.
    },
    attrSchema: [
        {
            key: "preset", label: "Machine preset", type: "select",
            options: [
                { value: "ecxPrime", label: "Maxon ECX PRIME 6 M / 16 L" },
            ],
        },
        { key: "speedTargetRps",   label: "Speed target (rps)",     type: "number", min: 0,    step: 1     },
        { key: "loadTorque",       label: "Load torque (N.m)",       type: "number", min: 0,    step: 1e-5  },
        { key: "vBus",             label: "DC bus (V)",              type: "number", min: 1,    step: 0.5   },
        { key: "pwmFrequencyHz",   label: "PWM freq (Hz)",           type: "int",    min: 1000, step: 1000  },
        {
            key: "orientation", label: "Motor orientation", type: "select",
            options: [
                { value: "horizontal",   label: "Horizontal (shaft along world X)" },
                { value: "verticalUp",   label: "Vertical, shaft up"                },
                { value: "verticalDown", label: "Vertical, shaft down"              },
            ],
        },
        {
            key: "gravityField", label: "Gravity field", type: "select",
            options: [
                { value: "earth",         label: "Earth (1g, world -Z)" },
                { value: "microgravity",  label: "Microgravity (0g)"     },
            ],
        },
        { key: "enableRotorSag",            label: "Env: rotor sag",            type: "boolean" },
        { key: "enableBearingPreload",      label: "Env: bearing preload",      type: "boolean" },
        { key: "enableMountingCompliance",  label: "Env: mounting compliance",  type: "boolean" },
    ],
};

// ---- Fault ops --------------------------------------------------------
// Faults are config-injection nodes: they carry no streaming signal.
// Each fault node outputs a single `fault` typed port that connects to
// one of the motor's variadic `fault_*` input slots. At Play start the
// executor collects every connected fault node and passes its op id +
// config to the motor simulation before the first tick.
//
// Fault nodes are IToggableNode (enable/disable toggle button on the
// card) so the user can flip a fault on/off at runtime. noFlowPins
// suppresses the generic pause/resume pins (semantically wrong here).
function faultOp(id, label, color, defaults, schema) {
    return {
        id, domain: "spikypanda.ai", opset: 1,
        kind: "processor",
        category: "Fault",
        label, color,
        noFlowPins: true,
        inputs:  [],
        outputs: [{ name: "fault", type: FAULT }],
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
    { severity: 0.5, totalBars: 12, brokenIndices: "0", slip: 0.02 },
    [
        SEVERITY_ATTR,
        { key: "totalBars",     label: "Total bars",       type: "int",    min: 1,    step: 1    },
        // Comma-separated bar indices ("0" = 1 bar, "0,3" = 2 bars).
        // The runtime counts them; individual indices are metadata only.
        { key: "brokenIndices", label: "Broken (csv idx)", type: "string" },
        // Slip: how far sidebands are offset from the commutation frequency.
        // fComm is derived from the motor (kinematics.fComm), not declared here.
        { key: "slip",          label: "Slip (0-1)",       type: "number", min: 0, max: 1, step: 0.005 },
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

// ---- PMSM fault ops ---------------------------------------------------
// Same config-injection shape as the DC faults above. These map directly
// to the IPmsmFaultNode implementations in the sensors package:
//   D1 Imbalance      → RotorImbalance    (centrifugal housing force)
//   D2 Eccentricity   → RotorEccentricity (static air-gap variation)
//   D3 WindingShort   → WindingShortCircuit (phase resistance drop)
//   D4 BearingWear    → BearingDegradation (radial force + stiffness loss)
const PMSM_FAULT_IMBALANCE = faultOp(
    "spk.FaultPmsm.Imbalance",
    "PMSM Fault: Imbalance (D1)", "#b46",
    { severity: 0.5 },
    [SEVERITY_ATTR]);

const PMSM_FAULT_ECCENTRICITY = faultOp(
    "spk.FaultPmsm.Eccentricity",
    "PMSM Fault: Eccentricity (D2)", "#b66",
    { severity: 0.5 },
    [SEVERITY_ATTR]);

const PMSM_FAULT_WINDING_SHORT = faultOp(
    "spk.FaultPmsm.WindingShort",
    "PMSM Fault: Winding Short (D3)", "#b86",
    { severity: 0.5, phase: 0 },
    [
        SEVERITY_ATTR,
        { key: "phase", label: "Phase (0=A 1=B 2=C)", type: "int", min: 0, max: 2, step: 1 },
    ]);

const PMSM_FAULT_BEARING_WEAR = faultOp(
    "spk.FaultPmsm.BearingWear",
    "PMSM Fault: Bearing Wear (D4)", "#9b6",
    { severity: 0.5 },
    [SEVERITY_ATTR]);

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

// ---- Constant (float signal source) -----------------------------------
// Emits a fixed scalar value every tick. The primary use-case is feeding
// control inputs (e.g. dutyCycle on MotorDC) with a static setpoint so
// the user can change it via the property panel without re-wiring. Wire
// Constant.out → MotorDC.dutyCycle to override the motor's duty cycle live.
//
// noStartStop : a Constant has nothing to "start" or "stop" — it always
// emits its configured value. Skip the auto-injected start / stop /
// started / stopped exec pins so the node stays minimal, and skip the
// IRunnableNode interface (no on-node play button) since pausing makes
// no sense for a constant.
const CONSTANT = {
    id: "spk.Constant",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "source",
    category: "Source",
    label: "Constant",
    color: "#556",
    noStartStop: true,
    inputs: [],
    outputs: [{ name: "out", type: "float" }],
    defaultConfig: { value: 1.0 },
    attrSchema: [
        { key: "value", label: "Value", type: "number", step: 0.05 },
    ],
};

// ---- Ramp (linearly sweeping float source) ----------------------------
// Outputs a value that increases from `start` to `end` over `durationS`
// seconds, then holds at `end` (clamp) or restarts from `start` (loop).
// Feed into MotorDC.dutyCycle to simulate a speed ramp.
const RAMP = {
    id: "spk.Ramp",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "source",
    category: "Source",
    label: "Ramp",
    color: "#556",
    inputs: [],
    outputs: [
        { name: "out",   type: "float" },
        // `ended`: 0.0 while ramp is running, 1.0 once it has reached `end`
        // (non-looping only; stays at 1.0 after the ramp completes).
        // Wire to a Constant node's enable or a Sum input to chain effects.
        { name: "ended", type: "float" },
    ],
    defaultConfig: { start: 0.0, end: 1.0, durationS: 5.0, loop: false },
    attrSchema: [
        { key: "start",     label: "Start value",   type: "number",  step: 0.05 },
        { key: "end",       label: "End value",     type: "number",  step: 0.05 },
        { key: "durationS", label: "Duration (s)",  type: "number",  min: 0.001, step: 0.5 },
        { key: "loop",      label: "Loop",          type: "boolean" },
    ],
};

// ---- PWM driver (dual float source) ----------------------------------
// Models a PWM driver IC: two config knobs (frequencyHz, dutyCycle) emitted
// as a pair of constant float streams. Wire PWM.dutyCycle to MotorDC.dutyCycle
// and PWM.frequencyHz to MotorDC.pwmFrequency to centralise all PWM control
// in one node instead of two separate Constant nodes.
//
// Neither output generates an actual square wave — the motor physics model
// uses frequencyHz and dutyCycle as parameters, not as a sampled waveform.
const PWM = {
    id: "spk.PWM",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "source",
    category: "Source",
    label: "PWM Driver",
    color: "#466",
    inputs: [],
    outputs: [
        { name: "frequencyHz", type: "float" },
        { name: "dutyCycle",   type: "float" },
    ],
    defaultConfig: {
        frequencyHz: 10000,
        dutyCycle:   1.0,
    },
    attrSchema: [
        { key: "frequencyHz", label: "Frequency (Hz)", type: "number", min: 100, step: 500 },
        { key: "dutyCycle",   label: "Duty cycle (0-1)", type: "number", min: 0, max: 1, step: 0.01 },
    ],
};

// ---- Switch (binary signal mux) --------------------------------------
// Selects between two float streams based on a control signal.
//   select < threshold  → out = a
//   select >= threshold → out = b
// Primary use-case: hand control from a Ramp to a PWM Driver once the
// ramp has completed. Wire Ramp.ended → Switch.select, Ramp.out → Switch.a,
// PWM.dutyCycle → Switch.b, Switch.out → MotorDC.dutyCycle.
const SWITCH = {
    id: "spk.Switch",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "processor",
    category: "Composition",
    label: "Switch (A/B)",
    // Pure combinational mux: no internal state, no pause semantics.
    noFlowPins: true,
    color: "#446",
    inputs: [
        { name: "a",      type: "float" },
        { name: "b",      type: "float" },
        { name: "select", type: "float" },
    ],
    outputs: [{ name: "out", type: "float" }],
    defaultConfig: { threshold: 0.5 },
    attrSchema: [
        { key: "threshold", label: "Threshold (select >= → B)", type: "number", min: 0, step: 0.05 },
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
        // Hop size (samples between successive frames). Must be <= size.
        // Default = size means no overlap (one frame per full window).
        // 512 = 50 % overlap (doubles frame rate, smoother spectrograms).
        // 256 = 75 % overlap (4x frame rate, recommended for CNN spectrograms).
        hopSize: 1024,
        // Spectral window function applied before the DFT.
        // hann     : good all-round default (-32 dB sidelobes).
        // hamming  : slightly better frequency resolution than Hann (-43 dB).
        // blackman : lowest sidelobes (-58 dB); best for MCSA broken-bar
        //            detection where sidebands sit 1-4 Hz from the fundamental.
        // flattop  : flattest passband; use when you need accurate sideband
        //            amplitude (fault severity estimation).
        // rect     : no windowing; only for testing with exactly periodic signals.
        windowType: "hann",
        // Subtract the block mean before windowing. Eliminates spectral leakage
        // from the motor's DC bias (nominal current) that would otherwise raise
        // the noise floor around the fundamental and mask sidebands.
        // Equivalent to AC coupling on a scope. Keep ON for MCSA.
        dcRemoval: true,
    },
    attrSchema: [
        { key: "size",       label: "FFT size (pow2)",    type: "int",     min: 64, step: 64 },
        { key: "hopSize",    label: "Hop size (samples)", type: "int",     min: 1,  step: 64 },
        {
            key: "windowType", label: "Window function", type: "select",
            options: [
                { value: "hann",     label: "Hann (default, -32 dB)"          },
                { value: "hamming",  label: "Hamming (-43 dB)"                 },
                { value: "blackman", label: "Blackman (-58 dB, best for MCSA)" },
                { value: "flattop",  label: "Flat-top (amplitude accuracy)"    },
                { value: "rect",     label: "Rectangular (no window)"          },
            ],
        },
        { key: "dcRemoval",  label: "DC removal (AC coupling)", type: "boolean" },
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
        label: "",
        sampleRateHz: 5000,
        gain: 1.0,
        bias: 0.0,
        noiseStd: 0.01,
        rngSeed: 1,
    },
    attrSchema: [
        { key: "label",        label: "Name",             type: "string" },
        { key: "sampleRateHz", label: "Sample rate (Hz)", type: "int",    min: 100, step: 100 },
        { key: "gain",         label: "Gain",             type: "number",           step: 0.05 },
        { key: "bias",         label: "Bias (A)",         type: "number",           step: 0.01 },
        { key: "noiseStd",     label: "Noise std (A)",    type: "number", min: 0,   step: 0.005 },
        { key: "rngSeed",      label: "RNG seed",         type: "int",    min: 0,   step: 1    },
    ],
};

// ---- Gauge (sink — live numeric + arc display) ------------------------
// Reads any float stream and displays the instantaneous value as a large
// number inside an arc gauge in the play panel. No processing; the widget
// subscribes directly to the upstream stream on the bus (same pattern as
// Scope). Configure min/max so the arc fills meaningfully.
const GAUGE = {
    id: "spk.Gauge",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "sink",
    category: "Sink",
    label: "Gauge",
    color: "#56a",
    inputs:  [{ name: "in", type: "float" }],
    outputs: [],
    defaultConfig: {
        label:    "",
        unit:     "rps",
        min:      0,
        max:      100,
        decimals: 1,
    },
    attrSchema: [
        { key: "label",    label: "Name",     type: "string" },
        { key: "unit",     label: "Unit",     type: "string" },
        { key: "min",      label: "Min",      type: "number",           step: 1   },
        { key: "max",      label: "Max",      type: "number",           step: 1   },
        { key: "decimals", label: "Decimals", type: "int",    min: 0,   step: 1   },
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
        label: "",
        timeSpanS: 0.04,
        // Auto-trigger : align the visible window to a rising mid-line
        // crossing so a periodic signal appears stationary. Default ON
        // because the typical use-case is monitoring a periodic motor
        // signal (current, vibration). Turn off to fall back to the
        // classic free-running rolling window (latest n samples).
        autoTrigger: true,
    },
    attrSchema: [
        { key: "label",       label: "Name",           type: "string" },
        { key: "timeSpanS",   label: "Time span (s)", type: "number", min: 0.001, step: 0.005 },
        { key: "autoTrigger", label: "Auto-trigger (zero-crossing)", type: "boolean" },
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

// ---- DatasetCapture (multi-channel, labeled window recorder) ----------
// Variadic float inputs. `in_0` drives the capture cadence:
//   - If `in_0` carries an FFT frame (payload.frame === true), one record
//     is saved per incoming frame. This is the intended primary use-case:
//     FFT.spectrum → DatasetCapture.in_0 defines the feature vector.
//   - If `in_0` is a raw time-domain stream, samples accumulate and one
//     record is saved every `windowS` seconds.
// All other inputs (`in_1`, `in_2`, ...) are sampled at the same moment:
//   frame inputs are saved as arrays, scalar streams as [lastValue].
//
// The captured windows are exported via the play-panel widget (Export JSON
// / Export CSV). JSON format: { classes, windows:[{label,channels:[[]]}],
// sampleRate, channelNames }. CSV: one flat row per window.
const DATASET_CAPTURE = {
    id: "spk.DatasetCapture",
    domain: "spikypanda.ai",
    opset: 1,
    kind: "processor",
    category: "Sink",
    label: "Dataset Capture",
    color: "#a33",
    // Non-variadic declared ports (preserved by the reconciler even when
    // unconnected). `in_*` are the variadic data channels.
    // `labelIndex` is optional: when wired, floor(value) indexes into
    // classNames to set the active label each tick. When unwired, the
    // static `label` config is used.
    inputs: [
        { name: "in_0",       type: "float" },
        { name: "labelIndex", type: "float" },
    ],
    outputs: [],
    defaultConfig: {
        // Static label used when labelIndex is not wired.
        label:        "healthy",
        // Comma-separated class names for labelIndex wiring.
        // index 0 = first name, index 1 = second, etc.
        classNames:   "healthy",
        windowS:      1.0,
        channelNames: "ch0",
        filename:     "dataset",
        maxWindows:   500,
    },
    attrSchema: [
        { key: "label",        label: "Label (static/fallback)",  type: "string" },
        { key: "classNames",   label: "Class names (csv)",        type: "string" },
        { key: "windowS",      label: "Window (s)",               type: "number", min: 0.05, step: 0.1 },
        { key: "channelNames", label: "Channel names (csv)",      type: "string" },
        { key: "filename",     label: "Output filename",          type: "string" },
        { key: "maxWindows",   label: "Max windows",              type: "int",    min: 1,    step: 10  },
    ],
    variadicInput: { prefix: "in_", type: "float" },
    // Marks DatasetCapture as implementing IStartableNode. buildNodeDef
    // attaches isStarted / setStarted and the _onStartChange callback hook
    // that nodeeditor.js wires to the runtime's startCapture / stopCapture.
    startable: true,
};

// ---- Op set ------------------------------------------------------------
// Order = toolbar order. Grouped logically for readability.
export const OPS_V1 = [
    // Motor + composite shortcut
    MOTOR_DC,
    MOTOR_PMSM,
    MOTOR_CURRENT_DC_COMPOSITE,
    // Signal sources (feed control inputs)
    CONSTANT,
    RAMP,
    PWM,
    // Faults — DC brushed motor
    MISALIGNMENT,
    BEARING_DEFECT,
    BROKEN_BAR,
    ECCENTRICITY,
    BRUSH_FAULT,
    // Faults — PMSM / BLDC
    PMSM_FAULT_IMBALANCE,
    PMSM_FAULT_ECCENTRICITY,
    PMSM_FAULT_WINDING_SHORT,
    PMSM_FAULT_BEARING_WEAR,
    // Environment
    GRAVITY,
    // DSP
    FFT,
    // Composition / sensing
    START_RUNTIME,
    SUM,
    SWITCH,
    SENSOR,
    // Sinks
    GAUGE,
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
    const isSource    = op.kind === "source" && !isStartRuntime;
    const isToggable  = op.category === "Fault" || op.category === "Environment";
    const isStartable = !!op.startable;
    // op.noStartStop : a source that always emits and has no run/pause
    // semantics (e.g. Constant). Skip exec pin injection AND the
    // IRunnableNode interface so no on-node play button is rendered.
    const isRunnable  = isSource && !op.noStartStop;
    // Sources always start paused; the "start" exec input (wired from
    // StartRuntime or triggered by the on-node play button) activates them.
    let _running = false;
    let _enabled = true;
    let _started = false;
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
        // Callback for IStartableNode: wired by nodeeditor.js on Play start to
        // call inst.startCapture() / inst.stopCapture() on the runtime instance.
        _onStartChange: null,
        // Direct setters used by nodeeditor.js to sync local state from
        // the executor when entering Play (so the on-node button reflects
        // the authoritative state without firing the forwarder).
        _setRunningLocal: function (r) { _running = !!r; },
        _setEnabledLocal: function (e) { _enabled = !!e; },
        _setStartedLocal: function (s) { _started = !!s; },
        // Inspectable interface: drives the editor property panel. Each
        // schema entry becomes one editable row. We also expose op label
        // as the panel header so the user knows what they are editing.
        getDisplayName: function () { return config.label || op.label; },
        getProperties: function () {
            return (op.attrSchema || []).map(function (s) {
                const entry = {
                    key:      s.key,
                    value:    config[s.key],
                    editable: true,
                    // "select" gets a native <select> dropdown in the panel.
                    // "int" maps to "number" with integer validation in setProperty.
                    type: s.type === "boolean" ? "boolean"
                        : s.type === "select"  ? "select"
                        : s.type === "string"  ? "string"
                        : "number",
                };
                if (s.type === "select" && s.options) entry.options = s.options;
                return entry;
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
            } else if (s.type === "select") {
                v = String(v);
                // Reject values not in the declared option list.
                if (s.options && !s.options.find(function (o) { return o.value === v; })) return;
            } else {
                v = String(v);
            }
            config[key] = v;
        },
        // Serializable interface: editor.save() calls this so config
        // round-trips through .spikypanda files. We only persist the
        // pure-data subset; the methods are recreated on load via the
        // @type discriminant.
        //
        // "@type" is the authoritative type reference used by the
        // deserializer to look up the correct op and re-attach its methods.
        // Using "@type" (JSON-LD convention) rather than relying on the
        // runtime "op" field makes the file format self-describing: a
        // loader can reconstruct the exact node class without any other
        // context.  "op" is kept for backward compatibility with older files.
        serialize: function () {
            return {
                "@type": this.op,   // type discriminant — primary key for deserialization
                op:      this.op,   // kept for backward compat + human readability
                domain:  this.domain,
                opset:   this.opset,
                nodeId:  this.nodeId,
                config:  JSON.parse(JSON.stringify(this.config)),
            };
        },
        deserialize: function (blob) {
            if (!blob || typeof blob !== "object") return;
            // "@type" is the authoritative id; fall back to "op" for files
            // saved before @type was introduced.
            const typeId = blob["@type"] || blob.op;
            if (typeId && typeId !== this.op) return; // wrong target, ignore
            if (blob.nodeId) this.nodeId = blob.nodeId;
            if (blob.domain) this.domain = blob.domain;
            if (blob.opset)  this.opset  = blob.opset;
            if (blob.config) {
                // Replace, not merge: avoids stale keys from older versions.
                Object.keys(this.config).forEach((k) => delete this.config[k]);
                Object.assign(this.config, blob.config);
            }
        },
    };
    // IRunnableNode: only sources (excluding StartRuntime which has no
    // runtime to control, and "always-on" sources flagged noStartStop).
    if (isRunnable) {
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
    // IStartableNode: capture/recorder nodes (DatasetCapture).
    // Distinct from IRunnableNode (sources) and IToggableNode (faults):
    // a startable node is always live in the graph but captures only when
    // the user explicitly starts recording.
    if (isStartable) {
        data.isStarted = function () { return _started; };
        data.setStarted = function (s) {
            _started = !!s;
            if (typeof data._onStartChange === "function") data._onStartChange(_started);
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
    const execInputsPrefix = isRunnable
        ? [{ name: "start", type: "exec" }, { name: "stop", type: "exec" }]
        : [];
    const needsFlowPins = !isStartRuntime && !isSource && !op.variadicInput && !op.noFlowPins;
    const execInputsSuffix  = needsFlowPins
        ? [{ name: "pause", type: "exec" }, { name: "resume", type: "exec" }]
        : [];
    const execOutputsSuffix = [
        ...(isRunnable    ? [{ name: "started", type: "exec" }, { name: "stopped", type: "exec" }] : []),
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
