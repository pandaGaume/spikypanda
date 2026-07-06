# Le substrat modal : une loi d'échelle, lisible du grand public au reviewer

*Ce document se lit en descendant : la première phrase est pour tout le monde, le
paragraphe suivant pour l'ingénieur curieux, la note pour l'expert, puis les chiffres.
Une seule métaphore tient du haut en bas : **des flèches qui tournent et s'estompent**
(chaque flèche = une vibration pure, sa longueur = sa force, son angle = sa phase).*

---

## Niveau 0 — une phrase, tout public

> Un réseau qui décrit un signal comme une petite poignée de **vibrations pures**, laisse
> chacune évoluer de son côté, et n'apprend que la façon dont elles s'influencent.

## Niveau 1 — un paragraphe, ingénieur non-spécialiste

> Beaucoup de systèmes physiques (un moteur qui vibre, une corde, une onde radio, la
> lumière) ne sont, au fond, que **quelques oscillations superposées**. Plutôt que de
> demander à un gros réseau générique de redécouvrir cette structure, on construit le
> latent (l'état interne du réseau) pour qu'il *soit* déjà cette liste d'oscillations.
> Chaque mode est une **flèche qui tourne** : sa longueur dit sa force, son angle sa
> phase. Chaque flèche tourne à son rythme et grandit ou s'estompe toute seule
> (l'évolution propre du mode), et le réseau n'apprend que les **petites poussées** d'une
> flèche sur l'autre (les couplages). Résultat : un modèle minuscule, lisible, et calqué
> sur la physique réelle. Contrepartie honnête : ça n'aide que pour les systèmes vraiment
> faits d'oscillations, pas pour du texte ni des données quelconques.

## Niveau 2 — la version exacte (note technique)

> Une architecture qui apprend un plongement complexe de faible dimension et bien
> conditionné, dans lequel l'opérateur de Koopman (l'opérateur linéaire qui fait avancer
> les observables d'un pas de temps) est **block-diagonal dans une base orthonormale** :
> partie diagonale = gain/amortissement `|λ|` et rotation de phase `arg λ` de chaque mode ;
> partie hors-diagonale creuse = couplages **irréductibles** entre modes. L'objectif n'est
> pas « `K` le plus diagonal possible » (trivial dans la base propre), mais « `K` aussi
> block-diagonal que possible **à rang et conditionnement contraints** ».

## Le pont entre les deux (le glossaire qui évite de mentir)

Écrire le corps en clair et renvoyer le rigoureux en note, sans triche :

| mot lisible | terme exact |
|---|---|
| une vibration pure / un mode | mode propre, observable de Koopman |
| force + phase de la flèche | nombre complexe `A·e^{iφ}` (amplitude + phase) |
| la flèche grandit ou s'estompe | gain / amortissement (`\|λ\|`) |
| la flèche tourne | rotation de phase (`arg λ`) |
| chaque flèche tourne seule | opérateur (block-)diagonal |
| les flèches se poussent | couplage hors-diagonale |
| les « bonnes coordonnées » | base qui diagonalise Koopman |

## La garde honnête (la seule phrase qu'on ne coupe jamais)

**« Pour les systèmes faits d'oscillations. »** C'est elle qui transforme « les ondes sont
partout » (faux, infalsifiable) en « certains systèmes ont une structure modale de faible
rang, et pour ceux-là voici l'architecture adaptée » (vrai, **vérifiable a priori** : il
suffit de regarder la décroissance des valeurs singulières de la matrice de Hankel/DMD, ou
le spectre de Koopman). Frontière franche : **modal, quasi-normal, spectre discret de
faible rang**. Ça casse pour les systèmes à **spectre continu** (chaos, turbulence
développée) où aucun sous-espace d'observables de dimension finie n'est invariant.

---

# Statut épistémique : démontré vs conjecture

Le cadre n'est **pas** une théorie neuve : c'est de la **théorie spectrale / Koopman**
(Koopman 1931 ; DMD, Schmid 2010 ; deep-Koopman à valeurs propres complexes,
Lusch-Brunton 2018 ; sous-espaces invariants appris, Takeishi 2017 ; autoencodeurs Koopman
cohérents, Azencot 2020). La **contribution** revendicable est plus étroite et tenable :

1. le prior structurel **`K = D + C`** (backbone diagonal + couplage creux appris) ;
2. la **compacité extrême** : dynamique O(1) en nombre de modes observés `M` et en nombre
   de fautes `K` ;
3. le **déploiement contraint** (TinyML/ESP32, phase native).

Revendiquer la théorie surcharge ; revendiquer *une paramétrisation maximalement compacte,
native en phase, de l'opérateur de Koopman pour les systèmes modaux* est défendable.

---

# La preuve de scaling (`modal_scaling.py`)

**Claim testée (la « box »)** : si une dynamique a une représentation de faible rang dans
une base modale complexe, le coût de représentation du substrat est **borné indépendamment
du nombre de modes observés `M`**, alors que celui d'un réseau dense **croît avec `M`**.

**Montage (Koopman/DMD canonique).** Un état latent de `r` modes complexes évolue
diagonalement (`ψ(t+1) = Λ ψ(t)`, `λ_k = ρ_k e^{iω_k}`) ; on l'observe sur `M` canaux
mélangés (`x(t) = obs(Re(C ψ(t)))`, `C ∈ C^{M×r}`, `r ≪ M`). Tâche : prévision un-pas
`x(t) → x(t+1)`. On **fixe le vrai rang `r=6`** et on balaie `M`. Métrique : NMSE de test
(erreur quadratique normalisée), 3 graines. Quatre modèles :

- **FullLinear** : dense linéaire `x→x`, aucun prior de rang. Params **O(M²)**.
- **MLP** (h=32) : ReLU générique, aucun prior de rang. Params O(M·h).
- **LowRankLinear** : goulot linéaire de rang `2r` (connaît le rang, **pas** la structure
  modale). Params O(M·r). *Contrôle d'honnêteté.*
- **WaveKoopman** : encodeur → **évolution complexe diagonale** (`2r` params de dynamique,
  **constante en M**) → décodeur. Params O(M·r).

## Régime linéaire — la loi d'échelle (params), mais « modal » ≈ « faible rang »

| M | FullLinear (O(M²)) | MLP h=32 | LowRankLinear (O(Mr)) | WaveKoopman (dyn=12) |
|--:|:--:|:--:|:--:|:--:|
| 8 | 72p / 26.5% | 552p / 26.4% | 200p / 26.5% | 1376p / 26.5% |
| 16 | 272p / 0.6% | 1072p / 0.6% | 400p / 0.6% | 1896p / 0.8% |
| 32 | 1056p / 0.2% | 2112p / 0.2% | 800p / 0.2% | 2936p / 0.5% |
| 64 | 4160p / 0.2% | 4192p / 0.2% | 1600p / 0.2% | 5016p / 0.6% |
| 128 | **16512p** / 0.2% | 8352p / 0.2% | **3200p** / 0.2% | 9176p / 1.0% |

*(p = paramètres, % = NMSE test)*

- **M=8 est dégénéré** : `2r=12 > 8`, les 6 modes ne tiennent pas dans 8 canaux → tout le
  monde échoue à ~26 %. À ignorer.
- **M ≥ 16** : tous ajustent la carte linéaire de rang `2r` (~0,2 %). Le différenciateur est
  le **coût** : `FullLinear` explose en **O(M²)** (16512 p à M=128), les modèles conscients
  du rang restent **linéaires en M** (LowRank 3200 p, soit **≈5× moins**, et l'écart grandit
  avec M). ⇒ **la loi d'échelle tient dans sa forme faible : exploiter le rang donne
  O(M·r) vs O(M²).**
- **Mais** `WaveKoopman ≈ LowRankLinear` en erreur, et coûte même **plus** de params
  (encodeur/décodeur). ⇒ sur du **linéaire**, « modal » n'apporte **rien** de plus que
  « faible rang » : le couplage linéaire se diagonalise par simple changement de base. La
  propriété démontrée ici est **l'exploitation du rang**, pas les modes.

## Régime non-linéaire — là « modal » se sépare de « faible rang »

Observation passée dans une non-linéarité inversible (`tanh`) : une carte linéaire ne peut
plus ajuster `x(t) → x(t+1)`, mais un encodeur de Koopman peut la « redresser » en
coordonnées modales.

| M | FullLinear | MLP h=32 | LowRankLinear | WaveKoopman |
|--:|:--:|:--:|:--:|:--:|
| 8 | 72p / 36.2% | 552p / 32.1% | 200p / 36.2% | 1376p / 31.3% |
| 16 | 272p / 14.3% | 1072p / 10.1% | 400p / 14.3% | **1896p / 5.9%** |
| 32 | 1056p / 6.1% | 2112p / 5.5% | 800p / 6.1% | **2936p / 2.4%** |
| 64 | 4160p / 4.4% | 4192p / 4.4% | 1600p / 4.7% | 5016p / 3.2% |
| 128 | 16512p / 3.7% | 8352p / 4.4% | 3200p / 4.5% | 9176p / 4.0% |

- **M=16, 32 (le révélateur)** : le contrôle **linéaire-faible-rang échoue** (14.3 %, 6.1 % ;
  à égalité avec le dense naïf : une carte linéaire ne fait pas le `tanh`). Le **MLP**
  générique s'en tire à moitié (10.1 %, 5.5 %). Seul **WaveKoopman** (encodeur non-linéaire
  + latent modal complexe diagonal) tient : **5.9 %, 2.4 %**, soit **2 à 2,4× mieux** que le
  low-rank linéaire, à budget contraint. ⇒ **le prior modal-complexe paie quand la dynamique
  est non-linéaire mais admet une linéarisation modale de faible rang** (le pari Koopman),
  pas avant.
