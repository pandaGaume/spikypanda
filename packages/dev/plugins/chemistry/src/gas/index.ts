import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createGasNode, GasNode, GAS_OUT_ANCHOR } from "./gas.node.js";
import {
    createArGasNode,
    createBenzeneGasNode,
    createCH4GasNode,
    createCO2GasNode,
    createCOGasNode,
    createFormaldehydeGasNode,
    createH2OGasNode,
    createHeGasNode,
    createN2GasNode,
    createN2OGasNode,
    createNeGasNode,
    createNH3GasNode,
    createO2GasNode,
    createTolueneGasNode,
    createXeGasNode,
    GAS_PRESETS,
} from "./presets.js";

export {
    GasNode,
    createGasNode,
    createN2GasNode,
    createO2GasNode,
    createCO2GasNode,
    createH2OGasNode,
    createArGasNode,
    createCH4GasNode,
    createCOGasNode,
    createNH3GasNode,
    createHeGasNode,
    createN2OGasNode,
    createNeGasNode,
    createXeGasNode,
    createFormaldehydeGasNode,
    createTolueneGasNode,
    createBenzeneGasNode,
    GAS_PRESETS,
    GAS_OUT_ANCHOR,
};
export type { IGasPreset } from "./presets.js";

/**
 * `Chemistry.Gas` sub-plugin.
 *
 * Catalog of 12 common gas-species descriptors plus a generic
 * `Chemistry.Gas:gas` palette entry the user can drop and fully
 * customize. Each gas is a `GraphItem` (NOT a RuntimeNode) that
 * carries IGasMetadata constants; the editor wires it to a
 * `Chemistry.Composition:*` via the `gas_out` config-link (dashed
 * cable, P5a `"gas"` port type).
 *
 * Catalog:
 *   N2  Nitrogen           Ar  Argon         CH4 Methane
 *   O2  Oxygen             CO  Carbon monoxide
 *   CO2 Carbon dioxide     NH3 Ammonia       He  Helium
 *   H2O Water vapor        N2O Nitrous oxide Ne  Neon
 *                                            Xe  Xenon
 */
export const chemistryGasSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        // GasNode is a GraphItem, not a RuntimeNode — the runtime
        // never allocates channels for it. The single config-link
        // output `gas_out` (type "gas") is the dashed cable the user
        // drags onto a CompositionNode's `gas_in_<k>` variadic.
        const outputPorts = [{ slot: GAS_OUT_ANCHOR, optional: true, type: "gas" }] as const;
        const inputPorts: ReadonlyArray<{ slot: string; optional: boolean; type: string }> = [];

        const gasDocPath = ctx.assetUrl("docs/chemistry/gas/gas.md");
        const register = (typeId: string, factory: () => unknown, label: string): void => {
            ctx.nodes.register(typeId, factory as never, {
                label,
                category: "Chemistry.Gas",
                docPath: gasDocPath,
                inputPorts,
                outputPorts: [...outputPorts],
            });
        };

        register("Chemistry.Gas:gas", createGasNode, "Gas");
        register("Chemistry.Gas:n2", createN2GasNode, "Nitrogen (N₂)");
        register("Chemistry.Gas:o2", createO2GasNode, "Oxygen (O₂)");
        register("Chemistry.Gas:co2", createCO2GasNode, "Carbon dioxide (CO₂)");
        register("Chemistry.Gas:h2o", createH2OGasNode, "Water vapor (H₂O)");
        register("Chemistry.Gas:ar", createArGasNode, "Argon (Ar)");
        register("Chemistry.Gas:ch4", createCH4GasNode, "Methane (CH₄)");
        register("Chemistry.Gas:co", createCOGasNode, "Carbon monoxide (CO)");
        register("Chemistry.Gas:nh3", createNH3GasNode, "Ammonia (NH₃)");
        register("Chemistry.Gas:he", createHeGasNode, "Helium (He)");
        register("Chemistry.Gas:n2o", createN2OGasNode, "Nitrous oxide (N₂O)");
        register("Chemistry.Gas:ne", createNeGasNode, "Neon (Ne)");
        register("Chemistry.Gas:xe", createXeGasNode, "Xenon (Xe)");
        // VOC / pollutant-class gases — same GasNode class, just
        // pre-seeded with toxicology attributes (oelTwa, oelStel,
        // idlh, hazardClass). Wired into a Composition through the
        // exact same gas_in_<k> variadic as bulk species; the
        // atmosphere has no separate "pollutant" channel anymore.
        register("Chemistry.Gas:formaldehyde", createFormaldehydeGasNode, "Formaldehyde (CH₂O)");
        register("Chemistry.Gas:toluene", createTolueneGasNode, "Toluene (C₇H₈)");
        register("Chemistry.Gas:benzene", createBenzeneGasNode, "Benzene (C₆H₆)");
    },
};
