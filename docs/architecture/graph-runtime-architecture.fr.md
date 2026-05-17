# Architecture des graphes, runtimes et validation

Ce document décrit la couche de calcul de SpikyPanda de bout en bout :
les types de graphes et leurs relations, les runtimes qui les
exécutent, les algorithmes derrière chaque runtime, et la stratégie de
validation qui garde l'ensemble cohérent. C'est la référence unique
pour "comment l'inférence s'exécute réellement" et "pourquoi on lui
fait confiance".

Une version anglaise est disponible dans
[graph-runtime-architecture.md](graph-runtime-architecture.md).

---

## 1. Couche des graphes

SpikyPanda fait coexister deux familles de graphes :

1. **Graphes de domaine** (`IGraph<N, L>`) pour les réseaux de neurones
   exprimés en neurones + synapses. MLP, CNN et RNN (LSTM/GRU)
   spécialisent tous cette forme avec leurs propres types de neurones
   et de synapses. Ce sont les graphes que l'on construit avec
   `MlpBuilder`, `CnnBuilder`, etc. Ils conviennent à l'entraînement,
   à la plasticité structurelle, et aux algorithmes spécifiques à
   chaque famille.

2. **Graphes de calcul** (`IComputeGraph`) pour les programmes de flux
   de tenseurs exprimés en kernels + liens de données. Les modèles
   ONNX se chargent sous cette forme. Chaque nœud est un `IKernel`
   avec un contrat `execute(inputs[]): outputs[]` ; chaque arête est
   un `IDataLink` qui transporte un `ITensor` d'un slot producteur
   vers un slot consommateur.

Les deux familles sont reliées par des exporteurs (graphe de domaine
→ octets ONNX) et des importeurs (octets ONNX → `ComputeGraph`). La
quantification, le profilage et le déploiement passent par le côté
graphe de calcul parce que c'est le format que comprennent ONNX,
onnxruntime et CyanMycelium.

### 1.1 Contrats de base (`packages/dev/core/src/compute/`)

| Type            | Fichier                    | Rôle                                                                            |
| --------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `ITensor`       | `compute.interfaces.ts`    | Charge `Float32Array` + `shape: number[]` + `name` optionnel, métadonnée `quantization` optionnelle. |
| `IDataLink`     | `compute.interfaces.ts`    | Arête dirigée ; restreint `IChannel<ITensor>` par un `slot` positionnel (ordre des entrées ONNX). |
| `IKernel`       | `compute.interfaces.ts`    | Nœud de calcul : `execute(inputs: ITensor[]): ITensor[]` + `outputShapes` par nœud. |
| `IComputeGraph` | `compute.interfaces.ts`    | `IRuntimeGraph<IKernel, IDataLink>` ; DAG de kernels en ordonnancement statique. |
| `Kernel`        | `compute.node.base.ts`     | Base abstraite : rassemble les entrées par slot, appelle `execute`, met en cache `bag.lastOutputs`, publie en aval. |

Le champ optionnel `quantization?: IQuantizationParams` sur `ITensor`
est une métadonnée informationnelle pour les tenseurs fake-quant
(voir §3). Il ne change jamais le dtype de `data`, qui reste toujours
`Float32Array`.

### 1.2 Graphes de calcul concrets

* **`ComputeGraph`** (`compute.graph.ts`) étend `RuntimeGraph<IKernel, IDataLink>`. Il possède `nodes`, `links` et expose `infer(externalInputs?): Map<string, ITensor>` qui injecte les tenseurs nommés dans les kernels sources, exécute un tick de l'ordonnanceur et collecte les sorties par nom.
* **`OnnxGraph`** (`packages/dev/onnx/src/onnx/onnx.graph.ts`) est une sous-classe légère de `ComputeGraph` figée sur `mode: "static"` (ordonnancement topologique de Kahn). Les modèles construits par `OnnxGraphBuilder` se matérialisent ici.

### 1.3 Graphes de domaine

Chaque famille vit sous `packages/dev/core/src/neuralnetwork/` :

