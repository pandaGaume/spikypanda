# Projection des unités vers les normes externes

*Comment une propriété déclare son unité une seule fois et se retrouve exposée
en QUDT, en WoT, en OPC UA ou en Sparkplug B sans qu'aucun nœud ne soit
modifié. Complément de [`unit-tag-convention.md`](unit-tag-convention.md), qui
définit le tag ; ce document définit ce qu'on en fait.*

## Principe

Une propriété déclare son unité une fois, sous forme canonique. Chaque norme
qui veut la voir est produite par **projection** depuis cette forme. Ajouter
une norme ne touche aucun nœud.

La forme canonique a deux composantes, et les deux sont nécessaires :

| Composante | Source | Exemple |
|---|---|---|
| Code UCUM | `Unit.ucum` | `"A"` |
| Genre de grandeur | `resolveQuantityKind(quantity)` | `"ElectricCurrent"` |

Le code dit **ce qui est mesuré** sous une forme que toutes les normes savent
lire. Le genre dit **ce que cela signifie**, ce qu'UCUM ne porte
volontairement pas.

Une déclaration se lit ainsi :

```ts
@editable("number", { unit: { quantity: "Current", unit: "amp" } })
public get statorCurrent(): number { ... }
```

et se projette ainsi :

```ts
projectUnit<IQudtProjection>({ quantity: "Current", unit: "amp" }, "qudt");
// { unit: "unit:A" }
```

## Hiérarchie des normes

| Norme | Rôle | État |
|---|---|---|
| UCUM | Identifiant canonique interne, obligatoire | En place, 167 unités |
| QUDT | Ontologie sémantique de référence | Implémentée |
| WoT | Exposition des capacités et métadonnées | Consomme QUDT |
| OPC UA | Mapping industriel, quand nécessaire | Classe vide documentée |
| Sparkplug B | Convention MQTT | Classe vide documentée |
| OM | Support d'interopérabilité, jamais modèle canonique | Classe vide documentée |

## L'asymétrie, qui est le point difficile

UCUM est canonique. Il n'est **pas toujours suffisant**. Une projection écrite
en supposant le contraire sera fausse sans le signaler.

| Cible | Dérivation depuis UCUM |
|---|---|
| QUDT, OM | Par table de correspondance. Directe. |
| WoT | Par QUDT, plus le type JSON Schema. |
| **OPC UA** | **Impossible directement.** `EUInformation.unitId` est un entier issu du code commun UN/CEFACT, un système distinct. |
| Sparkplug B | Convention, pas registre : l'unité voyage en propriété de métrique et l'orthographe est une décision interne. |

Deux conséquences de conception en découlent, et les deux portent le reste.

**Première conséquence : chaque projection possède sa propre table.** On ne
charge pas `Unit` des codes de toutes les normes. Un identifiant canonique qui
accumule ses propres alternatives a cessé d'être canonique.

**Deuxième conséquence : le code seul ne suffit parfois pas, même à
l'intérieur d'une seule cible.** La puissance apparente et la puissance
réactive ont toutes deux le code UCUM `V.A`. QUDT les distingue en `unit:VA`
et `unit:VAR`. Seul le genre de grandeur les sépare, et c'est la raison pour
laquelle `project` le reçoit en second argument.

## La règle de refus

`project` rend `undefined` quand la cible n'a pas d'équivalent. Jamais une
approximation.

Une unité absente est visiblement absente : le consommateur voit qu'il n'a
rien et décide quoi faire. Une unité approchée voyage sans dire qu'elle est
approchée, est lue comme exacte à l'arrivée, et se découvre plus tard chez
celui qui tient la mauvaise réponse.

Cette règle compte davantage pour OPC UA que partout ailleurs, parce que
`unitId` est un entier : une valeur fausse ne provoque aucune erreur
d'analyse, elle désigne simplement une autre unité réelle.

## Ajouter une projection

### 1. Créer le fichier

