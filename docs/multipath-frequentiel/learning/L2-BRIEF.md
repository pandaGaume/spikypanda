# Brief L2 — Classification synthétique de profondeur de modulation

*Le barreau manquant entre H3 (fit trivial) et MCSA (réel). Exerce toute la pile
d'apprentissage CVNN (Décision 002) sur le **mécanisme MCSA en version propre**. Runnable
en PyTorch, dans Claude Science.*

---

## 0. But

Deux objectifs d'un coup :
1. **Valider la pile d'entraînement CVNN** de bout en bout : réseau complexe multi-couches,
   gradient de Wirtinger, activation préservant la phase (modReLU), loss `softmax + CE`,
   mini-batches, généralisation train/test. C'est ce qui manquait (« on n'est pas prêt »).
2. **Prouver le mécanisme** : le substrat lit la **profondeur de modulation** = la sévérité.
   C'est exactement MCSA (sévérité BRB ∝ profondeur ∝ `k/N`), mais synthétique — donc
   sans bruit ni glissement. Réussir ici **dé-risque MCSA** et donne un résultat propre.

> Règle : on ne saute pas à MCSA tant que L2 n'est pas vert.

---

## 1. Génération des signaux

Modulation d'amplitude (AM), le modèle exact de la signature BRB :

```
x(t) = A · [ 1 + m · cos(2π f_mod t + ψ) ] · cos(2π f_c t + θ)
```

- porteur `f_c` (analogue du 60 Hz), modulation `f_mod` (analogue de `2sf ≈ 2–6 Hz`) ;
- **`m` = profondeur de modulation = la variable-cible** (analogue de `k/N`) ;
- développé : porteur d'amplitude `A`, deux **latérales** à `f_c ± f_mod` d'amplitude
  `A·m/2`. Donc `latérale/porteur = m/2` — le substrat doit lire ce ratio.

**Classes (K = 5, comme MCSA).** Centres de profondeur miroir des sévérités BRB :

| Classe | `m` centre | Analogue |
|---|---|---|
| C0 | 0.00 | Healthy |
| C1 | 0.03 | BRB1 (~2.9 %) |
| C2 | 0.06 | BRB2 |
| C3 | 0.09 | BRB3 |
| C4 | 0.12 | BRB4 (~11.8 %) |

**Instances (pour la généralisation).** Par échantillon, tirer au hasard : phase porteur
`θ`, phase modulation `ψ`, amplitude `A ∈ [0.8, 1.2]` (analogue charge), et un petit jitter
de `m` **dans** la bande de sa classe (±0.005). Générer p.ex. 2000 train / 500 val /
500 test, **splittés par instances** (jamais la même graine des deux côtés).

**Boutons de réalisme (OFF pour L2 propre, ON en L2.5) :** bruit blanc additif (SNR
décroissant), jitter de `f_mod` (analogue **glissement**), petites harmoniques du porteur.

**Réglages numériques conseillés :** `fs = 256`, `N = 256`. Placer sur des bins :
`f_c = 32` cycles/fenêtre, `f_mod = 2` → latérales aux bins `30` et `34` (cohérent, fuite
nulle — cf. H1). Suréchantillonner si on active des harmoniques (cf. H7).

---

## 2. Entrée du modèle (représentation complexe)

- Calculer la **FFT complexe** (`torch.fft.fft`), garder **re *et* im** (pas le module !).
- Donner au substrat une **fenêtre de bins complexes autour du porteur**, p.ex. bins
  `[f_c−4 … f_c+4]` (9 bins complexes). Il contient porteur + latérales ; le substrat
  apprend lesquels comptent (on ne lui souffle pas la réponse).
- Représenter chaque bin comme un complexe `A+iB` (tenseur `torch.complex64`).

---

## 3. Modèles à comparer

