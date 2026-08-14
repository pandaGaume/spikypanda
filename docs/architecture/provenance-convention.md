# Convention : provenance sur chaque sortie gradée

*Discipline de crédibilité apprise de `predictive-maintenance-mcp` (« THRESHOLD_PROVENANCE
agrafé à chaque verdict »). Un nombre ou un label de classe nu ne suffit pas : toute sortie
qui **grade, classe, ou franchit un seuil** doit dire **ce qui l'a produite**. Pendant à la
[convention de tag d'unité](unit-tag-convention.md).*

## Principe

Une **sortie gradée** (verdict, classification, zone de sévérité, RUL, alarme) porte un champ
**`provenance: IProvenance`** documentant : quel **standard / modèle / heuristique**, quelle
**édition / version**, quelle **table de seuils** a décidé. C'est du JSON, ~zéro compute, gros
gain de crédibilité et d'auditabilité (pour un ingénieur, un auditeur, ou un LLM en aval).

## Le type (core, `core/src/provenance/provenance.ts`)

```ts
export interface IProvenance {
    kind: "standard" | "model" | "heuristic"; // l'autorité derrière le grade
    source: string;                            // "ISO 20816-3", un nom de modèle, un nom d'heuristique
    version?: string;                          // année de standard, semver/hash de modèle, révision de config
    basis?: string;                            // la table de seuils / config qui a décidé (ex. "group 2, rigid")
    note?: string;                             // caveat honnête (supersession, "heuristique PAS proba", limites)
}
```

Type-only (pas de code runtime) → **les valeurs se construisent en littéraux d'objet**, aucun
symbole core à rebundler.

## Les règles

1. **Toute sortie gradée porte `provenance`.** Un grade sans provenance est incomplet.
2. **Standard** → `kind:"standard"`, `source`+`version` = le standard et son édition, `note` =
   supersession / limites (ex. « ISO 20816-3:2022 fusionne A/B, A/B gardés par familiarité »).
3. **Modèle appris** → `kind:"model"`, `source` = nom du modèle, `version` = semver **ou hash des
   poids** (traçabilité exacte), `basis` = jeu de features / config d'inférence.
4. **Heuristique** → `kind:"heuristic"`, et la `note` **doit** dire que c'est une heuristique, **pas
   une probabilité** (règle pmm « evidence, not probability »).
5. **`basis` par-verdict** : rempli à chaque sortie avec le contexte réel (groupe machine, régime,
   seuil actif), pas seulement la constante globale.

## Référence : le nœud ISO

`ISO.Severity:iso20816` (`plugins/iso/src/severity/iso20816.ts`) est l'implémentation de référence :
chaque verdict `assessed` porte
`provenance = { kind:"standard", source:"ISO 20816-3", version:"2022 (supersedes ISO 10816-3:2009)",
basis:"machine group 2, rigid support", note:"...A/B merged, kept for familiarity" }`.

## À appliquer ensuite (mêmes règles)

- **Grader MCSA / substrat appris** : `kind:"model"`, `source:"DiagComplexLRU"`, `version` = hash des
  poids ONNX, à côté du score (aujourd'hui un ~88% nu → à provenancer).
- **Alarmes du stack de monitoring** (`ML.Cluster` NEW_REGIME/REGIME_DRIFT, `MotionWatch` JUMP/FREEZE) :
  `kind:"heuristic"`, `basis` = seuil actif (`drift_thr`, `z_jump`), `note` = « heuristique, pas une proba ».

*Réfs : [`unit-tag-convention.md`](unit-tag-convention.md), `core/src/provenance/provenance.ts`,
[`../multipath-frequentiel/A-AJOUTER-inspire-pmm.md`](../multipath-frequentiel/A-AJOUTER-inspire-pmm.md).*
