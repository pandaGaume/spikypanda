// ═══════════════════════════════════════════════════════════════════════════
// Online cosine clustering + batch re-clustering.
//
// Port of the proven driverv2 clustering library (itself a TypeScript
// port of python/clustering.py): pure embedding arithmetic, the encoder
// stays frozen. Online assignment with confidence-gated EMA centroid
// updates, plus batch agglomerative re-clustering with an absolute
// cosine-distance link threshold to recover from online over-
// segmentation. Labels are session-local indices, NEVER stable
// identifiers: a recluster may renumber every profile.
//
// ANCHORS (machines wear, drivers do not): the EMA update absorbs
// benign jitter but also FOLLOWS a slow derangement, step by step, so
// the assign distance never grows: the boiling-frog blind spot. Each
// cluster therefore keeps an anchor: an immutable snapshot of the
// centroid taken at creation. When the tracking centroid moves more
// than driftThr (cosine) away from its anchor, the assignment reports
// a drift event and the cluster RE-ANCHORS at the current centroid:
// staircase semantics, one event per driftThr of cumulative motion.
// ═══════════════════════════════════════════════════════════════════════════

export function l2norm(x: Float64Array): Float64Array {
    let n = 0;
    for (let i = 0; i < x.length; i++) {
        n += x[i] * x[i];
    }
    n = Math.sqrt(n) + 1e-9;
    const out = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) {
        out[i] = x[i] / n;
    }
    return out;
}

export function cosDist(a: Float64Array, b: Float64Array): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
    }
    return 1 - dot;
}

export interface OnlineClustererOptions {
    /** Above this cosine distance to every centroid, a new profile is created. */
    assignThr?: number;
    /** Stricter threshold gating the EMA centroid update (anti-drift). */
    updateThr?: number;
    /** EMA inertia (small = stable). */
    alpha?: number;
    /** Upper bound on the retained history (oldest entries dropped first). */
    historyMax?: number;
    /** Cosine distance the tracking centroid may move from its anchor
     *  snapshot before a drift event is reported and the cluster
     *  re-anchors (staircase). 0 disables drift detection entirely. */
    driftThr?: number;
}

export interface AssignResult {
    label: number;
    isNew: boolean;
    distance: number;
    /** Present only when this assignment found the tracking centroid
     *  more than driftThr away from its anchor: `distance` is the
     *  centroid-to-anchor cosine distance at the event, `steps` the
     *  cluster's total drift events since creation (or since the last
     *  recluster, a deliberate re-baselining). */
    drift?: { distance: number; steps: number };
}

export class OnlineClusterer {
    // Thresholds are deliberately mutable so a hosting node can retune
    // them live without erasing the learned profiles.
    public assignThr: number;
    public updateThr: number;
    public alpha: number;
    public historyMax: number;
    public driftThr: number;

    private readonly _centroids: Float64Array[] = [];
    private readonly _history: { embedding: Float64Array; label: number }[] = [];
    // Anchors: one immutable-by-default snapshot per cluster, taken at
    // creation (and refreshed only on a drift event or a recluster).
    // _driftSteps[j] counts cluster j's drift events since its anchor
    // was first laid down.
    private readonly _anchors: Float64Array[] = [];
    private readonly _driftSteps: number[] = [];

    public constructor(opts: OnlineClustererOptions = {}) {
        // Defaults are the calibrated V2 trip-profile thresholds
        // (python calibrate_clustering.py: assign 0.05 / update 0.02).
        // driftThr defaults to 2x assignThr: a centroid that silently
        // walked twice the open-set radius is no longer the reference
        // it was anchored as.
        this.assignThr = opts.assignThr ?? 0.05;
        this.updateThr = opts.updateThr ?? 0.02;
        this.alpha = opts.alpha ?? 0.15;
        this.historyMax = Math.max(1, Math.floor(opts.historyMax ?? 512));
        this.driftThr = opts.driftThr ?? 0.1;
    }

    public get centroids(): ReadonlyArray<Float64Array> {
        return this._centroids;
    }

    public get history(): ReadonlyArray<{ embedding: Float64Array; label: number }> {
        return this._history;
    }

    /** Per-cluster anchor snapshots (diagnostics; same indexing as
     *  `centroids`). Never mutated in place: a drift event or a
     *  recluster replaces the entry wholesale. */
    public get anchors(): ReadonlyArray<Float64Array> {
        return this._anchors;
    }

    /** Per-cluster drift-event counters (same indexing as `centroids`). */
    public get driftSteps(): ReadonlyArray<number> {
        return this._driftSteps;
    }

