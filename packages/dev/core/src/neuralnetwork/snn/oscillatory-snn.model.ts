import type { IDeclaresPorts, INodeState, IPortDescriptor, ISession } from "../../execution/execution.interfaces";
import { RuntimeNode } from "../../execution/execution.node";
import { cloneable } from "../../graph/graph.interfaces";

export const OSCILLATORY_SNN_TYPE_ID = "SNN:oscillatory-network";
export const OSCILLATORY_SNN_INPUT_SLOT = "temporal-input";
export const OSCILLATORY_SNN_STEP_SLOT = "oscillatory-step";

export type OscillatoryExperimentVariant = "A" | "B" | "C" | "D";
export type OscillatoryNeuronDynamics = "lif" | "complex";
export type CollectiveModeSource = "none" | "spikes" | "states";

export interface IOscillatoryNeuronConfig {
    id: string;
    layer?: string;
    dynamics?: OscillatoryNeuronDynamics;
    restingPotential?: number;
    initialReal?: number;
    initialImaginary?: number;
    threshold?: number;
    resetReal?: number;
    resetImaginary?: number;
    membraneTimeConstant?: number;
    /** Intrinsic rotation in radians per second. Zero imposes no preferred frequency. */
    angularFrequency?: number;
    spikeAmplitude?: number;
    surrogateSlope?: number;
}

export interface IOscillatorySynapseConfig {
    id?: string;
    targetNeuron: number;
    /** Exactly one of inputIndex and sourceNeuron must be supplied. */
    inputIndex?: number;
    sourceNeuron?: number;
    delayTicks?: number;
    weightReal: number;
    weightImaginary?: number;
    trainable?: boolean;
}

export interface ICollectiveModeConfig {
    modeCount: number;
    source: Exclude<CollectiveModeSource, "none">;
    /** Matrices are indexed by neuron, then collective mode. */
    alphaReal: number[][];
    alphaImaginary?: number[][];
    gammaReal: number[][];
    gammaImaginary?: number[][];
    trainable?: boolean;
}

export interface IOscillatoryDecoderConfig {
    spikeCountScale?: number;
    stateScale?: number;
    temperature?: number;
}

export interface IOscillatorySnnConfig {
    variant: OscillatoryExperimentVariant;
    inputSize: number;
    timeStepSeconds: number;
    neurons: IOscillatoryNeuronConfig[];
    synapses: IOscillatorySynapseConfig[];
    outputNeurons: number[];
    collective?: ICollectiveModeConfig;
    decoder?: IOscillatoryDecoderConfig;
}

export interface IOscillatoryNeuronState {
    real: number;
    imaginary: number;
    lastUpdateTime: number | null;
    lastSpikeTime: number | null;
    spikeCount: number;
}

export interface IOscillatorySnnState {
    neurons: IOscillatoryNeuronState[];
    collectiveReal: number[];
    collectiveImaginary: number[];
    spikeHistory: number[][];
    tickIndex: number;
}

export interface IOscillatoryNeuronStep {
    previousReal: number;
    previousImaginary: number;
    decayRotationReal: number;
    decayRotationImaginary: number;
    inputReal: number;
    inputImaginary: number;
    integratedReal: number;
    integratedImaginary: number;
    amplitudeSquared: number;
    phase: number;
    spike: number;
    spikeGradientReal: number;
    spikeGradientImaginary: number;
    stateReal: number;
    stateImaginary: number;
}

export interface IOscillatorySnnStep {
    timestamp: number;
    neurons: IOscillatoryNeuronStep[];
    spikes: number[];
    outputs: number[];
    collectiveReal: number[];
    collectiveImaginary: number[];
    scores: number[];
}

export interface IOscillatorySnnInput {
    values: ReadonlyArray<number>;
    timestamp?: number;
}

export interface IOscillatorySnnNodeState extends INodeState {
    network: IOscillatorySnnState;
    lastStep: IOscillatorySnnStep | null;
}

interface INormalizedNeuronConfig {
    id: string;
    layer: string;
    dynamics: OscillatoryNeuronDynamics;
    restingPotential: number;
    initialReal: number;
    initialImaginary: number;
    threshold: number;
    resetReal: number;
    resetImaginary: number;
    membraneTimeConstant: number;
    angularFrequency: number;
    spikeAmplitude: number;
    surrogateSlope: number;
}

