#!/usr/bin/env node
/*
 * Étape A — Preuve de principe du substrat multi-fréquence (hypothèse H1)
 * ----------------------------------------------------------------------
 * Zéro dépendance. Lancer :  node multipath-standalone.mjs
 *
 * Ce script reproduit, en autonome, la composition décrite dans
 * 01-BUILD-SPEC.md (§2 Étape A), sans le moteur du dépôt :
 *
 *     x_b (motif) ─► Oscillateur(f_b, gain = w_b·x_b) ─┐
 *                                                       ├─► Σ  (UNE arête)
 *     ... une porteuse par bande ...                    ┘
 *                                                       │
 *                                            DFT ─► magnitude ─► lecture par bande
 *
 * On mesure deux choses, par bande b :
 *   - FIDÉLITÉ : l'amplitude décodée à f_b vaut-elle bien w_b·x_b ?
 *   - FUITE    : quand on n'excite QUE la bande j≠b, quelle énergie
 *                apparaît quand même à f_b ? (rapport sur l'utile)
 *
 * La matrice D[b][j] = amplitude décodée à la bande b quand seule la
 * bande j est excitée. La diagonale = signal utile ; le hors-diagonale
 * = fuite. Cible du jalon : fuite max < 5 %.
 */

// ── DFT sur un seul bin (O(N)), suffisant : on ne lit que quelques bins ──
function magAtBin(signal, win, k, N) {
  let re = 0, im = 0;
  const c = (-2 * Math.PI * k) / N;
  for (let n = 0; n < N; n++) {
    const s = signal[n] * win[n];
    re += s * Math.cos(c * n);
    im += s * Math.sin(c * n);
  }
  return Math.hypot(re, im);
}

// Fenêtres
function rectWindow(N) { return new Float64Array(N).fill(1); }
function hannWindow(N) {
  const w = new Float64Array(N);
  for (let n = 0; n < N; n++) w[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)));
  return w;
}
const windowSum = (win) => win.reduce((a, v) => a + v, 0);

// Génère la porteuse d'une bande, gain g, sur N échantillons à fs
function carrier(freq, gain, N, fs) {
  const s = new Float64Array(N);
  for (let n = 0; n < N; n++) s[n] = gain * Math.sin((2 * Math.PI * freq * n) / fs);
  return s;
}

// Décode l'amplitude à une fréquence f (lit le bin le plus proche)
function decodeAmplitude(signal, win, f, N, fs) {
  const k = Math.round((f * N) / fs);
  const mag = magAtBin(signal, win, k, N);
  return (2 * mag) / windowSum(win); // gain cohérent de la fenêtre
}

