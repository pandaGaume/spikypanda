// =========================================================================
// SpikyPanda CO2 MPC Demo
//
// Simulates a closed habitat with variable crew activity. Three controllers
// can be compared live: MPC (uses our dynamics model + RolloutNode +
// ShootingSelectorNode), Bang-bang (naive on/off above threshold), and None.
// =========================================================================

// Physics constants (must match simulate_co2.py)
var CO2_MAX_PPM = 10000.0;
var CO2_VITAL = 4000.0;
var CREW_MAX = 6;

// Scrubber presets. The model was trained on "oversized" rates, so those are
// the reference. Lower rates (degraded, failing) remain within the training
// distribution and the model generalizes correctly because it learned the
// physics (removal = rate * (co2 - 400)), not the specific action-to-rate
// mapping (which only shows up through the scrubber_rate state input).
var SCRUBBER_PRESETS = {
    oversized: {
        label: "Oversized (new habitat)",
        desc: "Brand new scrubber, over-dimensioned. Any action handles any load. Threshold and AI look alike here.",
        rates: [0.0, 0.03, 0.08, 0.20],
        power: [0.0, 1.0, 3.0, 8.0],
        tau: 0.3,
    },
    normal: {
        label: "Normal (end-of-life)",
        desc: "Scrubber at nominal design capacity. Low is tight for heavy work, medium handles it, high drops CO2. Anticipation starts mattering.",
        rates: [0.0, 0.010, 0.025, 0.050],
        power: [0.0, 1.0, 3.0, 8.0],
        tau: 0.3,
    },
    degraded: {
        label: "Degraded (real problem)",
        desc: "Scrubber partially clogged or chemically tired. Even high barely keeps up with heavy work, and it reacts more slowly. The real maintenance window where planning matters most.",
        rates: [0.0, 0.004, 0.010, 0.022],
        power: [0.0, 1.0, 3.0, 8.0],
        tau: 0.15, // slower response when clogged
    },
};

var currentPreset = "oversized";
var SCRUBBER_RATES = SCRUBBER_PRESETS[currentPreset].rates.slice();
var SCRUBBER_RATE_MAX = 0.20; // normalization constant used by model input
var SCRUBBER_TAU = SCRUBBER_PRESETS[currentPreset].tau;
var SCRUBBER_POWER = SCRUBBER_PRESETS[currentPreset].power.slice();
var ACTIVITY_EMISSION = {
    sleep: 2.0, rest: 3.5, light_work: 5.5, heavy_work: 7.0,
};
var ACTIVITY_NAMES = ["sleep", "rest", "light_work", "heavy_work"];
var CABIN_LEAK = 0.001;
var MODEL_URL = "models/co2_dynamics.onnx";

// Simulation state
var SIM_INITIAL_CO2 = 1500.0; // ambient baseline, same as physical realism
var simCO2 = SIM_INITIAL_CO2;
var simScrubberRate = 0.0;
var simCrewSize = 3;
var simActivity = "light_work";
var simTime = 0;
var simEnergyUsed = 0.0;
var simHistory = [];
var simInterval = null;
var simAction = 0;
// Live stats for current run
var statsMaxCO2 = SIM_INITIAL_CO2;
var statsMinCO2 = SIM_INITIAL_CO2;
var statsMinutesAboveSoft = 0;
var statsMinutesAboveVital = 0;
// Saved stats of the last completed run, for comparison
var lastRunStats = null;

// Controller settings
var controller = "mpc";
var mpcParams = {
    horizon: 30,
    candidates: 30,
    soft: 3500,
    energy: 50,
};

// SpikyPanda runtime
var RT = null;
var dynamicsGraph = null;
var dynamicsInputName = null;
var rolloutNode = null;
var objectiveNode = null;
var selectorNode = null;

// ── Log helper ────────────────────────────────────────────────────────
function co2Log(msg) {
    var el = document.getElementById("log");
    var time = new Date().toLocaleTimeString("en", { hour12: false });
    el.textContent += "[" + time + "] " + msg + "\n";
    el.scrollTop = el.scrollHeight;
}

