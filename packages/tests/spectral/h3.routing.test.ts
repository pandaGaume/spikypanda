// ═══════════════════════════════════════════════════════════════════════════
// H3 — a differentiable frequency response learns a context-dependent BLEND of
// two behaviours on ONE connection; hard (all-or-nothing) routing cannot.
//
// This is the paper's thesis made testable: « plusieurs chemins sur la même
// connexion (pas de duplication), sans décision brutale — on additionne et on
// filtre, deux opérations parfaitement lisses ». The discriminating regime is a
// SMOOTH blend, not a sharp switch (a sharp switch is a hard decision that BOTH
// substrates struggle to learn — see the note in RESULTATS-H3.md).
//
// Task: two bands A(48Hz), B(120Hz); context c∈[0,1]. Target is the linear
// crossfade  (1−c)·passA + c·passB  — both behaviours coexist, dosed by c.
// Input is always the composite A+B plus c.
//
//  (A) DISCRETE hard gate (built from scratch — no routing primitive exists):
//      out = σ(k·(w·c+b))·passA + (1−σ)·passB with a STEEP k (≈ step). It can
//      only SELECT a band per c, so it cannot represent a graded blend — the
//      residual floor is structural, and the steep gate's gradient vanishes
//      once saturated.
//  (B) FREQUENCY response: one synapse whose per-band REAL gain is an affine
//      function of c — gain_b(c)=α_b·c+β_b — i.e. a context-dosed frequency
//      response. Superposition + per-band filtering are smooth & differentiable
//      (analytic gradient via SpectralTrainingRuntime), and represent the blend
//      EXACTLY (α_A=−1,β_A=1 ; α_B=1,β_B=0).
//
// Verdict over S seeded inits: the frequency model reaches a far lower loss and
// a higher success rate than hard routing.
// ═══════════════════════════════════════════════════════════════════════════

import { GraphBuilder, ISpectralGraph, LossFunctions, Optimizers, SpectralInferenceRuntime, SpectralNeuron, SpectralSynapse, SpectralTrainingRuntime } from "spikypanda-core";

const NFFT = 256;
const FS = 1024;
const HALF = 1;
const A = 48;
const B = 120;
const BANDS = [A, B];

const CGRID = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95];
const SEEDS = 20;
const EPOCHS = 500;

