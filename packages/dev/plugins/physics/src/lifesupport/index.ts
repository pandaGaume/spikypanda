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
            // For a planner (docs/physics/lifesupport/crew.md): people are a CO2 source, in ppm per minute of the cabin they live in.
            signature: {
                purpose: "the CO2 source of a cabin: a group of people at one activity level, emitting in ppm per minute of that cabin",
                inputs: {
                    count: { quantity: "Count", unit: "person", description: "head count of the group" },
                    activity: { quantity: "Category", description: "sleep, rest, light_work or heavy_work" },
                },
                outputs: { co2Emission: { quantity: "ConcentrationRate", unit: "ppm/min", description: "count times the per-person rate of the activity" } },
                capabilities: ["source", "co2", "crew", "air_quality"],
            },
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
            // For a planner (docs/physics/lifesupport/scrubber.md): the sink, at the nominal efficiency of its preset; a degraded unit's real efficiency is what a fitted model would replace.
            signature: {
                purpose: "a CO2 scrubber at a command fraction: its removal rate (a fraction of the excess per minute, lagged) and its electrical power, from a nominal efficiency preset",
                inputs: { command: { quantity: "Dimensionless", unit: "ratio", description: "0 to 1, the commanded fraction of full speed" } },
                outputs: {
                    power: { quantity: "Power", unit: "watt", description: "electrical power drawn" },
                    effectiveRate: { quantity: "Frequency", unit: "1/min", description: "fraction of the CO2 excess removed per minute, after the lag" },
                    effectiveFraction: { quantity: "Dimensionless", unit: "ratio", description: "the lagged command actually applied" },
                },
                capabilities: ["sink", "co2", "scrubber", "air_quality", "power_load"],
            },
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
            // For a planner (docs/physics/lifesupport/cabin-air.md): the balance that predicts the concentration of one sealed, well-mixed cabin.
            signature: {
                purpose: "the CO2 balance of one sealed, well-mixed cabin: sources in, scrubbing out, the concentration in ppm and the life-support state it implies",
                inputs: {
                    scrubberRate: { quantity: "Frequency", unit: "1/min", description: "the scrubber's effective removal rate" },
                    emissionA: { quantity: "ConcentrationRate", unit: "ppm/min", description: "a crew group's emission" },
                    emissionB: { quantity: "ConcentrationRate", unit: "ppm/min" },
                    emissionC: { quantity: "ConcentrationRate", unit: "ppm/min" },
                    emissionD: { quantity: "ConcentrationRate", unit: "ppm/min" },
                },
                outputs: {
                    co2Ppm: { quantity: "Concentration", unit: "ppm", description: "the cabin's CO2 concentration" },
                    state: { quantity: "Category", description: "NOMINAL, ELEVATED or CRITICAL against the thresholds" },
                    removal: { quantity: "ConcentrationRate", unit: "ppm/min", description: "what the scrubber removes at the latest state" },
                },
                capabilities: ["prediction", "co2", "air_quality", "cabin", "mass_balance"],
            },
        });
    },
};
