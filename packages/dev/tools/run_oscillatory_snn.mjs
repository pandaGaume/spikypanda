import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../core/bundle/spikypanda-core.js";

globalThis.window = globalThis;
await import("../../host/www/samples/motor_current/motor_current_snn.js");

const { OscillatorySnnModel, TemporalDeltaSpikeEncoder, WaveSpikeEncoder, createOscillatoryVariantConfig, runOscillatoryAblation } = globalThis.SpikypandaCore;
const MotorCurrentSnn = globalThis.MotorCurrentSnn;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const defaults = {
    train: path.join(repositoryRoot, "packages/host/www/data/motor_current/train_grouped.json"),
    test: path.join(repositoryRoot, "packages/host/www/data/motor_current/test_grouped.json"),
    epochs: 3,
    hidden: 8,
    modes: 2,
    limitPerClass: 12,
    seed: 0x4f53434c,
    percentile: 0.75,
    batchSize: 16,
    encoder: "both",
    minimumBaselineLift: 0.02,
    baselineAlpha: 0.05,
    output: null,
    quiet: false,
};

const options = parseArguments(process.argv.slice(2), defaults);
const runStartedAt = Date.now();
const writeStatus = (message) => {
    if (!options.quiet) process.stderr.write(`[oscillatory-snn ${formatElapsed(Date.now() - runStartedAt)}] ${message}\n`);
};
const writeProgress = createProgressWriter(writeStatus);
writeStatus("Loading grouped motor-current datasets...");
const trainDocument = JSON.parse(await readFile(options.train, "utf8"));
const testDocument = JSON.parse(await readFile(options.test, "utf8"));
const split = splitTrainingValidation(trainDocument.samples);
const trainingSamples = balancedLimit(split.train, options.limitPerClass);
const validationSamples = balancedLimit(split.validation, options.limitPerClass);
const testSamples = balancedLimit(testDocument.samples, options.limitPerClass);
const channelCount = Number(trainDocument.channels) || trainingSamples[0].sequence[0].length;
const sampleRateHz = Number(trainDocument.sampleRateHz) || 120;
const encoders = createEncoderExperiments(options.encoder, {
    trainingSamples,
    channelCount,
    sampleRateHz,
    signalDomain: trainDocument.signalDomain,
    lineFrequencyHz: trainDocument.lineFrequencyHz,
    deltaPercentile: options.percentile,
});
writeStatus(
    `Prepared ${trainingSamples.length} training, ${validationSamples.length} validation and ${testSamples.length} independent test samples for ${encoders.length} encoder(s).`
);
writeStatus(
    `Starting gated A-D experiments with ${options.epochs} epoch(s), mini-batches of ${options.batchSize}, ${options.hidden} hidden neurons and ${options.modes} collective mode(s).`
);

const chanceAccuracy = 1 / trainDocument.classes.length;
const historicalEncoder = encoders.find((encoder) => encoder.id === "historical-wave-bands");
const historicalReference = historicalEncoder
    ? runHistoricalReference({
          encoder: historicalEncoder,
          trainingSamples,
          validationSamples,
          testSamples,
          chanceAccuracy,
          options,
          outputSize: trainDocument.classes.length,
          writeStatus,
      })
    : null;
const experiments = [];
for (const encoder of encoders) {
    writeStatus(`Encoder ${encoder.id}: encoding all shared splits.`);
    const training = encoder.encode(trainingSamples);
    const validation = encoder.encode(validationSamples);
    const test = encoder.encode(testSamples);
    experiments.push(
        runEncoderExperiment({
            encoder,
            training,
            validation,
            test,
            chanceAccuracy,
            options,
            outputSize: trainDocument.classes.length,
            sampleRateHz,
            writeProgress,
            writeStatus,
        })
    );
}
writeStatus("All eligible variants completed. Serializing the report...");

