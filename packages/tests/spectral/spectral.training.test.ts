// ═══════════════════════════════════════════════════════════════════════════
// Étape B+ (fondation d'entraînement) — le substrat spectral s'entraîne.
//
// Two locks:
//  1. A finite-difference GRADIENT CHECK on the analytic backward (gain/phase),
//     so every downstream milestone (H3+) rests on a verified gradient.
//  2. A convergence test: recover a known target per-band filter from
//     gain=1/phase=0 via Adam — end-to-end differentiability (H3's testable
//     prediction: the gradient traverses encode → sum → filter → decode).
// ═══════════════════════════════════════════════════════════════════════════

import { GraphBuilder, ISpectralGraph, LossFunctions, Optimizers, SpectralInferenceRuntime, SpectralNeuron, SpectralSynapse, SpectralTrainingRuntime } from "spikypanda-core";

const NFFT = 256;
const FS = 1024;
const HALF = 1;
const BANDS = [48, 120, 200];

const zeros = (n: number): number[] => new Array(n).fill(0);
const wrapPi = (x: number): number => {
    let y = (x + Math.PI) % (2 * Math.PI);
    if (y < 0) y += 2 * Math.PI;
    return y - Math.PI;
};

function synthComposite(amps: number[], phases: number[] = zeros(BANDS.length)): number[] {
    const out = new Array(NFFT).fill(0);
    for (let b = 0; b < BANDS.length; b++) {
        const a = amps[b];
        if (!a) continue;
        const w = (2 * Math.PI * BANDS[b]) / FS;
        const ph = phases[b] ?? 0;
        for (let n = 0; n < NFFT; n++) out[n] += a * Math.sin(w * n + ph);
    }
    return out;
}

function buildGraph(gain: number[], phase: number[]) {
    const input = new SpectralNeuron(NFFT, FS, HALF);
    const output = new SpectralNeuron(NFFT, FS, HALF);
    const syn = new SpectralSynapse(input, output, BANDS, gain, phase);
    const graph = new GraphBuilder<SpectralNeuron, SpectralSynapse>().withNodes(input, output).withLinks(syn).build() as unknown as ISpectralGraph;
    return { input, output, syn, graph };
}

function lossOf(runtime: SpectralInferenceRuntime, composite: number[], target: number[]): number {
    const y = runtime.run(composite);
    let l = 0;
    for (let n = 0; n < y.length; n++) {
        const d = y[n] - target[n];
        l += 0.5 * d * d;
    }
    return l;
}

describe("SpectralTrainingRuntime — analytic backward", () => {
    test("gradient check: analytic dGain/dPhase match central finite differences", () => {
        const gain = [0.7, 1.1, 0.9];
        const phase = [0.3, -0.5, 0.8];
        const { syn, graph } = buildGraph([...gain], [...phase]);
        const runtime = new SpectralInferenceRuntime(graph);
        const trainer = new SpectralTrainingRuntime(graph, runtime, LossFunctions.MSE, 0.01, Optimizers.Adam());

        const composite = synthComposite([1, 0.8, 0.6], [0.2, -0.3, 0.5]);
        const target = synthComposite([0.5, 0.5, 0.5]);

        const { grads } = trainer.backward(composite, target);
        const g = grads.get(syn)!;

        const eps = 0.02;
        const tol = (analytic: number): number => 0.01 * (1 + Math.abs(analytic));

        for (let b = 0; b < BANDS.length; b++) {
            // dGain[b]
            syn.gain[b] += eps;
            const gp = lossOf(runtime, composite, target);
            syn.gain[b] -= 2 * eps;
            const gm = lossOf(runtime, composite, target);
            syn.gain[b] += eps;
            const numGain = (gp - gm) / (2 * eps);
            expect(Math.abs(numGain - g.dGain[b])).toBeLessThan(tol(g.dGain[b]));

            // dPhase[b]
            syn.phase[b] += eps;
            const pp = lossOf(runtime, composite, target);
            syn.phase[b] -= 2 * eps;
            const pm = lossOf(runtime, composite, target);
            syn.phase[b] += eps;
            const numPhase = (pp - pm) / (2 * eps);
            expect(Math.abs(numPhase - g.dPhase[b])).toBeLessThan(tol(g.dPhase[b]));
        }
    });
});

describe("SpectralTrainingRuntime — convergence", () => {
    test("recovers a known target per-band filter (gain & phase) from gain=1, phase=0", () => {
        const targetGain = [0.4, 0.9, 0.6];
        const targetPhase = [0.5, -0.8, 1.2];

        // Target output = forward through the target filter.
        const tg = buildGraph([...targetGain], [...targetPhase]);
        const composite = synthComposite([1, 1, 1]);
        const target = new SpectralInferenceRuntime(tg.graph).run(composite);

        // Trainable filter, initialized to identity.
        const { syn, graph } = buildGraph([1, 1, 1], [0, 0, 0]);
        const runtime = new SpectralInferenceRuntime(graph);
        const trainer = new SpectralTrainingRuntime(graph, runtime, LossFunctions.MSE, 0.05, Optimizers.Adam());

        const loss0 = trainer.backward(composite, target).loss;
        let lossN = loss0;
        for (let e = 0; e < 2000; e++) lossN = trainer.trainStep(composite, target);

        expect(lossN).toBeLessThan(loss0 * 1e-3);
        for (let b = 0; b < BANDS.length; b++) {
            expect(Math.abs(syn.gain[b] - targetGain[b])).toBeLessThan(0.02);
            expect(Math.abs(wrapPi(syn.phase[b] - targetPhase[b]))).toBeLessThan(0.05);
        }
    });
});
