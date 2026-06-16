# PMSM (gravity-coupled)

`Physics.Electric.Motor.PMSM:gravity-coupled`

Un moteur PMSM gravité-couplé, packagé comme **nœud de graphe spécialisé**. Ce n'est pas une feuille : c'est l'**assemblage** d'un entraînement complet (commande FOC en boucle fermée avec la [machine dq](machine-dq.md), une charge gravitaire sur l'arbre, un carter résonant alimenté par la vibration UMP du moteur). Il apparaît dans la palette comme un seul nœud, mais on peut **zoomer** sur le graphe sous-jacent (lecture seule) pour inspecter l'assemblage.

## Spécialisé : l'intérieur est instancié à la construction

Comme le nœud ONNX (`spk.onnx:model`), c'est un nœud déclaré qui hérite de graphe : son intérieur est **construit à la construction** (la factory retourne un graphe déjà câblé). Conséquence pour la sérialisation : un graphe sauvegardé ne porte que le **typeId** (plus les éditables propres au nœud) ; au chargement, `registry.create(typeId)` reconstruit tout l'assemblage. Les tableaux d'intérieur ne sont pas `@cloneable`, rien ne sérialise l'assemblage nœud par nœud. C'est l'inverse d'un `Sim.Graph:graph` générique construit à la main par l'utilisateur, dont l'intérieur est persisté en `subGraphJson`.

Il étend `SimGraphNode` (pas un `RuntimeGraph` nu) pour hériter la couche simulation dont l'étude gravité a besoin :

- **héritage de Scene vivant** (`InheritedSceneStateView`) : un basculement Earth -> Orbital sur la Scene racine atteint la machine interne sans recâblage ;
- **sous-pas multi-rate** : les nœuds électriques internes annoncent un `requiredHz` élevé, le container sous-pas K fois par tick parent ;
- **placement « le graphe est un TransformNode »** : ses propres ports `local` / `world`.

## Intérieur (assemblage)

```
                     speed_target (port d'entrée)
                          |
   (Z^-1) i_d,i_q,omega,theta_m
        machine ------------------> FOC --- V_a,V_b,V_c ---> machine
            |  theta_m --> payload --(Z^-1) tau_load--> machine
            |  force_y,force_z --> housing
            +--> i_q, omega (ports de sortie)
   housing --> accel_y, accel_z (ports de sortie)
```

Les boucles fermées (FOC <-> machine, payload <-> machine) sont brisées par des canaux à retard unitaire (`withDelayedChannel`, Z^-1), pas par des nœuds Feedback : la forme boucle-fermée discrète standard.

## Placement : pas de fan-out de Transform

La machine / la charge / le carter laissent `parent_world` **non câblé** et héritent le `world` du container via la Scene héritée (un TransformNode lit `getScene().worldTransform` quand `parent_world` est libre). L'orientation qui compte pour l'étude (yaw du moteur vs gravité) entre par le port `local` du container, alimenté par un **seul** `attitude -> transform` externe. Il n'y a donc aucun Transform interne qui diffuserait une matrice vers trois ports (la node geometry Transform ne publie que sur sa première sortie).

## Entrées / sorties

- **Entrées** : `scene_in` (config-link, override de Scene optionnel), `local` (matrix44, placement + yaw du corps, natif SimGraphNode), `speed_target` (consigne de vitesse -> FOC).
- **Sorties** : `world` (matrix44, natif), `i_q` / `omega` (machine, canal électrique + vitesse), `force_y` / `force_z` (force UMP émise), `accel_y` / `accel_z` (vibration du carter, le canal vibratoire de l'étude).

La Scene est héritée de la session englobante ; aucun nœud Scene ne vit à l'intérieur, donc un entraînement headless sans Scene liée reste sans gravité (déterministe).

## Vérifié

`packages/tests/physics/gravity-coupled-container.test.ts` : embarqué dans un graphe parent et piloté par `speed_target`, le container monte en vitesse (omega -> consigne) et émet courant + vibration ; sous Earth la vibration du carter est présente, sous Orbital (microgravité) elle s'effondre, **sans recâblage** (même basculement de Scene). Les ports de frontière sont exposés dès la construction (l'intérieur n'est pas une coquille vide en attente de JSON).