// ── Physics step (matches Python simulate_co2.py step()) ──────────────
// Returns {co2, scrubberRate} because scrubber has first-order startup lag.
function physicsStep(co2, scrubberRate, action, crewSize, activity) {
    var target = SCRUBBER_RATES[action];
    var nextScrubber = scrubberRate + (target - scrubberRate) * SCRUBBER_TAU;
    if (nextScrubber < 0) nextScrubber = 0;
    if (nextScrubber > SCRUBBER_RATE_MAX) nextScrubber = SCRUBBER_RATE_MAX;

    var e = ACTIVITY_EMISSION[activity] * crewSize;
    var scrub = scrubberRate * Math.max(co2 - 400.0, 0.0);
    var leak = CABIN_LEAK * co2;
    var dc = e - scrub - leak;
    var nextCO2 = co2 + dc;
    if (nextCO2 < 300) nextCO2 = 300;
    if (nextCO2 > CO2_MAX_PPM) nextCO2 = CO2_MAX_PPM;
    return { co2: nextCO2, scrubberRate: nextScrubber };
}

// ── Crew activity profile (changes over time) ─────────────────────────
function pickActivity(t) {
    // Cycle every 60 min through activities, weighted toward work
    var phase = Math.floor(t / 60) % 4;
    if (phase === 0) return "heavy_work";
    if (phase === 1) return "light_work";
    if (phase === 2) return "rest";
    return "light_work";
}

// ── Controllers ───────────────────────────────────────────────────────
function controllerOff() {
    return 0;
}

// Reactive threshold with hysteresis: turns scrubber on at HIGH power
// when CO2 exceeds the limit, off when it drops well below. Simple,
// memoryless, no anticipation. This is what most industrial on/off
// controllers do. It overshoots because the scrubber has lag.
var _reactiveState = false;
function controllerBangBang(co2) {
    if (_reactiveState && co2 < 2500) _reactiveState = false;
    if (!_reactiveState && co2 > 3500) _reactiveState = true;
    return _reactiveState ? 3 : 0;
}

function controllerMPC(co2, crewSize, scrubberRate) {
    if (!selectorNode || !rolloutNode || !objectiveNode) {
        return controllerBangBang(co2); // fallback
    }
    var startMs = performance.now();

    // State = [co2_norm, crew_norm, scrubber_rate_norm]   (stateDim = 3)
    // Action = one-hot(4)                                  (actionDim = 4)
    // The adapter node reassembles this into the model's input schema
    // [co2_norm, action(4), crew_norm, scrubber_norm] and propagates
    // scrubber state with the known first-order lag.
    var initState = new Float32Array([
        co2 / CO2_MAX_PPM,
        crewSize / CREW_MAX,
        scrubberRate / SCRUBBER_RATE_MAX,
    ]);
    var stateTensor = {
        data: initState,
        shape: [3],
        name: "initial_state",
    };

    var result = selectorNode.execute([stateTensor]);
    var bestAction = result[0];
    var bestCost = result[1].data[0];

    var chosen = 0;
    for (var i = 0; i < 4; i++) {
        if (bestAction.data[i] > 0.5) { chosen = i; break; }
    }

    var elapsed = performance.now() - startMs;
    document.getElementById("info-mpc").textContent =
        "Plans tested: " + mpcParams.candidates + "\n" +
        "Planning horizon: " + mpcParams.horizon + " minutes\n" +
        "Best plan score: " + bestCost.toFixed(2) + " (lower is better)\n" +
        "Decision time: " + elapsed.toFixed(1) + " ms (ESP32 equivalent ~50 ms)";

    return chosen;
}

