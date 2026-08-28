import {
    Channel,
    LinkRegistry,
    NodeRegistry,
    OSCILLATORY_SNN_INPUT_SLOT,
    OSCILLATORY_SNN_TYPE_ID,
    OscillatorySnnBpttTrainer,
    OscillatorySnnModel,
    OscillatorySnnNode,
    RuntimeGraphBuilder,
    RuntimeNode,
    Session,
    TEMPORAL_DELTA_SENSOR_TYPE_ID,
    TEMPORAL_DELTA_VECTOR_SLOT,
    TemporalDeltaSpikeEncoder,
    TemporalDeltaSpikeSensorNode,
    WAVE_OBSERVATION_INPUT_SLOT,
    analyzeCollectiveSpectrum,
    createOscillatoryVariantConfig,
    profileOscillatoryCost,
    registerSessionSnnTypes,
    runOscillatoryAblation,
    type IDeclaresPorts,
    type IOscillatoryForwardTrace,
    type IOscillatorySnnConfig,
    type IOscillatorySnnInput,
    type IPortDescriptor,
    type ISession,
    type IWaveObservation,
} from "spikypanda-core";

class TemporalVectorSource extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: OSCILLATORY_SNN_INPUT_SLOT, optional: true, type: "temporal-vector", kind: "stream", capacity: 1024 }];
    public value: IOscillatorySnnInput = { values: [0] };

    public override fire(session: ISession): void {
        this.publishAll(session, OSCILLATORY_SNN_INPUT_SLOT, this.value);
    }
}

class WaveObservationSource extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: WAVE_OBSERVATION_INPUT_SLOT, optional: true, type: "wave-observation", kind: "stream", capacity: 1024 }];
    public value: IWaveObservation = { timestamp: 0, values: [0] };

    public override fire(session: ISession): void {
        this.publishAll(session, WAVE_OBSERVATION_INPUT_SLOT, this.value);
    }
}

function oneNeuronConfig(): IOscillatorySnnConfig {
    return {
        variant: "B",
        inputSize: 1,
        timeStepSeconds: 0.1,
        neurons: [
            {
                id: "complex-0",
                layer: "hidden",
                threshold: 2,
                initialReal: 1,
                initialImaginary: 0,
                membraneTimeConstant: 1e9,
                angularFrequency: Math.PI / 2,
            },
        ],
        synapses: [{ inputIndex: 0, targetNeuron: 0, weightReal: 0.25, weightImaginary: 0.5 }],
        outputNeurons: [0],
    };
}