* **MLP** (`ann/mlp/`)
  * `IMlpNeuron` (biais + activation optionnelle), `IMlpSynapse` (poids), `IMlpGraph = IGraph<IMlpNeuron, IMlpSynapse>`.
  * `MlpBuilder` enchaîne `.withDenseLayer(...)` → `.build()`.

* **CNN** (`cnn/`)
  * Enum `CnnLayerType` : `Input | Conv | Pool | Flatten | Dense | Upsample | Reshape`.
  * `ICnnNeuron` porte les métadonnées spatiales (ligne, colonne, canal, type de couche, type de pool) + un `bag` pour l'état runtime.
  * `IConvKernel` contient les poids partagés (hauteur, largeur, inputChannels, poids, biais) référencés par `ICnnSynapse`.
  * `ICnnLayerDescriptor` est le résumé par couche : type, dimensions spatiales, liste ordonnée des neurones, taille du noyau, stride, padding, kernels de convolution.
  * `ICnnGraph = IGraph<ICnnNeuron, ICnnSynapse> + kernels + layerDescriptors`.
  * `CnnBuilder` enchaîne `.withInputLayer().withConvLayer().withPoolLayer().withDenseLayer().build()`.
  * **L'ordre des neurones d'une couche Conv est filter-major** : index = `f * H * W + h * W + w`, ce qui correspond à la disposition NCHW en ordre ligne. C'est critique pour la compatibilité de l'export ONNX.

* **RNN** (`rnn/`)
  * Enum `RnnCellType` : `LSTM | GRU`.
  * `IRnnNeuron<B>` porte `hiddenState`, `resetState()`, plus l'état spécifique à la cellule (`cellState` et quatre biais de portes pour LSTM ; deux portes + biais candidat pour GRU).
  * `IRnnSynapse` porte les portes multi-poids (4 pour LSTM, 3 pour GRU).
  * L'état persiste entre les appels de `step()` ; `run(sequence)` itère.

### 1.4 Variante quantifiée

Un CNN quantifié n'est pas un nouveau graphe de calcul : c'est une
métadonnée qui enveloppe l'`ICnnGraph` FP32. Dans
`packages/dev/core/src/neuralnetwork/cnn/quantization/` :

* `QuantizedCnnLayer` : enregistrement par couche (type, dimensions spatiales, `QuantizedBuffer` int8 pour les poids, biais FP32, `IQuantizationParams` de sortie issus de la calibration, métadonnées kernel/stride/padding/pool/activation).
* `QuantizedCnnGraph` : structure figée `{ source: ICnnGraph, layers: QuantizedCnnLayer[], inputParams }`.
* `QuantizedCnnGraphBuilder.fromCalibration(cnn, calib)` assemble un `QuantizedCnnGraph` en quantifiant les poids du CNN source avec le schéma adapté à la famille (per-channel symétrique pour Conv, per-tensor symétrique pour Dense) et en pliant les paramètres d'activation par couche issus de la calibration.

Le graphe quantifié n'est pas exécutable en soi ; il sert d'entrée à
l'exporteur ONNX (voir §3.3).

### 1.5 Diagramme de hiérarchie

```text
IComputeGraph
└── ComputeGraph (ordonnancement statique)
    └── OnnxGraph (mode = "static", conscient des QLinear via le registre d'ops)

IGraph<N, L>
├── IMlpGraph (IMlpNeuron, IMlpSynapse)
├── ICnnGraph (ICnnNeuron, ICnnSynapse, +kernels, +layerDescriptors)
│   └── enveloppé par QuantizedCnnGraph (graphe FP32 + poids int8 + paramètres d'activation)
└── IRnnGraph (IRnnNeuron, IRnnSynapse)
    ├── LSTM (4 portes, état caché + état de cellule)
    └── GRU  (2 portes + candidat, état caché)

Exporteurs / importeurs :
  ICnnGraph        ── CnnGraphOnnxExporter           ──► octets ONNX
  QuantizedCnnGraph── QuantizedCnnGraphOnnxExporter  ──► octets ONNX (ops QLinear)
  octets ONNX      ── OnnxParser + OnnxGraphBuilder  ──► ComputeGraph
```

---

## 2. Couche runtime

### 2.1 Le dispatcher : `readyQueueDispatch`

