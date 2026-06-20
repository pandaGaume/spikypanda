# Imbalance Fault (D1)

`Physics.Mechanical.Fault:imbalance`

Balourd rotor (la signature D1). Port fidèle du legacy `sensors/ImbalanceFault`, l'oracle de validation.

## Physique

Une masse rotor décentrée produit une force centripète qui tourne avec l'arbre, injectée sur les deux axes radiaux du housing en quadrature :

```
m*r     = severity * kImbalanceMax        (kg.m, le produit de balourd)
F       = m*r * omega^2                    (magnitude de la force centripète)
force_y = F * cos(theta_m)
force_z = F * sin(theta_m)                 (l'axe arbre x ne voit aucune force)
```

Câbler `force_y` / `force_z` sur le noeud [Housing Mechanics](../housing/mechanics.md) : la force tournante à 1x f_mech est la signature dominante du balourd sur les voies de vibration, et son amplitude croît en `omega^2`.

## Relation avec `Physics.Mechanical.Shaft:unbalance`

`Shaft:unbalance` est un modulateur de signal 1x générique à amplitude constante (à poser sur n'importe quelle ligne de signal). Cette faute-ci est le **modèle mécanique physique** : une force housing centripète dont l'amplitude suit `m*r*omega^2`. Les deux décrivent le même défaut racine (balourd) ; choisir le modèle physique ici quand on veut la dépendance en `omega^2` et l'injection housing.

## Entrées / sorties

- **Entrées** : `omega` (vitesse), `theta_m` (angle rotor), depuis la machine.
- **Sorties** : `force_y`, `force_z` (force centripète -> Housing Mechanics).

## Éditables

| Champ           | Défaut    | Sens                                    |
| --------------- | --------- | --------------------------------------- |
| `severity`      | 0         | sévérité dans [0, 1] (bornée)           |
| `kImbalanceMax` | 5e-6 kg.m | produit m\*r à sévérité 1 (5 mg @ 1 mm) |

## Physique vérifiée

Validée (`packages/tests/physics/pmsm-faults.test.ts`) : `force_y/z` égalent le `postStep` legacy au bit près (1e-15) ; magnitude = `m*r*omega^2` ; mise à l'échelle en `omega^2` (2x omega -> 4x force).

## Pièges

- Phase 1 injecte seulement la force housing (pas de couplage côté courant) ; un couplage Phase 2 modulerait en plus `tau` / `flux` à 1x f_mech.
- `force_y/z` et toute autre source de force radiale ciblent les mêmes axes du housing : les sommer avant l'entrée housing, qui n'a qu'un port force par axe.
