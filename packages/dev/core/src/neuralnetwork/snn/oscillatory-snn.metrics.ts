import { OscillatorySnnModel, type IOscillatorySnnStep, type OscillatoryExperimentVariant } from "./oscillatory-snn.model";
import {
    OscillatorySnnBpttTrainer,
    type IOscillatoryFitResult,
    type IOscillatoryForwardTrace,
    type IOscillatoryTrainerOptions,
    type IOscillatoryTrainingSequence,
} from "./oscillatory-snn.training";

export interface IOscillatoryTraceComparison {
    stateRealMae: number;
    stateImaginaryMae: number;
    amplitudeMae: number;
    phaseMaeRadians: number;
    spikeMismatchRate: number;
    firingRateMaeHz: number;
    spikeTimingMaeSeconds: number;
    divergenceByTimestep: ReadonlyArray<number>;
    scoreMae: number;
    classificationMatches: boolean;
    leftMargin: number;
    rightMargin: number;
}

export interface ICollectiveSpectrumMode {
    mode: number;
    dominantFrequencyHz: number | null;
    dominantPower: number;
    halfPowerBandHz: readonly [number, number] | null;
    frequenciesHz: ReadonlyArray<number>;
    power: ReadonlyArray<number>;
}

export interface IOscillatoryCostProfile {
    parameterCount: number;
    stateScalarCount: number;
    estimatedMemoryBytesFloat32: number;
    estimatedOperationsPerTimestep: number;
    maximumDelayTicks: number;
    asymptoticCollectiveCost: "none" | "O(NK)";
}

export interface IOscillatoryDatasetProfile {
    loss: number;
    hardAccuracy: number;
    surrogateAccuracy: number;
    surrogateToHardGap: number;
    meanMargin: number;
    firingRateByLayerHz: Readonly<Record<string, number>>;
    firingRateByClassHz: ReadonlyArray<number>;
    outputFiringRateHz: ReadonlyArray<number>;
    inputEventCount: number;
    neuronSpikeCount: number;
    eventCount: number;
    meanLatencyMilliseconds: number;
    traces: ReadonlyArray<IOscillatoryForwardTrace>;
}

export interface IOscillatoryAblationVariantResult {
    variant: OscillatoryExperimentVariant;
    fit: IOscillatoryFitResult;
    train: IOscillatoryDatasetProfile;
    validation: IOscillatoryDatasetProfile;
    test: IOscillatoryDatasetProfile;
    spectrum: ReadonlyArray<ICollectiveSpectrumMode>;
    cost: IOscillatoryCostProfile;
}

export interface IOscillatoryAblationOptions {
    variants?: ReadonlyArray<OscillatoryExperimentVariant>;
    createModel: (variant: OscillatoryExperimentVariant) => OscillatorySnnModel;
    training: ReadonlyArray<IOscillatoryTrainingSequence>;
    validation: ReadonlyArray<IOscillatoryTrainingSequence>;
    test: ReadonlyArray<IOscillatoryTrainingSequence>;
    epochs: number;
    batchSize?: number;
    shuffleSeed?: number;
    /** Keep detailed per-sample traces in returned profiles. Disable for large experiment matrices. */
    retainTraces?: boolean;
    trainer?: IOscillatoryTrainerOptions;
    onProgress?: (progress: IOscillatoryAblationProgress) => void;
}

export interface IOscillatoryAblationProgress {
    variant: OscillatoryExperimentVariant;
    phase: "variant-start" | "initial-validation" | "training" | "validation" | "epoch-complete" | "profiling" | "variant-complete";
    epoch?: number;
    totalEpochs?: number;
    completedSamples?: number;
    totalSamples?: number;
    batch?: number;
    totalBatches?: number;
    dataset?: "train" | "validation" | "test";
    trainLoss?: number;
    validationLoss?: number;
    validationAccuracy?: number;
}

