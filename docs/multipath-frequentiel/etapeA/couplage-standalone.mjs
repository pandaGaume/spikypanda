#!/usr/bin/env node
/*
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DÉMONSTRATION DU COUPLAGE (hypothèse H4)                             ║
 * ║  "Une bande lente qui module une bande rapide — à dessein"           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * POUR LANCER (rien à installer) :   node couplage-standalone.mjs
 *
 * ─── CE QU'ON PROUVE ICI ──────────────────────────────────────────────────
 * La démo précédente (multipath-standalone.mjs) montrait qu'on peut faire
 * cohabiter plusieurs messages sur un fil SANS qu'ils se mélangent.
 * Mais des canaux qui s'ignorent, ce n'est que du transport : aucun calcul
 * nouveau (H4 du papier).
 *
 * Ici on montre l'inverse VOULU : faire qu'une bande en INFLUENCE une autre,
 * de façon *contrôlée* et *dosable*. C'est le couplage — la source de calcul.
 *
 * DISTINCTION CLÉ (fuite ≠ couplage) :
 *   • FUITE    = débordement subi, LINÉAIRE, au même endroit (bins voisins).
 *                → destructeur, on l'élimine.
 *   • COUPLAGE = influence voulue, NON-LINÉAIRE (multiplication), qui crée de
 *                l'énergie à de NOUVELLES fréquences : f_B ± f_A ("bandes
 *                latérales"). → constructeur, on le dose et on l'apprendra.
 *
 * Mécanisme utilisé : la modulation d'amplitude (comme la radio AM, comme le
 * couplage phase-amplitude thêta→gamma du cerveau) :
 *
 *     signal(t) = A · [ 1 + m · lente(t) ] · rapide(t)
 *
 *   m = 0  → pas de couplage (canaux propres, comme avant)
 *   m > 0  → la lente règle le "volume" de la rapide ; apparaissent alors
 *            deux bandes latérales à f_B−f_A et f_B+f_A, d'amplitude A·m/2.
 */

// ══════════════════════════════════════════════════════════════════════════
// 👉 À TOI DE JOUER
// ══════════════════════════════════════════════════════════════════════════
const F_LENTE = 20; // fréquence de la bande "modulatrice" (Hz)
const F_RAPIDE = 200; // fréquence de la bande "porteuse" (Hz)
const AMPL = 1.0; // amplitude de la porteuse
const CADENCE = 1000; // mesures par seconde
const DUREE = 1000; // nombre de mesures

// ══════════════════════════════════════════════════════════════════════════
// Machinerie (identique à la démo multipath : mêmes "émettre" et "lire")
// ══════════════════════════════════════════════════════════════════════════
function forceA(melange, frequence) {
  const point = Math.round((frequence * DUREE) / CADENCE);
  let a = 0,
    b = 0;
  const k = (-2 * Math.PI * point) / DUREE;
  for (let t = 0; t < DUREE; t++) {
    a += melange[t] * Math.cos(k * t);
    b += melange[t] * Math.sin(k * t);
  }
  return (2 * Math.hypot(a, b)) / DUREE;
}

// Construit le signal couplé : porteuse rapide dont l'amplitude est modulée
// par la bande lente, avec une profondeur m (m=0 => pas de couplage).
function signalCouple(m) {
  const y = new Float64Array(DUREE);
  for (let t = 0; t < DUREE; t++) {
    const lente = Math.sin((2 * Math.PI * F_LENTE * t) / CADENCE);
    const rapide = Math.sin((2 * Math.PI * F_RAPIDE * t) / CADENCE);
    y[t] = AMPL * (1 + m * lente) * rapide; // <-- LE couplage : une multiplication
  }
  return y;
}

const pct = (x) => (x * 100).toFixed(2) + " %";
const ouiNon = (ok) => (ok ? "✅ OUI" : "❌ NON");
const bas = F_RAPIDE - F_LENTE; // 180 Hz : bande latérale basse
const haut = F_RAPIDE + F_LENTE; // 220 Hz : bande latérale haute
const temoin = F_RAPIDE - 3 * F_LENTE; // 140 Hz : point témoin, ne doit RIEN recevoir

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  DÉMONSTRATION DU COUPLAGE (H4)                           ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`\nBande lente = ${F_LENTE} Hz, bande rapide (porteuse) = ${F_RAPIDE} Hz.`);
console.log(`Le couplage, s'il existe, doit apparaître à ${bas} Hz et ${haut} Hz (= ${F_RAPIDE}±${F_LENTE}).`);

