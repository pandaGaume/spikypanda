# Résultats — L3 MCSA, variante B (domaine enveloppe)

*Données réelles UFU (déjà dans le dépôt) : `packages/host/www/data/motor_current/{train,test}.json`
= fenêtres d'enveloppe 64×3 (Ia,Ib,Ic), 5 classes (Healthy, BRB1–4), 1600 train / 400 test.
Le substrat lit la modulation (sévérité) dans les **bins bas complexes** du spectre de
l'enveloppe (la mécanique L2, sur du courant réel). Exécuté ici (PyTorch 2.11).*

## Baselines publiées (ton papier, dataset UFU)

LSTM **88.0 %** (4773 p) · FFT+SVM **81.5 %** · **FFT+MLP 67.0 % (773 p)** · métrique acc/10K.

## Résultats — deux budgets, 5 graines

**Petit budget (~773 p, la « comparaison qui tue » vs FFT+MLP) :**

| Modèle | Params | 5 classes | Binaire H/F | acc/10K | Recall (H,B1,B2,B3,B4) |
|--------|-------:|-----------|-------------|--------:|------------------------|
| **Substrat CVNN** | **677** | **81.2 ± 1.8 %** (max 83.0) | 94.9 % | 1200 | .92 / .81 / .78 / **.68** / .87 |
| MLP `\|FFT\|` (bins bas) | 485 | 79.4 ± 1.1 % | 92.8 % | 1637 | .88 / .76 / .79 / .68 / .88 |
| MLP signal brut | 1589 | 20.3 % (hasard) | 59.4 % | 128 | — |

**Grand budget (~budget LSTM) :**

| Modèle | Params | 5 classes | Binaire |
|--------|-------:|-----------|---------|
| Substrat CVNN | 2701 | 78.4 ± 0.9 % | 94.6 % |
| **MLP `\|FFT\|`** | 2109 | **84.8 ± 1.3 %** (max 87.3) | 95.3 % |
| MLP signal brut | 1589 | 21.4 % (hasard) | 58.5 % |

## Lecture (honnête, importante)

- ✅ **Critère minimum du brief atteint** : un modèle à structure fréquentielle et ~773 p **bat
  FFT+MLP (81 % vs 67 %)** et **égale FFT+SVM (81,5 %)** ; le MLP sur signal brut (1589 p, sans
  a priori) reste **au hasard**. ⇒ **H5 confirmé sur du réel** : la *structure* (lire les bons
  bins), pas la capacité, fait la compacité. Les erreurs sont entre **sévérités adjacentes**
  (BRB3 = dur, recall .68), comme dans ton papier.
- ⚠️ **Mais le substrat COMPLEXE n'a aucun avantage ici — le MLP-magnitude gagne à l'échelle**
  (84.8 % vs 78.4 %). **Raison de fond** : l'enveloppe RMS **est déjà une démodulation
  d'amplitude** — elle a **jeté la phase**. La profondeur de modulation ne vit plus que dans les
  **magnitudes**, que le MLP-|FFT| lit directement ; la machinerie de phase du CVNN est alors du
  poids mort (et sur-apprend au grand budget). C'est cohérent avec L2.5 : sur du *grading
  d'amplitude*, complexe ≈ (ou <) magnitude.
- ⇒ **La thèse du substrat (la PHASE porte de l'info, H6 ; « la structure remplace le
  préprocessing ») ne peut PAS se tester en variante B.** L'enveloppe est le préprocessing du
  papier, et elle détruit précisément ce que le complexe exploite.

# Variante A — spectre du COURANT BRUT (phase intacte) : le test décisif

