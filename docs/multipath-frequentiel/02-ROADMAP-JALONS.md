# Feuille de route des jalons

*De « un substrat prouvé » à « un apprenant ». Ce document planifie ce qui manquait :
H3 et les jalons 2→5 (plasticité, récompense, sélection, ADN). Chaque étape a un
objectif, les hypothèses qu'elle introduit, sa démonstration, ses dépendances et un
statut honnête (prouvé / à faire / incertain).*

---

## Vue d'ensemble

```
JALON 1  Substrat multi-fréquence ...................... ✅ PROUVÉ (H1,H2,H4,H5,H6,H7)
  │
ÉTAPE B  Porter au moteur spikypanda (SpectralSynapse) . ✅ fait (famille NN + entraînement)
  │
H3       Remplacer le routage discret (comparatif) ...... 🟢 partiel verrouillé (mesuré)
  │
LEARN    Pile CVNN L1→L2→L2.5→L3(MCSA) ................. ✅ fait · verdict MCSA nuancé (H5,H6 ok)
  │       → h3/ (synthétique) · etapeD-mcsa/ (réel UFU)
JALON 2  Plasticité locale (fast weights) .............. ⬜ planifié
  │
JALON 3  Récompense (règle à trois facteurs) ........... ⬜ planifié
  │
JALON 4  Sélection des règles (diversité) .............. ⬜ planifié
  │
JALON 5  ADN génératif (encoder la règle) .............. ⬜ planifié / recherche
  │
JALON 6  Champ latent ondulatoire (limite continue) .... ⬜ recherche lointaine
```

**Ligne de partage honnête.** Jalon 1 était démontrable en scripts autonomes (mécanismes
isolés). À partir de l'étape B, il faut le **moteur** + une **boucle d'entraînement** :
les jalons 2→5 ne se prouvent pas avec des `.mjs` isolés, ils demandent le vrai graphe
et de l'optimisation. Plus on descend, plus c'est **incertain** (recherche, pas
ingénierie). On l'assume.

---

## ÉTAPE B — Porter le substrat au moteur *(immédiat)*

**Objectif.** Le substrat vit dans spikypanda : `SpectralSynapse` (fonction de transfert
**complexe** par bande + couplage) et `SpectralNeuron` (famille NN, exécutée par
`SpectralInferenceRuntime` via `NeuralRunner`), avec tests jest qui rejouent les mesures
des démos (fuite < 5 %, phase exacte). **Dépend de :** le dépôt. **Spec :**
`01-BUILD-SPEC.md`. **Statut :** ✅ fait. La brique FFT a été extraite dans `core/dsp`
(source unique partagée avec onnx). Puis la **fondation d'entraînement**
(`SpectralTrainingRuntime`, rétropropagation analytique sur `gain`/`phase`) a été livrée.
**Résultats :** `etapeB/RESULTATS.md` (Étape B) et `etapeC/RESULTATS-H3.md` (entraînement).
**Note :** `SpectralNeuron` (famille NN) remplace le « SpectralChannelNode » dataflow de
la spec initiale : « channel » est le terme runtime d'un lien, et le substrat est un
réseau de neurones (synapse + neurone).

---

## H3 — Remplacer le routage discret *(se verrouille au début de l'apprentissage)*

**Où on en est.** 🟢 Partiel verrouillé (mesuré) : le comparatif entraîné existe
(`packages/tests/spectral/h3.routing.test.ts`). Sur un **fondu continu** de deux
comportements sur une connexion, la réponse en fréquence apprend le mélange **exactement**
(loss médiane ~4e-13, 0/20 échec) là où un gate dur reste à un **plancher structurel**
(~0.96) : il ne sait que sélectionner, pas mélanger. Nuance honnête : le régime propre du
substrat est le mélange **lisse** ; une commutation brutale reste une décision non lisse
que les deux substrats apprennent mal. Détail : `etapeC/RESULTATS-H3.md`.

**Objectif.** Montrer que, sur une tâche à deux régimes (« selon le contexte, applique
`f` ou `g` »), la version fréquentielle **apprend plus stablement** qu'un routage
discret (gate dur), grâce à la dérivabilité.

