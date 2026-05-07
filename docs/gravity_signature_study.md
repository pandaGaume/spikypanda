# Etude : Signature gravitationnelle dans un PMSM en simulation

**Date :** 2026-05-07
**Auteur :** Guillaume Pelletier / CyanMycelium
**Contexte :** Proposition DotVision, Phase 1

---

## 1. Terrain d'experimentation

### Moteur simule

Maxon ECX PRIME 6M / 16L (PMSM, modele MAXON_ECX_PRIME_6M_16L) :

| Parametre | Valeur |
|-----------|--------|
| Tension nominale | 24 V DC |
| Vitesse nominale | 3000 RPM (50 rps) |
| Courant nominal | 2 A |
| Poles paires | 1 |
| Resistance de phase | 2.0 ohm |
| Inductance (Ld = Lq) | 0.3 mH |
| Constante de flux | 2 mWb |
| Inertie rotor | 1e-6 kg.m^2 |
| Amortissement visqueux | 1e-7 N.m.s/rad |

### Controleur FOC

- Bande passante boucle courant : ~1 kHz
- Bande passante boucle vitesse : ~100 Hz
- PWM : 20 kHz

### Modeles d'environnement actifs (Phase 1)

- **RotorSagModel** : sag statique + force UMP rotative (k_UMP = 4000 N/m)
- **BearingPreloadModel** : precharge axiale/radiale (5 N)
- **MountingComplianceModel** : compliance de fixation (100 g / 500 Hz / 2% zeta)

### Parametres physiques cles

```
Sag statique : delta = m_rotor * g_perp / k_bearing
             = 0.03 * 9.81 / 1e5 = 2.94 um
Excentricite : epsilon = delta / g0
             = 2.94e-6 / 5e-4 = 0.6%

Force UMP rotative : F = k_UMP * delta
                   = 4000 * 2.94e-6 = 11.8 mN

Acceleration housing : a = F / m_motor
                     = 11.8e-3 / 0.1 = 0.118 m/s^2
```

### Instrumentation simulee

| Canal | Fs | Bruit |
|-------|-----|-------|
| accel_x, accel_y | 4000 Hz | sigma = 11 mm/s^2 |
| accel_z | 4000 Hz | sigma = 11 mm/s^2 |
| i_a, i_b, i_c | 20 000 Hz | negl. |
| i_d, i_q (dq frame) | 20 000 Hz | bruit PWM ~3 mA RMS |

---

## 2. Methode

### Graphe de traitement

```
Motor (PMSM) [gravite = earth, orientation = horizontal]
    |-- accel_x --> FFT (N=8192, hop=4096) --> Scope.spectrum
    |-- i_q     --> (optionnel) FFT pour comparaison
    |-- WorldGravity (toggleable) --> gravity input motor
```

- FFT : fenetrage Hanning, N = 8192 samples, hop = 4096 (50% overlap)
- Resolution frequentielle : Fs/N = 4000/8192 = 0.488 Hz/bin
- Frequence cible : f_mech = 50 Hz (bin exact : 102)

### Protocole de validation

1. Lancer la simulation, orientation horizontale, gravite = earth
2. Attendre stabilisation (~0.5 s)
3. Observer FFT de accel_x : pic attendu a 50 Hz
4. Desactiver le noeud WorldGravity (toggle OFF)
5. Observer la disparition du pic dans la FFT

---

## 3. Resultats observes

### accel_x

**Resultat :** pic net et isole a 50 Hz, amplitude ~60 mm/s^2 dans la FFT  
(= ~120 mm/s^2 amplitude pic sinusoidal, coherent avec la prediction 118 mm/s^2)

Le plancher de bruit est quasi nul. Le signal est tres lisible avec N = 8192.

Le pic disparait quand WorldGravity est desactive.

### i_q

**Resultat :** plancher de bruit uniforme (~0.1-0.3 mA/bin RMS).  
Le pic a 50 Hz existe theoriquement (~5 mA) mais il est noye dans le bruit  
de quantification/PWM (~3 mA RMS).

La boucle de courant FOC (BW = 1 kHz >> f_mech = 50 Hz) rejette presque  
entierement la perturbation gravitationnelle.

---

## 4. Conclusions physiques

### 4.1 Canal utile pour la signature gravitationnelle

**Les vibrations (accel_x / accel_y) sont le canal principal de la signature gravitationnelle.**

La gravite agit d'abord comme :
- une force mecanique sur le housing (via UMP rotative) ;
- un preload bearing ;
- une modulation d'excentricite de rotor.

Ces effets se traduisent directement en vibration mecanique a 1x f_mech.

### 4.2 Pourquoi i_q ne voit presque pas la gravite sur un petit PMSM moderne

La perturbation mecanique gravitaire doit depasser simultanement :
1. la capacite de rejet du FOC (boucle courant a 1 kHz) ;
2. le bruit electrique (ripple PWM, bruit ADC).

Sur les petits PMSM modernes (Maxon ECX, Faulhaber BX4, Portescap Ultra EC) :
- rotor leger (epsilon ~ 0.6%) ;
- bearings precis ;
- FOC rapide ;
- PWM haute frequence.