Fichier : `packages/dev/core/src/graph/graph.dataflow.ts`.

C'est le cœur topologique événementiel qu'utilise chaque runtime de
réseau de neurones. La signature :

```ts
readyQueueDispatch<N extends INode, L extends IOlink>(
    graph: IGraph<N, L>,
    options: IReadyQueueDispatchOptions<N, L>
): void
```

Algorithme en clair :

1. Initialise un compteur "entrées restantes" par nœud à son degré entrant ; les seeds sont mis à zéro pour que la file démarre avec eux.
2. Dépile la tête d'une file FIFO de nœuds prêts.
3. Pour chaque arête sortante de ce nœud, appelle `propagate(source, target, edge)` pour mettre à jour l'accumulateur de la cible, puis décrémente son compteur.
4. Quand le compteur d'une cible atteint zéro, appelle `fire(target)` (qui produit sa sortie) et l'enfile.
5. Répète jusqu'à vider la file.

C'est dirigé par le fan-in, pas par les couches. Un nœud se déclenche à
l'instant où tous ses prédécesseurs ont tiré. Les topologies en couches
émergent naturellement du câblage des entrées.

### 2.2 Inférence MLP

Fichier : `packages/dev/core/src/neuralnetwork/ann/mlp/mlp.inference.ts`.

`MLPInferenceRuntime.run(inputValues)` initialise les neurones d'entrée
(`activation = input`, `remainingInputs = 0`) et appelle
`readyQueueDispatch` avec :

* `propagate(src, tgt, syn): tgt.sum += src.activation * syn.weight`
* `fire(n): n.activation = activationFn(n.sum + n.bias)`

Aucune itération explicite par couche ; la topologie détermine
l'ordonnancement.

### 2.3 Inférence CNN

Fichier : `packages/dev/core/src/neuralnetwork/cnn/cnn.inference.ts`.

`CnnInferenceRuntime` utilise le même dispatcher mais bascule sur
`target.layerType` pour la politique d'accumulation par couche :

| Couche cible        | propagate                                       | fire                                  |
| ------------------- | ----------------------------------------------- | ------------------------------------- |
| Conv / Dense        | `sum += src.activation * syn.weight`            | `activation = fn(sum + bias)`         |
| Pool (Max)          | `sum = max(sum, src.activation)` (la première entrée initialise) | `activation = sum`     |
| Pool (Avg)          | `sum += src.activation`                         | `activation = sum / totalInputs`      |
| Flatten / Input / Reshape / Upsample | `sum = src.activation`                | `activation = sum`                    |

Le biais est ajouté à `fire()`, pas à `propagate()` (afin d'être compté
une fois par neurone de sortie, pas une fois par arête entrante).

### 2.4 Inférence RNN

Fichier : `packages/dev/core/src/neuralnetwork/rnn/rnn.inference.ts`.

Deux points d'entrée :

* `step(inputValues)` exécute un pas de temps et met à jour `hiddenState` (et `cellState` pour LSTM) sur place dans chaque neurone.
* `run(sequence)` appelle `step` sur une liste d'entrées et renvoie la liste des sorties.

Pour LSTM, chaque pas de temps accumule quatre sommes de portes en
parallèle (`sum_forget`, `sum_input`, `sum_candidate`, `sum_output`) à
partir des arêtes d'entrée et des arêtes récurrentes (en utilisant
l'état caché *précédent*). À `fire()` :

```
forget    = sigmoid(sum_forget    + bias_forget)
input     = sigmoid(sum_input     + bias_input)
candidate = tanh   (sum_candidate + bias_candidate)
output    = sigmoid(sum_output    + bias_output)
cellState = forget * cellState + input * candidate
hiddenState = output * tanh(cellState)
```

GRU a la même forme avec deux portes (reset, update) et un candidat.

L'état appartient au neurone, pas au runtime : `resetState()` est la
seule façon de l'effacer. Cela rend le runtime sans état et réentrant
pour le framework, tandis que le contexte persistant vit avec le
modèle.

### 2.5 Exécution des ops ONNX : `ComputeGraph.infer`

Fichier : `packages/dev/core/src/compute/compute.graph.ts`.

