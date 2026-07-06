# Plan : du substrat modal à de tout-petits modèles de DSP sur MCU

*Objectif borné (cadré par l'utilisateur) : PAS de nouveau latent pour world models.
Transformer la réflexion Koopman/modale en **modèles de traitement du signal minuscules,
en flux (streaming), déployables sur microcontrôleur** (ESP32 d'abord). Voir la théorie
dans [`h3/mux/MODAL-SCALING.md`](h3/mux/MODAL-SCALING.md).*

---

## L'insight-pont (pourquoi c'est *déjà* du MCU, pas un rêve)

Un mode `λ_k = ρ_k e^{iω_k}` est une **paire de pôles complexes conjugués = exactement un
biquad** (filtre RII / IIR d'ordre 2). Donc :

- **l'évolution modale diagonale `ψ ← Λ ψ` = un banc de résonateurs** qui tournent sur le flux ;
- ça se ramène à des **MAC réels** (la rotation 2×2 `na=ρ(cosθ·a−sinθ·b)`, `nb=ρ(sinθ·a+cosθ·b)`
  que `modal_scaling.py` implémente déjà = la récurrence biquad) ;
- **aucune FFT** nécessaire pour la récurrence (traitement échantillon par échantillon, pas de
  buffer de trame) ;
- ça mappe sur `arm_biquad_cascade_df1_f32/q15` de **CMSIS-DSP** (hyper-optimisé) ;
- et le dépôt **a déjà** le nœud biquad (`SpBiquadFilter`, boucliers ONNX 1.18 + UE5 5.4) et un
  moteur spectral (`SpectralInferenceRuntime`).

**Ce que ça règle** : la crainte de la Décision-002 (« ONNX/TS ne supportent pas les ops
complexes ») **disparaît** : on n'exporte pas d'arithmétique complexe, on **abaisse** les modes
complexes en **coefficients biquad réels** avant export. Le complexe vit à l'entraînement
(PyTorch, Wirtinger gratuit) ; le déployé est un banc de RII réels + une lecture linéaire.

## État réel du dépôt (vérifié, pas de mémoire)

| Brique | État | Ce qu'il manque pour le plan |
|---|---|---|
| `SpBiquadFilter` (plugin-dsp) | ✅ existe, ONNX+UE5 | ne prend que des **presets** (LP/HP/BP/Notch via cutoff+Q). Doit accepter des **pôles appris** `(ρ,ω)` ou coeffs bruts |
| `SpectralInferenceRuntime` (core) | ✅ gain·e^{iφ} + couplage par bande | **par FFT-bloc**, pas en flux. Besoin d'une variante **résonateur streaming** |
| Ops DSP ONNX (`SpFFT…SpMFCC`) + `validate_onnx_export.py` | ✅ chemin d'export réel | rien (réutiliser) |
| `SpKalman1D` | ✅ filtre récursif streaming | précédent utile (même patron d'état) |
| Pipeline PyTorch (`modal_scaling.py`, `cvnn.py`, `multifault.py`) | ✅ entraînement + générateur multi-faute | rien (réutiliser) |
| Port ESP32 (DriverV2) | ⏳ frontière, pending | c'est la dernière phase |

---

## La cible recommandée (le point d'appui)

**Moniteur modal multi-faute en flux, sur ESP32.** C'est l'intersection exacte de (a) la force
*démontrée* du substrat et (b) la contrainte MCU :

- `multifault.py` a montré : **13 params, O(1) en nombre de fautes K**, 100 % exact-match sur K=16
  fautes simultanées, là où un dense s'effondre. C'est LA tâche où le substrat gagne.
- Sur MCU, la valeur n'est **pas** « battre le TCN en accuracy » (établi : le TCN gagne en
  mono-faute) mais : **10-100× moins de RAM/calcul, en flux, sans buffer FFT, O(1) en K fautes,
  stable par construction**. C'est une vente d'**efficacité**, honnête et différenciée.

*Alternatives (même pipeline, si tu préfères) : débruiteur modal streaming, ou prédicteur
un-pas (forecast) pour maintenance prédictive. Je recommande le moniteur multi-faute : c'est le
seul où la théorie a un avantage prouvé, pas juste une parité efficace.*

**Métrique de succès** : accuracy multi-faute acceptable à **≤ X KB RAM**, **≤ Y cycles/échantillon**,
en flux, comparé à (1) FFT+seuil (baseline classique), (2) le TCN existant (plafond d'accuracy),
(3) un banc de biquads **conçu à la main** (est-ce que l'apprentissage aide vraiment ?).

---

## Le plan, en paliers (même méthode que le reste du dossier : on ne saute pas)

### Phase 1 — L'abaissement résonateur (le crux technique)
- ✅ **FAIT (2026-07-06) — l'abaissement Python + la preuve d'équivalence** (`mcu_lower_lru.py`) :
  le `DiagComplexLRU` validé s'abaisse *exactement* en banc de biquads (chaque mode
  `λ_k = ρ_k e^{iθ_k}` → une section du second ordre, forme couplée `[g,-w; w,g]`, denominator
  `a1=-2ρcosθ, a2=ρ²`). Test : équivalence bit-proche (`1.25e-6` sur poids aléatoires ; sur le
  modèle entraîné réel, **100% d'accord de prédiction, accuracy identique 89.8%**, diff `2.9e-5`).
  Budget mesuré : **~42 900 MAC/fenêtre, 512 o d'état, streaming, sans FFT ni complexe runtime**.
  Le banc appris = résonateurs de mémoire 4-139 échantillons à basse fréquence (bande 2sf BRB).
- ⏳ **RESTE — le nœud TS `SpModalResonator`** (ou étendre `SpBiquadFilter`) : accepter des coeffs
  biquad appris `(a1,a2)` + la forme couplée, charger les coefficients extraits, et re-vérifier
  l'équivalence côté moteur (test dans `packages/tests/spectral/`). C'est le pont vers l'engine.
- (Le couplage `C` de `D+C` reste optionnel : le modèle diagonal pur valide déjà à 88%.)

### Phase 2 — Entraîner le modèle déployable
- Réutiliser le pipeline CVNN (`cvnn.py`, générateur `multifault.py`) : entraîner le moniteur sur
  du multi-faute synthétique, puis sur le flux MCSA/vibration réel.
- **Contraindre `|λ| ≤ 1`** (déjà via `sigmoid(rho_raw)` dans `WaveKoopman`) ⇒ les résonateurs ne
  divergent **jamais** en flux. **C'est ici que le travail `D+C` / forme de Schur devient une
  EXIGENCE de déploiement, pas académique** : un RII appris non contraint peut avoir `|λ|>1` et
  exploser sur un flux long. La stabilité par construction est l'argument produit.
- **Apprendre seulement le couplage** `C` par-dessus le backbone diagonal `D` (params O(r) + `C`
  creux). *Livrable : le modèle atteint la cible ET est prouvé stable.*

### Phase 3 — Export + validation navigateur/TS
- Exporter via le chemin ONNX existant (`validate_onnx_export.py`). Banc de résonateurs + lecture
  = **ops réelles** ⇒ export propre, **zéro op complexe** (le problème Décision-002 contourné).
- Valider dans `plugin-dsp` / `SpectralInferenceRuntime` : le banc streaming == PyTorch.
  *Livrable : ça tourne dans le navigateur, chiffres reproductibles.*

### Phase 4 — Port MCU (ESP32)
- ✅ **FAIT — référence C bit-exacte + verdict point-fixe** (`mcu_resonator.c` + `mcu_c_verify.py`) :
  le kernel C réel (forme couplée `[g,-w;w,g]` + drive + head, float32) compile (gcc) et donne des
  prédictions **identiques** au modèle torch sur le test propre (`max|C−torch|=4.6e-5`, **100%
  d'accord 392/392**). **Point-fixe : pas de problème** malgré `ρ_max=0.9989` : coeffs à **≥10 bits
  fractionnaires = accuracy identique au float** (6-8 bits coûtent ~1-2 pt) ; le banc de 64 modes est
  redondant, aucun pôle unique n'est critique. Seul reste le **range** (gain à résonance ~900× pour
  le mode `ρ=0.999` → format Q avec assez de bits entiers, ou normaliser l'entrée) : détail DSP,
  pas un bloqueur ; sur ESP32-S3 (FPU) on reste en `f32`.
- ⏳ **RESTE — le port sur puce réelle** : porter `mcu_resonator.c` sur un ESP32-S3, mapper
  éventuellement sur `arm_biquad_cascade_df1_f32` (CMSIS-DSP), réutiliser le chemin de DriverV2, et
  **mesurer sur puce** : RAM, cycles/inférence, énergie. Budget attendu : ~43k MAC/fenêtre, 512 o
  d'état (mesuré en Phase 1).

### Phase 5 — Les démos différenciantes (pourquoi > un banc de biquads figé)
- (a) **L'apprentissage aide-t-il ?** pôles+couplage appris vs banc conçu à la main sur la tâche.
  *Falsifiable* : si non, la contribution rétrécit à « conception DSP automatisée » (toujours
  utile, mais claim plus petit — à assumer).
- (b) **O(1) en K** : ajouter des fautes ne fait pas grossir le modèle, sur puce (le résultat
  `multifault.py`, mais déployé).
- (c) **Stabilité** : flux long-horizon qui ne diverge jamais (`|λ|≤1`) là où un RII appris libre
  explose.

---

## Risques & critères d'arrêt (éthos du dossier : honnête d'avance)

- **Transfert au réel** : les latérales MCSA réelles sont minuscules/bruitées (variante A ~40 %) ;
  un résonateur streaming pourrait exiger de l'intégration (enveloppe) qui reconflit avec la phase.
  Le **win multi-faute synthétique est propre** ; le transfert au réel est le **vrai risque ouvert**.
- **Parité, pas suprématie** : sur mono-faute réel, ça ne bat pas le TCN (établi). Si l'appli cible
  exige l'accuracy max en mono-faute, **ce n'est pas l'outil** — le pitch doit rester efficacité/flux/
  multi-faute.
- **Apprentissage neutre** : si le banc appris ≈ banc à la main, on livre du « DSP auto-conçu ».
- **Point fixe** : peut forcer `f32` (ESP32-S3 OK ; sous-classe de MCU exclue).

## Premier pas concret (le keystone)

**Phase 1** : le nœud `SpModalResonator` (coeffs arbitraires) + l'abaissement PyTorch→biquad avec
son test d'équivalence bit-proche. Tout le reste est de la plomberie qui existe déjà. Une fois ce
pont posé et vérifié, les phases 2-4 réutilisent le pipeline en place.

*Réfs : [`h3/mux/MODAL-SCALING.md`](h3/mux/MODAL-SCALING.md) (théorie + preuve de scaling),
[`etapeD-mcsa/RESULTS.md`](etapeD-mcsa/RESULTS.md) (verdict MCSA réel), `h3/mux/multifault.py`
(le générateur + le résultat O(1)-en-K), `DECISION-002-cvnn-entrainement.md` (frontière
entraînement/déploiement).*
