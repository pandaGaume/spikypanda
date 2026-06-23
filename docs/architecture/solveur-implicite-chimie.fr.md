# Solveur implicite (Rosenbrock) pour la chimie raide — plan d'intégration

> Note d'architecture. Objectif : ajouter un solveur implicite capable de
> traiter la cinétique chimique raide **sans casser le système d'intégration
> unique**, et en gardant les deux notions de « masse » bien séparées.

## 1. Le point de départ : pourquoi, et seulement pour quoi

Le solveur actuel `RK4AdaptiveSolver` (Cash-Karp 5(4), `core/src/sim/rk4-adaptive.solver.ts`)
est explicite et non-raide. Il convient à tout ce qu'on expédie aujourd'hui :
moteurs (DC/BLDC/PMSM, τ_e ≈ 0,15–4 ms), mécanique, vibration, fluide concentré
(atmosphère bien mélangée). Pour ces domaines le mode rapide *est le signal*
qu'on veut résoudre, et un haut taux d'échantillonnage est légitime.

Le seul domaine qui le met en échec est la **cinétique chimique** : des constantes
de vitesse séparées par 4 à 8 ordres de grandeur (équilibres rapides + conversions
lentes) intégrées sur des minutes. Un explicite y prend un pas borné par la réaction
la plus rapide → des millions de micro-pas. C'est le cas d'usage, et le seul, qui
justifie un solveur implicite.

**Attention au périmètre.** La chimie *actuelle* (`plugins/chemistry`,
`scene/atmosphere-layer`) n'est pas encore raide : c'est du descriptif
(métadonnées gaz) + bilan de masse en gaz parfait. La raideur arrive le jour où
on ajoute les *termes de vitesse* de réaction. Ce plan prépare ce jour-là.

## 2. Les deux « masses » — à ne jamais confondre

C'est le cœur de la demande de cohérence. Le mot « masse » désigne déjà **deux
objets sans rapport** dans la base, et le solveur implicite en introduit un
troisième sens potentiel. Il faut les nommer distinctement.

| Sens | Où | Nature | Rôle |
|------|-----|--------|------|
| **Masse physique / inertie** | `motor-dc/dynamic.node.ts` (`motorMass`, `rotorMass`, `rotorGyrationRadius`, CoM) | *Paramètre* du modèle | Source unique pour le couplage gravité / défauts |
| **Inventaire de masse** | `scene/atmosphere-layer.node.ts` (masse [kg] par espèce) | *État intégré* `y` lui-même | La quantité conservée que le solveur fait évoluer |
| **Matrice de masse M** (DAE) | n'existe pas (encore) | *Opérateur numérique* dans M·y' = f | Structure du système, pas une grandeur physique |

Les deux premiers sont de la physique : un paramètre et une variable d'état. Le
troisième est un objet purement numérique de la *forme* du système d'équations.
**Les confondre dans le code serait l'erreur à éviter.** Règle de nommage :

- la masse physique et l'inventaire restent ce qu'ils sont (aucun changement) ;
- si un jour on introduit la matrice de masse DAE, elle s'appellera `massMatrix`
  **jamais** `mass`, et idéalement on lui préfère un terme non ambigu
  (`descriptorMatrix` / `leadingMatrix`) pour couper court à toute collision avec
  `motorMass` / l'inventaire.

## 3. La bonne nouvelle : la chimie raide n'a PAS besoin de matrice de masse

Pour de la cinétique pure, le système est `dy/dt = f(t, y)` — c'est-à-dire
**M = I** (identité). On reste exactement dans le contrat `IIntegrable` actuel :
`rhs(t, y, offset, inputs, dydt)` renvoie `dy/dt` directement. Un Rosenbrock
traite parfaitement une ODE raide avec M = I ; il n'a besoin que de la **Jacobienne**,
pas d'une matrice de masse.

La matrice de masse n'est nécessaire que pour les vraies **DAE** (contraintes
algébriques : réseau électrique acausal, CFD incompressible). Ce ne sont pas tes
cas d'usage à court terme. Donc :

> **Décision** : on ajoute le Rosenbrock avec M = I implicite. On **n'introduit
> pas** de matrice de masse maintenant. Le système reste un seul contrat
> `IIntegrable` ODE, cohérent avec tout l'existant.