const report = {
    protocol: "oscillatory-snn-encoder-architecture-matrix-v2",
    createdAt: new Date().toISOString(),
    dataset: {
        splitProtocol: trainDocument.splitProtocol,
        validationProtocol: "train-holdout-12.5-v1-grouped",
        sampleRateHz,
        classes: trainDocument.classes,
        trainingSamples: trainingSamples.length,
        validationSamples: validationSamples.length,
        independentTestSamples: testSamples.length,
        chanceAccuracy,
    },
    temporalEncoders: encoders.map((encoder) => encoder.metadata),
    training: {
        epochs: options.epochs,
        batchSize: options.batchSize,
        deterministicShuffleSeed: options.seed,
        hiddenNeurons: options.hidden,
        collectiveModes: options.modes,
        seed: options.seed,
        minimumBaselineLift: options.minimumBaselineLift,
        baselineSignificanceAlpha: options.baselineAlpha,
    },
    historicalReference,
    experiments,
};

const serialized = JSON.stringify(report, null, 2);
if (options.output) {
    const outputPath = path.resolve(options.output);
    await writeFile(outputPath, serialized + "\n", "utf8");
    process.stdout.write(`Wrote ${outputPath}\n`);
} else {
    process.stdout.write(serialized + "\n");
}

function createEncoderExperiments(requested, context) {
    const encoders = [];
    if (requested === "both" || requested === "historical") {
        const selectedBands = MotorCurrentSnn.selectFrequencyBands(context.trainingSamples, context.sampleRateHz, {
            signalDomain: context.signalDomain,
            lineFrequencyHz: context.lineFrequencyHz,
            count: 3,
            minFrequencyHz: 1.5,
            maxFrequencyHz: 8,
            strategy: MotorCurrentSnn.FREQUENCY_SELECTION_MULTICLASS,
        });
        const baseConfig = MotorCurrentSnn.createSensorConfig({
            sampleRateHz: context.sampleRateHz,
            signalDomain: context.signalDomain,
            lineFrequencyHz: context.lineFrequencyHz,
            channelCount: context.channelCount,
            frequenciesHz: selectedBands.map((band) => band.frequencyHz),
            encodingMode: MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL,
        });
        const sensorConfig = MotorCurrentSnn.calibrateSensor(
            context.trainingSamples,
            baseConfig,
            MotorCurrentSnn.DEFAULT_PERCENTILE,
            MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL
        );
        const prototype = new WaveSpikeEncoder(sensorConfig);
        const inputIndexBySlot = new Map(prototype.outputPorts.map((port, index) => [port.slot, index]));
        encoders.push({
            id: "historical-wave-bands",
            inputSize: prototype.outputPorts.length,
            inputWeightScale: 0.5 / Math.sqrt(3),
            sensorConfig,
            metadata: {
                id: "historical-wave-bands",
                kind: "historical-wave-spike-sensor",
                role: "historical-input-control",
                frequencyParameters: selectedBands.length,
                selectedFrequenciesHz: selectedBands.map((band) => band.frequencyHz),
                selectionSource: selectedBands.map((band) => band.source),
                encoding: MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL,
                percentile: MotorCurrentSnn.DEFAULT_PERCENTILE,
                inputSize: prototype.outputPorts.length,
            },
            encode: (samples) => encodeWaveDataset(samples, sensorConfig, inputIndexBySlot),
        });
    }
    if (requested === "both" || requested === "delta") {
        const sensorConfig = calibrateDeltaSensor(context.trainingSamples, context.channelCount, context.deltaPercentile);
        encoders.push({
            id: "frequency-free-delta",
            inputSize: sensorConfig.channels.length * 2,
            inputWeightScale: 0.5,
            metadata: {
                id: "frequency-free-delta",
                kind: "send-on-delta",
                role: "frequency-free-experimental",
                frequencyParameters: 0,
                percentile: context.deltaPercentile,
                thresholds: sensorConfig.channels.map((channel) => channel.threshold),
                inputSize: sensorConfig.channels.length * 2,
            },
            encode: (samples) => encodeDeltaDataset(samples, sensorConfig, context.sampleRateHz),
        });
    }
    return encoders;
}

