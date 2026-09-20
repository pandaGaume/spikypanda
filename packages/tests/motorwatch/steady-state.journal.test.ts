/**
 * The journal of stable operating points (docs/architecture/usine-jobs.fr.md,
 * 7.1): what the interface fixes is tested through the interface, what the
 * in-memory implementation decides (when a stretch closes, how many samples it
 * needs, how much is retained) is tested on the class. The last block closes
 * the loop the journal exists for: its export feeds a `fit` unchanged.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CentralStation, InMemorySteadyStateJournal } from "spikypanda-applications-motorwatch";
import type { IDeviceServer, ISteadyStateJournal, IOperatingPointSample, McpNotification, McpNotificationHandler } from "spikypanda-applications-motorwatch";
import { parseSpec, runFit } from "spikypanda-factory";
import type { FitSpec } from "spikypanda-factory";

function sample(t: number, command: number, current: number, steady = true, deviceId = "scrubber-1"): IOperatingPointSample {
    return { deviceId, t, command, current, steady };
}

/** A stable stretch of `n` observations at the same command, current with a small ripple. */
function feedStretch(journal: ISteadyStateJournal, t0: number, command: number, current: number, n: number, deviceId = "scrubber-1"): number {
    for (let k = 0; k < n; k++) journal.observe(sample(t0 + k * 0.2, command, current + (k % 2 === 0 ? 0.001 : -0.001), true, deviceId));
    return t0 + n * 0.2;
}

describe("InMemorySteadyStateJournal", () => {
    it("closes a stretch when the device stops being steady, with the means and the spread", () => {
        const journal = new InMemorySteadyStateJournal({ minSamples: 3 });
        const tEnd = feedStretch(journal, 0, 35, 0.1515, 10);
        expect(journal.entries()).toHaveLength(0); // still open
        journal.observe(sample(tEnd, 35, 0.2, false));
        const [entry] = journal.entries();
        expect(entry).toMatchObject({ deviceId: "scrubber-1", from: 0, samples: 10 });
        expect(entry.command).toBeCloseTo(35, 12);
        expect(entry.current).toBeCloseTo(0.1515, 12);
        expect(entry.currentSpread).toBeCloseTo(0.001, 6);
        expect(journal.openCount).toBe(0);
    });

    it("closes a stretch when the command moves beyond the tolerance, and opens the next one", () => {
        const journal = new InMemorySteadyStateJournal({ minSamples: 2, commandTolerance: 0.5 });
        feedStretch(journal, 0, 25, 0.1312, 5);
        feedStretch(journal, 10, 25.3, 0.1312, 2); // within tolerance: same stretch
        feedStretch(journal, 20, 45, 0.1631, 4); // beyond: closes the first
        expect(journal.entries().map((e) => [e.samples, Math.round(e.command)])).toEqual([[7, 25]]);
        journal.observe(sample(30, 45, 0.1631, false));
        expect(journal.entries().map((e) => [e.samples, Math.round(e.command)])).toEqual([
            [7, 25],
            [4, 45],
        ]);
    });

    it("drops a stretch shorter than minSamples and keeps one device apart from another", () => {
        const journal = new InMemorySteadyStateJournal({ minSamples: 3 });
        feedStretch(journal, 0, 15, 0.1054, 2, "a");
        journal.observe(sample(1, 15, 0.1054, false, "a"));
        feedStretch(journal, 0, 55, 0.17, 6, "b");
        journal.observe(sample(5, 55, 0.17, false, "b"));
        expect(journal.entries({ deviceId: "a" })).toHaveLength(0);
        expect(journal.entries({ deviceId: "b" })).toHaveLength(1);
        expect(journal.entries()).toHaveLength(1);
    });

    it("filters by time, clears before a time, and evicts the oldest beyond maxEntries", () => {
        const journal = new InMemorySteadyStateJournal({ minSamples: 1, maxEntries: 3 });
        for (let i = 0; i < 5; i++) {
            journal.observe(sample(i * 10, 20 + i, 0.1, true));
            journal.observe(sample(i * 10 + 1, 20 + i, 0.1, false));
        }
        expect(journal.entries().map((e) => e.command)).toEqual([22, 23, 24]);
        expect(journal.entries({ since: 30 }).map((e) => e.command)).toEqual([23, 24]);
        journal.clear(40);
        expect(journal.entries().map((e) => e.command)).toEqual([24]);
        journal.clear();
        expect(journal.entries()).toHaveLength(0);
    });

    it("ignores an observation that is not a finite number", () => {
        const journal = new InMemorySteadyStateJournal({ minSamples: 1 });
        journal.observe(sample(0, Number.NaN, 0.1));
        journal.observe(sample(1, 20, Number.POSITIVE_INFINITY));
        journal.observe(sample(2, 20, 0.1, false));
        expect(journal.entries()).toHaveLength(0);
    });
});

