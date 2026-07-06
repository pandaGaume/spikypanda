# Bibliographie

*Références mobilisées dans la construction du projet — du papier initial au substrat
multi-fréquence. Organisées par fil thématique ; chaque groupe indique **ce qu'il
soutient** dans notre argument.*

> **État de vérification.** Une passe de vérification a confirmé les références qui
> portent l'argument : Frankle & Carbin (LTH), *No Free Prune* (Kumar, Luo & Sellke,
> ICML 2024), goulot génomique (Shuvaev et al., PNAS 2024), *Fourier Neural Operator*
> (Li et al., ICLR 2021, arXiv:2010.08895), Feldmann et al. (Nature 589, 2021), Wright
> et al. (Nature 601, 2022), *Backpropamine* (Miconi et al., ICLR 2019), *Loss of
> plasticity* (Dohare et al., Nature 632, 2024), *TTT* (arXiv:2407.04620), *Titans*
> (arXiv:2501.00663), *Theta-Gamma / CtC* (PLoS Comp Biol 2016). **Correction
> apportée** : « Neural Network Diffusion » (Wang et al.) = arXiv:2402.13144 ; le
> 2402.18153 est le papier distinct de Soro et al. Les entrées §4-§8 non listées
> ci-dessus sont fiables mais restent à recontrôler (année/venue) au moment de la
> rédaction finale.

---

## 0. Le point de départ

- **Frankle, J. & Carbin, M.** (2019). *The Lottery Ticket Hypothesis: Finding Sparse,
  Trainable Neural Networks.* ICLR (arXiv:1803.03635). — **Le papier dont on est
  partis.** L'idée que l'information utile d'un réseau tient dans un petit sous-réseau
  + son initialisation.

## 1. Parcimonie, billets gagnants, limites du pruning

*→ soutient : l'histoire (l'information utile est petite) et la définition de ce qu'on
cherche à dépasser.*

- **Zhou, H., Lan, J., Liu, R. & Yosinski, J.** (2019). *Deconstructing Lottery
  Tickets: Zeros, Signs, and the Supermask.* NeurIPS. — Les *supermasks* : un
  sous-réseau non entraîné marche déjà.
- **Ramanujan, V., Wortsman, M., Kembhavi, A., Farhadi, A. & Rastegari, M.** (2020).
  *What's Hidden in a Randomly Weighted Neural Network?* CVPR. — Un sous-réseau
  performant existe dans un réseau purement aléatoire.
- **Lee, N., Ajanthan, T. & Torr, P.** (2019). *SNIP: Single-shot Network Pruning based
  on Connection Sensitivity.* ICLR.
- **Wang, C., Zhang, G. & Grosse, R.** (2020). *Picking Winning Tickets Before Training
  by Preserving Gradient Flow (GraSP).* ICLR.
- **Tanaka, H., Kunin, D., Yamins, D. & Ganguli, S.** (2020). *Pruning neural networks
  without any data by iteratively conserving synaptic flow (SynFlow).* NeurIPS. —
  Règles de saillance a priori sur l'importance des connexions.
- **Kumar, T., Luo, K. & Sellke, M.** (2024). *No Free Prune: Information-Theoretic
  Barriers to Pruning at Initialization.* ICML (arXiv:2402.01089). — **La barrière
  théorique** : un bon masque doit contenir de l'information sur les données ; on ne
  peut pas l'écrire a priori. Justifie pourquoi l'« ADN » ne peut pas être purement
  indépendant de la tâche.

## 2. L'« ADN » : goulot génomique & encodage génératif

*→ soutient : H5 (description compacte) et toute la thèse « règle génératrice plutôt
que stock de poids ».*

- **Zador, A.** (2019). *A critique of pure learning and what artificial neural
  networks can learn from animal brains.* Nature Communications, 10, 3770. — Le génome
  encode une machinerie d'apprentissage, pas les poids.
- **Shuvaev, S., Lachi, D., Koulakov, A. & Zador, A.** (2024). *Encoding innate ability
  through a genomic bottleneck.* PNAS, 121(38). — **Le goulot génomique** : un petit
  réseau *g* engendre les poids d'un grand réseau *p*. Le candidat le plus proche de
  notre « ADN ».
- **Stanley, K. O.** (2007). *Compositional Pattern Producing Networks: A Novel
  Abstraction of Development.* GPEM. — Les CPPN : générer les poids par une fonction
  des coordonnées.
