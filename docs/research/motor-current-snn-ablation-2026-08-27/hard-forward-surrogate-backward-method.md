# Forward LIF binaire et gradient surrogate au backward

Compte rendu de correction et de vérification du 27 août 2026.

## Résumé

Le réseau utilisé pendant l'apprentissage produit maintenant exactement les mêmes impulsions et les mêmes états de membrane que le réseau LIF natif exécuté après compilation.

Le forward ne contient plus de pseudo-spike sous le seuil. Chaque sortie neuronale vaut strictement 0 ou 1. La fonction surrogate n'intervient que pendant le calcul du gradient, donc uniquement au backward. Elle aide à déterminer dans quel sens modifier un poids, mais sa valeur n'est jamais transmise au neurone suivant et ne modifie jamais la membrane.

Le contrôle effectué sur les 200 fenêtres de validation a comparé 264 915 valeurs neuronales. Il a trouvé :

- 0 valeur non binaire ;
- 0 différence de prédiction entre le forward d'entraînement et le mode hard analytique ;
- 0 différence de score ;
- 0 différence de membrane ;
- 0 différence de prédiction ou de score avec le graphe LIF natif compilé.

Un apprentissage court de cinq epochs confirme également que les poids peuvent encore évoluer avec ce forward strictement binaire. Le meilleur score de validation de ce test fonctionnel est 44,5 %. Ce chiffre n'est pas un benchmark : le test utilise seulement 16 LIF cachés et cinq epochs.

## 1. Problème corrigé

Dans la version précédente, le forward d'entraînement pouvait transmettre une activité continue comprise entre 0 et 1 lorsque la membrane était proche du seuil. Cette activité fractionnaire pouvait :

1. atteindre les neurones suivants alors qu'aucune impulsion physique n'avait été produite ;
2. modifier la remise à zéro de la membrane ;
3. s'accumuler au fil du temps ;
4. créer un comportement appris impossible à reproduire par le runtime LIF binaire.

Le réseau optimisait alors un modèle différent de celui qui devait être exécuté. La conversion finale vers le LIF hard révélait l'écart, mais trop tard.

Le contrat v5 supprime cette différence. Le réseau exécuté au forward pendant l'apprentissage est déjà le réseau binaire cible.

## 2. Dynamique exacte du forward

Pour un neurone donné au pas de temps `t`, on note :

- `V[t-1]` : le potentiel de membrane conservé depuis le pas précédent ;
- `I[t]` : la somme pondérée des événements reçus ;
- `alpha` : le facteur de fuite de la membrane ;
- `theta` : le seuil de déclenchement ;
- `Vreset` : la valeur appliquée après une impulsion ;
- `S[t]` : la sortie binaire du neurone.

### 2.1 Intégration

```text
U[t] = alpha * V[t-1] + I[t]
```

`U[t]` est la membrane intégrée avant la décision.

### 2.2 Décision binaire

```text
S[t] = H(U[t] - theta)
```

avec :

```text
H(x) = 1 si x >= 0
H(x) = 0 sinon
```

Ainsi :

```text
S[t] appartient toujours à {0, 1}
```

Si une période réfractaire interdit le déclenchement, `S[t]` vaut également 0.

### 2.3 Remise à zéro

```text
V[t] = S[t] * Vreset + (1 - S[t]) * U[t]
```

Lorsque `S[t] = 1`, la membrane prend exactement la valeur de reset. Lorsque `S[t] = 0`, elle conserve la valeur intégrée. Il n'existe plus de reset partiel.

### 2.4 Propagation

```text
sortie[t] = S[t] * amplitudeSpike
```

Avec une amplitude de 1, la sortie propagée vaut exactement 0 ou 1. Aucun nombre intermédiaire n'entre dans le graphe.

## 3. Pourquoi une dérivée surrogate reste nécessaire

La fonction seuil `H` a une dérivée nulle presque partout et indéfinie au seuil. Une rétropropagation classique ne peut donc pas indiquer comment déplacer un poids pour faire apparaître ou disparaître une impulsion.

La solution retenue conserve `H` dans le forward et remplace seulement sa dérivée pendant le backward par une approximation triangulaire :

```text
dS/dU ≈ beta * max(0, 1 - beta * abs(U - theta))
```

Dans l'implémentation actuelle :

```text
beta = 1,25
```

Cette dérivée vaut zéro loin du seuil et devient positive dans son voisinage. Elle indique qu'une petite variation de membrane peut changer la décision binaire. Elle ne constitue pas une sortie du neurone.

On peut écrire `max(0, x)` avec une ReLU. La ReLU intervient donc éventuellement dans l'expression mathématique de la dérivée surrogate, mais pas comme fonction de sortie du neurone. Une ReLU seule ne produit pas des valeurs binaires.

## 4. Gradient à travers la remise à zéro

La remise à zéro dépend elle-même de la décision `S[t]`. Le backward doit donc prendre en compte deux chemins :

1. l'effet de la membrane intégrée sur l'état futur lorsqu'il n'y a pas de spike ;
2. l'effet du spike sur la perte et sur la remise à zéro.

Le calcul utilisé peut être résumé ainsi :

```text
dL/dU[t] = dL/dV[t] * (1 - S[t])
          + (dL/dS[t] + dL/dV[t] * (Vreset - U[t])) * surrogate'(U[t])
```

