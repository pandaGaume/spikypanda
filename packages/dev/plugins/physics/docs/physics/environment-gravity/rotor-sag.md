# Rotor Sag (gravité)

`Physics.Environment.Gravity:rotor-sag`

Affaissement statique du rotor sous gravité. Port fidèle du legacy `sensors/RotorSagModel`, l'oracle de validation. C'est le canal qui rend la **signature gravitaire lisible dans le courant** (MCSA).

## Physique

Le poids du rotor défléchit l'arbre le long de la composante de gravité perpendiculaire à l'axe :

```
delta_sag  = m_rotor * g_perp / k_radial
epsilon    = delta_sag / air_gap                  (modulation fractionnaire d'entrefer)
flux delta(theta_m) = epsilon * cos(theta_m - theta_grav)
```

avec `g_perp = g_radial` et `theta_grav = g_angle` venant du noeud [GravityVector](gravity-vector.md), et `theta_m` l'angle rotor venant de la machine. La sortie `flux` émet un **descripteur de faute** `{ target: "flux", value: delta }` pour la banque de fautes de la machine (câbler `flux` -> machine `fault_N`). La machine forme `lambda_m_eff = lambda_m * (1 + somme des fautes flux)`, transformant cette excentricité statique en une **bande latérale 1x f_mech** sur `i_d` / `i_q` une fois le FOC en réaction : la signature gravitaire MCSA. Elle s'annule dans trois régimes clés de l'étude :

- microgravité (`g = 0`) : `g_perp = 0`, enveloppe = 1 ;
- arbre le long de la gravité (vertical) : `g_perp = 0`, enveloppe = 1 ;
- palier rigide (`k_radial -> infini`) : `delta_sag -> 0`.

## UMP tournant (optionnel)

Quand `umpRadialStiffness > 0`, l'interaction du champ PM tournant avec l'asymétrie d'entrefer fixe produit une force radiale de magnitude `umpRadialStiffness * delta_sag` qui tourne à f_mech, exposée sur `force_y` / `force_z` pour le housing (un pic 1x sur les voies de vibration). Nulle par défaut (compatibilité legacy).

## Entrées / sorties

- **Entrées** : `g_radial`, `g_angle` (depuis GravityVector), `theta_m` (depuis la machine).
- **Sorties** : `flux` (descripteur `{target:"flux", value: delta}` -> banque de fautes machine `fault_N`), `force_y`, `force_z` (UMP -> housing ; nulles si `umpRadialStiffness = 0`). Le viewable `flux_envelope` affiche `1 + delta` pour lecture.

## Éditables

| Champ                    | Défaut (ECX PRIME) | Sens                                            |
| ------------------------ | ------------------ | ----------------------------------------------- |
| `rotorMass`              | 0.0076 kg          | masse du rotor                                  |
| `bearingRadialStiffness` | 1e5 N/m            | raideur radiale des paliers                     |
| `airGap`                 | 5e-4 m             | entrefer magnétique nominal                     |
| `umpRadialStiffness`     | 0 N/m              | raideur UMP (0 = pas de force ; ~1e4 calibré)   |

## Physique vérifiée

Validée (`packages/tests/physics/gravity-coupling.test.ts`) : `flux_envelope` égale l'enveloppe legacy `preStep` au bit près (1e-12) sur un balayage de `theta_m` ; `force_y/z` UMP égalent le `postStep` legacy ; enveloppe = 1 en microgravité et arbre vertical.

## Pièges

- En boucle FOC fermée sur petit PMSM, la boucle courant rejette fortement la perturbation 1x : la signature reste surtout visible en **vibration** (UMP -> housing). C'est attendu (cf. l'étude gravitationnelle), pas un bug.
- `force_y/z` et les forces de [mounting-compliance](mounting-compliance.md) ciblent les mêmes axes du housing : les sommer (un noeud d'addition) avant l'entrée housing, qui n'a qu'un port force par axe.
