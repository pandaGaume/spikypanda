# Neuroevolution Hybride : Evolution Darwinienne + Adaptation Lamarckienne

## Contexte

Le document [plasticity-vision.md](plasticity-vision.md) décrit la plasticité structurelle
**online**, c'est-à-dire l'adaptation du réseau pendant l'inférence (pruning, synaptogenèse, Hebbian).
Ce document décrit le processus **évolutionnaire** : comment faire évoluer l'architecture
du réseau d'une génération à l'autre.

Les deux mécanismes sont complémentaires :

| Mécanisme | Analogie biologique | Échelle de temps | Ce qui change |
|---|---|---|---|
| Backpropagation | Apprentissage (vie) | Intra-génération | Poids (paramètres) |
| Plasticité structurelle | Plasticité cérébrale | Intra-génération | Topologie locale |
| Neuroévolution | Sélection naturelle | Inter-génération | Architecture (génome) |

## Le problème fondamental

Un SAT à 2000 neurones avec un rayon d'attention R=1 et 2 têtes obtient un MSE de 0.0052
sur la compression LiDAR. Mais comment savoir si :

- R=2 serait meilleur ?
- 4 têtes au lieu de 2 ?
- 3 blocs transformer au lieu de 2 ?
- Une connexion résiduelle entre le bloc 1 et le décodeur ?
- 1500 neurones suffiraient (plus rapide, même performance) ?

Ces questions portent sur l'**architecture**, pas sur les poids. Backprop ne peut pas y
répondre : il optimise les poids à architecture fixe. Il faut un processus qui explore
l'espace des architectures.

## Approche 1 : Darwin pur (NEAT classique)

Le Neuroevolution of Augmenting Topologies (NEAT) de Kenneth Stanley (2002) procède ainsi :

```
Population de N génomes (ex: N=50)

Pour chaque génération :
  1. Chaque génome → construire le réseau → entraîner → évaluer (fitness)
  2. Sélection : garder les meilleurs génomes
  3. Croisement : combiner des portions de deux génomes parents
  4. Mutation aléatoire :
     - Ajouter un neurone (probabilité ~3%)
     - Ajouter une synapse (probabilité ~5%)
     - Supprimer une synapse (probabilité ~2%)
     - Modifier un hyperparamètre (probabilité ~10%)
  5. Spéciation : regrouper les génomes similaires pour protéger l'innovation
  6. Nouvelle génération
```

Les mutations sont **aveugles**, identique à la biologie. La sélection fait le tri
après coup.

**Avantage** : explore largement, pas de biais humain.
**Inconvénient** : très lent, chaque individu doit être entraîné pour évaluer sa fitness.

## Approche 2 : Lamarck guidé par les gradients

Contrairement à la nature, nous avons accès à l'intérieur du réseau après entraînement.
On peut prendre des décisions **informées** sur la topologie :

### Suppression de synapses (pruning structurel)

Après entraînement, inspecter les poids :

```typescript
for (const synapse of graph.links()) {
  if (Math.abs(synapse.weight) < pruningThreshold) {
    // Ce poids a convergé vers ~0
    // Le réseau a appris que cette connexion est inutile
    genome.markForRemoval(synapse.geneId);
  }
}
```

**Signal** : |w| < seuil → la connexion n'apporte rien.

### Ajout de synapses (growing structurel)

Identifier les paires de neurones non connectées qui bénéficieraient d'une connexion :

```typescript
// Approche 1 : gradient virtuel
// Simuler une connexion temporaire, mesurer le gradient
for (const [a, b] of candidatePairs) {
  const virtualSynapse = new Synapse(a, b, smallRandomWeight);
  graph.addLink(virtualSynapse);
  const gradient = computeGradient(virtualSynapse);
  graph.removeLink(virtualSynapse);

  if (Math.abs(gradient) > growthThreshold) {
    // Fort gradient = cette connexion serait utile
    genome.markForAddition(a.geneId, b.geneId);
  }
}

// Approche 2 : corrélation d'activité (Hebbian)
// Si deux neurones non connectés s'activent de manière corrélée,
// une connexion pourrait capturer cette relation
for (const [a, b] of candidatePairs) {
  const correlation = computeActivityCorrelation(a, b, dataset);
  if (correlation > hebbianThreshold) {
    genome.markForAddition(a.geneId, b.geneId);
  }
}
```

### Détection de neurones morts

```typescript
for (const neuron of graph.nodes()) {
  const avgActivation = computeAverageActivation(neuron, dataset);
  if (avgActivation < deadThreshold) {
    // Ce neurone ne contribue jamais → le supprimer libère de la capacité
    genome.markNeuronForRemoval(neuron.geneId);
  }
}
```

