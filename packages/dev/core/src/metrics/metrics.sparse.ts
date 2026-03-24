/// <summary>
/// Sparse reconstruction metrics for multi-channel spatial data.
///
/// These metrics are designed for data where some channels contain sparse,
/// high-value signals (e.g., obstacle height, velocity in LiDAR grids).
/// Standard MSE hides poor reconstruction of these channels because empty
/// pixels dominate the loss. These metrics isolate and quantify sparse
/// signal preservation.
///
/// References:
///   - Sparse Pixel Recall/Precision/F1: treats sparse pixels as binary events
///   - Energy Retention Ratio: signal-processing inspired amplitude preservation
///   - Top-K Hit Rate: checks if the most important pixels are recovered
///   - Conditional MSE: MSE restricted to sparse regions only
/// </summary>

import type { IChannelMetrics, IMetricsConfig, IReconstructionMetrics } from "./metrics.interfaces";

/// <summary>
/// Compute all reconstruction metrics for a pair of ground truth / prediction arrays.
/// Arrays are in CHW format: [C0_pixel0, C0_pixel1, ..., C1_pixel0, ...].
/// </summary>
export function computeReconstructionMetrics(
    groundTruth: number[],
    prediction: number[],
    config: IMetricsConfig
): IReconstructionMetrics {
    const { width, height, channels } = config;
    const pixelsPerChannel = width * height;
    const totalPixels = channels * pixelsPerChannel;

    if (groundTruth.length !== totalPixels || prediction.length !== totalPixels) {
        throw new Error(
            `Array length mismatch: expected ${totalPixels} (${channels}x${height}x${width}), ` +
            `got gt=${groundTruth.length}, pred=${prediction.length}`
        );
    }

    const minSparse = config.minSparsePixels ?? 3;
    const topKParam = config.topK ?? 0.05;

    const channelMetrics: IChannelMetrics[] = [];
    let globalMseSum = 0;
    const sparseChannelIndices: number[] = [];
    const denseChannelIndices: number[] = [];

    for (let ch = 0; ch < channels; ch++) {
        const offset = ch * pixelsPerChannel;
        const threshold = getThreshold(config.sparseThreshold, ch);
        const topK = resolveTopK(topKParam, pixelsPerChannel);

        const gt = groundTruth.slice(offset, offset + pixelsPerChannel);
        const pred = prediction.slice(offset, offset + pixelsPerChannel);

        const metrics = computeChannelMetrics(gt, pred, ch, threshold, topK, minSparse, config.channelNames);
        channelMetrics.push(metrics);

        // Accumulate global MSE
        for (let i = 0; i < pixelsPerChannel; i++) {
            const diff = pred[i] - gt[i];
            globalMseSum += diff * diff;
        }

        if (metrics.sparsePixelCount >= minSparse) {
            sparseChannelIndices.push(ch);
        } else {
            denseChannelIndices.push(ch);
        }
    }

    const globalMse = globalMseSum / totalPixels;

    // Average sparse metrics across sparse channels only
    let avgF1 = 0, avgERR = 0, avgTopK = 0;
    if (sparseChannelIndices.length > 0) {
        for (const idx of sparseChannelIndices) {
            avgF1 += channelMetrics[idx].sparseF1;
            avgERR += channelMetrics[idx].energyRetention;
            avgTopK += channelMetrics[idx].topKHitRate;
        }
        avgF1 /= sparseChannelIndices.length;
        avgERR /= sparseChannelIndices.length;
        avgTopK /= sparseChannelIndices.length;
    }

    return {
        channels: channelMetrics,
        globalMse,
        globalRmse: Math.sqrt(globalMse),
        avgSparseF1: avgF1,
        avgEnergyRetention: avgERR,
        avgTopKHitRate: avgTopK,
        sparseChannelIndices,
        denseChannelIndices,
    };
}

