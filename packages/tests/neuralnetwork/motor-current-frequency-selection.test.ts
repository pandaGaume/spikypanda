import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

interface FrequencyBandSelection {
    bin: number;
    frequencyHz: number;
    multiclassScore: number;
    targetedScore: number | null;
    selectionScore: number;
    selectionObjective: string;
}

interface MotorCurrentSnnAdapter {
    FREQUENCY_SELECTION_MULTICLASS: string;
    FREQUENCY_SELECTION_TARGETED_PAIR: string;
    selectFrequencyBands(samples: Array<{ label: number; sequence: number[][] }>, sampleRateHz: number, options: Record<string, unknown>): FrequencyBandSelection[];
    trainReceptiveFields(
        samples: Array<{ label: number; sequence: number[][] }>,
        sampleRateHz: number,
        selectedBands: FrequencyBandSelection[],
        options: Record<string, unknown>
    ): {
        version: string;
        objective: string;
        trainingSampleCount: number;
        validationSamplesUsed: number;
        testSamplesUsed: number;
        fields: Array<{
            initialCenterFrequencyHz: number;
            initialBandwidthHz: number;
            centerFrequencyHz: number;
            bandwidthHz: number;
            initialFisherScore: number;
            trainedFisherScore: number;
            centerMinimumHz: number;
            centerMaximumHz: number;
        }>;
    };
    trainSpikeAlignedReceptiveFields(
        samples: Array<{ label: number; sequence: number[][] }>,
        sampleRateHz: number,
        selectedBands: FrequencyBandSelection[],
        options: Record<string, unknown>
    ): {
        version: string;
        objective: string;
        trainingSampleCount: number;
        validationSamplesUsed: number;
        testSamplesUsed: number;
        traceTauSamples: number[];
        redundancyWeight: number;
        fields: Array<{
            initialCenterFrequencyHz: number;
            initialBandwidthHz: number;
            centerFrequencyHz: number;
            bandwidthHz: number;
            initialObjectiveScore: number;
            trainedObjectiveScore: number;
            trainedSoftFisherScore: number;
            trainedHardFisherScore: number;
            trainedRedundancy: number;
            trainedHardEventsPerSample: number;
            thresholdsByChannel: number[][];
            centerMinimumHz: number;
            centerMaximumHz: number;
        }>;
    };
    encodeSequence(
        sequence: number[][],
        label: number,
        outputSize: number,
        options: {
            sensorConfig: { sampleRateHz: number };
            inputIndexBySlot: Map<string, number>;
            pairAuxiliaryLoss?: { version: string; labels: number[]; mixtureWeight: number };
            runtimeDecoderObjective?: {
                version: string;
                spikeCountScale: number;
                membranePotentialScale: number;
                temperature: number;
                classificationLossWeight: number;
                temporalLossWeight: number;
            };
        }
    ): {
        label: number;
        lossWeights: number[][];
        pairAuxiliaryActive: boolean;
        runtimeDecoderObjective?: {
            targetOutput: number;
            spikeCountScale: number;
            membranePotentialScale: number;
            temperature: number;
            classificationLossWeight: number;
            temporalLossWeight: number;
        };
    };
    trainScopedPairBatch(
        model: Record<string, unknown>,
        encodedBatch: Array<{ label: number; inputs: number[][]; timestamps: number[] }>
    ): { loss: number | null; samples: number };
}

function loadAdapter(): MotorCurrentSnnAdapter {
    const source = readFileSync(join(process.cwd(), "packages/host/www/samples/motor_current/motor_current_snn.js"), "utf8");
    const browserRoot: {
        SpikypandaCore: Record<string, unknown>;
        MotorCurrentSnn?: MotorCurrentSnnAdapter;
    } = {
        SpikypandaCore: {
            RuntimeNode: class {},
            WaveSpikeEncoder: class {
                public constructor(_config: unknown) {}

                public createState(): Record<string, never> {
                    return {};
                }

                public encode(): Array<{ slot: string; bandId: string; amplitude: number }> {
                    return [{ slot: "wave", bandId: "test-band", amplitude: 1 }];
                }
            },
            WAVE_FRAME_END_OUTPUT_SLOT: "frame-end",
            WAVE_OBSERVATION_INPUT_SLOT: "observation",
        },
    };
    runInNewContext(source, { window: browserRoot, console });
    if (!browserRoot.MotorCurrentSnn) throw new Error("MotorCurrentSnn adapter did not load.");
    return browserRoot.MotorCurrentSnn;
}

