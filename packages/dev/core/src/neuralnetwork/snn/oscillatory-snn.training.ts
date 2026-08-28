import { OscillatorySnnModel, type ICollectiveModeConfig, type IOscillatorySnnState, type IOscillatorySnnStep, type IOscillatorySynapseConfig } from "./oscillatory-snn.model";

export interface IOscillatoryTrainingSequence {
    inputs: ReadonlyArray<ReadonlyArray<number>>;
    targetOutput: number;
    timestamps?: ReadonlyArray<number>;
}

export interface IOscillatoryForwardTrace {
    steps: ReadonlyArray<IOscillatorySnnStep>;
    finalState: IOscillatorySnnState;
    scores: ReadonlyArray<number>;
    probabilities: ReadonlyArray<number>;
    predictedOutput: number;
    loss: number;
}

export interface IComplexParameterGradient {
    real: number;
    imaginary: number;
}

export interface IOscillatoryGradientSet {
    synapses: IComplexParameterGradient[];
    alpha: IComplexParameterGradient[][];
    gamma: IComplexParameterGradient[][];
}

export interface IOscillatoryGradientResult extends IOscillatoryForwardTrace {
    gradients: IOscillatoryGradientSet;
}

export interface IOscillatoryTrainerOptions {
    learningRate?: number;
    gradientClip?: number;
    optimizer?: "sgd" | "adam";
    beta1?: number;
    beta2?: number;
    epsilon?: number;
}

export interface IOscillatoryDatasetEvaluation {
    loss: number;
    accuracy: number;
    correct: number;
    sampleCount: number;
    meanMargin: number;
}

export interface IOscillatoryFitOptions {
    epochs: number;
    restoreBest?: boolean;
    batchSize?: number;
    shuffleSeed?: number;
    onProgress?: (progress: IOscillatoryFitProgress) => void;
}

export interface IOscillatoryFitProgress {
    phase: "initial-validation" | "training" | "validation" | "epoch-complete";
    epoch: number;
    totalEpochs: number;
    completedSamples?: number;
    totalSamples?: number;
    batch?: number;
    totalBatches?: number;
    trainLoss?: number;
    validationLoss?: number;
    validationAccuracy?: number;
}

export interface IOscillatoryFitResult {
    history: ReadonlyArray<{ epoch: number; trainLoss: number; validationLoss: number; validationAccuracy: number }>;
    bestEpoch: number;
    bestValidationLoss: number;
    bestValidationAccuracy: number;
}

interface IAdamState {
    firstMoment: number;
    secondMoment: number;
}

interface IParameterSnapshot {
    synapses: Array<{ real: number; imaginary: number }>;
    alpha: Array<Array<{ real: number; imaginary: number }>>;
    gamma: Array<Array<{ real: number; imaginary: number }>>;
}

/**
 * Hard-forward, surrogate-backward BPTT for the optional oscillatory SNN.
 * The forward pass calls OscillatorySnnModel directly, which is the same
 * state transition executed by OscillatorySnnNode in a RuntimeGraph.
 */
export class OscillatorySnnBpttTrainer {
    private readonly _adam = new Map<string, IAdamState>();
    private _iteration = 0;

    public readonly learningRate: number;
    public readonly gradientClip: number;
    public readonly optimizer: "sgd" | "adam";
    public readonly beta1: number;
    public readonly beta2: number;
    public readonly epsilon: number;

    public constructor(
        public readonly model: OscillatorySnnModel,
        options: IOscillatoryTrainerOptions = {}
    ) {
        this.learningRate = positiveOr(options.learningRate, 0.003);
        this.gradientClip = positiveOr(options.gradientClip, 1);
        this.optimizer = options.optimizer === "sgd" ? "sgd" : "adam";
        this.beta1 = probabilityOr(options.beta1, 0.9);
        this.beta2 = probabilityOr(options.beta2, 0.999);
        this.epsilon = positiveOr(options.epsilon, 1e-8);
    }

