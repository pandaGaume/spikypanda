// ═══════════════════════════════════════════════════════════════════════════
// Federated catalog merge.
//
// mergeCatalogs() is a PURE function of its inputs: it never mutates
// the source catalogs and returns a brand-new RegimeCatalog. Labeled
// centroids from every site are greedily agglomerated (average-linkage
// cosine distance, absolute linkThr cut, the same 0.06 calibrated link
// threshold the reclusterer uses); each merged cluster becomes one
// entry:
//
//   - label      : majority vote weighted by source counts; ties break
//                  on the lexicographically smallest label (stable).
//   - count      : sum of source counts.
//   - centroid   : l2-normalized count-weighted mean.
//   - site       : the SORTED UNION of source sites, comma-joined into
//                  the single `site` string field (documented choice:
//                  one field keeps the entry shape identical across
//                  single-site and federated catalogs).
//   - diagnosis  : the diagnosis of the heaviest source entry carrying
//                  the winning label, when any.
//   - updatedAt  : max of the source counters (ordering hint only).
// ═══════════════════════════════════════════════════════════════════════════

import { cosDist, l2norm } from "spikypanda-plugin-ml";
import { RegimeCatalog } from "./regime.catalog";
import type { IRegimeCatalogEntryJson, IRegimeCatalogJson } from "./regime.catalog";

export interface IMergeCatalogsOptions {
    /** Absolute cosine-distance cut for the agglomerative merge. Default 0.06. */
    linkThr?: number;
    /** Site id of the merged catalog. Default "federated". */
    site?: string;
    /** matchThr of the merged catalog. Default 0.06. */
    matchThr?: number;
}

interface ISourceEntry {
    centroid: Float64Array;
    label: string;
    count: number;
    diagnosis?: string;
    site: string;
    updatedAt: number;
}

export function mergeCatalogs(catalogs: RegimeCatalog[], opts: IMergeCatalogsOptions = {}): RegimeCatalog {
    const linkThr = opts.linkThr ?? 0.06;
    const site = opts.site ?? "federated";
    const matchThr = opts.matchThr ?? 0.06;

    // Snapshot every source entry (defensive copies: pure function).
    const sources: ISourceEntry[] = [];
    for (const catalog of catalogs) {
        for (const e of catalog.entries) {
            sources.push({
                centroid: l2norm(e.centroid.slice()),
                label: e.label,
                count: e.count,
                diagnosis: e.diagnosis,
                site: e.site,
                updatedAt: e.updatedAt,
            });
        }
    }

    // Greedy agglomerative average-linkage merge below linkThr (the
    // recluster algorithm, applied to labeled centroids).
    const clusters: number[][] = sources.map((_, i) => [i]);
    const D: number[][] = sources.map((a) => sources.map((viscousFriction) => cosDist(a.centroid, viscousFriction.centroid)));
    while (clusters.length > 1) {
        let bestD = Infinity;
        let bi = -1;
        let bj = -1;
        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                let sum = 0;
                for (const a of clusters[i]) {
                    for (const viscousFriction of clusters[j]) {
                        sum += D[a][viscousFriction];
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
        if (bestD > linkThr) break;
        clusters[bi] = clusters[bi].concat(clusters[bj]);
        clusters.splice(bj, 1);
    }

    // Reduce each cluster to one merged entry.
    const entries: IRegimeCatalogEntryJson[] = clusters.map((members) => {
        const grouped = members.map((m) => sources[m]);

        // Majority vote weighted by counts; lexicographic tie-break.
        const votes = new Map<string, number>();
        for (const s of grouped) {
            votes.set(s.label, (votes.get(s.label) ?? 0) + s.count);
        }
        let label = "";
        let bestVotes = -1;
        for (const [candidate, weight] of votes) {
            if (weight > bestVotes || (weight === bestVotes && candidate < label)) {
                bestVotes = weight;
                label = candidate;
            }
        }

        // Count-weighted mean centroid, re-normalized.
        const dim = grouped[0].centroid.length;
        const mean = new Float64Array(dim);
        let total = 0;
        for (const s of grouped) {
            for (let d = 0; d < dim; d++) {
                mean[d] += s.count * s.centroid[d];
            }
            total += s.count;
        }
        for (let d = 0; d < dim; d++) mean[d] /= Math.max(total, 1);

        // Diagnosis: heaviest source entry carrying the winning label.
        let diagnosis: string | undefined;
        let diagWeight = -1;
        for (const s of grouped) {
            if (s.label === label && s.diagnosis !== undefined && s.count > diagWeight) {
                diagWeight = s.count;
                diagnosis = s.diagnosis;
            }
        }

        // Sorted union of contributing sites (each site field may
        // itself already be a comma-joined union from a prior merge).
        const sites = new Set<string>();
        for (const s of grouped) {
            for (const part of s.site.split(",")) {
                if (part.length > 0) sites.add(part);
            }
        }

        return {
            centroid: Array.from(l2norm(mean)),
            label,
            count: total,
            diagnosis,
            site: [...sites].sort().join(","),
            updatedAt: grouped.reduce((m, s) => Math.max(m, s.updatedAt), 0),
        };
    });

    const json: IRegimeCatalogJson = {
        site,
        matchThr,
        counter: entries.reduce((m, e) => Math.max(m, e.updatedAt), 0),
        entries,
    };
    return RegimeCatalog.import(json);
}
