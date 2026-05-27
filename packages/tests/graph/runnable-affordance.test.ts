import { IRunnable, RunStatus, getRunnableAffordance, runnableAffordance } from "spikypanda-core";

describe("runnableAffordance decorator", () => {
    test("decorated class resolves to 'record' via getRunnableAffordance", () => {
        @runnableAffordance("record")
        class CaptureModel implements IRunnable {
            public status: RunStatus = "idle";
            public start(): void {}
            public stop(): void {}
        }

        expect(getRunnableAffordance(new CaptureModel())).toBe("record");
    });

    test("undecorated class falls back to 'play'", () => {
        class SourceModel implements IRunnable {
            public status: RunStatus = "idle";
            public start(): void {}
            public stop(): void {}
        }

        expect(getRunnableAffordance(new SourceModel())).toBe("play");
    });

    test("inline instance field overrides class decorator", () => {
        @runnableAffordance("record")
        class FlexibleModel implements IRunnable {
            public status: RunStatus = "idle";
            public affordance: "play" | "record" = "record";
            public start(): void {}
            public stop(): void {}
        }

        const instance = new FlexibleModel();
        expect(getRunnableAffordance(instance)).toBe("record");

        instance.affordance = "play";
        expect(getRunnableAffordance(instance)).toBe("play");
    });

    test("ad-hoc object with inline affordance still works", () => {
        const adhoc: IRunnable = {
            status: "idle",
            affordance: "record",
            start: () => {},
            stop: () => {},
        };

        expect(getRunnableAffordance(adhoc)).toBe("record");
    });
});