interface INormalizedDecoderConfig {
    spikeCountScale: number;
    stateScale: number;
    temperature: number;
}

/**
 * Shared hard-forward model used by both the analytical trainer and the
 * Session-native runtime node. Complex values are always represented by two
 * real scalars. No native complex type is used in the execution path.
 */
export class OscillatorySnnModel {
    public readonly neurons: ReadonlyArray<INormalizedNeuronConfig>;
    public readonly decoder: INormalizedDecoderConfig;
    public readonly maximumDelayTicks: number;
    private readonly _incoming: ReadonlyArray<ReadonlyArray<{ index: number; synapse: IOscillatorySynapseConfig }>>;

    public constructor(public readonly config: IOscillatorySnnConfig) {
        validateConfig(config);
        this.neurons = config.neurons.map((neuron) => normalizeNeuron(neuron, config.variant));
        this.decoder = {
            spikeCountScale: nonNegativeOr(config.decoder?.spikeCountScale, 2),
            stateScale: nonNegativeOr(config.decoder?.stateScale, 1),
            temperature: positiveOr(config.decoder?.temperature, 1),
        };
        this.maximumDelayTicks = config.synapses.reduce((maximum, synapse) => Math.max(maximum, normalizeDelay(synapse.delayTicks)), 0);
        const incoming = config.neurons.map(() => [] as Array<{ index: number; synapse: IOscillatorySynapseConfig }>);
        for (let index = 0; index < config.synapses.length; index++) {
            incoming[config.synapses[index].targetNeuron].push({ index, synapse: config.synapses[index] });
        }
        this._incoming = incoming;
    }

    public createState(): IOscillatorySnnState {
        const modeCount = this.config.collective?.modeCount ?? 0;
        return {
            neurons: this.neurons.map((neuron) => ({
                real: neuron.initialReal,
                imaginary: neuron.dynamics === "complex" ? neuron.initialImaginary : 0,
                lastUpdateTime: null,
                lastSpikeTime: null,
                spikeCount: 0,
            })),
            collectiveReal: new Array(modeCount).fill(0),
            collectiveImaginary: new Array(modeCount).fill(0),
            spikeHistory: [],
            tickIndex: 0,
        };
    }

    public step(state: IOscillatorySnnState, input: ReadonlyArray<number>, timestamp?: number): IOscillatorySnnStep {
        if (input.length !== this.config.inputSize) {
            throw new Error(`Oscillatory SNN received ${input.length} inputs, expected ${this.config.inputSize}.`);
        }
        if (input.some((value) => !Number.isFinite(value))) throw new Error("Oscillatory SNN inputs must be finite.");

        const t = timestamp ?? state.tickIndex * this.config.timeStepSeconds;
        if (!Number.isFinite(t)) throw new Error("Oscillatory SNN timestamp must be finite.");
        const previousCollectiveReal = state.collectiveReal.slice();
        const previousCollectiveImaginary = state.collectiveImaginary.slice();
        const neuronSteps: IOscillatoryNeuronStep[] = [];
        const spikes = new Array(this.neurons.length).fill(0) as number[];

        for (let neuronIndex = 0; neuronIndex < this.neurons.length; neuronIndex++) {
            const neuron = this.neurons[neuronIndex];
            const neuronState = state.neurons[neuronIndex];
            let inputReal = 0;
            let inputImaginary = 0;

            for (const { synapse } of this._incoming[neuronIndex]) {
                let source = 0;
                if (synapse.inputIndex !== undefined) {
                    source = input[synapse.inputIndex];
                } else {
                    const sourceNeuron = synapse.sourceNeuron!;
                    const delay = normalizeDelay(synapse.delayTicks);
                    if (delay === 0) {
                        source = spikes[sourceNeuron] * this.neurons[sourceNeuron].spikeAmplitude;
                    } else {
                        const historyIndex = state.spikeHistory.length - delay;
                        source = historyIndex >= 0 ? state.spikeHistory[historyIndex][sourceNeuron] * this.neurons[sourceNeuron].spikeAmplitude : 0;
                    }
                }
                inputReal += source * synapse.weightReal;
                inputImaginary += source * finiteOr(synapse.weightImaginary, 0);
            }

            const collective = this.config.collective;
            if (collective) {
                const gammaImaginary = collective.gammaImaginary;
                for (let mode = 0; mode < collective.modeCount; mode++) {
                    const gammaReal = collective.gammaReal[neuronIndex][mode];
                    const gammaImag = gammaImaginary?.[neuronIndex]?.[mode] ?? 0;
                    const fieldReal = previousCollectiveReal[mode];
                    const fieldImaginary = previousCollectiveImaginary[mode];
                    inputReal += gammaReal * fieldReal - gammaImag * fieldImaginary;
                    inputImaginary += gammaReal * fieldImaginary + gammaImag * fieldReal;
                }
            }

            const step = advanceOscillatoryNeuron(neuron, neuronState, inputReal, inputImaginary, t);
            neuronSteps.push(step);
            spikes[neuronIndex] = step.spike;
        }

        const nextCollective = collectiveStateOf(this.config.collective, this.neurons, neuronSteps, spikes);
        state.collectiveReal = nextCollective.real;
        state.collectiveImaginary = nextCollective.imaginary;
        if (this.maximumDelayTicks > 0) {
            state.spikeHistory.push(spikes.slice());
            while (state.spikeHistory.length > this.maximumDelayTicks) state.spikeHistory.shift();
        }
        state.tickIndex++;

        const outputs = this.config.outputNeurons.map((neuron) => spikes[neuron]);
        return {
            timestamp: t,
            neurons: neuronSteps,
            spikes,
            outputs,
            collectiveReal: state.collectiveReal.slice(),
            collectiveImaginary: state.collectiveImaginary.slice(),
            scores: this.scores(state),
        };
    }

