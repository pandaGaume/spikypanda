# Décision 004 — L'objectif et l'économie de l'apprentissage

**Statut :** ACTÉ comme **cadre conceptuel** (boussole, comme la 003)
**Portée :** fondamentale — définit *ce qu'on optimise* et *dans quelle monnaie on paie*
**Réconcilie :** Décision 002 (substrat différentiable / CVNN) et Décision 003 (processus
non-différentiable) — elle montre qu'elles sont la boucle interne et la boucle externe.

---

## La décision, en une phrase

On optimise en **maximisant le succès** (objectif *évaluatif*) autant qu'en minimisant
l'erreur (objectif *supervisé*) ; et on assume que tout apprentissage **paie son coût dans
l'une de trois monnaies — échelle, échantillons, connaissance**. Le pari du projet est de
payer en **connaissance** (structure physique) pour réduire les deux autres.

---

## Partie A — L'objectif : maximiser le succès ≠ minimiser l'erreur

**Le piège à écarter.** Si le succès est une fonction *lisse*, maximiser le succès =
minimiser `−succès` : un signe inversé, rien de neuf. L'intérêt n'est pas max-vs-min.

**Le vrai contenu.** Quand le succès est **non-différentiable / épars / évaluatif** (« ça
a marché ou pas »), on quitte le monde « distance lisse à une cible » pour celui de la
**récompense**, qui *relâche* la contrainte de dérivabilité.

**Le pivot technique — ce que l'on différencie (ou pas) :**
1. différencier **le succès lui-même** → il doit être dérivable. *Aucune échappatoire.*
2. différencier **la loi de tirage** des comportements, pondérée par le succès (score /
   REINFORCE : `∇E[R] = E[R · ∇log π]`) → le succès, l'environnement, les spikes peuvent
   être **arbitraires**. *La porte de sortie.*
3. **ne rien différencier** : perturber les paramètres, garder ce qui augmente le succès
   (évolution / ES) → *ni* le modèle *ni* le succès n'ont besoin d'être dérivables.