describe("oscillatory SNN experimental architecture", () => {
    test("uses the exact same explicit complex transition in analytical and RuntimeGraph execution", () => {
        const config = oneNeuronConfig();
        const analytical = new OscillatorySnnModel(config);
        const analyticalState = analytical.createState();
        analytical.step(analyticalState, [0], 0);
        const expected = analytical.step(analyticalState, [1], 1);

        const source = new TemporalVectorSource();
        const runtime = new OscillatorySnnNode(config);
        const input = new Channel(source, runtime, OSCILLATORY_SNN_INPUT_SLOT, false, undefined, true, OSCILLATORY_SNN_INPUT_SLOT);
        const graph = new RuntimeGraphBuilder().withMode("dynamic").withNodes(source, runtime).withLinks(input).build();
        const session = new Session(graph);
        source.value = { values: [0], timestamp: 0 };
        session.run(0);
        source.value = { values: [1], timestamp: 1 };
        session.run(1);

        const actual = runtime.stateOf(session)!.lastStep!;
        expect(actual.neurons[0].integratedReal).toBeCloseTo(expected.neurons[0].integratedReal, 12);
        expect(actual.neurons[0].integratedImaginary).toBeCloseTo(expected.neurons[0].integratedImaginary, 12);
        expect(actual.neurons[0].amplitudeSquared).toBeCloseTo(expected.neurons[0].amplitudeSquared, 12);
        expect(actual.neurons[0].spike).toBe(expected.neurons[0].spike);
    });

    test("maps A to D without modifying the existing LIF primitive", () => {
        const base = {
            inputSize: 1,
            timeStepSeconds: 0.01,
            neurons: [{ id: "n0" }, { id: "n1" }],
            synapses: [{ inputIndex: 0, targetNeuron: 0, weightReal: 1 }],
            outputNeurons: [1],
        };
        const collective = {
            modeCount: 1,
            alphaReal: [[1], [0]],
            gammaReal: [[0], [1]],
        };
        expect(createOscillatoryVariantConfig("A", base).neurons.every((neuron) => neuron.dynamics === "lif")).toBe(true);
        expect(createOscillatoryVariantConfig("B", base).neurons.every((neuron) => neuron.dynamics === "complex")).toBe(true);
        expect(createOscillatoryVariantConfig("C", base, collective).collective?.source).toBe("spikes");
        expect(createOscillatoryVariantConfig("D", base, collective).collective?.source).toBe("states");
    });

    test("feeds a learned real collective mode back one timestep later", () => {
        const config = createOscillatoryVariantConfig(
            "C",
            {
                inputSize: 1,
                timeStepSeconds: 0.01,
                neurons: [
                    { id: "source", threshold: 0.5, membraneTimeConstant: 1 },
                    { id: "receiver", threshold: 0.5, membraneTimeConstant: 1 },
                ],
                synapses: [{ inputIndex: 0, targetNeuron: 0, weightReal: 1 }],
                outputNeurons: [1],
            },
            {
                modeCount: 1,
                alphaReal: [[1], [0]],
                gammaReal: [[0], [1]],
            }
        );
        const model = new OscillatorySnnModel(config);
        const state = model.createState();
        const first = model.step(state, [1], 0);
        const second = model.step(state, [0], 0.01);
        expect(first.spikes).toEqual([1, 0]);
        expect(first.collectiveReal).toEqual([1]);
        expect(second.spikes[1]).toBe(1);
    });

    test("uses squared magnitude for complex spikes and complex field feedback", () => {
        const thresholdModel = new OscillatorySnnModel({
            variant: "B",
            inputSize: 1,
            timeStepSeconds: 0.01,
            neurons: [{ id: "complex", threshold: 1 }],
            synapses: [{ inputIndex: 0, targetNeuron: 0, weightReal: 0.6, weightImaginary: 0.8 }],
            outputNeurons: [0],
        });
        const thresholdState = thresholdModel.createState();
        expect(thresholdModel.step(thresholdState, [1], 0).spikes[0]).toBe(1);

        const fieldModel = new OscillatorySnnModel(
            createOscillatoryVariantConfig(
                "D",
                {
                    inputSize: 1,
                    timeStepSeconds: 0.01,
                    neurons: [
                        { id: "source", initialImaginary: 1, threshold: 2, membraneTimeConstant: 1e9 },
                        { id: "receiver", threshold: 2, membraneTimeConstant: 1e9 },
                    ],
                    synapses: [],
                    outputNeurons: [1],
                },
                {
                    modeCount: 1,
                    alphaReal: [[1], [0]],
                    gammaReal: [[0], [1]],
                }
            )
        );
        const fieldState = fieldModel.createState();
        const first = fieldModel.step(fieldState, [0], 0);
        const second = fieldModel.step(fieldState, [0], 0.01);
        expect(first.collectiveImaginary[0]).toBeCloseTo(1, 8);
        expect(second.neurons[1].inputImaginary).toBeCloseTo(1, 8);
    });

    test("backpropagates into trainable alpha and gamma coefficients while forward spikes stay binary", () => {
        const config = createOscillatoryVariantConfig(
            "C",
            {
                inputSize: 1,
                timeStepSeconds: 0.01,
                neurons: [
                    { id: "source", layer: "hidden", threshold: 0.5, membraneTimeConstant: 1, surrogateSlope: 1 },
                    { id: "class-0", layer: "output", threshold: 0.5, membraneTimeConstant: 1, surrogateSlope: 1 },
                    { id: "class-1", layer: "output", threshold: 0.5, membraneTimeConstant: 1, surrogateSlope: 1 },
                ],
                synapses: [{ inputIndex: 0, targetNeuron: 0, weightReal: 1 }],
                outputNeurons: [1, 2],
            },
            {
                modeCount: 1,
                alphaReal: [[1], [0], [0]],
                gammaReal: [[0], [0.4], [0]],
                trainable: true,
            }
        );
        const trainer = new OscillatorySnnBpttTrainer(new OscillatorySnnModel(config), { optimizer: "sgd", learningRate: 0.1 });
        const sequence = { inputs: [[1], [0]], targetOutput: 0 };
        const result = trainer.gradients(sequence);
        expect(result.steps.flatMap((step) => step.spikes).every((spike) => spike === 0 || spike === 1)).toBe(true);
        expect(Math.abs(result.gradients.alpha[0][0].real)).toBeGreaterThan(0);
        expect(Math.abs(result.gradients.gamma[1][0].real)).toBeGreaterThan(0);
    });

    test("learns a hard-forward two-class decision", () => {
        const trainer = new OscillatorySnnBpttTrainer(
            new OscillatorySnnModel({
                variant: "A",
                inputSize: 1,
                timeStepSeconds: 0.01,
                neurons: [
                    { id: "class-0", threshold: 0.5, surrogateSlope: 1 },
                    { id: "class-1", threshold: 0.5, surrogateSlope: 1 },
                ],
                synapses: [
                    { inputIndex: 0, targetNeuron: 0, weightReal: 0.4 },
                    { inputIndex: 0, targetNeuron: 1, weightReal: 0.4 },
                ],
                outputNeurons: [0, 1],
            }),
            { optimizer: "sgd", learningRate: 0.05 }
        );
        const sequence = { inputs: [[1]], targetOutput: 0 };
        const initialLoss = trainer.forward(sequence).loss;
        for (let iteration = 0; iteration < 10; iteration++) trainer.trainStep(sequence);
        const trained = trainer.forward(sequence);
        expect(trained.loss).toBeLessThan(initialLoss);
        expect(trained.steps[0].spikes.every((spike) => spike === 0 || spike === 1)).toBe(true);
    });

    test("updates deterministic mini-batches instead of one full-dataset step per epoch", () => {
        const createTrainer = () =>
            new OscillatorySnnBpttTrainer(
                new OscillatorySnnModel({
                    variant: "A",
                    inputSize: 1,
                    timeStepSeconds: 0.01,
                    neurons: [
                        { id: "class-0", threshold: 0.5, surrogateSlope: 1 },
                        { id: "class-1", threshold: 0.5, surrogateSlope: 1 },
                    ],
                    synapses: [
                        { inputIndex: 0, targetNeuron: 0, weightReal: 0.4 },
                        { inputIndex: 0, targetNeuron: 1, weightReal: 0.4 },
                    ],
                    outputNeurons: [0, 1],
                }),
                { optimizer: "adam", learningRate: 0.01 }
            );
        const training = [
            { inputs: [[1]], targetOutput: 0 },
            { inputs: [[0.8]], targetOutput: 0 },
            { inputs: [[-1]], targetOutput: 1 },
        ];
        const progress: Array<{ batch?: number; totalBatches?: number }> = [];
        const left = createTrainer();
        const right = createTrainer();
        left.fit(training, training, { epochs: 2, batchSize: 1, shuffleSeed: 17, onProgress: (event) => progress.push(event) });
        right.fit(training, training, { epochs: 2, batchSize: 1, shuffleSeed: 17 });
        expect(progress).toEqual(expect.arrayContaining([expect.objectContaining({ batch: 3, totalBatches: 3 })]));
        expect(left.model.config.synapses.map((synapse) => synapse.weightReal)).toEqual(right.model.config.synapses.map((synapse) => synapse.weightReal));
    });

    test("discovers collective spectral peaks only in post-processing", () => {
        const sampleRateHz = 64;
        const frequencyHz = 4;
        const steps = new Array(128).fill(null).map((_, timestep) => ({
            timestamp: timestep / sampleRateHz,
            neurons: [],
            spikes: [],
            outputs: [],
            collectiveReal: [Math.sin((2 * Math.PI * frequencyHz * timestep) / sampleRateHz)],
            collectiveImaginary: [0],
            scores: [],
        }));
        const trace: IOscillatoryForwardTrace = {
            steps,
            finalState: { neurons: [], collectiveReal: [0], collectiveImaginary: [0], spikeHistory: [], tickIndex: steps.length },
            scores: [],
            probabilities: [],
            predictedOutput: 0,
            loss: 0,
        };
        const spectrum = analyzeCollectiveSpectrum([trace], sampleRateHz);
        expect(spectrum[0].dominantFrequencyHz).toBeCloseTo(frequencyHz, 12);
    });

    test("keeps collective runtime cost factorized in neuron count times mode count", () => {
        const neuronCount = 8;
        const modeCount = 2;
        const config = createOscillatoryVariantConfig(
            "D",
            {
                inputSize: 1,
                timeStepSeconds: 0.01,
                neurons: new Array(neuronCount).fill(null).map((_, neuron) => ({ id: `n${neuron}` })),
                synapses: new Array(neuronCount).fill(null).map((_, targetNeuron) => ({ inputIndex: 0, targetNeuron, weightReal: 0.1 })),
                outputNeurons: [neuronCount - 1],
            },
            {
                modeCount,
                alphaReal: new Array(neuronCount).fill(null).map(() => new Array(modeCount).fill(0.1)),
                gammaReal: new Array(neuronCount).fill(null).map(() => new Array(modeCount).fill(0.1)),
            }
        );
        const cost = profileOscillatoryCost(new OscillatorySnnModel(config));
        expect(cost.asymptoticCollectiveCost).toBe("O(NK)");
        expect(cost.parameterCount).toBeLessThan(neuronCount * neuronCount * 4);
    });

    test("bounds delayed spike history and round-trips experimental node configuration", () => {
        const config: IOscillatorySnnConfig = {
            variant: "A",
            inputSize: 1,
            timeStepSeconds: 0.01,
            neurons: [{ id: "n0" }, { id: "n1" }],
            synapses: [
                { inputIndex: 0, targetNeuron: 0, weightReal: 1 },
                { sourceNeuron: 0, targetNeuron: 1, delayTicks: 2, weightReal: 0.25 },
            ],
            outputNeurons: [1],
        };
        const model = new OscillatorySnnModel(config);
        const state = model.createState();
        for (let timestep = 0; timestep < 20; timestep++) model.step(state, [timestep === 0 ? 1 : 0]);
        expect(state.spikeHistory).toHaveLength(2);

        const nodes = new NodeRegistry();
        const links = new LinkRegistry();
        registerSessionSnnTypes(nodes, links);
        const original = new OscillatorySnnNode(config);
        original.id = "round-trip";
        const restored = nodes.create(OSCILLATORY_SNN_TYPE_ID, original.serialize()) as OscillatorySnnNode;
        expect(restored.modelConfig.variant).toBe("A");
        expect(restored.modelConfig.synapses[1]).toMatchObject({ sourceNeuron: 0, targetNeuron: 1, delayTicks: 2, weightReal: 0.25 });
        expect(nodes.create(TEMPORAL_DELTA_SENSOR_TYPE_ID)).toBeDefined();
    });

    test("runs A to D against the exact same split objects", () => {
        const split = [{ inputs: [[1], [0]], targetOutput: 0 }];
        const progressPhases: string[] = [];
        const createModel = (variant: "A" | "B" | "C" | "D") => {
            const base = {
                inputSize: 1,
                timeStepSeconds: 0.01,
                neurons: [
                    { id: "class-0", threshold: 0.5 },
                    { id: "class-1", threshold: 0.5 },
                ],
                synapses: [
                    { inputIndex: 0, targetNeuron: 0, weightReal: 0.6 },
                    { inputIndex: 0, targetNeuron: 1, weightReal: 0.4 },
                ],
                outputNeurons: [0, 1],
            };
            const collective = {
                modeCount: 1,
                alphaReal: [[0.1], [0.1]],
                gammaReal: [[0.1], [0.1]],
            };
            return new OscillatorySnnModel(createOscillatoryVariantConfig(variant, base, variant === "C" || variant === "D" ? collective : undefined));
        };
        const results = runOscillatoryAblation({
            createModel,
            training: split,
            validation: split,
            test: split,
            epochs: 1,
            retainTraces: false,
            onProgress: ({ phase }) => progressPhases.push(phase),
        });
        expect(results.map((result) => result.variant)).toEqual(["A", "B", "C", "D"]);
        expect(results.every((result) => result.train.hardAccuracy === result.train.surrogateAccuracy)).toBe(true);
        expect(progressPhases).toEqual(
            expect.arrayContaining(["variant-start", "initial-validation", "training", "validation", "epoch-complete", "profiling", "variant-complete"])
        );
        expect(results.every((result) => result.train.traces.length === 0 && result.validation.traces.length === 0 && result.test.traces.length === 0)).toBe(true);
    });
});

