# Sim Framework v2 — Brouillon API (révisé)

**Statut** : brouillon pour relecture. NON implémenté.
**Date** : 2026-05-30.
**Remplace** : `sim-framework-api-v1.draft.md` — cette version réinventait la composition fractale. Lire celle-ci à la place.

## Ce qui a changé par rapport à v1

La v1 proposait une pile parallèle `ISimNode` / `ISimGraph`. **Erreur.**
La composition fractale est déjà implémentée :

- `RuntimeGraph<N, L> extends Graph<N, L> implements IRuntimeGraph, IRuntimeNode`
  dans `packages/dev/core/src/execution/execution.graph.ts`.
- Les port-channels à extrémité pendante (`oini === null` pour les entrées,
  `ofin === null` pour les sorties) définissent l'interface publique du
  sous-graphe.
- État par session parent via `createNodeState() → IGraphNodeState
  { internalSession }`, donc un même `RuntimeGraph` peut être embarqué
  dans N sessions parentes concurrentes.
- `fire(parentSession, t)` exécute
  `_routeInputsFromParent → inner.run(t) → _routeOutputsToParent`.
  L'embarquement bout-en-bout fonctionne aujourd'hui.
- `ComputeGraph extends RuntimeGraph<IKernel, IDataLink>` est la
  spécialisation pour les flux de tenseurs. `OnnxGraphExporter` transforme
  déjà les ComputeGraph en bytes ONNX (aujourd'hui : CNN / CNN quantifié ;
  la généralisation aux feuilles RuntimeGraph arbitraires est du travail
  per-noeud-trait, pas du travail de framework).

Donc **F2 est fait** et **F5 est partiellement fait**. Les vrais manques
restants :