    public forward(sequence: IOscillatoryTrainingSequence): IOscillatoryForwardTrace {
        validateSequence(this.model, sequence);
        const state = this.model.createState();
        const steps: IOscillatorySnnStep[] = [];
        for (let timestep = 0; timestep < sequence.inputs.length; timestep++) {
            steps.push(this.model.step(state, sequence.inputs[timestep], sequence.timestamps?.[timestep]));
        }
        const scores = this.model.scores(state);
        const probabilities = softmax(scores, this.model.decoder.temperature);
        return {
            steps,
            finalState: cloneState(state),
            scores,
            probabilities,
            predictedOutput: argmax(scores),
            loss: -Math.log(Math.max(probabilities[sequence.targetOutput], 1e-12)),
        };
    }

    public gradients(sequence: IOscillatoryTrainingSequence): IOscillatoryGradientResult {
        const trace = this.forward(sequence);
        const timestepCount = trace.steps.length;
        const neuronCount = this.model.neurons.length;
        const collective = this.model.config.collective;
        const modeCount = collective?.modeCount ?? 0;
        const gradients = emptyGradients(this.model.config.synapses, collective, neuronCount, modeCount);
        const dStateReal = matrix3(timestepCount, neuronCount);
        const dStateImaginary = matrix3(timestepCount, neuronCount);
        const dSpike = matrix3(timestepCount, neuronCount);
        const dCollectiveReal = matrix3(timestepCount, modeCount);
        const dCollectiveImaginary = matrix3(timestepCount, modeCount);

        for (let output = 0; output < this.model.config.outputNeurons.length; output++) {
            const neuron = this.model.config.outputNeurons[output];
            const dScore = (trace.probabilities[output] - Number(output === sequence.targetOutput)) / this.model.decoder.temperature;
            for (let timestep = 0; timestep < timestepCount; timestep++) {
                dSpike[timestep][neuron] += dScore * this.model.decoder.spikeCountScale;
            }
            const finalStep = trace.steps[timestepCount - 1].neurons[neuron];
            const neuronConfig = this.model.neurons[neuron];
            if (neuronConfig.dynamics === "complex") {
                const thresholdSquared = neuronConfig.threshold * neuronConfig.threshold;
                dStateReal[timestepCount - 1][neuron] += (dScore * this.model.decoder.stateScale * 2 * finalStep.stateReal) / thresholdSquared;
                dStateImaginary[timestepCount - 1][neuron] += (dScore * this.model.decoder.stateScale * 2 * finalStep.stateImaginary) / thresholdSquared;
            } else {
                dStateReal[timestepCount - 1][neuron] += (dScore * this.model.decoder.stateScale) / neuronConfig.threshold;
            }
        }

        for (let timestep = timestepCount - 1; timestep >= 0; timestep--) {
            if (collective) {
                backpropagateCollectiveState(
                    collective,
                    this.model,
                    trace.steps[timestep],
                    dCollectiveReal[timestep],
                    dCollectiveImaginary[timestep],
                    dStateReal[timestep],
                    dStateImaginary[timestep],
                    dSpike[timestep],
                    gradients.alpha
                );
            }

            for (let neuron = neuronCount - 1; neuron >= 0; neuron--) {
                const step = trace.steps[timestep].neurons[neuron];
                const neuronConfig = this.model.neurons[neuron];
                let dDirectSpike = dSpike[timestep][neuron];
                dDirectSpike +=
                    dStateReal[timestep][neuron] * (neuronConfig.resetReal - step.integratedReal) +
                    dStateImaginary[timestep][neuron] * (neuronConfig.resetImaginary - step.integratedImaginary);

                const dIntegratedReal = dStateReal[timestep][neuron] * (1 - step.spike) + dDirectSpike * step.spikeGradientReal;
                const dIntegratedImaginary = dStateImaginary[timestep][neuron] * (1 - step.spike) + dDirectSpike * step.spikeGradientImaginary;

                if (timestep > 0) {
                    dStateReal[timestep - 1][neuron] += dIntegratedReal * step.decayRotationReal + dIntegratedImaginary * step.decayRotationImaginary;
                    dStateImaginary[timestep - 1][neuron] += -dIntegratedReal * step.decayRotationImaginary + dIntegratedImaginary * step.decayRotationReal;
                }

                for (const { index: synapseIndex, synapse } of this.model.incomingOf(neuron)) {
                    const source = sourceValue(this.model, trace.steps, sequence, timestep, synapse);
                    gradients.synapses[synapseIndex].real += dIntegratedReal * source.value;
                    gradients.synapses[synapseIndex].imaginary += dIntegratedImaginary * source.value;
                    if (source.neuron !== undefined && source.timestep !== undefined && source.timestep >= 0) {
                        dSpike[source.timestep][source.neuron] +=
                            source.spikeAmplitude * (dIntegratedReal * synapse.weightReal + dIntegratedImaginary * (synapse.weightImaginary ?? 0));
                    }
                }

                if (collective && timestep > 0) {
                    const previousFieldReal = trace.steps[timestep - 1].collectiveReal;
                    const previousFieldImaginary = trace.steps[timestep - 1].collectiveImaginary;
                    for (let mode = 0; mode < modeCount; mode++) {
                        const gammaReal = collective.gammaReal[neuron][mode];
                        const gammaImaginary = collective.gammaImaginary?.[neuron]?.[mode] ?? 0;
                        const fieldReal = previousFieldReal[mode];
                        const fieldImaginary = previousFieldImaginary[mode];
                        gradients.gamma[neuron][mode].real += dIntegratedReal * fieldReal + dIntegratedImaginary * fieldImaginary;
                        gradients.gamma[neuron][mode].imaginary += -dIntegratedReal * fieldImaginary + dIntegratedImaginary * fieldReal;
                        dCollectiveReal[timestep - 1][mode] += dIntegratedReal * gammaReal + dIntegratedImaginary * gammaImaginary;
                        dCollectiveImaginary[timestep - 1][mode] += -dIntegratedReal * gammaImaginary + dIntegratedImaginary * gammaReal;
                    }
                }
            }
        }

        clipGradients(gradients, this.gradientClip);
        return { ...trace, gradients };
    }