    public scores(state: IOscillatorySnnState): number[] {
        return this.config.outputNeurons.map((neuronIndex) => {
            const neuron = this.neurons[neuronIndex];
            const stateValue = state.neurons[neuronIndex];
            const normalizedState =
                neuron.dynamics === "complex"
                    ? (stateValue.real * stateValue.real + stateValue.imaginary * stateValue.imaginary) / (neuron.threshold * neuron.threshold)
                    : stateValue.real / neuron.threshold;
            return this.decoder.spikeCountScale * stateValue.spikeCount + this.decoder.stateScale * normalizedState;
        });
    }

    public incomingOf(neuron: number): ReadonlyArray<{ index: number; synapse: IOscillatorySynapseConfig }> {
        return this._incoming[neuron] ?? [];
    }
}

/** Session-native wrapper around the same model kernel used for training. */
export class OscillatorySnnNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: OSCILLATORY_SNN_INPUT_SLOT, optional: false, type: "temporal-vector", kind: "stream", capacity: 1024 }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: OSCILLATORY_SNN_STEP_SLOT, optional: true, type: "oscillatory-snn-step", kind: "stream", capacity: 1024 },
    ];

    @cloneable public modelConfig: IOscillatorySnnConfig;
    private _model: OscillatorySnnModel;

    public constructor(config: IOscillatorySnnConfig = defaultOscillatorySnnConfig()) {
        super();
        this.modelConfig = cloneConfig(config);
        this._model = new OscillatorySnnModel(this.modelConfig);
        this.type = "snn.oscillatory-network";
    }

    public configure(config: IOscillatorySnnConfig): void {
        const previous = this.modelConfig;
        const next = cloneConfig(config);
        const model = new OscillatorySnnModel(next);
        this.modelConfig = next;
        this._model = model;
        this.notifyPropertyChanged("modelConfig", previous, next);
    }

    public override deserialize(blob: unknown): void {
        super.deserialize(blob);
        this._model = new OscillatorySnnModel(this.modelConfig);
    }

    public createNodeState(): IOscillatorySnnNodeState {
        return { linksReady: 0, network: this._model.createState(), lastStep: null };
    }

    public override reset(session: ISession): void {
        const state = this.stateOf(session);
        if (!state) return;
        state.network = this._model.createState();
        state.lastStep = null;
    }

    public override fire(session: ISession, t: number): void {
        const state = this.stateOf(session);
        if (!state) return;
        let latest: IOscillatorySnnInput | null = null;
        for (const channel of this.inputChannels(OSCILLATORY_SNN_INPUT_SLOT)) {
            if (!channel.enabled) continue;
            const index = this.channelIndex(session, channel);
            if (index < 0) continue;
            while (session.linkStates[index].ready) {
                const value = session.consume(index);
                if (isTemporalInput(value)) latest = value;
            }
        }
        if (!latest) return;
        state.lastStep = this._model.step(state.network, latest.values, latest.timestamp ?? t);
        this.publishAll(session, OSCILLATORY_SNN_STEP_SLOT, state.lastStep);
    }

    public stateOf(session: ISession): IOscillatorySnnNodeState | undefined {
        return session.nodeStateOf(this) as IOscillatorySnnNodeState | undefined;
    }
}

