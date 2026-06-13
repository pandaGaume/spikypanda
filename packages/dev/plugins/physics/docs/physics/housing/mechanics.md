# Housing Mechanics

`Physics.Mechanical.Housing:mechanics`

Le bracket du moteur, modélisé comme trois modes structurels 2e ordre indépendants (un par axe du corps x, y, z). Il transforme les forces (déséquilibre, charge gravitaire sur la fixation, toute excitation câblée) en l'**accélération que lit un accéléromètre**. C'est le canal vibration de l'étude de signature gravitationnelle, porté du legacy `sensors/HousingMechanics` avec une numérique identique.

## Mécanique

Par axe, un oscillateur linéaire 2e ordre invariant dans le temps :

```
m * x'' + c * x' + k * x = F_ext(t)
```

paramétré par la masse `m`, la fréquence propre `fn` (Hz) et le taux d'amortissement `zeta`, d'où :

```
k = m * (2*pi*fn)^2          c = 2 * zeta * sqrt(m * k)
```

L'intégration est un **Euler implicite** sur le couple (position, vitesse), sous-pas pour que le mode le plus rapide résolve ~20 sous-pas par période (stable à toute cadence de session) :

```
v_new = (m*v + h*F - h*k*x) / (m + h*c + h^2*k)
x_new = x + h * v_new
a_new = (F - c*v_new - k*x_new) / m       (l'accélération sondée)
```

La force de chaque axe est lue sur les entrées `force_x/y/z` et tenue constante sur les sous-pas d'un fire (sémantique de l'accumulateur de force par advance du legacy).

## Entrées / sorties

- **Entrées** : `force_x`, `force_y`, `force_z` (N, optionnelles, défaut 0), `dt` (optionnelle ; à défaut, dt = t - t précédent).
- **Sorties** : `accel_x`, `accel_y`, `accel_z` (m/s^2), l'accélération du bracket par axe.

## Éditables

| Champ         | Défaut                | Sens                                                  |
| ------------- | --------------------- | ----------------------------------------------------- |
| `massX/Y/Z`   | 0.1 kg                | masse effective du mode par axe                       |
| `fnX/Y/Z`     | 500 Hz                | fréquence propre du mode par axe                      |
| `zetaX/Y/Z`   | 0.02                  | taux d'amortissement par axe                          |
| `required_hz` | 8 x max(fn) = 4000 Hz | cadence d'échantillonnage requise (override possible) |

Le défaut (100 g, 500 Hz, 2 %) représente un petit moteur sur un bracket aluminium de banc.

## Physique vérifiée

Le noeud est validé contre la physique et contre l'implémentation legacy (`packages/tests/physics/housing-mechanics.test.ts`) :

- **Gain DC** : sous une force constante F, la position s'établit à `x_ss = F/k`, et l'accélération établie retombe à 0 (régime statique).
- **Fréquence propre et amortissement** : la réponse libre oscille à `fn` (sous-amortie pour zeta < 1) et décroît selon `zeta`.
- **Passivité / énergie** : sans force d'entrée, l'énergie mécanique ne croît jamais (l'amortissement la dissipe).
- **Équivalence legacy** : à entrées et `dt` identiques, l'accélération et la position égalent l'implémentation legacy `HousingMechanics` au bit près (même schéma implicite, même cap de sous-pas).

## Pièges

- **required_hz** ne gouverne pas la précision de l'intégration (le sous-pas interne s'en charge) mais la cadence de publication de l'accélération en sortie : trop bas, l'accel publiée est repliée. Le profil d'acquisition vise ~8x le mode du bracket.
- Les trois axes sont **indépendants** (pas de couplage inter-axes en V1). Le couplage modal gravito-modulé (mécanisme de la proposition section 1.2) est une extension ultérieure.
- Le noeud n'ajoute ni bruit ni quantification : c'est la dynamique structurelle pure. Chaîner un `Physics.Mechanical.Vibration:accelerometer` en aval pour le réalisme capteur (LPF, bruit, quantification).
