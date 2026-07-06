# Résultats — L1 (régression multi-paramètres, sanity-check)

*But : isoler la mécanique d'entraînement CVNN (sans tête de classif ni dataset) avant L2.*

Un `SpectralCVNN` **2 couches complexes** (`ComplexLinear 9→6→4` + modReLU, readout `|z|`,
tête linéaire, **191 params**) régresse la profondeur de modulation continue `m ∈ [0, 0.15]`
depuis 9 bins complexes autour de la porteuse. Adam, gradient de Wirtinger via autograd.

| | valeur |
|---|---|
| loss initiale | 1.095e+01 |
| loss finale (train) | 4.65e-07 |
| MSE test | 5.44e-07 |
| **R² test** | **0.9997** |

**PASS** : la pile complexe multi-couches converge et **suit `m` presque parfaitement**
(R²≈1) — la backprop de Wirtinger (autograd) traverse plusieurs couches complexes, bien
au-delà des 2 params de H3.

Deux leçons portées en L2 :
1. **Readout `|z|`** (magnitude) obligatoire pour lire une profondeur (une magnitude) :
   `view_as_real`+tête linéaire est un chemin ~linéaire et donnait R²≈0.
2. **`safe_abs` + grad-clipping** : `z.abs()` a un gradient non borné en `|z|→0` (une unité
   qui passe par 0 fait diverger le pas Adam) ; `sqrt(re²+im²+eps)` + clip stabilisent.
