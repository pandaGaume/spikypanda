# Generates the motorwatch demo graphs (version 3 .spikypanda files) into
# packages/host/www/data/graphs/. Hand-authoring layout port indices is
# error-prone; this generator derives them from the registered port lists.
#
# Design constraints honored:
#   - The load torque is a SINGLE swappable wire into the motor's tau_load
#     input: the motor block is reusable across applications by replacing
#     the one load node (Sim.Graph encapsulation is editor-only today:
#     subGraphJson is not instantiated at load time, so graphs stay flat).
#   - The spk.onnx:model node declares input/embedding tensor ports in the
#     layout so the chain is pre-wired; they materialize once the demo
#     encoder (input named "input", output named "embedding") is loaded.
import json
import os

ROOT = os.path.join(os.path.dirname(__file__), "..", "packages", "host", "www", "data", "graphs")

# Registered port lists per typeId (name, type), in registration order.
PORTS = {
    "Physics.Scene:earth": (
        [("atmosphere_in", "atmosphere"), ("solver_in_0", "solver"), ("shared_in_0", "shared"),
         ("gravity_in", "vec3"), ("temperature_in", "float"), ("pressure_in", "float"),
         ("density_in", "float"), ("time_scale_in", "float"), ("local_position_in", "vec3"),
         ("local_rotation_in", "vec4"), ("local_scale_in", "vec3")],
        [("scene_out", "scene")],
    ),
    "Logic.Input:slider": ([], [("value", "float")]),
    # Lifecycle nodes: control ports only (not listed in the layout
    # data-port arrays, mirroring genuine editor saves).
    "Core.Lifecycle:start": ([], []),
    "Core.Lifecycle:stop": ([], []),
    "Logic.Time:clock": ([], [("t", "float")]),
    "Physics.Electric.Motor.DC:inverter": ([("V_cmd", "float")], [("V", "float"), ("duty", "float"), ("switching", "boolean")]),
    "Physics.Electric.Motor.DC:dynamic": (
        [("local", "matrix44"), ("parent_world", "matrix44"), ("scene", "scene"), ("fault_0", "any"),
         ("V", "float"), ("tau_load", "float")],
        [("world", "matrix44"), ("i", "float"), ("omega", "float"), ("tau_em", "float")],
    ),
    "Physics.Electric.Motor.DC:currentSensor": ([("i", "float")], [("i_measured", "float")]),
    "Physics.Electric.Motor.Induction:dynamic": (
        [("local", "matrix44"), ("parent_world", "matrix44"), ("scene", "scene"), ("fault_0", "any"),
         ("V_a", "float"), ("V_b", "float"), ("V_c", "float"), ("tau_load", "float"), ("dt", "float")],
        [("world", "matrix44"), ("i_a", "float"), ("i_b", "float"), ("i_c", "float"),
         ("omega", "float"), ("theta_m", "float"), ("tau_em", "float"), ("slip", "float")],
    ),
    "Physics.Mechanical.Load:torque": ([("omega", "float")], [("tau_load", "float")]),
    "DSP.Generator:oscillator": (
        [("t", "float"), ("frequency", "float"), ("amplitude", "float"), ("phase", "float")],
        [("value", "float")],
    ),
    "DSP.Sensor:transducer": ([("value", "float"), ("t", "float")], [("measured", "float")]),
    # IEC-style acquisition: the sensor-side DAQ samples at its OWN
    # clock (10.24 kHz = 2.56 x Fmax) and emits 2048-sample / 200 ms
    # blocks plus the per-block RMS (the natural regime-gate feature).
    "DSP.Acquire:daq": ([("value", "float")], [("block", "tensor"), ("rms", "float")]),
    "DSP.Frame:frame": ([("signal", "tensor")], [("frames", "tensor")]),
    "DSP.Detect:steadystate": ([("value", "float")], [("value_gated", "float"), ("steady", "boolean"), ("transition", "trigger")]),
    # buffer.value is "any": the node ingests scalar floats AND [C]
    # tensor rows from the mux (a "float" declaration makes the editor
    # flag the mux -> buffer wire as a type mismatch).
    "DSP.Stream:buffer": ([("value", "any")], [("frame", "tensor")]),
    "DSP.Stream:mux": ([("in_0", "float"), ("in_1", "float"), ("in_2", "float")], [("frame", "tensor")]),
    "DSP.Tensor:transpose": ([("tensor", "tensor")], [("transposed", "tensor")]),
    "DSP.Window:window": ([("signal", "tensor")], [("windowed", "tensor")]),
    "DSP.Transform:fft": ([("signal", "tensor")], [("spectrum", "tensor")]),
    "spk.onnx:model": ([("current_window", "tensor")], [("embedding", "tensor")]),
    # The recluster trigger lives on the control plane ("_recluster",
    # declared on the node class, not in the data-port table).
    "ML.Cluster:online": (
        [("embedding", "tensor")],
        [("label", "float"), ("is_new", "boolean"), ("distance", "float"), ("k", "float"), ("alarm", "any")],
    ),
    "Logic.Event:alert-bus": ([("publish", "any")], [("subscribe", "any")]),
    "Control.Feedback:channel": ([("input", "any")], [("output", "any")]),
    "Viz.Plot:line": ([("value", "float")], []),
    "Viz.Plot:spectrum": ([("magnitudes", "any")], []),
    "Viz.Plot:waterfall": ([("magnitudes", "any")], []),
}

