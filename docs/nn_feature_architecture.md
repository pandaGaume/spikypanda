# Architecture NN : detection de defauts PMSM par features physiques

**Date :** 2026-05-07
**Auteur :** Guillaume Pelletier / CyanMycelium
**Contexte :** Proposition DotVision, Phase 1 -- architecture d'inference

---

## 1. Principe general

L'approche retenue est **feature engineering explicite + NN classifieur** :

1. Des extracteurs de features physiquement motives transforment les signaux bruts en un vecteur compact
2. Un NN leger apprend les combinaisons discriminantes entre ces features, y compris leur dependance au contexte gravitationnel

Cette approche est preferee a un NN end-to-end sur signal brut pour trois raisons :
- **Robustesse** : les features sont invariantes a la vitesse (le lock-in suit f_mech en temps reel)
- **Efficacite donnees** : le NN apprend sur un espace reduit et interprete, pas sur 8192 bins FFT bruts
- **Explicabilite** : chaque feature a un sens physique direct, utile pour le paper et la validation

---

## 2. Extracteurs de features

### 2.1 Bank de lock-in amplifiers (detection synchrone)

Un lock-in amplifier numerique extrait amplitude et phase a une frequence exacte deterministe par RPM :

```
signal(t) --> x cos(2*pi*f_cible*t) --> filtre passe-bas --> I(t)
signal(t) --> x sin(2*pi*f_cible*t) --> filtre passe-bas --> Q(t)

magnitude(t) = sqrt(I^2 + Q^2)
phase(t)     = atan2(Q, I)
```

f_cible est calcule en temps reel a partir de omega (signal du moteur) :

```
f_mech  = omega / (2*pi)           [Hz]
f_elec  = f_mech * pole_pairs
BPFO    = (n_balls/2) * f_mech * (1 - Bd/Pd * cos(alpha))
BPFI    = (n_balls/2) * f_mech * (1 + Bd/Pd * cos(alpha))
BSF     = (Pd / (2*Bd)) * f_mech * (1 - (Bd/Pd)^2 * cos^2(alpha))
FTF     = (f_mech / 2) * (1 - Bd/Pd * cos(alpha))
```

**Frequences cibles recommandees (minimum viable) :**

| Index | Frequence | Lien physique | Defaut vise |
|-------|-----------|---------------|-------------|
| 0 | 1x f_mech | vibration fondamentale | D1 imbalance, gravite |
| 1 | 2x f_mech | second harmonique mecanique | D1 severe, D4 excentricite |
| 2 | BPFO | outer race | D2 bearing outer |
| 3 | BPFI | inner race | D2 bearing inner |
| 4 | BSF | ball spin | D2 bearing ball |
| 5 | FTF | cage frequency | D2 bearing cage |
| 6 | 1x f_elec | fondamentale electrique | sante generale |
| 7 | 2x f_elec | second harmonique elect. | D5 demagnetisation, D3 inter-turn |

Chaque lock-in produit 2 sorties (magnitude, phase), soit **16 features** pour 8 lock-ins.

### 2.2 Features MCSA (Motor Current Signature Analysis)

Extraites du courant i_q en repere tournant (deja demodule par le FOC) :

- Amplitude spectrale de i_q aux frequences f_elec +/- f_mech (sidebands)
- Amplitude spectrale de i_q aux harmoniques de f_mech
- RMS de i_q sur une fenetre courte (indicateur de charge)
- Variance de i_d (indicateur de sante flux)

Optionnel : amplitude des sidebands autour de f_elec dans i_a brut (MCSA classique).

### 2.3 Features vibratoires globales

Extraites de accel_x, accel_y, accel_z :

