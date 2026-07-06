# Résultats — Test de MULTIPLEXING (le vrai test de la thèse)

*Ce que MCSA n'avait PAS testé : plusieurs signaux sur une topologie partagée. C'est le
cœur du programme (H1 multiplexage, H4 couplage, H5 compacité). On le teste ici, proprement.*

## Pourquoi ce test (le recadrage)

MCSA classait **un seul signal** → le substrat n'y était qu'un filtre complexe front-end, et un
TCN gagnait naturellement. **Le mécanisme central — plusieurs calculs coexistant sur une même
topologie via des bandes — n'avait jamais été exercé.** Ici, on le met sous pression.

**Tâche.** N canaux. Cible **diagonale** `y_i = sin(ω_i·u_i)` (chaque canal sa fonction) ; et
**couplée** `y_i = sin(ω_i·u_i) + 0.5·u_{i-1}` (terme croisé, H4).

**Modèles.**
- **Substrat** : gain/biais **par bande** (O(N)) + un readout **PARTAGÉ** `f` (1→8→1) réutilisé sur
  toutes les bandes + couplage voisin apprenable. Câblage O(1), params O(N).
- **Dense h=16** (O(N)) et **Dense h=N** (largeur qui suit N → O(N²)).

## Résultats — MSE test (plus bas = mieux), 5 valeurs de N

**Diagonale (H1/H5) :**

| N | Substrat (params) | Dense h=16 (params) | Dense h=N (params) |
|--:|-------------------|---------------------|--------------------|
| 4 | 0.301 (37) | 0.292 (148) | 0.279 (40) |
| 8 | 0.141 (49) | 0.208 (280) | 0.180 (144) |
| 16 | **0.092 (73)** | 0.152 (544) | 0.147 (544) |
| 32 | **0.116 (121)** | 0.311 (1072) | 0.162 (2112) |
| 64 | **0.115 (217)** | 0.417 (2128) | 0.181 (**8320**) |

**Couplée (H4) :**

| N | Substrat+couplage (params) | Dense h=16 | Dense h=N |
|--:|----------------------------|-----------|-----------|
| 16 | **0.092 (73)** | 0.136 (544) | 0.138 (544) |
| 32 | **0.115 (121)** | 0.280 (1072) | 0.166 (2112) |
| 64 | **0.104 (217)** | 0.418 (2128) | 0.183 (8320) |

## Lecture — les hypothèses tiennent, nettement

- **H1 (capacité de multiplexing) ✅** : le substrat garde les N canaux séparés (erreur basse et
  stable de N=8 à 64) sur **une topologie fixe minuscule**. Les canaux ne se mélangent pas — la
  séparation fréquentielle les tient.
- **H5 (compacité) ✅, et fort** : à N=64, le substrat = **0.115 avec 217 params**. Le dense à
  largeur fixe **décroche** (0.417) *malgré* 2128 params ; même le dense **large O(N²)** reste
  **pire** (0.181) avec **8320 params — 38× plus**. Le substrat **factorise** (readout partagé +
  réglage par bande) ce qu'un réseau dense doit ré-apprendre canal par canal à travers un
  goulot → mur de capacité. **L'écart s'élargit avec N.**
- **H4 (couplage = calcul) ✅** : sur la tâche croisée, le substrat **sans** couplage plafonne
  (0.19) ; **avec** couplage il capte le terme inter-canaux (0.10) et bat tout, à 217 params.

## Le verdict qui renverse « ça ne tient pas »

MCSA n'était **pas** le test de la thèse : un seul signal, aucune pression de multiplexing → un TCN
gagne, logiquement. **Sur le vrai test — N calculs partageant une topologie — la thèse tient
décisivement** : le substrat porte N comportements sur un câblage O(1) / params O(N), là où un
réseau dense échoue même à O(N²). C'est exactement H1/H4/H5, et **l'avantage grandit avec N**.

**Réponse directe aux deux objections :**
1. « Les NN sont minuscules » → **c'est le point** : le substrat fait avec **217 params** ce qu'un
   dense ne fait pas avec **8320**. Petit = la feature (compacité), et ça s'accentue quand N monte.
2. « On n'envoie pas plusieurs signaux sur les synapses » → **exact, et c'était le manque** ;
   maintenant qu'on le fait, **c'est là que le substrat gagne**.

## Honnêteté (bornes)

- La tâche est **le terrain naturel du multiplexing** (calculs parallèles partageant une structure).
  Le substrat y a le **bon a priori** (séparation par bande + readout partagé) ; sur une tâche **sans**
  cette structure (ex. MCSA temporel mono-signal), il n'a pas d'avantage — cohérent avec tout le reste.