EARTH_DATA = {
    "_gravity": {"x": 0, "y": 0, "z": -9.81},
    "_temperatureK": 293.15, "_pressurePa": 101325, "_densityKgPerM3": 1.225,
    "_timeScale": 1,
    "_localPosition": {"x": 0, "y": 0, "z": 0},
    "_localRotation": {"x": 0, "y": 0, "z": 0, "w": 1},
    "_localScale": {"x": 1, "y": 1, "z": 1},
    "_gravitySourceId": "", "_temperatureSourceId": "", "_pressureSourceId": "",
    "_densitySourceId": "", "_timeScaleSourceId": "",
    "_localPositionSourceId": "", "_localRotationSourceId": "", "_localScaleSourceId": "",
    "_atmosphereItemId": "", "_solverItemIds": [], "_sharedNodeIds": [],
    "_manualHzHz": 0, "_isPrimary": False,
}

R385 = {"enabled": True, "_R": 1.22, "_L": 0.001, "_Kt": 0.00822, "_Ke": 0.00822,
        "_J": 6e-7, "_b": 1.03e-6, "_i0": 0, "_omega0": 0,
        "_requiredHzValue": 0, "_requiredHzUserDefined": False}

PLOT_LINE = {"enabled": True, "_maxSamples": 500, "_title": "value", "_yAuto": True,
             "_yMin": -1, "_yMax": 1, "_maxPushHz": 1000}
PLOT_SPECTRUM = {"enabled": True, "_fillStyle": "bars", "_scaleType": "linear",
                 "_inputType": "magnitude", "_dBRange": 100}
PLOT_WATERFALL = {"enabled": True, "_numBins": 256, "_historyRows": 200,
                  "_colormap": "viridis", "_dbScale": True, "_vmin": -80, "_vmax": 0}


def build(nodes, connections, dashboards):
    """nodes: list of (id, typeId|None, label, x, y, data, color|None[, anchors]).

    `anchors` (optional 8th element) is the list of [{x, y}, ...] widget
    positions for split-view nodes (Feedback Channel renders as two
    half-widgets: anchor 0 carries the `input` port near the signal
    source, anchor 1 carries `output` near the consumer, so no backward
    loop wire is drawn)."""
    layout_nodes = []
    model_nodes = []
    by_id = {}
    for entry in nodes:
        nid, type_id, label, x, y, data, color = entry[:7]
        anchors = entry[7] if len(entry) > 7 else None
        ln = {"id": nid, "x": x, "y": y}
        if color:
            ln["color"] = color
        if anchors:
            ln["anchors"] = anchors
        if type_id:
            ln["typeId"] = type_id
            ins, outs = PORTS[type_id]
            ln["inputs"] = [{"name": n, "type": t, "direction": "input"} for n, t in ins]
            ln["outputs"] = [{"name": n, "type": t, "direction": "output"} for n, t in outs]
        else:
            ln["inputs"] = []
            ln["outputs"] = []
        layout_nodes.append(ln)
        mn = {"id": nid, "label": label, "data": data}
        if type_id:
            mn["typeId"] = type_id
        model_nodes.append(mn)
        by_id[nid] = type_id

    layout_conns = []
    model_conns = []
    for f_id, f_port, t_id, t_port in connections:
        f_outs = [n for n, _ in PORTS[by_id[f_id]][1]]
        t_ins = [n for n, _ in PORTS[by_id[t_id]][0]]
        cid = f"{f_id}:{f_port}->{t_id}:{t_port}"
        layout_conns.append({
            "id": cid,
            "fromNodeId": f_id, "fromPortIndex": f_outs.index(f_port),
            "toNodeId": t_id, "toPortIndex": t_ins.index(t_port),
        })
        model_conns.append({
            "id": cid,
            "from": {"node": f_id, "port": f_port},
            "to": {"node": t_id, "port": t_port},
        })

    return {
        "version": 3,
        "layout": {"nodes": layout_nodes, "connections": layout_conns},
        "model": {"nodes": model_nodes, "connections": model_conns},
        "dashboards": dashboards,
    }