describe("frequency-free temporal input encoder", () => {
    test("converts signed temporal changes to events without a frequency parameter", () => {
        const encoder = new TemporalDeltaSpikeEncoder({ channels: [{ id: "ia", channel: 0, threshold: 0.1 }] });
        const state = encoder.createState();
        expect(encoder.encode({ timestamp: 0, values: [0] }, state)).toEqual([]);
        const positive = encoder.encode({ timestamp: 0.01, values: [0.25] }, state);
        const negative = encoder.encode({ timestamp: 0.02, values: [-0.05] }, state);
        expect(positive[0]).toMatchObject({ polarity: "positive", eventCount: 2, amplitude: 2 });
        expect(negative[0]).toMatchObject({ polarity: "negative", eventCount: 2, amplitude: 2 });
        expect("frequency" in encoder.config.channels[0]).toBe(false);
    });

    test("connects sampled observations directly to an oscillatory RuntimeGraph", () => {
        const source = new WaveObservationSource();
        const sensor = new TemporalDeltaSpikeSensorNode({ channels: [{ id: "ia", channel: 0, threshold: 0.1 }] });
        const network = new OscillatorySnnNode({
            variant: "A",
            inputSize: 2,
            timeStepSeconds: 0.01,
            neurons: [{ id: "output", threshold: 1 }],
            synapses: [
                { inputIndex: 0, targetNeuron: 0, weightReal: 1 },
                { inputIndex: 1, targetNeuron: 0, weightReal: -1 },
            ],
            outputNeurons: [0],
        });
        const observation = new Channel(source, sensor, WAVE_OBSERVATION_INPUT_SLOT, false, undefined, true, WAVE_OBSERVATION_INPUT_SLOT);
        const temporalVector = new Channel(sensor, network, TEMPORAL_DELTA_VECTOR_SLOT, false, undefined, true, OSCILLATORY_SNN_INPUT_SLOT);
        const graph = new RuntimeGraphBuilder().withMode("dynamic").withNodes(source, sensor, network).withLinks(observation, temporalVector).build();
        const session = new Session(graph);
        session.run(0);
        source.value = { timestamp: 0.01, values: [0.2] };
        session.run(0.01);
        expect(network.stateOf(session)!.lastStep!.spikes).toEqual([1]);
    });
});