    public trainStep(sequence: IOscillatoryTrainingSequence): number {
        const result = this.gradients(sequence);
        this._iteration++;
        this.applyGradients(result.gradients, 1);
        return result.loss;
    }

    public trainBatch(dataset: ReadonlyArray<IOscillatoryTrainingSequence>, onSample?: (completed: number, total: number) => void): number {
        if (dataset.length === 0) throw new Error("Cannot train an empty oscillatory SNN batch.");
        const collective = this.model.config.collective;
        const accumulated = emptyGradients(this.model.config.synapses, collective, this.model.neurons.length, collective?.modeCount ?? 0);
        let loss = 0;
        for (let sequenceIndex = 0; sequenceIndex < dataset.length; sequenceIndex++) {
            const sequence = dataset[sequenceIndex];
            const result = this.gradients(sequence);
            loss += result.loss;
            addGradients(accumulated, result.gradients);
            onSample?.(sequenceIndex + 1, dataset.length);
        }
        this._iteration++;
        this.applyGradients(accumulated, 1 / dataset.length);
        return loss / dataset.length;
    }

    public evaluate(dataset: ReadonlyArray<IOscillatoryTrainingSequence>, onSample?: (completed: number, total: number) => void): IOscillatoryDatasetEvaluation {
        if (dataset.length === 0) throw new Error("Cannot evaluate an empty oscillatory SNN dataset.");
        let loss = 0;
        let correct = 0;
        let margin = 0;
        for (let sequenceIndex = 0; sequenceIndex < dataset.length; sequenceIndex++) {
            const sequence = dataset[sequenceIndex];
            const trace = this.forward(sequence);
            loss += trace.loss;
            correct += Number(trace.predictedOutput === sequence.targetOutput);
            margin += classificationMargin(trace.scores, sequence.targetOutput);
            onSample?.(sequenceIndex + 1, dataset.length);
        }
        return {
            loss: loss / dataset.length,
            accuracy: correct / dataset.length,
            correct,
            sampleCount: dataset.length,
            meanMargin: margin / dataset.length,
        };
    }