| Manque | Ce qui est nécessaire |
|--------|----------------------|
| F1 (`rhs` en temps continu) | Nouvelle interface OPTIONNELLE, ajoutée par-dessus IRuntimeNode |
| F3 (ISolver) | Nouveau noeud-hôte, parcourt le graphe contenant pour trouver les implémenteurs F1 |
| F4 (type de port IChemicalStream) | Nouvelle entrée dans l'union des types de port + garde au connect |
| F5 (export sous-graphe vers ONNX pour les non-Compute graphs) | Étendre OnnxGraphExporter via un trait per-noeud `onnxExport` |
| F6 (hiérarchie meta-node pour les unités de procédé) | Nouvelle famille de classes de base (ProcessUnitNode + Reactor/Scrubber/…) |
| F7 (hooks de conservation) | Pattern observateur simple, sans changement de framework |
| F8 (snapshot/restore d'état session) | Étendre serialize/deserialize existant pour couvrir l'état Session |
| F9 (scheduler multi-rate) | RuntimeGraph wrapper qui subdivise le tick de son parent |

Ce document se concentre sur F1, F3, F4, F6. F5/F7/F8/F9 sont esquissés
en fin de document avec leur forme naturelle ; aucun ne nécessite une
réécriture haut-de-pile.

---

## Contexte de design (ce qui fonctionne déjà)

### Pattern existant des noeuds à état (moteur CC)

Lecture de `physics/src/electric/motor-dc/dynamic.node.ts` :

```ts
public override fire(session: ISession, t: number): void {
    // …récupère les entrées câblées V, tau_load, dt…
    let dt = -1;
    for (const link of this.opsc<IChannel>()) {
        const value = session.consume(idx);
        if (slot === "dt") dt = value;
    }
    if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
    this._lastT = t;

    // Pas d'Euler INLINE
    if (dt > 0) {
        const dIdt = (V - this._R * this._i - this._Ke * this._omega) / this._L;
        const dWdt = (this._Kt * this._i - this._b * this._omega - tauEff) / this._J;
        newI     = this._i     + dt * dIdt;
        newOmega = this._omega + dt * dWdt;
    }

    this.setField("i", this._i, newI, ...);
    this.setField("omega", this._omega, newOmega, ...);
    // …diffusion des sorties…
}
```

Chaque noeud à état porte son **état comme champs privés `@cloneable`** et
**fusionne intégration et I/O dans `fire()`**. Cela marche pour des
systèmes non-raides mono-rate (moteurs, oscillateurs) mais a trois
vraies limitations :

1. **Forward Euler uniquement.** Échanger RK4 / Rosenbrock implique de
   réécrire chaque feuille.
2. **Pas de vecteur d'état global.** Linéarisation (∂f/∂y), DMD,
   monitoring de conservation à travers plusieurs noeuds à état —
   tout impossible parce que l'état est dispersé dans des champs
   `@cloneable` sur N objets différents.
3. **dt lu par feuille.** Chaque moteur négocie son dt depuis les wires
   ou `t - lastT`. Le concept de sous-pas Tier-0 (le solveur faisant
   10000 micro-pas dans un macro-tick) ne rentre pas dans ce modèle.

La proposition ci-dessous introduit le trait opt-in `IIntegrable` qui
règle les trois, **sans perturber la boucle `fire(t)` existante des
noeuds qui n'optent pas dedans**. Les moteurs non migrés continuent à
tourner inchangés.

---

## F1 — Trait opt-in `IIntegrable`

### Interface proposée

```ts
// packages/dev/core/src/sim/sim.interfaces.ts (nouveau fichier)

import type { ISession, IRuntimeNode } from "../execution/execution.interfaces";

/**
 * Trait optionnel qu'un RuntimeNode peut implémenter pour participer
 * à l'intégration en temps continu. Le trait est ORTHOGONAL au contrat
 * fire(t) existant :
 *
 *   - Les noeuds qui N'implémentent PAS IIntegrable gardent leur
 *     comportement fire(session, t) actuel. Moteurs, oscillateurs et
 *     ops DSP existants sont inchangés.
 *   - Les noeuds qui implémentent IIntegrable renoncent à intégrer dans
 *     fire() et exposent à la place leur vecteur d'état + rhs au solveur
 *     qui vit dans le graphe contenant. fire() devient une routine I/O
 *     pure (consommer entrées, publier observations) — le solveur
 *     possède la boucle dt / intégration.
 *
 * Une feuille peut être migrée en place : garder fire() existant ET
 * ajouter IIntegrable. Le noeud-hôte Solver détecte le trait à
 * session.start() et remplace l'auto-intégration de la feuille par
 * des mises à jour pilotées par le solveur pour la durée de la session.
 */
export interface IIntegrable {
    /** Taille du vecteur d'état local de cette feuille. 0 est illégal —
     *  états non-nuls uniquement. Les noeuds sans état n'implémentent
     *  pas IIntegrable. */
    readonly stateSize: number;

    /** Noms des entrées d'état, longueur === stateSize. Surfacés dans
     *  le property panel + tiles de diagnostic (DMD, conservation).
     *  Fortement recommandé même quand stateSize === 1. */
    readonly stateNames?: ReadonlyArray<string>;

    /** Copie l'état courant de cette feuille DANS y[offset..offset+stateSize).
     *  Appelé par le solveur au début de chaque pas accepté et par Restore. */
    gatherState(y: Float64Array, offset: number): void;

    /** Copie y[offset..offset+stateSize) DANS l'état local de cette
     *  feuille. Appelé par le solveur à la fin de chaque pas accepté
     *  et par Restore. */
    writeState(y: Float64Array, offset: number): void;

    /** Calcule dy/dt à l'instant t étant donné y. PUR : ne doit pas
     *  lire ou écrire d'état hors de la tranche (y, dydt). Les entrées
     *  des noeuds amont sont passées via `inputs`, un snapshot assemblé
     *  par le solveur en réévaluant les ports d'entrée de la feuille
     *  à l'instant t. */
    rhs(
        t: number,
        y: Float64Array,
        offset: number,
        inputs: IIntegrationInputs,
        dydt: Float64Array,
    ): void;

    /** Jacobienne analytique optionnelle d(rhs)/dy pour cette feuille.
     *  Renvoie une matrice (stateSize × stateSize) en Float64Array
     *  ligne-majeur aplati. En son absence, le solveur la calcule par
     *  différences finies. Important quand les solveurs implicites
     *  arrivent (Phase 2+). */
    jacobian?(
        t: number,
        y: Float64Array,
        offset: number,
        inputs: IIntegrationInputs,
        J: Float64Array,
    ): void;
}

/** Entrées passées à rhs : valeurs de port amont, indexées par nom de
 *  port d'entrée. Le solveur les évalue depuis la topologie du graphe
 *  parent une fois par appel RHS. Lecture seule. */
export interface IIntegrationInputs {
    get(portName: string): number | undefined;
    has(portName: string): boolean;
}

/** Garde de type structurel (duck-typing). */
export function isIntegrable(node: unknown): node is IIntegrable {
    if (!node || typeof node !== "object") return false;
    const n = node as Partial<IIntegrable>;
    return typeof n.stateSize === "number"
        && typeof n.gatherState === "function"
        && typeof n.writeState === "function"
        && typeof n.rhs === "function";
}
```

### Comment un moteur existant migre

Avant (DcMotorDynamicNode actuel) :

```ts
public override fire(session: ISession, t: number): void {
    // … récupère V, tau_load, dt …
    const dIdt = (V - this._R * this._i - this._Ke * this._omega) / this._L;
    newI     = this._i     + dt * dIdt;
    newOmega = this._omega + dt * dWdt;
    this.setField("i", this._i, newI, ...);
    this.setField("omega", this._omega, newOmega, ...);
    // … diffuse les sorties …
}
```

Après (même noeud, maintenant opt-in IIntegrable) :

```ts
export class DcMotorDynamicNode extends FaultableNode implements IIntegrable {
    readonly stateSize = 2;
    readonly stateNames = ["i", "omega"];

    gatherState(y: Float64Array, offset: number): void {
        y[offset + 0] = this._i;
        y[offset + 1] = this._omega;
    }
    writeState(y: Float64Array, offset: number): void {
        // Pattern setField préservé — viewables + livebinder fonctionnent toujours.
        this.setField("i",     this._i,     y[offset + 0], (n) => { this._i = n; });
        this.setField("omega", this._omega, y[offset + 1], (n) => { this._omega = n; });
    }
    rhs(t, y, offset, inputs, dydt): void {
        const i     = y[offset + 0];
        const omega = y[offset + 1];
        const V       = inputs.get("V")        ?? 0;
        const tauLoad = inputs.get("tau_load") ?? 0;
        const tauEff = tauLoad + this.getFault("tau");
        dydt[offset + 0] = (V - this._R * i - this._Ke * omega) / this._L;
        dydt[offset + 1] = (this._Kt * i - this._b * omega - tauEff) / this._J;
    }

    public override fire(session: ISession, t: number): void {
        // I/O pur maintenant. L'intégration est le travail du solveur — fire publie juste.
        super.fire(session, t);   // FaultableNode + TransformNode tournent toujours
        // … diffuse les sorties (tau_em depuis this._i × Kt, etc.) …
    }
}
```

Migration **localisée** (un noeud à la fois) et **réversible** (retirer
le trait, fire() retombe sur Euler inline). Pas de refactor big-bang.

### Questions ouvertes

| # | Question | Proposition |
|---|----------|-------------|
| Q1.1 | `stateSize` réactif (ex. changement de nfft) ou figé à la compile ? | Figé. Edits de topologie → rebuild du solveur. |
| Q1.2 | Entrées de rhs : récupérer à chaque appel depuis session.linkStates, ou snapshot une fois par macro-tick ? | Snapshot une fois par macro-tick. Le solveur cache le vecteur d'entrée et le réutilise à travers les micro-pas. Compromis : entrées gelées pendant un macro-pas du solveur — acceptable puisque le solveur tourne BEAUCOUP plus vite que les taux de publication amont. |
| Q1.3 | Politique de migration : tous les noeuds à état doivent-ils implémenter IIntegrable, ou les deux patterns coexistent en permanence ? | Coexistence permanente. IIntegrable est opt-in. Le solveur ne possède que les noeuds qui optent dedans ; les non-opt-in (moteurs existants, DSP, viz) s'auto-mettent-à-jour dans fire() comme aujourd'hui. |

---

## F3 — Solveur attaché à la Session (pattern marker-node)

### Architecture : le solveur est une préoccupation Session, exposée via un marker node

Les brouillons précédents plaçaient le solveur comme noeud-hôte dans
le graphe qui faisait son travail d'intégration dans `fire()`. Cela
créait un problème d'ordre ("doit fire avant les siblings IIntegrable")
résolu par du wiring `_started` moche ou des flags de priorité scheduler
invasifs.

Le solveur n'est fondamentalement PAS un noeud data-flow :
- Il ne consomme aucun token d'entrée (au sens scheduler standard)
- Il ne publie aucun token de sortie
- Son rôle est de piloter la **phase d'intégration** *entre* les
  dispatches de la fire-loop

Donc il appartient à la **Session**, aux côtés de `simRate` et
`running`. `Session.run(t)` devient une orchestration en deux phases :

1. **Phase d'intégration** : chaque solveur attaché avance ses feuilles
   IIntegrable possédées de `dt`, en prenant N micro-pas adaptatifs
   internes.
2. **Phase de dispatch** : la fire-loop normale `Scheduler.RunDynamic`.
   Au moment où le `fire()` des feuilles IIntegrable tourne, leur état
   a déjà été mis à jour par le solveur ; `fire()` devient I/O pur
   (lire l'état frais, publier les sorties d'observation, latcher les
   écritures sur les ports d'action).

Le solveur garde une **représentation graphe** — un marker node —
*purement pour l'editabilité + la sérialisation*. Le marker n'effectue
pas l'intégration dans son `fire()` ; il enregistre/désenregistre
uniquement le solveur auprès de la session et publie des viewables de
diagnostic (rhsEvals, microSteps, maxError).

### Ajouts à l'API Session

```ts
// packages/dev/core/src/execution/execution.interfaces.ts

export interface ISession {
    // existant
    readonly graph: IRuntimeGraph;
    readonly nodeStates: ReadonlyArray<INodeState>;
    simRate: number;
    running: boolean;
    // ... reste inchangé ...

    // NOUVEAU : attachement de solveur
    readonly solvers: ReadonlyArray<ISolver>;
    attachSolver(solver: ISolver, leaves?: ReadonlyArray<IIntegrable>): void;
    detachSolver(solver: ISolver): void;
}

// Session.run concret devient deux-phases :
public run(t: number): void {
    const dt = t - this._lastT;
    this._lastT = t;

    // Phase 1 — intégration. Chaque solveur attaché avance ses
    // feuilles possédées de dt. Les solveurs sont indépendants : une
    // Session peut porter un RK4 pour rapide/non-stiff plus un
    // Rosenbrock pour la chimie Sabatier stiff, partitionnés par
    // filtre sur typeId de feuille.
    for (const solver of this._solvers) {
        solver.step(dt, this);
    }

    // Phase 2 — dispatch. Fire-loop data-flow standard. Le fire()
    // des feuilles IIntegrable voit maintenant un état déjà mis à
    // jour et publie juste leurs sorties d'observation.
    if (this.graph.mode === "dynamic") {
        Scheduler.RunDynamic(this, t);
    } else if (this.graph.mode === "static") {
        Scheduler.RunStatic(this, t);
    }
}
```

### Interface ISolver (plus simple qu'avant)

```ts
// packages/dev/core/src/sim/sim.interfaces.ts

export interface ISolverStep {
    readonly t: number;
    readonly microSteps: number;
    readonly maxError: number;
    readonly rhsEvals: number;
}

export interface ISolver {
    readonly name: string;
    readonly supportsJacobian: boolean;

    /** Accroche le solveur à un ensemble de feuilles connaissant la
     *  session. Appelé par session.attachSolver(). Le solveur cache
     *  l'offset de chaque feuille dans son vecteur d'état privé. */
    initialize(leaves: ReadonlyArray<IIntegrable>, t0: number): void;

    /** Avance le vecteur d'état possédé de `dt`. Lit les entrées en
     *  parcourant les linkStates de la session parente pour chaque
     *  feuille. */
    step(dt: number, session: ISession): ISolverStep;

    /** Accesseur de diagnostic optionnel : stats du dernier pas, pour
     *  que le marker node les expose en viewables. */
    readonly lastStep: ISolverStep | null;

    dispose?(): void;
}
```

### Le marker node (choix B)

```ts
// packages/dev/plugins/helios/src/sim/rk4-solver.node.ts

@cloneable private _tolerance:  number = 1e-6;
@cloneable private _maxStep:    number = 1e-2;   // cap 10 ms
@cloneable private _leafFilter: string = "*";    // glob sur typeId de feuille

private _solver: RK4AdaptiveSolver | null = null;

@viewable("number") public get lastMicroSteps(): number { return this._solver?.lastStep?.microSteps ?? 0; }
@viewable("number") public get lastMaxError():  number { return this._solver?.lastStep?.maxError  ?? 0; }
@viewable("number") public get rhsEvalsTotal(): number { return this._rhsEvalsTotal; }

public override reset(session: ISession): void {
    // Découvre les feuilles IIntegrable possédées (filtrées par
    // glob _leafFilter).
    const owned = (session.graph.nodes as ReadonlyArray<IRuntimeNode>)
        .filter(isIntegrable)
        .filter((n) => matchesGlob(typeIdOf(n), this._leafFilter));

    // Détache l'instance précédente s'il y en a une (gère reset en
    // milieu de session).
    if (this._solver) session.detachSolver(this._solver);

    this._solver = new RK4AdaptiveSolver({
        tolerance: this._tolerance,
        maxStep:   this._maxStep,
    });
    session.attachSolver(this._solver, owned);
}

public override fire(session: ISession, _t: number): void {
    // PAS d'intégration ici. La Session a exécuté solver.step() en
    // Phase 1, avant que le fire() d'aucun noeud ait été dispatché en
    // Phase 2. On est ici uniquement pour publier les diagnostics
    // live vers les observateurs aval.
    if (!this._solver?.lastStep) return;
    const s = this._solver.lastStep;
    this._rhsEvalsTotal += s.rhsEvals;
    // Broadcast optionnel sur un port de sortie "stats" pour tiles dashboard.
}

public override dispose(): void {
    // Détache des sessions encore actives.
    if (this._solver) {
        for (const session of this._activeSessions()) session.detachSolver(this._solver);
        this._solver = null;
    }
}
```

**Ce que le marker nous donne :**
- **Editabilité** : `tolerance`, `maxStep`, `leafFilter` dans le
  property panel.
- **Sérialisation** : la config du solveur round-trip avec le save du
  graphe.
- **Diagnostics** : `lastMicroSteps`, `lastMaxError`, `rhsEvalsTotal`
  comme viewables ; l'utilisateur dépose une tile Time-series Plot
  bindée sur l'une d'elles pour voir le comportement du solveur live.
- **Présence visuelle** : l'utilisateur VOIT quelles régions du graphe
  ont des solveurs attachés, et quel sous-ensemble de feuilles chacun
  possède (via `leafFilter`).
- **Pas de pollution d'ordonnancement** : la phase d'intégration est
  au niveau Session, pas un fire de noeud qui aurait besoin de
  coordination d'ordre.

### Multi-solveurs et solveurs hiérarchiques tombent gratuit

**Multi-solveurs splitté par échelle de temps** :

```
Graphe
 ├─ RK4Solver        (leafFilter: "Physics.Electric.*")    rapide / non-stiff
 ├─ RosenbrockSolver (leafFilter: "Helios.Process.*")      cinétique Sabatier stiff
 └─ EulerSolver      (leafFilter: "Helios.Catalyst:*")     vieillissement lent (jours)
```

Trois marker nodes dans le même graphe, chacun attache son propre
solveur à la session avec un sous-ensemble de feuilles disjoint. La
phase d'intégration les exécute dans l'ordre ; les ensembles de
feuilles non-chevauchants signifient qu'ils ne se battent pas.

**Solveurs hiérarchiques via sous-graphe fractal** :

```
Session Parente
 ├─ attaché : RK4Solver  (macro-pas 1 ms sur feuilles parentes)
 └─ SubGraph (RuntimeGraph)
      └─ Session Interne  (possédée par IGraphNodeState, infra existante)
           └─ attaché : RosenbrockSolver  (micro-pas 10 µs sur feuilles sous-graphe)
```

Chaque `RuntimeGraph` enfant a déjà sa propre `internalSession` via
`IGraphNodeState` (infra existante). Déposer un marker dans le
sous-graphe et il s'attache à CETTE session interne — pas de chemin
de code spécial pour les solveurs hiérarchiques.

### Implémentation phasée (inchangée par rapport à v1)

| Phase | Solveur | Quand |
|-------|---------|-------|
| 1 | RK4 Cash-Karp / Dormand-Prince (impl maison, ~150 LoC) | Premier sprint Helios. Valide le contrat IIntegrable + Session-attach bout-en-bout. |
| 2 | Rosenbrock4 (impl maison ~600 LoC, ou portage TS pur de Boost.odeint) | Quand la cinétique Sabatier force la raideur > 10⁴ |
| 3 | SUNDIALS IDA/CVODES (build WASM) | Quand DAE ou analyse de sensibilité nécessaire |

### Questions ouvertes

| # | Question | Proposition |
|---|----------|-------------|
| ~~Q3.1~~ | ~~Comment le solveur garantit-il qu'il fire avant ses siblings IIntegrable à chaque macro-tick ?~~ | **RÉSOLU par attachement au niveau Session** : la phase d'intégration précède la phase de dispatch ; pas de coordination d'ordre de noeud nécessaire. |
| Q3.2 | Comment partitionner les feuilles à travers plusieurs solveurs dans la même session ? | Filtre glob sur typeId de feuille (matche la taxonomie palette existante `Theme.Sub:node`). Editable du marker. Défaut = catch-all `"*"`. Filtres chevauchants : premier-attaché gagne (déterministe), warning au conflit. |
| Q3.3 | Snapshot de l'état interne du solveur ? | Seulement `y` et `lastT`. La recommandation `dt` adaptative redémarre de zéro au restore. |
| Q3.4 | Que fait le `fire()` du marker node ? | Rafraîchit les viewables de diagnostic (pas cher, idempotent). Broadcast optionnellement sur un port de sortie `stats` pour tiles dashboard. NE fait JAMAIS de travail d'intégration. |
| Q3.5 | Où l'attachement de solveur est-il persisté dans serialize/save ? | PAS persisté directement. Le marker node EST persisté (via GraphItem.serialize existant), et à session start son `reset()` ré-attache. L'état est entièrement dérivé. |

---

## F4 — Type de port `IChemicalStream` (industriel)

Le brouillon v2 proposait une union fermée fine
(`"H2O" | "H2" | ... | "He"`) avec une shape mono-phase
`{ mdot, T, P, composition }`. **Supersédé.** Un design canonique
s'aligne plus près des simulateurs de procédé industriels (Aspen Plus
/ ProSim / DWSIM) et lève trois plafonds structurels :

1. **Registre d'espèces ouvert** au lieu d'union fermée —
   extensibilité recherche (ISRU ajoute des espèces, biologie ajoute
   des métabolites, électrochimie ajoute des ions) sans churn d'enum
   core.
2. **Multi-phases first-class** — `phases: IPhaseState[]`. Knockout
   drum / condenseur / piège cryo se décomposent en N entrées
   IPhaseState au lieu de nécessiter un flag discriminateur.
3. **Base de composition** (`molar` / `mass` / `volume`) par phase —
   les capteurs de chromatographie gazeuse émettent du molaire, les
   gravimétriques du massique, les débitmètres volumétriques du
   volumique ; supporter les trois nativement tue la couche de
   conversion buggy.

### Interface canonique

Vit à `packages/dev/core/src/sim/sim.chemical.ts`. Résumé types-only :

```ts
export type ChemicalSpeciesId = string;
export type PhaseKind = "gas" | "liquid" | "solid" | "aqueous"
                      | "plasma" | "supercritical" | "mixed" | "unknown";
export type CompositionBasis = "molar" | "mass" | "volume";
export type PressureBasis = "absolute" | "gauge";

export interface IChemicalSpecies {
    readonly id: ChemicalSpeciesId;
    readonly name: string;
    readonly formula: string;
    readonly molarMass: number;          // kg/mol
    readonly casNumber?: string;
    readonly aliases?: readonly string[];
}

export interface IComposition {
    readonly basis: CompositionBasis;
    readonly fractions: ReadonlyMap<ChemicalSpeciesId, number>;
}

export interface ISpeciesState {
    readonly speciesId: ChemicalSpeciesId;
    // n'importe quel sous-ensemble peut être présent
    readonly moleFraction?: number;
    readonly massFraction?: number;
    readonly volumeFraction?: number;
    readonly partialPressure?: number;    // Pa
    readonly activity?: number;
    readonly fugacity?: number;            // Pa
    readonly concentration?: number;       // mol/m³
    readonly molality?: number;            // mol/kg
    readonly massFlow?: number;            // kg/s
    readonly molarFlow?: number;           // mol/s
}

export interface IThermodynamicState {
    readonly temperature?: number;         // K
    readonly pressure?: number;            // Pa
    readonly pressureBasis?: PressureBasis;
    readonly density?: number;             // kg/m³
    readonly viscosity?: number;           // Pa·s
    readonly enthalpy?: number;
    readonly entropy?: number;
    readonly internalEnergy?: number;
    readonly energyBasis?: "mass" | "molar";
    readonly vaporFraction?: number;
    readonly liquidFraction?: number;
    readonly solidFraction?: number;
    readonly pH?: number;
    readonly ionicStrength?: number;
    readonly conductivity?: number;
}

export interface IPhaseState {
    readonly id?: string;
    readonly kind: PhaseKind;
    readonly state: IThermodynamicState;
    readonly composition: IComposition;
    readonly species?: ReadonlyMap<ChemicalSpeciesId, ISpeciesState>;
    readonly massFlow?: number;            // kg/s (cette phase)
    readonly molarFlow?: number;           // mol/s
    readonly volumetricFlow?: number;      // m³/s
    readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface IChemicalStream {
    readonly id?: string;
    readonly name?: string;
    readonly phases: readonly IPhaseState[];
    readonly totalMassFlow?: number;
    readonly totalMolarFlow?: number;
    readonly totalVolumetricFlow?: number;
    readonly state?: IThermodynamicState;     // agrégat mixed-phase (optionnel)
    readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface IAtmospherePreset {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly stream: IChemicalStream;
}
```

**Données module-level** :

- `Species` — table d'ids style enum (`{ H2O, H2, O2, ..., Cellulose }`).
  Ouverte : n'importe qui peut étendre avec ses propres ids.
- `SpeciesRegistry` — `Readonly<Record<string, IChemicalSpecies>>` avec
  formule, nom, molarMass pour ~60 espèces baseline (gaz
  atmosphériques, hydrocarbures, NOx/SOx, acides, bases, sels, ions
  communs, feedstocks bio).
- `AtmospherePresets` — `Readonly<Record<string, IAtmospherePreset>>`
  avec Terre (sèche/humide niveau mer), Mars, Vénus, Titan, Jupiter.
  Directement composable avec les presets `Physics.Scene` (voir Q4.6).

**Helpers** (tous dans le même fichier) :

```ts
validateComposition(c, tolerance?)         → boolean
getSpeciesFraction(c, speciesId)            → number
getSpeciesMolarMass(speciesId, registry?)   → number | undefined
averageMolarMass(c, registry?)              → number | undefined  // base molaire seulement
speciesPartialPressure(phase, speciesId)    → number | undefined
speciesMolarFlow(phase, speciesId)          → number | undefined
speciesMassFlow(phase, speciesId, registry?) → number | undefined
makeGasPhaseFromMolarFractions(params)      → IPhaseState  // builder cas courant
```

### Intégration aux types de port

Ajouter `"chemical"` à l'union `PortType`. La garde au connect devient
une **vérification de capacités**, pas une comparaison d'ensemble fermé :

```ts
if (fromPort.type === "chemical" && toPort.type === "chemical") {
    // Le récepteur doit accepter chaque espèce que le producteur peut émettre.
    if (!coversSpecies(toPort.species, fromPort.species)) {
        rejectConnection("récepteur sans certaines espèces du producteur");
    }
    // Les bases de composition peuvent différer — convertisseur
    // auto-inséré au runtime. Voir Q4.5.
}
```

`PortDescriptor` gagne :
```ts
readonly species?: ReadonlyArray<ChemicalSpeciesId>;  // schéma déclaré (ouvert)
readonly phases?:  ReadonlyArray<PhaseKind>;          // kinds de phase acceptées
readonly basis?:   CompositionBasis;                  // base de composition préférée
```

### Comment ça s'imbrique avec le reste de v2

- **F1 IIntegrable** : `ProcessUnitNode.rhs` reçoit des snapshots
  `IChemicalStream` amont via `IIntegrationInputs.get(portName)`. Les
  helpers (`speciesMolarFlow`, `speciesPartialPressure`) les lisent
  directement — pas de dé-structuration per-feuille à la main.
- **F6 meta-node** : `ProcessUnitNode` déclare ses ports
  chemical-stream avec arrays `species` + `phases` ; les classes
  intermédiaires (Reactor / Scrubber / HeatExchanger / Separator)
  opèrent nativement sur `IPhaseState[]`. Les noeuds deux-phases
  (KnockoutDrum, Condenser) cessent d'être un cas spécial — ils
  écrivent juste 2 entrées dans `phases[]`.
- **F7 hooks de conservation** : le bilan de masse par espèce devient
  par-espèce-à-travers-les-phases (somme `speciesMassFlow` sur entrées
  vs sorties à travers `IPhaseState[]`). Le bilan d'énergie lit
  `IThermodynamicState.enthalpy` directement quand présente, calcule
  via tables cp d'espèces sinon.
- **Q6.2 (port `IHeatStream` séparé ?)** : avec `IThermodynamicState`
  portant enthalpy + entropy + internalEnergy + energyBasis, la
  chaleur peut être transportée À L'INTÉRIEUR du chemical stream
  nativement. La question port-séparé devient moins urgente — différer
  au Sprint 2 Helios sauf si l'optimisation de réseau d'intégration
  thermique (HEN) le requiert spécifiquement.
- **AtmospherePresets ↔ Physics.Scene** : les 4 presets de scene
  existants (Terre/Lune/Mars/Orbital) portent les scalaires `gravity`
  + `temperature` + `pressure`. Ils devraient SE RELIER au preset
  atmosphère correspondant pour les données de composition quand un
  pipeline chimique en a besoin. Voir Q4.6.

### Questions ouvertes (révisées)

| # | Question | Proposition |
|---|----------|-------------|
| ~~Q4.1~~ | ~~Tracker l'enthalpie sur le stream ou la calculer ?~~ | **RÉSOLU** — `IThermodynamicState.enthalpy` optionnelle ; portée si connue, calculée sinon. |
| ~~Q4.2~~ | ~~Support deux-phases ?~~ | **RÉSOLU** — `phases: IPhaseState[]` first-class. Pas de flag de phase nécessaire. |
| ~~Q4.3~~ | ~~Stream comme objet immuable par tick ?~~ | **RÉSOLU** — `readonly` partout dans l'interface. |
| Q4.4 | **Extensibilité runtime du registre d'espèces** — l'utilisateur peut-il ajouter des espèces customs (Ni, framework zéolite, métabolites bio) sans recompiler core ? | Oui. `SpeciesRegistry` est `Readonly<Record<string, IChemicalSpecies>>` mais un helper `registerSpecies(spec)` plus une mirror map extensible utilisateur donnent l'enregistrement runtime. Les helpers prennent déjà un arg optionnel `registry` — l'utilisateur passe le sien. |
| Q4.5 | **Mismatch de base de composition au connect** — les connexions `molar` ↔ `mass` doivent-elles auto-convertir via la masse molaire, ou exiger une base identique ? | Auto-convertir quand les deux endpoints déclarent une préférence de base unique ET que les masses molaires sont connues pour toutes les espèces. Retombe sur "incompatible" sinon (avec message diagnostique nommant l'entrée molarMass manquante). |
| Q4.6 | **AtmospherePresets ↔ presets `Physics.Scene`** — `Physics.Scene:earth` doit-il sourcer son atmosphère depuis `AtmospherePresets.earthHumidAirSeaLevel`, ou rester indépendant ? | Sourcer. Ajouter un champ `atmosphere?: IChemicalStream` à l'interface `IScene` ; les constantes de preset de scene le construisent depuis `AtmospherePresets.<id>`. Un pipeline chimique peut alors lire sa composition d'entrée directement depuis la scene active sans configuration manuelle. |
| Q4.7 | **`IChemicalStream.state` (agrégat mixed-phase)** — quand phases a longueur >1, `state` est-il obligatoire, calculé depuis les états per-phase, ou laissé aux noeuds feuilles ? | Optionnel. Quand présent, utilisé par les tiles viz comme readout "bulk". Quand absent, viz calcule moyenne pondérée par masse depuis `phases[*].state`. Les producteurs le remplissent quand ça a du sens (mono-phase, ou équilibre stable) ; laissent indéfini sinon (flash deux-phases transitoire). |

---

## F5 — Export sous-graphe → ONNX (chemin, pas interface)

`OnnxGraphExporter` cible déjà `ComputeGraph`. Pour étendre à des
sous-graphes d'agent arbitraires en `RuntimeGraph` :

1. Ajouter un trait optionnel `IOnnxExportable` sur RuntimeNode :
   ```ts
   interface IOnnxExportable {
       emitOnnx(ctx: OnnxExportContext, inputs: string[], outputs: string[]): void;
   }
   ```
2. Pour chaque feuille du sous-graphe d'agent, chercher son trait
   `emitOnnx` (responsabilité per-noeud, pas framework). Les feuilles
   sans le trait ne peuvent pas être exportées — signalées au moment de
   l'export avec une erreur claire.
3. La récursion est gratuite : quand une feuille EST elle-même un
   RuntimeGraph (composition fractale), `OnnxGraphExporter` gère déjà
   ça via le parcours récursif existant.

**Ce n'est pas du travail de framework** ; c'est de l'implémentation
per-noeud du trait d'export plus une petite extension de l'exporter
existant pour parcourir des RuntimeGraph arbitraires (pas seulement
ComputeGraph). Cible une feuille de chimie à la fois selon les besoins
de Helios.

---

## F6 — Hiérarchie meta-node des unités de procédé

L'installation chimique a ~12 feuilles (réacteur Sabatier, électrolyseur
PEM, scrubber amine, scrubber cryo, condenseur, knockout drum,
séparateur, purifieur PSA, mélangeur, compresseur, sécheur, buffer).
Implémenter chacune de zéro représente ~3 semaines de code de glue —
I/O chemical-stream, bilan de masse, bilan d'énergie, état de holdup,
hooks de faute — dupliqué N fois.

Refléter l'héritage existant `RuntimeNode → TransformNode → FaultableNode
→ Motors` que le domaine électrique utilise. Pour la chimie :

```
RuntimeNode
  └─ ProcessUnitNode              IChemicalStream I/O + bilan masse/énergie
                                  + état de holdup + IIntegrable + hooks
                                  de conservation auto-enregistrés + slots
                                  variadiques fault_N façon FaultableNode
        │
        ├─ ReactorNode             état d'activité catalyseur, helper
        │                          Arrhenius, helper chaleur de réaction,
        │                          conversion comme état
        │     ├─ SabatierReactor    CO₂ + 4 H₂ → CH₄ + 2 H₂O (R-601)
        │     ├─ MethanationReactor CO + 3 H₂ → CH₄ + H₂O
        │     └─ ElectrolyzerReactor H₂O → H₂ + ½ O₂ (E-201)
        │
        ├─ ScrubberNode            état de chargement sorbant, courbe de
        │                          percée, scheduler de cycle de régen
        │     ├─ AmineScrubber       capture CO₂ amine (C-301)
        │     ├─ CryoScrubber        capture CO₂ cryogénique (C-302)
        │     └─ DesiccantDryer      H₂O sur zéolite/silice (V-201)
        │
        ├─ HeatExchangerNode       UA × LMTD, bilan d'énergie deux-fluides,
        │                          facteur d'encrassement comme état
        │     ├─ Condenser           gaz chaud → gaz froid + condensat (E-701)
        │     └─ Cooler / Heater     presets mono-fluide
        │
        ├─ CompressorNode          étage polytropique, couplage puissance
        │                          → ω (compose un PMSM via sous-graphe
        │                          interne)
        │     └─ StagedCompressor    K-401 multi-étage avec inter-refroidissement
        │
        ├─ SeparatorNode           coefficients de partition par espèce,
        │                          flash deux-phases
        │     ├─ KnockoutDrum        liquide/gaz (V-701)
        │     ├─ GasSeparator        type distillation (V-801)
        │     └─ PSAPurifier         adsorption par modulation de pression (V-901)
        │
        ├─ MixerNode               mélange stoichiométrique, contrôle de ratio
        │     └─ StoichMixer          H₂ + CO₂ à 4:1 (M-501)
        │
        └─ BufferNode              ballon pressurisé, calcul d'autonomie
              └─ GasBuffer            V-202
```

### Ce que chaque couche porte

| Couche | Fournit | Override per-feuille |
|--------|---------|----------------------|
| `ProcessUnitNode` | Déclaration des ports chimiques (ensembles d'espèces in/out), squelette `rhs` IIntegrable appelant `computeKinetics` + `computeEnergyBalance`, hook de conservation de masse auto-émis au setup du solveur, slot d'état de holdup, famille de slot `fault_N` façon FaultableNode pour fautes sur paramètres cinétiques | — (abstraite) |
| `ReactorNode` | État d'activité catalyseur, helper Arrhenius `k(T) = A·exp(−Ea/(R·T))`, helper chaleur de réaction `ΔH(T)`, conversion-comme-état | `kineticsRateLaw(T, p_species) → r` virtuelle |
| `ScrubberNode` | État de chargement sorbant (kg chargé / kg capacité), courbe de percée, hooks scheduler de régen | Affinité du sorbant par espèce, capacité, énergie de régen |
| `HeatExchangerNode` | Bilan d'énergie deux-fluides, driver UA × LMTD, état facteur d'encrassement | Preset de géométrie (contre-courant / cross-flow / co-courant) + aire de tubes |
| `CompressorNode` | Loi de compression polytropique, port d'entrée puissance-depuis-rotor, helper inter-refroidisseur d'étage | Nombre d'étages + ratio de pression par étage |
| `SeparatorNode` | Coefficient de partition par espèce, flash deux-phases | Spécificités de partition (perméabilité de membrane, temps de cycle PSA, …) |
| `MixerNode` | Combinaison masse + enthalpie de N streams, sortie contrôlée par ratio | Setpoint de ratio + bande de tolérance |
| `BufferNode` | Bilan de masse vs taux de consommation, viewable autonomie = inventaire / taux de soutirage | Géométrie (cylindrique/sphérique pour contrainte de coque) |

Résultat : chaque feuille concrète devient ~30–80 lignes (juste sa loi
de vitesse + quelques constantes) au lieu de ~200–400 (plumbing de
ports + état + I/O + duplication de conservation).

### Comment ça s'imbrique avec le framework V2

- **`IIntegrable` (F1)** : `ProcessUnitNode` implémente IIntegrable pour
  que chaque réacteur / scrubber / buffer participe au vecteur d'état
  global. Les classes intermédiaires apportent leur slot d'état
  (activité catalyseur pour Reactor, chargement sorbant pour Scrubber,
  facteur d'encrassement pour HeatExchanger, inventaire pour Buffer) ;
  les classes feuilles apportent la conversion de réaction et toute
  cinétique custom. La récursion `rhs` est directe : la base calcule
  la part générique, la sous-classe ajoute ses spécificités via
  `super.rhs(...)`.
- **`IChemicalStream` (F4)** : les déclarations de port de
  ProcessUnitNode consomment le port typé par espèces, donc la garde
  au connect catche "câblé O₂ dans une entrée CO₂" à design-time.
  Chaque feuille hérite ça gratuitement.
- **Hooks de conservation (F7)** : `ProcessUnitNode` enregistre
  automatiquement un hook de bilan de masse par espèce auprès du
  solveur contenant, plus un hook de bilan d'énergie. L'utilisateur
  dépose une seule tile `Logic.Sim:conservation-monitor` et voit la
  dérive par espèce à travers toute l'installation agrégée. Les hooks
  de désactivation de catalyseur s'ajoutent par-dessus via `ReactorNode`.
- **Pattern `FaultableNode`** : `ProcessUnitNode` reflète le mécanisme
  de slot variadique `fault_N`. Une "poisoning catalyseur" ou
  "contamination scrubber" ou "onset d'encrassement" devient le même
  type de signature injectable qu'une faute de roulement sur un
  moteur — UX uniforme à travers plant + machinerie.
- **`OnnxGraphExporter` (F5)** : chaque classe de base intermédiaire
  implémente `IOnnxExportable` une fois, émettant le pattern d'op ONNX
  canonique pour cette famille d'unité (Reactor → boucle-d'Arrhenius,
  HeatExchanger → pattern matriciel UA, …). Les feuilles héritent. Un
  sous-graphe complet de réacteur Sabatier → bundle ONNX vient alors
  essentiellement gratuit.
- **Scenes & atmosphères (F10)** : une unité de procédé qui interagit
  avec l'atmosphère de la pièce qui l'environne (scrubber, source de
  fuite, réacteur émettant des traces) n'utilise PAS de type de port
  spécial. Elle lit les observables de l'atmosphère (composition,
  pression, T) depuis les outputs standards de l'`AtmosphereStateNode`,
  et écrit en retour ses contributions de flux massique en publiant
  sur les ports d'input `delta_<species>` de l'atmosphère. La capacité
  variadique des buffers d'input permet à N unités de publier
  concurremment sur la même espèce ; le `rhs` de l'atmosphère les
  somme. Voir §F10 pour les détails complets. Conséquence :
  `ProcessUnitNode` n'a PAS besoin de mécanique scene-aware ;
  l'interaction avec la pièce est du producer/consumer standard.

### Questions ouvertes pour cette section

| # | Question | Proposition |
|---|----------|-------------|
| Q6.1 | **Activité catalyseur** comme état intégré (slot supplémentaire dans le `y` IIntegrable) ou comme scalaire à taux lent mis à jour hors du solveur ? | État intégré. La décroissance d'activité fait partie du même système d'équations ; la séparer forcerait une synchro manuelle entre deux bases de temps et casserait la vue du conservation-monitor de "l'état complet du réacteur". Coût : 1 ligne supplémentaire dans la jacobienne par réacteur — négligeable. |
| Q6.2 | **Chaleur comme type de port `IHeatStream` séparé** (parallèle à `IChemicalStream`) ou **portée dans le chemical stream** (T + cp) ? | `IHeatStream` séparé. Les simulateurs de procédé industriels (Aspen, ProSim) splittent la chaleur comme stream utility propre pour que les réseaux d'intégration thermique (HEN) soient first-class. Boucles de coolant, énergie de régen cryo, chaleur de réaction → tous des wires que l'utilisateur peut re-router sans toucher au flux massique. |
| Q6.3 | **CompressorNode réutilisant PMSM comme sous-graphe interne** : la feuille K-401 CONSTRUIT-elle un sous-graphe à la construction (composant PMSM + roulement + onduleur en `RuntimeGraph`), ou déclare-t-elle juste des ports que l'utilisateur câble externement ? | Composer en interne. Tout l'intérêt de la composition fractale est que K-401 "est" une unité de procédé même s'il est intérieurement un sous-graphe moteur. L'utilisateur voit un noeud avec ports chimiques et électriques. Économise du wiring boilerplate à chaque fois. |
| Q6.4 | **Où les classes de base meta-node vivent-elles** ? `spikypanda-core` (à côté de RuntimeNode/IIntegrable) ou `@spikypanda/plugin-helios` (plus près de leurs consommateurs) ? | Plugin-helios. Ce sont des primitives de domaine — dépendent de F4 IChemicalStream qui est core, mais la spécialisation intermédiaire (Reactor/Scrubber/…) est de la connaissance d'ingénierie de procédés qui n'appartient pas au core. |

### Ordre d'implémentation (à insérer dans la séquence globale)

Après que la migration canari DcMotor valide IIntegrable + Solver
bout-en-bout (étape 6 dans la séquence existante), insérer :

- 6a. Base `ProcessUnitNode` + consommation `IChemicalStream` + enregistrement auto du hook de conservation.
- 6b. Intermédiaire `ReactorNode`.
- 6c. Feuille `SabatierReactor` — le test de raideur qui justifie le solveur Phase 2.
- 6d. `ScrubberNode` + feuille `AmineScrubber` — valide le pattern d'état sorbant non-réacteur.
- 6e. `HeatExchangerNode` + `Condenser` — valide deux-fluides + la décision IHeatStream (Q6.2).
- 6f. Classes intermédiaires restantes (Separator/Compressor/Mixer/Buffer) + feuilles à la demande.

Étapes 6a–6e : ~1 sprint. Après, chaque nouveau noeud de chimie est
quelques heures de code spécifique à la feuille.

---

## F7 — Hooks de conservation (petit, autonome)

Un hook de conservation est une fonction `(t, y) → number` dont la
valeur devrait rester quasi-constante à travers les pas du solveur.
Bundlé comme éditable sur le noeud-hôte Solver :

```ts
public addConservationHook(hook: IConservationHook): void { /* ... */ }

interface IConservationHook {
    readonly name: string;
    readonly tolerance: number;
    readonly mode: "absolute" | "relative";
    eval(y: Float64Array, t: number): number;
}
```

Le solveur appelle chaque hook enregistré après chaque macro-pas
accepté ; si l'un échoue, il log vers le bus d'alertes de la session
parente (`Logic.Event:alert-bus`, déjà livré en v0.1) ET halve le dt au
prochain pas (pas cher ; même mécanisme utilisé pour les retries de
tolérance).

C'est ~30 lignes côté solveur + un noeud
`Helios.Sim:conservation-hook` qui laisse l'utilisateur définir un
hook depuis le graphe. Le noeud `Logic.Sim:conservation-monitor` déjà
livré en v0.1 est le VISUALISEUR diagnostic ; le hook est le VALIDATEUR
au niveau solveur. Préoccupations différentes, noms similaires — garder
les deux.

---

## F8 — Snapshot / restore de l'état session

Étendre le `GraphItem.serialize/deserialize` existant (qui couvre déjà
le round-trip des champs `@cloneable`) pour couvrir AUSSI l'état Session :

- `Session.serialize()` : renvoie `{ inputBuffers: {...}, linksReady: {...},
  graphItemStates: {...} }` indexé par index de noeud. Les Sessions
  internes des sous-graphes embarqués sont récurrées via le chemin
  IGraphNodeState existant.
- `Session.deserialize(blob)` : re-établit tout.
- L'état du solveur (y, lastT) est juste une entrée indexée supplémentaire
  — les noeuds-hôtes solver participent au même protocole via `@cloneable`.

**Déjà livré en v0.1** : les noeuds `Logic.Sim:snapshot` /
`Logic.Sim:restore` utilisent un registre au niveau module comme
placeholder. Une fois `Session.serialize/deserialize` arrivé, ils
basculent vers ça. L'API côté noeud ne change pas.

---

## F9 — Scheduler multi-rate (RuntimeGraph wrapper)

Le multi-rate tombe gratuit de la composition fractale : un sous-graphe
EST un RuntimeGraph qui internement tourne `session.run(t)` une fois
par macro-tick parent. Pour le tourner K× par tick parent, le `fire()`
du sous-graphe boucle juste K fois :

```ts
// Noeud Helios.Sim:rate-group — petit wrapper RuntimeGraph
@cloneable private _multiplier: number = 10;
public override fire(parentSession: ISession, t: number): void {
    const inner = this._routeInputsFromParent(parentSession);
    if (!inner) return;
    const dt = (t - this._lastT) / this._multiplier;
    for (let k = 1; k <= this._multiplier; k++) {
        inner.run(this._lastT + k * dt);
    }
    this._lastT = t;
    this._routeOutputsToParent(parentSession, inner);
}
```

Un `Logic.Sim:rate-divider` (déjà livré v0.1) gère la direction opposée
(sous-graphe tourne plus lentement que le parent). Ensemble ils couvrent
les quatre ordres de grandeur de séparation d'échelle de temps dont
Helios a besoin.

---

## F10 — Scenes, atmosphères, et accumulateur publish-delta

Le cas d'usage Helios est une station fermée avec plusieurs pièces
isolables (habitat, labs, ECLSS bay, sas), chacune avec sa propre
composition atmosphérique qui évolue dans le temps (la respiration de
l'équipage ajoute du CO2, les scrubbers le retirent, les fuites
couplent les pièces entre elles, des agents safety scellent des pièces
sur détection de contaminant). Cette section fige l'architecture pour
cette classe de problèmes, qui se généralise au-delà d'Helios à toute
sim qui modélise des volumes bornés de matière (flux chimiques, boucles
fluides, même bus électriques avec capacités de réserve).

Trois décisions structurelles pilotent le design :

1. **Les scenes forment un graphe, pas un arbre.** L'arbre était une
   apparence de projection, pas une contrainte. Les vrais bâtiments
   ont des sas adjacents à plusieurs pièces ; les ducts HVAC traversent
   la hiérarchie. L'arbre forçait des gates dupliqués et des fictions
   de traversée de parent.
2. **`AtmosphereStateNode` est un noeud séparé de `SceneNode`.** La
   scene porte les params constants (volume, géométrie, label) ;
   l'atmosphère porte l'état dynamique (inventaire d'espèces). Une
   scene peut n'avoir aucune atmosphère (juste un marker visuel) ;
   une atmosphère peut exister sans géométrie 3D (sim headless en
   prototypage précoce).
3. **Le couplage équipement ↔ atmosphère est du producer/consumer
   standard.** Pas de nouveau type de port. L'équipement publie des
   contributions de flux massique `delta_<species>` sur les ports
   d'input variadiques de l'atmosphère ; l'atmosphère accumule via
   le mécanisme existant des input buffers du scheduler et les
   intègre comme son `rhs`.

### Topologie : scenes-comme-graphe via wiring AtmosphereStateNode

Il n'y a pas de pointeur `IScene.parent` ni de tableau
`IScene.children[]`. La topologie graphe des scenes émerge du wiring
entre les instances `AtmosphereStateNode` via les instances
`SceneGateNode`. Le runtime graph EST le scene graph ; pas de
structure de données parallèle.

```
SpaceEnvironment scene (preset Mars, no atmosphere-state, juste constantes)
   │
   ├── SmallLeakGate (mode: "open passive", area: 1e-6 m²)
   │      └── StationAtmosphere
   │
   ├── StationAtmosphere ── DoorGate (mode: "open passive") ── HabitatAtmosphere
   ├── HabitatAtmosphere  ── HvacGate  (mode: "hvac_forced") ── ECLSS_Atmosphere
   ├── HabitatAtmosphere  ── Lab1Gate  (mode: "open passive") ── Lab1Atmosphere
   ├── Lab1Atmosphere     ── FumeGate  (mode: "hvac_forced") ── ECLSS_Atmosphere
   └── ...
```

Un agent safety toggle `Lab1Gate.mode = "closed"` sur détection de
contamination. La topologie du graphe est inchangée ; seul le couplage
sur un edge est gated.

### Interface `AtmosphereStateNode`

```ts
// packages/dev/plugins/physics/src/scene/atmosphere-state.node.ts

class AtmosphereStateNode extends RuntimeNode implements IDeclaresPorts, IIntegrable {
    // ── Editables ─────────────────────────────────────────────────────
    @cloneable private _volume: number = 100;               // m³
    @cloneable private _temperature: number = 293.15;       // K (V1: imposée)
    @cloneable private _activeSpecies: ReadonlyArray<ChemicalSpeciesId>
        = ["N2", "O2", "CO2", "H2O", "Ar"];                // schéma
    @cloneable private _initialAtmosphere: string
        = "earthHumidAirSeaLevel";                          // clef AtmospherePresets
    @cloneable private _mass: ReadonlyArray<number> = [];   // inventaire initial, kg
                                                            // (auto-dérivé du preset
                                                            //  si non défini)

    // ── Ports (déclarés dynamiquement depuis _activeSpecies) ───────────
    // Inputs : un groupe variadique par espèce. N équipements peuvent
    // chacun publier une contribution delta_<species> par tick ; la
    // capacité variadique de l'input buffer les collecte toutes pour
    // le rhs.
    inputPorts: ReadonlyArray<IPortDescriptor> = this._buildInputPorts();
    variadicInput = this._activeSpecies.map((sp) => ({
        prefix: `delta_${sp}_`, type: "float",
    }));

    // Outputs : observables par espèce + agrégats + snapshot complet
    // IChemicalStream. Wirés aux capteurs, gates, dashboard, et tout
    // autre équipement qui a besoin de LIRE l'atmosphère.
    outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...this._activeSpecies.flatMap((sp) => [
            { slot: `mass_${sp}`,        type: "float" },  // kg dans le volume
            { slot: `mole_fraction_${sp}`, type: "float" },
            { slot: `partial_pressure_${sp}`, type: "float" }, // Pa
            { slot: `ppm_${sp}`,         type: "float" },
        ]),
        { slot: "pressure",    type: "float" },             // Pa total
        { slot: "temperature", type: "float" },             // K
        { slot: "density",     type: "float" },             // kg/m³
        { slot: "stream",      type: "chemical" },          // IChemicalStream complet
    ];

    // ── IIntegrable ───────────────────────────────────────────────────
    get stateSize(): number { return this._activeSpecies.length; }
    get stateNames(): ReadonlyArray<string> {
        return this._activeSpecies.map((sp) => `m_${sp}`);
    }

    gatherState(y: Float64Array, off: number): void {
        for (let i = 0; i < this.stateSize; i++) y[off + i] = this._mass[i];
    }
    writeState(y: Float64Array, off: number): void {
        for (let i = 0; i < this.stateSize; i++) {
            this.setField(`mass_${this._activeSpecies[i]}`, this._mass[i],
                          y[off + i], (v) => { this._mass[i] = v; });
        }
    }

    rhs(t, y, off, inputs, dydt): void {
        // Pour chaque espèce, somme toutes les contributions delta_<species>_<k>
        // queuées dans l'input buffer ce tick. Le solveur garantit que
        // les inputs sont peuplées depuis la phase publish amont avant
        // que le rhs ne soit appelé (orchestration deux-phases Session, §F3).
        for (let i = 0; i < this.stateSize; i++) {
            const sp = this._activeSpecies[i];
            dydt[off + i] = inputs.sumPrefix(`delta_${sp}_`);
        }
    }

    fire(session, t): void {
        // I/O pur : publie les observables. Les équipements aval voient
        // l'état fraîchement mis à jour par le solveur (Phase 1 déjà tournée).
        const totalMass = this._mass.reduce((s, m) => s + m, 0);
        const totalMoles = this._totalMoles();
        const P = this._computePressure(totalMoles);
        for (let i = 0; i < this.stateSize; i++) {
            const sp = this._activeSpecies[i];
            this.publish(`mass_${sp}`,             this._mass[i]);
            this.publish(`mole_fraction_${sp}`,    this._moleFraction(i, totalMoles));
            this.publish(`partial_pressure_${sp}`, this._partialPressure(i, totalMoles, P));
            this.publish(`ppm_${sp}`,              this._ppm(i, totalMoles));
        }
        this.publish("pressure",    P);
        this.publish("temperature", this._temperature);
        this.publish("density",     totalMass / this._volume);
        this.publish("stream",      this._snapshotStream(P));
    }
}
```

**Extension helper `inputs.sumPrefix`** sur `IIntegrationInputs` :
collecte toute input sur les slots matchant un prefix, renvoie la
somme. Utilisé exactement ici pour l'accumulateur de flux massique
par espèce. Implémentation triviale (quelques lignes sur le inputs
resolver), mais helper first-class parce que le pattern réapparait
chaque fois que plusieurs producers partagent une destination.

### Interface `SceneGateNode` (3 modes)

```ts
class SceneGateNode extends RuntimeNode implements IIntegrable {
    @cloneable mode: "closed" | "open_passive" | "hvac_forced" = "open_passive";
    @cloneable area:        number = 1.0;                 // m² pour open_passive
    @cloneable leakCoeff:   number = 1e-3;                // open_passive
    @cloneable forcedFlow:  number = 0;                   // m³/s pour hvac_forced
    @cloneable bidirectional: boolean = true;

