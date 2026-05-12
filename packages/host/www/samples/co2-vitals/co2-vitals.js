// =========================================================================
// SpikyPanda CO2 + Vitals Demo (sample 2)
//
// Same CO2 control machinery as sample 1 (co2-mpc). Nothing changed in the
// controllers. What changed: we now simulate three astronauts and display
// their vital signs (heart rate, SpO2, respiratory rate, cognitive
// alertness) as the consequence of CO2 exposure. The controllers do not
// use vitals in their decisions.
// =========================================================================

// ── CO2 physics constants (identical to sample 1) ─────────────────────
var CO2_MAX_PPM = 10000.0;
var CO2_VITAL = 4000.0;
var CREW_MAX = 6;

var SCRUBBER_PRESETS = {
    oversized: {
        label: "Oversized (new habitat)",
        desc: "Brand new scrubber, over-dimensioned. Any action handles any load. Threshold and AI look alike here.",
        rates: [0.0, 0.03, 0.08, 0.20], power: [0.0, 1.0, 3.0, 8.0], tau: 0.3,
    },
    normal: {
        label: "Normal (end-of-life)",
        desc: "Scrubber at nominal design capacity. Low is tight for heavy work, medium handles it, high drops CO2. Anticipation starts mattering.",
        rates: [0.0, 0.010, 0.025, 0.050], power: [0.0, 1.0, 3.0, 8.0], tau: 0.3,
    },
    degraded: {
        label: "Degraded (real problem)",
        desc: "Scrubber partially clogged or chemically tired. Max capacity is just enough for three crew at rest, not at sustained heavy work. Reacts slowly too. This is the regime where anticipating activity matters: the AI can pre-act, the threshold only reacts once CO2 is already up.",
        rates: [0.0, 0.0015, 0.003, 0.005], power: [0.0, 1.0, 3.0, 8.0], tau: 0.15,
    },
    minimal: {
        label: "Minimal (solo-survivor ceiling)",
        desc: "Critically undersized scrubber. With three crew, equilibrium CO2 pushes above the threshold of the most sensitive crew, then the next. With one or two crew left, it can stabilize the habitat at an impaired-but-survivable level. Who survives depends on how fast the first deaths relieve the load.",
        rates: [0.0, 0.0008, 0.0015, 0.0025], power: [0.0, 1.0, 3.0, 8.0], tau: 0.10,
    },
};

var currentPreset = "oversized";
var SCRUBBER_RATES = SCRUBBER_PRESETS[currentPreset].rates.slice();
var SCRUBBER_RATE_MAX = 0.20;
var SCRUBBER_TAU = SCRUBBER_PRESETS[currentPreset].tau;
var SCRUBBER_POWER = SCRUBBER_PRESETS[currentPreset].power.slice();
var ACTIVITY_EMISSION = {
    sleep: 2.0, rest: 3.5, light_work: 5.5, heavy_work: 7.0,
};
// Emission per crew member per sim minute (ppm). Multiplied by the number
// of living crew in physicsStep.
// Nominal productive work rate per activity (units/min per crew member).
// Rest/sleep are off-duty. Light and heavy are the activities that produce
// scheduled work. Actual output is nominal * efficiency, where efficiency
// degrades with cognitive state and physiological stress.
var ACTIVITY_WORK = {
    sleep: 0.0, rest: 0.0, light_work: 0.5, heavy_work: 1.0,
};
// No passive CO2 removal. In a sealed habitat, scrubbing is the ONLY
// mechanism that removes CO2 on the relevant timescale. Atmospheric
// leakage in a real module is negligible over hours. Setting this to 0
// means: no crew, no scrubber → CO2 stays wherever it is.
var CABIN_LEAK = 0.0;
var MODEL_URL = "models/co2_dynamics.onnx";

// ── Simulation state ──────────────────────────────────────────────────
var SIM_INITIAL_CO2 = 1500.0;
var simCO2 = SIM_INITIAL_CO2;
var simScrubberRate = 0.0;
var simCrewSize = 3;
var simActivity = "light_work";
var simTime = 0;
var simEnergyUsed = 0.0;
var simHistory = [];
var simInterval = null;
var simAction = 0;
var simTimeCap = 60;

// Stats
var statsMaxCO2 = SIM_INITIAL_CO2;
var statsMinCO2 = SIM_INITIAL_CO2;
var statsMinutesAboveSoft = 0;
var statsMinutesAboveVital = 0;
var statsHRSum = 0;
var statsHRCount = 0;
var statsMinSpO2 = 100;
var statsCrewImpairedMinutes = 0;
var statsWorkDone = 0;         // sum across crew of efficiency-weighted output
var statsWorkScheduled = 0;    // sum across crew of nominal output
var lastRunStats = null;        // the "Previous" comparison anchor
var lastCompleted = null;       // snapshot of the run that just stopped

// Time-series of aggregate crew state for the crew trend chart.
var crewHistory = [];           // { t, meanEff, meanCog, impairedCount }

// Event flags for narrative log entries. Reset per run.
var eventFlags = {
    firstImpaired: false,
    firstCritical: false,
    firstProductivityDrop: false,   // aggregate mean efficiency < 0.8
    firstProductivityRecovery: false, // recovered above 0.9 after dropping
    firstDeath: false,
    allDead: false,
};
var statsDeaths = 0;

// Controller
var controller = "mpc";
var mpcParams = {
    horizon: 60, candidates: 40, soft: 3500, comfort: 2000, energy: 50,
};
var CONTROLLER_LABELS = {
    mpc: "Predictive (AI)",
    bangbang: "Reactive threshold",
    off: "No control",
};

// SpikyPanda runtime
var RT = null;
var dynamicsGraph = null;
var dynamicsInputName = null;
var rolloutNode = null;
var objectiveNode = null;
var selectorNode = null;

// ── Crew model ────────────────────────────────────────────────────────
// Each astronaut has individual physiological sensitivities. Values chosen
// to produce visible differences between crew members without being
// exaggerated. The ECG buffer holds the most recent N animation samples
// for the real-time trace (scrolls left).
var ECG_BUFFER_LEN = 240;

var crew = []; // populated at init

