import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { BatteryNode, createBatteryNode } from "./battery.node.js";

export { BatteryNode, createBatteryNode };

const SIGNAL_IN = { optional: true, type: "float", kind: "signal" } as const;
const SIGNAL_OUT = { optional: false, type: "float", kind: "signal" } as const;

/**
 * `Physics.Electric.Battery` sub-plugin: an energy reserve as a bucket
 * (capacity, initial state of charge, constant other loads), drained by
 * up to four wired power signals. The night budget of a habitat, the
 * pack of a rover; anything whose question is "how much is left".
 */
export const batterySubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Electric:battery", () => createBatteryNode() as never, {
            label: "Battery",
            docPath: ctx.assetUrl("docs/physics/battery/battery.md"),
            category: "Physics.Electric.Battery",
            inputPorts: [
                { slot: "powerA", ...SIGNAL_IN },
                { slot: "powerB", ...SIGNAL_IN },
                { slot: "powerC", ...SIGNAL_IN },
                { slot: "powerD", ...SIGNAL_IN },
            ],
            outputPorts: [
                { slot: "stateOfChargePercent", ...SIGNAL_OUT },
                { slot: "energyUsedWh", ...SIGNAL_OUT },
                { slot: "remainingWh", ...SIGNAL_OUT },
            ],
            // For a planner (docs/physics/battery/battery.md): the energy budget, integrating up to four power loads.
            signature: {
                purpose: "an energy store drained by up to four power loads: state of charge, energy used, energy remaining",
                inputs: {
                    powerA: { quantity: "Power", unit: "watt", description: "a load" },
                    powerB: { quantity: "Power", unit: "watt" },
                    powerC: { quantity: "Power", unit: "watt" },
                    powerD: { quantity: "Power", unit: "watt" },
                },
                outputs: {
                    stateOfChargePercent: { quantity: "Dimensionless", unit: "percent", description: "state of charge" },
                    energyUsedWh: { quantity: "Energy", unit: "Wh" },
                    remainingWh: { quantity: "Energy", unit: "Wh" },
                },
                capabilities: ["energy", "battery", "budget", "integration"],
            },
        });
    },
};
