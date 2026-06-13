# SVPWM Modulator

`Physics.Electric.Motor.PMSM:svpwm`

Modulateur Space Vector PWM, en valeur moyenne (pas d'ondulation de découpage). Port fidèle du legacy `sensors/SvpwmModulator`, l'oracle de validation. Il transforme la référence de tension stator `(V_alpha, V_beta)` produite par le FOC en trois rapports cycliques `(duty_a, duty_b, duty_c)` que l'onduleur reconvertit en tensions de phase.

## Algorithme (injection de séquence nulle min-max)

```
1. Clarke inverse : (V_alpha, V_beta) -> (v_a, v_b, v_c) refs de phase ligne-neutre
2. Saturation     : si |V_ref| > v_bus / sqrt(3), ramener le vecteur sur ce cercle
3. Séquence nulle : v_zero = -(max(v_k) + min(v_k)) / 2, ajoutée aux trois refs
4. Rapports       : duty_k = 0.5 + (v_k + v_zero) / v_bus, borné à [minDuty, maxDuty]
```

L'injection min-max recentre les rapports autour de 0.5 et étend la plage linéaire jusqu'à `v_bus / sqrt(3)` (le rayon du cercle inscrit dans l'hexagone des vecteurs). C'est l'équivalent en valeur moyenne du SVPWM 7-segments classique.

## Entrées / sorties

- **Entrées** : `V_alpha`, `V_beta` (références stator depuis le FOC), `v_bus` (optionnelle, surcharge le bus DC pour la saturation et le calcul des rapports).
- **Sorties** : `duty_a`, `duty_b`, `duty_c` (rapports cycliques, vers l'onduleur `Physics.Electric.Motor.PMSM:inverter`).

## Éditables

| Champ            | Défaut | Sens                                                          |
| ---------------- | ------ | ------------------------------------------------------------- |
| `pwmFrequencyHz` | 20000  | fréquence porteuse nominale (métadonnée ; modèle moyenné)     |
| `minDuty`        | 0      | borne basse des rapports (un driver réel impose ~0.05)        |
| `maxDuty`        | 1      | borne haute des rapports (un driver réel impose ~0.95)        |
| `vBus`           | 24 V   | bus DC par défaut si l'entrée `v_bus` n'est pas câblée        |

Le viewable `saturated` se lève quand la référence dépassait `v_bus / sqrt(3)` et a dû être ramenée (sur-modulation).

## Exemple : chaîne onduleur complète

`FOC V_alpha/V_beta` -> `SVPWM` -> `duty_a/b/c` -> `Inverter` -> `V_a/V_b/V_c` -> `PMSM Machine`. Le SVPWM et l'onduleur s'insèrent entre les références `V_alpha/V_beta` du FOC et la machine, en remplacement du drive idéal `V_a/V_b/V_c` du FOC. Voir le schéma exporté dans [clarke-park.md](clarke-park.md#exemple-chaîne-foc-canonique).

## Physique vérifiée

Validée (`packages/tests/physics/pmsm-modulation.test.ts`) :

- **Noeud == oracle** : à `(V_alpha, V_beta, v_bus)` identiques, les rapports égalent le legacy `SvpwmModulator.duties()` au bit près (1e-12).
- **Invariant de chaîne** : dans la plage linéaire, `Clarke(Inverter(SVPWM(V_alpha, V_beta)))` redonne `(V_alpha, V_beta)` à 1e-9. La séquence nulle est en mode commun et s'annule à travers la référence ligne-neutre.
- **Saturation** : au-delà de `v_bus / sqrt(3)`, le drapeau `saturated` se lève.

## Pièges

- Le modèle est moyenné : `pwmFrequencyHz` ne produit pas d'ondulation de découpage (il sert de métadonnée et préparera une variante à découpage). Pour une signature MCSA réaliste, la fréquence d'échantillonnage du graphe doit rester bien supérieure à la fréquence électrique, pas à la porteuse PWM.
- `v_bus` doit être cohérent entre le SVPWM et l'onduleur en aval (câbler la même source `v_bus` sur les deux, comme dans le test de round-trip).