/// <summary>
/// Compute metrics for a single channel.
/// </summary>
function computeChannelMetrics(
    gt: number[],
    pred: number[],
    channel: number,
    threshold: number,
    topK: number,
    minSparse: number,
    channelNames?: string[]
): IChannelMetrics {
    const n = gt.length;

    // Standard MSE
    let mseSum = 0;
    for (let i = 0; i < n; i++) {
        const d = pred[i] - gt[i];
        mseSum += d * d;
    }
    const mse = mseSum / n;

    // Identify sparse pixels
    let sparseCount = 0;
    for (let i = 0; i < n; i++) {
        if (gt[i] > threshold) sparseCount++;
    }

    // Default values for non-sparse channels
    let sparseMse = 0;
    let sparseRecall = 0;
    let sparsePrecision = 0;
    let sparseF1 = 0;
    let energyRetention = 0;
    let topKHitRate = 0;

    if (sparseCount >= minSparse) {
        // Sparse MSE (conditional)
        let sparseMseSum = 0;
        for (let i = 0; i < n; i++) {
            if (gt[i] > threshold) {
                const d = pred[i] - gt[i];
                sparseMseSum += d * d;
            }
        }
        sparseMse = sparseMseSum / sparseCount;

        // Sparse Recall & Precision
        let truePositive = 0;
        let predPositive = 0;
        for (let i = 0; i < n; i++) {
            const gtSparse = gt[i] > threshold;
            const predSparse = pred[i] > threshold;
            if (gtSparse && predSparse) truePositive++;
            if (predSparse) predPositive++;
        }
        sparseRecall = truePositive / sparseCount;
        sparsePrecision = predPositive > 0 ? truePositive / predPositive : 0;
        sparseF1 = (sparseRecall + sparsePrecision) > 0
            ? 2 * sparseRecall * sparsePrecision / (sparseRecall + sparsePrecision)
            : 0;

        // Energy Retention Ratio
        let energyGt = 0;
        let energyPred = 0;
        for (let i = 0; i < n; i++) {
            if (gt[i] > threshold) {
                energyGt += gt[i] * gt[i];
                energyPred += pred[i] * pred[i];
            }
        }
        energyRetention = energyGt > 0 ? energyPred / energyGt : 0;

        // Top-K Hit Rate
        topKHitRate = computeTopKHitRate(gt, pred, topK);
    }

    return {
        channel,
        name: channelNames?.[channel],
        mse,
        rmse: Math.sqrt(mse),
        sparseMse,
        sparseRecall,
        sparsePrecision,
        sparseF1,
        energyRetention,
        topKHitRate,
        sparsePixelCount: sparseCount,
        totalPixelCount: n,
        sparsity: sparseCount / n,
    };
}

/// <summary>
/// Top-K Hit Rate: fraction of the K highest GT pixels that are also among
/// the K highest predicted pixels.
/// </summary>
function computeTopKHitRate(gt: number[], pred: number[], k: number): number {
    const n = gt.length;
    if (k <= 0 || k > n) return 0;

    // Create indexed arrays and sort descending
    const gtIndexed = gt.map((v, i) => ({ v, i }));
    const predIndexed = pred.map((v, i) => ({ v, i }));

    gtIndexed.sort((a, b) => b.v - a.v);
    predIndexed.sort((a, b) => b.v - a.v);

    // Top-K indices as sets
    const gtTopK = new Set<number>();
    for (let i = 0; i < k; i++) gtTopK.add(gtIndexed[i].i);

    let hits = 0;
    for (let i = 0; i < k; i++) {
        if (gtTopK.has(predIndexed[i].i)) hits++;
    }

    return hits / k;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getThreshold(thresholdConfig: number | number[] | undefined, channel: number): number {
    if (thresholdConfig === undefined) return 0.1;
    if (typeof thresholdConfig === "number") return thresholdConfig;
    return thresholdConfig[channel] ?? 0.1;
}

function resolveTopK(topK: number, pixelsPerChannel: number): number {
    if (topK >= 1) return Math.min(Math.floor(topK), pixelsPerChannel);
    return Math.max(1, Math.floor(topK * pixelsPerChannel));
}
