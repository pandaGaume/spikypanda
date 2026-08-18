# ADR-001: SNN natif de Session et liens persistants typés

- Statut: accepté
- Date: 2026-08-18
- Portée: Spiky Panda, Phase 1 du simulateur de graphe neuromorphique physique

## Contexte

Le runtime actif de Spiky Panda est fondé sur `RuntimeGraph`, `RuntimeNode`, `Channel`, `Session` et `Scheduler`. Le module `neuralnetwork/snn` existant est un POC autonome. Il propage directement les spikes dans un ancien `IGraph` et ne participe ni à l'ordonnancement, ni aux buffers, ni aux délais de `Session`.

L'éditeur sait reconstruire les nœuds grâce à `NodeRegistry` et à la forme persistée `{ id, typeId, data }`. Les connexions ne conservent actuellement que leurs extrémités. Lors du passage en mode Play ou de la matérialisation d'un sous-graphe, elles sont donc remplacées par un `Channel` générique ou un `ApplyTo`. Le type concret du lien et ses propriétés, notamment le poids et le délai d'une synapse, sont perdus.

Le runtime C++ appartient au projet connexe Cyan Mycelium. Il est hors périmètre de cette phase.

## Décision

### 1. Un seul runtime pour le nouveau SNN

Les nouvelles primitives SNN s'exécutent directement dans le runtime existant:

- un neurone est un `RuntimeNode`;
- son état dynamique est stocké dans l'état de `Session`, pas dans une boucle SNN parallèle;
- un spike est un token horodaté transporté par les files de `Session`;
- une synapse est un `Channel` spécialisé avec poids et délai en ticks;
- l'ordre d'exécution et la promotion des événements différés restent sous la responsabilité de `Scheduler` et `Session`.

Le POC `SNNRuntime` est conservé comme référence historique. Il n'est ni étendu, ni supprimé pendant cette tranche.

### 2. La persistance d'un lien reflète celle d'un nœud

Le modèle sauvegardé d'un lien adopte la forme suivante:

```json
{
  "id": "source:spike->target:spike",
  "typeId": "SNN:spike-synapse",
  "data": {
    "weight": 0.75,
    "delay": 2
  },
  "from": { "node": "source", "port": "spike" },
  "to": { "node": "target", "port": "spike" }
}
```

Un `LinkRegistry` symétrique à `NodeRegistry` crée les liens à partir de `typeId`. Le chargement désérialise `data` sur l'instance créée. Le builder de session et le matérialiseur de sous-graphe créent ensuite une instance d'exécution fraîche, restaurent son état persistant, affectent les slots et raccordent ses extrémités.

Les connexions d'éditeur conservent une définition de lien non raccordée. Ainsi, la topologie temporaire d'une session ne modifie pas la topologie de conception et peut être détruite sans perdre la définition persistée.

### 3. Compatibilité limitée et explicite

La correction architecturale prime sur une compatibilité coûteuse. Le format de sauvegarde passe à une nouvelle version. Une lecture simple des anciennes connexions sans `typeId` peut utiliser un lien générique quand cela reste local et peu coûteux. Aucun système complexe de migration n'est exigé.

### 4. Frontière Core

Le Core n'est modifié que pour fournir les contrats réutilisables nécessaires:

- registre de liens;
- création de liens typés dans les graphes runtime;
- primitives SNN exécutables par `Session`;
- corrections ciblées révélées par ces évolutions.

Les doublons, anciens builders et branches conceptuelles divergentes restent en place. Leur convergence sera traitée séparément.

### 5. Chemin d'inférence portable sur MCU

La représentation éditable et le moteur d'inférence ont des responsabilités distinctes. Les registres, `typeId`, décorateurs, schémas de propriétés et composants d'interface interviennent lors de la construction ou du chargement du graphe. Ils ne participent pas à `Session.run`.

Le chemin chaud SNN doit rester compatible avec une implémentation embarquée légère:

- résolution des types avant l'exécution;
- topologie matérialisée sans recherche globale par spike;
- état dynamique borné et local à la session;
- files de capacité explicite et délais entiers déterministes;
- aucune dépendance envers NodeEditor dans les primitives SNN;
- allocations par événement mesurées, puis supprimées du chemin MCU lorsque la frontière embarquée sera implémentée;
- benchmarks séparés pour mémoire, débit d'événements et profondeur maximale des files.

Le simulateur TypeScript reste la référence fonctionnelle de Phase 1. Cette décision ne lance pas le portage Cyan Mycelium, qui demeure hors périmètre, mais interdit une conception qui rendrait ce portage inutilement lourd.

## Modèle temporel initial

La première tranche utilise deux temps déjà présents dans `Session`:

- `t`, temps continu fourni à `Session.run(t)`, pour la fuite membranaire et les horodatages physiques;
- `tickIndex`, compteur entier d'appels à `run`, pour les délais synaptiques déterministes.

Une synapse de délai `N` publie un événement avec une échéance à `tickIndex + N`. Un délai nul conserve la propagation dans le cycle de dispatch courant. La définition d'une politique sub-tick plus fine est différée jusqu'à ce qu'un cas physique la rende nécessaire.

## Conséquences

Avantages:

- les graphes SNN profitent du scheduler, des buffers, du mode Play et de la sérialisation existants;
- poids, délai, activation et futurs paramètres de plasticité survivent à un round-trip;
- le même document alimente l'éditeur, la session racine et les sous-graphes;
- les tests de déterminisme portent sur le runtime réellement utilisé.

Coûts:

- l'éditeur doit connaître un registre de liens en plus du registre de nœuds;
- les chemins de construction racine et sous-graphe doivent partager la même logique de matérialisation;
- les anciennes sauvegardes de connexions ne peuvent pas retrouver un type concret qu'elles n'ont jamais enregistré.

## Hors périmètre

- runtime C++ et intégration Cyan Mycelium;
- suppression ou refonte du POC `SNNRuntime`;
- consolidation générale des branches de graphe historiques;
- STDP complet, apprentissage et accélération GPU;
- solveur hybride continu avec événements sub-tick.
