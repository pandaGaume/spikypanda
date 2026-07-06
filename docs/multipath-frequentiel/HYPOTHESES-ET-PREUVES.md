# Hypothèses & Preuves — le squelette du papier

**Projet :** spikypanda · substrat multi-fréquence · v0.2
**But de ce document :** poser chaque hypothèse de façon *vérifiable*, et l'associer
à une *démonstration* qui produit une évidence. C'est la colonne vertébrale d'un
futur article : l'histoire (pourquoi), les hypothèses (quoi), les preuves (comment on
sait). On note honnêtement ce qui est **prouvé**, **partiel**, ou **à démontrer**.

---

## L'histoire (la motivation, en une page)

Le point de départ est une observation devenue classique : dans un grand réseau tiré
au hasard se cache déjà un petit sous-réseau capable de faire le travail. L'information
utile est donc bien plus petite que le réseau, et tient surtout dans *quelles
connexions comptent* et *comment elles répondent*.

En tirant ce fil, une gêne apparaît : on fabrique des réseaux qui *rejouent une
solution figée*, pas des réseaux qui *portent plusieurs comportements* sur un même
tissu. Le vivant, lui, ne recâble pas un cerveau par tâche : il réutilise le même
tissu et sépare les flux d'information par le **rythme** des signaux — des ondes lentes
qui organisent, des ondes rapides qui traitent, les lentes *modulant* les rapides.

D'où l'idée du projet : garder **une seule topologie physique**, mais faire porter à
chaque connexion une **réponse qui dépend de la fréquence**. Deux conséquences se
suivent :

1. plusieurs sous-réseaux cohabitent sur le même câblage, un par bande — c'est le
   **multiplexage** ;
2. les bandes peuvent s'**influencer à dessein** — c'est le **couplage**, et c'est là
   que naît un calcul qui dépasse de simples canaux parallèles.

Tout le papier tient dans la mise à l'épreuve de ces deux affirmations, et de leurs
conséquences.

---

## Définition fondatrice : fuite ≠ couplage

Deux phénomènes se ressemblent en surface — « une fréquence en affecte une autre » —
mais sont opposés. Les distinguer proprement est le socle de tout le reste.

| | **Fuite** | **Couplage** |
|---|---|---|
| Nature | subie, accidentelle | voulue, conçue |
| Mathématique | **linéaire** (débordement de filtrage) | **non-linéaire** (multiplication) |
| Où ça apparaît | aux bins voisins (même endroit) | à de **nouvelles** fréquences `f_A ± f_B` |
| Effet | destructeur (corrompt les messages) | constructeur (source de calcul) |
| Ce qu'on veut | la **minimiser** (→ 0) | la **doser** (→ valeur choisie) |
| Apprenable ? | non (artefact physique) | oui (c'est un paramètre) |

**Point central :** minimiser la fuite n'est pas en tension avec le couplage — c'en
est le *prérequis*. Un canal propre par défaut est ce qui rend l'influence croisée
*identifiable* et *contrôlable*. On veut donc les deux : **fuite ≈ 0** ET **couplage
dosé**.

---

## Note structurante — le substrat est complexe (Décision 001)

Le latent d'une bande est un nombre **complexe** (amplitude *et* phase), pas un réel.
Les démos H1-H5 n'en ont utilisé que le **module** (l'amplitude), simplification
lossy qu'on lève désormais. Les poids `SpectralSynapse` deviennent des fonctions de
transfert complexes `w_b = g_b·e^{iφ_b}`. Les harmoniques sont assumées (contrainte à
contenir + ressource « timbre »). Justification argumentée et conséquences :
**`DECISION-001-complexe-et-harmoniques.md`**. Cela ajoute H6 et H7 ci-dessous, et
étend (sans invalider) H1-H5, qui sont le cas réel/linéaire du substrat.

## Les hypothèses

Récapitulatif de l'état des preuves :

