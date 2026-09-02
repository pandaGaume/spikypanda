/**
 * The projection layer.
 *
 * Two things are worth asserting here and they are different in kind. The
 * first is the mechanism: that a projection registered from outside the core
 * is resolved, which is the only proof that the extension point is one. The
 * second is correctness on a hand-verified sample, deliberately small,
 * because a large generated sample would only be re-deriving the table from
 * itself.
 */
import {
    getUnitProjection,
    projectUnit,
    qudtProjection,
    registerUnitProjection,
    resolveQuantityKind,
    resolveUnit,
    unitProjectionIds,
    type IQudtProjection,
    type IUnitProjection,
    type Unit,
} from "spikypanda-core";

/** Project a declaration the way a description layer would. */
function qudt(quantity: string, unit: string): IQudtProjection | undefined {
    return projectUnit<IQudtProjection>({ quantity, unit }, "qudt");
}

describe("QUDT projection", () => {
    it("projects a unit and its quantity kind", () => {
        expect(qudt("Current", "amp")).toEqual({ unit: "unit:A", quantityKind: undefined });
        expect(qudt("Angle", "d")).toEqual({ unit: "unit:DEG", quantityKind: "quantitykind:PlaneAngle" });
        expect(qudt("Acceleration", "mps2")).toEqual({ unit: "unit:M-PER-SEC2", quantityKind: "quantitykind:Acceleration" });
    });

    it("spells the names that are irregular, since they cannot be generated", () => {
        // Celsius is not "C", and the QUDT local name is not the UCUM code.
        expect(qudt("Temperature", "c")?.unit).toBe("unit:DEG_C");
        expect(qudt("Mass", "kg")?.unit).toBe("unit:KiloGM");
        expect(qudt("Frequency", "Hz")?.unit).toBe("unit:HZ");
        expect(qudt("Level", "dB")?.unit).toBe("unit:DeciB");
        expect(qudt("Acceleration", "g")?.unit).toBe("unit:G");
    });

    it("separates apparent from reactive power, which UCUM cannot", () => {
        // Same canonical code on both sides.
        expect(resolveUnit({ quantity: "ApparentPower", unit: "VA" })?.ucum).toBe("V.A");
        expect(resolveUnit({ quantity: "ReactivePower", unit: "var" })?.ucum).toBe("V.A");
        // The quantity kind is what makes the projection different, and it is
        // the reason `project` takes one.
        expect(qudt("ApparentPower", "VA")?.unit).toBe("unit:VA");
        expect(qudt("ReactivePower", "var")?.unit).toBe("unit:VAR");
    });

    it("returns undefined rather than a near match", () => {
        // Not in the QUDT table. A unit with no verified equivalent must be
        // absent, not approximated by a neighbour.
        expect(qudt("Count", "samples")).toBeUndefined();
        expect(qudt("Mass", "Sm")).toBeUndefined();
        // Unresolvable declarations fail the same way.
        expect(qudt("Frequency", "nope")).toBeUndefined();
        expect(qudt("Nope", "Hz")).toBeUndefined();
    });

    it("carries the unit alone when the kind has no mapping", () => {
        const out = qudt("Current", "amp");
        expect(out?.unit).toBe("unit:A");
        // A partial answer is legitimate; a guessed quantity kind is not.
        expect(out?.quantityKind).toBeUndefined();
    });
});

describe("projection registry", () => {
    it("lists only the projections that are implemented", () => {
        const ids = unitProjectionIds();
        expect(ids).toContain("qudt");
        // Documented but unregistered on purpose: advertising them would
        // promise a capability that answers undefined to everything.
        expect(ids).not.toContain("opcua");
        expect(ids).not.toContain("sparkplug");
        expect(ids).not.toContain("om");
    });

    it("resolves a projection defined outside the core, which is the extension point", () => {
        interface IHouse {
            readonly tag: string;
        }
        const house: IUnitProjection<IHouse> = {
            id: "test-house-format",
            spec: "https://example.invalid/house",
            project: (unit: Unit, quantityKind: string): IHouse | undefined =>
                unit.ucum ? { tag: `${quantityKind}:${unit.ucum}` } : undefined,
        };
        registerUnitProjection(house);

        expect(unitProjectionIds()).toContain("test-house-format");
        expect(getUnitProjection<IHouse>("test-house-format")).toBe(house);
        // Reached through the same call the built-ins are reached through, so
        // nothing in the core had to change to add it.
        expect(projectUnit<IHouse>({ quantity: "Torque", unit: "Nm" }, "test-house-format")).toEqual({ tag: "Torque:N.m" });
    });

    it("answers undefined for an unregistered target instead of throwing", () => {
        expect(projectUnit({ quantity: "Frequency", unit: "Hz" }, "not-registered")).toBeUndefined();
    });

    it("names the specification that decides what is correct", () => {
        expect(qudtProjection.spec).toMatch(/^https:\/\//);
        expect(resolveQuantityKind("ReactivePower")).toBe("ReactivePower");
    });
});
