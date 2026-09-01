# Cartesian3 Split

`spk.geometry:cartesian3-split`

Démultiplexeur de vecteur : il décompose un flux `vec3` en trois sorties scalaires. C'est l'inverse exact de `Cartesian3`.

## Rôle

Pur adaptateur d'entrées et sorties, sans physique propre. Il consomme le dernier jeton `vec3` reçu et publie chacune de ses composantes ; une composante absente vaut zéro.

Son emploi canonique est de nourrir chaque axe d'une centrale inertielle dans sa propre chaîne de traitement. La sortie d'une centrale est **un seul** `vec3`, alors que les chaînes de traitement du signal, tampon puis fenêtrage puis transformée de Fourier puis spectre, et les tracés temporels de `Viz.Plot:line`, travaillent sur des scalaires.

```
IMU.measuredAcceleration (vec3) ─► Cartesian3 Split ─┬─► x ─► tampon ─► fenetre ─► FFT
                                                     ├─► y ─► ...
                                                     └─► z ─► ...
```

C'est ce nœud qui permet, dans l'étude gravitationnelle, de lire séparément les axes d'un accéléromètre trois axes, et donc de retrouver la répartition d'un signal entre les axes plutôt que sa seule norme. Cette répartition est une information à part entière : sur la Station spatiale internationale, NASA a par exemple relevé qu'un ventilateur de rack concentrait plus de 90 pour cent de son énergie efficace sur un seul axe.

## Entrées et sorties

- **Entrées** : `vec3`, optionnel.
- **Sorties** : `x`, `y`, `z`, trois flottants.

## Éditables

Aucun.

## Standards

Ce nœud déclare une conformité `ue5`.
