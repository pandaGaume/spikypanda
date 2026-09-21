/**
 * The runtime served without a studio: on the job registry (every plugin,
 * no viewer), the runtime controller answers the catalogue, validates a
 * spec, builds a document through the real registry, instantiates it and
 * runs it with probes. The numbers are the editor's tick loop's, and the
 * studio's controller now answers the catalogue through the same functions.
 */
import { describe, expect, it } from "@jest/globals";
import { RuntimeController } from "spikypanda-mcp/runtime.controller";
import { runtimeTools } from "spikypanda-mcp/runtime.tools";
import { buildJobRegistry } from "spikypanda-factory";

const registry = buildJobRegistry();

/** Four sleepers and a scrubber in one cabin: the CO2 balance of the life-support sample, in five nodes. */
const CABIN_SPEC = {
    nodes: [
        { id: "crew", typeId: "Physics.LifeSupport:crew", params: { count: 4, activity: "sleep" } },
        // The scrubber's command is an input port: a timeline holds it at 33 % for the whole run (session seconds).
        { id: "command", typeId: "Logic.Time:timeline", params: { segments: JSON.stringify([{ from: 0, to: 1e9, value: 0.33 }]), defaultValue: 0.33 } },
        { id: "scrubber", typeId: "Physics.LifeSupport:scrubber" },
        { id: "cabin", typeId: "Physics.LifeSupport:cabin-air", params: { initialPpm: 1500 } },
    ],
    connections: [
        { from: ["command", "value"], to: ["scrubber", "command"] },
        { from: ["crew", "co2Emission"], to: ["cabin", "emissionA"] },
        { from: ["scrubber", "effectiveRate"], to: ["cabin", "scrubberRate"] },
    ],
};

const data = async (c: RuntimeController, tool: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const r = await c.executeToolAsync(tool, args);
    if (!r.ok) throw new Error(`${tool}: ${r.error}`);
    return r.data as Record<string, unknown>;
};

describe("the runtime's MCP surface, no editor", () => {
    it("declares the catalogue, document and session tools", () => {
        const names = runtimeTools().map((t) => t.name);
        expect(names).toEqual(["registry_list_nodes", "registry_search", "registry_describe_node", "document_validate", "document_build", "document_instantiate", "session_run"]);
    });

    it("answers the catalogue: the list, one type with its signature, the planner's search", async () => {
        const c = new RuntimeController(registry);
        const list = await data(c, "registry_list_nodes", {});
        expect(list.count).toBeGreaterThan(100);
        const cabin = await data(c, "registry_describe_node", { type: "Physics.LifeSupport:cabin-air" });
        expect((cabin.signature as { capabilities: string[] }).capabilities).toContain("prediction");
        const found = await data(c, "registry_search", { requiredOutputs: [{ quantity: "Concentration", unit: "ppm" }] });
        expect((found.matches as Array<{ type: string }>)[0].type).toBe("Physics.LifeSupport:cabin-air");
        const unknown = await c.executeToolAsync("registry_describe_node", { type: "no:such" });
        expect(unknown.ok).toBe(false);
    });

    it("validates a spec: a good one has no problem, a bad one names each", async () => {
        const c = new RuntimeController(registry);
        expect(await data(c, "document_validate", { spec: CABIN_SPEC })).toEqual({ ok: true, problems: [] });
        const bad = await data(c, "document_validate", {
            spec: {
                nodes: [{ id: "a", typeId: "Physics.LifeSupport:crew" }, { id: "a", typeId: "no:such" }],
                connections: [{ from: ["a", "co2Emission"], to: ["ghost", "x"] }, { from: ["a", "nope"], to: ["a", "count"] }],
            },
        });
        const whats = (bad.problems as Array<{ what: string }>).map((p) => p.what);
        expect(bad.ok).toBe(false);
        expect(whats).toEqual(expect.arrayContaining([expect.stringContaining("id used twice"), expect.stringContaining('unknown typeId "no:such"'), expect.stringContaining('unknown node "ghost"'), expect.stringContaining('no output port "nope"')]));
    });

    it("builds a document into the store, instantiates it, and runs it: the cabin drifts with four sleepers", async () => {
        const c = new RuntimeController(registry);
        const built = await data(c, "document_build", { spec: CABIN_SPEC, name: "cabin" });
        expect(built.ok).toBe(true);
        expect(String(built.sha256)).toMatch(/^[0-9a-f]{64}$/);
        expect(c.documents.list()).toEqual(["cabin"]);

        const inst = await data(c, "document_instantiate", { name: "cabin" });
        expect(inst.ok).toBe(true);
        expect(inst.missingTypeIds).toEqual([]);
        expect((inst.nodes as Array<{ instantiated: boolean }>).every((n) => n.instantiated)).toBe(true);

        // Sixty story minutes at one tick per minute, the concentration and the state read every tick.
        const run = await data(c, "session_run", { name: "cabin", dt: 60, duration: 3600, probes: [{ node: "cabin", property: "co2Ppm" }, { node: "scrubber", property: "power" }] });
        expect(run.ticks).toBe(60);
        expect(run.samples).toBe(60);
        const co2 = (run.summary as Record<string, { first: number; last: number; min: number; max: number }>)["cabin.co2Ppm"];
        expect(co2.first).toBeCloseTo(1500, 0);
        expect(Number.isFinite(co2.last)).toBe(true);
        expect(co2.last).not.toBe(co2.first);
        expect((run.series as Record<string, number[]>)["scrubber.power"].length).toBe(60);
        expect(String(run.documentSha256)).toBe(String(built.sha256));
        expect(typeof run.wallMs).toBe("number");
    });

    it("refuses what it cannot do, with the reason", async () => {
        const c = new RuntimeController(registry);
        const noDoc = await c.executeToolAsync("session_run", { name: "none", dt: 1, duration: 1, probes: [{ node: "a", property: "b" }] });
        expect(noDoc.ok).toBe(false);
        expect(noDoc.ok ? "" : noDoc.error).toContain('no document named "none"');
        await data(c, "document_build", { spec: CABIN_SPEC, name: "cabin" });
        const noProbe = await c.executeToolAsync("session_run", { name: "cabin", dt: 60, duration: 600, probes: [{ node: "cabin", property: "notAProperty" }] });
        expect(noProbe.ok).toBe(false);
        const tooLong = await c.executeToolAsync("session_run", { name: "cabin", dt: 0.001, duration: 1e9, probes: [{ node: "cabin", property: "co2Ppm" }] });
        expect(tooLong.ok).toBe(false);
        expect(tooLong.ok ? "" : tooLong.error).toContain("at most");
    });
});
