# 3-Phase Inverter (averaged)

`Physics.Electric.Motor.PMSM:inverter`

Onduleur de tension triphasé, en valeur moyenne. Port fidèle du legacy `sensors/ThreePhaseInverter`, l'oracle de validation. Il transforme les rapports cycliques `(duty_a, duty_b, duty_c)` du SVPWM en tensions de phase ligne-neutre qui alimentent la machine PMSM.

## Modèle

```
v_a = (2*duty_a -   duty_b -   duty_c) * v_bus / 3
v_b = ( -duty_a + 2*duty_b -   duty_c) * v_bus / 3
v_c = ( -duty_a -   duty_b + 2*duty_c) * v_bus / 3
```

C'est la moyenne sur une période PWM d'un onduleur 2-niveaux piloté en PWM complémentaire sans temps mort, référencée au neutre étoile : on retranche la tension de mode commun `(v_a + v_b + v_c) / 3` des tensions phase-vers-bus-négatif `duty_k * v_bus`. Toute séquence nulle injectée en amont par le SVPWM s'annule donc ici.

## Entrées / sorties

- **Entrées** : `duty_a`, `duty_b`, `duty_c` (rapports cycliques depuis le SVPWM), `v_bus` (optionnelle, surcharge le bus DC).
- **Sorties** : `V_a`, `V_b`, `V_c` (tensions de phase ligne-neutre, vers la machine PMSM).

Sans rapports câblés, l'onduleur reste au point centré `0.5` (tensions nulles), pour un démarrage propre.

## Éditables

| Champ  | Défaut | Sens                                                    |
| ------ | ------ | ------------------------------------------------------- |
| `vBus` | 24 V   | bus DC par défaut si l'entrée `v_bus` n'est pas câblée  |

## Modèle Phase 1

Commutateurs idéaux, pas de découpage, pas de temps mort, pas de résistance à l'état passant. C'est le bon niveau de détail pour la validation FOC en boucle fermée et l'analyse spectrale MCSA. Une variante à découpage (temps mort, résistance, diode de roue libre) viendra derrière les mêmes ports, sans changement en aval.

## Physique vérifiée

Validée (`packages/tests/physics/pmsm-modulation.test.ts`) :

- **Noeud == oracle** : à rapports et `v_bus` identiques, les tensions de phase égalent le legacy `ThreePhaseInverter.phaseVoltages()` au bit près (1e-12).
- **Invariant de chaîne** : `Clarke(Inverter(SVPWM(V_alpha, V_beta)))` redonne `(V_alpha, V_beta)` dans la plage linéaire (1e-9).

## Pièges

- `v_bus` doit être cohérent avec le SVPWM en amont : câbler la même source `v_bus` sur les deux noeuds, sinon le rayon de saturation et l'échelle de tension divergent.
- Les tensions sont ligne-neutre (référencées au neutre étoile), comme attendu par l'entrée `V_a/V_b/V_c` de la machine PMSM.