function initCrew() {
    crew = [
        {
            name: "CDR-01",
            role: "Commander",
            // baselines
            hrBase: 68,
            spO2Base: 98.5,
            respBase: 13,
            // sensitivity multipliers
            hrSensitivity: 1.0,
            spO2Sensitivity: 0.8,  // more resilient
            cognitiveSensitivity: 0.9,
            recoveryRate: 1.1,
            // state
            hr: 68, spO2: 98.5, resp: 13, cognitive: 100,
            fatigue: 0,
            alert: "nominal",
            efficiency: 1.0, workDone: 0, workScheduled: 0,
            deceased: false, criticalTime: 0, deathTime: null,
            inHabitat: true,
            // ECG state: phase within current cardiac cycle, sample buffer
            ecgPhase: Math.random(),
            ecgBuffer: new Array(ECG_BUFFER_LEN).fill(0),
        },
        {
            name: "FE-02",
            role: "Flight Engineer",
            hrBase: 72,
            spO2Base: 98.0,
            respBase: 15,
            hrSensitivity: 1.2,   // more reactive
            spO2Sensitivity: 1.0,
            cognitiveSensitivity: 1.0,
            recoveryRate: 1.0,
            hr: 72, spO2: 98.0, resp: 15, cognitive: 100,
            fatigue: 0,
            alert: "nominal",
            efficiency: 1.0, workDone: 0, workScheduled: 0,
            deceased: false, criticalTime: 0, deathTime: null,
            inHabitat: true,
            ecgPhase: Math.random(),
            ecgBuffer: new Array(ECG_BUFFER_LEN).fill(0),
        },
        {
            name: "MS-03",
            role: "Mission Specialist",
            hrBase: 75,
            spO2Base: 97.5,
            respBase: 14,
            hrSensitivity: 1.1,
            spO2Sensitivity: 1.3,  // somewhat more susceptible
            cognitiveSensitivity: 1.2,
            recoveryRate: 0.9,
            hr: 75, spO2: 97.5, resp: 14, cognitive: 100,
            fatigue: 0,
            alert: "nominal",
            efficiency: 1.0, workDone: 0, workScheduled: 0,
            deceased: false, criticalTime: 0, deathTime: null,
            inHabitat: true,
            ecgPhase: Math.random(),
            ecgBuffer: new Array(ECG_BUFFER_LEN).fill(0),
        },
    ];
}

// Instantaneous cognitive decline from current CO2 (percentage points).
// Piecewise-linear approximation tuned against the NASA habitat tolerance
// curve: crew still function up to about 7000 ppm, collapse toward the
// 8500 ppm mark which is the published danger threshold for sustained
// exposure. Combined with activity and per-member cognitiveSensitivity
// multipliers, plus fatigue, this lands the first "critical" transition
// around 8000 ppm and death roughly 90 min later (~8500 to 9000 ppm).
function cognitiveDeclineFromCO2(co2ppm) {
    if (co2ppm < 1500) return 0;
    if (co2ppm < 3500) return (co2ppm - 1500) / 2000 * 4;         // 0 to 4
    if (co2ppm < 5500) return 4 + (co2ppm - 3500) / 2000 * 6;     // 4 to 10
    if (co2ppm < 7500) return 10 + (co2ppm - 5500) / 2000 * 10;   // 10 to 20
    if (co2ppm < 9000) return 20 + (co2ppm - 7500) / 1500 * 12;   // 20 to 32
    if (co2ppm < 10000) return 32 + (co2ppm - 9000) / 1000 * 10;  // 32 to 42
    return 42;
}

// Work efficiency from physiological state. Non-linear on cognitive because
// mistakes, retries, and slowed decision-making compound (70 % alert does
// not mean 70 % output, it means closer to 60 %). HR and SpO2 contribute
// secondary stress penalties. Bounded to [0, 1].
function workEfficiency(m) {
    var cogFactor = Math.pow(Math.max(0, m.cognitive) / 100, 1.5);
    var hrFactor = m.hr > 115 ? Math.max(0.5, 1 - (m.hr - 115) / 60) : 1.0;
    var spO2Factor = m.spO2 < 95 ? Math.max(0.5, 1 - (95 - m.spO2) / 10) : 1.0;
    var eff = cogFactor * hrFactor * spO2Factor;
    if (eff < 0) eff = 0;
    if (eff > 1) eff = 1;
    return eff;
}

function activityHRMult(activity) {
    return ({ sleep: 0.9, rest: 1.0, light_work: 1.2, heavy_work: 1.6 })[activity] || 1.0;
}
function activityRespMult(activity) {
    return ({ sleep: 0.9, rest: 1.0, light_work: 1.3, heavy_work: 1.8 })[activity] || 1.0;
}
function activityCogSens(activity) {
    return ({ sleep: 0.6, rest: 0.9, light_work: 1.05, heavy_work: 1.25 })[activity] || 1.0;
}

// Minutes a crew member can survive in the critical zone before death.
// Scaled to give a visible arc during a long run while still mattering
// within the default 60-min windows. In reality CO2 narcosis death takes
// hours at these levels, but we compress it for demo cadence.
var CRITICAL_LETHAL_MINUTES = 90;

// Update one crew member's vital signs for the current CO2 and activity.
// dt is in simulated minutes.
function updateMember(m, co2ppm, activity, dt) {
    // Deceased members are frozen. ECG will go flat in ecgTick.
    if (m.deceased) {
        m.efficiency = 0;
        return;
    }
    // Crew outside the habitat (EVA) are on their own life support. They
    // do not breathe cabin air, do not emit cabin CO2, and their vitals
    // are not affected by the simulation. We freeze their state here.
    if (!m.inHabitat) {
        m.efficiency = 0;
        return;
    }

    // Heart rate: baseline * activity + CO2 response (~4 bpm per 1000 ppm)
    var co2Excess = Math.max(0, co2ppm - 1000) / 1000; // in "thousand ppm units"
    var hrTarget = m.hrBase * activityHRMult(activity) + co2Excess * 4 * m.hrSensitivity;
    // Smooth toward target with time constant ~0.3/min
    m.hr += (hrTarget - m.hr) * 0.3 * dt;
    // Slight physiological jitter
    m.hr += (Math.random() - 0.5) * 0.8;

    // SpO2: stable until high CO2 (hypercapnic acidosis affects O2 delivery).
    // Drops 1-2 % at 4000+ ppm. Scaled by individual sensitivity.
    var spO2Target = m.spO2Base;
    if (co2ppm > 3500) {
        spO2Target -= (co2ppm - 3500) / 1000 * 1.5 * m.spO2Sensitivity;
    }
    if (co2ppm > 5000) {
        spO2Target -= (co2ppm - 5000) / 1000 * 2.0 * m.spO2Sensitivity;
    }
    spO2Target = Math.max(75, spO2Target);
    m.spO2 += (spO2Target - m.spO2) * 0.2 * dt;

    // Respiratory rate: fast chemoreceptor response to CO2.
    // Roughly doubles between 1000 and 4000 ppm.
    var respMult = 1.0 + Math.min(1.5, co2Excess * 0.25);
    var respTarget = m.respBase * activityRespMult(activity) * respMult;
    m.resp += (respTarget - m.resp) * 0.5 * dt;

    // Cognitive: instantaneous decline + cumulative fatigue that builds with
    // exposure and recovers slowly when CO2 is low.
    var instant = cognitiveDeclineFromCO2(co2ppm)
                  * activityCogSens(activity)
                  * m.cognitiveSensitivity;

    if (co2ppm > 1500) {
        // Fatigue accumulates at a small rate, faster when decline is high.
        // Tuned so a full-hour exposure at moderate CO2 adds modest fatigue,
        // and multi-hour sustained high-CO2 runs build up to the cap slowly.
        m.fatigue += instant * 0.008 * dt;
    } else {
        // Recovery when CO2 low
        m.fatigue -= 0.4 * dt * m.recoveryRate;
    }
    m.fatigue = Math.max(0, Math.min(35, m.fatigue));
    m.cognitive = Math.max(0, 100 - instant - m.fatigue);

    // Alert level based on cognitive + HR + SpO2. Critical is a one-way
    // trap: once a crew member hits critical, they stay critical (even if
    // CO2 is restored). The only exit from critical is death, triggered
    // after sustained exposure (CRITICAL_LETHAL_MINUTES).
    if (m.alert === "critical") {
        m.criticalTime += dt;
        if (m.criticalTime >= CRITICAL_LETHAL_MINUTES) {
            m.deceased = true;
            m.deathTime = simTime;
            m.alert = "deceased";
            m.hr = 0;
            m.resp = 0;
            m.efficiency = 0;
            return;
        }
    } else {
        // Alert thresholds calibrated to clinical severity:
        //   elevated  = mild symptoms, noticeable change
        //   impaired  = work effectiveness hit, not immediately dangerous
        //   critical  = severe, life-threatening without intervention
        var alert = "nominal";
        if (m.cognitive < 30 || m.spO2 < 88 || m.hr > 145) alert = "critical";
        else if (m.cognitive < 60 || m.spO2 < 93 || m.hr > 120) alert = "impaired";
        else if (m.cognitive < 80 || m.spO2 < 96 || m.hr > 105) alert = "elevated";
        m.alert = alert;
        if (alert === "critical") m.criticalTime = 0;
    }

    // Work efficiency and accumulated output. Critical crew cannot perform
    // productive tasks; they are locked in survival mode. For all other
    // states, actual output is scheduled * efficiency.
    if (m.alert === "critical") {
        m.efficiency = 0;
    } else {
        m.efficiency = workEfficiency(m);
    }
    var nominalRate = ACTIVITY_WORK[activity] || 0;
    m.workScheduled += nominalRate * dt;
    m.workDone += nominalRate * m.efficiency * dt;
}

