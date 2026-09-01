# Turbine Payload

`Physics.Mechanical.Load:turbine`

Charge aérodynamique tournante entraînée par un moteur, **et** composeur de défauts. Ce nœud a deux rôles, et c'est le second qui structure les montages de l'étude gravitationnelle.

## Physique

Un ventilateur ou un épurateur centrifuge présente une charge aérodynamique qui croît comme le carré de la vitesse, la loi des ventilateurs :

```
tau_aero = fanCoefficient * omega^2
```

## Le rôle de composeur

C'est ici que vivent les défauts de machine tournante. Les opérateurs de balourd et d'excentricité s'appliquent à **la turbine**, sur sa propre banque `fault_N`, et non directement au moteur.

Chaque défaut lit alors la masse et la géométrie **de la turbine**, plus la gravité de la scène. Ce nœud est conscient de la scène, donc le contexte de gravité qu'il transmet aux opérateurs est bien celui de la turbine. La turbine accumule leurs effets, y ajoute sa charge aérodynamique et le poids de sa charge utile, puis **transmet la somme composée** au moteur comme un unique opérateur de défaut, par son propre `applyTo`.

```
balourd      ─┐
excentricite ─┼─► [ turbine : masse + geometrie + gravite de scene ] ─► moteur.fault_0
scene (g)    ─┘        loi des ventilateurs + poids de la charge
```

## Pourquoi la gravité se lit ici

Deux mécanismes, tous deux proportionnels à la gravité et à l'orientation, donc nuls en microgravité et maximaux pour un arbre horizontal :

- **Le pendule du balourd.** Sur une turbine chargée, le centre de gravité décalé produit une ondulation de couple à 1x dans le **courant**, sans concurrent centrifuge dans le canal de couple. Voir `../fault/rotor-imbalance.md`.
- **Le poids de la charge utile**, qui est une charge statique sur les paliers.

C'est ce qui fait de la turbine l'endroit naturel où la gravité entre dans les signatures, plutôt que le moteur seul.

## Entrées et sorties

- **Sorties** : `applyTo`, de type `fault`, à câbler vers l'entrée `fault_N` du moteur. Le couple composé y transite.

## Éditables

| Champ                     | Sens                                                                    |
| ------------------------- | ----------------------------------------------------------------------- |
| `payloadMass`             | Masse de la charge utile entraînée, en kilogrammes                       |
| `unbalanceRadius`         | Rayon du décalage du centre de gravité, en mètres                        |
| `comPhase`                | Azimut du centre de gravité dans le repère rotor                          |
| `fanCoefficient`          | Coefficient de la loi des ventilateurs, couple par vitesse au carré       |
| `airGap`                  | Entrefer vu par les opérateurs d'excentricité appliqués à la turbine      |
| `bearingRadialStiffness`  | Raideur radiale des paliers, utilisée par l'affaissement                  |
| `includePayloadWeight`    | Inclut ou non le poids statique de la charge utile                       |