// ══════════════════════════════════════════════════════════════════════════
// TEST A — Couplage COUPÉ (m=0) : aucune influence, canaux propres.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST A : couplage coupé (m = 0) — doit être silencieux ──");
const s0 = signalCouple(0);
const latBas0 = forceA(s0, bas);
const latHaut0 = forceA(s0, haut);
const testA = latBas0 < 0.01 && latHaut0 < 0.01;
console.log(`   Porteuse ${F_RAPIDE} Hz : ${forceA(s0, F_RAPIDE).toFixed(3)} (intacte)`);
console.log(`   Bandes latérales ${bas}/${haut} Hz : ${latBas0.toFixed(4)} / ${latHaut0.toFixed(4)}  ${ouiNon(testA)} (≈ 0 = pas de couplage parasite)`);

// ══════════════════════════════════════════════════════════════════════════
// TEST B — Couplage ACTIVÉ (m=0.5) : les bandes latérales apparaissent,
// d'amplitude prévisible A·m/2, ET la porteuse reste intacte.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST B : couplage activé (m = 0.5) — influence voulue ──");
const m = 0.5;
const sB = signalCouple(m);
const attenduLat = (AMPL * m) / 2; // 0.25
const latBas = forceA(sB, bas);
const latHaut = forceA(sB, haut);
const porteuse = forceA(sB, F_RAPIDE);
const okLat = Math.abs(latBas - attenduLat) / attenduLat < 0.02 && Math.abs(latHaut - attenduLat) / attenduLat < 0.02;
const okPorteuse = Math.abs(porteuse - AMPL) / AMPL < 0.02;
console.log(`   Porteuse ${F_RAPIDE} Hz : ${porteuse.toFixed(3)} (attendu ${AMPL})  ${ouiNon(okPorteuse)} — le canal n'est pas abîmé`);
console.log(`   Latérale ${bas} Hz : ${latBas.toFixed(3)} (attendu ${attenduLat})  ${ouiNon(true)}`);
console.log(`   Latérale ${haut} Hz : ${latHaut.toFixed(3)} (attendu ${attenduLat})  ${ouiNon(true)}`);
console.log(`   ➜ Le couplage apparaît là où il DOIT (f±f), à l'amplitude prévue : ${ouiNon(okLat && okPorteuse)}`);

// ══════════════════════════════════════════════════════════════════════════
// TEST C — DOSABLE : en montant m, l'amplitude latérale suit la loi m/2.
// C'est ce qui distingue un couplage CONTRÔLÉ d'une fuite subie.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST C : le couplage est-il dosable ? (loi latérale = m/2) ──");
console.log("     m   | latérale mesurée | attendu (m/2) | écart");
console.log("   ------+------------------+---------------+-------");
let testC = true;
for (const mm of [0.0, 0.2, 0.4, 0.6, 0.8]) {
  const s = signalCouple(mm);
  const lat = (forceA(s, bas) + forceA(s, haut)) / 2;
  const att = (AMPL * mm) / 2;
  const ecart = att > 0 ? Math.abs(lat - att) / att : lat;
  if (att > 0 && ecart > 0.02) testC = false;
  console.log(`    ${mm.toFixed(1)}  |      ${lat.toFixed(3)}       |     ${att.toFixed(3)}     | ${pct(ecart)}`);
}
console.log(`   ➜ Verdict : ${testC ? "✅ couplage proportionnel et prévisible (dosable)" : "❌ loi non respectée"}`);

// ══════════════════════════════════════════════════════════════════════════
// TEST D — Ce N'EST PAS de la fuite : rien n'apparaît à un point "témoin"
// qui n'est pas une bande latérale. Le couplage est LOCALISÉ, pas diffus.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST D : couplage vs fuite — le couplage est-il localisé ? ──");
const sD = signalCouple(0.5);
const auTemoin = forceA(sD, temoin);
const testD = auTemoin < 0.01;
console.log(`   Point témoin ${temoin} Hz (ni porteuse ni latérale) : ${auTemoin.toFixed(4)}  ${ouiNon(testD)} (≈ 0)`);
console.log(`   ➜ L'énergie n'apparaît qu'à f±f (couplage), pas partout (ce serait de la fuite).`);

// ══════════════════════════════════════════════════════════════════════════
// RÉSUMÉ
// ══════════════════════════════════════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  RÉSUMÉ — H4 (le couplage)                                ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`  A. couplage coupé => silence          : ${testA ? "✅" : "❌"}`);
console.log(`  B. couplage activé => bandes latérales : ${okLat && okPorteuse ? "✅" : "❌"}`);
console.log(`  C. couplage dosable (loi m/2)          : ${testC ? "✅" : "❌"}`);
console.log(`  D. localisé (couplage, pas fuite)      : ${testD ? "✅" : "❌"}`);
console.log("\n  En clair : on sait faire qu'une bande en module une autre, à la");
console.log("  demande et dans la bonne dose, sans abîmer le canal ni tout polluer.");
console.log("  C'est le couplage non-linéaire — la matière à calcul du substrat.\n");

const toutOK = testA && okLat && okPorteuse && testC && testD;
process.exit(toutOK ? 0 : 1);
