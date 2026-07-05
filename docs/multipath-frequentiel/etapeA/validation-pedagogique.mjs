#!/usr/bin/env node
/*
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  VALIDATION — VERSION POUR NON-SPÉCIALISTES                           ║
 * ║  "Plusieurs messages sur un seul fil, comme des stations de radio"    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * POUR LANCER (rien à installer) :   node validation-pedagogique.mjs
 *
 * ─── L'IDÉE EN 30 SECONDES ────────────────────────────────────────────────
 * Dans l'air, des dizaines de stations de radio passent EN MÊME TEMPS au
 * même endroit, sans se mélanger : chacune a SA fréquence, et ton poste
 * rouvre celle que tu veux.
 *
 * On fait pareil à l'intérieur d'un réseau : on veut faire passer PLUSIEURS
 * messages sur UN SEUL fil (une seule "connexion"), chacun sur sa fréquence,
 * puis les récupérer séparément. Ce fichier VÉRIFIE que ça marche.
 *
 * On ne teste que 4 questions, en français simple :
 *   TEST 1 — Les messages arrivent-ils INTACTS ?           (fidélité)
 *   TEST 2 — Un message DÉBORDE-t-il sur le voisin ?        (fuite)
 *   TEST 3 — Changer un message laisse-t-il les autres ?    (isolement)
 *   TEST 4 — COMBIEN de stations tiennent sur un fil ?      (densité)
 *
 * Tu peux tout modifier dans la zone "👉 À TOI DE JOUER" ci-dessous.
 */

// ══════════════════════════════════════════════════════════════════════════
// 👉 À TOI DE JOUER — change ces valeurs, relance, observe. Aucun risque.
// ══════════════════════════════════════════════════════════════════════════

// Les MESSAGES à envoyer (un nombre par station). Mets ce que tu veux.
const MESSAGES = [0.8, 0.5, 0.3];

// La FRÉQUENCE de chaque station, en Hz (comme "98.4 FM").
// Règle qui marche : garde-les espacées et sur des nombres ronds.
const STATIONS = [50, 120, 200];

// Le "volume" appliqué à chaque station en chemin (le "poids" de la connexion).
const VOLUMES = [1.0, 0.6, 1.3];

// Réglages techniques (tu peux les laisser tels quels).
const CADENCE = 1000; // combien de mesures par seconde (comme la qualité d'un son)
const DUREE = 1000; // combien de mesures on prend en tout

// Seuil : au-dessus de combien de "débordement" considère-t-on que ça rate ?
const SEUIL_FUITE = 0.05; // 0.05 = 5 %

// ══════════════════════════════════════════════════════════════════════════
// À PARTIR D'ICI, C'EST LA "MACHINERIE". Pas besoin d'y toucher pour jouer.
// ══════════════════════════════════════════════════════════════════════════

/*
 * "Émettre" un message sur une station = fabriquer une onde qui monte et
 * descend à la fréquence de la station, avec une hauteur = volume × message.
 * (C'est ça, une onde radio : une vibration à une fréquence donnée.)
 */
function emettre(frequence, hauteur) {
  const onde = new Float64Array(DUREE);
  for (let t = 0; t < DUREE; t++) {
    onde[t] = hauteur * Math.sin((2 * Math.PI * frequence * t) / CADENCE);
  }
  return onde;
}

/*
 * "Le poste de radio" : mesure la force du signal présent à UNE fréquence
 * précise dans un mélange d'ondes. (Techniquement : une transformée de
 * Fourier lue à un seul point. Mais tu n'as pas besoin de savoir ça.)
 */
function forceALaStation(melange, frequence) {
  const point = Math.round((frequence * DUREE) / CADENCE);
  let a = 0,
    b = 0;
  const k = (-2 * Math.PI * point) / DUREE;
  for (let t = 0; t < DUREE; t++) {
    a += melange[t] * Math.cos(k * t);
    b += melange[t] * Math.sin(k * t);
  }
  // On reconvertit en "hauteur de message" lisible.
  return (2 * Math.hypot(a, b)) / DUREE;
}

