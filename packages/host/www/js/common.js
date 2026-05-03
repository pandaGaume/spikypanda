// SpikyPanda — Shared utility functions

/**
 * Sets the hero background image on `.sample-hero`.
 * Tries local `hero.png` first; falls back to the shared spikyPanda wallpaper.
 */
function spInitHero() {
    var hero = document.querySelector(".sample-hero");
    if (!hero) return;
    var local = new Image();
    local.onload = function () {
        hero.style.backgroundImage = "url('hero.png')";
    };
    local.onerror = function () {
        hero.style.backgroundImage = "url('../../images/spikyPanda.png')";
    };
    local.src = "hero.png";
}

document.addEventListener("DOMContentLoaded", spInitHero);

function spLog(logEl, msg) {
    logEl.textContent += msg + "\n";
    logEl.scrollTop = logEl.scrollHeight;
}

function spSetStatus(el, msg) {
    el.textContent = msg;
}

function spSetProgress(el, pct) {
    el.style.width = pct + "%";
}

function oneHot(label, n) {
    const v = new Array(n).fill(0);
    v[label] = 1;
    return v;
}

function argmax(arr) {
    let best = 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > arr[best]) best = i;
    }
    return best;
}

// =============================================================================
// Best-weights checkpointing for SpikyPanda graphs.
//
// These helpers snapshot every learnable parameter of a graph (synapse weights
// and neuron biases) into a plain JS object and restore them later. Combined
// with `spCreateCheckpointer` they implement the standard "save best weights
// seen so far, restore before test" pattern used by the MOx sample and
// available to any other sample that trains an RNN, MLP, CNN or ViT.
//
// Supported neuron types (discovered via duck typing on public fields):
//   - Plain Neuron (input / pass-through)    : no learnable params
//   - MlpNeuron, CnnNeuron, VitNeuron          : `bias: number`
//   - LstmNeuron : `biasForget, biasInput, biasCandidate, biasOutput`
//   - GruNeuron  : `biasReset,  biasUpdate, biasCandidate`
//
// Supported synapse types:
//   - Plain Synapse / MlpSynapse  : `weight: number`
//   - RnnSynapse / VitSynapse     : `weights: number[]` (per-gate / per-head)
//   - CnnSynapse with shared kernel : `kernel.weights: number[]`, saved once
//     per unique kernel object (sharing is preserved on restore).
//
// All new SpikyPanda neuron/synapse types that follow the same naming
// convention work automatically without changes here.
// =============================================================================

/**
 * Snapshot every learnable parameter of `graph` into a plain object.
 * The returned object is self-contained and can be passed later to
 * `spRestoreWeights(graph, snap)`.
 */
function spSnapshotWeights(graph) {
    const synSnap = new Array(graph.links.length);
    const kernelSnap = new Map(); // kernel object -> weights array snapshot

    for (let i = 0; i < graph.links.length; i++) {
        const syn = graph.links[i];
        if (!syn) { synSnap[i] = null; continue; }

        // CNN shared kernel: snapshot the kernel once per unique kernel object.
        if (syn.kernel && Array.isArray(syn.kernel.weights)) {
            if (!kernelSnap.has(syn.kernel)) {
                kernelSnap.set(syn.kernel, syn.kernel.weights.slice());
            }
            synSnap[i] = { type: "kernel" };
            continue;
        }

        if (Array.isArray(syn.weights)) {
            // RnnSynapse, VitSynapse: own per-gate / per-head weight array.
            synSnap[i] = { type: "weights", val: syn.weights.slice() };
        } else if (typeof syn.weight === "number") {
            // Plain Synapse / MlpSynapse / fallback CnnSynapse with no kernel.
            synSnap[i] = { type: "weight", val: syn.weight };
        } else {
            synSnap[i] = null;
        }
    }

    const neuronSnap = new Array(graph.nodes.length);
    for (let i = 0; i < graph.nodes.length; i++) {
        const n = graph.nodes[i];
        if (!n) { neuronSnap[i] = null; continue; }
        if ("biasForget" in n) {
            neuronSnap[i] = {
                type: "lstm",
                bf: n.biasForget, bi: n.biasInput,
                bc: n.biasCandidate, bo: n.biasOutput,
            };
        } else if ("biasReset" in n) {
            neuronSnap[i] = {
                type: "gru",
                br: n.biasReset, bu: n.biasUpdate, bc: n.biasCandidate,
            };
        } else if ("bias" in n) {
            neuronSnap[i] = { type: "scalar", b: n.bias };
        } else {
            neuronSnap[i] = null; // pass-through input neuron
        }
    }

    return { syn: synSnap, kernels: kernelSnap, neu: neuronSnap };
}