export function createOscillatoryVariantConfig(
    variant: OscillatoryExperimentVariant,
    base: Omit<IOscillatorySnnConfig, "variant" | "collective">,
    collective?: Omit<ICollectiveModeConfig, "source">
): IOscillatorySnnConfig {
    const dynamics: OscillatoryNeuronDynamics = variant === "B" || variant === "D" ? "complex" : "lif";
    const neurons = base.neurons.map((neuron) => ({ ...neuron, dynamics }));
    let field: ICollectiveModeConfig | undefined;
    if (variant === "C" || variant === "D") {
        if (!collective) throw new Error(`Oscillatory SNN variant ${variant} requires collective-mode coefficients.`);
        field = { ...collective, source: variant === "C" ? "spikes" : "states" };
    }
    return { ...base, variant, neurons, ...(field ? { collective: field } : {}) };
}

export function defaultOscillatorySnnConfig(): IOscillatorySnnConfig {
    return {
        variant: "A",
        inputSize: 1,
        timeStepSeconds: 0.01,
        neurons: [{ id: "lif-0", dynamics: "lif" }],
        synapses: [{ inputIndex: 0, targetNeuron: 0, weightReal: 1 }],
        outputNeurons: [0],
    };
}

function advanceOscillatoryNeuron(
    config: INormalizedNeuronConfig,
    state: IOscillatoryNeuronState,
    inputReal: number,
    inputImaginary: number,
    timestamp: number
): IOscillatoryNeuronStep {
    const previousReal = state.real;
    const previousImaginary = config.dynamics === "complex" ? state.imaginary : 0;
    const elapsed = state.lastUpdateTime === null ? 0 : Math.max(0, timestamp - state.lastUpdateTime);
    const radius = Math.exp(-elapsed / config.membraneTimeConstant);
    const angle = config.dynamics === "complex" ? config.angularFrequency * elapsed : 0;
    const a = radius * Math.cos(angle);
    const b = radius * Math.sin(angle);
    const centeredReal = previousReal - config.restingPotential;
    const integratedReal = config.restingPotential + a * centeredReal - b * previousImaginary + inputReal;
    const integratedImaginary = config.dynamics === "complex" ? b * centeredReal + a * previousImaginary + inputImaginary : 0;
    const amplitudeSquared = integratedReal * integratedReal + integratedImaginary * integratedImaginary;
    const spike = config.dynamics === "complex" ? Number(amplitudeSquared >= config.threshold * config.threshold) : Number(integratedReal >= config.threshold);
    let spikeGradientReal = 0;
    let spikeGradientImaginary = 0;
    if (config.dynamics === "complex") {
        const radialMargin = (amplitudeSquared - config.threshold * config.threshold) / (2 * config.threshold);
        const derivative = triangularDerivative(radialMargin, config.surrogateSlope);
        spikeGradientReal = derivative * (integratedReal / config.threshold);
        spikeGradientImaginary = derivative * (integratedImaginary / config.threshold);
    } else {
        spikeGradientReal = triangularDerivative(integratedReal - config.threshold, config.surrogateSlope);
    }

    state.real = spike ? config.resetReal : integratedReal;
    state.imaginary = config.dynamics === "complex" ? (spike ? config.resetImaginary : integratedImaginary) : 0;
    state.lastUpdateTime = timestamp;
    if (spike) {
        state.lastSpikeTime = timestamp;
        state.spikeCount++;
    }
    return {
        previousReal,
        previousImaginary,
        decayRotationReal: a,
        decayRotationImaginary: b,
        inputReal,
        inputImaginary,
        integratedReal,
        integratedImaginary,
        amplitudeSquared,
        phase: Math.atan2(integratedImaginary, integratedReal),
        spike,
        spikeGradientReal,
        spikeGradientImaginary,
        stateReal: state.real,
        stateImaginary: state.imaginary,
    };
}

