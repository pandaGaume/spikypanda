# Brief d'expérience — MCSA / barres rotoriques cassées

*Tâche réelle pour le substrat multi-fréquence, avec baseline publiée. Calibré sur
« Envelope-Domain Preprocessing for Ultra-Compact LSTM-Based Broken Rotor Bar Severity
Grading » (Pelletier, DotVision). Prêt à exécuter dans Claude Science.*

---

## 0. Pourquoi cette tâche est le test idéal du substrat

Le papier LSTM démontre déjà, à la main, **la thèse du substrat** : « careful signal
representation can substitute for model scale ». L'enveloppe extraite par moving-RMS
**est** un démodulateur d'amplitude : elle lit la modulation à `2sf` — c'est-à-dire les
**bandes latérales** `f(1±2s)` de la signature de défaut. Le substrat fréquentiel fait
ça *nativement*, sans le pipeline de préprocessing à 7 modes d'échec.

Correspondance directe avec les hypothèses déjà prouvées :
- **H1/H6** : lire le porteur (60 Hz) et les latérales `f(1±2s)` en amplitude *et*
  phase = multiplexage complexe.
- **H4 (couplage)** : la **profondeur de modulation** = force du couplage porteur↔latérale.
  Or la sévérité BRB ∝ profondeur de modulation ∝ `k/N` (2,9 % à BRB1, 11,8 % à BRB4).
  **Grader la sévérité = lire la force du couplage.** C'est littéralement H4.
- **H5 (compacité)** : ton argument (4 773 params battent des CNN à 143 M) est celui du
  substrat, poussé plus loin : au lieu d'apprendre l'extraction d'enveloppe, on **pose**
  les fréquences de signature comme bandes → encore moins de capacité nécessaire.

---

## 1. Baseline à battre (tes chiffres, dataset UFU)

| Modèle | Params | 5 classes | Binaire | Note |
|---|---|---|---|---|
| VGG-19 [Barrera] | 143,7 M | 99,4 % | — | GPU, spectrogramme |
| NASNet-M | 5,3 M | 96,2 % | — | GPU |
| CNN-LSTM [Jakaria] | ~100 K | 92,3 % | — | GPU, courant brut |
| **LSTM h=32 (ton papier)** | **4 773** | **88,0 %** | **97,3 %** | CPU navigateur, enveloppe |
| FFT + SVM | n/p | 81,5 % | — | 18 features à la main |
| **FFT + MLP** | **773** | **67,0 %** | — | **petit modèle sur features FFT** |

**Métrique-phare du papier : accuracy / 10K params** — ton LSTM = **184,4**, vs 0,007–9,2
pour les gros. C'est LÀ que le substrat doit briller.

**Split & données :** dataset Broken Rotor Bar UFU (IEEE DataPort). Moteur 1 hp, 60 Hz,
4 pôles, 34 barres, glissement `s≈0,047` à charge nominale. 5 états (Healthy, BRB1–4) ×
8 charges (12,5–100 %) × 10 reps, 18 s à ~55,6 kHz, courants `Ia,Ib,Ic`. **Utiliser le
même split que le papier** pour une comparaison directe.

---

## 2. Le modèle substrat — conception

