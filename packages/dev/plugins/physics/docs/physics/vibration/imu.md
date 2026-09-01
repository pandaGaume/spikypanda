# IMU (3-axis)

`Physics.Mechanical.Vibration:imu`

Centrale inertielle trois axes. À la différence de l'accéléromètre scalaire, ce nœud est un nœud de transformation : il est **placé** sur une structure, avec sa propre attitude.

## Physique

Il lit l'accélération vibratoire vraie sous forme d'un vecteur à trois composantes, par exemple la sortie `acceleration` d'un bâti, et il produit la **force spécifique** que mesure réellement un accéléromètre :

```
mesure = a_corps - g_corps + bruit          (par axe)
```

où `g_corps = R^T * g_monde` est la gravité de la scène projetée dans le repère propre de la centrale.

L'attitude du capteur répartit donc la réaction de 1 g sur ses axes. Au repos, il lit +1 g vers le haut, exactement comme une centrale MEMS réelle. C'est ce signe qui distingue une force spécifique d'une accélération.

Un bruit blanc gaussien est ajouté indépendamment par axe, par la méthode de Box-Muller sur un générateur congruentiel linéaire ensemencé, le même schéma que le capteur de courant et l'accéléromètre scalaire.

Sans scène liée, ou quand `measuresGravity` est désactivé, la mesure se réduit à l'accélération plus le bruit.

## Pourquoi c'est le bon capteur pour l'étude gravitationnelle

C'est le seul capteur du jeu qui mesure la même grandeur que les accéléromètres SAMS de la Station spatiale internationale, à savoir une force spécifique trois axes exprimée dans un repère porté par la structure. C'est donc lui, et non le canal électrique, qui rend une simulation comparable à une mesure orbitale réelle.

## Placement

Câbler une attitude issue du plugin geometry, puis une transformation, vers `parentWorld` ou `local`, ou bien rattacher le nœud à la scène.

**Limite de la version actuelle** : l'accélération d'entrée est prise dans le repère propre de la centrale, donc la centrale est supposée rigidement co-orientée avec la structure qui la porte. Une rotation relative entre structure et centrale, ainsi qu'un bras de levier, restent à faire.

## Entrées et sorties

- **Entrées** : accélération vibratoire vraie, un vecteur à trois composantes.
- **Sorties** : force spécifique mesurée, un vecteur à trois composantes.

## Éditables

| Champ            | Sens                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| `noiseStdDev`    | Écart-type du bruit blanc ajouté par axe                              |
| `seed`           | Graine du générateur, pour rendre une campagne reproductible           |
| `measuresGravity`| Inclut ou non le terme de gravité. Désactivé, la sortie est purement vibratoire |
