# Convention : tag d'unité sur les tenseurs de signal

*Discipline « refuser, pas deviner » sur les unités physiques, apprise de
`predictive-maintenance-mcp` (« une mauvaise unité invalide le verdict ISO »). On a déjà le
type (`Unit`/`Quantity` dans `core/src/math/math.units.ts`) ; ce document définit **où** le tag
vit, **comment** il se résout, et **la règle de refus**. Voir [`../multipath-frequentiel/A-AJOUTER-inspire-pmm.md`](../multipath-frequentiel/A-AJOUTER-inspire-pmm.md).*

## Principe

Un tenseur de mesure (courant, vibration, vitesse…) doit **porter son unité physique**. Un nœud
qui produit un verdict physique (sévérité ISO, RMS de vitesse, matching de fréquence) doit
**refuser** si l'unité n'est pas déclarée, et **ne jamais l'inférer de l'amplitude**. Le tag est
une **métadonnée sérialisable** qui se résout vers nos `Unit`/`Quantity` existants au runtime.

## Où vit le tag (deux niveaux)

1. **Runtime, sur `ITensor`** (`unit?: IUnitTag`) : l'unité *réelle* des données sur cette arête.
   Se branche exactement comme `quantization?` : optionnel, ignoré par les chemins FP32 purs, lu
   uniquement par les nœuds qui en ont besoin.
2. **Déclaré, sur `IPortDescriptor`** (`unit?: IUnitExpectation`) : ce qu'un port *attend/produit*
   (contrat au câblage, affichage éditeur, validation par le GraphBuilder comme il valide déjà les
   shapes). Optionnel.

Le niveau 1 est la source de vérité au runtime ; le niveau 2 est un contrat de câblage.

## Forme du tag (sérialisable, résout vers `Unit`)

```ts
// core/src/math/math.units.ts (ou compute.interfaces.ts près d'ITensor)
export interface IUnitTag {
    /** Grandeur physique = quelle sous-classe Quantity possède le vocabulaire.
     *  Ex. "Acceleration", "Current", "Speed", "Frequency". */
    quantity: string;
    /** Clé d'unité DANS cette grandeur, telle que <Quantity>.unitForSymbol(unit) la résout.
     *  Ex. "g", "mps2" (m/s²), "amp" (A), "mmps" (mm/s). NB: c'est la CLE de la map Units,
     *  pas forcément le symbole d'affichage. */
    unit: string;
    /** Cadence d'échantillonnage (Hz) pour un tenseur de série temporelle.
     *  Requis par les nœuds ISO/DSP (bande, Nyquist). Séparé de l'unité mais voyage avec le signal. */
    sampleRateHz?: number;
}
```

`quantity` + `unit` sont des chaînes → survivent au round-trip `.spikypanda` et au sidecar
`{stem}_metadata.json` (point de compatibilité pmm). Au runtime, on résout vers le vrai `Unit`.

## Résolution (helper dans `math.units.ts`)

```ts
const QUANTITY_REGISTRY: Record<string, { Units: Record<string, Unit>; }> = {
    Acceleration, Speed, Frequency, Current, Voltage, Power, Pressure, Mass, Length,
    Temperature, Dimensionless, // ... les sous-classes exportées
};

/** Résout un tag sérialisable vers l'instance Unit (ou undefined si inconnu). */
export function resolveUnit(tag: IUnitTag): Unit | undefined {
    const Q = QUANTITY_REGISTRY[tag.quantity];
    return Q ? Q.Units[tag.unit] : undefined;
}
```

## Les règles (la discipline, pas le type)

1. **Les sources posent le tag.** Un nœud capteur/source déclare `unit` (et `sampleRateHz`) sur son
   tenseur de sortie. Un banc de résonateurs qui reçoit du courant en `A` sort un embedding
   `Dimensionless` (le tag change de grandeur en conséquence).
2. **Les transforms propagent ou transforment.** Une FFT garde l'unité par bin ; une intégration
   accel→vitesse **change la grandeur** (`Acceleration`→`Speed`) et le tag. Un nœud qui ne sait pas
   propager laisse `unit=undefined` plutôt que de mentir.
3. **Les verdicts refusent.** Un nœud de sévérité/standard **refuse** (status `refused` + `reason`)
   si `unit` est absent ou d'une grandeur incompatible. ⚠️ **Piège à éviter** : `Quantity.getValue()`
   renvoie la valeur **brute** quand `unit=undefined` — c'est exactement le silent-guess interdit à
   la frontière du verdict. Toujours vérifier le tag *avant* de lire une valeur physique.
4. **Jamais inférer de l'amplitude.** Une amplitude ne dit pas l'unité.
5. **Un tag par tenseur** est le défaut (tous les canaux même unité : Ia/Ib/Ic en A). Le
   **par-canal** (`unit?: IUnitTag[]` aligné sur la dernière dimension) est une extension future,
   seulement pour un tenseur multi-modal fusionné.

## Sérialisation

Le tag étant du JSON plat, il s'embarque dans les captures `.spikypanda` et le sidecar
`{stem}_metadata.json` (mêmes clés `sampling_rate`, `signal_unit` que pmm → interop). Un artefact
ONNX de banc de résonateurs porte son tag d'entrée/sortie dans son JSON-metadata voisin.

## Additions minimales au core (rétro-compatibles)

Trois changements, tous optionnels et additifs (rien ne casse, précédent = `quantization?`) :

```ts
// 1. compute.interfaces.ts — ITensor
export interface ITensor {
    data: Float32Array;
    shape: number[];
    name?: string;
    quantization?: IQuantizationParams;
    unit?: IUnitTag;            // <-- AJOUT : unité physique + fs, ignoré par les chemins FP32.
}

// 2. execution.interfaces.ts — IPortDescriptor (contrat de câblage optionnel)
export interface IPortDescriptor {
    readonly slot: string | number;
    readonly optional: boolean;
    readonly type?: string;
    // ...
    readonly unit?: { quantity: string; unit?: string; requires?: boolean };  // <-- AJOUT
}

// 3. math.units.ts — IUnitTag + resolveUnit() + QUANTITY_REGISTRY (ci-dessus).
```

## Ce qui l'utilise en premier

Le **nœud sévérité ISO 20816-3** (trou #2 de la note pmm) est le premier consommateur : il lit
`tensor.unit` (grandeur `Acceleration` ou `Speed` + `sampleRateHz`), refuse si absent, intègre
accel→vitesse si besoin, et émet son verdict de zone. La convention est le prérequis propre de ce
nœud, et elle bénéficie ensuite à tout le graphe (tout nœud physique peut refuser proprement).

*Réfs : [`../multipath-frequentiel/A-AJOUTER-inspire-pmm.md`](../multipath-frequentiel/A-AJOUTER-inspire-pmm.md),
`core/src/math/math.units.ts` (le type `Unit`/`Quantity`),
`core/src/compute/compute.interfaces.ts` (`ITensor`), `core/src/execution/execution.interfaces.ts` (`IPortDescriptor`).*