`packages/dev/core/src/math/units/projection.<cible>.ts`.

### 2. Déclarer le type de sortie

La forme propre à la cible, pas une forme de commodité. Un consommateur OPC UA
attend un enregistrement `EUInformation` complet avec son `namespaceUri`, son
`unitId`, son `displayName` et sa `description` ; lui rendre moins l'oblige à
terminer la traduction lui-même.

### 3. Implémenter `IUnitProjection<T>`

```ts
export const maProjection: IUnitProjection<IMaSortie> = {
    id: "ma-cible",
    spec: "https://url-de-la-specification-faisant-autorite",
    project(unit, quantityKind) {
        const ucum = unit.ucum;
        if (!ucum) return undefined;
        const local = PAR_GENRE[`${quantityKind}|${ucum}`] ?? TABLE[ucum];
        return local ? { ... } : undefined;
    },
};
```

La table est indexée par code UCUM. La table d'exception est indexée par
`"<genre>|<code>"` et se consulte en premier, pour les codes qui désignent
plusieurs unités dans la cible.

### 4. Enregistrer

```ts
registerUnitProjection(maProjection);
```

Une projection non implémentée **ne s'enregistre pas**. `unitProjectionIds()`
doit lister ce qui fonctionne, pas ce qui est prévu. Les trois classes vides
laissent leur appel en commentaire à la fin du fichier.

### 5. Tester

Deux choses, de nature différente :

- **le mécanisme** : une projection définie hors du noyau est résolue. C'est
  la seule preuve que le point d'extension en est un ;
- **la justesse** sur un échantillon vérifié à la main, volontairement petit,
  dont au moins un cas où `project` doit rendre `undefined`.

Un échantillon large et généré ne ferait que redériver la table depuis
elle-même.

## Construire une table, concrètement

Les noms locaux ne se génèrent pas par règle. QUDT écrit `HZ` mais `KiloHZ`,
`KiloGM` mais `GM`, `DeciB` mais `PERCENT`. OM ajoute un suffixe de
désambiguïsation (`metrePerSecond-Time`) qui ne se déduit d'aucune règle.

Chaque ligne se lit dans le vocabulaire publié de la cible et s'y vérifie.
Une ligne non vérifiée n'a pas sa place dans la table : tout le contrat de
cette couche est qu'une projection absente est honnête et qu'une projection
inventée ne l'est pas.

## Où trouver l'autorité

| Cible | Référence |
|---|---|
| UCUM | <https://ucum.org/ucum> |
| QUDT unités | <https://www.qudt.org/doc/DOC_VOCAB-UNITS.html> |
| QUDT genres | <https://www.qudt.org/doc/DOC_VOCAB-QUANTITY-KINDS.html> |
| WoT TD 1.1 | <https://www.w3.org/TR/wot-thing-description11/> |
| OPC UA Part 8 §5.6.4 | <https://reference.opcfoundation.org/Core/Part8/v105/docs/5.6.4> |
| UN/CEFACT Rec. 20 | <https://unece.org/trade/uncefact/cl-recommendations> |
| Sparkplug B | <https://sparkplug.eclipse.org/specification/> |
| OM 2 | <https://github.com/HajoRijgersberg/OM> |

Chaque classe de projection porte en tête de fichier la forme exacte de sa
cible avec un exemple, ce qui manque au-delà d'UCUM et où le trouver, le lien
vers la section faisant autorité, et le piège connu de la norme. Lire ce
commentaire avant de commencer évite de rouvrir l'enquête.

## Fichiers

```
packages/dev/core/src/math/units/
  projection.interfaces.ts   contrat + guide d'ajout, en commentaire
  projection.registry.ts     enregistrement et resolution
  projection.qudt.ts         IMPLEMENTE
  projection.opcua.ts        vide, documente
  projection.sparkplug.ts    vide, documente
  projection.om.ts           vide, documente
```

Tests : `packages/tests/math/unit-projection.test.ts`.
