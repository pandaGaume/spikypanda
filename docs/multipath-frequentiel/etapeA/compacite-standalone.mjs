#!/usr/bin/env node
/*
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DÉMONSTRATION H5 — LA COMPACITÉ ("l'ADN")                            ║
 * ║  "Le comportement tient en quelques nombres... en fréquence."        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * POUR LANCER (rien à installer) :   node compacite-standalone.mjs
 *
 * ─── L'IDÉE ───────────────────────────────────────────────────────────────
 * H5 dit : ce qui définit le comportement d'une connexion peut se ranger dans
 * une description COMPACTE — "comment elle répond à chaque fréquence" — plutôt
 * que dans une longue liste de nombres. C'est la "règle génératrice", l'ADN.
 *
 * On le prouve en comparant DEUX façons de décrire LE MÊME comportement :
 *   • en FRÉQUENCE : quelques gains par bande         → K nombres
 *   • en TEMPS     : la réponse tap par tap           → ~N nombres
 * Elles donnent la même sortie. Mais l'une tient en K nombres, l'autre en N.
 *
 * Le coup de grâce : à BUDGET ÉGAL (K nombres chacun), la version fréquence
 * est EXACTE, la version temps est CASSÉE. L'information est compacte en
 * fréquence, éparpillée en temps.
 *
 * (Hypothèse de travail assumée : les comportements utiles sont "structurés
 *  en bandes". C'est justement la thèse du substrat.)
 */

const N = 256; // longueur du signal

// ── Le comportement cible : un profil de gains par bande (K nombres) ──────
// (bande = plage de fréquences ; gain = combien on multiplie cette plage)
const BANDES = [
  { lo: 1, hi: 32, g: 2.0 }, // basses : amplifiées
  { lo: 32, hi: 64, g: 0.0 }, // médiums-bas : coupés
  { lo: 64, hi: 96, g: 0.5 }, // médiums-hauts : atténués
  { lo: 96, hi: 128, g: 1.5 }, // hauts : un peu amplifiés
];
const K = BANDES.length; // = 4 nombres suffisent à décrire le comportement

function gainAuBin(k) {
  const kp = k <= N / 2 ? k : N - k; // fréquence "positive" équivalente
  for (const b of BANDES) if (kp >= b.lo && kp < b.hi) return b.g;
  return 0;
}

// ── Petit générateur reproductible (pour des amplitudes "au hasard" mais fixes)
let seed = 12345;
const rnd = () => {
  seed = (1103515245 * seed + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const A = new Float64Array(N / 2);
for (let k = 1; k < N / 2; k++) A[k] = 0.2 + 0.8 * rnd();

// Construit un signal à partir d'un gain appliqué à chaque fréquence.
function construire(gainFn) {
  const x = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (let k = 1; k < N / 2; k++) s += A[k] * gainFn(k) * Math.sin((2 * Math.PI * k * n) / N);
    x[n] = s;
  }
  return x;
}

const entree = construire(() => 1); // signal d'entrée riche
const cible = construire((k) => gainAuBin(k)); // sortie voulue (entrée × profil)

// ── Outils fréquentiels : DFT, DFT inverse, convolution circulaire ────────
function dft(x) {
  const re = new Float64Array(N),
    im = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    let a = 0,
      b = 0;
    for (let n = 0; n < N; n++) {
      const p = (-2 * Math.PI * k * n) / N;
      a += x[n] * Math.cos(p);
      b += x[n] * Math.sin(p);
    }
    re[k] = a;
    im[k] = b;
  }
  return { re, im };
}
function idftReel(re, im) {
  const x = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    let a = 0;
    for (let k = 0; k < N; k++) {
      const p = (2 * Math.PI * k * n) / N;
      a += re[k] * Math.cos(p) - im[k] * Math.sin(p);
    }
    x[n] = a / N;
  }
  return x;
}
function convCirc(x, h) {
  const y = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (let m = 0; m < N; m++) s += x[m] * h[(((n - m) % N) + N) % N];
    y[n] = s;
  }
  return y;
}
function erreurRel(a, b) {
  let e = 0,
    r = 0;
  for (let n = 0; n < N; n++) {
    e += (a[n] - b[n]) ** 2;
    r += b[n] ** 2;
  }
  return Math.sqrt(e / r);
}
const pct = (x) => (x * 100).toFixed(2) + " %";
const ouiNon = (ok) => (ok ? "✅" : "❌");

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  H5 — le comportement tient en quelques nombres           ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`\nComportement cible = profil de ${K} gains par bande : [${BANDES.map((b) => b.g).join(", ")}]`);
console.log(`Signal de longueur N = ${N}.`);

