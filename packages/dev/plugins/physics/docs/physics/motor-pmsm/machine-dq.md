# PMSM Machine (dq)

`Physics.Electric.Motor.PMSM:machine`

Machine synchrone à aimants permanents dans le repère synchrone rotor (dq). Port fidèle du legacy `sensors/PmsmMachine`, l'oracle de validation, avec une numérique identique : Euler implicite sur le système électrique 2x2, mécanique implicite, theta trapézoïdal, même cap de sous-pas.

## `dq` vs `abc` : deux formulations du MÊME moteur

Il existe deux nœuds PMSM ([`:machine`](machine-dq.md) ici, et [`:dynamic`](../motor-bldc/pmsm-dynamic.md)). **Ce n'est pas deux moteurs différents : c'est le même moteur regardé de deux points de vue.**

- **`:dynamic` (abc)** regarde les **3 vrais fils** du moteur (phases a, b, c). Les courants sont **3 sinusoïdes** qui oscillent : la réalité physique brute, ce que verrait un oscilloscope sur les câbles.
- **`:machine` (dq)** se place dans un repère **qui tourne avec le rotor**. Là, les 3 sinusoïdes deviennent **2 valeurs presque constantes** (`d` et `q`).

> Analogie du manège : **abc** = tu regardes depuis le sol, les chevaux tournent sans arrêt (3 signaux qui oscillent) ; **dq** = tu montes sur le manège, les chevaux paraissent immobiles (2 valeurs stables). Même réalité, mais assis dessus c'est bien plus facile à piloter : tu règles 2 boutons stables (`q` = le couple, `d` = l'aimantation) au lieu de viser 3 cibles mouvantes. C'est pour ça que la commande FOC travaille en dq.

| | `:dynamic` (abc) | `:machine` (dq) |
| --- | --- | --- |
| Vue | les 3 phases réelles (sinus) | repère tournant (2 valeurs ~stables) |
| Calcul | Euler **explicite**, simple/léger | Euler **implicite**, robuste/précis |
| Type de moteur | uniforme (aimants en surface) | gère la saillance (Ld≠Lq, couple de réluctance) |
| Conçu pour | un brushless simple et autonome (pendant sinusoïdal du BLDC) | l'entraînement FOC + l'étude gravité/MCSA |
| Couplage gravité | non | oui (sag rotor -> bande latérale MCSA) |
| Validé oracle | non | oui (au bit près) |

**Lequel prendre** : juste un PMSM qui tourne quand on lui met 3 tensions -> `:dynamic`. Commande FOC, modèle validé/précis, ou étude gravité -> `:machine`. En une phrase : **abc = la vue physique simple ; dq = la vue « pilote », robuste et contrôlable.**

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

**Couplage mécanique vers électrique (la raison d'être MCSA)** : une perturbation qui module le flux d'entrefer à l'angle rotor (affaissement, excentricité) remonte par le terme de FEM `omega_e*lambda_m_eff` dans V_q : **les courants dq et de phase portent le sideband à 1x f_mech**. C'est ainsi qu'un défaut mécanique devient lisible dans le signal ÉLECTRIQUE. Les défauts côté charge (balourd) emploient la cible `tau` (ou l'entrée `tau_load`), produisant un ripple sur i_q. Sans faute câblée ni gravité, la machine est saine (`1 + 0 = 1`).

## Couplage gravitaire intrinsèque (internalisé, pas un noeud à poser)

La machine est un objet monde : elle connaît sa propre pose (`world`) et lit la gravité de **sa Scene liée**. Quand `gravityCoupling` est actif ET qu'une Scene est liée, elle calcule **elle-même** son affaissement rotor (le poids du rotor fléchit l'arbre, module l'entrefer) et replie le delta de flux résultant dans `lambda_m_eff` :

```
g_body = R^T * g_world                         (R = part rotation de `world`)
delta  = rotorMass * g_radial / bearingRadialStiffness
sag    = (delta / airGap) * cos(theta_m - g_angle)
lambda_m_eff = lambda_m * (1 + sag + somme des fautes flux)
```

C'est la signature gravité -> MCSA, **automatique** : pose le moteur dans une Scene, il réagit ; bascule Earth -> Orbital et le sideband disparaît. Le couplage est conditionné à une Scene **liée**, pas au fallback Earth par noeud, donc la validation headless du drive sans Scene reste sans gravité (bit-exact avec l'oracle).