// ── deterministic PRNG so the whole comparison is reproducible ──────────────
function mulberry32(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const uniform = (rng: () => number, lo: number, hi: number): number => lo + (hi - lo) * rng();

// ── signals ─────────────────────────────────────────────────────────────────
function band(freq: number, amp: number): number[] {
    const out = new Array(NFFT).fill(0);
    const w = (2 * Math.PI * freq) / FS;
    for (let n = 0; n < NFFT; n++) out[n] = amp * Math.sin(w * n);
    return out;
}
const passA = band(A, 1);
const passB = band(B, 1);
const composite = passA.map((v, n) => v + passB[n]);
const target = (c: number): number[] => passA.map((v, n) => (1 - c) * v + c * passB[n]);

const sse = (o: number[], t: number[]): number => {
    let l = 0;
    for (let n = 0; n < o.length; n++) {
        const d = o[n] - t[n];
        l += 0.5 * d * d;
    }
    return l;
};

// ── tiny Adam over a flat parameter vector ──────────────────────────────────
class Adam {
    private m: number[];
    private v: number[];
    private t = 0;
    public constructor(
        n: number,
        private readonly lr: number,
        private readonly b1 = 0.9,
        private readonly b2 = 0.999,
        private readonly eps = 1e-8
    ) {
        this.m = new Array(n).fill(0);
        this.v = new Array(n).fill(0);
    }
    public step(params: number[], grads: number[]): void {
        this.t++;
        for (let i = 0; i < params.length; i++) {
            this.m[i] = this.b1 * this.m[i] + (1 - this.b1) * grads[i];
            this.v[i] = this.b2 * this.v[i] + (1 - this.b2) * grads[i] * grads[i];
            const mHat = this.m[i] / (1 - Math.pow(this.b1, this.t));
            const vHat = this.v[i] / (1 - Math.pow(this.b2, this.t));
            params[i] -= (this.lr * mHat) / (Math.sqrt(vHat) + this.eps);
        }
    }
}

interface RunResult {
    finalLoss: number;
    epochsToTau: number; // -1 if never reached
}

// ── (A) discrete hard-gate model ────────────────────────────────────────────
function trainDiscrete(seed: number, tau: number): RunResult {
    const rng = mulberry32(seed);
    const params = [uniform(rng, -2, 2), uniform(rng, -1, 1)]; // [w, b]
    const k = 8; // steep ≈ hard gate (all-or-nothing routing)
    const opt = new Adam(2, 0.05);
    let finalLoss = Infinity;
    let epochsToTau = -1;

    for (let e = 0; e < EPOCHS; e++) {
        const grad = [0, 0];
        let epochLoss = 0;
        for (const c of CGRID) {
            const gate = 1 / (1 + Math.exp(-k * (params[0] * c + params[1])));
            const tgt = target(c);
            let dGate = 0;
            for (let n = 0; n < NFFT; n++) {
                const o = gate * passA[n] + (1 - gate) * passB[n];
                const d = o - tgt[n];
                epochLoss += 0.5 * d * d;
                dGate += d * (passA[n] - passB[n]);
            }
            const gs = gate * (1 - gate);
            grad[0] += dGate * k * c * gs;
            grad[1] += dGate * k * gs;
        }
        opt.step(params, grad);
        finalLoss = epochLoss;
        if (epochLoss < tau && epochsToTau < 0) epochsToTau = e;
    }
    return { finalLoss, epochsToTau };
}

// ── (B) frequency-response model (context-dosed per-band real gain) ─────────
function buildFreqModel() {
    const input = new SpectralNeuron(NFFT, FS, HALF);
    const output = new SpectralNeuron(NFFT, FS, HALF);
    const syn = new SpectralSynapse(input, output, BANDS, [1, 1], [0, 0]);
    const graph = new GraphBuilder<SpectralNeuron, SpectralSynapse>().withNodes(input, output).withLinks(syn).build() as unknown as ISpectralGraph;
    const runtime = new SpectralInferenceRuntime(graph);
    const trainer = new SpectralTrainingRuntime(graph, runtime, LossFunctions.MSE, 0.05, Optimizers.Adam());
    return { syn, trainer };
}

function trainFreq(seed: number, tau: number): RunResult {
    const rng = mulberry32(seed);
    const { syn, trainer } = buildFreqModel();
    // params = [αA, βA, αB, βB]; gain_b(c) = α_b·c + β_b
    const params = [uniform(rng, -1, 1), uniform(rng, -1, 1), uniform(rng, -1, 1), uniform(rng, -1, 1)];
    const opt = new Adam(4, 0.05);
    let finalLoss = Infinity;
    let epochsToTau = -1;

    for (let e = 0; e < EPOCHS; e++) {
        const grad = [0, 0, 0, 0];
        let epochLoss = 0;
        for (const c of CGRID) {
            syn.gain[0] = params[0] * c + params[1];
            syn.gain[1] = params[2] * c + params[3];
            const { loss, grads } = trainer.backward(composite, target(c));
            const g = grads.get(syn)!;
            grad[0] += g.dGain[0] * c;
            grad[1] += g.dGain[0];
            grad[2] += g.dGain[1] * c;
            grad[3] += g.dGain[1];
            epochLoss += loss;
        }
        opt.step(params, grad);
        finalLoss = epochLoss;
        if (epochLoss < tau && epochsToTau < 0) epochsToTau = e;
    }
    return { finalLoss, epochsToTau };
}

function summarize(results: RunResult[], tau: number) {
    const failRate = results.filter((r) => r.finalLoss >= tau).length / results.length;
    const conv = results
        .filter((r) => r.epochsToTau >= 0)
        .map((r) => r.epochsToTau)
        .sort((a, b) => a - b);
    const medianConv = conv.length ? conv[Math.floor(conv.length / 2)] : -1;
    const losses = results.map((r) => r.finalLoss).sort((a, b) => a - b);
    const medianLoss = losses[Math.floor(losses.length / 2)];
    return { failRate, medianConv, medianLoss };
}

describe("H3 — frequency response vs hard routing", () => {
    test("the differentiable frequency response learns the blend exactly; hard routing leaves a structural residual", () => {
        // "No routing" floor: output 0.5·(A+B) regardless of c.
        let noRoute = 0;
        for (const c of CGRID)
            noRoute += sse(
                composite.map((v) => 0.5 * v),
                target(c)
            );
        const tau = 0.02 * noRoute; // "learned the blend" threshold

        const discrete: RunResult[] = [];
        const freq: RunResult[] = [];
        for (let s = 1; s <= SEEDS; s++) {
            discrete.push(trainDiscrete(s * 1000 + 7, tau));
            freq.push(trainFreq(s * 1000 + 7, tau));
        }
        const dS = summarize(discrete, tau);
        const fS = summarize(freq, tau);
        // eslint-disable-next-line no-console
        console.log("H3", JSON.stringify({ tau: +tau.toFixed(3), noRoute: +noRoute.toFixed(1), discrete: dS, freq: fS }));

        // (1) The frequency response represents & learns the continuous blend
        //     essentially exactly, on every seed.
        expect(fS.medianLoss).toBeLessThan(1e-6);
        expect(fS.failRate).toBe(0);
        // (2) It strictly dominates gate routing: its residual is orders of
        //     magnitude below the hard gate's.
        expect(fS.medianLoss).toBeLessThan(0.01 * dS.medianLoss);
        // (3) A single hard gate cannot blend two behaviours on one connection —
        //     it leaves a structural residual (sigmoid ≠ graded superposition).
        expect(dS.medianLoss).toBeGreaterThan(0.1);
    });
});
