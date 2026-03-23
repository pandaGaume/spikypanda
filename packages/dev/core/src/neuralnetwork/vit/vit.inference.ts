import { IVitGraph } from "./vit.interfaces";
import { softmax, gelu, layerNormForward } from "./vit.math";

/// <summary>
/// Inference runtime for Vision Transformer graphs.
///
/// Uses weight matrices stored on the graph (not synapses) for all
/// transformer computations. This avoids the combinatorial explosion
/// of O(numTokens^2 * embedDim) synapses.
///
/// Processing phases:
///   1. Patch embedding (linear projection from pixels)
///   2. Add positional embeddings + class token
///   3. For each transformer block:
///      a. LayerNorm -> Multi-head self-attention -> Residual
///      b. LayerNorm -> MLP (GELU) -> Residual
///   4. Classification head (softmax)
/// </summary>
export class VitInferenceRuntime {
    private _graph: IVitGraph;

    /// <summary>Token activations: [numTokens][embedDim]</summary>
    public tokens: number[][] = [];

    /// <summary>Caches for backpropagation</summary>
    public layerNormCache: Array<{
        mean: number[]; invStd: number[]; normalized: number[][];
    }> = [];

    public attentionCache: Array<{
        Q: number[][]; K: number[][]; V: number[][];
        scores: number[][][]; // [head][queryToken][keyToken]
        attnOut: number[][]; // [numTokens][embedDim]
    }> = [];

    public mlpCache: Array<{
        preGelu: number[][]; // [numTokens][mlpDim] - before GELU
        hidden: number[][]; // [numTokens][mlpDim] - after GELU
    }> = [];

    public residualCache: Array<{
        preAttn: number[][]; preMlp: number[][];
    }> = [];

    constructor(graph: IVitGraph) {
        this._graph = graph;
    }

