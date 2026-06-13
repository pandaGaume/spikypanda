# Eccentricity Fault (D4)

`Physics.Mechanical.Fault:eccentricity`

Excentricité statique d'entrefer (la signature D4). Port fidèle du legacy `sensors/EccentricityFault`, l'oracle de validation.

## Physique

Le rotor est décalé de l'axe magnétique d'une fraction fixe de l'entrefer ; la modulation de flux d'entrefer résultante, à l'angle rotor, est :

```
epsilon = severity * epsilonMax                  (modulation fractionnaire d'entrefer)
flux delta(theta_m) = epsilon * cos(theta_m - thetaOffset)
```

La sortie `flux` émet un descripteur `{ target: "flux", value: delta }` pour la banque de fautes de la machine PMSM (câbler `flux` -> machine `fault_N`). La machine forme `lambda_m_eff = lambda_m * (1 + somme des fautes flux)` : la variation d'enveloppe à 1x f_mech produit des bandes latérales à `f_e +/- f_mech` sur `i_d` / `i_q` après réaction du contrôleur. C'est le **même canal de couplage** que [`Physics.Environment.Gravity:rotor-sag`](../environment-gravity/rotor-sag.md) (l'affaissement gravitaire est le cousin environnemental de cette faute) ; les deux se composent additivement dans l'accumulateur de flux de la machine.

## Entrées / sorties

- **Entrées** : `theta_m` (angle rotor, depuis la machine).
- **Sorties** : `flux` (descripteur `{target:"flux", value: delta}` -> banque de fautes machine). Le viewable `flux_envelope` affiche `1 + delta`.

## Éditables

| Champ         | Défaut | Sens                                                         |
| ------------- | ------ | ------------------------------------------------------------ |
| `severity`    | 0      | sévérité dans [0, 1] (bornée)                                |
| `epsilonMax`  | 0.5    | modulation fractionnaire max à sévérité 1 (0.5 = demi-entrefer) |
| `thetaOffset` | 0 rad  | azimut de l'excentricité dans le repère rotor                |

## Physique vérifiée

Validée (`packages/tests/physics/pmsm-faults.test.ts`) : `flux_envelope` égale l'enveloppe legacy `preStep` au bit près (1e-12) sur un balayage de `theta_m` ; sévérité 0 -> aucune modulation.

## Pièges

- La cible de faute est `flux` : seul un modèle qui l'accepte (la machine PMSM via `acceptFault`) la consomme ; un moteur qui ne modélise pas la modulation de flux l'ignore.
- En boucle FOC fermée, la boucle de courant rejette partiellement la bande latérale 1x (visible surtout en vibration sur petit PMSM).
