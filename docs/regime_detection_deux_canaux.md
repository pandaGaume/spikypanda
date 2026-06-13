# Détection de bascule de régime : deux canaux, quatre modes de panne

**Date :** 2026-06-12
**Statut :** consolidation de conception, validée par tests (voir section 7)
**Objets :** `ML.Cluster:online` (canal position, livré avec motorwatch) et `ML.Detect:motion` (canal mouvement, porté du détecteur tensegrity `regime_switch_detector.py`)

---

## 1. Objet

Deux détecteurs non supervisés de changement de régime coexistent désormais dans l'écosystème SpikyPanda :

- le **clusterer open-set** (`ML.Cluster:online`, plugin ml), développé pour motorwatch (portage industriel de DriverV2 V.2.1) : découverte de régimes par position dans l'espace d'embedding, avec ancres immuables pour la dérive lente ;
- le **détecteur de bascule** issu du banc tensegrity (`regime_switch_detector.py`, numpy seul, hors dépôt), qui surveille le **mouvement** de chaque élément dans un latent figé, et dont le portage SpikyPanda est `ML.Detect:motion`.

Ce document fixe ce que chacun voit, ce que chacun rate, pourquoi ils ne se remplacent pas, et comment ils composent. Il sert aussi de positionnement : la détection de changement de régime en espace latent est un champ mûr et encombré, et il faut dire précisément ce que l'on revendique et ce que l'on ne revendique pas.

## 2. Positionnement dans l'état de l'art

Aucune des deux briques n'est un algorithme nouveau, et il serait contre-productif de prétendre le contraire. Le vocabulaire établi correspondant :