    public assign(embedding: ArrayLike<number>): AssignResult {
        const e = l2norm(Float64Array.from(embedding as number[]));
        if (this._centroids.length === 0) {
            this._centroids.push(e.slice());
            this._anchors.push(e.slice());
            this._driftSteps.push(0);
            this._pushHistory(e, 0);
            return { label: 0, isNew: true, distance: 0 };
        }
        let k = 0;
        let dMin = Infinity;
        for (let j = 0; j < this._centroids.length; j++) {
            const d = cosDist(e, this._centroids[j]);
            if (d < dMin) {
                dMin = d;
                k = j;
            }
        }
        let label: number;
        let isNew: boolean;
        let drift: { distance: number; steps: number } | undefined;
        if (dMin < this.assignThr) {
            label = k;
            isNew = false;
            if (dMin < this.updateThr) {
                const c = this._centroids[k];
                const mixed = new Float64Array(c.length);
                for (let i = 0; i < c.length; i++) {
                    mixed[i] = (1 - this.alpha) * c[i] + this.alpha * e[i];
                }
                this._centroids[k] = l2norm(mixed);
            }
            // Anchor drift check, AFTER the optional EMA update: the EMA
            // absorbs benign jitter but follows a slow derangement (every
            // step under updateThr moves the reference itself), so the
            // assign distance alone can never see wear. Measured against
            // the immutable anchor it can; each event re-anchors, so a
            // continuous slow drift yields a regular staircase of events
            // ("the reference moved another driftThr") instead of silence.
            if (this.driftThr > 0) {
                const dAnchor = cosDist(this._centroids[k], this._anchors[k]);
                if (dAnchor > this.driftThr) {
                    this._anchors[k] = this._centroids[k].slice();
                    this._driftSteps[k] += 1;
                    drift = { distance: dAnchor, steps: this._driftSteps[k] };
                }
            }
        } else {
            label = this._centroids.length;
            isNew = true;
            this._centroids.push(e.slice());
            this._anchors.push(e.slice());
            this._driftSteps.push(0);
        }
        this._pushHistory(e, label);
        const result: AssignResult = { label, isNew, distance: dMin };
        if (drift) {
            result.drift = drift;
        }
        return result;
    }

    /**
     * Batch re-cluster the retained history in place: run the
     * agglomerative `recluster` over every stored embedding, rewrite
     * the history labels, and rebuild the centroids as the l2-normalized
     * mean of each new cluster's members. Returns the new labels + k.
     * Local labels are renumbered freely; callers must never treat them
     * as stable identifiers (same contract as the driverv2 api).
     *
     * A recluster is a deliberate RE-BASELINING: every rebuilt cluster
     * gets a fresh anchor (its new centroid) and a zeroed drift counter,
     * so no drift event can fire from the rebuild itself.
     */
    public reclusterHistory(opts: ReclusterOptions = {}): { labels: number[]; k: number } {
        const n = this._history.length;
        if (n === 0) {
            this._centroids.length = 0;
            this._anchors.length = 0;
            this._driftSteps.length = 0;
            return { labels: [], k: 0 };
        }
        const { labels, k } = recluster(
            this._history.map((h) => h.embedding),
            opts
        );
        for (let i = 0; i < n; i++) {
            this._history[i].label = labels[i];
        }
        const dim = this._history[0].embedding.length;
        this._centroids.length = 0;
        this._anchors.length = 0;
        this._driftSteps.length = 0;
        for (let j = 0; j < k; j++) {
            const mean = new Float64Array(dim);
            let count = 0;
            for (let i = 0; i < n; i++) {
                if (labels[i] !== j) continue;
                const e = this._history[i].embedding;
                for (let d = 0; d < dim; d++) {
                    mean[d] += e[d];
                }
                count++;
            }
            // `recluster` labels are contiguous 0..k-1 with non-empty
            // clusters, so count > 0 by construction.
            for (let d = 0; d < dim; d++) {
                mean[d] /= count;
            }
            const centroid = l2norm(mean);
            this._centroids.push(centroid);
            this._anchors.push(centroid.slice());
            this._driftSteps.push(0);
        }
        return { labels, k };
    }

    /** Bounded ring semantics: append, then drop oldest beyond historyMax
     *  so an always-on device cannot grow the history unbounded. */
    private _pushHistory(embedding: Float64Array, label: number): void {
        this._history.push({ embedding, label });
        while (this._history.length > this.historyMax) {
            this._history.shift();
        }
    }
}

// ─── Batch re-clustering ─────────────────────────────────────────────────────

/** Deterministic LCG so the re-clustering is reproducible on-device. */
function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