| # | Hypothèse | Démonstration | État |
|---|---|---|---|
| **H1** | Plusieurs messages cohabitent sur une arête sans se mélanger (multiplexage propre) | `etapeA/multipath-standalone.mjs` | ✅ **prouvé (mesuré)** |
| **H2** | Une même topologie porte des comportements *distincts*, un par bande, lus indépendamment | `etapeA/heterogeneite-standalone.mjs` | ✅ **prouvé (mesuré)** |
| **H3** | Le multi-chemin fréquentiel remplace le routage discret, tout en restant dérivable | comparatif entraîné (étape B+) | 🟢 **partiel verrouillé (mesuré)** |
| **H4** | La puissance de calcul vient du **couplage non-linéaire**, pas du multiplexage seul | `etapeA/couplage-standalone.mjs` | ✅ **prouvé (mesuré)** |
| **H5** | La réponse en fréquence est une description *compacte* du comportement (l'« ADN ») | `etapeA/compacite-standalone.mjs` | ✅ **prouvé (mesuré)** |
| **H6** | La **phase** porte de l'information et permet de router (au-delà de l'amplitude) | `etapeA/phase-standalone.mjs` | ✅ **prouvé (mesuré)** |
| **H7** | Les **harmoniques** sont contamination (sous couplage) *et* code structuré (timbre) | `etapeA/harmoniques-standalone.mjs` | ✅ **prouvé (mesuré)** |

---

### H1 — Coexistence sans collision (multiplexage propre)

**Énoncé.** Plusieurs signaux placés sur des bandes distinctes traversent la même
arête *en même temps* et se re-séparent proprement à la sortie, avec une fuite
inter-bande sous un seuil fixé (5 %).

**Prédiction testable.** En excitant une bande à la fois et en lisant les autres, le
débordement doit rester ≪ 5 % tant que les bandes sont bien placées ; et il doit
exister un régime (bandes trop serrées + hors-bins) où il explose — la limite.

**Démonstration.** `etapeA/multipath-standalone.mjs` (4 scénarios + balayage de densité).

**Résultat — MESURÉ.**
- Bandes bien placées (sur les bins) : fuite **0,0000 %**, fidélité **exacte**.
- Réaliste (Hann, espacées) : fuite **0,0002 %** (fidélité −15 %, « scalloping »).
- Stress (serrées + hors-bins) : fuite **26 %** → le mur existe.
- Densité : **~133 canaux/arête** (Hann) vs ~26 (rectangulaire).

**Verdict :** ✅ **Prouvé, avec conditions** — la séparation est sans perte quand les
porteuses sont bin-alignées ; la limite de densité est cartographiée.

> ⚠️ **Ce chiffre de densité est un plafond LINÉAIRE** (mesuré sans couplage). Sous
> couplage (H4), la contamination harmonique/d'intermodulation le réduit — densité
> réelle à re-mesurer en H7 (voir Décision 001).

---

### H2 — Comportements distincts sur une même topologie

**Énoncé.** En donnant à chaque bande sa propre réponse, une *seule* topologie porte
simultanément des **fonctions différentes** (p.ex. une bande additionne, une autre
compare), lues séparément et sans interférence.

**Prédiction testable.** Deux fonctions connues `g_1, g_2` appliquées chacune à sa
bande sur la même arête ; en sortie on lit `g_1(entrée)` sur la bande 1 et
`g_2(entrée)` sur la bande 2, chacune correcte à la tolérance de fuite près ; couper
une bande ne change pas l'autre.

**Démonstration.** `etapeA/heterogeneite-standalone.mjs` — une **échelle
d'hétérogénéité** à trois niveaux, du plus faible au plus fort :
- *Niveau 0* — deux tâches indépendantes (même nature) → prouve la **capacité** ;
- *Niveau 1* — deux fonctions du même signal → prouve la **diversité de traitement** ;
- *Niveau 2* — un canal **linéaire** + un canal **non-linéaire** (produit `a·b` via
  couplage) sur un même fil → prouve l'**hétérogénéité**. C'est le barreau décisif.

*(Sans apprentissage : fonctions fixées à la main — on teste le porteur, pas encore le
réglage.)*

**Résultat — MESURÉ.**
- Niveau 0 : sorties `0,800` / `0,300`, indépendance vérifiée → **PASS**.
- Niveau 1 : `g1=2x` et `g2=0,5x` suivis exactement, rapport constant 4,0 → **PASS**.
- Niveau 2 : canal linéaire `w·a` (insensible à `b`), canal produit `a·b` ; en
  doublant `a` et `b`, le linéaire fait **×2,00** et le non-linéaire **×4,00** →
  **PASS**. Deux natures de réponse coexistent sur le même fil.

**Verdict :** ✅ **Prouvé (mesuré)** — le substrat porte des calculs de natures
différentes simultanément, chacun lisible séparément. Le niveau 2 est la figure forte
du papier.