| Notre brique | Famille établie | Références canoniques |
|---|---|---|
| Clustering open-set en ligne (assignation cosinus, création de profil au-delà d'un seuil) | Leader-follower / sequential clustering, novelty detection | Duda & Hart (leader algorithm) ; Markou & Singh 2003 (novelty detection survey) |
| Ancre immuable + escalier de dérive (REGIME_DRIFT) | Détection séquentielle de changement avec remise à zéro de la référence : CUSUM quantifié sur la distance au sain | Page 1954 (CUSUM) ; Page-Hinkley ; Basseville & Nikiforov 1993 |
| Dérive lente absorbée par l'EMA (le problème que l'ancre corrige) | Concept drift en apprentissage en flux | Gama et al. 2014 (survey) ; ADWIN, DDM |
| Surveillance du mouvement dans un sous-espace figé après warmup | Multivariate Statistical Process Control : T² de Hotelling et SPE/Q sur résidus PCA ; dynamic PCA pour la dynamique | Jackson & Mudholkar 1979 ; Ku, Storer & Georgakis 1995 ; Qin 2003 |
| Signature de **saut** (pas anormal vs pas typique de l'élément) | Change-point sur incréments ; z-score robuste (MAD) | Basseville & Nikiforov 1993 |
| Signature de **gel** (effondrement de la longueur de chemin) | Détection de capteur figé (stuck-at) en FDI | Isermann 2006 (fault diagnosis) |

Ce que l'on **revendique** n'est donc pas un algorithme, mais une composition d'ingénierie :

1. la **couverture croisée des quatre modes de panne** (section 5) par deux canaux dont chacun a un angle mort documenté et testé ;
2. la **localisation par élément sans modèle de diagnostic ni données de défaut** : chaque alarme du canal mouvement nomme le canal physique fautif, là où la littérature MSPC localise par contribution plots et où motorwatch localisait par push de modèle ONNX différentiel ;
3. la tenue des deux sous **contraintes edge** : sans étiquettes, mémoire bornée (anneaux), zéro allocation en régime établi, chemin MCU.

Le banc tensegrity reste l'argument de validation original du canal mouvement : c'est le seul cas où l'heure exacte de l'événement est connue par construction (détente de câble = changement de topologie active), donc le seul où l'on peut vérifier que le détecteur sonne au bon pas et pas à côté.

## 3. Canal 1 : position (le clusterer open-set, livré)

`ML.Cluster:online` (lib `packages/dev/plugins/ml/src/cluster/clustering.ts`). Chaque embedding est l2-normalisé puis assigné au profil le plus proche en distance cosinus :

- `d < assign_thr` (0,05) : assignation ; sous `update_thr` (0,02) le centroïde suit en EMA (`alpha` 0,15) ;
- sinon : **NEW_REGIME**, nouveau profil (k émergent, y compris k = 1) ;
- chaque profil garde une **ancre**, cliché immuable de son centroïde à la création ; quand le centroïde de suivi s'écarte de l'ancre au-delà de `drift_thr` (0,1), une alarme **REGIME_DRIFT** part et le profil se ré-ancre. Sémantique d'escalier : une dérive continue produit un train régulier d'alarmes au lieu du silence (la parade au problème de la grenouille bouillie, identifié sur le profil de charge en rampe).

Ce canal raisonne en **position**. Seule la direction sépare les régimes (un scaling pur d'amplitude est invisible ; l'encodeur doit coder le niveau dans la direction). Il compte les régimes, ce que l'autre canal ne fait pas.

## 4. Canal 2 : mouvement (le détecteur de bascule, porté)

Origine : sur le prisme tensegrity 3 barres, la **position** d'un embedding traverse la bascule de façon continue et ne marque rien ; sa **vitesse** fait une marche nette et l'élément concerné se fige dans le latent. On surveille donc le mouvement, pas la position. La dérivée seconde a été écartée : elle marque l'événement plus fort mais amplifie le bruit au point d'être inutilisable sur capteurs réels.

Portage SpikyPanda : `ML.Detect:motion` (lib `packages/dev/plugins/ml/src/detect/motion.ts`). Le nœud reçoit un vecteur ; chaque composante est un **élément** (canal physique sorti d'un mux, ou dimension latente d'un encodeur : la représentation est l'affaire de l'amont, le détecteur n'apprend pas de base). Pendant un warmup, il apprend le pas typique de chaque élément, puis **fige la référence**. Deux signatures, chacune verrouillée par front montant avec hystérésis :

- **REGIME_FREEZE** : la longueur de chemin de l'élément sur une fenêtre s'effondre sous `freeze_ratio` fois son chemin sain. Longueur de chemin et non vitesse instantanée : un signal qui oscille rebrousse, mais son chemin reste long, donc pas de faux gel.
- **REGIME_JUMP** : un pas anormalement grand par rapport au pas typique de l'élément (z robuste au-delà de `z_jump`).

Chaque alarme renvoie l'élément fautif et un score : la **localisation est dans l'alarme**, sans base de défauts.

Validation d'origine (banc tensegrity, six tirages d'un flux synthétique) : zéro faux positif, l'élément décalé et l'élément gelé pris à chaque fois, le saut attrapé instantanément, le gel après le remplissage de la fenêtre.

## 5. La matrice des quatre modes

C'est le cœur du document. Chaque canal a un angle mort que l'autre couvre :

| Mode de panne | Exemple moteur | Canal position (cluster) | Canal mouvement (motion) |
|---|---|---|---|
| **Bascule nette** (la position saute) | échelon de charge, court-circuit franc | NEW_REGIME au bon pas | REGIME_JUMP au bon pas |
| **Dérive lente** (la position marche sous le seuil de suivi) | usure progressive, rampe de charge | **REGIME_DRIFT** (escalier d'ancre) | **silence** : la référence de pas est figée mais la dérive EST le pas typique, z reste petit |
| **Gel** (la dynamique meurt, la position ne bouge pas) | capteur qui flatline, actionneur coincé, boucle saturée | **silence** : l'embedding reste dans son cluster | **REGIME_FREEZE**, avec l'élément nommé |
| **Gigue bénigne** | bruit de mesure, ondulation résiduelle | silence (EMA absorbe) | silence (sous les deux seuils) |

Deux points méritent d'être soulignés sans complaisance :

- Le canal mouvement, pris seul, **rouvre exactement l'angle mort que l'ancre a fermé** : sa base figée après warmup est assumée (« l'outil attrape une bascule, pas une dérive »). Sur l'axe dérive lente, le cluster ancré est strictement plus capable. L'un voit la marche, l'autre voit la pente.
- Le canal position, pris seul, ne voit ni le gel ni l'élément : la localisation motorwatch passait par un push de modèle ONNX différentiel depuis le central. Le canal mouvement plie détection et localisation en une passe, sans modèle.

## 6. Composition dans motorwatch

Les deux canaux se branchent sur le même bus d'alertes (`Logic.Event:alert-bus`, sévérité `warn`), avec des topics disjoints qui se routent sans ambiguïté :

```
                              ┌────────────────────┐  NEW_REGIME, REGIME_DRIFT
              ┌─ encodeur ──► │ ML.Cluster:online  │ ──────────────┐
 DAQ ─ blocs ─┤   (ONNX)     └────────────────────┘               ▼
              │                                               Alert Bus ──► device ──► central
              │  mux de canaux┌────────────────────┐               ▲
              └─ (i, ω, vib) ►│ ML.Detect:motion   │ ──────────────┘
                              └────────────────────┘  REGIME_JUMP, REGIME_FREEZE (+ élément)
```

- Le **même adaptateur mesure → table** sert les deux : une ligne par canal physique, chaque canal ramené à sa valeur saine pour rendre les échelles comparables (côté MCP/PMSM : `measure_read_amplitudes` après `sim_run` ; côté graphe : mux des sorties capteurs).
- Le canal mouvement peut consommer soit la table de canaux physiques (localisation = canal physique : un court-circuit décale le courant, il sort le canal courant ; une usure de roulement monte la vibration, il sort le canal vibration), soit l'embedding de l'encodeur (localisation = dimension latente, moins parlante). Le branchement canaux physiques est celui qui rapporte.
- La sémantique device reste celle de motorwatch : suppression cold-start pour NEW_REGIME uniquement ; REGIME_DRIFT, REGIME_JUMP et REGIME_FREEZE ne sont jamais supprimés (ils portent chacun une information qui n'a pas de baseline à attendre, le gel et la dérive commençant légitimement à k = 1).

## 7. Protocole de comparaison (falsifiable)

La matrice de la section 5 n'est pas un argument d'autorité : elle est épinglée par test. `packages/tests/ml/motion-vs-cluster.test.ts` alimente les **mêmes trajectoires synthétiques** (5 dimensions, germées) aux deux bibliothèques avec leurs défauts calibrés, et vérifie chaque cellule :

- **A. échelon net** : le cluster crée un profil ET motion sort REGIME_JUMP, au même pas ;
- **B. dérive lente** (pas par fenêtre sous `update_thr`, excursion totale au-delà de `drift_thr`) : le cluster sort au moins un événement de dérive, motion reste muet ;
- **C. gel** (la gigue d'une dimension s'arrête, position inchangée) : motion sort REGIME_FREEZE en nommant la dimension, le cluster reste k = 1 sans dérive ;
- **D. gigue bénigne** : silence des deux.

Tout changement futur de seuil ou de mécanique qui casserait la complémentarité casse ce test.

## 8. Limites et précautions (communes et propres)

- **Warmup sain requis, pour les deux.** Le cluster fait du premier régime sa baseline ; motion apprend ses pas typiques sur le warmup. L'un comme l'autre, appris sur une machine déjà cassée, n'ont plus de référence saine.
- **Topologie fixe** (motion) : le vecteur doit garder la même longueur d'un pas à l'autre ; un graphe qui ajoute ou retire des éléments en route demande une autre indexation (erreur explicite côté lib).
- **Référence figée** (motion) : une dérive très lente du nominal sur de longues séquences n'est pas suivie ; c'est le rôle de l'autre canal.
- **Délai de fenêtre** (motion) : le gel ne peut sonner qu'après le remplissage de la fenêtre post-warmup ; le saut est immédiat.
- **Direction seule** (cluster) : un scaling pur d'amplitude est invisible ; l'encodeur doit coder le niveau dans la direction.
- **Réglage** : `freeze_ratio` et `z_jump` se calent à l'œil sur de vrais signaux, pas à l'aveugle. Un harnais qui enregistre une séquence moteur, la rejoue et trace les alarmes sur la timeline est la bonne prochaine étape (non couvert ici).

## 9. Note sur le graphe PMSM (correction du brief d'origine)

Le brief d'origine attribuait `accel_x = 0` sur `motor-pmsm-baseline.spikypanda` à une arête WorldGravity non câblée. Vérification faite sur le graphe : **le lien existe et est actif** (`node_17:gravity -> node_16:gravity`, magnitude 9,81). La cause réelle est la configuration du nœud moteur lui-même : `node_16.config.gravityField = "microgravity"`. C'est un réglage de scénario, pas un câblage manquant, et il est cohérent avec le résultat connu du projet gravité (la microgravité écrase les signatures mécaniques D1/D2/D4). Pour rendre les défauts mécaniques visibles au détecteur, le levier est `gravityField: "earth"` (en place, ou via une variante de graphe dédiée), pas une réparation d'arête.

## 10. Décisions

1. Les deux canaux sont **complémentaires, pas concurrents** ; un edge complet fait tourner les deux sur le même flux et publie quatre topics disjoints sur le même bus.
2. Le canal mouvement est porté en nœud générique `ML.Detect:motion` dans plugin-ml (règle de placement : nœuds génériques en plugins), la représentation restant l'affaire de l'amont (mux ou encodeur).
3. La complémentarité est un invariant testé (section 7), pas une promesse de doc.
4. Aucune revendication de nouveauté algorithmique : le vocabulaire de la section 2 est le bon pour parler de ces briques à l'extérieur.
