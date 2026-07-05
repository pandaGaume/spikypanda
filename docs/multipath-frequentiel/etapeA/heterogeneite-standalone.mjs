#!/usr/bin/env node
/*
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DÉMONSTRATION H2 — L'ÉCHELLE D'HÉTÉROGÉNÉITÉ                         ║
 * ║  "Un même fil peut-il porter des calculs DIFFÉRENTS à la fois ?"     ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * POUR LANCER (rien à installer) :   node heterogeneite-standalone.mjs
 *
 * ─── L'IDÉE ───────────────────────────────────────────────────────────────
 * H1 a montré qu'un fil TRANSPORTE plusieurs messages sans les mélanger.
 * H4 a montré qu'une bande peut en MODULER une autre à dessein.
 * H2 (ici) montre que le substrat porte de vrais CALCULS DIFFÉRENTS en même
 * temps — pas du transport, pas juste de la modulation.
 *
 * On monte une échelle, du plus faible au plus fort :
 *   NIVEAU 0 : deux tâches INDÉPENDANTES (même nature)      → capacité
 *   NIVEAU 1 : deux fonctions du MÊME signal                → diversité
 *   NIVEAU 2 : un canal LINÉAIRE + un canal NON-LINÉAIRE    → hétérogénéité
 * Le niveau 2 est le vrai saut : deux natures de calcul cohabitent sur UN fil.
 */

// ── Machinerie commune (identique aux démos précédentes) ──────────────────
const CADENCE = 1000,
  DUREE = 1000;

function emettre(freq, hauteur) {
  const y = new Float64Array(DUREE);
  for (let t = 0; t < DUREE; t++) y[t] = hauteur * Math.sin((2 * Math.PI * freq * t) / CADENCE);
  return y;
}
function forceA(melange, freq) {
  const p = Math.round((freq * DUREE) / CADENCE);
  let a = 0,
    b = 0;
  const k = (-2 * Math.PI * p) / DUREE;
  for (let t = 0; t < DUREE; t++) {
    a += melange[t] * Math.cos(k * t);
    b += melange[t] * Math.sin(k * t);
  }
  return (2 * Math.hypot(a, b)) / DUREE;
}
function additionner(...ondes) {
  const fil = new Float64Array(DUREE);
  for (const o of ondes) for (let t = 0; t < DUREE; t++) fil[t] += o[t];
  return fil;
}
const proche = (x, cible, tol = 0.02) => (cible === 0 ? Math.abs(x) < tol : Math.abs(x - cible) / Math.abs(cible) < tol);
const ouiNon = (ok) => (ok ? "✅" : "❌");

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  H2 — un même fil, des calculs différents à la fois       ║");
console.log("╚══════════════════════════════════════════════════════════╝");

// ══════════════════════════════════════════════════════════════════════════
// NIVEAU 0 — DEUX TÂCHES INDÉPENDANTES (même nature : deux mises à l'échelle)
// Job A sur la bande 80 Hz : "doubler"   (poids 2)
// Job B sur la bande 160 Hz : "diviser par 2" (poids 0.5)
// Entrées séparées x1, x2. On lit les deux, et on vérifie l'INDÉPENDANCE.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── NIVEAU 0 : deux tâches indépendantes (capacité) ──");
{
  const f1 = 80,
    f2 = 160,
    wA = 2,
    wB = 0.5;
  const x1 = 0.4,
    x2 = 0.6;
  const fil = additionner(emettre(f1, wA * x1), emettre(f2, wB * x2));
  const r1 = forceA(fil, f1),
    r2 = forceA(fil, f2);
  console.log(`   Job A (×2)  sur ${f1} Hz : entrée ${x1} → sortie ${r1.toFixed(3)} (attendu ${(wA * x1).toFixed(3)})  ${ouiNon(proche(r1, wA * x1))}`);
  console.log(`   Job B (÷2)  sur ${f2} Hz : entrée ${x2} → sortie ${r2.toFixed(3)} (attendu ${(wB * x2).toFixed(3)})  ${ouiNon(proche(r2, wB * x2))}`);
  // Indépendance : on change SEULEMENT x1, la sortie B ne doit pas bouger.
  const fil2 = additionner(emettre(f1, wA * 0.9), emettre(f2, wB * x2));
  const r2b = forceA(fil2, f2);
  const indep = proche(r2b, wB * x2);
  console.log(`   On change x1 (0.4→0.9) : sortie B reste ${r2b.toFixed(3)}  ${ouiNon(indep)} (indépendante)`);
  console.log(`   ➜ Deux jobs vivent sur un fil sans se gêner. (Mais ils sont de MÊME nature.)`);
}

// ══════════════════════════════════════════════════════════════════════════
// NIVEAU 1 — DEUX FONCTIONS DU MÊME SIGNAL
// Une seule entrée x. Bande 80 Hz applique g1(x)=2x, bande 160 Hz applique
// g2(x)=0.5x. On lit deux traitements DIFFÉRENTS du même x, en parallèle.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── NIVEAU 1 : deux fonctions du même signal (diversité) ──");
{
  const f1 = 80,
    f2 = 160;
  console.log("      x   |  g1=2x (bande 80) |  g2=0.5x (bande 160) | rapport");
  console.log("   -------+-------------------+----------------------+--------");
  let ok = true;
  for (const x of [0.2, 0.5, 0.8]) {
    const fil = additionner(emettre(f1, 2 * x), emettre(f2, 0.5 * x));
    const r1 = forceA(fil, f1),
      r2 = forceA(fil, f2);
    if (!proche(r1, 2 * x) || !proche(r2, 0.5 * x)) ok = false;
    console.log(`    ${x.toFixed(1)}   |      ${r1.toFixed(3)}        |       ${r2.toFixed(3)}          |  ${(r1 / r2).toFixed(2)}`);
  }
  console.log(`   ➜ Même entrée, deux traitements en parallèle, rapport constant (4.0) : ${ouiNon(ok)}`);
  console.log(`     (Utile, mais les deux fonctions restent LINÉAIRES.)`);
}