    // Inputs : souscrit aux observables d'espèces des deux atmosphères
    // (concentrations upstream nécessaires pour calculer la partition).
    inputPorts = [
        { slot: "A_pressure", type: "float" },
        { slot: "A_temperature", type: "float" },
        { slot: "B_pressure", type: "float" },
        { slot: "B_temperature", type: "float" },
        // plus variadique pour A_mole_fraction_<species>, B_mole_fraction_<species>
    ];
    variadicInput = [
        { prefix: "A_mole_fraction_", type: "float" },
        { prefix: "B_mole_fraction_", type: "float" },
    ];

    // Outputs : publie delta_<species> sur LES DEUX atmosphères. Côté
    // source = deltas négatifs ; côté destination = deltas positifs.
    // Chaque port output est nommé pour matcher exactement la convention
    // de slot input de l'atmosphère (ex. "delta_CO2_gateX").
    outputPorts = [
        // variadique : A_delta_<species>, B_delta_<species> wirés par
        // l'utilisateur à delta_<species>_<gateId> des atmosphères
    ];
    variadicOutput = [
        { prefix: "A_delta_", type: "float" },
        { prefix: "B_delta_", type: "float" },
    ];

    // IIntegrable quand mode = "hvac_forced" avec aging :
    get stateSize(): number {
        return this.mode === "hvac_forced" ? 1 : 0;  // cumul throughput ventilateur
    }