Dans cette équation, `S[t]` reste la valeur réellement obtenue au forward, donc 0 ou 1. Seul `surrogate'(U[t])` est une approximation de backward.

Les gradients des poids et de l'état précédent découlent ensuite de `dL/dU[t]` :

```text
dL/dw = dL/dU[t] * entrée[t]
dL/dV[t-1] = alpha * dL/dU[t]
```

## 5. Méthode de vérification

Le test d'identité utilise les 200 fenêtres du lot de validation groupé. Pour chaque fenêtre, les mêmes événements sensoriels sont envoyés dans trois exécutions.

### Exécution A : forward d'entraînement

Le graphe conserve les informations nécessaires au backward, notamment la dérivée surrogate de chaque LIF. Toutes les sorties réellement propagées doivent cependant être binaires.

### Exécution B : mode hard analytique

Le même graphe est rejoué sans intention d'apprentissage. Les sorties, scores et membranes sont comparés pas à pas à l'exécution A.

### Exécution C : runtime LIF natif compilé

Les poids sont installés dans le graphe, le sous-graphe d'entraînement est remplacé par les LIF natifs, puis le runtime exécute la même fenêtre. Les cinq scores de classe et la prédiction finale sont comparés à l'exécution B.

Le contrat est accepté seulement si les conditions suivantes sont toutes vraies :

```text
nombre de valeurs non binaires = 0
écart maximal des membranes A/B = 0
écart maximal des scores A/B = 0
prédictions différentes A/B = 0
écart maximal des scores B/C = 0
prédictions différentes B/C = 0
```

## 6. Résultats de l'identité

| Mesure | Résultat |
| --- | ---: |
| Fenêtres de validation | 200 |
| Valeurs neuronales contrôlées | 264 915 |
| Valeurs non binaires | 0 |
| Prédictions différentes, entraînement contre hard analytique | 0 |
| Erreur maximale des scores, entraînement contre hard analytique | 0 |
| Erreur maximale des membranes, entraînement contre hard analytique | 0 |
| Prédictions différentes, hard analytique contre runtime natif | 0 |
| Erreur absolue moyenne des scores natifs | 0 |
| Erreur maximale des scores natifs | 0 |
| Durée du contrôle | 1 516 ms |

Ces résultats démontrent l'identité sur le jeu contrôlé. Ils ne constituent pas une preuve formelle pour toutes les entrées numériques possibles, mais les tests unitaires couvrent également les cas sous le seuil, au-dessus du seuil, la remise à zéro, les délais et la propagation entre neurones.

## 7. Test fonctionnel d'apprentissage

Le but de ce petit run était uniquement de vérifier qu'un gradient utile subsiste lorsque le forward devient strictement binaire.

Configuration :

- 16 LIF cachés ;
- 949 poids entraînables ;
- cinq epochs ;
- 1 400 fenêtres d'apprentissage ;
- 200 fenêtres de validation ;
- 150 événements sensoriels en moyenne par fenêtre.

| Epoch | Loss d'apprentissage | Accuracy hard train | Accuracy runtime hard validation |
| ---: | ---: | ---: | ---: |
| 1 | 0,047146 | 31,9 % | 36,5 % |
| 2 | 0,042461 | 33,5 % | 33,0 % |
| 3 | 0,043659 | 41,3 % | 40,5 % |
| 4 | 0,041271 | 43,9 % | 44,5 % |
| 5 | 0,040712 | 38,6 % | 39,0 % |

Le checkpoint de l'epoch 4 a été restauré. Le passage de 31,9 % à 43,9 % sur l'apprentissage et le meilleur score de 44,5 % en validation montrent que le gradient n'est pas nul et que les poids modifient bien le comportement binaire.

Ce run ne doit pas être comparé au checkpoint de référence à 32 LIF cachés et entraîné plus longtemps. Aucun score sur le test indépendant n'a été calculé, afin de conserver ce lot pour les évaluations de modèle complètes.

## 8. Conséquence scientifique

L'écart entre modèle continu et runtime discret n'est plus une variable cachée. Une baisse ou une stagnation future du score ne pourra plus être attribuée à la disparition de pseudo-spikes lors de la compilation.

La prochaine question porte donc sur l'objectif d'apprentissage : une MSE calculée sur les sorties binaires finales fournit-elle un gradient surrogate suffisamment informatif et suffisamment aligné avec le décodeur temporel du runtime ? Cette question doit être étudiée sans réintroduire d'activité fractionnaire dans le forward.

Cette expérience a maintenant été réalisée. Voir [loss alignée sur le décodeur LIF du runtime](runtime-decoder-loss-experiment.md). À protocole identique, la loss alignée atteint 82,5 % en validation et 78,5 % sur le test indépendant, contre 51,5 % et 51,0 % pour la MSE temporelle.

## 9. Reproductibilité

- Version d'architecture : `snn-wave-lif-hard-forward-v5`
- Signature du test : `dd285f33`
- Fingerprint du jeu de données : `ec00f5c3`
- Fréquence d'échantillonnage : 120,110 Hz
- Longueur d'une fenêtre : 128 échantillons, soit 1,066 s
- Résultats bruts : [`data/hard-forward-identity-results.json`](data/hard-forward-identity-results.json)

Les checkpoints antérieurs à la version v5 sont volontairement refusés par la page. Leurs poids ont été optimisés avec une dynamique de forward différente et ne doivent pas être mélangés avec cette expérience.
