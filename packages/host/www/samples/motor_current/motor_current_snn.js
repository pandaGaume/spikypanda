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
    const EARLY_LOSS_WEIGHT = 0.05;
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
        const frequenciesHz = (options.frequenciesHz || defaultFrequencies(options.signalDomain, options.lineFrequencyHz)).filter(function (frequency) {
            return Number.isFinite(frequency) && frequency > 0 && frequency < sampleRateHz / 2;
        });
        if (frequenciesHz.length === 0) throw new Error("The wave sensor has no frequency below Nyquist.");

        const bands = [];
        for (let channel = 0; channel < channelCount; channel++) {
            for (let frequencyIndex = 0; frequencyIndex < frequenciesHz.length; frequencyIndex++) {
                const centerFrequencyHz = frequenciesHz[frequencyIndex];
                bands.push({
                    id: "i" + channel + "-f" + formatBandId(centerFrequencyHz),
                    channel: channel,
                    centerFrequencyHz: centerFrequencyHz,
                    bandwidthHz: bandwidthOf(centerFrequencyHz, options.signalDomain),
                    threshold: 0,
                    polarity: "both",
                    amplitudeMode: "binary",
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

    function calibrateSensor(samples, sensorConfig, percentile) {
        const q = clamp(percentile === undefined ? DEFAULT_PERCENTILE : percentile, 0.5, 0.99);
        const calibrationConfig = copySensorConfig(sensorConfig);
        for (let band = 0; band < calibrationConfig.bands.length; band++) calibrationConfig.bands[band].threshold = 0;
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
            const index = Math.min(values.length - 1, Math.max(0, Math.floor((values.length - 1) * q)));
            calibrated.bands[band].threshold = values.length === 0 ? 1e-4 : Math.max(1e-6, values[index]);
        }
        return calibrated;
    }

    function encodeSequence(sequence, label, outputSize, options) {
        const sensorConfig = options.sensorConfig;
        const inputIndexBySlot = options.inputIndexBySlot;
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
            if (emissions.length === 0) continue;
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
        inputs.push(frameEnd);
        targets.push(finalTarget);
        lossWeights.push(new Array(outputSize).fill(1));
        timestamps.push(sequence.length / sensorConfig.sampleRateHz);

        return {
            inputs: inputs,
            targets: targets,
            lossWeights: lossWeights,
            timestamps: timestamps,
            sensorEvents: sensorEvents,
            eventsByBand: eventsByBand,
            denseTimesteps: sequence.length,
        };
    }

    function buildModel(options) {
        const hiddenSize = Math.max(1, Math.floor(options.hiddenSize));
        const outputSize = Math.max(1, Math.floor(options.outputSize));
        const sensorConfig = copySensorConfig(options.sensorConfig);
        const dt = 1 / sensorConfig.sampleRateHz;
        const windowSize = Math.max(1, Math.floor(options.windowSize || 64));
        const duration = windowSize * dt;
        const seed = Number.isInteger(options.seed) ? options.seed : 0x534e4e31;
        const random = mulberry32(seed);
        const observationSource = new MotorCurrentObservationSource();
        const sensor = new S.WaveSpikeSensorNode(sensorConfig);
        const sensorPorts = sensor.encoder.outputPorts;
        const inputSlots = sensorPorts.map(function (port) {
            return port.slot;
        });
        inputSlots.push(FRAME_END_SLOT);
        const inputIndexBySlot = new Map();
        inputSlots.forEach(function (slot, index) {
            inputIndexBySlot.set(slot, index);
        });

        const tauBank = [2 * dt, 4 * dt, 8 * dt, 16 * dt];
        const hidden = [];
        for (let neuron = 0; neuron < hiddenSize; neuron++) {
            const bankIndex = Math.min(tauBank.length - 1, Math.floor((neuron * tauBank.length) / hiddenSize));
            hidden.push(
                new S.ConstrainedLifSurrogateSubgraph("snn:hidden-" + neuron, {
                    threshold: 0.8,
                    resetPotential: 0,
                    membraneTimeConstant: tauBank[bankIndex],
                    surrogateSlope: 5,
                    mode: "soft",
                })
            );
        }

        const outputs = [];
        for (let output = 0; output < outputSize; output++) {
            outputs.push(
                new S.ConstrainedLifSurrogateSubgraph("snn:class-" + output, {
                    threshold: 0.8,
                    resetPotential: 0,
                    membraneTimeConstant: Math.max(duration, dt),
                    surrogateSlope: 5,
                    mode: "soft",
                })
            );
        }

        const observationLink = new S.Channel(observationSource, sensor, OBSERVATION_SLOT, false, undefined, true, OBSERVATION_SLOT);
        const inputBindings = [];
        const sensorSynapses = [];
        const hiddenInputScale = 0.5;
        for (let portIndex = 0; portIndex < sensorPorts.length; portIndex++) {
            const port = sensorPorts[portIndex];
            for (let neuron = 0; neuron < hiddenSize; neuron++) {
                const synapse = new S.SpikeSynapse(sensor, hidden[neuron].inputNode, port.slot, "spike", symmetric(random, hiddenInputScale));
                sensorSynapses.push(synapse);
                inputBindings.push({ inputIndex: inputIndexBySlot.get(port.slot), synapse: synapse });
            }
        }

        const connections = [];
        const outputScale = 0.6 / Math.sqrt(hiddenSize);
        for (let neuron = 0; neuron < hiddenSize; neuron++) {
            for (let output = 0; output < outputSize; output++) {
                connections.push(new S.SpikeSynapse(hidden[neuron].outputNode, outputs[output].inputNode, "spike", "spike", symmetric(random, outputScale)));
            }
        }

        const frameSynapses = [];
        for (let output = 0; output < outputSize; output++) {
            const synapse = new S.SpikeSynapse(sensor, outputs[output].inputNode, FRAME_END_SLOT, "spike", 0.1 + symmetric(random, 0.02));
            frameSynapses.push(synapse);
            inputBindings.push({ inputIndex: inputIndexBySlot.get(FRAME_END_SLOT), synapse: synapse });
        }

        const teachers = hidden.concat(outputs);
        const nodes = [observationSource, sensor];
        const links = [observationLink].concat(sensorSynapses, frameSynapses, connections);
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

        return {
            graph: runtimeGraph,
            trainer: trainer,
            network: trainingNetwork,
            observationSource: observationSource,
            sensor: sensor,
            sensorConfig: sensorConfig,
            sensorPorts: sensorPorts,
            inputSlots: inputSlots,
            inputIndexBySlot: inputIndexBySlot,
            hidden: hidden,
            outputs: outputs,
            teachers: teachers,
            hiddenSize: hiddenSize,
            outputSize: outputSize,
            inputSize: inputSlots.length,
            dt: dt,
            windowSize: windowSize,
            seed: seed,
            tauBank: tauBank,
            trainableWeightCount: trainer.synapses.length,
            compiled: false,
        };
    }

    function predictTeacher(model, sequence, mode) {
        const encoded = encodeSequence(sequence, null, model.outputSize, {
            sensorConfig: model.sensorConfig,
            inputIndexBySlot: model.inputIndexBySlot,
        });
        const trace = model.trainer.forward(encoded, mode || "hard");
        const scores = trace.steps[trace.steps.length - 1].outputs.slice();
        return {
            predicted: argmax(scores),
            scores: scores,
            sensorEvents: encoded.sensorEvents,
            eventsByBand: encoded.eventsByBand,
            eventTimesteps: encoded.inputs.length,
        };
    }

    function compileModel(model) {
        if (model.compiled) throw new Error("This motor-current SNN model has already been compiled.");
        for (let teacher = 0; teacher < model.teachers.length; teacher++) model.teachers[teacher].configure({ mode: "hard" });
        const compilation = S.compileConstrainedLifNetwork(model.graph, model.teachers);
        model.compiled = true;
        model.compilation = compilation;
        model.nativeHidden = compilation.neurons.slice(0, model.hiddenSize);
        model.nativeOutputs = compilation.neurons.slice(model.hiddenSize);
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
                return Object.assign({}, band);
            }),
            emitFrameEnd: config.emitFrameEnd !== false,
            diagnostics: config.diagnostics !== false,
        };
    }

    function formatBandId(value) {
        return String(value).replace(".", "p");
    }

    function argmax(values) {
        let best = 0;
        for (let index = 1; index < values.length; index++) {
            if (values[index] > values[best]) best = index;
        }
        return best;
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
        FRAME_END_SLOT: FRAME_END_SLOT,
        createSensorConfig: createSensorConfig,
        calibrateSensor: calibrateSensor,
        encodeSequence: encodeSequence,
        buildModel: buildModel,
        predictTeacher: predictTeacher,
        compileModel: compileModel,
        predictCompiled: predictCompiled,
    };
})(window);
