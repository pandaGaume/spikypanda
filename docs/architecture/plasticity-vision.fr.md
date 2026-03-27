# Plasticité structurelle : le différenciateur clé de SpikyPanda

## Le problème : la généralisation sans adaptation

Un réseau de neurones entraîné sur un dataset A fonctionne bien sur le dataset A. Si on
le déploie dans un environnement B, ses performances se dégradent. Les solutions standards
sont :

- **Fine-tuning** : ré-entraîner sur de nouvelles données (nécessite données + calcul + interruption)
- **Adaptation de domaine** : apprendre des features invariantes au domaine (complexe, résultats limités)
- **Foundation models** : pré-entraîner sur tout (coûteux, non garanti)

Toutes ces approches partagent une limitation fondamentale : la **topologie du réseau est fixe**.
Mêmes neurones, mêmes connexions, même architecture. Seuls les poids changent.

## Comment les cerveaux biologiques résolvent ce problème

Le cerveau ne fait pas de fine-tuning. Il exhibe une **plasticité structurelle** :

| Mécanisme | Ce qu'il fait | Échelle de temps |
|---|---|---|
| **Plasticité synaptique** | Renforcer/affaiblir les connexions existantes | Millisecondes à heures |
| **Synaptogenèse** | Créer de nouvelles synapses | Heures à jours |
| **Élagage synaptique** | Supprimer les connexions inutilisées | Jours à semaines |
| **Neurogenèse** | Créer de nouveaux neurones (hippocampe) | Jours à mois |
| **Apprentissage Hebbien** | "Les neurones qui s'activent ensemble se connectent ensemble" | Millisecondes |
| **Modulation astrocytaire** | Régulation locale de la transmission synaptique | Secondes à minutes |

Quand on change d'environnement, notre cerveau ne relance pas un entraînement. Il
**adapte sa structure** : il crée de nouvelles connexions pour les nouveaux patterns,
élague les connexions devenues inutiles, ajuste la connectivité locale en fonction
de l'activité.

## Pourquoi les frameworks tensoriels ne peuvent pas faire ça

En PyTorch/TensorFlow, un réseau de neurones est une séquence de multiplications
matricielles :

```
y = W3 * relu(W2 * relu(W1 * x + b1) + b2) + b3
```

Les matrices W1, W2, W3 ont des dimensions fixes. Il est impossible de :
- Ajouter une ligne à W2 (nouveau neurone) sans reconstruire le modèle entier
- Supprimer une colonne de W1 (élaguer une connexion) sans redimensionner toutes les matrices en aval
- Insérer une nouvelle connexion entre la couche 1 et la couche 3 (skip connection) à l'exécution
- Modifier la topologie du graphe pendant l'inférence

Ces opérations nécessitent une reconstruction complète du modèle, une réinitialisation
et un ré-entraînement.

## Ce que SpikyPanda rend possible

Dans SpikyPanda, un réseau de neurones est un graphe explicite de noeuds (neurones) et
de liens (synapses) :

```typescript
// Ajouter un neurone à l'exécution
const newNeuron = new StereoCnnNeuron("left", CnnLayerType.Conv, row, col, ch);
graph.addNode(newNeuron);

// Ajouter une cross-synapse pour une nouvelle disparité
const newSynapse = new StereoCnnSynapse(leftNeuron, rightNeuron, kernel, idx, 0, true, d);
graph.addLink(newSynapse);

// Élaguer une synapse faible
if (Math.abs(synapse.weight) < threshold) {
    graph.removeLink(synapse);
}
```

Ces opérations sont en O(1). Pas de reconstruction. Pas de redimensionnement. Pas de
ré-entraînement.

| Opération | PyTorch | SpikyPanda |
|---|---|---|
| Modifier un poids | O(1) | O(1) |
| Ajouter un neurone | Reconstruire le modèle | O(1) - `graph.addNode()` |
| Supprimer une synapse | Reconstruire le modèle | O(1) - `graph.removeLink()` |
| Ajouter une skip connection | Reconstruire le modèle | O(1) - `new Synapse(a, b)` |
| Ajouter une cross-synapse pour une nouvelle disparité | Impossible | O(1) |
| Modifier la topologie pendant l'inférence | Impossible | Natif |

## Application concrète : vision stéréo sur Mars

Considérons le scénario du rover :

### Phase 1 - Entraînement en simulation (BabylonJS)
- Entraîner le CNN stéréo avec cross-synapses sur des terrains simulés variés
- Apprendre les patterns de disparité pour les rochers, pentes, sol plat
- Les cross-synapses apprennent les préférences de disparité à d=0..16

