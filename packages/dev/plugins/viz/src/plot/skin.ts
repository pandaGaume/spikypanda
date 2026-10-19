/**
 * The colours a plot tile has to borrow from the editor's skin.
 *
 * uPlot paints its axis values, labels, ticks and grid on a canvas, so
 * they cannot inherit anything from CSS: every colour has to be passed
 * in as a string when the chart is built. Tiles used to hardcode the
 * dark theme (`#8A8A9A` for the text, `#3A3A48` for the grid), which is
 * unreadable the moment the host is light, and goes out of step with a
 * skin the moment one is swapped.
 *
 * The node editor publishes its palette as CSS custom properties on its
 * own root (`--ne-color-text`, `--ne-color-text-muted`,
 * `--ne-color-border`), and a skin redefines exactly those. Reading them
 * from the mounted host is therefore enough to follow any skin, in any
 * host, without this plugin importing the editor.
 *
 * The fallbacks are the values the tiles used before, so a host that
 * ships no editor stylesheet looks exactly as it did.
 */

/** What a canvas-drawn chart needs to match its surroundings. */
export interface ISkinColors {
    /** Titles and anything that must read as primary text. */
    readonly text: string;
    /** Axis values and axis labels: present, but quieter than the data. */
    readonly muted: string;
    /** Grid and tick lines. */
    readonly grid: string;
}

const FALLBACK: ISkinColors = Object.freeze({
    text: "#e0e0e0",
    muted: "#8A8A9A",
    grid: "#3A3A48",
});

/**
 * Read the skin colours in force where this tile is mounted.
 *
 * `host` is the tile's content element. Passing null, or running
 * outside a browser, returns the fallbacks rather than throwing, so a
 * headless test can build the same options object.
 */
export function skinColors(host: HTMLElement | null): ISkinColors {
    if (!host || typeof getComputedStyle !== "function") return FALLBACK;
    let style: CSSStyleDeclaration;
    try {
        style = getComputedStyle(host);
    } catch {
        return FALLBACK;
    }
    const read = (name: string, fallback: string): string => {
        const value = style.getPropertyValue(name).trim();
        return value.length > 0 ? value : fallback;
    };
    return Object.freeze({
        text: read("--ne-color-text", FALLBACK.text),
        muted: read("--ne-color-text-muted", FALLBACK.muted),
        grid: read("--ne-color-border", FALLBACK.grid),
    });
}

/**
 * The axis description shared by every uPlot tile: values and label in
 * the muted colour, grid and ticks in the border colour.
 *
 * Kept here rather than copied into each tile so that a change of rule
 * (a dedicated chart-grid variable, say) lands in one place.
 */
export function skinnedAxis(colors: ISkinColors, label?: string): { label?: string; stroke: string; grid: { stroke: string; width: number }; ticks: { stroke: string; width: number } } {
    return {
        ...(label === undefined ? {} : { label }),
        stroke: colors.muted,
        grid: { stroke: colors.grid, width: 0.5 },
        ticks: { stroke: colors.grid, width: 0.5 },
    };
}
