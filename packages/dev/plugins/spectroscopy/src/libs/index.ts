import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createLibsPlasmaNode, isMaterialSpecView, LibsPlasmaNode, PLASMA_IN_MATERIAL, PLASMA_OUT_EMISSION } from "./plasma.node.js";

export * from "./engine.js";
export * from "./physical.js";
export { LibsPlasmaNode, createLibsPlasmaNode, isMaterialSpecView, PLASMA_IN_MATERIAL, PLASMA_OUT_EMISSION };
export type { IMaterialSpecView } from "./plasma.node.js";

/**
 * `Spectro.Libs` sub-plugin: the emission stage of the LIBS chain.
 *
 * One node at this milestone. It consumes a material specification on a
 * data cable and publishes a line list, not a sampled curve: the grid
 * belongs to the instrument.
 */
export const spectroLibsSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Spectro.Libs:plasma", (() => createLibsPlasmaNode()) as never, {
            label: "LIBS Plasma",
            category: "Spectro.Libs",
            docPath: ctx.assetUrl("docs/spectroscopy/libs/plasma.md"),
            inputPorts: [{ slot: PLASMA_IN_MATERIAL, optional: true, type: "any" }],
            outputPorts: [{ slot: PLASMA_OUT_EMISSION, optional: false, type: "any" }],
        });
    },
};