function syntheticFrequencySamples(): Array<{ label: number; sequence: number[][] }> {
    const sampleRateHz = 64;
    const sampleCount = 64;
    const globalAmplitudes = [
        [0.2, 0.2, 1.0, 1.5, 2.0],
        [0.3, 0.3, 0.3, 1.5, 2.0],
        [0.4, 0.4, 0.4, 0.4, 2.0],
    ];
    const samples: Array<{ label: number; sequence: number[][] }> = [];

    for (let label = 0; label < 5; label++) {
        for (let variant = 0; variant < 8; variant++) {
            const globalVariation = (variant - 3.5) * 0.002;
            const targetedVariation = (variant - 3.5) * 0.02;
            const targetedAmplitude = (label === 0 ? 0.5 : label === 1 ? 0.8 : 0.65) + targetedVariation;
            const sequence: number[][] = [];
            for (let timestep = 0; timestep < sampleCount; timestep++) {
                const value =
                    (globalAmplitudes[0][label] + globalVariation) * Math.sin((2 * Math.PI * 2 * timestep) / sampleRateHz) +
                    targetedAmplitude * Math.sin((2 * Math.PI * 3 * timestep) / sampleRateHz) +
                    (globalAmplitudes[1][label] + globalVariation) * Math.sin((2 * Math.PI * 4 * timestep) / sampleRateHz) +
                    (globalAmplitudes[2][label] + globalVariation) * Math.sin((2 * Math.PI * 6 * timestep) / sampleRateHz);
                sequence.push([value, value * 0.9, value * 1.1]);
            }
            samples.push({ label, sequence });
        }
    }
    return samples;
}