**Supervisé vs évaluatif.** Minimiser l'erreur suppose une **cible** (bonne réponse
connue, distance dérivable). Maximiser le succès ne demande qu'un **jugement** (bien/mal),
sans cible ni dérivabilité. La biologie est évaluative (la dopamine ≈ récompense, pas le
gradient d'une perte) — cadre plus général, et le seul qui marche quand il n'y a **pas de
réponse à différencier**. C'est le cas d'un *processus* (Décision 003), qui n'a pas de
mémoire figée contre laquelle calculer une erreur.

---

## Partie B — L'économie : trois monnaies, jamais gratuit

Aucun apprentissage n'est « pas cher » ; le coût se **déplace**. On paie toujours dans
l'une de trois monnaies :

| Monnaie | Paradigme | Où vit le coût |
|---|---|---|
| **Échelle** | surparamétrer + rétropropagation | taille du réseau (le « billet gagnant » n'existe que dans une meule de foin géante) |
| **Échantillons** | récompense / évolution | nombre d'évaluations (variance des estimateurs) |
| **Connaissance** | a priori de structure / physique | ce qu'il faut *déjà comprendre* |

**Correction d'un abus de langage.** Le gradient de la rétropropagation est bon marché
*par pas* (une passe arrière = gradient exact de tous les paramètres). Mais au niveau
*système*, le Lottery Ticket impose de **surparamétrer massivement** pour être *sûr* que
la bonne formule existe dedans — et *No Free Prune* interdit de trouver le billet gagnant
à l'initialisation. Donc « entraîner énorme pour être sûr d'avoir la formule » n'est pas
cher : c'est **exorbitant**. Le gradient bon marché est payé en **échelle**.

**L'asymétrie (No Free Lunch).** Il n'existe pas d'apprenant à *zéro* structure : toute
architecture encode des a priori (convolution = spatial, attention = faible, couche de
Fourier = fréquentiel). Le pôle « pure structure, zéro apprentissage » existe (un modèle
codé à la main) ; le pôle « pur apprentissage, zéro structure » est un **mythe**. Tout
apprenant *connaît* déjà quelque chose — son biais inductif.

---

## Partie C — Apprendre ↔ connaître : un axe, pas un schisme

La tension « IA qui apprend » vs « IA qui connaît » est réelle et fondatrice — c'est l'axe
**Sutton (bitter lesson : échelle + apprentissage gagnent)** vs **Zador (critique of pure
learning : structure innée)**. Mais ce n'est pas deux camps en guerre, c'est un **curseur**
sur *quelle monnaie tu paies* (connaissance vs échelle/échantillons), avec trois
sharpenings :

1. **« Connaître les résultats » est un piège.** Au sens littéral, c'est une **table de
   correspondance** — morte, sans généralisation : le fossile de la Décision 003. Ce qu'on
   veut, c'est connaître **la forme de la réponse** (la géométrie du problème), pas la
   réponse. Le substrat ne connaît pas la sévérité d'un moteur ; il sait qu'elle *vit dans
   le couplage des bandes latérales*. Il sait *où chercher* — et doit **quand même
   apprendre** les spécificités.

2. **Le vrai clivage dur : la portée épistémique.** La voie recherche/échelle peut
   **découvrir une structure inconnue** (coûteux, mais peut surprendre) ; la voie
   structure-fournie ne peut qu'**exploiter le connu** (bon marché, mais *borné par ton
   savoir*). C'est le **plafond** du projet : imbattable où la physique est connue,
   **aveugle à l'inconnu**.

3. **La biologie ne choisit pas de camp.** Structure (lente, le génome) + apprentissage
   (rapide, le cerveau), et **la structure connue est ce qui rend l'apprentissage bon
   marché**. Le schisme se dissout en une **division du travail par échelle de temps**.
   C'est le fil ADN/goulot génomique : le projet ne *remplace* pas l'apprentissage par de
   la connaissance — il est la *structure qui rend l'apprentissage tractable*.

---

## Partie D — La synthèse : boucle interne différentiable, boucle externe évaluative

Les Décisions 002 et 003 ne se contredisent pas ; elles s'**imbriquent** :

> **Interne (Décision 002)** : substrat **différentiable** (CVNN, Wirtinger), entraîné par
> gradient *là où on peut*.
> **Externe (Décision 003)** : objectif **évaluatif** (le succès, non-différentiable) *là
> où on doit* — le processus, la chimie, l'environnement, les spikes.

*Différentiable à l'intérieur, évaluatif à l'extérieur.* C'est exactement le RL avec
approximation de fonction : un réseau dérivable optimisé par une récompense qui, elle, ne
l'est pas. Les **jalons 3-4** (récompense, sélection) *sont* cette boucle externe. Ponts
intermédiaires : equilibrium propagation, predictive coding (gradients ~backprop par règles
locales), feedback alignment (relâche le transport des poids).

---

## Le pari du projet, et son prix

**Pari :** faire glisser le paiement vers la **connaissance** — injecter la physique
fréquentielle/ondulatoire pour que *l'échelle et les échantillons rétrécissent tous deux*.
Preuve : le résultat moteur (4 773 paramètres vs 143 M) parce que la structure des bandes
latérales est **posée**, pas cherchée. Un substrat petit **et** structuré rend même la
maximisation de récompense viable (la variance ne mord qu'à grand nombre de paramètres).

**Prix assumé :** ça ne vaut que **là où la structure est connue** (moteurs, vibrations —
ton domaine). Face à l'inconnu, la meule de foin surparamétrée reste ce qui permet de
*découvrir*. Et « fournir la structure », c'est avoir payé ailleurs — en compréhension.
Le génome fait pareil : il n'élague pas un géant, il *encode la structure* d'emblée, payée
une fois en évolution.

---

## Ce que ça change pour le plan

- L'objectif d'entraînement des jalons ≥ 3 est **évaluatif** (maximiser le succès), pas
  seulement supervisé.
- Les jalons 3 (récompense) et 4 (sélection) sont formellement la **boucle externe** de
  l'imbrication ci-dessus — leur raison d'être est désormais explicite.
- La ligne directrice de conception reste : **payer en connaissance**, garder le substrat
  petit et structuré, pour que gradient (interne) et récompense (externe) restent tous
  deux traçables.

## Ce que ça ne prétend pas

Que la connaissance batte l'échelle *partout* — non : seulement là où la structure est
connue. Que maximiser le succès soit gratuit — non : on paie en variance/échantillons.
Le cadre dit *où* est le coût, pas qu'il disparaît.