C'est précisément ce qui préserve « un seul système cohérent » : le solveur
implicite n'est pas un sous-système parallèle, c'est un *pair* du RK4 enregistré
dans le même registry, consommant le même `IIntegrable`, écrivant dans le même
vecteur d'état partagé.

## 4. Ce qui est déjà prêt (la glue — ~80 % du câblage existe)

Rien à changer dans le cœur. L'architecture leaf-centric a été conçue pour ça
(cf. le commentaire de `control/src/sim/index.ts` : *« V2 Helios sprint adds a
Rosenbrock4 descriptor + factory here for stiff chemistry. The pattern is
identical. »*).

- **`ISolver`** (`core/src/sim/sim.interfaces.ts`) : seul contrat à implémenter
  (`initialize` / `step` / `dispose`, flag `supportsJacobian`). Le Rosenbrock met
  `supportsJacobian = true`.
- **`SOLVER_REGISTRY`** : accepte un nouveau `kind` sans modification. On copie
  le bloc `register("rk4-adaptive", …)` en `register("rosenbrock4", …)`.
- **`IIntegrable.jacobian?(t, y, offset, inputs, J)`** : le hook existe déjà
  (l. 248). Aujourd'hui il n'est implémenté nulle part et `supportsJacobian =
  false` partout — le Rosenbrock est son premier consommateur.
- **`buildSolverAttachmentsForGraph`** (`core/src/sim/solver.attachment.ts`) :
  groupe déjà les feuilles par `solverKind`, auto-remplit, fusionne les options,
  et **retourne une liste** de solveurs que la session attache un par un. Il sait
  déjà faire coexister RK4 (moteurs) et Rosenbrock (chimie) sur des sous-ensembles
  disjoints. **Zéro changement.**
- **Snapshot d'entrées** (résolution Q1.2 : entrées gelées sur le macro-pas) :
  réutilisable tel quel. Rosenbrock évalue `rhs` à plusieurs points d'étage avec
  entrées constantes, l'hypothèse de déterminisme tient.

## 5. Le vrai travail (concentré en un seul morceau d'algo)

### 5.1 Le solveur `RosenbrockSolver` — `core/src/sim/rosenbrock.solver.ts`

Méthode Rosenbrock-Wanner linéairement implicite (recommandé : **RODAS** ou
**ROS3P**, ordre 3–4, L-stable, avec estimateur d'erreur embarqué pour garder le
pas adaptatif comme le RK4). À chaque pas :

1. évaluer la Jacobienne `J = ∂f/∂y` (cf. §5.2) ;
2. former `W = (I/(γ·h) − J)` et la **factoriser LU** une fois par pas ;
3. résoudre un système linéaire par étage (back-substitution) ;
4. recombiner les étages + estimer l'erreur → contrôle de pas (on réutilise la
   logique accept/shrink/grow du RK4).

Le seul ajout substantiel : il n'existe **aucun noyau d'algèbre linéaire dense**
(LU + solve) dans la base. Pour la chimie le vecteur d'état est petit (quelques
espèces), donc une petite LU dense avec pivot partiel en TypeScript sur
`Float64Array` suffit — **sans dépendance externe**. À écrire dans
`core/src/math/` (p. ex. `dense-lu.ts`) pour rester réutilisable et testable
isolément.

> Portabilité : si ce solveur doit tourner dans le port C++ CyanMycelium, le
> noyau LU doit y être porté aussi. Le garder petit et autonome facilite ça.

### 5.2 Stratégie Jacobienne

Deux niveaux, le solveur gère les deux :

- **Différences finies** (fallback générique, dans le solveur) : zéro changement
  aux feuilles, robuste, mais N évaluations de `rhs` en plus par pas et moins
  précis — or la doc de `IIntegrable.jacobian` prévient justement que
  « *Jacobian accuracy dominates cost* » en implicite.
- **Jacobienne analytique** dans les feuilles chimiques (via le hook existant) :
  pour de la cinétique loi-d'action-de-masse elle s'écrit facilement et stabilise
  fortement le pas. **Recommandé** pour les réactions raides ; les différences
  finies restent le filet de sécurité quand `jacobian()` est absent.

