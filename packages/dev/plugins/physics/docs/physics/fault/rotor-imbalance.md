# Rotor Imbalance (mechanical cause)

`Physics.Mechanical.Fault:rotor-imbalance`

Balourd du rotor. C'est une **cause** mécanique, distincte de l'excentricité, et la distinction porte tout le tri diagnostique.

## Physique

Le centre de gravité du rotor est décalé de l'axe de rotation, mais le rotor reste **géométriquement centré** dans le stator.

Conséquences en chaîne :

- l'entrefer reste **symétrique** ;
- il n'y a donc **aucune traction magnétique déséquilibrée** engendrée directement, et aucune variation de flux notable venant du défaut lui-même ;
- la signature est une force centrifuge tournante `F = m * e * omega^2`, observable **en vibration à 1x la fréquence de rotation, sans signature en courant**.

## La règle de tri

C'est le point à retenir en diagnostic, et il oppose ce nœud au précédent.

| Observation | Cause à suspecter en premier |
| --- | --- |
| Vibration à 1x, **pas** de signature en courant | Balourd |
| Vibration à 1x **et** harmoniques ou bandes latérales en courant | Excentricité (affaissement, mauvais centrage, arbre voilé) |

L'excentricité est un défaut de **position** : entrefer asymétrique, donc traction magnétique déséquilibrée et redistribution du flux, donc signature dans les **deux** canaux. Le balourd est un défaut de **répartition de masse** : un seul canal.

## La nuance gravitationnelle

Option `gravityCoupling`, désactivée par défaut.

Le centre de gravité décalé est aussi un pendule. En tournant, la gravité soulève puis laisse retomber le point lourd, ce qui produit une ondulation de couple résistant à 1x :

```
ondulation = m * r * g_radial * sin(angle - angle_gravite)
```

Comme la force centrifuge est purement radiale et n'exerce aucun couple sur l'arbre, cette ondulation est une signature **purement gravitationnelle dans le courant**, lisible à n'importe quelle vitesse. Elle s'annule en microgravité, quand `g_radial` tend vers zéro, et culmine pour un arbre horizontal.

C'est le mécanisme par lequel une machine d'apparence équilibrée laisse malgré tout fuir son orientation par rapport à 1 g dans le spectre du courant.

## Entrées et sorties

- **Entrées** : aucune.
- **Sorties** : `applyTo`, de type `fault`, transformé en lien structurel `ApplyTo` vers l'entrée `fault_N` de la cible.

## Éditables

| Champ                          | Défaut | Sens                                                                 |
| ------------------------------ | ------ | -------------------------------------------------------------------- |
| `severity`                     | 0      | Sévérité du balourd, dans l'intervalle [0, 1]                        |
| `phaseOffset`                  | 0 rad  | Azimut du point lourd dans le repère rotor                            |
| `dynamicEccentricityCoupling`  | faux   | Autorise le balourd à contribuer aussi à l'excentricité dynamique     |
| `gravityCoupling`              | faux   | Active l'ondulation de couple pendulaire décrite ci-dessus            |
