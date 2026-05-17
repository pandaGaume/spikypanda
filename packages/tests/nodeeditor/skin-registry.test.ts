import { Skin, SkinRegistry, darkSkin, heliosSkin, lightSkin } from "spikypanda-nodeeditor";

describe("SkinRegistry", () => {
    test("fresh registry knows no skins", () => {
        const r = new SkinRegistry();
        expect(r.names()).toEqual([]);
        expect(r.has("dark")).toBe(false);
        expect(r.getSkin("dark")).toBeUndefined();
    });

    test("register exposes a skin via has() and getSkin()", () => {
        const r = new SkinRegistry();
        const ocean: Skin = { "--ne-color-primary": "#0aa", "--ne-color-bg": "#001020" };
        r.register("ocean", ocean);
        expect(r.has("ocean")).toBe(true);
        expect(r.getSkin("ocean")).toBe(ocean);
        expect(r.names()).toEqual(["ocean"]);
    });

    test("re-registering replaces (last wins)", () => {
        const r = new SkinRegistry();
        const a: Skin = { "--ne-color-primary": "#a" };
        const b: Skin = { "--ne-color-primary": "#b" };
        r.register("ocean", a);
        r.register("ocean", b);
        expect(r.getSkin("ocean")).toBe(b);
        expect(r.names()).toEqual(["ocean"]);
    });

    test("unregister", () => {
        const r = new SkinRegistry();
        r.register("ocean", { "--ne-color-primary": "#0aa" });
        expect(r.unregister("ocean")).toBe(true);
        expect(r.has("ocean")).toBe(false);
        expect(r.unregister("ocean")).toBe(false);
    });

    test("built-in skins define the full token contract", () => {
        // The dark skin is the canonical reference: every token the
        // editor knows about must be present. light and helios may
        // legitimately omit a key (and fall back to the CSS default),
        // but in practice we keep them full so they are deterministic.
        const darkKeys = Object.keys(darkSkin).sort();

        // Sanity: a handful of mandatory keys must be present.
        expect(darkKeys).toContain("--ne-color-primary");
        expect(darkKeys).toContain("--ne-color-bg");
        expect(darkKeys).toContain("--ne-color-text");
        expect(darkKeys).toContain("--ne-color-danger");
        expect(darkKeys).toContain("--ne-status-started");
        expect(darkKeys).toContain("--ne-font-family");

        // light and helios cover the same keys.
        expect(Object.keys(lightSkin).sort()).toEqual(darkKeys);
        expect(Object.keys(heliosSkin).sort()).toEqual(darkKeys);
    });

    test("built-in skins are visibly distinct", () => {
        // Spot-check the brand color: each built-in is a different family.
        expect(darkSkin["--ne-color-primary"]).toBe("#00d4ff");   // cyan
        expect(lightSkin["--ne-color-primary"]).toBe("#0099bb");  // darker cyan for AA contrast
        expect(heliosSkin["--ne-color-primary"]).toBe("#E8762D"); // burnt orange
    });
});