**Avantage** : modifications ciblées, convergence rapide.
**Inconvénient** : biais d'exploitation, reste piégé dans des optima locaux.

## Approche 3 : Hybride Darwin + Lamarck (recommandée)

Combiner les deux pour avoir l'exploitation ET l'exploration :

```
┌─────────────────────────────────────────────────────┐
│                  CYCLE ÉVOLUTIONNAIRE                │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ Phase 1 : CONSTRUCTION                      │    │
│  │   Génome → Construire le graphe réseau      │    │
│  └─────────────┬───────────────────────────────┘    │
│                ▼                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │ Phase 2 : ENTRAÎNEMENT                      │    │
│  │   Backpropagation sur le dataset            │    │
│  │   (optimise les poids, pas la topologie)    │    │
│  └─────────────┬───────────────────────────────┘    │
│                ▼                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │ Phase 3 : ANALYSE (Lamarck)                 │    │
│  │   - Identifier synapses faibles → supprimer │    │
│  │   - Identifier neurones morts → supprimer   │    │
│  │   - Tester gradients virtuels → ajouter     │    │
│  │   - Encoder les modifications dans le génome│    │
│  └─────────────┬───────────────────────────────┘    │
│                ▼                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │ Phase 4 : MUTATION (Darwin)                 │    │
│  │   - Mutations aléatoires supplémentaires    │    │
│  │   - Explorer des topologies inattendues     │    │
│  │   - Protège contre les optima locaux        │    │
│  └─────────────┬───────────────────────────────┘    │
│                ▼                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │ Phase 5 : ÉVALUATION                        │    │
│  │   Fitness = f(MSE, vitesse, taille réseau)  │    │
│  └─────────────┬───────────────────────────────┘    │
│                ▼                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │ Phase 6 : SÉLECTION                         │    │
│  │   - Garder les top K génomes                │    │
│  │   - Croisement des meilleurs                │    │
│  │   - Les poids meurent, la structure survit  │    │
│  └─────────────┬───────────────────────────────┘    │
│                │                                    │
│                └────────── Génération suivante ──▶   │
└─────────────────────────────────────────────────────┘
```

### Pourquoi cette combinaison est puissante

| Aspect | Darwin seul | Lamarck seul | Hybride |
|---|---|---|---|
| Exploration | Forte (aléatoire) | Faible (locale) | Forte |
| Exploitation | Faible (aveugle) | Forte (guidée) | Forte |
| Vitesse convergence | Lente | Rapide | Rapide |
| Risque optima locaux | Faible | Élevé | Faible |
| Coût computationnel | Élevé (N individus) | Faible (1 individu) | Moyen |

## Le Génome SpikyPanda

### Que contient le génome ?

Le génome encode la **recette de construction** du réseau, pas le réseau lui-même :

```typescript
interface Genome {
  // Gènes structurels
  layers: LayerGene[];          // type, taille de chaque couche
  connections: ConnectionGene[]; // source, cible, activé/désactivé

  // Gènes d'hyperparamètres (pour SAT)
  attentionRadius: number;       // rayon R de voisinage
  numHeads: number;              // nombre de têtes d'attention
  numBlocks: number;             // nombre de blocs transformer
  embeddingDim: number;          // dimension d'embedding
  mlpExpansion: number;          // facteur d'expansion du MLP

  // Gènes de plasticité (méta-paramètres)
  pruningThreshold: number;      // seuil de suppression
  growthRate: number;            // taux d'ajout de connexions
  hebbianLearningRate: number;   // vitesse d'adaptation Hebbian

  // Historique (pour croisement NEAT)
  innovationNumbers: Map<string, number>;  // tracking des gènes
}
```

### Ce qui est hérité vs ce qui meurt

| Élément | Hérité ? | Pourquoi |
|---|---|---|
| Topologie (quels neurones, quelles connexions) | Oui | C'est le génome |
| Hyperparamètres (R, têtes, blocs) | Oui | C'est le génome |
| Seuils de plasticité | Oui | Méta-apprentissage |
| Poids synaptiques | Non | Appris par backprop (expérience de vie) |
| Activations | Non | État transitoire |

### Innovation numbers (mécanisme NEAT)

Pour croiser deux génomes, il faut savoir quels gènes correspondent entre parents.
NEAT utilise un compteur global d'innovation :

```
Parent A : [conn1, conn2, conn5, conn8]
Parent B : [conn1, conn3, conn5, conn6, conn7]

Gènes communs (matching) : conn1, conn5 → hérités aléatoirement d'un parent
Gènes excess/disjoint : conn2, conn3, conn6, conn7, conn8 → hérités du parent le plus fit
```

Cela permet de croiser des topologies différentes de manière cohérente.

## Fonction de fitness

