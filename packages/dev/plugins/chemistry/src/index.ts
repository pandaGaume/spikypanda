import { chemistryCompositionSubPlugin } from "./composition/index.js";
import { chemistryGasSubPlugin } from "./gas/index.js";

export * from "./gas/gas.node.js";
export * from "./gas/presets.js";
export * from "./composition/composition.node.js";
export * from "./composition/presets.js";
export { chemistryGasSubPlugin } from "./gas/index.js";
export { chemistryCompositionSubPlugin } from "./composition/index.js";

/**
 * @spikypanda/plugin-chemistry
 *
 * Chemical-species and -mixture descriptors consumed by the physics
 * atmosphere / gate nodes. None of the entries here are RuntimeNodes;
 * they are pure `GraphItem` carriers of constants (molar mass,
 * density, Cp, k, μ for gases; mole-fraction vectors for mixtures)
 * that other plugins read at session bind via config-link wiring.
 *
 * Sub-plugins:
 *   Chemistry.Gas         15 gases: 12 bulk species (N2, O2, CO2,
 *                         H2O, Ar, CH4, CO, NH3, He, N2O, Ne, Xe)
 *                         plus 3 VOC / pollutant gases (formaldehyde,
 *                         toluene, benzene). Toxic gases carry OEL /
 *                         IDLH / hazardClass attributes on the gas
 *                         itself; pollutant-ness is an attribute, NOT
 *                         a separate node family (the now-deleted
 *                         Chemistry.Pollutant pseudo-class duplicated
 *                         CO + NH3 — fixed 2026-06-08).
 *   Chemistry.Composition Mixture aggregator + 5 presets (Earth
 *                         humid air, Earth dry air, Mars atmosphere,
 *                         ISS cabin, vacuum). Trace VOCs reach an
 *                         atmosphere by being wired into a
 *                         Composition's gas_in_<k> slot pool — the
 *                         same path bulk gases follow.
 *
 * NOT in chemistry (moved out 2026-06-08):
 *   Physics.Particulate   Solid-phase particulate matter (PM2.5,
 *                         PM10, dust). Particulate dynamics are
 *                         physics (settling, drag), not chemistry;
 *                         the descriptor lives under Physics now.
 */
export default {
    subPlugins: {
        "Chemistry.Gas": chemistryGasSubPlugin,
        "Chemistry.Composition": chemistryCompositionSubPlugin,
    },
};
