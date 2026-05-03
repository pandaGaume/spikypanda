import {
    ConstantSource,
    DatasetWriter,
    DEFAULT_MOTOR,
    LabeledRecorder,
    MotorFaultType,
    IScenario,
    Sensor,
    buildMotorScenario,
    defaultMotorScenarios,
    makeMotorFault,
} from "spikypanda-sensors";

describe("LabeledRecorder", () => {
    const scenarios: ReadonlyArray<IScenario> = [
        buildMotorScenario({ motor: DEFAULT_MOTOR, label: "healthy" }),
        buildMotorScenario({
            motor: DEFAULT_MOTOR,
            label: "broken_bar_2bars",
            faults: [makeMotorFault({
                type: MotorFaultType.BROKEN_BAR,
                severity: 0.7,
                totalBars: DEFAULT_MOTOR.commutatorBars,
                brokenIndices: [0, 1],
            })],
        }),
    ];

    it("starts on the first scenario", () => {
        const r = new LabeledRecorder(scenarios, { sensorInfo: { sampleRateHz: 1000 } });
        expect(r.currentLabel()).toBe("healthy");
    });

    it("setScenarioByLabel switches the active source", () => {
        const r = new LabeledRecorder(scenarios, { sensorInfo: { sampleRateHz: 1000 } });
        r.setScenarioByLabel("broken_bar_2bars");
        expect(r.currentLabel()).toBe("broken_bar_2bars");
        expect(() => r.setScenarioByLabel("nonexistent")).toThrow();
    });

    it("randomizeScenario covers every scenario across many trials with same seed", () => {
        const r = new LabeledRecorder(scenarios, { sensorInfo: { sampleRateHz: 1000 }, rngSeed: 1 });
        const seen = new Set<string>();
        for (let i = 0; i < 200; i++) {
            r.randomizeScenario();
            seen.add(r.currentLabel());
        }
        expect(seen.has("healthy")).toBe(true);
        expect(seen.has("broken_bar_2bars")).toBe(true);
    });

    it("recordWindow emits N readings with the active label", () => {
        const r = new LabeledRecorder(scenarios, { sensorInfo: { sampleRateHz: 1000 } });
        r.setScenarioByLabel("broken_bar_2bars");
        const window = r.recordWindow(0.5);
        expect(window.length).toBe(500);
        for (const s of window) {
            expect(s.label).toBe("broken_bar_2bars");
        }
    });

    it("accepts an existing ISensor and reuses its config across scenario switches", () => {
        const referenceSensor = new Sensor(new ConstantSource(0), {
            sampleRateHz: 2000,
            noiseStd: 0.05,
            bias: 0.1,
            gain: 2.0,
            rngSeed: 13,
        });
        const r = new LabeledRecorder(scenarios, { sensorInfo: referenceSensor });

        expect(r.sensorConfig.sampleRateHz).toBe(2000);
        expect(r.sensorConfig.noiseStd).toBe(0.05);
        expect(r.sensorConfig.bias).toBe(0.1);
        expect(r.sensorConfig.gain).toBe(2.0);

        // Switching scenario replaces the source AND rebuilds the sensor
        // through the factory, so the active sensor is a fresh instance
        // (not the one we passed in) but with the same config.
        const before = r.currentSensor();
        r.setScenarioByLabel("broken_bar_2bars");
        const after = r.currentSensor();
        expect(after).not.toBe(before);
        expect(after).not.toBe(referenceSensor);
        expect(after.config.sampleRateHz).toBe(2000);
        expect(after.config.gain).toBe(2.0);
    });
});

describe("DatasetWriter end-to-end", () => {
    it("captures windows from all default motor scenarios into a JSON dataset", () => {
        const recorder = new LabeledRecorder(defaultMotorScenarios(), {
            sensorInfo: { sampleRateHz: 1000, noiseStd: 0.01, rngSeed: 7 },
            rngSeed: 7,
        });
        const writer = new DatasetWriter(1000);

        for (const scenario of defaultMotorScenarios()) {
            recorder.setScenarioByLabel(scenario.label);
            writer.addWindow(recorder.recordWindow(0.2));
        }

        const json = writer.toJson();
        expect(json.sampleRate).toBe(1000);
        expect(json.windows.length).toBe(defaultMotorScenarios().length);
        expect(json.classes.length).toBe(defaultMotorScenarios().length);
        for (const w of json.windows) {
            expect(w.channels.length).toBe(1);
            expect(w.channels[0].length).toBe(200);
        }

        const csv = writer.toCsv();
        const headerLine = csv.split("\n", 1)[0];
        expect(headerLine).toBe("window,sample_index,time,value,label,scenario_meta_json");
        expect(writer.totalSamples).toBe(200 * defaultMotorScenarios().length);
    });
});