- **M=64, 128** : l'avantage se **comprime** (régime riche en ressources : tout le monde
  ajuste). Le gain du substrat est le plus net **quand les ressources sont serrées par
  rapport au problème**, cohérent avec tout le dossier (le substrat est une architecture de
  **compacité**).

## Lecture honnête

- ✅ **Démontré (linéaire)** : rang → O(M·r) contre O(M²) du dense naïf ; l'écart grandit
  avec M. Mais « modal » n'y bat pas « faible rang ».
- ✅ **Démontré (non-linéaire)** : le latent modal-complexe + encodeur non-linéaire bat le
  contrôle low-rank-linéaire **et** le MLP générique, au régime contraint (M=16-32, ~2×).
  C'est là que « complexe modal » gagne ses galons **au-delà** de « faible rang ».
- ⚠️ **Bornes** : M=8 dégénéré ; avantage comprimé à grand M ; `WaveKoopman` n'est **pas**
  le moins cher en params (son gain est la *qualité sous non-linéarité*, pas le compte de
  params, sur ce test).

---

# Ce qui reste à démontrer (le prochain cran)

L'hypothèse **`K = D + C`** (« apprendre seulement le couplage ») et la forme **Schur**
(block-diagonal orthonormal, robuste à la non-normalité) ne sont **pas encore testées**.
Test proposé : paramétrer `D` block-diagonal contraint `|λ|≤1` + `C` régularisé vers le
creux, comparer à un `K` plein appris **sur un système non-normal**. Prédiction falsifiable :
à budget égal, `D+C` **égale** le `K` plein en NMSE mais gagne nettement en **stabilité de
rollout long-horizon** (le `K` plein génère des valeurs propres parasites `>1` et diverge).
Si ça tient : *la structure modale contrainte n'est pas seulement efficace, elle est **stable
par construction*** — ce que ni le low-rank ni le MLP n'offrent.

