import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

globalThis.window = globalThis;
await import("../core/bundle/spikypanda-core.js");
await import("../../host/www/samples/motor_current/motor_current_snn.js");

const Core = globalThis.SpikypandaCore;
const MotorCurrentSnn = globalThis.MotorCurrentSnn;
if (!Core || !MotorCurrentSnn) throw new Error("The SpikyPanda core bundle and motor-current SNN adapter must be available.");

const { countOrdinalViolations, decodeHierarchicalClassification, decodeOneVsReference, decodeOrdinalClassification, summarizeClassification } = Core;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CLASS_NAMES = ["Healthy", "BRB1", "BRB2", "BRB3", "BRB4"];
const VALIDATION_PROTOCOL = "train-holdout-12.5-v1-grouped";
const DEFAULT_SEED = 0x534e4e31;

const options = parseArguments(process.argv.slice(2));
if (options.help) {
    printHelp();
} else {
    try {
        await runExperiment(options);
    } catch (error) {
        console.error("[snn-topology] ERROR: " + (error instanceof Error ? error.stack || error.message : String(error)));
        process.exitCode = 1;
    }
}

async function runExperiment(settings) {
    status("Loading grouped motor-current datasets...");
    const datasetDirectory = path.resolve(ROOT, settings.dataDirectory);
    const testDatasetDirectory = settings.testDataDirectory ? path.resolve(ROOT, settings.testDataDirectory) : datasetDirectory;
    const trainJson = JSON.parse(await readFile(path.join(datasetDirectory, "train_grouped.json"), "utf8"));
    const testJson = JSON.parse(await readFile(path.join(testDatasetDirectory, "test_grouped.json"), "utf8"));
    validateDataset(trainJson, testJson);

    const allTraining = trainJson.samples.map(copySample);
    const allTest = testJson.samples.map(copySample);
    const split = splitTrainingValidation(allTraining);
    const perClass = settings.full ? Number.POSITIVE_INFINITY : settings.perClass;
    const training = balancedLimit(split.train, perClass);
    const validation = balancedLimit(split.validation, perClass);
    const test = balancedLimit(allTest, perClass);
    status(`Dataset ready: ${training.length} train, ${validation.length} validation, ${test.length} independent test samples.`);

    const sampleRateHz = trainJson.sampleRateHz;
    status("Selecting and calibrating the unchanged historical wave-band encoder on training data only...");
    const selectedBands = MotorCurrentSnn.selectFrequencyBands(training, sampleRateHz, {
        count: 3,
        minFrequencyHz: 1.5,
        maxFrequencyHz: 8,
        strategy: MotorCurrentSnn.FREQUENCY_SELECTION_MULTICLASS,
    });
    const baseSensorConfig = MotorCurrentSnn.createSensorConfig({
        sampleRateHz,
        signalDomain: trainJson.signalDomain,
        lineFrequencyHz: trainJson.lineFrequencyHz,
        channelCount: training[0].sequence[0].length,
        frequenciesHz: selectedBands.map((band) => band.frequencyHz),
        encodingMode: MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL,
    });
    const sensorConfig = MotorCurrentSnn.calibrateSensor(training, baseSensorConfig, MotorCurrentSnn.DEFAULT_PERCENTILE, MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL);
    const common = {
        sensorConfig,
        windowSize: training[0].sequence.length,
        epochs: settings.epochs,
        batchSize: settings.batchSize,
        learningRate: settings.learningRate,
        seed: settings.seed,
    };

    if (settings.only === "phase-delay") {
        const phaseDelayRun = await trainPhaseDelay({ common, training, validation, test, settings });
        const { phaseDelayModel, phaseDelayFit, phaseDelayValidation, phaseDelayTest } = phaseDelayRun;
        const report = {
            protocol: "motor-current-snn-phase-delay-fusion-v1",
            createdAt: new Date().toISOString(),
            dataset: {
                splitProtocol: trainJson.splitProtocol,
                validationProtocol: VALIDATION_PROTOCOL,
                sampleRateHz,
                windowSize: trainJson.windowSize,
                trainingStride: trainJson.stride,
                independentTestStride: testJson.stride,
                lineFrequencyHz: trainJson.lineFrequencyHz,
                preprocessing: trainJson.preprocessing,
                classes: CLASS_NAMES,
                trainingSamples: training.length,
                validationSamples: validation.length,
                independentTestSamples: test.length,
            },
            encoder: {
                kind: "historical-wave-spike-sensor",
                encoding: MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL,
                percentile: MotorCurrentSnn.DEFAULT_PERCENTILE,
                selectedFrequenciesHz: selectedBands.map((band) => band.frequencyHz),
                selectionSource: selectedBands.map((band) => band.source),
            },
            training: {
                epochs: settings.epochs,
                batchSize: settings.batchSize,
                learningRate: settings.learningRate,
                learningRateSchedule: learningRatePolicy(settings),
                seed: settings.seed,
                checkpointRule: "maximum balanced validation accuracy; lower validation loss wins ties",
                denseTimesteps: true,
            },
            phaseDelay: {
                architecture: "one-LIF-per-phase-port-then-fixed-delay-bank-and-fusion",
                parameterCount: phaseDelayModel.trainableWeightCount,
                hiddenShape: phaseDelayModel.hiddenShape,
                relayNeurons: phaseDelayModel.phaseDelayCore.relayNeuronCount,
                fusionNeurons: phaseDelayModel.phaseDelayCore.fusionNeuronCount,
                delayTicks: phaseDelayModel.phaseDelayCore.delayTicks,
                delayMilliseconds: phaseDelayModel.phaseDelayCore.delaySeconds.map((seconds) => seconds * 1000),
                delaySynapses: phaseDelayModel.phaseDelayCore.synapseCount,
                activity: phaseDelayRun.phaseDelayActivity,
                fit: compactFit(phaseDelayFit),
                validation: phaseDelayValidation,
                test: phaseDelayTest,
            },
        };
        const outputPath = path.resolve(ROOT, settings.output);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
        status(`Report written to ${path.relative(ROOT, outputPath)}.`);
        console.log(`\nIndependent test: phase-delay ${percent(report.phaseDelay.test.accuracy)}, ${report.phaseDelay.parameterCount} weights.`);
        return;
    }

    if (settings.only === "one-vs-healthy") {
        const specialistRun = await trainOneVsHealthy({ common, training, validation, test, settings });
        const report = {
            protocol: "motor-current-snn-one-vs-healthy-capacity-v1",
            createdAt: new Date().toISOString(),
            dataset: {
                splitProtocol: trainJson.splitProtocol,
                validationProtocol: VALIDATION_PROTOCOL,
                sampleRateHz,
                windowSize: trainJson.windowSize,
                trainingStride: trainJson.stride,
                independentTestStride: testJson.stride,
                classes: CLASS_NAMES,
                trainingSamples: training.length,
                validationSamples: validation.length,
                independentTestSamples: test.length,
            },
            encoder: {
                kind: "historical-wave-spike-sensor",
                encoding: MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL,
                percentile: MotorCurrentSnn.DEFAULT_PERCENTILE,
                selectedFrequenciesHz: selectedBands.map((band) => band.frequencyHz),
                selectionSource: selectedBands.map((band) => band.source),
            },
            training: {
                epochs: settings.epochs,
                batchSize: settings.batchSize,
                learningRate: settings.learningRate,
                learningRateSchedule: learningRatePolicy(settings),
                seed: settings.seed,
                hiddenNeuronsPerSpecialist: settings.smallHidden,
                checkpointRule: "maximum balanced validation accuracy; lower validation loss wins ties",
                thresholdCalibration: "validation only",
            },
            oneVsHealthy: compactOneVsHealthy(specialistRun),
        };
        const outputPath = path.resolve(ROOT, settings.output);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
        status(`Report written to ${path.relative(ROOT, outputPath)}.`);
        console.log(
            `\nIndependent test: one-vs-healthy ${percent(report.oneVsHealthy.test.accuracy)}, ${report.oneVsHealthy.parameterCount} weights, ${settings.smallHidden} hidden LIF per specialist.`
        );
        return;
    }

    const baselineRun = await trainBaseline({ common, training, validation, test, settings });
    const { baselineModel, baselineFit, baselineValidation, baselineTest } = baselineRun;

    if (settings.only === "baseline") {
        const report = {
            protocol: "motor-current-snn-baseline-corrected-sampling-v1",
            createdAt: new Date().toISOString(),
            dataset: {
                splitProtocol: trainJson.splitProtocol,
                validationProtocol: VALIDATION_PROTOCOL,
                sampleRateHz,
                windowSize: trainJson.windowSize,
                trainingStride: trainJson.stride,
                independentTestStride: testJson.stride,
                lineFrequencyHz: trainJson.lineFrequencyHz,
                preprocessing: trainJson.preprocessing,
                classes: CLASS_NAMES,
                trainingSamples: training.length,
                validationSamples: validation.length,
                independentTestSamples: test.length,
            },
            encoder: {
                kind: "historical-wave-spike-sensor",
                encoding: MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL,
                percentile: MotorCurrentSnn.DEFAULT_PERCENTILE,
                selectedFrequenciesHz: selectedBands.map((band) => band.frequencyHz),
                selectionSource: selectedBands.map((band) => band.source),
            },
            training: {
                epochs: settings.epochs,
                batchSize: settings.batchSize,
                learningRate: settings.learningRate,
                learningRateSchedule: learningRatePolicy(settings),
                seed: settings.seed,
                hiddenNeurons: settings.hidden,
                checkpointRule: "maximum balanced validation accuracy; lower validation loss wins ties",
            },
            baseline: {
                architecture: "single-dense-five-class",
                parameterCount: baselineModel.trainableWeightCount,
                fit: compactFit(baselineFit),
                validation: baselineValidation,
                test: baselineTest,
            },
        };
        const outputPath = path.resolve(ROOT, settings.output);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
        status(`Report written to ${path.relative(ROOT, outputPath)}.`);
        console.log(`\nIndependent test: baseline ${percent(report.baseline.test.accuracy)}, ${report.baseline.parameterCount} weights.`);
        return;
    }

    const specialistRun = await trainOneVsHealthy({ common, training, validation, test, settings });
    const { specialistHeads, specialistThreshold, specialistValidation, specialistTest } = specialistRun;

    status(`Training hierarchical Healthy/BRB gate with ${settings.cascadeHidden} hidden LIF neurons...`);
    const gateModel = buildModel(common, settings.cascadeHidden, 2);
    const gateFit = await trainClassifier({
        name: "hierarchy-gate",
        model: gateModel,
        training,
        validation,
        targetOf: (sample) => Number(sample.label !== 0),
        outputSize: 2,
        settings,
        balanceTargets: true,
    });
    status(`Training hierarchical BRB1-BRB4 severity stage with ${settings.cascadeHidden} hidden LIF neurons...`);
    const severityTraining = training.filter((sample) => sample.label > 0);
    const severityValidation = validation.filter((sample) => sample.label > 0);
    const severityModel = buildModel(common, settings.cascadeHidden, 4);
    const severityFit = await trainClassifier({
        name: "hierarchy-severity",
        model: severityModel,
        training: severityTraining,
        validation: severityValidation,
        targetOf: (sample) => sample.label - 1,
        outputSize: 4,
        settings,
        balanceTargets: false,
    });
    const hierarchyValidationInputs = inferHierarchy(gateModel, severityModel, validation, "hierarchy validation");
    const gateThreshold = selectCombinedThreshold(
        hierarchyValidationInputs.map((entry) => entry.gateMargin),
        validation.map((sample) => sample.label),
        (entryIndex, threshold) =>
            decodeHierarchicalClassification(hierarchyValidationInputs[entryIndex].gateMargin, hierarchyValidationInputs[entryIndex].severityScores, threshold),
        CLASS_NAMES.length
    );
    const hierarchyValidation = evaluateHierarchy(hierarchyValidationInputs, validation, gateThreshold);
    const hierarchyTestInputs = inferHierarchy(gateModel, severityModel, test, "hierarchy test");
    const hierarchyTest = evaluateHierarchy(hierarchyTestInputs, test, gateThreshold);
    status(`Hierarchy completed: ${percent(hierarchyValidation.accuracy)} validation, ${percent(hierarchyTest.accuracy)} test.`);

    status(`Training four cumulative ordinal heads with ${settings.smallHidden} hidden LIF neurons each...`);
    const ordinalHeads = [];
    for (let level = 1; level < CLASS_NAMES.length; level++) {
        const model = buildModel(common, settings.smallHidden, 2);
        const fit = await trainClassifier({
            name: `ordinal-at-least-${level}`,
            model,
            training,
            validation,
            targetOf: (sample) => Number(sample.label >= level),
            outputSize: 2,
            settings,
            balanceTargets: true,
        });
        ordinalHeads.push({ level, model, fit });
    }
    const ordinalValidationInputs = inferOrdinalMargins(ordinalHeads, validation, "ordinal validation");
    const ordinalThresholds = ordinalHeads.map((head, index) =>
        selectBinaryThreshold(
            ordinalValidationInputs.map((entry) => entry.margins[index]),
            validation.map((sample) => Number(sample.label >= head.level))
        )
    );
    const ordinalValidation = evaluateOrdinal(ordinalValidationInputs, validation, ordinalThresholds);
    const ordinalTestInputs = inferOrdinalMargins(ordinalHeads, test, "ordinal test");
    const ordinalTest = evaluateOrdinal(ordinalTestInputs, test, ordinalThresholds);
    status(`Ordinal topology completed: ${percent(ordinalValidation.accuracy)} validation, ${percent(ordinalTest.accuracy)} test.`);

    const report = {
        protocol: "motor-current-snn-topology-decomposition-v1",
        createdAt: new Date().toISOString(),
        dataset: {
            splitProtocol: trainJson.splitProtocol,
            validationProtocol: VALIDATION_PROTOCOL,
            sampleRateHz,
            windowSize: trainJson.windowSize,
            trainingStride: trainJson.stride,
            independentTestStride: testJson.stride,
            classes: CLASS_NAMES,
            trainingSamples: training.length,
            validationSamples: validation.length,
            independentTestSamples: test.length,
        },
        encoder: {
            kind: "historical-wave-spike-sensor",
            encoding: MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL,
            percentile: MotorCurrentSnn.DEFAULT_PERCENTILE,
            selectedFrequenciesHz: selectedBands.map((band) => band.frequencyHz),
            selectionSource: selectedBands.map((band) => band.source),
        },
        training: {
            epochs: settings.epochs,
            batchSize: settings.batchSize,
            learningRate: settings.learningRate,
            learningRateSchedule: learningRatePolicy(settings),
            seed: settings.seed,
            baselineHidden: settings.hidden,
            smallHeadHidden: settings.smallHidden,
            cascadeStageHidden: settings.cascadeHidden,
            checkpointRule: "maximum balanced validation accuracy; lower validation loss wins ties",
            thresholdCalibration: "validation only",
        },
        baseline: {
            architecture: "single-dense-five-class",
            parameterCount: baselineModel.trainableWeightCount,
            fit: compactFit(baselineFit),
            validation: baselineValidation,
            test: baselineTest,
        },
        oneVsHealthy: {
            ...compactOneVsHealthy(specialistRun),
        },
        hierarchy: {
            architecture: "Healthy-vs-BRB-gate-then-four-class-severity",
            parameterCount: gateModel.trainableWeightCount + severityModel.trainableWeightCount,
            gateThreshold,
            gate: { parameterCount: gateModel.trainableWeightCount, fit: compactFit(gateFit) },
            severity: { parameterCount: severityModel.trainableWeightCount, fit: compactFit(severityFit) },
            validation: hierarchyValidation,
            test: hierarchyTest,
        },
        ordinal: {
            architecture: "four-independent-cumulative-threshold-heads",
            parameterCount: ordinalHeads.reduce((total, head) => total + head.model.trainableWeightCount, 0),
            thresholds: ordinalThresholds,
            heads: ordinalHeads.map((head) => ({
                level: head.level,
                question: `BRB >= ${head.level}`,
                parameterCount: head.model.trainableWeightCount,
                fit: compactFit(head.fit),
            })),
            validation: ordinalValidation,
            test: ordinalTest,
        },
    };

    const outputPath = path.resolve(ROOT, settings.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
    status(`Report written to ${path.relative(ROOT, outputPath)}.`);
    printComparison(report);
}

function buildModel(common, hiddenSize, outputSize, topology = MotorCurrentSnn.TOPOLOGY_DENSE, topologyOptions = {}) {
    return MotorCurrentSnn.buildModel({
        hiddenSize,
        outputSize,
        windowSize: common.windowSize,
        sensorConfig: common.sensorConfig,
        sensorEncoding: MotorCurrentSnn.SENSOR_ENCODING_PHASE_MULTILEVEL,
        topology,
        ...topologyOptions,
        runtimeDecoderObjective: runtimeDecoderObjective(),
        seed: common.seed,
        learningRate: common.learningRate,
    });
}

async function trainPhaseDelay({ common, training, validation, test, settings }) {
    status(`Training phase-delay fusion with 54 relay LIF, ${settings.phaseFusionHidden} fusion LIF and delays ${settings.phaseDelays.join("/")} ticks...`);
    const phaseDelayModel = buildModel(common, settings.phaseFusionHidden, CLASS_NAMES.length, MotorCurrentSnn.TOPOLOGY_PHASE_DELAY_FUSION, {
        phaseDelayCore: {
            version: MotorCurrentSnn.PHASE_DELAY_CORE_VERSION,
            delayTicks: settings.phaseDelays,
        },
    });
    status(`Phase-delay model ready: ${phaseDelayModel.hiddenShape}, ${phaseDelayModel.trainableWeightCount} trainable weights.`);
    const initialActivity = profilePhaseDelayActivity(phaseDelayModel, validation);
    status(
        `Initial activity per sample: ${initialActivity.relaySpikesPerSample.toFixed(1)} relay spikes, ${initialActivity.fusionSpikesPerSample.toFixed(1)} fusion spikes, ${initialActivity.outputSpikesPerSample.toFixed(1)} output spikes.`
    );
    const phaseDelayFit = await trainClassifier({
        name: "phase-delay",
        model: phaseDelayModel,
        training,
        validation,
        targetOf: (sample) => sample.label,
        outputSize: CLASS_NAMES.length,
        settings,
        balanceTargets: false,
    });
    const phaseDelayValidation = evaluateLocalClassifier(phaseDelayModel, validation, (sample) => sample.label, CLASS_NAMES.length);
    const phaseDelayTest = evaluateLocalClassifier(phaseDelayModel, test, (sample) => sample.label, CLASS_NAMES.length);
    const trainedActivity = profilePhaseDelayActivity(phaseDelayModel, validation);
    status(
        `Trained activity per sample: ${trainedActivity.relaySpikesPerSample.toFixed(1)} relay spikes, ${trainedActivity.fusionSpikesPerSample.toFixed(1)} fusion spikes, ${trainedActivity.outputSpikesPerSample.toFixed(1)} output spikes.`
    );
    status(`Phase-delay completed: ${percent(phaseDelayValidation.accuracy)} validation, ${percent(phaseDelayTest.accuracy)} test.`);
    return {
        phaseDelayModel,
        phaseDelayFit,
        phaseDelayValidation,
        phaseDelayTest,
        phaseDelayActivity: { initial: initialActivity, trained: trainedActivity },
    };
}

function profilePhaseDelayActivity(model, samples) {
    const relayCount = model.phaseDelayCore.relayNeuronCount;
    const fusionCount = model.phaseDelayCore.fusionNeuronCount;
    const relayTotals = new Array(relayCount).fill(0);
    let fusionSpikes = 0;
    let outputSpikes = 0;
    let sensorEvents = 0;
    for (const sample of samples) {
        const analysis = MotorCurrentSnn.analyzeTeacher(model, sample.sequence, sample.label, false);
        sensorEvents += analysis.sensorEvents;
        outputSpikes += analysis.outputSpikeCounts.reduce((total, count) => total + count, 0);
        for (let relay = 0; relay < relayCount; relay++) relayTotals[relay] += analysis.hiddenSpikeCounts[relay];
        for (let fusion = relayCount; fusion < relayCount + fusionCount; fusion++) fusionSpikes += analysis.hiddenSpikeCounts[fusion];
    }
    const sampleCount = Math.max(1, samples.length);
    return {
        sampleCount: samples.length,
        sensorEventsPerSample: sensorEvents / sampleCount,
        relaySpikesPerSample: relayTotals.reduce((total, count) => total + count, 0) / sampleCount,
        activeRelayFraction: relayTotals.filter((count) => count > 0).length / Math.max(1, relayCount),
        fusionSpikesPerSample: fusionSpikes / sampleCount,
        outputSpikesPerSample: outputSpikes / sampleCount,
    };
}

async function trainBaseline({ common, training, validation, test, settings }) {
    status(`Training multiclass baseline with ${settings.hidden} hidden LIF neurons...`);
    const baselineModel = buildModel(common, settings.hidden, CLASS_NAMES.length);
    const baselineFit = await trainClassifier({
        name: "baseline",
        model: baselineModel,
        training,
        validation,
        targetOf: (sample) => sample.label,
        outputSize: CLASS_NAMES.length,
        settings,
        balanceTargets: false,
    });
    const baselineValidation = evaluateLocalClassifier(baselineModel, validation, (sample) => sample.label, CLASS_NAMES.length);
    const baselineTest = evaluateLocalClassifier(baselineModel, test, (sample) => sample.label, CLASS_NAMES.length);
    status(`Baseline completed: ${percent(baselineValidation.accuracy)} validation, ${percent(baselineTest.accuracy)} test.`);
    return { baselineModel, baselineFit, baselineValidation, baselineTest };
}

async function trainClassifier({ name, model, training, validation, targetOf, outputSize, settings, balanceTargets }) {
    const baseExamples = training.map((sample) => ({ sample, target: targetOf(sample) }));
    const scheduledExamples = balanceTargets ? balanceExamples(baseExamples, outputSize) : baseExamples;
    const encodedBySample = new Map();
    for (const example of baseExamples) {
        encodedBySample.set(
            example.sample,
            MotorCurrentSnn.encodeSequence(example.sample.sequence, example.target, outputSize, {
                sensorConfig: model.sensorConfig,
                inputIndexBySlot: model.inputIndexBySlot,
                runtimeDecoderObjective: model.runtimeDecoderObjective,
                preserveEmptyTimesteps: model.requiresDenseTimesteps === true,
            })
        );
    }
    let bestWeights = snapshotWeights(model);
    let bestEpoch = -1;
    let bestValidation = evaluateLocalClassifier(model, validation, targetOf, outputSize);
    let scheduleBest = bestValidation;
    let stagnantEpochs = 0;
    const learningRateChanges = [];
    const history = [];
    let lastProgress = 0;
    for (let epoch = 0; epoch < settings.epochs; epoch++) {
        const epochLearningRate = model.trainer.learningRate;
        const shuffled = deterministicShuffle(scheduledExamples, settings.seed ^ hashText(name) ^ (epoch + 1));
        let weightedLoss = 0;
        for (let start = 0; start < shuffled.length; start += settings.batchSize) {
            const batch = shuffled.slice(start, start + settings.batchSize);
            const encodedBatch = batch.map((example) => encodedBySample.get(example.sample));
            weightedLoss += model.trainer.trainBatch(encodedBatch) * batch.length;
            const now = Date.now();
            if (now - lastProgress >= 5000) {
                lastProgress = now;
                status(`${name}: epoch ${epoch + 1}/${settings.epochs}, batch ${Math.floor(start / settings.batchSize) + 1}/${Math.ceil(shuffled.length / settings.batchSize)}.`);
            }
        }
        const validationResult = evaluateLocalClassifier(model, validation, targetOf, outputSize);
        const trainLoss = weightedLoss / shuffled.length;
        history.push({
            epoch,
            trainLoss,
            validationLoss: validationResult.loss,
            validationAccuracy: validationResult.accuracy,
            validationBalancedAccuracy: validationResult.balancedAccuracy,
            learningRate: epochLearningRate,
        });
        status(
            `${name}: epoch ${epoch + 1}/${settings.epochs} completed, loss ${trainLoss.toFixed(4)}, validation ${percent(validationResult.accuracy)}, balanced ${percent(validationResult.balancedAccuracy)}.`
        );
        if (isBetterValidation(validationResult, bestValidation)) {
            bestEpoch = epoch;
            bestValidation = validationResult;
            bestWeights = snapshotWeights(model);
        }
        if (settings.learningRateSchedule === "plateau") {
            if (isBetterValidation(validationResult, scheduleBest)) {
                scheduleBest = validationResult;
                stagnantEpochs = 0;
            } else {
                stagnantEpochs++;
                if (stagnantEpochs >= settings.lrPatience && model.trainer.learningRate > settings.minLearningRate) {
                    const previousLearningRate = model.trainer.learningRate;
                    const nextLearningRate = Math.max(settings.minLearningRate, previousLearningRate * settings.lrFactor);
                    model.trainer.learningRate = nextLearningRate;
                    learningRateChanges.push({ afterEpoch: epoch, previousLearningRate, nextLearningRate });
                    stagnantEpochs = 0;
                    status(`${name}: validation plateau, learning rate ${previousLearningRate} -> ${nextLearningRate}.`);
                }
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    restoreWeights(model, bestWeights);
    return {
        bestEpoch,
        validation: evaluateLocalClassifier(model, validation, targetOf, outputSize),
        history,
        learningRateChanges,
        finalLearningRate: model.trainer.learningRate,
        scheduledSamplesPerEpoch: scheduledExamples.length,
    };
}

function evaluateLocalClassifier(model, samples, targetOf, outputSize) {
    const startedAt = performance.now();
    const actual = [];
    const predicted = [];
    let loss = 0;
    let margin = 0;
    for (const sample of samples) {
        const target = targetOf(sample);
        const analysis = MotorCurrentSnn.analyzeTeacher(model, sample.sequence, target, true);
        actual.push(target);
        predicted.push(analysis.runtimePredicted);
        loss += analysis.trainingLoss;
        margin += analysis.runtimeMargin;
    }
    return {
        ...summarizeClassification(actual, predicted, outputSize),
        loss: samples.length === 0 ? 0 : loss / samples.length,
        meanMargin: samples.length === 0 ? 0 : margin / samples.length,
        millisecondsPerSample: samples.length === 0 ? 0 : (performance.now() - startedAt) / samples.length,
    };
}

async function trainOneVsHealthy({ common, training, validation, test, settings }) {
    status(`Training four BRBi/Healthy specialists with ${settings.smallHidden} hidden LIF neurons each...`);
    const specialistHeads = [];
    for (let faultClass = 1; faultClass < CLASS_NAMES.length; faultClass++) {
        const pairTraining = training.filter((sample) => sample.label === 0 || sample.label === faultClass);
        const pairValidation = validation.filter((sample) => sample.label === 0 || sample.label === faultClass);
        const model = buildModel(common, settings.smallHidden, 2);
        const fit = await trainClassifier({
            name: `specialist-${CLASS_NAMES[faultClass]}`,
            model,
            training: pairTraining,
            validation: pairValidation,
            targetOf: (sample) => Number(sample.label === faultClass),
            outputSize: 2,
            settings,
            balanceTargets: true,
        });
        specialistHeads.push({ faultClass, model, fit });
    }
    const specialistValidationInputs = inferSpecialistMargins(specialistHeads, validation, "specialists validation");
    const specialistThreshold = selectCombinedThreshold(
        specialistValidationInputs.map((entry) => Math.max(...entry.margins)),
        validation.map((sample) => sample.label),
        (entryIndex, threshold) => decodeOneVsReference(specialistValidationInputs[entryIndex].margins, threshold).predictedClass,
        CLASS_NAMES.length
    );
    const specialistValidation = evaluateSpecialists(specialistValidationInputs, validation, specialistThreshold);
    const specialistTestInputs = inferSpecialistMargins(specialistHeads, test, "specialists test");
    const specialistTest = evaluateSpecialists(specialistTestInputs, test, specialistThreshold);
    status(`Four specialists completed: ${percent(specialistValidation.accuracy)} validation, ${percent(specialistTest.accuracy)} test.`);
    return { specialistHeads, specialistThreshold, specialistValidation, specialistTest };
}

function compactOneVsHealthy(run) {
    return {
        architecture: "four-independent-BRBi-vs-Healthy-heads",
        parameterCount: run.specialistHeads.reduce((total, head) => total + head.model.trainableWeightCount, 0),
        referenceThreshold: run.specialistThreshold,
        heads: run.specialistHeads.map((head) => ({
            faultClass: CLASS_NAMES[head.faultClass],
            parameterCount: head.model.trainableWeightCount,
            fit: compactFit(head.fit),
        })),
        validation: run.specialistValidation,
        test: run.specialistTest,
    };
}

function inferSpecialistMargins(heads, samples, label) {
    const startedAt = performance.now();
    const result = samples.map((sample) => ({
        margins: heads.map((head) => binaryMargin(runtimeScores(head.model, sample))),
    }));
    status(`${label}: profiled ${samples.length} samples in ${((performance.now() - startedAt) / 1000).toFixed(1)} s.`);
    return result;
}

function evaluateSpecialists(inputs, samples, threshold) {
    const predictions = [];
    let noActiveHead = 0;
    let multipleActiveHeads = 0;
    const activeHeadHistogram = new Array(CLASS_NAMES.length).fill(0);
    for (const entry of inputs) {
        const decision = decodeOneVsReference(entry.margins, threshold);
        predictions.push(decision.predictedClass);
        activeHeadHistogram[decision.activeHeadCount]++;
        if (decision.activeHeadCount === 0) noActiveHead++;
        if (decision.activeHeadCount > 1) multipleActiveHeads++;
    }
    return {
        ...summarizeClassification(
            samples.map((sample) => sample.label),
            predictions,
            CLASS_NAMES.length
        ),
        ambiguity: {
            noActiveHead,
            multipleActiveHeads,
            activeHeadHistogram,
        },
    };
}

function inferHierarchy(gateModel, severityModel, samples, label) {
    const startedAt = performance.now();
    const result = samples.map((sample) => ({
        gateMargin: binaryMargin(runtimeScores(gateModel, sample)),
        severityScores: runtimeScores(severityModel, sample),
    }));
    status(`${label}: profiled ${samples.length} samples in ${((performance.now() - startedAt) / 1000).toFixed(1)} s.`);
    return result;
}

function evaluateHierarchy(inputs, samples, threshold) {
    return summarizeClassification(
        samples.map((sample) => sample.label),
        inputs.map((entry) => decodeHierarchicalClassification(entry.gateMargin, entry.severityScores, threshold)),
        CLASS_NAMES.length
    );
}

function inferOrdinalMargins(heads, samples, label) {
    const startedAt = performance.now();
    const result = samples.map((sample) => ({
        margins: heads.map((head) => binaryMargin(runtimeScores(head.model, sample))),
    }));
    status(`${label}: profiled ${samples.length} samples in ${((performance.now() - startedAt) / 1000).toFixed(1)} s.`);
    return result;
}

function evaluateOrdinal(inputs, samples, thresholds) {
    let violatingSamples = 0;
    let violationCount = 0;
    const predicted = inputs.map((entry) => {
        const count = countOrdinalViolations(entry.margins, thresholds);
        violationCount += count;
        if (count > 0) violatingSamples++;
        return decodeOrdinalClassification(entry.margins, thresholds);
    });
    return {
        ...summarizeClassification(
            samples.map((sample) => sample.label),
            predicted,
            CLASS_NAMES.length
        ),
        ordinalConsistency: {
            violatingSamples,
            violationCount,
            violationRate: samples.length === 0 ? 0 : violatingSamples / samples.length,
        },
    };
}

function runtimeScores(model, sample) {
    return MotorCurrentSnn.analyzeTeacher(model, sample.sequence, 0, false).runtimeScores;
}

function binaryMargin(scores) {
    if (!Array.isArray(scores) || scores.length !== 2) throw new Error("Binary SNN inference requires exactly two runtime scores.");
    return scores[1] - scores[0];
}

function selectCombinedThreshold(values, actual, predictAt, classCount) {
    return selectThreshold(values, (threshold) => {
        const predicted = values.map((_, index) => predictAt(index, threshold));
        return summarizeClassification(actual, predicted, classCount);
    });
}

function selectBinaryThreshold(margins, targets) {
    return selectThreshold(
        margins,
        (threshold) =>
            summarizeClassification(
                targets,
                margins.map((margin) => Number(margin > threshold)),
                2
            ),
        "balancedAccuracy"
    );
}

function selectThreshold(values, summarizeAt, primaryMetric = "accuracy") {
    if (values.length === 0) return 0;
    const sorted = Array.from(new Set(values)).sort((left, right) => left - right);
    const candidates = [sorted[0] - Math.max(1, Math.abs(sorted[0]) * 0.01)];
    for (let index = 0; index < sorted.length; index++) {
        candidates.push(sorted[index]);
        if (index + 1 < sorted.length) candidates.push((sorted[index] + sorted[index + 1]) / 2);
    }
    let bestThreshold = 0;
    let bestSummary = null;
    for (const threshold of candidates) {
        const summary = summarizeAt(threshold);
        const primary = summary[primaryMetric];
        const bestPrimary = bestSummary === null ? Number.NEGATIVE_INFINITY : bestSummary[primaryMetric];
        const secondaryMetric = primaryMetric === "accuracy" ? "balancedAccuracy" : "accuracy";
        const secondary = summary[secondaryMetric];
        const bestSecondary = bestSummary === null ? Number.NEGATIVE_INFINITY : bestSummary[secondaryMetric];
        if (
            bestSummary === null ||
            primary > bestPrimary + 1e-12 ||
            (Math.abs(primary - bestPrimary) <= 1e-12 && secondary > bestSecondary + 1e-12) ||
            (Math.abs(primary - bestPrimary) <= 1e-12 && Math.abs(secondary - bestSecondary) <= 1e-12 && Math.abs(threshold) < Math.abs(bestThreshold))
        ) {
            bestThreshold = threshold;
            bestSummary = summary;
        }
    }
    return bestThreshold;
}

function balanceExamples(examples, outputSize) {
    const groups = Array.from({ length: outputSize }, () => []);
    for (const example of examples) groups[example.target].push(example);
    if (groups.some((group) => group.length === 0)) throw new Error("Balanced training requires at least one sample for every local target.");
    const targetSize = Math.max(...groups.map((group) => group.length));
    const balanced = [];
    for (let offset = 0; offset < targetSize; offset++) {
        for (const group of groups) balanced.push(group[offset % group.length]);
    }
    return balanced;
}

function deterministicShuffle(values, seed) {
    const result = values.slice();
    const random = mulberry32(seed >>> 0);
    for (let index = result.length - 1; index > 0; index--) {
        const replacement = Math.floor(random() * (index + 1));
        const value = result[index];
        result[index] = result[replacement];
        result[replacement] = value;
    }
    return result;
}

function isBetterValidation(candidate, current) {
    return (
        candidate.balancedAccuracy > current.balancedAccuracy + 1e-12 || (Math.abs(candidate.balancedAccuracy - current.balancedAccuracy) <= 1e-12 && candidate.loss < current.loss)
    );
}

function snapshotWeights(model) {
    return model.trainer.synapses.map((synapse) => synapse.weight);
}

function restoreWeights(model, weights) {
    for (let index = 0; index < weights.length; index++) model.trainer.synapses[index].weight = weights[index];
}

function compactFit(fit) {
    return {
        bestEpoch: fit.bestEpoch,
        scheduledSamplesPerEpoch: fit.scheduledSamplesPerEpoch,
        validation: fit.validation,
        learningRateChanges: fit.learningRateChanges,
        finalLearningRate: fit.finalLearningRate,
        history: fit.history,
    };
}

function learningRatePolicy(settings) {
    if (settings.learningRateSchedule !== "plateau") return { kind: "fixed" };
    return {
        kind: "reduce-on-validation-plateau",
        monitor: "balancedAccuracy; validation loss breaks ties",
        patience: settings.lrPatience,
        factor: settings.lrFactor,
        minimumLearningRate: settings.minLearningRate,
    };
}

function runtimeDecoderObjective() {
    return {
        version: MotorCurrentSnn.RUNTIME_DECODER_OBJECTIVE_VERSION,
        spikeCountScale: 2,
        membranePotentialScale: 1,
        temperature: 2,
        classificationLossWeight: 1,
        temporalLossWeight: 0.25,
    };
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
    if (!Number.isFinite(perClass)) return samples.slice();
    const counts = new Map();
    return samples.filter((sample) => {
        const count = counts.get(sample.label) || 0;
        if (count >= perClass) return false;
        counts.set(sample.label, count + 1);
        return true;
    });
}

function copySample(sample) {
    return {
        sequence: sample.sequence,
        label: sample.label,
        sourceGroup: sample.sourceGroup,
        sourceLoad: sample.sourceLoad,
        windowStart: sample.windowStart,
    };
}

function validateDataset(trainJson, testJson) {
    if (trainJson.splitProtocol !== "grouped-acquisition-v2-120hz" || testJson.splitProtocol !== trainJson.splitProtocol) {
        throw new Error("The topology experiment requires the grouped acquisition dataset.");
    }
    if (JSON.stringify(trainJson.classes) !== JSON.stringify(CLASS_NAMES) || JSON.stringify(testJson.classes) !== JSON.stringify(CLASS_NAMES)) {
        throw new Error("The topology experiment requires classes Healthy, BRB1, BRB2, BRB3 and BRB4 in that order.");
    }
    if (!Array.isArray(trainJson.samples) || !Array.isArray(testJson.samples) || trainJson.samples.length === 0 || testJson.samples.length === 0) {
        throw new Error("The grouped motor-current dataset is empty.");
    }
    if (trainJson.sampleRateHz !== testJson.sampleRateHz || trainJson.windowSize !== testJson.windowSize) {
        throw new Error("Training and test datasets must use the same sample rate and window size.");
    }
}

function parseArguments(args) {
    const parsed = {
        help: false,
        full: false,
        only: null,
        perClass: 12,
        epochs: 3,
        batchSize: 16,
        hidden: 32,
        smallHidden: 8,
        cascadeHidden: 16,
        phaseFusionHidden: 8,
        phaseDelays: [0, 1, 2, 4],
        learningRate: 0.003,
        learningRateSchedule: "fixed",
        lrPatience: 3,
        lrFactor: 0.5,
        minLearningRate: 0.0001,
        seed: DEFAULT_SEED,
        dataDirectory: "packages/host/www/data/motor_current",
        testDataDirectory: null,
        output: "output/motor-current-snn-topology-results.json",
    };
    for (let index = 0; index < args.length; index++) {
        const argument = args[index];
        if (argument === "--help" || argument === "-h") parsed.help = true;
        else if (argument === "--full") parsed.full = true;
        else if (argument === "--only") {
            parsed.only = requiredValue(args[++index], argument);
            if (parsed.only !== "baseline" && parsed.only !== "one-vs-healthy" && parsed.only !== "phase-delay") {
                throw new Error("--only supports baseline, one-vs-healthy or phase-delay.");
            }
        } else if (argument === "--per-class") parsed.perClass = positiveInteger(args[++index], argument);
        else if (argument === "--epochs") parsed.epochs = positiveInteger(args[++index], argument);
        else if (argument === "--batch-size") parsed.batchSize = positiveInteger(args[++index], argument);
        else if (argument === "--hidden") parsed.hidden = positiveInteger(args[++index], argument);
        else if (argument === "--small-hidden") parsed.smallHidden = positiveInteger(args[++index], argument);
        else if (argument === "--cascade-hidden") parsed.cascadeHidden = positiveInteger(args[++index], argument);
        else if (argument === "--phase-fusion-hidden") parsed.phaseFusionHidden = positiveInteger(args[++index], argument);
        else if (argument === "--phase-delays") parsed.phaseDelays = nonNegativeIntegerList(args[++index], argument);
        else if (argument === "--learning-rate") parsed.learningRate = positiveNumber(args[++index], argument);
        else if (argument === "--learning-rate-schedule") {
            parsed.learningRateSchedule = requiredValue(args[++index], argument);
            if (parsed.learningRateSchedule !== "fixed" && parsed.learningRateSchedule !== "plateau") {
                throw new Error("--learning-rate-schedule supports fixed or plateau.");
            }
        } else if (argument === "--lr-patience") parsed.lrPatience = positiveInteger(args[++index], argument);
        else if (argument === "--lr-factor") parsed.lrFactor = fraction(args[++index], argument);
        else if (argument === "--min-learning-rate") parsed.minLearningRate = positiveNumber(args[++index], argument);
        else if (argument === "--seed") parsed.seed = integer(args[++index], argument);
        else if (argument === "--data") parsed.dataDirectory = requiredValue(args[++index], argument);
        else if (argument === "--test-data") parsed.testDataDirectory = requiredValue(args[++index], argument);
        else if (argument === "--output") parsed.output = requiredValue(args[++index], argument);
        else throw new Error(`Unknown argument ${argument}. Use --help to list supported options.`);
    }
    if (parsed.minLearningRate > parsed.learningRate) {
        throw new Error("--min-learning-rate cannot exceed --learning-rate.");
    }
    return parsed;
}

function printHelp() {
    console.log(`Motor-current SNN topology experiment

Usage:
  npm run experiment:snn-topology -- [options]

Options:
  --full                 Use the complete grouped train/validation/test split
  --only baseline        Train only the five-class baseline
  --only one-vs-healthy  Train only the four independent specialist heads
  --only phase-delay     Train only the phase-delay fusion topology
  --per-class N          Smoke-test samples per class and split (default: 12)
  --epochs N             Training epochs (default: 3)
  --batch-size N         Mini-batch size (default: 16)
  --hidden N             Baseline hidden LIF count (default: 32)
  --small-hidden N       Hidden LIF count in each four-head model (default: 8)
  --cascade-hidden N     Hidden LIF count in each cascade stage (default: 16)
  --phase-fusion-hidden N  Fusion LIF count after the phase-delay bank (default: 8)
  --phase-delays A,B,C   Fixed non-negative delays in dense ticks (default: 0,1,2,4)
  --learning-rate X      Adam learning rate (default: 0.003)
  --learning-rate-schedule fixed|plateau  Learning-rate policy (default: fixed)
  --lr-patience N        Plateau epochs before reducing the rate (default: 3)
  --lr-factor X          Plateau reduction factor in ]0,1[ (default: 0.5)
  --min-learning-rate X  Lower learning-rate bound (default: 0.0001)
  --seed N               Deterministic seed (default: ${DEFAULT_SEED})
  --data PATH            Grouped dataset directory
  --test-data PATH       Optional directory supplying only test_grouped.json
  --output PATH          JSON report path
  --help                 Show this help
`);
}

function printComparison(report) {
    console.log("\nIndependent test comparison:");
    console.log(`  baseline       ${percent(report.baseline.test.accuracy)}  ${report.baseline.parameterCount} weights`);
    console.log(`  one-vs-healthy ${percent(report.oneVsHealthy.test.accuracy)}  ${report.oneVsHealthy.parameterCount} weights`);
    console.log(`  hierarchy      ${percent(report.hierarchy.test.accuracy)}  ${report.hierarchy.parameterCount} weights`);
    console.log(`  ordinal        ${percent(report.ordinal.test.accuracy)}  ${report.ordinal.parameterCount} weights`);
}

function status(message) {
    console.log(`[snn-topology +${process.uptime().toFixed(1)}s] ${message}`);
}

function percent(value) {
    return (value * 100).toFixed(2) + "%";
}

function requiredValue(value, option) {
    if (!value || value.startsWith("--")) throw new Error(`${option} requires a value.`);
    return value;
}

function positiveInteger(value, option) {
    const parsed = Number(requiredValue(value, option));
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${option} requires a positive integer.`);
    return parsed;
}

function nonNegativeIntegerList(value, option) {
    const text = requiredValue(value, option);
    const parsed = text.split(",").map((item) => Number(item.trim()));
    if (parsed.length === 0 || parsed.some((item) => !Number.isInteger(item) || item < 0)) {
        throw new Error(`${option} requires comma-separated non-negative integers.`);
    }
    return Array.from(new Set(parsed)).sort((left, right) => left - right);
}

function integer(value, option) {
    const parsed = Number(requiredValue(value, option));
    if (!Number.isInteger(parsed)) throw new Error(`${option} requires an integer.`);
    return parsed;
}

function positiveNumber(value, option) {
    const parsed = Number(requiredValue(value, option));
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${option} requires a positive number.`);
    return parsed;
}

function fraction(value, option) {
    const parsed = Number(requiredValue(value, option));
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 1) throw new Error(`${option} requires a number strictly between zero and one.`);
    return parsed;
}

function hashText(text, initial = 2166136261) {
    let hash = initial >>> 0;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
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