    rhs(t, y, off, inputs, dydt): void {
        if (this.mode === "closed") return;  // pas de flux
        // open_passive : flux_i = leakCoeff × area × (P_A - P_B) × x_upwind_i
        // hvac_forced  : flux_i = forcedFlow × density_A × x_A_i (downstream A→B)
        // Publie négatif sur A_delta_<sp>, positif sur B_delta_<sp>.
        // ...
    }

    fire(session, t): void { /* publie A_delta_<sp>, B_delta_<sp> par espèce */ }
}
```

### Pourquoi le pattern publish-delta est la bonne primitive

Il piggyback sur l'infrastructure qui existe déjà, entièrement testée :

| Besoin | Mécanisme existant qui colle |
|--------|------------------------------|
| N producers contribuant à un accumulateur | Ports d'input variadiques + input buffers par slot (la même infra que Sum et Stem utilisent) |
| Indépendance d'ordre (peu importe quel équipement publie en premier) | Orchestration deux-phases Session : tous les publishes atterrissent avant qu'aucun rhs ne tourne |
| Read+write bidirectionnel | Le même noeud publie ses outputs (atmosphère → monde) et accepte des inputs (monde → atmosphère). Noeuds duck-typés standards. |
| État frais par tick sans références retenues | Chaque publish porte une valeur fraîche ; pas de caching, pas de staleness |
| Intégration hook de conservation (F7) | Post-pas du solveur somme toutes les deltas publiées et vérifie contre changement d'inventaire. Natif. |

Coût d'inventer un mécanisme `IScenePort` nouveau à la place : un
nouveau type de port (avec sa sémantique de garde au connect), un
nouveau modèle de sampling (extract/inject), du plumbing de référence
de scene par équipement, sérialisation des références scene à travers
save/load. Le pattern publish-delta nécessite ZÉRO de ça.

### Partitionnement multi-rate pour le cas d'usage Helios

Le scénario scrubber + MCSA Helios a quatre ordres de grandeur
d'échelles de temps coexistant dans un seul graphe. Le multi-solveur
attaché à la Session (§F3) les gère via filtrage typeId de feuille :

| Marker solveur | Filtre glob | Macro rate | Solveur | Justification |
|----------------|-------------|------------|---------|---------------|
| `MCSA / électrique` | `Physics.Electric.*` | ~100 kHz | RK4 fixe | Harmoniques de courant pour détection de faute (BPFO, BPFI) demandent Nyquist > 10 kHz. Switching de puissance à 10-20 kHz demande résolution explicite. |
| `Process / flux` | `Helios.Process.*` &#124; `Physics.Mechanical.*` &#124; `Physics.Scene:atmosphere-state` &#124; `Physics.Scene:gate` | ~100 Hz | RK4 adaptatif (Phase 2 Rosenbrock pour la zone Sabatier stiff) | Dynamique de pompe, compositions, contrôle de débit. |
| `Aging / lent` | `Helios.Catalyst:*` &#124; état cartouche | ~1/min | Euler explicite | Décroissance capacité sorbant, accumulation clog filtre, sintering catalyseur. Aging à l'échelle de jours en wall clock de minutes. |

Trois marker nodes, trois ensembles de feuilles disjoints. Pas de
glitch de couplage entre eux parce que l'état slow-rate évolue
quasi-statiquement du point de vue fast-rate, et les signaux
électriques fast moyennent au time scale slow.

### Questions ouvertes pour cette section

| # | Question | Ma proposition |
|---|----------|----------------|
| Q-S1 | Séparation `SceneNode` vs `AtmosphereStateNode` | Séparée. `Physics.Scene:scene` reste léger (params + géométrie) ; `Physics.Scene:atmosphere-state` est le porteur IIntegrable. Une scene sans atmosphère est juste un marker visuel. |
| Q-S2 | Nouveau type `IScenePort` avec sample/inject ? | **Non.** Utiliser publish-delta via ports input/output standards. Le mécanisme variadique d'input buffer gère déjà l'accumulation N-vers-1. |
| Q-S3 | Hiérarchie scene en arbre ou graphe ? | **Graphe.** Pas de pointeur `parent` sur `IScene`. Topologie émerge du wiring des noeuds gate. |
| Q-S4 | Partitionnement multi-rate du solveur pour Helios | Trois solveurs (MCSA / process / aging) splittés par glob typeId. |
| Q-S5 | Comment les scenes sont initialisées au Play ? | Ordre de priorité : (1) snapshot restauré, (2) editable explicite `_initialAtmosphere`, (3) `AtmospherePresets[<id>]` depuis le gate parent. |
| Q-S6 | Stratification (gaz lourds s'accumulent au sol, légers au plafond) ? | **Différé V2.** Modèle bulk en V1. Raffiner quand "concentration vs altitude" devient une figure de papier. |
| Q-S7 | Couplage thermique entre scenes ? | **Différé V2.** V1 laisse `temperature` comme editable imposée sur `AtmosphereStateNode`. Nécessitera une analogie résistance/capacité thermique au niveau pair de scenes. |
| Q-S8 | Variadique par espèce : `variadicInput[]` un descripteur par espèce, OU un seul prefix `delta_` avec parsing de suffixe ? | Forme tableau (un par espèce). Chaque espèce a son propre groupe variadique ; le reconciler editor les garde indépendants (comme les groupes `f_/A_` de Stem). Auto-grow on connect par espèce. |
| Q-S9 | Capacité buffer pour les slots `delta_<species>_N` | Déclarée dynamiquement par `AtmosphereStateNode` selon le nombre de producers connectés courant, avec un plancher à 4. Évite overflow sur les pièces busy en gardant le défaut pas cher. |
| Q-S10 | `SceneGateNode` toujours IIntegrable ? | Conditionnel. `closed` et `open_passive` sont des transformations algébriques pures (publish-only, pas d'état). `hvac_forced` devient IIntegrable quand l'utilisateur veut suivre le cumul throughput ventilateur pour aging. Toggle pilote `stateSize` entre 0 et 1. |
| Q-S11 | Persistance du species set dans les snapshots | L'editable `_activeSpecies` est `@cloneable` donc round-trip via le chemin GraphItem.serialize existant. La layout du state vector en dépend ; restaurer un snapshot avec un species set différent est rejeté avec un diagnostic clair au load time. |

### Items délibérément différés à un doc ultérieur (flagués pour V3)

- **Couplage thermique entre scenes (HEN au niveau bâtiment)** :
  résistance thermique par paire de scenes, conduction paroi, couplage
  radiateur.
- **Stratification verticale des gaz dans les pièces hautes** : CO2
  lourd s'enfonce, H2 léger monte. Modèle bulk en V1.
- **Interfaces de phase en microgravité** : en 0g, pas de séparation
  gravitationnelle gaz/liquide. Knockout drum, condenseur, scrubber
  amine reposent TOUS sur la gravité. Modèles tension de surface et
  wicking requis.
- **Cinétique biologique** : module serre avec cycle CO2/O2 biologique
  parallèle au physico-chimique. Nouvelles espèces (biomasse),
  nouvelles lois de vitesse.

C'est du territoire V3. Listé ici pour ne pas l'oublier quand pertinent.

### Ordre d'implémentation

Atterrir après la hiérarchie meta-node chimie (étapes 6a-6f en §F6) :

- **10a.** Étendre `IScene` avec champ `atmosphere?: IChemicalStream` (réalisation Q4.6). Changement additif, pas de régression.
- **10b.** `Physics.Scene:atmosphere-state` (le nouveau noeud IIntegrable).
- **10c.** Helper `IIntegrationInputs.sumPrefix(prefix)` (~10 lignes sur le inputs resolver).
- **10d.** `Physics.Scene:gate` (3 modes, IIntegrable quand hvac_forced).
- **10e.** Migrer une feuille Helios.Process (AmineScrubber) au wiring publish-delta contre un AtmosphereStateNode. Valide accumulation + conservation bout-en-bout.
- **10f.** Scénario scrubber complet (station + 3 pièces + 2 scrubbers + équipage source). Smoke-test du partitionnement multi-rate.

Étapes 10a-10e : ~3 jours. Étape 10f : 1-2 jours de wiring + dashboard.

---

## Synthèse des questions ouvertes (uniquement les vivantes)

| ID | Question | Ma proposition |
|----|----------|----------------|
| Q1.1 | `stateSize` réactif ou figé ? | Figé à la compile. |
| Q1.2 | Entrées rhs : résolues per-call ou snapshot per-macro-tick ? | Snapshot per macro-tick. |
| Q1.3 | Tous les noeuds à état migrent vers IIntegrable, ou coexistent ? | Coexistent en permanence. |
| ~~Q3.1~~ | ~~Comment le solveur fire avant ses siblings intégrables ?~~ | **RÉSOLU** par attachement au niveau Session (phase intégration précède phase dispatch). |
| Q3.2 | Comment partitionner les feuilles à travers plusieurs solveurs ? | Filtre glob sur typeId de feuille. Editable du marker. |
| Q3.3 | Snapshot de l'état interne du solveur ? | Seulement `y` et `lastT`. |
| Q3.4 | Que fait le `fire()` du marker node ? | Rafraîchit les viewables de diagnostic seulement ; jamais d'intégration. |
| Q3.5 | Comment l'attachement de solveur est-il sérialisé ? | Pas directement. Le marker node persiste ; son `reset()` ré-attache. |
| ~~Q4.1~~ | ~~Enthalpie sur le stream ou calculée ?~~ | **RÉSOLU** — `IThermodynamicState.enthalpy` optionnelle. |
| ~~Q4.2~~ | ~~Support deux-phases ?~~ | **RÉSOLU** — `phases: IPhaseState[]` first-class. |
| ~~Q4.3~~ | ~~Stream comme objet immuable par tick ?~~ | **RÉSOLU** — `readonly` partout. |
| Q4.4 | Extensibilité runtime du registre d'espèces ? | Oui — helper `registerSpecies` + mirror map utilisateur. |
| Q4.5 | Mismatch de base de composition au connect — auto-convert ou reject ? | Auto-convert quand masses molaires connues ; reject avec diagnostic sinon. |
| Q4.6 | `AtmospherePresets` ↔ `Physics.Scene` ? | Sourcer : ajouter `atmosphere?: IChemicalStream` à `IScene`. |
| Q4.7 | `IChemicalStream.state` (agrégat mixed-phase) obligatoire ? | Optionnel ; viz calcule moyenne pondérée par masse sinon. |
| Q6.1 | Activité catalyseur : état intégré ou mise à jour lente séparée ? | État intégré. |
| Q6.2 | Chaleur comme port IHeatStream séparé ou portée dans le stream chimique ? | IHeatStream séparé. |
| Q6.3 | Sous-graphe moteur interne au CompressorNode ou wiring externe ? | Composer en interne (fractal). |
| Q6.4 | Classes de base meta-node dans core ou plugin-helios ? | Plugin-helios. |
| Q-S1 | Séparation `SceneNode` vs `AtmosphereStateNode` ? | Séparée. |
| Q-S2 | Nouveau type `IScenePort` ou publish-delta ? | **Publish-delta** (pas de nouveau type de port). |
| Q-S3 | Hiérarchie scene arbre ou graphe ? | **Graphe.** Topologie via wiring gate-node. |
| Q-S4 | Partitionnement multi-rate pour scrubber+MCSA Helios | Trois solveurs (MCSA / process / aging) par typeId glob. |
| Q-S5 | Ordre priorité d'initialisation scene ? | Snapshot > editable explicite > preset hérité. |
| Q-S6 | Stratification verticale des gaz ? | Différé V2 (bulk V1). |
| Q-S7 | Couplage thermique entre scenes ? | Différé V2 (`temperature` imposée V1). |
| Q-S8 | Variadique par espèce : un descripteur par espèce ou prefix unique ? | Forme tableau (un groupe variadique par espèce). |
| Q-S9 | Capacité buffer pour `delta_<species>_N` ? | Dynamique, plancher 4. |
| Q-S10 | `SceneGateNode` toujours IIntegrable ? | Conditionnel (seulement quand `hvac_forced` avec aging). |
| Q-S11 | Persistance species set dans snapshots ? | Via `@cloneable _activeSpecies` ; rejeté au load si mismatch. |

---

## Séquence d'implémentation recommandée (révisée, scope plus petit)

1. `sim.interfaces.ts` (nouveau dans core) — interfaces `IIntegrable` + garde `isIntegrable`. Pas de nouveau comportement, types seulement.
2. `sim.chemical.ts` (nouveau dans core) — type stream F4 + helpers.
3. Ajout de `"chemical"` à l'union PortType + extension de la garde au connect dans nodeeditor/src/connection.ts.
4. `rk4-adaptive.solver.ts` (nouveau dans plugin-helios ou core, TBD) — F3 Phase 1, Cash-Karp adaptatif (~150 LoC).
5. Noeud-hôte `Helios.Sim:rk4-solver` — enveloppe le solveur comme noeud de graphe.
6. **Migration canari** : porter `DcMotorDynamicNode` vers `IIntegrable`. Comparaison côte-à-côte : même graphe tourné sur le chemin Euler-inline existant vs. le nouveau chemin piloté par solveur. Équivalence numérique requise (à la différence de précision RK4 vs Euler — le solveur devrait être STRICTEMENT meilleur).
6a. Base `ProcessUnitNode` (§F6).
6b. Intermédiaire `ReactorNode`.
6c. Feuille `SabatierReactor` (test de raideur Phase 2).
6d. `ScrubberNode` + `AmineScrubber`.
6e. `HeatExchangerNode` + `Condenser` (décision Q6.2).
6f. Mid-tier + feuilles restantes selon besoin.
7. Noeud `Helios.Sim:rate-group` — F9 multiplicateur (rate-divider déjà livré).
8. Noeud `Helios.Sim:conservation-hook` — F7.
9. Ensuite démarrer la chimie : l'électrolyseur PEM est la première
   feuille IIntegrable post-canari.

Étapes 1–6 : ~3 jours. Étapes 6a–6e : ~1 sprint. Étapes 7+8 : 1 jour.
Étapes 9+ : scope sprint chimie.

---

## Synthèse de l'impact migration

| Composant | Changement | Risque |
|-----------|-----------|--------|
| `RuntimeGraph` | Aucun (déjà fractal-capable) | — |
| `Session` | F3 : ajout `attachSolver` / `detachSolver` / `solvers` + `run(t)` en deux phases. F8 : ajout serialize/deserialize pour input buffers + linksReady. | Faible à moyen — API additive ; le changement de `run()` est le seul shift comportemental mais la phase dispatch utilise le même chemin de code. |
| `IRuntimeNode` | Aucun (le trait est OPTIONNEL via duck typing) | — |
| Moteurs existants | Aucun sauf si migrés. Migration per-moteur et réversible. | Faible |
| Union `PortType` | Ajout `"chemical"` + sous-vérification espèces au connect | Faible — additif |
| `OnnxGraphExporter` | Généraliser de ComputeGraph à RuntimeGraph (travail séparé) | Moyen — touche au pipeline d'export |
| `GraphRunner` | Aucun — le marker node et l'attach Session se font automatiquement via `reset(session)`. | — |

Les changements de framework sont chirurgicaux. La majorité du travail
est **per-feuille** : implémenter `IIntegrable` sur les noeuds de
chimie au fur et à mesure qu'ils sont écrits.