---

# Reproduire

```
python docs/multipath-frequentiel/h3/mux/modal_scaling.py --r 6 --M 8 16 32 64 128 --seeds 3            # linéaire
python docs/multipath-frequentiel/h3/mux/modal_scaling.py --r 6 --M 8 16 32 64 128 --seeds 3 --nonlinear # non-linéaire
```

Voir aussi [`RESULTS.md`](RESULTS.md) (multiplexing, multi-faute, fréquence-vs-structure) et,
pour le verdict MCSA réel, [`../../etapeD-mcsa/RESULTS.md`](../../etapeD-mcsa/RESULTS.md).

# Références

- B. O. Koopman (1931), *Hamiltonian Systems and Transformation in Hilbert Space*, PNAS.
- P. Schmid (2010), *Dynamic Mode Decomposition of numerical and experimental data*, JFM.
- N. Takeishi, Y. Kawahara, T. Yairi (2017), *Learning Koopman Invariant Subspaces for DMD*, NeurIPS.
- B. Lusch, J. N. Kutz, S. Brunton (2018), *Deep learning for universal linear embeddings of
  nonlinear dynamics*, Nature Communications.
- O. Azencot et al. (2020), *Forecasting Sequential Data using Consistent Koopman Autoencoders*, ICML.
- L. N. Trefethen, M. Embree (2005), *Spectra and Pseudospectra* (non-normalité, conditionnement).