/**
 * Restore a snapshot produced by `spSnapshotWeights` back into `graph`.
 * Mutates the graph in place. The snapshot and graph must refer to the same
 * topology (synapse and node arrays in the same order).
 */
function spRestoreWeights(graph, snap) {
    // Shared kernels first, so CNN synapses all see the restored weights.
    if (snap.kernels && snap.kernels.forEach) {
        snap.kernels.forEach(function (savedWeights, kernelObj) {
            for (let k = 0; k < savedWeights.length; k++) {
                kernelObj.weights[k] = savedWeights[k];
            }
        });
    }

    for (let i = 0; i < graph.links.length; i++) {
        const s = snap.syn[i];
        if (!s) continue;
        const syn = graph.links[i];
        if (s.type === "kernel") continue; // handled above
        if (s.type === "weights") {
            for (let g = 0; g < s.val.length; g++) syn.weights[g] = s.val[g];
        } else if (s.type === "weight") {
            syn.weight = s.val;
        }
    }

    for (let i = 0; i < graph.nodes.length; i++) {
        const s = snap.neu[i];
        if (!s) continue;
        const n = graph.nodes[i];
        if (s.type === "lstm") {
            n.biasForget = s.bf; n.biasInput = s.bi;
            n.biasCandidate = s.bc; n.biasOutput = s.bo;
        } else if (s.type === "gru") {
            n.biasReset = s.br; n.biasUpdate = s.bu; n.biasCandidate = s.bc;
        } else if (s.type === "scalar") {
            n.bias = s.b;
        }
    }
}

/**
 * Create a best-weights checkpointer for `graph`. Call `update(epoch, avgLoss)`
 * after each epoch, then `restore()` once at the end of training. The
 * checkpointer keeps the graph in its best-so-far state automatically.
 *
 * Options:
 *   - warmup: ignore improvements during the first N epochs (default 5).
 *             Useful to skip the chaotic early phase of training.
 *
 * Example:
 *   const ckpt = spCreateCheckpointer(graph, { warmup: 5 });
 *   for (let e = 0; e < epochs; e++) {
 *       const avgLoss = runOneEpoch();
 *       const isNewBest = ckpt.update(e, avgLoss);
 *       log(`Epoch ${e+1} - ${avgLoss.toFixed(6)}${isNewBest ? " *" : ""}`);
 *   }
 *   const info = ckpt.restore();  // { bestEpoch, bestLoss, hasCheckpoint }
 *   if (info.hasCheckpoint) log(`Restored epoch ${info.bestEpoch}`);
 */
function spCreateCheckpointer(graph, opts) {
    opts = opts || {};
    const warmup = (opts.warmup !== undefined) ? opts.warmup : 5;
    let bestLoss = Infinity;
    let bestEpoch = -1;
    let bestSnap = null;
    return {
        /**
         * Update the checkpointer with a fresh epoch loss. Snapshots the graph
         * if this is a new best (and we are past the warmup window).
         * Returns true if a new best was recorded.
         */
        update: function (epoch, avgLoss) {
            if (epoch < warmup) return false;
            if (avgLoss < bestLoss) {
                bestLoss = avgLoss;
                bestEpoch = epoch + 1;
                bestSnap = spSnapshotWeights(graph);
                return true;
            }
            return false;
        },
        /**
         * Restore the best weights into the graph and return summary info:
         *   { bestEpoch, bestLoss, hasCheckpoint }.
         * Safe to call even if no checkpoint was ever taken (no-op).
         */
        restore: function () {
            if (bestSnap !== null) {
                spRestoreWeights(graph, bestSnap);
            }
            return {
                bestEpoch: bestEpoch,
                bestLoss: bestLoss,
                hasCheckpoint: bestSnap !== null,
            };
        },
        /** Current best loss seen since training started. */
        getBestLoss: function () { return bestLoss; },
        /** Epoch (1-based) at which the best loss was observed. */
        getBestEpoch: function () { return bestEpoch; },
    };
}
