/**
 * Node signatures: every signed type of the job registry agrees with its
 * ports (a signature port exists, and never contradicts a unit the port
 * already expects); the types the CO2 scenario needs are signed; and the
 * planner's search answers as the factory spec says (docs/factory-harness.fr.md,
 * section 3.2): an output "Concentration, ppm" finds the cabin's air balance,
 * the capability "exchange" finds the gate, an unknown output finds nothing.
 */
import { describe, expect, it } from "@jest/globals";
import { searchSignatures, validateSignature, type INodeMeta } from "spikypanda-core";
import { buildJobRegistry } from "spikypanda-factory";

const SCENARIO_TYPES = ["Physics.Scene:atmosphere", "Physics.Scene:atmosphere-gate", "Physics.LifeSupport:crew", "Physics.LifeSupport:scrubber", "Physics.LifeSupport:cabin-air", "Physics.Electric:battery", "spk.onnx:model", "Logic.Time:timeline"];

function metas(): INodeMeta[] {
    const registry = buildJobRegistry();
    const out: INodeMeta[] = [];
    for (const type of registry.types()) {
        const m = registry.meta(type);
        if (m) out.push(m);
    }
    return out;
}

describe("node signatures", () => {
    it("the scenario's types are signed, and every signature agrees with its ports", () => {
        const all = metas();
        const signed = all.filter((m) => m.signature);
        for (const type of SCENARIO_TYPES) expect(signed.map((m) => m.type)).toContain(type);
        const problems = signed.flatMap((m) => validateSignature(m));
        expect(problems).toEqual([]);
    });

    it("a signature port the meta does not have, or a unit the port contradicts, is a problem", () => {
        const meta: INodeMeta = {
            type: "test:x",
            label: "x",
            inputPorts: [{ slot: "power", optional: true, unit: { quantity: "Power", unit: "watt" } }],
            outputPorts: [],
            signature: { purpose: "p", inputs: { power: { quantity: "Power", unit: "kwatt" }, ghost: { quantity: "Any" } }, outputs: {}, capabilities: ["x"] },
        };
        const problems = validateSignature(meta);
        expect(problems.map((p) => p.where).sort()).toEqual(["inputs.ghost", "inputs.power"]);
    });

    it("the search ranks an exact output first and finds the gate by capability", () => {
        const all = metas();
        const co2 = searchSignatures(all, { requiredOutputs: [{ quantity: "Concentration", unit: "ppm" }] });
        expect(co2[0]?.type).toBe("Physics.LifeSupport:cabin-air");
        expect(co2[0]?.produces).toEqual([{ port: "co2Ppm", quantity: "Concentration", unit: "ppm" }]);

        const exchange = searchSignatures(all, { capabilities: ["exchange"] });
        expect(exchange.map((m) => m.type)).toContain("Physics.Scene:atmosphere-gate");

        const nothing = searchSignatures(all, { requiredOutputs: [{ quantity: "Luminosity" }] });
        expect(nothing).toEqual([]);

        // A quantity without the unit still matches, below an exact one.
        const power = searchSignatures(all, { requiredOutputs: [{ quantity: "Power", unit: "kwatt" }] });
        expect(power.map((m) => m.type)).toContain("Physics.LifeSupport:scrubber");
        expect(power[0]?.score).toBeLessThan(100);
    });
});