- **Stanley, K. O., D'Ambrosio, D. & Gauci, J.** (2009). *A Hypercube-Based Encoding for
  Evolving Large-Scale Neural Networks (HyperNEAT).* Artificial Life.
- **Ha, D., Dai, A. & Le, Q.** (2017). *HyperNetworks.* ICLR (arXiv:1609.09106). — Un
  petit réseau produit les poids d'un grand.
- **Gaier, A. & Ha, D.** (2019). *Weight Agnostic Neural Networks.* NeurIPS. — La
  structure porte le calcul, les poids presque rien.

## 3. Générer les poids / l'espace des poids comme objet

*→ soutient : la faisabilité d'une « règle génératrice » entraînable (H5, jalons
futurs).*

- **Wang, K., Tang, D., Zeng, B., Yin, Y., Xu, Z., Zhou, Y., Zang, Z., Darrell, T.,
  Liu, Z. & You, Y.** (2024). *Neural Network Diffusion (p-diff).* arXiv:2402.13144. —
  Un modèle de diffusion latent produit directement des poids performants.
- **Soro, B., Andreis, B., Lee, H., Chong, S., Hutter, F. & Hwang, S. J.** (2024).
  *Diffusion-Based Neural Network Weights Generation.* arXiv:2402.18153 (ICLR 2025). —
  Génère des poids conditionnés au jeu de données, pour le transfert.
- **Zeng, B., Yin, Y., Xu, Z. & Liu, Z.** (2025). *Generative Modeling of Weights:
  Generalization or Memorization?* arXiv:2506.07998. — Nuance honnête : ces générateurs
  mémorisent souvent plutôt qu'ils ne découvrent une vraie règle.

## 4. Paysage de perte, symétries, minima plats

*→ soutient : la discussion « ce qui contraint l'apprentissage » et H3 (dérivabilité,
routage).*

- **Dauphin, Y., et al.** (2014). *Identifying and attacking the saddle point problem
  in high-dimensional non-convex optimization.* NeurIPS. — En haute dimension, les
  points-selle, pas les minima locaux.
- **Choromanska, A., et al.** (2015). *The Loss Surfaces of Multilayer Networks.*
  AISTATS.
- **Li, H., Xu, Z., Taylor, G., Studer, C. & Goldstein, T.** (2018). *Visualizing the
  Loss Landscape of Neural Nets.* NeurIPS. — Les skip-connections lissent le paysage.
- **Ainsworth, S., Hayase, J. & Srinivasa, S.** (2023). *Git Re-Basin: Merging Models
  modulo Permutation Symmetries.* ICLR. — Symétries de permutation / re-basin.
- **(2025).** *Sparse Training from Random Initialization: Aligning Lottery Ticket
  Masks using Weight Symmetry.* ICML. — Pourquoi les masques ne se transfèrent pas :
  bassins désalignés.
- **Foret, P., Kleiner, A., Mobahi, H. & Neyshabur, B.** (2021). *Sharpness-Aware
  Minimization (SAM).* ICLR. — Chercher des minima *plats*.

## 5. Apprendre à apprendre, plasticité, neuromodulation

*→ soutient : les jalons 2-4 (plasticité locale, récompense) et le cadrage « porteur
qui apprend ».*

- **Andrychowicz, M., et al.** (2016). *Learning to learn by gradient descent by
  gradient descent.* NeurIPS.
- **Finn, C., Abbeel, P. & Levine, S.** (2017). *Model-Agnostic Meta-Learning (MAML).*
  ICML. — Méta-apprendre une bonne initialisation.
- **Nichol, A., Achiam, J. & Schulman, J.** (2018). *On First-Order Meta-Learning
  Algorithms (Reptile).* arXiv:1803.02999.
- **Schmidhuber, J.** (1992). *Learning to control fast-weight memories.* Neural
  Computation. — Les *fast weights* : un réseau modifie rapidement les poids d'un autre.
- **Schlag, I., Irie, K. & Schmidhuber, J.** (2021). *Linear Transformers Are Secretly
  Fast Weight Programmers.* ICML.
- **Miconi, T., Stanley, K. & Clune, J.** (2018). *Differentiable plasticity.* ICML.
- **Miconi, T., Rawal, A., Clune, J. & Stanley, K.** (2019). *Backpropamine: training
  self-modifying neural networks with differentiable neuromodulated plasticity.* ICLR
  (arXiv:2002.10585). — **Plasticité modulée par récompense, entraînable par gradient.**
