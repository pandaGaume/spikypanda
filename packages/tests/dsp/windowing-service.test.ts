import { GruWindowAdapter, SnnWindowAdapter, WindowingService } from "spikypanda-core";
import type { IIdentifiedSignalWindow, IRawSignalSample, IWindowingService } from "spikypanda-core";

describe("WindowingService", () => {
    test("emits deterministic overlapping windows at the configured stride", () => {
        const service = WindowingService.create({ windowSize: 4, stride: 2, channelCount: 2, sampleRateHz: 100 });
        const windows = WindowingTestData.pushRange(service, "run-a", 0, 8);

        expect(windows).toHaveLength(3);
        expect(windows.map((window) => window.identity)).toEqual([
            { acquisitionId: "run-a", windowIndex: 0, startSampleIndex: 0, endSampleIndex: 3 },
            { acquisitionId: "run-a", windowIndex: 1, startSampleIndex: 2, endSampleIndex: 5 },
            { acquisitionId: "run-a", windowIndex: 2, startSampleIndex: 4, endSampleIndex: 7 },
        ]);
        expect(windows[1].samples.map((sample) => sample.values[0])).toEqual([2, 3, 4, 5]);
        expect(service.state).toEqual({
            acquisitionId: "run-a",
            lastSampleIndex: 7,
            bufferedSampleCount: 2,
            nextWindowIndex: 3,
        });
    });

    test("preserves the motor-current 128/32 physical windowing contract", () => {
        const service = WindowingService.create({ windowSize: 128, stride: 32, channelCount: 3, sampleRateHz: 119.904077 });
        const windows = WindowingTestData.pushRange(service, "motor-current", 0, 192);

        expect(windows.map((window) => window.identity.startSampleIndex)).toEqual([0, 32, 64]);
        expect(windows.map((window) => window.identity.endSampleIndex)).toEqual([127, 159, 191]);
        expect(service.config.stride / service.config.sampleRateHz).toBeCloseTo(0.26688, 5);
    });

    test("never mixes samples from two acquisitions", () => {
        const service = WindowingService.create({ windowSize: 4, stride: 2, channelCount: 1, sampleRateHz: 10 });
        WindowingTestData.pushRange(service, "run-a", 0, 3);
        const windows = WindowingTestData.pushRange(service, "run-b", 0, 4);

        expect(windows).toHaveLength(1);
        expect(windows[0].identity).toEqual({
            acquisitionId: "run-b",
            windowIndex: 0,
            startSampleIndex: 0,
            endSampleIndex: 3,
        });
        expect(windows[0].samples.every((sample) => sample.acquisitionId === "run-b")).toBe(true);
    });

    test("resets an incomplete window after a missing sample by default", () => {
        const service = WindowingService.create({ windowSize: 3, stride: 1, channelCount: 1, sampleRateHz: 10 });
        service.push(WindowingTestData.sample("run-a", 0, 0));
        service.push(WindowingTestData.sample("run-a", 1, 1));
        expect(service.push(WindowingTestData.sample("run-a", 3, 3))).toBeNull();
        expect(service.push(WindowingTestData.sample("run-a", 4, 4))).toBeNull();
        const window = service.push(WindowingTestData.sample("run-a", 5, 5));

        expect(window?.identity).toEqual({
            acquisitionId: "run-a",
            windowIndex: 0,
            startSampleIndex: 3,
            endSampleIndex: 5,
        });
    });

    test("can reject a discontinuity instead of silently resetting", () => {
        const service = WindowingService.create({
            windowSize: 3,
            stride: 1,
            channelCount: 1,
            sampleRateHz: 10,
            discontinuityPolicy: "reject",
        });
        service.push(WindowingTestData.sample("run-a", 10, 1));

        expect(() => service.push(WindowingTestData.sample("run-a", 12, 2))).toThrow("expected sample 11, received 12");
    });

    test("copies input values so an emitted window is an immutable snapshot", () => {
        const service = WindowingService.create({ windowSize: 2, stride: 1, channelCount: 1, sampleRateHz: 10 });
        const mutableValues = [1];
        service.push({ acquisitionId: "run-a", sampleIndex: 0, values: mutableValues });
        mutableValues[0] = 99;
        const window = service.push(WindowingTestData.sample("run-a", 1, 2));

        expect(window?.samples[0].values).toEqual([1]);
    });

    test("feeds SNN observations and GRU features from the exact same identified window", () => {
        const service = WindowingService.create({ windowSize: 3, stride: 1, channelCount: 2, sampleRateHz: 4 });
        const window = WindowingTestData.pushRange(service, "motor-01", 8, 3)[0];
        const snn = new SnnWindowAdapter().adapt(window);
        const gru = new GruWindowAdapter().adapt(window);

        expect(snn.identity).toBe(window.identity);
        expect(gru.identity).toBe(window.identity);
        expect(snn.observations.map((observation) => Array.from(observation.values))).toEqual(gru.features);
        expect(snn.observations.map((observation) => observation.timestamp)).toEqual([2, 2.25, 2.5]);
        expect(snn.observations.map((observation) => observation.frameEnd)).toEqual([false, false, true]);
    });

    test("validates physical configuration and sample shape", () => {
        expect(() => WindowingService.create({ windowSize: 4, stride: 5, channelCount: 1, sampleRateHz: 10 })).toThrow("stride cannot exceed windowSize");

        const service = WindowingService.create({ windowSize: 4, stride: 2, channelCount: 2, sampleRateHz: 10 });
        expect(() => service.push({ acquisitionId: "run-a", sampleIndex: 0, values: [1] })).toThrow("expected 2 channels");
    });
});

class WindowingTestData {
    public static pushRange(service: IWindowingService, acquisitionId: string, firstSampleIndex: number, count: number): IIdentifiedSignalWindow[] {
        const windows: IIdentifiedSignalWindow[] = [];
        for (let offset = 0; offset < count; offset++) {
            const index = firstSampleIndex + offset;
            const window = service.push(WindowingTestData.sample(acquisitionId, index, index, service.config.channelCount));
            if (window) windows.push(window);
        }
        return windows;
    }

    public static sample(acquisitionId: string, sampleIndex: number, value: number, channelCount = 1): IRawSignalSample {
        return {
            acquisitionId,
            sampleIndex,
            values: Array.from({ length: channelCount }, (_, channel) => value + channel * 0.5),
        };
    }
}
