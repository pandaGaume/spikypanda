# Moteur CC (Dynamique)

`Physics.Electric.Motor.DC:dynamic`

Moteur à courant continu à excitation séparée, avec dynamique électrique et mécanique couplée. L'état est intégré par le solveur attaché à la session (déposer un marqueur `Control.Sim:rk4-solver` dans le graphe pour activer l'intégration ; sans solveur l'état reste figé sur les conditions initiales).

## Équations

Le moteur s'expose comme un `IIntegrable` dont le second membre est

```
di/dt    = (V - R·i - Ke·omega) / L
domega/dt = (Kt·i - b·omega - (tau_load + tau_fault)) / J
```

où `tau_fault` est la somme de toutes les entrées ciblant `tau` sur la banque de défauts héritée (tout `Physics.Mechanical.*` câblé sur l'entrée variadique du moteur).

## Ports

| Direction | Slot | Type | Kind | Notes |
|-----------|------|------|------|-------|
| in | `V` | float | signal | Tension d'armature. Sémantique ZOH : le solveur lit la dernière valeur publiée à chaque évaluation du second membre. |
| in | `tau_load` | float | signal | Couple de charge externe. Même sémantique ZOH. |
| in | `fault_*` | fault | variadic | Hérité de FaultableNode. Les défauts avec `target = "tau"` sont sommés dans le couple effectif. |
| in | `local`, `parent_world` | matrix44 | signal | Hérité de TransformNode pour le placement dans le scene graph. |
| out | `i` | float | signal | Courant d'armature en fin de pas \[A\]. |
| out | `omega` | float | signal | Vitesse angulaire en fin de pas \[rad/s\]. |
| out | `tau_em` | float | signal | Couple électromagnétique (Kt·i) \[Nm\]. |
| out | `world` | matrix44 | signal | Hérité de TransformNode. |

## Paramètres

| Nom | Unité | Typique | Signification |
|------|------|---------|---------|
| `R`  | Ω | 0,1 à 5 | Résistance d'armature. |
| `L`  | H | 1e-4 à 1e-2 | Inductance d'armature. Donne la constante de temps électrique `tau_e = L/R`. Le solveur doit tourner à >= 10/tau_e pour rester stable. |
| `Kt` | Nm/A | 0,005 à 0,05 | Constante de couple. |
| `Ke` | V·s/rad | identique à `Kt` | Constante de force contre-électromotrice. En unités SI, `Ke == Kt` pour une machine idéale. |
| `J`  | kg·m² | 1e-7 à 1e-4 | Inertie du rotor. |
| `b`  | Nm·s/rad | 1e-6 à 1e-3 | Coefficient de frottement visqueux. |
| `i0` | A | 0 | Courant d'armature initial au reset. |
| `omega0` | rad/s | 0 | Vitesse angulaire initiale au reset. |

Un preset prêt à l'emploi pour le **Mabuchi RS-385PH-15125** (un moteur brushé 6 VDC courant) est livré sous `presets/dc-motor-rs385ph-15125.json` et peut être déposé directement sur le panneau de propriétés.

## Chaîne MCSA

La chaîne typique de simulation de signature de défaut est :

```
Slider (omega_ref) -> SpeedPI -> CurrentPI -> Inverter -> DcMotorDynamic -> CurrentSensor -> Buffer -> Window -> FFT -> Spectrum
                                                              |
                                                              +-- nœuds de défaut Roulement / Arbre / Engrenage (cible tau)
```

Déposer le marqueur `Control.Sim:rk4-solver` n'importe où dans le graphe (c'est un décorateur sans état) pour donner un solveur fonctionnel à tous les nœuds `IIntegrable`.

## Pièges

- **Mauvais taux d'échantillonnage.** L'inverseur PWM commute à `f_pwm` (5 kHz typique). Le runner doit ticker à `>= 20 · f_pwm` sinon la porteuse et ses bandes latérales se chevauchent. Surveiller l'état live dans le PropertyEditor : si `i` reste plat alors que `V` oscille, le taux est trop bas.
- **L trop petit.** `L = 0` rend l'équation de courant singulière. L'implémentation borne avec `max(L, 1e-12)` pour éviter les NaN, mais la dynamique dégénère. Utiliser une valeur réelle de datasheet.
- **Comportement au reset.** Stopper le player appelle `reset()`, ce qui restaure `(i, omega) = (i0, omega0)` et recalcule `tau_em = Kt·i0`. Les viewables de l'état live se mettent immédiatement à jour avec ces valeurs.