// ── MPC setup: custom adapter node because dynamics input != state+action ──
// The model input schema is [co2_norm, action_onehot(4), crew_norm].
// Our state = [co2_norm, crew_norm], action = one-hot(4).
// We wrap the dynamics graph with a function that reassembles the model input.
function createMpcAdapter() {
    if (!RT) return null;
    // Build a custom ComputeGraph with an adapter node that runs the dynamics
    // with the correct input layout. We implement this by wrapping the raw
    // dynamics graph call inside a lightweight node.

    var AdapterNode = function() {
        RT.ComputeNodeBase.call(this);
        this.id = "mpc_adapter_input";
    };
    AdapterNode.prototype = Object.create(RT.ComputeNodeBase.prototype);
    AdapterNode.prototype.nodeType = "mpc_adapter";
    AdapterNode.prototype.outputShapes = [[1]];
    AdapterNode.prototype.execute = function(inputs) {
        var d = inputs[0].data;
        // RolloutNode passes concat(state, action):
        //   d[0] = co2_norm
        //   d[1] = crew_norm
        //   d[2] = scrubber_rate_norm
        //   d[3..6] = action one-hot
        //
        // Model schema: [co2_norm, action(4), crew_norm, scrubber_norm]
        var reordered = new Float32Array(7);
        reordered[0] = d[0];            // co2_norm
        reordered[1] = d[3];            // action[0]
        reordered[2] = d[4];            // action[1]
        reordered[3] = d[5];            // action[2]
        reordered[4] = d[6];            // action[3]
        reordered[5] = d[1];            // crew_norm
        reordered[6] = d[2];            // scrubber_rate_norm
        var modelInput = {
            data: reordered,
            shape: [1, 7],
            name: dynamicsInputName,
        };
        var ext = new Map();
        ext.set(dynamicsInputName, modelInput);
        var out = dynamicsGraph.run(ext);
        var modelOut = out.values().next().value;

        // Propagate scrubber lag analytically (physics we know perfectly)
        var actionIdx = 0;
        for (var a = 0; a < 4; a++) {
            if (d[3 + a] > 0.5) { actionIdx = a; break; }
        }
        var targetRate = SCRUBBER_RATES[actionIdx] / SCRUBBER_RATE_MAX;
        var currentRate = d[2];
        var nextScrubber = currentRate + (targetRate - currentRate) * SCRUBBER_TAU;

        // Next state: co2 (from model), crew (unchanged), scrubber (analytical)
        var nextState = new Float32Array(3);
        nextState[0] = d[0] + modelOut.data[0]; // co2_norm + delta
        nextState[1] = d[1];                     // crew stays
        nextState[2] = nextScrubber;             // lagged scrubber
        return [{ data: nextState, shape: [3], name: "next_state" }];
    };

    var adapterNode = new AdapterNode();
    return new RT.ComputeGraph([adapterNode], []);
}

// ── Load dynamics model and build MPC pipeline ────────────────────────
function loadDynamics() {
    RT = window.SpikypandaRuntime;
    if (!RT) {
        co2Log("ERROR: SpikypandaRuntime bundle not loaded");
        document.getElementById("info-status").textContent = "Runtime missing";
        return;
    }

    co2Log("Loading dynamics model...");
    fetch(MODEL_URL)
        .then(function(resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.arrayBuffer();
        })
        .then(function(buf) {
            var bytes = new Uint8Array(buf);
            co2Log("Model loaded: " + (bytes.length / 1024).toFixed(1) + " KB");

            var parsed = RT.OnnxParser.parse(bytes);
            co2Log("Parsed: " + parsed.nodes.length + " ops, " + parsed.initializers.length + " initializers");

            var ops = [];
            for (var i = 0; i < parsed.nodes.length; i++) {
                var op = parsed.nodes[i].opType;
                if (ops.indexOf(op) === -1) ops.push(op);
            }

            var registry = RT.createDefaultRegistry();
            var builder = new RT.OnnxGraphBuilder(registry);
            var result = builder.build(parsed);
            dynamicsGraph = result.graph;
            dynamicsInputName = result.inputNames[0];

            document.getElementById("info-model").textContent =
                "401 parameters, " + (bytes.length / 1024).toFixed(1) + " KB\n" +
                "Fits easily on an ESP32 (320 KB RAM)\n" +
                "Ops used: " + ops.join(", ") + "\n" +
                "One prediction = ~0.05 ms in browser";

            // Build MPC pipeline
            var adapterGraph = createMpcAdapter();
            rebuildMpc(adapterGraph);

            co2Log("MPC pipeline ready. Click Start.");
            document.getElementById("info-status").textContent = "Ready";
        })
        .catch(function(err) {
            co2Log("ERROR loading dynamics: " + err.message);
            document.getElementById("info-status").textContent = "Load error";
        });
}

