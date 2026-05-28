import { ILabeledReading } from "../interfaces/Recorder";

// One labeled training window in the JSON dataset format.
//   label    : training class
//   channels : array of per-channel sample arrays. The first dimension is
//              the channel count (1 for a single sensor, N for multi-modal
//              acquisitions); the second dimension is the sample count.
//   meta     : free-form scenario metadata snapshotted at capture time.
export interface IDatasetWindow {
    label: string;
    channels: number[][];
    meta?: Record<string, unknown>;
}

// Top-level JSON dataset format. Compatible with what the existing motor
// samples (motor_current.js and friends) expect, modulo the train / test
// split which is the loader's responsibility.
export interface IDatasetJson {
    classes: string[];
    sampleRate: number;
    windows: IDatasetWindow[];
    meta?: Record<string, unknown>;
}

// Accumulates labeled windows produced by a recorder and exports them to
// CSV (interop with Excel, pandas, the C++ reference) or JSON (browser
// loaders that already consume the spikypanda training format).
export class DatasetWriter {
    public readonly sampleRate: number;
    private readonly _windows: IDatasetWindow[] = [];
    private readonly _classSet: Set<string> = new Set();

    public constructor(sampleRate: number) {
        if (sampleRate <= 0) {
            throw new Error("DatasetWriter: sampleRate must be > 0");
        }
        this.sampleRate = sampleRate;
    }

    // Add one window of labeled readings. All readings in a single window
    // must share the same label: a window is a single training sample, not
    // a stream of mixed classes.
    public addWindow(readings: ReadonlyArray<ILabeledReading>): void {
        if (readings.length === 0) {
            return;
        }
        const label = readings[0].label;
        for (const r of readings) {
            if (r.label !== label) {
                throw new Error("DatasetWriter: all readings in a window must share the same label");
            }
        }
        const channel: number[] = readings.map((r) => r.value);
        this._classSet.add(label);
        this._windows.push({
            label,
            channels: [channel],
            meta: readings[0].scenarioMeta,
        });
    }

    public toJson(): IDatasetJson {
        return {
            classes: this.classes(),
            sampleRate: this.sampleRate,
            windows: this._windows,
        };
    }

    // CSV layout: one row per sample, with window/sample indices to allow
    // unflattening, plus the scenario metadata serialized as JSON for
    // round-tripping. Compatible with the C++ EngineSensorBuffer.saveToCSV
    // schema except that it groups multiple windows in one file.
    public toCsv(): string {
        const lines: string[] = ["window,sample_index,time,value,label,scenario_meta_json"];
        const dt = 1.0 / this.sampleRate;
        for (let w = 0; w < this._windows.length; w++) {
            const win = this._windows[w];
            const channel = win.channels[0];
            const metaJson = JSON.stringify(win.meta ?? {});
            for (let i = 0; i < channel.length; i++) {
                const t = i * dt;
                lines.push(`${w},${i},${t},${channel[i]},${win.label},${escapeCsv(metaJson)}`);
            }
        }
        return lines.join("\n");
    }

    public classes(): string[] {
        return Array.from(this._classSet).sort();
    }

    public get windowCount(): number {
        return this._windows.length;
    }

    public get totalSamples(): number {
        let n = 0;
        for (const w of this._windows) {
            n += w.channels[0]?.length ?? 0;
        }
        return n;
    }
}

// Quote and escape a CSV field. Required for the JSON-encoded scenario
// metadata column, which contains commas and quotes by construction.
function escapeCsv(s: string): string {
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}