### 3a. Substrat CVNN (le nôtre)
- **Couche complexe** : `Linear` complexe `9 → 4` (poids `A+iB`), biais complexe.
- **Activation : modReLU** (préserve la phase — Décision 002).
- **Projection en réel** : `|z|` (module) sur les 4 unités.
- **Tête** : `Linear` réel `4 → 5` → `softmax`.
- **Loss** : cross-entropy. **Params ≈ 100** (minuscule — c'est le point H5).

### 3b. Baselines (même budget de params quand possible)
- **MLP réel sur |FFT|** (magnitude des mêmes 9 bins) : **aveugle à la phase**.
- **MLP réel sur le signal brut** (256 échantillons) : pas de structure fréquentielle.

Point attendu : sur AM pure, la magnitude suffit (`m/2` est dans les modules), donc 3a et
3b(magnitude) réussissent tous deux — **c'est voulu**, ça valide la pile. La *différence*
se révèle au **sous-test phase** (§6) et sous nuisances (§7).

---

## 4. Protocole d'entraînement

- Framework : **PyTorch, tenseurs complexes** — le **gradient de Wirtinger `∂L/∂W*` est
  calculé nativement** par `autograd` (Décision 002). Ne rien coder à la main.
- Optimiseur : **Adam**, `lr = 1e-3`, batch `64`, `≤ 100` epochs, early-stopping sur val.
- **5 graines** pour mesurer la stabilité (taux d'échec, variance).
- Split strict train/val/test par instances.

---

## 5. Métriques

- **Accuracy K classes** + matrice de confusion (les erreurs doivent être **entre classes
  adjacentes** — signature d'une lecture de profondeur, comme MCSA).
- **Nombre de paramètres** et **accuracy / 10K params** (la métrique-phare du papier MCSA).
- **Convergence** : epochs jusqu'au seuil, **taux d'échec sur 5 graines** (0/5 attendu).
- **Courbe de robustesse** : accuracy vs SNR décroissant / jitter de `f_mod` croissant.

---

## 6. Sous-test PHASE (le résultat qui montre pourquoi le complexe paie)

Créer une variante à deux classes **indiscernables en amplitude** : mêmes `|latérales|`,
mais **déphasage relatif** des latérales différent (AM vs modulation où les latérales sont
en quadrature). La magnitude est identique → **le MLP sur |FFT| ne peut pas les séparer**,
le **substrat complexe (modReLU) oui**. C'est **H6 démontré dans un contexte
d'apprentissage** : la phase porte une information que seul le complexe capte.

Critère : substrat ≥ 95 %, MLP-magnitude ≈ chance (50 %).

---

## 7. Progression vers le réel

```
L2   AM propre (pas de bruit, pas de glissement) ...... valide la pile + le mécanisme
L2.5 + bruit, + jitter f_mod, + harmoniques ........... approche MCSA, teste la robustesse
L3   MCSA réel (dataset UFU, etapeD-mcsa/) ............. le vrai test
```

L2.5 est le pont : le jitter de `f_mod` = **le confond de glissement** de MCSA ; le SNR
décroissant à faible `m` = **BRB1 à charge faible** (le pire cas de ton papier). On mesure
*où* ça casse **avant** le réel.

---

## 8. Critères de réussite (étagés)

- **Minimum (la pile marche) :** substrat converge stablement à **> 95 %** sur L2 propre,
  **0/5 échec**, erreurs entre classes adjacentes. → *c'est le vrai livrable : le CVNN
  s'entraîne de bout en bout.*
- **Bon :** sous-test phase réussi (substrat ≥ 95 %, magnitude ≈ chance) → **H6 en
  apprentissage**. Et meilleure accuracy/10K params que les baselines.
- **Fort :** robustesse gracieuse en L2.5 jusqu'à `m ≈ 0.03` sous bruit, prédisant
  quantitativement le point dur de MCSA (BRB1 faible charge).

---

## 9. Ce que L2 dé-risque pour MCSA

- Valide toute la mécanique d'entraînement (Wirtinger, modReLU, softmax/CE, batches,
  généralisation) — l'inconnue de « on n'est pas prêt ».
- Valide le **mécanisme** : substrat lit profondeur = sévérité.
- **Prédit les points durs** de MCSA (faible `m` + bruit ; jitter de glissement) sans
  toucher aux données réelles.
- Établit la **feedforward-suffisance** : pas besoin de la récurrence du LSTM si la lecture
  spectrale directe suffit.

---

## 10. Oracles (à retrouver)

- lecture complexe I/Q exacte (H6, `etapeA/phase-standalone.mjs`) ;
- ratio latérale/porteur `= m/2` (H4, `etapeA/couplage-standalone.mjs`) ;
- séparation propre des latérales aux bins (H1) ; suréchantillonner si harmoniques (H7).

---

## Résumé exécutif

Générer des signaux AM à profondeur `m` contrôlée, classés en 5 niveaux (miroir BRB), lus
via leur **spectre complexe** par un **substrat CVNN minuscule** (modReLU, softmax/CE,
~100 params) entraîné en **PyTorch** (Wirtinger gratuit). Objectif premier : **prouver que
la pile d'apprentissage marche** (> 95 %, 0/5 échec). Objectif bonus : le **sous-test
phase** montre que le complexe capte ce que la magnitude perd (H6 en apprentissage). Puis
L2.5 ajoute bruit + glissement pour **prédire les points durs de MCSA** avant le réel.