function rebuildMpc(adapterGraph) {
    if (!RT || !adapterGraph) return;
    var STATE_DIM = 3; // co2_norm, crew_norm, scrubber_norm
    var ACTION_DIM = 4;

    rolloutNode = new RT.RolloutNode({
        dynamics: adapterGraph,
        dynamicsInputName: "mpc_adapter_input",
        horizon: mpcParams.horizon,
        stateDim: STATE_DIM,
        actionDim: ACTION_DIM,
        deltaMode: false,
    });

    var costFn = function(trajectory, actions, stateDim, actionDim, horizon) {
        var softLimit = mpcParams.soft / CO2_MAX_PPM;
        var vitalLimit = CO2_VITAL / CO2_MAX_PPM;
        var cost = 0;

        for (var t = 0; t <= horizon; t++) {
            var co2 = trajectory[t * stateDim]; // state[0] = co2_norm
            if (co2 > softLimit) {
                var excess = (co2 - softLimit) / softLimit;
                cost += 1000 * excess * excess;
            }
            if (co2 > vitalLimit) {
                cost += 1e6;
            }
        }
        var energyWeight = mpcParams.energy / 50.0;
        for (var t = 0; t < horizon; t++) {
            for (var a = 0; a < actionDim; a++) {
                cost += actions[t * actionDim + a] * SCRUBBER_POWER[a] * energyWeight;
            }
        }
        return cost;
    };

    objectiveNode = new RT.ObjectiveNode({
        costFn: costFn,
        stateDim: STATE_DIM,
        actionDim: ACTION_DIM,
        horizon: mpcParams.horizon,
    });

    selectorNode = new RT.ShootingSelectorNode({
        rollout: rolloutNode,
        objective: objectiveNode,
        sampler: RT.makePiecewiseConstantSampler(4, 3, 10),
        numCandidates: mpcParams.candidates,
        horizon: mpcParams.horizon,
        stateDim: STATE_DIM,
        actionDim: ACTION_DIM,
    });
}