- **Frémaux, N. & Gerstner, W.** (2016). *Neuromodulated STDP, and Theory of
  Three-Factor Learning Rules.* Frontiers in Neural Circuits. — La règle à trois
  facteurs (pré, post, récompense).
- **Dohare, S., Hernandez-Garcia, J. F., Lan, Q., Rahman, P., Mahmood, A. R. &
  Sutton, R. S.** (2024). *Loss of plasticity in deep continual learning.* Nature, 632,
  768–774. — Les réseaux perdent leur capacité d'apprendre : preuve du « solveur qui se
  rigidifie ».

## 6. Apprentissage en contexte & mémoire au moment du test

*→ soutient : la discussion « l'apprenant qui émerge », et l'archi à deux couches
(couche plastique + core).*

- **Garg, S., Tsipras, D., Liang, P. & Valiant, G.** (2022). *What Can Transformers
  Learn In-Context? A Case Study of Simple Function Classes.* NeurIPS.
- **von Oswald, J., et al.** (2023). *Transformers learn in-context by gradient
  descent.* ICML.
- **Geva, M., Schuster, R., Berant, J. & Levy, O.** (2021). *Transformer Feed-Forward
  Layers Are Key-Value Memories.* EMNLP. — L'attention route, les FFN mémorisent.
- **Sun, Y., et al.** (2024). *Learning to (Learn at Test Time): RNNs with Expressive
  Hidden States (TTT layers).* arXiv:2407.04620 (ICML 2025). — L'état caché EST un
  modèle, mis à jour par un pas d'apprentissage local à chaque instant.
- **Behrouz, A., Zhong, P. & Mirrokni, V.** (2025). *Titans: Learning to Memorize at
  Test Time.* arXiv:2501.00663. — Core (attention) + module mémoire qui met à jour ses
  propres poids au test. **Presque exactement l'archi à deux couches discutée.**

## 7. Évolution, diversité, réseaux plastiques évolués

*→ soutient : les jalons 4-5 (sélection des règles, « ADN » évolué).*

- **Stanley, K. & Miikkulainen, R.** (2002). *Evolving Neural Networks through
  Augmenting Topologies (NEAT).* Evolutionary Computation.
- **Salimans, T., Ho, J., Chen, X., Sidor, S. & Sutskever, I.** (2017). *Evolution
  Strategies as a Scalable Alternative to Reinforcement Learning.* arXiv:1703.03864.
- **Lehman, J. & Stanley, K.** (2011). *Abandoning Objectives: Evolution through the
  Search for Novelty Alone.* Evolutionary Computation. — La *novelty search*.
- **Mouret, J.-B. & Clune, J.** (2015). *Illuminating search spaces by mapping elites
  (MAP-Elites).* arXiv:1504.04909. — La diversité bat la fitness pure.
- **Soltoggio, A., Stanley, K. & Risi, S.** (2018). *Born to Learn: The Inspiration,
  Progress, and Future of Evolved Plastic Artificial Neural Networks.* Neural Networks.
  — **La synthèse évolution + plasticité + neuromodulation** = tout l'étage haut de
  notre pile.

## 8. Plasticité topologique, sparsité dynamique, croissance

*→ soutient : la discussion « plasticité topologique » et la branche substrat
auto-organisateur.*

- **Mocanu, D., et al.** (2018). *Scalable training of ANNs with adaptive sparse
  connectivity inspired by network science (SET).* Nature Communications. — Un masque
  qui se recâble pendant l'entraînement.
- **Evci, U., Gale, T., Menick, J., Castro, P. & Elsen, E.** (2020). *Rigging the
  Lottery: Making All Tickets Winners (RigL).* ICML.
- **Mordvintsev, A., Randazzo, E., Niklasson, E. & Levin, M.** (2020). *Growing Neural
  Cellular Automata.* Distill. — Une structure qui croît d'une règle locale.
- **Najarro, E., Sudhakaran, S., Glanois, C. & Risi, S.** (2022). *HyperNCA: Growing
  Developmental Networks with Neural Cellular Automata.* arXiv:2204.11674.

## 9. Multiplexage fréquentiel & rythmes cérébraux

*→ soutient : le cœur du substrat (H1) et la distinction fuite/couplage (H4).*