La fitness ne devrait pas être uniquement la performance (MSE). Un réseau de 10 000
neurones avec MSE 0.0050 n'est pas meilleur qu'un réseau de 500 neurones avec MSE 0.0053
s'il est 20x plus lent.

```typescript
function fitness(individual: Individual): number {
  const accuracy = 1 - individual.mse;           // performance
  const speed = 1 / individual.inferenceTimeMs;   // rapidité
  const efficiency = 1 / individual.neuronCount;   // compacité

  // Pondération configurable
  return (
    weights.accuracy * accuracy +
    weights.speed * speed +
    weights.efficiency * efficiency
  );
}
```

La pression de sélection sur la **taille** est cruciale : sans elle, les réseaux
ne font que grossir (bloat). C'est l'équivalent du coût métabolique en biologie :
un cerveau plus gros consomme plus d'énergie, donc il faut qu'il en vaille la peine.

## Spéciation : protéger l'innovation

Un nouveau gène (ajout de neurone, nouvelle connexion) dégrade souvent la fitness
initialement car le poids est aléatoire et le réseau doit se réajuster. Sans protection,
cette innovation serait éliminée avant d'avoir pu prouver sa valeur.

NEAT résout cela par la **spéciation** :

```
Population
├── Espèce A : [génomes à 2 blocs, R=1]     → compétition interne
├── Espèce B : [génomes à 3 blocs, R=1]     → compétition interne
└── Espèce C : [génomes à 2 blocs, R=2]     → compétition interne
```

Chaque espèce a un quota de survie garanti. Un génome innovant ne compete qu'avec
des génomes structurellement similaires, lui laissant le temps de s'optimiser.

La distance entre génomes est calculée sur la topologie :

```typescript
function genomeDistance(a: Genome, b: Genome): number {
  const excess = countExcessGenes(a, b);
  const disjoint = countDisjointGenes(a, b);
  const weightDiff = averageWeightDifference(matchingGenes(a, b));

  return (c1 * excess + c2 * disjoint) / Math.max(a.size, b.size) + c3 * weightDiff;
}
```

## Implémentation par étapes dans SpikyPanda

### Étape 1 : Génome minimal (MVP)

Encoder la configuration actuelle du SAT en génome :

```typescript
const genome = {
  attentionRadius: 1,
  numHeads: 2,
  numBlocks: 2,
  embeddingDim: 64,
  patchSize: 4,
  latentDim: 64,
};
```

Mutation : modifier un hyperparamètre à la fois.
Population : 10-20 individus.
Fitness : MSE + inference time.

### Étape 2 : Mutations structurelles

Ajouter les mutations de topologie :

- Ajouter/supprimer des connexions (skip connections entre blocs)
- Ajouter/supprimer des neurones dans les couches MLP
- Modifier le nombre de têtes par bloc (pas global)

### Étape 3 : Analyse Lamarckienne

Après entraînement de chaque individu :

- Pruning des synapses faibles → encoder dans le génome
- Gradients virtuels pour identifier les connexions manquantes
- Détection de neurones morts

### Étape 4 : Spéciation et croisement

Innovation numbers + distance génomique + croisement structurel.

### Étape 5 : Méta-évolution

Les seuils de plasticité eux-mêmes (pruning threshold, growth rate) deviennent
des gènes évoluables. Le système apprend **comment** apprendre à adapter sa structure.

## Lien avec la plasticité online

L'évolution inter-génération et la plasticité intra-génération se renforcent :

```
Évolution sélectionne :
  → les architectures qui s'adaptent bien (plasticité efficace)
  → les seuils de plasticité optimaux (méta-paramètres)
  → les topologies initiales qui permettent la meilleure adaptation online

Plasticité permet :
  → de mieux évaluer le potentiel d'un génome (pas juste la performance initiale)
  → de réduire le besoin d'entraînement par backprop (adaptation locale)
  → de compenser les mutations légèrement délétères (robustesse)
```

C'est l'effet Baldwin : la capacité d'apprentissage d'un individu influence
indirectement l'évolution de l'espèce. Les architectures qui apprennent mieux
survivent plus, donc la capacité d'apprentissage elle-même évolue.

## Références

- Stanley, K. & Miikkulainen, R., "Evolving Neural Networks through Augmenting Topologies" (NEAT), 2002
- Stanley, K. et al., "A Hypercube-Based Encoding for Evolving Large-Scale Neural Networks" (HyperNEAT), 2009
- Baldwin, J.M., "A New Factor in Evolution", The American Naturalist, 1896
- Hinton, G. & Nowlan, S., "How Learning Can Guide Evolution", Complex Systems, 1987
- Gaier, A. & Ha, D., "Weight Agnostic Neural Networks", NeurIPS, 2019