// ── EVA toggle (crew enter/exit the habitat) ──────────────────────────
// Exposed via onclick on each crew card's Exit/Enter button. Deceased
// crew cannot be toggled. Updates the card state immediately and logs
// the event so the narrative log shows the door cycling.
function co2ToggleCrew(idx) {
    if (typeof idx !== "number" || idx < 0 || idx >= crew.length) return;
    var m = crew[idx];
    if (m.deceased) return;
    m.inHabitat = !m.inHabitat;
    var timeTag = (simInterval ? "t=" + simTime + "min" : "standby");
    if (m.inHabitat) {
        co2Log("EVA " + timeTag + ": " + m.name + " returned to habitat.");
    } else {
        co2Log("EVA " + timeTag + ": " + m.name + " left habitat (now on EVA life support).");
    }
    renderCrew();
}

// ── Log ───────────────────────────────────────────────────────────────
function co2Log(msg) {
    var el = document.getElementById("log");
    var time = new Date().toLocaleTimeString("en", { hour12: false });
    el.textContent += "[" + time + "] " + msg + "\n";
    el.scrollTop = el.scrollHeight;
}

// ── Crew card rendering ───────────────────────────────────────────────
function buildCrewCards() {
    var grid = document.getElementById("crew-grid");
    grid.innerHTML = "";
    for (var i = 0; i < crew.length; i++) {
        var m = crew[i];
        var card = document.createElement("div");
        card.className = "crew-card status-nominal";
        card.id = "crew-" + i;
        card.innerHTML =
            '<div class="crew-header">' +
              '<div class="crew-avatar idx-' + i + '" title="' + m.role + '"></div>' +
              '<div class="crew-ident">' +
                '<div class="crew-name">' + m.name + '</div>' +
                '<div class="crew-activity" id="crew-' + i + '-activity">idle</div>' +
              '</div>' +
              '<div class="crew-controls">' +
                '<div class="crew-status-badge" id="crew-' + i + '-badge">NOMINAL</div>' +
                '<button class="crew-eva-btn" id="crew-' + i + '-eva" onclick="co2ToggleCrew(' + i + ')">Exit</button>' +
              '</div>' +
            '</div>' +
            '<div class="vital-row">' +
              '<div class="vital-label">HR</div>' +
              '<div class="vital-bar"><div class="vital-bar-fill" id="crew-' + i + '-hrbar" style="width:40%"></div></div>' +
              '<div class="vital-value" id="crew-' + i + '-hr">-- bpm</div>' +
            '</div>' +
            '<div class="vital-row">' +
              '<div class="vital-label">SpO2</div>' +
              '<div class="vital-bar"><div class="vital-bar-fill" id="crew-' + i + '-spo2bar" style="width:100%"></div></div>' +
              '<div class="vital-value" id="crew-' + i + '-spo2">-- %</div>' +
            '</div>' +
            '<div class="vital-row">' +
              '<div class="vital-label">Resp</div>' +
              '<div class="vital-bar"><div class="vital-bar-fill" id="crew-' + i + '-respbar" style="width:40%"></div></div>' +
              '<div class="vital-value" id="crew-' + i + '-resp">-- /min</div>' +
            '</div>' +
            '<div class="vital-row">' +
              '<div class="vital-label">Cog</div>' +
              '<div class="vital-bar"><div class="vital-bar-fill" id="crew-' + i + '-cogbar" style="width:100%"></div></div>' +
              '<div class="vital-value" id="crew-' + i + '-cog">-- %</div>' +
            '</div>' +
            '<div class="vital-row">' +
              '<div class="vital-label">Work</div>' +
              '<div class="vital-bar"><div class="vital-bar-fill" id="crew-' + i + '-effbar" style="width:100%"></div></div>' +
              '<div class="vital-value" id="crew-' + i + '-eff">-- %</div>' +
            '</div>' +
            '<canvas class="vital-ecg" id="crew-' + i + '-ecg"></canvas>';
        grid.appendChild(card);
    }
}

