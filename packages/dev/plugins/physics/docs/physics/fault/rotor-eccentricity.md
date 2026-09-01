# Rotor Eccentricity (static cause)

`Physics.Mechanical.Fault:rotor-eccentricity`

Excentricité d'entrefer statique. C'est une **cause** d'excentricité, au même titre que l'affaissement du rotor, mais d'origine purement géométrique. Elle est le témoin du jeu de défauts : **elle ne dépend pas de la gravité**.

## Physique

Le rotor est décalé de l'axe magnétique d'une fraction fixe de l'entrefer, dans une direction spatiale fixe. C'est un défaut de fabrication ou de montage, présent même sur un rotor parfaitement rigide et non affaissé.

```
delta  = severity * motor.airGap
deltaY = delta * cos(eccentricityPhase)
deltaZ = delta * sin(eccentricityPhase)
```

Relié à un moteur par une relation `ApplyTo`, ce nœud lit l'entrefer du moteur, qui est une **propriété**, et **contribue** ce déplacement radial à l'état d'excentricité d'entrefer, `eccentricityY` et `eccentricityZ`.

Comme l'affaissement, il ne calcule ni flux ni traction magnétique déséquilibrée : ce sont les conséquences électromagnétiques que le moteur tire de l'excentricité **agrégée**, toutes causes confondues.

## Pourquoi ce nœud est le témoin

Sa contribution est indépendante de la gravité. Composé avec `rotor-sag` sur la même cible, il permet de séparer ce qui dans l'excentricité totale vient du poids et ce qui vient de la géométrie :

```
excentricite totale = delta_affaissement(g)  +  delta_statique
                      s'annule a 0 g            constante
```

C'est cette décomposition qui rend mesurable le plancher gravitationnel : sous 1 g, un moteur sain présente déjà une excentricité équivalente non nulle, alors qu'en orbite le terme d'affaissement s'annule et seul le défaut réel subsiste.

## Entrées et sorties

- **Entrées** : aucune.
- **Sorties** : `applyTo`, de type `fault`, transformé en lien structurel `ApplyTo` vers l'entrée `fault_N` de la cible.

## Éditables

| Champ                | Défaut | Sens                                                     |
| -------------------- | ------ | -------------------------------------------------------- |
| `severity`           | 0      | Fraction de l'entrefer, dans l'intervalle [0, 1]          |
| `eccentricityPhase`  | 0 rad  | Azimut du décalage dans le plan radial du corps           |