=> La composante gravitaire dans i_q devient inferieure au plancher de bruit.

**La signature gravitationnelle devient visible dans i_q quand :**
- moteur lourd ou de grande puissance ;
- rotor desequilibre ;
- air-gap faible ou excentricite forte ;
- charge importante ;
- bande passante FOC limitee (commande six-step, variateur bas de gamme) ;
- PWM basse frequence ;
- faible resolution ADC.

Le parametre cle est le rapport :
```
perturbation mecanique / capacite de rejet FOC
```

### 4.3 Effet de la disparition de la gravite sur les signatures de defaut

**La gravite ne cree pas les defauts : elle amplifie leur mecanisme d'excitation.**

Quand la gravite disparait (microgravite), certaines signatures de defaut  
diminuent fortement, voire deviennent difficiles a detecter.

| Defaut | Sensibilite a la gravite | Mecanisme |
|--------|--------------------------|-----------|
| D1 Balourd (imbalance) | Forte | La gravite cree une charge radiale statique qui amplifie la vibration 1x. Sans gravite, plus de direction privilegiee, vibration plus symetrique. |
| D2 Bearing fault | Tres forte | Les defauts bearing deviennent visibles parce qu'une charge appuie les billes sur la bague defectueuse. Sans gravite : moins de preload, moins d'impact, BPFI/BPFO plus faibles, SNR plus mauvais. |
| D3 Inter-turn short | Faible | Defaut principalement electrique. Reste visible meme en microgravite. |
| D4 Excentricite | Forte | Rotor sag + air-gap asymetrique + modulation flux. Sans gravite : rotor recentre, air-gap plus uniforme, sidebands diminuent. |
| D5 Demagnetisation | Moyenne | Principalement electrique, mais les couplages vibratoires secondaires peuvent amplifier certaines composantes avec la gravite. |

**Hypothese scientifique centrale du projet :**

> La microgravite ne supprime pas les defauts.
> Elle reduit ou modifie leur mecanisme d'excitation,
> et donc leur signature observable.

Consequence directe pour le machine learning :
- un modele entraine au sol peut echouer en microgravite ;
- certaines features spectrales deviennent non discriminantes ;
- la fusion multimodale vibration + courant devient critique ;
- l'orientation du moteur devient une variable de contexte importante.

### 4.4 Chainage causal complet

```
gravite
  --> contraintes mecaniques (sag, preload, excentricite)
    --> couplage electromecanique (flux, UMP, couple perturbateur)
      --> modulation spectrale (sidebands, harmoniques, 1x mech)
        --> visibilite des defauts dans vibration ET courant
```

**La gravite est un operateur de visibilite des defauts, pas leur cause.**

---

## 5. Questions ouvertes

### 5.1 Gain synchrone a f_mech (deterministe par RPM)

Oui, il est possible d'appliquer un gain selectif a f_mech = RPM/60 pour  
amplifier la signature gravitationnelle dans le signal de courant.

Deux approches :
1. **Filtre resonnant (IIR en peigne)** : gain infini en bande etroite autour de f_mech.
   Coherent avec un observateur de perturbation repetitive (Repetitive Control).
2. **Detection synchrone (lock-in amplifier)** : multiplier le signal par  
   cos(2*pi*f_mech*t) et sin(2*pi*f_mech*t), puis passer par filtre passe-bas.
   Extrait amplitude et phase exactement a f_mech, immune au bruit off-band.

La detection synchrone est particulierement propre car f_mech est connu  
exactement via le signal omega du moteur. C'est l'equivalent d'une FFT a  
une seule frequence, mais causale et en temps reel.

### 5.2 Defauts gravity-sensitive vs gravity-robust

Les defauts se classent naturellement en deux categories :

- **Gravity-sensitive** (D1, D2, D4) : signature fortement modulee par l'orientation  
  et l'amplitude du vecteur gravitationnel. Ces defauts sont potentiellement  
  difficiles a detecter en microgravite avec un modele entraine au sol.

- **Gravity-robust** (D3, partiellement D5) : signature principalement electrique,  
  peu dependante de la gravite. Ces defauts restent detectables en microgravite.

Cette classification est une propriete discriminante forte pour le ML :  
la variation de signature entre 1g et 0g est une feature en soi.

---

## 6. Implications pour l'architecture CyanMycelium

- **Canal principal gravite** : accel_x / accel_y, FFT a N >= 8192
- **Canal principal defaut electromagnetique** : i_d / i_q (MCSA)
- **Fusion multimodale** : vibration + courant = objectif de CyanMycelium
- **Variable de contexte critique** : vecteur gravitationnel (orientation + amplitude)
- **Dataset** : necessite des acquisitions a differentes orientations et sous-gravitaire  
  pour capturer la dependance gravitationnelle des defauts

Le fait que la gravite soit un "amplificateur de signatures" implique que  
le contexte gravitationnel doit etre encode comme feature d'entree du modele  
(ou utilise comme condition de domaine dans un modele conditionnel).
