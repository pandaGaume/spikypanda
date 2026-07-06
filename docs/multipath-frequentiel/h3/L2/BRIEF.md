# Brief L2 — Classification synthétique de profondeur de modulation

*Le barreau manquant entre H3 (fit trivial) et MCSA (réel). Exerce toute la pile
d'apprentissage CVNN (Décision 002) sur le mécanisme MCSA en version propre.*

## 0. But

Deux objectifs d'un coup :
1. **Valider la pile d'entraînement CVNN de bout en bout** : réseau complexe multi-couches,
   gradient de Wirtinger, activation préservant la phase (modReLU), loss softmax + CE,
   mini-batches, généralisation train/test. C'est ce qui manquait (« on n'est pas prêt »).
2. **Prouver le mécanisme** : le substrat lit la profondeur de modulation = la sévérité.
   C'est exactement MCSA (sévérité BRB ∝ profondeur ∝ k/N), mais synthétique — sans bruit
   ni glissement. Réussir ici dé-risque MCSA et donne un résultat propre.

Règle : **on ne saute pas à MCSA tant que L2 n'est pas vert.**

## 1. Génération des signaux

AM, modèle exact de la signature BRB :
`x(t) = A·[1 + m·cos(2π f_mod t + ψ)]·cos(2π f_c t + θ)`
⇒ porteur + 2 latérales à `f_c ± f_mod` d'amplitude `A·m/2` (donc **latérale/porteur = m/2**).

Classes (K=5), centres miroir des sévérités BRB : `m ∈ {0.00, 0.03, 0.06, 0.09, 0.12}`
(Healthy, BRB1…BRB4). Par échantillon : phases `θ,ψ` aléatoires, jitter `m` ±0.005.
**`A` fixe (=1) en L2** (l'A-jitter = confond d'échelle/charge → L2.5, sinon il recouvre C3/C4).
2000 train / 500 val / 500 test, **split par instances**.

Numérique : `fs=256, N=256, f_c=32, f_mod=2` ⇒ latérales **sur bins 30 et 34** (fuite nulle, H1).

## 2. Entrée du modèle (représentation complexe)

`torch.fft.fft`, garder **re et im** (pas le module). Fenêtre de **9 bins complexes**
`[f_c−4 … f_c+4]` (porteur + latérales ; le substrat apprend lesquels comptent).

## 3. Modèles à comparer

- **Substrat CVNN** : `ComplexLinear 9→4` (poids A+iB) → **modReLU** → readout **`|z|`**
  (module — c'est la non-linéarité qui lit la profondeur, invariante à la phase porteuse) →
  tête `Linear 4→5` → softmax. CE. ~100 params (H5).
- **Baselines** : MLP réel sur `|FFT|` (9 modules, aveugle à la phase) à budget apparié ;
  MLP réel sur le signal brut (256, sans structure — plus de params).

## 4. Protocole

PyTorch complexe, Wirtinger natif (autograd). Adam, batch 64, ≤ epochs, early-stopping val,
grad-clipping. **5 graines** (taux d'échec, variance). Split strict par instances.

## 5. Métriques

Accuracy K + matrice de confusion (erreurs entre classes adjacentes) ; params +
**accuracy/10K params** ; convergence + taux d'échec /5 graines ; courbe de robustesse (→ L2.5).

## 6. Sous-test PHASE (le résultat qui montre pourquoi le complexe paie)

Deux classes **indiscernables en amplitude** : mêmes `|latérales|`, mais déphasage relatif
différent (AM vs latérales en quadrature). Magnitude identique ⇒ MLP-|FFT| ≈ hasard (50 %),
substrat complexe ≥ 95 %. C'est **H6 en apprentissage**.

## 7. Progression vers le réel

L2 (AM propre) → **L2.5** (+bruit, +jitter f_mod, +harmoniques, +A-jitter) → L3 (MCSA réel).
L2.5 = le pont : jitter f_mod = confond de glissement ; SNR faible à petit m = BRB1 charge faible.

## 8. Critères de réussite (étagés)

- **Minimum** (pile marche) : substrat > 95 % sur L2 propre, 0/5 échec, erreurs adjacentes.
- **Bon** : sous-test phase réussi (≥95 % vs ~chance) + meilleure accuracy/10K que les baselines.
- **Fort** : robustesse gracieuse en L2.5 jusqu'à m≈0.03 sous bruit.

## Note d'implémentation (readout)

Audit initial : `view_as_real` recommandé — **infirmé empiriquement en L1**. Lire la profondeur
= lire une **magnitude** (`m ∝ |latérale|`), donc `view_as_real`+tête linéaire (chemin ~linéaire)
n'y arrive pas et n'est pas invariant à la phase porteuse θ. Le readout **`|z|`** (choix initial
de l'utilisateur) est correct : c'est la non-linéarité qui extrait la magnitude, θ-invariante.