/*
 * "Additionner sur un seul fil" : on superpose toutes les ondes.
 * C'est l'étape clé — tout passe par LE MÊME fil, en même temps.
 */
function additionnerSurUnFil(ondes) {
  const fil = new Float64Array(DUREE);
  for (const onde of ondes) for (let t = 0; t < DUREE; t++) fil[t] += onde[t];
  return fil;
}

// Petit utilitaire d'affichage.
const pct = (x) => (x * 100).toFixed(3) + " %";
const ouiNon = (ok) => (ok ? "✅ OUI" : "❌ NON");

// ── On prépare les ondes (une par station) et le fil unique ───────────────
const nbStations = STATIONS.length;
const hauteurs = STATIONS.map((_, i) => VOLUMES[i] * MESSAGES[i]); // volume × message
const ondes = STATIONS.map((f, i) => emettre(f, hauteurs[i]));
const filUnique = additionnerSurUnFil(ondes); // TOUT sur un seul fil

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  VALIDATION : plusieurs messages sur un seul fil          ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`\nOn envoie ${nbStations} messages sur ${nbStations} stations, tous sur LE MÊME fil :`);
STATIONS.forEach((f, i) => {
  console.log(`   • Station ${f} Hz : message ${MESSAGES[i]}, volume ${VOLUMES[i]}  →  on devrait relire ${hauteurs[i].toFixed(3)}`);
});

// ══════════════════════════════════════════════════════════════════════════
// TEST 1 — Les messages arrivent-ils INTACTS ?
// On rouvre chaque station sur le fil unique et on compare au message attendu.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST 1 : les messages arrivent-ils intacts ? ──");
let test1OK = true;
STATIONS.forEach((f, i) => {
  const relu = forceALaStation(filUnique, f);
  const ecart = Math.abs(relu - hauteurs[i]) / hauteurs[i];
  const ok = ecart < 0.02; // toléré : 2 % d'écart
  if (!ok) test1OK = false;
  console.log(`   Station ${f} Hz : attendu ${hauteurs[i].toFixed(3)}, relu ${relu.toFixed(3)}  (écart ${pct(ecart)})  ${ouiNon(ok)}`);
});
console.log(`   ➜ Verdict : ${test1OK ? "✅ messages intacts" : "❌ messages abîmés"}`);

// ══════════════════════════════════════════════════════════════════════════
// TEST 2 — Un message DÉBORDE-t-il sur le voisin ? (la "fuite")
// Astuce : on n'allume QU'UNE station à la fois, et on écoute les AUTRES.
// Ce qu'on entend ailleurs = du débordement.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST 2 : un message déborde-t-il sur la station voisine ? ──");
let fuiteMax = 0;
STATIONS.forEach((fEcoute, b) => {
  const utile = forceALaStation(ondes[b], fEcoute); // ce qu'on entend chez soi
  let debordement = 0;
  STATIONS.forEach((_, j) => {
    if (j === b) return;
    // on écoute la station b alors que SEULE la station j émet
    debordement = Math.max(debordement, forceALaStation(ondes[j], fEcoute));
  });
  const ratio = debordement / utile;
  fuiteMax = Math.max(fuiteMax, ratio);
  console.log(`   Station ${fEcoute} Hz : débordement des voisines = ${pct(ratio)}`);
});
const test2OK = fuiteMax < SEUIL_FUITE;
console.log(`   ➜ Débordement le plus fort : ${pct(fuiteMax)}  (seuil ${pct(SEUIL_FUITE)})  ${ouiNon(test2OK)}`);