describe("CentralStation routes operating points to its journal", () => {
    class StubServer implements IDeviceServer {
        private readonly _subscribers: McpNotificationHandler[] = [];
        public subscribe(handler: McpNotificationHandler): () => void {
            this._subscribers.push(handler);
            return () => undefined;
        }
        public emit(n: McpNotification): void {
            for (const h of this._subscribers) h(n);
        }
        public callTool(): unknown {
            return {};
        }
    }

    it("keys the entries on the device id learnt from the status echo, and accepts a replacement journal", () => {
        const recorded: IOperatingPointSample[] = [];
        const replacement: ISteadyStateJournal = {
            observe: (s) => void recorded.push(s),
            entries: () => [],
            exportRows: () => [],
            clear: () => undefined,
        };
        const station = new CentralStation("site-a", { journal: replacement });
        const server = new StubServer();
        station.connect(server);
        server.emit({ method: "status", params: { deviceId: "scrubber-7" } as never });
        server.emit({ method: "operating_point", params: { t: 1, command: 33, current: 0.14, steady: true } });
        expect(recorded).toEqual([{ deviceId: "scrubber-7", t: 1, command: 33, current: 0.14, steady: true }]);
    });

    it("uses the in-memory journal by default and a stable placeholder id before any status echo", () => {
        const station = new CentralStation("site-a");
        const server = new StubServer();
        station.connect(server);
        for (let k = 0; k < 4; k++) server.emit({ method: "operating_point", params: { t: k, command: 40, current: 0.16, steady: true } });
        server.emit({ method: "operating_point", params: { t: 5, command: 40, current: 0.16, steady: false } });
        expect(station.journal.entries().map((e) => [e.deviceId, e.samples])).toEqual([["device-1", 4]]);
    });
});

describe("a journal export feeds a fit unchanged", () => {
    it("fits the health model from the rows the journal exports", () => {
        const journal = new InMemorySteadyStateJournal({ minSamples: 3 });
        const bench: Array<[number, number]> = [
            [15, 0.1054],
            [25, 0.1312],
            [35, 0.1515],
            [45, 0.1631],
            [55, 0.17],
        ];
        let t = 0;
        for (const [command, current] of bench) {
            t = feedStretch(journal, t, command, current, 6); // even: the ripple cancels in the mean
            journal.observe(sample(t, command, current, false));
            t += 1;
        }
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spikypanda-journal-"));
        const dataset = path.join(dir, "journal.json");
        fs.writeFileSync(dataset, JSON.stringify(journal.exportRows()));

        const spec = parseSpec({
            version: 1,
            job: "fit",
            name: "from-journal",
            model: "affine-residual",
            dataset: { file: dataset, duty: "duty_percent", current: "current_amps" },
            fullScale: { duty: 100, current: 1.0, senseSpan: 100 },
            domain: { dutyMin: 0.15, dutyMax: 0.8 },
            monitor: { residual: { threshold: 0.04, debounceCycles: 30, severity: 350, alarm: "drift.current" } },
            outputs: { file: "scrubber_health.onnx" },
        }) as FitSpec;
        const report = runFit(spec, { specDir: dir, outDir: path.join(dir, "out"), log: () => undefined, factoryVersion: "test" });
        expect(report.quality.kept).toBe(5);
        expect(report.coefficients.slope).toBeCloseTo(0.1611, 4);
        expect(report.coefficients.intercept).toBeCloseTo(0.0879, 4);
        expect(report.parity.ok).toBe(true);
    });
});