def write(name, doc):
    path = os.path.join(ROOT, name)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, indent=2)
        f.write("\n")
    print(f"wrote {path}")


def load_node(nid, x, y, profile, tau0, label="Load Torque (swappable)", tau1=0.012, t_step=30):
    return (nid, "Physics.Mechanical.Load:torque", label, x, y,
            {"enabled": True, "_profile": profile, "_tau0": tau0, "_tau1": tau1,
             "_tStep": t_step, "_rampRate": 0.001, "_k": 1.5e-7,
             "_amplitude": 0.005, "_frequency": 1, "_tau": 0}, None)


# ── motor-r385: the reusable DC motor block, load decoupled ──────────────────
def motor_r385_nodes(load_profile, load_tau0):
    return [
        ("node_1", "Core.Lifecycle:start", "Start", 40, 40, {"enabled": True}, "#5A8B5A"),
        ("node_2", "Core.Lifecycle:stop", "Stop", 40, 220, {"enabled": True}, "#B84A3C"),
        ("node_3", "Physics.Scene:earth", "Earth", 340, 0, dict(EARTH_DATA), None),
        ("node_4", "Logic.Input:slider", "V command", 560, 140,
         {"enabled": True, "_value": 6.7, "_min": 0, "_max": 16, "_step": 0.1}, None),
        ("node_5", "Physics.Electric.Motor.DC:inverter", "DC PWM Inverter", 760, 140,
         {"enabled": True, "_Vdc": 12, "_fPwm": 10000, "_strategy": "bipolar", "_deadTime": 1e-6,
          "_requiredHzValue": 0, "_requiredHzUserDefined": False}, None),
        ("node_6", "Physics.Electric.Motor.DC:dynamic", "DC Motor R385", 1000, 60, dict(R385), None),
        load_node("node_7", 760, 360, load_profile, load_tau0),
        ("node_8", "Physics.Electric.Motor.DC:currentSensor", "Current Sensor (LEM)", 1260, 100,
         {"enabled": True, "_noiseStd": 0.01, "_resolution": 0.005, "_bandwidthHz": 100000, "_seed": 1}, None),
        ("node_9", "Viz.Plot:line", "Current i_measured", 1540, 60,
         dict(PLOT_LINE, _title="i_measured"), None),
        ("node_10", "Viz.Plot:line", "Speed omega", 1540, 220,
         dict(PLOT_LINE, _title="omega"), None),
        # Split-view feedback for the omega -> load law: anchor 0 (input
        # half) sits by the motor outputs, anchor 1 (output half) by the
        # load node, so no backward loop wire crosses the canvas.
        ("node_30", "Control.Feedback:channel", "Feedback (omega, Z-1)", 1240, 300,
         {"enabled": True, "_delay": 1, "_initial": 0}, None,
         [{"x": 1240, "y": 300}, {"x": 560, "y": 360}]),
    ]


MOTOR_R385_CONNS = [
    ("node_4", "value", "node_5", "V_cmd"),
    ("node_5", "V", "node_6", "V"),
    ("node_7", "tau_load", "node_6", "tau_load"),
    ("node_6", "omega", "node_30", "input"),
    ("node_30", "output", "node_7", "omega"),
    ("node_6", "i", "node_8", "i"),
    ("node_8", "i_measured", "node_9", "value"),
    ("node_6", "omega", "node_10", "value"),
    ("node_3", "scene_out", "node_6", "scene"),
]

