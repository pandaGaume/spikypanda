# Le nœud `ConvWIO` : garder les poids de convolution en flash

> Spécification, écrite le 17 août 2026. implementée le 18 aout
>
> Objet : supprimer la permutation des poids de convolution au chargement, qui
> force aujourd'hui une recopie de 18 496 octets en RAM, en livrant les poids
> déjà permutés dans le fichier.

## 1. Ce que cela rapporte, mesuré

Le chargeur permute les poids de convolution de OIW vers WIO avant que le noyau
ne les lise. La permutation lit la flash mappée, écrit dans un tampon RAM neuf,
et abandonne l'original.

```
features.0.weight   16x5x5    1 600 o
features.2.weight   24x16x5   7 680 o
features.4.weight   32x24x3   9 216 o
                             --------
                             18 496 o
```

Ce sont exactement les 18 500 octets que le journal annonce comme recopiés, à
quatre octets près.

| | aujourd'hui | avec `ConvWIO` |
|---|---|---|
| Poids recopiés en RAM | 18 500 o | **0** |
| Poids restés en flash | 2 404 o | **20 900 o** |
| Total du service d'inférence | 58 144 o | **39 644 o** |

Soit **32 % du service**, sur une cible sans PSRAM.

**Le chemin flash ne coûte pas de latence, et c'est mesuré, pas supposé.** Deux
séries de 200 inférences dans le même démarrage, seule `modelIsPersistent`
changeant : écart p99 de -9 µs, zéro valeur aberrante des deux côtés. Voir
`driverv2_theorie_mesure.md` section 8.3 bis.

**Réserve honnête :** cette mesure vaut pour 2 404 octets relus par inférence.
`ConvWIO` en porterait 20 900, huit fois plus. Rien n'indique de falaise, mais
l'extrapolation n'est pas gratuite, et le banc de latence est en place pour la
refaire le jour venu.

## 2. Le danger, démontré

Un fichier aux poids pré-permutés relu comme un fichier ordinaire ne provoque
**aucune erreur de forme**. Vérifié sur les trois convolutions du modèle :

```
features.0  WIO 5x5x16    relu en OIW -> M=5  C=5   l'entree a 5 canaux         OK
features.2  WIO 5x16x24   relu en OIW -> M=5  C=16  la conv precedente en sort 16  OK
features.4  WIO 3x24x32   relu en OIW -> M=3  C=24  la conv precedente en sort 24  OK
```

Le nombre de canaux d'entrée correspond à chaque fois, par la structure même
d'un réseau où la sortie de l'une alimente l'autre. Le graphe se construirait, le
calcul se ferait, et le résultat serait un vecteur unitaire de seize valeurs
parfaitement présentables.

C'est la troisième fois que ce projet rencontre cette classe de panne, après
`CMTensor::Set()` qui remettait les poids à zéro et `OnlineClusterer::Config`
sans initialiseurs. Aucune des trois ne plante.

**Conséquence de conception : le marqueur ne peut pas être un attribut.** Un
attribut se laisse ignorer, et un lecteur qui l'ignore calcule faux en silence.

### 2.1 Et il n'y a aucun garde-fou au moment de l'exécution

`TensorLayout::WIO_1D` existe, mais il est **écrit à un seul endroit et lu nulle
part** : `cm_onnx_graph_builder.cpp:1886`. Le noyau Conv 1D suppose WIO sans
condition.

Le marqueur est donc purement documentaire aujourd'hui, et rien dans le runtime
ne rattraperait une double permutation. Toute la sûreté doit venir du **nom de
l'opérateur**, parce que c'est la seule chose que le chargeur est obligé de
reconnaître pour instancier un nœud.

## 3. La forme retenue

```
op_type   ai.cyanmycelium.ConvWIO    le domaine est DANS le nom
attribut  weight_layout = "WIO"      documentaire
poids     physiquement permutes, forme ecrite [kL, C, M]
```