```ts
public infer(externalInputs?: Map<string, ITensor>): Map<string, ITensor> {
    this._injectExternalInputs(externalInputs);
    this.run(0);
    return this._collectResults();
}
```

Le mécanisme :

1. **Inject** des tenseurs nommés sur `bag.pendingInput` des kernels sources, indexés par id/tag du kernel.
2. **Exécute un tick** de l'ordonnanceur statique (ordre topologique de Kahn).
3. Pour chaque kernel, `Kernel.fire(session, t)` :
   * rassemble les entrées des `IDataLink` entrants dans l'ordre des slots,
   * appelle le `execute(inputs[])` concret,
   * stocke les sorties dans `bag.lastOutputs` pour la collecte ou le debug,
   * publie les sorties sur les canaux sortants.
4. **Collecte** les sorties terminales dans un `Map<string, ITensor>` indexé par les noms de sortie déclarés dans la spec du graphe.

Chaque `OnnxOpNode` (`packages/dev/onnx/src/onnx/registry.ts`) est un
`Kernel` concret. Son `execute` est l'implémentation pure
tenseur-entrée / tenseur-sortie d'une op ONNX ; le reste est de la
plomberie héritée de la classe de base. Cela rend les kernels par op
petits et uniformes ; ajouter une nouvelle op revient à "enregistrer
une factory + écrire le calcul".

### 2.6 Activations

Fichier : `packages/dev/core/src/neuralnetwork/ann/mlp/mlp.activation.ts`.

`ActivationFunctions` exporte `relu`, `sigmoid`, `tanh`, `linear`.
Elles sont câblées par neurone (`n.activationFn`) et appliquées à
`fire()`, après l'ajout du biais. Il n'y a pas d'objet "couche
d'activation" ; l'activation est une propriété du neurone producteur.

---

## 3. Pipeline de quantification (Phase 7)

### 3.1 Conventions (compatibles CyanMycelium)

La pile de quantification vise CyanMycelium pour le déploiement ESP32
et suit strictement ses conventions :

* **Grille int8** `[-128, 127]` avec `-128` réservé comme slot de garde asymétrique ; les poids vivent sur `[-127, 127]` (symétriques).
* **Poids** :
  * Conv : per-channel symétrique sur l'axe des filtres (une échelle par canal de sortie). Le zero point est toujours 0.
  * Dense : per-tensor symétrique (une échelle pour toute la matrice).
* **Activations** : per-tensor asymétrique (une échelle + un zero point par tenseur). Le zéro réel est préservé sur la grille.
* **Arrondi** : arrondi banquier (round-half-to-even, identique à `nearbyintf` avec `FE_TONEAREST` côté C).
* **Disposition** : les poids Conv sont stockés en OIHW (`[F, Cin, kH, kW]`), ce qu'attend ONNX `QLinearConv`.
* **Biais pour QLinearConv** : int32, pré-mis à l'échelle composée `(x_scale * w_scale[f])`. Le biais Dense est ajouté en FP32 après dequantize (voir §3.3).
* **Jeu d'ops** : `QuantizeLinear`, `DequantizeLinear`, `QLinearConv`, `QLinearMatMul`. Pas de format QDQ-pair ; CyanMycelium attend les ops QLinear directement.

### 3.2 Primitives du cœur

`packages/dev/core/src/quantization/` :

| Fichier                                 | Contenu                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `quantization.interfaces.ts`            | `QuantDType`, `QuantScheme`, `IQuantizationParams`, `IQuantizedTensor`, `isInt8QuantizedTensor`      |
| `quantization.math.ts`                  | `roundHalfEven`, `dtypeBounds`, `quantizeScalar`, `dequantizeScalar`, `asymmetricParamsFromRange`, `symmetricParamsFromAbsMax`, `quantizeTensor`, `dequantizeTensor`, `fakeQuantizeTensor` |
| `quantization.calibration.ts`           | `ICalibrationStrategy`, `MinMaxStrategy`, `CalibrationRunner.observe(samples)`                       |
| `quantization.weights.ts`               | `WeightQuantizer.{perTensorSymmetric, perChannelSymmetric, perTensorAsymmetric, dequantize}`, `QuantizedBuffer` |

