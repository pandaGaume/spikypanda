/**
 * Validates that GraphItem.serialize() / deserialize() round-trip every
 * @cloneable field. Mirrors the user-observed scenario where editable
 * property values weren't persisting through save/load — the missing
 * piece was a serialize implementation that walks the @cloneable
 * metadata (clone() was the only consumer until now).
 */
import { cloneable, GraphItem, Cartesian3 } from "spikypanda-core";

class Knob extends GraphItem {
    @cloneable public nfft: number = 512;
    @cloneable public title: string = "default";
    @cloneable public enabled: boolean = true;
    @cloneable public gravity: Cartesian3 = new Cartesian3(0, 0, -9.81);
    // NOT cloneable: runtime state that shouldn't round-trip.
    public runtimeCounter: number = 0;
}

describe("GraphItem.serialize / deserialize", () => {
    test("round-trips primitive @cloneable fields", () => {
        const a = new Knob();
        a.nfft = 1024;
        a.title = "user-set";
        a.enabled = false;

        const json = JSON.parse(JSON.stringify(a.serialize()));

        const b = new Knob();
        b.deserialize(json);

        expect(b.nfft).toBe(1024);
        expect(b.title).toBe("user-set");
        expect(b.enabled).toBe(false);
    });

    test("round-trips a Cartesian3 field, preserving the class prototype", () => {
        const a = new Knob();
        a.gravity = new Cartesian3(1, 2, 3);

        const json = JSON.parse(JSON.stringify(a.serialize()));

        const b = new Knob();
        // b.gravity starts as a fresh Cartesian3 — deserialize must
        // mutate it in place (preserve prototype), not replace it.
        const ref = b.gravity;
        b.deserialize(json);

        expect(b.gravity).toBe(ref);                  // same reference
        expect(b.gravity).toBeInstanceOf(Cartesian3); // prototype intact
        expect(b.gravity.x).toBe(1);
        expect(b.gravity.y).toBe(2);
        expect(b.gravity.z).toBe(3);
    });

    test("does NOT serialize fields that are not @cloneable", () => {
        const a = new Knob();
        a.runtimeCounter = 999;
        const json = a.serialize();
        expect(json).not.toHaveProperty("runtimeCounter");
    });

    test("ignores unknown keys in the saved blob (forward compat)", () => {
        const a = new Knob();
        a.nfft = 256;
        // Simulate a save from a future version with extra fields.
        const json = { ...a.serialize(), futureField: "ignored" };

        const b = new Knob();
        expect(() => b.deserialize(json)).not.toThrow();
        expect(b.nfft).toBe(256);
    });

    test("preserves untouched fields when blob is missing a key (backward compat)", () => {
        // Save only captures a partial state (e.g. older app version).
        const partial = { nfft: 4096 };

        const b = new Knob();
        b.deserialize(partial);

        expect(b.nfft).toBe(4096);
        expect(b.title).toBe("default");       // untouched
        expect(b.enabled).toBe(true);          // untouched
        expect(b.gravity.z).toBeCloseTo(-9.81); // untouched
    });

    test("default fields serialize too (rule: every @cloneable persists)", () => {
        // Even if the user never touched the value, it should appear in
        // the JSON. Two reasons:
        //   - The default may change in a future version; the save pins
        //     the value the user was looking at when they saved.
        //   - Diff tools can compare two saves field-by-field.
        const a = new Knob();
        const json = a.serialize();
        expect(json).toHaveProperty("nfft", 512);
        expect(json).toHaveProperty("title", "default");
        expect(json).toHaveProperty("enabled", true);
        expect(json).toHaveProperty("gravity");
    });
});
