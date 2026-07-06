# Résultats — Étape B+ : entraînement du substrat + H3

*Ce document consigne (1) la fondation d'entraînement du substrat spectral et (2) le
comparatif H3 (réponse en fréquence dérivable vs routage discret). Renvoie à
`00-PAPIER.md` et `HYPOTHESES-ET-PREUVES.md`.*

## Ce qui a été construit

- **`SpectralTrainingRuntime`** (`packages/dev/core/src/neuralnetwork/nn.spectral.training.ts`),
  calqué sur `MLPTrainingRuntime`. Les feuilles apprenables sont les `gain[b]`/`phase[b]` de
  chaque `SpectralSynapse`. Rétropropagation **analytique et exacte** : comme `FFTEngine.inverse()`
  est R-linéaire et que le poids complexe entre linéairement,
  `y = Σ_b [Re(w_b)·A_b + Im(w_b)·B_b]` avec `A_b = inverse(X_b)`, `B_b = inverse(i·X_b)`. D'où
  `dL/dgain_b` et `dL/dphase_b` par produits scalaires avec `dL/dy` — **aucun adjoint Hermitien
  dérivé à la main**, on réutilise l'`inverse()` du forward (style Fourier Neural Operator).
- **Réutilisation** des optimiseurs existants (`Optimizers.Adam`) via un proxy `ScalarParamHandle`
  (getter/setter sur une case du tableau + son `bag`) : aucune modif de `nn.optimizers.ts`.
- **Tests** : `packages/tests/spectral/spectral.training.test.ts` (fondation) et
  `packages/tests/spectral/h3.routing.test.ts` (H3). Tout vert.

## Fondation d'entraînement — vérification

- **Gradient-check** (verrou de correction) : gradient analytique vs différences finies centrées
  sur `gain[b]` et `phase[b]` ⇒ écart `< 1 %` de `(1 + |analytique|)`. Le backward est correct.
- **Récupération d'un filtre cible** : à partir de `gain=1, phase=0`, entraînement Adam (2000 pas)
  ⇒ loss finale `< 1e-3 ×` loss initiale ; `gain[b]` récupéré à `±0.02`, `phase[b]` à `±0.05 rad`.
  Le gradient traverse bien encoder → sommer → filtrer → décoder (prédiction testable de H3).

## H3 — réponse en fréquence dérivable vs routage discret

**Tâche.** Deux bandes A (48 Hz) et B (120 Hz), contexte `c∈[0,1]`, entrée = composite `A+B`.
Cible = le **fondu linéaire** `(1−c)·passA + c·passB` : deux comportements **coexistent** sur une
seule connexion, dosés par le contexte (c'est le « multi-chemin sur la même connexion » du papier,
pas un aiguillage brutal).

- **(A) Routage discret (gate dur)** : `out = σ(k·(w·c+b))·passA + (1−σ)·passB`, `k=8` (≈ marche).
  Un gate ne sait que **sélectionner** une bande par `c` : il ne peut pas produire un mélange
  gradué ⇒ **plancher structurel** (une sigmoïde n'est pas une superposition graduée).
- **(B) Réponse en fréquence** : une synapse dont le **gain réel par bande** est affine du contexte
  `gain_b(c)=α_b·c+β_b` (dosage lisse de la réponse en fréquence). Superposition + filtrage sont
  lisses et dérivables (gradient analytique) et représentent le fondu **exactement**.

**Protocole.** PRNG déterministe (mulberry32), `S=20` graines, 500 epochs, plein-lot sur une
grille de 10 contextes. Seuil `τ = 2 %` du plancher « sans routage » (`105.6`).

**Résultats (médianes sur 20 graines).**

| modèle | taux d'échec | loss finale médiane | epochs → τ (médiane) |
|--------|--------------|---------------------|----------------------|
| Routage discret (gate dur) | 0 / 20 | **0.96** | 35 |
| Réponse en fréquence | 0 / 20 | **4.1e-13** | 105 |

**Verdict.** La réponse en fréquence apprend le fondu **exactement** (loss au bruit numérique) sur
**toutes** les graines ; le gate dur, même libre de s'adoucir, reste bloqué à un **plancher ~0.96**
(≈ 30 000× la loss fréquentielle), car il ne peut pas mélanger deux comportements sur un fil. C'est
directement la thèse du papier : superposition + filtrage dérivables font coexister plusieurs
chemins sur une connexion, là où une décision tout-ou-rien doit choisir.

## Lecture honnête (renvoi §8 du papier)

- **Régime discriminant = fondu lisse, pas commutation brutale.** Un *switch dur* (cible = A si
  `c<0.5` sinon B) est une décision non lisse que **les deux** substrats peinent à apprendre par
  gradient : mesuré, le gate raide y fait *mieux* qu'une phase affine (qui ne sait pas être raide).
  L'avantage du substrat fréquentiel est donc établi sur son **régime propre** (mélange continu,
  dérivable), pas comme supériorité universelle.
- **Baseline non truquée.** Le gate garde `w,b` apprenables (il peut s'adoucir tout seul) ; son
  plancher `0.96` est **structurel** (sigmoïde ≠ superposition graduée), pas un artefact de réglage.
- Le comparatif d'ici mesure **expressivité + apprentissage exact** d'un mélange ; la démonstration
  d'une **instabilité** d'un vrai gate discret (STE / marche) sur une tâche que les deux
  représentent reste ouverte (elle demande un gate genuinely binaire).

## Hypothèse touchée

- **H3** passe de 🟡 (argument établi, comparatif à faire) à **🟢 partiel verrouillé (mesuré)** : le
  comparatif entraîné existe, dans le vrai moteur, et confirme la dérivabilité de bout en bout
  (encoder → sommer → filtrer → décoder) et l'avantage sur le routage dur pour des comportements
  qui coexistent. Nuance documentée : régime propre = mélange lisse.

Prochain pas : **Jalon 2** (plasticité locale en ligne du `w_b`, H8/H9) — la fondation
d'entraînement livrée ici en est le socle.