function runHistoricalReference({ encoder, trainingSamples, validationSamples, testSamples, chanceAccuracy, options, outputSize, writeStatus }) {
    const hiddenSize = options.hidden;
    writeStatus(`Historical reference: building the unchanged dense LIF baseline with ${hiddenSize} hidden neurons.`);
    const runtimeDecoderObjective = {
        version: MotorCurrentSnn.RUNTIME_DECODER_OBJECTIVE_VERSION,
        spikeCountScale: 2,
        membranePotentialScale: 1,
        temperature: 2,
        classificationLossWeight: 1,
        temporalLossWeight: 0.25,
    };
    const model = MotorCurrentSnn.buildModel({
        hiddenSize,
        outputSize,
        windowSize: trainingSamples[0].sequence.length,
        sensorConfig: encoder.sensorConfig,
        sensorEncoding: MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL,
        topology: MotorCurrentSnn.TOPOLOGY_DENSE,
        runtimeDecoderObjective,
        seed: options.seed,
        learningRate: 0.003,
    });
    const encodedTraining = trainingSamples.map((sample) =>
        MotorCurrentSnn.encodeSequence(sample.sequence, sample.label, outputSize, {
            sensorConfig: model.sensorConfig,
            inputIndexBySlot: model.inputIndexBySlot,
            runtimeDecoderObjective,
            preserveEmptyTimesteps: false,
        })
    );
    let best = snapshotHistoricalWeights(model);
    let bestEpoch = -1;
    let bestValidation = evaluateHistoricalReference(model, validationSamples);
    const history = [];
    let lastBatchStatusAt = 0;
    for (let epoch = 0; epoch < options.epochs; epoch++) {
        let weightedLoss = 0;
        for (let start = 0; start < encodedTraining.length; start += options.batchSize) {
            const batch = encodedTraining.slice(start, start + options.batchSize);
            weightedLoss += model.trainer.trainBatch(batch) * batch.length;
            const now = Date.now();
            if (start + batch.length === encodedTraining.length || now - lastBatchStatusAt >= 5000) {
                lastBatchStatusAt = now;
                writeStatus(
                    `Historical reference: epoch ${epoch + 1}/${options.epochs}, batch ${Math.floor(start / options.batchSize) + 1}/${Math.ceil(encodedTraining.length / options.batchSize)}.`
                );
            }
        }
        const trainLoss = weightedLoss / encodedTraining.length;
        const validation = evaluateHistoricalReference(model, validationSamples);
        history.push({ epoch, trainLoss, validationLoss: validation.loss, validationAccuracy: validation.accuracy });
        writeStatus(
            `Historical reference: epoch ${epoch + 1}/${options.epochs} completed, train loss ${formatMetric(trainLoss)}, validation accuracy ${formatPercent(validation.accuracy)}.`
        );
        if (validation.accuracy > bestValidation.accuracy || (validation.accuracy === bestValidation.accuracy && validation.loss < bestValidation.loss)) {
            bestEpoch = epoch;
            bestValidation = validation;
            best = snapshotHistoricalWeights(model);
        }
    }
    restoreHistoricalWeights(model, best);
    const train = evaluateHistoricalReference(model, trainingSamples);
    const validation = evaluateHistoricalReference(model, validationSamples);
    const test = evaluateHistoricalReference(model, testSamples);
    const lift = validation.accuracy - chanceAccuracy;
    const chancePValue = binomialUpperTail(validation.correct, validation.sampleCount, chanceAccuracy);
    writeStatus(
        `Historical reference: completed at ${formatPercent(validation.accuracy)} validation accuracy (${formatPercent(lift)} lift over chance, p=${formatPValue(chancePValue)}).`
    );
    return {
        architecture: "snn-wave-lif-hard-forward-v5",
        topology: MotorCurrentSnn.TOPOLOGY_DENSE,
        encoder: encoder.id,
        hiddenNeurons: hiddenSize,
        batchSize: options.batchSize,
        bestEpoch,
        chanceAccuracy,
        validationLiftOverChance: lift,
        oneSidedChancePValue: chancePValue,
        train,
        validation,
        test,
        history,
    };
}