/** Compare any two paired replays with the same topology and timestamps. */
export function compareOscillatoryTraces(
    left: IOscillatoryForwardTrace,
    right: IOscillatoryForwardTrace,
    targetOutput: number,
    defaultTimeStepSeconds: number
): IOscillatoryTraceComparison {
    if (left.steps.length !== right.steps.length || left.steps.length === 0) throw new Error("Paired oscillatory traces must have the same non-zero length.");
    const neuronCount = left.steps[0].neurons.length;
    if (right.steps[0].neurons.length !== neuronCount) throw new Error("Paired oscillatory traces must have the same neuron count.");
    const leftSpikeTimes = new Array(neuronCount).fill(null).map(() => [] as number[]);
    const rightSpikeTimes = new Array(neuronCount).fill(null).map(() => [] as number[]);
    const divergence: number[] = [];
    let realError = 0;
    let imaginaryError = 0;
    let amplitudeError = 0;
    let phaseError = 0;
    let phaseCount = 0;
    let mismatch = 0;
    let comparisonCount = 0;

    for (let timestep = 0; timestep < left.steps.length; timestep++) {
        const leftStep = left.steps[timestep];
        const rightStep = right.steps[timestep];
        let temporalDivergence = 0;
        for (let neuron = 0; neuron < neuronCount; neuron++) {
            const a = leftStep.neurons[neuron];
            const b = rightStep.neurons[neuron];
            const real = Math.abs(a.stateReal - b.stateReal);
            const imaginary = Math.abs(a.stateImaginary - b.stateImaginary);
            const amplitude = Math.abs(Math.hypot(a.stateReal, a.stateImaginary) - Math.hypot(b.stateReal, b.stateImaginary));
            realError += real;
            imaginaryError += imaginary;
            amplitudeError += amplitude;
            temporalDivergence += Math.hypot(real, imaginary);
            if (a.stateReal !== 0 || a.stateImaginary !== 0 || b.stateReal !== 0 || b.stateImaginary !== 0) {
                phaseError += wrappedPhaseDistance(Math.atan2(a.stateImaginary, a.stateReal), Math.atan2(b.stateImaginary, b.stateReal));
                phaseCount++;
            }
            mismatch += Number(a.spike !== b.spike);
            comparisonCount++;
            if (a.spike === 1) leftSpikeTimes[neuron].push(leftStep.timestamp);
            if (b.spike === 1) rightSpikeTimes[neuron].push(rightStep.timestamp);
        }
        divergence.push(temporalDivergence / neuronCount);
    }

    const duration = traceDuration(left.steps, defaultTimeStepSeconds);
    let firingRateError = 0;
    let timingError = 0;
    let timingMatches = 0;
    for (let neuron = 0; neuron < neuronCount; neuron++) {
        firingRateError += Math.abs(leftSpikeTimes[neuron].length / duration - rightSpikeTimes[neuron].length / duration);
        for (const spikeTime of rightSpikeTimes[neuron]) {
            if (leftSpikeTimes[neuron].length === 0) continue;
            let nearest = Number.POSITIVE_INFINITY;
            for (const candidate of leftSpikeTimes[neuron]) nearest = Math.min(nearest, Math.abs(candidate - spikeTime));
            timingError += nearest;
            timingMatches++;
        }
    }

    let scoreError = 0;
    for (let output = 0; output < left.scores.length; output++) scoreError += Math.abs(left.scores[output] - right.scores[output]);
    return {
        stateRealMae: realError / comparisonCount,
        stateImaginaryMae: imaginaryError / comparisonCount,
        amplitudeMae: amplitudeError / comparisonCount,
        phaseMaeRadians: phaseError / Math.max(1, phaseCount),
        spikeMismatchRate: mismatch / comparisonCount,
        firingRateMaeHz: firingRateError / neuronCount,
        spikeTimingMaeSeconds: timingError / Math.max(1, timingMatches),
        divergenceByTimestep: divergence,
        scoreMae: scoreError / Math.max(1, left.scores.length),
        classificationMatches: left.predictedOutput === right.predictedOutput,
        leftMargin: classificationMargin(left.scores, targetOutput),
        rightMargin: classificationMargin(right.scores, targetOutput),
    };
}

