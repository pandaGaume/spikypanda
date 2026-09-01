# Rotor Sag (gravity cause)

`Physics.Mechanical.Fault:rotor-sag`

Affaissement du rotor sous son propre poids. C'est une **cause** d'excentricité d'entrefer, au sens de la chaîne cause vers état vers conséquence vers symptôme. Ce nœud est le seul du jeu de défauts dont l'effet **disparaît en microgravité**, ce qui en fait le point de départ de l'étude gravitationnelle.

## Physique

La gravité fléchit l'arbre. Le centre du rotor se déplace le long de la direction radiale de la gravité de

```
delta = motor.rotorMass * g_radial / motor.bearingRadialStiffness
```

Relié à un moteur par une relation `ApplyTo`, ce nœud lit la masse du rotor et la raideur radiale des paliers, qui sont des **propriétés du moteur**, ainsi que la gravité du corps issue de la scène, qui est une **latente**. Il **contribue** ce déplacement à l'état d'excentricité d'entrefer du moteur, `eccentricityY` et `eccentricityZ` dans le plan radial du corps.

Il ne calcule ni flux ni traction magnétique déséquilibrée. Ce sont les conséquences électromagnétiques que le **moteur** tire de l'excentricité agrégée, une fois toutes les causes accumulées.

Deux annulations, et ce sont elles qui portent la thèse :

- **Microgravité** : `g_radial` tend vers zéro, donc `delta` tend vers zéro. La contribution disparaît entièrement.
- **Arbre vertical** : la gravité devient axiale, `g_radial` vaut zéro, même résultat sous 1 g.

Une conséquence à retenir pour le diagnostic : l'affaissement implique l'excentricité, mais la réciproque est fausse. Un rotor parfaitement rigide peut être excentré par un défaut de montage sans aucun affaissement, et cette excentricité-là ne dépend pas de la gravité. Voir `rotor-eccentricity.md`.

## Entrées et sorties

- **Entrées** : aucune. Le nœud lit les propriétés de sa cible et la gravité de la scène, il ne consomme aucun signal.
- **Sorties** : `applyTo`, de type `fault`. L'éditeur et le chargeur en font un lien structurel `ApplyTo` vers l'entrée `fault_N` du modèle visé, et non un canal de données.

## Éditables

Aucun. Le déplacement est entièrement déterminé par la cible et par la scène, ce qui est délibéré : une sévérité réglable ferait de l'affaissement un paramètre libre alors qu'il est une conséquence calculable de la masse, de la raideur et de la gravité.

## Observables

| Champ           | Sens                                           |
| --------------- | ---------------------------------------------- |
| `eccentricityY` | Déplacement radial contribué, axe Y du corps, en mètres |
| `eccentricityZ` | Déplacement radial contribué, axe Z du corps, en mètres |