// ── Coeur : matrice décode[b][j] en excitant une seule bande à la fois ──
function measure({ fs, N, freqs, patterns, weights, win, label }) {
  const K = freqs.length;
  // gain par bande porté par "l'arête" = poids × motif
  const gains = freqs.map((_, b) => weights[b] * patterns[b]);

  // D[b][j] : décodage à la bande b quand SEULE la bande j est active
  const D = Array.from({ length: K }, () => new Float64Array(K));
  for (let j = 0; j < K; j++) {
    const only = carrier(freqs[j], gains[j], N, fs); // une seule porteuse
    for (let b = 0; b < K; b++) D[b][j] = decodeAmplitude(only, win, freqs[b], N, fs);
  }

  // Vérif de cohérence : le signal composite (toutes bandes superposées)
  // décode-t-il comme la somme des contributions ? (linéarité = superposition)
  const composite = new Float64Array(N);
  for (let j = 0; j < K; j++) {
    const c = carrier(freqs[j], gains[j], N, fs);
    for (let n = 0; n < N; n++) composite[n] += c[n];
  }

  console.log(`\n=== ${label} ===`);
  console.log(`fs=${fs} Hz, N=${N}, bandes f=[${freqs.join(", ")}] Hz`);
  console.log(`motifs x=[${patterns.join(", ")}]  poids w=[${weights.join(", ")}]  ->  gains attendus=[${gains.map((g) => g.toFixed(3)).join(", ")}]`);

  // Fidélité + fuite par bande
  let worstLeak = 0;
  console.log("\n  bande |  attendu | décodé(composite) |  fuite max entrante");
  console.log("  ------+----------+-------------------+--------------------");
  for (let b = 0; b < K; b++) {
    const useful = Math.abs(D[b][b]);
    let leak = 0;
    for (let j = 0; j < K; j++) if (j !== b) leak = Math.max(leak, Math.abs(D[b][j]));
    const ratio = useful > 0 ? leak / useful : Infinity;
    worstLeak = Math.max(worstLeak, ratio);
    const decodedComposite = decodeAmplitude(composite, win, freqs[b], N, fs);
    console.log(
      `    ${b}   |  ${gains[b].toFixed(3)}  |      ${decodedComposite.toFixed(3)}      |  ${(ratio * 100).toFixed(4)} %`
    );
  }

  console.log(`\n  Matrice décode D[b][j]  (lignes = bande lue, colonnes = bande excitée)`);
  console.log(`  diagonale = signal utile ; hors-diagonale = fuite`);
  for (let b = 0; b < K; b++) {
    console.log("   " + Array.from(D[b]).map((v) => v.toExponential(2).padStart(10)).join(" "));
  }

  const pass = worstLeak < 0.05;
  console.log(`\n  >> Fuite inter-bande MAX = ${(worstLeak * 100).toFixed(4)} %  ->  ${pass ? "PASS (<5%)" : "FAIL (>=5%)"}`);
  return { worstLeak, pass };
}

// ── Scénarios ───────────────────────────────────────────────────────────
const patterns = [0.8, 0.5, 0.3];
const weights = [1.0, 0.6, 1.3];

// 1) Cohérent (fréquences alignées sur les bins) + fenêtre rectangulaire.
//    Cas idéal : l'orthogonalité de la DFT annule la fuite (≈ bruit machine).
const s1 = measure({
  fs: 1000, N: 1000, freqs: [50, 120, 200],
  patterns, weights, win: rectWindow(1000),
  label: "Scénario 1 — cohérent + rectangulaire (séparation idéale)",
});

// 2) Non-cohérent (fréquences hors bins) + fenêtre de Hann.
//    Cas réaliste : la fenêtre maîtrise la fuite tant que les bandes
//    sont bien espacées. Attention : léger déficit de fidélité (scalloping).
const s2 = measure({
  fs: 1000, N: 1000, freqs: [50.5, 120.3, 200.7],
  patterns, weights, win: hannWindow(1000),
  label: "Scénario 2 — non-cohérent + Hann (réaliste, bandes espacées)",
});

// 3) Bandes RAPPROCHÉES mais SUR les bins + Hann : reste propre (contrôle).
const s3 = measure({
  fs: 1000, N: 1000, freqs: [100, 106, 112],
  patterns, weights, win: hannWindow(1000),
  label: "Scénario 3 — bandes rapprochées SUR les bins + Hann (contrôle)",
});

// 4) VRAI stress : bandes rapprochées ET hors-bins. C'est là que la fuite mord.
const s4 = measure({
  fs: 1000, N: 1000, freqs: [100.5, 102.5, 104.5],
  patterns, weights, win: hannWindow(1000),
  label: "Scénario 4 — bandes rapprochées + HORS bins + Hann (vrai stress)",
});

