/**
 * The shape of the generated NIST data module.
 *
 * It lives in its own file so that the generated module can import the
 * type without importing the module that reads it, which would be a
 * cycle.
 *
 * Why a TypeScript module and not a JSON file: a JSON import needs an
 * import attribute in Node's ESM loader, a resolver option in
 * TypeScript, and a loader rule in webpack, and the three do not agree.
 * A generated `.ts` file compiles, bundles and runs everywhere with no
 * special case. It is generated, never hand-edited.
 *
 * Rows are positional to keep the file readable in a diff and small on
 * disk: `columns` states the order, and `nist.catalogue.ts` is the only
 * place that unpacks them.
 */

export interface INistSourceFile {
    readonly file: string;
    readonly bytes: number;
    readonly sha256: string;
}

export interface INistSpeciesBlock {
    readonly element: string;
    readonly ionisation: number;
    readonly asdName: string;
    /** [wavelengthNm, A_ki, E_k(eV), g_k, E_i(eV)|null, g_i|null] */
    readonly lines: ReadonlyArray<ReadonlyArray<number | null>>;
    /** [energy(eV), g] */
    readonly levels: ReadonlyArray<ReadonlyArray<number>>;
    readonly ionisationLimitEv: number | null;
    readonly source: { readonly lines: INistSourceFile; readonly levels: INistSourceFile };
    /** What the reader could not use, kept so the truncation of a
     *  species is readable without re-running the download. */
    readonly parseReport: {
        readonly kept: number;
        readonly skippedNoWavelength: number;
        readonly skippedNoTransitionProbability: number;
        readonly skippedNoUpperLevel: number;
        readonly skippedUnparsable: number;
    };
    readonly levelsSkipped: number;
}

export interface INistCatalogueRaw {
    readonly provenance: {
        readonly database: string;
        readonly version: string;
        readonly dataUpdate: string;
        readonly doi: string;
        readonly downloadedOn: string;
        readonly citation: string;
        readonly wavelengthMedium: string;
        readonly wavelengthRangeNm: ReadonlyArray<number>;
        readonly linesFilter: string;
        readonly generatedBy: string;
        readonly manifest: string;
    };
    readonly columns: { readonly lines: ReadonlyArray<string>; readonly levels: ReadonlyArray<string> };
    readonly ionisationEnergiesEv: Readonly<Record<string, number>>;
    readonly ionisationSource: INistSourceFile;
    readonly species: ReadonlyArray<INistSpeciesBlock>;
}
