# Résultats — Étape B (substrat porté dans le moteur spikypanda)

*Ce document consigne les chiffres obtenus en portant le substrat multi-fréquence
dans le moteur (famille NN spectrale), et renvoie aux hypothèses de `00-PAPIER.md`.*

## Ce qui a été construit

- **Brique FFT extraite dans le cœur.** `FFTEngine` (radix-2, math pure) et son cache
  `getFFTEngine` vivent désormais dans `packages/dev/core/src/dsp/fft.ts`, source unique
  importée à la fois par les kernels DSP de onnx et par le substrat. `core` ne dépend
  toujours de rien au-dessus de lui.
- **Famille NN spectrale** dans `packages/dev/core/src/neuralnetwork/` :
  `SpectralSynapse` (poids = transfert complexe `w_b = g_b·e^{iφ_b}` par bande + couplage
  complexe optionnel), `SpectralNeuron`, `SpectralInferenceRuntime` (passe avant
  `y = Σ_synapses IFFT(W ⊙ FFT(x))` via `readyQueueDispatch`, comme le MLP), et
  `SpectralRunnerBuilder` (enveloppe dans `NeuralRunner` pour tourner dans un `Session`).
- **Test** `packages/tests/spectral/spectral.test.ts` : 12 cas verts.

## Bandes choisies

`fs = 1024 Hz`, `nfft = 256` (pas de bin = 4 Hz), demi-largeur de bande = 1 bin.
Porteuses **sur bins exacts, non harmoniques, non chevauchantes** :

| bande | fréquence | bin |
|-------|-----------|-----|
| 0 | 48 Hz | 12 |
| 1 | 120 Hz | 30 |
| 2 | 200 Hz | 50 |

Grille validée par `assertInharmonic` (aucune porteuse n'est multiple entier, somme ou
différence d'une autre — Décision 001).

## Mesures

- **Fuite inter-bande.** Pour chaque bande `b` : énergie décodée en `b` quand seule `b` est
  excitée (utile) vs. quand toutes les autres le sont (fuite), `leakage_b = E_fuite/E_utile`.
  - K = 2 : `≈ [3.9e-34, 3.2e-35]`
  - K = 3 : `≈ [1.1e-32, 1.2e-16, 2.0e-16]`
  Soit une fuite au **niveau du bruit numérique**, très loin sous le budget de 5 %.
- **Lecture de phase.** Un déphasage `φ_b = π/3` appliqué se relit à la sortie à
  **~1.3e-8 rad** près ; le gain `g_b = 0.8` se relit à **~2e-8** près. Le cas `φ_b = 0`
  redonne la sortie réelle `≈ g·entrée` (erreur max-abs sous 0.02).
- **Isolation.** Changer un seul `w_b` (bande 1 : gain 1 → 0.3) ne modifie que sa bande
  (rapport 0.3 ± 0.02) ; les autres restent à 1 ± 0.02.
- **Intégration moteur.** La sortie via `SpectralRunnerBuilder` + `Session` coïncide avec la
  passe avant directe à **1e-4** près.

## Lecture honnête (renvoi §8 du papier)

La fuite ≪ 5 % n'est pas un banc de filtres « magique » : elle découle du **placement des
porteuses sur des bins exacts** (nombre entier de cycles dans la fenêtre ⇒ raie FFT propre,
sans étalement spectral) et de bandes **bien séparées et non chevauchantes**. C'est
précisément le régime **linéaire** de H1 (la densité obtenue est un *plafond linéaire*,
Décision 001). Les limites annoncées restent :

- Hors bin exact ou avec des bandes rapprochées, l'étalement spectral remonte la fuite ; le
  fenêtrage (Hann, …) devient nécessaire.
- La **contamination harmonique / d'intermodulation** n'apparaît que sous **non-linéarité**
  ou **couplage actif** (H7). Le couplage complexe est implémenté dans `SpectralSynapse` et
  `applyTransfer`, mais aucune non-linéarité par neurone n'est activée à ce jalon : le slot
  est documenté dans `SpectralNeuron` pour H7.

## Hypothèses touchées

- **H1 (multiplexage propre)** rejouée dans le vrai moteur : superposition sur une arête +
  re-séparation par transfert complexe, fuite mesurée ≪ 5 %.
- **H6 (la phase porte l'information)** : le déphasage par bande est appliqué et relu
  fidèlement (latent complexe, Décision 001).
- **Différentiabilité** préservée (FFT + multiplication complexe + couplage) ; le point
  d'entrée d'un gradient sur `gain`/`phase`/`coupling` est documenté dans le runtime
  (Wirtinger / deux réels, précédent FNO), sans entraînement à ce jalon.

Prochain pas : H3 (remplacer le routage discret, comparatif entraîné) puis Jalon 2
(plasticité locale du `w_b`), qui s'appuient sur cette famille.
