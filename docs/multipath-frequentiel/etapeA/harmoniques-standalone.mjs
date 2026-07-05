#!/usr/bin/env node
/*
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DÉMONSTRATION H7 — LES HARMONIQUES                                   ║
 * ║  "Contamination à contenir ET code (timbre) à exploiter."            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * POUR LANCER (rien à installer) :   node harmoniques-standalone.mjs
 *
 * ─── L'IDÉE ───────────────────────────────────────────────────────────────
 * Dès qu'il y a une non-linéarité (donc dès que le couplage de H4 est actif),
 * des HARMONIQUES (2f, 3f...) et des INTERMODULATIONS (f_A ± f_B) apparaissent.
 * Deux visages :
 *   VOLET A — CONTAMINATION : elles polluent les bandes placées sur un
 *             harmonique/somme d'une autre. → il faut un placement INHARMONIQUE.
 *             + piège du REPLIEMENT (aliasing) → il faut SURÉCHANTILLONNER.
 *   VOLET B — CODE : un profil d'harmoniques = un TIMBRE = une signature
 *             compacte et distincte (comme un instrument de musique).
 */

// Lecture d'amplitude à une fréquence (module), paramétrable en cadence/durée.
function lireAmp(signal, freq, cadence, duree) {
  const k = Math.round((freq * duree) / cadence);
  let a = 0,
    b = 0;
  for (let n = 0; n < duree; n++) {
    const p = (-2 * Math.PI * k * n) / duree;
    a += signal[n] * Math.cos(p);
    b += signal[n] * Math.sin(p);
  }
  return (2 * Math.hypot(a, b)) / duree;
}
const ouiNon = (ok) => (ok ? "✅" : "❌");
const pct = (x) => (x * 100).toFixed(2) + " %";

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  H7 — les harmoniques : contamination ET code            ║");
console.log("╚══════════════════════════════════════════════════════════╝");

// ══════════════════════════════════════════════════════════════════════════
// VOLET A.1 — CONTAMINATION : une non-linéarité crée des produits parasites.
// On envoie deux tons f_A, f_B dans une non-linéarité douce y = x + β·x².
// Elle génère : 2f_A, 2f_B (harmoniques) et f_A±f_B (intermodulation).
// Une bande placée là est POLLUÉE ; une bande inharmonique reste PROPRE.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── VOLET A.1 : contamination harmonique / intermodulation ──");
{
  const CAD = 2000,
    DUR = 2000; // suréchantillonné pour éviter tout repliement ici
  const fA = 110,
    fB = 170,
    beta = 0.4;
  const y = new Float64Array(DUR);
  for (let n = 0; n < DUR; n++) {
    const x = Math.sin((2 * Math.PI * fA * n) / CAD) + Math.sin((2 * Math.PI * fB * n) / CAD);
    y[n] = x + beta * x * x; // <-- la non-linéarité
  }
  const dangers = [
    { f: 2 * fA, nom: "2·fA (harmonique)" },
    { f: 2 * fB, nom: "2·fB (harmonique)" },
    { f: fA + fB, nom: "fA+fB (intermod.)" },
    { f: fB - fA, nom: "fB−fA (intermod.)" },
  ];
  console.log(`   Fondamentaux fA=${fA}, fB=${fB} Hz. Non-linéarité y = x + ${beta}·x².`);
  for (const d of dangers) console.log(`   ${d.nom.padEnd(20)} @ ${String(d.f).padStart(3)} Hz : ${lireAmp(y, d.f, CAD, DUR).toFixed(3)}  (parasite)`);
  const controle = 155; // inharmonique : ni multiple, ni somme/différence
  const ampCtrl = lireAmp(y, controle, CAD, DUR);
  const ok = ampCtrl < 0.02;
  console.log(`   Bande INHARMONIQUE témoin @ ${controle} Hz : ${ampCtrl.toFixed(4)}  ${ouiNon(ok)} (≈ 0, propre)`);
  console.log(`   ➜ Les parasites tombent sur 2f et f±f. Placer les bandes AILLEURS (inharmonique).`);
}

// ══════════════════════════════════════════════════════════════════════════
// VOLET A.2 — REPLIEMENT (aliasing). Le 2e harmonique d'un 300 Hz est à 600 Hz.
// À fs=1000, 600 dépasse Nyquist (500) et se REPLIE sur 400 Hz (contamination
// fantôme). À fs=2000, il reste à sa place et 400 Hz est propre.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── VOLET A.2 : repliement (aliasing) et suréchantillonnage ──");
{
  function carreDe300(cad, dur) {
    const y = new Float64Array(dur);
    for (let n = 0; n < dur; n++) {
      const x = Math.sin((2 * Math.PI * 300 * n) / cad);
      y[n] = x * x; // 2e harmonique attendu à 600 Hz
    }
    return y;
  }
  const bas = lireAmp(carreDe300(1000, 1000), 400, 1000, 1000); // fs trop bas
  const haut = lireAmp(carreDe300(2000, 2000), 400, 2000, 2000); // suréchantillonné
  console.log(`   fs=1000 (bas)  : énergie fantôme @ 400 Hz = ${bas.toFixed(3)}  (le 600 s'est replié !)`);
  console.log(`   fs=2000 (haut) : énergie @ 400 Hz = ${haut.toFixed(4)}  ${ouiNon(haut < 0.02)} (propre)`);
  console.log(`   ➜ Sous non-linéarité, il FAUT suréchantillonner pour éviter le repliement.`);
}