- MSE absolue ~0.1 : le readout partagé (1→8→1) n'approxime pas parfaitement toutes les fréquences
  `sin(ω·)` ; un readout plus riche baisserait le plancher. Le **comparatif** (substrat ≪ dense
  quand N monte) est le résultat, pas la valeur absolue.

## Ce que ça implique

Le substrat n'est **pas** un modèle universellement supérieur (MCSA l'a montré). C'est une
**architecture de compacité pour le calcul multiplexé** : beaucoup de comportements sur une topologie
fixe et partagée — pertinent pour le déploiement contraint (TinyML/ESP32, câblage fixe), le vivant
(un axone, plusieurs canaux), et le **goulot génomique** (une règle compacte déploie N fonctions).
C'est la direction de recherche légitime que MCSA (mauvais test) avait faussement enterrée.

# Fréquence, ou structure partagée ? (`multiplex_tasks.py`)

Objection : `sin(ω·u)` est signal-natif → terrain fréquentiel truqué ? On remplace par des tâches
**non-sinusoïdales** (base figée arbitraire douce) pour isoler ce qui compte. MSE test :

| N | Tâche A (MLP arbitraires indépendants) | Tâche B (base partagée NON-sinus. + affine) |
|--:|----------------------------------------|---------------------------------------------|
| | Substrat / Dense-h=N | Substrat / Dense-h=N |
| 16 | 0.066 (57p) / **0.012** (544p) | **0.166** (57p) / 0.210 (544p) |
| 64 | 0.051 (153p) / 0.049 (8320p) | **0.260** (153p) / 0.285 (**8320p**) |

- **Tâche A** (aucune structure partagée) : le dense **gagne** (0.012 vs 0.066 à N=16). ⇒ sans
  structure partagée, **pas d'avantage substrat** — prédiction confirmée.
- **Tâche B** (structure partagée mais **NON-fréquentielle**) : le substrat **gagne** (0.260 vs 0.285
  du dense large, **54× moins de params**). ⇒ **l'avantage est la STRUCTURE PARTAGÉE, pas la
  fréquence.** La fréquence n'était qu'une instance ; un primitif partagé + variation par-canal
  suffit (c'est un mini-hypernetwork / goulot génomique).

# Le bon cadrage physique : 1 fréquence ↔ 1 faute ↔ 1 binaire (`multifault.py`)

Reformulation (physique) : la détection de fautes n'est **pas** une classif 5-classes softmax, c'est
du **multi-label** — chaque faute a sa fréquence, on lit K **binaires cachés** en parallèle. Signal =
porteuse + Σ (fautes présentes à leur fréquence) + bruit. Sortie = K binaires. `per-fault % / exact-match %` :

| K | Substrat (params) | DenseRaw (params) | TCN (params) |
|--:|-------------------|-------------------|--------------|
| 4 | 100 / 100 (**13**) | 100 / 100 (8356) | 76 / 36 (1700) |
| 8 | 100 / 100 (**13**) | 100 / 100 (8488) | 67 / 4 (1768) |
| 16 | **100 / 100 (13)** | 88 / **8** (8752) | 58 / **0** (1904) |

- **Substrat : 13 params, CONSTANT en K** (readout par-bande **partagé** sur toutes les fautes) →
  **16 fautes simultanées à 100 % exact-match** avec **13 params**. O(1) en nombre de fautes.
- **DenseRaw** (8752 p, **673×** plus) **s'effondre** à K=16 (exact-match **8 %**) : incapable de sortir
  K binaires indépendants par son goulot. **TCN → 0 %**.
- L'**exact-match** est le révélateur : détecter *toutes* les fautes d'un coup tue le classifieur
  (sortie mutuellement exclusive / goulot) ; le multiplexing les lit **en parallèle**, trivialement.

**Ce cadrage réconcilie tout** : MCSA-5-classes écrasait K détections physiques indépendantes en UNE
décision exclusive → mauvais test (TCN gagne). Multi-label physiquement structuré → le substrat est
la bonne architecture, décisivement (O(1) params, 100 % exact-match).

# Synthèse : le domaine, c'est la physique ondulatoire

Le substrat gagne quand la structure du problème = la structure des ondes : **superposition (H1) +
phase (H6) + couplage (H4) + modes (bandes)**, latent complexe `A·e^{iφ}`. Condition : **multi-mode +
phase-portant + couplé** (mono-mode ou magnitude-seule → un réseau réel égale). Cible haute = **jalon 6**
(champ latent ondulatoire, la dynamique d'onde dans le latent, pas seulement dans les poids).
Terrain : EM/optique, acoustique/sonar, RF/radar, vibration/MCSA (multi-faute), sismique, ondes
gravitationnelles, quantique (fonction d'onde), rythmes cérébraux. **Pas** le spatial (conv) ni le
séquentiel-symbolique (attention).
