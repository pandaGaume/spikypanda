# PMSM Machine (dq)

`Physics.Electric.Motor.PMSM:machine`

Machine synchrone à aimants permanents dans le repère synchrone rotor (dq). Port fidèle du legacy `sensors/PmsmMachine`, l'oracle de validation, avec une numérique identique : Euler implicite sur le système électrique 2x2, mécanique implicite, theta trapézoïdal, même cap de sous-pas.

## Équations

État : i_d, i_q, omega_m, theta_m. Saillance via L_d != L_q.

```
V_d = R*i_d + L_d*di_d/dt - omega_e*L_q*i_q
V_q = R*i_q + L_q*di_q/dt + omega_e*L_d*i_d + omega_e*lambda_m_eff
T_e = (3/2)*p*(lambda_m_eff*i_q + (L_d - L_q)*i_d*i_q)
J*domega_m/dt + B*omega_m = T_e - tau_load
dtheta_m/dt = omega_m
```

avec `omega_e = p*omega_m`, `theta_e = p*theta_m`. Les tensions V_a/V_b/V_c (ligne-neutre) sont projetées en V_d/V_q par Clarke amplitude-invariant + Park à l'angle pré-pas.

## Objet monde + banque de fautes (comme les autres moteurs)

Comme les moteurs DC / BLDC, ce noeud `extends FaultableNode` (-> `TransformNode`) : il porte les ports de transform `local` / `parent_world` + une sortie `world`, lit la gravité environnementale depuis la **Scene** (`getScene()`), et accepte les perturbations sur la banque variadique `fault_N`. Deux cibles de faute pilotent l'étude gravité / MCSA :

```
"flux" : modulation multiplicative du flux aimant.
         lambda_m_eff = lambda_m * (1 + somme des fautes flux)
"tau"  : perturbation additive de couple de charge [N.m]
```

**Couplage mécanique vers électrique (la raison d'être MCSA)** : une perturbation qui module le flux d'entrefer à l'angle rotor (affaissement, excentricité) émet `{target:"flux", value: epsilon*cos(theta_m - theta_grav)}` depuis un noeud [`Physics.Environment.Gravity:rotor-sag`](../environment-gravity/rotor-sag.md) câblé sur un `fault_N`. Elle remonte par le terme de FEM `omega_e*lambda_m_eff` dans V_q : **les courants dq et de phase portent le sideband à 1x f_mech**. C'est ainsi qu'un défaut mécanique devient lisible dans le signal ÉLECTRIQUE. Les défauts côté charge (balourd) emploient la cible `tau` (ou l'entrée `tau_load`), produisant un ripple sur i_q. Sans faute câblée, la machine est saine (`1 + 0 = 1`).

## Entrées / sorties

- **Entrées** : `local`, `parent_world` (matrix44, pose objet monde), `fault_0..n` (banque variadique : cibles `flux`, `tau`), `V_a`, `V_b`, `V_c` (V, ligne-neutre), `tau_load` (N.m), `dt` (optionnelle).
- **Sorties** : `world` (matrix44), `i_d`, `i_q` (A, courants rotor), `i_a`, `i_b`, `i_c` (A, courants de phase), `omega` (rad/s), `theta_m` (rad), `tau_em` (N.m).

## Éditables

| Champ                   | Défaut (ECX PRIME)                   | Sens                                |
| ----------------------- | ------------------------------------ | ----------------------------------- |
| `R`                     | 2.0 ohm                              | résistance de phase                 |
| `Ld` / `Lq`             | 3e-4 H                               | inductances d/q (SPM : Ld = Lq)     |
| `lambdaM`               | 2e-3 Wb                              | flux des aimants                    |
| `P`                     | 1                                    | paires de pôles                     |
| `J`                     | 1e-6 kg.m^2                          | inertie rotor                       |
| `b`                     | 1e-7 N.m.s/rad                       | frottement visqueux                 |
| `id0/iq0/omega0/theta0` | 0                                    | état initial                        |
| `required_hz`           | calculée (pôle électrique + Nyquist) | cadence requise (override possible) |

## Physique vérifiée

Validée (`packages/tests/physics/pmsm-machine-dq.test.ts`) en deux étages :

- **Physique sur l'oracle legacy** : couple T_e = 1.5*p*lambda_m\*i_q en SPM ; montée en vitesse sous tension ; régime établi cohérent.
- **Noeud == oracle** : à V_abc, tau_load, faute flux et dt identiques, i_d/i_q/omega/i_abc égalent le legacy `PmsmMachine` au bit près (la faute flux `env-1` donne `lambda_m*(1+(env-1)) = lambda_m*env`, identique à l'`addFluxEnvelope(env)` legacy).
- **Couplage MCSA (l'objectif)** : sous une faute flux modulée, i_q acquiert une composante AC nulle quand la faute = 0 et croissant avec l'amplitude. La signature mécanique apparaît bien dans le courant.

## Pièges

- Décomposition C : ce noeud est la machine seule. La commande (FOC), la modulation (SVPWM) et l'inverter sont des noeuds séparés ; les modèles env gravitaires et les défauts alimentent la **banque de fautes** (cible `flux`) ou `tau_load`.
- Composition multiplicative vs additive : la banque somme les fautes flux (`1 + somme`), alors que le legacy multipliait les enveloppes. Pour de petites profondeurs (epsilon << 1) les deux coïncident ; pour plusieurs sources flux fortes, l'écart additif/produit est attendu.
- En boucle ouverte (V_abc constants), le rejet de perturbation du FOC est absent : la signature de couplage est maximale. En boucle fermée FOC, la boucle de courant rejette partiellement le sideband (visible surtout en vibration sur petit PMSM, cf. l'étude gravitationnelle).
- Phase 2 : per-phase R/L (court-circuit inter-spires D3) demandera une intégration en repère abc ; non couvert ici.
