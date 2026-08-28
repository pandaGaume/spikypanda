# Protocole SNN complexe et modes collectifs

## Statut

Cette évolution est expérimentale. Elle ne remplace ni `LifNeuronNode`, ni le
capteur fréquentiel, ni la baseline MCSA existante. Toutes les nouvelles
dynamiques sont isolées dans `OscillatorySnnModel` et activées par la variante
configurée.

## Question scientifique

Deux hypothèses sont testées séparément puis ensemble.

1. Un état neuronal complexe explicite peut enrichir la mémoire de phase sans
   créer un écart entre le calcul avant d'apprentissage et le runtime hard.
2. Des champs collectifs appris peuvent faire émerger des modes oscillatoires
   utiles, puis moduler l'excitabilité des neurones avec un coût proche de
   `O(NK)`.

La fréquence n'est pas une cible d'apprentissage et aucune FFT n'intervient
dans le modèle. Le spectre est calculé uniquement après entraînement.

## Variantes contrôlées

| Variante | État neuronal            | Champ collectif | Source du champ             |
| -------- | ------------------------ | --------------- | --------------------------- |
| A        | LIF réel                 | Aucun           | Sans objet                  |
| B        | Deux composantes réelles | Aucun           | Sans objet                  |
| C        | LIF réel                 | Réel            | Spikes du timestep          |
| D        | Deux composantes réelles | Complexe        | États neuronaux du timestep |

Les quatre variantes doivent utiliser les mêmes tableaux d'échantillons pour
les ensembles d'apprentissage, validation et test indépendant. La factory
passée à `runOscillatoryAblation` ne peut changer que le modèle.

## Dynamique complexe

Pour un neurone complexe, `z = x + j y` reste représenté par deux nombres
réels. Sur un intervalle `dt`:

```text
r = exp(-dt / tau)
a = r * cos(omega * dt)
b = r * sin(omega * dt)

x[t+1] = resting + a * (x[t] - resting) - b * y[t] + Ix[t]
y[t+1] =           b * (x[t] - resting) + a * y[t] + Iy[t]
```

Le spike hard est produit lorsque:

```text
x[t+1]^2 + y[t+1]^2 >= threshold^2
```

Le reset de `x` et `y` est hard. Pendant le backward, une dérivée triangulaire
locale remplace uniquement la dérivée indéfinie de cette comparaison. Le
forward du trainer appelle exactement la même fonction `step` que
`OscillatorySnnNode` dans `RuntimeGraphBuilder`.

## Champs collectifs

Les coefficients `alpha` projettent les neurones vers `K` modes. Les
coefficients `gamma` projettent les modes vers les neurones au timestep
suivant:

```text
C[k,t] = sum_i alpha[i,k] * source[i,t]
I[i,t+1] += sum_k gamma[i,k] * C[k,t]
```

Dans C, `source` est le spike réel. Dans D, `source` est l'état complexe. Les
produits complexes sont développés en multiplications et additions réelles.
Le trainer calcule les gradients de `alphaReal`, `alphaImaginary`,
`gammaReal` et `gammaImaginary` par BPTT.

## Entrée sans bandes imposées

`TemporalDeltaSpikeEncoder` transforme les changements positifs et négatifs
du signal temporel en événements send-on-delta. Il ne contient aucun paramètre
de fréquence. Comme cette transformation agit sur une enveloppe RMS déjà
prétraitée, elle constitue un axe expérimental à part entière et ne doit pas
remplacer silencieusement le capteur historique.

Le protocole est donc factoriel: les quatre architectures A, B, C et D sont
entraînées une fois avec le capteur historique, puis une fois avec le capteur
send-on-delta. À l'intérieur de chaque bras, les quatre variantes reçoivent les
mêmes tenseurs encodés. Le rapport sépare ainsi l'effet du capteur de celui de
la dynamique neuronale.

Le nœud runtime publie aussi un vecteur agrégé à chaque observation. Les pas
sans événement sont donc conservés, ce qui fixe les délais en timesteps et
permet un branchement direct vers `OscillatorySnnNode` dans le graphe.

## Mesures produites

Le harnais fournit directement:

- loss et accuracy par split;
- accuracy surrogate et hard, identiques par construction pour le forward;
- marge de décision;
- firing rate par couche et par sortie de classe;
- nombre d'événements et latence observée;
- nombre de paramètres, état mémoire et opérations estimées par timestep;
- activité brute des modes collectifs;
- pic dominant et bande à mi-puissance après entraînement;
- comparaison appariée de `x`, `y`, amplitude, phase, timing des spikes,
  divergence temporelle, scores et marges.

## Runner moteur

Le runner utilise directement `train_grouped.json` et `test_grouped.json`. Il
commence par rejouer la baseline historique exacte: capteur multilevel,
topologie dense, LIF hard-forward, décodeur runtime et mini-lots de 16. Il
exécute ensuite la matrice `2 encodeurs x 4 architectures`. Par défaut, il
utilise un essai court et équilibré de trois epochs:

```text
npm run experiment:snn-oscillatory
```

Une campagne complète, sans limite par classe, peut être lancée explicitement:

```text
npm run experiment:snn-oscillatory -- --full --epochs 80 --hidden 32 --modes 3 --output output/oscillatory-snn-results.json
```

`--encoder historical`, `--encoder delta` ou `--encoder both` sélectionne les
bras. Le seuil send-on-delta et les bandes historiques sont calibrés uniquement
sur le sous-ensemble train. `--batch-size` vaut 16 par défaut. L'ordre des
mini-lots expérimentaux est mélangé de façon déterministe et identique entre
A, B, C et D.

Chaque bras entraîne d'abord A. B, C et D ne sont lancées que si A dépasse le
hasard de 20 %, avec un gain minimal de deux points et un test binomial
unilatéral à `p <= 0.05`. Le rapport conserve le nombre de succès, la p-value
et la décision du verrou. `--allow-chance-baseline` existe uniquement pour les
smoke tests techniques et ne doit pas être utilisé pour une campagne
scientifique.

Le JSON de sortie ne contient pas les traces détaillées, mais conserve les
métriques, les coûts et les pics spectraux post-entraînement.

Le runner affiche sur `stderr` la variante, l'époque, l'avancement dans le lot,
les pertes, la précision de validation et le temps écoulé. Sur une phase longue,
un rappel est affiché au moins toutes les cinq secondes. L'option `--quiet`
désactive ce suivi sans mélanger les messages de progression au JSON écrit sur
`stdout`.

## Critères de validation avant extension du runtime

1. Le test de parité entre le modèle analytique et le noeud RuntimeGraph doit
   rester exact à la précision flottante.
2. Toutes les valeurs transmises pendant le forward doivent être binaires pour
   les spikes.
3. Les gradients de `alpha` et `gamma` doivent être non nuls dans un cas où la
   décision dépend du champ.
4. Le coût collectif doit rester proportionnel à `N*K`.
5. Le spectre ne doit jamais être utilisé pour sélectionner ou corriger les
   paramètres pendant le training.
6. Une variante expérimentale ne peut remplacer la baseline qu'après plusieurs
   seeds et un test indépendant réalisé avec le split groupé inchangé.

## Points encore ouverts

- apprentissage éventuel de `tau` et de `omega` avec des bornes stables;
- quantification fixe des deux composantes et des matrices alpha/gamma;
- comparaison float32, float16 et entier à échelle explicite;
- ajout de groupes locaux de modes, au-delà du champ global actuel;
- validation WebGPU puis MCU une fois une variante supérieure à la baseline.