// ── Balayage : trouver l'écart minimal (en bins) qui tient sous 5% ─────────
// Donne directement la DENSITÉ MAX de canaux par arête.
// K bandes équi-espacées de `delta` bins, décalées de 0.5 bin (pire cas
// hors-bin), pour chaque fenêtre. On lit la fuite max sur toutes les bandes.
function worstLeakForSpacing(deltaBins, win, N, fs, K = 5, baseBin = 120, offset = 0.5) {
  const freqs = [];
  for (let i = 0; i < K; i++) freqs.push(((baseBin + i * deltaBins + offset) * fs) / N);
  const carriers = freqs.map((f) => carrier(f, 1, N, fs)); // gains unitaires
  let worst = 0;
  for (let b = 0; b < K; b++) {
    const useful = decodeAmplitude(carriers[b], win, freqs[b], N, fs);
    for (let j = 0; j < K; j++) {
      if (j === b) continue;
      const leak = decodeAmplitude(carriers[j], win, freqs[b], N, fs);
      worst = Math.max(worst, Math.abs(leak) / Math.abs(useful));
    }
  }
  return worst;
}

function sweep(win, winName, N, fs) {
  console.log(`\n=== Balayage densité — fenêtre ${winName} (hors-bins, offset 0.5) ===`);
  console.log("  écart(bins) |  écart(Hz) | fuite max | tient <5% ?");
  console.log("  ------------+-----------+-----------+------------");
  const deltas = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20];
  let threshold = null;
  for (const d of deltas) {
    const w = worstLeakForSpacing(d, win, N, fs);
    const ok = w < 0.05;
    if (ok && threshold === null) threshold = d;
    console.log(`      ${String(d).padStart(2)}      |   ${String(((d * fs) / N).toFixed(0)).padStart(4)}   |  ${(w * 100).toFixed(3).padStart(7)} % |  ${ok ? "oui" : "NON"}`);
  }
  // usable ≈ 40% de N (on évite DC et les bords de Nyquist)
  const usableBins = Math.floor(0.4 * N);
  if (threshold !== null) {
    const maxChannels = Math.floor(usableBins / threshold);
    console.log(`  -> écart minimal sous 5% : ${threshold} bins (${((threshold * fs) / N).toFixed(0)} Hz)`);
    console.log(`  -> densité max estimée : ~${maxChannels} canaux sur la plage utile (${usableBins} bins)`);
    return { threshold, maxChannels };
  }
  console.log("  -> aucun écart testé ne tient sous 5% (resserrer le pas ou changer de fenêtre)");
  return { threshold: null, maxChannels: 0 };
}

const sweepHann = sweep(hannWindow(1000), "Hann", 1000, 1000);
const sweepRect = sweep(rectWindow(1000), "rectangulaire", 1000, 1000);

console.log("\n============================================================");
console.log("RÉSUMÉ");
console.log(`  S1 cohérent/rect          : fuite max ${(s1.worstLeak * 100).toFixed(4)} %  ${s1.pass ? "PASS" : "FAIL"}`);
console.log(`  S2 non-coh/Hann           : fuite max ${(s2.worstLeak * 100).toFixed(4)} %  ${s2.pass ? "PASS" : "FAIL"}`);
console.log(`  S3 rapprochées/bin/Hann   : fuite max ${(s3.worstLeak * 100).toFixed(4)} %  ${s3.pass ? "PASS" : "FAIL"}`);
console.log(`  S4 stress hors-bin/Hann   : fuite max ${(s4.worstLeak * 100).toFixed(4)} %  ${s4.pass ? "PASS" : "FAIL"}`);
console.log(`  Densité (Hann)  : écart min ${sweepHann.threshold ?? "?"} bins  -> ~${sweepHann.maxChannels} canaux`);
console.log(`  Densité (rect)  : écart min ${sweepRect.threshold ?? "?"} bins  -> ~${sweepRect.maxChannels} canaux`);
console.log("============================================================");
console.log("H1 est soutenue par S1/S2/S3. S4 + balayage cartographient la LIMITE :");
console.log("l'écart minimal entre bandes fixe combien de canaux tiennent sur une arête.");

// Code de sortie : 0 si le scénario idéal prouve la séparation.
process.exit(s1.pass ? 0 : 1);