function renderCrew() {
    for (var i = 0; i < crew.length; i++) {
        var m = crew[i];
        var card = document.getElementById("crew-" + i);
        var classes = "crew-card status-" + m.alert;
        if (!m.inHabitat && !m.deceased) classes += " out-of-habitat";
        card.className = classes;

        // Activity line shows "EVA" when out, otherwise current activity.
        document.getElementById("crew-" + i + "-activity").textContent =
            (!m.inHabitat && !m.deceased) ? "EVA (outside)" : simActivity.replace("_", " ");
        // Badge: deceased > EVA > alert state
        var badge = document.getElementById("crew-" + i + "-badge");
        if (m.deceased) badge.textContent = "DECEASED";
        else if (!m.inHabitat) badge.textContent = "EVA";
        else badge.textContent = m.alert.toUpperCase();

        // Exit/Enter button
        var evaBtn = document.getElementById("crew-" + i + "-eva");
        if (m.deceased) {
            evaBtn.textContent = "---";
            evaBtn.disabled = true;
        } else {
            evaBtn.textContent = m.inHabitat ? "Exit" : "Enter";
            evaBtn.disabled = false;
        }

        // HR: normalize to 0-100 range for bar (40-160 bpm window)
        var hrPct = Math.max(0, Math.min(100, (m.hr - 40) / 120 * 100));
        var hrEl = document.getElementById("crew-" + i + "-hr");
        var hrBar = document.getElementById("crew-" + i + "-hrbar");
        hrEl.textContent = Math.round(m.hr) + " bpm";
        hrBar.style.width = hrPct + "%";
        hrEl.className = "vital-value" + (m.hr > 145 ? " alert" : m.hr > 120 ? " warn" : "");
        hrBar.className = "vital-bar-fill" + (m.hr > 145 ? " alert" : m.hr > 120 ? " warn" : "");

        // SpO2: normalize 90-100
        var spO2Pct = Math.max(0, Math.min(100, (m.spO2 - 90) * 10));
        var spO2El = document.getElementById("crew-" + i + "-spo2");
        var spO2Bar = document.getElementById("crew-" + i + "-spo2bar");
        spO2El.textContent = m.spO2.toFixed(1) + " %";
        spO2Bar.style.width = spO2Pct + "%";
        spO2El.className = "vital-value" + (m.spO2 < 88 ? " alert" : m.spO2 < 93 ? " warn" : "");
        spO2Bar.className = "vital-bar-fill" + (m.spO2 < 88 ? " alert" : m.spO2 < 93 ? " warn" : "");

        // Respiratory (normalize 10-40)
        var respPct = Math.max(0, Math.min(100, (m.resp - 10) / 30 * 100));
        document.getElementById("crew-" + i + "-resp").textContent = Math.round(m.resp) + " /min";
        document.getElementById("crew-" + i + "-respbar").style.width = respPct + "%";

        // Cognitive
        var cogEl = document.getElementById("crew-" + i + "-cog");
        var cogBar = document.getElementById("crew-" + i + "-cogbar");
        cogEl.textContent = Math.round(m.cognitive) + " %";
        cogBar.style.width = m.cognitive + "%";
        cogEl.className = "vital-value" + (m.cognitive < 30 ? " alert" : m.cognitive < 60 ? " warn" : "");
        cogBar.className = "vital-bar-fill" + (m.cognitive < 30 ? " alert" : m.cognitive < 60 ? " warn" : "");

        // Work efficiency (current, not cumulative)
        var effPct = Math.round(m.efficiency * 100);
        var effEl = document.getElementById("crew-" + i + "-eff");
        var effBar = document.getElementById("crew-" + i + "-effbar");
        effEl.textContent = effPct + " %";
        effBar.style.width = effPct + "%";
        effEl.className = "vital-value" + (effPct < 60 ? " alert" : effPct < 80 ? " warn" : "");
        effBar.className = "vital-bar-fill" + (effPct < 60 ? " alert" : effPct < 80 ? " warn" : "");

        // ECG redraws on its own rAF loop; no per-sim-step draw here.
    }
}

// ── ECG synthesis and animation ───────────────────────────────────────
// Synthetic ECG waveform: sum of narrow Gaussians for P, Q, R, S, T waves.
// phase in [0, 1] spans one cardiac cycle. Amplitude is in arbitrary units;
// the R-spike reaches ~1.0 and the rest is scaled relative to it.
function ecgSample(phase) {
    function g(p0, sigma) {
        var d = (phase - p0) / sigma;
        return Math.exp(-d * d);
    }
    var v = 0;
    v += 0.15 * g(0.10, 0.030);   // P wave
    v -= 0.10 * g(0.17, 0.010);   // Q dip
    v += 1.00 * g(0.18, 0.010);   // R spike
    v -= 0.25 * g(0.20, 0.014);   // S dip
    v += 0.30 * g(0.38, 0.050);   // T wave
    return v;
}

var ecgLastTime = null;
function ecgTick() {
    var now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    var dt = ecgLastTime ? Math.min(0.1, (now - ecgLastTime) / 1000) : 0;
    ecgLastTime = now;

    for (var i = 0; i < crew.length; i++) {
        var m = crew[i];
        if (m.deceased) {
            // Flat line: push zeroes, no phase advance.
            m.ecgBuffer.push(0);
            if (m.ecgBuffer.length > ECG_BUFFER_LEN) m.ecgBuffer.shift();
            drawECG(i, m);
            continue;
        }
        // Cardiac period in seconds. Cap HR to a safe range for rendering.
        var hrClamped = Math.max(30, Math.min(200, m.hr));
        var cycleLen = 60 / hrClamped;
        m.ecgPhase += dt / cycleLen;
        while (m.ecgPhase >= 1) m.ecgPhase -= 1;
        m.ecgBuffer.push(ecgSample(m.ecgPhase));
        if (m.ecgBuffer.length > ECG_BUFFER_LEN) m.ecgBuffer.shift();
        drawECG(i, m);
    }
    requestAnimationFrame(ecgTick);
}

function drawECG(idx, m) {
    var c = document.getElementById("crew-" + idx + "-ecg");
    if (!c) return;
    var ctx = c.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var w = c.width = c.clientWidth * dpr;
    var h = c.height = c.clientHeight * dpr;

    // Monitor-style background. Goes deep red when the member is dead so
    // the card reads as an alarm strip at a glance.
    ctx.fillStyle = m.deceased ? "#1a0505" : "#061a0c";
    ctx.fillRect(0, 0, w, h);

    // Faint grid (tinted to match bg)
    ctx.strokeStyle = m.deceased ? "rgba(220, 80, 80, 0.10)" : "rgba(80, 220, 120, 0.08)";
    ctx.lineWidth = 1 * dpr;
    var gridStep = Math.max(8 * dpr, Math.floor(h / 4));
    for (var gx = 0; gx < w; gx += gridStep) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }
    for (var gy = 0; gy < h; gy += gridStep) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }

    // Trace
    var mid = h * 0.65;              // baseline
    var amp = h * 0.50;               // R-spike amplitude
    var col;
    if (m.deceased) col = "#ff2a2a";
    else col = m.alert === "critical" ? "#ff5151" :
               m.alert === "impaired" ? "#ff9f43" :
               m.alert === "elevated" ? "#f6d04d" : "#3dff7a";
    ctx.strokeStyle = col;
    ctx.lineWidth = m.deceased ? 1.8 * dpr : 1.5 * dpr;
    ctx.shadowColor = col;
    ctx.shadowBlur = m.deceased ? 6 * dpr : 4 * dpr;
    ctx.beginPath();
    for (var i = 0; i < m.ecgBuffer.length; i++) {
        var x = i / (m.ecgBuffer.length - 1) * w;
        var y = mid - m.ecgBuffer[i] * amp;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // bpm annotation (top right). Deceased shows "ASYSTOLE".
    ctx.font = "bold " + (10 * dpr) + "px 'Cascadia Code', Consolas, monospace";
    ctx.textAlign = "right";
    if (m.deceased) {
        ctx.fillStyle = "#ff6060";
        ctx.fillText("ASYSTOLE", w - 6 * dpr, 12 * dpr);
    } else {
        ctx.fillStyle = "rgba(180, 255, 200, 0.75)";
        ctx.fillText(Math.round(m.hr) + " bpm", w - 6 * dpr, 12 * dpr);
    }
}

// ── CO2 physics (same as sample 1) ────────────────────────────────────
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

function pickActivity(t) {
    var phase = Math.floor(t / 60) % 4;
    if (phase === 0) return "heavy_work";
    if (phase === 1) return "light_work";
    if (phase === 2) return "rest";
    return "light_work";
}

