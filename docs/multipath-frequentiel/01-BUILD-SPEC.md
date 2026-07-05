# Build spec — Substrat multi-fréquence (Jalon 1)

### Instructions destinées à Claude Code, exécutées DANS le dépôt `spikypanda`

Ce document est le plan de construction du premier jalon décrit dans `00-PAPIER.md` :
**prouver que plusieurs sous-chemins coexistent sur une même arête du graphe et se re-séparent proprement par filtrage (hypothèse H1), avec une fuite inter-bande mesurée < 5 %.**

Il est écrit pour être exécuté pas à pas. Chaque étape a un **livrable** et un **critère d'acceptation** vérifiables.

> **Règle d'or pour l'agent :** ce spec référence des types et des fichiers réels, mais **vérifie chaque signature dans le code avant de l'utiliser** (les API ont pu bouger). En cas d'écart entre ce spec et le code, le code fait foi — signale l'écart et adapte.

---

## 0. Contexte technique observé (à confirmer)

Monorepo TypeScript, workspaces npm. Build via `tsc -b`, tests via `jest`, lint `eslint`, format `prettier`.

Briques réelles repérées (à confirmer par lecture) :

**Cœur — `packages/dev/core`**
- Graphe : `INode`, `IOlink` (lien dirigé `oini → ofin`), `IGraph` — `src/graph/graph.interfaces.ts`.
- Neurone : `class Neuron extends GraphNode` — `src/neuralnetwork/nn.neuron.ts`.
- Synapse : `class Synapse extends GraphOLink` avec `@cloneable weight: number` — `src/neuralnetwork/nn.synapse.ts` ; interface `ISynapse extends IOlink { weight: number }` — `src/neuralnetwork/nn.interfaces.ts`.
- Décorateur `@cloneable` (deep-copy) — `src/graph/graph.interfaces.ts`.
- Exécution dataflow : `RuntimeNode` (`fire(session, t)`, `session.consume(idx)`, `session.publish(idx, val)`, `session.linkStates[idx].ready`), pattern de ports `IDeclaresPorts` + `IPortDescriptor { slot, optional, type }`.

**Plugin DSP — `packages/dev/plugins/dsp`** (tout est déjà là pour H1)
- `OscillatorNode` (`src/generator/oscillator.node.ts`) : `amplitude·sin(2π·f·t + φ)`, ports `t`, `frequency`, `amplitude`, `phase` → `value`.
- `ChannelMuxNode` (`src/stream/mux.node.ts`) : additionne N flux scalaires en un tenseur `[N]` (voir le motif variadique `in_0, in_1, …`).
- Factories DSP (`src/nodes/factories.ts`) : `createFftNode`, `createIfftNode`, `createMagnitudeNode`, `createPhaseNode`, `createBiquadFilterNode`, `createMelFilterbankNode`, `createRmsNode`, `createFrameNode`, `createWindowNode`…
- `ScalarBufferNode` (`src/stream/buffer.node.ts`) : accumule des échantillons en trames pour la FFT.

**Conventions d'import :** dans le cœur, imports relatifs (`../graph`). Dans les plugins, import depuis l'alias `"spikypanda-core"`. Respecte la convention du dossier où tu écris.

---

## 1. Objectif du jalon, formalisé

On définit une **bande** comme une fréquence porteuse `f_b` (Hz) + une demi-largeur. On veut :

