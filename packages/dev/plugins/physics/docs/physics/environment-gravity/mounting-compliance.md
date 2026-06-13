# Mounting Compliance (gravité)

`Physics.Environment.Gravity:mounting-compliance`

Souplesse de fixation sous charge statique de gravité. Port fidèle du legacy `sensors/MountingComplianceModel`, l'oracle de validation.

## Physique

Le moteur entier (masse `m_motor`) pend d'un support flexible. La gravité exerce une charge statique sur le support, le long de la direction de gravité en repère corps :

```
force_{x,y,z} = m_motor * g_{x,y,z}
```

les composantes corps venant du noeud [GravityVector](gravity-vector.md). Câbler `force_x/force_y/force_z` sur le noeud [Housing Mechanics](../housing/mechanics.md) fait défléchir le housing sous la charge : un **transitoire initial** sur les voies de vibration quand la gravité est « appliquée » à t = 0, puis un offset statique où le ressort équilibre la gravité (l'accélération par axe retourne à zéro en régime établi). Dans un balayage d'orientations, chaque pose donne un transitoire distinct : le mécanisme « résonance de fixation » gravito-couplé de l'étude.

## Entrées / sorties

- **Entrées** : `g_x`, `g_y`, `g_z` (gravité corps, depuis GravityVector).
- **Sorties** : `force_x`, `force_y`, `force_z` (charge statique -> Housing Mechanics).

## Éditables

| Champ       | Défaut (ECX PRIME) | Sens                                |
| ----------- | ------------------ | ----------------------------------- |
| `motorMass` | 0.066 kg           | masse totale du moteur sur le support |

## Physique vérifiée

Validée (`packages/tests/physics/gravity-coupling.test.ts`) : `force_x/y/z` égalent `MountingComplianceModel.staticForce` du legacy (`m * g_body`) au bit près (1e-12).

## Pièges

- Quand plusieurs sources de force alimentent le même axe du housing (par exemple l'UMP de [rotor-sag](rotor-sag.md) + cette charge), les sommer avant l'entrée housing : le housing n'expose qu'un port force par axe.
- C'est une charge statique (modèle Phase 1) : pas d'oscillation propre injectée, seul le housing oscille en réponse. La modulation de raideur dépendante de l'orientation est une raffinement Phase 3.
