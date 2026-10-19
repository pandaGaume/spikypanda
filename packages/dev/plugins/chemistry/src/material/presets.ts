/**
 * `Chemistry.Material` presets.
 *
 * These are STARTING POINTS FOR TESTS, not reference materials. None of
 * them is a certified standard, and none should ever be used as a ground
 * truth: the moment a real sample enters the picture, its composition
 * comes from its certificate, with its uncertainties, through the
 * `provenance` field.
 *
 * The three presets answer the first two experiments of the LIBS brief:
 * a pure element and a two-element mix for the plumbing test (E0), and
 * the four-oxide mixture the brief names for the stoichiometry test (E1).
 */

import { formatComponentList, MaterialNode } from "./material.node.js";
import type { FractionBasis, IMaterialComponent } from "spikypanda-core";

export interface IMaterialPreset {
    /** Registered node type id. */
    readonly typeId: string;
    /** Label shown in the node palette. */
    readonly displayName: string;
    /** Value of the node's `preset_id` field. */
    readonly presetId: string;
    readonly basis: FractionBasis;
    readonly components: ReadonlyArray<IMaterialComponent>;
    /** Where the numbers come from. Deliberately explicit about the
     *  fact that a preset is a scenario. */
    readonly provenance: string;
}

export const PURE_CALCIUM_PRESET: IMaterialPreset = Object.freeze({
    typeId: "Chemistry.Material:calcium-pure",
    displayName: "Calcium (pure)",
    presetId: "calcium-pure",
    basis: "mass",
    components: Object.freeze([{ formula: "Ca", fraction: 1 }]),
    provenance: "synthetic test case, pure element",
});

export const CALCIUM_MAGNESIUM_PRESET: IMaterialPreset = Object.freeze({
    typeId: "Chemistry.Material:calcium-magnesium",
    displayName: "Calcium / magnesium mix",
    presetId: "calcium-magnesium",
    basis: "mass",
    components: Object.freeze([
        { formula: "Ca", fraction: 0.7 },
        { formula: "Mg", fraction: 0.3 },
    ]),
    provenance: "synthetic test case, two elements",
});

export const TEST_OXIDE_MIX_PRESET: IMaterialPreset = Object.freeze({
    typeId: "Chemistry.Material:test-oxide-mix",
    displayName: "Oxide mix (synthetic test)",
    presetId: "test-oxide-mix",
    basis: "mass",
    components: Object.freeze([
        { formula: "SiO2", fraction: 0.6 },
        { formula: "Fe2O3", fraction: 0.2 },
        { formula: "CaCO3", fraction: 0.15 },
        { formula: "MgO", fraction: 0.05 },
    ]),
    provenance: "scenario of the LIBS brief, 2026-10-19. NOT a reference rock",
});

export const MATERIAL_PRESETS: ReadonlyArray<IMaterialPreset> = Object.freeze([PURE_CALCIUM_PRESET, CALCIUM_MAGNESIUM_PRESET, TEST_OXIDE_MIX_PRESET]);

/** Build a node from a preset. */
export function createMaterialFromPreset(preset: IMaterialPreset): MaterialNode {
    const node = new MaterialNode();
    node.presetId = preset.presetId;
    node.displayName = preset.displayName;
    node.basis = preset.basis;
    node.components = formatComponentList(preset.components);
    node.provenance = preset.provenance;
    return node;
}

export const createPureCalciumMaterialNode = (): MaterialNode => createMaterialFromPreset(PURE_CALCIUM_PRESET);
export const createCalciumMagnesiumMaterialNode = (): MaterialNode => createMaterialFromPreset(CALCIUM_MAGNESIUM_PRESET);
export const createTestOxideMixMaterialNode = (): MaterialNode => createMaterialFromPreset(TEST_OXIDE_MIX_PRESET);
