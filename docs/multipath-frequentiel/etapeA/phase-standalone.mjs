#!/usr/bin/env node
/*
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DÉMONSTRATION H6 — LA PHASE                                          ║
 * ║  "Le latent est complexe : la phase porte de l'info et route."       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * POUR LANCER (rien à installer) :   node phase-standalone.mjs
 *
 * ─── L'IDÉE ───────────────────────────────────────────────────────────────
 * Jusqu'ici on ne lisait que l'AMPLITUDE (le module). Mais chaque bande est
 * un nombre COMPLEXE : amplitude ET phase. On le prouve en 4 temps :
 *   A : deux valeurs indépendantes tiennent sur UNE fréquence (I et Q)  → capacité ×2
 *   B : la phase se lit et ne dépend pas de l'amplitude                 → info propre
 *   C : deux sources ne "communiquent" que si elles sont EN PHASE       → routage
 *   D : l'amplitude seule ne distingue pas ce que la phase distingue    → il faut le complexe
 *
 * Vocabulaire : "I" = composante en cosinus (in-phase), "Q" = composante en
 * sinus (quadrature). Un signal = I·cos + Q·sin. Le couple (I,Q) EST le
 * nombre complexe de la bande.
 */

const CADENCE = 1000,
  DUREE = 1000;

// Encode deux nombres (I,Q) sur une fréquence : signal = I·cos + Q·sin.
function encoderIQ(freq, I, Q) {
  const y = new Float64Array(DUREE);
  for (let n = 0; n < DUREE; n++) {
    const a = (2 * Math.PI * freq * n) / CADENCE;
    y[n] = I * Math.cos(a) + Q * Math.sin(a);
  }
  return y;
}
// Lit le nombre complexe d'une bande : renvoie I, Q, amplitude, phase.
function lireComplexe(signal, freq) {
  const k = Math.round((freq * DUREE) / CADENCE);
  let ci = 0,
    si = 0;
  for (let n = 0; n < DUREE; n++) {
    const a = (2 * Math.PI * k * n) / DUREE;
    ci += signal[n] * Math.cos(a);
    si += signal[n] * Math.sin(a);
  }
  const I = (2 * ci) / DUREE,
    Q = (2 * si) / DUREE;
  return { I, Q, amp: Math.hypot(I, Q), phase: Math.atan2(Q, I) };
}
function additionner(...ondes) {
  const f = new Float64Array(DUREE);
  for (const o of ondes) for (let n = 0; n < DUREE; n++) f[n] += o[n];
  return f;
}
const proche = (x, c, tol = 0.02) => (Math.abs(c) < 1e-9 ? Math.abs(x) < tol : Math.abs(x - c) / Math.abs(c) < tol);
const ouiNon = (ok) => (ok ? "✅" : "❌");
const deg = (r) => ((r * 180) / Math.PI).toFixed(1) + "°";

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  H6 — la phase porte de l'information et route            ║");
console.log("╚══════════════════════════════════════════════════════════╝");

// ══════════════════════════════════════════════════════════════════════════
// TEST A — DEUX valeurs sur UNE fréquence (I et Q). Capacité doublée.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST A : deux nombres indépendants sur une seule fréquence ──");
{
  const f = 100,
    I0 = 0.7,
    Q0 = -0.3;
  const s = encoderIQ(f, I0, Q0);
  const r = lireComplexe(s, f);
  const ok = proche(r.I, I0) && proche(r.Q, Q0);
  console.log(`   Envoyé  : I=${I0}, Q=${Q0}`);
  console.log(`   Relu    : I=${r.I.toFixed(3)}, Q=${r.Q.toFixed(3)}  ${ouiNon(ok)}`);
  console.log(`   ➜ Une bande complexe transporte DEUX réels (capacité ×2 vs amplitude seule).`);
}

