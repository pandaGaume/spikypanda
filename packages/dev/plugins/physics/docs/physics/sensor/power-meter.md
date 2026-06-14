# Power / Energy Meter

`Physics.Electric.Sensor:power`

Wattmètre / compteur d'énergie triphasé. Un vrai capteur de courant est rarement seul : associé aux prises de tension, il devient un analyseur de puissance. Ce noeud prend les trois tensions ET courants de phase (et, en option, les grandeurs dq) et en dérive l'ensemble des indicateurs électriques.

## Voie abc (le wattmètre général)

```
p(t) = v_a*i_a + v_b*i_b + v_c*i_c          puissance active instantanée
P    = <p>                                  puissance active [W]   (moyennée, LPF 1er ordre à averagingHz)
Vrms = sqrt(moyenne_k <v_k^2>),  Irms = sqrt(moyenne_k <i_k^2>)
S    = 3 * Vrms * Irms                      puissance apparente [VA]
Q    = sqrt(max(0, S^2 - P^2))              puissance réactive [var] (magnitude)
PF   = P / S                                facteur de puissance
E_active   += p * dt                        énergie active   [J]
E_reactive += Q * dt                        énergie réactive [var.s]
```

## Voie dq (propre, instantanée, pour un drive PMSM)

Câbler `v_d`/`v_q`/`i_d`/`i_q` :

```
P_dq = 1.5 * (v_d*i_d + v_q*i_q)            puissance active [W]
Q_dq = 1.5 * (v_q*i_d - v_d*i_q)            puissance réactive [var], SIGNÉE
```

## Entrées / sorties

- **Entrées** : `v_a/v_b/v_c`, `i_a/i_b/i_c` (voie abc) ; `v_d/v_q/i_d/i_q` (voie dq, optionnelle) ; `dt` (optionnelle).
- **Sorties** : `P`, `Q`, `S`, `power_factor`, `E_active`, `E_reactive`, `P_dq`, `Q_dq`.

## Éditables

| Champ         | Défaut | Sens                                                                    |
| ------------- | ------ | ----------------------------------------------------------------------- |
| `averagingHz` | 5 Hz   | coupure du filtre de moyennage (0 = bypass, P = p instantanée). À garder bien EN DESSOUS du fondamental électrique pour rejeter l'ondulation 2x de la puissance instantanée. |

## Câblage PMSM

`Inverter V_a/b/c` + `Machine i_a/b/c` -> entrées abc du power meter ; pour la voie dq, câbler les `v_d/v_q` (Park des tensions) et `i_d/i_q` de la machine. Sorties P/Q/S/PF vers des plots ou la chaîne de supervision.

## Physique vérifiée

Validée (`packages/tests/physics/power-meter.test.ts`, analytique) : sous sinusoïdes triphasées équilibrées d'amplitudes V, I déphasées de phi, `S = 1.5 V I`, `P = S cos(phi)`, `Q = S |sin(phi)|`, `PF = cos(phi)` (testé à phi = 0, 60, 90 deg) ; l'énergie active s'accumule au rythme de la puissance active ; la voie dq égale les formules instantanées au bit près.

## Pièges

- La réactive abc `Q` est une **magnitude** (le signe est indéfini à partir de S et P seuls) ; utiliser `Q_dq` quand le signe du flux réactif compte.
- Garder `averagingHz` au-dessus de 0 mais bien sous le fondamental : trop haut, la mesure garde l'ondulation 2x ; trop bas, elle répond lentement aux changements de régime.