    /// <summary>
    /// Run inference on a single image.
    /// Input: flat pixel array [H * W * C] in row-major, channel-last order.
    /// Returns: class probabilities [numClasses].
    /// </summary>
    public run(inputPixels: number[]): number[] {
        const g = this._graph;
        const numTokens = g.numPatches + 1;
        const embedDim = g.embedDim;
        const numHeads = g.numHeads;
        const headDim = embedDim / numHeads;
        const patchSize = g.patchSize;
        // Reset caches
        this.layerNormCache = [];
        this.attentionCache = [];
        this.mlpCache = [];
        this.residualCache = [];

        // =====================================================================
        // 1. Patch embedding: pixels -> [numPatches][embedDim]
        // =====================================================================
        this.tokens = [];

        // Class token (token 0)
        this.tokens.push([...g.classTokenValues]);

        // Patch tokens
        const imgChannels = Math.round(inputPixels.length / (g.numPatches * patchSize * patchSize));
        const imgWidth = Math.round(Math.sqrt(inputPixels.length / imgChannels));
        const patchesX = imgWidth / patchSize;

        for (let p = 0; p < g.numPatches; p++) {
            const patchRow = Math.floor(p / patchesX);
            const patchCol = p % patchesX;
            const tokenEmbed = new Array(embedDim);

            for (let e = 0; e < embedDim; e++) {
                let sum = g.patchEmbedBias[e];
                let pixIdx = 0;
                for (let py = 0; py < patchSize; py++) {
                    for (let px = 0; px < patchSize; px++) {
                        for (let ch = 0; ch < imgChannels; ch++) {
                            const imgY = patchRow * patchSize + py;
                            const imgX = patchCol * patchSize + px;
                            const flatIdx = (imgY * imgWidth + imgX) * imgChannels + ch;
                            sum += inputPixels[flatIdx] * g.patchEmbedWeights[pixIdx * embedDim + e];
                            pixIdx++;
                        }
                    }
                }
                tokenEmbed[e] = sum;
            }
            this.tokens.push(tokenEmbed);
        }

        // =====================================================================
        // 2. Add positional embeddings
        // =====================================================================
        for (let t = 0; t < numTokens; t++) {
            for (let e = 0; e < embedDim; e++) {
                this.tokens[t][e] += g.positionalEmbeddings[t][e];
            }
        }

        // =====================================================================
        // 3. Transformer blocks
        // =====================================================================
        for (let block = 0; block < g.numBlocks; block++) {
            const bw = g.blockWeights[block];
            const lnIdx = block * 2;

            // Save pre-attention for residual
            const preAttn = this.tokens.map(t => [...t]);

            // ----- LayerNorm 1 -----
            const ln1 = g.layerNorms[lnIdx];
            const ln1Cache = { mean: [] as number[], invStd: [] as number[], normalized: [] as number[][] };
            for (let t = 0; t < numTokens; t++) {
                const r = layerNormForward(this.tokens[t], ln1);
                this.tokens[t] = r.output;
                ln1Cache.mean.push(r.mean);
                ln1Cache.invStd.push(r.invStd);
                ln1Cache.normalized.push(r.normalized);
            }
            this.layerNormCache.push(ln1Cache);

            // ----- Multi-head self-attention -----
            // Compute Q, K, V for all tokens: [numTokens][embedDim]
            const Q: number[][] = [];
            const K: number[][] = [];
            const V: number[][] = [];

            for (let t = 0; t < numTokens; t++) {
                const q = new Array(embedDim).fill(0);
                const k = new Array(embedDim).fill(0);
                const v = new Array(embedDim).fill(0);
                for (let e = 0; e < embedDim; e++) {
                    for (let s = 0; s < embedDim; s++) {
                        q[e] += this.tokens[t][s] * bw.qkvWeights[0 * embedDim * embedDim + s * embedDim + e];
                        k[e] += this.tokens[t][s] * bw.qkvWeights[1 * embedDim * embedDim + s * embedDim + e];
                        v[e] += this.tokens[t][s] * bw.qkvWeights[2 * embedDim * embedDim + s * embedDim + e];
                    }
                    q[e] += bw.qkvBias[0 * embedDim + e];
                    k[e] += bw.qkvBias[1 * embedDim + e];
                    v[e] += bw.qkvBias[2 * embedDim + e];
                }
                Q.push(q); K.push(k); V.push(v);
            }

            // Attention per head
            const allScores: number[][][] = []; // [head][query][key]
            const attnOut: number[][] = new Array(numTokens).fill(null).map(() => new Array(embedDim).fill(0));

            for (let h = 0; h < numHeads; h++) {
                const offset = h * headDim;
                const scale = Math.sqrt(headDim);
                const headScores: number[][] = [];

                for (let tq = 0; tq < numTokens; tq++) {
                    const logits = new Array(numTokens);
                    for (let tk = 0; tk < numTokens; tk++) {
                        let dot = 0;
                        for (let d = 0; d < headDim; d++) {
                            dot += Q[tq][offset + d] * K[tk][offset + d];
                        }
                        logits[tk] = dot / scale;
                    }
                    const scores = softmax(logits);
                    headScores.push(scores);

                    // Weighted sum of V
                    for (let d = 0; d < headDim; d++) {
                        let val = 0;
                        for (let tk = 0; tk < numTokens; tk++) {
                            val += scores[tk] * V[tk][offset + d];
                        }
                        attnOut[tq][offset + d] = val;
                    }
                }
                allScores.push(headScores);
            }

            this.attentionCache.push({ Q, K, V, scores: allScores, attnOut: attnOut.map(t => [...t]) });

            // Output projection
            const projected: number[][] = [];
            for (let t = 0; t < numTokens; t++) {
                const proj = new Array(embedDim).fill(0);
                for (let e = 0; e < embedDim; e++) {
                    for (let s = 0; s < embedDim; s++) {
                        proj[e] += attnOut[t][s] * bw.projWeights[s * embedDim + e];
                    }
                    proj[e] += bw.projBias[e];
                }
                projected.push(proj);
            }

            // Residual 1: add pre-attention input
            for (let t = 0; t < numTokens; t++) {
                for (let e = 0; e < embedDim; e++) {
                    this.tokens[t][e] = preAttn[t][e] + projected[t][e];
                }
            }

            // Save pre-MLP for residual
            const preMlp = this.tokens.map(t => [...t]);

            // ----- LayerNorm 2 -----
            const ln2 = g.layerNorms[lnIdx + 1];
            const ln2Cache = { mean: [] as number[], invStd: [] as number[], normalized: [] as number[][] };
            for (let t = 0; t < numTokens; t++) {
                const r = layerNormForward(this.tokens[t], ln2);
                this.tokens[t] = r.output;
                ln2Cache.mean.push(r.mean);
                ln2Cache.invStd.push(r.invStd);
                ln2Cache.normalized.push(r.normalized);
            }
            this.layerNormCache.push(ln2Cache);

            // ----- MLP: embedDim -> mlpDim (GELU) -> embedDim -----
            const mlpDim = embedDim * g.mlpRatio;
            const preGeluAll: number[][] = [];
            const hiddenAll: number[][] = [];
            const mlpOut: number[][] = [];

            for (let t = 0; t < numTokens; t++) {
                // Hidden layer
                const preGelu = new Array(mlpDim);
                const hidden = new Array(mlpDim);
                for (let m = 0; m < mlpDim; m++) {
                    let sum = bw.mlp1Bias[m];
                    for (let e = 0; e < embedDim; e++) {
                        sum += this.tokens[t][e] * bw.mlp1Weights[e * mlpDim + m];
                    }
                    preGelu[m] = sum;
                    hidden[m] = gelu(sum);
                }
                preGeluAll.push(preGelu);
                hiddenAll.push(hidden);

                // Output layer
                const out = new Array(embedDim);
                for (let e = 0; e < embedDim; e++) {
                    let sum = bw.mlp2Bias[e];
                    for (let m = 0; m < mlpDim; m++) {
                        sum += hidden[m] * bw.mlp2Weights[m * embedDim + e];
                    }
                    out[e] = sum;
                }
                mlpOut.push(out);
            }

            this.mlpCache.push({ preGelu: preGeluAll, hidden: hiddenAll });

            // Residual 2: add pre-MLP input
            for (let t = 0; t < numTokens; t++) {
                for (let e = 0; e < embedDim; e++) {
                    this.tokens[t][e] = preMlp[t][e] + mlpOut[t][e];
                }
            }

            this.residualCache.push({ preAttn, preMlp });
        }

        // =====================================================================
        // 4. Classification head: class token -> softmax
        // =====================================================================
        const classToken = this.tokens[0];
        const logits = new Array(g.numClasses);
        for (let cls = 0; cls < g.numClasses; cls++) {
            let sum = g.headBias[cls];
            for (let e = 0; e < embedDim; e++) {
                sum += classToken[e] * g.headWeights[e * g.numClasses + cls];
            }
            logits[cls] = sum;
        }

        return softmax(logits);
    }

    public getTokens(): number[][] {
        return this.tokens;
    }

    public clearContext(): void {
        this.tokens = [];
        this.layerNormCache = [];
        this.attentionCache = [];
        this.mlpCache = [];
        this.residualCache = [];
    }
}
