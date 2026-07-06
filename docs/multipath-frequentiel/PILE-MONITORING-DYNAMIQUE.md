# La pile de monitoring dynamique (signal → embedding → position + trajectoire)

*Note d'architecture, pour ne pas reperdre le fil. Thèse unique, à chaque étage :*
**l'information est dans la dynamique, pas dans l'instantané.** Le même pari modal
tient du signal brut jusqu'à la fusion.

## Le schéma

```
        SIGNAL PHYSIQUE   (courant, vibration, ...)
               │   dynamique DU SIGNAL
               ▼
   ┌──────────────────────────────────────────────┐
   │  BANC DE RESONATEURS MODAL  (pôles par régime) │   étage SIGNAL
   │  LRU complexe diagonal  =  banc de biquads      │   val_lru.py / mcu_resonator.c
   │  λ_k = ρ_k · e^{iθ_k},  |λ| < 1  (stable)       │   FAIT · 88% MCSA réel · µW
   └──────────────────────────────────────────────┘
               │   embedding  z ∈ R^E
               ▼
   ┌────────────────────────┐    ┌──────────────────────────────┐
   │  POSITION              │    │  TRAJECTOIRE / MOUVEMENT      │
   │  ML.Cluster:online     │    │  MotionWatchNode              │
   │  OU est z              │    │  COMMENT z bouge              │
   │                        │    │                              │
   │  NEW_REGIME (open-set) │    │  REGIME_JUMP   z=|Δ|/s > seuil│
   │  REGIME_DRIFT (ancre + │    │  REGIME_FREEZE  chemin → 0    │
   │   escalier, usure lente)│   │  localisé PAR COMPOSANTE      │
   │  FAIT                  │    │  FAIT                         │
   └────────────────────────┘    └──────────────────────────────┘
               │                              │
               └──────────►  Alert Bus  ◄──────┘   (Logic.Event:alert-bus)
                               │
                               ▼
                   FRONTIERE (pas encore fait) :
             MODELE APPRIS DE LA TRAJECTOIRE  —  Koopman/SSM sur z(t)
             le substrat modal remonté à l'étage FUSION
             (jalon 6 : « champ latent ondulatoire »)
```

## Étage par étage

| Étage | Quoi | Code | Détecte | Statut |
|---|---|---|---|---|
| **Signal** | banc de résonateurs (pôles = fréquences de faute, fixés **par régime**) | `etapeD-mcsa/val_lru.py`, `mcu_resonator.c` | la sévérité modale dans la trajectoire du signal | ✅ FAIT (88% réel, bit-exact en C, µW) |
| **Position** | où l'embedding se situe (clustering ouvert) | `plugins/ml/.../cluster/online-cluster.node.ts` (`ML.Cluster:online`) | **NEW_REGIME** (nouveau point de fonctionnement), **REGIME_DRIFT** (dérive lente = usure, ancre + escalier) | ✅ FAIT |
| **Trajectoire** | comment l'embedding bouge (statistiques de pas) | `plugins/ml/.../detect/motion.node.ts` (`MotionWatchNode`) | **REGIME_JUMP** (pas anormal `\|Δ\|/s`), **REGIME_FREEZE** (chemin qui s'effondre), **par composante** | ✅ FAIT |
| **Fusion apprise** | modèle de la **dynamique** de la trajectoire | — | l'évolution du champ d'embedding elle-même | ⏳ FRONTIÈRE (jalon 6) |

## Position vs Mouvement (la complémentarité, écrite dans le code)

`motion.node.ts` la pose noir sur blanc : le clusterer détecte par **position** (distance
cosinus aux centroïdes : les changements francs créent des profils, la dérive lente grimpe
l'escalier d'ancre) ; MotionWatch détecte par **mouvement** (les ruptures de dynamique qui
**laissent la position continue**) et **localise** la faute à une composante. **« Run both
for full coverage. »** Ce ne sont pas deux options, ce sont deux axes orthogonaux :

- une faute peut **déplacer** l'embedding (nouveau régime, dérive) → vue POSITION ;
- une faute peut **changer sa façon de bouger** sans le déplacer (un mode qui se fige = FREEZE,
  une excitation brutale = JUMP) → vue TRAJECTOIRE.

## Le régime comme variable de conditionnement (réponse au « drifting »)

Deux dérives, deux réponses :
1. **Changement de régime** (RPM/charge) → les fréquences de faute bougent, mais *prédictiblement*
   (elles s'échelonnent avec la vitesse d'arbre connue). ⇒ les pôles du banc ne sont pas fixes
   *globalement*, ils sont fixes **par régime** ; on retune le banc quand le régime change. Le régime
   est fourni par le scheduler RS-385 (chaîne de segments `Load:torque`) et **tracké** par le clusterer.
2. **Usure lente** (la signature s'éloigne de la baseline *dans* un régime) → l'ancre + escalier
   (`REGIME_DRIFT`) et le gel/saut (`REGIME_FREEZE`/`REGIME_JUMP`).

**Fréquences fixes et non-stationnarité ne s'opposent pas une fois les modes conditionnés au régime.**

## La frontière (ce qui remonterait le substrat modal à l'étage fusion)

Ce qui est construit = des **détecteurs** de trajectoire (jump/freeze, drift/regime), heuristiques
(statistiques de pas, distance cosinus). Ce qui manque = un **modèle appris de la trajectoire** de
l'embedding : un opérateur de **Koopman/SSM sur `z(t)`**, c'est-à-dire l'idée modale (dynamique
diagonale complexe) portée du niveau *signal* au niveau *fusion*. C'est le **jalon 6** (« champ
latent ondulatoire ») : au lieu de détecter des anomalies de chemin, **modéliser la dynamique du
chemin**. C'est le seul étage encore ouvert, et c'est exactement là que le banc de résonateurs
trouverait son analogue au niveau de l'embedding fusionné.

## Références

- Substrat modal : [`h3/mux/MODAL-SCALING.md`](h3/mux/MODAL-SCALING.md), [`etapeD-mcsa/RESULTS-MODAL-TEMPORAL.md`](etapeD-mcsa/RESULTS-MODAL-TEMPORAL.md).
- Déploiement : [`PLAN-DEPLOIEMENT-MCU.md`](PLAN-DEPLOIEMENT-MCU.md).
- Position : `packages/dev/plugins/ml/src/cluster/online-cluster.node.ts` ; test `packages/tests/motorwatch/motorwatch.drift.test.ts`.
- Trajectoire : `packages/dev/plugins/ml/src/detect/motion.node.ts` ; tests `packages/tests/ml/motion-watch.test.ts`, `motion-vs-cluster.test.ts`.
- Régimes : scheduler RS-385, `packages/tests/motorwatch/rs385-regimes-graph.test.ts`.
