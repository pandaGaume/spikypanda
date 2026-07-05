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
ÉTAPE B  Porter au moteur spikypanda (SpectralSynapse) . ⬜ à faire (spec prête)
  │
H3       Remplacer le routage discret (comparatif) ...... 🟡 se verrouille ici
  │
JALON 2  Plasticité locale (fast weights) .............. ⬜ planifié
  │
JALON 3  Récompense (règle à trois facteurs) ........... ⬜ planifié
  │
JALON 4  Sélection des règles (diversité) .............. ⬜ planifié
  │
JALON 5  ADN génératif (encoder la règle) .............. ⬜ planifié / recherche
```

**Ligne de partage honnête.** Jalon 1 était démontrable en scripts autonomes (mécanismes
isolés). À partir de l'étape B, il faut le **moteur** + une **boucle d'entraînement** :
les jalons 2→5 ne se prouvent pas avec des `.mjs` isolés, ils demandent le vrai graphe
et de l'optimisation. Plus on descend, plus c'est **incertain** (recherche, pas
ingénierie). On l'assume.

---

## ÉTAPE B — Porter le substrat au moteur *(immédiat)*

**Objectif.** Le substrat vit dans spikypanda : `SpectralSynapse` (fonction de transfert
**complexe** par bande + couplage) et `SpectralChannelNode`, avec tests jest qui
rejouent les mesures des démos (fuite < 5 %, phase exacte, couplage `A·m/2`).
**Dépend de :** le dépôt. **Spec :** `01-BUILD-SPEC.md`. **Statut :** ⬜ à faire.
**Livrable :** les 7 démos rejouées comme tests verts dans le vrai graphe.

---

## H3 — Remplacer le routage discret *(se verrouille au début de l'apprentissage)*

**Où on en est.** 🟡 Partiel : l'argument est établi (superposition + filtrage + couplage
sont dérivables, contrairement à un aiguillage tout-ou-rien). Il manque la **preuve
comparative** — et elle exige de l'apprentissage, donc l'étape B d'abord.

**Objectif.** Montrer que, sur une tâche à deux régimes (« selon le contexte, applique
`f` ou `g` »), la version fréquentielle **apprend plus stablement** qu'un routage
discret (gate dur), grâce à la dérivabilité.

**Démonstration prévue.** Deux implémentations entraînées par gradient sur la même
tâche jouet : (a) aiguillage discret (choix non lisse) ; (b) fréquentiel (gating par
phase / couplage lisse). Comparer vitesse de convergence, stabilité, taux d'échec.
**Dépend de :** étape B + boucle d'entraînement. **Livrable :** courbes + verdict H3.

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

## JALON 5 — ADN génératif *(encoder la règle, pas les poids)*

**Objectif.** Boucler sur l'intuition de départ : encoder la **règle génératrice
compacte** (le « génome ») qui *déploie* le substrat, au lieu de stocker les poids.
Reprend H5 (compacité) et le goulot génomique.

**Hypothèse introduite.**
- **H12** — un petit générateur (la règle) reproduit un substrat entier à peu de
  paramètres, avec transfert à de nouvelles tâches.

**Démonstration prévue.** Un générateur produit le substrat ; mesurer ratio de
compression *et* transfert. **Dépend de :** jalons 1-4. **Réf :** goulot génomique
(Zador 2019, 2024), CPPN/HyperNEAT (Stanley), hypernetworks (Ha 2016). **Statut :** ⬜
recherche (le plus incertain — cf. *No Free Prune*, qui borne ce qu'on peut espérer a
priori).

---

## Récapitulatif des hypothèses

| # | Hypothèse | Jalon | Statut |
|---|---|---|---|
| H1 | multiplexage propre | 1 | ✅ prouvé |
| H2 | hétérogénéité des calculs | 1 | ✅ prouvé |
| H3 | remplace le routage discret | B→ | 🟡 partiel (à verrouiller) |
| H4 | couplage non-linéaire | 1 | ✅ prouvé |
| H5 | compacité (ADN) | 1 | ✅ prouvé |
| H6 | la phase porte info/routage | 1 | ✅ prouvé |
| H7 | harmoniques : contamination + code | 1 | ✅ prouvé |
| H8 | plasticité locale du `w_b` | 2 | ⬜ planifié |
| H9 | deux échelles de temps stables | 2 | ⬜ planifié |
| H10 | plasticité gatée par récompense | 3 | ⬜ planifié |
| H11 | évoluer les règles + diversité | 4 | ⬜ planifié |
| H12 | générateur compact (ADN) | 5 | ⬜ recherche |

**Note de prudence.** H8→H12 sont des hypothèses *candidates* : elles orientent le
travail, elles ne sont pas prouvées. Chaque jalon peut faire tomber la précédente —
c'est le but. Le socle solide reste le jalon 1 ; le reste est un programme.