    public fit(
        training: ReadonlyArray<IOscillatoryTrainingSequence>,
        validation: ReadonlyArray<IOscillatoryTrainingSequence>,
        options: IOscillatoryFitOptions
    ): IOscillatoryFitResult {
        if (training.length === 0 || validation.length === 0) throw new Error("Oscillatory SNN fitting requires non-empty training and validation datasets.");
        const epochs = Math.max(0, Math.floor(options.epochs));
        const batchSize = Math.min(training.length, positiveIntegerOr(options.batchSize, training.length));
        const totalBatches = Math.ceil(training.length / batchSize);
        const history: Array<{ epoch: number; trainLoss: number; validationLoss: number; validationAccuracy: number }> = [];
        const initialValidation = this.evaluate(validation, (completedSamples, totalSamples) =>
            options.onProgress?.({
                phase: "initial-validation",
                epoch: 0,
                totalEpochs: epochs,
                completedSamples,
                totalSamples,
            })
        );
        let bestEpoch = -1;
        let bestValidationAccuracy = initialValidation.accuracy;
        let bestValidationLoss = initialValidation.loss;
        let best = this.snapshot();

        for (let epoch = 0; epoch < epochs; epoch++) {
            const displayEpoch = epoch + 1;
            const indices = new Array(training.length).fill(0).map((_, index) => index);
            if (Number.isInteger(options.shuffleSeed)) shuffleIndices(indices, (options.shuffleSeed! + Math.imul(displayEpoch, 0x9e3779b1)) >>> 0);
            let weightedTrainLoss = 0;
            for (let start = 0; start < training.length; start += batchSize) {
                const batchIndex = Math.floor(start / batchSize);
                const batch = indices.slice(start, start + batchSize).map((index) => training[index]);
                const batchLoss = this.trainBatch(batch, (completedInBatch) =>
                    options.onProgress?.({
                        phase: "training",
                        epoch: displayEpoch,
                        totalEpochs: epochs,
                        completedSamples: start + completedInBatch,
                        totalSamples: training.length,
                        batch: batchIndex + 1,
                        totalBatches,
                    })
                );
                weightedTrainLoss += batchLoss * batch.length;
            }
            const trainLoss = weightedTrainLoss / training.length;
            const evaluated = this.evaluate(validation, (completedSamples, totalSamples) =>
                options.onProgress?.({
                    phase: "validation",
                    epoch: displayEpoch,
                    totalEpochs: epochs,
                    completedSamples,
                    totalSamples,
                })
            );
            history.push({ epoch, trainLoss, validationLoss: evaluated.loss, validationAccuracy: evaluated.accuracy });
            options.onProgress?.({
                phase: "epoch-complete",
                epoch: displayEpoch,
                totalEpochs: epochs,
                trainLoss,
                validationLoss: evaluated.loss,
                validationAccuracy: evaluated.accuracy,
            });
            if (evaluated.accuracy > bestValidationAccuracy || (evaluated.accuracy === bestValidationAccuracy && evaluated.loss < bestValidationLoss)) {
                bestEpoch = epoch;
                bestValidationAccuracy = evaluated.accuracy;
                bestValidationLoss = evaluated.loss;
                best = this.snapshot();
            }
        }
        if (options.restoreBest !== false) this.restore(best);
        return { history, bestEpoch, bestValidationLoss, bestValidationAccuracy };
    }

    public resetOptimizerState(): void {
        this._adam.clear();
        this._iteration = 0;
    }

