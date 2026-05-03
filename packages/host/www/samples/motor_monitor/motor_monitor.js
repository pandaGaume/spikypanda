// SpikyPanda - Motor Current Anomaly Monitor
//
// Tier 1 listener: detects drift in the motor current envelope signal
// without identifying the fault type. Computes an online baseline from
// the first N "calibration" windows (healthy), then scores each
// subsequent window as a z-score distance from that baseline.
//
// Data: streaming.json (produced by prepare_monitor_baseline.py)
(function () {
    const logEl = document.getElementById("log");
    const statusEl = document.getElementById("status");
    const progressFill = document.getElementById("progressFill");
    const btnStart = document.getElementById("btnStart");
    const btnStop = document.getElementById("btnStop");
    const signalCanvas = document.getElementById("signalCanvas");
    const scoreCanvas = document.getElementById("scoreCanvas");
    const scoreNumberEl = document.getElementById("scoreNumber");
    const scoreLabelEl = document.getElementById("scoreLabel");
    const phaseEl = document.getElementById("phaseIndicator");

    let streamData = null;
    let timer = null;
    let streamIndex = 0;
    let baseline = null;
    let smoothedScore = 0;
    let scoreHistory = [];
    let windowBuffer = [];

    const WINDOW_SIZE = 64;
    const CHANNELS = 3;
    const PHASE_COLORS = ["#ff4444", "#44ff44", "#4488ff"];
    const PHASE_NAMES = ["Ia", "Ib", "Ic"];
    const MAX_VISIBLE_WINDOWS = 16;
    const MAX_SCORE_HISTORY = 100;

    function log(msg) {
        logEl.textContent += msg + "\n";
        logEl.scrollTop = logEl.scrollHeight;
    }
    function setStatus(msg) { statusEl.textContent = msg; }

    // ====================== DATA LOADING ======================

    async function loadData() {
        try {
            const resp = await fetch("../../data/motor_monitor/streaming.json");
            if (!resp.ok) throw new Error("streaming.json not found");
            streamData = await resp.json();
            log("Loaded streaming data: " +
                streamData.healthy.length + " healthy + " +
                streamData.anomalous.length + " anomalous windows");
            btnStart.disabled = false;
            setStatus("Ready. Click Start to begin monitoring.");
        } catch (e) {
            log("ERROR: Could not load streaming data. Run prepare_monitor_baseline.py first.");
            setStatus("Data not available.");
        }
    }

    // ====================== ONLINE BASELINE ======================

    function winFeatures(win) {
        var stds = [], ranges = [], clips = [];
        for (var ch = 0; ch < CHANNELS; ch++) {
            var mn = 1e9, mx = -1e9, sum = 0, clipped = 0;
            for (var t = 0; t < WINDOW_SIZE; t++) {
                var v = win[t][ch];
                sum += v;
                if (v < mn) mn = v;
                if (v > mx) mx = v;
                if (v <= 0.001 || v >= 0.999) clipped++;
            }
            var mean = sum / WINDOW_SIZE;
            var varSum = 0;
            for (var t = 0; t < WINDOW_SIZE; t++) {
                var d = win[t][ch] - mean;
                varSum += d * d;
            }
            stds.push(Math.sqrt(varSum / WINDOW_SIZE));
            ranges.push(mx - mn);
            clips.push(clipped / WINDOW_SIZE);
        }
        return { stds: stds, ranges: ranges, clips: clips };
    }

    function buildBaseline(windows) {
        var allStds = [[], [], []], allRanges = [[], [], []], allClips = [[], [], []];
        for (var i = 0; i < windows.length; i++) {
            var f = winFeatures(windows[i]);
            for (var ch = 0; ch < CHANNELS; ch++) {
                allStds[ch].push(f.stds[ch]);
                allRanges[ch].push(f.ranges[ch]);
                allClips[ch].push(f.clips[ch]);
            }
        }
        function meanStd(vals) {
            var m = 0;
            for (var i = 0; i < vals.length; i++) m += vals[i];
            m /= vals.length;
            var v = 0;
            for (var i = 0; i < vals.length; i++) { var d = vals[i] - m; v += d * d; }
            return { mean: m, std: Math.max(Math.sqrt(v / vals.length), 0.001) };
        }
        var features = {};
        var names = ["std", "range", "clip"];
        var datas = [allStds, allRanges, allClips];
        for (var fi = 0; fi < 3; fi++) {
            var means = [], sds = [];
            for (var ch = 0; ch < CHANNELS; ch++) {
                var ms = meanStd(datas[fi][ch]);
                means.push(ms.mean);
                sds.push(ms.std);
            }
            features[names[fi]] = { mean: means, std: sds };
        }
        return features;
    }

    function scoreWindow(win) {
        if (!baseline) return 0;
        var f = winFeatures(win);
        var zSum = 0, cnt = 0;
        var names = ["std", "range", "clip"];
        var vals = [f.stds, f.ranges, f.clips];
        for (var fi = 0; fi < 3; fi++) {
            for (var ch = 0; ch < CHANNELS; ch++) {
                var z = Math.abs(vals[fi][ch] - baseline[names[fi]].mean[ch])
                      / baseline[names[fi]].std[ch];
                zSum += z;
                cnt++;
            }
        }
        return zSum / cnt;
    }

    // ====================== VISUALIZATION ======================

    function drawSignal() {
        var canvas = signalCanvas;
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        var ctx = canvas.getContext("2d");
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        var W = rect.width, H = rect.height;

        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, W, H);

        if (windowBuffer.length === 0) return;

        var padL = 35, padR = 10, padT = 10, padB = 20;
        var plotW = W - padL - padR;
        var plotH = H - padT - padB;

        // Grid
        ctx.strokeStyle = "#1a2a3a";
        ctx.lineWidth = 0.5;
        for (var i = 0; i <= 4; i++) {
            var y = padT + i * plotH / 4;
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        }

        // Y labels
        ctx.fillStyle = "#888"; ctx.font = "9px sans-serif"; ctx.textAlign = "right";
        for (var i = 0; i <= 4; i++) {
            ctx.fillText((1 - i / 4).toFixed(1), padL - 4, padT + i * plotH / 4 + 3);
        }

        // All points across all visible windows
        var totalPts = windowBuffer.length * WINDOW_SIZE;
        for (var ch = 0; ch < CHANNELS; ch++) {
            ctx.strokeStyle = PHASE_COLORS[ch];
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var wi = 0; wi < windowBuffer.length; wi++) {
                var win = windowBuffer[wi];
                for (var t = 0; t < WINDOW_SIZE; t++) {
                    var idx = wi * WINDOW_SIZE + t;
                    var x = padL + (idx / (totalPts - 1)) * plotW;
                    var y = padT + (1 - win[t][ch]) * plotH;
                    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        // Window boundary markers
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 0.5;
        for (var wi = 1; wi < windowBuffer.length; wi++) {
            var x = padL + (wi * WINDOW_SIZE / (totalPts - 1)) * plotW;
            ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke();
        }

        // Legend
        ctx.textAlign = "left";
        for (var ch = 0; ch < CHANNELS; ch++) {
            var lx = padL + ch * 55;
            ctx.fillStyle = PHASE_COLORS[ch];
            ctx.fillRect(lx, H - 12, 10, 3);
            ctx.fillStyle = "#aaa"; ctx.font = "9px sans-serif";
            ctx.fillText(PHASE_NAMES[ch], lx + 14, H - 7);
        }
    }

    function drawScoreChart() {
        var canvas = scoreCanvas;
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        var ctx = canvas.getContext("2d");
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        var W = rect.width, H = rect.height;

        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, W, H);

        if (scoreHistory.length < 2) return;

        var warnTh = parseFloat(document.getElementById("warnThreshold").value);
        var alarmTh = parseFloat(document.getElementById("alarmThreshold").value);
        var maxScore = Math.max(alarmTh * 1.5, Math.max.apply(null,
            scoreHistory.map(function(s) { return s.score; })) * 1.2);

        var padL = 35, padR = 10, padT = 10, padB = 20;
        var plotW = W - padL - padR;
        var plotH = H - padT - padB;

        // Grid
        ctx.strokeStyle = "#1a2a3a"; ctx.lineWidth = 0.5;
        for (var i = 0; i <= 4; i++) {
            var y = padT + i * plotH / 4;
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        }

        // Threshold lines
        function thLine(val, color, label) {
            var y = padT + (1 - val / maxScore) * plotH;
            if (y < padT || y > padT + plotH) return;
            ctx.strokeStyle = color; ctx.lineWidth = 1;
            ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = color; ctx.font = "9px sans-serif"; ctx.textAlign = "left";
            ctx.fillText(label, padL + 4, y - 3);
        }
        thLine(warnTh, "#ffbb33", "WARN " + warnTh.toFixed(1));
        thLine(alarmTh, "#ff4444", "ALARM " + alarmTh.toFixed(1));

        // Score curve
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var i = 0; i < scoreHistory.length; i++) {
            var x = padL + (i / (scoreHistory.length - 1)) * plotW;
            var y = padT + (1 - scoreHistory[i].score / maxScore) * plotH;
            var s = scoreHistory[i];
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.strokeStyle = s.score >= alarmTh ? "#ff4444" :
                                  s.score >= warnTh ? "#ffbb33" : "#44dd66";
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(scoreHistory.length > 1 ?
                    padL + ((i - 1) / (scoreHistory.length - 1)) * plotW : x,
                    scoreHistory.length > 1 ?
                    padT + (1 - scoreHistory[i - 1].score / maxScore) * plotH : y);
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Calibration / monitoring boundary
        var calCount = streamData ? streamData.calibrationCount || 20 : 20;
        if (calCount < scoreHistory.length) {
            var cx = padL + (calCount / (scoreHistory.length - 1)) * plotW;
            ctx.strokeStyle = "#666"; ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(cx, padT); ctx.lineTo(cx, padT + plotH); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "#666"; ctx.font = "9px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("calibration end", cx, padT + plotH + 12);
        }

        // Fault injection marker
        if (streamData) {
            var faultStart = streamData.healthy.length - calCount;
            if (faultStart > 0 && faultStart < scoreHistory.length) {
                var fx = padL + (faultStart / (scoreHistory.length - 1)) * plotW;
                ctx.strokeStyle = "#ff6644"; ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 3]);
                ctx.beginPath(); ctx.moveTo(fx, padT); ctx.lineTo(fx, padT + plotH); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = "#ff6644"; ctx.font = "9px sans-serif"; ctx.textAlign = "center";
                ctx.fillText("fault injected", fx, padT - 2);
            }
        }
    }

    function updateScoreDisplay(score) {
        var warnTh = parseFloat(document.getElementById("warnThreshold").value);
        var alarmTh = parseFloat(document.getElementById("alarmThreshold").value);
        var status, cls;
        if (score >= alarmTh) { status = "ALARM"; cls = "alarm"; }
        else if (score >= warnTh) { status = "WARNING"; cls = "warn"; }
        else { status = "NORMAL"; cls = "normal"; }
        scoreNumberEl.textContent = score.toFixed(2);
        scoreNumberEl.className = "score-number " + cls;
        scoreLabelEl.textContent = status;
        scoreLabelEl.className = "score-label " + cls;
    }

    // ====================== STREAMING ======================

    function getNextWindow() {
        var hLen = streamData.healthy.length;
        var aLen = streamData.anomalous.length;
        if (streamIndex < hLen) {
            return { window: streamData.healthy[streamIndex].sequence, phase: "healthy" };
        }
        var ai = streamIndex - hLen;
        if (ai < aLen) {
            return { window: streamData.anomalous[ai].sequence, phase: "anomalous" };
        }
        return null;
    }

    function tick() {
        var next = getNextWindow();
        if (!next) { stop(); log("Stream ended."); return; }
        streamIndex++;

        var calCount = streamData.calibrationCount || 20;

        // Calibration phase: collect windows, build baseline at the end
        if (streamIndex <= calCount) {
            if (!window._calWindows) window._calWindows = [];
            window._calWindows.push(next.window);
            windowBuffer.push(next.window);
            if (windowBuffer.length > MAX_VISIBLE_WINDOWS) windowBuffer.shift();

            var pct = (streamIndex / calCount * 100).toFixed(0);
            setStatus("Calibrating... " + streamIndex + "/" + calCount);
            progressFill.style.width = pct + "%";

            if (streamIndex === calCount) {
                baseline = buildBaseline(window._calWindows);

                // Auto-compute thresholds from calibration scores.
                // Score each calibration window against the baseline,
                // then set warn = mean + 2*std, alarm = mean + 3*std.
                // This adapts to whatever motor/load/sensor the data
                // comes from, instead of using hard-coded values.
                var calScores = [];
                for (var ci = 0; ci < window._calWindows.length; ci++) {
                    calScores.push(scoreWindow(window._calWindows[ci]));
                }
                var csMean = 0;
                for (var ci = 0; ci < calScores.length; ci++) csMean += calScores[ci];
                csMean /= calScores.length;
                var csVar = 0;
                for (var ci = 0; ci < calScores.length; ci++) {
                    var d = calScores[ci] - csMean;
                    csVar += d * d;
                }
                var csStd = Math.sqrt(csVar / calScores.length);

                // Set warn above the worst healthy score seen during
                // calibration. Nothing below the calibration max can
                // trigger an alarm, regardless of the distribution shape.
                // Then set alarm at warn + 2*std for additional margin.
                var csMax = 0;
                for (var ci = 0; ci < calScores.length; ci++) {
                    if (calScores[ci] > csMax) csMax = calScores[ci];
                }
                // Warn at the calibration max (anything above the worst
                // healthy window is suspicious). Alarm at 1.5x max.
                var autoWarn = csMax;
                var autoAlarm = csMax * 1.5;

                // Push the computed thresholds to the UI sliders
                var warnEl = document.getElementById("warnThreshold");
                var alarmEl = document.getElementById("alarmThreshold");
                warnEl.value = autoWarn.toFixed(1);
                alarmEl.value = autoAlarm.toFixed(1);
                document.getElementById("warnThresholdVal").textContent = autoWarn.toFixed(1);
                document.getElementById("alarmThresholdVal").textContent = autoAlarm.toFixed(1);

                log("Baseline computed from " + calCount + " calibration windows.");
                log("  Healthy score: mean=" + csMean.toFixed(2) + ", std=" + csStd.toFixed(2));
                log("  Calibration max score: " + csMax.toFixed(2));
                log("  Auto-thresholds: warn=" + autoWarn.toFixed(2) +
                    " (cal max), alarm=" + autoAlarm.toFixed(2) + " (1.5x max)");
                log("Monitoring started.");
                setStatus("Monitoring...");
            }
            drawSignal();
            return;
        }

        // Log phase transitions so the user knows what data is being streamed
        var hLen = streamData.healthy.length;
        if (streamIndex === calCount + 1) {
            log("--- Healthy monitoring phase (windows " + (calCount + 1) + "-" + hLen + ") ---");
        }
        if (streamIndex === hLen + 1) {
            log("");
            log("=== FAULT DATA INJECTED at window " + (hLen + 1) + " ===");
            log("=== (BRB windows from the dataset, mixed severity) ===");
            log("");
        }

        // Monitoring phase
        var rawScore = scoreWindow(next.window);
        var alpha = parseFloat(document.getElementById("emaAlpha").value);
        smoothedScore = alpha * rawScore + (1 - alpha) * smoothedScore;

        scoreHistory.push({ score: smoothedScore, phase: next.phase });
        if (scoreHistory.length > MAX_SCORE_HISTORY) scoreHistory.shift();

        windowBuffer.push(next.window);
        if (windowBuffer.length > MAX_VISIBLE_WINDOWS) windowBuffer.shift();

        var warnTh = parseFloat(document.getElementById("warnThreshold").value);
        var alarmTh = parseFloat(document.getElementById("alarmThreshold").value);
        var status = smoothedScore >= alarmTh ? "ALARM" :
                     smoothedScore >= warnTh ? "WARNING" : "NORMAL";

        var winNum = streamIndex;
        var phaseTag = next.phase === "anomalous" ? " (fault data)" : "";
        if (status !== "NORMAL" || winNum % 5 === 0) {
            log("Window " + winNum + ": score=" + smoothedScore.toFixed(2) +
                " [" + status + "]" + phaseTag);
        }

        var total = streamData.healthy.length + streamData.anomalous.length;
        progressFill.style.width = (streamIndex / total * 100).toFixed(0) + "%";
        if (next.phase === "anomalous") {
            phaseEl.textContent = "\u26a0 FAULT DATA (BRB) \u26a0";
            phaseEl.style.color = "#ff6644";
            phaseEl.style.fontWeight = "bold";
        } else {
            phaseEl.textContent = "Healthy data";
            phaseEl.style.color = "#888";
            phaseEl.style.fontWeight = "normal";
        }

        updateScoreDisplay(smoothedScore);
        drawSignal();
        drawScoreChart();
    }

    function start() {
        if (!streamData) return;
        streamIndex = 0;
        smoothedScore = 0;
        scoreHistory = [];
        windowBuffer = [];
        baseline = null;
        window._calWindows = [];
        logEl.textContent = "Starting anomaly monitor...\n";

        var speed = parseInt(document.getElementById("streamSpeed").value);
        timer = setInterval(tick, speed);
        btnStart.disabled = true;
        btnStop.disabled = false;
        setStatus("Calibrating...");
    }

    function stop() {
        if (timer) { clearInterval(timer); timer = null; }
        btnStart.disabled = false;
        btnStop.disabled = true;
        setStatus("Stopped.");
    }

    // ====================== INIT ======================

    btnStart.addEventListener("click", start);
    btnStop.addEventListener("click", stop);

    // Update slider value displays
    ["warnThreshold", "alarmThreshold", "emaAlpha"].forEach(function(id) {
        var el = document.getElementById(id);
        var valEl = document.getElementById(id + "Val");
        el.addEventListener("input", function() { valEl.textContent = el.value; });
    });

    loadData();
})();
