// ═══════════════════════════════════════════════════════════════════════════
// The journal of stable operating points: the Tier 2 source of the real
// (command, current) pairs a `fit` job needs to recalibrate a monitor on the
// machine as it is, not as the twin says it should be.
//
// Specified in docs/architecture/usine-jobs.fr.md, section 7.1. What the
// interface FIXES: one observation in at a time, as the device reports it
// (the device knows whether it is steady; the journal never recomputes
// that); one entry out per stable stretch, with the means, the count and
// the spread of the current; an export in the exact shape the `fit` job
// reads (`duty_percent`, `current_amps`); a reset. What it LEAVES to the
// implementation: when a stretch starts and ends, how many observations a
// stretch needs to count, how much is retained, and on what support.
//
// The station takes an implementation at construction and uses the
// in-memory one by default. Swapping it for a file, a database or a remote
// service is a constructor argument, not a change to the station.
// ═══════════════════════════════════════════════════════════════════════════

/** One observation of the machine's operating point, as reported by a device. */
export interface IOperatingPointSample {
    deviceId: string;
    /** Device time, in seconds; monotonic per device. */
    t: number;
    /** Command, in percent of full speed (the duty of a DC drive). */
    command: number;
    /** Current, in amperes (the RMS or the mean of the block that produced this sample). */
    current: number;
    /** The device's own steady-state detector: true while the machine is stable. */
    steady: boolean;
}

/** One stable stretch, reduced to what a fit needs. */
export interface ISteadyStateEntry {
    deviceId: string;
    /** Device time of the first and last observation of the stretch, in seconds. */
    from: number;
    to: number;
    samples: number;
    /** Mean command over the stretch, in percent. */
    command: number;
    /** Mean current over the stretch, in amperes. */
    current: number;
    /** Standard deviation of the current over the stretch, in amperes: the uncertainty a fit can expose. */
    currentSpread: number;
}

export interface ISteadyStateFilter {
    deviceId?: string;
    /** Keep entries whose stretch ends at or after this device time. */
    since?: number;
}

/** A row in the shape `fit` reads: the two columns it needs, plus provenance. */
export interface ISteadyStateRow {
    device_id: string;
    from: number;
    to: number;
    samples: number;
    duty_percent: number;
    current_amps: number;
    current_spread: number;
}

export interface ISteadyStateJournal {
    /** Feed one observation. The journal decides whether and when it closes an entry. */
    observe(sample: IOperatingPointSample): void;
    /** Closed entries, oldest first. A stretch still open is not an entry yet. */
    entries(filter?: ISteadyStateFilter): ReadonlyArray<ISteadyStateEntry>;
    /** The same entries, as rows the `fit` job reads without transformation. */
    exportRows(filter?: ISteadyStateFilter): ReadonlyArray<ISteadyStateRow>;
    /** Forget every entry, or only those whose stretch ended before `before` (device time). Open stretches are dropped too. */
    clear(before?: number): void;
}

export interface IInMemoryJournalOptions {
    /** Observations a stretch needs before it counts as an entry. Default 3. */
    minSamples?: number;
    /** A command change beyond this many percent closes the stretch. Default 0.5. */
    commandTolerance?: number;
    /** Entries retained, oldest evicted first. Default 4096. */
    maxEntries?: number;
}

interface IOpenStretch {
    deviceId: string;
    from: number;
    to: number;
    n: number;
    sumCommand: number;
    sumCurrent: number;
    sumCurrentSq: number;
    /** Command of the first observation: the reference the tolerance is measured against. */
    command0: number;
}

/**
 * Default journal: one open stretch per device, closed when the device stops
 * being steady or when the command moves beyond the tolerance, kept only when
 * it holds enough observations. Everything lives in memory and is lost with
 * the process; a persisted journal implements the same interface.
 */
export class InMemorySteadyStateJournal implements ISteadyStateJournal {
    private readonly _entries: ISteadyStateEntry[] = [];
    private readonly _open = new Map<string, IOpenStretch>();
    private readonly _minSamples: number;
    private readonly _commandTolerance: number;
    private readonly _maxEntries: number;

    public constructor(options: IInMemoryJournalOptions = {}) {
        this._minSamples = Math.max(1, Math.floor(options.minSamples ?? 3));
        this._commandTolerance = Math.max(0, options.commandTolerance ?? 0.5);
        this._maxEntries = Math.max(1, Math.floor(options.maxEntries ?? 4096));
    }

    public observe(sample: IOperatingPointSample): void {
        if (!Number.isFinite(sample.t) || !Number.isFinite(sample.command) || !Number.isFinite(sample.current)) return;
        const open = this._open.get(sample.deviceId);
        if (!sample.steady) {
            if (open) this._close(open);
            return;
        }
        if (open && Math.abs(sample.command - open.command0) > this._commandTolerance) {
            this._close(open);
        }
        const current = this._open.get(sample.deviceId);
        if (!current) {
            this._open.set(sample.deviceId, {
                deviceId: sample.deviceId,
                from: sample.t,
                to: sample.t,
                n: 1,
                sumCommand: sample.command,
                sumCurrent: sample.current,
                sumCurrentSq: sample.current * sample.current,
                command0: sample.command,
            });
            return;
        }
        current.to = sample.t;
        current.n++;
        current.sumCommand += sample.command;
        current.sumCurrent += sample.current;
        current.sumCurrentSq += sample.current * sample.current;
    }

    public entries(filter: ISteadyStateFilter = {}): ReadonlyArray<ISteadyStateEntry> {
        return this._entries.filter((e) => (filter.deviceId === undefined || e.deviceId === filter.deviceId) && (filter.since === undefined || e.to >= filter.since));
    }

    public exportRows(filter?: ISteadyStateFilter): ReadonlyArray<ISteadyStateRow> {
        return this.entries(filter).map((e) => ({
            device_id: e.deviceId,
            from: e.from,
            to: e.to,
            samples: e.samples,
            duty_percent: e.command,
            current_amps: e.current,
            current_spread: e.currentSpread,
        }));
    }

    public clear(before?: number): void {
        this._open.clear();
        if (before === undefined) {
            this._entries.length = 0;
            return;
        }
        let keep = 0;
        for (const e of this._entries) if (e.to >= before) this._entries[keep++] = e;
        this._entries.length = keep;
    }

    /** Stretches open right now, one per device (diagnostics; not entries yet). */
    public get openCount(): number {
        return this._open.size;
    }

    private _close(open: IOpenStretch): void {
        this._open.delete(open.deviceId);
        if (open.n < this._minSamples) return;
        const meanCurrent = open.sumCurrent / open.n;
        const variance = Math.max(0, open.sumCurrentSq / open.n - meanCurrent * meanCurrent);
        this._entries.push({
            deviceId: open.deviceId,
            from: open.from,
            to: open.to,
            samples: open.n,
            command: open.sumCommand / open.n,
            current: meanCurrent,
            currentSpread: Math.sqrt(variance),
        });
        while (this._entries.length > this._maxEntries) this._entries.shift();
    }
}