**Démonstration prévue.** Deux implémentations entraînées par gradient sur la même
tâche jouet : (a) aiguillage discret (choix non lisse) ; (b) fréquentiel (gating par
phase / couplage lisse). Comparer vitesse de convergence, stabilité, taux d'échec.
**Dépend de :** étape B + boucle d'entraînement. **Livrable :** courbes + verdict H3.

---

## PILE D'APPRENTISSAGE (CVNN) — L1 → L2 *(le barreau manquant avant MCSA)*

**Constat.** H3 n'a prouvé qu'un *fit trivial* (2 params, cible lisse). Entraîner un vrai
classifieur multi-classes sur du réel demande une pile qui n'existe pas encore : réseau
complexe multi-couches, activations complexes, loss de classification, optimiseur/batches,
généralisation train/test. **C'est de l'ingénierie CVNN standard, pas de la recherche**
(voir `DECISION-002-cvnn-entrainement.md`). Ne pas sauter à MCSA sans ce barreau.

**Cadre (Décision 002).** Poids cartésiens `A+iB`, gradient de **Wirtinger** `∂L/∂W*`
(gratuit dans PyTorch), activations **préservant la phase** (modReLU/Cardioid), loss
réelle + softmax/cross-entropy. Voie recherche en Python ; moteur TS pour le déploiement.

- **L1 — régression multi-paramètres.** ✅ **Fait** (`h3/L1/`). CVNN 2 couches complexes
  (191 params) régresse la profondeur continue `m` : **R² = 0.9997**. La backprop de Wirtinger
  (autograd PyTorch) traverse plusieurs couches complexes, bien au-delà des 2 params de H3.
- **L2 — classification synthétique de profondeur de modulation.** ✅ **Fait** (`h3/L2/`). K=5
  (miroir BRB), AM propre (A=1), 5 graines. **Substrat CVNN ~109 params : 99.84 % (0/5 échec)**
  vs MLP-|FFT| instable (1/5) vs MLP-brut au hasard (H5). **Sous-test PHASE** (spectre de
  magnitude identique) : **CVNN 99.4 % vs MLP-magnitude 50.8 %** = H6 en apprentissage. La pile
  supervisée est validée. Détails : `h3/L2/RESULTS.md`.