### Phase 2 - Déploiement sur le terrain réel
- Nouvelles textures (vraie surface de Mars vs simulée)
- Éclairage différent (vrai soleil vs simulé)
- Obstacles inattendus (formes jamais vues en simulation)
- Nouvelles plages de profondeur (plus loin/plus près que le simulé)

### Phase 3 - Adaptation structurelle (plasticité)

Sans plasticité (approche standard) :
- Les performances se dégradent sur les nouvelles textures
- Pas d'estimation de disparité au-delà de la plage entraînée
- Il faut envoyer les données sur Terre, ré-entraîner, re-téléverser (4-24 min de latence)

Avec plasticité (approche SpikyPanda) :

1. **Élagage synaptique** : les cross-synapses avec des poids proches de zéro après
   déploiement sont supprimées, réduisant le temps d'inférence. Si d=7 et d=8 ne sont
   jamais utiles sur le terrain réel, le rover les élague.

2. **Synaptogenèse** : si le rover rencontre des objets à des disparités au-delà de la
   plage entraînée (d > 16), de nouvelles cross-synapses sont créées à d=17, 18... avec
   de petits poids aléatoires. L'apprentissage en ligne les ajuste.

3. **Renforcement local** : si une région spécifique du champ visuel produit
   systématiquement de mauvaises estimations de profondeur, la densité de cross-synapses
   dans cette région augmente (plus de candidats de disparité testés).

4. **Adaptation Hebbienne** : les cross-synapses qui s'activent ensemble de manière
   cohérente (features L/R corrélées à la bonne disparité) sont renforcées. Les autres
   déclinent. Pas besoin de backpropagation : règle purement locale.

## La vision plus large : un modèle du monde structurellement adaptatif

La plasticité n'est pas spécifique à la stéréo. Elle s'applique à chaque module du
pipeline perception-vers-action :

```
Caméras stéréo --> CNN Stéréo (plasticité des cross-synapses)
                        |
                   Profondeur --> Grille BEV
                        |
                   Encodeur SAT (plasticité du rayon d'attention)
                        |
                   Latent --> LSTM (plasticité des portes)
                        |
                   MLP Navigation (plasticité des connexions)
```

Chaque module peut adapter sa structure à l'environnement :

- **Encodeur SAT** : le rayon d'attention grandit en zones ouvertes (plus de contexte
  global nécessaire), rétrécit en zones encombrées (features locales suffisantes)
- **LSTM** : de nouvelles cellules mémoire sont créées pour les patterns temporels
  inédits, les cellules inutilisées sont élaguées
- **MLP Navigation** : de nouvelles connexions sont ajoutées pour les comportements
  non vus à l'entraînement

C'est le **modèle du monde** que AMI poursuit : un système qui comprend véritablement
son environnement parce qu'il s'y adapte structurellement, pas seulement paramétriquement.

## Relation avec les approches existantes

| Approche | Adapte les poids | Adapte la structure | Exécution |
|---|---|---|---|
| Fine-tuning | Oui | Non | Hors ligne |
| NEAT/HyperNEAT | Oui | Oui | Évolutionnaire (hors ligne) |
| Neural Architecture Search | Non | Oui | Hors ligne (recherche) |
| Apprentissage continu | Oui | Non | En ligne |
| **Plasticité SpikyPanda** | **Oui** | **Oui** | **En ligne** |

L'approche existante la plus proche est NEAT (neuroévolution), mais NEAT adapte la
structure par sélection évolutionnaire (hors ligne, basé sur une population). SpikyPanda
permet l'adaptation structurelle pendant l'inférence (en ligne, basé sur l'individu).

## Ce qui doit être démontré

La vision est claire. La validation expérimentale nécessite :

1. **Benchmark d'élagage** : entraîner le CNN stéréo, déployer sur de nouvelles données,
   élaguer les synapses faibles, mesurer le compromis vitesse/précision
2. **Benchmark de synaptogenèse** : entraîner sur une plage de disparité limitée,
   déployer sur une plage étendue, ajouter des cross-synapses, mesurer la récupération
   de l'estimation de profondeur
3. **Adaptation Hebbienne** : implémenter une règle de type STDP sur les cross-synapses,
   déployer sans backpropagation, mesurer la qualité de l'adaptation en ligne
4. **Comparaison avec le fine-tuning** : même scénario, comparer l'adaptation structurelle
   vs l'adaptation des poids seuls sur la vitesse de convergence et la précision finale

Ces expériences sont le chemin vers une contribution véritable. Les architectures (CNN,
ViT, SAT, Stéréo) sont des reproductions. La plasticité est l'innovation.