function collectiveStateOf(
    config: ICollectiveModeConfig | undefined,
    neurons: ReadonlyArray<INormalizedNeuronConfig>,
    steps: ReadonlyArray<IOscillatoryNeuronStep>,
    spikes: ReadonlyArray<number>
): { real: number[]; imaginary: number[] } {
    if (!config) return { real: [], imaginary: [] };
    const real = new Array(config.modeCount).fill(0) as number[];
    const imaginary = new Array(config.modeCount).fill(0) as number[];
    for (let neuron = 0; neuron < neurons.length; neuron++) {
        const sourceReal = config.source === "spikes" ? spikes[neuron] * neurons[neuron].spikeAmplitude : steps[neuron].stateReal;
        const sourceImaginary = config.source === "states" ? steps[neuron].stateImaginary : 0;
        for (let mode = 0; mode < config.modeCount; mode++) {
            const alphaReal = config.alphaReal[neuron][mode];
            const alphaImaginary = config.alphaImaginary?.[neuron]?.[mode] ?? 0;
            real[mode] += alphaReal * sourceReal - alphaImaginary * sourceImaginary;
            imaginary[mode] += alphaReal * sourceImaginary + alphaImaginary * sourceReal;
        }
    }
    return { real, imaginary };
}

function normalizeNeuron(config: IOscillatoryNeuronConfig, variant: OscillatoryExperimentVariant): INormalizedNeuronConfig {
    const complexVariant = variant === "B" || variant === "D";
    const dynamics: OscillatoryNeuronDynamics = complexVariant ? (config.dynamics ?? "complex") : "lif";
    const complex = dynamics === "complex";
    return {
        id: config.id,
        layer: config.layer ?? "default",
        dynamics,
        restingPotential: finiteOr(config.restingPotential, 0),
        initialReal: finiteOr(config.initialReal, 0),
        initialImaginary: complex ? finiteOr(config.initialImaginary, 0) : 0,
        threshold: positiveOr(config.threshold, 1),
        resetReal: finiteOr(config.resetReal, 0),
        resetImaginary: complex ? finiteOr(config.resetImaginary, 0) : 0,
        membraneTimeConstant: positiveOr(config.membraneTimeConstant, 0.02),
        angularFrequency: complex ? finiteOr(config.angularFrequency, 0) : 0,
        spikeAmplitude: finiteOr(config.spikeAmplitude, 1),
        surrogateSlope: positiveOr(config.surrogateSlope, 1.25),
    };
}

function validateConfig(config: IOscillatorySnnConfig): void {
    if (!Number.isInteger(config.inputSize) || config.inputSize <= 0) throw new Error("Oscillatory SNN input size must be a positive integer.");
    if (!Number.isFinite(config.timeStepSeconds) || config.timeStepSeconds <= 0) throw new Error("Oscillatory SNN timestep must be positive.");
    if (config.neurons.length === 0) throw new Error("Oscillatory SNN requires at least one neuron.");
    const ids = new Set<string>();
    for (const neuron of config.neurons) {
        if (!neuron.id || ids.has(neuron.id)) throw new Error("Oscillatory SNN neuron ids must be non-empty and unique.");
        ids.add(neuron.id);
    }
    for (const output of config.outputNeurons) assertNeuronIndex(output, config.neurons.length, "output");
    if (config.outputNeurons.length === 0 || new Set(config.outputNeurons).size !== config.outputNeurons.length) {
        throw new Error("Oscillatory SNN outputs must be non-empty and unique.");
    }
    for (const synapse of config.synapses) {
        assertNeuronIndex(synapse.targetNeuron, config.neurons.length, "synapse target");
        const external = synapse.inputIndex !== undefined;
        const internal = synapse.sourceNeuron !== undefined;
        if (external === internal) throw new Error("Each oscillatory synapse requires exactly one external input or source neuron.");
        if (external && (!Number.isInteger(synapse.inputIndex) || synapse.inputIndex! < 0 || synapse.inputIndex! >= config.inputSize)) {
            throw new Error("Oscillatory synapse input index is outside the input vector.");
        }
        if (internal) {
            assertNeuronIndex(synapse.sourceNeuron!, config.neurons.length, "synapse source");
            const delay = normalizeDelay(synapse.delayTicks);
            if (delay === 0 && synapse.sourceNeuron! >= synapse.targetNeuron) {
                throw new Error("Zero-delay oscillatory synapses must follow neuron topological order.");
            }
        }
        if (!Number.isFinite(synapse.weightReal) || !Number.isFinite(finiteOr(synapse.weightImaginary, 0))) {
            throw new Error("Oscillatory synapse weights must be finite.");
        }
    }
    const needsCollective = config.variant === "C" || config.variant === "D";
    if (needsCollective !== !!config.collective) throw new Error(`Oscillatory SNN variant ${config.variant} has an inconsistent collective-mode configuration.`);
    if (config.collective) validateCollective(config.collective, config.neurons.length, config.variant);
}

