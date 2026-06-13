import { mlClusterSubPlugin } from "./cluster/index.js";
import { mlDetectSubPlugin } from "./detect/index.js";

export { mlClusterSubPlugin, OnlineClusterNode, createOnlineClusterNode, OnlineClusterer, recluster, sphericalKMeans, cosineSilhouette, l2norm, cosDist } from "./cluster/index.js";
export type { IClusterAlarm, OnlineClustererOptions, AssignResult, ReclusterOptions } from "./cluster/index.js";
export { mlDetectSubPlugin, MotionWatchNode, createMotionWatchNode, MotionWatch } from "./detect/index.js";
export type { IMotionAlarm, MotionWatchOptions, MotionResult, IMotionEvent } from "./detect/index.js";

/**
 * @spikypanda/plugin-ml
 *
 * Open-set machine learning primitives organized as thematic
 * sub-plugins under the `ML.*` namespace:
 *
 *   ML.Cluster   open-set clustering: online cosine assignment with
 *                confidence-gated EMA centroid updates, plus batch
 *                agglomerative re-clustering (absolute link threshold,
 *                k emerges naturally, bounded by k_max).
 *
 *   ML.Detect    per-element detection signatures: the motion watch
 *                learns a frozen healthy reference during warmup and
 *                then flags freezes (rolling path collapse) and jumps
 *                (abnormal step) per vector component. Detection by
 *                MOVEMENT, complementary to ML.Cluster's detection by
 *                POSITION: run both for full coverage.
 *
 * The clustering library is a port of the proven driverv2 code (itself
 * a TS port of python/clustering.py) and is exported directly so
 * headless pipelines can use it without instantiating a graph. Local
 * cluster labels are session-local indices, NEVER stable identifiers:
 * a recluster may renumber every profile. The motion library
 * (MotionWatch) is exported the same way.
 *
 * Type ids follow the canonical `<Theme>.<Sub>:<node>` convention,
 * e.g. `ML.Cluster:online` produces the palette path
 * `ML > Cluster > Online Clusterer (open-set)`.
 */
export default {
    subPlugins: {
        "ML.Cluster": mlClusterSubPlugin,
        "ML.Detect": mlDetectSubPlugin,
    },
};