`MinMaxStrategy` est le seul finalizer implémenté aujourd'hui : il
suit les `min, max` glissants à travers les échantillons, puis dérive
les paramètres asymétriques via `asymmetricParamsFromRange`. Les
stratégies percentile / entropie / KL sont en travaux futurs ;
l'interface est ouverte.

### 3.3 Marshalleurs spécifiques au CNN

`packages/dev/core/src/neuralnetwork/cnn/quantization/` :

* **`cnn.weights.ts`**
  * `extractConvLayerWeights(kernels, inputChannels)` repaque les kernels partagés en OIHW.
  * `extractDenseLayerWeights(denseDesc, prevDesc)` parcourt les synapses et construit `[units, prev_size]` en ordre ligne. L'ordre des colonnes correspond à `prevDesc.neurons`, lui-même filter-major pour un prédécesseur Conv (donc l'ordre du flatten dense correspond au `Flatten` ONNX d'un tenseur `[1, F, H, W]`).
  * `quantizeConvLayer` → per-channel symétrique, axe 0.
  * `quantizeDenseLayer` → per-tensor symétrique.

* **`cnn.calibration.ts`**
  * `CnnLayerCalibrationHelper.observe(cnn, runtime, samples)` exécute `CnnInferenceRuntime.run(sample)` pour chaque échantillon de calibration, puis lit `neuron.bag.activation` pour chaque neurone dans chaque descripteur de couche afin de reconstruire les tenseurs de sortie par couche. Retourne `{ inputParams, layerOutputParams[] }` compatible avec `QuantizedCnnGraphBuilder`.

* **`cnn.quantized.graph.ts`**
  * `QuantizedCnnGraphBuilder.fromCalibration(cnn, calib)` parcourt `cnn.layerDescriptors`, quantifie les poids Conv et Dense, copie les métadonnées de pool/flatten, attache les paramètres d'activation et fige le résultat.

### 3.4 Export ONNX

Fichier : `packages/dev/onnx/src/onnx/export/cnn/cnn.quantized.export.ts`.

`QuantizedCnnGraphOnnxExporter.emit(qcnn, inputName, outputName, ctx)`
parcourt les couches quantifiées et produit cette chaîne d'ops
canonique :

```text
inputName (FP32)
  ─► QuantizeLinear                                        (FP32 → flux int8)
  ─► QLinearConv  [Relu fusionné via saturation y_scale/y_zp]
  ─► (autres couches QLinearConv le cas échéant)
  ─► AveragePool / MaxPool                                 (opère directement sur int8)
  ─► Flatten                                               (reshape sans effet)
  ─► QLinearMatMul                                         (dense int8)
  ─► DequantizeLinear                                      (int8 → FP32)
  ─► Add (biais FP32)                                      (biais Dense en FP32)
outputName (FP32)
```

Trois patterns méritent d'être isolés parce qu'ils sont faciles à
rater :

1. **Relu est fusionné dans QLinearConv, pas émis comme un nœud
   séparé.** La calibration d'activation post-Relu donne `y_zp = -128`,
   qui représente le `0` réel sur la grille int8. Toute valeur
   pré-activation négative sature à `-128` dans `QLinearConv`. Émettre
   un `Relu` ONNX séparé après la sortie int8 écrêterait la
   *représentation entière* (en traitant `-92` comme un nombre à
   clamper à 0), ce qui mappe vers `(0 + 128) * y_scale ≈ y_scale * 128`
   en réel et détruit la sortie. L'exporteur omet donc le Relu
   explicite et lève une exception si une autre activation est
   demandée sur une couche Conv.

2. **Le biais Dense est ajouté en FP32 après `DequantizeLinear`.**
   Le `Add` ONNX standard n'accepte pas d'opérandes int8 ; onnxruntime
   rejette de tels graphes comme invalides. L'exporteur émet
   `QLinearMatMul → DequantizeLinear → Add(biais fp32)`. Quand Dense
   est la couche terminale (cas typique en CNN), ce dequantize sert
   également de dequantize de sortie du graphe, donc il n'y a pas de
   nœud `DequantizeLinear` terminal.

