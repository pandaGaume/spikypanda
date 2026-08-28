// SpikyPanda - Motor Current (Broken Rotor Bar) RNN Demo
//
// Companion to the Motor Vibration sample. Same training/test/visualization
// pipeline, but the three input channels are stator phase currents (Ia, Ib,
// Ic) instead of accelerometer axes (X, Y, Z), and the classes are the five
// rotor states from the UFU Broken Rotor Bar dataset
// (Healthy + 1..4 broken bars).
//
// Data source:
//   packages/host/www/data/motor_current/train.json
//   packages/host/www/data/motor_current/test.json
// Generate both with:
//   python packages/dev/tools/python/prepare_motor_current.py \
//       --source-dir packages/host/www/data/motor_current
// (see packages/dev/tools/python/README.md for the dataset list)
(function () {
    const S = SpikypandaCore;

    const logEl = document.getElementById("log");
    const statusEl = document.getElementById("status");
    const progressFill = document.getElementById("progressFill");
    const btnLoad = document.getElementById("btnLoad");
    const btnTrain = document.getElementById("btnTrain");
    const btnTest = document.getElementById("btnTest");
    const btnProfileConversion = document.getElementById("btnProfileConversion");
    const btnExport = document.getElementById("btnExport");
    const btnRestoreCheckpoint = document.getElementById("btnRestoreCheckpoint");
    const btnResetCheckpoint = document.getElementById("btnResetCheckpoint");
    const btnDownloadCheckpoint = document.getElementById("btnDownloadCheckpoint");
    const btnImportCheckpoint = document.getElementById("btnImportCheckpoint");
    const checkpointFileInput = document.getElementById("checkpointFileInput");
    const datasetSplitSelect = document.getElementById("datasetSplit");
    const numSamplesInput = document.getElementById("numSamples");
    const numSamplesHint = document.getElementById("numSamplesHint");
    const snnSensorEncodingSelect = document.getElementById("snnSensorEncoding");
    const snnBandSelectionSelect = document.getElementById("snnBandSelection");
    const snnTopologySelect = document.getElementById("snnTopology");
    const snnTrainingObjectiveSelect = document.getElementById("snnTrainingObjective");
    const btnCopyLog = document.getElementById("btnCopyLog");
    const btnClearLog = document.getElementById("btnClearLog");
    const conversionProfileDetails = document.getElementById("conversionProfileDetails");
    const conversionProfileOutput = document.getElementById("conversionProfileOutput");
    const resultsPanel = document.getElementById("resultsPanel");
    const lossCanvas = document.getElementById("lossCanvas");
    const signalCanvas = document.getElementById("signalCanvas");
    const confusionDiv = document.getElementById("confusionMatrix");

    let trainData = null;
    let testData = null;
    let rnnGraph = null;
    let runtime = null;
    let trainer = null;
    let snnModel = null;
    let snnInference = null;
    let snnSensorConfig = null;
    let activeCheckpoint = null;
    let loadedSplitProtocol = null;
    let loadedDatasetFingerprint = null;
    let loadedSampleRateHz = 60;
    let loadedSignalDomain = "envelope";
    let loadedLineFrequencyHz = 60;
    let lastTestAccuracy = null;
    const lossHistory = [];

    const CHECKPOINT_SCHEMA_VERSION = 2;
    const CHECKPOINT_PREFIX = "spikypanda.motor-current.best.v2.";
    const CHECKPOINT_LATEST_KEY = "spikypanda.motor-current.best.latest.v2";
    const RNN_ARCHITECTURE_VERSION = "rnn-many-to-one-v2";
    const SNN_ARCHITECTURE_VERSION = "snn-wave-lif-hard-forward-v5";
    const VALIDATION_PROTOCOL = "train-holdout-12.5-v1";
    const GROUPED_DATASET_PROTOCOL = "grouped-acquisition-v2-120hz";
    const SNN_SEED = 0x534e4e31;
    const SNN_BATCH_SIZE = 16;
    const SNN_OBJECTIVE_RUNTIME_DECODER = "runtime-decoder-ce";
    const SNN_OBJECTIVE_TEMPORAL_MSE = "temporal-mse";

    // Default class list matches the synthetic fallback below. When real data
    // (UFU .mat) is loaded via prepare_motor_current.py, the JSON exposes a
    // `classes` array which overrides these names (typically 5 rotor states).
    let CLASS_NAMES = ["Normal", "OpenPhase", "ShortCircuit", "Unbalanced"];
    let NUM_CLASSES = CLASS_NAMES.length;

    // Three phase currents: A (red), B (green), C (blue).
    const PHASE_COLORS = ["#ff4444", "#44ff44", "#4488ff"];
    const PHASE_NAMES = ["Ia", "Ib", "Ic"];

    function log(msg) {
        logEl.textContent += msg + "\n";
        logEl.scrollTop = logEl.scrollHeight;
    }
    function setStatus(msg) {
        statusEl.textContent = msg;
    }
    function setProgress(pct) {
        progressFill.style.width = pct + "%";
    }
    function showConversionProfile(profile) {
        if (!conversionProfileDetails || !conversionProfileOutput) return;
        if (!profile) {
            conversionProfileDetails.style.display = "none";
            conversionProfileOutput.textContent = "";
            return;
        }
        conversionProfileOutput.textContent = JSON.stringify(profile, null, 2);
        conversionProfileDetails.style.display = "block";
    }

    function updateSampleCountControl(source, trainCount, testCount) {
        if (!numSamplesInput || !numSamplesHint) return;

        if (source === "real") {
            numSamplesInput.disabled = true;
            numSamplesHint.textContent = "Real dataset loaded: " + trainCount + " train + " + testCount + " test. All samples are used.";
            return;
        }

        if (source === "synthetic") {
            numSamplesInput.disabled = false;
            numSamplesHint.textContent = "Synthetic dataset size before the 80% train, 20% test split.";
            return;
        }

        const groupedSplit = datasetSplitSelect && datasetSplitSelect.value === "grouped";
        numSamplesInput.disabled = groupedSplit;
        numSamplesHint.textContent = groupedSplit
            ? "Grouped mode uses every sample from train_grouped.json and test_grouped.json."
            : "Used only if the legacy JSON dataset is unavailable. Split 80% train, 20% test.";
    }

    if (datasetSplitSelect) {
        datasetSplitSelect.addEventListener("change", function () {
            updateSampleCountControl("selection");
        });
    }
    updateSampleCountControl("selection");

    function flashButton(button, text, duration) {
        if (!button) return;
        const original = button.textContent;
        button.textContent = text;
        button.classList.add("copied");
        window.setTimeout(function () {
            button.textContent = original;
            button.classList.remove("copied");
        }, duration || 1200);
    }

    function copyTrainingLog() {
        const text = logEl.textContent || "";
        const copied = function () {
            flashButton(btnCopyLog, "Copied!", 1500);
        };
        const failed = function () {
            flashButton(btnCopyLog, "Failed", 1500);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(copied).catch(failed);
            return;
        }

        try {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.top = "-1000px";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const ok = document.execCommand("copy");
            textarea.remove();
            if (ok) copied();
            else failed();
        } catch (e) {
            failed();
        }
    }

    if (btnCopyLog) btnCopyLog.addEventListener("click", copyTrainingLog);
    const cellTypeSelect = document.getElementById("cellType");
    if (cellTypeSelect) {
        cellTypeSelect.addEventListener("change", function () {
            btnExport.disabled = true;
            const isSnn = cellTypeSelect.value === "snn";
            if (snnSensorEncodingSelect) snnSensorEncodingSelect.disabled = !isSnn;
            if (snnBandSelectionSelect) snnBandSelectionSelect.disabled = !isSnn;
            if (snnTopologySelect) snnTopologySelect.disabled = !isSnn;
            if (snnTrainingObjectiveSelect) snnTrainingObjectiveSelect.disabled = !isSnn;
            if (!isSnn) return;
            document.getElementById("hiddenSize").value = "32";
            document.getElementById("epochs").value = "20";
            document.getElementById("lr").value = "0.003";
            setStatus("SNN selected: interchangeable wave sensor, phase branches, native LIF inference.");
        });
    }
    if (btnClearLog) {
        btnClearLog.addEventListener("click", function () {
            logEl.textContent = "Ready.\n";
            logEl.scrollTop = 0;
            flashButton(btnClearLog, "Cleared", 1000);
        });
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        window.setTimeout(function () {
            anchor.remove();
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function hashText(text, initial) {
        let hash = initial === undefined ? 2166136261 : initial;
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function fingerprintDataset(samples, splitProtocol) {
        let hash = hashText(splitProtocol + "|" + samples.length);
        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            const sequence = sample.sequence;
            const first = sequence[0] || [];
            const last = sequence[sequence.length - 1] || [];
            hash = hashText(
                [sample.label, sample.sourceGroup || "", sample.sourceLoad || "", sample.windowStart === undefined ? "" : sample.windowStart, first.join(","), last.join(",")].join(
                    "|"
                ),
                hash
            );
        }
        return hash.toString(16).padStart(8, "0");
    }

    function splitTrainingValidation(samples) {
        const grouped =
            samples.length > 0 &&
            samples.every(function (sample) {
                return typeof sample.sourceGroup === "string" && sample.sourceGroup.length > 0;
            });

        if (grouped) {
            const strata = new Map();
            for (let i = 0; i < samples.length; i++) {
                const sample = samples[i];
                const stratum = sample.label + "|" + (sample.sourceLoad || "unknown");
                if (!strata.has(stratum)) strata.set(stratum, new Map());
                const groups = strata.get(stratum);
                if (!groups.has(sample.sourceGroup)) groups.set(sample.sourceGroup, []);
                groups.get(sample.sourceGroup).push(sample);
            }

            const validationGroups = new Set();
            strata.forEach(function (groups, stratum) {
                const names = Array.from(groups.keys()).sort(function (left, right) {
                    const leftHash = hashText(stratum + "|" + left);
                    const rightHash = hashText(stratum + "|" + right);
                    return leftHash - rightHash || left.localeCompare(right);
                });
                const count = Math.max(1, Math.round(names.length * 0.125));
                for (let i = 0; i < count && i < names.length; i++) {
                    validationGroups.add(names[i]);
                }
            });

            return {
                train: samples.filter(function (sample) {
                    return !validationGroups.has(sample.sourceGroup);
                }),
                validation: samples.filter(function (sample) {
                    return validationGroups.has(sample.sourceGroup);
                }),
                protocol: VALIDATION_PROTOCOL + "-grouped",
            };
        }

        const train = [];
        const validation = [];
        const classOffsets = new Map();
        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            const offset = classOffsets.get(sample.label) || 0;
            if (offset % 8 === 0) validation.push(sample);
            else train.push(sample);
            classOffsets.set(sample.label, offset + 1);
        }
        return {
            train: train,
            validation: validation,
            protocol: VALIDATION_PROTOCOL + "-stratified-windows",
        };
    }

    async function evaluateAccuracy(samples) {
        let correct = 0;
        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            runtime.resetState();
            const outputs = runtime.run(sample.sequence);
            const lastOutput = outputs[outputs.length - 1];
            let predicted = 0;
            for (let c = 1; c < lastOutput.length; c++) {
                if (lastOutput[c] > lastOutput[predicted]) predicted = c;
            }
            if (predicted === sample.label) correct++;
            if (i % 50 === 0) {
                await new Promise(function (resolve) {
                    window.setTimeout(resolve, 0);
                });
            }
        }
        return { correct: correct, total: samples.length, accuracy: correct / samples.length };
    }

    async function evaluateSnnTeacherAccuracy(model, samples, options) {
        const settings = options || {};
        const includeTrainingForward = settings.includeTrainingForward === true;
        let correct = 0;
        let trainingForwardCorrect = 0;
        let sensorEvents = 0;
        let eventTimesteps = 0;
        let totalDurationSeconds = 0;
        let trainingForwardLoss = 0;
        let correctClassScore = 0;
        let classificationMargin = 0;
        let runtimeMargin = 0;
        const totalHiddenSize = model.totalHiddenSize || model.hiddenSize;
        const hiddenSpikeCounts = new Array(totalHiddenSize).fill(0);
        const outputSpikeCounts = new Array(model.outputSize).fill(0);
        const confusionMatrix = Array.from({ length: model.outputSize }, function () {
            return new Array(model.outputSize).fill(0);
        });
        for (let i = 0; i < samples.length; i++) {
            const result = MotorCurrentSnn.analyzeTeacher(model, samples[i].sequence, samples[i].label, includeTrainingForward);
            if (result.runtimePredicted === samples[i].label) correct++;
            if (includeTrainingForward && result.trainingPredicted === samples[i].label) trainingForwardCorrect++;
            confusionMatrix[samples[i].label][result.runtimePredicted]++;
            sensorEvents += result.sensorEvents;
            eventTimesteps += result.eventTimesteps;
            totalDurationSeconds += result.durationSeconds;
            runtimeMargin += result.runtimeMargin;
            for (let neuron = 0; neuron < hiddenSpikeCounts.length; neuron++) {
                hiddenSpikeCounts[neuron] += result.hiddenSpikeCounts[neuron];
            }
            for (let output = 0; output < outputSpikeCounts.length; output++) {
                outputSpikeCounts[output] += result.outputSpikeCounts[output];
            }
            if (includeTrainingForward) {
                trainingForwardLoss += result.trainingLoss;
                correctClassScore += result.correctClassScore;
                classificationMargin += result.classificationMargin;
            }
            if (i % 25 === 0) {
                await new Promise(function (resolve) {
                    window.setTimeout(resolve, 0);
                });
            }
        }
        const mainHiddenSpikeCounts = hiddenSpikeCounts.slice(0, model.hiddenSize);
        const specialistHiddenSpikeCounts = hiddenSpikeCounts.slice(model.hiddenSize);
        return {
            correct: correct,
            total: samples.length,
            accuracy: correct / samples.length,
            trainingForwardAccuracy: includeTrainingForward ? trainingForwardCorrect / samples.length : null,
            validationLoss: includeTrainingForward ? trainingForwardLoss / samples.length : null,
            meanCorrectClassScore: includeTrainingForward ? correctClassScore / samples.length : null,
            meanClassificationMargin: includeTrainingForward ? classificationMargin / samples.length : null,
            meanRuntimeMargin: runtimeMargin / samples.length,
            sensorEvents: sensorEvents,
            eventTimesteps: eventTimesteps,
            hiddenFiringRateMeanHz: meanRate(mainHiddenSpikeCounts, totalDurationSeconds),
            hiddenFiringRateStdHz: standardDeviationRate(mainHiddenSpikeCounts, totalDurationSeconds),
            specialistFiringRateMeanHz:
                specialistHiddenSpikeCounts.length > 0 ? meanRate(specialistHiddenSpikeCounts, totalDurationSeconds) : null,
            specialistFiringRateStdHz:
                specialistHiddenSpikeCounts.length > 0 ? standardDeviationRate(specialistHiddenSpikeCounts, totalDurationSeconds) : null,
            outputFiringRatesHz: outputSpikeCounts.map(function (count) {
                return count / totalDurationSeconds;
            }),
            hiddenSpikesPerSampleMean: sum(mainHiddenSpikeCounts) / (mainHiddenSpikeCounts.length * samples.length),
            specialistSpikesPerSampleMean:
                specialistHiddenSpikeCounts.length > 0
                    ? sum(specialistHiddenSpikeCounts) / (specialistHiddenSpikeCounts.length * samples.length)
                    : null,
            outputSpikesPerSample: outputSpikeCounts.map(function (count) {
                return count / samples.length;
            }),
            confusionMatrix: confusionMatrix,
        };
    }

    function sum(values) {
        let total = 0;
        for (let index = 0; index < values.length; index++) total += values[index];
        return total;
    }

    function meanRate(spikeCounts, durationSeconds) {
        if (spikeCounts.length === 0 || !(durationSeconds > 0)) return 0;
        return sum(spikeCounts) / (spikeCounts.length * durationSeconds);
    }

    function standardDeviationRate(spikeCounts, durationSeconds) {
        if (spikeCounts.length === 0 || !(durationSeconds > 0)) return 0;
        const mean = meanRate(spikeCounts, durationSeconds);
        let squaredDistance = 0;
        for (let index = 0; index < spikeCounts.length; index++) {
            const rate = spikeCounts[index] / durationSeconds;
            squaredDistance += (rate - mean) * (rate - mean);
        }
        return Math.sqrt(squaredDistance / spikeCounts.length);
    }

    function createFidelityLayerAccumulator(neuronCount) {
        return {
            neuronCount: neuronCount,
            outputAbsoluteErrorSum: 0,
            outputComparisonCount: 0,
            membraneAbsoluteErrorSum: 0,
            membraneMoments: { count: 0, softSum: 0, hardSum: 0, softSquaredSum: 0, hardSquaredSum: 0, productSum: 0 },
            softNearThresholdCount: 0,
            softThresholdStateCount: 0,
            hardNearThresholdCount: 0,
            hardThresholdStateCount: 0,
            timingAbsoluteErrorSecondsSum: 0,
            timingMatchCount: 0,
            hardSpikeCount: 0,
            softSpikeCounts: new Array(neuronCount).fill(0),
            hardSpikeCounts: new Array(neuronCount).fill(0),
        };
    }

    function mergeFidelityLayer(target, source) {
        target.outputAbsoluteErrorSum += source.outputAbsoluteErrorSum;
        target.outputComparisonCount += source.outputComparisonCount;
        target.membraneAbsoluteErrorSum += source.membraneAbsoluteErrorSum;
        target.softNearThresholdCount += source.softNearThresholdCount;
        target.softThresholdStateCount += source.softThresholdStateCount;
        target.hardNearThresholdCount += source.hardNearThresholdCount;
        target.hardThresholdStateCount += source.hardThresholdStateCount;
        target.timingAbsoluteErrorSecondsSum += source.timingAbsoluteErrorSecondsSum;
        target.timingMatchCount += source.timingMatchCount;
        target.hardSpikeCount += source.hardSpikeCount;
        const momentKeys = ["count", "softSum", "hardSum", "softSquaredSum", "hardSquaredSum", "productSum"];
        for (let key = 0; key < momentKeys.length; key++) {
            const name = momentKeys[key];
            target.membraneMoments[name] += source.membraneMoments[name];
        }
        for (let neuron = 0; neuron < target.neuronCount; neuron++) {
            target.softSpikeCounts[neuron] += source.softSpikeCounts[neuron];
            target.hardSpikeCounts[neuron] += source.hardSpikeCounts[neuron];
        }
    }

    function correlationFromMoments(moments) {
        if (moments.count < 2) return 0;
        const covariance = moments.productSum - (moments.softSum * moments.hardSum) / moments.count;
        const softVariance = moments.softSquaredSum - (moments.softSum * moments.softSum) / moments.count;
        const hardVariance = moments.hardSquaredSum - (moments.hardSum * moments.hardSum) / moments.count;
        const denominator = Math.sqrt(Math.max(0, softVariance) * Math.max(0, hardVariance));
        return denominator > 0 ? covariance / denominator : 0;
    }

    function vectorCorrelation(left, right) {
        if (left.length !== right.length || left.length < 2) return 0;
        const leftMean = sum(left) / left.length;
        const rightMean = sum(right) / right.length;
        let covariance = 0;
        let leftVariance = 0;
        let rightVariance = 0;
        for (let index = 0; index < left.length; index++) {
            const leftCentered = left[index] - leftMean;
            const rightCentered = right[index] - rightMean;
            covariance += leftCentered * rightCentered;
            leftVariance += leftCentered * leftCentered;
            rightVariance += rightCentered * rightCentered;
        }
        const denominator = Math.sqrt(leftVariance * rightVariance);
        return denominator > 0 ? covariance / denominator : 0;
    }

    function finalizeFidelityLayer(layer, durationSeconds, sampleCount) {
        const softRate = meanRate(layer.softSpikeCounts, durationSeconds);
        const hardRate = meanRate(layer.hardSpikeCounts, durationSeconds);
        return {
            neuronCount: layer.neuronCount,
            spikeOutputMae: layer.outputAbsoluteErrorSum / Math.max(1, layer.outputComparisonCount),
            membraneMae: layer.membraneAbsoluteErrorSum / Math.max(1, layer.membraneMoments.count),
            membraneCorrelation: correlationFromMoments(layer.membraneMoments),
            softFiringRateMeanHz: softRate,
            hardFiringRateMeanHz: hardRate,
            firingRateDeltaMeanHz: softRate - hardRate,
            firingRateCorrelation: vectorCorrelation(layer.softSpikeCounts, layer.hardSpikeCounts),
            spikeTimingMaeMilliseconds:
                layer.timingMatchCount > 0 ? (layer.timingAbsoluteErrorSecondsSum * 1000) / layer.timingMatchCount : null,
            spikeTimingMatchFraction: layer.timingMatchCount / Math.max(1, layer.hardSpikeCount),
            softNearThresholdFraction: layer.softNearThresholdCount / Math.max(1, layer.softThresholdStateCount),
            hardNearThresholdFraction: layer.hardNearThresholdCount / Math.max(1, layer.hardThresholdStateCount),
            softExpectedSpikesPerSample: sum(layer.softSpikeCounts) / Math.max(1, sampleCount),
            hardSpikesPerSample: sum(layer.hardSpikeCounts) / Math.max(1, sampleCount),
        };
    }

    async function evaluateSnnConversionProfile(model, samples) {
        const totalHiddenSize = model.totalHiddenSize || model.hiddenSize;
        const hidden = createFidelityLayerAccumulator(totalHiddenSize);
        const output = createFidelityLayerAccumulator(model.outputSize);
        const divergenceSums = [];
        const stageAccumulators = [];
        let scoreMae = 0;
        let softMargin = 0;
        let hardMargin = 0;
        let durationSeconds = 0;

        for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
            const sample = samples[sampleIndex];
            const replay = MotorCurrentSnn.profileTeacherConversion(model, sample.sequence, sample.label, 8);
            mergeFidelityLayer(hidden, replay.fidelity.hidden);
            mergeFidelityLayer(output, replay.fidelity.output);
            scoreMae += replay.fidelity.scoreMae;
            softMargin += replay.fidelity.softMargin;
            hardMargin += replay.fidelity.hardMargin;
            durationSeconds += sample.sequence.length / model.sensorConfig.sampleRateHz;
            for (let timestep = 0; timestep < replay.fidelity.divergenceByTimestep.length; timestep++) {
                divergenceSums[timestep] = (divergenceSums[timestep] || 0) + replay.fidelity.divergenceByTimestep[timestep];
            }
            for (let stageIndex = 0; stageIndex < replay.stages.length; stageIndex++) {
                const stage = replay.stages[stageIndex];
                if (!stageAccumulators[stageIndex]) {
                    stageAccumulators[stageIndex] = { id: stage.id, label: stage.label, correct: 0, margin: 0 };
                }
                if (stage.predicted === sample.label) stageAccumulators[stageIndex].correct++;
                stageAccumulators[stageIndex].margin += stage.margin;
            }
            if (sampleIndex % 10 === 0) {
                setProgress(((sampleIndex + 1) / samples.length) * 100);
                setStatus("Profilage soft vers hard " + (sampleIndex + 1) + "/" + samples.length + "...");
                await new Promise(function (resolve) {
                    window.setTimeout(resolve, 0);
                });
            }
        }

        const divergence = divergenceSums.map(function (value) {
            return value / samples.length;
        });
        return {
            version: "paired-soft-hard-conversion-profiler-v1",
            sampleCount: samples.length,
            hidden: finalizeFidelityLayer(hidden, durationSeconds, samples.length),
            output: finalizeFidelityLayer(output, durationSeconds, samples.length),
            decision: {
                scoreMae: scoreMae / samples.length,
                softMargin: softMargin / samples.length,
                hardMargin: hardMargin / samples.length,
                marginGap: (softMargin - hardMargin) / samples.length,
            },
            divergenceByTimestep: divergence,
            stages: stageAccumulators.map(function (stage) {
                return {
                    id: stage.id,
                    label: stage.label,
                    correct: stage.correct,
                    total: samples.length,
                    accuracy: stage.correct / samples.length,
                    meanMargin: stage.margin / samples.length,
                };
            }),
        };
    }

    function logSnnConversionProfile(profile) {
        log("");
        log("Profiler de conversion apparié sur " + profile.sampleCount + " fenêtres de validation:");
        [
            ["LIF cachés", profile.hidden],
            ["LIF de sortie", profile.output],
        ].forEach(function (entry) {
            const layer = entry[1];
            log(
                entry[0] +
                    " - spike MAE=" +
                    layer.spikeOutputMae.toFixed(4) +
                    "; membrane MAE=" +
                    layer.membraneMae.toFixed(4) +
                    "; corrélation membrane=" +
                    layer.membraneCorrelation.toFixed(4)
            );
            log(
                entry[0] +
                    " - firing soft/hard=" +
                    layer.softFiringRateMeanHz.toFixed(3) +
                    "/" +
                    layer.hardFiringRateMeanHz.toFixed(3) +
                    " Hz; corrélation=" +
                    layer.firingRateCorrelation.toFixed(4) +
                    "; timing MAE=" +
                    (layer.spikeTimingMaeMilliseconds === null ? "n/a" : layer.spikeTimingMaeMilliseconds.toFixed(2) + "ms")
            );
            log(
                entry[0] +
                    " - près du seuil, soft=" +
                    (layer.softNearThresholdFraction * 100).toFixed(1) +
                    "%, hard=" +
                    (layer.hardNearThresholdFraction * 100).toFixed(1) +
                    "%"
            );
        });
        const divergence = profile.divergenceByTimestep;
        const indices = [0, 0.25, 0.5, 0.75, 1].map(function (fraction) {
            return Math.min(divergence.length - 1, Math.round((divergence.length - 1) * fraction));
        });
        log(
            "Divergence membrane D(t), début/Q1/milieu/Q3/fin: " +
                indices
                    .map(function (index) {
                        return divergence[index].toFixed(4);
                    })
                    .join(" / ") +
                "; maximum=" +
                Math.max.apply(Math, divergence).toFixed(4)
        );
        log(
            "Décision comparable - score MAE=" +
                profile.decision.scoreMae.toFixed(4) +
                "; marge soft=" +
                signed(profile.decision.softMargin, 4) +
                "; marge hard=" +
                signed(profile.decision.hardMargin, 4) +
                "; gap=" +
                signed(profile.decision.marginGap, 4)
        );
        log("Conversion progressive:");
        for (let index = 0; index < profile.stages.length; index++) {
            const stage = profile.stages[index];
            log(
                "  " +
                    stage.label.padEnd(43, " ") +
                    " " +
                    (stage.accuracy * 100).toFixed(1).padStart(5, " ") +
                    "%  marge " +
                    signed(stage.meanMargin, 4)
            );
        }
    }

    async function evaluateSnnForwardIdentity(teacher, compiled, samples) {
        let binaryValueCount = 0;
        let binaryViolationCount = 0;
        let trainingHardPredictionMismatches = 0;
        let nativePredictionMismatches = 0;
        let modeScoreMaxError = 0;
        let membraneMaxError = 0;
        let nativeScoreAbsoluteError = 0;
        let nativeScoreComparisonCount = 0;
        let nativeScoreMaxError = 0;

        for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
            const sample = samples[sampleIndex];
            const contract = MotorCurrentSnn.profileForwardContract(teacher, sample.sequence, sample.label);
            const native = MotorCurrentSnn.predictCompiled(compiled, sample.sequence);
            binaryValueCount += contract.binaryValueCount;
            binaryViolationCount += contract.binaryViolationCount;
            if (contract.trainingPredicted !== contract.hardPredicted) trainingHardPredictionMismatches++;
            if (contract.hardPredicted !== native.predicted) nativePredictionMismatches++;
            modeScoreMaxError = Math.max(modeScoreMaxError, contract.modeScoreMaxError);
            membraneMaxError = Math.max(membraneMaxError, contract.membraneMaxError);
            for (let output = 0; output < contract.hardScores.length; output++) {
                const error = Math.abs(contract.hardScores[output] - native.scores[output]);
                nativeScoreAbsoluteError += error;
                nativeScoreComparisonCount++;
                nativeScoreMaxError = Math.max(nativeScoreMaxError, error);
            }
            if (sampleIndex % 10 === 0) {
                setProgress(((sampleIndex + 1) / samples.length) * 100);
                setStatus("Vérification du forward hard " + (sampleIndex + 1) + "/" + samples.length + "...");
                await new Promise(function (resolve) {
                    window.setTimeout(resolve, 0);
                });
            }
        }

        return {
            version: "hard-forward-native-identity-v1",
            sampleCount: samples.length,
            binaryValueCount: binaryValueCount,
            binaryViolationCount: binaryViolationCount,
            trainingHardPredictionMismatches: trainingHardPredictionMismatches,
            modeScoreMaxError: modeScoreMaxError,
            membraneMaxError: membraneMaxError,
            nativePredictionMismatches: nativePredictionMismatches,
            nativeScoreMae: nativeScoreAbsoluteError / Math.max(1, nativeScoreComparisonCount),
            nativeScoreMaxError: nativeScoreMaxError,
        };
    }

    function logSnnForwardIdentity(profile) {
        log("");
        log("Vérification du contrat hard-forward sur " + profile.sampleCount + " fenêtres de validation:");
        log(
            "Valeurs binaires: " +
                (profile.binaryValueCount - profile.binaryViolationCount) +
                "/" +
                profile.binaryValueCount +
                "; violations=" +
                profile.binaryViolationCount
        );
        log(
            "Training vs hard analytique: prédictions différentes=" +
                profile.trainingHardPredictionMismatches +
                "; score max error=" +
                profile.modeScoreMaxError.toExponential(3) +
                "; membrane max error=" +
                profile.membraneMaxError.toExponential(3)
        );
        log(
            "Hard analytique vs LIF natif compilé: prédictions différentes=" +
                profile.nativePredictionMismatches +
                "; score MAE=" +
                profile.nativeScoreMae.toExponential(3) +
                "; score max error=" +
                profile.nativeScoreMaxError.toExponential(3)
        );
        const exact =
            profile.binaryViolationCount === 0 &&
            profile.trainingHardPredictionMismatches === 0 &&
            profile.modeScoreMaxError === 0 &&
            profile.membraneMaxError === 0 &&
            profile.nativePredictionMismatches === 0 &&
            profile.nativeScoreMaxError < 1e-12;
        log(exact ? "Contrat respecté: aucun pseudo-spike et forward identique au runtime natif." : "ATTENTION: le contrat hard-forward n'est pas respecté.");
    }

    function snnDiagnosticRecord(metrics) {
        return {
            runtimeHardAccuracy: metrics.accuracy,
            trainingForwardAccuracy: metrics.trainingForwardAccuracy,
            trainingObjectiveLoss: metrics.validationLoss,
            meanCorrectClassScore: metrics.meanCorrectClassScore,
            meanClassificationMargin: metrics.meanClassificationMargin,
            meanRuntimeMargin: metrics.meanRuntimeMargin,
            hiddenFiringRateMeanHz: metrics.hiddenFiringRateMeanHz,
            hiddenFiringRateStdHz: metrics.hiddenFiringRateStdHz,
            specialistFiringRateMeanHz: metrics.specialistFiringRateMeanHz,
            specialistFiringRateStdHz: metrics.specialistFiringRateStdHz,
            outputFiringRatesHz: metrics.outputFiringRatesHz.slice(),
            hiddenSpikesPerSampleMean: metrics.hiddenSpikesPerSampleMean,
            specialistSpikesPerSampleMean: metrics.specialistSpikesPerSampleMean,
            outputSpikesPerSample: metrics.outputSpikesPerSample.slice(),
        };
    }

    function formatOutputRates(rates) {
        return rates
            .map(function (rate, index) {
                return CLASS_NAMES[index] + "=" + rate.toFixed(2);
            })
            .join(", ");
    }

    function logSnnDiagnostics(prefix, metrics) {
        log(
            prefix +
                " - Training objective loss: " +
                metrics.validationLoss.toFixed(6) +
                " - Runtime hard margin: " +
                signed(metrics.meanRuntimeMargin, 4)
        );
        log(
            prefix +
                " activity - Hidden firing: " +
                metrics.hiddenFiringRateMeanHz.toFixed(2) +
                " +/- " +
                metrics.hiddenFiringRateStdHz.toFixed(2) +
                " Hz - Output firing: [" +
                formatOutputRates(metrics.outputFiringRatesHz) +
                "] Hz"
        );
        if (metrics.specialistFiringRateMeanHz !== null) {
            log(
                prefix +
                    " specialist activity - Firing: " +
                    metrics.specialistFiringRateMeanHz.toFixed(2) +
                    " +/- " +
                    metrics.specialistFiringRateStdHz.toFixed(2) +
                    " Hz"
            );
        }
    }

    function signed(value, digits) {
        return (value >= 0 ? "+" : "") + value.toFixed(digits);
    }

    function buildSnnFromMetadata(modelMetadata, learningRate) {
        if (!modelMetadata.snn || !modelMetadata.snn.sensorConfig || !Array.isArray(modelMetadata.snn.sensorConfig.bands)) {
            throw new Error("SNN checkpoint is missing its wave sensor metadata.");
        }
        return MotorCurrentSnn.buildModel({
            hiddenSize: modelMetadata.hiddenSize,
            outputSize: modelMetadata.outputSize,
            windowSize: modelMetadata.windowSize,
            sensorConfig: modelMetadata.snn.sensorConfig,
            sensorEncoding: modelMetadata.snn.sensorEncoding,
            topology: modelMetadata.snn.topology,
            recurrentCore: modelMetadata.snn.recurrentCore,
            specialistBranch: modelMetadata.snn.specialistBranch,
            pairAuxiliaryLoss: modelMetadata.snn.trainingObjective && modelMetadata.snn.trainingObjective.pairAuxiliaryLoss,
            scopedPairAuxiliary: modelMetadata.snn.trainingObjective && modelMetadata.snn.trainingObjective.scopedPairAuxiliary,
            runtimeDecoderObjective: modelMetadata.snn.trainingObjective && modelMetadata.snn.trainingObjective.runtimeDecoderObjective,
            seed: modelMetadata.snn.seed,
            learningRate: learningRate,
        });
    }

    function createCompiledSnnFromCheckpoint(checkpoint) {
        const model = buildSnnFromMetadata(checkpoint.model, 0.001);
        if (!checkpointTopologyMatches(model.graph, checkpoint)) {
            throw new Error("SNN checkpoint topology does not match its model metadata.");
        }
        spRestoreWeights(model.graph, checkpoint.snapshot);
        MotorCurrentSnn.compileModel(model);
        return model;
    }

    function architectureDescriptor(model) {
        const descriptor = {
            architectureVersion: model.architectureVersion,
            cellType: model.cellType,
            inputSize: model.inputSize,
            hiddenSize: model.hiddenSize,
            outputSize: model.outputSize,
            windowSize: model.windowSize,
        };
        if (model.cellType === "snn") {
            descriptor.snn = {
                encoder: model.snn && model.snn.encoder,
                sensorEncoding: model.snn && model.snn.sensorEncoding,
                topology: model.snn && model.snn.topology,
                recurrentCore: model.snn && model.snn.recurrentCore,
                temporalPolicy: model.snn && model.snn.temporalPolicy,
                sensorPhenotypeVersion: model.snn && model.snn.sensorPhenotypeVersion,
                sensorConfig: model.snn && model.snn.sensorConfig,
                frameEndSlot: model.snn && model.snn.frameEndSlot,
            };
            if (model.snn && model.snn.frequencySelectionStrategy === MotorCurrentSnn.FREQUENCY_SELECTION_TARGETED_PAIR) {
                descriptor.snn.frequencySelectionStrategy = model.snn.frequencySelectionStrategy;
                descriptor.snn.frequencySelectionTargetLabels = model.snn.frequencySelectionTargetLabels;
            }
            if (model.snn && model.snn.frequencySelectionMode) descriptor.snn.frequencySelectionMode = model.snn.frequencySelectionMode;
            if (model.snn && model.snn.sensorTraining) descriptor.snn.sensorTraining = model.snn.sensorTraining;
            if (model.snn && model.snn.specialistBranch) descriptor.snn.specialistBranch = model.snn.specialistBranch;
            if (model.snn && model.snn.trainingObjective) descriptor.snn.trainingObjective = model.snn.trainingObjective;
        }
        return descriptor;
    }

    function stableStringify(value) {
        if (value === null || typeof value !== "object") return JSON.stringify(value === undefined ? null : value);
        if (Array.isArray(value)) {
            return "[" + value.map(stableStringify).join(",") + "]";
        }
        return (
            "{" +
            Object.keys(value)
                .sort()
                .map(function (key) {
                    return JSON.stringify(key) + ":" + stableStringify(value[key]);
                })
                .join(",") +
            "}"
        );
    }

    function architectureSignature(model) {
        return hashText(stableStringify(architectureDescriptor(model)))
            .toString(16)
            .padStart(8, "0");
    }

    function stampArchitecture(model) {
        model.architectureSignature = architectureSignature(model);
        return model.architectureSignature;
    }

    function checkpointHasValidArchitecture(checkpoint) {
        return (
            checkpoint &&
            checkpoint.model &&
            (checkpoint.model.cellType !== "snn" || checkpoint.model.architectureVersion === SNN_ARCHITECTURE_VERSION) &&
            typeof checkpoint.model.architectureSignature === "string" &&
            checkpoint.model.architectureSignature === architectureSignature(checkpoint.model)
        );
    }

    function checkpointStorageKey(model) {
        const signature = architectureSignature(model);
        return CHECKPOINT_PREFIX + [model.datasetFingerprint, signature].join(".");
    }

    function checkpointTopologyMatches(graph, checkpoint) {
        return (
            checkpoint &&
            checkpoint.snapshot &&
            Array.isArray(checkpoint.snapshot.syn) &&
            Array.isArray(checkpoint.snapshot.neu) &&
            checkpoint.snapshot.syn.length === graph.links.length &&
            checkpoint.snapshot.neu.length === graph.nodes.length
        );
    }

    function readCheckpoint(key) {
        if (!key) return null;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const checkpoint = JSON.parse(raw);
            if (!checkpoint || checkpoint.schemaVersion !== CHECKPOINT_SCHEMA_VERSION || !checkpointHasValidArchitecture(checkpoint)) return null;
            return checkpoint;
        } catch (e) {
            return null;
        }
    }

    function readLatestCheckpoint() {
        try {
            return readCheckpoint(localStorage.getItem(CHECKPOINT_LATEST_KEY));
        } catch (e) {
            return null;
        }
    }

    function persistCheckpoint(checkpoint) {
        try {
            stampArchitecture(checkpoint.model);
            const key = checkpointStorageKey(checkpoint.model);
            localStorage.setItem(key, JSON.stringify(checkpoint));
            localStorage.setItem(CHECKPOINT_LATEST_KEY, key);
            return { ok: true, key: key };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    function removePersistedCheckpoint(checkpoint) {
        if (!checkpoint || !checkpoint.model) return false;
        try {
            const key = checkpointStorageKey(checkpoint.model);
            localStorage.removeItem(key);
            if (localStorage.getItem(CHECKPOINT_LATEST_KEY) === key) {
                localStorage.removeItem(CHECKPOINT_LATEST_KEY);
            }
            return true;
        } catch (e) {
            log("ERROR resetting checkpoint: " + e.message);
            return false;
        }
    }

    function buildGraph(cellType, hiddenSize, outputSize) {
        return new S.RnnBuilder()
            .withInputSize(3)
            .withHiddenSize(hiddenSize)
            .withOutputSize(outputSize)
            .withCellType(cellType === "lstm" ? S.RnnCellType.LSTM : S.RnnCellType.GRU)
            .withOutputActivation(S.ActivationFunctions.sigmoid)
            .build();
    }

    function restoreCheckpoint(checkpoint, announce) {
        if (!checkpoint || checkpoint.schemaVersion !== CHECKPOINT_SCHEMA_VERSION || !checkpoint.model || !checkpoint.snapshot || !Array.isArray(checkpoint.classes)) {
            throw new Error("Invalid checkpoint payload.");
        }
        if (!checkpointHasValidArchitecture(checkpoint)) {
            throw new Error("Checkpoint architecture signature is missing or does not match its model.");
        }

        const model = checkpoint.model;
        if (model.cellType === "snn") {
            snnModel = null;
            snnInference = createCompiledSnnFromCheckpoint(checkpoint);
            snnSensorConfig = model.snn.sensorConfig;
            rnnGraph = snnInference.graph;
            runtime = snnInference;
            trainer = null;
        } else {
            const graph = buildGraph(model.cellType, model.hiddenSize, model.outputSize);
            if (!checkpointTopologyMatches(graph, checkpoint)) {
                throw new Error("Checkpoint topology does not match its model metadata.");
            }
            spRestoreWeights(graph, checkpoint.snapshot);
            rnnGraph = graph;
            runtime = new S.RnnInferenceRuntime(rnnGraph);
            trainer = null;
            snnModel = null;
            snnInference = null;
            snnSensorConfig = null;
        }
        activeCheckpoint = checkpoint;
        showConversionProfile(model.cellType === "snn" ? checkpoint.forwardIdentityProfile : null);
        CLASS_NAMES = checkpoint.classes.slice();
        NUM_CLASSES = CLASS_NAMES.length;

        document.getElementById("cellType").value = model.cellType;
        document.getElementById("hiddenSize").value = String(model.hiddenSize);
        if (snnSensorEncodingSelect) {
            snnSensorEncodingSelect.value = model.cellType === "snn" && model.snn.sensorEncoding ? model.snn.sensorEncoding : MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL;
            snnSensorEncodingSelect.disabled = model.cellType !== "snn";
        }
        if (snnBandSelectionSelect) {
            snnBandSelectionSelect.value =
                model.cellType === "snn" && model.snn.frequencySelectionMode === "multiclass-spike-receptive-fields"
                    ? "multiclass-spike-receptive-fields"
                    : model.cellType === "snn" && model.snn.frequencySelectionMode === "multiclass-receptive-fields"
                    ? "multiclass-receptive-fields"
                    : model.cellType === "snn" && model.snn.frequencySelectionMode === "healthy-brb1-specialist-scoped"
                    ? "healthy-brb1-specialist-scoped"
                    : model.cellType === "snn" && model.snn.frequencySelectionMode === "healthy-brb1-specialist-aux"
                    ? "healthy-brb1-specialist-aux"
                    : model.cellType === "snn" && model.snn.frequencySelectionMode === "healthy-brb1-specialist"
                    ? "healthy-brb1-specialist"
                    : model.cellType === "snn" && model.snn.frequencySelectionMode === "healthy-brb1-extra"
                      ? "healthy-brb1-extra"
                    : model.cellType === "snn" && model.snn.frequencySelectionStrategy === MotorCurrentSnn.FREQUENCY_SELECTION_TARGETED_PAIR
                      ? "healthy-brb1"
                      : "multiclass";
            snnBandSelectionSelect.disabled = model.cellType !== "snn";
        }
        if (snnTopologySelect) {
            snnTopologySelect.value = model.cellType === "snn" && model.snn.topology ? model.snn.topology : MotorCurrentSnn.TOPOLOGY_PHASE_FUSION;
            snnTopologySelect.disabled = model.cellType !== "snn";
        }
        if (snnTrainingObjectiveSelect) {
            snnTrainingObjectiveSelect.value =
                model.cellType === "snn" && model.snn.trainingObjective && model.snn.trainingObjective.runtimeDecoderObjective
                    ? SNN_OBJECTIVE_RUNTIME_DECODER
                    : SNN_OBJECTIVE_TEMPORAL_MSE;
            snnTrainingObjectiveSelect.disabled = model.cellType !== "snn";
        }
        if (checkpoint.dataset && checkpoint.dataset.selection) {
            datasetSplitSelect.value = checkpoint.dataset.selection;
            updateSampleCountControl("selection");
        }

        const bestPct = (checkpoint.metric.validationAccuracy * 100).toFixed(1);
        const bestValidationEl = document.getElementById("bestValidation");
        const bestEpochEl = document.getElementById("bestEpoch");
        const finalLossEl = document.getElementById("finalLoss");
        if (bestValidationEl) bestValidationEl.textContent = bestPct + "%";
        if (bestEpochEl) bestEpochEl.textContent = checkpoint.metric.epoch;
        if (finalLossEl) finalLossEl.textContent = checkpoint.metric.trainLoss.toFixed(4);

        btnRestoreCheckpoint.disabled = false;
        if (btnResetCheckpoint) btnResetCheckpoint.disabled = false;
        btnDownloadCheckpoint.disabled = false;
        btnExport.disabled = model.cellType === "snn";
        btnTest.disabled = !(testData && loadedDatasetFingerprint === model.datasetFingerprint);
        if (btnProfileConversion) {
            btnProfileConversion.disabled = !(model.cellType === "snn" && trainData && loadedDatasetFingerprint === model.datasetFingerprint);
        }

        if (announce !== false) {
            log(
                "Restored persistent best checkpoint: epoch " +
                    checkpoint.metric.epoch +
                    ", validation " +
                    bestPct +
                    "% (" +
                    checkpoint.metric.validationCorrect +
                    "/" +
                    checkpoint.metric.validationTotal +
                    ")."
            );
            setStatus(
                model.cellType === "snn" ? "Best SNN checkpoint restored. Load matching data to test." : "Best checkpoint restored. Export is ready; load matching data to test."
            );
        }
        return checkpoint;
    }

    function createAccuracyCheckpointer(graph, metadata) {
        stampArchitecture(metadata.model);
        const storageKey = checkpointStorageKey(metadata.model);
        const saved = readCheckpoint(storageKey);
        let bestCheckpoint = checkpointHasValidArchitecture(saved) && checkpointTopologyMatches(graph, saved) ? saved : null;
        let bestAccuracy = bestCheckpoint ? bestCheckpoint.metric.validationAccuracy : -1;
        let bestLoss = bestCheckpoint ? bestCheckpoint.metric.trainLoss : Infinity;

        return {
            update: function (epoch, trainLoss, validation) {
                const improved = validation.accuracy > bestAccuracy + 1e-12 || (Math.abs(validation.accuracy - bestAccuracy) <= 1e-12 && trainLoss < bestLoss);
                if (!improved) return { improved: false, checkpoint: bestCheckpoint };

                const snapshot = spSnapshotWeights(graph);
                bestAccuracy = validation.accuracy;
                bestLoss = trainLoss;
                bestCheckpoint = {
                    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
                    savedAt: new Date().toISOString(),
                    model: metadata.model,
                    dataset: metadata.dataset,
                    validationProtocol: metadata.validationProtocol,
                    classes: metadata.classes.slice(),
                    metric: {
                        epoch: epoch + 1,
                        validationAccuracy: validation.accuracy,
                        validationCorrect: validation.correct,
                        validationTotal: validation.total,
                        trainLoss: trainLoss,
                        validationLoss: validation.validationLoss,
                        meanCorrectClassScore: validation.meanCorrectClassScore,
                        meanClassificationMargin: validation.meanClassificationMargin,
                        meanRuntimeMargin: validation.meanRuntimeMargin,
                        hiddenFiringRateMeanHz: validation.hiddenFiringRateMeanHz,
                        hiddenFiringRateStdHz: validation.hiddenFiringRateStdHz,
                        outputFiringRatesHz: validation.outputFiringRatesHz.slice(),
                        validationConfusionMatrix: validation.confusionMatrix
                            ? validation.confusionMatrix.map(function (row) {
                                  return row.slice();
                              })
                            : undefined,
                    },
                    snapshot: { syn: snapshot.syn, neu: snapshot.neu },
                };

                const persisted = persistCheckpoint(bestCheckpoint);
                activeCheckpoint = bestCheckpoint;
                btnRestoreCheckpoint.disabled = false;
                if (btnResetCheckpoint) btnResetCheckpoint.disabled = false;
                btnDownloadCheckpoint.disabled = false;
                return { improved: true, persisted: persisted, checkpoint: bestCheckpoint };
            },
            restore: function () {
                if (bestCheckpoint) spRestoreWeights(graph, bestCheckpoint.snapshot);
                activeCheckpoint = bestCheckpoint;
                return bestCheckpoint;
            },
            hasSavedBaseline: function () {
                return bestCheckpoint !== null;
            },
            savedBaseline: function () {
                return bestCheckpoint;
            },
        };
    }

    if (btnRestoreCheckpoint) {
        btnRestoreCheckpoint.addEventListener("click", function () {
            const checkpoint = activeCheckpoint || readLatestCheckpoint();
            if (!checkpoint) {
                log("No persistent checkpoint is available.");
                return;
            }
            try {
                restoreCheckpoint(checkpoint, true);
            } catch (e) {
                log("ERROR restoring checkpoint: " + e.message);
            }
        });
    }

    if (btnResetCheckpoint) {
        btnResetCheckpoint.addEventListener("click", function () {
            const checkpoint = activeCheckpoint || readLatestCheckpoint();
            if (!checkpoint) {
                log("No persistent checkpoint is available to reset.");
                return;
            }
            if (!removePersistedCheckpoint(checkpoint)) return;

            activeCheckpoint = null;
            lastTestAccuracy = null;
            btnRestoreCheckpoint.disabled = true;
            btnResetCheckpoint.disabled = true;
            btnDownloadCheckpoint.disabled = true;
            if (btnProfileConversion) btnProfileConversion.disabled = true;
            showConversionProfile(null);
            document.getElementById("bestValidation").textContent = "-";
            document.getElementById("bestEpoch").textContent = "-";
            document.getElementById("finalLoss").textContent = "-";
            log("Reset saved checkpoint for architecture " + checkpoint.model.architectureSignature + ".");
            setStatus("Saved baseline reset. The next training epoch can become the new best.");
        });
    }

    if (btnDownloadCheckpoint) {
        btnDownloadCheckpoint.addEventListener("click", function () {
            if (!activeCheckpoint) {
                log("No best checkpoint is available to download.");
                return;
            }
            const metric = (activeCheckpoint.metric.validationAccuracy * 100).toFixed(1).replace(".", "p");
            const filename =
                "motor_current_" +
                activeCheckpoint.model.cellType +
                "_h" +
                activeCheckpoint.model.hiddenSize +
                "_" +
                activeCheckpoint.model.architectureSignature +
                "_best_val_" +
                metric +
                ".json";
            downloadBlob(new Blob([JSON.stringify(activeCheckpoint, null, 2)], { type: "application/json" }), filename);
            log("Downloaded checkpoint: " + filename);
        });
    }

    if (btnImportCheckpoint && checkpointFileInput) {
        btnImportCheckpoint.addEventListener("click", function () {
            checkpointFileInput.click();
        });
        checkpointFileInput.addEventListener("change", async function () {
            const file = checkpointFileInput.files && checkpointFileInput.files[0];
            if (!file) return;
            try {
                const checkpoint = JSON.parse(await file.text());
                restoreCheckpoint(checkpoint, true);
                const persisted = persistCheckpoint(checkpoint);
                if (!persisted.ok) {
                    log("WARNING: imported weights are in memory but local persistence failed: " + persisted.error);
                } else {
                    log("Imported checkpoint saved in browser storage.");
                }
            } catch (e) {
                log("ERROR importing checkpoint: " + e.message);
            } finally {
                checkpointFileInput.value = "";
            }
        });
    }

    if (btnProfileConversion) {
        btnProfileConversion.addEventListener("click", async function () {
            const checkpoint = activeCheckpoint || readLatestCheckpoint();
            if (!checkpoint || !checkpoint.model || checkpoint.model.cellType !== "snn") {
                log("Aucun checkpoint SNN n'est disponible pour le profilage.");
                return;
            }
            if (!trainData || checkpoint.model.datasetFingerprint !== loadedDatasetFingerprint) {
                log("Le profiler exige les données d'apprentissage correspondant exactement au checkpoint.");
                return;
            }
            btnProfileConversion.disabled = true;
            btnTrain.disabled = true;
            btnTest.disabled = true;
            btnLoad.disabled = true;
            try {
                const split = splitTrainingValidation(trainData);
                const teacher = buildSnnFromMetadata(checkpoint.model, 0.001);
                if (!checkpointTopologyMatches(teacher.graph, checkpoint)) {
                    throw new Error("La topologie du checkpoint ne correspond pas au graphe de profilage.");
                }
                spRestoreWeights(teacher.graph, checkpoint.snapshot);
                const compiled = createCompiledSnnFromCheckpoint(checkpoint);
                setStatus("Vérification du forward hard...");
                const startedAt = performance.now();
                const profile = await evaluateSnnForwardIdentity(teacher, compiled, split.validation);
                profile.evaluatedAt = new Date().toISOString();
                profile.validationProtocol = split.protocol + "-hard-forward-native-identity-v1";
                profile.elapsedMilliseconds = performance.now() - startedAt;
                activeCheckpoint = checkpoint;
                activeCheckpoint.forwardIdentityProfile = profile;
                delete activeCheckpoint.conversionProfile;
                showConversionProfile(profile);
                const persisted = persistCheckpoint(activeCheckpoint);
                logSnnForwardIdentity(profile);
                log("Temps de vérification: " + profile.elapsedMilliseconds.toFixed(0) + "ms.");
                if (!persisted.ok) log("ATTENTION: le profil est en mémoire mais sa persistance a échoué: " + persisted.error);
                setProgress(100);
                setStatus("Vérification du forward hard terminée.");
            } catch (e) {
                log("ERREUR pendant la vérification du forward hard: " + e.message);
                setStatus("Échec de la vérification du forward hard.");
            } finally {
                btnProfileConversion.disabled = false;
                btnTrain.disabled = false;
                btnTest.disabled = !(testData && checkpoint.model.datasetFingerprint === loadedDatasetFingerprint);
                btnLoad.disabled = false;
            }
        });
    }

    async function fetchDataset(filename) {
        const url = new URL("../../data/motor_current/" + filename, window.location.href);
        const response = await fetch(url.href, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(filename + " returned HTTP " + response.status);
        }
        const payload = await response.json();
        if (!payload || !Array.isArray(payload.samples) || !Array.isArray(payload.classes)) {
            throw new Error(filename + " has an invalid dataset schema");
        }
        return payload;
    }

    // ====================== SYNTHETIC DATA GENERATOR ======================
    //
    // Used when real UFU data is unavailable. Generates 4 classes of 3-phase
    // sinusoidal currents at 60 Hz, with fault signatures matching the
    // synthetic fallback in prepare_motor_current.py:
    //   0 Normal        - balanced 3-phase sinusoid
    //   1 OpenPhase     - phase A collapses to 0
    //   2 ShortCircuit  - phase A amplitude elevated + 3rd harmonic
    //   3 Unbalanced    - asymmetric amplitudes across phases

    function gaussianNoise(sigma) {
        const u = 1 - Math.random();
        const v = 1 - Math.random();
        return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function clamp(x, lo, hi) {
        return Math.max(lo, Math.min(hi, x));
    }

    function generateCurrentSample(faultType, windowSize) {
        const sequence = [];
        const baseFreq = 60; // Hz (line frequency)
        const dt = 1 / 1000; // 1 kHz effective sample rate
        const phaseNoise = (Math.random() - 0.5) * 0.2;

        for (let t = 0; t < windowSize; t++) {
            const angle = 2 * Math.PI * baseFreq * t * dt + phaseNoise;
            let ia, ib, ic, n;

            switch (faultType) {
                case 0: // Normal: balanced 3-phase
                    ia = Math.sin(angle);
                    ib = Math.sin(angle - (2 * Math.PI) / 3);
                    ic = Math.sin(angle + (2 * Math.PI) / 3);
                    n = 0.02;
                    break;
                case 1: // Open phase A
                    ia = 0;
                    ib = 1.15 * Math.sin(angle - (2 * Math.PI) / 3);
                    ic = 1.15 * Math.sin(angle + (2 * Math.PI) / 3);
                    n = 0.03;
                    break;
                case 2: // Short circuit on A: elevated + harmonic
                    ia = 1.6 * Math.sin(angle) + 0.35 * Math.sin(3 * angle);
                    ib = Math.sin(angle - (2 * Math.PI) / 3) + 0.1 * Math.sin(3 * angle);
                    ic = Math.sin(angle + (2 * Math.PI) / 3) + 0.1 * Math.sin(3 * angle);
                    n = 0.05;
                    break;
                case 3: // Unbalanced amplitudes + small phase drift
                default:
                    ia = 1.2 * Math.sin(angle);
                    ib = 0.8 * Math.sin(angle - (2 * Math.PI) / 3 + 0.15);
                    ic = 1.0 * Math.sin(angle + (2 * Math.PI) / 3 - 0.1);
                    n = 0.04;
                    break;
            }

            ia += gaussianNoise(n);
            ib += gaussianNoise(n);
            ic += gaussianNoise(n);

            // Map roughly [-2, 2] A to [0, 1]
            ia = clamp((ia + 2.0) / 4.0, 0, 1);
            ib = clamp((ib + 2.0) / 4.0, 0, 1);
            ic = clamp((ic + 2.0) / 4.0, 0, 1);

            sequence.push([ia, ib, ic]);
        }

        return { sequence: sequence, label: faultType };
    }

    function generateSyntheticData(numSamples, windowSize) {
        const all = [];
        for (let i = 0; i < numSamples; i++) {
            // Cycle through the 4 synthetic classes
            const faultType = i % 4;
            all.push(generateCurrentSample(faultType, windowSize));
        }

        // Fisher-Yates shuffle
        for (let i = all.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = all[i];
            all[i] = all[j];
            all[j] = tmp;
        }

        // 80/20 split
        const splitIdx = Math.floor(numSamples * 0.8);
        return {
            train: all.slice(0, splitIdx),
            test: all.slice(splitIdx),
        };
    }

    // ====================== VISUALIZATION ======================

    function drawLossChart() {
        const canvas = lossCanvas;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const W = rect.width,
            H = rect.height;

        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, W, H);

        if (lossHistory.length < 2) return;

        const maxLoss = Math.max(...lossHistory);
        const minLoss = Math.min(...lossHistory);
        const range = maxLoss - minLoss || 1;

        ctx.strokeStyle = "#1a2a3a";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 5; i++) {
            const y = 10 + (i * (H - 20)) / 4;
            ctx.beginPath();
            ctx.moveTo(10, y);
            ctx.lineTo(W - 10, y);
            ctx.stroke();
        }

        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < lossHistory.length; i++) {
            const x = (i / (lossHistory.length - 1)) * (W - 20) + 10;
            const y = H - 10 - ((lossHistory[i] - minLoss) / range) * (H - 20);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = "#888";
        ctx.font = "10px sans-serif";
        ctx.fillText(maxLoss.toFixed(4), 2, 12);
        ctx.fillText(minLoss.toFixed(4), 2, H - 2);
        ctx.fillText("Epoch 1", 10, H - 2);
        ctx.fillText("Epoch " + lossHistory.length, W - 50, H - 2);
    }

    function drawSignal(sample) {
        const canvas = signalCanvas;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const W = rect.width,
            H = rect.height;

        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, W, H);

        const seq = sample.sequence;
        const T = seq.length;
        const padL = 40,
            padR = 10,
            padT = 10,
            padB = 25;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;

        ctx.strokeStyle = "#1a2a3a";
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = padT + (i * plotH) / 4;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(W - padR, y);
            ctx.stroke();
        }

        ctx.fillStyle = "#888";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        for (let i = 0; i <= 4; i++) {
            const val = (1 - i / 4).toFixed(2);
            const y = padT + (i * plotH) / 4 + 3;
            ctx.fillText(val, padL - 4, y);
        }

        // Draw each phase
        for (let ch = 0; ch < 3; ch++) {
            ctx.strokeStyle = PHASE_COLORS[ch];
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let t = 0; t < T; t++) {
                const x = padL + (t / (T - 1)) * plotW;
                const y = padT + (1 - seq[t][ch]) * plotH;
                if (t === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Legend
        ctx.textAlign = "left";
        for (let ch = 0; ch < 3; ch++) {
            const lx = padL + ch * 60;
            ctx.fillStyle = PHASE_COLORS[ch];
            ctx.fillRect(lx, H - 15, 12, 3);
            ctx.fillStyle = "#aaa";
            ctx.font = "10px sans-serif";
            ctx.fillText(PHASE_NAMES[ch], lx + 16, H - 10);
        }

        // Title
        ctx.fillStyle = "#888";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Rotor state: " + CLASS_NAMES[sample.label] + " (" + T + " timesteps)", W / 2, H - 2);
    }

    function drawConfusionMatrix(matrix) {
        confusionDiv.innerHTML = "";

        const table = document.createElement("table");
        table.className = "confusion-table";

        let maxVal = 1;
        for (let r = 0; r < NUM_CLASSES; r++) {
            for (let c = 0; c < NUM_CLASSES; c++) {
                if (matrix[r][c] > maxVal) maxVal = matrix[r][c];
            }
        }

        const headerRow = document.createElement("tr");
        const emptyTh = document.createElement("th");
        emptyTh.textContent = "Actual \\ Pred";
        headerRow.appendChild(emptyTh);
        for (let c = 0; c < NUM_CLASSES; c++) {
            const th = document.createElement("th");
            th.textContent = CLASS_NAMES[c];
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);

        for (let r = 0; r < NUM_CLASSES; r++) {
            const tr = document.createElement("tr");
            const labelTd = document.createElement("td");
            labelTd.textContent = CLASS_NAMES[r];
            labelTd.className = "row-label";
            tr.appendChild(labelTd);
            for (let c = 0; c < NUM_CLASSES; c++) {
                const td = document.createElement("td");
                td.textContent = matrix[r][c];
                const intensity = matrix[r][c] / maxVal;
                if (r === c) {
                    td.style.background = "rgba(0, 255, 100, " + (0.1 + intensity * 0.5) + ")";
                    td.style.color = "#fff";
                } else if (matrix[r][c] > 0) {
                    td.style.background = "rgba(255, 50, 50, " + (0.1 + intensity * 0.5) + ")";
                    td.style.color = "#fff";
                } else {
                    td.style.background = "rgba(255, 255, 255, 0.03)";
                    td.style.color = "#666";
                }
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }

        confusionDiv.appendChild(table);
    }

    // ====================== DATA LOADING ======================

    btnLoad.addEventListener("click", async function () {
        btnLoad.disabled = true;
        setStatus("Loading data...");
        log("Loading 3-phase current data...");

        const numSamples = parseInt(numSamplesInput.value);
        const windowSize = parseInt(document.getElementById("windowSize").value);
        const splitProtocol = datasetSplitSelect ? datasetSplitSelect.value : "legacy";
        const groupedSplit = splitProtocol === "grouped";
        const trainFile = groupedSplit ? "train_grouped.json" : "train.json";
        const testFile = groupedSplit ? "test_grouped.json" : "test.json";

        let dataLoaded = false;

        // Prefer real data generated by prepare_motor_current.py
        try {
            const datasets = await Promise.all([fetchDataset(trainFile), fetchDataset(testFile)]);
            const trainJson = datasets[0];
            const testJson = datasets[1];
            if (groupedSplit && trainJson.splitProtocol !== GROUPED_DATASET_PROTOCOL) {
                throw new Error(trainFile + " is not an acquisition-grouped dataset");
            }

            trainData = trainJson.samples.map(function (s) {
                return {
                    sequence: s.sequence,
                    label: s.label,
                    sourceGroup: s.sourceGroup,
                    sourceLoad: s.sourceLoad,
                    windowStart: s.windowStart,
                };
            });
            testData = testJson.samples.map(function (s) {
                return {
                    sequence: s.sequence,
                    label: s.label,
                    sourceGroup: s.sourceGroup,
                    sourceLoad: s.sourceLoad,
                    windowStart: s.windowStart,
                };
            });

            CLASS_NAMES = trainJson.classes;
            NUM_CLASSES = CLASS_NAMES.length;
            loadedSplitProtocol = trainJson.splitProtocol || "legacy-window-random";
            loadedSampleRateHz = Number.isFinite(trainJson.sampleRateHz) ? trainJson.sampleRateHz : CLASS_NAMES[0] === "Healthy" ? 120.110151 : 1000;
            loadedSignalDomain =
                trainJson.signalDomain || (trainJson.preprocessing && trainJson.preprocessing.envelope ? "envelope" : CLASS_NAMES[0] === "Healthy" ? "envelope" : "raw-current");
            loadedLineFrequencyHz = Number.isFinite(trainJson.lineFrequencyHz) ? trainJson.lineFrequencyHz : 60;
            const loadedWindowSize = Number.isInteger(trainJson.windowSize) ? trainJson.windowSize : trainData[0].sequence.length;
            document.getElementById("windowSize").value = String(loadedWindowSize);
            log("Loaded real data: " + trainData.length + " train, " + testData.length + " test samples");
            log("Classes: " + CLASS_NAMES.join(", "));
            log("Split protocol: " + loadedSplitProtocol);
            log("Signal domain: " + loadedSignalDomain + " at " + loadedSampleRateHz.toFixed(3) + " Hz");
            log("Observation window: " + loadedWindowSize + " samples = " + (loadedWindowSize / loadedSampleRateHz).toFixed(3) + " s");
            updateSampleCountControl("real", trainData.length, testData.length);
            dataLoaded = true;
        } catch (e) {
            if (groupedSplit) {
                log("ERROR loading grouped dataset: " + e.message);
                log("Generate it with prepare_motor_current.py --split-protocol grouped.");
                setStatus("Grouped dataset is not available.");
                btnLoad.disabled = false;
                return;
            }
            // Legacy mode can fall through to synthetic data.
        }

        if (!dataLoaded && groupedSplit) {
            log("Grouped dataset files are missing.");
            log("Generate them with prepare_motor_current.py --split-protocol grouped.");
            setStatus("Grouped dataset is not available.");
            btnLoad.disabled = false;
            return;
        }

        if (!dataLoaded) {
            log("Real data not available. Generating synthetic 3-phase current data...");
            const data = generateSyntheticData(numSamples, windowSize);
            trainData = data.train;
            testData = data.test;
            // Synthetic fallback always uses the 4-class electrical fault set
            CLASS_NAMES = ["Normal", "OpenPhase", "ShortCircuit", "Unbalanced"];
            NUM_CLASSES = CLASS_NAMES.length;
            loadedSplitProtocol = "synthetic-random-v1";
            loadedSampleRateHz = 1000;
            loadedSignalDomain = "raw-current";
            loadedLineFrequencyHz = 60;
            updateSampleCountControl("synthetic");
            log("Generated synthetic data: " + trainData.length + " train, " + testData.length + " test samples");
            log("Window size: " + windowSize + " timesteps x 3 channels (Ia, Ib, Ic)");
            log("Classes: " + CLASS_NAMES.join(", "));
        }

        loadedDatasetFingerprint = fingerprintDataset(trainData, loadedSplitProtocol);
        log("Dataset fingerprint: " + loadedDatasetFingerprint);

        if (activeCheckpoint) {
            const compatible = activeCheckpoint.model.datasetFingerprint === loadedDatasetFingerprint && activeCheckpoint.model.outputSize === NUM_CLASSES;
            btnTest.disabled = !compatible;
            if (btnProfileConversion) btnProfileConversion.disabled = !(compatible && activeCheckpoint.model.cellType === "snn");
            if (!compatible) {
                log("Saved checkpoint does not match this dataset. Train a model for the selected split.");
            }
        }

        if (trainData.length > 0) {
            drawSignal(trainData[0]);
        }

        setStatus("Data ready. Click Train.");
        setProgress(0);
        btnLoad.disabled = false;
        btnTrain.disabled = false;
    });

    // ====================== TRAINING ======================

    async function trainSnn(hiddenSize, epochs, learningRate) {
        const split = splitTrainingValidation(trainData);
        const trainingSamples = split.train;
        const validationSamples = split.validation;
        if (trainingSamples.length === 0 || validationSamples.length === 0) {
            throw new Error("Unable to create a non-empty SNN training/validation split.");
        }

        const requestedSensorEncoding = snnSensorEncodingSelect ? snnSensorEncodingSelect.value : MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL;
        const requestedTopology = snnTopologySelect ? snnTopologySelect.value : MotorCurrentSnn.TOPOLOGY_PHASE_FUSION;
        const requestedTrainingObjective = snnTrainingObjectiveSelect ? snnTrainingObjectiveSelect.value : SNN_OBJECTIVE_RUNTIME_DECODER;
        const runtimeDecoderObjective =
            requestedTrainingObjective === SNN_OBJECTIVE_RUNTIME_DECODER
                ? {
                      version: MotorCurrentSnn.RUNTIME_DECODER_OBJECTIVE_VERSION,
                      spikeCountScale: 2,
                      membranePotentialScale: 1,
                      temperature: 2,
                      classificationLossWeight: 1,
                      temporalLossWeight: 0.25,
                  }
                : null;
        const frequencySelectionMode = snnBandSelectionSelect ? snnBandSelectionSelect.value : "multiclass";
        const hasContinuousReceptiveFields = frequencySelectionMode === "multiclass-receptive-fields";
        const hasSpikeAlignedReceptiveFields = frequencySelectionMode === "multiclass-spike-receptive-fields";
        const hasTrainableReceptiveFields = hasContinuousReceptiveFields || hasSpikeAlignedReceptiveFields;
        const hasPairAuxiliaryLoss = frequencySelectionMode === "healthy-brb1-specialist-aux";
        const hasScopedPairAuxiliary = frequencySelectionMode === "healthy-brb1-specialist-scoped";
        const hasSpecialistBranch = frequencySelectionMode === "healthy-brb1-specialist" || hasPairAuxiliaryLoss || hasScopedPairAuxiliary;
        const sensorEncoding = hasSpecialistBranch || hasTrainableReceptiveFields ? MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL : requestedSensorEncoding;
        const snnTopology = hasSpecialistBranch || hasTrainableReceptiveFields ? MotorCurrentSnn.TOPOLOGY_DENSE : requestedTopology;
        if (hasSpecialistBranch || hasTrainableReceptiveFields) {
            if (snnSensorEncodingSelect) snnSensorEncodingSelect.value = sensorEncoding;
            if (snnTopologySelect) snnTopologySelect.value = snnTopology;
        }
        const frequencySelectionStrategy =
            frequencySelectionMode === "healthy-brb1" || frequencySelectionMode === "healthy-brb1-extra" || hasSpecialistBranch
                ? MotorCurrentSnn.FREQUENCY_SELECTION_TARGETED_PAIR
                : MotorCurrentSnn.FREQUENCY_SELECTION_MULTICLASS;
        const frequencyBandCount = frequencySelectionMode === "healthy-brb1-extra" ? 4 : 3;
        const healthyLabel = CLASS_NAMES.indexOf("Healthy");
        const brb1Label = CLASS_NAMES.indexOf("BRB1");
        if (frequencySelectionStrategy === MotorCurrentSnn.FREQUENCY_SELECTION_TARGETED_PAIR && (healthyLabel < 0 || brb1Label < 0)) {
            throw new Error("Healthy/BRB1 band selection requires the UFU five-class dataset.");
        }
        let selectedFrequencyBands;
        let globalFrequencyBands = null;
        let specialistFrequencyBands = null;
        let receptiveFieldTraining = null;
        if (hasSpecialistBranch) {
            globalFrequencyBands = MotorCurrentSnn.selectFrequencyBands(trainingSamples, loadedSampleRateHz, {
                signalDomain: loadedSignalDomain,
                lineFrequencyHz: loadedLineFrequencyHz,
                count: 3,
                minFrequencyHz: 1.5,
                maxFrequencyHz: 8,
                strategy: MotorCurrentSnn.FREQUENCY_SELECTION_MULTICLASS,
            });
            specialistFrequencyBands = MotorCurrentSnn.selectFrequencyBands(trainingSamples, loadedSampleRateHz, {
                signalDomain: loadedSignalDomain,
                lineFrequencyHz: loadedLineFrequencyHz,
                count: 1,
                minFrequencyHz: 1.5,
                maxFrequencyHz: 8,
                strategy: MotorCurrentSnn.FREQUENCY_SELECTION_TARGETED_PAIR,
                targetLabels: [healthyLabel, brb1Label],
                targetedCount: 1,
            });
            selectedFrequencyBands = globalFrequencyBands.concat(specialistFrequencyBands);
        } else {
            selectedFrequencyBands = MotorCurrentSnn.selectFrequencyBands(trainingSamples, loadedSampleRateHz, {
                signalDomain: loadedSignalDomain,
                lineFrequencyHz: loadedLineFrequencyHz,
                count: frequencyBandCount,
                minFrequencyHz: 1.5,
                maxFrequencyHz: 8,
                strategy: frequencySelectionStrategy,
                targetLabels: frequencySelectionStrategy === MotorCurrentSnn.FREQUENCY_SELECTION_TARGETED_PAIR ? [healthyLabel, brb1Label] : undefined,
                targetedCount: 1,
            });
        }
        if (hasTrainableReceptiveFields) {
            setStatus(hasSpikeAlignedReceptiveFields ? "Pré-entraînement des champs sur les spikes lissés..." : "Pré-entraînement RMS des trois champs récepteurs...");
            await new Promise(function (resolve) {
                window.setTimeout(resolve, 0);
            });
            receptiveFieldTraining = hasSpikeAlignedReceptiveFields
                ? MotorCurrentSnn.trainSpikeAlignedReceptiveFields(trainingSamples, loadedSampleRateHz, selectedFrequencyBands, {
                      signalDomain: loadedSignalDomain,
                      minFrequencyHz: 1.5,
                      maxFrequencyHz: 8,
                      rounds: 3,
                  })
                : MotorCurrentSnn.trainReceptiveFields(trainingSamples, loadedSampleRateHz, selectedFrequencyBands, {
                      signalDomain: loadedSignalDomain,
                      minFrequencyHz: 1.5,
                      maxFrequencyHz: 8,
                      rounds: 3,
                  });
            selectedFrequencyBands = selectedFrequencyBands.map(function (band, index) {
                const field = receptiveFieldTraining.fields[index];
                return Object.assign({}, band, {
                    initialFrequencyHz: band.frequencyHz,
                    initialBandwidthHz: field.initialBandwidthHz,
                    frequencyHz: field.centerFrequencyHz,
                    bandwidthHz: field.bandwidthHz,
                    initialFieldFisherScore: hasSpikeAlignedReceptiveFields ? field.initialSoftFisherScore : field.initialFisherScore,
                    trainedFieldFisherScore: hasSpikeAlignedReceptiveFields ? field.trainedSoftFisherScore : field.trainedFisherScore,
                    initialFieldObjectiveScore: hasSpikeAlignedReceptiveFields ? field.initialObjectiveScore : field.initialFisherScore,
                    trainedFieldObjectiveScore: hasSpikeAlignedReceptiveFields ? field.trainedObjectiveScore : field.trainedFisherScore,
                    initialHardFisherScore: hasSpikeAlignedReceptiveFields ? field.initialHardFisherScore : null,
                    trainedHardFisherScore: hasSpikeAlignedReceptiveFields ? field.trainedHardFisherScore : null,
                    initialFieldRedundancy: hasSpikeAlignedReceptiveFields ? field.initialRedundancy : null,
                    trainedFieldRedundancy: hasSpikeAlignedReceptiveFields ? field.trainedRedundancy : null,
                    initialHardEventsPerSample: hasSpikeAlignedReceptiveFields ? field.initialHardEventsPerSample : null,
                    trainedHardEventsPerSample: hasSpikeAlignedReceptiveFields ? field.trainedHardEventsPerSample : null,
                    source: hasSpikeAlignedReceptiveFields ? "train-soft-phase-spike-receptive-field" : "train-soft-biquad-receptive-field",
                });
            });
        }
        const selectedFrequenciesHz = selectedFrequencyBands.map(function (band) {
            return band.frequencyHz;
        });

        let specialistBranch = null;
        let pairAuxiliaryLoss = null;
        let scopedPairAuxiliary = null;
        if (hasSpecialistBranch) {
            const globalSensorConfig = MotorCurrentSnn.calibrateSensor(
                trainingSamples,
                MotorCurrentSnn.createSensorConfig({
                    sampleRateHz: loadedSampleRateHz,
                    signalDomain: loadedSignalDomain,
                    lineFrequencyHz: loadedLineFrequencyHz,
                    channelCount: 3,
                    frequenciesHz: globalFrequencyBands.map(function (band) {
                        return band.frequencyHz;
                    }),
                    encodingMode: MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL,
                }),
                MotorCurrentSnn.DEFAULT_PERCENTILE,
                MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL
            );
            const specialistSensorConfig = MotorCurrentSnn.calibrateSensor(
                trainingSamples,
                MotorCurrentSnn.createSensorConfig({
                    sampleRateHz: loadedSampleRateHz,
                    signalDomain: loadedSignalDomain,
                    lineFrequencyHz: loadedLineFrequencyHz,
                    channelCount: 3,
                    frequenciesHz: specialistFrequencyBands.map(function (band) {
                        return band.frequencyHz;
                    }),
                    encodingMode: MotorCurrentSnn.SENSOR_ENCODING_PHASE_BINARY,
                }),
                MotorCurrentSnn.DEFAULT_PERCENTILE,
                MotorCurrentSnn.SENSOR_ENCODING_PHASE_BINARY
            );
            specialistSensorConfig.bands.forEach(function (band) {
                band.id = "specialist-" + band.id;
            });
            snnSensorConfig = {
                sampleRateHz: globalSensorConfig.sampleRateHz,
                bands: globalSensorConfig.bands.concat(specialistSensorConfig.bands),
                emitFrameEnd: true,
                diagnostics: false,
            };
            specialistBranch = {
                version: "healthy-brb1-binary-v1",
                bandIds: specialistSensorConfig.bands.map(function (band) {
                    return band.id;
                }),
                hiddenSize: 4,
                outputLabels: [healthyLabel, brb1Label],
                encoding: MotorCurrentSnn.SENSOR_ENCODING_PHASE_BINARY,
            };
            if (hasPairAuxiliaryLoss) {
                pairAuxiliaryLoss = {
                    version: "final-frame-pair-mse-v1",
                    labels: [healthyLabel, brb1Label],
                    mixtureWeight: 0.25,
                };
            }
            if (hasScopedPairAuxiliary) {
                scopedPairAuxiliary = {
                    version: "specialist-only-pair-mse-v1",
                    labels: [healthyLabel, brb1Label],
                    learningRateScale: 0.1,
                };
            }
        } else {
            const baseSensorConfig = MotorCurrentSnn.createSensorConfig({
                sampleRateHz: loadedSampleRateHz,
                signalDomain: loadedSignalDomain,
                lineFrequencyHz: loadedLineFrequencyHz,
                channelCount: 3,
                frequenciesHz: selectedFrequenciesHz,
                bandwidthsHz: hasTrainableReceptiveFields
                    ? selectedFrequencyBands.map(function (band) {
                          return band.bandwidthHz;
                      })
                    : undefined,
                encodingMode: sensorEncoding,
            });
            snnSensorConfig = MotorCurrentSnn.calibrateSensor(trainingSamples, baseSensorConfig, MotorCurrentSnn.DEFAULT_PERCENTILE, sensorEncoding);
        }
        const windowSize = trainingSamples[0].sequence.length;
        snnModel = MotorCurrentSnn.buildModel({
            hiddenSize: hiddenSize,
            outputSize: NUM_CLASSES,
            windowSize: windowSize,
            sensorConfig: snnSensorConfig,
            sensorEncoding: sensorEncoding,
            topology: snnTopology,
            specialistBranch: specialistBranch,
            pairAuxiliaryLoss: pairAuxiliaryLoss,
            scopedPairAuxiliary: scopedPairAuxiliary,
            runtimeDecoderObjective: runtimeDecoderObjective,
            seed: SNN_SEED,
            learningRate: learningRate,
        });
        snnInference = null;
        rnnGraph = snnModel.graph;
        runtime = null;
        trainer = snnModel.trainer;

        log(
            "SNN RuntimeGraphBuilder topology: observation source -> wave sensor (" +
                snnModel.sensorPorts.length +
                " frequency/phase/level ports) -> " +
                (snnModel.topology === MotorCurrentSnn.TOPOLOGY_PHASE_FUSION
                    ? "phase LIF (" + snnModel.hiddenShape + ")"
                    :
                      hiddenSize +
                      " dense hidden LIF" +
                      (snnModel.recurrentCore
                          ? " + " + snnModel.recurrentCore.synapseCount + " recurrent synapses, delay " + snnModel.recurrentCore.delayTicks + " tick"
                          : "") +
                      (snnModel.specialistBranch ? " + " + snnModel.specialistBranch.hiddenSize + " specialist LIF" : "")) +
                " -> " +
                NUM_CLASSES +
                " class LIF"
        );
        log(
            "Sensor encoding: " +
                sensorEncoding +
                "; band selection: " +
                (hasSpikeAlignedReceptiveFields
                    ? "3 champs récepteurs appris sur les spikes lissés puis figés"
                    : hasContinuousReceptiveFields
                    ? "3 champs récepteurs appris sur l'énergie RMS puis figés"
                    : hasScopedPairAuxiliary
                    ? "3 multiclass multilevel + 1 binary Healthy/BRB1 specialist + confined gradient"
                    : hasPairAuxiliaryLoss
                    ? "3 multiclass multilevel + 1 binary Healthy/BRB1 specialist + pair loss"
                    : frequencySelectionMode === "healthy-brb1-specialist"
                      ? "3 multiclass multilevel + 1 binary Healthy/BRB1 specialist"
                    : frequencySelectionMode === "healthy-brb1-extra"
                    ? "3 multiclass + 1 Healthy/BRB1"
                    : frequencySelectionStrategy === MotorCurrentSnn.FREQUENCY_SELECTION_TARGETED_PAIR
                      ? "1 Healthy/BRB1 + 2 multiclass"
                      : "3 multiclass") +
                "; topology: " +
                snnModel.topology +
                "; hidden LIF budget: " +
                hiddenSize +
                (snnModel.specialistBranch ? " + " + snnModel.specialistBranch.hiddenSize + " specialist" : "")
        );
        const remanenceTimes = snnModel.sensorCells.map(function (cell) {
            return cell.remanenceTimeConstantSeconds;
        });
        const adaptationFrequencies = snnModel.sensorCells.map(function (cell) {
            return cell.maximumAdaptationFrequencyHz;
        });
        log(
            "Sensor phenotype: " +
                snnModel.sensorCells.length +
                " cells; remanence " +
                (Math.min.apply(Math, remanenceTimes) * 1000).toFixed(1) +
                ".." +
                (Math.max.apply(Math, remanenceTimes) * 1000).toFixed(1) +
                "ms; adaptation " +
                Math.min.apply(Math, adaptationFrequencies).toFixed(3) +
                ".." +
                Math.max.apply(Math, adaptationFrequencies).toFixed(3) +
                "Hz"
        );
        log("Training graph: " + snnModel.graph.nodes.length + " nodes, " + snnModel.graph.links.length + " links, " + snnModel.trainableWeightCount + " trainable weights");
        if (snnModel.recurrentCore) {
            log(
                "Recurrent temporal core: " +
                    snnModel.recurrentCore.synapseCount +
                    " trainable hidden-to-hidden synapses; fan-in " +
                    snnModel.recurrentCore.fanIn +
                    "; delay " +
                    snnModel.recurrentCore.delayTicks +
                    " raw-sample tick; dense BPTT timeline " +
                    windowSize +
                    " samples + frame end."
            );
        }
        log(
            "Hidden tau bank: " +
                snnModel.tauBank
                    .map(function (tau) {
                        return (tau * 1000).toFixed(1) + "ms";
                    })
                    .join(", ")
        );
        log(
            "Wave bands selected from training only: " +
                selectedFrequencyBands
                    .map(function (band) {
                        if (band.selectionScore === null) return band.frequencyHz.toFixed(3) + " Hz (physical)";
                        if (hasTrainableReceptiveFields) {
                            const commonDescription =
                                band.initialFrequencyHz.toFixed(3) +
                                " -> " +
                                band.frequencyHz.toFixed(3) +
                                " Hz; bandwidth " +
                                band.initialBandwidthHz.toFixed(3) +
                                " -> " +
                                band.bandwidthHz.toFixed(3) + " Hz";
                            if (hasSpikeAlignedReceptiveFields) {
                                return (
                                    commonDescription +
                                    "; spike objective " +
                                    band.initialFieldObjectiveScore.toFixed(4) +
                                    " -> " +
                                    band.trainedFieldObjectiveScore.toFixed(4) +
                                    "; soft/hard Fisher " +
                                    band.trainedFieldFisherScore.toFixed(4) +
                                    "/" +
                                    band.trainedHardFisherScore.toFixed(4) +
                                    "; redundancy " +
                                    band.trainedFieldRedundancy.toFixed(3)
                                );
                            }
                            return commonDescription + "; RMS Fisher " + band.initialFieldFisherScore.toFixed(4) + " -> " + band.trainedFieldFisherScore.toFixed(4);
                        }
                        const objective = band.selectionObjective.indexOf("pair-") === 0 ? "Healthy/BRB1" : "multiclass";
                        return band.frequencyHz.toFixed(3) + " Hz (" + objective + " Fisher " + band.selectionScore.toFixed(4) + ")";
                    })
                    .join(", ")
        );
        log(
            "Band thresholds (Ia): " +
                snnSensorConfig.bands
                    .filter(function (band) {
                        return band.channel === 0;
                    })
                    .map(function (band) {
                        const thresholds = Array.isArray(band.thresholds) ? band.thresholds : [band.threshold];
                        return (
                            band.centerFrequencyHz.toFixed(3) +
                            "Hz=[" +
                            thresholds
                                .map(function (threshold) {
                                    return threshold.toFixed(5);
                                })
                                .join(", ") +
                            "]"
                        );
                    })
                    .join("; ")
        );
        log("Training/validation: " + trainingSamples.length + "/" + validationSamples.length + " samples (" + split.protocol + ")");
        if (receptiveFieldTraining) {
            log(
                "Sensor pre-training: " +
                    receptiveFieldTraining.objective +
                    "; deterministic " +
                    receptiveFieldTraining.rounds +
                    "-round local search; " +
                    receptiveFieldTraining.trainingSampleCount +
                    " training samples; 0 validation and 0 test samples. Centers and bandwidths are now frozen for SNN training and runtime."
            );
            if (hasSpikeAlignedReceptiveFields) {
                log(
                    "Spike surrogate: sigmoid temperature=" +
                        receptiveFieldTraining.temperatureRatio.toFixed(3) +
                        " x threshold; LIF traces=" +
                        receptiveFieldTraining.traceTauSeconds
                            .map(function (tau) {
                                return (tau * 1000).toFixed(1) + "ms";
                            })
                            .join(", ") +
                        "; redundancy weight=" +
                        receptiveFieldTraining.redundancyWeight.toFixed(2) +
                        ". The runtime still uses strict binary threshold crossings."
                );
            }
        }
        if (pairAuxiliaryLoss) {
            log(
                "Training objective: base temporal MSE mixed with final-frame Healthy/BRB1 MSE, lambda=" +
                    pairAuxiliaryLoss.mixtureWeight.toFixed(2) +
                    ". The auxiliary term is active only for Healthy and BRB1 samples."
            );
        }
        if (scopedPairAuxiliary) {
            log(
                "Training objective: base temporal MSE plus a separate Healthy/BRB1 MSE pass at LR x" +
                    scopedPairAuxiliary.learningRateScale.toFixed(2) +
                    ". Its gradient reaches only 32 runtime weights: 24 sensor-to-specialist and 8 specialist-to-pair weights. " +
                    "Two additional frame weights exist only inside the auxiliary trainer and are discarded before runtime compilation."
            );
        }
        if (runtimeDecoderObjective) {
            log(
                "Training objective: runtime decoder cross-entropy on score = " +
                    runtimeDecoderObjective.spikeCountScale.toFixed(1) +
                    " * total spike count + " +
                    runtimeDecoderObjective.membranePotentialScale.toFixed(1) +
                    " * final membrane / threshold; temperature=" +
                    runtimeDecoderObjective.temperature.toFixed(1) +
                    "; CE weight=" +
                    runtimeDecoderObjective.classificationLossWeight.toFixed(2) +
                    "; temporal MSE weight=" +
                    runtimeDecoderObjective.temporalLossWeight.toFixed(2) +
                    ". Forward spikes remain strictly binary."
            );
        } else {
            log("Training objective: historical temporal hard-forward MSE baseline.");
        }

        const trainingObjectiveMetadata = runtimeDecoderObjective
            ? {
                  base: MotorCurrentSnn.RUNTIME_DECODER_OBJECTIVE_VERSION,
                  runtimeDecoderObjective: runtimeDecoderObjective,
              }
            : { base: "temporal-hard-forward-mse-v2" };
        if (pairAuxiliaryLoss) trainingObjectiveMetadata.pairAuxiliaryLoss = pairAuxiliaryLoss;
        if (scopedPairAuxiliary) trainingObjectiveMetadata.scopedPairAuxiliary = scopedPairAuxiliary;

        const checkpointMetadata = {
            model: {
                architectureVersion: SNN_ARCHITECTURE_VERSION,
                cellType: "snn",
                inputSize: snnModel.inputSize,
                hiddenSize: hiddenSize,
                outputSize: NUM_CLASSES,
                windowSize: windowSize,
                datasetFingerprint: loadedDatasetFingerprint,
                snn: {
                    encoder: "wave-filter-bank-phase-crossing-v2",
                    sensorEncoding: sensorEncoding,
                    topology: snnModel.topology,
                    recurrentCore: snnModel.recurrentCore,
                    specialistBranch: snnModel.specialistBranch,
                    trainingObjective: trainingObjectiveMetadata,
                    temporalPolicy: snnModel.temporalPolicy,
                    sensorPhenotypeVersion: snnModel.sensorPhenotypeVersion,
                    sensorTraining: receptiveFieldTraining,
                    sensorConfig: snnSensorConfig,
                    percentile: MotorCurrentSnn.DEFAULT_PERCENTILE,
                    frequencySelectionStrategy: frequencySelectionStrategy,
                    frequencySelectionMode:
                        frequencySelectionMode === "healthy-brb1-extra" ||
                        frequencySelectionMode === "healthy-brb1-specialist" ||
                        frequencySelectionMode === "healthy-brb1-specialist-aux" ||
                        frequencySelectionMode === "healthy-brb1-specialist-scoped" ||
                        frequencySelectionMode === "multiclass-receptive-fields" ||
                        frequencySelectionMode === "multiclass-spike-receptive-fields"
                            ? frequencySelectionMode
                            : null,
                    frequencySelectionTargetLabels:
                        frequencySelectionStrategy === MotorCurrentSnn.FREQUENCY_SELECTION_TARGETED_PAIR ? [healthyLabel, brb1Label] : null,
                    frequencySelection: selectedFrequencyBands,
                    seed: snnModel.seed,
                    frameEndSlot: MotorCurrentSnn.FRAME_END_SLOT,
                },
            },
            dataset: {
                selection: document.getElementById("datasetSplit").value,
                splitProtocol: loadedSplitProtocol,
                fingerprint: loadedDatasetFingerprint,
            },
            validationProtocol: split.protocol + "-runtime-hard-decoder-v1",
            classes: CLASS_NAMES,
        };
        const checkpointer = createAccuracyCheckpointer(snnModel.graph, checkpointMetadata);
        log("Checkpoint architecture: " + checkpointMetadata.model.architectureSignature);
        let savedBaseline = null;
        let savedBaselineDiagnostics = null;
        if (checkpointer.hasSavedBaseline()) {
            log("A persistent checkpoint for this exact SNN architecture will be kept unless this run improves it. Use Reset saved to start a fresh baseline.");
            savedBaseline = checkpointer.savedBaseline();
            const initialSnapshot = spSnapshotWeights(snnModel.graph);
            try {
                spRestoreWeights(snnModel.graph, savedBaseline.snapshot);
                setStatus("Measuring the saved SNN checkpoint before training...");
                savedBaselineDiagnostics = await evaluateSnnTeacherAccuracy(snnModel, validationSamples, { includeTrainingForward: true });
                logSnnDiagnostics(
                    "Saved checkpoint epoch " + savedBaseline.metric.epoch + " (Runtime hard val " + (savedBaseline.metric.validationAccuracy * 100).toFixed(1) + "%)",
                    savedBaselineDiagnostics
                );
            } finally {
                spRestoreWeights(snnModel.graph, initialSnapshot);
                snnModel.trainer.resetOptimizerState();
            }
        }

        const batchCount = Math.ceil(trainingSamples.length / SNN_BATCH_SIZE);
        const totalSteps = epochs * batchCount;
        let completedSteps = 0;
        const experimentHistory = [];
        let currentRunProducedBestCheckpoint = false;
        const trainingStartedAt = performance.now();
        log(
            "Diagnostics: every epoch measures runtime hard train on " +
                trainingSamples.length +
                " samples, hard-forward validation, runtime hard validation, margins, and neuron firing rates. The surrogate is used only in the backward derivative."
        );
        log(
            "Runtime hard decoder: score = 2 * total spike count + final membrane / threshold. The retired last-timestep decoder is not used for validation or checkpoint selection."
        );
        setStatus("Training SNN...");

        for (let epoch = 0; epoch < epochs; epoch++) {
            let epochLoss = 0;
            let epochSamples = 0;
            let epochEvents = 0;
            let epochScopedPairLoss = 0;
            let epochScopedPairSamples = 0;
            for (let start = 0; start < trainingSamples.length; start += SNN_BATCH_SIZE) {
                const end = Math.min(trainingSamples.length, start + SNN_BATCH_SIZE);
                const encodedBatch = [];
                for (let i = start; i < end; i++) {
                    const encoded = MotorCurrentSnn.encodeSequence(trainingSamples[i].sequence, trainingSamples[i].label, NUM_CLASSES, {
                        sensorConfig: snnModel.sensorConfig,
                        inputIndexBySlot: snnModel.inputIndexBySlot,
                        pairAuxiliaryLoss: snnModel.pairAuxiliaryLoss,
                        runtimeDecoderObjective: snnModel.runtimeDecoderObjective,
                        preserveEmptyTimesteps: !!snnModel.recurrentCore,
                    });
                    encodedBatch.push(encoded);
                    epochEvents += encoded.sensorEvents;
                }
                const batchLoss = snnModel.trainer.trainBatch(encodedBatch);
                const scopedPairResult = MotorCurrentSnn.trainScopedPairBatch(snnModel, encodedBatch);
                epochLoss += batchLoss * encodedBatch.length;
                if (scopedPairResult.samples > 0) {
                    epochScopedPairLoss += scopedPairResult.loss * scopedPairResult.samples;
                    epochScopedPairSamples += scopedPairResult.samples;
                }
                epochSamples += encodedBatch.length;
                completedSteps++;

                if (completedSteps % 2 === 0 || end === trainingSamples.length) {
                    setProgress((completedSteps / totalSteps) * 100);
                    setStatus("SNN epoch " + (epoch + 1) + "/" + epochs + " - Batch " + Math.ceil(end / SNN_BATCH_SIZE) + "/" + batchCount);
                    await new Promise(function (resolve) {
                        window.setTimeout(resolve, 0);
                    });
                }
            }

            const avgLoss = epochLoss / epochSamples;
            lossHistory.push(avgLoss);
            drawLossChart();
            setStatus("SNN epoch " + (epoch + 1) + "/" + epochs + " - validating the runtime hard decoder...");
            const validation = await evaluateSnnTeacherAccuracy(snnModel, validationSamples, { includeTrainingForward: true });
            setStatus("SNN epoch " + (epoch + 1) + "/" + epochs + " - measuring runtime hard training accuracy...");
            const trainingDiagnostics = await evaluateSnnTeacherAccuracy(snnModel, trainingSamples, { includeTrainingForward: false });
            experimentHistory.push({
                epoch: epoch + 1,
                trainLoss: avgLoss,
                scopedPairLoss: epochScopedPairSamples > 0 ? epochScopedPairLoss / epochScopedPairSamples : null,
                trainRuntimeHardAccuracy: trainingDiagnostics.accuracy,
                validationAccuracy: validation.accuracy,
                validationCorrect: validation.correct,
                validationTotal: validation.total,
                validationDiagnostics: snnDiagnosticRecord(validation),
                inputEventsPerSample: epochEvents / epochSamples,
            });
            const checkpointUpdate = checkpointer.update(epoch, avgLoss, validation);
            if (checkpointUpdate.improved) currentRunProducedBestCheckpoint = true;
            const marker = checkpointUpdate.improved ? " * saved" : "";
            log(
                "SNN epoch " +
                    (epoch + 1) +
                    "/" +
                    epochs +
                    " - Loss: " +
                    avgLoss.toFixed(6) +
                    (epochScopedPairSamples > 0
                        ? " - Scoped pair loss: " + (epochScopedPairLoss / epochScopedPairSamples).toFixed(6)
                        : "") +
                    " - Runtime hard train: " +
                    (trainingDiagnostics.accuracy * 100).toFixed(1) +
                    "%" +
                    " - Runtime hard val: " +
                    (validation.accuracy * 100).toFixed(1) +
                    "% (" +
                    validation.correct +
                    "/" +
                    validation.total +
                    ")" +
                    " - Input events/sample: " +
                    (epochEvents / epochSamples).toFixed(1) +
                    marker
            );
            logSnnDiagnostics("SNN epoch " + (epoch + 1), validation);
            if (checkpointUpdate.improved && checkpointUpdate.persisted && !checkpointUpdate.persisted.ok) {
                log("WARNING: SNN checkpoint is in memory but local persistence failed: " + checkpointUpdate.persisted.error);
            }
            await new Promise(function (resolve) {
                window.setTimeout(resolve, 0);
            });
        }

        const bestCheckpoint = checkpointer.restore();
        if (!bestCheckpoint) throw new Error("SNN training produced no checkpoint.");
        const currentExperiment = {
            protocolVersion: "snn-runtime-decoder-loss-v4",
            requestedEpochs: epochs,
            completedEpochs: experimentHistory.length,
            batchSize: SNN_BATCH_SIZE,
            learningRate: learningRate,
            elapsedMilliseconds: performance.now() - trainingStartedAt,
            savedBaseline:
                savedBaseline && savedBaselineDiagnostics
                    ? {
                          epoch: savedBaseline.metric.epoch,
                          trainLoss: savedBaseline.metric.trainLoss,
                          validationAccuracy: savedBaseline.metric.validationAccuracy,
                          diagnostics: snnDiagnosticRecord(savedBaselineDiagnostics),
                      }
                    : null,
            history: experimentHistory,
        };
        if (currentRunProducedBestCheckpoint || !bestCheckpoint.experiment) {
            bestCheckpoint.experiment = currentExperiment;
        }
        persistCheckpoint(bestCheckpoint);
        activeCheckpoint = bestCheckpoint;
        snnSensorConfig = bestCheckpoint.model.snn.sensorConfig;
        snnInference = createCompiledSnnFromCheckpoint(bestCheckpoint);
        rnnGraph = snnInference.graph;
        runtime = snnInference;

        const bestPct = (bestCheckpoint.metric.validationAccuracy * 100).toFixed(1);
        log(
            "Restored and compiled best SNN from epoch " +
                bestCheckpoint.metric.epoch +
                " - validation " +
                bestPct +
                "% (" +
                bestCheckpoint.metric.validationCorrect +
                "/" +
                bestCheckpoint.metric.validationTotal +
                ")."
        );
        log(
            "Compiled graph: " +
                snnInference.graph.nodes.length +
                " nodes, " +
                snnInference.graph.links.length +
                " links, " +
                snnInference.compilation.neurons.length +
                " native LIF neurons"
        );
        log("Training time: " + (bestCheckpoint.experiment.elapsedMilliseconds / 1000).toFixed(1) + "s");
        if (savedBaseline && savedBaselineDiagnostics && experimentHistory.length > 0) {
            const lastEpoch = experimentHistory[experimentHistory.length - 1];
            const lastDiagnostics = lastEpoch.validationDiagnostics;
            log(
                "Objective alignment comparison - saved epoch " +
                    savedBaseline.metric.epoch +
                    ": train loss " +
                    savedBaseline.metric.trainLoss.toFixed(6) +
                    ", val loss " +
                    savedBaselineDiagnostics.validationLoss.toFixed(6) +
                    ", Runtime hard val " +
                    (savedBaseline.metric.validationAccuracy * 100).toFixed(1) +
                    "% - run epoch " +
                    lastEpoch.epoch +
                    ": train loss " +
                    lastEpoch.trainLoss.toFixed(6) +
                    ", val loss " +
                    lastDiagnostics.trainingObjectiveLoss.toFixed(6) +
                    ", Runtime hard val " +
                    (lastEpoch.validationAccuracy * 100).toFixed(1) +
                    "%"
            );
            if (lastDiagnostics.trainingObjectiveLoss < savedBaselineDiagnostics.validationLoss && lastEpoch.validationAccuracy < savedBaseline.metric.validationAccuracy) {
                log("OBJECTIVE MISALIGNMENT OBSERVED: training objective improved while the runtime decoder accuracy declined.");
            }
        }
        if (bestCheckpoint.metric.validationConfusionMatrix) {
            logConfusionMatrix("Best validation confusion matrix", bestCheckpoint.metric.validationConfusionMatrix);
        }
        document.getElementById("bestValidation").textContent = bestPct + "%";
        document.getElementById("bestEpoch").textContent = bestCheckpoint.metric.epoch;
        document.getElementById("finalLoss").textContent = bestCheckpoint.metric.trainLoss.toFixed(4);
        btnRestoreCheckpoint.disabled = false;
        if (btnResetCheckpoint) btnResetCheckpoint.disabled = false;
        btnDownloadCheckpoint.disabled = false;
        btnExport.disabled = true;
        setProgress(100);
        setStatus("SNN training complete. Native LIF graph is ready to test.");
    }

    btnTrain.addEventListener("click", async function () {
        if (!trainData) return;
        btnTrain.disabled = true;
        btnTest.disabled = true;
        if (btnProfileConversion) btnProfileConversion.disabled = true;
        btnLoad.disabled = true;
        lossHistory.length = 0;
        lastTestAccuracy = null;

        const cellType = document.getElementById("cellType").value;
        const hiddenSize = parseInt(document.getElementById("hiddenSize").value);
        const epochs = parseInt(document.getElementById("epochs").value);
        const lr = parseFloat(document.getElementById("lr").value);

        if (cellType === "snn") {
            try {
                await trainSnn(hiddenSize, epochs, lr);
                btnTest.disabled = false;
                if (btnProfileConversion) btnProfileConversion.disabled = false;
            } catch (e) {
                log("ERROR training SNN: " + e.message);
                setStatus("SNN training failed.");
            } finally {
                btnTrain.disabled = false;
                btnLoad.disabled = false;
            }
            return;
        }

        snnModel = null;
        snnInference = null;
        snnSensorConfig = null;
        log("Building RNN (" + cellType.toUpperCase() + ", hidden=" + hiddenSize + ", out=" + NUM_CLASSES + ")...");
        setStatus("Building model...");

        try {
            rnnGraph = buildGraph(cellType, hiddenSize, NUM_CLASSES);
        } catch (e) {
            log("ERROR building model: " + e.message);
            setStatus("Build failed.");
            btnTrain.disabled = false;
            btnLoad.disabled = false;
            return;
        }

        log("RNN graph: " + rnnGraph.nodes.length + " neurons, " + rnnGraph.links.length + " synapses");

        runtime = new S.RnnInferenceRuntime(rnnGraph);
        trainer = new S.RnnTrainingRuntime(rnnGraph, runtime, S.LossFunctions.MSE, lr, S.Optimizers.Adam());

        const split = splitTrainingValidation(trainData);
        const trainingSamples = split.train;
        const validationSamples = split.validation;
        if (trainingSamples.length === 0 || validationSamples.length === 0) {
            log("ERROR: Unable to create a non-empty training/validation split.");
            setStatus("Validation split failed.");
            btnTrain.disabled = false;
            btnLoad.disabled = false;
            return;
        }

        log("Training/validation: " + trainingSamples.length + "/" + validationSamples.length + " samples (" + split.protocol + ")");

        const checkpointMetadata = {
            model: {
                architectureVersion: RNN_ARCHITECTURE_VERSION,
                cellType: cellType,
                inputSize: 3,
                hiddenSize: hiddenSize,
                outputSize: NUM_CLASSES,
                windowSize: trainingSamples[0].sequence.length,
                datasetFingerprint: loadedDatasetFingerprint,
            },
            dataset: {
                selection: document.getElementById("datasetSplit").value,
                splitProtocol: loadedSplitProtocol,
                fingerprint: loadedDatasetFingerprint,
            },
            validationProtocol: split.protocol,
            classes: CLASS_NAMES,
        };
        const checkpointer = createAccuracyCheckpointer(rnnGraph, checkpointMetadata);
        log("Checkpoint architecture: " + checkpointMetadata.model.architectureSignature);
        if (checkpointer.hasSavedBaseline()) {
            log("A persistent checkpoint for this exact RNN architecture will be kept unless this run improves it. Use Reset saved to start a fresh baseline.");
        }

        setStatus("Training...");
        const totalSteps = epochs * trainingSamples.length;
        let step = 0;

        for (let epoch = 0; epoch < epochs; epoch++) {
            let epochLoss = 0;

            for (let i = 0; i < trainingSamples.length; i++) {
                const sample = trainingSamples[i];
                runtime.resetState();

                // Many-to-one classification: enforce the same one-hot
                // target at every timestep. The "neutral for the first
                // 75 %, one-hot for the last 25 %" trick borrowed from
                // the vibration sample creates an optimum-trap at uniform
                // 1/N outputs (matching the neutral target gives MSE = 0
                // on most timesteps), which prevents the optimizer from
                // ever producing confident class predictions. With 5
                // broken-bar classes and 256-step windows that trap was
                // severe enough to keep accuracy at chance (~20 %).
                // Forcing the one-hot label everywhere gives the
                // optimizer a clear gradient direction; the LSTM hidden
                // state still smoothly evolves toward the correct
                // prediction over time, the early-timestep loss is just
                // higher because there is less context.
                const oneHotLabel = new Array(NUM_CLASSES).fill(0);
                oneHotLabel[sample.label] = 1;
                const targets = [];
                for (let t = 0; t < sample.sequence.length; t++) {
                    targets.push(oneHotLabel.slice());
                }

                const loss = trainer.trainStep(sample.sequence, targets);
                epochLoss += loss;
                step++;

                if (i % 10 === 0) {
                    setProgress((step / totalSteps) * 100);
                    setStatus("Epoch " + (epoch + 1) + "/" + epochs + " - Sample " + (i + 1) + "/" + trainingSamples.length);
                    await new Promise(function (r) {
                        setTimeout(r, 0);
                    });
                }
            }

            const avgLoss = epochLoss / trainingSamples.length;
            lossHistory.push(avgLoss);
            drawLossChart();

            setStatus("Epoch " + (epoch + 1) + "/" + epochs + " - validating...");
            const validation = await evaluateAccuracy(validationSamples);
            const checkpointUpdate = checkpointer.update(epoch, avgLoss, validation);
            const marker = checkpointUpdate.improved ? " * saved" : "";
            log(
                "Epoch " +
                    (epoch + 1) +
                    "/" +
                    epochs +
                    " - Avg Loss: " +
                    avgLoss.toFixed(6) +
                    " - Val: " +
                    (validation.accuracy * 100).toFixed(1) +
                    "% (" +
                    validation.correct +
                    "/" +
                    validation.total +
                    ")" +
                    marker
            );

            if (checkpointUpdate.improved && checkpointUpdate.persisted && !checkpointUpdate.persisted.ok) {
                log("WARNING: checkpoint is in memory but local persistence failed: " + checkpointUpdate.persisted.error);
            }

            await new Promise(function (r) {
                setTimeout(r, 0);
            });
        }

        setProgress(100);
        const bestCheckpoint = checkpointer.restore();
        if (bestCheckpoint) {
            const bestPct = (bestCheckpoint.metric.validationAccuracy * 100).toFixed(1);
            log(
                "Restored best weights from epoch " +
                    bestCheckpoint.metric.epoch +
                    " - validation " +
                    bestPct +
                    "% (" +
                    bestCheckpoint.metric.validationCorrect +
                    "/" +
                    bestCheckpoint.metric.validationTotal +
                    ")."
            );
            document.getElementById("bestValidation").textContent = bestPct + "%";
            document.getElementById("bestEpoch").textContent = bestCheckpoint.metric.epoch;
            document.getElementById("finalLoss").textContent = bestCheckpoint.metric.trainLoss.toFixed(4);
            btnRestoreCheckpoint.disabled = false;
            if (btnResetCheckpoint) btnResetCheckpoint.disabled = false;
            btnDownloadCheckpoint.disabled = false;
        }
        setStatus("Training complete. Click Test to evaluate.");
        log("Training finished. The graph now contains the best validation checkpoint.");
        btnTrain.disabled = false;
        btnTest.disabled = false;
        btnLoad.disabled = false;
        if (btnExport) btnExport.disabled = false;
    });

    // ====================== TESTING ======================

    btnTest.addEventListener("click", async function () {
        if (!runtime || !testData) return;
        btnTest.disabled = true;
        btnTrain.disabled = true;

        setStatus("Running inference on test set...");
        log("Testing on " + testData.length + " samples...");

        let correct = 0;
        let snnInputEvents = 0;
        let snnNeuronSpikes = 0;
        const confMatrix = [];
        for (let i = 0; i < NUM_CLASSES; i++) {
            confMatrix.push(new Array(NUM_CLASSES).fill(0));
        }

        const t0 = performance.now();

        for (let i = 0; i < testData.length; i++) {
            const sample = testData[i];
            let predicted;
            if (snnInference) {
                const result = MotorCurrentSnn.predictCompiled(snnInference, sample.sequence);
                predicted = result.predicted;
                snnInputEvents += result.sensorEvents;
                snnNeuronSpikes += result.neuronSpikes;
            } else {
                runtime.resetState();
                const outputs = runtime.run(sample.sequence);
                const lastOutput = outputs[outputs.length - 1];
                predicted = 0;
                for (let c = 1; c < lastOutput.length; c++) {
                    if (lastOutput[c] > lastOutput[predicted]) predicted = c;
                }
            }

            if (predicted === sample.label) correct++;
            confMatrix[sample.label][predicted]++;

            if (i % 10 === 0) {
                setStatus("Testing " + (i + 1) + "/" + testData.length + "...");
                await new Promise(function (r) {
                    setTimeout(r, 0);
                });
            }
        }

        const elapsed = performance.now() - t0;
        const accuracy = correct / testData.length;
        lastTestAccuracy = accuracy;

        if (activeCheckpoint && activeCheckpoint.model.datasetFingerprint === loadedDatasetFingerprint) {
            activeCheckpoint.lastTest = {
                evaluatedAt: new Date().toISOString(),
                accuracy: accuracy,
                correct: correct,
                total: testData.length,
                elapsedMilliseconds: elapsed,
                inputEventsPerSample: snnInference ? snnInputEvents / testData.length : undefined,
                neuronSpikesPerSample: snnInference ? snnNeuronSpikes / testData.length : undefined,
                confusionMatrix: confMatrix.map(function (row) {
                    return row.slice();
                }),
            };
            persistCheckpoint(activeCheckpoint);
        }

        log("Accuracy: " + (accuracy * 100).toFixed(1) + "% (" + correct + "/" + testData.length + ")");
        log("Inference time: " + elapsed.toFixed(0) + "ms (" + (elapsed / testData.length).toFixed(1) + "ms/sample)");
        if (snnInference) {
            log(
                "SNN activity: " +
                    (snnInputEvents / testData.length).toFixed(1) +
                    " encoded input events/sample, " +
                    (snnNeuronSpikes / testData.length).toFixed(1) +
                    " neuron spikes/sample"
            );
        }

        resultsPanel.style.display = "block";
        document.getElementById("accuracy").textContent = (accuracy * 100).toFixed(1) + "%";
        document.getElementById("finalLoss").textContent = activeCheckpoint
            ? activeCheckpoint.metric.trainLoss.toFixed(4)
            : lossHistory.length > 0
              ? lossHistory[lossHistory.length - 1].toFixed(4)
              : "-";
        document.getElementById("inferenceTime").textContent = elapsed.toFixed(0) + "ms";
        document.getElementById("testCount").textContent = testData.length;

        await new Promise(function (r) {
            setTimeout(r, 50);
        });

        drawConfusionMatrix(confMatrix);

        if (testData.length > 0) {
            drawSignal(testData[0]);
        }

        // Log confusion matrix as text
        logConfusionMatrix("Confusion Matrix", confMatrix);

        setStatus("Done - Accuracy: " + (accuracy * 100).toFixed(1) + "% - " + elapsed.toFixed(0) + "ms");
        btnTrain.disabled = false;
        btnTest.disabled = false;
    });

    function logConfusionMatrix(title, matrix) {
        log("");
        log(title + " (rows=actual, cols=predicted):");
        let header = "".padEnd(14, " ");
        for (let c = 0; c < NUM_CLASSES; c++) {
            header += CLASS_NAMES[c].padStart(10, " ");
        }
        log(header);
        for (let r = 0; r < NUM_CLASSES; r++) {
            let row = CLASS_NAMES[r].padEnd(14, " ");
            for (let c = 0; c < NUM_CLASSES; c++) {
                row += String(matrix[r][c]).padStart(10, " ");
            }
            log(row);
        }
    }

    // ====================== ONNX EXPORT ======================
    //
    // Exports the trained LSTM or GRU as an ONNX model with optional
    // EnvelopeRMS preprocessing op. The ONNX graph is:
    //
    //   Input: envelope [seq_len, 1, 3]
    //     -> LSTM or GRU (hidden_size=H)
    //     -> Gemm (H -> NUM_CLASSES)
    //     -> Sigmoid
    //   Output: probabilities [1, NUM_CLASSES]
    //
    // A custom op node "com.dotvision.EnvelopeRMS" is prepended to
    // document the preprocessing parameters. On CyanMycelium/ESP32
    // this op is implemented in C firmware; on desktop onnxruntime it
    // can be registered as a Python custom op for validation.
    //
    // ----------------------------------------------------------------
    // CYAN MYCELIUM INTEROP NOTES (2026-04-26, motor_current_lstm.onnx)
    // ----------------------------------------------------------------
    //
    // The "standard" mode export was loaded into CyanMycelium's
    // OnnxGraphBuilder for a parse + topology probe. Three findings to
    // keep in mind next time we touch this export, listed in order of
    // ownership:
    //
    // 1) [SPIKYPANDA EXPORT] All initializers are also re-listed in
    //    graph.input below (see the "Initializers declared as inputs
    //    (ONNX convention for static weights)" block). That convention
    //    was the legacy ONNX form (IR <= 3); since IR 4 the recommended
    //    layout is initializer-only, no duplicate input entry. Some
    //    runtimes (CyanMycelium today) do not deduplicate, so every
    //    weight tensor surfaces in the runtime's "external inputs" list
    //    and pollutes the SetInput() API of the consumer. Fix on this
    //    side: when emitting the model.inputs list further down, only
    //    include the truly external tensors (envelope_raw in standard /
    //    custom modes, envelope_seq in none mode). The runtime fix
    //    (initializer-vs-input dedup) is tracked separately on the
    //    CyanMycelium side.
    //
    // 2) [SPIKYPANDA EXPORT] In "standard" mode, the preprocessing
    //    subgraph (ReduceMean -> Sub -> Mul -> Add -> Clip[0,1])
    //    duplicates what _normalize_window_centered already does in
    //    prepare_motor_current.py. The browser sample feeds the LSTM
    //    directly with the JSON `sequence` (already centered + clipped),
    //    so the input contract for the exported ONNX is "raw envelope,
    //    UNNORMALIZED" -- the host that consumes the .onnx is expected
    //    to provide unnormalized 3-channel envelope samples and let the
    //    graph normalize them. That is intentional for embedded targets
    //    where the firmware computes the envelope but cannot easily
    //    reproduce the per-window centering; it is NOT the contract a
    //    casual ORT user would assume. The input name `envelope_raw`
    //    encodes that intent -- do not rename it to `sequence` or
    //    `input` without revisiting which side does the normalization.
    //
    // 3) [CYAN MYCELIUM] The Clip op was missing runtime-input support
    //    (opset >= 11 form, where min/max are tensor inputs instead of
    //    attributes). This export uses that form ("clip_01" with inputs
    //    [env_shifted, const_zero, const_one], no attributes), so the
    //    CyanMycelium ClipNode now resolves min/max lazily from
    //    Opsc[1]/Opsc[2] on the first Activate. Fixed in
    //    include/nodes/unary/cm_clip.hpp. No action needed on this side.
    //
    // ----------------------------------------------------------------

    if (btnExport) {
        btnExport.addEventListener("click", function () {
            if (activeCheckpoint && activeCheckpoint.model.cellType === "snn") {
                log("SNN ONNX export is not available yet. Save the JSON checkpoint for the native LIF graph.");
                return;
            }
            if (!rnnGraph) {
                log("ERROR: Train a model first before exporting.");
                return;
            }
            if (typeof SpikypandaOnnx === "undefined") {
                log("ERROR: spikypanda-onnx.js not loaded (OnnxWriter unavailable).");
                return;
            }

            var exportMode = document.getElementById("exportMode").value;
            log("Exporting ONNX model (mode: " + exportMode + ")...");
            if (activeCheckpoint) {
                log("  Best checkpoint: epoch " + activeCheckpoint.metric.epoch + ", validation " + (activeCheckpoint.metric.validationAccuracy * 100).toFixed(1) + "%");
            }

            try {
                var sequenceLength = activeCheckpoint ? activeCheckpoint.model.windowSize : trainData && trainData[0] ? trainData[0].sequence.length : 64;
                var onnxBytes = exportToOnnx(rnnGraph, exportMode, sequenceLength);
                log("ONNX model size: " + onnxBytes.length + " bytes");

                var blob = new Blob([onnxBytes], { type: "application/octet-stream" });
                var score = lastTestAccuracy;
                var scoreLabel = "";
                if (score !== null) {
                    scoreLabel = "_test_" + (score * 100).toFixed(1).replace(".", "p");
                } else if (activeCheckpoint) {
                    scoreLabel = "_val_" + (activeCheckpoint.metric.validationAccuracy * 100).toFixed(1).replace(".", "p");
                }
                var cellType = activeCheckpoint ? activeCheckpoint.model.cellType : rnnGraph.hiddens[0] && typeof rnnGraph.hiddens[0].biasForget === "number" ? "lstm" : "gru";
                var filename = "motor_current_" + cellType + scoreLabel + ".onnx";
                downloadBlob(blob, filename);

                log("Downloaded: " + filename);
                setStatus("ONNX model exported.");
            } catch (e) {
                log("ERROR exporting ONNX: " + e.message);
            }
        });
    }

    function exportToOnnx(graph, mode, sequenceLength) {
        var R = SpikypandaOnnx;
        var FLOAT = 1; // OnnxDataType.FLOAT

        // Extract graph dimensions
        var inputNeurons = graph.inputs;
        var hiddenNeurons = graph.hiddens;
        var outputNeurons = graph.outputs;
        var inputSize = inputNeurons.length; // 3
        var hiddenSize = hiddenNeurons.length; // 32
        var outputSize = outputNeurons.length; // 5

        log("  Architecture: input=" + inputSize + ", hidden=" + hiddenSize + ", output=" + outputSize);

        var isLstm = hiddenNeurons[0] && typeof hiddenNeurons[0].biasForget === "number";
        var isGru = hiddenNeurons[0] && typeof hiddenNeurons[0].biasReset === "number";
        if (!isLstm && !isGru) {
            throw new Error("Unsupported recurrent cell type for ONNX export.");
        }
        var cellType = isLstm ? "lstm" : "gru";
        var recurrentOpType = isLstm ? "LSTM" : "GRU";
        var gateCount = isLstm ? 4 : 3;

        // ---- Extract recurrent weights ----
        // SpikyPanda gate order: [0:forget, 1:input, 2:candidate, 3:output]
        // ONNX LSTM gate order:  [0:input, 1:output, 2:forget, 3:candidate]
        // Remap: SP[0]->ONNX[2], SP[1]->ONNX[0], SP[2]->ONNX[3], SP[3]->ONNX[1]
        // SpikyPanda GRU order: [0:reset, 1:update-to-candidate, 2:candidate]
        // ONNX GRU order:       [0:update-to-memory, 1:reset, 2:candidate]
        // The two update gates are complements. Negating the SpikyPanda
        // update pre-activation gives z_onnx = 1 - z_spikypanda.
        var gateMap = isLstm ? [2, 0, 3, 1] : [1, 0, 2];

        function mapGateWeight(spGate, value) {
            return isGru && spGate === 1 ? -value : value;
        }

        // W: input-to-hidden weights [1, gateCount*H, inputSize]
        // Each RnnSynapse connects one input neuron to one hidden neuron
        // with one weight per gate.
        var W = new Float32Array(gateCount * hiddenSize * inputSize);
        var inputLinkCount = 0;
        for (var i = 0; i < inputSize; i++) {
            var inp = inputNeurons[i];
            var synapses = typeof inp.onsc === "function" ? inp.onsc() : [];
            for (var si = 0; si < synapses.length; si++) {
                var syn = synapses[si];
                var j = hiddenNeurons.indexOf(syn.ofin);
                if (j < 0 || !syn.weights || syn.weights.length !== gateCount) continue;
                for (var g = 0; g < gateCount; g++) {
                    var onnxGate = gateMap[g];
                    // W layout: [onnxGate * H + j, i] row-major -> flat index
                    W[onnxGate * hiddenSize * inputSize + j * inputSize + i] = mapGateWeight(g, syn.weights[g]);
                }
                inputLinkCount++;
            }
        }

        if (inputLinkCount !== inputSize * hiddenSize) {
            throw new Error("Incomplete input weights: found " + inputLinkCount + ", expected " + inputSize * hiddenSize + ".");
        }

        // R: hidden-to-hidden recurrent weights [1, gateCount*H, H]
        var Rec = new Float32Array(gateCount * hiddenSize * hiddenSize);
        var recurrentLinkCount = 0;
        for (var i = 0; i < hiddenSize; i++) {
            var hid = hiddenNeurons[i];
            var recSynapses = typeof hid.onsc === "function" ? hid.onsc() : [];
            for (var si = 0; si < recSynapses.length; si++) {
                var syn = recSynapses[si];
                var j = hiddenNeurons.indexOf(syn.ofin);
                if (j < 0 || !syn.weights || syn.weights.length !== gateCount) continue;
                for (var g = 0; g < gateCount; g++) {
                    var onnxGate = gateMap[g];
                    Rec[onnxGate * hiddenSize * hiddenSize + j * hiddenSize + i] = mapGateWeight(g, syn.weights[g]);
                }
                recurrentLinkCount++;
            }
        }

        if (recurrentLinkCount !== hiddenSize * hiddenSize) {
            throw new Error("Incomplete recurrent weights: found " + recurrentLinkCount + ", expected " + hiddenSize * hiddenSize + ".");
        }

        // B: [1, 2*gateCount*H]. Recurrent biases remain zero.
        var B = new Float32Array(2 * gateCount * hiddenSize);
        for (var j = 0; j < hiddenSize; j++) {
            var neuron = hiddenNeurons[j];
            if (isLstm) {
                // ONNX LSTM order: input, output, forget, candidate.
                B[0 * hiddenSize + j] = neuron.biasInput;
                B[1 * hiddenSize + j] = neuron.biasOutput;
                B[2 * hiddenSize + j] = neuron.biasForget;
                B[3 * hiddenSize + j] = neuron.biasCandidate;
            } else {
                // ONNX GRU order: update, reset, candidate. The update
                // pre-activation is negated to preserve SpikyPanda semantics.
                B[0 * hiddenSize + j] = -neuron.biasUpdate;
                B[1 * hiddenSize + j] = neuron.biasReset;
                B[2 * hiddenSize + j] = neuron.biasCandidate;
            }
        }

        // ---- Extract output layer weights ----
        // OutputNeurons are MlpNeurons with .bias and incoming Synapses with .weight
        var Wout = new Float32Array(outputSize * hiddenSize);
        var Bout = new Float32Array(outputSize);
        var outputLinkCount = 0;
        for (var o = 0; o < outputSize; o++) {
            var outN = outputNeurons[o];
            Bout[o] = outN.bias;
            // Incoming synapses from hidden neurons
            var outSynapses = typeof outN.opsc === "function" ? outN.opsc() : [];
            for (var si = 0; si < outSynapses.length; si++) {
                var syn = outSynapses[si];
                var h = hiddenNeurons.indexOf(syn.oini);
                if (h < 0 || typeof syn.weight !== "number") continue;
                Wout[o * hiddenSize + h] = syn.weight;
                outputLinkCount++;
            }
        }

        if (outputLinkCount !== outputSize * hiddenSize) {
            throw new Error("Incomplete output weights: found " + outputLinkCount + ", expected " + outputSize * hiddenSize + ".");
        }

        log("  Extracted: W[" + W.length + "], R[" + Rec.length + "], B[" + B.length + "], Wout[" + Wout.length + "], Bout[" + Bout.length + "]");

        // ---- Build ONNX model ----
        var model = {
            irVersion: 8,
            graphName: "motor_current_" + cellType,
            nodes: [],
            initializers: [],
            inputs: [],
            outputs: [],
            valueInfos: [],
        };

        // Preprocessing subgraph depends on export mode:
        //   "custom"   -> single com.dotvision.EnvelopeCenter node
        //   "standard" -> ReduceMean + Sub + Mul + Add + Clip (5 standard ops)
        //   "none"     -> no preprocessing, LSTM takes centered input directly
        var recurrentInputName = "envelope_seq"; // default: pre-centered

        if (mode === "custom") {
            model.nodes.push({
                name: "centering",
                opType: "EnvelopeCenter",
                domain: "com.dotvision",
                inputs: ["envelope_raw"],
                outputs: ["envelope_centered"],
                attributes: new Map([
                    ["gain", 6.0],
                    ["since_version", 1],
                ]),
                floatAttributeNames: new Set(["gain"]),
            });
            recurrentInputName = "envelope_centered_seq";
        } else if (mode === "standard") {
            // ReduceMean(axes=[0], keepdims=1): compute per-channel mean
            model.nodes.push({
                name: "reduce_mean",
                opType: "ReduceMean",
                inputs: ["envelope_raw"],
                outputs: ["env_mean"],
                attributes: new Map([["keepdims", 1]]),
                listAttributes: new Map([["axes", [0]]]),
            });
            // Sub: centered = raw - mean
            model.nodes.push({
                name: "sub_mean",
                opType: "Sub",
                inputs: ["envelope_raw", "env_mean"],
                outputs: ["env_centered"],
                attributes: new Map(),
            });
            // Mul: scaled = centered * gain
            model.nodes.push({
                name: "mul_gain",
                opType: "Mul",
                inputs: ["env_centered", "const_gain"],
                outputs: ["env_scaled"],
                attributes: new Map(),
            });
            // Add: shifted = scaled + 0.5
            model.nodes.push({
                name: "add_offset",
                opType: "Add",
                inputs: ["env_scaled", "const_half"],
                outputs: ["env_shifted"],
                attributes: new Map(),
            });
            // Clip: clamped = clip(shifted, 0, 1)
            model.nodes.push({
                name: "clip_01",
                opType: "Clip",
                inputs: ["env_shifted", "const_zero", "const_one"],
                outputs: ["envelope_centered"],
                attributes: new Map(),
            });
            // Constants for the standard ops
            model.initializers.push({ name: "const_gain", dataType: FLOAT, dims: [], floatData: new Float32Array([6.0]) });
            model.initializers.push({ name: "const_half", dataType: FLOAT, dims: [], floatData: new Float32Array([0.5]) });
            model.initializers.push({ name: "const_zero", dataType: FLOAT, dims: [], floatData: new Float32Array([0.0]) });
            model.initializers.push({ name: "const_one", dataType: FLOAT, dims: [], floatData: new Float32Array([1.0]) });
            recurrentInputName = "envelope_centered_seq";
        }
        // mode === "none": no preprocessing nodes, recurrentInputName stays "envelope_seq"

        // If preprocessing is present, add a Reshape to go from [64, 3] to [64, 1, 3]
        if (mode !== "none") {
            model.nodes.push({
                name: "reshape_to_seq",
                opType: "Reshape",
                inputs: ["envelope_centered", "reshape_seq_shape"],
                outputs: [recurrentInputName],
                attributes: new Map(),
            });
            model.initializers.push({
                name: "reshape_seq_shape",
                dataType: 7,
                dims: [3],
                rawData: new Uint8Array(new BigInt64Array([BigInt(sequenceLength), 1n, BigInt(inputSize)]).buffer),
            });
        }

        // Recurrent cell. SpikyPanda applies the reset gate after the
        // recurrent candidate projection, which is ONNX linear_before_reset=1.
        var recurrentAttributes = new Map([["hidden_size", hiddenSize]]);
        if (isGru) recurrentAttributes.set("linear_before_reset", 1);
        model.nodes.push({
            name: cellType,
            opType: recurrentOpType,
            inputs: [recurrentInputName, "W", "R", "B"],
            outputs: ["rnn_out", "rnn_h"],
            attributes: recurrentAttributes,
        });

        // Reshape final recurrent state from [1,1,H] to [1,H]
        model.nodes.push({
            name: "reshape",
            opType: "Reshape",
            inputs: ["rnn_h", "reshape_shape"],
            outputs: ["rnn_flat"],
            attributes: new Map(),
        });

        // Output layer: Gemm (Y = X * W^T + B)
        model.nodes.push({
            name: "output_gemm",
            opType: "Gemm",
            inputs: ["rnn_flat", "W_out", "B_out"],
            outputs: ["logits"],
            attributes: new Map([["transB", 1]]),
        });

        // Sigmoid
        model.nodes.push({
            name: "sigmoid",
            opType: "Sigmoid",
            inputs: ["logits"],
            outputs: ["probabilities"],
            attributes: new Map(),
        });

        // Initializers (weight tensors)
        model.initializers.push({ name: "W", dataType: FLOAT, dims: [1, gateCount * hiddenSize, inputSize], floatData: W });
        model.initializers.push({ name: "R", dataType: FLOAT, dims: [1, gateCount * hiddenSize, hiddenSize], floatData: Rec });
        model.initializers.push({ name: "B", dataType: FLOAT, dims: [1, 2 * gateCount * hiddenSize], floatData: B });
        model.initializers.push({ name: "W_out", dataType: FLOAT, dims: [outputSize, hiddenSize], floatData: Wout });
        model.initializers.push({ name: "B_out", dataType: FLOAT, dims: [outputSize], floatData: Bout });
        model.initializers.push({
            name: "reshape_shape",
            dataType: 7, // INT64
            dims: [2],
            rawData: new Uint8Array(new BigInt64Array([1n, BigInt(hiddenSize)]).buffer),
        });

        // Graph inputs (depend on mode)
        if (mode !== "none") {
            // Modes "custom" and "standard": input is uncentered envelope [64, 3]
            model.inputs.push({ name: "envelope_raw", type: 0, elemType: FLOAT, shape: [sequenceLength, inputSize] });
        } else {
            // Mode "none": input is pre-centered and already sequence-shaped.
            model.inputs.push({ name: "envelope_seq", type: 0, elemType: FLOAT, shape: [sequenceLength, 1, inputSize] });
        }
        // Graph outputs
        model.outputs.push({ name: "probabilities", type: 0, elemType: FLOAT, shape: [1, outputSize] });

        // Intermediate value infos
        if (mode !== "none") {
            model.valueInfos.push({ name: "envelope_centered", type: 0, elemType: FLOAT, shape: [sequenceLength, inputSize] });
            model.valueInfos.push({ name: "envelope_centered_seq", type: 0, elemType: FLOAT, shape: [sequenceLength, 1, inputSize] });
        }
        if (mode === "standard") {
            model.valueInfos.push({ name: "env_mean", type: 0, elemType: FLOAT, shape: [1, inputSize] });
            model.valueInfos.push({ name: "env_centered", type: 0, elemType: FLOAT, shape: [sequenceLength, inputSize] });
            model.valueInfos.push({ name: "env_scaled", type: 0, elemType: FLOAT, shape: [sequenceLength, inputSize] });
            model.valueInfos.push({ name: "env_shifted", type: 0, elemType: FLOAT, shape: [sequenceLength, inputSize] });
        }
        model.valueInfos.push({ name: "rnn_out", type: 0, elemType: FLOAT, shape: [sequenceLength, 1, 1, hiddenSize] });
        model.valueInfos.push({ name: "rnn_h", type: 0, elemType: FLOAT, shape: [1, 1, hiddenSize] });
        model.valueInfos.push({ name: "rnn_flat", type: 0, elemType: FLOAT, shape: [1, hiddenSize] });
        model.valueInfos.push({ name: "logits", type: 0, elemType: FLOAT, shape: [1, outputSize] });

        return R.OnnxWriter.serialize(model);
    }

    const savedCheckpoint = readLatestCheckpoint();
    if (savedCheckpoint) {
        try {
            restoreCheckpoint(savedCheckpoint, true);
        } catch (e) {
            log("WARNING: saved checkpoint could not be restored: " + e.message);
        }
    }
})();
