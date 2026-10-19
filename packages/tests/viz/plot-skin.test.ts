/**
 * Plot tiles take their colours from the skin.
 *
 * uPlot paints axis values, labels, ticks and grid on a canvas, so none
 * of them inherit anything from CSS: the colours have to be handed over
 * as strings when the chart is built. The tiles used to hardcode the
 * dark theme, which is unreadable the moment the host is light, and
 * goes out of step the moment a skin is swapped.
 *
 * These tests cover the rule, not the rendering: the fallback path when
 * there is no DOM, which is also the headless case, and the shape of
 * the axis description every tile shares.
 */
// Imported by path rather than through the package root: the viz
// index pulls the control tiles, which load NexusUI, a browser-only
// UMD bundle that does not survive a node test environment. The
// module under test has no browser dependency at all.
import { skinColors, skinnedAxis } from "../../dev/plugins/viz/src/plot/skin";

/** Stand in for `getComputedStyle` over a given set of variables. */
function withComputedStyle<T>(vars: Record<string, string>, run: () => T): T {
    const original = globalThis.getComputedStyle;
    (globalThis as { getComputedStyle?: unknown }).getComputedStyle = () =>
        ({ getPropertyValue: (name: string) => vars[name] ?? "" }) as unknown as CSSStyleDeclaration;
    try {
        return run();
    } finally {
        (globalThis as { getComputedStyle?: unknown }).getComputedStyle = original;
    }
}

describe("skinColors", () => {
    it("falls back to the previous dark values when there is no host", () => {
        expect(skinColors(null)).toEqual({ text: "#e0e0e0", muted: "#8A8A9A", grid: "#3A3A48" });
    });

    it("reads the editor's custom properties, trimmed", () => {
        // A host in a light skin: the same three variables the node
        // editor publishes, with light values.
        const colors = withComputedStyle(
            { "--ne-color-text": " #101014 ", "--ne-color-text-muted": "#55555f", "--ne-color-border": "rgba(0, 0, 0, 0.18)" },
            () => skinColors({} as HTMLElement)
        );
        expect(colors).toEqual({ text: "#101014", muted: "#55555f", grid: "rgba(0, 0, 0, 0.18)" });
    });

    it("keeps the fallback for a variable the skin does not define", () => {
        const colors = withComputedStyle({ "--ne-color-text": "#fff" }, () => skinColors({} as HTMLElement));
        expect(colors.text).toBe("#fff");
        expect(colors.muted).toBe("#8A8A9A");
        expect(colors.grid).toBe("#3A3A48");
    });
});

describe("skinnedAxis", () => {
    it("puts the values in the muted colour and the grid in the border colour", () => {
        expect(skinnedAxis({ text: "#fff", muted: "#aaa", grid: "#333" }, "wavelength (nm)")).toEqual({
            label: "wavelength (nm)",
            stroke: "#aaa",
            grid: { stroke: "#333", width: 0.5 },
            ticks: { stroke: "#333", width: 0.5 },
        });
    });

    it("omits the label when a tile does not want one", () => {
        expect(skinnedAxis({ text: "#fff", muted: "#aaa", grid: "#333" })).not.toHaveProperty("label");
    });
});