// ══════════════════════════════════════════════════════════════════════════
// TEST B — La PHASE se lit, indépendamment de l'amplitude.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST B : la phase se lit et ne dépend pas de l'amplitude ──");
{
  const f = 100,
    R = 1.0; // amplitude fixe
  console.log("     phase visée | phase lue | amplitude lue");
  console.log("   --------------+-----------+--------------");
  let ok = true;
  for (const psi of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
    // amplitude R, phase psi  ->  I=R·cos(psi), Q=R·sin(psi)
    const s = encoderIQ(f, R * Math.cos(psi), R * Math.sin(psi));
    const r = lireComplexe(s, f);
    if (!proche(r.phase, psi, 0.02) || !proche(r.amp, R)) ok = false;
    console.log(`      ${deg(psi).padStart(7)}    |  ${deg(r.phase).padStart(6)}  |    ${r.amp.toFixed(3)}`);
  }
  console.log(`   ➜ La phase est une info propre, portée à amplitude constante : ${ouiNon(ok)}`);
}

// ══════════════════════════════════════════════════════════════════════════
// TEST C — COMMUNICATION THROUGH COHERENCE : deux sources de même fréquence
// ne "passent" que si elles sont EN PHASE. Amplitude combinée = 2·|cos(Δφ/2)|.
// C'est un routage par la phase, sans aucun aiguillage.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST C : routage par cohérence de phase (canal ouvert/fermé) ──");
{
  const f = 100;
  console.log("     Δφ (déphasage) | amplitude combinée | canal");
  console.log("   -----------------+--------------------+-------");
  let ok = true;
  for (const dphi of [0, Math.PI / 3, Math.PI / 2, (2 * Math.PI) / 3, Math.PI]) {
    const s1 = encoderIQ(f, 1, 0); // source 1 : phase 0
    const s2 = encoderIQ(f, Math.cos(dphi), Math.sin(dphi)); // source 2 : phase Δφ
    const r = lireComplexe(additionner(s1, s2), f);
    const attendu = 2 * Math.abs(Math.cos(dphi / 2));
    if (!proche(r.amp, attendu, 0.02)) ok = false;
    const etat = r.amp > 1.5 ? "OUVERT" : r.amp < 0.5 ? "FERMÉ" : "partiel";
    console.log(`       ${deg(dphi).padStart(7)}      |       ${r.amp.toFixed(3)}        | ${etat}`);
  }
  console.log(`   ➜ En phase → canal ouvert (2.0) ; en opposition → fermé (0.0). Loi suivie : ${ouiNon(ok)}`);
  console.log(`     C'est la "communication through coherence" : router SANS décision discrète.`);
}

// ══════════════════════════════════════════════════════════════════════════
// TEST D — L'AMPLITUDE SEULE ne distingue pas ce que la phase distingue.
// Deux signaux de même amplitude mais phases différentes : identiques en
// amplitude, distincts en complexe. (C'est la perte de signe de H2, générale.)
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST D : l'amplitude seule est aveugle à la phase ──");
{
  const f = 100;
  const sigA = encoderIQ(f, 1, 0); // amplitude 1, phase 0
  const sigB = encoderIQ(f, 0, 1); // amplitude 1, phase 90°
  const rA = lireComplexe(sigA, f),
    rB = lireComplexe(sigB, f);
  const memeAmp = proche(rA.amp, rB.amp);
  const distinctsComplexe = !proche(rA.I, rB.I, 0.02) || !proche(rA.Q, rB.Q, 0.02);
  console.log(`   Signal A : amp=${rA.amp.toFixed(3)}, (I,Q)=(${rA.I.toFixed(2)}, ${rA.Q.toFixed(2)})`);
  console.log(`   Signal B : amp=${rB.amp.toFixed(3)}, (I,Q)=(${rB.I.toFixed(2)}, ${rB.Q.toFixed(2)})`);
  console.log(`   Même amplitude ? ${ouiNon(memeAmp)}   Distincts en complexe ? ${ouiNon(distinctsComplexe)}`);
  console.log(`   ➜ Lire l'amplitude seule les confond ; le complexe les sépare. D'où le besoin de la phase.`);
}

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  RÉSUMÉ — H6                                              ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log("  A. deux réels sur une fréquence (I/Q)     → capacité ×2");
console.log("  B. la phase se lit à amplitude constante   → info propre");
console.log("  C. routage par cohérence de phase          → ouvrir/fermer sans aiguillage");
console.log("  D. l'amplitude seule est aveugle           → il FAUT le complexe");
console.log("\n  En clair : le latent est bien complexe. La phase n'est pas un");
console.log("  détail — elle double la capacité ET sert de routeur.\n");
