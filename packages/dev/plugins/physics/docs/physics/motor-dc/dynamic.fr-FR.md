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
| `L`  | H | 1e-4 à 1e-2 | Inductance d'armature. Donne la constante de temps électrique `tau_e = L/R`. Pilote `computeRequiredHz()`. |
| `Kt` | Nm/A | 0,005 à 0,05 | Constante de couple. |
| `Ke` | V·s/rad | identique à `Kt` | Constante de force contre-électromotrice. En unités SI, `Ke == Kt` pour une machine idéale. |
| `J`  | kg·m² | 1e-7 à 1e-4 | Inertie du rotor. Donne la constante de temps mécanique `tau_m = J/b`. |
| `b`  | Nm·s/rad | 1e-6 à 1e-3 | Coefficient de frottement visqueux. |
| `i0` | A | 0 | Courant d'armature initial au reset. |
| `omega0` | rad/s | 0 | Vitesse angulaire initiale au reset. |
| `required_hz` | Hz | (calculé) | Taux d'échantillonnage requis ; voir [Taux d'échantillonnage](#taux-déchantillonnage). Par défaut auto-dérivé de `L / R` et `J / b` ; l'utilisateur peut épingler une valeur manuelle via le panneau de propriétés. |

Un preset prêt à l'emploi pour le **Mabuchi RS-385PH-15125** (un moteur brushé 6 VDC courant) est livré sous `presets/dc-motor-rs385ph-15125.json` et peut être déposé directement sur le panneau de propriétés.

## Taux d'échantillonnage

Le moteur est `IHasSampleRateRequirement` (boilerplate qui calque `IntegrableRuntimeNode` ; on ne peut pas étendre la base directement à cause de la chaîne FaultableNode → TransformNode). `computeRequiredHz()` dérive le taux recommandé de la constante de temps dominante :

```
tau_e = L / R                                  (pôle électrique, rapide)
tau_m = J / b                                  (pôle mécanique, lent)
required_hz = clamp(10 / min(tau_e, tau_m), 60, 1e6)
```

10 échantillons par e-fold maintient l'intégrateur stable. Exemples :

| Configuration              | tau_e   | required_hz |
|----------------------------|---------|-------------|
| L=1mH  R=1Ω (défaut)       | 1 ms    | 10 kHz      |
| L=10mH R=1Ω                | 10 ms   | 1 kHz       |
| L=1mH  R=0,1Ω              | 10 ms   | 1 kHz       |

Quand l'utilisateur édite `R / L / J / b`, le panneau de propriétés rafraîchit `required_hz` automatiquement, SAUF si l'utilisateur a épinglé une valeur manuelle via l'éditable. Épingler signifie : saisir une valeur positive dans `required_hz` la verrouille ; saisir 0 / négatif / vide la désépingle et fait revenir au calculé. Le viewable `required_hz_user_defined` indique l'état d'épinglage.

Le `SimGraphNode` englobant agrège `requiredHz` sur l'ensemble des feuilles `IHasSampleRateRequirement` et expose `max(feuilles)` (planché à `MIN_EFFECTIVE_HZ = 60 Hz`) comme `effectiveHz` de la session interne, qui pilote le ratio de sous-pas K = inner / parent.

## Chaîne MCSA

La chaîne typique de simulation de signature de défaut est :

```
Slider (omega_ref) -> SpeedPI -> CurrentPI -> Inverter -> DcMotorDynamic -> CurrentSensor -> Buffer -> Window -> FFT -> Spectrum
                                                              |
                                                              +-- nœuds de défaut Roulement / Arbre / Engrenage (cible tau)
```

Déposer le marqueur `Control.Sim:rk4-solver` n'importe où dans le graphe (c'est un décorateur sans état) pour donner un solveur fonctionnel à tous les nœuds `IIntegrable`.

## Pièges

- **Taux d'échantillonnage épinglé trop bas.** Épingler `required_hz` à une valeur inférieure au minimum calculé affame l'intégrateur. Le runner tourne au taux épinglé ; le résultat : pics de courant, oscillations d'omega, ou boucle de retry du solveur saturée. Désépingler (entrer 0) pour revenir au défaut sûr.
- **Taux d'échantillonnage (PWM amont).** L'inverseur PWM commute à `f_pwm` (5 kHz typique). Le runner doit aussi ticker à `>= 20 · f_pwm` pour que la porteuse survive à l'échantillonnage ; le `required_hz` propre du moteur ne tient PAS compte de la porteuse de l'inverseur, seulement de son pôle électrique. Avec un inverseur câblé en amont, vérifier que `effectiveHz` du Sim.Graph englobant atteint au moins `20 · f_pwm` (l'inverseur contribue son propre `requiredHz` à l'agrégation).
- **L trop petit.** `L = 0` rend l'équation de courant singulière. L'implémentation borne avec `max(L, 1e-12)` pour éviter les NaN, mais la dynamique dégénère. Utiliser une valeur réelle de datasheet.
- **Comportement au reset.** Stopper le player appelle `reset()`, ce qui restaure `(i, omega) = (i0, omega0)` et recalcule `tau_em = Kt·i0`. Les viewables de l'état live se mettent immédiatement à jour avec ces valeurs.
- **`required_hz` épinglé survit aux changements de paramètres.** Quand l'utilisateur a épinglé `required_hz` puis édite `L / R`, la valeur affichée reste épinglée ; le `computeRequiredHz()` sous-jacent se met à jour silencieusement. Désépingler pour suivre à nouveau les changements de paramètres.