write("motor-r385.spikypanda", build(
    motor_r385_nodes("constant", 0.005),
    MOTOR_R385_CONNS,
    [{"id": "main", "name": "Main", "tiles": [
        {"nodeId": "node_9", "renderableType": "Viz.Plot:line", "x": 0, "y": 0, "w": 4, "h": 4},
        {"nodeId": "node_10", "renderableType": "Viz.Plot:line", "x": 4, "y": 0, "w": 4, "h": 4},
    ]}],
))

# ── motorwatch-r385: motor block + open-set regime monitoring chain ──────────
mw_nodes = motor_r385_nodes("step", 0.004) + [
    # IEC acquisition profile: the DAQ owns the sampling clock
    # (10.24 kHz, 2048-sample / 200 ms blocks). The gate consumes the
    # per-block RMS: at block cadence (5 Hz) ripple and sensor noise
    # average out, so no sample-level smoothing is needed.
    ("node_25", "DSP.Acquire:daq", "DAQ 10.24 kHz / 2048", 1420, 420, {"enabled": True, "_sampleRateHz": 10240, "_blockSize": 2048, "_antiAlias": True, "_aaCutoffHz": 4000, "_requiredHzValue": 0, "_requiredHzUserDefined": False}, None),
    ("node_11", "DSP.Detect:steadystate", "Steady-State Gate (block RMS)", 1540, 560,
     {"enabled": True, "_epsilon": 0.05, "_settle": 5, "_breakHold": 2, "_emaAlpha": 0.2,
      "_smoothAlpha": 1, "_transitionCount": 0}, None),
    ("node_26", "DSP.Frame:frame", "First 64 of block", 1660, 420,
     {"enabled": True, "_frameSize": 64, "_hopLength": 2048, "_padMode": 0}, None),
    ("node_27", "DSP.Tensor:transpose", "[1,64] to [64,1]", 1810, 420,
     {"enabled": True, "_add_batch_dim": False}, None),
    ("node_13", "DSP.Tensor:transpose", "To (1,1,64)", 1960, 420,
     {"enabled": True, "_add_batch_dim": True}, None),
    ("node_14", "spk.onnx:model", "Encoder (drop motorwatch-encoder-demo.onnx)", 2160, 420, {}, None),
    ("node_15", "ML.Cluster:online", "Online Clusterer (open-set)", 2420, 420,
     {"enabled": True, "_assignThr": 0.05, "_updateThr": 0.02, "_alpha": 0.15,
      "_linkThr": 0.06, "_kMax": 4, "_historyMax": 512, "_driftThr": 0.1}, None),
    ("node_16", "Logic.Event:alert-bus", "Alert Bus (NEW_REGIME)", 2680, 420,
     {"enabled": True, "_topicFilter": "*"}, None),
    ("node_18", "DSP.Window:window", "Window (Hann)", 1760, 620,
     {"enabled": True, "_windowType": 0, "_alpha": 0.5}, None),
    ("node_19", "DSP.Transform:fft", "FFT (5 Hz bins)", 1960, 620,
     {"enabled": True, "_nfft": 2048, "_outputType": 1}, None),
    ("node_20", "Viz.Plot:spectrum", "Current Spectrum", 2220, 620, dict(PLOT_SPECTRUM), None),
    ("node_21", "Viz.Plot:waterfall", "Waterfall", 2220, 780, dict(PLOT_WATERFALL), None),
]

mw_conns = MOTOR_R385_CONNS + [
    ("node_8", "i_measured", "node_25", "value"),
    ("node_25", "rms", "node_11", "value"),
    ("node_25", "block", "node_26", "signal"),
    ("node_26", "frames", "node_27", "tensor"),
    ("node_27", "transposed", "node_13", "tensor"),
    ("node_13", "transposed", "node_14", "current_window"),
    ("node_14", "embedding", "node_15", "embedding"),
    ("node_15", "alarm", "node_16", "publish"),
    ("node_25", "block", "node_18", "signal"),
    ("node_18", "windowed", "node_19", "signal"),
    ("node_19", "spectrum", "node_20", "magnitudes"),
    ("node_19", "spectrum", "node_21", "magnitudes"),
]