**Le domaine est encodé dans le nom, pas dans le champ `domain`.** C'est la
convention du projet, posée par `onnx/src/onnx/ops/dotvision.ts`, et ce n'est pas
une coquetterie : le parseur TypeScript ne lit que quatre champs de `NodeProto`,
`input`, `output`, `name` et `op_type`. Il n'a pas de constante `NODE_DOMAIN` et
tout autre champ tombe dans `default: reader.skip()`. Un domaine posé dans le
champ prévu serait donc **silencieusement ignoré**.

Le runtime C++ est dans la même situation : son parseur ne lit pas non plus le
domaine, et le registre de nœuds dispatche sur un hachage FNV1a d'`op_type`. Le
nom qualifié fonctionne donc avec les trois consommateurs sans qu'aucun n'ait à
changer.

### Pourquoi ce choix précis

**`ConvWIO` plutôt qu'un attribut sur `Conv`.** Un `op_type` inconnu ne
s'instancie pas : le registre de nœuds dispatche sur un hachage du nom, et
l'absence de cas est une erreur dure. Un runtime qui ne connaît pas `ConvWIO`
**refuse le fichier** au lieu de le mal lire. C'est la propriété qu'on cherche.

**Le domaine dans le nom, et non dans le champ `domain`.** Vérifié dans les deux
parseurs : ni celui de TypeScript ni celui du C++ ne lisent ce champ. L'y mettre
reviendrait à ne rien marquer du tout.

Le jour où l'on voudra le champ réel, les deux changements iront ensemble : lire
le domaine ET rendre la recherche sensible au domaine. Faire le premier seul
créerait une panne silencieuse neuve, un nœud `domain=ai.cyanmycelium,
op_type=Conv` allant chercher la `Conv` standard et calculant faux.

**Vérifié, pas supposé.** onnxruntime refuse les deux formes, pour deux raisons
indépendantes :

```
No Op registered for ai.cyanmycelium.ConvWIO with domain_version of 13
```

Un fichier WIO ne peut donc pas être passé par erreur à la chaîne de référence
Python, qui sert à produire l'embedding de parité.

### La matrice des confusions possibles

| fichier | runtime | résultat |
|---|---|---|
| standard `Conv` | runtime actuel | permute au chargement, correct |
| standard `Conv` | runtime avec `ConvWIO` | permute au chargement, correct |
| `ConvWIO` | runtime actuel | **refus dur**, opérateur inconnu |
| `ConvWIO` | runtime avec `ConvWIO` | alias direct, correct |
| `ConvWIO` | onnxruntime | **refus dur**, deux fois |

Aucune case ne donne un résultat plausible et faux.

## 4. Ce qu'il faut écrire, et où

### 4.1 Côté outil, `tools/optimize_onnx.py`

Nouvelle passe, insérée **avant l'alignement** qui doit rester la dernière.

```
passe 1   repliement des echelles          (sans effet depuis la v2)
passe 2   remontee des Constant
passe 3   estampillage des formes
passe 4   PERMUTATION WIO                  <- nouvelle
passe 5   alignement sur quatre octets     (etait la passe 4)
```

Ce que la passe fait, pour chaque `Conv` de rang 3 dont le poids est un
initialiseur float32 :

- transposer le poids `[M, C, kL]` vers `[kL, C, M]`, permutation `[2, 1, 0]`
- réécrire la forme de l'initialiseur
- renommer le nœud en `ai.cyanmycelium.ConvWIO`
- ajouter l'attribut `weight_layout = "WIO"`

Ce que la passe doit **refuser** plutôt que faire :

- un poids partagé par plusieurs nœuds, la permutation en casserait un
- un poids consommé ailleurs que par le slot 1 d'un `Conv`
- un poids qui n'est pas un initialiseur, il n'y aurait rien à permuter
- un `Conv` de rang 4, qui relève de HWIO et n'est pas couvert ici

