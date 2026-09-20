import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { CREW_ACTIVITIES, createCrewNode, CrewNode } from "./crew.node.js";
import type { CrewActivity } from "./crew.node.js";
import { createScrubberNode, ScrubberNode } from "./scrubber.node.js";
import { CABIN_STATE_CRITICAL, CABIN_STATE_ELEVATED, CABIN_STATE_NOMINAL, createCabinAirNode, CabinAirNode } from "./cabin-air.node.js";

export {
    CREW_ACTIVITIES,
    CrewNode,
    createCrewNode,
    ScrubberNode,
    createScrubberNode,
    CabinAirNode,
    createCabinAirNode,
    CABIN_STATE_NOMINAL,
    CABIN_STATE_ELEVATED,
    CABIN_STATE_CRITICAL,
};
export type { CrewActivity };

const SIGNAL_IN = { optional: true, type: "float", kind: "signal" } as const;
const SIGNAL_OUT = { optional: false, type: "float", kind: "signal" } as const;

/**
 * `Physics.LifeSupport` sub-plugin: the CO2 balance of a crewed cabin,
 * in the reference form of the CO2 control sample (rates in ppm per
 * minute for the cabin's volume, removal proportional to the excess with
 * a first-order lag, a small leak). Three nodes:
 *
 *   crew       people at one activity level -> co2Emission
 *   scrubber   command -> effectiveRate (integrated, with the lag), power
 *   cabin-air  emissions + scrubberRate -> co2Ppm (integrated), state, removal
 *
 * Wire crew.co2Emission into cabin-air.emissionA..D, scrubber.effectiveRate
 * into cabin-air.scrubberRate, and a command source into scrubber.command.
 * The cabin computes the removal from its own state, so there is no loop
 * in the graph. Every constant is an editable, so a saved document
 * carries the whole set of assumptions.
 */
export const lifeSupportSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.LifeSupport:crew", () => createCrewNode() as never, {
            label: "Crew",
            docPath: ctx.assetUrl("docs/physics/lifesupport/crew.md"),
            category: "Physics.LifeSupport",
            inputPorts: [
                { slot: "count", ...SIGNAL_IN },
                { slot: "activity", optional: true, type: "any", kind: "signal" },
            ],
            outputPorts: [{ slot: "co2Emission", ...SIGNAL_OUT }],
        });
        ctx.nodes.register("Physics.LifeSupport:scrubber", () => createScrubberNode() as never, {
            label: "CO2 Scrubber",
            docPath: ctx.assetUrl("docs/physics/lifesupport/scrubber.md"),
            category: "Physics.LifeSupport",
            inputPorts: [{ slot: "command", ...SIGNAL_IN }],
            outputPorts: [
                { slot: "power", ...SIGNAL_OUT },
                { slot: "effectiveRate", ...SIGNAL_OUT },
                { slot: "effectiveFraction", ...SIGNAL_OUT },
            ],
        });
        ctx.nodes.register("Physics.LifeSupport:cabin-air", () => createCabinAirNode() as never, {
            label: "Cabin Air (CO2)",
            docPath: ctx.assetUrl("docs/physics/lifesupport/cabin-air.md"),
            category: "Physics.LifeSupport",
            inputPorts: [
                { slot: "scrubberRate", ...SIGNAL_IN },
                { slot: "emissionA", ...SIGNAL_IN },
                { slot: "emissionB", ...SIGNAL_IN },
                { slot: "emissionC", ...SIGNAL_IN },
                { slot: "emissionD", ...SIGNAL_IN },
            ],
            outputPorts: [
                { slot: "co2Ppm", ...SIGNAL_OUT },
                { slot: "state", ...SIGNAL_OUT },
                { slot: "removal", ...SIGNAL_OUT },
            ],
        });
    },
};
