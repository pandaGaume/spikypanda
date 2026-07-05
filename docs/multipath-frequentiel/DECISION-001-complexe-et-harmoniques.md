# Décision 001 — Latents complexes & traitement des harmoniques

**Statut :** ACTÉ · **Portée :** structurante (change le substrat, pas un réglage)
**Concerne :** `00-PAPIER.md`, `HYPOTHESES-ET-PREUVES.md`, `01-BUILD-SPEC.md`, `SpectralSynapse`

---

## La décision, en une phrase

Le substrat multi-fréquence travaille sur des latents **complexes** (amplitude *et*
phase par bande), et il **assume les harmoniques** comme phénomène de premier plan —
à la fois contrainte à contenir et ressource à exploiter. Les deux vont ensemble : la
phase est ce qui rend les harmoniques porteuses de forme.

---

## Contexte : d'où l'on part

Les premières démonstrations (H1, H2, H4, H5) ont établi le substrat, mais avec deux
simplifications qu'il faut maintenant lever :

1. **On ne lisait que le module.** La lecture (`forceA`) renvoyait `2·|X|/fenêtre` —
   l'amplitude seule. La **phase** de chaque bin (`atan2`) était calculée puis jetée.
   Nos latents vivaient donc dans ℝ₊, l'ombre réelle d'un espace naturellement
   complexe. Symptôme déjà observé : en H2 niveau 1, `×0,5` et `×−0,5` se lisaient
   pareil — le **signe est de la phase**, et on la perdait.

2. **On ne testait que la diaphonie linéaire.** La fuite mesurée en H1 était le
   débordement de *filtrage*. Les démos étaient linéaires : elles n'ont jamais vu la
   contamination **harmonique**, qui n'apparaît qu'avec la non-linéarité — c'est-à-dire
   dès que le couplage (H4) est actif.

---

## Décision 1 — Passer aux latents complexes (amplitude + phase)

**Ce qu'on acte.** Le latent d'une bande est un nombre **complexe** `z = A·e^{iφ}`
(2 degrés de liberté). Les poids du `SpectralSynapse` deviennent une **fonction de
transfert complexe** `w_b = g_b·e^{iφ_b}` (un gain *et* un déphasage), et les termes de
couplage sont complexes.

**Arguments.**
- **Capacité doublée.** Amplitude *et* phase par canal, au lieu de l'amplitude seule.
  On récupère la moitié de l'information qu'on jetait.
- **La phase est un routeur, pas un accessoire.** C'est le mécanisme de *communication
  through coherence* : deux sources ne se parlent que si elles sont *en phase*. La
  phase permet de router/gater sans décision discrète — cohérent avec toute la thèse
  « pas d'aiguillage dur ».
- **Le signe et les déphasages deviennent natifs.** Fin de l'ambiguïté de signe vue en
  H2.
- **Le couplage gagne un degré de liberté.** Multiplier deux complexes fait *tourner
  les phases* : le couplage de H4 n'est plus seulement une mise à l'échelle.
- **Ancrage spiking.** Correspondance directe : **amplitude ↔ taux** (rate code),
  **phase ↔ timing du spike** (temporal code). Rester en module = rate coding pur.
  Passer en complexe = réunir taux et timing — le foyer naturel d'un substrat spiking.
- **C'est entraînable, c'est éprouvé.** Le *Fourier Neural Operator* (Li et al., ICLR
  2021) apprend des **poids complexes par mode de fréquence** par rétropropagation à
  travers la FFT. Les opérations complexes sont dérivables (calcul de Wirtinger, ou
  chaque complexe traité comme deux réels).

**Alternative rejetée — rester en module (ℝ₊).** Plus simple, mais elle jette
précisément ce qui porte le routage (la phase) et le code temporel. On se priverait du
plus intéressant pour économiser un facteur 2 en arithmétique. Rejetée.

---

## Décision 2 — Assumer les harmoniques (contenir *et* exploiter)

**Constat de départ : elles sont inévitables.** Toute non-linéarité sur une fréquence
`f` fabrique ses multiples (`2f`, `3f`, …) ; deux bandes à travers une non-linéarité
produisent les intermodulations `|k·f_A ± m·f_B|`. Le couplage de H4 (une
multiplication) *est* le terme d'ordre 2 : `f_A ± f_B`. **Couplage et harmoniques sont
la même physique.** On ne peut pas vouloir le premier et ignorer les secondes.

