# Plan d'implémentation, Phase 1 neuromorphique

- Date: 2026-08-18
- Décision de référence: `docs/architecture/adr-001-session-native-snn-and-typed-links.md`
- Revue de code: `docs/research/physical-neuromorphic-phase1-code-review.md`

## Principes d'exécution

- Construire le SNN sur `Session`, `RuntimeGraph`, `RuntimeNode` et le scheduler actifs.
- Faire évoluer le Core uniquement par des contrats génériques ou des primitives SNN nécessaires.
- Ne pas supprimer les doublons ni réconcilier les branches historiques pendant cette phase.
- Conserver le runtime C++ de Cyan Mycelium hors périmètre.
- Privilégier le déterminisme, les tests de round-trip et les petites tranches verticales.
- Garder l'inférence SNN indépendante de NodeEditor et des schémas de conception.
- Préparer un chemin MCU léger: résolution avant exécution, état borné, aucune recherche globale par spike et allocations du chemin chaud mesurées.

## Milestone 1: persistance typée des liens

### Objectif

Faire d'un lien un élément persisté et recréable au même titre qu'un nœud.

### Réutilisation

- `GraphItem.serialize()` et `GraphItem.deserialize()` pour les champs `@cloneable`.
- la forme et les conventions de `NodeRegistry`.
- `Connection.item` et `UIItemBase` pour l'inspection des propriétés.
- `RuntimeGraphBuilder`, `Channel` et `ApplyTo` pour les liens génériques existants.

### Fichiers principaux

- `packages/dev/core/src/graph/graph.registry.ts`
- `packages/dev/core/src/graph/index.ts`
- `packages/dev/nodeeditor/src/connection.ts`
- `packages/dev/nodeeditor/src/components/graph-viewer.ts`
- `packages/dev/nodeeditor/src/graph-session-builder.ts`
- `packages/dev/core/src/sim/sub-graph.materialize.ts`
- tests sous `packages/tests/nodeeditor` et `packages/tests/sim`

### Interfaces nouvelles ou étendues

- `ILinkMeta`, `LinkFactory`, `ILinkRegistry`, `LinkRegistry`.
- une définition persistée de connexion contenant `typeId` et `data`.
- un chemin de création de lien runtime à partir d'une définition non raccordée.
- une factory de liens optionnelle pour `materializeSubGraphInto`.

### Tests

- enregistrement, création et métadonnées d'un lien;
- sauvegarde d'un lien spécialisé avec ses champs;
- chargement et désérialisation du même lien;
- mode Play utilisant une nouvelle instance du bon type;
- matérialisation d'un sous-graphe conservant le type et les propriétés;
- fallback générique local pour une ancienne connexion sans `typeId`.

### Benchmark

Mesurer le coût de construction d'un graphe de 1 000 liens génériques puis typés. Le registre ne doit ajouter qu'un coût linéaire de construction et aucun coût par tick.

### Définition de terminé

Un lien spécialisé modifié dans l'éditeur survit à `save`, `load`, construction de session et matérialisation de sous-graphe sans devenir un `Channel` générique.

### Risques

- divergence entre la topologie de conception et la topologie d'exécution;
- double raccordement d'un lien aux nœuds;
- choix ambigu du type de lien lors d'une création par glisser-déposer.

La mitigation consiste à conserver une définition non raccordée dans `Connection` et à matérialiser une instance fraîche pour chaque graphe runtime.

## Milestone 2: neurone LIF natif de Session

### Objectif

Introduire un neurone Leaky Integrate-and-Fire déterministe, exécutable sans `SNNRuntime`.

### Réutilisation

- `RuntimeNode` et ses caches de routage par slot;
- `ISession.createNodeState`, `consume` et `publish`;
- ports stream et capacités FIFO existantes;
- `GraphItem` pour la persistance des paramètres.

### Fichiers principaux

- nouveaux fichiers sous `packages/dev/core/src/neuralnetwork/snn`
- `packages/dev/core/src/neuralnetwork/snn/index.ts`
- tests sous `packages/tests/neuralnetwork/snn`

