import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import {
    COMPOSITION_IN_GAS_PREFIX,
    COMPOSITION_IN_PARTICULATE_PREFIX,
    COMPOSITION_OUT_ANCHOR,
    CompositionNode,
    createCompositionNode,
} from "./composition.node.js";
import {
    COMPOSITION_PRESETS,
    createEarthDryAirCompositionNode,
    createEarthHumidAirCompositionNode,
    createIssCabinCompositionNode,
    createMarsAtmosphereCompositionNode,
    createVacuumCompositionNode,
    EARTH_DRY_AIR_PRESET,
    EARTH_HUMID_AIR_PRESET,
    ISS_CABIN_PRESET,
    MARS_ATMOSPHERE_PRESET,
    VACUUM_PRESET,
} from "./presets.js";

export {
    CompositionNode,
    createCompositionNode,
    createEarthHumidAirCompositionNode,
    createEarthDryAirCompositionNode,
    createMarsAtmosphereCompositionNode,
    createIssCabinCompositionNode,
    createVacuumCompositionNode,
    COMPOSITION_PRESETS,
    EARTH_HUMID_AIR_PRESET,
    EARTH_DRY_AIR_PRESET,
    MARS_ATMOSPHERE_PRESET,
    ISS_CABIN_PRESET,
    VACUUM_PRESET,
    COMPOSITION_OUT_ANCHOR,
    COMPOSITION_IN_GAS_PREFIX,
    COMPOSITION_IN_PARTICULATE_PREFIX,
};
export type { ICompositionComponent } from "./composition.node.js";
export type { ICompositionPreset } from "./presets.js";

/**
 * `Chemistry.Composition` sub-plugin.
 *
 * Five atmospheric-mixture presets (Earth humid / dry air, Mars,
 * ISS cabin, vacuum) plus a generic `Chemistry.Composition:composition`
 * the user can fill from scratch via the variadic `gas_in_<k>`
 * config-links.
 *
 * Each composition publishes a single `composition_out` (dashed
 * config-link, type "composition") that an `Physics.Scene:atmosphere-state`
 * consumes at session bind to size its state vector and seed its
 * initial inventory.
 */
export const chemistryCompositionSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        // Two variadic input pools:
        //   gas_in_<k>          — Chemistry.Gas:* descriptors (bulk gases,
        //                          VOCs, anything with IGasMetadata; the
        //                          session-builder sync updates each
        //                          component's gasItemId on wire).
        //   particulate_in_<k>  — Physics.Particulate:* descriptors. The
        //                          composition holds them as a bound list;
        //                          a downstream AtmosphereLayer reads
        //                          `composition.particulates` at session
        //                          bind.
        const inputPorts = [
            { slot: `${COMPOSITION_IN_GAS_PREFIX}0`, optional: true, type: "gas" },
            { slot: `${COMPOSITION_IN_PARTICULATE_PREFIX}0`, optional: true, type: "particulate" },
        ] as const;
        const outputPorts = [{ slot: COMPOSITION_OUT_ANCHOR, optional: true, type: "composition" }] as const;
        const variadicInput = [
            { prefix: COMPOSITION_IN_GAS_PREFIX, type: "gas" as const },
            { prefix: COMPOSITION_IN_PARTICULATE_PREFIX, type: "particulate" as const },
        ];

        const docPath = ctx.assetUrl("docs/chemistry/composition/composition.md");
        const register = (typeId: string, factory: () => unknown, label: string): void => {
            ctx.nodes.register(typeId, factory as never, {
                label,
                category: "Chemistry.Composition",
                docPath,
                inputPorts: [...inputPorts],
                outputPorts: [...outputPorts],
                variadicInput,
            });
        };

        register("Chemistry.Composition:composition", createCompositionNode, "Composition");
        register(
            EARTH_HUMID_AIR_PRESET.typeId,
            createEarthHumidAirCompositionNode,
            EARTH_HUMID_AIR_PRESET.displayName,
        );
        register(
            EARTH_DRY_AIR_PRESET.typeId,
            createEarthDryAirCompositionNode,
            EARTH_DRY_AIR_PRESET.displayName,
        );
        register(
            MARS_ATMOSPHERE_PRESET.typeId,
            createMarsAtmosphereCompositionNode,
            MARS_ATMOSPHERE_PRESET.displayName,
        );
        register(
            ISS_CABIN_PRESET.typeId,
            createIssCabinCompositionNode,
            ISS_CABIN_PRESET.displayName,
        );
        register(VACUUM_PRESET.typeId, createVacuumCompositionNode, VACUUM_PRESET.displayName);
    },
};