**Physique posée en dur (l'a priori structuré) :** porteur `f=60 Hz` ; latérales
`f(1±2s)` (54,4 / 65,6 Hz à charge nominale) ; fréquence de modulation `2sf ≈ 2–6 Hz`
selon la charge.

**Deux variantes à comparer :**

**Variante A — lecture directe des latérales (spectre du courant).**
- `SpectralSynapse` avec bandes = `{f, f(1−2s), f(1+2s)}` pour quelques valeurs de `s`
  couvrant la plage de charge (banc de latérales).
- Terme de **couplage** porteur↔latérale = profondeur de modulation → entrée du
  classifieur de sévérité.
- Gère le **glissement** (les latérales bougent avec la charge) : soit un petit banc de
  bandes couvrant la plage `s∈[0, 0,05]` et le substrat apprend lesquelles comptent,
  soit estimation de `f`/`s` sur le pic fondamental puis bandes adaptatives.

**Variante B — domaine enveloppe (miroir de ton pipeline, mais complexe).**
- Démoduler (comme ton moving-RMS), puis le substrat lit la bande de **modulation**
  `2–6 Hz` en complexe (amplitude *et* phase). Avantage : la modulation reste dans
  `2–6 Hz` quelle que soit la charge → **robuste au confond de charge** que tu combattais
  au centrage par fenêtre. La sévérité = amplitude dans cette bande.
- C'est ta preuve d'enveloppe, mais lue nativement en fréquence complexe, sans les
  étapes fragiles (centrage, gain G, clamp).

**Sortie :** 5 classes de sévérité via un petit classifieur sur (couplage / amplitude de
modulation par phase). Viser explicitement deux budgets de paramètres :
- **~773 params** (= FFT+MLP) — la comparaison qui tue ;
- **~4 773 params** (= ton LSTM) — comparaison à budget égal.

---

## 3. Les comparaisons (le cœur du résultat)

1. **Substrat ~773 p vs FFT+MLP 773 p (67,0 %).** C'est le test décisif. Le papier dit :
   « FFT features alone are insufficient for a small parametric model **without additional
   structure** ». Le substrat *fournit* cette structure (bandes aux latérales + couplage).
   Si un substrat de ~773 params bat nettement 67 %, on démontre directement que **la
   structure fréquentielle, pas juste les features, fait la différence**. Résultat
   publiable en soi.
2. **Substrat vs ton LSTM (88,0 % / 4 773 p), sans préprocessing manuel.** Égaler 88 %
   avec ≤ params et **sans** le pipeline à 7 modes d'échec = le substrat remplace
   l'ingénierie de représentation par un a priori physique posé.
3. **Efficacité (métrique-phare) :** accuracy / 10K params. Battre 184,4 = titre.

---

## 4. Métriques

- Accuracy 5 classes (comparable au 88,0 %).
- Accuracy binaire Healthy/Faulty (comparable au 97,3 %).
- **Accuracy / 10K params** (la métrique-phare).
- Structure de la matrice de confusion : les erreurs doivent rester **entre sévérités
  adjacentes** (BRB2↔3, BRB3↔4), comme dans ton papier — signe que le modèle lit bien la
  profondeur de modulation.
- Recall Healthy et BRB1 (tes points durs : 93,8 % et 80,0 %).
- Robustesse en **charge faible** (là où la modulation frôle le bruit — ton pire cas).

---

## 5. Critères de réussite (étagés, honnêtes)

- **Minimum (valide l'a priori structuré) :** substrat ~773 p **> 67 %** (bat FFT+MLP à
  budget égal), erreurs entre classes adjacentes.
- **Bon :** substrat **≥ 88 %** en 5 classes **sans** le préprocessing manuel, à params
  ≤ 4 773.
- **Fort :** **> 88 %** et/ou **meilleure accuracy/10K params** que 184,4, et/ou binaire
  **> 97,3 %**.

---

## 6. Risques à assumer (ne pas les cacher)

- **Glissement / charge.** Les latérales bougent avec `s`. C'est exactement le confond
  que ton centrage combattait. La variante B (domaine enveloppe) est la parade la plus
  sûre ; la variante A demande une gestion du banc de bandes ou une estimation de `s`.
- **BRB1 à charge faible.** Modulation ~2,9 %, proche du plancher de bruit — ton cas le
  plus dur (80 % recall). Le substrat n'a pas de magie ici ; on rapporte honnêtement.
- **Un seul moteur / 60 Hz / 34 barres.** Généralisation (50 Hz, autres comptes de
  barres, vitesse variable) non testée — même limite que ton papier, à écrire.
- **Le substrat doit vraiment marcher sur du réel bruité.** Pas garanti de battre 88 %.
  C'est le test dur qui *renforce* le dossier, quel qu'en soit le verdict.

---

## 7. Lien déploiement (bonus fort)

Ta section VI décrit un runtime graphe capable de **charger et modifier la topologie
ONNX au runtime** (plasticité structurelle) sur ESP32 — c'est spikypanda. Et l'étage de
monitoring « tracks the frequency spectrum and harmonic signature » : c'est *exactement*
ce que fait le substrat. Donc le substrat n'est pas qu'un classifieur candidat — il peut
être **l'étage de monitoring lui-même** (lecture spectrale native) *et* un classifieur
compact. Ça relie la recherche (multipath fréquentiel) au produit (TinyML MCSA) sur le
même moteur.

---

## 8. Oracles (ce que le substrat doit retrouver)

Rappels des mesures autonomes, à retrouver dans le vrai pipeline :
- lecture de bande complexe exacte (H1/H6, `phase-standalone.mjs`) ;
- profondeur de modulation = `A·m/2` sur les latérales (H4, `couplage-standalone.mjs`) ;
- placement **inharmonique** + suréchantillonnage sous non-linéarité (H7) — ici les
  latérales `f(1±2s)` sont proches du porteur, donc soigner la résolution fréquentielle
  (fenêtre longue) pour les séparer sans fuite.

---

## Résumé exécutif

Refaire le grading BRB 5 classes du dataset UFU avec le substrat fréquentiel, à deux
budgets (~773 et ~4 773 params), contre trois baselines réelles (LSTM 88 %, FFT+SVM
81,5 %, FFT+MLP 67 %). Le pari : la structure (bandes aux latérales `f(1±2s)` + couplage
= profondeur de modulation = sévérité) permet d'égaler/battre 88 % **sans** le
préprocessing manuel, et surtout de pulvériser FFT+MLP à budget égal — prouvant sur un
vrai problème que l'a priori fréquentiel *est* la compacité (H5).