### Interfaces nouvelles ou étendues

- `ILifNeuronState` dans l'état de session;
- `LifNeuronNode` avec ports `spike_in`, `current` et `spike_out`;
- paramètres persistants: potentiel de repos, seuil, reset, constante de temps et période réfractaire.

### Tests

- fuite analytique sans entrée;
- sommation de spikes pondérés;
- émission au seuil et reset;
- respect de la période réfractaire;
- isolation de l'état entre deux sessions partageant le même nœud;
- résultat identique pour deux exécutions avec le même graphe et les mêmes entrées.

### Benchmark

Propager 100 000 événements dans une chaîne LIF et enregistrer événements par seconde, allocations et taille maximale des files.

### Définition de terminé

Un petit graphe source vers LIF vers sink fonctionne exclusivement par `Session.run`, produit les spikes attendus et ne conserve aucun état dynamique partagé entre sessions.

### Risques

- confusion entre temps continu et ticks;
- consommation partielle des bursts;
- réexécution involontaire d'un neurone source à chaque tick.

## Milestone 3: synapse pondérée et délai en ticks

### Objectif

Porter poids et délai sur un `Channel` spécialisé sérialisable.

### Réutilisation

- file différée de `Session` et `ILinkRef.validAtTick`;
- `Channel` pour les slots, l'activation et le raccordement;
- registre et persistance de liens du milestone 1.

### Fichiers principaux

- nouveaux fichiers SNN sous `packages/dev/core/src/neuralnetwork/snn`
- éventuelle petite extension de `ISession.publish` si une échéance absolue manque au contrat public
- enregistrement SNN côté hôte ou plugin actif
- tests SNN et nodeeditor

### Interfaces nouvelles ou étendues

- `SpikeSynapse` avec `weight`, `delay`, `plasticity` et `enabled` persistants;
- méthode de transmission qui multiplie l'amplitude et programme l'échéance en ticks;
- type de port éditeur `spike`.

### Tests

- poids excitateur, inhibiteur et nul;
- délais 0, 1 et N;
- ordre stable de plusieurs spikes arrivant au même tick;
- synapse désactivée;
- round-trip complet de poids et délai.

### Benchmark

Comparer un fan-out de 10 000 synapses génériques et spécialisées. Le surcoût doit être expliqué et rester borné par le traitement de l'événement, sans scan global du graphe.

### Définition de terminé

Le document sauvegardé permet de rejouer exactement la même propagation pondérée et retardée après rechargement.

### Risques

- overflow d'un slot de capacité trop faible lors de bursts;
- ambiguïté entre délai zéro et délai d'un tick;
- index de lien mis en cache sur une définition au lieu de l'instance runtime.

## Milestone 4: première tranche verticale SNN dans l'éditeur

### Objectif

Créer, paramétrer, sauvegarder, recharger et exécuter un micro-réseau SNN depuis le graphe visuel.

### Réutilisation

- palette et métadonnées `NodeRegistry`;
- panneau de propriétés basé sur les champs inspectables;
- `GraphRunner` et mode Play;
- styles de ports et de connexions existants.

### Fichiers principaux

- enregistrement de `LifNeuronNode` et `SpikeSynapse` dans le plugin ou l'hôte retenu
- `packages/dev/nodeeditor/src/types.ts`
- tests d'intégration nodeeditor
- un exemple ou fixture minimal dans le paquet approprié

### Interfaces nouvelles ou étendues

- métadonnées de résolution d'un type de lien par types de ports;
- type de port `spike` et couleur associée;
- exposition du poids, du délai et des paramètres LIF dans le panneau de propriétés.

### Tests

- connexion `spike` vers `spike` choisissant `SpikeSynapse`;
- modification des propriétés du lien;
- scénario end-to-end source, deux LIF, sink;
- sauvegarde puis rechargement donnant la même trace.

### Benchmark

Temps de passage en mode Play pour 1 000 neurones et 10 000 synapses, séparé du temps de simulation.