describe("motor-current frequency selection", () => {
    test("reserves exactly one band for a targeted class pair", () => {
        const adapter = loadAdapter();
        const samples = syntheticFrequencySamples();
        const commonOptions = { signalDomain: "envelope", count: 3, minFrequencyHz: 1.5, maxFrequencyHz: 8 };

        const baseline = adapter.selectFrequencyBands(samples, 64, {
            ...commonOptions,
            strategy: adapter.FREQUENCY_SELECTION_MULTICLASS,
        });
        const targeted = adapter.selectFrequencyBands(samples, 64, {
            ...commonOptions,
            strategy: adapter.FREQUENCY_SELECTION_TARGETED_PAIR,
            targetLabels: [0, 1],
            targetedCount: 1,
        });
        const additive = adapter.selectFrequencyBands(samples, 64, {
            ...commonOptions,
            count: 4,
            strategy: adapter.FREQUENCY_SELECTION_TARGETED_PAIR,
            targetLabels: [0, 1],
            targetedCount: 1,
        });

        expect(baseline.map((band) => band.bin)).toEqual([2, 4, 6]);
        expect(targeted.map((band) => band.bin)).toEqual([2, 3, 4]);
        expect(additive.map((band) => band.bin)).toEqual([2, 3, 4, 6]);
        expect(targeted.filter((band) => band.selectionObjective === "pair-0-1")).toHaveLength(1);
        expect(additive.filter((band) => band.selectionObjective === "pair-0-1")).toHaveLength(1);
        expect(targeted.find((band) => band.bin === 3)?.selectionScore).toBe(targeted.find((band) => band.bin === 3)?.targetedScore);
    });

    test("rejects a targeted strategy without exactly two labels", () => {
        const adapter = loadAdapter();
        expect(() =>
            adapter.selectFrequencyBands(syntheticFrequencySamples(), 64, {
                signalDomain: "envelope",
                strategy: adapter.FREQUENCY_SELECTION_TARGETED_PAIR,
                targetLabels: [0],
            })
        ).toThrow("exactly two class labels");
    });

    test("trains bounded continuous receptive fields from training samples only", () => {
        const adapter = loadAdapter();
        const samples = syntheticFrequencySamples();
        const initial = adapter.selectFrequencyBands(samples, 64, {
            signalDomain: "envelope",
            count: 3,
            minFrequencyHz: 1.5,
            maxFrequencyHz: 8,
            strategy: adapter.FREQUENCY_SELECTION_MULTICLASS,
        });
        const trained = adapter.trainReceptiveFields(samples, 64, initial, {
            signalDomain: "envelope",
            minFrequencyHz: 1.5,
            maxFrequencyHz: 8,
            rounds: 2,
        });

        expect(trained.version).toBe("supervised-soft-biquad-fisher-grid-v1");
        expect(trained.objective).toBe("multiclass-fisher-of-causal-biquad-rms-v1");
        expect(trained.trainingSampleCount).toBe(samples.length);
        expect(trained.validationSamplesUsed).toBe(0);
        expect(trained.testSamplesUsed).toBe(0);
        expect(trained.fields).toHaveLength(3);
        for (const field of trained.fields) {
            expect(field.centerFrequencyHz).toBeGreaterThanOrEqual(field.centerMinimumHz);
            expect(field.centerFrequencyHz).toBeLessThanOrEqual(field.centerMaximumHz);
            expect(field.bandwidthHz).toBeGreaterThan(0);
            expect(field.trainedFisherScore).toBeGreaterThanOrEqual(field.initialFisherScore);
        }
    });

    test("trains receptive fields against phase and threshold spike traces", () => {
        const adapter = loadAdapter();
        const samples = syntheticFrequencySamples();
        const initial = adapter.selectFrequencyBands(samples, 64, {
            signalDomain: "envelope",
            count: 3,
            minFrequencyHz: 1.5,
            maxFrequencyHz: 8,
            strategy: adapter.FREQUENCY_SELECTION_MULTICLASS,
        });
        const trained = adapter.trainSpikeAlignedReceptiveFields(samples, 64, initial, {
            signalDomain: "envelope",
            minFrequencyHz: 1.5,
            maxFrequencyHz: 8,
            rounds: 2,
        });

        expect(trained.version).toBe("supervised-soft-phase-spike-fisher-grid-v1");
        expect(trained.objective).toBe("multiclass-fisher-of-soft-phase-threshold-traces-v1");
        expect(trained.trainingSampleCount).toBe(samples.length);
        expect(trained.validationSamplesUsed).toBe(0);
        expect(trained.testSamplesUsed).toBe(0);
        expect(trained.traceTauSamples).toEqual([4, 8, 16, 32]);
        expect(trained.redundancyWeight).toBeGreaterThan(0);
        expect(trained.fields).toHaveLength(3);
        for (const field of trained.fields) {
            expect(field.centerFrequencyHz).toBeGreaterThanOrEqual(field.centerMinimumHz);
            expect(field.centerFrequencyHz).toBeLessThanOrEqual(field.centerMaximumHz);
            expect(field.bandwidthHz).toBeGreaterThan(0);
            expect(field.trainedObjectiveScore).toBeGreaterThanOrEqual(field.initialObjectiveScore);
            expect(field.trainedSoftFisherScore).toBeGreaterThanOrEqual(0);
            expect(field.trainedHardFisherScore).toBeGreaterThanOrEqual(0);
            expect(field.trainedRedundancy).toBeGreaterThanOrEqual(0);
            expect(field.trainedRedundancy).toBeLessThanOrEqual(1);
            expect(field.trainedHardEventsPerSample).toBeGreaterThan(0);
            expect(field.thresholdsByChannel).toHaveLength(3);
            expect(field.thresholdsByChannel.every((thresholds) => thresholds.length === 3)).toBe(true);
        }
    });

    test("mixes a final-frame pair objective without changing non-pair samples", () => {
        const adapter = loadAdapter();
        const common = {
            sensorConfig: { sampleRateHz: 120 },
            inputIndexBySlot: new Map([
                ["wave", 0],
                ["frame-end", 1],
            ]),
            pairAuxiliaryLoss: {
                version: "final-frame-pair-mse-v1",
                labels: [0, 1],
                mixtureWeight: 0.25,
            },
        };

        const pair = adapter.encodeSequence([[0.5, 0.5, 0.5]], 0, 5, common);
        const nonPair = adapter.encodeSequence([[0.5, 0.5, 0.5]], 2, 5, common);

        expect(pair.pairAuxiliaryActive).toBe(true);
        expect(pair.lossWeights[0]).toEqual([0.05, 0.05, 0.05, 0.05, 0.05]);
        expect(pair.lossWeights[1]).toEqual([1.65625, 1.65625, 1, 1, 1]);
        expect(nonPair.pairAuxiliaryActive).toBe(false);
        expect(nonPair.lossWeights[1]).toEqual([1, 1, 1, 1, 1]);
    });

    test("attaches the exact runtime decoder objective to every encoded sample", () => {
        const adapter = loadAdapter();
        const encoded = adapter.encodeSequence([[0.5, 0.5, 0.5]], 3, 5, {
            sensorConfig: { sampleRateHz: 120 },
            inputIndexBySlot: new Map([
                ["wave", 0],
                ["frame-end", 1],
            ]),
            runtimeDecoderObjective: {
                version: "runtime-decoder-cross-entropy-v1",
                spikeCountScale: 2,
                membranePotentialScale: 1,
                temperature: 2,
                classificationLossWeight: 1,
                temporalLossWeight: 0.25,
            },
        });

        expect(encoded.runtimeDecoderObjective).toEqual({
            targetOutput: 3,
            spikeCountScale: 2,
            membranePotentialScale: 1,
            temperature: 2,
            classificationLossWeight: 1,
            temporalLossWeight: 0.25,
        });
    });

    test("projects the auxiliary pass onto specialist inputs and pair samples only", () => {
        const adapter = loadAdapter();
        let captured: Array<{ inputs: number[][]; targets: number[][]; lossWeights: number[][]; timestamps: number[] }> = [];
        const result = adapter.trainScopedPairBatch(
            {
                scopedPairTraining: {
                    config: { labels: [0, 1] },
                    originalInputIndices: [1, 3],
                    trainer: {
                        trainBatch(sequences: typeof captured): number {
                            captured = sequences;
                            return 0.125;
                        },
                    },
                },
            },
            [
                {
                    label: 0,
                    inputs: [
                        [10, 11, 12, 13],
                        [20, 21, 22, 23],
                    ],
                    timestamps: [0, 1],
                },
                {
                    label: 2,
                    inputs: [
                        [30, 31, 32, 33],
                        [40, 41, 42, 43],
                    ],
                    timestamps: [0, 1],
                },
            ]
        );

        expect(result).toEqual({ loss: 0.125, samples: 1 });
        expect(captured).toHaveLength(1);
        expect(captured[0].inputs).toEqual([
            [11, 13, 0],
            [21, 23, 1],
        ]);
        expect(captured[0].targets).toEqual([
            [0, 0],
            [1, 0],
        ]);
        expect(captured[0].lossWeights).toEqual([
            [0, 0],
            [1, 1],
        ]);
    });
});