function evaluateHistoricalReference(model, samples) {
    let correct = 0;
    let loss = 0;
    let margin = 0;
    let sensorEvents = 0;
    let hiddenSpikes = 0;
    let outputSpikes = 0;
    let duration = 0;
    for (const sample of samples) {
        const analysis = MotorCurrentSnn.analyzeTeacher(model, sample.sequence, sample.label, true);
        correct += Number(analysis.runtimePredicted === sample.label);
        loss += analysis.trainingLoss;
        margin += analysis.runtimeMargin;
        sensorEvents += analysis.sensorEvents;
        hiddenSpikes += analysis.hiddenSpikeCounts.reduce((total, value) => total + value, 0);
        outputSpikes += analysis.outputSpikeCounts.reduce((total, value) => total + value, 0);
        duration += analysis.durationSeconds;
    }
    return {
        loss: loss / samples.length,
        accuracy: correct / samples.length,
        correct,
        sampleCount: samples.length,
        meanMargin: margin / samples.length,
        sensorEvents,
        hiddenFiringRateHz: hiddenSpikes / Math.max(duration * model.totalHiddenSize, 1e-12),
        outputFiringRateHz: outputSpikes / Math.max(duration * model.outputSize, 1e-12),
    };
}

function snapshotHistoricalWeights(model) {
    return model.trainer.synapses.map((synapse) => synapse.weight);
}

function restoreHistoricalWeights(model, snapshot) {
    for (let index = 0; index < snapshot.length; index++) model.trainer.synapses[index].weight = snapshot[index];
}

function runEncoderExperiment({ encoder, training, validation, test, chanceAccuracy, options, outputSize, sampleRateHz, writeProgress, writeStatus }) {
    const common = {
        createModel: (variant) =>
            createModel(variant, {
                inputSize: encoder.inputSize,
                outputSize,
                hiddenSize: options.hidden,
                modeCount: options.modes,
                timeStepSeconds: 1 / sampleRateHz,
                seed: options.seed,
                inputWeightScale: encoder.inputWeightScale,
            }),
        training,
        validation,
        test,
        epochs: options.epochs,
        batchSize: options.batchSize,
        shuffleSeed: options.seed,
        retainTraces: false,
        trainer: { learningRate: 0.003, gradientClip: 1, optimizer: "adam" },
        onProgress: options.quiet ? undefined : (progress) => writeProgress({ encoder: encoder.id, ...progress }),
    };
    writeStatus(`Encoder ${encoder.id}: validating control A before B-D.`);
    const baseline = runOscillatoryAblation({ ...common, variants: ["A"] });
    const baselineAccuracy = baseline[0].validation.hardAccuracy;
    const baselineLift = baselineAccuracy - chanceAccuracy;
    const baselineCorrect = Math.round(baselineAccuracy * validation.length);
    const chancePValue = binomialUpperTail(baselineCorrect, validation.length, chanceAccuracy);
    const gateBypassed = options.minimumBaselineLift < 0;
    const gatePassed = gateBypassed || (baselineLift >= options.minimumBaselineLift && chancePValue <= options.baselineAlpha);
    let results = baseline;
    if (gatePassed) {
        writeStatus(`Encoder ${encoder.id}: A passed the gate at ${formatPercent(baselineAccuracy)} (chance p=${formatPValue(chancePValue)}); launching B-D.`);
        results = baseline.concat(runOscillatoryAblation({ ...common, variants: ["B", "C", "D"] }));
    } else {
        writeStatus(
            `Encoder ${encoder.id}: A failed the gate at ${formatPercent(baselineAccuracy)} (chance ${formatPercent(chanceAccuracy)}, p=${formatPValue(chancePValue)}); B-D skipped.`
        );
    }
    return {
        encoder: encoder.id,
        baselineGate: {
            chanceAccuracy,
            minimumLift: options.minimumBaselineLift,
            observedAccuracy: baselineAccuracy,
            observedLift: baselineLift,
            correct: baselineCorrect,
            sampleCount: validation.length,
            oneSidedChancePValue: chancePValue,
            significanceAlpha: options.baselineAlpha,
            bypassed: gateBypassed,
            passed: gatePassed,
        },
        variants: results.map((result) => ({ ...compactResult(result), validationLiftOverChance: result.validation.hardAccuracy - chanceAccuracy })),
    };
}