### Définition de terminé

Le scénario minimal peut être construit visuellement et rejoué sans appel direct à l'ancien `SNNRuntime`.

### Risques

- registre de liens non initialisé dans certains hôtes;
- résolution ambiguë si plusieurs liens revendiquent les mêmes types de ports;
- mélange entre connexions config, structurelles et data.

## Milestone 5: validation de déterminisme et observabilité minimale

### Objectif

Rendre les résultats reproductibles et suffisamment observables pour préparer les phénomènes physiques hybrides.

### Réutilisation

- sorties de session et sinks existants;
- infrastructure Jest actuelle;
- horloges `currentTick`, `lastT` et `tickIndex`.

### Fichiers principaux

- tests SNN de traces de référence
- benchmark dédié sous l'infrastructure de benchmark existante
- documentation de la sémantique temporelle

### Interfaces nouvelles ou étendues

- trace légère de spike `{ tick, time, sourceId, amplitude }`;
- compteurs optionnels de spikes traités, différés et rejetés.

### Tests

- égalité exacte de deux traces à seed et entrées identiques;
- stabilité après round-trip JSON;
- ordre stable en fan-in et fan-out;
- scénario avec plusieurs sessions en parallèle;
- non-régression des tests `execution` et `sim` ciblés.

### Benchmark

Suite reproductible avec taille du réseau, densité, fréquence de spikes et profondeur de délai paramétrables. Produire au minimum débit d'événements, temps par tick et pic de file.

### Définition de terminé

La CI peut comparer une trace de référence, exécuter le benchmark sans UI et distinguer une divergence fonctionnelle d'une régression de performance.

### Risques

- traces trop volumineuses;
- instrumentation perturbant le chemin chaud;
- assertions fragiles sur les nombres flottants.

## Ordre de livraison

L'ordre retenu est 1, 2, 3, 4, 5. La première tranche de code s'arrête dès que le round-trip d'un `SpikeSynapse` et un scénario LIF déterministe passent dans le runtime actif. Les benchmarks lourds et l'observabilité enrichie peuvent suivre sans bloquer cette preuve verticale.

## État de la première tranche au 2026-08-18

Implémenté:

- `LinkRegistry` symétrique à `NodeRegistry`, avec résolution déterministe par types de ports;
- format de sauvegarde v4, où une connexion modèle contient `typeId`, `data`, `from` et `to`;
- définition de lien non raccordée dans `Connection`, clonée lors de la construction de session;
- restauration du lien concret dans le builder racine et le matérialiseur de sous-graphe;
- hook générique `IChannel.prepareDelivery` appelé par `Session.publish`;
- `LifNeuronNode` avec fuite analytique, seuil, reset, réfractaire et état propre à chaque session;
- `SpikeSynapse` avec poids, délai entier, activation héritée et paramètre de plasticité persistants;
- type de port éditeur `spike`, enregistrement du neurone et de la synapse, initialisation dans l'hôte v2 local;
- conservation sans modification du POC `SNNRuntime`.

Validation:

- compilation TypeScript complète réussie;
- bundles de développement Core et NodeEditor construits puis déployés dans l'hôte local;
- 30 suites réussies sur le périmètre graph, execution, sim, neuralnetwork et nodeeditor;
- 259 tests réussis, dont les nouveaux tests de registre, round-trip, builder racine, sous-graphe, LIF, poids, délai, réfractaire, isolation de session et déterminisme;
- 3 suites préexistantes restent rouges, pour 4 assertions fondées sur les anciennes sémantiques de slot unique: transfert par canal désactivé et écrasement implicite d'un buffer de capacité 1. La FIFO actuelle rejette au contraire l'overflow. Ces échecs étaient présents avant la tranche SNN et ne proviennent pas du hook de livraison spécialisé.

La prochaine tranche doit décider explicitement si ces anciens tests sont réécrits selon la FIFO bornée actuelle ou si certains canaux historiques reçoivent un mode `latest-value`. Cette décision est distincte de la sérialisation typée des synapses.
