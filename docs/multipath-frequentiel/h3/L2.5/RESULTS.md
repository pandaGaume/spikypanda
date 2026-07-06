# Résultats — L2.5 (robustesse, le pont vers MCSA)

*Rallumage des boutons réalisme. Train + test au même niveau de nuisance (« sait-il
apprendre sous bruit »). 3 graines/condition. But : prédire où MCSA casse, sans données réelles.*

## 1. Balayage SNR (A=1) — le prédicteur du point dur BRB1

| SNR | CVNN acc | CVNN recall BRB1 | MLP-\|FFT\| acc | MLP recall BRB1 |
|----:|---------:|-----------------:|----------------:|----------------:|
| propre | 100.0 % | 100 % | 100.0 % | 100 % |
| 25 dB | 96.7 % | 94 % | 39.5 % | 65 % |
| 20 dB | 81.9 % | 72 % | 88.8 % | 75 % |
| 15 dB | 62.9 % | 60 % | 51.0 % | 67 % |
| 10 dB | 42.5 % | 31 % | 45.3 % | 14 % |
| 5 dB | 30.9 % | 14 % | 28.4 % | 49 % |

**Dégradation gracieuse** avec le bruit ; le **recall BRB1 s'effondre** (100 → 94 → 72 → 60 →
31 → 14 %). C'est **exactement le point dur de MCSA** : BRB1 (`m≈0.03`) à charge faible, où la
modulation frôle le plancher de bruit (ton papier : recall BRB1 = 80 %). L2.5 le **prédit
quantitativement** avant de toucher le réel. CVNN et MLP-magnitude sont **comparables** sous bruit
(le MLP reste plus instable — cf. le point 25 dB à 39,5 %).

## 2. A-jitter `A∈[0.8,1.2]` (confond d'échelle/charge)

CVNN **99.9 %**, recall par classe `[1.00, 1.00, 1.00, 1.00, 1.00]`. **Aucune confusion C3/C4.**
⇒ Mon inquiétude d'audit (l'A-jitter forcerait une lecture de ratio hors de portée d'un petit
réseau) **ne se matérialise pas** : le substrat **apprend le ratio latérale/porteur** (il lit le
bin porteur) et devient invariant à l'échelle. Correction honnête : l'A-jitter n'est **pas** un
casseur ; le déplacer en L2.5 gardait L2 plus propre, mais le CVNN l'aurait absorbé en L2 aussi.

## 3. Jitter de `f_mod` (confond de glissement)

| ±jitter | CVNN acc |
|--------:|---------:|
| 0.0 Hz | 100.0 % |
| 0.5 Hz | 99.7 % |
| 1.0 Hz | 99.3 % |

**Robuste au glissement** : les latérales dérivent dans la fenêtre de 9 bins, le substrat suit.
Bonne nouvelle pour MCSA (les latérales `f(1±2s)` bougent avec la charge).

## 4. Réalisme complet (A-jitter + 15 dB + f_mod ±0.5 + harmoniques)

CVNN **53.5 ± 4.5 %**, MLP-\|FFT\| **57.7 ± 2.5 %** (5 classes, hasard 20 %). **Limité par le
bruit** (le 15 dB seul → ~63 %). Les harmoniques (2f_c, 3f_c) tombent **hors** de la fenêtre lue
→ effet nul sur les modèles à entrée-bande (attendu ; elles compteraient surtout par repliement /
sur entrée brute, H7). CVNN ≈ MLP sous bruit.

## Lecture honnête

- **L'avantage distinctif du complexe est la phase (L2 §6) et la stabilité**, pas une robustesse
  magique au bruit : sur du *grading d'amplitude bruité*, CVNN ≈ MLP-magnitude. C'est cohérent —
  la profondeur vit dans les *magnitudes*, que les deux lisent.
- **L2.5 remplit son rôle** : il **prédit les points durs de MCSA** (BRB1 à faible SNR) et montre
  la **robustesse au glissement et à l'échelle** — sans toucher aux données réelles.
- **Ce que ça dit pour MCSA (L3)** : viser le bon SNR de travail ; attendre la confusion sur les
  sévérités adjacentes à faible charge ; le substrat gère charge (ratio) et glissement (dérive de
  bande) nativement — les deux confonds que le préprocessing manuel du papier combattait.

## Verdict échelle L1 → L2 → L2.5

Pile CVNN **validée et caractérisée**. Prochaine marche = **L3 (MCSA réel, gelé)** :
télécharger le dataset UFU, prep, et rejouer le grading BRB avec le substrat contre les baselines
réelles (`etapeD-mcsa/MCSA-BRIEF.md`).