    private applyGradients(gradients: IOscillatoryGradientSet, scale: number): void {
        for (let index = 0; index < this.model.config.synapses.length; index++) {
            const synapse = this.model.config.synapses[index];
            if (synapse.trainable === false) continue;
            synapse.weightReal = this.updated(`synapse:${index}:real`, synapse.weightReal, gradients.synapses[index].real * scale);
            const imaginary = synapse.weightImaginary ?? 0;
            synapse.weightImaginary = this.updated(`synapse:${index}:imaginary`, imaginary, gradients.synapses[index].imaginary * scale);
        }
        const collective = this.model.config.collective;
        if (!collective || collective.trainable === false) return;
        const alphaImaginary = (collective.alphaImaginary ??= zeroMatrix(this.model.neurons.length, collective.modeCount));
        const gammaImaginary = (collective.gammaImaginary ??= zeroMatrix(this.model.neurons.length, collective.modeCount));
        for (let neuron = 0; neuron < this.model.neurons.length; neuron++) {
            for (let mode = 0; mode < collective.modeCount; mode++) {
                collective.alphaReal[neuron][mode] = this.updated(`alpha:${neuron}:${mode}:real`, collective.alphaReal[neuron][mode], gradients.alpha[neuron][mode].real * scale);
                alphaImaginary[neuron][mode] = this.updated(`alpha:${neuron}:${mode}:imaginary`, alphaImaginary[neuron][mode], gradients.alpha[neuron][mode].imaginary * scale);
                collective.gammaReal[neuron][mode] = this.updated(`gamma:${neuron}:${mode}:real`, collective.gammaReal[neuron][mode], gradients.gamma[neuron][mode].real * scale);
                gammaImaginary[neuron][mode] = this.updated(`gamma:${neuron}:${mode}:imaginary`, gammaImaginary[neuron][mode], gradients.gamma[neuron][mode].imaginary * scale);
            }
        }
    }

    private updated(key: string, value: number, gradient: number): number {
        if (this.optimizer === "sgd") return value - this.learningRate * gradient;
        const state = this._adam.get(key) ?? { firstMoment: 0, secondMoment: 0 };
        state.firstMoment = this.beta1 * state.firstMoment + (1 - this.beta1) * gradient;
        state.secondMoment = this.beta2 * state.secondMoment + (1 - this.beta2) * gradient * gradient;
        this._adam.set(key, state);
        const time = this._iteration;
        const first = state.firstMoment / (1 - Math.pow(this.beta1, time));
        const second = state.secondMoment / (1 - Math.pow(this.beta2, time));
        return value - (this.learningRate * first) / (Math.sqrt(second) + this.epsilon);
    }

    private snapshot(): IParameterSnapshot {
        const collective = this.model.config.collective;
        return {
            synapses: this.model.config.synapses.map((synapse) => ({ real: synapse.weightReal, imaginary: synapse.weightImaginary ?? 0 })),
            alpha: snapshotCollective(collective, "alpha", this.model.neurons.length),
            gamma: snapshotCollective(collective, "gamma", this.model.neurons.length),
        };
    }

    private restore(snapshot: IParameterSnapshot): void {
        for (let index = 0; index < snapshot.synapses.length; index++) {
            this.model.config.synapses[index].weightReal = snapshot.synapses[index].real;
            this.model.config.synapses[index].weightImaginary = snapshot.synapses[index].imaginary;
        }
        const collective = this.model.config.collective;
        if (collective) {
            collective.alphaImaginary ??= zeroMatrix(this.model.neurons.length, collective.modeCount);
            collective.gammaImaginary ??= zeroMatrix(this.model.neurons.length, collective.modeCount);
            restoreCollective(collective.alphaReal, collective.alphaImaginary, snapshot.alpha);
            restoreCollective(collective.gammaReal, collective.gammaImaginary, snapshot.gamma);
        }
        this.resetOptimizerState();
    }
}

function backpropagateCollectiveState(
    collective: ICollectiveModeConfig,
    model: OscillatorySnnModel,
    step: IOscillatorySnnStep,
    dFieldReal: ReadonlyArray<number>,
    dFieldImaginary: ReadonlyArray<number>,
    dStateReal: number[],
    dStateImaginary: number[],
    dSpike: number[],
    alphaGradient: IComplexParameterGradient[][]
): void {
    for (let neuron = 0; neuron < model.neurons.length; neuron++) {
        const sourceReal = collective.source === "spikes" ? step.spikes[neuron] * model.neurons[neuron].spikeAmplitude : step.neurons[neuron].stateReal;
        const sourceImaginary = collective.source === "states" ? step.neurons[neuron].stateImaginary : 0;
        let dSourceReal = 0;
        let dSourceImaginary = 0;
        for (let mode = 0; mode < collective.modeCount; mode++) {
            const alphaReal = collective.alphaReal[neuron][mode];
            const alphaImaginary = collective.alphaImaginary?.[neuron]?.[mode] ?? 0;
            const dReal = dFieldReal[mode];
            const dImaginary = dFieldImaginary[mode];
            alphaGradient[neuron][mode].real += dReal * sourceReal + dImaginary * sourceImaginary;
            alphaGradient[neuron][mode].imaginary += -dReal * sourceImaginary + dImaginary * sourceReal;
            dSourceReal += dReal * alphaReal + dImaginary * alphaImaginary;
            dSourceImaginary += -dReal * alphaImaginary + dImaginary * alphaReal;
        }
        if (collective.source === "spikes") {
            dSpike[neuron] += dSourceReal * model.neurons[neuron].spikeAmplitude;
        } else {
            dStateReal[neuron] += dSourceReal;
            dStateImaginary[neuron] += dSourceImaginary;
        }
    }
}