3. **Le biais Conv est int32, pré-mis à l'échelle composée.**
   `bias_int32[f] = round(bias_fp32[f] / (x_scale * w_scale[f]))`.
   L'accumulateur QLinearConv ajoute `bias_int32` directement au
   matmul entier, puis met à l'échelle composée, puis re-quantifie
   contre `y_scale, y_zp`.

### 3.5 Import ONNX (kernels TS fake-quant)

Fichier : `packages/dev/onnx/src/onnx/ops/quant.ts`.

Le côté TS n'introduit pas de type `ITensor` int8. Au lieu de cela,
chaque tenseur reste `Float32Array`, et les kernels QLinear simulent
l'arithmétique int8 en FP32 avec un champ explicite `quantization` en
métadonnée sur la sortie. C'est le chemin "fake-quant" :
numériquement équivalent à du vrai int8, mais en restant sur l'axe
FP32 existant du framework.

Kernels implémentés :

* `QuantizeLinearNode` : `q = clamp(round(x / scale) + zp, [-128, 127])`. La sortie `ITensor.data` est FP32 portant des valeurs entières ; `quantization` est renseigné.
* `DequantizeLinearNode` : `out = (x - zp) * scale`. La sortie est FP32 pur ; `quantization` effacé.
* `QLinearConvNode` : convolution NCHW 4D. L'accumulateur est FP64 (largement suffisant pour nos plages), construit à partir de `(x - x_zp) * (w - w_zp)` plus le biais int32 pré-mis à l'échelle, puis multiplié par l'échelle composée et re-quantifié contre `y_scale, y_zp`.
* `QLinearMatMulNode` : matmul 2D, même structure, échelles per-tensor.

Le support des initialiseurs dans
`packages/dev/onnx/src/onnx/registry.ts` a été étendu pour que
`getInitializerData` renvoie des vues correctement typées pour INT8 /
INT32 / UINT8 en plus des FLOAT et INT64 existants.

L'enregistrement est un appel :

```ts
registerQuantOps(registry);   // QuantizeLinear, DequantizeLinear, QLinearConv, QLinearMatMul
```

Déjà câblé dans `createDefaultRegistry()`.

---

## 4. Stratégie de validation

La pile a quatre couches concentriques de validation. Chaque couche
attrape une classe différente de bugs ; ensemble elles bornent la
confiance qu'on place dans le pipeline.

### 4.1 Inventaire des tests

Tous les tests vivent sous `packages/tests/`. La suite de
quantification est à `packages/tests/quantization/` :

| Fichier de test                 | Couche               | Ce qu'il couvre                                                                             |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `quantization-math.test.ts`     | primitives           | `roundHalfEven`, quantize/dequantize scalaires, saturation aux bornes, dérivation de paramètres |
| `weights.test.ts`               | primitives           | `WeightQuantizer` pour les schémas per-tensor / per-channel symétriques et asymétriques     |
| `calibration.test.ts`           | primitives           | Accumulation `MinMaxStrategy`, `CalibrationRunner` de bout en bout                          |
| `cnn-layer-calibration.test.ts` | composant CNN        | `CnnLayerCalibrationHelper` capture correctement les activations par couche depuis le runtime |
| `quantized-cnn.test.ts`         | composant CNN        | `QuantizedCnnGraphBuilder` produit des couches bien formées (poids, biais, métadonnées spatiales) |
| `quantized-cnn-export.test.ts`  | export ONNX          | La séquence d'ops est correcte (`Quantize → QLinearConv → … → DequantizeLinear → Add`), les dtypes des initialiseurs correspondent (poids int8, biais Conv int32, biais Dense float32) |
| `quantized-roundtrip.test.ts`   | intégration TS       | Build → calibration → quantification → export → ré-import → inférence ; le résultat correspond au CNN FP32 natif dans la tolérance de quantification ; la métadonnée `quantization` survit à l'import |
| `ort-cross-validate.test.ts`    | contrôle externe     | Même export, exécute à la fois le fake-quant TS et Python `onnxruntime` sur la même entrée, affirme l'accord bit-parfait (`max |TS - ORT| < 1e-4`) |

