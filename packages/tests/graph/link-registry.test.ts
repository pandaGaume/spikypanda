import { GraphOLink, LinkRegistry } from "spikypanda-core";

class WeightedLink extends GraphOLink {
    public constructor(public weight = 1) {
        super();
    }
}

describe("LinkRegistry", () => {
    test("registers, creates and removes an unwired link", () => {
        const registry = new LinkRegistry();
        registry.register("Test:weighted", (config) => new WeightedLink(Number(config?.weight ?? 1)), {
            label: "Weighted",
            category: "test",
            sourcePortTypes: ["float"],
            targetPortTypes: ["float"],
        });

        const link = registry.create("Test:weighted", { weight: 0.25 }) as WeightedLink;
        expect(link).toBeInstanceOf(WeightedLink);
        expect(link.weight).toBe(0.25);
        expect(link.oini).toBeNull();
        expect(link.ofin).toBeNull();
        expect(registry.meta("Test:weighted")).toMatchObject({
            type: "Test:weighted",
            label: "Weighted",
            category: "test",
        });
        expect(registry.types()).toEqual(["Test:weighted"]);
        expect(registry.unregister("Test:weighted")).toBe(true);
        expect(registry.create("Test:weighted")).toBeUndefined();
    });

    test("resolves the highest-priority matching port pair deterministically", () => {
        const registry = new LinkRegistry();
        registry.register("Core:generic", () => new GraphOLink(), {
            label: "Generic",
            sourcePortTypes: ["*"],
            targetPortTypes: ["*"],
            priority: -100,
        });
        registry.register("SNN:spike", () => new WeightedLink(), {
            label: "Spike synapse",
            sourcePortTypes: ["spike"],
            targetPortTypes: ["spike"],
            priority: 10,
        });

        expect(registry.resolve("spike", "spike")).toBe("SNN:spike");
        expect(registry.resolve("float", "float")).toBe("Core:generic");
    });
});