1. Encoder K motifs scalaires connus `x_1 … x_K`, un par bande, en modulant K porteuses.
2. Les **superposer** (addition) en un seul signal composite qui circule sur **une seule arête logique** du graphe.
3. Appliquer, par bande, **un poids propre** `w_b` (c'est le cœur de l'idée : le poids dépend de la bande).
4. **Séparer** par banc de filtres et **décoder** chaque bande.
5. Mesurer :
   - **fidélité** : `x̂_b ≈ w_b · x_b` pour chaque bande,
   - **fuite** : énergie retrouvée dans la bande `b` qui provient d'une autre bande `b' ≠ b`, exprimée en % de l'énergie de `b`. Cible : **< 5 %**.

---

## 2. Étapes

### Étape A — Démo "preuve de principe" par composition pure (aucune abstraction nouvelle)

**But :** valider H1 le plus vite possible en n'utilisant QUE des nodes existants. Si ça marche, le principe physique tient avant même d'écrire une ligne d'abstraction.

**Travail :**
1. Créer un dossier de démo, p.ex. `packages/dev/plugins/dsp/examples/multipath/` (ou l'emplacement conventionnel des exemples — confirme où vivent les démos existantes).
2. Construire par script un petit graphe :
   - `Clock.t` → 3 × `OscillatorNode` aux fréquences `f = [50, 120, 200] Hz`, amplitudes `A_b = x_b` (les motifs à transmettre).
   - Les 3 sorties → `Add`/`ChannelMuxNode` puis somme → **un seul** signal composite (c'est « l'arête »).
   - Composite → `ScalarBufferNode` (trame) → `createFftNode` → `createMagnitudeNode`.
   - Lire l'amplitude aux 3 pics `f_b` = décodage des 3 bandes.
3. Appliquer un **poids par bande** `w_b` distinct (au plus simple : multiplier le pic lu, ou insérer un gain par bande avant la somme) et vérifier que seule la bande visée change quand on change `w_b`.

**Critère d'acceptation A :**
- Les 3 motifs `x_b` sont récupérés à leurs fréquences `f_b`.
- Fuite inter-bande < 5 % (mesurée sur les magnitudes).
- Modifier `w_2` seul ne modifie que la sortie de la bande 2 (± tolérance de fuite).

---

### Étape B — Introduire l'abstraction `SpectralSynapse` (le vrai substrat)

**But :** rendre l'idée réutilisable comme *primitive de graphe*, pas juste comme démo câblée à la main.

**Travail :**
   > **Décision 001 (structurante) :** le latent est **complexe** et les harmoniques
   > sont assumées. Le poids par bande est donc une **fonction de transfert complexe**
   > `w_b = g_b·e^{iφ_b}` (gain + phase), pas un réel. Voir
   > `DECISION-001-complexe-et-harmoniques.md`.

1. **Type.** Dans `packages/dev/core/src/neuralnetwork/`, créer `nn.spectral-synapse.ts` :
   ```ts
   // Poids COMPLEXE par bande : gain ET déphasage (fonction de transfert).
   // Le cas réel (gain seul) = phase[b] = 0.
   export interface ISpectralSynapse<B = unknown> extends IOlink<B> {
     bands: ReadonlyArray<number>;   // fréquences porteuses f_b (Hz), grille INHARMONIQUE
     gain: number[];                 // g_b >= 0, même longueur que bands
     phase: number[];                // φ_b en radians, même longueur que bands
     // couplage optionnel entre bandes (complexe) : c[b][j] = influence de j sur b
     coupling?: { re: number; im: number }[][];
   }

   export class SpectralSynapse<B = unknown>
     extends GraphOLink<B> implements ISpectralSynapse<B> {
     @cloneable public bands: ReadonlyArray<number>;
     @cloneable public gain: number[];
     @cloneable public phase: number[];
     @cloneable public coupling?: { re: number; im: number }[][];
     constructor(oini: INode, ofin: INode, bands: ReadonlyArray<number>, gain?: number[], phase?: number[]) {
       super(oini, ofin);
       this.bands = bands;
       this.gain = gain ?? bands.map(() => 0);
       this.phase = phase ?? bands.map(() => 0);
     }
   }
   ```
   - Suis EXACTEMENT le style de `nn.synapse.ts` (imports relatifs, `@cloneable`, generic `<B>`).
   - Exporte-le depuis le baril adéquat (`index.ts` du dossier / du package) comme l'est `Synapse`.
   - **Rétrocompat :** n'altère PAS `Synapse`. `SpectralSynapse` est un ajout. `Synapse` reste le cas 1 bande, réel.
   - **Placement inharmonique.** À la construction du graphe, vérifier qu'aucun `f_b`
     n'est multiple entier ni somme/différence d'un autre (sinon les harmoniques/IMD du
     couplage polluent la bande). Fournir une aide `assertInharmonic(bands)`.

2. **Node d'application.** Créer un `SpectralChannelNode extends RuntimeNode implements IDeclaresPorts` (côté core ou plugin DSP — choisis selon où vivent les nodes de calcul ; le DSP semble le bon endroit). Il applique, dans le domaine fréquentiel, la **fonction de transfert complexe** `w_b` à la bande `b` :
   - ports d'entrée : `signal` (composite), et le `SpectralSynapse` fournit `bands`/`gain`/`phase`/`coupling` ;
   - `fire()` : FFT **complète et complexe** (`createFftNode` — garde re *et* im, pas seulement la magnitude), multiplier chaque bin de la bande `b` par le complexe `g_b·e^{iφ_b}` (rotation de phase + gain), appliquer le terme de couplage si présent, recombiner (`createIfftNode`) ou publier les bandes ;
   - **suréchantillonnage / anti-repliement** : dès que le couplage est actif, monter `fs` (ou band-limiter) pour empêcher les harmoniques de se replier (aliasing) ;
   - respecte le **contrat d'allocation** (préallocation/réutilisation) visible dans `ChannelMuxNode`.

3. **Différentiabilité (préparation des jalons suivants).** Superposition (addition), filtrage complexe (multiplication par `w_b`) et couplage (multiplication) restent dérivables — en complexe via **Wirtinger**, ou en traitant chaque complexe comme deux réels (re, im). Précédent : le *Fourier Neural Operator* rétropropage à travers la FFT avec des poids complexes. Documente où un gradient passerait. Pas besoin d'entraîner à ce jalon, mais ne casse pas cette possibilité.

**Critère d'acceptation B :**
- `SpectralSynapse` compile, se clone correctement (teste `clone()`), sérialise comme les autres `GraphItem`.
- Le `SpectralChannelNode` reproduit le résultat de l'étape A, piloté par `SpectralSynapse` (`gain`/`phase`) au lieu d'un câblage manuel.
- **Phase vérifiée** : un déphasage `φ_b` appliqué se lit bien à la sortie (partie réelle/imaginaire), et le cas `φ_b = 0` redonne l'étape A réelle.

---

### Étape C — Test automatique (jest) + mesure de fuite

**But :** figer H1 dans un test qui repasse au vert à chaque build.

**Travail :** créer `*.test.ts` (emplacement des tests existants à confirmer) qui :
1. construit le graphe (via l'abstraction de l'étape B),
2. injecte des motifs connus `x_b` sur K = 2 puis K = 3 bandes,
3. exécute la simulation,
4. mesure fidélité et **fuite inter-bande**, et `expect(leakage).toBeLessThan(0.05)`,
5. vérifie l'**isolation** : changer un seul `w_b` ne bouge qu'une bande.

**Fonction de mesure de fuite (à implémenter proprement) :** pour chaque bande `b`, énergie du signal décodé quand SEULE la bande `b` est excitée (signal utile) vs. énergie qui apparaît en `b` quand seules les AUTRES bandes sont excitées (fuite). `leakage_b = E_fuite / E_utile`.

**Critère d'acceptation C :** `npm test` (ou la commande du repo) exécute ce test et il passe. Lint + format OK. Build `tsc -b` OK.

---

## 3. Garde-fous et non-objectifs

- **Ne touche pas** aux applications (`applications-*`) ni aux autres plugins à ce jalon.
- **N'introduis pas** d'apprentissage/plasticité/récompense maintenant : ce sont les jalons 2+.
- **Pas de sur-ingénierie** : K = 2–3 bandes, un graphe minimal. On veut une preuve, pas un framework.
- **Isole la démo** : elle doit tourner sans dépendre des gros jeux de données (`data/`).
- Si le banc de filtres existant ne descend pas sous 5 % de fuite, **documente-le** (choix des `f_b`, largeur des bandes, fenêtrage) plutôt que de le cacher — c'est un résultat en soi (voir §8 du papier).

---

## 4. Ordre d'exécution recommandé

1. Lire et confirmer les signatures réelles : `nn.synapse.ts`, `nn.interfaces.ts`, `graph.interfaces.ts`, `oscillator.node.ts`, `mux.node.ts`, `buffer.node.ts`, `nodes/factories.ts`, et le `index.ts`/baril d'export du cœur et du plugin DSP.
2. Étape A (démo composition) → valider H1 physiquement.
3. Étape B (`SpectralSynapse` + node) → rendre ça réutilisable.
4. Étape C (test + mesure fuite) → verrouiller.
5. Rédiger un court `RESULTATS.md` dans ce dossier : chiffres de fuite obtenus, choix de bandes, ce qui marche / ce qui coince. Boucle de retour vers `00-PAPIER.md`.

---

## 5. Définition de "terminé" pour le Jalon 1

- [ ] Démo reproductible qui superpose K motifs sur une arête et les re-sépare.
- [ ] Fuite inter-bande mesurée et < 5 % (ou écart documenté et expliqué).
- [ ] Isolation vérifiée : un poids de bande n'affecte que sa bande.
- [ ] `SpectralSynapse` en place, clonable/sérialisable, sans régression sur `Synapse`.
- [ ] Test jest au vert, build + lint + format OK.
- [ ] `RESULTATS.md` écrit, renvoyant vers les hypothèses du papier.

Quand ces cases sont cochées, on ouvre le Jalon 2 (plasticité locale) sur ce substrat.