function validateCollective(config: ICollectiveModeConfig, neuronCount: number, variant: OscillatoryExperimentVariant): void {
    if (!Number.isInteger(config.modeCount) || config.modeCount <= 0) throw new Error("Collective mode count must be a positive integer.");
    const expectedSource = variant === "C" ? "spikes" : "states";
    if (config.source !== expectedSource) throw new Error(`Variant ${variant} requires collective source ${expectedSource}.`);
    validateMatrix(config.alphaReal, neuronCount, config.modeCount, "alphaReal");
    validateMatrix(config.gammaReal, neuronCount, config.modeCount, "gammaReal");
    if (config.alphaImaginary) validateMatrix(config.alphaImaginary, neuronCount, config.modeCount, "alphaImaginary");
    if (config.gammaImaginary) validateMatrix(config.gammaImaginary, neuronCount, config.modeCount, "gammaImaginary");
}

function validateMatrix(matrix: ReadonlyArray<ReadonlyArray<number>>, rows: number, columns: number, name: string): void {
    if (matrix.length !== rows) throw new Error(`Collective matrix ${name} has ${matrix.length} rows, expected ${rows}.`);
    for (let row = 0; row < rows; row++) {
        if (matrix[row].length !== columns || matrix[row].some((value) => !Number.isFinite(value))) {
            throw new Error(`Collective matrix ${name} row ${row} must contain ${columns} finite values.`);
        }
    }
}

function assertNeuronIndex(value: number, count: number, label: string): void {
    if (!Number.isInteger(value) || value < 0 || value >= count) throw new Error(`Oscillatory SNN ${label} index ${value} is invalid.`);
}

function triangularDerivative(distance: number, slope: number): number {
    return slope * Math.max(0, 1 - slope * Math.abs(distance));
}

function normalizeDelay(value: number | undefined): number {
    return value === undefined || !Number.isFinite(value) ? 0 : Math.max(0, Math.floor(value));
}

function finiteOr(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function positiveOr(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonNegativeOr(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function isTemporalInput(value: unknown): value is IOscillatorySnnInput {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<IOscillatorySnnInput>;
    return Array.isArray(candidate.values) && candidate.values.every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function cloneConfig(config: IOscillatorySnnConfig): IOscillatorySnnConfig {
    return {
        ...config,
        neurons: config.neurons.map((neuron) => ({ ...neuron })),
        synapses: config.synapses.map((synapse) => ({ ...synapse })),
        outputNeurons: config.outputNeurons.slice(),
        ...(config.decoder ? { decoder: { ...config.decoder } } : {}),
        ...(config.collective
            ? {
                  collective: {
                      ...config.collective,
                      alphaReal: config.collective.alphaReal.map((row) => row.slice()),
                      alphaImaginary: config.collective.alphaImaginary?.map((row) => row.slice()),
                      gammaReal: config.collective.gammaReal.map((row) => row.slice()),
                      gammaImaginary: config.collective.gammaImaginary?.map((row) => row.slice()),
                  },
              }
            : {}),
    };
}