// ── Controllers (copied from sample 1) ────────────────────────────────
var _reactiveState = false;
function controllerOff() { return 0; }
function controllerBangBang(co2) {
    if (_reactiveState && co2 < 2500) _reactiveState = false;
    if (!_reactiveState && co2 > 3500) _reactiveState = true;
    return _reactiveState ? 3 : 0;
}

function controllerMPC(co2, crewSize, scrubberRate) {
    if (!selectorNode || !rolloutNode || !objectiveNode) return controllerBangBang(co2);
    var initState = new Float32Array([co2 / CO2_MAX_PPM, crewSize / CREW_MAX, scrubberRate / SCRUBBER_RATE_MAX]);
    var stateTensor = { data: initState, shape: [3], name: "initial_state" };
    var result = selectorNode.execute([stateTensor]);
    var bestAction = result[0];
    var chosen = 0;
    for (var i = 0; i < 4; i++) if (bestAction.data[i] > 0.5) { chosen = i; break; }
    return chosen;
}

// ── MPC adapter (identical to sample 1) ───────────────────────────────
function createMpcAdapter() {
    if (!RT) return null;
    class AdapterNode extends RT.Kernel {
        constructor() {
            super();
            this.id = "mpc_adapter_input";
            this.nodeType = "mpc_adapter";
            this.outputShapes = [[1]];
        }
        execute(inputs) {
            var d = inputs[0].data;
            var reordered = new Float32Array(7);
            reordered[0] = d[0];
            reordered[1] = d[3]; reordered[2] = d[4]; reordered[3] = d[5]; reordered[4] = d[6];
            reordered[5] = d[1]; reordered[6] = d[2];
            var modelInput = { data: reordered, shape: [1, 7], name: dynamicsInputName };
            var ext = new Map();
            ext.set(dynamicsInputName, modelInput);
            var out = dynamicsGraph.run(ext);
            var modelOut = out.values().next().value;
            var actionIdx = 0;
            for (var a = 0; a < 4; a++) if (d[3 + a] > 0.5) { actionIdx = a; break; }
            var targetRate = SCRUBBER_RATES[actionIdx] / SCRUBBER_RATE_MAX;
            var nextScrubber = d[2] + (targetRate - d[2]) * SCRUBBER_TAU;
            return [{ data: new Float32Array([d[0] + modelOut.data[0], d[1], nextScrubber]),
                      shape: [3], name: "next_state" }];
        }
    }
    return new RT.ComputeGraph([new AdapterNode()], []);
}

function rebuildMpc(adapterGraph) {
    if (!RT || !adapterGraph) return;
    var STATE_DIM = 3, ACTION_DIM = 4;
    rolloutNode = new RT.RolloutNode({
        dynamics: adapterGraph, dynamicsInputName: "mpc_adapter_input",
        horizon: mpcParams.horizon, stateDim: STATE_DIM, actionDim: ACTION_DIM, deltaMode: false,
    });
    var costFn = function(trajectory, actions, stateDim, actionDim, horizon) {
        var comfort = (mpcParams.comfort || 2000) / CO2_MAX_PPM;
        var soft = mpcParams.soft / CO2_MAX_PPM;
        var vital = CO2_VITAL / CO2_MAX_PPM;
        var cost = 0;
        for (var t = 0; t <= horizon; t++) {
            var co2 = trajectory[t * stateDim];
            if (co2 > vital) cost += 1e6;
            else if (co2 > soft) {
                var excess = (co2 - soft) / (vital - soft);
                cost += 100 + 9900 * excess * excess;
            } else if (co2 > comfort) {
                var ratio = (co2 - comfort) / (soft - comfort);
                cost += 100 * ratio;
            }
        }
        var energyWeight = mpcParams.energy / 50.0;
        for (var t = 0; t < horizon; t++)
            for (var a = 0; a < actionDim; a++)
                cost += actions[t * actionDim + a] * SCRUBBER_POWER[a] * energyWeight;
        return cost;
    };
    objectiveNode = new RT.ObjectiveNode({ costFn: costFn, stateDim: STATE_DIM, actionDim: ACTION_DIM, horizon: mpcParams.horizon });

    var randomSampler = RT.makePiecewiseConstantSampler(4, 3, 10);
    var callCount = 0;
    var hybridSampler = function(horizon, actionDim, rng) {
        callCount++;
        var slot = (callCount - 1) % 8;
        var out = new Float32Array(horizon * actionDim);
        if (slot < 4) { for (var t = 0; t < horizon; t++) out[t * actionDim + slot] = 1.0; return out; }
        if (slot === 4) {
            var quarter = Math.floor(horizon / 4);
            for (var t = 0; t < horizon; t++) {
                var level = Math.min(3, Math.floor(t / Math.max(1, quarter)));
                out[t * actionDim + level] = 1.0;
            }
            return out;
        }
        if (slot === 5) {
            var earlyLen = Math.floor(horizon / 3);
            for (var t = 0; t < earlyLen; t++) out[t * actionDim + 2] = 1.0;
            for (var t = earlyLen; t < horizon; t++) out[t * actionDim + 0] = 1.0;
            return out;
        }
        return randomSampler(horizon, actionDim, rng);
    };
    selectorNode = new RT.ShootingSelectorNode({
        rollout: rolloutNode, objective: objectiveNode, sampler: hybridSampler,
        numCandidates: mpcParams.candidates, horizon: mpcParams.horizon,
        stateDim: STATE_DIM, actionDim: ACTION_DIM,
    });
}