// ══════════════════════════════════════════════════════════════════════════
// NIVEAU 2 — CANAL LINÉAIRE + CANAL NON-LINÉAIRE (le vrai saut)
// Sur UN SEUL fil, en même temps :
//   • Canal LINÉAIRE   (bande 80 Hz)  : sortie = w·a       (linéaire en a)
//   • Canal NON-LINÉAIRE (250 Hz)     : sortie = a·b       (un PRODUIT)
// Le produit se lit dans les bandes latérales à 250±30 (mécanisme de H4).
// Preuve d'hétérogénéité : quand on double a ET b, le linéaire double (×2),
// le non-linéaire QUADRUPLE (×4) — deux natures de réponse.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── NIVEAU 2 : canal linéaire + canal non-linéaire (hétérogénéité) ──");
{
  const fLin = 80,
    fPorteuse = 250,
    fMod = 30,
    w = 2;
  const lateral = fPorteuse - fMod; // 220 Hz : là où se lit le produit

  // Construit le fil : canal linéaire (w·a) + canal produit (a modulée par b).
  function fil(a, b) {
    const y = new Float64Array(DUREE);
    for (let t = 0; t < DUREE; t++) {
      const lineaire = w * a * Math.sin((2 * Math.PI * fLin * t) / CADENCE);
      const bLent = Math.sin((2 * Math.PI * fMod * t) / CADENCE);
      const produit = a * (1 + b * bLent) * Math.sin((2 * Math.PI * fPorteuse * t) / CADENCE);
      y[t] = lineaire + produit;
    }
    return y;
  }
  const lireLineaire = (f) => forceA(f, fLin); // = w·a
  const lireProduit = (f) => 2 * forceA(f, lateral); // sideband × 2 = a·b

  // Cas de base
  let a = 0.5,
    b = 0.6;
  let s = fil(a, b);
  const rl = lireLineaire(s),
    rp = lireProduit(s);
  console.log(`   a=${a}, b=${b}`);
  console.log(`   Canal linéaire   (80 Hz)      : ${rl.toFixed(3)}  (attendu w·a = ${(w * a).toFixed(3)})  ${ouiNon(proche(rl, w * a))}`);
  console.log(`   Canal non-linéaire (produit)  : ${rp.toFixed(3)}  (attendu a·b = ${(a * b).toFixed(3)})  ${ouiNon(proche(rp, a * b, 0.03))}`);

  // Indépendance : b ne doit pas affecter le canal linéaire.
  const rlSansB = lireLineaire(fil(a, 0));
  console.log(`   b=0 : canal linéaire = ${rlSansB.toFixed(3)} (inchangé)  ${ouiNon(proche(rlSansB, w * a))} ; produit = ${lireProduit(fil(a, 0)).toFixed(3)} (→0)  ${ouiNon(proche(lireProduit(fil(a, 0)), 0, 0.01))}`);

  // LA preuve d'hétérogénéité : doubler a ET b.
  const s2 = fil(2 * a, 2 * b);
  const rl2 = lireLineaire(s2),
    rp2 = lireProduit(s2);
  const ratioLin = rl2 / rl,
    ratioProd = rp2 / rp;
  console.log(`\n   On DOUBLE a et b (×2) :`);
  console.log(`     canal linéaire   : ×${ratioLin.toFixed(2)}  (attendu ×2)  ${ouiNon(proche(ratioLin, 2, 0.05))}`);
  console.log(`     canal non-linéaire: ×${ratioProd.toFixed(2)}  (attendu ×4)  ${ouiNon(proche(ratioProd, 4, 0.05))}`);
  console.log(`   ➜ Deux RÉPONSES de natures différentes sur le même fil : ${ouiNon(proche(ratioLin, 2, 0.05) && proche(ratioProd, 4, 0.05))}`);
}

// ══════════════════════════════════════════════════════════════════════════
// RÉSUMÉ — l'échelle
// ══════════════════════════════════════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  RÉSUMÉ — H2, du plus faible au plus fort                  ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log("  Niveau 0 : deux tâches indépendantes          → CAPACITÉ");
console.log("  Niveau 1 : deux fonctions d'un même signal     → DIVERSITÉ");
console.log("  Niveau 2 : linéaire + non-linéaire sur un fil   → HÉTÉROGÉNÉITÉ ★");
console.log("\n  En clair : un même câblage porte, en même temps, des calculs de");
console.log("  natures DIFFÉRENTES, chacun lisible séparément. C'est ça, H2 —");
console.log("  et le barreau qui compte vraiment est le niveau 2.");
console.log("\n  (Rappel : ici les fonctions sont fixées à la main. Les APPRENDRE,");
console.log("   c'est le jalon suivant — plasticité.)\n");
