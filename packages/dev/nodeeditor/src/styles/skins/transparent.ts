import { Skin } from "../../skin-registry";
import { darkSkin } from "./dark";
import { lightSkin } from "./light";

/**
 * Dark skin with a transparent canvas background. Use when exporting
 * an SVG that should sit on top of an external host background, or
 * when embedding the editor over a textured page.
 */
export const transparentDarkSkin: Skin = {
    ...darkSkin,
    "--ne-color-bg": "transparent",
};

/**
 * Light skin with a transparent canvas background. Same rationale as
 * transparentDarkSkin but for bright host pages.
 */
export const transparentLightSkin: Skin = {
    ...lightSkin,
    "--ne-color-bg": "transparent",
};