- RMS global par axe (energie vibratoire totale)
- Kurtosis par axe (indicateur d'impulsions, utile pour bearing)
- Crest factor par axe (pic / RMS, meme usage)
- Amplitude spectrale aux frequences du lock-in bank (redondance intentionnelle)

### 2.4 Vecteur de contexte gravitationnel

```
g_world    : [gx, gy, gz]  m/s^2     (vecteur gravitationnel monde)
g_body     : [gx, gy, gz]  m/s^2     (apres transformation body)
g_magnitude: float          m/s^2     (0 = microgravite, 9.81 = terre)
orientation: [roll, pitch, yaw] deg   (montage moteur)
```

Ce vecteur est une **variable de condition** du modele, pas une feature d'entree ordinaire.

### 2.5 Variables operationnelles

```
RPM          : float   (vitesse courante)
load_torque  : float   (couple de charge estime)
temperature  : float   (si disponible)
v_bus        : float   (tension bus)
```

---

## 3. Architecture NN

### 3.1 Vue d'ensemble

```
                        +------------------+
accel bank              |                  |
  lock-in x8 (16)  ---->|                  |
                        |   Feature        |
current bank            |   normalization  |
  MCSA (8)         ---->|   + concat       |----> vecteur features (F)
                        |                  |
vibration globals       |                  |
  RMS/kurtosis (9) ---->|                  |
                        +------------------+
                                |
                                v (F features)
                        +------------------+
gravity context         |                  |
  g_body (6)       ---->|   Conditioned    |
  g_magnitude (1)  ---->|   classifier     |----> logits (N_classes)
  orientation (3)  ---->|   (MLP or GBM)   |
                        |                  |
operational vars        |                  |
  RPM, load... (4) ---->|                  |
                        +------------------+
```

### 3.2 Classifieur recommande : MLP 3 couches

```python
input_dim  = F + gravity_ctx + operational  # ~40-50 features
hidden     = [128, 64, 32]
output_dim = N_classes  # healthy + D1..D5 = 6 minimum

activation = ReLU
dropout    = 0.3 (couches 1 et 2)
output     = Softmax
loss       = CrossEntropy
```

Alternative pour dataset petit : **Gradient Boosted Trees** (XGBoost, LightGBM).
Les features physiques sont deja engineered, le GBM peut surpasser le MLP
avec moins de 10 000 exemples.

### 3.3 Conditionnement gravitationnel

Le contexte gravitationnel peut etre integre de deux manieres :

**Option A : concatenation simple (baseline)**
Le vecteur gravitationnel est concatene au vecteur features avant le classifieur.
Le NN apprend implicitement la dependance.

**Option B : conditionnement explicite (recommande)**
Le premier bloc lineaire est remplace par :
```
features_conditioned = W_features * features + W_gravity * gravity_ctx + b
```
Equivalent a un FiLM layer (Feature-wise Linear Modulation).
Force le modele a encoder explicitement comment la gravite module les features.

**Option C : domaine adaptatif (avance)**
Entrainement multi-domaine : 1g / 0.5g / 0g comme domaines distincts.
Utiliser Domain Adversarial Training (DANN) pour apprendre des features
invariantes au domaine gravitationnel, puis fine-tuner par domaine.

---

## 4. Pipeline complet en temps reel (graphe SpikyPanda)

```
Motor (PMSM)
  |-- omega     --> freq_calc --> [BPFO, BPFI, BSF, FTF, f_mech, f_elec]
  |-- accel_x   --|
  |-- accel_y   --|--> Lock-in bank (8x) --> magnitudes/phases (16)
  |-- accel_z   --|
  |-- i_q       --|
  |
  |-- accel_x   --> RMS/Kurtosis/Crest --> (9)
  |-- i_q       --> MCSA features --> (8)
  |
  |-- gravity   --> contexte gravitationnel --> (10)
  |-- omega     --> variables operationnelles --> (4)
  |
  +--> concat --> normalisation --> NN --> classification --> Scope
```

Le noeud `SyncDetect` (lock-in) sera a implementer comme noeud DSP
dans le graphe SpikyPanda. Entrees : signal, frequence (float, live),
bande passante passe-bas. Sorties : magnitude, phase.

---

## 5. Hypothese de recherche associee

### Sur la signature gravitationnelle

Les features issues du lock-in bank a f_mech / 2x f_mech / BPFO / BPFI
seront significativement differentes entre :
- orientation horizontale, g = 9.81 m/s^2 (terrain)
- orientation verticale, g = 9.81 m/s^2 (terrain)
- microgravite, g = 0 m/s^2 (spatial)

### Sur la detectabilite des defauts

**Defauts gravity-sensitive (D1, D2, D4) :**
La magnitude a f_mech et aux frequences bearing va diminuer sous microgravite.
Un classifieur entraine uniquement a 1g verra ses features de detection
gravitationnelle s'effondrer.

**Defauts gravity-robust (D3, partiellement D5) :**
Les features MCSA et les harmoniques electriques resteront stables.
La detection reste possible sans adaptation au domaine gravitationnel.

**Consequence pour le dataset :**
Il faut imperativement des acquisitions sous conditions gravitationnelles variees
(orientations multiples + simulation microgravite via champ = 0)
pour couvrir l'espace des domaines que le modele devra generaliser.

### Sur la fusion multimodale

La combinaison vibration + courant sera plus robuste que l'un ou l'autre seul :
- vibration : canal principal gravite, faible sous microgravite
- courant (i_q MCSA) : canal principal defaut electromagnetique, stable sous microgravite
- fusion : couverture complementaire sur tous les regimes gravitationnels

C'est la justification principale de l'architecture multimodale CyanMycelium.

---

## 6. Prochaines etapes

- [ ] Implementer le noeud `SyncDetect` (lock-in) dans SpikyPanda
- [ ] Valider la bank de lock-ins sur les defauts D1..D5 en simulation
- [ ] Generer le dataset avec variantes gravitationnelles (g = 0, 0.5g, 1g, orientations)
- [ ] Comparer MLP vs GBM sur le dataset simule
- [ ] Identifier les features les plus sensibles a la gravite par analyse SHAP
- [ ] Documenter les degradations de performance par defaut et par regime gravitationnel
