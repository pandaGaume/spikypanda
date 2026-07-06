# Décision 002 — Le substrat s'entraîne comme un CVNN

**Statut :** ACTÉ · **Portée :** structurante (comment on *entraîne* le substrat complexe)
**Concerne :** la pile d'apprentissage, `SpectralTrainingRuntime`, jalons L1/L2, MCSA
**Fait suite à :** `DECISION-001-complexe-et-harmoniques.md` (le substrat *est* complexe)

---

## La décision, en une phrase

Le substrat s'entraîne selon le cadre standard des **réseaux à valeurs complexes
(CVNN)** : poids complexes cartésiens `W = A + iB`, descente du **gradient de Wirtinger**
`∂L/∂W*` sur une **loss réelle**, avec des **activations qui préservent la phase**
(modReLU / Cardioid). La recherche se fait en Python/PyTorch (autograd complexe natif) ;
le moteur TS garde son runtime d'inférence.

---

## Contexte : ce qui manquait

La Décision 001 a acté que le latent est complexe. Mais on n'avait pas le cadre général
pour l'*entraîner*. Ce qui existe aujourd'hui — `SpectralTrainingRuntime`, « backprop
analytique sur `gain`/`phase` » — est une dérivation **à la main, en coordonnées
polaires** (`A·e^{iφ}`), pour un cas particulier (une connexion, cible lisse). Ça a
prouvé H3, mais ça ne monte pas à un réseau multi-couches avec des activations complexes
non-linéaires. C'est précisément là que la partie apprentissage butait (« on n'est pas
prêt »). Le CVNN est le chaînon manquant.

---

## La décision, en détail

**1. Paramétrisation : cartésienne `W = A + iB`.** Deux réels par poids. La forme polaire
(`gain`/`phase`) reste valable pour le runtime TS existant, mais le **cadre général** de
la recherche est cartésien + Wirtinger, parce que c'est ce que les frameworks
différencient nativement.

**2. Gradient : Wirtinger, on descend `∂L/∂W*`.** La loss reste **réelle**
(`L : ℂⁿ → ℝ`, ex. `|y − ŷ|²`). Les activations utiles (module, modReLU…) ne sont **pas
holomorphes** → la dérivée complexe classique n'existe pas ; le calcul de Wirtinger
(traiter `z` et `z*` comme indépendants) donne la bonne règle. **PyTorch le fait
gratuitement** : ses tenseurs complexes et son autograd calculent `∂L/∂conj(W)` avec la
convention correcte pour l'optimisation. → **utiliser PyTorch pour la recherche**, ne pas
re-bricoler la backprop complexe à la main.

**3. Activations : préserver la phase.** Décision forte, pas un détail :
- **Adopter** modReLU (`ReLU(|z|+b)·z/|z|`) et Cardioid (gain dépendant de la phase) —
  elles agissent sur le module en **gardant la direction de phase**.
- **Rejeter** la séparation Re/Im (`f(x+iy)=f(x)+i·f(y)`) : elle **casse la phase**, donc
  casse H6 (la phase est notre routeur). Une activation qui détruit la phase détruit la
  moitié du substrat.

**4. Loss réelle + tête de classification.** Pour la régression : `|y−ŷ|²`. Pour la
classification (L2, MCSA) : projeter en réel (module `|·|` ou partie réelle) puis
**softmax + cross-entropy** — et non sigmoid+MSE (le papier MCSA note lui-même que
sigmoid+MSE était sous-optimal).

---

## Arguments

- **Adapté à notre domaine.** Sur signaux fréquentiels/ondulatoires — FFT, radar, RF,
  vibration, machines tournantes (MCSA !) — les CVNN donnent souvent convergence plus
  rapide, meilleure représentation de la phase, **moins de paramètres à expressivité
  égale**. C'est exactement notre terrain et notre thèse (H5, compacité).
- **La phase survit à la non-linéarité.** Avec modReLU/Cardioid, H6 reste vrai *à travers*
  les couches — un réseau réel devrait réapprendre module et phase séparément.
- **Éprouvé.** *Deep Complex Networks* (Trabelsi et al., 2018) : modReLU, complex-BN,
  convolutions complexes, entraînés par gradient. Le *Fourier Neural Operator* : poids
  complexes par mode. Ce n'est pas spéculatif.

## Alternatives rejetées

- **Réseau réel qui apprend module + phase séparément.** Double le travail, casse la
  structure complexe, perd l'avantage de compacité. Rejeté.
- **Activations séparables Re/Im.** Cassent la phase (H6). Rejeté.
- **Continuer la backprop analytique polaire à la main en TS.** Ne monte pas à un réseau
  multi-couches ; réinvente ce que l'autograd complexe fait déjà. Gardé comme cas
  particulier du runtime, pas comme cadre de recherche.

---

## Conséquences

1. **Deux voies, frontière nette.** *Recherche* : Python/PyTorch, complexe natif,
   Wirtinger gratuit → c'est là qu'on monte L1/L2/MCSA. *Déploiement* : le moteur TS
   (inférence, ONNX, ESP32).
2. **La pile d'apprentissage devient de l'ingénierie, pas de la recherche.** Le CVNN est
   une recette standard : ça débloque directement L1 (régression multi-params) et L2
   (classification synthétique de profondeur de modulation), les barreaux manquants avant
   MCSA.
3. **Activation par défaut du substrat : modReLU** (ou Cardioid), préservant la phase.
4. **`SpectralTrainingRuntime` (analytic polaire) = validé comme cas particulier.** Pour
   un réseau complexe multi-couches, passer par l'autograd.
5. **Pas de blocage théorique restant** entre « substrat complexe prouvé » et « on sait
   l'entraîner ».

## Ce que ça ne casse pas

H1–H7 restent valides. Le runtime d'inférence TS reste. Cette décision **ajoute** la
couche d'entraînement générale ; elle ne retire rien.

## Lien avec le jalon 6

Un CVNN à activations préservant la phase est le **pas discret** vers le *champ latent
ondulatoire* (jalon 6) : là où les CVNN mettent le complexe dans les *poids*, le jalon 6
met une *dynamique d'onde* dans le *latent* lui-même (Schrödinger/Helmholtz/onde amortie).
Notre substrat modal est le squelette ; le champ est la limite continue.
