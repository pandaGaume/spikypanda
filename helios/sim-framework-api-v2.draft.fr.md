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

## F3 — `ISolver` comme noeud-hôte

### Architecture : le solveur est un noeud Helios, pas un runtime invisible

Le plus simple à intégrer avec le modèle fractal existant : le solveur
est un `RuntimeNode` qu'on dépose dans un graphe. À session start il
découvre chaque feuille `IIntegrable` dans **son graphe contenant**
(c.-à-d. `parentSession.graph.nodes`, filtré par `isIntegrable`), alloue
le vecteur d'état global y, et chaque `fire(t)` fait avancer y de
exactement dt macro-tick (composé de N micro-pas adaptatifs internes).

### Interface proposée

```ts
// même fichier

export interface ISolverStep {
    /** Temps de pas accepté à la fin du macro-tick. */
    readonly t: number;
    /** Nombre de micro-pas internes pris. */
    readonly microSteps: number;
    /** Plus grande estimation d'erreur locale observée. */
    readonly maxError: number;
    /** Nombre d'évaluations RHS dépensées sur ce macro-tick. */
    readonly rhsEvals: number;
}

export interface ISolver {
    readonly name: string;

    /** True quand le solveur peut utiliser des jacobiennes analytiques
     *  (les solveurs implicites en profitent ; les explicites ignorent). */
    readonly supportsJacobian: boolean;

    /** Accroche le solveur à un graphe + ensemble de feuilles spécifique.
     *  Appelé une fois à session start ; le solveur cache la table des
     *  offsets de chaque IIntegrable vers une tranche du vecteur y global. */
    initialize(
        graph: IRuntimeGraph,
        integrableLeaves: ReadonlyArray<IIntegrable>,
        t0: number,
    ): void;

    /** Avance la simulation de `dt` secondes. Renvoie les diagnostics
     *  de pas. Mute l'état global sur place (writeState de chaque
     *  feuille est appelé une fois à la fin du macro-pas accepté). */
    step(dt: number, inputs: SolverInputResolver): ISolverStep;

    /** Libère la table d'offsets cachée + buffers. Appelé à session reset. */
    dispose?(): void;
}

/** Le solveur appelle ceci une fois par macro-tick pour obtenir un
 *  snapshot des valeurs courantes des ports d'entrée de chaque feuille
 *  intégrable. L'implémentation concrète parcourt
 *  `parentSession.linkStates` et résout les noms → valeurs. */
export type SolverInputResolver = (leaf: IIntegrable) => IIntegrationInputs;
```

### Le noeud-hôte

```ts
// packages/dev/plugins/helios/src/sim/rk4-solver.node.ts

@cloneable private _tolerance: number = 1e-6;
@cloneable private _maxStep:   number = 1e-2;   // cap 10 ms

private _solver: RK4AdaptiveSolver | null = null;
private _y:      Float64Array | null = null;
private _leaves: IIntegrable[] = [];

public override reset(parentSession: ISession): void {
    // Découvre les siblings intégrables dans le graphe contenant.
    const nodes = parentSession.graph.nodes as ReadonlyArray<IRuntimeNode>;
    this._leaves = nodes.filter(isIntegrable);
    if (this._leaves.length === 0) {
        // Pas d'intégrables dans ce graphe — le solveur est un no-op.
        this._solver = null;
        return;
    }
    const totalSize = this._leaves.reduce((s, l) => s + l.stateSize, 0);
    this._y = new Float64Array(totalSize);
    // Collecte l'état initial depuis chaque feuille.
    let off = 0;
    for (const leaf of this._leaves) { leaf.gatherState(this._y, off); off += leaf.stateSize; }
    this._solver = new RK4AdaptiveSolver({ tolerance: this._tolerance, maxStep: this._maxStep });
    this._solver.initialize(parentSession.graph, this._leaves, 0);
}

public override fire(parentSession: ISession, t: number): void {
    if (!this._solver || !this._y) return;
    const dt = t - this._lastT;
    this._lastT = t;
    const inputResolver: SolverInputResolver = (leaf) =>
        this._snapshotInputs(parentSession, leaf);
    this._solver.step(dt, inputResolver);
    // Écrit y dans chaque feuille pour les viewables + fire() aval.
    let off = 0;
    for (const leaf of this._leaves) { leaf.writeState(this._y, off); off += leaf.stateSize; }
}
```

Le noeud-solveur **doit fire avant** les feuilles IIntegrable dans
l'ordre de scheduler du graphe parent, pour que les feuilles voient
l'état mis à jour quand leur propre fire() tourne pour publier les
sorties. Concrètement : l'utilisateur câble la sortie synthétique `tick`
du solveur sur le port `_enable` ou un port-dépendance léger des
feuilles, ou bien le scheduler apprend à ordonner les noeuds solver-host
en premier (option B plus propre mais invasive — proposer A pour V1).

### Implémentation phasée (inchangée par rapport à v1)

| Phase | Solveur | Quand |
|-------|---------|-------|
| 1 | RK4 Cash-Karp / Dormand-Prince (impl maison, ~150 LoC) | Premier sprint Helios. Valide le contrat IIntegrable bout-en-bout. |
| 2 | Rosenbrock4 (impl maison ~600 LoC, ou portage TS pur de Boost.odeint) | Quand la cinétique Sabatier force la raideur > 10⁴ |
| 3 | SUNDIALS IDA/CVODES (build WASM) | Quand DAE ou analyse de sensibilité nécessaire |

### Questions ouvertes