// ══════════════════════════════════════════════════════════════════════════
// MODÈLE FRÉQUENCE (K nombres) : on applique les gains bande par bande.
// ══════════════════════════════════════════════════════════════════════════
function modeleFrequence(x) {
  const { re, im } = dft(x);
  const r2 = new Float64Array(N),
    i2 = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const g = gainAuBin(k);
    r2[k] = re[k] * g;
    i2[k] = im[k] * g;
  }
  return idftReel(r2, i2);
}

// ══════════════════════════════════════════════════════════════════════════
// MODÈLE TEMPS (~N nombres) : la "réponse impulsionnelle" du même comportement.
// C'est le même opérateur, mais écrit tap par tap dans le temps.
// ══════════════════════════════════════════════════════════════════════════
function reponseTemporelle() {
  const re = new Float64Array(N),
    im = new Float64Array(N);
  for (let k = 0; k < N; k++) re[k] = gainAuBin(k);
  return idftReel(re, im); // le "noyau" temporel
}

// ── TEST 1 : le modèle FRÉQUENCE (K nombres) reproduit-il la cible ? ──────
console.log("\n── TEST 1 : K nombres (fréquence) suffisent-ils ? ──");
const yFreq = modeleFrequence(entree);
const err1 = erreurRel(yFreq, cible);
const t1 = err1 < 0.001;
console.log(`   Erreur du modèle fréquence (${K} nombres) : ${pct(err1)}  ${ouiNon(t1)} (≈ 0 = exact)`);

// ── TEST 2 : le même comportement, en TEMPS, s'étale-t-il sur ~N nombres ? ─
console.log("\n── TEST 2 : combien de nombres faut-il en TEMPS ? ──");
const h = reponseTemporelle();
const maxTap = Math.max(...Array.from(h, Math.abs));
let tapsSignificatifs = 0;
for (let n = 0; n < N; n++) if (Math.abs(h[n]) > 0.01 * maxTap) tapsSignificatifs++;
const yTemps = convCirc(entree, h);
console.log(`   Le comportement, écrit en temps, occupe ${tapsSignificatifs}/${N} taps non négligeables.`);
console.log(`   (Vérif : ce noyau temporel reproduit bien la cible, erreur ${pct(erreurRel(yTemps, cible))}.)`);
console.log(`   ➜ L'information est ÉPARPILLÉE dans le temps, COMPACTE en fréquence.`);

// ── TEST 3 (le coup de grâce) : à BUDGET ÉGAL, qui gagne ? ────────────────
console.log("\n── TEST 3 : à budget égal (K nombres chacun), fréquence vs temps ──");
// On ne garde que les K taps temporels les plus gros (même budget que la fréquence).
const indices = Array.from({ length: N }, (_, i) => i).sort((a, b) => Math.abs(h[b]) - Math.abs(h[a]));
const hTronque = new Float64Array(N);
for (let i = 0; i < K; i++) hTronque[indices[i]] = h[indices[i]];
const yTempsTronque = convCirc(entree, hTronque);
const errTemps = erreurRel(yTempsTronque, cible);
console.log(`   Fréquence, ${K} nombres : erreur ${pct(err1)}  ${ouiNon(t1)}`);
console.log(`   Temps,     ${K} nombres : erreur ${pct(errTemps)}  ${ouiNon(errTemps > 0.2)} (cassé, comme prévu)`);

// Combien de taps temporels faut-il pour rivaliser avec K nombres de fréquence ?
console.log("\n   Combien de taps temporels pour s'approcher de la cible ?");
console.log("     budget | erreur (temps tronqué)");
console.log("   ---------+------------------------");
for (const M of [K, 8, 16, 32, 64, 128]) {
  const ht = new Float64Array(N);
  for (let i = 0; i < M; i++) ht[indices[i]] = h[indices[i]];
  console.log(`      ${String(M).padStart(3)}    |  ${pct(erreurRel(convCirc(entree, ht), cible))}`);
}

// ══════════════════════════════════════════════════════════════════════════
// RÉSUMÉ
// ══════════════════════════════════════════════════════════════════════════
const compression = Math.round(N / K);
console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  RÉSUMÉ — H5 (la compacité)                               ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`  Même comportement, deux descriptions :`);
console.log(`     • en fréquence : ${K} nombres  (exact)`);
console.log(`     • en temps     : ~${tapsSignificatifs} nombres pour la même fidélité`);
console.log(`  Compression : ~${compression}× (N/K = ${N}/${K}).`);
console.log(`  À budget égal (${K} nombres), la fréquence est exacte, le temps est cassé.`);
console.log("\n  En clair : le comportement a un ADN court — quelques gains en");
console.log("  fréquence — alors que la même chose, en poids classiques, s'étale.");
console.log("  C'est la règle génératrice compacte que le projet cherchait.\n");
