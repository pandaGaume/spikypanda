import { Skin } from "../../skin-registry";

/**
 * Dark skin: the default. Values mirror the .ne-editor { ... } default
 * block in nodeeditor.css verbatim so that setSkin("dark") deterministically
 * restores the default even if some other skin had pushed inline overrides.
 */
export const darkSkin: Skin = {
    "--ne-color-primary": "#00d4ff",
    "--ne-color-primary-bg": "rgba(0, 212, 255, 0.12)",
    "--ne-color-primary-bg-strong": "rgba(0, 212, 255, 0.25)",

    "--ne-color-bg": "#1a1a2e",
    "--ne-color-surface": "rgba(22, 33, 62, 1)",
    "--ne-color-surface-faint": "rgba(22, 33, 62, 0.4)",
    "--ne-color-surface-strong": "rgba(22, 33, 62, 0.85)",
    "--ne-color-surface-popover": "rgba(22, 33, 62, 0.97)",
    "--ne-color-node-header": "#335",

    "--ne-color-recessed-1": "rgba(0, 0, 0, 0.15)",
    "--ne-color-recessed-2": "rgba(0, 0, 0, 0.25)",
    "--ne-color-recessed-3": "rgba(0, 0, 0, 0.40)",

    "--ne-color-border": "rgba(255, 255, 255, 0.12)",
    "--ne-color-border-soft": "rgba(255, 255, 255, 0.06)",
    "--ne-color-border-strong": "rgba(255, 255, 255, 0.30)",

    "--ne-color-text": "#e0e0e0",
    "--ne-color-text-strong": "#fff",
    "--ne-color-text-muted": "#aaa",
    "--ne-color-text-subtle": "rgba(255, 255, 255, 0.6)",
    "--ne-color-text-faint": "rgba(255, 255, 255, 0.35)",

    "--ne-color-success": "#4ade80",
    "--ne-color-success-bg": "rgba(74, 222, 128, 0.18)",
    "--ne-color-warning": "#fbbf24",
    "--ne-color-danger": "#f87171",
    "--ne-color-danger-bg": "rgba(239, 68, 68, 0.18)",
    "--ne-color-info": "#4aaeff",

    "--ne-color-connection": "#fff",

    "--ne-color-category-source": "#2a6",
    "--ne-color-category-sink": "#a55",
    "--ne-color-category-compute": "#44a",
    "--ne-color-category-sensor": "#27a",
    "--ne-color-category-fault": "#a33",
    "--ne-color-category-environment": "#5a5",
    "--ne-color-category-composition": "#556",
    "--ne-color-category-dsp": "#467",
    "--ne-color-category-geometry": "#966",

    "--ne-status-idle": "rgba(255, 255, 255, 0.35)",
    "--ne-status-transition": "#fbbf24",
    "--ne-status-started": "#4ade80",
    "--ne-status-failed": "#f87171",
    "--ne-status-disabled": "#6b7280",

    "--ne-shadow-sm": "0 2px 8px rgba(0, 0, 0, 0.4)",
    "--ne-shadow-md": "0 4px 16px rgba(0, 0, 0, 0.6)",

    "--ne-font-family": '"Segoe UI", system-ui, sans-serif',
};