write("motorwatch-r385.spikypanda", build(
    mw_nodes, mw_conns,
    [{"id": "main", "name": "Main", "tiles": [
        {"nodeId": "node_9", "renderableType": "Viz.Plot:line", "x": 0, "y": 0, "w": 4, "h": 4},
        {"nodeId": "node_20", "renderableType": "Viz.Plot:spectrum", "x": 4, "y": 0, "w": 3, "h": 4},
        {"nodeId": "node_21", "renderableType": "Viz.Plot:waterfall", "x": 7, "y": 0, "w": 4, "h": 4},
    ]}],
))

# ── motor-induction: squirrel cage block, 3-phase supply, load decoupled ─────
INDUCTION_DATA = {
    "enabled": True, "_Rs": 2.3, "_Rr": 2.5, "_Ls": 0.23, "_Lr": 0.23, "_Lm": 0.22,
    "_P": 2, "_J": 0.005, "_b": 1e-4, "_fSupply": 60,
    "_brokenBars": 0, "_totalBars": 28, "_barSeverity": 1,
    "_omega0": 0, "_theta0": 0,
    "_requiredHzValue": 0, "_requiredHzUserDefined": False,
}


def osc(nid, label, y, phase):
    return (nid, "DSP.Generator:oscillator", label, 560, y,
            {"enabled": True, "_frequency": 60, "_amplitude": 80, "_phase": phase, "_waveform": "sin"}, None)


def transducer(nid, label, y):
    return (nid, "DSP.Sensor:transducer", label, 1280, y,
            {"enabled": True, "_cutoffHz": 5000, "_noiseStdev": 0.02, "_quantizationStep": 0, "_driftPerSec": 0}, None)


def induction_nodes(broken_bars):
    data = dict(INDUCTION_DATA, _brokenBars=broken_bars)
    return [
        ("node_1", "Core.Lifecycle:start", "Start", 40, 40, {"enabled": True}, "#5A8B5A"),
        ("node_2", "Core.Lifecycle:stop", "Stop", 40, 220, {"enabled": True}, "#B84A3C"),
        ("node_3", "Physics.Scene:earth", "Earth", 340, 0, dict(EARTH_DATA), None),
        ("node_4", "Logic.Time:clock", "Clock", 340, 200, {"enabled": True}, None),
        osc("node_5", "Phase A (0)", 140, 0.0),
        osc("node_6", "Phase B (-120)", 280, -2.0943951023931953),
        osc("node_7", "Phase C (+120)", 420, 2.0943951023931953),
        ("node_8", "Physics.Electric.Motor.Induction:dynamic", "Induction Motor (Squirrel Cage)",
         860, 160, data, None),
        load_node("node_9", 560, 580, "constant", 1.5, label="Load Torque (swappable)"),
        transducer("node_10", "Current Sensor A", 100),
        transducer("node_11", "Current Sensor B", 240),
        transducer("node_12", "Current Sensor C", 380),
        ("node_13", "Viz.Plot:line", "Speed omega", 1540, 40, dict(PLOT_LINE, _title="omega"), None),
        ("node_31", "DSP.Acquire:daq", "DAQ 10.24 kHz / 2048", 1540, 200, {"enabled": True, "_sampleRateHz": 10240, "_blockSize": 2048, "_antiAlias": True, "_aaCutoffHz": 4000, "_requiredHzValue": 0, "_requiredHzUserDefined": False}, None),
        ("node_15", "DSP.Window:window", "Window (Hann)", 1760, 200,
         {"enabled": True, "_windowType": 0, "_alpha": 0.5}, None),
        ("node_16", "DSP.Transform:fft", "FFT (sidebands f(1 +/- 2s))", 1960, 200,
         {"enabled": True, "_nfft": 2048, "_outputType": 1}, None),
        ("node_17", "Viz.Plot:spectrum", "MCSA Spectrum", 2220, 200, dict(PLOT_SPECTRUM), None),
        ("node_18", "Viz.Plot:waterfall", "Waterfall", 2220, 360, dict(PLOT_WATERFALL), None),
        # Z^-1 between omega and the load law: breaks the motor <-> load
        # dataflow cycle (stream ports on the induction node), exactly
        # like the reference DC graph composed K*omega^2 via Feedback.
        # Split-view anchors: input half by the motor, output half by
        # the load (no backward loop wire drawn).
        ("node_30", "Control.Feedback:channel", "Feedback (omega, Z-1)", 1180, 600,
         {"enabled": True, "_delay": 1, "_initial": 0}, None,
         [{"x": 1180, "y": 600}, {"x": 340, "y": 600}]),
    ]


