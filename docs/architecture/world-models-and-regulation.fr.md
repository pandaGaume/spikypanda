# La dynamique n'est pas un world model : ce qu'on a appris en construisant un contrôleur CO2

## En une phrase

Un modèle dynamique prédit. Un world model décide. La différence, c'est la
fonction de coût, et sans coût explicite on ne dépasse pas le contrôle par seuil.

## L'observation expérimentale

Nous avons construit un contrôleur Model Predictive Control pour la gestion
du CO2 dans un habitat clos (voir `packages/host/www/samples/co2-mpc/`).
Le dispositif :

- Un modèle dynamique neuronal de 401 paramètres prédit l'évolution du CO2
  à une minute, étant donné le CO2 courant, l'activité de l'équipage, et
  l'état du scrubber.
- Un ShootingSelectorNode échantillonne K séquences d'actions candidates,
  déroule chacune via le modèle dynamique sur un horizon de 30 à 60 minutes,
  et retient la première action de la séquence de plus faible coût.
- Un modèle de scrubber à trois presets (oversized, normal, degraded)
  permet de tester différentes conditions matérielles.

Au départ, le MPC se comportait **exactement comme un contrôleur à seuil** :
il ne faisait rien jusqu'à ce que le CO2 approche 3500 ppm, puis commandait
le scrubber à pleine puissance. Changer le preset matériel de "oversized"
à "degraded" changeait la consommation d'énergie, mais la politique de
décision restait identique. Le MPC ne régulait pas. Il réagissait.

## Pourquoi

La fonction de coût ressemblait à ceci :

```
coût(trajectoire, actions) =
    1000 × (CO2 au-dessus de 3500)²     # pénalité dure
  + 1e6 × (CO2 au-dessus de 4000)        # sécurité
  + poids_énergie × Σ puissance(action)   # énergie
```

Le problème : pour tout état où le CO2 est en dessous de 3500 ppm, le coût
de la trajectoire est dominé par **zéro**. Toute simulation qui reste sous
3500 renvoie le même coût CO2 (zéro) peu importe où elle se situe. Face au
choix entre "CO2 reste à 1800" (coût énergie 0) et "CO2 reste à 3400"
(coût énergie 0), le MPC est indifférent sur l'axe CO2 et choisit celle
avec le moins d'énergie. C'est toujours "ne rien faire tant qu'il n'y a
pas de problème".

C'est mathématiquement identique à un contrôleur à seuil. Toute la
machinerie MPC (rollouts, candidats, dynamique neuronale) n'apporte rien
parce qu'il n'y a aucun gradient à suivre.

## Le correctif

On a remplacé la pénalité binaire par un gradient à trois zones :

```
[0, comfort]        : aucun coût
[comfort, soft]     : rampe linéaire, poids faible
[soft, vital]       : rampe quadratique, poids 100x plus grand
au-dessus de vital  : catastrophique
```

Avec `comfort = 2000 ppm`, `soft = 3500 ppm`, `vital = 4000 ppm`, la
fonction de coût a maintenant un gradient non nul à tout niveau de CO2
réaliste. Le MPC a une direction à suivre à chaque état : ramener le
CO2 vers la zone de confort quand l'énergie est bon marché, tolérer une
dérive jusqu'au seuil soft quand l'énergie est chère, ne jamais franchir
le seuil vital.

Le comportement a complètement changé. Le MPC maintient désormais le
scrubber à un niveau bas ou moyen en continu pendant l'activité de
l'équipage, gardant le CO2 proche de la cible confort. Le contrôleur
réactif par seuil oscille toujours entre 2500 et 3700 ppm avec des
impulsions à pleine puissance. Énergie totale et pic de CO2 baissent
tous les deux avec le MPC. L'IA gagne enfin son salaire.

## Généralisation : la dynamique ne suffit pas

Un world model a trois composants, tous nécessaires :

| Composant | Rôle | Ce qu'on avait | Ce qui manquait |
|---|---|---|---|
| **Dynamique** | f(état, action) → état_suivant | MLP neuronal (401 params) | — |
| **Coût / valeur** | c(trajectoire) → scalaire de préférence | Plat sous le seuil soft | Gradient partout |
| **Planificateur** | argmin du coût sur les actions | Random shooting | — |

Sans fonction de coût explicite, le modèle dynamique est un **simulateur**.
Il prédit ce qui va se passer. Il ne juge pas. Un simulateur répond à la
question "et si ?" mais pas à "que devrais-je faire ?"

Le world model émerge quand on attache des préférences à la dynamique. Les
préférences indiquent au simulateur quels futurs sont meilleurs. Alors
seulement le déroulement de séquences d'actions alternatives produit une
décision. Sans préférences, tous les rollouts sont équivalents et le
système dégénère vers la règle que l'échantillonneur privilégie par défaut
(typiquement : énergie minimale, équivalent à un seuil).

## Lien avec les factor graphs et STAG

C'est exactement le point développé par Frank Dellaert dans *Factor Graphs
and World Models* (gtsam.org, 2026). Un factor graph est un world model
à base d'énergie parce qu'il encode simultanément :

- **Facteurs de transition** : la dynamique (comment un état mène au suivant)
- **Facteurs unaires** : les préférences (quels états sont bons, lesquels sont mauvais)

Sense-Think-Act with Graphs (STAG) utilise le même factor graph pour la
perception (past graph : lisser la trajectoire récente à partir des
mesures) et la planification (future graph : optimiser les actions à
venir en fonction des objectifs). Les deux partagent la dynamique. La
différence tient aux facteurs actifs : facteurs de mesure pour le passé,
facteurs d'objectif pour le futur.

Notre contrôleur CO2 est une instance exécutable de cette idée. Le
modèle dynamique est le facteur de transition. Le coût zonal est le
facteur d'objectif. Le ShootingSelectorNode est le minimiseur d'énergie.
Retire l'objectif et l'ensemble reste mathématiquement valide mais
opérationnellement inutile.

## Guide pratique

| Situation | Bon choix |
|---|---|
| Objectif unique (rester sous X), matériel bien dimensionné | **Seuil ou hystérésis**. Simple, pas cher, quasi-optimal. Le MPC coûte sans rien apporter. |
| Objectif unique, matériel marginal ou défaillant | **MPC avec coût zonal**. L'anticipation du lag compte, le gradient guide un contrôle lissé. |
| Objectifs multiples concurrents (sécurité + confort + énergie + usure + longévité) | **MPC avec coût multi-termes**. Seule une fonction de coût explicite peut arbitrer entre objectifs. Un seuil n'a aucun mécanisme de compromis. |
| Perturbations imprévisibles (équipage variable, capteurs défaillants) | **MPC à horizon glissant**. Replanifier à chaque pas absorbe l'incertitude. |

## La phrase à retenir

> **La dynamique sans coût, c'est de la prédiction. La dynamique avec coût, c'est un world model. Seul un world model permet de réguler au lieu de réagir.**

Ce n'est pas propre à SpikyPanda. Ça s'applique à tout système de
contrôle. Mais c'est particulièrement pertinent pour l'IA embarquée :
un réseau de neurones qui prédit le monde n'est utile que couplé à une
fonction de coût qui exprime ce que tu veux. Embarque les deux, ou
n'embarque rien.