function encodeWaveDataset(samples, sensorConfig, inputIndexBySlot) {
    return samples.map((sample) => {
        const encoder = new WaveSpikeEncoder(sensorConfig);
        const state = encoder.createState();
        const inputs = [];
        const timestamps = [];
        for (let timestep = 0; timestep < sample.sequence.length; timestep++) {
            const timestamp = timestep / sensorConfig.sampleRateHz;
            const emissions = encoder.encode({ timestamp, values: sample.sequence[timestep] }, state);
            const row = new Array(inputIndexBySlot.size).fill(0);
            for (const emission of emissions) {
                const inputIndex = inputIndexBySlot.get(emission.slot);
                if (inputIndex !== undefined) row[inputIndex] += emission.amplitude;
            }
            inputs.push(row);
            timestamps.push(timestamp);
        }
        return { inputs, timestamps, targetOutput: sample.label };
    });
}

function createModel(variant, options) {
    const inputRealRandom = mulberry32(options.seed ^ 0x243f6a88);
    const inputImaginaryRandom = mulberry32(options.seed ^ 0x85a308d3);
    const outputRealRandom = mulberry32(options.seed ^ 0x13198a2e);
    const outputImaginaryRandom = mulberry32(options.seed ^ 0x03707344);
    const collectiveRealRandom = mulberry32(options.seed ^ 0xa4093822);
    const collectiveImaginaryRandom = mulberry32(options.seed ^ 0x299f31d0);
    const complex = variant === "B" || variant === "D";
    const duration = 128 * options.timeStepSeconds;
    const neurons = [];
    for (let neuron = 0; neuron < options.hiddenSize; neuron++) {
        const multiplier = [4, 8, 16, 32][neuron % 4];
        neurons.push({
            id: `hidden-${neuron}`,
            layer: "hidden",
            threshold: 0.8,
            membraneTimeConstant: multiplier * options.timeStepSeconds,
            angularFrequency: 0,
            surrogateSlope: 1.25,
        });
    }
    for (let output = 0; output < options.outputSize; output++) {
        neurons.push({
            id: `class-${output}`,
            layer: "output",
            threshold: 0.8,
            membraneTimeConstant: duration,
            angularFrequency: 0,
            surrogateSlope: 1.25,
        });
    }

    const synapses = [];
    const inputScale = options.inputWeightScale;
    for (let input = 0; input < options.inputSize; input++) {
        for (let hidden = 0; hidden < options.hiddenSize; hidden++) {
            synapses.push({
                inputIndex: input,
                targetNeuron: hidden,
                weightReal: symmetric(inputRealRandom, inputScale),
                weightImaginary: complex ? symmetric(inputImaginaryRandom, inputScale) : 0,
            });
        }
    }
    const outputScale = 0.6 / Math.sqrt(options.hiddenSize);
    for (let hidden = 0; hidden < options.hiddenSize; hidden++) {
        for (let output = 0; output < options.outputSize; output++) {
            synapses.push({
                sourceNeuron: hidden,
                targetNeuron: options.hiddenSize + output,
                weightReal: symmetric(outputRealRandom, outputScale),
                weightImaginary: complex ? symmetric(outputImaginaryRandom, outputScale) : 0,
            });
        }
    }
    const base = {
        inputSize: options.inputSize,
        timeStepSeconds: options.timeStepSeconds,
        neurons,
        synapses,
        outputNeurons: new Array(options.outputSize).fill(null).map((_, output) => options.hiddenSize + output),
        decoder: { spikeCountScale: 2, stateScale: 1, temperature: 2 },
    };
    const coefficientScale = 0.1 / Math.sqrt(neurons.length);
    const collective = {
        modeCount: options.modeCount,
        alphaReal: randomMatrix(neurons.length, options.modeCount, collectiveRealRandom, coefficientScale),
        alphaImaginary: complex ? randomMatrix(neurons.length, options.modeCount, collectiveImaginaryRandom, coefficientScale) : undefined,
        gammaReal: randomMatrix(neurons.length, options.modeCount, collectiveRealRandom, coefficientScale),
        gammaImaginary: complex ? randomMatrix(neurons.length, options.modeCount, collectiveImaginaryRandom, coefficientScale) : undefined,
        trainable: true,
    };
    return new OscillatorySnnModel(createOscillatoryVariantConfig(variant, base, variant === "C" || variant === "D" ? collective : undefined));
}

