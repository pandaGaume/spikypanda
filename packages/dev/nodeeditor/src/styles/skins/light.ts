import { Skin } from "../../skin-registry";

/**
 * Light skin: bright surfaces, dark text. Accent stays cyan but
 * shifted darker (#0099bb) for AA contrast on white. Status colors
 * use GitHub-style palette (Octicon-derived) which reads well on
 * light backgrounds without losing semantic meaning.
 */
export const lightSkin: Skin = {
    "--ne-color-primary":           "#0099bb",
    "--ne-color-primary-bg":        "rgba(0, 153, 187, 0.10)",
    "--ne-color-primary-bg-strong": "rgba(0, 153, 187, 0.20)",

    "--ne-color-bg":                "#f4f5f7",
    "--ne-color-surface":           "#ffffff",
    "--ne-color-surface-faint":     "rgba(255, 255, 255, 0.6)",
    "--ne-color-surface-strong":    "rgba(255, 255, 255, 0.95)",
    "--ne-color-surface-popover":   "#ffffff",
    "--ne-color-node-header":       "#d0d4dc",

    "--ne-color-recessed-1":        "rgba(0, 0, 0, 0.05)",
    "--ne-color-recessed-2":        "rgba(0, 0, 0, 0.08)",
    "--ne-color-recessed-3":        "rgba(0, 0, 0, 0.15)",

    "--ne-color-border":            "rgba(0, 0, 0, 0.15)",
    "--ne-color-border-soft":       "rgba(0, 0, 0, 0.08)",
    "--ne-color-border-strong":     "rgba(0, 0, 0, 0.35)",

    "--ne-color-text":              "#1a1a1a",
    "--ne-color-text-strong":       "#000000",
    "--ne-color-text-muted":        "#666666",
    "--ne-color-text-subtle":       "rgba(0, 0, 0, 0.55)",
    "--ne-color-text-faint":        "rgba(0, 0, 0, 0.35)",

    "--ne-color-success":           "#2ea043",
    "--ne-color-success-bg":        "rgba(46, 160, 67, 0.15)",
    "--ne-color-warning":           "#bf8700",
    "--ne-color-danger":            "#cf222e",
    "--ne-color-danger-bg":         "rgba(207, 34, 46, 0.15)",
    "--ne-color-info":              "#0969da",

    "--ne-color-connection":         "#333",

    // Pastel palette: lower saturation for legibility on white surfaces.
    "--ne-color-category-source":      "#7fc996",
    "--ne-color-category-sink":        "#d18b8b",
    "--ne-color-category-compute":     "#9aa3d6",
    "--ne-color-category-sensor":      "#8fb6d1",
    "--ne-color-category-fault":       "#d49191",
    "--ne-color-category-environment": "#a8c98b",
    "--ne-color-category-composition": "#a8acb6",
    "--ne-color-category-dsp":         "#90b1bf",
    "--ne-color-category-geometry":    "#c79c9c",

    "--ne-status-idle":             "rgba(0, 0, 0, 0.35)",
    "--ne-status-transition":       "#bf8700",
    "--ne-status-started":          "#2ea043",
    "--ne-status-failed":           "#cf222e",
    "--ne-status-disabled":         "#8a8a8a",

    "--ne-shadow-sm":               "0 2px 8px rgba(0, 0, 0, 0.12)",
    "--ne-shadow-md":               "0 4px 16px rgba(0, 0, 0, 0.18)",

    "--ne-font-family":             "\"Segoe UI\", system-ui, sans-serif",
};