// ══════════════════════════════════════════════════════════════════════════
// VOLET B — LE TIMBRE : un profil d'harmoniques est une signature compacte.
// Deux "instruments" au même fondamental mais aux harmoniques différentes
// sont distinguables ; quelques nombres décrivent toute la forme d'onde.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── VOLET B : le timbre comme signature compacte ──");
{
  const CAD = 1000,
    DUR = 1000,
    f0 = 50; // harmoniques à 50, 100, 150
  const construire = (profil) => {
    const y = new Float64Array(DUR);
    for (let n = 0; n < DUR; n++) {
      let s = 0;
      profil.forEach((amp, i) => (s += amp * Math.sin((2 * Math.PI * (i + 1) * f0 * n) / CAD)));
      y[n] = s;
    }
    return y;
  };
  const T1 = [1.0, 0.5, 0.25]; // timbre "doux" (harmoniques décroissantes)
  const T2 = [1.0, 0.0, 0.6]; // timbre "creux" (2e harmonique absente)
  const lireProfil = (sig) => [1, 2, 3].map((h) => lireAmp(sig, h * f0, CAD, DUR));

  const p1 = lireProfil(construire(T1));
  const p2 = lireProfil(construire(T2));
  console.log(`   Timbre 1 visé [${T1}]  → lu [${p1.map((x) => x.toFixed(2))}]`);
  console.log(`   Timbre 2 visé [${T2}]  → lu [${p2.map((x) => x.toFixed(2))}]`);

  // Reconnaissance : un signal inconnu (= T2) ressemble-t-il plus à T2 qu'à T1 ?
  const inconnu = lireProfil(construire(T2));
  const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
  const versT1 = dist(inconnu, T1),
    versT2 = dist(inconnu, T2);
  const okReco = versT2 < versT1;
  console.log(`   Signal inconnu : distance à T1=${versT1.toFixed(2)}, à T2=${versT2.toFixed(2)}  → ${okReco ? "reconnu T2" : "raté"} ${ouiNon(okReco)}`);
  console.log(`   ➜ 3 nombres suffisent à identifier un timbre (signature compacte, cf. H5).`);

  // La PHASE des harmoniques change la FORME sans changer le SPECTRE d'amplitude.
  // (Métrique robuste : même spectre d'amplitude, mais formes d'onde distinctes.)
  const construirePhase = (profil, phases) => {
    const y = new Float64Array(DUR);
    for (let n = 0; n < DUR; n++) {
      let s = 0;
      profil.forEach((amp, i) => (s += amp * Math.sin((2 * Math.PI * (i + 1) * f0 * n) / CAD + phases[i])));
      y[n] = s;
    }
    return y;
  };
  const prof = [1, 0.5, 0.33];
  const sigP1 = construirePhase(prof, [0, 0, 0]); // harmoniques alignées
  const sigP2 = construirePhase(prof, [0, Math.PI / 2, Math.PI / 2]); // déphasées (asymétrique)
  const specP1 = lireProfil(sigP1),
    specP2 = lireProfil(sigP2);
  const memeSpectre = specP1.every((v, i) => Math.abs(v - specP2[i]) < 0.02);
  let ecartMax = 0,
    creteP1 = 0,
    creteP2 = 0;
  for (let n = 0; n < DUR; n++) {
    ecartMax = Math.max(ecartMax, Math.abs(sigP1[n] - sigP2[n]));
    creteP1 = Math.max(creteP1, Math.abs(sigP1[n]));
    creteP2 = Math.max(creteP2, Math.abs(sigP2[n]));
  }
  console.log(`   Même spectre d'amplitude ? ${ouiNon(memeSpectre)}  (les deux : [${specP1.map((x) => x.toFixed(2))}])`);
  console.log(`   Formes d'onde distinctes ? écart max ${ecartMax.toFixed(2)}, crête ${creteP1.toFixed(2)} vs ${creteP2.toFixed(2)}  ${ouiNon(ecartMax > 0.1)}`);
  console.log(`   ➜ Même spectre d'amplitude, forme différente = la phase des harmoniques (un spike = harmoniques en phase).`);
}

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  RÉSUMÉ — H7                                              ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log("  A.1 contamination : parasites à 2f et f±f → placement INHARMONIQUE");
console.log("  A.2 repliement    : harmoniques hautes reviennent → SURÉCHANTILLONNER");
console.log("  B   timbre        : profil d'harmoniques = signature compacte + la");
console.log("                      phase des harmoniques = la forme (le spike)");
console.log("\n  En clair : les harmoniques sont inévitables sous couplage. On les");
console.log("  contient (placement + suréchantillonnage) ET on les exploite (timbre).");
console.log("  ⚠️ La densité de H1 (~133 canaux) était LINÉAIRE : sous couplage, il");
console.log("     faut retrancher les fréquences harmoniques/intermod. → densité réelle plus basse.\n");