export function sphericalKMeans(X: Float64Array[], k: number, iters = 50, seed = 0): { labels: number[]; centroids: Float64Array[] } {
    const rand = lcg(seed);
    const Xn = X.map(l2norm);
    const n = Xn.length;
    const dim = Xn[0].length;

    // sample k distinct start points
    const picked = new Set<number>();
    while (picked.size < k) {
        picked.add(Math.floor(rand() * n));
    }
    let C: Float64Array[] = [...picked].map((i) => Xn[i].slice());

    let labels = new Array<number>(n).fill(0);
    for (let it = 0; it < iters; it++) {
        const newLabels = Xn.map((x) => {
            let best = 0;
            let bestDot = -Infinity;
            for (let j = 0; j < k; j++) {
                let dot = 0;
                for (let i = 0; i < dim; i++) {
                    dot += x[i] * C[j][i];
                }
                if (dot > bestDot) {
                    bestDot = dot;
                    best = j;
                }
            }
            return best;
        });
        const newC: Float64Array[] = [];
        for (let j = 0; j < k; j++) {
            const members = Xn.filter((_, i) => newLabels[i] === j);
            if (members.length === 0) {
                newC.push(C[j]);
                continue;
            }
            const mean = new Float64Array(dim);
            for (const m of members) {
                for (let i = 0; i < dim; i++) {
                    mean[i] += m[i];
                }
            }
            for (let i = 0; i < dim; i++) {
                mean[i] /= members.length;
            }
            newC.push(l2norm(mean));
        }
        const converged = newC.every((c, j) => c.every((v, i) => Math.abs(v - C[j][i]) < 1e-9));
        C = newC;
        labels = newLabels;
        if (converged) {
            break;
        }
    }
    return { labels, centroids: C };
}

export function cosineSilhouette(X: Float64Array[], labels: number[]): number {
    const Xn = X.map(l2norm);
    const n = Xn.length;
    const ks = [...new Set(labels)];
    let total = 0;
    for (let i = 0; i < n; i++) {
        const dists = Xn.map((x) => cosDist(Xn[i], x));
        const same = labels.map((l, j) => l === labels[i] && j !== i);
        const sameDists = dists.filter((_, j) => same[j]);
        const a = sameDists.length ? sameDists.reduce((s, d) => s + d, 0) / sameDists.length : 0;
        let b = Infinity;
        for (const kOther of ks) {
            if (kOther === labels[i]) {
                continue;
            }
            const other = dists.filter((_, j) => labels[j] === kOther);
            if (other.length) {
                b = Math.min(b, other.reduce((s, d) => s + d, 0) / other.length);
            }
        }
        if (!isFinite(b)) {
            b = 0;
        }
        const m = Math.max(a, b);
        total += m === 0 ? 0 : (b - a) / m;
    }
    return total / n;
}

export interface ReclusterOptions {
    /**
     * Absolute cosine-distance cut for the agglomerative merge. Calibrated
     * on simulated trip-profile distances (calibrate_clustering.py): merges
     * stop once the closest pair of clusters is farther than this.
     */
    linkThr?: number;
    /** Upper bound on the number of profiles (household prior + margin). */
    kMax?: number;
}

/**
 * Batch re-clustering: AGGLOMERATIVE average-linkage with an absolute
 * cosine-distance threshold. k emerges naturally, including k=1; the
 * previous silhouette-based selection was scale-invariant and could
 * almost never conclude "single driver" (measured: 0% of one-driver
 * households recognized). Mirrors python/clustering.py `recluster`.
 */
export function recluster(embeddings: ArrayLike<number>[], opts: ReclusterOptions = {}): { labels: number[]; k: number } {
    // Default calibrated on V2 trip-profile distances (sim grid + UAH sweep,
    // see python/calibrate_clustering.py and tests/sweep_uah_households.py).
    const linkThr = opts.linkThr ?? 0.06;
    const kMax = opts.kMax ?? 4;
    const X = embeddings.map((e) => l2norm(Float64Array.from(e as number[])));
    const n = X.length;
    if (n < 2) {
        return { labels: new Array(n).fill(0), k: Math.max(n, 1) };
    }
    const D: number[][] = X.map((a) => X.map((b) => cosDist(a, b)));

    const clusters: number[][] = X.map((_, i) => [i]);
    while (clusters.length > 1) {
        let bestD = Infinity;
        let bi = -1;
        let bj = -1;
        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                let sum = 0;
                for (const a of clusters[i]) {
                    for (const b of clusters[j]) {
                        sum += D[a][b];
                    }
                }
                const d = sum / (clusters[i].length * clusters[j].length);
                if (d < bestD) {
                    bestD = d;
                    bi = i;
                    bj = j;
                }
            }
        }
        if (bestD > linkThr && clusters.length <= kMax) {
            break;
        }
        clusters[bi] = clusters[bi].concat(clusters[bj]);
        clusters.splice(bj, 1);
    }

    const labels = new Array<number>(n).fill(0);
    clusters.forEach((members, lab) => {
        for (const m of members) {
            labels[m] = lab;
        }
    });
    return { labels, k: clusters.length };
}