// ══════════════════════════════════════════════════════════════════════════
// TEST 3 — Changer UN message laisse-t-il les autres tranquilles ? (isolement)
// On double le message de la 1re station et on vérifie que les autres ne bougent pas.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST 3 : changer un message dérange-t-il les autres ? ──");
const messagesModifies = [...hauteurs];
messagesModifies[0] = hauteurs[0] * 2; // on double le 1er message
const ondesModifiees = STATIONS.map((f, i) => emettre(f, messagesModifies[i]));
const filModifie = additionnerSurUnFil(ondesModifiees);
let test3OK = true;
STATIONS.forEach((f, i) => {
  const avant = forceALaStation(filUnique, f);
  const apres = forceALaStation(filModifie, f);
  const change = Math.abs(apres - avant) / (hauteurs[i] || 1);
  if (i === 0) {
    console.log(`   Station ${f} Hz (celle qu'on a changée) : ${avant.toFixed(3)} → ${apres.toFixed(3)}  (a bougé, normal)`);
  } else {
    const ok = change < 0.02;
    if (!ok) test3OK = false;
    console.log(`   Station ${f} Hz (qu'on n'a pas touchée) : ${avant.toFixed(3)} → ${apres.toFixed(3)}  (bougé de ${pct(change)})  ${ouiNon(ok)}`);
  }
});
console.log(`   ➜ Verdict : ${test3OK ? "✅ chaque station est indépendante" : "❌ elles s'influencent"}`);

// ══════════════════════════════════════════════════════════════════════════
// TEST 4 — COMBIEN de stations tiennent sur un fil avant qu'elles se gênent ?
// On rapproche les stations petit à petit et on regarde quand ça déborde.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── TEST 4 : combien de stations tiennent sur un fil ? ──");
console.log("   (on rapproche 5 stations et on regarde à partir de quel écart ça reste propre)");
const largeurUtile = Math.floor(0.4 * DUREE); // plage de fréquences exploitable
let ecartMini = null;
for (const ecart of [1, 2, 3, 5, 8, 12, 20]) {
  // 5 stations rapprochées, volontairement mal placées (pire cas)
  const freqs = [];
  for (let i = 0; i < 5; i++) freqs.push(((120 + i * ecart + 0.5) * CADENCE) / DUREE);
  const petitesOndes = freqs.map((f) => emettre(f, 1));
  let pire = 0;
  freqs.forEach((fEcoute, b) => {
    const utile = forceALaStation(petitesOndes[b], fEcoute);
    freqs.forEach((_, j) => {
      if (j === b) return;
      pire = Math.max(pire, forceALaStation(petitesOndes[j], fEcoute) / utile);
    });
  });
  const ok = pire < SEUIL_FUITE;
  if (ok && ecartMini === null) ecartMini = ecart;
  console.log(`   écart ${String(ecart).padStart(2)} Hz : débordement ${pct(pire).padStart(9)}  ${ouiNon(ok)}`);
}
if (ecartMini !== null) {
  const nbCanaux = Math.floor(largeurUtile / ecartMini);
  console.log(`   ➜ Écart minimum propre : ${ecartMini} Hz  →  on peut mettre ~${nbCanaux} stations sur un fil.`);
} else {
  console.log("   ➜ Aucun écart testé ne reste propre : écarte davantage les stations.");
}

// ══════════════════════════════════════════════════════════════════════════
// RÉSUMÉ FINAL — en une phrase par test
// ══════════════════════════════════════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  RÉSUMÉ                                                    ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`  TEST 1 (messages intacts)     : ${test1OK ? "✅ réussi" : "❌ raté"}`);
console.log(`  TEST 2 (pas de débordement)   : ${test2OK ? "✅ réussi" : "❌ raté"}  — débordement max ${pct(fuiteMax)}`);
console.log(`  TEST 3 (stations indépendantes): ${test3OK ? "✅ réussi" : "❌ raté"}`);
console.log(`  TEST 4 (densité)              : ~${ecartMini !== null ? Math.floor(largeurUtile / ecartMini) : "?"} stations par fil`);
console.log("\n  En clair : oui, on peut faire passer plusieurs messages sur un");
console.log("  seul fil et les récupérer séparément — comme des stations de radio.\n");

const toutOK = test1OK && test2OK && test3OK;
process.exit(toutOK ? 0 : 1);
