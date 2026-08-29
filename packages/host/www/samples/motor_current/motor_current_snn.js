// SpikyPanda motor-current SNN adapter.
//
// The observation-to-spike boundary is a real RuntimeGraph node. Offline
// training uses the same WaveSpikeEncoder kernel and Session inference uses
// WaveSpikeSensorNode, so filter and phase-crossing behavior cannot diverge.
(function (root) {
    "use strict";

    const S = root.SpikypandaCore;
    if (!S) throw new Error("SpikypandaCore must be loaded before motor_current_snn.js.");

    const DEFAULT_SAMPLE_RATE_HZ = 60;
    const DEFAULT_PERCENTILE = 0.85;
    const MULTILEVEL_PERCENTILES = [0.55, 0.75, 0.9];
    const SENSOR_ENCODING_PHASE_BINARY = "phase-binary";
    const SENSOR_ENCODING_PHASE_AMPLITUDE = "phase-amplitude";
    const SENSOR_ENCODING_PHASE_MULTILEVEL = "phase-multilevel";
    const FREQUENCY_SELECTION_MULTICLASS = "multiclass";
    const FREQUENCY_SELECTION_TARGETED_PAIR = "targeted-pair";
    const TOPOLOGY_DENSE = "dense";
    const TOPOLOGY_DENSE_RECURRENT = "dense-recurrent";
    const TOPOLOGY_PHASE_FUSION = "phase-fusion";
    const TOPOLOGY_PHASE_DELAY_FUSION = "phase-delay-fusion";
    const RECURRENT_CORE_VERSION = "sparse-ring-delay-v1";
    const DEFAULT_RECURRENT_FAN_IN = 4;
    const DEFAULT_RECURRENT_DELAY_TICKS = 1;
    const PHASE_DELAY_CORE_VERSION = "fixed-phase-delay-bank-v1";
    const DEFAULT_PHASE_DELAY_TICKS = [0, 1, 2, 4];
    const TEMPORAL_POLICY = "per-branch-4-8-16-32dt-v1";
    const SENSOR_PHENOTYPE_VERSION = "wave-cell-phenotype-v1";
    const RECEPTIVE_FIELD_TRAINING_VERSION = "supervised-soft-biquad-fisher-grid-v1";
    const SPIKE_ALIGNED_RECEPTIVE_FIELD_TRAINING_VERSION = "supervised-soft-phase-spike-fisher-grid-v1";
    const SPIKE_SURROGATE_TRACE_TAU_SAMPLES = [4, 8, 16, 32];
    const SPIKE_SURROGATE_TEMPERATURE_RATIO = 0.12;
    const SPIKE_SURROGATE_REDUNDANCY_WEIGHT = 1;
    const EARLY_LOSS_WEIGHT = 0.05;
    const RUNTIME_DECODER_OBJECTIVE_VERSION = "runtime-decoder-cross-entropy-v1";
    const FRAME_END_SLOT = S.WAVE_FRAME_END_OUTPUT_SLOT || "frame-end";
    const OBSERVATION_SLOT = S.WAVE_OBSERVATION_INPUT_SLOT || "observation";

    class MotorCurrentObservationSource extends S.RuntimeNode {
        constructor() {
            super();
            this.id = "snn:motor-current-observation";
            this.type = "sample.motor-current.observation-source";
            this.observation = { timestamp: 0, values: [] };
            this.inputPorts = [];
            this.outputPorts = [
                {
                    slot: OBSERVATION_SLOT,
                    optional: true,
                    type: "wave-observation",
                    kind: "stream",
                    capacity: 1024,
                },
            ];
        }

        fire(session) {
            this.publishAll(session, OBSERVATION_SLOT, this.observation);
        }
    }

    function createSensorConfig(options) {
        const sampleRateHz = positiveOr(options.sampleRateHz, DEFAULT_SAMPLE_RATE_HZ);
        const channelCount = Math.max(1, Math.floor(options.channelCount || 3));
        const encodingMode = normalizeEncodingMode(options.encodingMode);
        const frequenciesHz = (options.frequenciesHz || defaultFrequencies(options.signalDomain, options.lineFrequencyHz)).filter(function (frequency) {
            return Number.isFinite(frequency) && frequency > 0 && frequency < sampleRateHz / 2;
        });
        const bandwidthsHz = Array.isArray(options.bandwidthsHz) ? options.bandwidthsHz : [];
        if (frequenciesHz.length === 0) throw new Error("The wave sensor has no frequency below Nyquist.");

        const bands = [];
        for (let channel = 0; channel < channelCount; channel++) {
            for (let frequencyIndex = 0; frequencyIndex < frequenciesHz.length; frequencyIndex++) {
                const centerFrequencyHz = frequenciesHz[frequencyIndex];
                bands.push({
                    id: "i" + channel + "-f" + formatBandId(centerFrequencyHz),
                    channel: channel,
                    centerFrequencyHz: centerFrequencyHz,
                    bandwidthHz: positiveOr(bandwidthsHz[frequencyIndex], bandwidthOf(centerFrequencyHz, options.signalDomain)),
                    threshold: 0,
                    thresholds: [0],
                    polarity: "both",
                    amplitudeMode: encodingMode === SENSOR_ENCODING_PHASE_AMPLITUDE ? "normalized-peak" : "binary",
                    spikeAmplitude: 1,
                });
            }
        }
        return {
            sampleRateHz: sampleRateHz,
            bands: bands,
            emitFrameEnd: true,
            diagnostics: false,
        };
    }

    function calibrateSensor(samples, sensorConfig, percentile, encodingMode) {
        const mode = normalizeEncodingMode(encodingMode);
        const q = clamp(percentile === undefined ? DEFAULT_PERCENTILE : percentile, 0.5, 0.99);
        const calibrationConfig = copySensorConfig(sensorConfig);
        for (let band = 0; band < calibrationConfig.bands.length; band++) {
            calibrationConfig.bands[band].threshold = 0;
            calibrationConfig.bands[band].thresholds = [0];
            calibrationConfig.bands[band].amplitudeMode = "binary";
        }
        const peaks = calibrationConfig.bands.map(function () {
            return [];
        });
        const bandIndexById = new Map();
        calibrationConfig.bands.forEach(function (band, index) {
            bandIndexById.set(band.id, index);
        });

        for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
            const encoder = new S.WaveSpikeEncoder(calibrationConfig);
            const state = encoder.createState();
            const sequence = samples[sampleIndex].sequence || [];
            for (let timestep = 0; timestep < sequence.length; timestep++) {
                const emissions = encoder.encode(
                    {
                        timestamp: timestep / calibrationConfig.sampleRateHz,
                        values: sequence[timestep],
                    },
                    state
                );
                for (let event = 0; event < emissions.length; event++) {
                    const index = bandIndexById.get(emissions[event].bandId);
                    if (index !== undefined && Number.isFinite(emissions[event].peakAmplitude)) peaks[index].push(emissions[event].peakAmplitude);
                }
            }
        }

        const calibrated = copySensorConfig(sensorConfig);
        for (let band = 0; band < calibrated.bands.length; band++) {
            const values = peaks[band];
            values.sort(function (left, right) {
                return left - right;
            });
            const percentiles = mode === SENSOR_ENCODING_PHASE_MULTILEVEL ? MULTILEVEL_PERCENTILES : [q];
            const thresholds = percentiles.map(function (level) {
                return values.length === 0 ? 1e-4 : Math.max(1e-6, quantileSorted(values, level));
            });
            calibrated.bands[band].threshold = thresholds[0];
            calibrated.bands[band].thresholds = thresholds;
            calibrated.bands[band].amplitudeMode = mode === SENSOR_ENCODING_PHASE_AMPLITUDE ? "normalized-peak" : "binary";
        }
        return calibrated;
    }

    function selectFrequencyBands(samples, sampleRateHz, options) {
        const settings = options || {};
        const desiredCount = Math.max(1, Math.floor(settings.count || 3));
        const selectionStrategy = settings.strategy === FREQUENCY_SELECTION_TARGETED_PAIR ? FREQUENCY_SELECTION_TARGETED_PAIR : FREQUENCY_SELECTION_MULTICLASS;
        const targetLabels = Array.isArray(settings.targetLabels)
            ? settings.targetLabels.filter(function (label, index, labels) {
                  return Number.isInteger(label) && label >= 0 && labels.indexOf(label) === index;
              })
            : [];
        const targetedCount = Math.min(desiredCount, Math.max(0, Math.floor(settings.targetedCount || 1)));
        if (selectionStrategy === FREQUENCY_SELECTION_TARGETED_PAIR && targetLabels.length !== 2) {
            throw new Error("Targeted pair frequency selection requires exactly two class labels.");
        }
        if (settings.signalDomain === "raw-current") {
            return defaultFrequencies("raw-current", settings.lineFrequencyHz).map(function (frequencyHz) {
                return {
                    frequencyHz: frequencyHz,
                    score: null,
                    selectionScore: null,
                    selectionObjective: "physical-default",
                    bin: null,
                    source: "physical-default",
                };
            });
        }
        if (!samples.length || !samples[0].sequence || samples[0].sequence.length < 4) return [];

        const sampleCount = samples[0].sequence.length;
        const channelCount = Math.max(1, samples[0].sequence[0].length);
        const minFrequencyHz = positiveOr(settings.minFrequencyHz, 1.5);
        const maxFrequencyHz = Math.min(positiveOr(settings.maxFrequencyHz, 8), sampleRateHz * 0.45);
        const minBin = Math.max(1, Math.ceil((minFrequencyHz * sampleCount) / sampleRateHz));
        const maxBin = Math.min(Math.floor(sampleCount / 2) - 1, Math.floor((maxFrequencyHz * sampleCount) / sampleRateHz));
        const classCount = samples.reduce(function (maximum, sample) {
            return Math.max(maximum, Number.isInteger(sample.label) ? sample.label + 1 : 0);
        }, 0);
        const candidates = [];

        for (let bin = minBin; bin <= maxBin; bin++) {
            const cosine = new Array(sampleCount);
            const sine = new Array(sampleCount);
            for (let timestep = 0; timestep < sampleCount; timestep++) {
                const angle = (2 * Math.PI * bin * timestep) / sampleCount;
                cosine[timestep] = Math.cos(angle);
                sine[timestep] = Math.sin(angle);
            }
            const byClass = Array.from({ length: classCount }, function () {
                return {
                    count: 0,
                    sum: new Array(channelCount).fill(0),
                    sumSquares: new Array(channelCount).fill(0),
                };
            });
            const globalSum = new Array(channelCount).fill(0);
            let validSamples = 0;

            for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
                const sample = samples[sampleIndex];
                if (!Number.isInteger(sample.label) || !byClass[sample.label] || sample.sequence.length !== sampleCount) continue;
                const magnitudes = dftMagnitudes(sample.sequence, channelCount, cosine, sine);
                const aggregate = byClass[sample.label];
                aggregate.count++;
                validSamples++;
                for (let channel = 0; channel < channelCount; channel++) {
                    const magnitude = magnitudes[channel];
                    aggregate.sum[channel] += magnitude;
                    aggregate.sumSquares[channel] += magnitude * magnitude;
                    globalSum[channel] += magnitude;
                }
            }

            let between = 0;
            let within = 0;
            for (let channel = 0; channel < channelCount; channel++) {
                const globalMean = globalSum[channel] / Math.max(1, validSamples);
                for (let label = 0; label < byClass.length; label++) {
                    const aggregate = byClass[label];
                    if (aggregate.count === 0) continue;
                    const classMean = aggregate.sum[channel] / aggregate.count;
                    between += aggregate.count * (classMean - globalMean) * (classMean - globalMean);
                    within += Math.max(0, aggregate.sumSquares[channel] - aggregate.count * classMean * classMean);
                }
            }
            const multiclassScore = between / Math.max(within, 1e-12);
            const targetedScore = selectionStrategy === FREQUENCY_SELECTION_TARGETED_PAIR ? fisherScoreForLabels(byClass, targetLabels, channelCount) : null;
            candidates.push({
                frequencyHz: (bin * sampleRateHz) / sampleCount,
                score: multiclassScore,
                multiclassScore: multiclassScore,
                targetedScore: targetedScore,
                selectionScore: multiclassScore,
                selectionObjective: FREQUENCY_SELECTION_MULTICLASS,
                bin: bin,
                source: "train-fisher-dft",
            });
        }

        candidates.sort(function (left, right) {
            return right.score - left.score || left.bin - right.bin;
        });
        const selected = [];

        if (selectionStrategy === FREQUENCY_SELECTION_TARGETED_PAIR) {
            const targetedCandidates = candidates.slice().sort(function (left, right) {
                return right.targetedScore - left.targetedScore || left.bin - right.bin;
            });
            for (let candidateIndex = 0; candidateIndex < targetedCandidates.length && selected.length < targetedCount; candidateIndex++) {
                const candidate = targetedCandidates[candidateIndex];
                if (
                    selected.every(function (chosen) {
                        return Math.abs(chosen.bin - candidate.bin) >= 2;
                    })
                ) {
                    candidate.selectionScore = candidate.targetedScore;
                    candidate.selectionObjective = "pair-" + targetLabels[0] + "-" + targetLabels[1];
                    candidate.source = "train-fisher-pair-dft";
                    selected.push(candidate);
                }
            }
        }

        for (let candidateIndex = 0; candidateIndex < candidates.length && selected.length < desiredCount; candidateIndex++) {
            const candidate = candidates[candidateIndex];
            if (selected.indexOf(candidate) >= 0) continue;
            if (
                selected.every(function (chosen) {
                    return chosen.selectionObjective.indexOf("pair-") === 0 || Math.abs(chosen.bin - candidate.bin) >= 2;
                })
            ) {
                selected.push(candidate);
            }
        }
        for (let candidateIndex = 0; candidateIndex < candidates.length && selected.length < desiredCount; candidateIndex++) {
            if (selected.indexOf(candidates[candidateIndex]) < 0) selected.push(candidates[candidateIndex]);
        }
        selected.sort(function (left, right) {
            return left.frequencyHz - right.frequencyHz;
        });
        return selected;
    }

    function trainReceptiveFields(samples, sampleRateHz, selectedBands, options) {
        const settings = options || {};
        if (!Array.isArray(samples) || samples.length === 0) throw new Error("Receptive-field training requires non-empty training samples.");
        if (!Array.isArray(selectedBands) || selectedBands.length === 0) throw new Error("Receptive-field training requires initial frequency bands.");
        const minFrequencyHz = positiveOr(settings.minFrequencyHz, 1.5);
        const maxFrequencyHz = Math.min(positiveOr(settings.maxFrequencyHz, 8), sampleRateHz * 0.45);
        const rounds = Math.max(1, Math.floor(settings.rounds || 3));
        const signalDomain = settings.signalDomain || "envelope";
        const ordered = selectedBands
            .map(function (band, index) {
                return { band: band, originalIndex: index };
            })
            .sort(function (left, right) {
                return left.band.frequencyHz - right.band.frequencyHz;
            });
        const fields = [];

        for (let orderedIndex = 0; orderedIndex < ordered.length; orderedIndex++) {
            const initialCenterHz = ordered[orderedIndex].band.frequencyHz;
            const initialBandwidthHz = bandwidthOf(initialCenterHz, signalDomain);
            const previousCenterHz = orderedIndex === 0 ? minFrequencyHz : ordered[orderedIndex - 1].band.frequencyHz;
            const nextCenterHz = orderedIndex === ordered.length - 1 ? maxFrequencyHz : ordered[orderedIndex + 1].band.frequencyHz;
            const centerMinimumHz = orderedIndex === 0 ? minFrequencyHz : (previousCenterHz + initialCenterHz) / 2;
            const centerMaximumHz = orderedIndex === ordered.length - 1 ? maxFrequencyHz : (initialCenterHz + nextCenterHz) / 2;
            const frequencyResolutionHz = sampleRateHz / samples[0].sequence.length;
            const bandwidthMinimumHz = Math.max(frequencyResolutionHz * 0.4, 0.25);
            const bandwidthMaximumHz = Math.min(maxFrequencyHz - minFrequencyHz, Math.max(initialBandwidthHz * 2, frequencyResolutionHz));
            const scoreCache = new Map();
            let evaluations = 0;

            function score(centerFrequencyHz, bandwidthHz) {
                const key = centerFrequencyHz.toFixed(9) + ":" + bandwidthHz.toFixed(9);
                if (!scoreCache.has(key)) {
                    scoreCache.set(key, softBandpassFisherScore(samples, sampleRateHz, centerFrequencyHz, bandwidthHz));
                    evaluations++;
                }
                return scoreCache.get(key);
            }

            const initialScore = score(initialCenterHz, initialBandwidthHz);
            let bestCenterHz = initialCenterHz;
            let bestBandwidthHz = initialBandwidthHz;
            let bestScore = initialScore;
            let centerStepHz = Math.max(frequencyResolutionHz / 8, (centerMaximumHz - centerMinimumHz) / 4);
            let bandwidthStepHz = Math.max(frequencyResolutionHz / 8, initialBandwidthHz / 4);

            for (let round = 0; round < rounds; round++) {
                const centerCandidates = uniqueClampedCandidates(bestCenterHz, centerStepHz, centerMinimumHz, centerMaximumHz);
                const bandwidthCandidates = uniqueClampedCandidates(bestBandwidthHz, bandwidthStepHz, bandwidthMinimumHz, bandwidthMaximumHz);
                for (let centerIndex = 0; centerIndex < centerCandidates.length; centerIndex++) {
                    for (let bandwidthIndex = 0; bandwidthIndex < bandwidthCandidates.length; bandwidthIndex++) {
                        const candidateCenterHz = centerCandidates[centerIndex];
                        const candidateBandwidthHz = bandwidthCandidates[bandwidthIndex];
                        const candidateScore = score(candidateCenterHz, candidateBandwidthHz);
                        if (
                            candidateScore > bestScore + 1e-12 ||
                            (Math.abs(candidateScore - bestScore) <= 1e-12 &&
                                Math.abs(candidateCenterHz - initialCenterHz) + Math.abs(candidateBandwidthHz - initialBandwidthHz) <
                                    Math.abs(bestCenterHz - initialCenterHz) + Math.abs(bestBandwidthHz - initialBandwidthHz))
                        ) {
                            bestCenterHz = candidateCenterHz;
                            bestBandwidthHz = candidateBandwidthHz;
                            bestScore = candidateScore;
                        }
                    }
                }
                centerStepHz /= 2;
                bandwidthStepHz /= 2;
            }

            fields.push({
                originalIndex: ordered[orderedIndex].originalIndex,
                initialCenterFrequencyHz: initialCenterHz,
                initialBandwidthHz: initialBandwidthHz,
                centerFrequencyHz: bestCenterHz,
                bandwidthHz: bestBandwidthHz,
                initialFisherScore: initialScore,
                trainedFisherScore: bestScore,
                centerMinimumHz: centerMinimumHz,
                centerMaximumHz: centerMaximumHz,
                bandwidthMinimumHz: bandwidthMinimumHz,
                bandwidthMaximumHz: bandwidthMaximumHz,
                evaluations: evaluations,
            });
        }

        fields.sort(function (left, right) {
            return left.originalIndex - right.originalIndex;
        });
        return {
            version: RECEPTIVE_FIELD_TRAINING_VERSION,
            objective: "multiclass-fisher-of-causal-biquad-rms-v1",
            optimizer: "deterministic-local-grid-v1",
            rounds: rounds,
            trainingSampleCount: samples.length,
            validationSamplesUsed: 0,
            testSamplesUsed: 0,
            fields: fields,
        };
    }

    function trainSpikeAlignedReceptiveFields(samples, sampleRateHz, selectedBands, options) {
        const settings = options || {};
        if (!Array.isArray(samples) || samples.length === 0) throw new Error("Spike-aligned receptive-field training requires non-empty training samples.");
        if (!Array.isArray(selectedBands) || selectedBands.length === 0) {
            throw new Error("Spike-aligned receptive-field training requires initial frequency bands.");
        }
        const minFrequencyHz = positiveOr(settings.minFrequencyHz, 1.5);
        const maxFrequencyHz = Math.min(positiveOr(settings.maxFrequencyHz, 8), sampleRateHz * 0.45);
        const rounds = Math.max(1, Math.floor(settings.rounds || 3));
        const signalDomain = settings.signalDomain || "envelope";
        const temperatureRatio = positiveOr(settings.temperatureRatio, SPIKE_SURROGATE_TEMPERATURE_RATIO);
        const redundancyWeight = Math.max(0, Number.isFinite(settings.redundancyWeight) ? settings.redundancyWeight : SPIKE_SURROGATE_REDUNDANCY_WEIGHT);
        const traceTauSamples = Array.isArray(settings.traceTauSamples)
            ? settings.traceTauSamples.filter(function (value) {
                  return Number.isFinite(value) && value > 0;
              })
            : SPIKE_SURROGATE_TRACE_TAU_SAMPLES.slice();
        if (traceTauSamples.length === 0) throw new Error("Spike-aligned receptive-field training requires at least one positive trace time constant.");

        const ordered = selectedBands
            .map(function (band, index) {
                return { band: band, originalIndex: index };
            })
            .sort(function (left, right) {
                return left.band.frequencyHz - right.band.frequencyHz;
            });
        const selectedSoftFeatureBanks = [];
        const fields = [];

        for (let orderedIndex = 0; orderedIndex < ordered.length; orderedIndex++) {
            const initialCenterHz = ordered[orderedIndex].band.frequencyHz;
            const initialBandwidthHz = bandwidthOf(initialCenterHz, signalDomain);
            const previousCenterHz = orderedIndex === 0 ? minFrequencyHz : ordered[orderedIndex - 1].band.frequencyHz;
            const nextCenterHz = orderedIndex === ordered.length - 1 ? maxFrequencyHz : ordered[orderedIndex + 1].band.frequencyHz;
            const centerMinimumHz = orderedIndex === 0 ? minFrequencyHz : (previousCenterHz + initialCenterHz) / 2;
            const centerMaximumHz = orderedIndex === ordered.length - 1 ? maxFrequencyHz : (initialCenterHz + nextCenterHz) / 2;
            const frequencyResolutionHz = sampleRateHz / samples[0].sequence.length;
            const bandwidthMinimumHz = Math.max(frequencyResolutionHz * 0.4, 0.25);
            const bandwidthMaximumHz = Math.min(maxFrequencyHz - minFrequencyHz, Math.max(initialBandwidthHz * 2, frequencyResolutionHz));
            const scoreCache = new Map();
            let evaluations = 0;

            function score(centerFrequencyHz, bandwidthHz) {
                const key = centerFrequencyHz.toFixed(9) + ":" + bandwidthHz.toFixed(9);
                if (!scoreCache.has(key)) {
                    const summary = softPhaseSpikeFieldSummary(samples, sampleRateHz, centerFrequencyHz, bandwidthHz, {
                        temperatureRatio: temperatureRatio,
                        traceTauSamples: traceTauSamples,
                    });
                    const redundancy = meanFeatureRedundancy(summary.softFeatures, selectedSoftFeatureBanks);
                    const discrimination = 0.75 * summary.softFisherScore + 0.25 * summary.hardFisherScore;
                    scoreCache.set(key, {
                        objectiveScore: discrimination / (1 + redundancyWeight * redundancy),
                        softFisherScore: summary.softFisherScore,
                        hardFisherScore: summary.hardFisherScore,
                        redundancy: redundancy,
                        hardEventsPerSample: summary.hardEventsPerSample,
                    });
                    evaluations++;
                }
                return scoreCache.get(key);
            }

            const initialSummary = score(initialCenterHz, initialBandwidthHz);
            let bestCenterHz = initialCenterHz;
            let bestBandwidthHz = initialBandwidthHz;
            let bestSummary = initialSummary;
            let centerStepHz = Math.max(frequencyResolutionHz / 8, (centerMaximumHz - centerMinimumHz) / 4);
            let bandwidthStepHz = Math.max(frequencyResolutionHz / 8, initialBandwidthHz / 4);

            for (let round = 0; round < rounds; round++) {
                const centerCandidates = uniqueClampedCandidates(bestCenterHz, centerStepHz, centerMinimumHz, centerMaximumHz);
                const bandwidthCandidates = uniqueClampedCandidates(bestBandwidthHz, bandwidthStepHz, bandwidthMinimumHz, bandwidthMaximumHz);
                for (let centerIndex = 0; centerIndex < centerCandidates.length; centerIndex++) {
                    for (let bandwidthIndex = 0; bandwidthIndex < bandwidthCandidates.length; bandwidthIndex++) {
                        const candidateCenterHz = centerCandidates[centerIndex];
                        const candidateBandwidthHz = bandwidthCandidates[bandwidthIndex];
                        const candidateSummary = score(candidateCenterHz, candidateBandwidthHz);
                        if (
                            candidateSummary.objectiveScore > bestSummary.objectiveScore + 1e-12 ||
                            (Math.abs(candidateSummary.objectiveScore - bestSummary.objectiveScore) <= 1e-12 &&
                                Math.abs(candidateCenterHz - initialCenterHz) + Math.abs(candidateBandwidthHz - initialBandwidthHz) <
                                    Math.abs(bestCenterHz - initialCenterHz) + Math.abs(bestBandwidthHz - initialBandwidthHz))
                        ) {
                            bestCenterHz = candidateCenterHz;
                            bestBandwidthHz = candidateBandwidthHz;
                            bestSummary = candidateSummary;
                        }
                    }
                }
                centerStepHz /= 2;
                bandwidthStepHz /= 2;
            }

            const finalDetails = softPhaseSpikeFieldSummary(samples, sampleRateHz, bestCenterHz, bestBandwidthHz, {
                temperatureRatio: temperatureRatio,
                traceTauSamples: traceTauSamples,
            });
            selectedSoftFeatureBanks.push(finalDetails.softFeatures);
            fields.push({
                originalIndex: ordered[orderedIndex].originalIndex,
                initialCenterFrequencyHz: initialCenterHz,
                initialBandwidthHz: initialBandwidthHz,
                centerFrequencyHz: bestCenterHz,
                bandwidthHz: bestBandwidthHz,
                initialObjectiveScore: initialSummary.objectiveScore,
                trainedObjectiveScore: bestSummary.objectiveScore,
                initialSoftFisherScore: initialSummary.softFisherScore,
                trainedSoftFisherScore: bestSummary.softFisherScore,
                initialHardFisherScore: initialSummary.hardFisherScore,
                trainedHardFisherScore: bestSummary.hardFisherScore,
                initialRedundancy: initialSummary.redundancy,
                trainedRedundancy: bestSummary.redundancy,
                initialHardEventsPerSample: initialSummary.hardEventsPerSample,
                trainedHardEventsPerSample: bestSummary.hardEventsPerSample,
                thresholdsByChannel: finalDetails.thresholdsByChannel,
                centerMinimumHz: centerMinimumHz,
                centerMaximumHz: centerMaximumHz,
                bandwidthMinimumHz: bandwidthMinimumHz,
                bandwidthMaximumHz: bandwidthMaximumHz,
                evaluations: evaluations,
            });
        }

        fields.sort(function (left, right) {
            return left.originalIndex - right.originalIndex;
        });
        return {
            version: SPIKE_ALIGNED_RECEPTIVE_FIELD_TRAINING_VERSION,
            objective: "multiclass-fisher-of-soft-phase-threshold-traces-v1",
            optimizer: "deterministic-local-grid-with-redundancy-v1",
            rounds: rounds,
            temperatureRatio: temperatureRatio,
            traceTauSamples: traceTauSamples.slice(),
            traceTauSeconds: traceTauSamples.map(function (tauSamples) {
                return tauSamples / sampleRateHz;
            }),
            redundancyWeight: redundancyWeight,
            trainingSampleCount: samples.length,
            validationSamplesUsed: 0,
            testSamplesUsed: 0,
            fields: fields,
        };
    }

    function softPhaseSpikeFieldSummary(samples, sampleRateHz, centerFrequencyHz, bandwidthHz, options) {
        const settings = options || {};
        const temperatureRatio = positiveOr(settings.temperatureRatio, SPIKE_SURROGATE_TEMPERATURE_RATIO);
        const traceTauSamples = settings.traceTauSamples;
        const channelCount = Math.max(1, samples[0].sequence[0].length);
        const coefficients = localBandPassCoefficients(sampleRateHz, centerFrequencyHz, bandwidthHz);
        const eventsBySample = [];
        const peaksByChannel = Array.from({ length: channelCount }, function () {
            return [];
        });

        for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
            const sample = samples[sampleIndex];
            const events = phaseCrossingPeaks(sample.sequence, channelCount, coefficients);
            eventsBySample.push(events);
            for (let channel = 0; channel < channelCount; channel++) {
                for (let eventIndex = 0; eventIndex < events[channel].length; eventIndex++) {
                    peaksByChannel[channel].push(events[channel][eventIndex].peakAmplitude);
                }
            }
        }

        const thresholdsByChannel = peaksByChannel.map(function (values) {
            values.sort(function (left, right) {
                return left - right;
            });
            return MULTILEVEL_PERCENTILES.map(function (percentile) {
                return values.length === 0 ? 1e-4 : Math.max(1e-6, quantileSorted(values, percentile));
            });
        });
        const featureCount = channelCount * 2 * MULTILEVEL_PERCENTILES.length * traceTauSamples.length;
        const softFeatures = [];
        const hardFeatures = [];
        let hardEvents = 0;

        for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
            const sequenceLength = samples[sampleIndex].sequence.length;
            const soft = new Array(featureCount).fill(0);
            const hard = new Array(featureCount).fill(0);
            const events = eventsBySample[sampleIndex];
            for (let channel = 0; channel < channelCount; channel++) {
                const thresholds = thresholdsByChannel[channel];
                for (let eventIndex = 0; eventIndex < events[channel].length; eventIndex++) {
                    const event = events[channel][eventIndex];
                    for (let thresholdLevel = 0; thresholdLevel < thresholds.length; thresholdLevel++) {
                        const threshold = thresholds[thresholdLevel];
                        const temperature = Math.max(1e-6, threshold * temperatureRatio);
                        const softGate = stableSigmoid((event.peakAmplitude - threshold) / temperature);
                        const hardGate = event.peakAmplitude >= threshold ? 1 : 0;
                        if (hardGate) hardEvents++;
                        for (let tauIndex = 0; tauIndex < traceTauSamples.length; tauIndex++) {
                            const ageSamples = Math.max(0, sequenceLength - event.timestep);
                            const trace = Math.exp(-ageSamples / traceTauSamples[tauIndex]);
                            const featureIndex = ((channel * 2 + event.polarityIndex) * thresholds.length + thresholdLevel) * traceTauSamples.length + tauIndex;
                            soft[featureIndex] += softGate * trace;
                            hard[featureIndex] += hardGate * trace;
                        }
                    }
                }
            }
            softFeatures.push(soft);
            hardFeatures.push(hard);
        }

        return {
            softFisherScore: fisherScoreOfFeatureMatrix(samples, softFeatures),
            hardFisherScore: fisherScoreOfFeatureMatrix(samples, hardFeatures),
            hardEventsPerSample: hardEvents / Math.max(1, samples.length),
            thresholdsByChannel: thresholdsByChannel,
            softFeatures: softFeatures,
        };
    }

    function phaseCrossingPeaks(sequence, channelCount, coefficients) {
        const events = Array.from({ length: channelCount }, function () {
            return [];
        });
        if (!Array.isArray(sequence) || sequence.length < 3) return events;
        for (let channel = 0; channel < channelCount; channel++) {
            const first = Number.isFinite(sequence[0][channel]) ? sequence[0][channel] : 0;
            let x1 = first;
            let x2 = first;
            let y1 = 0;
            let y2 = 0;
            let previousY = 0;
            let peakAmplitude = 0;
            let initialized = false;
            for (let timestep = 1; timestep < sequence.length; timestep++) {
                const input = Number.isFinite(sequence[timestep][channel]) ? sequence[timestep][channel] : 0;
                const output = coefficients.b0 * input + coefficients.b1 * x1 + coefficients.b2 * x2 - coefficients.a1 * y1 - coefficients.a2 * y2;
                x2 = x1;
                x1 = input;
                y2 = y1;
                y1 = output;
                if (!initialized) {
                    initialized = true;
                    previousY = output;
                    peakAmplitude = Math.abs(output);
                    continue;
                }
                const polarityIndex = previousY <= 0 && output > 0 ? 0 : previousY >= 0 && output < 0 ? 1 : -1;
                if (polarityIndex >= 0) {
                    events[channel].push({
                        timestep: timestep,
                        polarityIndex: polarityIndex,
                        peakAmplitude: peakAmplitude,
                    });
                    peakAmplitude = Math.abs(output);
                } else {
                    peakAmplitude = Math.max(peakAmplitude, Math.abs(output));
                }
                previousY = output;
            }
        }
        return events;
    }

    function fisherScoreOfFeatureMatrix(samples, features) {
        if (features.length === 0 || features[0].length === 0) return 0;
        const featureCount = features[0].length;
        const classCount = samples.reduce(function (maximum, sample) {
            return Math.max(maximum, Number.isInteger(sample.label) ? sample.label + 1 : 0);
        }, 0);
        const byClass = Array.from({ length: classCount }, function () {
            return {
                count: 0,
                sum: new Array(featureCount).fill(0),
                sumSquares: new Array(featureCount).fill(0),
            };
        });
        const globalSum = new Array(featureCount).fill(0);
        let validSamples = 0;
        for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
            const label = samples[sampleIndex].label;
            if (!Number.isInteger(label) || !byClass[label]) continue;
            const aggregate = byClass[label];
            const row = features[sampleIndex];
            aggregate.count++;
            validSamples++;
            for (let feature = 0; feature < featureCount; feature++) {
                const value = row[feature];
                aggregate.sum[feature] += value;
                aggregate.sumSquares[feature] += value * value;
                globalSum[feature] += value;
            }
        }
        let between = 0;
        let within = 0;
        for (let feature = 0; feature < featureCount; feature++) {
            const globalMean = globalSum[feature] / Math.max(1, validSamples);
            for (let label = 0; label < byClass.length; label++) {
                const aggregate = byClass[label];
                if (aggregate.count === 0) continue;
                const classMean = aggregate.sum[feature] / aggregate.count;
                between += aggregate.count * (classMean - globalMean) * (classMean - globalMean);
                within += Math.max(0, aggregate.sumSquares[feature] - aggregate.count * classMean * classMean);
            }
        }
        return between / Math.max(within, 1e-12);
    }

    function meanFeatureRedundancy(candidateFeatures, selectedFeatureBanks) {
        if (selectedFeatureBanks.length === 0 || candidateFeatures.length === 0) return 0;
        let total = 0;
        for (let bankIndex = 0; bankIndex < selectedFeatureBanks.length; bankIndex++) {
            total += meanAbsoluteFeatureCorrelation(candidateFeatures, selectedFeatureBanks[bankIndex]);
        }
        return total / selectedFeatureBanks.length;
    }

    function meanAbsoluteFeatureCorrelation(left, right) {
        const sampleCount = Math.min(left.length, right.length);
        if (sampleCount === 0) return 0;
        const featureCount = Math.min(left[0].length, right[0].length);
        let correlationSum = 0;
        let validFeatures = 0;
        for (let feature = 0; feature < featureCount; feature++) {
            let leftSum = 0;
            let rightSum = 0;
            for (let sample = 0; sample < sampleCount; sample++) {
                leftSum += left[sample][feature];
                rightSum += right[sample][feature];
            }
            const leftMean = leftSum / sampleCount;
            const rightMean = rightSum / sampleCount;
            let covariance = 0;
            let leftVariance = 0;
            let rightVariance = 0;
            for (let sample = 0; sample < sampleCount; sample++) {
                const leftCentered = left[sample][feature] - leftMean;
                const rightCentered = right[sample][feature] - rightMean;
                covariance += leftCentered * rightCentered;
                leftVariance += leftCentered * leftCentered;
                rightVariance += rightCentered * rightCentered;
            }
            if (leftVariance <= 1e-12 || rightVariance <= 1e-12) continue;
            correlationSum += Math.abs(covariance / Math.sqrt(leftVariance * rightVariance));
            validFeatures++;
        }
        return validFeatures === 0 ? 0 : correlationSum / validFeatures;
    }

    function stableSigmoid(value) {
        if (value >= 0) {
            const decay = Math.exp(-value);
            return 1 / (1 + decay);
        }
        const growth = Math.exp(value);
        return growth / (1 + growth);
    }

    function uniqueClampedCandidates(center, step, minimum, maximum) {
        const candidates = [-2, -1, 0, 1, 2].map(function (offset) {
            return clamp(center + offset * step, minimum, maximum);
        });
        return candidates.filter(function (value, index) {
            return (
                candidates.findIndex(function (candidate) {
                    return Math.abs(candidate - value) < 1e-12;
                }) === index
            );
        });
    }

    function softBandpassFisherScore(samples, sampleRateHz, centerFrequencyHz, bandwidthHz) {
        const channelCount = Math.max(1, samples[0].sequence[0].length);
        const classCount = samples.reduce(function (maximum, sample) {
            return Math.max(maximum, Number.isInteger(sample.label) ? sample.label + 1 : 0);
        }, 0);
        const byClass = Array.from({ length: classCount }, function () {
            return {
                count: 0,
                sum: new Array(channelCount).fill(0),
                sumSquares: new Array(channelCount).fill(0),
            };
        });
        const globalSum = new Array(channelCount).fill(0);
        let validSamples = 0;
        const coefficients = localBandPassCoefficients(sampleRateHz, centerFrequencyHz, bandwidthHz);

        for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
            const sample = samples[sampleIndex];
            if (!Number.isInteger(sample.label) || !byClass[sample.label] || !Array.isArray(sample.sequence) || sample.sequence.length < 2) continue;
            const responses = causalBandRms(sample.sequence, channelCount, coefficients);
            const aggregate = byClass[sample.label];
            aggregate.count++;
            validSamples++;
            for (let channel = 0; channel < channelCount; channel++) {
                const response = responses[channel];
                aggregate.sum[channel] += response;
                aggregate.sumSquares[channel] += response * response;
                globalSum[channel] += response;
            }
        }

        let between = 0;
        let within = 0;
        for (let channel = 0; channel < channelCount; channel++) {
            const globalMean = globalSum[channel] / Math.max(1, validSamples);
            for (let label = 0; label < byClass.length; label++) {
                const aggregate = byClass[label];
                if (aggregate.count === 0) continue;
                const classMean = aggregate.sum[channel] / aggregate.count;
                between += aggregate.count * (classMean - globalMean) * (classMean - globalMean);
                within += Math.max(0, aggregate.sumSquares[channel] - aggregate.count * classMean * classMean);
            }
        }
        return between / Math.max(within, 1e-12);
    }

    function localBandPassCoefficients(sampleRateHz, centerFrequencyHz, bandwidthHz) {
        const omega = (2 * Math.PI * centerFrequencyHz) / sampleRateHz;
        const qualityFactor = Math.max(1e-6, centerFrequencyHz / bandwidthHz);
        const alpha = Math.sin(omega) / (2 * qualityFactor);
        const a0 = 1 + alpha;
        return {
            b0: alpha / a0,
            b1: 0,
            b2: -alpha / a0,
            a1: (-2 * Math.cos(omega)) / a0,
            a2: (1 - alpha) / a0,
        };
    }

    function causalBandRms(sequence, channelCount, coefficients) {
        const responses = new Array(channelCount).fill(0);
        for (let channel = 0; channel < channelCount; channel++) {
            const first = Number.isFinite(sequence[0][channel]) ? sequence[0][channel] : 0;
            let x1 = first;
            let x2 = first;
            let y1 = 0;
            let y2 = 0;
            let energy = 0;
            for (let timestep = 1; timestep < sequence.length; timestep++) {
                const input = Number.isFinite(sequence[timestep][channel]) ? sequence[timestep][channel] : 0;
                const output = coefficients.b0 * input + coefficients.b1 * x1 + coefficients.b2 * x2 - coefficients.a1 * y1 - coefficients.a2 * y2;
                x2 = x1;
                x1 = input;
                y2 = y1;
                y1 = output;
                energy += output * output;
            }
            responses[channel] = Math.sqrt(energy / Math.max(1, sequence.length - 1));
        }
        return responses;
    }

    function fisherScoreForLabels(byClass, labels, channelCount) {
        const aggregates = labels
            .map(function (label) {
                return byClass[label];
            })
            .filter(function (aggregate) {
                return aggregate && aggregate.count > 0;
            });
        if (aggregates.length !== labels.length) return 0;

        const totalCount = aggregates.reduce(function (sum, aggregate) {
            return sum + aggregate.count;
        }, 0);
        let between = 0;
        let within = 0;
        for (let channel = 0; channel < channelCount; channel++) {
            const globalMean =
                aggregates.reduce(function (sum, aggregate) {
                    return sum + aggregate.sum[channel];
                }, 0) / Math.max(1, totalCount);
            for (let aggregateIndex = 0; aggregateIndex < aggregates.length; aggregateIndex++) {
                const aggregate = aggregates[aggregateIndex];
                const classMean = aggregate.sum[channel] / aggregate.count;
                between += aggregate.count * (classMean - globalMean) * (classMean - globalMean);
                within += Math.max(0, aggregate.sumSquares[channel] - aggregate.count * classMean * classMean);
            }
        }
        return between / Math.max(within, 1e-12);
    }

    function dftMagnitudes(sequence, channelCount, cosine, sine) {
        const real = new Array(channelCount).fill(0);
        const imaginary = new Array(channelCount).fill(0);
        for (let timestep = 0; timestep < sequence.length; timestep++) {
            const row = sequence[timestep];
            for (let channel = 0; channel < channelCount; channel++) {
                const value = Number.isFinite(row[channel]) ? row[channel] : 0;
                real[channel] += value * cosine[timestep];
                imaginary[channel] -= value * sine[timestep];
            }
        }
        return real.map(function (value, channel) {
            return (2 * Math.hypot(value, imaginary[channel])) / sequence.length;
        });
    }

    function encodeSequence(sequence, label, outputSize, options) {
        const sensorConfig = options.sensorConfig;
        const inputIndexBySlot = options.inputIndexBySlot;
        const pairAuxiliaryLoss = normalizePairAuxiliaryLoss(options.pairAuxiliaryLoss, outputSize);
        const runtimeDecoderObjective = normalizeRuntimeDecoderObjective(options.runtimeDecoderObjective);
        const preserveEmptyTimesteps = options.preserveEmptyTimesteps === true;
        const encoder = new S.WaveSpikeEncoder(sensorConfig);
        const encoderState = encoder.createState();
        const inputs = [];
        const targets = [];
        const lossWeights = [];
        const timestamps = [];
        const eventsByBand = {};
        let sensorEvents = 0;

        for (let timestep = 0; timestep < sequence.length; timestep++) {
            const timestamp = timestep / sensorConfig.sampleRateHz;
            const emissions = encoder.encode({ timestamp: timestamp, values: sequence[timestep] }, encoderState);
            if (emissions.length === 0 && !preserveEmptyTimesteps) continue;
            const row = new Array(inputIndexBySlot.size).fill(0);
            for (let event = 0; event < emissions.length; event++) {
                const emission = emissions[event];
                const inputIndex = inputIndexBySlot.get(emission.slot);
                if (inputIndex === undefined) continue;
                row[inputIndex] += emission.amplitude;
                sensorEvents++;
                eventsByBand[emission.bandId] = (eventsByBand[emission.bandId] || 0) + 1;
            }
            inputs.push(row);
            targets.push(new Array(outputSize).fill(0));
            lossWeights.push(new Array(outputSize).fill(EARLY_LOSS_WEIGHT));
            timestamps.push(timestamp);
        }

        const frameEnd = new Array(inputIndexBySlot.size).fill(0);
        frameEnd[inputIndexBySlot.get(FRAME_END_SLOT)] = 1;
        const finalTarget = new Array(outputSize).fill(0);
        if (Number.isInteger(label) && label >= 0 && label < outputSize) finalTarget[label] = 1;
        const finalLossWeights = new Array(outputSize).fill(1);
        if (pairAuxiliaryLoss && pairAuxiliaryLoss.labels.indexOf(label) >= 0) {
            const baseWeightSum = lossWeights.length * outputSize * EARLY_LOSS_WEIGHT + outputSize;
            const extraWeightPerPairOutput = (pairAuxiliaryLoss.mixtureWeight * baseWeightSum) / pairAuxiliaryLoss.labels.length;
            for (let pairIndex = 0; pairIndex < pairAuxiliaryLoss.labels.length; pairIndex++) {
                finalLossWeights[pairAuxiliaryLoss.labels[pairIndex]] += extraWeightPerPairOutput;
            }
        }
        inputs.push(frameEnd);
        targets.push(finalTarget);
        lossWeights.push(finalLossWeights);
        timestamps.push(sequence.length / sensorConfig.sampleRateHz);

        return {
            label: label,
            inputs: inputs,
            targets: targets,
            lossWeights: lossWeights,
            timestamps: timestamps,
            sensorEvents: sensorEvents,
            eventsByBand: eventsByBand,
            denseTimesteps: sequence.length,
            pairAuxiliaryActive: pairAuxiliaryLoss !== null && pairAuxiliaryLoss.labels.indexOf(label) >= 0,
            runtimeDecoderObjective: runtimeDecoderObjective
                ? {
                      targetOutput: label,
                      spikeCountScale: runtimeDecoderObjective.spikeCountScale,
                      membranePotentialScale: runtimeDecoderObjective.membranePotentialScale,
                      temperature: runtimeDecoderObjective.temperature,
                      classificationLossWeight: runtimeDecoderObjective.classificationLossWeight,
                      temporalLossWeight: runtimeDecoderObjective.temporalLossWeight,
                  }
                : undefined,
        };
    }

    function buildModel(options) {
        const hiddenSize = Math.max(1, Math.floor(options.hiddenSize));
        const outputSize = Math.max(1, Math.floor(options.outputSize));
        const sensorConfig = copySensorConfig(options.sensorConfig);
        const sensorEncoding = normalizeEncodingMode(options.sensorEncoding);
        const topology = normalizeTopology(options.topology);
        const recurrentEnabled = topology === TOPOLOGY_DENSE_RECURRENT;
        const phaseDelayEnabled = topology === TOPOLOGY_PHASE_DELAY_FUSION;
        const pairAuxiliaryLoss = normalizePairAuxiliaryLoss(options.pairAuxiliaryLoss, outputSize);
        const scopedPairAuxiliary = normalizeScopedPairAuxiliary(options.scopedPairAuxiliary, outputSize);
        const runtimeDecoderObjective = normalizeRuntimeDecoderObjective(options.runtimeDecoderObjective);
        const dt = 1 / sensorConfig.sampleRateHz;
        const windowSize = Math.max(1, Math.floor(options.windowSize || 64));
        const duration = windowSize * dt;
        const seed = Number.isInteger(options.seed) ? options.seed : 0x534e4e31;
        const random = mulberry32(seed);
        const observationSource = new MotorCurrentObservationSource();
        const sensor = new S.WaveSpikeSensorNode(sensorConfig);
        const sensorPorts = sensor.encoder.outputPorts;
        const sensorCells = sensor.encoder.cells;
        const inputSlots = sensorPorts.map(function (port) {
            return port.slot;
        });
        inputSlots.push(FRAME_END_SLOT);
        const inputIndexBySlot = new Map();
        inputSlots.forEach(function (slot, index) {
            inputIndexBySlot.set(slot, index);
        });

        const maximumFrequencyHz = sensorConfig.bands.reduce(function (maximum, band) {
            return Math.max(maximum, band.centerFrequencyHz);
        }, 0);
        const tauMultipliers = maximumFrequencyHz < 20 ? [4, 8, 16, 32] : [2, 4, 8, 16];
        const tauBank = tauMultipliers.map(function (multiplier) {
            return multiplier * dt;
        });
        const hidden = [];
        const specialistHidden = [];
        const phaseHidden = [[], [], []];
        const fusionHidden = [];
        const phaseRelayBySlot = new Map();
        const specialistOptions = options.specialistBranch && typeof options.specialistBranch === "object" ? options.specialistBranch : null;
        const specialistBandIds = new Set(
            specialistOptions && Array.isArray(specialistOptions.bandIds)
                ? specialistOptions.bandIds.filter(function (bandId) {
                      return typeof bandId === "string" && bandId.length > 0;
                  })
                : []
        );
        const specialistOutputLabels =
            specialistOptions && Array.isArray(specialistOptions.outputLabels)
                ? specialistOptions.outputLabels.filter(function (label, index, labels) {
                      return Number.isInteger(label) && label >= 0 && label < outputSize && labels.indexOf(label) === index;
                  })
                : [];
        const specialistHiddenSize = specialistOptions ? Math.max(0, Math.floor(specialistOptions.hiddenSize || 0)) : 0;
        const specialistEnabled = specialistBandIds.size > 0 && specialistOutputLabels.length > 0 && specialistHiddenSize > 0;

        function createHidden(collection, id, position, groupSize) {
            const bankIndex = Math.min(tauBank.length - 1, Math.floor((position * tauBank.length) / Math.max(1, groupSize)));
            const teacher = new S.ConstrainedLifSurrogateSubgraph(id, {
                threshold: 0.8,
                resetPotential: 0,
                membraneTimeConstant: tauBank[bankIndex],
                surrogateSlope: 1.25,
                mode: "training",
            });
            collection.push(teacher);
            return teacher;
        }

        if (phaseDelayEnabled) {
            for (let portIndex = 0; portIndex < sensorPorts.length; portIndex++) {
                const port = sensorPorts[portIndex];
                const relay = createHidden(hidden, "snn:phase-delay-relay-" + portIndex, portIndex, sensorPorts.length);
                phaseHidden[port.channel].push(relay);
                phaseRelayBySlot.set(port.slot, relay);
            }
            for (let neuron = 0; neuron < hiddenSize; neuron++) {
                fusionHidden.push(createHidden(hidden, "snn:phase-delay-fusion-" + neuron, neuron, hiddenSize));
            }
        } else if (topology === TOPOLOGY_PHASE_FUSION) {
            const phaseWidth = Math.floor(hiddenSize / 4);
            if (phaseWidth < 1 || hiddenSize - phaseWidth * 3 < 1) {
                throw new Error("Phase-fusion topology requires at least 4 hidden LIF neurons.");
            }
            for (let channel = 0; channel < 3; channel++) {
                for (let neuron = 0; neuron < phaseWidth; neuron++) {
                    phaseHidden[channel].push(createHidden(hidden, "snn:phase-" + channel + "-" + neuron, neuron, phaseWidth));
                }
            }
            const fusionWidth = hiddenSize - phaseWidth * 3;
            for (let neuron = 0; neuron < fusionWidth; neuron++) fusionHidden.push(createHidden(hidden, "snn:fusion-" + neuron, neuron, fusionWidth));
        } else {
            for (let neuron = 0; neuron < hiddenSize; neuron++) createHidden(hidden, "snn:hidden-" + neuron, neuron, hiddenSize);
        }
        if (specialistEnabled) {
            for (let neuron = 0; neuron < specialistHiddenSize; neuron++) {
                createHidden(specialistHidden, "snn:specialist-" + neuron, neuron, specialistHiddenSize);
            }
        }

        const outputs = [];
        for (let output = 0; output < outputSize; output++) {
            outputs.push(
                new S.ConstrainedLifSurrogateSubgraph("snn:class-" + output, {
                    threshold: 0.8,
                    resetPotential: 0,
                    membraneTimeConstant: Math.max(duration, dt),
                    surrogateSlope: 1.25,
                    mode: "training",
                })
            );
        }

        const observationLink = new S.Channel(observationSource, sensor, OBSERVATION_SLOT, false, undefined, true, OBSERVATION_SLOT);
        const inputBindings = [];
        const specialistInputBindings = [];
        const sensorSynapses = [];
        const specialistOutputSynapses = [];
        const maximumThresholdLevels = sensorConfig.bands.reduce(function (maximum, band) {
            return Math.max(maximum, Array.isArray(band.thresholds) ? band.thresholds.length : 1);
        }, 1);
        const hiddenInputScale = 0.5 / Math.sqrt(maximumThresholdLevels);
        for (let portIndex = 0; portIndex < sensorPorts.length; portIndex++) {
            const port = sensorPorts[portIndex];
            if (specialistEnabled && specialistBandIds.has(port.bandId)) continue;
            const targets = phaseDelayEnabled ? [phaseRelayBySlot.get(port.slot)] : topology === TOPOLOGY_PHASE_FUSION ? phaseHidden[port.channel] || [] : hidden;
            for (let neuron = 0; neuron < targets.length; neuron++) {
                const initialWeight = phaseDelayEnabled ? 0.9 + symmetric(random, 0.05) : symmetric(random, hiddenInputScale);
                const synapse = new S.SpikeSynapse(sensor, targets[neuron].inputNode, port.slot, "spike", initialWeight);
                sensorSynapses.push(synapse);
                inputBindings.push({ inputIndex: inputIndexBySlot.get(port.slot), synapse: synapse });
            }
        }

        const connections = [];
        const recurrentSynapses = [];
        const phaseDelaySynapses = [];
        const outputSources = topology === TOPOLOGY_PHASE_FUSION || phaseDelayEnabled ? fusionHidden : hidden;
        if (topology === TOPOLOGY_PHASE_FUSION) {
            const fusionScale = 0.6 / Math.sqrt(Math.max(1, hiddenSize - fusionHidden.length));
            for (let neuron = 0; neuron < hiddenSize - fusionHidden.length; neuron++) {
                for (let fusion = 0; fusion < fusionHidden.length; fusion++) {
                    connections.push(new S.SpikeSynapse(hidden[neuron].outputNode, fusionHidden[fusion].inputNode, "spike", "spike", symmetric(random, fusionScale)));
                }
            }
        }
        let phaseDelayCore = null;
        if (phaseDelayEnabled) {
            const requestedCore = options.phaseDelayCore && typeof options.phaseDelayCore === "object" ? options.phaseDelayCore : {};
            const delayTicks = normalizeDelayTicks(requestedCore.delayTicks);
            const delayScale = positiveOr(requestedCore.initialWeightScale, 0.5 / Math.sqrt(delayTicks.length));
            for (let relay = 0; relay < sensorPorts.length; relay++) {
                for (let fusion = 0; fusion < fusionHidden.length; fusion++) {
                    for (let delayIndex = 0; delayIndex < delayTicks.length; delayIndex++) {
                        const delay = delayTicks[delayIndex];
                        const synapse = new S.SpikeSynapse(hidden[relay].outputNode, fusionHidden[fusion].inputNode, "spike", "spike", symmetric(random, delayScale), delay);
                        phaseDelaySynapses.push(synapse);
                        connections.push(synapse);
                    }
                }
            }
            phaseDelayCore = {
                version: requestedCore.version || PHASE_DELAY_CORE_VERSION,
                delayTicks: delayTicks,
                delaySeconds: delayTicks.map(function (delay) {
                    return delay * dt;
                }),
                relayNeuronCount: sensorPorts.length,
                fusionNeuronCount: fusionHidden.length,
                synapseCount: phaseDelaySynapses.length,
                denseTrainingTimesteps: true,
            };
        }
        const outputScale = 0.6 / Math.sqrt(outputSources.length);
        for (let neuron = 0; neuron < outputSources.length; neuron++) {
            for (let output = 0; output < outputSize; output++) {
                connections.push(new S.SpikeSynapse(outputSources[neuron].outputNode, outputs[output].inputNode, "spike", "spike", symmetric(random, outputScale)));
            }
        }
        let recurrentCore = null;
        if (recurrentEnabled) {
            if (hidden.length < 2) throw new Error("Dense recurrent topology requires at least two hidden LIF neurons.");
            const requestedCore = options.recurrentCore && typeof options.recurrentCore === "object" ? options.recurrentCore : {};
            const fanIn = Math.min(hidden.length - 1, Math.max(1, Math.floor(positiveOr(requestedCore.fanIn, DEFAULT_RECURRENT_FAN_IN))));
            const delayTicks = Math.max(1, Math.floor(positiveOr(requestedCore.delayTicks, DEFAULT_RECURRENT_DELAY_TICKS)));
            const weightScale = positiveOr(requestedCore.initialWeightScale, 0.25 / Math.sqrt(fanIn));
            for (let target = 0; target < hidden.length; target++) {
                const sources = recurrentSources(target, hidden.length, fanIn);
                for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
                    const source = sources[sourceIndex];
                    const synapse = new S.SpikeSynapse(hidden[source].outputNode, hidden[target].inputNode, "spike", "spike", symmetric(random, weightScale), delayTicks);
                    recurrentSynapses.push(synapse);
                    connections.push(synapse);
                }
            }
            recurrentCore = {
                version: requestedCore.version || RECURRENT_CORE_VERSION,
                fanIn: fanIn,
                delayTicks: delayTicks,
                initialWeightScale: weightScale,
                synapseCount: recurrentSynapses.length,
                denseTrainingTimesteps: true,
            };
        }

        const frameSynapses = [];
        for (let output = 0; output < outputSize; output++) {
            const synapse = new S.SpikeSynapse(sensor, outputs[output].inputNode, FRAME_END_SLOT, "spike", 0.1 + symmetric(random, 0.02));
            frameSynapses.push(synapse);
            inputBindings.push({ inputIndex: inputIndexBySlot.get(FRAME_END_SLOT), synapse: synapse });
        }

        const specialistSynapses = [];
        if (specialistEnabled) {
            const specialistInputScale = 0.5;
            for (let portIndex = 0; portIndex < sensorPorts.length; portIndex++) {
                const port = sensorPorts[portIndex];
                if (!specialistBandIds.has(port.bandId)) continue;
                for (let neuron = 0; neuron < specialistHidden.length; neuron++) {
                    const synapse = new S.SpikeSynapse(sensor, specialistHidden[neuron].inputNode, port.slot, "spike", symmetric(random, specialistInputScale));
                    specialistSynapses.push(synapse);
                    const binding = { inputIndex: inputIndexBySlot.get(port.slot), synapse: synapse };
                    inputBindings.push(binding);
                    specialistInputBindings.push(binding);
                }
            }
            const specialistOutputScale = 0.6 / Math.sqrt(specialistHidden.length);
            for (let neuron = 0; neuron < specialistHidden.length; neuron++) {
                for (let outputIndex = 0; outputIndex < specialistOutputLabels.length; outputIndex++) {
                    const output = specialistOutputLabels[outputIndex];
                    const synapse = new S.SpikeSynapse(specialistHidden[neuron].outputNode, outputs[output].inputNode, "spike", "spike", symmetric(random, specialistOutputScale));
                    connections.push(synapse);
                    specialistOutputSynapses.push(synapse);
                }
            }
        }

        const teachers = hidden.concat(specialistHidden, outputs);
        const nodes = [observationSource, sensor];
        const links = [observationLink].concat(sensorSynapses, specialistSynapses, frameSynapses, connections);
        for (let teacherIndex = 0; teacherIndex < teachers.length; teacherIndex++) {
            nodes.push.apply(nodes, teachers[teacherIndex].nodes);
            links.push.apply(links, teachers[teacherIndex].links);
        }

        const builder = new S.RuntimeGraphBuilder().withMode("dynamic");
        builder.withNodes.apply(builder, nodes);
        builder.withLinks.apply(builder, links);
        const runtimeGraph = builder.build();
        const trainingNetwork = {
            neurons: teachers,
            inputs: inputBindings,
            connections: connections,
            outputs: outputs,
        };
        const trainer = new S.ConstrainedLifNetworkBpttTrainer(trainingNetwork, {
            learningRate: positiveOr(options.learningRate, 0.003),
            timeStep: dt,
            gradientClip: 1,
            lossFunction: S.LossFunctions.MSE,
            optimizer: S.Optimizers.Adam(),
        });
        const scopedPairTraining = createScopedPairTraining({
            config: scopedPairAuxiliary,
            specialistEnabled: specialistEnabled,
            specialistHidden: specialistHidden,
            specialistInputBindings: specialistInputBindings,
            specialistOutputSynapses: specialistOutputSynapses,
            outputs: outputs,
            frameSource: sensor,
            baseLearningRate: positiveOr(options.learningRate, 0.003),
            timeStep: dt,
        });

        return {
            graph: runtimeGraph,
            trainer: trainer,
            network: trainingNetwork,
            observationSource: observationSource,
            sensor: sensor,
            sensorConfig: sensorConfig,
            sensorPorts: sensorPorts,
            sensorCells: sensorCells,
            inputSlots: inputSlots,
            inputIndexBySlot: inputIndexBySlot,
            hidden: hidden,
            specialistHidden: specialistHidden,
            phaseHidden: phaseHidden,
            fusionHidden: fusionHidden,
            recurrentSynapses: recurrentSynapses,
            recurrentCore: recurrentCore,
            phaseDelaySynapses: phaseDelaySynapses,
            phaseDelayCore: phaseDelayCore,
            outputs: outputs,
            teachers: teachers,
            hiddenSize: hidden.length,
            totalHiddenSize: hidden.length + specialistHidden.length,
            specialistBranch: specialistEnabled
                ? {
                      version: specialistOptions.version || "specialist-branch-v1",
                      bandIds: Array.from(specialistBandIds),
                      hiddenSize: specialistHidden.length,
                      outputLabels: specialistOutputLabels.slice(),
                      encoding: specialistOptions.encoding || SENSOR_ENCODING_PHASE_BINARY,
                  }
                : null,
            outputSize: outputSize,
            inputSize: inputSlots.length,
            dt: dt,
            windowSize: windowSize,
            seed: seed,
            tauBank: tauBank,
            temporalPolicy: TEMPORAL_POLICY,
            requiresDenseTimesteps: recurrentEnabled || phaseDelayEnabled,
            sensorPhenotypeVersion: SENSOR_PHENOTYPE_VERSION,
            topology: topology,
            sensorEncoding: sensorEncoding,
            pairAuxiliaryLoss: pairAuxiliaryLoss,
            runtimeDecoderObjective: runtimeDecoderObjective,
            scopedPairAuxiliary: scopedPairTraining ? scopedPairTraining.config : null,
            scopedPairTraining: scopedPairTraining,
            hiddenShape: phaseDelayEnabled
                ? sensorPorts.length + " relays -> delays " + phaseDelayCore.delayTicks.join("/") + " -> " + fusionHidden.length + " fusion"
                : topology === TOPOLOGY_PHASE_FUSION
                  ? phaseHidden
                        .map(function (branch) {
                            return branch.length;
                        })
                        .join("+") +
                    " -> " +
                    fusionHidden.length
                  : String(hiddenSize) +
                    (recurrentCore ? " + " + recurrentCore.synapseCount + " recurrent delay-" + recurrentCore.delayTicks : "") +
                    (specialistEnabled ? " + " + specialistHidden.length + " specialist" : ""),
            trainableWeightCount: trainer.synapses.length,
            compiled: false,
        };
    }

    function createScopedPairTraining(options) {
        const config = options.config;
        if (!config) return null;
        if (!options.specialistEnabled) throw new Error("Scoped pair training requires an enabled specialist branch.");

        const pairOutputs = config.labels.map(function (label) {
            return options.outputs[label];
        });
        const pairOutputNodes = new Set(
            pairOutputs.map(function (output) {
                return output.inputNode;
            })
        );
        const specialistOutputSynapses = options.specialistOutputSynapses.filter(function (synapse) {
            return pairOutputNodes.has(synapse.ofin);
        });
        const originalInputIndices = Array.from(
            new Set(
                options.specialistInputBindings.map(function (binding) {
                    return binding.inputIndex;
                })
            )
        ).sort(function (left, right) {
            return left - right;
        });
        const compactInputIndex = new Map();
        originalInputIndices.forEach(function (inputIndex, compactIndex) {
            compactInputIndex.set(inputIndex, compactIndex);
        });
        const auxiliaryInputs = options.specialistInputBindings.map(function (binding) {
            return { inputIndex: compactInputIndex.get(binding.inputIndex), synapse: binding.synapse };
        });
        const frameInputIndex = originalInputIndices.length;
        for (let outputIndex = 0; outputIndex < pairOutputs.length; outputIndex++) {
            auxiliaryInputs.push({
                inputIndex: frameInputIndex,
                synapse: new S.SpikeSynapse(options.frameSource, pairOutputs[outputIndex].inputNode, "scoped-pair-frame-" + outputIndex, "spike", 0.1),
            });
        }
        const network = {
            neurons: options.specialistHidden.concat(pairOutputs),
            inputs: auxiliaryInputs,
            connections: specialistOutputSynapses,
            outputs: pairOutputs,
        };
        const trainer = new S.ConstrainedLifNetworkBpttTrainer(network, {
            learningRate: options.baseLearningRate * config.learningRateScale,
            timeStep: options.timeStep,
            gradientClip: 1,
            lossFunction: S.LossFunctions.MSE,
            optimizer: S.Optimizers.SGD(),
        });
        return {
            config: config,
            trainer: trainer,
            originalInputIndices: originalInputIndices,
            frameInputIndex: frameInputIndex,
            runtimeSynapses: options.specialistInputBindings
                .map(function (binding) {
                    return binding.synapse;
                })
                .concat(specialistOutputSynapses),
        };
    }

    function trainScopedPairBatch(model, encodedBatch) {
        const scoped = model.scopedPairTraining;
        if (!scoped) return { loss: null, samples: 0 };
        const sequences = [];
        for (let sampleIndex = 0; sampleIndex < encodedBatch.length; sampleIndex++) {
            const encoded = encodedBatch[sampleIndex];
            const pairTarget = scoped.config.labels.indexOf(encoded.label);
            if (pairTarget < 0) continue;
            const inputs = encoded.inputs.map(function (row, timestep) {
                const projected = scoped.originalInputIndices.map(function (inputIndex) {
                    return row[inputIndex];
                });
                projected.push(timestep === encoded.inputs.length - 1 ? 1 : 0);
                return projected;
            });
            const targets = encoded.inputs.map(function () {
                return [0, 0];
            });
            targets[targets.length - 1][pairTarget] = 1;
            const lossWeights = encoded.inputs.map(function () {
                return [0, 0];
            });
            lossWeights[lossWeights.length - 1] = [1, 1];
            sequences.push({
                inputs: inputs,
                targets: targets,
                lossWeights: lossWeights,
                timestamps: encoded.timestamps,
            });
        }
        if (sequences.length === 0) return { loss: null, samples: 0 };
        return { loss: scoped.trainer.trainBatch(sequences), samples: sequences.length };
    }

    function analyzeTeacher(model, sequence, label, includeTrainingForward, includeFidelity) {
        const encoded = encodeSequence(sequence, label, model.outputSize, {
            sensorConfig: model.sensorConfig,
            inputIndexBySlot: model.inputIndexBySlot,
            pairAuxiliaryLoss: model.pairAuxiliaryLoss,
            runtimeDecoderObjective: model.runtimeDecoderObjective,
            preserveEmptyTimesteps: model.requiresDenseTimesteps === true,
        });
        const hardTrace = model.trainer.forward(encoded, "hard");
        const hardFinalStep = hardTrace.steps[hardTrace.steps.length - 1];
        const totalHiddenSize = model.totalHiddenSize || model.hiddenSize;
        const hiddenSpikeCounts = new Array(totalHiddenSize).fill(0);
        const outputSpikeCounts = new Array(model.outputSize).fill(0);

        for (let timestep = 0; timestep < hardTrace.steps.length; timestep++) {
            const step = hardTrace.steps[timestep];
            for (let neuron = 0; neuron < totalHiddenSize; neuron++) {
                hiddenSpikeCounts[neuron] += step.neurons[neuron].probability;
            }
            for (let output = 0; output < model.outputSize; output++) {
                outputSpikeCounts[output] += step.outputs[output];
            }
        }

        // Native inference ranks a class with all emitted spikes plus the
        // residual membrane potential. Keep this diagnostic separate from
        // the historical final-spike decoder until the comparison is made.
        const runtimeScores = outputSpikeCounts.map(function (spikeCount, output) {
            const neuronIndex = totalHiddenSize + output;
            const state = hardFinalStep.neurons[neuronIndex];
            const threshold = model.outputs[output].config.threshold;
            return spikeCount * 2 + state.membranePotential / threshold;
        });
        const result = {
            runtimePredicted: argmax(runtimeScores),
            runtimeScores: runtimeScores,
            runtimeMargin: classificationMargin(runtimeScores, label),
            hiddenSpikeCounts: hiddenSpikeCounts,
            outputSpikeCounts: outputSpikeCounts,
            sensorEvents: encoded.sensorEvents,
            eventsByBand: encoded.eventsByBand,
            eventTimesteps: encoded.inputs.length,
            durationSeconds: sequence.length / model.sensorConfig.sampleRateHz,
            trainingLoss: null,
            trainingPredicted: null,
            trainingScores: null,
            correctClassScore: null,
            classificationMargin: null,
            trainingRuntimePredicted: null,
            trainingRuntimeScores: null,
            trainingRuntimeMargin: null,
            fidelity: null,
        };

        if (includeTrainingForward) {
            // Training and hard modes intentionally share the exact same
            // binary forward trace. Only gradients use the surrogate.
            const trainingTrace = hardTrace;
            const trainingScores = trainingTrace.steps[trainingTrace.steps.length - 1].outputs.slice();
            const trainingRuntimeScores = decoderScoresOfTrace(model, trainingTrace, totalHiddenSize);
            result.trainingLoss = trainingTrace.loss;
            result.trainingPredicted = argmax(trainingScores);
            result.trainingScores = trainingScores;
            result.correctClassScore = Number.isInteger(label) && label >= 0 && label < trainingScores.length ? trainingScores[label] : null;
            result.classificationMargin = classificationMargin(trainingScores, label);
            result.trainingRuntimePredicted = argmax(trainingRuntimeScores);
            result.trainingRuntimeScores = trainingRuntimeScores;
            result.trainingRuntimeMargin = classificationMargin(trainingRuntimeScores, label);
            if (includeFidelity === true) result.fidelity = pairedTraceFidelity(model, trainingTrace, hardTrace, label);
        }
        return result;
    }

    function profileForwardContract(model, sequence, label) {
        const encoded = encodeSequence(sequence, label, model.outputSize, {
            sensorConfig: model.sensorConfig,
            inputIndexBySlot: model.inputIndexBySlot,
            pairAuxiliaryLoss: model.pairAuxiliaryLoss,
            runtimeDecoderObjective: model.runtimeDecoderObjective,
            preserveEmptyTimesteps: model.requiresDenseTimesteps === true,
        });
        const totalHiddenSize = model.totalHiddenSize || model.hiddenSize;
        const trainingTrace = model.trainer.forward(encoded, "training");
        const hardTrace = model.trainer.forward(encoded, "hard");
        let binaryValueCount = 0;
        let binaryViolationCount = 0;
        let membraneMaxError = 0;
        for (let timestep = 0; timestep < trainingTrace.steps.length; timestep++) {
            for (let neuron = 0; neuron < model.teachers.length; neuron++) {
                const trainingStep = trainingTrace.steps[timestep].neurons[neuron];
                const hardStep = hardTrace.steps[timestep].neurons[neuron];
                binaryValueCount++;
                if (trainingStep.probability !== 0 && trainingStep.probability !== 1) binaryViolationCount++;
                membraneMaxError = Math.max(membraneMaxError, Math.abs(trainingStep.membranePotential - hardStep.membranePotential));
            }
        }
        const trainingScores = decoderScoresOfTrace(model, trainingTrace, totalHiddenSize);
        const hardScores = decoderScoresOfTrace(model, hardTrace, totalHiddenSize);
        let modeScoreMaxError = 0;
        for (let output = 0; output < hardScores.length; output++) {
            modeScoreMaxError = Math.max(modeScoreMaxError, Math.abs(trainingScores[output] - hardScores[output]));
        }
        return {
            trainingScores: trainingScores,
            hardScores: hardScores,
            trainingPredicted: argmax(trainingScores),
            hardPredicted: argmax(hardScores),
            binaryValueCount: binaryValueCount,
            binaryViolationCount: binaryViolationCount,
            membraneMaxError: membraneMaxError,
            modeScoreMaxError: modeScoreMaxError,
            sensorEvents: encoded.sensorEvents,
        };
    }

    function profileTeacherConversion(model, sequence, label, groupSize) {
        const encoded = encodeSequence(sequence, label, model.outputSize, {
            sensorConfig: model.sensorConfig,
            inputIndexBySlot: model.inputIndexBySlot,
            pairAuxiliaryLoss: model.pairAuxiliaryLoss,
            runtimeDecoderObjective: model.runtimeDecoderObjective,
            preserveEmptyTimesteps: model.requiresDenseTimesteps === true,
        });
        const totalHiddenSize = model.totalHiddenSize || model.hiddenSize;
        const teacherCount = model.teachers.length;
        const size = Math.max(1, Math.floor(groupSize || 8));
        const softTrace = model.trainer.forward(encoded, "soft");
        const hardTrace = model.trainer.forward(encoded, "hard");
        const stages = [];

        function appendStage(id, labelText, trace) {
            const scores = decoderScoresOfTrace(model, trace, totalHiddenSize);
            stages.push({
                id: id,
                label: labelText,
                predicted: argmax(scores),
                scores: scores,
                margin: classificationMargin(scores, label),
            });
        }

        appendStage("all-soft", "Capteur hard, tous les LIF soft", softTrace);
        for (let count = Math.min(size, totalHiddenSize); ; count = Math.min(totalHiddenSize, count + size)) {
            const modes = new Array(teacherCount).fill("soft");
            for (let neuron = 0; neuron < count; neuron++) modes[neuron] = "hard";
            appendStage("hidden-0-" + (count - 1) + "-hard", "LIF cachés 0.." + (count - 1) + " hard, sorties soft", model.trainer.forwardMixed(encoded, modes));
            if (count === totalHiddenSize) break;
        }
        const outputHardModes = new Array(teacherCount).fill("soft");
        for (let neuron = totalHiddenSize; neuron < teacherCount; neuron++) outputHardModes[neuron] = "hard";
        appendStage("outputs-hard-only", "LIF cachés soft, sorties hard", model.trainer.forwardMixed(encoded, outputHardModes));
        appendStage("all-hard", "Tous les LIF hard", hardTrace);

        return {
            label: label,
            stages: stages,
            fidelity: pairedTraceFidelity(model, softTrace, hardTrace, label),
            sensorEvents: encoded.sensorEvents,
            timesteps: encoded.inputs.length,
        };
    }

    function pairedTraceFidelity(model, softTrace, hardTrace, label) {
        const totalHiddenSize = model.totalHiddenSize || model.hiddenSize;
        const neuronCount = model.teachers.length;
        const hidden = tracePairLayerStats(model, softTrace, hardTrace, 0, totalHiddenSize);
        const output = tracePairLayerStats(model, softTrace, hardTrace, totalHiddenSize, neuronCount);
        const divergenceByTimestep = [];
        for (let timestep = 0; timestep < softTrace.steps.length; timestep++) {
            let difference = 0;
            for (let neuron = 0; neuron < neuronCount; neuron++) {
                difference += Math.abs(softTrace.steps[timestep].neurons[neuron].membranePotential - hardTrace.steps[timestep].neurons[neuron].membranePotential);
            }
            divergenceByTimestep.push(difference / Math.max(1, neuronCount));
        }
        const softScores = decoderScoresOfTrace(model, softTrace, totalHiddenSize);
        const hardScores = decoderScoresOfTrace(model, hardTrace, totalHiddenSize);
        let scoreAbsoluteError = 0;
        for (let outputIndex = 0; outputIndex < softScores.length; outputIndex++) {
            scoreAbsoluteError += Math.abs(softScores[outputIndex] - hardScores[outputIndex]);
        }
        return {
            hidden: hidden,
            output: output,
            divergenceByTimestep: divergenceByTimestep,
            softScores: softScores,
            hardScores: hardScores,
            scoreMae: scoreAbsoluteError / Math.max(1, softScores.length),
            softMargin: classificationMargin(softScores, label),
            hardMargin: classificationMargin(hardScores, label),
        };
    }

    function tracePairLayerStats(model, softTrace, hardTrace, startNeuron, endNeuron) {
        const neuronCount = Math.max(0, endNeuron - startNeuron);
        const softSpikeCounts = new Array(neuronCount).fill(0);
        const hardSpikeCounts = new Array(neuronCount).fill(0);
        const stats = {
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
            softSpikeCounts: softSpikeCounts,
            hardSpikeCounts: hardSpikeCounts,
        };
        for (let timestep = 0; timestep < softTrace.steps.length; timestep++) {
            for (let neuron = startNeuron; neuron < endNeuron; neuron++) {
                const localNeuron = neuron - startNeuron;
                const soft = softTrace.steps[timestep].neurons[neuron];
                const hard = hardTrace.steps[timestep].neurons[neuron];
                stats.outputAbsoluteErrorSum += Math.abs(soft.probability - hard.probability);
                stats.outputComparisonCount++;
                stats.membraneAbsoluteErrorSum += Math.abs(soft.membranePotential - hard.membranePotential);
                accumulateMoments(stats.membraneMoments, soft.membranePotential, hard.membranePotential);
                softSpikeCounts[localNeuron] += soft.probability;
                hardSpikeCounts[localNeuron] += hard.probability;
                if (soft.canFire) {
                    stats.softThresholdStateCount++;
                    if (normalizedThresholdDistance(soft.integratedPotential, model.teachers[neuron].config.threshold) < 0.1) {
                        stats.softNearThresholdCount++;
                    }
                }
                if (hard.canFire) {
                    stats.hardThresholdStateCount++;
                    if (normalizedThresholdDistance(hard.integratedPotential, model.teachers[neuron].config.threshold) < 0.1) {
                        stats.hardNearThresholdCount++;
                    }
                }
            }
        }
        for (let neuron = startNeuron; neuron < endNeuron; neuron++) {
            const softPeaks = probabilityPeakTimesteps(softTrace, neuron);
            for (let timestep = 0; timestep < hardTrace.steps.length; timestep++) {
                if (hardTrace.steps[timestep].neurons[neuron].probability !== 1) continue;
                stats.hardSpikeCount++;
                if (softPeaks.length === 0) continue;
                const hardTime = hardTrace.steps[timestep].timestamp;
                let nearest = Number.POSITIVE_INFINITY;
                for (let peak = 0; peak < softPeaks.length; peak++) {
                    nearest = Math.min(nearest, Math.abs(softTrace.steps[softPeaks[peak]].timestamp - hardTime));
                }
                stats.timingAbsoluteErrorSecondsSum += nearest;
                stats.timingMatchCount++;
            }
        }
        return stats;
    }

    function probabilityPeakTimesteps(trace, neuron) {
        const peaks = [];
        for (let timestep = 0; timestep < trace.steps.length; timestep++) {
            const value = trace.steps[timestep].neurons[neuron].probability;
            if (!(value > 0)) continue;
            const previous = timestep > 0 ? trace.steps[timestep - 1].neurons[neuron].probability : Number.NEGATIVE_INFINITY;
            const next = timestep + 1 < trace.steps.length ? trace.steps[timestep + 1].neurons[neuron].probability : Number.NEGATIVE_INFINITY;
            if (value >= previous && value >= next && (value > previous || value > next)) peaks.push(timestep);
        }
        return peaks;
    }

    function decoderScoresOfTrace(model, trace, totalHiddenSize) {
        const finalStep = trace.steps[trace.steps.length - 1];
        const spikeCounts = new Array(model.outputSize).fill(0);
        for (let timestep = 0; timestep < trace.steps.length; timestep++) {
            for (let output = 0; output < model.outputSize; output++) spikeCounts[output] += trace.steps[timestep].outputs[output];
        }
        return spikeCounts.map(function (count, output) {
            const neuronIndex = totalHiddenSize + output;
            return count * 2 + finalStep.neurons[neuronIndex].membranePotential / model.outputs[output].config.threshold;
        });
    }

    function accumulateMoments(stats, soft, hard) {
        stats.count++;
        stats.softSum += soft;
        stats.hardSum += hard;
        stats.softSquaredSum += soft * soft;
        stats.hardSquaredSum += hard * hard;
        stats.productSum += soft * hard;
    }

    function normalizedThresholdDistance(potential, threshold) {
        return Math.abs((potential - threshold) / Math.max(Math.abs(threshold), 1e-12));
    }

    function compileModel(model) {
        if (model.compiled) throw new Error("This motor-current SNN model has already been compiled.");
        for (let teacher = 0; teacher < model.teachers.length; teacher++) model.teachers[teacher].configure({ mode: "hard" });
        const compilation = S.compileConstrainedLifNetwork(model.graph, model.teachers);
        model.compiled = true;
        model.compilation = compilation;
        const totalHiddenSize = model.totalHiddenSize || model.hiddenSize;
        model.nativeHidden = compilation.neurons.slice(0, totalHiddenSize);
        model.nativeOutputs = compilation.neurons.slice(totalHiddenSize);
        return model;
    }

    function predictCompiled(model, sequence) {
        if (!model.compiled) throw new Error("Compile the motor-current SNN before native inference.");
        const session = new S.Session(model.graph);
        for (let timestep = 0; timestep < sequence.length; timestep++) {
            const timestamp = timestep / model.sensorConfig.sampleRateHz;
            model.observationSource.observation = { timestamp: timestamp, values: sequence[timestep] };
            session.run(timestamp);
        }
        const frameTimestamp = sequence.length / model.sensorConfig.sampleRateHz;
        model.observationSource.observation = { timestamp: frameTimestamp, values: [], frameEnd: true };
        session.run(frameTimestamp);

        const scores = [];
        let neuronSpikes = 0;
        for (let neuron = 0; neuron < model.compilation.neurons.length; neuron++) {
            neuronSpikes += model.compilation.neurons[neuron].stateOf(session).spikeCount;
        }
        for (let output = 0; output < model.nativeOutputs.length; output++) {
            const neuron = model.nativeOutputs[output];
            const state = neuron.stateOf(session);
            scores.push(state.spikeCount * 2 + state.membranePotential / neuron.threshold);
        }
        const sensorState = model.sensor.stateOf(session).encoder;
        return {
            predicted: argmax(scores),
            scores: scores,
            sensorEvents: sensorState.spikeCount,
            neuronSpikes: neuronSpikes,
            eventTimesteps: sensorState.sampleCount,
        };
    }

    function defaultFrequencies(signalDomain, lineFrequencyHz) {
        if (signalDomain === "raw-current") {
            const line = positiveOr(lineFrequencyHz, 60);
            return [line, line * 3];
        }
        return [2, 3.5, 5];
    }

    function bandwidthOf(centerFrequencyHz, signalDomain) {
        if (signalDomain === "raw-current") return Math.max(4, centerFrequencyHz * 0.12);
        return Math.max(0.75, centerFrequencyHz * 0.5);
    }

    function copySensorConfig(config) {
        return {
            sampleRateHz: config.sampleRateHz,
            bands: config.bands.map(function (band) {
                const copy = Object.assign({}, band);
                if (Array.isArray(band.thresholds)) copy.thresholds = band.thresholds.slice();
                return copy;
            }),
            emitFrameEnd: config.emitFrameEnd !== false,
            diagnostics: config.diagnostics !== false,
        };
    }

    function formatBandId(value) {
        return String(Number(value).toFixed(6)).replace(/0+$/, "").replace(/\.$/, "").replace(".", "p");
    }

    function quantileSorted(values, percentile) {
        if (values.length === 0) return 0;
        const position = clamp(percentile, 0, 1) * (values.length - 1);
        const lower = Math.floor(position);
        const upper = Math.ceil(position);
        if (lower === upper) return values[lower];
        const fraction = position - lower;
        return values[lower] * (1 - fraction) + values[upper] * fraction;
    }

    function normalizeEncodingMode(value) {
        if (value === SENSOR_ENCODING_PHASE_AMPLITUDE || value === SENSOR_ENCODING_PHASE_MULTILEVEL) return value;
        return SENSOR_ENCODING_PHASE_BINARY;
    }

    function normalizeTopology(value) {
        if (value === TOPOLOGY_PHASE_DELAY_FUSION) return TOPOLOGY_PHASE_DELAY_FUSION;
        if (value === TOPOLOGY_PHASE_FUSION) return TOPOLOGY_PHASE_FUSION;
        if (value === TOPOLOGY_DENSE_RECURRENT) return TOPOLOGY_DENSE_RECURRENT;
        return TOPOLOGY_DENSE;
    }

    function normalizeDelayTicks(value) {
        const requested = Array.isArray(value) ? value : DEFAULT_PHASE_DELAY_TICKS;
        const normalized = requested
            .filter(function (delay) {
                return Number.isInteger(delay) && delay >= 0;
            })
            .filter(function (delay, index, delays) {
                return delays.indexOf(delay) === index;
            })
            .sort(function (left, right) {
                return left - right;
            });
        if (normalized.length === 0) throw new Error("Phase-delay fusion requires at least one non-negative integer delay.");
        return normalized;
    }

    function recurrentSources(target, neuronCount, fanIn) {
        const sources = [];
        const seen = new Set();
        for (let index = 0; index < fanIn; index++) {
            let offset = 1 + Math.floor((index * neuronCount) / fanIn);
            let source = (target - offset + neuronCount) % neuronCount;
            while ((source === target || seen.has(source)) && offset < neuronCount) {
                offset++;
                source = (target - offset + neuronCount) % neuronCount;
            }
            if (source !== target && !seen.has(source)) {
                seen.add(source);
                sources.push(source);
            }
        }
        return sources;
    }

    function normalizePairAuxiliaryLoss(value, outputSize) {
        if (!value || typeof value !== "object") return null;
        const labels = Array.isArray(value.labels)
            ? value.labels.filter(function (label, index, values) {
                  return Number.isInteger(label) && label >= 0 && label < outputSize && values.indexOf(label) === index;
              })
            : [];
        if (labels.length !== 2) throw new Error("Pair auxiliary loss requires exactly two valid output labels.");
        const mixtureWeight = Number(value.mixtureWeight);
        if (!Number.isFinite(mixtureWeight) || mixtureWeight <= 0) throw new Error("Pair auxiliary loss requires a positive mixture weight.");
        return {
            version: typeof value.version === "string" ? value.version : "final-frame-pair-mse-v1",
            labels: labels,
            mixtureWeight: mixtureWeight,
        };
    }

    function normalizeRuntimeDecoderObjective(value) {
        if (!value || typeof value !== "object") return null;
        const normalized = {
            version: typeof value.version === "string" ? value.version : RUNTIME_DECODER_OBJECTIVE_VERSION,
            spikeCountScale: value.spikeCountScale === undefined ? 2 : Number(value.spikeCountScale),
            membranePotentialScale: value.membranePotentialScale === undefined ? 1 : Number(value.membranePotentialScale),
            temperature: value.temperature === undefined ? 2 : Number(value.temperature),
            classificationLossWeight: value.classificationLossWeight === undefined ? 1 : Number(value.classificationLossWeight),
            temporalLossWeight: value.temporalLossWeight === undefined ? 0.25 : Number(value.temporalLossWeight),
        };
        if (!Number.isFinite(normalized.spikeCountScale) || normalized.spikeCountScale < 0) {
            throw new Error("Runtime decoder spike-count scale must be finite and non-negative.");
        }
        if (!Number.isFinite(normalized.membranePotentialScale) || normalized.membranePotentialScale < 0) {
            throw new Error("Runtime decoder membrane scale must be finite and non-negative.");
        }
        if (!Number.isFinite(normalized.temperature) || normalized.temperature <= 0) {
            throw new Error("Runtime decoder temperature must be positive.");
        }
        if (!Number.isFinite(normalized.classificationLossWeight) || normalized.classificationLossWeight < 0) {
            throw new Error("Runtime decoder classification-loss weight must be non-negative.");
        }
        if (!Number.isFinite(normalized.temporalLossWeight) || normalized.temporalLossWeight < 0) {
            throw new Error("Runtime decoder temporal-loss weight must be non-negative.");
        }
        return normalized;
    }

    function normalizeScopedPairAuxiliary(value, outputSize) {
        if (!value || typeof value !== "object") return null;
        const labels = Array.isArray(value.labels)
            ? value.labels.filter(function (label, index, values) {
                  return Number.isInteger(label) && label >= 0 && label < outputSize && values.indexOf(label) === index;
              })
            : [];
        if (labels.length !== 2) throw new Error("Scoped pair training requires exactly two valid output labels.");
        const learningRateScale = Number(value.learningRateScale);
        if (!Number.isFinite(learningRateScale) || learningRateScale <= 0) {
            throw new Error("Scoped pair training requires a positive learning-rate scale.");
        }
        return {
            version: typeof value.version === "string" ? value.version : "specialist-only-pair-mse-v1",
            labels: labels,
            learningRateScale: learningRateScale,
            optimizer: "sgd",
        };
    }

    function argmax(values) {
        let best = 0;
        for (let index = 1; index < values.length; index++) {
            if (values[index] > values[best]) best = index;
        }
        return best;
    }

    function classificationMargin(values, label) {
        if (!Number.isInteger(label) || label < 0 || label >= values.length) return null;
        let bestOther = Number.NEGATIVE_INFINITY;
        for (let index = 0; index < values.length; index++) {
            if (index !== label && values[index] > bestOther) bestOther = values[index];
        }
        return values[label] - bestOther;
    }

    function mulberry32(seed) {
        let state = seed >>> 0;
        return function () {
            state += 0x6d2b79f5;
            let value = state;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
    }

    function symmetric(random, scale) {
        return (random() * 2 - 1) * scale;
    }

    function positiveOr(value, fallback) {
        return Number.isFinite(value) && value > 0 ? value : fallback;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    root.MotorCurrentSnn = {
        DEFAULT_SAMPLE_RATE_HZ: DEFAULT_SAMPLE_RATE_HZ,
        DEFAULT_PERCENTILE: DEFAULT_PERCENTILE,
        SENSOR_ENCODING_PHASE_BINARY: SENSOR_ENCODING_PHASE_BINARY,
        SENSOR_ENCODING_PHASE_AMPLITUDE: SENSOR_ENCODING_PHASE_AMPLITUDE,
        SENSOR_ENCODING_PHASE_MULTILEVEL: SENSOR_ENCODING_PHASE_MULTILEVEL,
        FREQUENCY_SELECTION_MULTICLASS: FREQUENCY_SELECTION_MULTICLASS,
        FREQUENCY_SELECTION_TARGETED_PAIR: FREQUENCY_SELECTION_TARGETED_PAIR,
        TOPOLOGY_DENSE: TOPOLOGY_DENSE,
        TOPOLOGY_DENSE_RECURRENT: TOPOLOGY_DENSE_RECURRENT,
        TOPOLOGY_PHASE_FUSION: TOPOLOGY_PHASE_FUSION,
        TOPOLOGY_PHASE_DELAY_FUSION: TOPOLOGY_PHASE_DELAY_FUSION,
        RECURRENT_CORE_VERSION: RECURRENT_CORE_VERSION,
        PHASE_DELAY_CORE_VERSION: PHASE_DELAY_CORE_VERSION,
        TEMPORAL_POLICY: TEMPORAL_POLICY,
        SENSOR_PHENOTYPE_VERSION: SENSOR_PHENOTYPE_VERSION,
        RECEPTIVE_FIELD_TRAINING_VERSION: RECEPTIVE_FIELD_TRAINING_VERSION,
        SPIKE_ALIGNED_RECEPTIVE_FIELD_TRAINING_VERSION: SPIKE_ALIGNED_RECEPTIVE_FIELD_TRAINING_VERSION,
        RUNTIME_DECODER_OBJECTIVE_VERSION: RUNTIME_DECODER_OBJECTIVE_VERSION,
        FRAME_END_SLOT: FRAME_END_SLOT,
        createSensorConfig: createSensorConfig,
        calibrateSensor: calibrateSensor,
        selectFrequencyBands: selectFrequencyBands,
        trainReceptiveFields: trainReceptiveFields,
        trainSpikeAlignedReceptiveFields: trainSpikeAlignedReceptiveFields,
        encodeSequence: encodeSequence,
        buildModel: buildModel,
        trainScopedPairBatch: trainScopedPairBatch,
        analyzeTeacher: analyzeTeacher,
        profileForwardContract: profileForwardContract,
        profileTeacherConversion: profileTeacherConversion,
        compileModel: compileModel,
        predictCompiled: predictCompiled,
    };
})(window);
