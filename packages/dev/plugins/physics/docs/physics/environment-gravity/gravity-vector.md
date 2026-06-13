# Gravity Vector (repère corps)

`Physics.Environment.Gravity:vector`

Vecteur de gravité projeté dans le repère corps du moteur. Port fidèle de la projection legacy `sensors` GravityField + MotorTransform + GravityVector, mais **bâti sur l'infra existante du plugin, sans rien réinventer** :

- **La gravité vient de la Scene.** Ce noeud `extends TransformNode` et lit `getScene(session).gravity` (la gravité monde que la `Sim.Graph` / le `SceneItem` englobant diffuse). Aucun éditable de gravité dupliqué.
- **L'orientation vient du Transform.** Le moteur est un objet monde : on câble son `local` / `parent_world` pour que la matrice `world` de ce noeud soit la pose corps -> monde. La gravité est projetée dans le repère corps avec la partie rotation de cette matrice (`g_body = R^T · g_world`). Aucun éditable d'Euler dupliqué.

C'est le **seul** endroit où se fait la transformation monde -> corps ; les consommateurs (rotor-sag, bearing-preload, mounting-compliance) lisent les sorties corps d'ici.

## Repère corps (convention legacy)

X = axe de l'arbre rotor ; Y, Z = plan radial du rotor ; `theta_m = 0` le long de +Y.

## Entrées / sorties

- **Entrées** : `local`, `parent_world` (matrix44, hérités de TransformNode ; câbler la pose du moteur depuis une chaîne Scene/Transform).
- **Sorties** :
  - `world` (matrix44, hérité : pose corps -> monde).
  - `g_x`, `g_y`, `g_z` : composantes corps signées. `g_x` est la composante axiale signée.
  - `g_radial = sqrt(g_y^2 + g_z^2)` : composante perpendiculaire à l'arbre, le moteur du rotor sag.
  - `g_axial = |g_x|` : magnitude le long de l'arbre.
  - `g_angle = atan2(g_z, g_y)` : azimut de la gravité dans le plan YZ (la direction du sag).

## Éditables

Aucun. La gravité vient de la Scene, l'orientation du Transform. Pour changer le régime gravitaire (microgravité, lune, mars), régler la gravité de la `Scene` ; pour changer la pose (horizontal, vertical), régler le `local` du moteur.

## Physique vérifiée

Validée (`packages/tests/physics/gravity-coupling.test.ts`) : avec une gravité monde fixée sur un `SceneItem` (`session.sceneStateView`) et une matrice `local` d'orientation, `g_body`, `g_radial`, `g_axial`, `g_angle` égalent le legacy `GravityVector` (projection Concordia monde->corps) au bit près (1e-9) sur plusieurs orientations (horizontal, vertical haut/bas, Euler arbitraire).

## Câblage

`g_radial` + `g_angle` -> [`rotor-sag`](rotor-sag.md) ; `g_x` (axial signé) + `g_radial` -> [`bearing-preload`](bearing-preload.md) ; `g_x/g_y/g_z` -> [`mounting-compliance`](mounting-compliance.md). Microgravité : mettre la gravité de la Scene à 0 (toutes les signatures gravitaires s'annulent).
