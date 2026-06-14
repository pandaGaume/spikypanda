# Current Sensor

`Physics.Electric.Sensor:current` (alias : `Physics.Electric.Motor.DC:currentSensor`)

Transducteur de courant générique, indépendant du moteur (Hall / shunt : LEM HX, ACS712, Allegro). Mesure **n'importe quelle ligne de courant** : courant d'alimentation d'un drive DC, ou courant de phase stator d'un PMSM (`i_a`/`i_b`/`i_c`), ou courant repère rotor (`i_d`/`i_q`) lus directement sur les sorties de la machine.

Ce noeud était auparavant rangé sous `Physics.Electric.Motor.DC` ; il est désormais générique. L'ancien typeId `Physics.Electric.Motor.DC:currentSensor` reste enregistré comme **alias** (mêmes physique et ports) pour que les graphes sauvegardés résolvent toujours.

## Modèle

Trois imperfections que toute analyse MCSA doit gérer :

```
filtered = LPF(i, bandwidthHz)            # passe-bas 1er ordre (0 = bypass idéal)
noisy    = filtered + N(0, noiseStd)      # bruit thermique + EMI (graine déterministe)
measured = quantize(noisy, resolution)    # pas ADC (0 = désactivé)
```

## Entrées / sorties

- **Entrée** : `i` (courant vrai ; signal-kind ZOH, accepte la sortie signal d'un moteur DC IIntegrable comme la sortie stream par tick d'une machine PMSM).
- **Sortie** : `i_measured` (courant mesuré).

## Éditables

| Champ         | Défaut    | Sens                                                    |
| ------------- | --------- | ------------------------------------------------------- |
| `bandwidthHz` | 100000 Hz | bande passante du LPF (0 = bypass, ampèremètre idéal)   |
| `noiseStd`    | 0.01 A    | écart-type du bruit gaussien                            |
| `resolution`  | 0.005 A   | pas de quantification ADC (0 = désactivé)               |
| `seed`        | 1         | graine du générateur de bruit (runs reproductibles)     |

## Câblage PMSM

`machine i_a` (ou `i_b`/`i_c`, `i_d`/`i_q`) -> `current sensor i` -> `i_measured` vers le DSP (buffer/fenêtre/FFT) pour la MCSA. Garder `bandwidthHz` bien au-dessus de la fréquence PWM (5x mini) : sinon le capteur filtre justement les bandes latérales qui portent la signature de défaut.

## Physique vérifiée

Validée (`packages/tests/physics/pmsm-sensing.test.ts`) : en bypass idéal (`bandwidthHz=0`, `noiseStd=0`, `resolution=0`), `i_measured` égale le courant de phase `i_a` de la machine PMSM (la sortie stream alimente l'entrée signal de façon transparente) ; sous quantification, `i_measured` est un multiple de `resolution` à moins d'un pas du vrai courant.

## Pièges

- Le typeId canonique est `Physics.Electric.Sensor:current` ; `Physics.Electric.Motor.DC:currentSensor` est l'alias historique (même classe). Préférer le canonique dans les nouveaux graphes.