**Source de la Scene (priorité)** : `override par-noeud (port config-link \`scene\`) > Scene de la session (Sim.Graph englobant ou Scene racine) > fallback Earth`. Câbler une `Physics.Scene:scene` sur le port `scene` du moteur fait lire à CE moteur CETTE scène : deux moteurs sur le même canvas peuvent vivre dans des scènes différentes (Earth vs Lune côte à côte) sans envelopper chacun dans un Sim.Graph.

Les noeuds autonomes [`Physics.Environment.Gravity:rotor-sag`](../environment-gravity/rotor-sag.md) / [`bearing-preload`](../environment-gravity/bearing-preload.md) restent pour la **composition explicite** (décompo C, autres types de machines, power-users) : mets alors `gravityCoupling = false` pour éviter le double comptage, puis câble-les sur la banque `fault_N`. [`mounting-compliance`](../environment-gravity/mounting-compliance.md) reste externe (c'est l'installation, pas la machine).

## Entrées / sorties

- **Entrées** : `local`, `parent_world` (matrix44, pose objet monde), `scene` (config-link : override scène par-nœud, voir ci-dessous), `fault_0..n` (banque variadique : cibles `flux`, `tau`), `V_a`, `V_b`, `V_c` (V, ligne-neutre), `tau_load` (N.m), `dt` (optionnelle).
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
| `gravityCoupling`       | true                                 | active le couplage gravitaire interne |
| `rotorMass`             | 0.0076 kg                            | masse rotor (affaissement + précharge) |
| `bearingRadialStiffness`| 1e5 N/m                              | raideur radiale palier              |
| `airGap`                | 5e-4 m                               | entrefer (epsilon = delta/airGap)   |
| `nominalAxialPreload`   | 5 N                                  | précharge axiale d'assemblage       |
| `nominalRadialPreload`  | 0 N                                  | précharge radiale d'assemblage      |
| `umpRadialStiffness`    | 4000 N/m                             | raideur UMP : la vibration que le moteur émet (0 = aucune) |

Le moteur **émet sa propre vibration** : la force UMP rotor-sag `F = umpRadialStiffness * delta_sag` sort sur `force_y` / `force_z` (plan radial corps, 1× f_mech), à câbler vers un housing qui résonne. La gravité (et donc la vibration) vient de la Scene liée ; pas de nœud GravityVector.

Observables (viewables) : `gravity_flux_delta` (le sag replié ce tick), `g_radial` (gravité radiale corps), `force_y` / `force_z` (vibration UMP émise), `F_axial_eff` / `F_radial_eff` (précharges palier augmentées de la gravité).

## Physique vérifiée

Validée (`packages/tests/physics/pmsm-machine-dq.test.ts`) en deux étages :

- **Physique sur l'oracle legacy** : couple T_e = 1.5*p*lambda_m\*i_q en SPM ; montée en vitesse sous tension ; régime établi cohérent.
- **Noeud == oracle** : à V_abc, tau_load, faute flux et dt identiques, i_d/i_q/omega/i_abc égalent le legacy `PmsmMachine` au bit près (la faute flux `env-1` donne `lambda_m*(1+(env-1)) = lambda_m*env`, identique à l'`addFluxEnvelope(env)` legacy).
- **Couplage MCSA (l'objectif)** : sous une faute flux modulée, i_q acquiert une composante AC nulle quand la faute = 0 et croissant avec l'amplitude. La signature mécanique apparaît bien dans le courant.
- **Couplage gravitaire intrinsèque** (`packages/tests/physics/pmsm-gravity-coupling.test.ts`) : sous Earth, `gravity_flux_delta` égale l'epsilon analytique du legacy RotorSagModel ; sous Orbital (microgravité) il s'annule ; `gravityCoupling = false` ou Scene non liée le neutralise ; la précharge radiale palier reprend la charge gravitaire.

## Pièges

- Décomposition C : ce noeud est la machine seule. La commande (FOC), la modulation (SVPWM) et l'inverter sont des noeuds séparés ; les modèles env gravitaires et les défauts alimentent la **banque de fautes** (cible `flux`) ou `tau_load`.
- Composition multiplicative vs additive : la banque somme les fautes flux (`1 + somme`), alors que le legacy multipliait les enveloppes. Pour de petites profondeurs (epsilon << 1) les deux coïncident ; pour plusieurs sources flux fortes, l'écart additif/produit est attendu.
- En boucle ouverte (V_abc constants), le rejet de perturbation du FOC est absent : la signature de couplage est maximale. En boucle fermée FOC, la boucle de courant rejette partiellement le sideband (visible surtout en vibration sur petit PMSM, cf. l'étude gravitationnelle).
- Phase 2 : per-phase R/L (court-circuit inter-spires D3) demandera une intégration en repère abc ; non couvert ici.