function calibrateDeltaSensor(samples, channelCount, percentile) {
    const deltas = new Array(channelCount).fill(null).map(() => []);
    for (const sample of samples) {
        for (let timestep = 1; timestep < sample.sequence.length; timestep++) {
            for (let channel = 0; channel < channelCount; channel++) {
                const delta = Math.abs(sample.sequence[timestep][channel] - sample.sequence[timestep - 1][channel]);
                if (Number.isFinite(delta) && delta > 0) deltas[channel].push(delta);
            }
        }
    }
    return {
        channels: deltas.map((values, channel) => {
            values.sort((left, right) => left - right);
            return {
                id: `current-${channel}`,
                channel,
                threshold: Math.max(1e-6, quantileSorted(values, percentile)),
            };
        }),
        maxEventsPerSample: 8,
    };
}

function encodeDeltaDataset(samples, sensorConfig, sampleRateHz) {
    return samples.map((sample) => {
        const encoder = new TemporalDeltaSpikeEncoder(sensorConfig);
        const state = encoder.createState();
        const inputs = [];
        const timestamps = [];
        for (let timestep = 0; timestep < sample.sequence.length; timestep++) {
            const timestamp = timestep / sampleRateHz;
            const emissions = encoder.encode({ timestamp, values: sample.sequence[timestep] }, state);
            inputs.push(encoder.vectorOf(emissions));
            timestamps.push(timestamp);
        }
        return { inputs, timestamps, targetOutput: sample.label };
    });
}

function splitTrainingValidation(samples) {
    const strata = new Map();
    for (const sample of samples) {
        const stratum = `${sample.label}|${sample.sourceLoad || "unknown"}`;
        if (!strata.has(stratum)) strata.set(stratum, new Map());
        const groups = strata.get(stratum);
        if (!groups.has(sample.sourceGroup)) groups.set(sample.sourceGroup, []);
        groups.get(sample.sourceGroup).push(sample);
    }
    const validationGroups = new Set();
    for (const [stratum, groups] of strata) {
        const names = Array.from(groups.keys()).sort((left, right) => {
            const leftHash = hashText(`${stratum}|${left}`);
            const rightHash = hashText(`${stratum}|${right}`);
            return leftHash - rightHash || left.localeCompare(right);
        });
        const count = Math.max(1, Math.round(names.length * 0.125));
        for (let index = 0; index < count && index < names.length; index++) validationGroups.add(names[index]);
    }
    return {
        train: samples.filter((sample) => !validationGroups.has(sample.sourceGroup)),
        validation: samples.filter((sample) => validationGroups.has(sample.sourceGroup)),
    };
}