INDUCTION_CONNS = [
    ("node_4", "t", "node_5", "t"),
    ("node_4", "t", "node_6", "t"),
    ("node_4", "t", "node_7", "t"),
    ("node_5", "value", "node_8", "V_a"),
    ("node_6", "value", "node_8", "V_b"),
    ("node_7", "value", "node_8", "V_c"),
    ("node_9", "tau_load", "node_8", "tau_load"),
    ("node_8", "omega", "node_30", "input"),
    ("node_30", "output", "node_9", "omega"),
    ("node_3", "scene_out", "node_8", "scene"),
    ("node_8", "i_a", "node_10", "value"),
    ("node_8", "i_b", "node_11", "value"),
    ("node_8", "i_c", "node_12", "value"),
    ("node_8", "omega", "node_13", "value"),
    ("node_10", "measured", "node_31", "value"),
    ("node_31", "block", "node_15", "signal"),
    ("node_15", "windowed", "node_16", "signal"),
    ("node_16", "spectrum", "node_17", "magnitudes"),
    ("node_16", "spectrum", "node_18", "magnitudes"),
]

write("motor-induction.spikypanda", build(
    induction_nodes(0), INDUCTION_CONNS,
    [{"id": "main", "name": "Main", "tiles": [
        {"nodeId": "node_13", "renderableType": "Viz.Plot:line", "x": 0, "y": 0, "w": 4, "h": 4},
        {"nodeId": "node_17", "renderableType": "Viz.Plot:spectrum", "x": 4, "y": 0, "w": 3, "h": 4},
        {"nodeId": "node_18", "renderableType": "Viz.Plot:waterfall", "x": 7, "y": 0, "w": 4, "h": 4},
    ]}],
))

# ── motorwatch-induction: 3-phase monitoring (set broken_bars > 0 live to
#    trigger the NEW_REGIME story) ────────────────────────────────────────────
mwi_nodes = induction_nodes(0) + [
    ("node_19", "DSP.Stream:mux", "3-Phase Mux", 1540, 560,
     {"enabled": True}, None),
    ("node_20", "DSP.Stream:buffer", "Window 64x3", 1760, 560,
     {"enabled": True, "_frameSize": 64, "_hopLength": 64}, None),
    ("node_21", "DSP.Tensor:transpose", "To (1,C,T)", 1960, 560,
     {"enabled": True, "_add_batch_dim": True}, None),
    ("node_22", "spk.onnx:model", "Encoder (drop 3-phase encoder .onnx)", 2160, 560, {}, None),
    ("node_23", "ML.Cluster:online", "Online Clusterer (open-set)", 2420, 560,
     {"enabled": True, "_assignThr": 0.05, "_updateThr": 0.02, "_alpha": 0.15,
      "_linkThr": 0.06, "_kMax": 4, "_historyMax": 512, "_driftThr": 0.1}, None),
    ("node_24", "Logic.Event:alert-bus", "Alert Bus (NEW_REGIME)", 2680, 560,
     {"enabled": True, "_topicFilter": "*"}, None),
]

mwi_conns = INDUCTION_CONNS + [
    ("node_10", "measured", "node_19", "in_0"),
    ("node_11", "measured", "node_19", "in_1"),
    ("node_12", "measured", "node_19", "in_2"),
    ("node_19", "frame", "node_20", "value"),
    ("node_20", "frame", "node_21", "tensor"),
    ("node_21", "transposed", "node_22", "current_window"),
    ("node_22", "embedding", "node_23", "embedding"),
    ("node_23", "alarm", "node_24", "publish"),
]

write("motorwatch-induction.spikypanda", build(
    mwi_nodes, mwi_conns,
    [{"id": "main", "name": "Main", "tiles": [
        {"nodeId": "node_13", "renderableType": "Viz.Plot:line", "x": 0, "y": 0, "w": 4, "h": 4},
        {"nodeId": "node_17", "renderableType": "Viz.Plot:spectrum", "x": 4, "y": 0, "w": 3, "h": 4},
        {"nodeId": "node_18", "renderableType": "Viz.Plot:waterfall", "x": 7, "y": 0, "w": 4, "h": 4},
    ]}],
))

print("done.")
