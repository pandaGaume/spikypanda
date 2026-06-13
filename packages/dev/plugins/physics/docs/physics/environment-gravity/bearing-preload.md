# Bearing Preload (gravité)

`Physics.Environment.Gravity:bearing-preload`

Précharge de palier modulée par la gravité. Port fidèle du legacy `sensors/BearingPreloadModel`, l'oracle de validation.

## Physique

La précharge nominale posée à l'assemblage est augmentée de la charge gravitationnelle projetée sur les axes du palier :

```
F_axial_eff  = F_a_0 + m_rotor * g_axial    (axial, le long de l'arbre / X corps)
F_radial_eff = F_r_0 + m_rotor * g_radial   (radial, plan YZ corps)
```

où `g_axial` est la composante axiale **signée** (câbler depuis la sortie `g_x` du noeud [GravityVector](gravity-vector.md)) et `g_radial` la magnitude radiale (sortie `g_radial`). L'orientation de la gravité change ainsi l'angle de contact et la distribution de charge des éléments roulants, donc la structure harmonique d'un futur défaut de bague (D2) : ce défaut lira ces précharges efficaces pour moduler ses amplitudes BPFI / BPFO. Ce noeud n'a pas de consommateur dynamique propre ; il expose les précharges au point de fonctionnement pour les défauts aval et les métadonnées de dataset.

## Entrées / sorties

- **Entrées** : `g_axial` (composante axiale signée, depuis `g_x`), `g_radial` (depuis GravityVector).
- **Sorties** : `F_axial_eff`, `F_radial_eff` (précharges efficaces, vers un futur défaut de palier ou l'export de métadonnées).

## Éditables

| Champ                  | Défaut (ECX PRIME) | Sens                          |
| ---------------------- | ------------------ | ----------------------------- |
| `rotorMass`            | 0.0076 kg          | masse du rotor                |
| `nominalAxialPreload`  | 5 N                | précharge axiale d'assemblage |
| `nominalRadialPreload` | 0 N                | précharge radiale d'assemblage|

## Physique vérifiée

Validée (`packages/tests/physics/gravity-coupling.test.ts`) : `F_axial_eff` et `F_radial_eff` égalent `BearingPreloadModel.effectiveAxialPreload` / `effectiveRadialPreload` du legacy au bit près (1e-12), sur une orientation Euler arbitraire.

## Pièges

- L'axial utilise la gravité **signée** (`g_x`), pas `|g_x|` : un arbre vers le haut et vers le bas donnent des précharges axiales opposées. Ne pas câbler `g_axial` depuis `g_axial` (magnitude) mais depuis `g_x`.