Le modèle actuel satisfait ces quatre conditions, chaque poids n'ayant qu'un
consommateur, mais la passe ne doit pas le supposer.

**Cette passe reste dans CyanMycelium**, elle n'a rien à faire dans l'export de
spikypanda. WIO est la disposition interne d'un noyau de ce runtime, pas une
propriété du modèle. Voir `contrat_wio.md` côté recherche.

### 4.2 Côté runtime, trois points

**`src/nodes/cm_node_registry.cpp:77`**, le `switch` sur `fnv1a_runtime`. Ajouter
un cas `ai.cyanmycelium.ConvWIO` qui construit le même opérateur que `Conv`. Le noyau ne change
pas : il attend déjà WIO.

**`src/onnx/cm_onnx_layout_registry.cpp:41`**, la table `kEntries`. Ajouter :

```cpp
{ "ai.cyanmycelium.ConvWIO", { LayoutKind::LK_SPATIAL_NCHW_2D, -1, -1, 2 } },
```

Le `-1` en `weight_input_idx` est tout le mécanisme : la passe de disposition ne
permutera pas ce poids. Le reste de l'entrée est identique à `Conv`, pour que la
réécriture NCL vers LC des données continue de s'appliquer.

**`src/onnx/cm_onnx_graph_builder.cpp`**, autour de `_normalizeLayout` en 1721.
Poser `W->Layout = TensorLayout::WIO_1D` pour un `ai.cyanmycelium.ConvWIO`,
par hygiène. Rien ne
lit ce champ aujourd'hui, mais un marqueur faux est pire qu'un marqueur absent
le jour où quelque chose le lira.

Aucune modification du parseur protobuf, et c'est justement pourquoi le nom
qualifie le domaine : `op_type` porte seul la distinction.

## 5. Les portes de recette

Dans cet ordre, chacune bloquante.

**1. Parité Win64.** Le fichier WIO doit rendre le même embedding que le fichier
standard sur la fenêtre de référence, à 1e-5. C'est la seule chose qui
distingue une permutation juste d'une permutation à l'envers, et ni la forme ni
la norme ne la donneront : les deux restent présentables.

**2. Refus d'un runtime ancien.** Charger le fichier WIO avec un binaire dépourvu
du cas `ai.cyanmycelium.ConvWIO` doit échouer proprement, avec un message nommant l'opérateur.
À vérifier une fois, et à noter, parce que c'est le mécanisme de sûreté et qu'un
mécanisme de sûreté non testé n'en est pas un.

**3. Mémoire sur la carte.** Le journal doit annoncer `0 bytes copied to RAM` et
environ 20 900 octets restés en flash. Un chiffre intermédiaire signifierait
qu'une partie des poids n'a pas pu être aliasée, probablement un défaut
d'alignement, et il faudra le nommer plutôt que s'en réjouir à moitié.

**4. Latence sur la carte.** Rejouer la comparaison flash contre RAM déjà en
place dans le sample. C'est le point où l'extrapolation de la section 1 se
vérifie ou tombe : huit fois plus d'octets sur le chemin flash.

**5. Parité carte.** L'autotest, comme d'habitude.

## 6. Ce que cela ne couvre pas

**Le rang 4.** La permutation OIHW vers HWIO existe dans le même code et
mériterait le même traitement, mais aucun modèle du projet ne l'utilise
aujourd'hui. L'ajouter sans cas d'usage produirait du code non exercé.

**La quantification.** Le fichier int8 n'est plus un livrable depuis le candidat
de la version 2, et le repliement des échelles l'a de toute façon rendu
inutilisable. `ConvWIO` ne change rien à ce dossier.

**Le gain de latence.** Il n'y en a pas. La permutation se fait une fois au
chargement, pas à chaque inférence. Ce qui se gagne est de la RAM, et
uniquement de la RAM.