- **L2.5 — robustesse** (`h3/L2.5/`). ✅ **Fait**. Dégradation **gracieuse** sous bruit ; le
  **recall BRB1 s'effondre** à faible SNR (100→14 %) = prédit le point dur MCSA (BRB1 charge
  faible). **Robuste** à l'échelle/charge (A-jitter, ratio appris : 99.9 %) et au **glissement**
  (jitter f_mod : 99.3 %). Sous bruit, CVNN ≈ MLP-magnitude (l'avantage complexe est la **phase**
  §6, pas le bruit d'amplitude). Détails : `h3/L2.5/RESULTS.md`.

- **L3 — MCSA réel** (`etapeD-mcsa/`). 🟢 **Fait, verdict nuancé** (dataset UFU réel, 5 classes BRB).
  **Variante B** (enveloppe) : substrat 677 p **81 %** — bat FFT+MLP (67 %), égale FFT+SVM (81,5 %),
  écrase le brut ⇒ **H5 confirmé sur du réel** ; mais le complexe **n'a pas d'avantage** (l'enveloppe
  a jeté la phase, MLP-magnitude ≥ CVNN). **Variante A** (spectre courant brut, phase intacte) : le
  **complexe bat nettement la magnitude (55 % vs 30 %)** ⇒ **H6 confirmé sur du réel** ; mais
  accuracy absolue modeste (latérales minuscules, SNR mono-fenêtre) < enveloppe. **Topologie** : un
  **TCN** gagne largement (binaire **97 % ≈ papier**, 5-classes 80 %) ; les **formes fidèles du
  substrat** (SpectralSynapse structuré, couplage bilinéaire H4) et l'**hybride substrat+TCN**
  **sous-performent** le TCN seul — passer en bins FFT jette l'ordre temporel que le TCN exploite.
  **Verdict honnête** : H5/H6 tiennent comme *mécanismes* mais **ne gagnent pas la tâche** ; la
  topologie temporelle reste reine pour le grading BRB. « Structure remplace topologie/préprocessing »
  **infirmé** sur MCSA. Détails : `etapeD-mcsa/RESULTS.md`.

---

## JALON 2 — Plasticité locale *(la couche qui réapprend)*

**Objectif.** Une couche qui **réapprend localement**, vite, adapte la réponse en
fréquence (gain/phase) d'une connexion *en ligne*, sans réentraînement global. C'est
l'archi « couche plastique + core » : le core lent capitalise, la couche rapide s'ajuste.

**Hypothèses introduites.**
- **H8** — une règle de plasticité *locale* ajuste le `w_b` complexe d'une bande pour
  réduire une erreur locale, en ligne.
- **H9** — deux échelles de temps (core lent / plastique rapide) cohabitent **sans
  instabilité** ni effondrement de plasticité.

**Démonstration prévue.** Signal non-stationnaire dont la cible dérive : la couche
plastique suit la dérive, le core reste stable ; mesurer adaptation *et* absence
d'effondrement (cf. *loss of plasticity*, Dohare 2024).
**Dépend de :** étape B. **Réf :** fast weights (Schmidhuber), differentiable plasticity
(Miconi). **Statut :** ⬜ planifié.

---

## JALON 3 — Récompense *(la règle à trois facteurs)*

**Objectif.** Un signal **global de récompense** décide quelles modifications locales
méritent de rester (règle à trois facteurs : pré, post, neuromodulateur).

**Hypothèse introduite.**
- **H10** — une plasticité *gatée par récompense* oriente les changements vers l'utile,
  là où une plasticité non gatée dérive.

**Démonstration prévue.** Tâche à récompense éparse ; comparer plasticité gatée vs non
gatée (utilité, stabilité). **Dépend de :** jalon 2. **Réf :** Backpropamine (Miconi
2019), three-factor rules (Frémaux & Gerstner 2016). **Statut :** ⬜ planifié.

---

## JALON 4 — Sélection des règles *(évolution + diversité)*

**Objectif.** Sélectionner les **règles** (de plasticité, de timbre, de couplage) qui
marchent — pas les poids — en **préservant la diversité** (la fitness pure converge trop
tôt).

**Hypothèse introduite.**
- **H11** — évoluer les *règles* transfère mieux à de nouvelles tâches ; la
  quality-diversity bat la sélection par fitness pure.

**Démonstration prévue.** Population de règles ; MAP-Elites / novelty search ; mesurer
le transfert. **Dépend de :** jalons 2-3. **Réf :** Born to Learn (Soltoggio, Stanley &
Risi 2018), MAP-Elites (Mouret & Clune 2015). **Statut :** ⬜ planifié / recherche.

---

## JALON 5 — ADN génératif *(encoder le PROCESSUS qui apprend, pas les poids)*

> **Réorienté par la Décision 003.** La formulation initiale (« un générateur reproduit un
> substrat entier ») générait encore *les poids entraînés* — donc **la mémoire acquise, le
> fossile**. La version forte n'encode pas la mémoire : elle encode le **processus qui
> apprend** (règle topologique + dynamique pilotée par spikes + régulation chimique).

**Objectif.** Encoder la **règle génératrice compacte** (le « génome ») qui **déploie un
processus apprenant** — pas qui stocke des poids. Reprend H5 (compacité), le goulot
génomique, et la boussole « pas de poids, un processus ».

**Hypothèse introduite.**
- **H12** — un petit générateur (la règle) déploie un substrat **qui apprend** à peu de
  paramètres, avec transfert — *sans* que la mémoire soit pré-générée.

**Démonstration prévue.** Un générateur produit le *processus* (pas les poids finaux) ;
mesurer compacité du générateur *et* capacité d'apprentissage/transfert du substrat
déployé. **Dépend de :** jalons 1-4 + Décision 003. **Réf :** goulot génomique (Zador
2019, 2024), CPPN/HyperNEAT (Stanley), hypernetworks (Ha 2016), reservoir/spiking (§8b).
**Statut :** ⬜ recherche (le plus incertain — cf. *No Free Prune*).

---

## JALON 6 — Champ latent ondulatoire *(au-delà de l'ADN, la limite continue)*

**Objectif.** Ne plus seulement mettre le complexe dans les *poids* (CVNN, Décision 002),
mais faire du **latent lui-même un champ complexe** évoluant selon une **dynamique d'onde**
(Schrödinger, Helmholtz, onde amortie). Superposition, propagation, interférence et
résonance deviennent **intrinsèques** au substrat, au lieu d'être apprises indirectement.

**Cadrage — pourquoi c'est la suite naturelle.** Notre substrat modal *est* la vue
discrète d'un champ d'ondes : les **bandes** = modes propres, le **couplage** (H4) =
interférence entre modes, la **phase** (H6) = phase de l'onde, le **timbre** (H7) =
résonance. On a bâti le **squelette modal** ; le champ est sa **limite continue**. C'est
l'axe **Neural Operators** (le FNO apprend un propagateur en espace de Fourier) ∪ **PINNs**
(on inscrit la PDE dans le réseau). Pour vibrations, électromagnétisme, machines
tournantes (MCSA), c'est *plus proche de la physique* qu'un réseau réel.

**Hypothèse introduite.**
- **H13** — un latent à dynamique d'onde apprise égale ou dépasse le substrat modal sur un
  problème physique (vibration/MCSA), avec un a priori plus fidèle et/ou moins de
  paramètres.

**Démonstration prévue.** Comparer, sur un problème ondulatoire, le substrat modal (bandes
fixes) à un champ propagé appris ; mesurer fidélité, compacité, transfert. **Dépend de :**
jalons 1 + Décision 002. **Réf :** *Fourier Neural Operator* (Li et al. 2021), PINNs
(Raissi et al. 2019), *Deep Complex Networks* (Trabelsi et al. 2018). **Statut :** ⬜
recherche lointaine — le plus ambitieux, ferme l'arc « de l'ADN au champ ».

---

## Récapitulatif des hypothèses

| # | Hypothèse | Jalon | Statut |
|---|---|---|---|
| H1 | multiplexage propre | 1 | ✅ prouvé |
| H2 | hétérogénéité des calculs | 1 | ✅ prouvé |
| H3 | remplace le routage discret | B+ | 🟢 partiel verrouillé (mesuré) |
| H4 | couplage non-linéaire | 1 | ✅ prouvé |
| H5 | compacité (ADN) | 1 | ✅ prouvé |
| H6 | la phase porte info/routage | 1 | ✅ prouvé |
| H7 | harmoniques : contamination + code | 1 | ✅ prouvé |
| H8 | plasticité locale du `w_b` | 2 | ⬜ planifié |
| H9 | deux échelles de temps stables | 2 | ⬜ planifié |
| H10 | plasticité gatée par récompense | 3 | ⬜ planifié |
| H11 | évoluer les règles + diversité | 4 | ⬜ planifié |
| H12 | générateur du **processus** apprenant (ADN) | 5 | ⬜ recherche |
| H13 | champ latent ondulatoire | 6 | ⬜ recherche lointaine |

**Note de prudence.** H8→H13 sont des hypothèses *candidates* : elles orientent le
travail, elles ne sont pas prouvées. Chaque jalon peut faire tomber la précédente —
c'est le but. Le socle solide reste le jalon 1 ; le reste est un programme.

**Fondation d'entraînement.** La pile CVNN (Décision 002) est le prérequis d'ingénierie
de tout ce qui est ≥ L1 : elle transforme « on n'est pas prêt sur le learning » en une
recette standard (Wirtinger + activations préservant la phase).

**Boussole (Décision 003).** L'objet n'est pas un jeu de *poids* (une mémoire acquise)
mais un *processus* (transfert piloté par spikes, régulé par la chimie, encodé par une
règle). Les jalons 2/3/5/6 sont des facettes de ce même objet. On construit le substrat
paramétrique (traçable) en gardant cette cible en ligne de mire — sans confondre « avoir
généré des poids » avec « avoir un apprenant ».