---

### H3 — Remplacer le routage discret, sans perdre la dérivabilité

**Énoncé.** Là où un système classique doit *choisir* un chemin par une décision
tout-ou-rien (difficile à régler par gradient), la version fréquentielle obtient le
même effet par superposition + filtrage, qui sont **linéaires et dérivables**.

**Prédiction testable.** Le gradient traverse la chaîne encoder → sommer → filtrer →
décoder ; et sur une petite tâche à deux régimes, la version fréquentielle se règle
plus stablement qu'une version à aiguillage dur.

**État.** 🟢 **Partiel verrouillé (mesuré, étape B+).** Le comparatif entraîné existe
maintenant dans le vrai moteur (`SpectralTrainingRuntime` + rétropropagation analytique
sur `gain`/`phase`). Sur une tâche de **fondu continu** de deux comportements sur une
connexion, la réponse en fréquence apprend le mélange **exactement** (loss au bruit
numérique, 0/20 échec) là où un gate dur reste à un **plancher structurel** (il ne sait
que sélectionner, pas mélanger). Nuance honnête : le régime propre du substrat est le
mélange **lisse** ; une commutation brutale reste une décision non lisse que les deux
substrats apprennent mal. Détail : `etapeC/RESULTATS-H3.md`. **Plan des jalons suivants
(plasticité, récompense, sélection, ADN) : `02-ROADMAP-JALONS.md`.**

---

### H4 — La puissance vient du couplage non-linéaire

**Énoncé.** Le multiplexage seul (canaux indépendants) n'ajoute aucune puissance de
calcul. Le gain vient d'un croisement **non-linéaire** entre bandes : une bande
module une autre (multiplication), ce qui crée de l'énergie à `f_A ± f_B`.

**Prédiction testable.**
- couplage coupé (m=0) → aucune bande latérale (silence à `f_A ± f_B`) ;
- couplage activé → bandes latérales à `f_A ± f_B`, d'amplitude prévisible `A·m/2`,
  **sans** abîmer la porteuse ;
- **dosable** : l'amplitude latérale suit linéairement `m` ;
- **localisé** : rien n'apparaît ailleurs (sinon ce serait de la fuite).

**Démonstration.** `etapeA/couplage-standalone.mjs` (modulation d'amplitude ; tests
A/B/C/D).

**Résultat — MESURÉ.**
- Test A : latérales ≈ 0 à m=0 → **PASS**.
- Test B : à m=0,5, latérales ≈ 0,250 chacune, porteuse ≈ 1,000 → **PASS**.
- Test C : loi latérale = m/2 respectée sur m ∈ [0 ; 0,8] → **PASS**.
- Test D : point témoin (140 Hz) = 0,0000 → couplage localisé, pas de fuite → **PASS**.

**Verdict :** ✅ **Prouvé (mesuré)** — on sait faire qu'une bande en module une autre,
à la demande, dans la bonne dose, sans abîmer le canal ni polluer ailleurs. Le
couplage non-linéaire est établi comme brique contrôlable.

---

### H5 — La réponse en fréquence comme description compacte (« ADN »)

**Énoncé.** Une part du comportement du réseau se range dans une description compacte
de « comment chaque connexion répond à chaque fréquence » (quelques nombres par
connexion : bandes, poids, termes de couplage) plutôt que dans une longue liste de
poids scalaires. Cette description est la *règle génératrice* recherchée.

**Prédiction testable.** Un comportement qui, en poids scalaires classiques,
demanderait N paramètres, est reproduit par une réponse en fréquence à ≪ N
paramètres — avec une erreur bornée.

**Démonstration.** `etapeA/compacite-standalone.mjs` : un même comportement (un profil
de gains) décrit de deux façons — **K nombres en fréquence** vs **~N nombres en
temps** — donnant la même sortie. Puis le test décisif : à *budget égal* (K nombres),
la description fréquentielle est exacte, la temporelle est cassée.