// ── Chart ─────────────────────────────────────────────────────────────
function drawChart() {
    var canvas = document.getElementById("chart-co2");
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.width = canvas.clientWidth * dpr;
    var h = canvas.height = canvas.clientHeight * dpr;

    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, w, h);

    // Axis area
    var padLeft = 60 * dpr;
    var padRight = 20 * dpr;
    var padTop = 20 * dpr;
    var padBottom = 30 * dpr;
    var plotW = w - padLeft - padRight;
    var plotH = h - padTop - padBottom;

    // Time axis: last 120 minutes
    var windowMin = 120;
    var tMax = Math.max(simTime, windowMin);
    var tMin = tMax - windowMin;

    // Y axis: 0 to 6000 ppm
    var yMax = 6000;
    var yMin = 0;

    // Grid lines
    ctx.strokeStyle = "#1a3050";
    ctx.lineWidth = 1;
    for (var i = 0; i <= 5; i++) {
        var y = padTop + (plotH * i / 5);
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();
    }

    // Thresholds
    function yFor(v) { return padTop + plotH * (1 - (v - yMin) / (yMax - yMin)); }
    ctx.strokeStyle = "#ff6b6b";
    ctx.setLineDash([5 * dpr, 5 * dpr]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yFor(CO2_VITAL));
    ctx.lineTo(w - padRight, yFor(CO2_VITAL));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ff6b6b";
    ctx.font = (10 * dpr) + "px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("4000 ppm vital", padLeft + 4 * dpr, yFor(CO2_VITAL) - 3 * dpr);

    ctx.strokeStyle = "#f0ad4e";
    ctx.setLineDash([3 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yFor(mpcParams.soft));
    ctx.lineTo(w - padRight, yFor(mpcParams.soft));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f0ad4e";
    ctx.fillText(mpcParams.soft + " ppm soft", padLeft + 4 * dpr, yFor(mpcParams.soft) - 3 * dpr);

    // Y labels
    ctx.fillStyle = "#888";
    ctx.textAlign = "right";
    for (var i = 0; i <= 5; i++) {
        var v = yMax - (yMax - yMin) * i / 5;
        var y = padTop + plotH * i / 5;
        ctx.fillText(Math.round(v) + " ppm", padLeft - 6 * dpr, y + 4 * dpr);
    }

    // X labels
    ctx.textAlign = "center";
    for (var i = 0; i <= 4; i++) {
        var t = tMin + (tMax - tMin) * i / 4;
        var x = padLeft + plotW * i / 4;
        ctx.fillText(Math.round(t) + " min", x, h - 8 * dpr);
    }

    // CO2 trace
    if (simHistory.length > 1) {
        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        var first = true;
        for (var i = 0; i < simHistory.length; i++) {
            var p = simHistory[i];
            if (p.t < tMin) continue;
            var x = padLeft + plotW * (p.t - tMin) / (tMax - tMin);
            var y = yFor(p.co2);
            if (first) { ctx.moveTo(x, y); first = false; }
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Action trace as colored blocks at bottom
    var actionH = 15 * dpr;
    var actionY = h - padBottom - actionH - 2 * dpr;
    ctx.textAlign = "left";
    ctx.fillStyle = "#888";
    ctx.fillText("Scrubber action", padLeft + 4 * dpr, actionY - 3 * dpr);
    var actionColors = ["#333", "#2a6", "#ecb226", "#ff6b6b"];
    for (var i = 0; i < simHistory.length - 1; i++) {
        var p = simHistory[i];
        var pn = simHistory[i + 1];
        if (pn.t < tMin) continue;
        var x1 = padLeft + plotW * (Math.max(p.t, tMin) - tMin) / (tMax - tMin);
        var x2 = padLeft + plotW * (Math.min(pn.t, tMax) - tMin) / (tMax - tMin);
        ctx.fillStyle = actionColors[p.action];
        ctx.fillRect(x1, actionY, Math.max(1, x2 - x1), actionH);
    }
}

// ── Simulation loop ───────────────────────────────────────────────────
function simStep() {
    // Pick action via current controller
    if (controller === "mpc") {
        simAction = controllerMPC(simCO2, simCrewSize, simScrubberRate);
    } else if (controller === "bangbang") {
        simAction = controllerBangBang(simCO2);
    } else {
        simAction = controllerOff();
    }

    // Advance physics (scrubber has first-order lag)
    simActivity = pickActivity(simTime);
    var nextState = physicsStep(simCO2, simScrubberRate, simAction, simCrewSize, simActivity);
    simCO2 = nextState.co2;
    simScrubberRate = nextState.scrubberRate;
    simEnergyUsed += SCRUBBER_POWER[simAction];
    simTime += 1;

    // Track stats
    if (simCO2 > statsMaxCO2) statsMaxCO2 = simCO2;
    if (simCO2 < statsMinCO2) statsMinCO2 = simCO2;
    if (simCO2 > mpcParams.soft) statsMinutesAboveSoft += 1;
    if (simCO2 > CO2_VITAL) statsMinutesAboveVital += 1;

    simHistory.push({
        t: simTime,
        co2: simCO2,
        action: simAction,
        activity: simActivity,
        energy: simEnergyUsed,
    });
    // Keep last 500 points
    if (simHistory.length > 500) simHistory.shift();

    // Update UI
    var co2El = document.getElementById("metric-co2");
    co2El.textContent = Math.round(simCO2) + " ppm";
    var metricBox = co2El.parentElement;
    if (simCO2 > CO2_VITAL) metricBox.classList.add("alert");
    else metricBox.classList.remove("alert");

    document.getElementById("metric-crew").textContent = simCrewSize + " (" + simActivity + ")";
    var actionNames = ["off", "low", "med", "high"];
    var effectivePct = (simScrubberRate / SCRUBBER_RATE_MAX * 100).toFixed(0);
    document.getElementById("metric-action").textContent = actionNames[simAction] + " (" + effectivePct + "%)";
    document.getElementById("metric-power").textContent = SCRUBBER_POWER[simAction].toFixed(1) + " W";
    document.getElementById("metric-time").textContent = simTime + " min";
    document.getElementById("metric-energy").textContent = simEnergyUsed.toFixed(0) + " Wh";

    drawChart();
    updateStatsCards();
}

// ── Public controls ───────────────────────────────────────────────────
var CONTROLLER_LABELS = {
    mpc: "Predictive (AI)",
    bangbang: "Reactive threshold",
    off: "No control",
};

function updateStatsCards() {
    document.getElementById("stat-curr-ctrl").textContent = CONTROLLER_LABELS[controller];
    document.getElementById("stat-curr-time").textContent = simTime + " min";
    document.getElementById("stat-curr-max").textContent = Math.round(statsMaxCO2) + " ppm";
    document.getElementById("stat-curr-soft").textContent = statsMinutesAboveSoft;
    document.getElementById("stat-curr-vital").textContent = statsMinutesAboveVital;
    document.getElementById("stat-curr-energy").textContent = simEnergyUsed.toFixed(0) + " Wh";

    if (lastRunStats) {
        document.getElementById("stat-prev-ctrl").textContent = CONTROLLER_LABELS[lastRunStats.controller];
        document.getElementById("stat-prev-time").textContent = lastRunStats.time + " min";
        document.getElementById("stat-prev-max").textContent = Math.round(lastRunStats.maxCO2) + " ppm";
        document.getElementById("stat-prev-soft").textContent = lastRunStats.minutesAboveSoft;
        document.getElementById("stat-prev-vital").textContent = lastRunStats.minutesAboveVital;
        document.getElementById("stat-prev-energy").textContent = lastRunStats.energy.toFixed(0) + " Wh";

        // Color code current stats relative to previous run IF the comparison
        // makes sense (same horizon of simulated time)
        var sameTime = Math.abs(simTime - lastRunStats.time) <= 2;
        function colorize(elId, curr, prev, lowerIsBetter) {
            var el = document.getElementById(elId);
            el.classList.remove("better", "worse");
            if (!sameTime || simTime < 5) return;
            if (lowerIsBetter ? curr < prev : curr > prev) el.classList.add("better");
            else if (lowerIsBetter ? curr > prev : curr < prev) el.classList.add("worse");
        }
        colorize("stat-curr-max", statsMaxCO2, lastRunStats.maxCO2, true);
        colorize("stat-curr-soft", statsMinutesAboveSoft, lastRunStats.minutesAboveSoft, true);
        colorize("stat-curr-vital", statsMinutesAboveVital, lastRunStats.minutesAboveVital, true);
        colorize("stat-curr-energy", simEnergyUsed, lastRunStats.energy, true);
    }
}

function saveRunAsPrevious() {
    if (simTime < 5) return; // don't save trivial runs
    lastRunStats = {
        controller: controller,
        time: simTime,
        maxCO2: statsMaxCO2,
        minutesAboveSoft: statsMinutesAboveSoft,
        minutesAboveVital: statsMinutesAboveVital,
        energy: simEnergyUsed,
    };
    co2Log("Saved run: " + CONTROLLER_LABELS[controller] + ", " + simTime + " min, max " + Math.round(statsMaxCO2) + " ppm, " + simEnergyUsed.toFixed(0) + " Wh");
}

function co2Start() {
    if (simInterval) return;
    if (!dynamicsGraph && controller === "mpc") {
        co2Log("AI model not loaded yet, using reactive fallback");
    }
    // Save whatever is currently on screen as the "previous run" before
    // starting a new one. This way both previous and current are visible
    // throughout the new run.
    if (simTime >= 5) {
        saveRunAsPrevious();
        // Reset stats for the fresh run
        simCO2 = SIM_INITIAL_CO2;
        simScrubberRate = 0.0;
        simTime = 0;
        simEnergyUsed = 0.0;
        simHistory = [];
        simAction = 0;
        statsMaxCO2 = SIM_INITIAL_CO2;
        statsMinCO2 = SIM_INITIAL_CO2;
        statsMinutesAboveSoft = 0;
        statsMinutesAboveVital = 0;
        _reactiveState = false;
        drawChart();
    }
    simInterval = setInterval(simStep, 100); // 1 min simulated every 100ms
    document.getElementById("btn-start").disabled = true;
    document.getElementById("btn-stop").disabled = false;
    co2Log("Running: " + CONTROLLER_LABELS[controller]);
    updateStatsCards();
}

function co2Stop() {
    if (!simInterval) return;
    clearInterval(simInterval);
    simInterval = null;
    document.getElementById("btn-start").disabled = false;
    document.getElementById("btn-stop").disabled = true;
    co2Log("Stopped at t=" + simTime + " min, CO2=" + Math.round(simCO2) + " ppm, energy=" + simEnergyUsed.toFixed(0) + " Wh");
}

function co2Reset() {
    co2Stop();
    simCO2 = SIM_INITIAL_CO2;
    simScrubberRate = 0.0;
    simTime = 0;
    simEnergyUsed = 0.0;
    simHistory = [];
    simAction = 0;
    statsMaxCO2 = SIM_INITIAL_CO2;
    statsMinCO2 = SIM_INITIAL_CO2;
    statsMinutesAboveSoft = 0;
    statsMinutesAboveVital = 0;
    _reactiveState = false;
    drawChart();
    document.getElementById("metric-co2").textContent = Math.round(SIM_INITIAL_CO2) + " ppm";
    document.getElementById("metric-time").textContent = "0 min";
    document.getElementById("metric-energy").textContent = "0 Wh";
    updateStatsCards();
    co2Log("Reset. Starting at " + Math.round(SIM_INITIAL_CO2) + " ppm.");
}

function co2SetController(c) {
    controller = c;
    co2Log("Controller switched to " + CONTROLLER_LABELS[c]);
    updateStatsCards();
}

function co2UpdateParam(key, val) {
    mpcParams[key] = parseFloat(val);
    document.getElementById("v-" + key).textContent = val;
    // Rebuild MPC with new params if relevant
    if ((key === "horizon" || key === "candidates") && RT) {
        var adapter = createMpcAdapter();
        rebuildMpc(adapter);
    }
}

function co2SetPreset(name) {
    if (!SCRUBBER_PRESETS[name]) return;
    currentPreset = name;
    var p = SCRUBBER_PRESETS[name];
    SCRUBBER_RATES = p.rates.slice();
    SCRUBBER_POWER = p.power.slice();
    SCRUBBER_TAU = p.tau;
    // Clear comparison: changing the physics invalidates any saved run
    lastRunStats = null;
    document.getElementById("preset-desc").textContent = p.desc;
    co2Reset();
    co2Log("Scrubber preset: " + p.label);
    co2Log("  High removes " + (p.rates[3] * 100).toFixed(1) + "% of excess CO2 per minute");
    co2Log("  Response time constant: " + p.tau + "/min (reaches " + (p.tau * 100).toFixed(0) + "% of target in 1 min)");
}

// ── Init ──────────────────────────────────────────────────────────────
drawChart();
updateStatsCards();
co2Log("Demo loaded");
co2Log("Scenario: sealed lunar habitat, 3 crew, activity changes every hour");
co2Log("Pick a controller, click Start. CO2 starts at " + Math.round(SIM_INITIAL_CO2) + " ppm.");
co2Log("Run for 60+ minutes to see meaningful comparison (controllers react only when CO2 climbs).");
loadDynamics();
