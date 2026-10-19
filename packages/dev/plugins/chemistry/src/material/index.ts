import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createMaterialNode, formatComponentList, isMaterialSpec, MATERIAL_OUT, MaterialNode, parseComponentList } from "./material.node.js";
import {
    CALCIUM_MAGNESIUM_PRESET,
    createCalciumMagnesiumMaterialNode,
    createMaterialFromPreset,
    createPureCalciumMaterialNode,
    createTestOxideMixMaterialNode,
    MATERIAL_PRESETS,
    PURE_CALCIUM_PRESET,
    TEST_OXIDE_MIX_PRESET,
} from "./presets.js";

export {
    MaterialNode,
    createMaterialNode,
    createMaterialFromPreset,
    createPureCalciumMaterialNode,
    createCalciumMagnesiumMaterialNode,
    createTestOxideMixMaterialNode,
    parseComponentList,
    formatComponentList,
    isMaterialSpec,
    MATERIAL_OUT,
    MATERIAL_PRESETS,
    PURE_CALCIUM_PRESET,
    CALCIUM_MAGNESIUM_PRESET,
    TEST_OXIDE_MIX_PRESET,
};
export type { IMaterialSpec } from "./material.node.js";
export type { IMaterialPreset } from "./presets.js";

/**
 * `Chemistry.Material` sub-plugin.
 *
 * A condensed-matter composition: constituents as chemical formulas with
 * their proportions, an explicit mass or mole basis, and a published
 * elemental vector resolved by stoichiometry. It is the entry point of
 * the LIBS chain (`material_out` into a plasma node) and it is the only
 * place where "20 % Fe2O3" becomes "13.99 % Fe".
 *
 * The output is a plain data cable of type `any` carrying an immutable
 * `IMaterialSpec`, not a dashed config-link: see the node's header for
 * why that choice was made at this milestone.
 */
export const chemistryMaterialSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        const docPath = ctx.assetUrl("docs/chemistry/material/material.md");
        const outputPorts = [{ slot: MATERIAL_OUT, optional: false, type: "any" }] as const;

        const register = (typeId: string, factory: () => unknown, label: string): void => {
            ctx.nodes.register(typeId, factory as never, {
                label,
                category: "Chemistry.Material",
                docPath,
                inputPorts: [],
                outputPorts: [...outputPorts],
            });
        };

        register("Chemistry.Material:material", createMaterialNode, "Material");
        register(PURE_CALCIUM_PRESET.typeId, createPureCalciumMaterialNode, PURE_CALCIUM_PRESET.displayName);
        register(CALCIUM_MAGNESIUM_PRESET.typeId, createCalciumMagnesiumMaterialNode, CALCIUM_MAGNESIUM_PRESET.displayName);
        register(TEST_OXIDE_MIX_PRESET.typeId, createTestOxideMixMaterialNode, TEST_OXIDE_MIX_PRESET.displayName);
    },
};
