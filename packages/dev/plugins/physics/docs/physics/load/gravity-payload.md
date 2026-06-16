# Gravity Payload Load

`Physics.Mechanical.Load:gravity-payload`

Charge gravitaire : une masse `m` au bout d'un bras de manivelle de rayon `r` (phase `phi0` dans le plan radial rotor) qui **tourne avec le rotor**. C'est un **objet monde scene-aware** : câble son `parent_world` depuis le MÊME transform que celui qui place le moteur (placement d'assemblage partagé), et lie la **Scene** sur son port `scene`. Il lit la gravité monde de la Scene et la projette dans le repère corps avec son propre `world` (`g_body = R^T * g_world`), **sans nœud GravityVector**. Le poids projeté réagit en trois composantes :

```
tau_load     = m * g_radial * r * sin((theta_m + phi0) - g_angle)
force_axial  = m * g_axial      (poussée constante le long de l'arbre)
force_radial = m * g_radial     (poids radial sur le palier)
```

## Le couple est un ripple 1× f_mech (la signature)

D'amplitude `m * g_radial * r` : le moteur soulève puis est aidé par la charge à chaque tour. Sa moyenne est nulle (manivelle équilibrée sur un tour), c'est donc une **signature pure**, pas un frein net. L'amplitude scale avec :

- **la GRAVITÉ** : `m * g_radial` → 0 en microgravité (la charge perd littéralement son poids) → contraste ON/OFF net.
- **l'ORIENTATION** : `g_radial` est la composante de gravité perpendiculaire à l'arbre, donc arbre horizontal = ripple max, arbre vertical = zéro (la gravité devient poussée purement axiale). Le yaw / l'inclinaison du moteur le module directement.

## Pourquoi c'est la charge de l'étude gravitaire

Sur un petit PMSM moderne, la perturbation de sag rotor est trop faible pour survivre au rejet du FOC dans i_q (cf. l'étude, §4.2 « charge importante »). Un ripple de couple de payload est bien plus gros et le FOC doit le combattre à chaque révolution : c'est le **mécanisme dominant qui rend la signature gravitaire LISIBLE dans le canal ÉLECTRIQUE (i_q)**, en complément du canal vibration (rotor-sag / UMP → housing → accel).

## Entrées / sorties

- **Entrées** : `local` / `parent_world` (matrix44, placement de l'assemblage), `scene` (la Scene référente), `theta_m` (angle rotor, depuis la machine).
- **Sorties** : `world` (matrix44), `tau_load` (→ `tau_load` de la machine), `force_axial`, `force_radial` (→ palier / housing).

## Éditables

| Champ | Défaut | Sens |
| --- | --- | --- |
| `payloadMass` | 0.05 kg | masse de la charge |
| `armRadius` | 0.01 m | rayon du bras de manivelle |
| `armPhase` | 0 rad | décalage angulaire de la manivelle dans le plan corps |

Observables : `tau_load`, `force_axial`, `force_radial`, `tau_ripple_amplitude` (= `m * g_radial * r`, la magnitude de signature ; 0 en microgravité ou arbre vertical).

## Pièges

- Objet monde scene-aware : il lit la gravité de la **Scene** (port `scene` ou contexte session) et la projette via son propre `world`. Pas de nœud GravityVector ; gravité nulle si aucune Scene liée (le nœud est alors inerte).
- Le couple est SIGNÉ et de moyenne nulle : ne pas le confondre avec un couple de freinage net (profil `:torque` constant pour ça).
- Distinct du **balourd** (`Physics.Mechanical.Fault:imbalance`, force `m*r*omega^2` centripète indépendante de g) : la charge gravitaire dépend de g et s'annule en microgravité, le balourd non.