function sourceValue(
    model: OscillatorySnnModel,
    steps: ReadonlyArray<IOscillatorySnnStep>,
    sequence: IOscillatoryTrainingSequence,
    timestep: number,
    synapse: IOscillatorySynapseConfig
): { value: number; neuron?: number; timestep?: number; spikeAmplitude: number } {
    if (synapse.inputIndex !== undefined) {
        return { value: sequence.inputs[timestep][synapse.inputIndex], spikeAmplitude: 1 };
    }
    const neuron = synapse.sourceNeuron!;
    const delay = normalizeDelay(synapse.delayTicks);
    const sourceTimestep = timestep - delay;
    if (sourceTimestep < 0) return { value: 0, neuron, timestep: sourceTimestep, spikeAmplitude: model.neurons[neuron].spikeAmplitude };
    const spike = steps[sourceTimestep].spikes[neuron];
    const spikeAmplitude = model.neurons[neuron].spikeAmplitude;
    return { value: spike * spikeAmplitude, neuron, timestep: sourceTimestep, spikeAmplitude };
}

function emptyGradients(
    synapses: ReadonlyArray<IOscillatorySynapseConfig>,
    collective: ICollectiveModeConfig | undefined,
    neuronCount: number,
    modeCount: number
): IOscillatoryGradientSet {
    return {
        synapses: synapses.map(() => ({ real: 0, imaginary: 0 })),
        alpha: complexMatrix(neuronCount, collective ? modeCount : 0),
        gamma: complexMatrix(neuronCount, collective ? modeCount : 0),
    };
}

function addGradients(target: IOscillatoryGradientSet, source: IOscillatoryGradientSet): void {
    for (let synapse = 0; synapse < target.synapses.length; synapse++) {
        target.synapses[synapse].real += source.synapses[synapse].real;
        target.synapses[synapse].imaginary += source.synapses[synapse].imaginary;
    }
    for (let neuron = 0; neuron < target.alpha.length; neuron++) {
        for (let mode = 0; mode < target.alpha[neuron].length; mode++) {
            target.alpha[neuron][mode].real += source.alpha[neuron][mode].real;
            target.alpha[neuron][mode].imaginary += source.alpha[neuron][mode].imaginary;
            target.gamma[neuron][mode].real += source.gamma[neuron][mode].real;
            target.gamma[neuron][mode].imaginary += source.gamma[neuron][mode].imaginary;
        }
    }
}

function clipGradients(gradients: IOscillatoryGradientSet, limit: number): void {
    for (const gradient of gradients.synapses) clipComplex(gradient, limit);
    for (const row of gradients.alpha) for (const gradient of row) clipComplex(gradient, limit);
    for (const row of gradients.gamma) for (const gradient of row) clipComplex(gradient, limit);
}

function clipComplex(value: IComplexParameterGradient, limit: number): void {
    value.real = clip(value.real, limit);
    value.imaginary = clip(value.imaginary, limit);
}