Plus la suite framework au sens large (582 tests sur 51 suites au
moment de la rédaction).

### 4.2 Les quatre couches de validation

**Couche 1, Primitives.** Tests unitaires pour les kernels
mathématiques et le quantifieur de poids. Ils attrapent les erreurs
d'arrondi à l'unité près, les frontières d'écrêtage et la dérivation
de paramètres. Rapides (sub-seconde), exhaustifs.

**Couche 2, Composants.** Tests unitaires pour les marshalleurs CNN
et l'helper de calibration. Ils attrapent les bugs d'ordre (packing
OIHW, ordre du flatten dense), la propagation manquante de
métadonnées, et les violations du contrat "graphe figé".

**Couche 3, Round-trip TS d'intégration.**
`quantized-roundtrip.test.ts` construit un CNN, le calibre, le
quantifie, l'exporte en octets ONNX, ré-analyse les octets,
reconstruit un graphe de calcul avec les ops QLinear enregistrées,
exécute l'inférence et compare la sortie au CNN FP32 natif. Cela
attrape tout ce qui casse le pipeline TS de bout en bout. Cela **ne
prouve pas** que l'export est conforme à la spec : un exporteur bogué
peut quand même tomber près de la réponse FP32 grâce à un importeur
bogué qui compense.

**Couche 4, Cross-validation externe contre onnxruntime.** C'est la
couche qui ferme la boucle de confiance. `ort-cross-validate.test.ts`
exporte le graphe quantifié, dépose les octets dans un répertoire
temporaire, fait un shell-out vers `scripts/verify-with-ort.py`,
exécute les mêmes octets via Python `onnxruntime` et compare sa sortie
à notre sortie fake-quant TS sur la même entrée. Le seuil de passage
est `1e-4` (essentiellement l'arrondi flottant) ; en pratique on
observe un accord bit-parfait (`max |TS - ORT| = 0.0`).

La cross-validation est conditionnée à la présence de Python +
`onnxruntime` ; si l'un manque, le test est sauté (il ne fait pas
échouer CI sur les systèmes sans Python). Quand elle s'exécute, elle
fournit deux garanties que le round-trip ne peut pas :

* **Validité ONNX spec.** `onnxruntime` valide le graphe au
  chargement et refuse les modèles invalides. L'exporteur est ONNX
  correct si et seulement si cela passe.
* **Sémantique QLinear.** `onnxruntime` est l'implémentation de
  référence des ops QLinear. Si nos kernels QLinear TS sont d'accord
  avec lui, notre numérique correspond à la spec.

### 4.3 Études de cas : bugs attrapés par chaque couche

Trois bugs de quantification ont été attrapés par la validation pendant
le développement de la Phase 7. Ils illustrent pourquoi chaque couche
compte :

1. **Décalage double du biais Dense (attrapé par la Couche 3,
   round-trip TS).** Une première version de l'exporteur écrivait le
   biais Dense int8 comme `round(bias / y_scale) + y_zp`. Quand on le
   somme avec la sortie de `QLinearMatMul` (qui porte déjà l'offset
   `+y_zp`) puis qu'on le dequantize, le résultat ramasse un décalage
   supplémentaire `y_zp * y_scale` par sortie. Le test de round-trip
   l'a attrapé parce que la réponse FP32 de référence différait
   exactement de cet offset constant.

2. **Relu parasite sur la grille int8 (attrapé par la Couche 3,
   round-trip TS).** L'exporteur émettait initialement `QLinearConv → Relu`,
   en pensant que le Relu ONNX ferait un Relu sur la valeur
   dequantifiée. Dans notre implémentation TS de `Relu`, le kernel fait
   juste `max(x, 0)` sur le `Float32Array`. Avec la calibration
   post-Relu, la représentation int8 d'un réel `0.5` est `-100` (pour
   une certaine échelle) ; appliquer `max(-100, 0)` donne `0`, qui se
   dequantifie en réel `0.94`. Une sortie est sortie à exactement
   `-128 * y_scale`, signe évident que "la représentation entière a
   été écrêtée, pas la valeur réelle". Correction : ne pas émettre de
   nœud Relu séparé ; la calibration post-Relu sature déjà la sortie
   `QLinearConv` via `y_zp = -128`.