function balancedLimit(samples, perClass) {
    if (!Number.isFinite(perClass) || perClass <= 0) return samples.slice();
    const counts = new Map();
    return samples.filter((sample) => {
        const count = counts.get(sample.label) ?? 0;
        if (count >= perClass) return false;
        counts.set(sample.label, count + 1);
        return true;
    });
}

function compactResult(result) {
    return {
        variant: result.variant,
        bestEpoch: result.fit.bestEpoch,
        trainLoss: result.train.loss,
        validationLoss: result.validation.loss,
        hardTrainAccuracy: result.train.hardAccuracy,
        hardValidationAccuracy: result.validation.hardAccuracy,
        independentTestAccuracy: result.test.hardAccuracy,
        surrogateAccuracy: result.validation.surrogateAccuracy,
        surrogateToHardGap: result.validation.surrogateToHardGap,
        validationMargin: result.validation.meanMargin,
        firingRateByLayerHz: result.validation.firingRateByLayerHz,
        firingRateByClassHz: result.validation.firingRateByClassHz,
        collectiveSpectrum: result.spectrum.map((mode) => ({
            mode: mode.mode,
            dominantFrequencyHz: mode.dominantFrequencyHz,
            halfPowerBandHz: mode.halfPowerBandHz,
            dominantPower: mode.dominantPower,
        })),
        eventCount: result.test.eventCount,
        meanLatencyMilliseconds: result.test.meanLatencyMilliseconds,
        cost: result.cost,
    };
}

function parseArguments(args, fallback) {
    const options = { ...fallback };
    for (let index = 0; index < args.length; index++) {
        const value = args[index];
        const next = args[index + 1];
        if (value === "--train") ((options.train = path.resolve(next)), index++);
        else if (value === "--test") ((options.test = path.resolve(next)), index++);
        else if (value === "--epochs") ((options.epochs = nonNegativeInteger(next, value)), index++);
        else if (value === "--hidden") ((options.hidden = positiveInteger(next, value)), index++);
        else if (value === "--modes") ((options.modes = positiveInteger(next, value)), index++);
        else if (value === "--batch-size") ((options.batchSize = positiveInteger(next, value)), index++);
        else if (value === "--encoder") ((options.encoder = encoderChoice(next, value)), index++);
        else if (value === "--limit-per-class") ((options.limitPerClass = nonNegativeInteger(next, value)), index++);
        else if (value === "--seed") ((options.seed = nonNegativeInteger(next, value)), index++);
        else if (value === "--percentile") ((options.percentile = boundedNumber(next, 0.5, 0.99, value)), index++);
        else if (value === "--minimum-baseline-lift") ((options.minimumBaselineLift = boundedNumber(next, 0, 0.8, value)), index++);
        else if (value === "--baseline-alpha") ((options.baselineAlpha = boundedNumber(next, 0.001, 0.2, value)), index++);
        else if (value === "--output") ((options.output = next), index++);
        else if (value === "--full") options.limitPerClass = 0;
        else if (value === "--allow-chance-baseline") options.minimumBaselineLift = -1;
        else if (value === "--quiet") options.quiet = true;
        else throw new Error(`Unknown argument ${value}.`);
    }
    return options;
}