*(Hypothèse de travail assumée : les comportements utiles sont « structurés en
bandes ». C'est la thèse même du substrat.)*

**Résultat — MESURÉ.**
- Test 1 : modèle fréquence (4 nombres) reproduit la cible, erreur **0,00 %** → **PASS**.
- Test 2 : le même comportement en temps occupe **150/256 taps** non négligeables
  (information éparpillée).
- Test 3 : à budget égal (4 nombres), fréquence **0,00 %** vs temps **28,5 %** (cassé).
  Et même **128 taps** temporels ne descendent qu'à **5,5 %** — le temps ne rattrape
  jamais vraiment 4 nombres de fréquence.
- Compression : ~**64×** (N/K = 256/4).

**Verdict :** ✅ **Prouvé (mesuré)** — le comportement a un « ADN » court : quelques
gains en fréquence, là où les poids classiques s'étalent sur ~N nombres.

---

### H6 — La phase porte de l'information et permet de router *(Décision 001)*

**Énoncé.** Le latent est complexe : au-delà de l'amplitude, la **phase** transporte de
l'information et peut *gater* la communication entre bandes (au sens de la
« communication through coherence » : deux sources ne se couplent que si elles sont en
phase), sans décision discrète.

**Prédiction testable.** Deux signaux de **même amplitude** mais de **phases
différentes** sont distinguables à la lecture (partie réelle/imaginaire, ou phase) ; et
un couplage peut être rendu *dépendant de la phase relative* (fort en phase, nul en
opposition de phase).

**Démonstration.** `etapeA/phase-standalone.mjs` (tests A/B/C/D).

**Résultat — MESURÉ.**
- A : deux réels (I=0,700, Q=−0,300) lus sur une seule fréquence → capacité ×2 → **PASS**.
- B : phase lue = phase visée (0°/45°/90°/135°), amplitude constante 1,000 → **PASS**.
- C : amplitude combinée = `2·|cos(Δφ/2)|` — 2,000 en phase, 0,000 en opposition
  (routage sans aiguillage) → **PASS**.
- D : deux signaux de même amplitude (1,000) mais `(I,Q)=(1,0)` vs `(0,1)` : confondus
  en amplitude, distincts en complexe → **PASS**.

**Verdict :** ✅ **Prouvé (mesuré).** Le latent est bien complexe : la phase double la
capacité *et* sert de routeur. Entraînabilité éprouvée par le *Fourier Neural Operator*.

### H7 — Les harmoniques : contamination *et* code *(Décision 001)*

**Énoncé.** Sous couplage non-linéaire, les harmoniques et intermodulations sont
inévitables. Elles sont (a) une **contamination** à contenir — une bande placée sur un
harmonique/somme d'une autre reçoit de l'énergie parasite — et (b) une **ressource** :
un profil harmonique (« timbre ») est une signature compacte et structurée.

**Prédiction testable.**
- *(a) contamination* : sous couplage, mesurer l'énergie parasite reçue par une bande
  placée sur `2f` ou `f_A+f_B` ; en déduire un placement **inharmonique** et le **vrai
  budget de densité** (corrige le plafond linéaire de H1).
- *(b) code* : un timbre (fondamental + quelques harmoniques, en amplitude *et* phase)
  encode une signature distincte, lisible et séparable d'un autre timbre.

**Démonstration.** `etapeA/harmoniques-standalone.mjs` (volet A : contamination + volet
B : timbre).

**Résultat — MESURÉ.**
- A.1 : sous `y = x + 0,4·x²`, parasites à `2fA`=0,200, `2fB`=0,200, `fA+fB`=0,400,
  `fB−fA`=0,400 ; bande inharmonique témoin = 0,0000 → placement inharmonique justifié.
- A.2 : le 2ᵉ harmonique de 300 Hz se replie sur 400 Hz à `fs=1000` (fantôme = 0,500) ;
  propre (0,0000) à `fs=2000` → suréchantillonnage justifié.
- B : deux timbres `[1;0,5;0,25]` et `[1;0;0,6]` lus exactement, reconnaissance
  correcte (distance 0,00 au bon timbre) ; 3 nombres = une signature. Phase des
  harmoniques : même spectre d'amplitude, forme d'onde distincte (lien au spike).

> Note : un micro-test d'illustration (crête sous inversion d'un harmonique) était mal
> choisi — une inversion de π conserve la crête par symétrie. Remplacé par une métrique
> robuste (même spectre d'amplitude, formes d'onde distinctes). Le cœur de H7 (A.1, A.2,
> timbre) n'était pas affecté.

**Verdict :** ✅ **Prouvé (mesuré).** Harmoniques inévitables sous couplage : contenues
(inharmonique + suréchantillonnage) et exploitables (timbre). **Corrige la densité de
H1 à la baisse** (le ~133 était un plafond linéaire).