3. **`Add` n'accepte pas int8 en ONNX (attrapé par la Couche 4,
   cross-validation ORT).** Avec le décalage du biais Dense et la
   fusion Relu tous deux corrigés, le test round-trip passait. Mais
   onnxruntime a refusé le modèle au chargement :
   `Type Error: Type 'tensor(int8)' of input parameter ... of operator (Add) ... is invalid.`
   Notre op `Add` TS est aveugle au dtype (elle additionne juste deux
   `Float32Array` élément par élément), donc elle a exécuté le graphe
   sans broncher. La correction est de dequantifier la sortie du
   matmul avant l'ajout du biais, ce qui est aussi le pattern ONNX
   standard.

Le troisième bug est l'argument-phare pour garder la Couche 4 dans la
suite : un test purement TS ne peut pas attraper les violations de la
spec ONNX, parce que les ops TS décident elles-mêmes quels dtypes
elles acceptent. Un runtime de référence externe est le moyen le moins
cher d'imposer la conformité à la spec.

### 4.4 Ce que "validé" signifie ici

La couche de calcul est **validée** pour les affirmations suivantes,
par ordre de force croissante :

* Les primitives mathématiques (arrondi, mise à l'échelle, dérivation de paramètres) sont correctes par rapport à une référence calculée à la main. *(Couche 1)*
* Les marshalleurs CNN produisent des graphes quantifiés bien formés et empaquettent les poids dans les dispositions canoniques. *(Couche 2)*
* Le pipeline TS complet préserve la réponse FP32 dans la tolérance de quantification. *(Couche 3)*
* L'ONNX exporté est **spec-valide** et **bit-compatible avec les
  kernels QLinear de onnxruntime**. *(Couche 4)*

La dernière affirmation est celle qui porte le déploiement : si nos
octets exportés donnent des résultats bit-identiques à `onnxruntime`,
ils donneront des résultats mathématiquement identiques à n'importe
quel runtime conforme, y compris CyanMycelium sur ESP32. Le framework
ne peut pas éliminer tout le risque de déploiement (le matériel cible
peut encore avoir ses propres bugs), mais il élimine tout le risque
côté export.

---

## 5. Référence des fichiers

| Préoccupation                       | Fichier                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Contrats tenseur + kernel           | `packages/dev/core/src/compute/compute.interfaces.ts`                                         |
| Classe de base Kernel               | `packages/dev/core/src/compute/compute.node.base.ts`                                          |
| ComputeGraph                        | `packages/dev/core/src/compute/compute.graph.ts`                                              |
| Dispatcher                          | `packages/dev/core/src/graph/graph.dataflow.ts`                                               |
| Runtime MLP                         | `packages/dev/core/src/neuralnetwork/ann/mlp/mlp.inference.ts`                                |
| Runtime CNN                         | `packages/dev/core/src/neuralnetwork/cnn/cnn.inference.ts`                                    |
| Runtime RNN                         | `packages/dev/core/src/neuralnetwork/rnn/rnn.inference.ts`                                    |
| Activations                         | `packages/dev/core/src/neuralnetwork/ann/mlp/mlp.activation.ts`                               |
| Primitives de quantification        | `packages/dev/core/src/quantization/`                                                         |
| Marshalleurs CNN de quantification  | `packages/dev/core/src/neuralnetwork/cnn/quantization/`                                       |
| Registre d'ops ONNX                 | `packages/dev/onnx/src/onnx/registry.ts`                                                      |
| OnnxGraphBuilder                    | `packages/dev/onnx/src/onnx/graph-builder.ts`                                                 |
| Kernels QLinear ONNX                | `packages/dev/onnx/src/onnx/ops/quant.ts`                                                     |
| Exporteur CNN quantifié ONNX        | `packages/dev/onnx/src/onnx/export/cnn/cnn.quantized.export.ts`                               |
| Tests de quantification             | `packages/tests/quantization/`                                                                |
| Script de cross-validation ORT      | `packages/tests/quantization/scripts/verify-with-ort.py`                                      |
