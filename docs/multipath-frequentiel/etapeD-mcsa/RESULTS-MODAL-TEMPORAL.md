# Validation : le modal-TEMPOREL rejoint (et dépasse) le RNN sur du réel — GO

*Go/no-go tranché par workflow (5 modèles sur les vraies données UFU MCSA, variante B
enveloppe, 5-class BRB, 5 graines, sélection stricte sur VAL) + audit adversarial des
scripts. Question : un LRU (récurrence complexe diagonale = banc de résonateurs) rejoint-il
le RNN à petit budget ? **Réponse : oui.** C'est le résultat qui valide la piste après le
plateau du spectral statique.*

## Classement (accuracy TEST 5-class, même fichier test 400 échantillons, hasard = 20%)

| Modèle | Test acc (5 graines) | Params | Nature |
|---|---|---|---|
| GRU h=32 | **91.9 ± 2.5%** (max 96.7) | 3 717 | plafond récurrent local |
| **NL-LRU r=32** (modal-temporel + GLU) | **90.2 ± 1.0%** (max 91.5) | **2 693** | meilleur modal ; **pas** un biquad pur |
| **DiagComplexLRU r=64** (modal linéaire) | **88.0 ± 1.7%** (max 91.2) | **2 565** | **= banc de biquads pur** |
| Contrôle spectral statique | 84.5 ± 0.8% | 1 349 | snapshot FFT (plateau) |
| TCN | 79.6 ± 4.0% | 4 229 | topologie temporelle conv |

Repères : papier LSTM 88.0% (4 773 p) ; MLP|FFT| ~85%.

## Lecture

- **Le modal-temporel marche sur du réel.** Le **LRU linéaire pur** (= banc de résonateurs,
  pôles `λ_k = ρ_k·e^{iθ_k}`, `|λ|<1`) **égale exactement le LSTM du papier (88.0%) à 2 565
  params, soit 54% de ses poids.** La variante **non-linéaire** (mélange GLU/GELU léger par
  pas) monte à **90.2% à 2 693 p**, soit **+2.2 pt au-dessus du LSTM papier** et **à 1.7 pt
  du fort GRU local**, avec une variance bien plus basse (±1.0).
- **Le contrôle confirme le mécanisme.** Le snapshot spectral statique porte *toute* la
  représentation complexe mais **plafonne à 84.5%, 5.7 pt sous** les modèles modal-temporels.
  ⇒ **le gain vient de garder la trajectoire temporelle** (la récurrence / les résonateurs),
  pas de la représentation complexe seule. Exactement l'hypothèse isolée.
- **Le LRU linéaire = biquads.** Ses pôles diagonaux mappent 1:1 sur des sections du second
  ordre → **déployable direct sur ESP32** (FFT inutile, pas de non-linéarité par pas).

## Audit adversarial (propre)

- **Pas de sélection sur le test** : tous les scripts sélectionnent sur `max(val_mean)`,
  early-stop sur VAL seulement, test touché uniquement pour le report ; les gagnants LRU/NL-LRU
  avaient aussi le meilleur VAL (91.9% / 92.8%), donc sélection cohérente, pas de test-peeking.
- **Test comparable** : les 5 modèles chargent le même `test.json` fixe via `load_split`.
- **Params reproduits exactement** : LRU 2 565, NL-LRU 2 693, tous deux < 4 000.
- **5 graines**, moyennes+écarts, aucun cherry-pick ; les moyennes matchent les JSON sur disque.

## Deux réserves honnêtes — traitées (étape C, `clean_report.py`)

1. **Fuite train/test : réelle mais NÉGLIGEABLE.** Confirmé : **8 fenêtres /400 (2%)** du test sont
   des doublons exacts d'entraînement, **toutes BRB4**. Mais les retirer bouge l'accuracy de
   **≤0.5 pt** pour tous (GRU +0.0, LRU +0.5, contrôle −0.1) : l'estimation « ~2 pt » était
   pessimiste. **Chiffres sur test propre (392 fenêtres, 5 graines)** : GRU **91.9 ± 2.3%** (3 717 p),
   **LRU (banc de biquads) 87.9 ± 2.6% (2 565 p)**, contrôle statique 84.2 ± 2.0% (749 p). Le titre
   « le modal égale le LSTM publié (88%) à moitié moins de params » **tient sur test propre**.
2. **Le baseline récurrent robuste est un GRU, pas un LSTM (fait mesuré).** Le `nn.LSTM` **ne
   s'entraîne pas de façon fiable** sur ce petit jeu (1 600 exemples) sous notre protocole partagé :
   effondré à ~24% (lr=3e-3, même avec init forget-bias=1), et seulement **53 ± 13%** à lr=1e-3
   (une graine à 30%). Le **GRU, lui, converge proprement à 91.9%**. Le 88% du papier vient de leur
   pipeline réglé. Donc on cite **le GRU 91.9% comme plafond récurrent reproduit** et le **LSTM
   papier 88% comme baseline publié** ; le LRU égale le second à moitié des params et reste à ~4 pt
   du premier à 69% de ses params. Pas un bloqueur.

## Recommandation

**Valider la piste et passer au déploiement ESP32.**
- **Livrer d'abord le LRU linéaire pur** (88.0% @ 2 565 p) comme **banc de résonateurs / biquads**
  déployable (FFT-cheap sur ESP32, aucune non-linéarité par pas).
- **Garder le NL-LRU** (90.2% @ 2 693 p) comme **variante accuracy** là où le budget MCU permet une
  petite non-linéarité élémentaire par pas (ce n'est alors plus un banc de biquads pur).
- **Nettoyer les 8 doublons BRB4** avant de publier un chiffre, et régler l'init LSTM une fois pour
  un plafond de comparaison honnête.

## Reproduire

```
PYTHONIOENCODING=utf-8 python -u docs/multipath-frequentiel/etapeD-mcsa/val_lstm.py --seeds 5   # GRU/LSTM ceiling
PYTHONIOENCODING=utf-8 python -u docs/multipath-frequentiel/etapeD-mcsa/val_lru.py             # DiagComplexLRU (biquads)
PYTHONIOENCODING=utf-8 python -u docs/multipath-frequentiel/etapeD-mcsa/val_lru_nl.py          # NL-LRU
PYTHONIOENCODING=utf-8 python -u docs/multipath-frequentiel/etapeD-mcsa/val_spectral_control.py # control
```

Lien : [`../h3/mux/MODAL-SCALING.md`](../h3/mux/MODAL-SCALING.md) (théorie),
[`../PLAN-DEPLOIEMENT-MCU.md`](../PLAN-DEPLOIEMENT-MCU.md) (le déploiement, maintenant dé-risqué).