// ── Load dynamics ─────────────────────────────────────────────────────
function loadDynamics() {
    RT = window.SpikypandaOnnx;
    if (!RT) { co2Log("ERROR: runtime not loaded"); return; }
    co2Log("Loading dynamics model...");
    fetch(MODEL_URL)
        .then(function(resp) { if (!resp.ok) throw new Error("HTTP " + resp.status); return resp.arrayBuffer(); })
        .then(function(buf) {
            var bytes = new Uint8Array(buf);
            co2Log("Model loaded: " + (bytes.length / 1024).toFixed(1) + " KB");
            var parsed = RT.OnnxParser.parse(bytes);
            var registry = RT.createDefaultRegistry();
            var builder = new RT.OnnxGraphBuilder(registry);
            var result = builder.build(parsed);
            dynamicsGraph = result.graph;
            dynamicsInputName = result.inputNames[0];
            rebuildMpc(createMpcAdapter());
            co2Log("MPC pipeline ready. Click Start.");
        })
        .catch(function(err) { co2Log("ERROR loading dynamics: " + err.message); });
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

    var padLeft = 60 * dpr, padRight = 20 * dpr, padTop = 20 * dpr, padBottom = 30 * dpr;
    var plotW = w - padLeft - padRight, plotH = h - padTop - padBottom;
    var windowMin = 120;
    var tMax = Math.max(simTime, windowMin);
    var tMin = tMax - windowMin;
    var yMax = 6000, yMin = 0;

    ctx.strokeStyle = "#1a3050";
    for (var i = 0; i <= 5; i++) {
        var y = padTop + (plotH * i / 5);
        ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(w - padRight, y); ctx.stroke();
    }

    function yFor(v) { return padTop + plotH * (1 - (v - yMin) / (yMax - yMin)); }
    ctx.strokeStyle = "#ff6b6b";
    ctx.setLineDash([5 * dpr, 5 * dpr]);
    ctx.beginPath(); ctx.moveTo(padLeft, yFor(CO2_VITAL)); ctx.lineTo(w - padRight, yFor(CO2_VITAL)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ff6b6b"; ctx.font = (10 * dpr) + "px sans-serif"; ctx.textAlign = "left";
    ctx.fillText("4000 vital", padLeft + 4 * dpr, yFor(CO2_VITAL) - 3 * dpr);

    ctx.strokeStyle = "#f0ad4e"; ctx.setLineDash([3 * dpr, 3 * dpr]);
    ctx.beginPath(); ctx.moveTo(padLeft, yFor(mpcParams.soft)); ctx.lineTo(w - padRight, yFor(mpcParams.soft)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f0ad4e"; ctx.fillText(mpcParams.soft + " soft", padLeft + 4 * dpr, yFor(mpcParams.soft) - 3 * dpr);

    ctx.fillStyle = "#888"; ctx.textAlign = "right";
    for (var i = 0; i <= 5; i++) {
        var v = yMax - (yMax - yMin) * i / 5;
        var y = padTop + plotH * i / 5;
        ctx.fillText(Math.round(v) + " ppm", padLeft - 6 * dpr, y + 4 * dpr);
    }
    ctx.textAlign = "center";
    for (var i = 0; i <= 4; i++) {
        var t = tMin + (tMax - tMin) * i / 4;
        var x = padLeft + plotW * i / 4;
        ctx.fillText(Math.round(t) + " min", x, h - 8 * dpr);
    }

    if (simHistory.length > 1) {
        ctx.strokeStyle = "#00d4ff"; ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        var first = true;
        for (var i = 0; i < simHistory.length; i++) {
            var p = simHistory[i];
            if (p.t < tMin) continue;
            var x = padLeft + plotW * (p.t - tMin) / (tMax - tMin);
            var y = yFor(p.co2);
            if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

// Crew aggregate chart: mean work efficiency (solid) and mean cognitive
// alertness (dashed) over the same time window as the CO2 chart. A red
// band at the bottom marks minutes where at least one crew member is
// impaired or critical. Same x-axis as the CO2 chart so cause and effect
// are visually aligned.
function drawCrewChart() {
    var canvas = document.getElementById("chart-crew");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.width = canvas.clientWidth * dpr;
    var h = canvas.height = canvas.clientHeight * dpr;
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, w, h);

    var padLeft = 60 * dpr, padRight = 20 * dpr, padTop = 14 * dpr, padBottom = 26 * dpr;
    var plotW = w - padLeft - padRight, plotH = h - padTop - padBottom;
    var windowMin = 120;
    var tMax = Math.max(simTime, windowMin);
    var tMin = tMax - windowMin;
    var yMax = 100, yMin = 0;

    // horizontal grid at 0/25/50/75/100 %
    ctx.strokeStyle = "#1a3050"; ctx.lineWidth = 1 * dpr;
    for (var i = 0; i <= 4; i++) {
        var y = padTop + (plotH * i / 4);
        ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(w - padRight, y); ctx.stroke();
    }

    function xFor(t) { return padLeft + plotW * (t - tMin) / (tMax - tMin); }
    function yFor(v) { return padTop + plotH * (1 - (v - yMin) / (yMax - yMin)); }

    // 80 % "productive" reference line
    ctx.strokeStyle = "rgba(212, 163, 22, 0.5)"; ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath(); ctx.moveTo(padLeft, yFor(80)); ctx.lineTo(w - padRight, yFor(80)); ctx.stroke();
    ctx.setLineDash([]);

    // axis labels
    ctx.fillStyle = "#888"; ctx.font = (10 * dpr) + "px sans-serif"; ctx.textAlign = "right";
    for (var i = 0; i <= 4; i++) {
        var v = yMax - (yMax - yMin) * i / 4;
        var y = padTop + plotH * i / 4;
        ctx.fillText(Math.round(v) + " %", padLeft - 6 * dpr, y + 4 * dpr);
    }

    if (crewHistory.length > 1) {
        // Impaired band at the bottom (scaled to crew size)
        var crewSize = crew.length || 3;
        var bandTop = padTop + plotH;
        var bandHeight = 8 * dpr;
        ctx.fillStyle = "rgba(255, 107, 107, 0.25)";
        var runStart = -1;
        for (var i = 0; i < crewHistory.length; i++) {
            var p = crewHistory[i];
            if (p.t < tMin) continue;
            if (p.impaired > 0 && runStart < 0) runStart = p.t;
            if ((p.impaired === 0 || i === crewHistory.length - 1) && runStart >= 0) {
                var endT = p.impaired === 0 ? p.t : p.t;
                var x0 = xFor(runStart), x1 = xFor(endT);
                ctx.fillRect(x0, bandTop - bandHeight, Math.max(1, x1 - x0), bandHeight);
                runStart = -1;
            }
        }

        // Cognitive (dashed)
        ctx.strokeStyle = "rgba(107, 190, 255, 0.7)"; ctx.lineWidth = 1.5 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.beginPath();
        var first = true;
        for (var i = 0; i < crewHistory.length; i++) {
            var p = crewHistory[i];
            if (p.t < tMin) continue;
            var x = xFor(p.t), y = yFor(p.meanCog);
            if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Work efficiency (solid, emphasized)
        ctx.strokeStyle = "#8ef28a"; ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        first = true;
        for (var i = 0; i < crewHistory.length; i++) {
            var p = crewHistory[i];
            if (p.t < tMin) continue;
            var x = xFor(p.t), y = yFor(p.meanEff * 100);
            if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Legend
    ctx.font = (10 * dpr) + "px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#8ef28a"; ctx.fillRect(padLeft + 4 * dpr, padTop - 10 * dpr, 10 * dpr, 2 * dpr);
    ctx.fillText("work eff", padLeft + 18 * dpr, padTop - 4 * dpr);
    ctx.fillStyle = "rgba(107, 190, 255, 0.9)";
    ctx.fillRect(padLeft + 80 * dpr, padTop - 10 * dpr, 10 * dpr, 2 * dpr);
    ctx.fillText("cognitive", padLeft + 94 * dpr, padTop - 4 * dpr);
    ctx.fillStyle = "rgba(255, 107, 107, 0.6)";
    ctx.fillRect(padLeft + 160 * dpr, padTop - 10 * dpr, 10 * dpr, 2 * dpr);
    ctx.fillText("impaired", padLeft + 174 * dpr, padTop - 4 * dpr);

    ctx.fillStyle = "#888"; ctx.textAlign = "center";
    for (var i = 0; i <= 4; i++) {
        var t = tMin + (tMax - tMin) * i / 4;
        var x = padLeft + plotW * i / 4;
        ctx.fillText(Math.round(t) + " min", x, h - 6 * dpr);
    }
}

// ── Stats cards ───────────────────────────────────────────────────────
function updateStatsCards() {
    document.getElementById("stat-curr-ctrl").textContent = CONTROLLER_LABELS[controller];
    document.getElementById("stat-curr-time").textContent = simTime + " min";
    document.getElementById("stat-curr-max").textContent = Math.round(statsMaxCO2) + " ppm";
    var avgHR = statsHRCount > 0 ? statsHRSum / statsHRCount : 0;
    document.getElementById("stat-curr-hr").textContent = avgHR > 0 ? Math.round(avgHR) + " bpm" : "-";
    document.getElementById("stat-curr-spo2").textContent = statsMinSpO2 < 100 ? statsMinSpO2.toFixed(1) + " %" : "-";
    document.getElementById("stat-curr-impaired").textContent = statsCrewImpairedMinutes;
    document.getElementById("stat-curr-deaths").textContent = statsDeaths + " / " + crew.length;
    document.getElementById("stat-curr-energy").textContent = simEnergyUsed.toFixed(0) + " Wh";

    // Work output block
    var workRatio = statsWorkScheduled > 0 ? statsWorkDone / statsWorkScheduled : 1.0;
    var workPerWh = simEnergyUsed > 0 ? statsWorkDone / simEnergyUsed : 0;
    document.getElementById("stat-curr-work").textContent =
        statsWorkDone.toFixed(1) + " / " + statsWorkScheduled.toFixed(1) + " (" + Math.round(workRatio * 100) + "%)";
    document.getElementById("stat-curr-workwh").textContent =
        simEnergyUsed > 0 ? workPerWh.toFixed(3) + " u/Wh" : "-";

    if (lastRunStats) {
        document.getElementById("stat-prev-ctrl").textContent = CONTROLLER_LABELS[lastRunStats.controller];
        document.getElementById("stat-prev-time").textContent = lastRunStats.time + " min";
        document.getElementById("stat-prev-max").textContent = Math.round(lastRunStats.maxCO2) + " ppm";
        document.getElementById("stat-prev-hr").textContent = Math.round(lastRunStats.avgHR) + " bpm";
        document.getElementById("stat-prev-spo2").textContent = lastRunStats.minSpO2.toFixed(1) + " %";
        document.getElementById("stat-prev-impaired").textContent = lastRunStats.crewImpairedMinutes;
        document.getElementById("stat-prev-deaths").textContent =
            (lastRunStats.deaths || 0) + " / " + (lastRunStats.crewSize || 3);
        document.getElementById("stat-prev-energy").textContent = lastRunStats.energy.toFixed(0) + " Wh";
        var prevRatio = lastRunStats.workScheduled > 0 ? lastRunStats.workDone / lastRunStats.workScheduled : 1.0;
        var prevPerWh = lastRunStats.energy > 0 ? lastRunStats.workDone / lastRunStats.energy : 0;
        document.getElementById("stat-prev-work").textContent =
            lastRunStats.workDone.toFixed(1) + " / " + lastRunStats.workScheduled.toFixed(1) + " (" + Math.round(prevRatio * 100) + "%)";
        document.getElementById("stat-prev-workwh").textContent =
            lastRunStats.energy > 0 ? prevPerWh.toFixed(3) + " u/Wh" : "-";
    }
}

function saveRunAsPrevious() {
    if (simTime < 5) return;
    var snapshot = {
        controller: controller, time: simTime,
        maxCO2: statsMaxCO2, energy: simEnergyUsed,
        avgHR: statsHRCount > 0 ? statsHRSum / statsHRCount : 0,
        minSpO2: statsMinSpO2,
        crewImpairedMinutes: statsCrewImpairedMinutes,
        workDone: statsWorkDone,
        workScheduled: statsWorkScheduled,
        deaths: statsDeaths,
        crewSize: crew.length,
    };
    lastCompleted = snapshot;
    // Promotion rules for the Previous anchor:
    //   (a) no anchor yet, seed it with this run
    //   (b) anchor used the same controller, refresh it (this is a rerun)
    //   (c) anchor used a different controller, KEEP it so the A vs B
    //       comparison survives consecutive stops
    // Promotion across controllers happens in co2Start (see below).
    if (!lastRunStats || lastRunStats.controller === controller) {
        lastRunStats = snapshot;
    }
    var ratio = statsWorkScheduled > 0 ? statsWorkDone / statsWorkScheduled : 1.0;
    co2Log("Saved: " + CONTROLLER_LABELS[controller] + " " + simTime + "min, max " + Math.round(statsMaxCO2) + " ppm, avg HR " + Math.round(snapshot.avgHR) + " bpm, impaired-min " + statsCrewImpairedMinutes + ", work " + statsWorkDone.toFixed(1) + "/" + statsWorkScheduled.toFixed(1) + " (" + Math.round(ratio * 100) + "%)");
}

// ── Simulation loop ───────────────────────────────────────────────────
function simStep() {
    if (!simInterval) return;

    // Only living crew INSIDE the habitat produce CO2. A crew member on
    // EVA (inHabitat=false) is on their own life support and contributes
    // nothing to cabin CO2. Deceased members also don't emit. Recount
    // every step so a death or a door cycle takes effect immediately.
    var livingCrew = 0;
    for (var li = 0; li < crew.length; li++) {
        if (!crew[li].deceased && crew[li].inHabitat) livingCrew++;
    }
    simCrewSize = livingCrew;

    if (controller === "mpc") simAction = controllerMPC(simCO2, simCrewSize, simScrubberRate);
    else if (controller === "bangbang") simAction = controllerBangBang(simCO2);
    else simAction = controllerOff();

    simActivity = pickActivity(simTime);
    var next = physicsStep(simCO2, simScrubberRate, simAction, simCrewSize, simActivity);
    simCO2 = next.co2;
    simScrubberRate = next.scrubberRate;
    simEnergyUsed += SCRUBBER_POWER[simAction];
    simTime += 1;

    // Update each crew member. Out-of-habitat (EVA) crew are frozen and
    // contribute nothing to the cabin stats. Deceased members are also
    // excluded from the "living" HR aggregate but still count against the
    // impaired-minutes tally.
    var nominalRateThisStep = ACTIVITY_WORK[simActivity] || 0;
    var sumEff = 0, sumCog = 0, impairedThisStep = 0, criticalThisStep = 0;
    var deceasedThisStep = 0, livingCount = 0, livingHRSum = 0, crewInHabitat = 0;
    for (var i = 0; i < crew.length; i++) {
        var wasDeceased = crew[i].deceased;
        updateMember(crew[i], simCO2, simActivity, 1.0);
        // Detect a death this step (transition)
        if (!wasDeceased && crew[i].deceased) {
            statsDeaths += 1;
            deceasedThisStep += 1;
        }
        if (!crew[i].inHabitat) {
            // EVA: do not count toward any cabin-side stats, including the
            // cognitive/efficiency aggregate. We still track crewInHabitat
            // for the chart normalization.
            sumEff += 1;   // treat as "available but absent" so the average isn't pulled down
            sumCog += 100;
            continue;
        }
        crewInHabitat += 1;
        // Aggregate HR only over living IN-habitat crew.
        if (!crew[i].deceased) {
            livingHRSum += crew[i].hr;
            livingCount += 1;
            if (crew[i].spO2 < statsMinSpO2) statsMinSpO2 = crew[i].spO2;
        }
        statsHRSum += crew[i].hr;
        statsHRCount += 1;
        if (crew[i].alert === "impaired" || crew[i].alert === "critical" || crew[i].deceased) {
            statsCrewImpairedMinutes += 1;
            impairedThisStep += 1;
        }
        if (crew[i].alert === "critical") criticalThisStep += 1;
        statsWorkScheduled += nominalRateThisStep;
        statsWorkDone += nominalRateThisStep * crew[i].efficiency;
        sumEff += crew[i].efficiency;
        sumCog += crew[i].cognitive;
    }
    var meanEff = sumEff / crew.length;
    var meanCog = sumCog / crew.length;

    if (simCO2 > statsMaxCO2) statsMaxCO2 = simCO2;
    if (simCO2 < statsMinCO2) statsMinCO2 = simCO2;
    if (simCO2 > mpcParams.soft) statsMinutesAboveSoft += 1;
    if (simCO2 > CO2_VITAL) statsMinutesAboveVital += 1;

    // Narrative log events (fire once per run)
    if (!eventFlags.firstImpaired && impairedThisStep > 0) {
        eventFlags.firstImpaired = true;
        co2Log("EVENT t=" + simTime + "min: first crew member IMPAIRED (CO2 " + Math.round(simCO2) + " ppm).");
    }
    if (!eventFlags.firstCritical && criticalThisStep > 0) {
        eventFlags.firstCritical = true;
        co2Log("EVENT t=" + simTime + "min: first crew member CRITICAL (CO2 " + Math.round(simCO2) + " ppm).");
    }
    if (!eventFlags.firstProductivityDrop && meanEff < 0.8) {
        eventFlags.firstProductivityDrop = true;
        co2Log("EVENT t=" + simTime + "min: mean crew productivity dropped below 80% (now " + Math.round(meanEff * 100) + "%).");
    }
    if (eventFlags.firstProductivityDrop && !eventFlags.firstProductivityRecovery && meanEff > 0.9) {
        eventFlags.firstProductivityRecovery = true;
        co2Log("EVENT t=" + simTime + "min: mean crew productivity recovered above 90%.");
    }
    if (deceasedThisStep > 0) {
        for (var di = 0; di < crew.length; di++) {
            var dm = crew[di];
            if (dm.deceased && dm.deathTime === simTime) {
                co2Log("DEATH t=" + simTime + "min: " + dm.name + " (" + dm.role + ") deceased after " + Math.round(CRITICAL_LETHAL_MINUTES) + " min in critical.");
            }
        }
        if (!eventFlags.firstDeath) {
            eventFlags.firstDeath = true;
        }
    }
    if (!eventFlags.allDead && livingCount === 0) {
        eventFlags.allDead = true;
        co2Log("EVENT t=" + simTime + "min: ALL CREW DECEASED. Habitat silent.");
    }

    if (simTimeCap > 0 && simTime >= simTimeCap) {
        co2Log("Time cap reached (" + simTimeCap + " min). Stopping.");
        co2Stop();
        return;
    }

    simHistory.push({ t: simTime, co2: simCO2, action: simAction });
    if (simHistory.length > 500) simHistory.shift();
    crewHistory.push({ t: simTime, meanEff: meanEff, meanCog: meanCog, impaired: impairedThisStep });
    if (crewHistory.length > 500) crewHistory.shift();

    // UI updates
    var co2El = document.getElementById("metric-co2");
    co2El.textContent = Math.round(simCO2) + " ppm";
    var actionNames = ["off", "low", "med", "high"];
    var effectivePct = (simScrubberRate / SCRUBBER_RATE_MAX * 100).toFixed(0);
    document.getElementById("metric-action").textContent = actionNames[simAction] + " (" + effectivePct + "%)";
    document.getElementById("metric-time").textContent = simTime + " min";
    document.getElementById("metric-energy").textContent = simEnergyUsed.toFixed(0) + " Wh";

    drawChart();
    drawCrewChart();
    renderCrew();
    updateStatsCards();
}

// Clear all per-run state without touching lastRunStats / lastCompleted.
function resetRunState() {
    simCO2 = SIM_INITIAL_CO2; simScrubberRate = 0.0; simTime = 0;
    simEnergyUsed = 0.0; simHistory = []; simAction = 0;
    statsMaxCO2 = SIM_INITIAL_CO2; statsMinCO2 = SIM_INITIAL_CO2;
    statsMinutesAboveSoft = 0; statsMinutesAboveVital = 0;
    statsHRSum = 0; statsHRCount = 0; statsMinSpO2 = 100;
    statsCrewImpairedMinutes = 0;
    statsWorkDone = 0; statsWorkScheduled = 0;
    crewHistory = [];
    eventFlags = {
        firstImpaired: false, firstCritical: false,
        firstProductivityDrop: false, firstProductivityRecovery: false,
        firstDeath: false, allDead: false,
    };
    statsDeaths = 0;
    simCrewSize = 3;
    _reactiveState = false;
    initCrew();
}

// ── Public controls ───────────────────────────────────────────────────
function co2Start() {
    if (simInterval) return;
    // If a completed run used a different controller than the one we're
    // about to run, promote it to the Previous slot now, before we reset.
    if (lastCompleted && lastCompleted.controller !== controller) {
        lastRunStats = lastCompleted;
    }
    if (simTime > 0) {
        resetRunState();
        drawChart(); drawCrewChart(); renderCrew();
    }
    simInterval = setInterval(simStep, 100);
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
    co2Log("Stopped at t=" + simTime + " min");
    if (simTime >= 5) { saveRunAsPrevious(); updateStatsCards(); }
}

function co2Reset() {
    co2Stop();
    resetRunState();
    document.getElementById("metric-co2").textContent = Math.round(SIM_INITIAL_CO2) + " ppm";
    document.getElementById("metric-time").textContent = "0 min";
    document.getElementById("metric-energy").textContent = "0 Wh";
    drawChart(); drawCrewChart(); renderCrew(); updateStatsCards();
    co2Log("Reset.");
}

function co2SetController(c) {
    controller = c;
    co2Log("Controller: " + CONTROLLER_LABELS[c]);
    updateStatsCards();
}

function co2SetTimeCap(val) {
    simTimeCap = parseInt(val, 10) || 0;
}

function co2SetPreset(name) {
    if (!SCRUBBER_PRESETS[name]) return;
    currentPreset = name;
    var p = SCRUBBER_PRESETS[name];
    SCRUBBER_RATES = p.rates.slice();
    SCRUBBER_POWER = p.power.slice();
    SCRUBBER_TAU = p.tau;
    lastRunStats = null;
    document.getElementById("preset-desc").textContent = p.desc;
    co2Reset();
    co2Log("Scrubber preset: " + p.label);
}

// ── Init ──────────────────────────────────────────────────────────────
initCrew();
buildCrewCards();
renderCrew();
drawChart();
drawCrewChart();
updateStatsCards();
requestAnimationFrame(ecgTick);
co2Log("Sample 2: CO2 control with astronaut vitals");
co2Log("Scenario: 3 crew in a closed lunar habitat. Vitals and work efficiency respond to CO2 and activity.");
co2Log("Pick a controller, click Start. CO2 starts at " + Math.round(SIM_INITIAL_CO2) + " ppm.");
loadDynamics();
