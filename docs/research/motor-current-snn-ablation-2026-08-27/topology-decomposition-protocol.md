# Protocole SNN, décomposition topologique du diagnostic BRB

## Question

Le classifieur dense à cinq sorties doit distinguer Healthy, BRB1, BRB2, BRB3 et BRB4 dans un seul réseau. Cette expérience mesure si la spécialisation de petits SNN facilite la décision sans changer le capteur temporel.

L'ancienne expérience `specialist-branch` ajoutait seulement quatre LIF dédiés au couple Healthy/BRB1 à la baseline multiclasses. Elle ne testait ni quatre réseaux indépendants, ni une cascade complète, ni une formulation ordinale.

## Contrôle expérimental

Les quatre architectures utilisent exactement :

- le jeu groupé `grouped-acquisition-v2-120hz` ;
- la séparation par acquisition `1399/201/400` après correction de la fréquence d'échantillonnage brute à 50 kHz ;
- les trois bandes choisies par Fisher multiclasses sur les 1 400 exemples d'apprentissage ;
- l'encodage `phase-multilevel` calibré sur l'apprentissage seulement ;
- des LIF hard-forward avec gradient surrogate au backward ;
- Adam, mini-lots de 16 et un pas de 0,003 ;
- le décodeur `2 x spikes + potentiel final / seuil` ;
- un checkpoint choisi uniquement sur la validation ;
- un test indépendant jamais utilisé pour choisir les poids ou les seuils.

## Architectures

### Baseline multiclasses

```text
54 entrées -> 32 LIF -> 5 sorties
1 893 poids
```

### Quatre spécialistes BRBi contre Healthy

Chaque réseau comporte huit LIF et deux sorties. Il est entraîné uniquement sur Healthy et la classe BRBi correspondante.

```text
4 x (54 entrées -> 8 LIF -> 2 sorties)
1 800 poids au total
```

À l'inférence, la marge de chaque tête vaut `score_BRB - score_Healthy`. Si aucune marge ne dépasse le seuil commun, la sortie est Healthy. Sinon, la classe de la marge maximale gagne. Le seuil commun est choisi sur la validation. Le rapport compte aussi les fenêtres pour lesquelles plusieurs têtes sont actives.

### Cascade Healthy/BRB puis sévérité

```text
54 entrées -> 16 LIF -> Healthy ou BRB
54 entrées -> 16 LIF -> BRB1, BRB2, BRB3 ou BRB4
1 830 poids au total
```

La première étape est équilibrée par répétition déterministe des exemples Healthy. La seconde est entraînée uniquement sur les exemples BRB. Le seuil de la porte est choisi sur la validation en maximisant l'accuracy finale à cinq classes.

### Quatre seuils ordinaux

```text
tête 1 : BRB >= 1
tête 2 : BRB >= 2
tête 3 : BRB >= 3
tête 4 : BRB >= 4

4 x (54 entrées -> 8 LIF -> 2 sorties)
1 800 poids au total
```

Chaque tête binaire est équilibrée par répétition déterministe de sa classe minoritaire. Son seuil est calibré sur la balanced accuracy de validation. Le décodage impose un préfixe cumulatif : une réponse négative arrête la progression de sévérité. Les violations brutes de monotonie sont comptées dans le rapport.

### Fusion neuronale à délais de phase

Cette ablation conserve l'encodeur `phase-multilevel` et n'ajoute aucun descripteur DSP. Chacun de ses 54 ports alimente un LIF relais. Chaque spike relais est ensuite transmis vers huit LIF de fusion par quatre synapses apprenables ayant des délais fixes de 0, 1, 2 et 4 pas. Les pas sans événement sont conservés pour que les délais correspondent toujours à 0, 8,34, 16,68 et 33,36 ms à 119,904 Hz.

```text
54 ports -> 54 LIF relais -> banque de délais 0/1/2/4 -> 8 LIF de fusion -> 5 sorties
1 827 poids
```

Le budget reste proche de la baseline, 1 827 poids contre 1 893. Les poids des relais, des quatre chemins retardés et de la lecture sont entraînés par le même BPTT surrogate que la baseline. Seuls les délais entiers restent fixes.

Commande du test complet à 20 époques :

```powershell
npm run experiment:snn-topology -- --full --only phase-delay --epochs 20 --batch-size 16 --phase-fusion-hidden 8 --phase-delays 0,1,2,4 --output output/motor-current-snn-phase-delay-fs50k-e20.json
```

À budget d'apprentissage égal, la baseline atteint 83,00 % sur le test indépendant et la fusion retardée 73,00 %. Le rappel de BRB3 recule de 72,50 % à 47,50 %, principalement par confusion vers BRB4. Cette banque de délais ne produit donc pas une meilleure séparation que la connectivité dense.

## Reproduction

Smoke test :

```powershell
npm run experiment:snn-topology -- --epochs 3 --per-class 12
```

Expérience complète recommandée :

```powershell
npm run experiment:snn-topology -- --full --epochs 40 --batch-size 16 --hidden 32 --small-hidden 8 --cascade-hidden 16 --output output/motor-current-snn-topology-results.json
```

Le rapport JSON contient pour chaque architecture :

- accuracy, balanced accuracy et macro F1 ;
- matrice de confusion et rappel par classe ;
- meilleur epoch et historique d'apprentissage ;
- nombre exact de poids ;
- seuils calibrés sur validation ;
- ambiguïtés des spécialistes ou violations ordinales.

Le test complet entraîne onze modèles. Sa durée peut donc être sensiblement supérieure à celle d'une baseline unique, même si les budgets de paramètres comparés restent proches.