function createProgressWriter(writeStatus) {
    let lastHeartbeatAt = 0;
    let lastPhase = "";
    return (progress) => {
        const now = Date.now();
        const phaseKey = `${progress.encoder}:${progress.variant}:${progress.phase}:${progress.epoch ?? ""}:${progress.dataset ?? ""}`;
        const phaseChanged = phaseKey !== lastPhase;
        const completed = progress.completedSamples ?? 0;
        const total = progress.totalSamples ?? 0;
        const finishedPhase = total > 0 && completed === total;
        if (!phaseChanged && !finishedPhase && now - lastHeartbeatAt < 5000) return;
        lastPhase = phaseKey;
        lastHeartbeatAt = now;
        const prefix = `${progress.encoder} variant ${progress.variant}`;

        if (progress.phase === "variant-start") {
            writeStatus(`${prefix}: starting.`);
            return;
        }
        if (progress.phase === "variant-complete") {
            writeStatus(`${prefix}: completed.`);
            return;
        }
        if (progress.phase === "epoch-complete") {
            writeStatus(
                `${prefix}: epoch ${progress.epoch}/${progress.totalEpochs} completed, train loss ${formatMetric(progress.trainLoss)}, validation loss ${formatMetric(progress.validationLoss)}, validation accuracy ${formatPercent(progress.validationAccuracy)}.`
            );
            return;
        }
        if (progress.phase === "profiling") {
            writeStatus(`${prefix}: profiling ${progress.dataset} ${completed}/${total}.`);
            return;
        }
        const epoch = progress.phase === "initial-validation" ? "initial validation" : `epoch ${progress.epoch}/${progress.totalEpochs} ${progress.phase}`;
        const batch = progress.batch ? `, batch ${progress.batch}/${progress.totalBatches}` : "";
        writeStatus(`${prefix}: ${epoch} ${completed}/${total}${batch}.`);
    };
}

function formatElapsed(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    if (hours > 0) return `+${hours}h${String(minutes).padStart(2, "0")}m${String(remainder).padStart(2, "0")}s`;
    if (minutes > 0) return `+${minutes}m${String(remainder).padStart(2, "0")}s`;
    return `+${remainder}s`;
}

function formatMetric(value) {
    return Number.isFinite(value) ? value.toFixed(5) : "n/a";
}

function formatPercent(value) {
    return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "n/a";
}

function formatPValue(value) {
    if (!Number.isFinite(value)) return "n/a";
    return value < 0.0001 ? value.toExponential(2) : value.toFixed(4);
}

function binomialUpperTail(correct, sampleCount, probability) {
    if (correct <= 0) return 1;
    if (correct > sampleCount) return 0;
    const logarithms = [];
    for (let successes = correct; successes <= sampleCount; successes++) {
        logarithms.push(logBinomialCoefficient(sampleCount, successes) + successes * Math.log(probability) + (sampleCount - successes) * Math.log(1 - probability));
    }
    const maximum = Math.max(...logarithms);
    return Math.min(1, Math.exp(maximum) * logarithms.reduce((sum, value) => sum + Math.exp(value - maximum), 0));
}

function logBinomialCoefficient(sampleCount, successes) {
    const smaller = Math.min(successes, sampleCount - successes);
    let result = 0;
    for (let index = 1; index <= smaller; index++) result += Math.log(sampleCount - smaller + index) - Math.log(index);
    return result;
}

function randomMatrix(rows, columns, random, scale) {
    return new Array(rows).fill(null).map(() => new Array(columns).fill(null).map(() => symmetric(random, scale)));
}

function quantileSorted(values, percentile) {
    if (values.length === 0) return 1e-3;
    const position = percentile * (values.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return values[lower];
    const fraction = position - lower;
    return values[lower] * (1 - fraction) + values[upper] * fraction;
}

function hashText(text, seed = 2166136261) {
    let hash = seed >>> 0;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
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

function positiveInteger(value, label) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} requires a positive integer.`);
    return parsed;
}

function nonNegativeInteger(value, label) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} requires a non-negative integer.`);
    return parsed;
}

function boundedNumber(value, minimum, maximum, label) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
    return parsed;
}

function encoderChoice(value, label) {
    if (value !== "both" && value !== "historical" && value !== "delta") throw new Error(`${label} must be both, historical or delta.`);
    return value;
}