/**
 * Post-training DFT of collective activity. This function is deliberately
 * outside the model and trainer, so spectral peaks cannot influence learning.
 */
export function analyzeCollectiveSpectrum(traces: ReadonlyArray<IOscillatoryForwardTrace>, sampleRateHz: number): ReadonlyArray<ICollectiveSpectrumMode> {
    if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0) throw new Error("Collective spectrum sample rate must be positive.");
    const usable = traces.filter((trace) => trace.steps.length >= 4 && trace.steps[0].collectiveReal.length > 0);
    if (usable.length === 0) return [];
    const modeCount = usable[0].steps[0].collectiveReal.length;
    const sampleCount = Math.min(...usable.map((trace) => trace.steps.length));
    const binCount = Math.floor(sampleCount / 2) + 1;
    const result: ICollectiveSpectrumMode[] = [];

    for (let mode = 0; mode < modeCount; mode++) {
        const power = new Array(binCount).fill(0) as number[];
        for (const trace of usable) {
            for (let bin = 0; bin < binCount; bin++) {
                let real = 0;
                let imaginary = 0;
                for (let timestep = 0; timestep < sampleCount; timestep++) {
                    const angle = (-2 * Math.PI * bin * timestep) / sampleCount;
                    const fieldReal = trace.steps[timestep].collectiveReal[mode];
                    const fieldImaginary = trace.steps[timestep].collectiveImaginary[mode] ?? 0;
                    const cosine = Math.cos(angle);
                    const sine = Math.sin(angle);
                    real += fieldReal * cosine - fieldImaginary * sine;
                    imaginary += fieldReal * sine + fieldImaginary * cosine;
                }
                power[bin] += (real * real + imaginary * imaginary) / (sampleCount * sampleCount * usable.length);
            }
        }
        const frequencies = new Array(binCount).fill(0).map((_, bin) => (bin * sampleRateHz) / sampleCount);
        const dominantBin = argmax(power.slice(1)) + 1;
        const dominantPower = power[dominantBin] ?? 0;
        let first = -1;
        let last = -1;
        const halfPower = dominantPower * 0.5;
        for (let bin = 1; bin < power.length; bin++) {
            if (power[bin] < halfPower) continue;
            if (first < 0) first = bin;
            last = bin;
        }
        result.push({
            mode,
            dominantFrequencyHz: dominantPower > 0 ? frequencies[dominantBin] : null,
            dominantPower,
            halfPowerBandHz: first >= 0 ? [frequencies[first], frequencies[last]] : null,
            frequenciesHz: frequencies,
            power,
        });
    }
    return result;
}

export function profileOscillatoryCost(model: OscillatorySnnModel): IOscillatoryCostProfile {
    const neuronCount = model.neurons.length;
    const collective = model.config.collective;
    const modeCount = collective?.modeCount ?? 0;
    const maximumDelayTicks = model.config.synapses.reduce((maximum, synapse) => Math.max(maximum, Math.max(0, Math.floor(synapse.delayTicks ?? 0))), 0);
    const synapseParameters = model.config.synapses.reduce((total, synapse) => total + (model.neurons[synapse.targetNeuron].dynamics === "complex" ? 2 : 1), 0);
    const collectiveParameters = collective ? neuronCount * modeCount * (model.config.variant === "D" ? 4 : 2) : 0;
    const neuronParameters = model.neurons.reduce((total, neuron) => total + (neuron.dynamics === "complex" ? 7 : 5), 0);
    const parameterCount = synapseParameters + collectiveParameters + neuronParameters;
    const neuronStateScalars = model.neurons.reduce((total, neuron) => total + (neuron.dynamics === "complex" ? 5 : 4), 0);
    const collectiveStateScalars = collective ? modeCount * (model.config.variant === "D" ? 2 : 1) : 0;
    const delayedStateScalars = maximumDelayTicks * neuronCount;
    const stateScalarCount = neuronStateScalars + collectiveStateScalars + delayedStateScalars;
    const synapseOperations = model.config.synapses.reduce((total, synapse) => total + (model.neurons[synapse.targetNeuron].dynamics === "complex" ? 4 : 2), 0);
    const neuronOperations = model.neurons.reduce((total, neuron) => total + (neuron.dynamics === "complex" ? 18 : 8), 0);
    const collectiveOperations = collective ? neuronCount * modeCount * (model.config.variant === "D" ? 16 : 4) : 0;
    return {
        parameterCount,
        stateScalarCount,
        estimatedMemoryBytesFloat32: (parameterCount + stateScalarCount) * 4,
        estimatedOperationsPerTimestep: synapseOperations + neuronOperations + collectiveOperations,
        maximumDelayTicks,
        asymptoticCollectiveCost: collective ? "O(NK)" : "none",
    };
}

