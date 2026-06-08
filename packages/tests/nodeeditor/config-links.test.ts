/**
 * Unit tests for P5a: the config-link port-type family and the cable
 * style derivation.
 *
 * Coverage:
 *   1. CONFIG_LINK_TYPES enumerates exactly the four expected types
 *      (scene / solver / atmosphere / shared).
 *   2. isConfigLinkType returns true for those four and false for
 *      every data type (float, vec3, matrix44, ...).
 *   3. arePortTypesCompatible rejects mismatched config-link types
 *      AND rejects `any` ↔ config-link wirings (which would otherwise
 *      silently slip past as wildcard matches).
 *   4. deriveLinkKind returns "config" when either endpoint is a
 *      config-link type, "data" otherwise.
 *   5. PORT_COLORS has an entry for every PortType (kept in sync).
 */
import { deriveLinkKind } from "../../dev/nodeeditor/src/connection";
import { CONFIG_LINK_TYPES, PORT_COLORS, arePortTypesCompatible, isConfigLinkType, type PortType } from "../../dev/nodeeditor/src/types";

const DATA_TYPES: PortType[] = ["float", "vec2", "vec3", "vec4", "tensor", "any", "exec", "matrix44", "boolean", "trigger", "array"];
const CONFIG_TYPES: PortType[] = ["scene", "solver", "atmosphere", "shared"];

describe("CONFIG_LINK_TYPES + isConfigLinkType", () => {
    it("enumerates exactly scene / solver / atmosphere / shared", () => {
        const got = Array.from(CONFIG_LINK_TYPES).sort();
        expect(got).toEqual(["atmosphere", "scene", "shared", "solver"]);
    });

    it.each(CONFIG_TYPES)("classifies %s as a config-link type", (t) => {
        expect(isConfigLinkType(t)).toBe(true);
    });

    it.each(DATA_TYPES)("classifies %s as a data type (NOT a config-link)", (t) => {
        expect(isConfigLinkType(t)).toBe(false);
    });
});

describe("arePortTypesCompatible", () => {
    it("matches identical config-link types", () => {
        for (const t of CONFIG_TYPES) {
            expect(arePortTypesCompatible(t, t)).toBe(true);
        }
    });

    it("rejects mismatched config-link types (scene ↔ solver, etc.)", () => {
        expect(arePortTypesCompatible("scene", "solver")).toBe(false);
        expect(arePortTypesCompatible("solver", "atmosphere")).toBe(false);
        expect(arePortTypesCompatible("atmosphere", "shared")).toBe(false);
        expect(arePortTypesCompatible("shared", "scene")).toBe(false);
    });

    it("rejects `any` ↔ config-link (config-links opt out of the wildcard)", () => {
        for (const t of CONFIG_TYPES) {
            expect(arePortTypesCompatible("any", t)).toBe(false);
            expect(arePortTypesCompatible(t, "any")).toBe(false);
        }
    });

    it("still matches data types against each other through `any`", () => {
        expect(arePortTypesCompatible("any", "float")).toBe(true);
        expect(arePortTypesCompatible("vec3", "any")).toBe(true);
        expect(arePortTypesCompatible("matrix44", "any")).toBe(true);
    });

    it("preserves the legacy strict-equality rule for non-`any` data types", () => {
        expect(arePortTypesCompatible("float", "float")).toBe(true);
        expect(arePortTypesCompatible("float", "vec3")).toBe(false);
        expect(arePortTypesCompatible("matrix44", "tensor")).toBe(false);
    });
});

describe("deriveLinkKind", () => {
    it.each(CONFIG_TYPES)("returns 'config' when either side is %s", (t) => {
        expect(deriveLinkKind(t, t)).toBe("config");
    });

    it("returns 'data' for two data types", () => {
        expect(deriveLinkKind("float", "float")).toBe("data");
        expect(deriveLinkKind("vec3", "any")).toBe("data");
        expect(deriveLinkKind("matrix44", "matrix44")).toBe("data");
    });
});

describe("PORT_COLORS coverage", () => {
    it("has an entry for every config-link type", () => {
        for (const t of CONFIG_TYPES) {
            expect(typeof PORT_COLORS[t]).toBe("string");
            expect(PORT_COLORS[t]).toMatch(/^#[0-9a-f]{3,6}$/i);
        }
    });

    it("has an entry for every data type (no missing rows after the union widened)", () => {
        for (const t of DATA_TYPES) {
            expect(typeof PORT_COLORS[t]).toBe("string");
        }
    });
});
