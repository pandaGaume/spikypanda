# Résultat : JEPA modal, le test anti-collapse (verdict NÉGATIF, honnête)

*Conjecture testée (la mienne, hier soir) : « un prédicteur de Koopman quasi-unitaire
résiste au collapse d'un JEPA mieux qu'un MLP, sans EMA ni VICReg ; le MLP collapse
(variance → 0), le Koopman unitaire tient. » Testé proprement (`jepa_collapse.py`,
5 graines × 400 époques). **La conjecture est infirmée.** Voici les chiffres et le
pourquoi, sans enjoliver.*

## Montage (bref)

Mini-JEPA style SimSiam (stop-gradient, pas d'EMA) sur un flux modal : `r=8` modes
complexes, par trajectoire un sous-ensemble aléatoire actif = le label multi-faute.
On prédit la représentation d'une fenêtre future depuis la fenêtre passée. Six
prédicteurs pour isoler le mécanisme, deux régimes, deux axes (collapse = std de la
représentation ; utilité = sonde linéaire), encadrés par deux plafonds.

**Plafonds de la sonde** (décodage des fautes) : sonde linéaire sur l'entrée brute
**49.6 %** (= hasard : l'activité de mode est une feature *quadratique*, pas linéaire
dans le temps) ; supervisé bout-en-bout **98.7 % / exact 89.6 %** (l'architecture *sait*
décoder la tâche). Une sonde SSL entre 50 et 98.7 % mesure donc ce que le SSL a fait
émerger.

## Régime normalisé (SimSiam standard) — le régime qui fait foi

| Prédicteur | std représentation | sonde (par-faute / exact) |
|---|---:|---|
| Identity (ancre de collapse) | **0.009** (collapse) | 61.0 % / 1.7 % |
| MLP | 0.172 (vivant) | 60.9 % / 1.5 % |
| Linear (libre) | **0.227** (le plus sain) | 63.8 % / 2.2 % |
| Koopman-amorti | **0.009** (collapse) | 61.9 % / 1.4 % |
| **Koopman-unitaire** | **0.010** (collapse) | 62.2 % / 1.8 % |
| MLP + var-reg (ctrl+) | 0.172 (vivant) | 61.0 % / 1.1 % |

*(std sain ~ 1/sqrt(d) = 0.25 ; collapse = std → 0)*

**Lecture, nette : c'est l'inverse de ma conjecture.** Les deux prédicteurs Koopman
(unitaire ET amorti) **collapsent exactement comme l'ancre sans-prédicteur** (std 0.01),
tandis que le **MLP expressif** et même le **Linear libre** résistent (std 0.17-0.23).
Ce n'est pas « linéaire vs non-linéaire » (le Linear libre tient) : c'est **contraint vs
expressif**. La rotation diagonale contrainte est *trop restrictive* → elle collapse. Ça
confirme le vrai mécanisme de SimSiam : **c'est l'expressivité du prédicteur qui évite le
collapse, pas une structure imposée.** Mon intuition « l'unitaire préserve la norme donc
résiste » était fausse : la norme-préservation borne ce qu'on donne au prédicteur, elle
n'empêche pas l'*encodeur* de collapser.

## Régime brut (sans béquilles) — le lot de consolation ne survit pas non plus

| Prédicteur | std représentation | sonde par-faute |
|---|---:|---|
| Identity | 0.009 (collapse) | 54.8 % |
| MLP | 41.7 (explose) | 60.7 % |
| Linear (libre) | 88.5 (explose) | 62.9 % |
| Koopman-amorti | **2357.7 (explose fort)** | 55.9 % |
| Koopman-unitaire | 0.016 (collapse) | 53.9 % |
| MLP + var-reg | 31.3 (explose) | 59.5 % |

Le smoke à 40 époques suggérait « l'unitaire est le seul stable en échelle ». **À
convergence (400 époques), c'est faux** : le régime brut dégénère pour tout le monde,
l'unitaire **collapse à zéro** (l'encodeur rétrécit, rien ne l'en empêche), les autres
**explosent**. Un JEPA non normalisé n'est simplement **pas viable** ici, pour aucun
prédicteur. La « stabilité de l'unitaire » ne survit pas.

## Les trois conclusions honnêtes

1. **Conjecture infirmée.** Le prédicteur Koopman ne résiste PAS mieux au collapse ; il
   collapse *avec* l'ancre triviale. L'anti-collapse d'un JEPA vient de l'**expressivité**
   du prédicteur, pas de sa structure modale.
2. **Non-collapse ≠ utilité.** Même les représentations non-collapsées (MLP, Linear)
   plafonnent à **~61-64 %** de sonde, loin du **98.7 %** supervisé. Garder la variance
   vivante n'a **rien** fait émerger de la tâche. Et le modal n'a **aucun** avantage
   d'utilité (62 % vs 61-64 %, dans le bruit).
3. **Pourquoi (la leçon de fond).** Le prétexte SSL « prédire la fenêtre future » se
   satisfait de *continuer l'oscillation courante*, sans avoir besoin de décoder *quels*
   modes sont actifs (l'activité est constante par trajectoire). Le prétexte n'incite donc
   pas les features pertinentes pour le label. Ce n'est pas un verdict sur le substrat,
   c'est un défaut de conception du prétexte.

## Ce que ça n'enterre PAS (bornes de la conclusion)

- Ceci teste la **version minimale** : un simple *échange de prédicteur*. La vraie idée
  « JEPA modal » inclut un **encodeur produisant des coordonnées modales** + `D+C` + un
  **prétexte qui exige l'identité des modes**. Rien de tout ça n'est testé ici. On a
  réfuté le raccourci, pas le programme complet.
- La **loi de scaling** (`MODAL-SCALING.md`) et le **plan MCU** tiennent : ils ne reposent
  pas sur JEPA. Le substrat modal reste bon là où c'est *démontré* (calcul multiplexé
  compact, prévision modale de faible rang), pas comme greffe anti-collapse sur un JEPA.

## Prochain pas honnête (si on poursuit la piste JEPA)

Un test *juste* de l'utilité exigerait un **prétexte qui force l'identité des modes** : par
ex. masquer un sous-ensemble de modes dans le contexte et demander de prédire la fenêtre
future *complète* (il faut alors inférer quels modes existent), avec un **encodeur modal**
(pas un MLP générique) et le prédicteur `D+C`. Sans ça, l'axe utilité reste aveugle. Mais
au vu de ce résultat, la piste « JEPA modal » est **spéculative et non prioritaire** face
au déploiement MCU, qui, lui, est ancré.

## Reproduire

```
python docs/multipath-frequentiel/h3/mux/jepa_collapse.py --seeds 5 --epochs 400
```