**Leur double nature.**
- *Danger — une fuite qu'on n'a pas mesurée.* Si une bande tombe sur `2×` une autre, ou
  sur une somme/différence, l'auto-interaction ou le couplage y déversent de l'énergie.
  C'est une **diaphonie harmonique / d'intermodulation**, invisible en régime linéaire,
  réelle sous couplage. De plus, tout ce qui dépasse Nyquist (`fs/2`) se **replie**
  (aliasing) et peut retomber sur une bande basse.
- *Ressource — le timbre.* Un fondamental + un profil d'harmoniques = un **timbre**
  (ce qui distingue un violon d'une flûte). Une connexion peut donc être décrite par un
  fondamental et un court profil harmonique : une **signature compacte et structurée**,
  dans l'esprit de l'ADN (H5) mais plus riche qu'un gain par bande. Et le couplage
  *déplace l'énergie entre harmoniques* — ce déplacement peut **être** le calcul.

**Posture retenue : les deux.**
- *Contenir* — poser une grille de fondamentaux **inharmonique** (aucun fondamental
  n'est multiple ni somme/différence d'un autre), et **suréchantillonner** (monter
  `fs`) / limiter la bande pour éviter le repliement. Objectif : que les harmoniques
  *parasites* ne polluent pas les canaux.
- *Exploiter* — autoriser, sur une connexion, une **structure harmonique voulue** (le
  timbre) comme représentation, et laisser le couplage travailler entre harmoniques.

**Alternative rejetée — tout bande-limiter / ignorer.** Supprimer agressivement les
harmoniques tuerait le timbre et une partie de la richesse du couplage. Les ignorer
laisserait une diaphonie non maîtrisée fausser les mesures de densité. Rejetée : on les
traite, on ne les subit pas.

---

## Pourquoi les deux décisions n'en font qu'une

C'est la **phase relative des harmoniques** qui définit la *forme* de l'onde : mêmes
amplitudes mais phases différentes → dent de scie, carré, impulsion. Et une impulsion
nette — un **spike** — est une pile d'harmoniques *verrouillées en phase*. Dans
spikypanda, le spike est donc un phénomène harmonique cohérent en phase. Acter la phase
(décision 1) est exactement ce qui rend les harmoniques (décision 2) porteuses de forme
temporelle. On ne peut pas faire l'une sans l'autre.

---

## Conséquences (ce qui change concrètement)

1. **`SpectralSynapse` complexe.** `w_b = g_b·e^{iφ_b}` par bande (gain + déphasage) ;
   les gains réels d'avant deviennent le cas particulier `φ_b = 0`. Terme de couplage
   complexe.
2. **Placement inharmonique des bandes.** Règle de conception : choisir les fondamentaux
   pour qu'aucun ne soit harmonique ni somme/différence d'un autre. À vérifier
   automatiquement à la construction du graphe.
3. **Suréchantillonnage / anti-repliement.** Dès que le couplage est actif, monter `fs`
   (ou band-limiter) pour empêcher les harmoniques hautes de se replier.
4. **La densité de H1 est un plafond LINÉAIRE.** Le « ~133 canaux/arête » a été obtenu
   sans couplage. Sous couplage, la contamination harmonique réduit la densité utile :
   chiffre à re-mesurer (voir H7).
5. **Deux nouvelles hypothèses.** H6 (la phase porte info/routage) et H7 (harmoniques :
   contamination *et* code), chacune avec sa démonstration.
6. **Différentiabilité préservée.** Wirtinger / deux réels ; précédent FNO. Pas de
   blocage.
7. **Coûts assumés.** Arithmétique complexe, FFT complète (au lieu de lectures de bins
   isolés), surveillance du repliement, budget de densité revu à la baisse.

## Ce que ça ne casse pas

H1, H2, H4, H5 restent **valides comme socle** : ils sont le cas réel (phase nulle,
régime linéaire), un sous-ensemble du substrat complexe. Le passage au complexe
**étend**, il n'invalide pas. La densité de H1 devient explicitement un *plafond
linéaire*, ce qui est une précision, pas une rétractation.

## Impact sur les documents

- `HYPOTHESES-ET-PREUVES.md` : ajouter H6 et H7 ; noter le substrat complexe ; marquer
  la densité H1 comme plafond linéaire ; renvoyer ici.
- `01-BUILD-SPEC.md` : `SpectralSynapse` complexe + couplage complexe + placement
  inharmonique + suréchantillonnage.
- `00-PAPIER.md` : mentionner, en §5 (le substrat) et §8 (limites), le choix complexe
  et le compromis harmoniques.
