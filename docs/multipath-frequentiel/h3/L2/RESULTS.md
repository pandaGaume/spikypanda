# Résultats — L2 (classification de profondeur de modulation) + L1

*Pile d'apprentissage CVNN en PyTorch (Décision 002). Exécuté ici : Python 3.12,
PyTorch 2.11. Reproductible (graines fixes). Voir `BRIEF.md` pour la spec.*

## Ce qui a été construit

Module CVNN partagé (`../python/`) : `ComplexLinear` (poids `torch.cfloat`, gradient de
**Wirtinger via autograd**), `ModReLU` (seuil du module, phase préservée), `safe_abs`
(magnitude à gradient borné), readouts `|z|` / `view_as_real`, référencement de phase à la
porteuse. `SpectralCVNN` = `fft` une fois → 9 bins complexes → couches complexes → readout →
tête réelle → softmax. Baselines `MagnitudeMLP` (aveugle à la phase) et `RawMLP` (sans structure).

## L1 — régression multi-paramètres (sanity)

Un CVNN 2 couches complexes (191 params) régresse la profondeur continue `m` depuis 9 bins :
**loss 1.09e+1 → 4.6e-7**, **test R² = 0.9997**. ⇒ la pile complexe multi-couches converge et
suit `m` (autograd Wirtinger OK). *(Correctif d'implémentation : `view_as_real`+tête linéaire
donnait R²≈0 — lire une profondeur = lire une **magnitude**, il faut le readout `|z|`, cf. BRIEF §note.)*

## L2 — classification 5 classes (AM propre, A=1), 5 graines

| Modèle | Params | Accuracy test | min | Échecs (<95 %) | acc/10K |
|--------|-------:|---------------|----:|:--------------:|--------:|
| **Substrat CVNN** (`\|z\|`) | **109** | **99.84 ± 0.32 %** | 99.20 % | **0 / 5** | 9160 |
| MLP `\|FFT\|` (aveugle phase) | 110 | 84.08 ± 31.84 % | 20.40 % | 1 / 5 | 7644 |
| MLP signal brut (sans structure) | 1053 | 19.52 ± 0.50 % | 19.00 % | 5 / 5 | 185 |

- **Critère MINIMUM atteint** : CVNN **> 95 %**, **0/5 échec** — la pile supervisée marche de bout
  en bout (complexe multi-couches, modReLU, softmax/CE, mini-batches, généralisation).
- **Bonus stabilité** : à hyperparamètres identiques, le MLP-magnitude **s'effondre 1 fois sur 5**
  (20 %, σ=32 %) ; le CVNN est **rock-steady** (σ=0.32 %). Le complexe est plus robuste à l'init.
- **H5** : le MLP sur signal brut (1053 params, sans a priori fréquentiel) reste **au hasard** —
  la structure, pas la capacité, fait la différence.
- *Note honnête* : `acc/10K` ici est un ratio **intra-tâche** (tâche synthétique facile), **non
  comparable** au 184,4 du papier MCSA (autre tâche). Que le MLP-brut tombe à ~185 est fortuit.

## L2 §6 — sous-test PHASE (le résultat qui montre pourquoi le complexe paie)

Deux classes à **spectre de magnitude identique** (AM vs latérales en quadrature), 5 graines :

| Modèle | Accuracy | 
|--------|----------|
| **Substrat CVNN** (`\|z\|`) | **99.44 ± 0.46 %** |
| MLP `\|FFT\|` (magnitude) | **50.80 ± 0.00 %** (hasard) |

La magnitude est identique pour les deux classes ⇒ le MLP-magnitude est **au hasard par
construction** ; le substrat complexe lit le **déphasage relatif des latérales** et sépare à
99 %. **C'est H6 dans une boucle d'apprentissage** : la phase porte une information que seul le
complexe capte — la justification empirique du choix CVNN.

## Verdict L2

- **Minimum** ✅ (pile marche : >95 %, 0/5).
- **Bon** ✅ (sous-test phase réussi 99,4 % vs ~50 % ; CVNN plus stable et plus efficace/param que
  les baselines).
- **Fort** = robustesse L2.5 (bruit + jitter de glissement) — **prochaine étape**.

MCSA (L3) reste **gelé** jusqu'à L2.5. La pile d'entraînement — l'inconnue « on n'est pas prêt » —
est **validée**.