| # | Question | Proposition |
|---|----------|-------------|
| Q3.1 | Comment le solveur garantit-il qu'il fire avant ses siblings IIntegrable à chaque macro-tick ? | V1 : s'appuyer sur l'ordre des noeuds du graphe + câblage par l'utilisateur de `_started` du solveur vers les ports de contrôle des feuilles. V2 : drapeau de priorité solver dédié dans le scheduler. |
| Q3.2 | Un solveur par graphe, ou plusieurs solveurs peuvent coexister ? | Un par RuntimeGraph. Un sous-graphe enfant (sous-graphe embarqué qui est lui-même un RuntimeGraph) peut porter son propre solveur, donnant les solveurs hiérarchiques naturellement — solveur lent de top-level enveloppant un sous-graphe avec un solveur plus rapide. |
| Q3.3 | Snapshot de l'état du solveur ? | Seulement `y` et `lastT`. La recommandation `dt` interne du solveur adaptatif redémarre de zéro au restore. |

---

## F4 — Type de port `IChemicalStream`

Inchangé par rapport à v1 dans l'esprit. Reformulé plus serré :

```ts
// packages/dev/core/src/sim/sim.chemical.ts (nouveau fichier)

export interface IChemicalStream {
    readonly mdot: number;       // kg/s
    readonly T:    number;       // K
    readonly P:    number;       // Pa
    readonly composition: ReadonlyMap<ChemicalSpecies, number>;  // fractions molaires, somme à 1
}

export type ChemicalSpecies =
    | "H2O" | "H2" | "O2" | "CO2" | "CH4" | "N2" | "Ar" | "He";

export function validateComposition(c: ReadonlyMap<ChemicalSpecies, number>): boolean {
    let s = 0; for (const v of c.values()) { if (v < 0) return false; s += v; }
    return Math.abs(s - 1) < 1e-9;
}
export function speciesFlow(stream: IChemicalStream, sp: ChemicalSpecies): number {
    return (stream.composition.get(sp) ?? 0) * stream.mdot;
}
```

**Intégration aux types de port** : ajouter `"chemical"` à l'union
`PortType` existante
(`packages/dev/core/src/execution/execution.interfaces.ts`). La garde
`GraphViewer.connect()` impose déjà la compatibilité de type — ajouter
une sous-vérification d'ensemble d'espèces pour les connexions
chemical↔chemical :

```ts
// forme approximative — emplacement réel : packages/dev/nodeeditor/src/connection.ts
if (fromPort.type === "chemical" && toPort.type === "chemical") {
    if (!speciesSetsCompatible(fromPort.species, toPort.species)) {
        rejectConnection("ensemble d'espèces incompatible");
    }
}
```

`PortDescriptor` a besoin d'un champ optionnel
`species?: ReadonlyArray<ChemicalSpecies>` pour que les ports chemical
déclarent leur schéma.

### Questions ouvertes

| # | Question | Proposition |
|---|----------|-------------|
| Q4.1 | Tracker l'enthalpie sur le stream ou la calculer depuis (T, composition) ? | Calculée via helper `enthalpy(stream)` adossé à une table de propriétés des espèces. Pas de dénormalisation. |
| Q4.2 | Support deux-phases ? | V1 gaz mono-phase. Ajouter un flag `phase` seulement quand le knockout drum (V-701) arrive. |
| Q4.3 | Stream comme objet immuable par tick ? | Oui. Pas cher ; une allocation par unité de procédé par tick. |

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

## Synthèse des questions ouvertes (uniquement les vivantes)

| ID | Question | Ma proposition |
|----|----------|----------------|
| Q1.1 | `stateSize` réactif ou figé ? | Figé à la compile. |
| Q1.2 | Entrées rhs : résolues per-call ou snapshot per-macro-tick ? | Snapshot per macro-tick. |
| Q1.3 | Tous les noeuds à état migrent vers IIntegrable, ou coexistent ? | Coexistent en permanence. |
| Q3.1 | Comment le solveur fire avant ses siblings intégrables ? | Câbler `_started` → contrôle des feuilles en V1 ; flag de priorité scheduler en V2. |
| Q3.2 | Un solveur par RuntimeGraph ? | Oui — les solveurs hiérarchiques tombent naturellement via l'embarquement de sous-graphe. |
| Q3.3 | Snapshot de l'état interne du solveur ? | Seulement `y` et `lastT`. |
| Q4.1 | Enthalpie sur le stream ou calculée ? | Calculée via helpers. |
| Q4.2 | Support deux-phases ? | V1 mono-phase seulement. |
| Q4.3 | Stream comme objet immuable par tick ? | Oui. |
| Q6.1 | Activité catalyseur : état intégré ou mise à jour lente séparée ? | État intégré. |
| Q6.2 | Chaleur comme port IHeatStream séparé ou portée dans le stream chimique ? | IHeatStream séparé. |
| Q6.3 | Sous-graphe moteur interne au CompressorNode ou wiring externe ? | Composer en interne (fractal). |
| Q6.4 | Classes de base meta-node dans core ou plugin-helios ? | Plugin-helios. |

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
| `Session` | F8 : ajout serialize/deserialize pour input buffers + linksReady | Faible — additif sur le GraphItem serialize existant |
| `IRuntimeNode` | Aucun (le trait est OPTIONNEL via duck typing) | — |
| Moteurs existants | Aucun sauf si migrés. Migration per-moteur et réversible. | Faible |
| Union `PortType` | Ajout `"chemical"` + sous-vérification espèces au connect | Faible — additif |
| `OnnxGraphExporter` | Généraliser de ComputeGraph à RuntimeGraph (travail séparé) | Moyen — touche au pipeline d'export |
| `GraphRunner` | Aucun (le solveur est un noeud qu'il dispatche comme n'importe quel autre) | — |

Les changements de framework sont chirurgicaux. La majorité du travail
est **per-feuille** : implémenter `IIntegrable` sur les noeuds de
chimie au fur et à mesure qu'ils sont écrits.