- **Fries, P.** (2005). *A mechanism for cognitive dynamics: neuronal communication
  through neuronal coherence.* Trends in Cognitive Sciences. — **Communication through
  Coherence** : des sous-canaux choisis par la fréquence sur une même anatomie.
- **Fries, P.** (2015). *Rhythms for Cognition: Communication through Coherence.*
  Neuron.
- **Lisman, J. & Jensen, O.** (2013). *The Theta-Gamma Neural Code.* Neuron. — Le
  couplage thêta-gamma : une onde lente module une onde rapide (H4).
- **(2016).** *Theta-Gamma Coding Meets Communication-through-Coherence: Neuronal
  Oscillatory Multiplexing Theories Reconciled.* PLoS Computational Biology, 12(10).

## 10. Calcul physique : photonique & opérateurs de Fourier

*→ soutient : « la physique du signal porte le multi-chemin » ; le positionnement
matériel.*

- **Tait, A., et al.** (2017). *Neuromorphic photonic networks using silicon photonic
  weight banks.* Scientific Reports. — Poids dépendants de la longueur d'onde
  (micro-anneaux).
- **Feldmann, J., et al.** (2021). *Parallel convolutional processing using an
  integrated photonic tensor core.* Nature. — Multiplexage en longueur d'onde (WDM) :
  plusieurs calculs sur un même guide.
- **Wright, L., Onodera, T., et al. (McMahon group)** (2022). *Deep physical neural
  networks trained with backpropagation.* Nature. — Exploiter la physique d'un
  substrat pour calculer.
- **Li, Z., Kovachki, N., Azizzadenesheli, K., et al.** (2021). *Fourier Neural
  Operator for Parametric PDEs.* ICLR (arXiv:2010.08895). — **Des poids appris par mode
  de fréquence**, différentiables : preuve que « poids dépendant de la fréquence » est
  entraînable.

## 10b. Réseaux à valeurs complexes & apprentissage physique

*→ soutient : la Décision 002 (entraîner le substrat comme un CVNN) et le jalon 6 (champ
latent ondulatoire).*

- **Trabelsi, C., Bilaniuk, O., Zhang, Y., Serdyuk, D., Bengio, Y., Pal, C. J., et al.**
  (2018). *Deep Complex Networks.* ICLR (arXiv:1705.09792). — modReLU, complex-BN,
  convolutions complexes ; **entraîner des réseaux complexes par gradient**.
- **Hirose, A.** (2012). *Complex-Valued Neural Networks.* Springer (2ᵉ éd.). — La
  référence de synthèse sur les CVNN.
- **Nitta, T.** (1997). *An Extension of the Back-Propagation Algorithm to Complex
  Numbers.* Neural Networks. — Backprop en complexe, historique.
- **Kreutz-Delgado, K.** (2009). *The Complex Gradient Operator and the CR-Calculus.*
  arXiv:0906.4835. — Le **calcul de Wirtinger** appliqué à l'optimisation (`∂L/∂W*`).
- **Raissi, M., Perdikaris, P. & Karniadakis, G. E.** (2019). *Physics-Informed Neural
  Networks.* Journal of Computational Physics, 378, 686–707. — Inscrire une PDE dans le
  réseau ; base du **jalon 6** (dynamique d'onde dans le latent).

## 11. Cadres généraux

- **Sutton, R.** (2019). *The Bitter Lesson.* — La tension calcul+échelle vs. méthodes
  structurées ; contrepoint honnête à toute la démarche.
- **Baldwin, J. M.** (1896). *A New Factor in Evolution.* — L'effet Baldwin : évoluer la
  *capacité à apprendre*, pas les solutions.

---

### Comment ces références se répartissent dans notre papier

- **Introduction / histoire** : §0, §1, §2, §5-6 (le fil solveur → apprenant → ADN).
- **Substrat & définition (fuite/couplage)** : §9 (rythmes cérébraux), §10 (physique).
- **H1 (multiplexage)** : §9, §10.
- **H4 (couplage)** : §9 (thêta-gamma).
- **H5 (compacité / ADN)** : §2, §10 (Fourier Neural Operator).
- **Discussion / positionnement** : §10 (matériel), §1 (No Free Prune, limites), §11.
- **Décision 002 (entraînement CVNN)** : §10b (Deep Complex Networks, Wirtinger, CVNN).
- **Jalons futurs (plasticité, récompense, sélection)** : §5, §7, §8.
- **Jalon 6 (champ ondulatoire)** : §10b (PINNs), §10 (Fourier Neural Operator).
