// ═══════════════════════════════════════════════════════════════════════════
// RegimeCatalog : the central station's labeled-regime store.
//
// Each entry maps an l2-normalized embedding centroid to a human label
// (plus an optional diagnosis and the owning site). Lookup is cosine
// nearest-neighbour gated by the calibrated link threshold (0.06, the
// same cut the batch reclusterer uses), so a centroid that would merge
// with an entry resolves to that entry's label.
//
// `updatedAt` is a per-catalog MONOTONIC COUNTER, not a Date: ordering
// is all the merge logic ever needs, and counters survive JSON
// round-trips and clock-free devices.
// ═══════════════════════════════════════════════════════════════════════════

import { cosDist, l2norm } from "spikypanda-plugin-ml";

export interface IRegimeCatalogEntry {
    /** Stored l2-normalized. */
    centroid: Float64Array;
    label: string;
    /** Evidence weight: how many applyLabel hits supported this entry. */
    count: number;
    diagnosis?: string;
    site: string;
    /** Monotonic per-catalog counter value of the last update. */
    updatedAt: number;
}

export interface IRegimeLookupResult {
    label: string;
    distance: number;
    entry: IRegimeCatalogEntry;
}

export interface IRegimeCatalogEntryJson {
    centroid: number[];
    label: string;
    count: number;
    diagnosis?: string;
    site: string;
    updatedAt: number;
}

export interface IRegimeCatalogJson {
    site: string;
    matchThr: number;
    counter: number;
    entries: IRegimeCatalogEntryJson[];
}

export interface IRegimeCatalogOptions {
    /** Cosine-distance match threshold (calibrated link cut). Default 0.06. */
    matchThr?: number;
}

export class RegimeCatalog {
    public readonly site: string;

    /** Mutable on purpose: operators retune the match cut live. */
    public matchThr: number;

    private readonly _entries: IRegimeCatalogEntry[] = [];
    private _counter = 0;

    public constructor(site: string, options: IRegimeCatalogOptions = {}) {
        this.site = site;
        this.matchThr = options.matchThr ?? 0.06;
    }

    public get size(): number {
        return this._entries.length;
    }

    public get entries(): ReadonlyArray<IRegimeCatalogEntry> {
        return this._entries;
    }

    /**
     * Label a regime centroid. A centroid within matchThr of an
     * existing entry UPDATES it (relabel + diagnosis refresh, count
     * incremented, stored centroid kept: it is the older, better
     * supported estimate); anything farther becomes a new entry.
     */
    public applyLabel(centroid: ArrayLike<number>, label: string, diagnosis?: string, site?: string): IRegimeCatalogEntry {
        const normalized = l2norm(Float64Array.from(centroid as number[]));
        const owner = site ?? this.site;
        const match = this._nearest(normalized);
        if (match && match.distance <= this.matchThr) {
            const entry = match.entry;
            entry.label = label;
            if (diagnosis !== undefined) entry.diagnosis = diagnosis;
            entry.count += 1;
            entry.updatedAt = ++this._counter;
            return entry;
        }
        const entry: IRegimeCatalogEntry = {
            centroid: normalized,
            label,
            count: 1,
            diagnosis,
            site: owner,
            updatedAt: ++this._counter,
        };
        this._entries.push(entry);
        return entry;
    }

    /** Cosine nearest-neighbour lookup gated by matchThr. */
    public lookup(embedding: ArrayLike<number>): IRegimeLookupResult | null {
        const normalized = l2norm(Float64Array.from(embedding as number[]));
        const match = this._nearest(normalized);
        if (!match || match.distance > this.matchThr) return null;
        return { label: match.entry.label, distance: match.distance, entry: match.entry };
    }

    /** Plain-JSON snapshot (deep copies, safe to ship between sites). */
    public export(): IRegimeCatalogJson {
        return {
            site: this.site,
            matchThr: this.matchThr,
            counter: this._counter,
            entries: this._entries.map((e) => ({
                centroid: Array.from(e.centroid),
                label: e.label,
                count: e.count,
                diagnosis: e.diagnosis,
                site: e.site,
                updatedAt: e.updatedAt,
            })),
        };
    }

    /** Rebuild a catalog from an export() snapshot. */
    public static import(json: IRegimeCatalogJson): RegimeCatalog {
        const catalog = new RegimeCatalog(json.site, { matchThr: json.matchThr });
        for (const e of json.entries) {
            catalog._entries.push({
                centroid: l2norm(Float64Array.from(e.centroid)),
                label: e.label,
                count: e.count,
                diagnosis: e.diagnosis,
                site: e.site,
                updatedAt: e.updatedAt,
            });
        }
        catalog._counter = json.counter;
        return catalog;
    }

    private _nearest(normalized: Float64Array): { entry: IRegimeCatalogEntry; distance: number } | null {
        let best: IRegimeCatalogEntry | null = null;
        let bestD = Infinity;
        for (const entry of this._entries) {
            const d = cosDist(normalized, entry.centroid);
            if (d < bestD) {
                bestD = d;
                best = entry;
            }
        }
        return best !== null ? { entry: best, distance: bestD } : null;
    }
}