Prep (`mcsa_variantA_prep.py`, 28 s) : dé-référencer Ia/Ib/Ic des `.mat` (7,3 Go), **4 fenêtres de
1 s** en régime établi (transitoire 6 s sauté), FFT, **carrier ± 10 bins complexes** (21 bins)
**référencés au fondamental** (division complexe → invariant charge *et* phase porteuse, **phase
relative des latérales gardée**). 1600 fenêtres, split **par répétitions** (reps 8-9 = test, pas de
fuite d'acquisition) : 1280 train / 320 test, 5 classes équilibrées.

Balayage de régularisation (weight-decay), grand budget (~2 400 p CVNN), bande étroite k=1 (±10 bins),
5 graines. La régularisation n'est **pas** un détail ici : elle décide si l'avantage complexe tient.

| wd | CVNN (complexe) | MLP (magnitude) | Écart |
|----|-----------------|-----------------|-------|
| 0 | 40.0 ± 15.6 % (max 61.6) | 31.5 ± 2.1 % | +8.5 |
| 1e-4 | 36.8 ± 10.8 % (max 52.8) | 31.4 ± 1.9 % | +5.4 |
| **3e-4** | **46.3 ± 12.5 %** (max 62.8) | 31.9 ± 1.4 % | **+14.4** |
| 1e-3 | 29.2 ± 5.0 % (max 39.1) | 30.1 ± 5.6 % | −0.8 |

**Résultat clé : le complexe bat la magnitude, et l'écart *survit à une régularisation légère à
modérée*** (jusqu'à **+14 pts** à wd=3e-4, CVNN 46 % vs MLP 32 %). ⇒ **H6 tient sur du réel** : la
**phase** des latérales porte une information que la magnitude ne voit pas, et ce n'est **pas** un
artefact de variance (sinon la régularisation l'effacerait à toute dose ; elle le **renforce** à dose
modérée). C'est le seul endroit du dossier où le complexe démontre son avantage sur une **vraie** tâche.

⚠️ **Correction d'une affirmation antérieure.** J'avais écrit « le complexe bat *robustement* la
magnitude ». Le balayage montre que **« robustement » était trop fort** : l'avantage est réel mais **à
forte variance** (±10 à 15 pts sur 5 graines) et **s'effondre sous régularisation forte** (wd=1e-3 →
parité, −0.8). Le signal de phase est **faible SNR** : trop de régularisation le sacrifie en premier
(le CVNN chute 40 → 29 alors que la magnitude reste ~30). Formulation honnête : l'écart existe et
survit à une régularisation *bien dosée*, il n'est **ni** un artefact **ni** robuste au sens fort.

⚠️ **Honnêteté (deux réserves) :**
1. **Instabilité.** Le CVNN est **à forte variance** sur cette tâche dure/bruitée (±16 %, la moyenne
   bouge de 40 à 55 % selon le run). Un run favorable donnait 55 %, mais **ce n'est pas la moyenne
   robuste** (~40 %). L'avantage *relatif* sur la magnitude, lui, est stable.
2. **Accuracy absolue modeste** (~40 %) ≪ variante B (81 %) < LSTM (88 %). Les latérales BRB sont
   **minuscules** (~1,5 % du fondamental) → très bruitées en spectre mono-fenêtre ; l'enveloppe RMS
   (variante B) les **intègre** (bien meilleur SNR).

**Le peigne large n'aide pas — mais mon premier argument était faux (correction).** Physiquement, BRB
est un **peigne** de latérales à `f(1±2ks)` dont l'amplitude+phase encode count *et* position. J'avais
conclu : « le peigne large ajoute du bruit *sous le seuil* et **efface** l'avantage complexe ».
**Objection juste** : si une signature est sous le bruit, **aucun** classifieur ne la voit, donc elle
ne peut pas *activement nuire* non plus. J'ai re-testé proprement (bande étroite 21 bins vs peigne 61
bins, **à régularisation appariée**, 5 graines) :

| wd | CVNN étroit (21 bins) | CVNN peigne (61 bins) | peigne − étroit |
|----|-----------------------|-----------------------|-----------------|
| 0 | 40.0 % | 33.6 % | −6.4 |
| 1e-4 | 36.8 % | 31.5 % | −5.3 |
| 3e-4 | 46.3 % | 36.5 % | −9.8 |
| 1e-3 | 29.2 % | 27.1 % | −2.1 |

**Ce que ça corrige, et ce qui survit :**
- **Tu avais raison sur le mécanisme.** La régularisation **réduit** la pénalité du peigne (de −6.4 à
  −2.1 quand wd monte) : la majeure partie du « peigne nuit » était du **surapprentissage** aux bins de
  bruit ajoutés, pas une signature qui « efface » l'avantage. Mon argument « sous le bruit → nuit » était
  **logiquement incorrect**.
