import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createOnlineClusterNode, OnlineClusterNode } from "./online-cluster.node.js";

export { OnlineClusterNode, createOnlineClusterNode };
export type { IClusterAlarm } from "./online-cluster.node.js";
export { OnlineClusterer, recluster, sphericalKMeans, cosineSilhouette, l2norm, cosDist } from "./clustering.js";
export type { OnlineClustererOptions, AssignResult, ReclusterOptions } from "./clustering.js";

/**
 * `ML.Cluster`: open-set clustering.
 *
 * V1 ships one node:
 *   online   open-set online cosine clustering (assign / EMA-update /
 *            spawn) with batch agglomerative recluster on demand (the
 *            `_recluster` control input; a control-plane trigger so it
 *            never gates the embedding stream) and a wire-compatible
 *            Alert Bus alarm on every new regime.
 *
 * The underlying library (OnlineClusterer, recluster, sphericalKMeans,
 * cosineSilhouette) is exported alongside the node so headless
 * pipelines can cluster without instantiating a graph.
 */
export const mlClusterSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("ML.Cluster:online", () => createOnlineClusterNode() as never, {
            label: "Online Clusterer (open-set)",
            docPath: ctx.assetUrl("docs/ml/cluster/online.md"),
            category: "ML.Cluster",
            // The recluster trigger is NOT listed here: it lives in the
            // control plane (`_recluster` in the node's
            // controlInputPorts, drained by processControlInputs), so
            // it never counts toward the scheduler's required-inputs
            // gate the way a wired data input would.
            inputPorts: [{ slot: "embedding", optional: false, type: "tensor" }],
            outputPorts: [
                { slot: "label", optional: false, type: "float" },
                { slot: "is_new", optional: false, type: "boolean" },
                { slot: "distance", optional: false, type: "float" },
                { slot: "k", optional: false, type: "float" },
                // Capacity 4 mirrors the runtime descriptor: a fire
                // draining several embeddings can burst one alarm
                // (NEW_REGIME or REGIME_DRIFT) per assignment.
                { slot: "alarm", optional: false, type: "any", capacity: 4 },
            ],
        });
    },
};