---

## Feuille de route des démonstrations restantes

1. ✅ **H4 — fait** : `couplage-standalone.mjs` (4 tests au vert).
2. ✅ **H2 — fait** : `heterogeneite-standalone.mjs` (3 niveaux, ×2 vs ×4 au niveau 2).
3. ✅ **H5 — fait** : `compacite-standalone.mjs` (4 nb exacts, ~64× de compression).
4. ✅ **H6 — fait** : `phase-standalone.mjs` (4 tests au vert).
5. ✅ **H7 — fait** : `harmoniques-standalone.mjs` (contamination + repliement + timbre ;
   métrique de forme corrigée).
6. **H3 — reporter** au jalon apprentissage (comparatif fréquentiel vs routage dur).

H6-H7 découlaient de la **Décision 001** (substrat complexe + harmoniques). Le socle
« autonome » est désormais **complet** : 6 hypothèses sur 7 prouvées par démonstration
(seul H3 dépend de l'apprentissage). L'étape B les portera dans spikypanda via
l'abstraction `SpectralSynapse` (fonction de transfert **complexe** par bande + terme
de couplage complexe), avec des tests jest qui rejouent ces mesures.

---

## Ce que ça donnerait comme papier (structure)

- **Introduction / histoire** : du billet gagnant au substrat partagé ; solveur vs
  porteur de comportements ; l'inspiration des rythmes cérébraux.
- **Définition** : fuite vs couplage (la clarification centrale).
- **Substrat** : réponse en fréquence par connexion ; multiplexage + couplage.
- **Expériences** : H1 (séparation + densité), H4 (couplage dosable), H2 (comportements
  distincts), H5 (compacité). Chaque figure = la sortie d'un des scripts.
- **Discussion honnête** : le mur de densité, le coût matériel (fait pour le
  neuromorphique/optique, pas le GPU), le multiplexage sans couplage qui n'apporte
  rien, la dérivabilité préservée.
- **Positionnement** : couplage inter-fréquences en neuro (Fries 2005 ; Lisman &
  Jensen 2013) ; multiplexage optique en longueur d'onde (Feldmann et al. 2021 ; Tait
  et al. 2017) ; poids dépendants de la fréquence, entraînables (Li et al., *Fourier
  Neural Operator*, 2021). Sur l'« ADN » : goulot génomique (Zador 2019 ; Shuvaev et
  al. 2024) et sa limite théorique (Kumar et al., *No Free Prune*, 2024). Notre apport
  = l'assemblage dans un graphe de calcul généraliste, avec le couplage dosé comme
  cœur.

**Nouveauté visée :** non pas une brique isolée, mais un *substrat de calcul* où
multiplexage propre et couplage non-linéaire dosé cohabitent sur une topologie fixe,
avec des démonstrations reproductibles à chaque étage.

**Limites assumées :** pas encore d'apprentissage (les fonctions sont fixées à la
main) ; efficacité réelle liée au matériel (fait pour le neuromorphique/optique, pas
le GPU) ; passage à l'échelle non traité. Ce sont les jalons 2+ (plasticité,
récompense, sélection), qui s'appuieront sur : plasticité neuromodulée (Miconi et al.,
*Backpropamine*, 2019 ; Frémaux & Gerstner 2016), réseaux plastiques évolués
(Soltoggio, Stanley & Risi, *Born to Learn*, 2018), et mémoire au test (*TTT*, Sun et
al. 2024 ; *Titans*, Behrouz et al. 2025).

---

## Références

La bibliographie complète — le papier initial, tous les fils de recherche cités, et la
carte reliant chaque groupe à la section/hypothèse qu'il soutient — est dans
**`BIBLIOGRAPHIE.md`** (11 thèmes, du billet gagnant au calcul photonique).

Ancrages principaux par pilier :
- **Point de départ** : Frankle & Carbin, *The Lottery Ticket Hypothesis* (2019).
- **H1 (multiplexage)** & **H4 (couplage)** : Fries (2005) ; Lisman & Jensen (2013) ;
  Feldmann et al. (2021).
- **H5 (compacité / ADN)** : Zador (2019, 2024) ; Li et al., *Fourier Neural Operator*
  (2021).
- **Limite fondamentale** : Kumar, Luo & Sellke, *No Free Prune* (2024).
