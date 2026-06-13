# PMSM FOC Controller

`Physics.Electric.Motor.PMSM:foc`

Commande vectorielle (field-oriented control) de la machine PMSM. Port fidèle du legacy `sensors/FocController`, l'oracle de validation. Trois boucles PI imbriquées qui asservissent la vitesse en pilotant les tensions du repère rotor.

## Boucles

```
PI vitesse : omega -> speed_target,  sortie i_q_ref (bornée +/- iMax)
PI id      : i_d -> id_ref (défaut 0, SPM), sortie v_d_ref
PI iq      : i_q -> i_q_ref,          sortie v_q_ref
```

Chaque PI est un Euler explicite avec anti-windup par back-calculation (gain ki/kp). Le vecteur de référence (v_d, v_q) est **saturé conjointement** dans le plan alpha-beta au rayon `v_bus / sqrt(3)`, puis projeté dans le repère stator par Park inverse à l'angle électrique `theta_e = P * theta_m`.

## Entrées / sorties

- **Entrées** : `i_d`, `i_q`, `omega`, `theta_m` (retour machine), `speed_target` (la consigne pilotable, par exemple depuis un `Viz.Control:knob`), `iq_ref` (consigne de couple directe, utilisée seulement en mode couple), `v_bus` (optionnelle, rayon de saturation), `dt` (optionnelle).
- **Sorties** : `V_alpha`, `V_beta` (références stator, pour un SVPWM + inverter en aval) ; `V_a`, `V_b`, `V_c` (tensions de phase ligne-neutre, Clarke inverse des refs alpha-beta : un drive de tension IDÉAL qui alimente directement la machine PMSM tant que SVPWM et l'inverter ne sont pas câblés).

## Éditables

| Champ                     | Défaut (ECX PRIME) | Sens                                              |
| ------------------------- | ------------------ | ------------------------------------------------- |
| `speedKp` / `speedKi`     | 0.0111 / 4.87e-5   | gains boucle vitesse                              |
| `currentKp` / `currentKi` | 0.104 / 3173       | gains boucles courant (id et iq)                  |
| `iMax`                    | 5 A                | borne sur i_q_ref                                 |
| `vMaxPerAxis`             | 12 V               | saturation par axe des PI courant                 |
| `vBus`                    | 24 V               | bus DC pour le rayon de saturation jointe         |
| `idRef`                   | 0 A                | référence d-axe (négatif = défluxage)             |
| `P`                       | 2                  | paires de pôles (doit égaler celle de la machine) |
| `torqueMode`              | false              | true = mode couple (voir ci-dessous)              |

Les gains par défaut suivent un réglage classique : boucle courant ~1 kHz, boucle vitesse ~100 Hz. Pour une machine donnée, `currentKp = omega_bw_I * L`, `currentKi = omega_bw_I * R`, `speedKp = omega_bw_W * J / kt`, `speedKi = omega_bw_W * b / kt` avec `kt = 1.5 * P * lambda_m`.

## Mode vitesse et mode couple

Deux modes de commande, sélectionnés par l'éditable `torqueMode` :

- **Mode vitesse** (`torqueMode = false`, défaut) : la boucle PI vitesse asservit `omega` vers `speed_target` et produit `i_q_ref`. C'est le schéma à trois boucles imbriquées.
- **Mode couple** (`torqueMode = true`) : la boucle vitesse est **court-circuitée** ; la consigne de la boucle q devient directement l'entrée `iq_ref` (bornée `+/- iMax`). Comme `T_e ~ i_q`, c'est une commande de couple directe : le chemin « Desired Torque » du schéma bloc canonique. L'intégrateur vitesse est maintenu à zéro pour éviter tout windup pendant le court-circuit.

En mode couple, câbler par exemple un `Viz.Control:knob` sur `iq_ref` donne un manche de couple en direct ; `speed_target` et `omega` sont ignorés. Repasser `torqueMode` à false réactive l'asservissement de vitesse.

## Câblage en boucle fermée

`speed_target` (consigne) -> FOC ; FOC `V_a/V_b/V_c` -> machine `V_a/V_b/V_c` ; machine `i_d/i_q/omega/theta_m` -> FOC (retour). La boucle de retour DOIT passer par un `Control.Feedback:channel` (Z^-1) pour casser le cycle : câbler le retour machine->FOC en direct sature les slots de capacité 1 du scheduler. C'est le même mécanisme que la boucle omega->charge des graphes motorwatch. Le retard d'un tick ainsi introduit est l'échantillonnage discret standard de la commande. La consigne `speed_target` est typiquement pilotée par un bouton `Viz.Control:knob` posé comme tuile de dashboard.

## Physique vérifiée

Validée (`packages/tests/physics/pmsm-foc.test.ts`) :

- **Noeud == oracle** : à retour, consigne, v_bus et dt identiques, V_alpha/V_beta égalent le legacy `FocController.references()` au bit près.
- **Boucle fermée** : FOC + machine PMSM câblés en boucle, `omega` converge vers `speed_target`.
- **Saturations** : i_q_ref reste borné +/- iMax ; sous forte erreur, le vecteur (v_d, v_q) reste sous v_bus/sqrt(3) et le drapeau `saturated_voltage` se lève.

## Pièges

- `P` du FOC doit égaler `P` de la machine (deux paramètres distincts dans le graphe) ; sinon l'angle électrique est faux et le couple chute.
- En boucle fermée sur petit PMSM, la boucle courant rejette fortement les perturbations 1x f_mech : la signature gravitaire (excentricité, sag) devient faible dans le courant et reste surtout visible en vibration (cf. l'étude gravitationnelle). C'est attendu, pas un bug.
- Les sorties `V_a/V_b/V_c` sont un drive idéal (Clarke inverse, sans PWM ni bus borné), pratique pour valider la boucle sans onduleur. Pour le réalisme onduleur, câbler plutôt `V_alpha/V_beta` -> [`SVPWM`](svpwm.md) -> [`Inverter`](inverter.md) -> machine. Le retour courant fidèle au schéma canonique passe par les noeuds [`Clarke` et `Park`](clarke-park.md).