function validateSequence(model: OscillatorySnnModel, sequence: IOscillatoryTrainingSequence): void {
    if (sequence.inputs.length === 0) throw new Error("Oscillatory SNN sequence cannot be empty.");
    if (!Number.isInteger(sequence.targetOutput) || sequence.targetOutput < 0 || sequence.targetOutput >= model.config.outputNeurons.length) {
        throw new Error("Oscillatory SNN target output is invalid.");
    }
    if (sequence.timestamps && sequence.timestamps.length !== sequence.inputs.length) {
        throw new Error("Oscillatory SNN timestamps must match sequence length.");
    }
    let previous = Number.NEGATIVE_INFINITY;
    for (let timestep = 0; timestep < sequence.inputs.length; timestep++) {
        const row = sequence.inputs[timestep];
        if (row.length !== model.config.inputSize || row.some((value) => !Number.isFinite(value))) {
            throw new Error(`Oscillatory SNN timestep ${timestep} has an invalid input vector.`);
        }
        const timestamp = sequence.timestamps?.[timestep] ?? timestep * model.config.timeStepSeconds;
        if (!Number.isFinite(timestamp) || timestamp < previous) throw new Error("Oscillatory SNN timestamps must be finite and monotonic.");
        previous = timestamp;
    }
}

function softmax(scores: ReadonlyArray<number>, temperature: number): number[] {
    const logits = scores.map((score) => score / temperature);
    const maximum = Math.max(...logits);
    const exponentials = logits.map((value) => Math.exp(value - maximum));
    const sum = exponentials.reduce((total, value) => total + value, 0);
    return exponentials.map((value) => value / sum);
}

function classificationMargin(scores: ReadonlyArray<number>, target: number): number {
    let other = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < scores.length; index++) if (index !== target) other = Math.max(other, scores[index]);
    return scores[target] - other;
}

function snapshotCollective(collective: ICollectiveModeConfig | undefined, prefix: "alpha" | "gamma", neuronCount: number): Array<Array<{ real: number; imaginary: number }>> {
    if (!collective) return new Array(neuronCount).fill(null).map(() => []);
    const real = prefix === "alpha" ? collective.alphaReal : collective.gammaReal;
    const imaginary = prefix === "alpha" ? collective.alphaImaginary : collective.gammaImaginary;
    return real.map((row, neuron) => row.map((value, mode) => ({ real: value, imaginary: imaginary?.[neuron]?.[mode] ?? 0 })));
}

function restoreCollective(real: number[][], imaginary: number[][], snapshot: ReadonlyArray<ReadonlyArray<{ real: number; imaginary: number }>>): void {
    for (let neuron = 0; neuron < snapshot.length; neuron++) {
        for (let mode = 0; mode < snapshot[neuron].length; mode++) {
            real[neuron][mode] = snapshot[neuron][mode].real;
            imaginary[neuron][mode] = snapshot[neuron][mode].imaginary;
        }
    }
}

function cloneState(state: IOscillatorySnnState): IOscillatorySnnState {
    return {
        neurons: state.neurons.map((neuron) => ({ ...neuron })),
        collectiveReal: state.collectiveReal.slice(),
        collectiveImaginary: state.collectiveImaginary.slice(),
        spikeHistory: state.spikeHistory.map((row) => row.slice()),
        tickIndex: state.tickIndex,
    };
}

function matrix3(rows: number, columns: number): number[][] {
    return new Array(rows).fill(null).map(() => new Array(columns).fill(0));
}

function zeroMatrix(rows: number, columns: number): number[][] {
    return matrix3(rows, columns);
}

function complexMatrix(rows: number, columns: number): IComplexParameterGradient[][] {
    return new Array(rows).fill(null).map(() => new Array(columns).fill(null).map(() => ({ real: 0, imaginary: 0 })));
}

function normalizeDelay(value: number | undefined): number {
    return value === undefined || !Number.isFinite(value) ? 0 : Math.max(0, Math.floor(value));
}

function argmax(values: ReadonlyArray<number>): number {
    let best = 0;
    for (let index = 1; index < values.length; index++) if (values[index] > values[best]) best = index;
    return best;
}

function positiveOr(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

function probabilityOr(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) && value > 0 && value < 1 ? value : fallback;
}

function positiveIntegerOr(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isInteger(value) && value > 0 ? Math.floor(value) : fallback;
}

function shuffleIndices(indices: number[], seed: number): void {
    const random = mulberry32(seed);
    for (let index = indices.length - 1; index > 0; index--) {
        const swap = Math.floor(random() * (index + 1));
        [indices[index], indices[swap]] = [indices[swap], indices[index]];
    }
}

function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function clip(value: number, limit: number): number {
    return Math.max(-limit, Math.min(limit, value));
}