### 5.3 La glue triviale (copiée sur l'existant)

- **Factory** dans `control/src/sim/index.ts` : un second `SOLVER_REGISTRY.register("rosenbrock4", …)` à côté du RK4 (même `activate()`, pour rester sur le même singleton cross-bundle `Symbol.for("spikypanda.solver-registry")`).
- **`RosenbrockSolverItem`** : copie de `rk4-solver.item.ts` (un `GraphItem`, pas
  un RuntimeNode), avec éditables propres (`tolerance`, `maxStep`, `gamma` /
  choix du tableau) et `toSolverDescriptor()` renvoyant `{ kind: "rosenbrock4", … }`.
  Les viewables de diagnostic sont identiques.
- **Feuilles chimiques** : ajouter `readonly solverKind = "rosenbrock4"` (+ idéalement `jacobian()`).

## 6. La subtilité d'archi à acter : isoler la chimie dans son propre SimGraph

C'est le piège qui peut tuer le bénéfice. L'`effectiveHz` d'un `SimGraphNode` est
un `max(requiredHz)` sur **toutes** ses feuilles (`docs/architecture/sim-runtime-and-sample-rates.md`).
Le multi-solveur par `kind` partage certes les solveurs, mais **pas** la cadence
de la session interne.

Conséquence : si on met des moteurs (kHz) et de la chimie (échelle minute) dans le
*même* sous-graphe, la session interne tique vite et le macro-dt de la chimie reste
petit → on perd tout l'intérêt de l'implicite.

> **Décision** : la chimie raide vit dans **son propre `SimGraph`** (sa propre
> session interne, à bas `requiredHz`), de sorte que son macro-dt puisse réellement
> être grand. Le couplage avec le reste (énergie, thermique) passe par les liens
> inter-graphes au taux lent, pas par une co-résidence dans une session rapide.

Cela reste un seul système cohérent : un graphe, plusieurs sous-graphes `SimGraph`
chacun avec sa cadence et son solveur attaché, le tout via le même mécanisme
d'attachment.

## 7. Frontière assumée : raideur ≠ acausalité

Le Rosenbrock règle la **raideur** (chimie). Il ne règle pas l'**acausalité** des
vraies DAE (machine synchrone + réseau, CFD incompressible) — celles-ci
demanderaient en plus une matrice de masse et une réduction d'index. Si ce besoin
arrive un jour, l'extension reste cohérente avec le système unique :

- ajouter un hook **optionnel** `massMatrix?(t, y, offset, M)` sur `IIntegrable`,
  défaut = identité (donc rétrocompatible, tout l'existant reste M = I) ;
- le nommer sans collision avec la masse physique (§2) ;
- seul un solveur DAE le consomme ; RK4 et Rosenbrock-ODE l'ignorent.

Mais **ce n'est pas dans ce lot** : pour la chimie, M = I suffit.

## 8. Récapitulatif des touches

| Fichier | Action | Volume |
|---------|--------|--------|
| `core/src/math/dense-lu.ts` | **créer** — LU dense + solve | petit, autonome |
| `core/src/sim/rosenbrock.solver.ts` | **créer** — le solveur | le vrai morceau |
| `control/src/sim/index.ts` | +1 `register("rosenbrock4", …)` | trivial |
| `control/src/sim/rosenbrock-solver.item.ts` | **créer** — copie du RK4SolverItem | trivial |
| feuilles chimiques (cinétique) | `solverKind = "rosenbrock4"` + `jacobian()` | 1 ligne + Jacobienne |
| `IIntegrable` (`sim.interfaces.ts`) | **inchangé** (M = I) | 0 |
| `solver.attachment.ts`, `solver.registry.ts`, session multi-solveurs | **inchangés** | 0 |
| graphe : SimGraph dédié chimie | nouveau sous-graphe à bas Hz | conception |

**En une phrase** : un fichier solveur sérieux (Rosenbrock + petite LU), deux
fichiers de glue triviaux, une ligne par feuille chimique, et une décision de
topologie (SimGraph chimie isolé). Le contrat d'intégration, le registry et la
notion de masse physique ne bougent pas — c'est ça, le système unique cohérent.
