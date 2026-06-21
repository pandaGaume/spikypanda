import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import {
    createLunarDustParticulateNode,
    createParticulateNode,
    createPM10ParticulateNode,
    createPM2_5ParticulateNode,
    ParticulateNode,
    PARTICULATE_OUT_ANCHOR,
} from "./particulate.node.js";

export { ParticulateNode, createParticulateNode, createPM2_5ParticulateNode, createPM10ParticulateNode, createLunarDustParticulateNode, PARTICULATE_OUT_ANCHOR };

/**
 * `Physics.Particulate` sub-plugin (V1 stub).
 *
 * Particulate-matter descriptors consumed by the atmosphere through
 * its `particulate_in_<k>` config-link variadic. Moved here from the
 * chemistry plugin (2026-06-08) because particulate dynamics are
 * physics (settling under gravity, drag, re-suspension), not chemical-
 * species mass balance.
 *
 * Three preset entries plus a generic editable Particulate. None of
 * them contribute to the atmosphere's state vector in V1; the slot
 * exists so user topologies survive the V2 PM-integration refactor
 * without re-wiring.
 *
 * Catalog:
 *   particulate  Generic editable PM descriptor
 *   pm2_5        PM2.5 (fine particulate)
 *   pm10         PM10 (coarse particulate)
 *   lunar_dust   Apollo-era abrasive lunar regolith
 */
export const physicsParticulateSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        const outputPorts = [{ slot: PARTICULATE_OUT_ANCHOR, optional: true, type: "particulate" }] as const;
        const inputPorts: ReadonlyArray<{ slot: string; optional: boolean; type: string }> = [];

        const docPath = ctx.assetUrl("docs/physics/particulate/particulate.md");
        const register = (typeId: string, factory: () => unknown, label: string): void => {
            ctx.nodes.register(typeId, factory as never, {
                label,
                category: "Physics.Particulate",
                docPath,
                inputPorts,
                outputPorts: [...outputPorts],
            });
        };

        register("Physics.Particulate:particulate", createParticulateNode, "Particulate");
        register("Physics.Particulate:pm2_5", createPM2_5ParticulateNode, "PM2.5");
        register("Physics.Particulate:pm10", createPM10ParticulateNode, "PM10");
        register("Physics.Particulate:lunar_dust", createLunarDustParticulateNode, "Lunar dust");
    },
};
