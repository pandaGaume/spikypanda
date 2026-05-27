import { Skin } from "../../skin-registry";

/**
 * Helios skin: operations-console aesthetic from the HELIOS visual
 * identity. Burnt-orange accent (#E8762D) signs every active state;
 * surfaces near-black (#0A0A0F / #14141C / #1B1B25) for monitoring
 * readability; IBM Plex Mono typography. Status palette muted and
 * spectrally separated so it sits well next to the orange brand
 * without competing.
 *
 * Palette sourced from packages/host/www/helios/HELIOS Charte Graphique.html.
 */
export const heliosSkin: Skin = {
    "--ne-color-primary":           "#E8762D",
    "--ne-color-primary-bg":        "rgba(232, 118, 45, 0.12)",
    "--ne-color-primary-bg-strong": "rgba(232, 118, 45, 0.25)",

    "--ne-color-bg":                "#0A0A0F",
    "--ne-color-surface":           "#2E2E3E",
    "--ne-color-surface-faint":     "rgba(46, 46, 62, 0.5)",
    "--ne-color-surface-strong":    "rgba(46, 46, 62, 0.92)",
    "--ne-color-surface-popover":   "rgba(46, 46, 62, 0.98)",
    "--ne-color-node-header":       "#404058",

    "--ne-color-recessed-1":        "rgba(0, 0, 0, 0.25)",
    "--ne-color-recessed-2":        "rgba(0, 0, 0, 0.45)",
    "--ne-color-recessed-3":        "rgba(0, 0, 0, 0.70)",

    "--ne-color-border":            "#7878A0",
    "--ne-color-border-soft":       "rgba(120, 120, 160, 0.6)",
    "--ne-color-border-strong":     "#9A9AC4",

    "--ne-color-text":              "#F0F0F5",
    "--ne-color-text-strong":       "#FFFFFF",
    "--ne-color-text-muted":        "#8A8A9A",
    "--ne-color-text-subtle":       "#CACAD5",
    "--ne-color-text-faint":        "#5A5A6A",

    "--ne-color-success":           "#6FBF4A",
    "--ne-color-success-bg":        "rgba(111, 191, 74, 0.15)",
    "--ne-color-warning":           "#E8B62D",
    "--ne-color-danger":            "#B84A3C",
    "--ne-color-danger-bg":         "rgba(184, 74, 60, 0.15)",
    "--ne-color-info":              "#4DA8C7",

    "--ne-color-connection":         "#E8762D",

    // Monochrome cuivre-ambre palette: respects the operations-console
    // aesthetic while keeping per-category signal through hue rotation
    // around the brand. All swatches are deliberately desaturated so
    // the burnt orange brand stays the focal accent on screen.
    "--ne-color-category-source":      "#7A6240",  // amber muted
    "--ne-color-category-sink":        "#704030",  // brick muted
    "--ne-color-category-compute":     "#3B4858",  // slate
    "--ne-color-category-sensor":      "#3D5A6A",  // steel
    "--ne-color-category-fault":       "#6B3838",  // rust muted
    "--ne-color-category-environment": "#4A5F40",  // olive muted
    "--ne-color-category-composition": "#4A4858",  // graphite
    "--ne-color-category-dsp":         "#3B5868",  // teal muted
    "--ne-color-category-geometry":    "#6A4D58",  // mauve muted

    "--ne-status-idle":             "rgba(240, 240, 245, 0.25)",
    "--ne-status-transition":       "#E8762D",
    "--ne-status-started":          "#6FBF4A",
    "--ne-status-failed":           "#B84A3C",
    "--ne-status-disabled":         "#5A5A6A",

    "--ne-shadow-sm":               "0 2px 8px rgba(0, 0, 0, 0.5)",
    "--ne-shadow-md":               "0 4px 16px rgba(0, 0, 0, 0.7)",

    "--ne-font-family":             "\"IBM Plex Mono\", ui-monospace, \"SFMono-Regular\", Menlo, Consolas, monospace",
};