export function profileOscillatoryDataset(
    trainer: OscillatorySnnBpttTrainer,
    dataset: ReadonlyArray<IOscillatoryTrainingSequence>,
    onSample?: (completed: number, total: number) => void,
    retainTraces = true
): IOscillatoryDatasetProfile {
    if (dataset.length === 0) throw new Error("Cannot profile an empty oscillatory SNN dataset.");
    const layerSpikes = new Map<string, number>();
    const layerDurations = new Map<string, number>();
    const outputSpikes = new Array(trainer.model.config.outputNeurons.length).fill(0) as number[];
    const outputDurations = new Array(trainer.model.config.outputNeurons.length).fill(0) as number[];
    const classSpikes = new Array(trainer.model.config.outputNeurons.length).fill(0) as number[];
    const classDurations = new Array(trainer.model.config.outputNeurons.length).fill(0) as number[];
    const traces: IOscillatoryForwardTrace[] = [];
    let loss = 0;
    let correct = 0;
    let margin = 0;
    let inputEventCount = 0;
    let neuronSpikeCount = 0;
    let latency = 0;

    for (let sequenceIndex = 0; sequenceIndex < dataset.length; sequenceIndex++) {
        const sequence = dataset[sequenceIndex];
        const started = nowMilliseconds();
        const trace = trainer.forward(sequence);
        latency += nowMilliseconds() - started;
        if (retainTraces) traces.push(trace);
        loss += trace.loss;
        correct += Number(trace.predictedOutput === sequence.targetOutput);
        margin += classificationMargin(trace.scores, sequence.targetOutput);
        const duration = traceDuration(trace.steps, trainer.model.config.timeStepSeconds);
        for (const row of sequence.inputs) for (const value of row) inputEventCount += Number(value !== 0);
        let sampleNeuronSpikes = 0;
        for (let neuron = 0; neuron < trainer.model.neurons.length; neuron++) {
            const layer = trainer.model.neurons[neuron].layer;
            let spikes = 0;
            for (const step of trace.steps) spikes += step.spikes[neuron];
            sampleNeuronSpikes += spikes;
            neuronSpikeCount += spikes;
            layerSpikes.set(layer, (layerSpikes.get(layer) ?? 0) + spikes);
            layerDurations.set(layer, (layerDurations.get(layer) ?? 0) + duration);
        }
        for (let output = 0; output < trainer.model.config.outputNeurons.length; output++) {
            const neuron = trainer.model.config.outputNeurons[output];
            for (const step of trace.steps) outputSpikes[output] += step.spikes[neuron];
            outputDurations[output] += duration;
        }
        classSpikes[sequence.targetOutput] += sampleNeuronSpikes;
        classDurations[sequence.targetOutput] += duration * trainer.model.neurons.length;
        onSample?.(sequenceIndex + 1, dataset.length);
    }
    const firingRateByLayerHz: Record<string, number> = {};
    for (const [layer, spikes] of layerSpikes) firingRateByLayerHz[layer] = spikes / Math.max(layerDurations.get(layer) ?? 0, 1e-12);
    const accuracy = correct / dataset.length;
    return {
        loss: loss / dataset.length,
        hardAccuracy: accuracy,
        surrogateAccuracy: accuracy,
        surrogateToHardGap: 0,
        meanMargin: margin / dataset.length,
        firingRateByLayerHz,
        firingRateByClassHz: classSpikes.map((spikes, output) => spikes / Math.max(classDurations[output], 1e-12)),
        outputFiringRateHz: outputSpikes.map((spikes, output) => spikes / Math.max(outputDurations[output], 1e-12)),
        inputEventCount,
        neuronSpikeCount,
        eventCount: inputEventCount + neuronSpikeCount,
        meanLatencyMilliseconds: latency / dataset.length,
        traces,
    };
}