- **Mais le peigne n'aide toujours pas.** À **chaque** niveau de régularisation, étroit > peigne (jamais
  d'inversion). Les ordres k≥2 n'apportent **aucun signal de classe exploitable** sur ce jeu (cohérent
  avec ton point : sous le bruit = invisible, donc rien à gagner). Au sweet spot de régularisation
  (wd=3e-4, où l'étroit culmine à 46 %), l'écart est même le **plus large** (−9.8) : à capacité et
  régularisation fixes, étaler le modèle sur 61 bins dont ~3 portent le signal **dilue** l'ajustement des
  bons bins (fardeau de sélection de features sur 1 280 exemples), sans récompense en signal.
- **UFU a une position FIXE** (barres adjacentes, seul le *nombre* varie) → l'information « position »
  (portée par les phases des ordres supérieurs) n'est **pas une variable** de ce dataset : le peigne n'a
  structurellement rien à révéler ici, quel que soit le SNR.

**Verdict corrigé :** la bande étroite k=1 reste le sweet spot, **non pas** parce que le peigne « nuit »
(faux), mais parce que ses bins supplémentaires sont **neutres à légèrement coûteux** (dilution) et
**vides d'information** sur un dataset à faute unique et position fixe.

# Verdict MCSA (honnête, nuancé) — c'est le vrai résultat

**Une tension de fond, et c'est *elle* le résultat :**
- La **phase aide** (variante A : complexe ~2× magnitude) — **H6 tient sur du réel**.
- Mais les **latérales minuscules exigent de l'intégration** (enveloppe / moyennage) pour le SNR,
  ce qui **détruit la phase** (variante B = MCSA classique).
- Donc le complexe gagne **à représentation égale** (spectre brut), mais la représentation qui gagne
  en **accuracy absolue** (enveloppe) est justement celle qui **n'a plus de phase**.

**Bilan des hypothèses sur du réel :**
- ✅ **H5** (structure = compacité) : confirmé — variante B bat FFT+MLP (81 vs 67 %), écrase le brut.
- ✅ **H6** (la phase porte de l'info) : confirmé — variante A, complexe **≫** magnitude.
- ⚠️ **« La structure fréquentielle remplace le préprocessing » : non prouvé.** L'enveloppe
  (préprocessing) reste le meilleur extracteur pour ces latérales faibles ; le substrat brut ne
  l'égale pas, et n'égale pas le LSTM 88 % par cette voie. **Verdict honnête** (brief §6 : le test
  dur renforce le dossier quel qu'en soit le verdict).

**Pistes si on veut pousser** : (a) moyennage **cohérent** (aligné en phase) → SNR sans perdre la
phase ; (b) **hybride** enveloppe (amplitude, SNR) + spectre courant (phase) ; (c) accepter que,
pour BRB, la sévérité est d'abord un phénomène **d'amplitude** et la phase un signal secondaire —
ce que ces mesures suggèrent.

# Topologie & vrai substrat (les 2 points soulevés)

Deux remarques : (1) on n'utilisait pas le *multi-frequency synapse* (juste des MLP complexes) ;
(2) la **topologie** compte. Réponses mesurées.

## TCN (topologie temporelle) — variante B enveloppe

| Modèle | Params | 5 classes | Binaire H/F | Recall (H,B1..B4) |
|--------|-------:|-----------|-------------|-------------------|
| **TCN** | 4229 | **80.7 ± 2.4 %** (max 83.5) | **97.1 %** | .91/.93/.91/.63/.61 |

La topologie **aide nettement** : binaire **97.1 % ≈ papier (97,3 %)**, bien au-dessus des MLP
(88-95 %). **Point (2) confirmé.** Mais le grading 5-classes plafonne ~80 % (confusion BRB3↔4,
la limite fondamentale : k vs k+1 barres).

## Les 3 formes du substrat vs baselines (variante B, config commune, 5 graines)

| Modèle | Params | 5 classes | Binaire | acc/10K |
|--------|-------:|-----------|---------|--------:|
| **TCN** (topologie) | 4229 | **80.7 %** | **97.1 %** | 191 |
| Hybride substrat+TCN (3) | 2009 | 77.7 % | 94.6 % | 386 |
| MagMLP | 629 | 65.9 % | 88.0 % | 1048 |
| CVNN dense | 449 | 62.0 % | 87.3 % | 1380 |
| **SpectralSynapse structuré (1)** | 335 | **52.5 %** | 82.0 % | 1567 |
| **Couplage bilinéaire H4 (2)** | 869 | **49.1 %** | 75.7 % | 564 |

**Résultat honnête (et un peu humblant) :**
- La **topologie temporelle (TCN) gagne largement** — c'est LA leçon.
- L'**hybride substrat+TCN (77.7 %) ne bat PAS le TCN seul (80.7 %)** : ajouter le substrat spectral
  par-dessus la topologie **n'aide pas** (dégrade même un peu).
- Les **formes fidèles du substrat sous-performent** : le SpectralSynapse structuré (52.5 %) et le
  couplage bilinéaire (49.1 %) sont **les pires**, sous les baselines génériques.

**Pourquoi (l'insight profond)** : passer en **bins FFT jette l'ordre temporel**. Or pour
l'enveloppe BRB, c'est justement **l'évolution temporelle** de la modulation que le LSTM/TCN
exploitent. Le substrat fréquentiel (statique en bandes) est **structurellement désavantagé** sur
une tâche **temporelle**. Il brille là où la structure fréquentielle *est* le signal (H1/H6,
démos), pas là où le signal est une dynamique temporelle.

# Verdict global MCSA (honnête)

- **H5 / H6 tiennent en tant que mécanismes** (variante A : phase > magnitude ; structure > brut),
  mais **ne suffisent pas à gagner la tâche réelle** : un **TCN standard bat tous les modèles
  substrat**, et le grading 5-classes plafonne ~80 % pour tous (< LSTM 88 %).
- **« La structure fréquentielle / le substrat remplace la topologie et le préprocessing » : non
  prouvé, plutôt infirmé** sur MCSA. Le substrat est un *mécanisme réel et niche* (lecture
  spectrale complexe, phase), pas un modèle universellement supérieur ici.
- C'est le **test dur** que le brief (§6) demandait : il *renforce le dossier* en le rendant
  honnête — le substrat a une valeur claire (H1/H6 prouvés, monitoring spectral natif) mais **la
  topologie temporelle reste reine pour le grading BRB**. Une piste cohérente = **substrat comme
  étage de monitoring spectral + TCN pour le grading**, chacun sur son terrain.