/** Run A, B, C and D with caller-provided models and exactly shared splits. */
export function runOscillatoryAblation(options: IOscillatoryAblationOptions): ReadonlyArray<IOscillatoryAblationVariantResult> {
    const variants = options.variants ?? (["A", "B", "C", "D"] as const);
    const results: IOscillatoryAblationVariantResult[] = [];
    for (const variant of variants) {
        options.onProgress?.({ variant, phase: "variant-start" });
        const model = options.createModel(variant);
        if (model.config.variant !== variant) throw new Error(`Oscillatory ablation factory returned variant ${model.config.variant} for ${variant}.`);
        const trainer = new OscillatorySnnBpttTrainer(model, options.trainer);
        const fit = trainer.fit(options.training, options.validation, {
            epochs: options.epochs,
            restoreBest: true,
            batchSize: options.batchSize,
            shuffleSeed: options.shuffleSeed,
            onProgress: (progress) => options.onProgress?.({ variant, ...progress }),
        });
        const profile = (datasetName: "train" | "validation" | "test", dataset: ReadonlyArray<IOscillatoryTrainingSequence>, retainTraces: boolean) =>
            profileOscillatoryDataset(
                trainer,
                dataset,
                (completedSamples, totalSamples) =>
                    options.onProgress?.({
                        variant,
                        phase: "profiling",
                        dataset: datasetName,
                        completedSamples,
                        totalSamples,
                    }),
                retainTraces
            );
        const keepDetailedTraces = options.retainTraces !== false;
        const train = profile("train", options.training, keepDetailedTraces);
        const needsCollectiveSpectrum = model.config.collective !== undefined;
        const validationWithTraces = profile("validation", options.validation, keepDetailedTraces || needsCollectiveSpectrum);
        const spectrum = needsCollectiveSpectrum ? analyzeCollectiveSpectrum(validationWithTraces.traces, 1 / model.config.timeStepSeconds) : [];
        const validation = keepDetailedTraces ? validationWithTraces : { ...validationWithTraces, traces: [] };
        const test = profile("test", options.test, keepDetailedTraces);
        results.push({
            variant,
            fit,
            train,
            validation,
            test,
            spectrum,
            cost: profileOscillatoryCost(model),
        });
        options.onProgress?.({ variant, phase: "variant-complete" });
    }
    return results;
}

function traceDuration(steps: ReadonlyArray<IOscillatorySnnStep>, fallback: number): number {
    if (steps.length < 2) return fallback;
    return Math.max(fallback, steps[steps.length - 1].timestamp - steps[0].timestamp + fallback);
}

function wrappedPhaseDistance(left: number, right: number): number {
    const delta = Math.abs(left - right) % (2 * Math.PI);
    return Math.min(delta, 2 * Math.PI - delta);
}

function classificationMargin(scores: ReadonlyArray<number>, target: number): number {
    if (!Number.isInteger(target) || target < 0 || target >= scores.length) return Number.NaN;
    let other = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < scores.length; index++) if (index !== target) other = Math.max(other, scores[index]);
    return scores[target] - other;
}

function argmax(values: ReadonlyArray<number>): number {
    let best = 0;
    for (let index = 1; index < values.length; index++) if (values[index] > values[best]) best = index;
    return best;
}

function nowMilliseconds(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
}
